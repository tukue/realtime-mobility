import React, { useEffect, useState } from 'react';
import { Site, DepartureData, Departure } from '../types';
import DepartureCard from './DepartureCard';

interface DepartureBoardProps {
  site: Site;
}

function DepartureBoard({ site }: DepartureBoardProps) {
  const [departures, setDepartures] = useState<DepartureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
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
      if (!response.ok) throw new Error('Failed to fetch departures');

      const data = await response.json();
      setDepartures(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Unable to load departures. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderDepartures = (items: Departure[], color: string) => {
    if (!items || items.length === 0) return null;

    return (
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.categoryTitle}>Bus arrivals</h3>
            <p style={styles.sectionSubtitle}>Next departures from this stop</p>
          </div>

          <span style={{ ...styles.routeBadge, backgroundColor: color }}>Live</span>
        </div>

        <div style={styles.departureGrid}>
          {items.slice(0, 6).map((departure, index) => (
            <DepartureCard key={index} departure={departure} color={color} />
          ))}
        </div>
      </section>
    );
  };

  if (loading && !departures) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.loadingTitle}>Loading live bus arrivals</div>
          <div style={styles.loadingText}>Fetching the next buses for {site.Name}.</div>
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

  const busDepartures = departures?.buses ?? [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.stopLabel}>Selected stop</div>
          <h2 style={styles.title}>{site.Name}</h2>
          <div style={styles.metaRow}>
            <span style={styles.metaChip}>{site.Type}</span>
            <span style={styles.metaChip}>{refreshing ? 'Refreshing now' : 'Auto refresh on'}</span>
            <span style={styles.metaChip}>
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Waiting for first update'}
            </span>
          </div>
        </div>

        <button onClick={() => fetchDepartures(true)} style={styles.refreshButton}>
          {refreshing ? 'Refreshing...' : 'Refresh now'}
        </button>
      </div>

      {departures && renderDepartures(busDepartures, '#d91f2a')}

      {departures && !busDepartures.length && (
        <div style={styles.noDepartures}>
          No live bus departures are available for this stop right now.
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
    padding: '8px 10px',
    borderRadius: '999px',
    color: 'white',
    fontSize: '0.78rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  departureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '14px',
  },
  loadingWrap: {
    minHeight: '420px',
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'start',
    gap: '12px',
  },
  loadingTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.8rem',
    fontWeight: 700,
  },
  loadingText: {
    color: 'var(--muted)',
    fontSize: '1rem',
  },
  errorCard: {
    minHeight: '420px',
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'start',
    gap: '12px',
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--text)',
  },
  errorText: {
    color: 'var(--danger)',
    lineHeight: 1.6,
  },
  retryButton: {
    marginTop: '8px',
    padding: '12px 16px',
    border: 'none',
    borderRadius: '14px',
    background: 'var(--accent)',
    color: '#162033',
    fontWeight: 800,
  },
  noDepartures: {
    marginTop: '18px',
    padding: '24px',
    borderRadius: '18px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    fontSize: '0.98rem',
    lineHeight: 1.6,
  },
};

export default DepartureBoard;
