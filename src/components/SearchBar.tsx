import React, { useState, useEffect } from 'react';
import { Site } from '../types';

interface SearchBarProps {
  onSiteSelect: (site: Site) => void;
}

function SearchBar({ onSiteSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/realtime/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.ResponseData || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (site: Site) => {
    onSiteSelect(site);
    setQuery(site.Name);
    setShowResults(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="Search for stops, stations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          style={styles.input}
        />
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    marginBottom: '24px',
  },
  searchBox: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '16px 20px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    outline: 'none',
    transition: 'box-shadow 0.2s',
  },
  loader: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#667eea',
    fontSize: '14px',
  },
  results: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: '12px',
    marginTop: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxHeight: '400px',
    overflowY: 'auto',
    zIndex: 10,
  },
  resultItem: {
    padding: '16px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  siteName: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  siteType: {
    fontSize: '14px',
    color: '#718096',
  },
};

export default SearchBar;
