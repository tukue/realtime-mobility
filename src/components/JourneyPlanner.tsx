import React, { useEffect, useId, useRef, useState } from 'react'
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
  selected: Site | null
  onChange: (val: string) => void
  onSelect: (site: Site) => void
}

function StopInput({ label, inputId, value, selected, onChange, onSelect }: StopInputProps) {
  const [results, setResults] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = `${inputId}-results`
  const statusId = `${inputId}-status`

  useEffect(() => {
    let cancelled = false
    setResults([])
    setError(null)
    setSearched(false)
    setActiveIndex(-1)
    setLoading(false)
    if (selected || value.trim().length < 2) return
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const sites = await searchStops(value.trim())
        if (!cancelled) { setResults(sites); setSearched(true) }
      } catch {
        if (!cancelled) setError('Stop search is unavailable. Edit the search to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [value, selected])

  const choose = (site: Site) => {
    onSelect(site)
    setOpen(false)
    setActiveIndex(-1)
  }
  const expanded = open && results.length > 0

  return (
    <div style={styles.inputWrap}>
      <label htmlFor={inputId} style={styles.inputLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-describedby={statusId}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setActiveIndex(-1) }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setOpen(false); setActiveIndex(-1) }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setActiveIndex(-1) }
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length) {
              e.preventDefault()
              setOpen(true)
              setActiveIndex(index => e.key === 'ArrowDown'
                ? (index + 1) % results.length
                : (index <= 0 ? results.length - 1 : index - 1))
            }
            if (e.key === 'Enter' && expanded && activeIndex >= 0) {
              e.preventDefault()
              choose(results[activeIndex])
            }
          }}
          placeholder={`Search ${label.toLowerCase()}...`}
          style={styles.input}
          autoComplete="off"
        />
        {expanded && (
          <div id={listId} role="listbox" aria-label={`${label} stops`} style={styles.dropdown}>
            {results.map((site, index) => (
              <button
                key={site.SiteId}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                tabIndex={-1}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => choose(site)}
                style={activeIndex === index ? { ...styles.dropdownItem, background: 'rgba(104,183,255,0.18)' } : styles.dropdownItem}
              >
                <span style={styles.dropdownName}>{site.Name}</span>
                <span style={styles.dropdownType}>{site.Type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p id={statusId} role="status" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
        {loading ? 'Searching stops...' : error ?? (selected ? `${selected.Name} selected.` : searched
          ? results.length ? `${results.length} stops found. Use arrow keys and Enter to select.` : 'No stops found. Try another name.'
          : 'Type at least two characters, then select a stop.')}
      </p>
    </div>
  )
}

function TripCard({ trip }: { trip: Trip }) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()

  return (
    <div style={styles.tripCard}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={styles.tripHeader}
        aria-expanded={expanded}
        aria-controls={detailsId}
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
        <div id={detailsId} style={styles.legList}>
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

  const requestId = useRef(0)
  const controller = useRef<AbortController | null>(null)

  const invalidate = () => {
    requestId.current += 1
    controller.current?.abort()
    setLoading(false)
    setResult(null)
    setError(null)
  }

  useEffect(() => {
    invalidate()
    setOriginSite(initialOrigin ?? null)
    setOriginText(initialOrigin?.Name ?? '')
  }, [initialOrigin?.SiteId])

  useEffect(() => () => {
    requestId.current += 1
    controller.current?.abort()
  }, [])

  const sameStop = !!originSite && originSite.SiteId === destSite?.SiteId
  const canSearch = !!originSite && !!destSite && !sameStop && !loading

  const handleSearch = async () => {
    if (!canSearch || !originSite || !destSite) return
    const currentRequest = ++requestId.current
    controller.current?.abort()
    const pending = new AbortController()
    controller.current = pending
    const timeout = window.setTimeout(() => pending.abort(), 15000)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/journey/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin_id: originSite.SiteId, destination_id: destSite.SiteId }),
        signal: pending.signal,
      })
      if (!res.ok) throw new Error('Journey service unavailable')
      const data: JourneyResult = await res.json()
      if (!Array.isArray(data.trips)) throw new Error('Invalid journey response')
      if (currentRequest === requestId.current) setResult(data)
    } catch {
      if (currentRequest === requestId.current) {
        setError('Unable to load routes. Check your connection and try again.')
      }
    } finally {
      window.clearTimeout(timeout)
      if (currentRequest === requestId.current) setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={e => { e.preventDefault(); void handleSearch() }} aria-label="Journey search">
        <div style={styles.inputs}>
          <StopInput
            label="Origin"
            inputId="journey-origin"
            value={originText}
            selected={originSite}
            onChange={text => { invalidate(); setOriginText(text); setOriginSite(null) }}
            onSelect={site => { invalidate(); setOriginSite(site); setOriginText(site.Name); onStopSelect?.(site) }}
          />
          <StopInput
            label="Destination"
            inputId="journey-destination"
            value={destText}
            selected={destSite}
            onChange={text => { invalidate(); setDestText(text); setDestSite(null) }}
            onSelect={site => { invalidate(); setDestSite(site); setDestText(site.Name) }}
          />
        </div>
        {sameStop && <p role="alert" style={styles.errorBox}>Choose a destination different from your origin.</p>}
        <button type="submit" disabled={!canSearch} style={{ ...styles.searchBtn, marginTop: '14px', opacity: canSearch || loading ? 1 : 0.55 }}>
          {loading ? 'Searching...' : 'Find routes'}
        </button>
      </form>

      <div role="status" aria-live="polite" aria-atomic="true">
        {loading ? 'Finding routes...' : result ? `${result.trips.length} routes found.` : ''}
      </div>
      {error && (
        <div role="alert" style={styles.errorBox}>
          {error}
          <button type="button" onClick={handleSearch} disabled={!canSearch} style={styles.retryBtn}>Try again</button>
        </div>
      )}
      {result && result.trips.length === 0 && (
        <div style={styles.emptyBox}>
          No routes found. Try again with other stations.
          <button type="button" onClick={handleSearch} disabled={!canSearch} style={styles.retryBtn}>Try again</button>
        </div>
      )}
      {result && result.trips.length > 0 && (
        <section aria-label="Journey results" style={styles.results}>
          <h3 style={styles.resultsHeader}>
            {result.origin_name || originSite?.Name} → {result.destination_name || destSite?.Name}
          </h3>
          {result.trips.map((trip, i) => <TripCard key={i} trip={trip} />)}
        </section>
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
    borderRadius: '14px', background: 'rgba(255,255,255,0.05)',
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
