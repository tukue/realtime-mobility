import React, { useState, useEffect } from 'react';
import { Site, FavoriteStop } from '../types';
import { supabase } from '../lib/supabase';

interface FavoritesListProps {
  onSiteSelect: (site: Site) => void;
}

function FavoritesList({ onSiteSelect }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<FavoriteStop[]>([]);
  const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!supabaseConfigured) {
      setFavorites([]);
      return;
    }

    loadFavorites();
  }, [supabaseConfigured]);

  const loadFavorites = async () => {
    if (!supabase) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_stops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const handleFavoriteClick = (favorite: FavoriteStop) => {
    onSiteSelect({
      SiteId: favorite.site_id,
      Name: favorite.site_name,
      Type: 'Favorite',
      X: '',
      Y: '',
    });
  };

  if (favorites.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyTitle}>No saved stops yet</div>
        <div style={styles.emptyText}>
          {supabaseConfigured
            ? 'Tap the save action later to pin frequent stops here.'
            : 'Favorites storage is not configured in this deployment, but recent stops still work locally.'}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Favorites</h3>
      <div style={styles.list}>
        {favorites.map((fav) => (
          <button
            key={fav.id}
            type="button"
            onClick={() => handleFavoriteClick(fav)}
            style={styles.favoriteButton}
          >
            <span style={styles.favoriteName}>{fav.site_name}</span>
            <span style={styles.favoriteCta}>Open</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gap: '12px',
  },
  title: {
    fontSize: '0.84rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  list: {
    display: 'grid',
    gap: '10px',
  },
  favoriteButton: {
    width: '100%',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    fontSize: '14px',
    fontWeight: 700,
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
  },
  favoriteName: {
    textAlign: 'left',
  },
  favoriteCta: {
    flexShrink: 0,
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(104, 183, 255, 0.14)',
    color: '#a9d7ff',
    fontSize: '0.78rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  empty: {
    padding: '16px',
    borderRadius: '18px',
    border: '1px dashed rgba(255, 255, 255, 0.14)',
    background: 'rgba(255, 255, 255, 0.04)',
    display: 'grid',
    gap: '6px',
  },
  emptyTitle: {
    fontWeight: 800,
    color: 'var(--text)',
  },
  emptyText: {
    fontSize: '0.92rem',
    lineHeight: 1.5,
    color: 'var(--muted)',
  },
};

export default FavoritesList;
