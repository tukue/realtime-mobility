import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import DepartureBoard from './components/DepartureBoard';
import FavoritesList from './components/FavoritesList';
import { Site } from './types';

function App() {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Stockholm Travel Planner</h1>
        <p style={styles.subtitle}>Real-time bus, metro, and train arrivals</p>
      </header>

      <div style={styles.content}>
        <div style={styles.searchSection}>
          <SearchBar onSiteSelect={setSelectedSite} />
          <FavoritesList onSiteSelect={setSelectedSite} />
        </div>

        {selectedSite && (
          <DepartureBoard site={selectedSite} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '24px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    color: 'white',
  },
  title: {
    fontSize: '48px',
    fontWeight: '700',
    marginBottom: '8px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9,
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  searchSection: {
    marginBottom: '32px',
  },
};

export default App;
