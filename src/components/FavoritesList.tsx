import React, { useState, useEffect } from 'react';
import { Site } from '../types';
import { supabase } from '../lib/supabase';

interface FavoritesListProps {
  onSiteSelect: (site: Site) => void;
}

function FavoritesList({ onSiteSelect }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
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

  const handleFavoriteClick = (favorite: any) => {
    onSiteSelect({
      SiteId: favorite.site_id,
      Name: favorite.site_name,
      Type: 'Favorite',
      X: '',
      Y: '',
    });
  };

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Favorites</h3>
      <div style={styles.list}>
        {favorites.map((fav) => (
          <button
            key={fav.id}
            onClick={() => handleFavoriteClick(fav)}
            style={styles.favoriteButton}
          >
            {fav.site_name}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '12px',
  },
  list: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  favoriteButton: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#667eea',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default FavoritesList;
