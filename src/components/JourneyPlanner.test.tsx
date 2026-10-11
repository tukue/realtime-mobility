import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JourneyPlanner from './JourneyPlanner';
import { searchStops } from '../lib/stopSearch';
import type { Site } from '../types';

vi.mock('../lib/stopSearch', () => ({ searchStops: vi.fn() }));

const origin: Site = { SiteId: '1', Name: 'Odenplan', Type: 'Stop', X: '18', Y: '59' };
const destination: Site = { ...origin, SiteId: '2', Name: 'Slussen' };
const result = {
  origin_name: origin.Name,
  destination_name: destination.Name,
  trips: [{
    departure_time: '18:00', arrival_time: '18:20', duration_minutes: 20, changes: 0,
    legs: [{
      origin: origin.Name, destination: destination.Name, departure_time: '18:00',
      arrival_time: '18:20', line_number: '2', transport_mode: 'bus', direction: 'Slussen',
    }],
  }],
};
const fetchMock = vi.fn<typeof fetch>();
const stopsMock = vi.mocked(searchStops);
const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const submit = () => screen.getByRole('button', { name: 'Find routes' }) as HTMLButtonElement;
const destinationInput = () => screen.getByRole('combobox', { name: 'Destination' }) as HTMLInputElement;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

async function search(value = 'Sl') {
  fireEvent.change(destinationInput(), { target: { value } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
}

async function selectDestination(site = destination) {
  stopsMock.mockResolvedValueOnce([site]);
  await search(site.Name);
  fireEvent.click(screen.getByRole('option', { name: `${site.Name} ${site.Type}` }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValue(response(result));
  stopsMock.mockReset().mockResolvedValue([destination]);
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('journey endpoints and accessibility', () => {
  it('requires selected source and destination stops, rather than typed text alone', async () => {
    render(<JourneyPlanner />);
    expect(submit().disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Origin' }), { target: { value: 'Odenplan' } });
    await search();
    expect(submit().disabled).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: 'Journey search' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('selects stops with arrow keys and Enter and submits the selected IDs', async () => {
    render(<JourneyPlanner initialOrigin={origin} />);
    await search();
    const input = destinationInput();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const option = screen.getByRole('option');
    expect(input.getAttribute('aria-activedescendant')).toBe(option.id);
    expect(option.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe(destination.Name);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    await act(async () => { fireEvent.submit(screen.getByRole('form', { name: 'Journey search' })); });
    expect(fetchMock).toHaveBeenCalledWith('/api/journey/plan', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ origin_id: '1', destination_id: '2' }),
    }));
    expect(screen.getByRole('region', { name: 'Journey results' })).toBeTruthy();
    expect(screen.getByText('1 routes found.')).toBeTruthy();
    const details = screen.getByRole('button', { name: /18:00.*18:20/ });
    expect(details.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(details);
    expect(details.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(details.getAttribute('aria-controls')!)).toBeTruthy();
    expect(screen.getByText('bus')).toBeTruthy();
  });

  it('dismisses suggestions with Escape or blur without selecting a stop', async () => {
    render(<JourneyPlanner initialOrigin={origin} />);
    await search();
    fireEvent.keyDown(destinationInput(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(destinationInput(), { key: 'ArrowUp' });
    expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('true');
    fireEvent.blur(destinationInput());
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(submit().disabled).toBe(true);
  });

  it('supports pointer selection and rejects identical source/destination stops', async () => {
    render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination(origin);
    expect(submit().disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('different from your origin');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['Origin', 'Destination'])('clears old routes and selection when %s text changes', async label => {
    render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    await act(async () => { fireEvent.click(submit()); });
    expect(screen.getByRole('region', { name: 'Journey results' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: 'Changed' } });
    expect(submit().disabled).toBe(true);
    expect(screen.queryByRole('region', { name: 'Journey results' })).toBeNull();
  });

  it('updates the origin from the live board while preserving the destination', async () => {
    const { rerender } = render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    rerender(<JourneyPlanner initialOrigin={{ ...origin, SiteId: '3', Name: 'Centralen' }} />);
    expect((screen.getByRole('combobox', { name: 'Origin' }) as HTMLInputElement).value).toBe('Centralen');
    expect(destinationInput().value).toBe(destination.Name);
    await act(async () => { fireEvent.click(submit()); });
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ origin_id: '3', destination_id: '2' });
  });
});

describe('journey recovery and stale responses', () => {
  it('announces loading, prevents duplicate submission, and retries a failed request', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    fireEvent.click(submit());
    expect(screen.getByText('Finding routes...')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Searching...' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: 'Journey search' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(response({}, false)); });
    expect(screen.getByRole('alert').textContent).toContain('Unable to load routes');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    expect(screen.getByRole('region', { name: 'Journey results' })).toBeTruthy();
  });

  it('shows a recoverable empty result', async () => {
    fetchMock.mockResolvedValueOnce(response({ ...result, trips: [] }));
    render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    await act(async () => { fireEvent.click(submit()); });
    expect(screen.getByText(/No routes found/)).toBeTruthy();
    expect(screen.getByText('0 routes found.')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    expect(screen.getByRole('region', { name: 'Journey results' })).toBeTruthy();
  });

  it('handles network failures and invalid journey responses', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network failure')).mockResolvedValueOnce(response({ trips: null }));
    render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    await act(async () => { fireEvent.click(submit()); });
    expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    expect(screen.getByRole('alert').textContent).toContain('Unable to load routes');
  });

  it('aborts changed journeys and ignores late responses', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    fireEvent.click(submit());
    const signal = fetchMock.mock.calls[0][1]!.signal!;
    fireEvent.change(destinationInput(), { target: { value: 'Another stop' } });
    expect(signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response(result)); });
    expect(screen.queryByRole('region', { name: 'Journey results' })).toBeNull();
  });

  it('times out a hung request and allows retry', async () => {
    fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    fireEvent.click(submit());
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole('alert').textContent).toContain('Unable to load routes');
    expect(submit().disabled).toBe(false);
  });

  it('aborts the journey request when the planner unmounts', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const { unmount } = render(<JourneyPlanner initialOrigin={origin} />);
    await selectDestination();
    fireEvent.click(submit());
    const signal = fetchMock.mock.calls[0][1]!.signal!;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response(result)); });
  });
});

describe('stop search recovery', () => {
  it('debounces searches and ignores queries shorter than two characters', async () => {
    render(<JourneyPlanner initialOrigin={origin} />);
    await search('S');
    expect(stopsMock).not.toHaveBeenCalled();
    fireEvent.change(destinationInput(), { target: { value: 'Sl' } });
    fireEvent.change(destinationInput(), { target: { value: 'Slu' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(stopsMock).toHaveBeenCalledExactlyOnceWith('Slu');
  });

  it('announces empty searches and recovers from a failed search', async () => {
    stopsMock.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Unavailable'));
    render(<JourneyPlanner initialOrigin={origin} />);
    await search('Nothing');
    expect(screen.getByText('No stops found. Try another name.')).toBeTruthy();
    await search('Unavailable');
    expect(screen.getByText(/Stop search is unavailable/)).toBeTruthy();
    await search('Sl');
    expect(screen.getByRole('option')).toBeTruthy();
  });

  it('ignores old suggestions after the user changes or clears the query', async () => {
    const pending = deferred<Site[]>();
    stopsMock.mockReturnValueOnce(pending.promise);
    render(<JourneyPlanner initialOrigin={origin} />);
    await search('Old');
    await search('New');
    await act(async () => { pending.resolve([origin]); });
    expect(screen.queryByRole('option', { name: /Odenplan/ })).toBeNull();
    expect(screen.getByRole('option', { name: /Slussen/ })).toBeTruthy();
    await search('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
