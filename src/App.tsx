import React, { useEffect, useState } from 'react';
import SearchBar from './components/SearchBar';
import StopBoard from './components/stopBoard';
import FavoritesList from './components/FavoritesList';
import NearbyStops from './components/NearbyStops';
import { Site } from './types';

const RECENT_SITES_KEY = 'realtime-mobility.recent-sites';
const STARTING_LOCATION_KEY = 'realtime-mobility.starting-location';
const MAX_RECENTS = 4;

function loadRecentSites(): Site[] {
  try {
    const stored = window.localStorage.getItem(RECENT_SITES_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, MAX_RECENTS);
  } catch (error) {
    console.error('Failed to load recent stops:', error);
    return [];
  }
}

function App() {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [startingLocation, setStartingLocation] = useState('');
  const [recentSites, setRecentSites] = useState<Site[]>([]);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    setRecentSites(loadRecentSites());
  }, []);

  useEffect(() => {
    try {
      const storedStartingLocation = window.localStorage.getItem(STARTING_LOCATION_KEY);
      if (storedStartingLocation) {
        setStartingLocation(storedStartingLocation);
      }
    } catch (error) {
      console.error('Failed to load starting stop:', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (startingLocation.trim()) {
        window.localStorage.setItem(STARTING_LOCATION_KEY, startingLocation.trim());
      } else {
        window.localStorage.removeItem(STARTING_LOCATION_KEY);
      }
    } catch (error) {
      console.error('Failed to save starting stop:', error);
    }
  }, [startingLocation]);

  useEffect(() => {
    let cancelled = false;

    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health');
        if (!cancelled) {
          setBackendStatus(response.ok ? 'online' : 'offline');
        }
      } catch {
        if (!cancelled) {
          setBackendStatus('offline');
        }
      }
    };

    checkBackend();
    const interval = window.setInterval(checkBackend, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleSiteSelect = (site: Site) => {
    setSelectedSite(site);
    setRecentSites((current) => {
      const next = [site, ...current.filter((item) => item.SiteId !== site.SiteId)].slice(0, MAX_RECENTS);
      try {
        window.localStorage.setItem(RECENT_SITES_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Failed to save recent stops:', error);
      }
      return next;
    });
  };

  return (
    <div style={styles.shell}>
      <div style={styles.glowLeft} />
      <div style={styles.glowRight} />

      <main style={styles.container}>
        <header style={styles.header}>
          <div style={styles.kicker}>Stockholm travel planner</div>
          <h1 style={styles.title}>Find your stop, then check the live buses.</h1>
          <p style={styles.subtitle}>
            Search a stop or station, save the ones you use often, and keep the board open while you move.
          </p>

          <div style={styles.pills}>
            <span style={styles.pill}>All transport modes</span>
            <span style={styles.pill}>30-second refresh</span>
            <span style={styles.pillAccent}>Recent stops saved locally</span>
            <span style={backendStatus === 'online' ? styles.pillSuccess : backendStatus === 'checking' ? styles.pillNeutral : styles.pillDanger}>
              Backend {backendStatus}
            </span>
          </div>
        </header>

        <section style={styles.grid}>
          <aside style={styles.sidebar}>
            <div style={styles.card}>
              <div style={styles.cardLabel}>Find a stop</div>
              <SearchBar onSiteSelect={handleSiteSelect} />
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Manual starting position</div>
              <label style={styles.inlineLabel} htmlFor="starting-location">
                Type a stop, station, or area
              </label>
              <input
                id="starting-location"
                type="text"
                value={startingLocation}
                onChange={(e) => setStartingLocation(e.target.value)}
                placeholder="Stop, station, or area"
                style={styles.startInput}
              />
              <div style={styles.helperText}>
                This MVP uses manual input first. We can add live location later if we need it.
              </div>
              <div style={styles.nearbyWrap}>
                <NearbyStops startingPosition={startingLocation} onStopSelect={handleSiteSelect} />
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Recent stops</div>
              {recentSites.length > 0 ? (
                <div style={styles.stack}>
                  {recentSites.map((site) => (
                    <button
                      key={site.SiteId}
                      type="button"
                      onClick={() => handleSiteSelect(site)}
                      style={styles.recentButton}
                    >
                      <span style={styles.recentName}>{site.Name}</span>
                      <span style={styles.recentMeta}>{site.Type}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyMini}>
                  Your last searched stops will appear here so you can reopen them in one tap.
                </div>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Saved stops</div>
              <FavoritesList onSiteSelect={handleSiteSelect} />
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>How it works</div>
              <ol style={styles.steps}>
                <li>Search for a stop or pick a favourite.</li>
                <li>Open the stop to see all live buses.</li>
                <li>Switch modes or refresh the board while you travel.</li>
              </ol>
            </div>
          </aside>

          <section style={styles.boardArea}>
            {selectedSite ? (
              <StopBoard site={selectedSite} startingLocation={startingLocation} />
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyBadge}>Ready when you are</div>
                <h2 style={styles.emptyTitle}>Select a stop to see live buses.</h2>
                <p style={styles.emptyText}>
                  The board shows live buses, metro, trains, trams, and ships once you choose a stop.
                </p>
                <div style={styles.emptyHint}>
                  Try a central stop like Skanstull, Odenplan, or Stureplan, then add your starting location if needed.
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
  pillSuccess: {
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(113, 211, 155, 0.14)',
    color: '#bdf7d5',
    border: '1px solid rgba(113, 211, 155, 0.28)',
    fontSize: '0.92rem',
    fontWeight: 700,
  },
  pillNeutral: {
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    fontSize: '0.92rem',
    fontWeight: 700,
  },
  pillDanger: {
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(255, 122, 122, 0.12)',
    color: '#ffd2d2',
    border: '1px solid rgba(255, 122, 122, 0.25)',
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
  inlineLabel: {
    display: 'block',
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '10px',
  },
  startInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    outline: 'none',
    marginBottom: '10px',
  },
  helperText: {
    color: 'var(--muted)',
    fontSize: '0.88rem',
    lineHeight: 1.5,
  },
  nearbyWrap: {
    marginTop: '14px',
  },
  stack: {
    display: 'grid',
    gap: '10px',
  },
  recentButton: {
    width: '100%',
    padding: '14px 16px',
    display: 'grid',
    gap: '4px',
    textAlign: 'left',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
  },
  recentName: {
    fontSize: '0.96rem',
    fontWeight: 800,
  },
  recentMeta: {
    fontSize: '0.82rem',
    color: 'var(--muted)',
  },
  emptyMini: {
    padding: '14px 16px',
    borderRadius: '18px',
    border: '1px dashed rgba(255, 255, 255, 0.14)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--muted)',
    fontSize: '0.92rem',
    lineHeight: 1.5,
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
