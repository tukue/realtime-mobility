import { useEffect, useRef, useState } from 'react'

export interface Alert {
  id: string
  header: string
  details: string
  severity: 'info' | 'warning' | 'critical'
  scope: string[]
  transport_mode?: string
  valid_from?: string
  valid_to?: string
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseAlertsReturn {
  alerts: Alert[]
  stopDeviations: Alert[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  connectionState: ConnectionState
}

const MAX_RECONNECT_ATTEMPTS = 3
const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30000
const POLL_INTERVAL_MS = 60000

export function useAlerts(siteId: string): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stopDeviations, setStopDeviations] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')

  const wsRef = useRef<WebSocket | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const backoffRef = useRef(BASE_BACKOFF_MS)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    attemptsRef.current = 0
    backoffRef.current = BASE_BACKOFF_MS

    function stopPolling() {
      if (pollTimerRef.current !== null) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }

    function startPolling() {
      stopPolling()
      const poll = async () => {
        try {
          const res = await fetch(`/api/alerts/?site_id=${siteId}&source=free`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          if (!activeRef.current) return
          setAlerts(data.alerts ?? [])
          setStopDeviations(data.stop_deviations ?? [])
          setLastUpdated(new Date())
          setLoading(false)
          setError(null)
        } catch (e) {
          if (activeRef.current) setError(String(e))
        }
      }
      poll()
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS)
    }

    function connect() {
      if (!activeRef.current) return
      setConnectionState('connecting')

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${protocol}://${window.location.host}/api/alerts/ws/${siteId}`)
      wsRef.current = ws

      ws.onopen = () => {
        if (!activeRef.current) { ws.close(); return }
        setConnectionState('connected')
        attemptsRef.current = 0
        backoffRef.current = BASE_BACKOFF_MS
        stopPolling()
      }

      ws.onmessage = (event) => {
        if (!activeRef.current) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'alerts') {
            setAlerts(msg.data?.alerts ?? [])
            setStopDeviations(msg.data?.stop_deviations ?? [])
            setLastUpdated(new Date(msg.timestamp))
            setLoading(false)
            setError(null)
          } else if (msg.type === 'error') {
            setError(msg.message)
            setLoading(false)
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!activeRef.current) return
        setConnectionState('disconnected')
        if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          attemptsRef.current += 1
          const delay = backoffRef.current
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
          reconnectTimerRef.current = setTimeout(connect, delay)
        } else {
          setConnectionState('error')
          startPolling()
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      activeRef.current = false
      if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current)
      stopPolling()
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [siteId])

  return { alerts, stopDeviations, loading, error, lastUpdated, connectionState }
}
