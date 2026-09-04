/**
 * Tests for alertStore, focused on syncActiveAlerts.
 *
 * Alerts arrive from a 2s poll that re-reports the same underlying conditions,
 * so the sync has to merge rather than replace: operator actions (acknowledge,
 * dismiss, resolve) must survive, and unchanged alerts must keep their object
 * identity so memoized rows don't re-render on every poll.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAlertStore, type Alert } from '../alertStore'

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'influx-site-a-asset-1-level-01-level-bad',
    siteId: 'site-a',
    assetId: 'asset-1',
    severity: 'critical',
    title: 'level quality bad',
    description: 'Quality bad reported',
    timestamp: '2026-01-01T00:00:00Z',
    resolved: false,
    measurement: 'level',
    value: 5.5,
    ...overrides,
  }
}

describe('alertStore', () => {
  beforeEach(() => {
    useAlertStore.setState({
      activeAlerts: [],
      alertHistory: [],
      dismissedAlertIds: [],
    })
  })

  describe('syncActiveAlerts', () => {
    it('adds alerts that are not yet known', () => {
      useAlertStore.getState().syncActiveAlerts([makeAlert()])

      expect(useAlertStore.getState().activeAlerts).toHaveLength(1)
    })

    it('drops alerts the source no longer reports', () => {
      useAlertStore.getState().syncActiveAlerts([makeAlert()])

      useAlertStore.getState().syncActiveAlerts([])

      expect(useAlertStore.getState().activeAlerts).toHaveLength(0)
    })

    it('preserves an acknowledgement across a poll', () => {
      const alert = makeAlert()
      useAlertStore.getState().syncActiveAlerts([alert])
      useAlertStore.getState().acknowledgeAlert(alert.id, 'user-1', 'Ana')

      useAlertStore.getState().syncActiveAlerts([makeAlert()])

      const [synced] = useAlertStore.getState().activeAlerts
      expect(synced.acknowledgedBy).toBe('user-1')
      expect(synced.acknowledgedByName).toBe('Ana')
    })

    it('does not resurrect a dismissed alert', () => {
      const alert = makeAlert()
      useAlertStore.getState().syncActiveAlerts([alert])
      useAlertStore.getState().dismissAlert(alert.id)

      useAlertStore.getState().syncActiveAlerts([makeAlert()])

      expect(useAlertStore.getState().activeAlerts).toHaveLength(0)
    })

    it('does not resurrect a resolved alert', () => {
      const alert = makeAlert()
      useAlertStore.getState().syncActiveAlerts([alert])
      useAlertStore.getState().resolveAlert(alert.id, 'user-1')

      useAlertStore.getState().syncActiveAlerts([makeAlert()])

      expect(useAlertStore.getState().activeAlerts).toHaveLength(0)
    })

    it('appends a dismissed alert to history exactly once', () => {
      const alert = makeAlert()
      useAlertStore.getState().syncActiveAlerts([alert])
      useAlertStore.getState().dismissAlert(alert.id)

      useAlertStore.getState().syncActiveAlerts([makeAlert()])
      useAlertStore.getState().syncActiveAlerts([makeAlert()])

      expect(useAlertStore.getState().alertHistory).toHaveLength(1)
    })

    it('keeps object identity when nothing changed', () => {
      useAlertStore.getState().syncActiveAlerts([makeAlert()])
      const before = useAlertStore.getState().activeAlerts

      useAlertStore.getState().syncActiveAlerts([makeAlert()])

      expect(useAlertStore.getState().activeAlerts).toBe(before)
    })

    it('applies source-owned field changes', () => {
      useAlertStore.getState().syncActiveAlerts([makeAlert({ value: 5.5 })])

      useAlertStore.getState().syncActiveAlerts([
        makeAlert({ value: 9.9, severity: 'warning' }),
      ])

      const [synced] = useAlertStore.getState().activeAlerts
      expect(synced.value).toBe(9.9)
      expect(synced.severity).toBe('warning')
    })

    it('bounds the dismissed id list', () => {
      const ids = Array.from({ length: 600 }, (_, i) => `alert-${i}`)
      useAlertStore.getState().syncActiveAlerts(ids.map(id => makeAlert({ id })))

      useAlertStore.getState().dismissMultipleAlerts(ids)

      expect(useAlertStore.getState().dismissedAlertIds).toHaveLength(500)
    })
  })
})
