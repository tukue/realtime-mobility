import React from 'react';
import { Departure } from '../types';

interface LiveBoardCardProps {
  entry: Departure;
  color: string;
}

function LiveBoardCard({ entry, color }: LiveBoardCardProps) {
  const hasDeviations = entry.has_deviations || (entry.deviations && entry.deviations.length > 0);
  const transportMode = entry.transport_mode ? entry.transport_mode.toUpperCase() : 'LIVE';

  return (
    <div style={styles.card}>
      <div style={{ ...styles.lineNumber, backgroundColor: color }}>
        <span style={styles.lineNumberLabel}>{entry.line_number}</span>
        <span style={styles.modeTag}>{transportMode}</span>
      </div>

      <div style={styles.info}>
        <div style={styles.topRow}>
          <div style={styles.destination}>{entry.destination}</div>
          <div style={styles.time}>{entry.display_time}</div>
        </div>

        <div style={styles.bottomRow}>
          <div style={styles.meta}>{entry.expected_datetime}</div>
          {hasDeviations ? <div style={styles.alert}>Possible delay</div> : <div style={styles.ok}>On track</div>}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '16px',
    padding: '16px',
    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.04) 100%)',
    borderRadius: '22px',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.12)',
  },
  lineNumber: {
    minWidth: '60px',
    height: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    borderRadius: '16px',
    color: 'white',
    fontWeight: '800',
    fontSize: '1rem',
    letterSpacing: '-0.02em',
  },
  lineNumberLabel: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.15rem',
    lineHeight: 1,
  },
  modeTag: {
    fontSize: '0.58rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    opacity: 0.92,
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'grid',
    gap: '10px',
  },
  destination: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  time: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#ffdca1',
    letterSpacing: '-0.03em',
    whiteSpace: 'nowrap',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  meta: {
    color: 'var(--muted)',
    fontSize: '0.88rem',
    lineHeight: 1.4,
  },
  alert: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(255, 122, 122, 0.14)',
    color: '#ffc1c1',
    fontSize: '0.78rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  ok: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(113, 211, 155, 0.14)',
    color: '#c8f6db',
    fontSize: '0.78rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
};

export default LiveBoardCard;
