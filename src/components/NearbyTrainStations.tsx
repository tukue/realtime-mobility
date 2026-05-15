import React, { useEffect, useRef, useState } from 'react';
import { NearbyStopBoard, Site } from '../types';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface NearbyTrainStationsProps {
  latitude?: number | null;
  longitude?: number | null;
  onStopSelect: (site: Site) => void;
}

function NearbyTrainStations({ latitude, longitude, onStopSelect }: NearbyTrainStationsProps) {
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [results, setResults] = useState<NearbyStopBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSelectedSiteId = useRef<string | null>(null);
  const userInteracted = useRef(false);
  const onStopSelectRef = useRef(onStopSelect);
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';

  useEffect(() => {
    onStopSelectRef.current = onStopSelect;
  }, [onStopSelect]);

  useEffect(() => {
    if (!hasCoordinates) {
      setResults([]);
      return;
    }

    let isMounted = true;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const stations = await fetchNearbyTrainBoards(latitude, longitude);

        if (!isMounted) return;

        setResults(stations.slice(0, 3));
        setLoading(false);

        if (stations.length > 0 && !userInteracted.current) {
          const closest = stations[0];
          if (closest.SiteId !== autoSelectedSiteId.current) {
            autoSelectedSiteId.current = closest.SiteId;
            onStopSelectRef.current(closest);
          }
        }
      } catch (fetchError) {
        console.error('Train station search error:', fetchError);
        if (!isMounted) return;
        setResults([]);
        setError(fetchError instanceof Error ? fetchError.message : 'Search failed');
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, hasCoordinates]);

  if (!hasCoordinates) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={isMobile ? { ...styles.header, flexDirection: 'column', alignItems: 'flex-start' } : styles.header}>
        <div>
          <div style={styles.label}>Train stations near you</div>
          <div style={styles.title}>Closest train and metro stations</div>
        </div>
        {loading && <div style={styles.loader}>Loading nearby stations...</div>}
      </div>

      {!loading && results.length > 0 && (
        <div style={styles.list}>
          {results.map((site) => {
            const departures = site.departures;
            const trainPreview = [
              ...(departures?.trains?.slice(0, 1) ?? []),
              ...(departures?.metros?.slice(0, 1) ?? []),
            ];
            const hasPreview = trainPreview.length > 0;
            const status = departures?.status === 'error' ? departures.error || 'Live departures unavailable' : null;

            return (
              <button
                key={site.SiteId}
                type="button"
                onClick={() => { userInteracted.current = true; onStopSelect(site); }}
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

                  {hasPreview && (
                    <div style={styles.previewList}>
                      {trainPreview.map((departure, index) => (
                        <div key={`${site.SiteId}-${departure.line_number}-${index}`} style={styles.previewItem}>
                          <span style={{
                            ...styles.previewLine,
                            background: departure.transport_mode === 'metro'
                              ? 'rgba(0, 120, 212, 0.2)'
                              : 'rgba(107, 92, 255, 0.2)',
                            color: departure.transport_mode === 'metro'
                              ? '#7fc8ff'
                              : '#c7b9ff',
                          }}>{departure.line_number}</span>
                          <span style={styles.previewDestination}>{departure.destination}</span>
                          <span style={styles.previewTime}>{departure.display_time}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasPreview && !loading && status && (
                    <div style={styles.previewFallback}>{status}</div>
                  )}

                  {!hasPreview && !loading && !status && (
                    <div style={styles.previewFallback}>No live train departures right now.</div>
                  )}
                </div>

                <div style={styles.cardMeta}>
                  <span style={styles.liveCount}>
                    {(departures?.trains?.length ?? 0) + (departures?.metros?.length ?? 0)} departures
                  </span>
                  <span style={isMobile ? { ...styles.cta, alignSelf: 'flex-start' } : styles.cta}>Open board</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && hasCoordinates && results.length === 0 && !error && (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No nearby train stations found</div>
          <div style={styles.emptyText}>
            Try enabling location or searching for a station manually above.
          </div>
        </div>
      )}

      {error && (
        <div style={styles.error}>
          Train station search failed: {error}
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
  cardMeta: {
    display: 'grid',
    gap: '10px',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  liveCount: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(104, 183, 255, 0.14)',
    color: '#a9d7ff',
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

async function fetchNearbyTrainBoards(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): Promise<NearbyStopBoard[]> {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return [];
  }

  const response = await fetch(
    `/api/nearby/train-boards?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&limit=3&source=free`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || 'Nearby train station request failed');
  }

  return data.ResponseData || [];
}

export default NearbyTrainStations;
