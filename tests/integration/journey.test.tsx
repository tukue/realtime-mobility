import { execFile as executeFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import JourneyPlanner from '../../src/components/JourneyPlanner';

const execFile = promisify(executeFile);

interface ApiResult {
  status: number;
  body: unknown;
  upstream: { path: string; params: Record<string, string> }[];
}
let empty = false;
const requests: ApiResult[] = [];

async function api(url: string, method = 'GET', body?: unknown): Promise<ApiResult> {
  const execution = execFile(process.env.PYTHON ?? 'python3', [resolve('tests/integration/backend_bridge.py')], {
    encoding: 'utf8', timeout: 10_000,
    env: { ...process.env, ENVIRONMENT: 'test', SL_REALTIME_API_KEY: '', SL_SITUATION_API_KEY: '' },
  });
  execution.child.stdin!.end(JSON.stringify({ url, method, body, empty }));
  const { stdout: output } = await execution;
  const result: ApiResult = JSON.parse(output);
  requests.push(result);
  return result;
}

async function select(label: string, query: string, station: string) {
  const input = screen.getByRole('combobox', { name: label });
  fireEvent.change(input, { target: { value: query } });
  await screen.findByRole('option', { name: new RegExp(station) }, { timeout: 10_000 });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect((input as HTMLInputElement).value).toBe(station);
}

async function plan() {
  await select('Origin', 'Oden', 'Odenplan');
  await select('Destination', 'Slus', 'Slussen');
  fireEvent.submit(screen.getByRole('form', { name: 'Journey search' }));
  await waitFor(() => expect(screen.queryByText('Finding routes...')).toBeNull(), { timeout: 10_000 });
}

beforeEach(() => {
  empty = false;
  requests.length = 0;
  // Transport adapter only: real searchStops, API routes and services run.
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    const result = await api(url, options?.method, options?.body ? JSON.parse(String(options.body)) : undefined);
    return { ok: result.status < 400, status: result.status, json: async () => result.body } as Response;
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('journey frontend/backend integration with sample Stockholm stations', () => {
  beforeAll(async () => {
    await execFile(process.env.PYTHON ?? 'python3', ['-c', 'import fastapi, httpx, slowapi, pydantic_settings'], {
      encoding: 'utf8', timeout: 10_000,
    });
  });
  it('searches stations, submits their IDs, normalizes provider trips and expands transfer legs', async () => {
    render(<JourneyPlanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Select all modes' }));
    await plan();
    expect(requests).toHaveLength(3);
    expect(requests[2].upstream[0].params).toMatchObject({ name_origin: '9091001000009117', name_destination: '9091001000009192' });
    expect(screen.getByRole('region', { name: 'Journey results' }).textContent).toContain('Odenplan → Slussen');
    const trip = screen.getByRole('button', { name: /10:00.*10:10/ });
    expect(trip.textContent).toContain('10 min');
    expect(trip.textContent).toContain('1 change');
    expect(trip.getAttribute('aria-expanded')).toBe('true');
    const details = document.getElementById(trip.getAttribute('aria-controls')!);
    expect(details?.textContent).toContain('T-Centralen');
    expect(details?.textContent).toContain('Skarpnäck');
    expect(details?.textContent).toContain('Fruängen');
  });

  it('renders an empty provider result and successfully retries the same journey', async () => {
    empty = true;
    render(<JourneyPlanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Select all modes' }));
    await plan();
    expect(screen.getByText(/No routes found/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Journey results' })).toBeNull();
    empty = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByText('Finding routes...')).toBeNull(), { timeout: 10_000 });
    expect(screen.getByRole('region', { name: 'Journey results' })).toBeTruthy();
  });

  it('sends a chosen transport combination through the API to the provider', async () => {
    render(<JourneyPlanner />);
    for (const name of ['Bus', 'Metro', 'Train']) fireEvent.click(screen.getByRole('checkbox', { name }));
    await plan();
    expect(requests[2].upstream[0].params).toMatchObject({
      incl_mot_0: 'true', incl_mot_14: 'true', incl_mot_2: 'true',
      incl_mot_5: 'false', incl_mot_10: 'false', incl_mot_19: 'false', incl_mot_4: 'false', incl_mot_9: 'false',
    });
  });

  it('rejects identical or missing endpoints at the API without contacting SL', async () => {
    const same = await api('/api/journey/plan', 'POST', { origin_id: '9117', destination_id: '9117' });
    expect(same.status).toBe(400);
    expect(same.upstream).toEqual([]);
    const missing = await api('/api/journey/plan', 'POST', { origin_id: '9117' });
    expect(missing.status).toBe(422);
    expect(missing.upstream).toEqual([]);
  });
});
