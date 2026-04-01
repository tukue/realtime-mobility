import React, { useEffect, useRef, useState } from 'react';
import { NearbyStopBoard, Site } from '../types';
import { searchStops } from '../lib/stopSearch';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface NearbyStopsProps {
  startingPosition: string;
  latitude?: number | null;
  longitude?: number | null;
  onStopSelect: (site: Site) => void;
}

function NearbyStops({ startingPosition, latitude, longitude, onStopSelect }: NearbyStopsProps) {
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [results, setResults] = useState<NearbyStopBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const autoSelectedSiteId = useRef<string | null>(null);
  const onStopSelectRef = useRef(onStopSelect);
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';

  useEffect(() => {
    onStopSelectRef.current = onStopSelect;
  }, [onStopSelect]);

  useEffect(() => {
    const query = startingPosition.trim();

    if (!hasCoordinates && query.length < 2) {
      setResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      if (!isMounted) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sites = hasCoordinates
          ? await fetchNearbyStopBoards(latitude, longitude)
          : await searchStops(query);

        if (!isMounted) {
          return;
        }

        setResults(sites.slice(0, hasCoordinates ? 3 : 5));
        setShowResults(true);

        if (hasCoordinates && sites.length > 0) {
          const closestSite = sites[0];
          if (closestSite.SiteId !== autoSelectedSiteId.current) {
            autoSelectedSiteId.current = closestSite.SiteId;
            onStopSelectRef.current(closestSite);
          }
        }
      } catch (fetchError) {
        console.error('Nearby stop search error:', fetchError);
        if (!isMounted) {
          return;
        }
        setResults([]);
        setShowResults(true);
        setError(fetchError instanceof Error ? fetchError.message : 'Search failed');
      } finally {
        if (!isMounted) {
          return;
        }
        setLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [hasCoordinates, latitude, longitude, startingPosition]);

  if (!hasCoordinates && startingPosition.trim().length < 2) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyTitle}>Enter a starting position</div>
        <div style={styles.emptyText}>
          Type a stop, station, or area to find nearby stops, or enable location to rank them automatically.
        </div>
      </div>
    );
  }

  const title = hasCoordinates
    ? 'Live buses near your location'
    : startingPosition.trim()
      ? `Search results for ${startingPosition.trim()}`
      : 'Nearby stops';

  return (
    <div style={styles.container}>
      <div style={isMobile ? { ...styles.header, flexDirection: 'column', alignItems: 'flex-start' } : styles.header}>
        <div>
          <div style={styles.label}>{hasCoordinates ? 'Nearby buses' : 'Nearby stops'}</div>
          <div style={styles.title}>{title}</div>
        </div>
        {loading && <div style={styles.loader}>{hasCoordinates ? 'Loading nearby buses...' : 'Searching...'}</div>}
      </div>

      {showResults && results.length > 0 && (
        <div style={styles.list}>
          {results.map((site) => {
            const departures = site.departures;
            const busPreview = departures?.buses?.slice(0, 2) ?? [];
            const hasPreview = busPreview.length > 0;
            const status = departures?.status === 'error' ? departures.error || 'Live departures unavailable' : null;

            return (
              <button
                key={site.SiteId}
                type="button"
                onClick={() => onStopSelect(site)}
                style={
                  isMobile
                    ? {
                        ...styles.resultButton,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      }
                    : styles.resultButton
                }
              >
                <div style={styles.resultMain}>
                  <div style={styles.siteName}>{site.Name}</div>
                  <div style={styles.siteMeta}>
                    <span style={styles.siteType}>{site.Type}</span>
                    {typeof site.distance_meters === 'number' && (
                      <span style={styles.distance}>
                        {site.distance_meters < 1000
                          ? `${site.distance_meters} m away`
                          : `${(site.distance_meters / 1000).toFixed(1)} km away`}
                      </span>
                    )}
                  </div>

                  {hasCoordinates && (
                    <div style={styles.previewList}>
                      {hasPreview ? (
                        busPreview.map((departure, index) => (
                          <div key={`${site.SiteId}-${departure.line_number}-${index}`} style={styles.previewItem}>
                            <span style={styles.previewLine}>{departure.line_number}</span>
                            <span style={styles.previewDestination}>{departure.destination}</span>
                            <span style={styles.previewTime}>{departure.display_time}</span>
                          </div>
                        ))
                      ) : status ? (
                        <div style={styles.previewFallback}>{status}</div>
                      ) : (
                        <div style={styles.previewFallback}>No live bus departures right now.</div>
                      )}
                    </div>
                  )}
                </div>

                <div style={isMobile ? styles.cardMetaStack : styles.cardMetaRow}>
                  {hasCoordinates && departures && (
                    <span style={styles.liveCount}>
                      {departures.buses.length} bus{departures.buses.length === 1 ? '' : 'es'}
                    </span>
                  )}
                  <span style={isMobile ? { ...styles.cta, alignSelf: 'flex-start' } : styles.cta}>Open board</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showResults && !loading && results.length === 0 && !error && (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>{hasCoordinates ? 'No nearby stops found' : 'No stops found'}</div>
          <div style={styles.emptyText}>
            {hasCoordinates
              ? 'Try another location, or switch back to manual search.'
              : 'Try another stop name, station, or area.'}
          </div>
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
    gap: '6px',
    flex: 1,
  },
  siteName: {
    fontSize: '0.98rem',
    fontWeight: 800,
  },
  siteType: {
    fontSize: '0.82rem',
    color: 'var(--muted)',
  },
  siteMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  distance: {
    fontSize: '0.78rem',
    fontWeight: 800,
    color: '#a9d7ff',
  },
  previewList: {
    display: 'grid',
    gap: '8px',
    marginTop: '2px',
  },
  previewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    padding: '10px 12px',
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  previewLine: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '30px',
    padding: '4px 8px',
    borderRadius: '999px',
    background: 'rgba(104, 183, 255, 0.16)',
    color: '#c7e6ff',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  previewDestination: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  previewTime: {
    fontSize: '0.82rem',
    color: 'var(--muted)',
    fontWeight: 700,
  },
  previewFallback: {
    padding: '10px 12px',
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px dashed rgba(255, 255, 255, 0.12)',
    color: 'var(--muted)',
    fontSize: '0.88rem',
  },
  cardMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    flexShrink: 0,
  },
  cardMetaStack: {
    display: 'grid',
    gap: '10px',
    alignItems: 'flex-start',
  },
  liveCount: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(113, 211, 155, 0.14)',
    color: '#bdf7d5',
    fontSize: '0.78rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
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

async function fetchNearbyStopBoards(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): Promise<NearbyStopBoard[]> {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return [];
  }

  const response = await fetch(
    `/api/nearby/boards?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&limit=3&source=free`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || 'Nearby stop request failed');
  }

  return data.ResponseData || [];
}
