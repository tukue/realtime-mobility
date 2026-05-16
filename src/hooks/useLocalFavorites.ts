import { useCallback, useEffect, useState } from 'react';
import { Site } from '../types';

const FAVORITES_KEY = 'realtime-mobility.favorites';

export interface LocalFavorite {
  siteId: string;
  name: string;
  type: string;
  addedAt: string;
}

function loadFavorites(): LocalFavorite[] {
  try {
    const stored = window.localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: LocalFavorite[]) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('Failed to save favorites:', err);
  }
}

export function useLocalFavorites() {
  const [favorites, setFavorites] = useState<LocalFavorite[]>(loadFavorites);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const isFavorite = useCallback(
    (siteId: string) => favorites.some((f) => f.siteId === siteId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (site: Site) => {
      setFavorites((prev) => {
        const existing = prev.find((f) => f.siteId === site.SiteId);
        if (existing) {
          return prev.filter((f) => f.siteId !== site.SiteId);
        }
        return [
          ...prev,
          {
            siteId: site.SiteId,
            name: site.Name,
            type: site.Type,
            addedAt: new Date().toISOString(),
          },
        ];
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    setFavorites([]);
  }, []);

  return { favorites, isFavorite, toggleFavorite, clearAll };
}
