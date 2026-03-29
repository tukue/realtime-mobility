import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import StopBoard from './components/stopBoard';
import FavoritesList from './components/FavoritesList';
import { Site } from './types';

function App() {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  return (
    <div style={styles.shell}>
      <div style={styles.glowLeft} />
      <div style={styles.glowRight} />

      <main style={styles.container}>
        <header style={styles.header}>
          <div style={styles.kicker}>Stockholm bus arrivals</div>
          <h1 style={styles.title}>Dinner lines, live and easy to read.</h1>
          <p style={styles.subtitle}>
            Search a stop, tap a favourite, and check the next bus in seconds with live updates and service alerts.
          </p>

          <div style={styles.pills}>
            <span style={styles.pill}>Bus stop</span>
            <span style={styles.pill}>30-second refresh</span>
            <span style={styles.pillAccent}>Service alerts included</span>
          </div>
        </header>

        <section style={styles.grid}>
          <aside style={styles.sidebar}>
            <div style={styles.card}>
              <div style={styles.cardLabel}>Find a stop</div>
              <SearchBar onSiteSelect={setSelectedSite} />
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Saved stops</div>
              <FavoritesList onSiteSelect={setSelectedSite} />
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>How it works</div>
              <ol style={styles.steps}>
                <li>Search for a bus stop or pick a favourite.</li>
                <li>Open the stop to see the next arrivals.</li>
                <li>Watch the board refresh automatically.</li>
              </ol>
            </div>
          </aside>

          <section style={styles.boardArea}>
            {selectedSite ? (
              <StopBoard site={selectedSite} />
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyBadge}>Ready when you are</div>
                <h2 style={styles.emptyTitle}>Select a stop to see live bus arrivals.</h2>
                <p style={styles.emptyText}>
                  The board will show the next buses, arrival times, and any service issues once you choose a stop.
                </p>
                <div style={styles.emptyHint}>
                  Try a central stop like Skanstull, Odenplan, or Stureplan.
                </div>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
  },
  glowLeft: {
    position: 'absolute',
    top: '-120px',
    left: '-160px',
    width: '340px',
    height: '340px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(104, 183, 255, 0.22) 0%, rgba(104, 183, 255, 0) 70%)',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute',
    right: '-160px',
    top: '60px',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(247, 185, 85, 0.18) 0%, rgba(247, 185, 85, 0) 68%)',
    pointerEvents: 'none',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '24px 20px 32px',
  },
  header: {
    padding: '28px 0 26px',
  },
  kicker: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(104, 183, 255, 0.12)',
    color: 'var(--brand)',
    fontSize: '13px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(2.4rem, 5vw, 4.8rem)',
    lineHeight: 0.95,
    letterSpacing: '-0.04em',
    margin: '18px 0 14px',
    maxWidth: '10ch',
  },
  subtitle: {
    fontSize: '1.05rem',
    lineHeight: 1.65,
    maxWidth: '62ch',
    color: 'var(--muted)',
  },
  pills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '20px',
  },
  pill: {
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    fontSize: '0.92rem',
    fontWeight: 700,
  },
  pillAccent: {
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(247, 185, 85, 0.14)',
    color: '#ffe3b2',
    border: '1px solid rgba(247, 185, 85, 0.35)',
    fontSize: '0.92rem',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
    gap: '20px',
    alignItems: 'start',
  },
  sidebar: {
    display: 'grid',
    gap: '16px',
  },
  card: {
    padding: '18px',
    borderRadius: '24px',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    boxShadow: '0 24px 70px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(18px)',
  },
  cardLabel: {
    fontSize: '0.82rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '12px',
  },
  steps: {
    margin: 0,
    paddingLeft: '20px',
    color: 'var(--muted)',
    lineHeight: 1.7,
    display: 'grid',
    gap: '8px',
  },
  boardArea: {
    minWidth: 0,
  },
  emptyState: {
    minHeight: '520px',
    padding: '28px',
    borderRadius: '28px',
    background: 'linear-gradient(180deg, rgba(14, 27, 48, 0.94) 0%, rgba(8, 15, 27, 0.96) 100%)',
    border: '1px solid var(--border)',
    boxShadow: '0 30px 90px rgba(0, 0, 0, 0.28)',
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'start',
    gap: '14px',
  },
  emptyBadge: {
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(113, 211, 155, 0.14)',
    color: '#bdf7d5',
    fontSize: '0.85rem',
    fontWeight: 800,
  },
  emptyTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 3vw, 3rem)',
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
    maxWidth: '12ch',
  },
  emptyText: {
    color: 'var(--muted)',
    fontSize: '1rem',
    lineHeight: 1.6,
    maxWidth: '56ch',
  },
  emptyHint: {
    padding: '12px 14px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
};

export default App;
