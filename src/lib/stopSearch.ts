import { Site } from '../types';

export async function searchStops(query: string): Promise<Site[]> {
  const response = await fetch(`/api/realtime/search?query=${encodeURIComponent(query)}&source=free`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || 'Search request failed');
  }

  return data.ResponseData || [];
}
