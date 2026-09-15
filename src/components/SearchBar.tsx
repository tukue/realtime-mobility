import React, { useState, useEffect } from 'react';
import { Site } from '../types';
import { searchStops } from '../lib/stopSearch';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface SearchBarProps {
  onSiteSelect: (site: Site) => void;
}

function SearchBar({ onSiteSelect }: SearchBarProps) {
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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
        setHighlightedIndex(-1);
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
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setShowResults(false);
      setHighlightedIndex(-1);
      return;
    }

    if (!showResults || results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      handleSelect(results[highlightedIndex]);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.labelRow}>
        <label style={styles.label} htmlFor="stop-search">
          Stop or station
        </label>
        <span style={styles.hint}>Type at least 2 characters</span>
      </div>
      <div style={styles.searchBox}>
        <input
          id="stop-search"
          type="text"
          placeholder="Search stops, stations, or areas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search for bus stops"
          aria-autocomplete="list"
          aria-controls="stop-search-results"
          aria-activedescendant={
            highlightedIndex >= 0 ? `stop-search-result-${results[highlightedIndex].SiteId}` : undefined
          }
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
              setHighlightedIndex(-1);
            }}
            style={styles.clearButton}
          >
            Clear
          </button>
        )}
        {loading && <div style={styles.loader}>Searching...</div>}
      </div>

      {showResults && results.length > 0 && (
        <div
          id="stop-search-results"
          role="listbox"
          style={
            isMobile
              ? {
                  ...styles.results,
                  position: 'static',
                  maxHeight: '320px',
                  marginTop: '10px',
                }
              : styles.results
          }
        >
          {results.map((site, index) => (
            <button
              id={`stop-search-result-${site.SiteId}`}
              key={site.SiteId}
              type="button"
              onClick={() => handleSelect(site)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={highlightedIndex === index}
              style={highlightedIndex === index ? { ...styles.resultItem, ...styles.resultItemActive } : styles.resultItem}
            >
              <div style={styles.resultText}>
                <div style={styles.siteName}>{site.Name}</div>
                <div style={styles.siteType}>{site.Type}</div>
              </div>
              <span style={styles.resultHint}>{highlightedIndex === index ? 'Press Enter' : 'Open board'}</span>
            </button>
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
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  label: {
    fontSize: '0.84rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  hint: {
    color: 'var(--muted)',
    fontSize: '0.8rem',
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
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'left',
    padding: '16px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'background-color 0.2s',
    background: 'transparent',
    border: 'none',
  },
  resultItemActive: {
    background: 'rgba(104, 183, 255, 0.12)',
    boxShadow: 'inset 3px 0 0 var(--brand)',
  },
  resultText: {
    minWidth: 0,
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
  resultHint: {
    flexShrink: 0,
    marginLeft: '14px',
    color: 'var(--brand)',
    fontSize: '0.74rem',
    fontWeight: 800,
    opacity: 0.9,
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
