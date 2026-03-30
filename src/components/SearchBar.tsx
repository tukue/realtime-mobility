import React, { useState, useEffect } from 'react';
import { Site } from '../types';
import { searchStops } from '../lib/stopSearch';

interface SearchBarProps {
  onSiteSelect: (site: Site) => void;
}

function SearchBar({ onSiteSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const timeoutId = setTimeout(async () => {
      if (!isMounted) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sites = await searchStops(query);
        if (!isMounted) {
          return;
        }
        setResults(sites);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        if (!isMounted) {
          return;
        }
        setResults([]);
        setShowResults(true);
        setError(error instanceof Error ? error.message : 'Search failed');
      } finally {
        if (!isMounted) {
          return;
        }
        setLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSelect = (site: Site) => {
    onSiteSelect(site);
    setQuery(site.Name);
    setShowResults(false);
    setError(null);
  };

  return (
    <div style={styles.container}>
      <label style={styles.label} htmlFor="stop-search">
        Stop or station
      </label>
      <div style={styles.searchBox}>
        <input
          id="stop-search"
          type="text"
          placeholder="Search for bus stops"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          aria-label="Search for bus stops"
          style={styles.input}
        />
        {query.length > 0 && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
              setError(null);
            }}
            style={styles.clearButton}
          >
            Clear
          </button>
        )}
        {loading && <div style={styles.loader}>Searching...</div>}
      </div>

      {showResults && results.length > 0 && (
        <div style={styles.results}>
          {results.map((site) => (
            <div
              key={site.SiteId}
              onClick={() => handleSelect(site)}
              style={styles.resultItem}
            >
              <div style={styles.siteName}>{site.Name}</div>
              <div style={styles.siteType}>{site.Type}</div>
            </div>
          ))}
        </div>
      )}

      {showResults && !loading && query.length >= 2 && results.length === 0 && !error && (
        <div style={styles.emptyResults}>No stops found. Try a different name or area.</div>
      )}

      {showResults && !loading && error && (
        <div style={styles.errorResults}>
          Search failed: {error}. Check that the backend is running and the SL free API is reachable.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'grid',
    gap: '10px',
  },
  label: {
    fontSize: '0.84rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  searchBox: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '16px 104px 16px 18px',
    fontSize: '16px',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    background: 'rgba(255, 255, 255, 0.05)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    borderRadius: '999px',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text)',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  loader: {
    position: 'absolute',
    right: '18px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--brand)',
    fontSize: '0.88rem',
    fontWeight: 700,
  },
  results: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'var(--panel-strong)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    marginTop: '8px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
    maxHeight: '400px',
    overflowY: 'auto',
    zIndex: 10,
  },
  resultItem: {
    padding: '16px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'background-color 0.2s',
  },
  siteName: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '4px',
    color: 'var(--text)',
  },
  siteType: {
    fontSize: '14px',
    color: 'var(--muted)',
  },
  emptyResults: {
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    fontSize: '0.92rem',
  },
  errorResults: {
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'rgba(255, 122, 122, 0.12)',
    border: '1px solid rgba(255, 122, 122, 0.28)',
    color: '#ffd2d2',
    fontSize: '0.92rem',
    lineHeight: 1.5,
  },
};

export default SearchBar;
