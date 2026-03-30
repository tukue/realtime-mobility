import React, { useEffect, useMemo, useState } from 'react';
import { Site, DepartureData, Departure } from '../types';
import DepartureCard from './DepartureCard';

interface StopBoardProps {
  site: Site;
  startingLocation?: string;
}

type ModeKey = 'all' | 'buses' | 'metros' | 'trains' | 'trams' | 'ships';

const MODE_META: Record<Exclude<ModeKey, 'all'>, { label: string; color: string; key: keyof DepartureData }> = {
  buses: { label: 'Bus', color: '#d91f2a', key: 'buses' },
  metros: { label: 'Metro', color: '#0078d4', key: 'metros' },
  trains: { label: 'Train', color: '#6b5cff', key: 'trains' },
  trams: { label: 'Tram', color: '#f08d22', key: 'trams' },
  ships: { label: 'Ship', color: '#0d8f8f', key: 'ships' },
};

function StopBoard({ site, startingLocation }: StopBoardProps) {
  const [departures, setDepartures] = useState<DepartureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeMode, setActiveMode] = useState<ModeKey>('all');

  useEffect(() => {
    setActiveMode('all');
    fetchDepartures(false);
    const interval = setInterval(() => {
      fetchDepartures(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [site]);

  const fetchDepartures = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const response = await fetch(`/api/departures/format/${site.SiteId}?source=free`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to fetch departures');
      }

      setDepartures(data as DepartureData);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Unable to load departures from the SL free API. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const modeSections = useMemo(() => {
    const current = departures ?? {
      buses: [],
      metros: [],
      trains: [],
      trams: [],
      ships: [],
    };

    return (Object.keys(MODE_META) as Array<Exclude<ModeKey, 'all'>>).map((mode) => {
      const meta = MODE_META[mode];
      const items = current[meta.key] ?? [];

      return {
        mode,
        label: meta.label,
        color: meta.color,
        items,
        count: items.length,
      };
    });
  }, [departures]);

  const visibleSections =
    activeMode === 'all'
      ? modeSections.filter((section) => section.count > 0)
      : modeSections.filter((section) => section.mode === activeMode);

  const totalDepartures = modeSections.reduce((sum, section) => sum + section.count, 0);

  const renderDepartures = (items: Departure[], color: string, label: string) => {
    if (!items || items.length === 0) return null;

    return (
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.categoryTitle}>{label} buses</h3>
            <p style={styles.sectionSubtitle}>Next buses from this stop</p>
          </div>

          <span style={{ ...styles.routeBadge, backgroundColor: color }}>Live</span>
        </div>

        <div style={styles.departureGrid}>
          {items.slice(0, 6).map((departure, index) => (
            <DepartureCard key={`${departure.line_number}-${departure.destination}-${index}`} departure={departure} color={color} />
          ))}
        </div>
      </section>
    );
  };

  if (loading && !departures) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.loadingTitle}>Loading live buses</div>
          <div style={styles.loadingText}>Fetching the next transport options for {site.Name}.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <div style={styles.errorTitle}>Something went wrong</div>
          <div style={styles.errorText}>{error}</div>
          <button onClick={() => fetchDepartures(false)} style={styles.retryButton}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.stopLabel}>Selected stop</div>
          <h2 style={styles.title}>{site.Name}</h2>
          <div style={styles.routeLine}>
            {startingLocation ? `${startingLocation} to ${site.Name}` : `Live buses for ${site.Name}`}
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaChip}>{site.Type}</span>
            <span style={styles.metaChip}>{refreshing ? 'Refreshing now' : 'Auto refresh on'}</span>
            <span style={styles.metaChip}>
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Waiting for first update'}
            </span>
            <span style={styles.metaChip}>{totalDepartures} live buses</span>
          </div>
        </div>

        <button onClick={() => fetchDepartures(true)} style={styles.refreshButton}>
          {refreshing ? 'Refreshing...' : 'Refresh now'}
        </button>
      </div>

      <div style={styles.modeBar}>
        <button
          type="button"
          onClick={() => setActiveMode('all')}
          style={activeMode === 'all' ? { ...styles.modeButton, ...styles.modeButtonActive } : styles.modeButton}
        >
          All
        </button>

        {(Object.keys(MODE_META) as Array<Exclude<ModeKey, 'all'>>).map((mode) => {
          const section = modeSections.find((item) => item.mode === mode);
          const isActive = activeMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveMode(mode)}
              style={isActive ? { ...styles.modeButton, ...styles.modeButtonActive } : styles.modeButton}
            >
              {MODE_META[mode].label}
              <span style={styles.modeCount}>{section?.count ?? 0}</span>
            </button>
          );
        })}
      </div>

      {departures && visibleSections.length > 0 && (
        <div style={styles.sectionStack}>
          {visibleSections.map((section) => renderDepartures(section.items, section.color, section.label))}
        </div>
      )}

      {departures && visibleSections.length === 0 && (
        <div style={styles.noDepartures}>
          No live buses are available for this mode right now.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--panel-strong)',
    borderRadius: '28px',
    padding: '24px',
    border: '1px solid var(--border)',
    boxShadow: '0 28px 90px rgba(0, 0, 0, 0.32)',
    minHeight: '520px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '18px',
    borderBottom: '1px solid var(--border)',
  },
  stopLabel: {
    fontSize: '0.8rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '8px',
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.7rem, 3vw, 2.8rem)',
    lineHeight: 1,
    letterSpacing: '-0.04em',
    color: 'var(--text)',
  },
  routeLine: {
    marginTop: '10px',
    color: 'var(--muted)',
    fontSize: '0.96rem',
    lineHeight: 1.5,
  },
  refreshButton: {
    flexShrink: 0,
    padding: '12px 16px',
    fontSize: '0.92rem',
    fontWeight: 800,
    background: 'rgba(104, 183, 255, 0.14)',
    color: '#c7e6ff',
    border: '1px solid rgba(104, 183, 255, 0.35)',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.2s',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
  },
  metaChip: {
    padding: '8px 10px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  modeBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '18px',
  },
  modeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
    fontSize: '0.9rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  modeButtonActive: {
    background: 'rgba(104, 183, 255, 0.14)',
    color: 'var(--text)',
    borderColor: 'rgba(104, 183, 255, 0.35)',
  },
  modeCount: {
    minWidth: '20px',
    height: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'inherit',
    fontSize: '0.75rem',
  },
  sectionStack: {
    display: 'grid',
    gap: '22px',
  },
  section: {
    display: 'grid',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  categoryTitle: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: 'var(--text)',
  },
  sectionSubtitle: {
    marginTop: '6px',
    color: 'var(--muted)',
    fontSize: '0.92rem',
  },
  routeBadge: {
    padding: '8px 12px',
    borderRadius: '999px',
    color: 'white',
    fontSize: '0.78rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  departureGrid: {
    display: 'grid',
    gap: '12px',
  },
  loadingWrap: {
    display: 'grid',
    gap: '8px',
    minHeight: '300px',
    alignContent: 'center',
  },
  loadingTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  loadingText: {
    color: 'var(--muted)',
    lineHeight: 1.6,
  },
  errorCard: {
    display: 'grid',
    gap: '12px',
    alignContent: 'center',
    minHeight: '280px',
    padding: '12px',
  },
  errorTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--text)',
  },
  errorText: {
    color: '#ffc9c9',
    lineHeight: 1.6,
  },
  retryButton: {
    justifySelf: 'start',
    padding: '12px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 122, 122, 0.28)',
    background: 'rgba(255, 122, 122, 0.12)',
    color: '#ffd2d2',
    fontWeight: 800,
  },
  noDepartures: {
    marginTop: '10px',
    padding: '18px',
    borderRadius: '18px',
    border: '1px dashed rgba(255, 255, 255, 0.16)',
    color: 'var(--muted)',
    background: 'rgba(255, 255, 255, 0.04)',
  },
};

export default StopBoard;
