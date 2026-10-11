import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Site } from './types';

const stop: Site = { SiteId: '1', Name: 'Odenplan', Type: 'Stop', X: '18', Y: '59' };

vi.mock('./hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('./components/SearchBar', () => ({
  default: ({ onSiteSelect }: { onSiteSelect: (site: Site) => void }) => (
    <button onClick={() => onSiteSelect(stop)}>Select Odenplan</button>
  ),
}));
vi.mock('./components/NearbyStops', () => ({ default: () => null }));
vi.mock('./components/FavoritesList', () => ({ default: () => null }));
vi.mock('./components/stopBoard', () => ({
  default: ({ site }: { site: Site }) => <section aria-label="Live board">{site.Name}</section>,
}));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('main-page journey planning', () => {
  it('exposes the real planner before a stop is selected and provides a keyboard jump link', async () => {
    render(<App />);
    await act(async () => {});
    const planner = screen.getByRole('region', { name: 'Plan a journey' });
    expect(planner.contains(screen.getByRole('form', { name: 'Journey search' }))).toBe(true);
    const link = screen.getByRole('link', { name: 'Plan a journey' });
    expect(link.getAttribute('href')).toBe('#journey-heading');
    expect(screen.getByRole('heading', { name: 'Plan a journey' }).getAttribute('tabindex')).toBe('-1');
    expect(screen.getByRole('combobox', { name: 'Origin' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Destination' })).toBeTruthy();
  });

  it('passes a stop selected on the main page into the journey origin and keeps the live board available', async () => {
    render(<App />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Select Odenplan' }));
    expect((screen.getByRole('combobox', { name: 'Origin' }) as HTMLInputElement).value).toBe('Odenplan');
    expect(screen.getByRole('region', { name: 'Live board' }).textContent).toBe('Odenplan');
    expect(screen.getByRole('region', { name: 'Plan a journey' })).toBeTruthy();
  });
});
