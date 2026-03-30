import React, { useEffect, useState } from 'react';
import { Site } from '../types';
import { searchStops } from '../lib/stopSearch';

interface NearbyStopsProps {
  startingPosition: string;
  onStopSelect: (site: Site) => void;
}

function NearbyStops({ startingPosition, onStopSelect }: NearbyStopsProps) {
  const [results, setResults] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const query = startingPosition.trim();

    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const sites = await searchStops(query);
        setResults(sites.slice(0, 4));
        setShowResults(true);
      } catch (fetchError) {
        console.error('Nearby stop search error:', fetchError);
        setResults([]);
        setShowResults(true);
        setError(fetchError instanceof Error ? fetchError.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [startingPosition]);

  if (startingPosition.trim().length < 2) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyTitle}>Enter a starting position</div>
        <div style={styles.emptyText}>Type a stop, station, or area to find nearby stops.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Nearby stops</div>
          <div style={styles.title}>Closest stops for {startingPosition.trim()}</div>
        </div>
        {loading && <div style={styles.loader}>Searching...</div>}
      </div>

      {showResults && results.length > 0 && (
        <div style={styles.list}>
          {results.map((site) => (
            <button key={site.SiteId} type="button" onClick={() => onStopSelect(site)} style={styles.resultButton}>
              <div style={styles.resultMain}>
                <div style={styles.siteName}>{site.Name}</div>
                <div style={styles.siteType}>{site.Type}</div>
              </div>
              <span style={styles.cta}>View buses</span>
            </button>
          ))}
        </div>
      )}

      {showResults && !loading && results.length === 0 && !error && (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No nearby stops found</div>
          <div style={styles.emptyText}>Try another stop name, station, or area.</div>
        </div>
      )}

      {showResults && error && (
        <div style={styles.error}>
          Nearby search failed: {error}. The main stop search still works.
        </div>
      )}
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
    gap: '12px',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.84rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '6px',
  },
  title: {
    color: 'var(--text)',
    fontWeight: 800,
    lineHeight: 1.3,
  },
  loader: {
    color: 'var(--brand)',
    fontSize: '0.88rem',
    fontWeight: 700,
  },
  list: {
    display: 'grid',
    gap: '10px',
  },
  resultButton: {
    width: '100%',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    textAlign: 'left',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    cursor: 'pointer',
  },
  resultMain: {
    minWidth: 0,
    display: 'grid',
    gap: '3px',
  },
  siteName: {
    fontSize: '0.98rem',
    fontWeight: 800,
  },
  siteType: {
    fontSize: '0.82rem',
    color: 'var(--muted)',
  },
  cta: {
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
    padding: '14px 16px',
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
  error: {
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'rgba(255, 122, 122, 0.12)',
    border: '1px solid rgba(255, 122, 122, 0.28)',
    color: '#ffd2d2',
    fontSize: '0.92rem',
    lineHeight: 1.5,
  },
};

export default NearbyStops;
