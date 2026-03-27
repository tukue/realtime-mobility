import React, { useState, useEffect } from 'react';
import { Site, DepartureData, Departure } from '../types';
import DepartureCard from './DepartureCard';

interface DepartureBoardProps {
  site: Site;
}

function DepartureBoard({ site }: DepartureBoardProps) {
  const [departures, setDepartures] = useState<DepartureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [site]);

  const fetchDepartures = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/departures/format/${site.SiteId}`);
      if (!response.ok) throw new Error('Failed to fetch departures');
      const data = await response.json();
      setDepartures(data);
    } catch (err) {
      setError('Unable to load departures. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderDepartures = (departures: Departure[], icon: string, color: string) => {
    if (!departures || departures.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ ...styles.categoryTitle, color }}>{icon}</h3>
        <div style={styles.departureGrid}>
          {departures.slice(0, 6).map((dep, idx) => (
            <DepartureCard key={idx} departure={dep} color={color} />
          ))}
        </div>
      </div>
    );
  };

  if (loading && !departures) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading departures...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{site.Name}</h2>
        <button onClick={fetchDepartures} style={styles.refreshButton}>
          Refresh
        </button>
      </div>

      {departures && (
        <div>
          {renderDepartures(departures.metros, '🚇 Metro', '#0089d1')}
          {renderDepartures(departures.trains, '🚆 Train', '#ec6607')}
          {renderDepartures(departures.buses, '🚌 Bus', '#d91f2a')}
          {renderDepartures(departures.trams, '🚊 Tram', '#82c341')}
          {renderDepartures(departures.ships, '⛴️ Ship', '#009cdd')}
        </div>
      )}

      {departures &&
        !departures.metros.length &&
        !departures.trains.length &&
        !departures.buses.length &&
        !departures.trams.length &&
        !departures.ships.length && (
        <div style={styles.noDepartures}>
          No departures available at this time
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a202c',
  },
  refreshButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  categoryTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '16px',
  },
  departureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#e53e3e',
  },
  noDepartures: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: '#718096',
  },
};

export default DepartureBoard;
