import React, { useState } from 'react'
import { useAlerts, Alert } from '../hooks/useAlerts'

interface DisruptionBannerProps {
  siteId: string
}

const SEVERITY_STYLES: Record<Alert['severity'], React.CSSProperties> = {
  info: {
    background: 'rgba(104, 183, 255, 0.12)',
    borderColor: 'rgba(104, 183, 255, 0.35)',
    color: '#c7e6ff',
  },
  warning: {
    background: 'rgba(247, 185, 85, 0.14)',
    borderColor: 'rgba(247, 185, 85, 0.35)',
    color: '#ffe3b2',
  },
  critical: {
    background: 'rgba(255, 122, 122, 0.14)',
    borderColor: 'rgba(255, 122, 122, 0.35)',
    color: '#ffd2d2',
  },
}

const SEVERITY_DOT_COLOR: Record<Alert['severity'], string> = {
  critical: '#ff7a7a',
  warning: '#f7b955',
  info: '#68b7ff',
}

function AlertItem({ alert }: { alert: Alert }) {
  const [expanded, setExpanded] = useState(false)
  const style = SEVERITY_STYLES[alert.severity]

  return (
    <div style={{ ...styles.alertItem, ...style }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ ...styles.alertHeader, color: style.color }}
        aria-expanded={expanded}
      >
        <span style={{ ...styles.severityDot, background: SEVERITY_DOT_COLOR[alert.severity] }} aria-hidden="true" />
        <span style={styles.alertTitle}>{alert.header || 'Service disruption'}</span>
        <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && alert.details && (
        <p style={styles.alertDetails}>{alert.details}</p>
      )}
    </div>
  )
}

export default function DisruptionBanner({ siteId }: DisruptionBannerProps) {
  const { alerts, connectionState } = useAlerts(siteId)

  if (alerts.length === 0) return null

  return (
    <div style={styles.banner} role="region" aria-label="Service disruptions">
      <div style={styles.bannerHeader}>
        <span style={styles.bannerTitle}>Service disruptions</span>
        {connectionState === 'connected' && (
          <span style={styles.badgeLive}>Live</span>
        )}
        {(connectionState === 'connecting' || connectionState === 'disconnected') && (
          <span style={styles.badgeUpdating}>Updating...</span>
        )}
      </div>
      <div style={styles.alertList}>
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, any> = {
  banner: {
    borderRadius: '16px',
    border: '1px solid rgba(255, 122, 122, 0.2)',
    background: 'rgba(255, 122, 122, 0.06)',
    padding: '14px 16px',
    marginBottom: '12px',
  },
  bannerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  bannerTitle: {
    fontSize: '0.82rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#ffd2d2',
  },
  badgeLive: {
    padding: '3px 8px',
    borderRadius: '999px',
    background: 'rgba(113, 211, 155, 0.18)',
    color: '#bdf7d5',
    fontSize: '0.75rem',
    fontWeight: 800,
    border: '1px solid rgba(113, 211, 155, 0.3)',
  },
  badgeUpdating: {
    padding: '3px 8px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--muted)',
    fontSize: '0.75rem',
    fontWeight: 700,
    border: '1px solid var(--border)',
  },
  alertList: {
    display: 'grid',
    gap: '8px',
  },
  alertItem: {
    borderRadius: '12px',
    border: '1px solid',
    padding: '10px 12px',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    padding: 0,
  },
  severityDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  } as React.CSSProperties,
  alertTitle: {
    flex: 1,
    fontSize: '0.9rem',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  chevron: {
    fontSize: '0.7rem',
    opacity: 0.7,
    flexShrink: 0,
  },
  alertDetails: {
    marginTop: '8px',
    fontSize: '0.85rem',
    lineHeight: 1.5,
    opacity: 0.85,
    paddingLeft: '16px',
  },
}
