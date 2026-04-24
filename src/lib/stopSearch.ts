import { Site } from '../types';

export async function searchStops(query: string, transportMode?: 'bus' | 'train'): Promise<Site[]> {
  const params = new URLSearchParams({
    query,
    source: 'free',
  });

  if (transportMode) {
    params.set('transport_mode', transportMode);
  }

  const response = await fetch(`/api/realtime/search?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || 'Search request failed');
  }

  return data.ResponseData || [];
}
