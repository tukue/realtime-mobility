import React, { useState } from 'react'
import { Site } from '../types'
import { searchStops } from '../lib/stopSearch'

interface JourneyLeg {
  origin: string
  destination: string
  departure_time: string
  arrival_time: string
  line_number: string
  transport_mode: string
  direction: string
}

interface Trip {
  duration_minutes: number
  changes: number
  legs: JourneyLeg[]
  departure_time: string
  arrival_time: string
}

interface JourneyResult {
  trips: Trip[]
  origin_name: string
  destination_name: string
}

interface StopInputProps {
  label: string
  inputId: string
  value: string
  onChange: (val: string) => void
  onSelect: (site: Site) => void
}

function StopInput({ label, inputId, value, onChange, onSelect }: StopInputProps) {
  const [results, setResults] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    onChange(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const sites = await searchStops(q)
        setResults(sites)
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleSelect = (site: Site) => {
    onSelect(site)
    onChange(site.Name)
    setOpen(false)
    setResults([])
  }

  return (
    <div style={styles.inputWrap}>
      <label htmlFor={inputId} style={styles.inputLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={`Search ${label.toLowerCase()}...`}
          style={styles.input}
          autoComplete="off"
        />
        {loading && <span style={styles.inputLoader}>...</span>}
        {open && results.length > 0 && (
          <div style={styles.dropdown}>
            {results.map(site => (
              <button
                key={site.SiteId}
                type="button"
                onMouseDown={() => handleSelect(site)}
                style={styles.dropdownItem}
              >
                <span style={styles.dropdownName}>{site.Name}</span>
                <span style={styles.dropdownType}>{site.Type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={styles.tripCard}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={styles.tripHeader}
        aria-expanded={expanded}
      >
        <div style={styles.tripMeta}>
          <span style={styles.tripTime}>{trip.departure_time} → {trip.arrival_time}</span>
          <span style={styles.tripDuration}>{trip.duration_minutes} min</span>
        </div>
        <div style={styles.tripInfo}>
          <span style={styles.tripChanges}>{trip.changes} change{trip.changes !== 1 ? 's' : ''}</span>
          <span style={styles.tripLines}>
            {trip.legs.map(l => l.line_number).filter(Boolean).join(' → ')}
          </span>
        </div>
        <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={styles.legList}>
          {trip.legs.map((leg, i) => (
            <div key={i} style={styles.leg}>
              <div style={styles.legLine}>
                {leg.line_number && <span style={styles.legBadge}>{leg.line_number}</span>}
                <span style={styles.legMode}>{leg.transport_mode}</span>
                {leg.direction && <span style={styles.legDir}>→ {leg.direction}</span>}
              </div>
              <div style={styles.legStops}>
                <span>{leg.origin}</span>
                <span style={styles.legTime}>{leg.departure_time}</span>
                <span style={styles.legArrow}>↓</span>
                <span>{leg.destination}</span>
                <span style={styles.legTime}>{leg.arrival_time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface JourneyPlannerProps {
  initialOrigin?: Site
  onStopSelect?: (site: Site) => void
}

export default function JourneyPlanner({ initialOrigin, onStopSelect }: JourneyPlannerProps) {
  const [originText, setOriginText] = useState(initialOrigin?.Name ?? '')
  const [destText, setDestText] = useState('')
  const [originSite, setOriginSite] = useState<Site | null>(initialOrigin ?? null)
  const [destSite, setDestSite] = useState<Site | null>(null)
  const [result, setResult] = useState<JourneyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOriginSelect = (site: Site) => {
    setOriginSite(site)
    onStopSelect?.(site)
  }

  const handleSearch = async () => {
    if (!originSite || !destSite) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/journey/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin_id: originSite.SiteId, destination_id: destSite.SiteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || `HTTP ${res.status}`)
      }
      setResult(await res.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.inputs}>
        <StopInput
          label="Origin"
          inputId="journey-origin"
          value={originText}
          onChange={setOriginText}
          onSelect={handleOriginSelect}
        />
        <StopInput
          label="Destination"
          inputId="journey-destination"
          value={destText}
          onChange={setDestText}
          onSelect={setDestSite}
        />
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={!originSite || !destSite || loading}
        style={styles.searchBtn}
      >
        {loading ? 'Searching...' : 'Find routes'}
      </button>

      {error && <div style={styles.errorBox}>{error}</div>}

      {result && result.trips.length === 0 && (
        <div style={styles.emptyBox}>
          No routes found for this journey.
          <button type="button" onClick={handleSearch} style={styles.retryBtn}>Try again</button>
        </div>
      )}

      {result && result.trips.length > 0 && (
        <div style={styles.results}>
          <div style={styles.resultsHeader}>
            {result.origin_name || originSite?.Name} → {result.destination_name || destSite?.Name}
          </div>
          {result.trips.map((trip, i) => (
            <TripCard key={i} trip={trip} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'grid', gap: '14px' },
  inputs: { display: 'grid', gap: '10px' },
  inputWrap: { display: 'grid', gap: '6px', position: 'relative' },
  inputLabel: {
    fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--muted)',
  },
  input: {
    width: '100%', padding: '12px 16px', fontSize: '15px',
    color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: '14px', background: 'rgba(255,255,255,0.05)', outline: 'none',
  },
  inputLoader: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
    background: 'var(--panel-strong)', border: '1px solid var(--border)',
    borderRadius: '14px', marginTop: '6px', maxHeight: '260px', overflowY: 'auto',
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
  },
  dropdownItem: {
    width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text)', textAlign: 'left',
  },
  dropdownName: { fontSize: '0.92rem', fontWeight: 700 },
  dropdownType: { fontSize: '0.8rem', color: 'var(--muted)' },
  searchBtn: {
    padding: '13px 18px', borderRadius: '14px', fontWeight: 800, fontSize: '0.95rem',
    background: 'rgba(104,183,255,0.16)', color: '#c7e6ff',
    border: '1px solid rgba(104,183,255,0.35)', cursor: 'pointer',
  },
  errorBox: {
    padding: '12px 14px', borderRadius: '12px',
    background: 'rgba(255,122,122,0.12)', border: '1px solid rgba(255,122,122,0.28)',
    color: '#ffd2d2', fontSize: '0.9rem',
  },
  emptyBox: {
    padding: '14px 16px', borderRadius: '14px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.14)',
    color: 'var(--muted)', fontSize: '0.92rem',
  },
  retryBtn: {
    padding: '8px 12px', borderRadius: '999px', border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer',
  },
  results: { display: 'grid', gap: '10px' },
  resultsHeader: {
    fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--muted)',
  },
  tripCard: {
    borderRadius: '16px', border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)', overflow: 'hidden',
  },
  tripHeader: {
    width: '100%', padding: '14px 16px', display: 'grid',
    gridTemplateColumns: '1fr auto', gap: '8px', background: 'none',
    border: 'none', cursor: 'pointer', color: 'var(--text)', textAlign: 'left',
  },
  tripMeta: { display: 'flex', gap: '12px', alignItems: 'center' },
  tripTime: { fontSize: '0.96rem', fontWeight: 800 },
  tripDuration: {
    padding: '3px 8px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700,
    background: 'rgba(104,183,255,0.14)', color: '#c7e6ff',
    border: '1px solid rgba(104,183,255,0.28)',
  },
  tripInfo: { display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' },
  tripChanges: { fontSize: '0.82rem', color: 'var(--muted)' },
  tripLines: { fontSize: '0.82rem', color: 'var(--muted)' },
  chevron: { fontSize: '0.7rem', opacity: 0.6, alignSelf: 'center' },
  legList: {
    borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'grid', gap: '12px',
  },
  leg: { display: 'grid', gap: '6px' },
  legLine: { display: 'flex', gap: '8px', alignItems: 'center' },
  legBadge: {
    padding: '2px 8px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800,
    background: 'rgba(255,255,255,0.1)', color: 'var(--text)',
  },
  legMode: { fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'capitalize' },
  legDir: { fontSize: '0.8rem', color: 'var(--muted)' },
  legStops: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: '0.88rem' },
  legTime: { color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'right' },
  legArrow: { color: 'var(--muted)', fontSize: '0.75rem' },
}
