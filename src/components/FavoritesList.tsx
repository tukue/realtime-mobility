import React from 'react';
import { Site } from '../types';
import { LocalFavorite } from '../hooks/useLocalFavorites';

interface FavoritesListProps {
  favorites: LocalFavorite[];
  onSiteSelect: (site: Site) => void;
}

function FavoritesList({ favorites, onSiteSelect }: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyKicker}>Saved stops</div>
        <div style={styles.emptyTitle}>No saved stops yet</div>
        <div style={styles.emptyText}>
          Pin frequent stops from the live board so they are always one tap away.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {favorites.map((fav) => (
          <button
            key={fav.siteId}
            type="button"
            onClick={() =>
              onSiteSelect({
                SiteId: fav.siteId,
                Name: fav.name,
                Type: fav.type,
                X: '',
                Y: '',
              })
            }
            style={styles.favoriteButton}
          >
            <span style={styles.favoriteName}>{fav.name}</span>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '0.84rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  clearButton: {
    fontSize: '0.78rem',
    fontWeight: 800,
    color: '#ff9999',
    background: 'none',
    border: '1px solid rgba(255, 122, 122, 0.3)',
    borderRadius: '999px',
    padding: '4px 10px',
    cursor: 'pointer',
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
  emptyKicker: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(104, 183, 255, 0.12)',
    color: '#c7e6ff',
    border: '1px solid rgba(104, 183, 255, 0.18)',
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
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
