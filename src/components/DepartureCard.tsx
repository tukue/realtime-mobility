import React from 'react';
import { Departure } from '../types';

interface DepartureCardProps {
  departure: Departure;
  color: string;
}

function DepartureCard({ departure, color }: DepartureCardProps) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.lineNumber, backgroundColor: color }}>
        {departure.line_number}
      </div>
      <div style={styles.info}>
        <div style={styles.destination}>{departure.destination}</div>
        <div style={styles.time}>{departure.display_time}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  lineNumber: {
    minWidth: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '700',
    fontSize: '18px',
    marginRight: '16px',
  },
  info: {
    flex: 1,
  },
  destination: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '4px',
  },
  time: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#667eea',
  },
};

export default DepartureCard;
