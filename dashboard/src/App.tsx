import { useEffect, useMemo, useState } from 'react'
import mqtt from 'mqtt'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

type Observation = {
  site_id: string
  asset_id: string
  sensor_id: string
  measurement: string
  ts: string
  value: number
  unit: string
  quality: string
  raw_tag: string
  source: string
  seq: number
}

export default function App() {
  const [client, setClient] = useState<any>(null)
  const [latest, setLatest] = useState<Record<string, Observation>>({})
  const [series, setSeries] = useState<Record<string, Array<{ ts: number; value: number }>>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'error'>('connecting')
  const [lastError, setLastError] = useState<string>('')
  const [lastRaw, setLastRaw] = useState<string>('')

  const wsUrl = useMemo(() => {
    const host = window.location.hostname
    const port = import.meta.env.VITE_MQTT_PORT || '9001'
    return `ws://${host}:${port}`
  }, [])

  useEffect(() => {
    const options = { keepalive: 60, reconnectPeriod: 2000 }
    const c = mqtt.connect(wsUrl, options)
    setClient(c)
    c.on('connect', () => {
      setStatus('connected')
      setLastError('')
      c.subscribe('wtp/+/+/+/observation')
      c.subscribe('plc/raw')
    })
    c.on('reconnect', () => setStatus('reconnecting'))
    c.on('error', (err: any) => {
      setStatus('error')
      setLastError(String(err?.message || err))
    })
    c.on('close', () => setStatus('reconnecting'))
    c.on('message', (topic, payload) => {
      try {
        const text = payload.toString()
        if (topic === 'plc/raw') {
          setLastRaw(text)
          return
        }
        const obs: Observation = JSON.parse(text)
        const key = `${obs.asset_id}.${obs.sensor_id}`
        setLatest(prev => ({ ...prev, [key]: obs }))
        setSeries(prev => {
          const arr = prev[key] ? [...prev[key]] : []
          arr.push({ ts: new Date(obs.ts).getTime(), value: obs.value })
          if (arr.length > 200) arr.shift()
          return { ...prev, [key]: arr }
        })
      } catch (e) {
        setLastError(`parse error: ${String(e)}`)
      }
    })
    return () => c.end(true)
  }, [wsUrl])

  const keys = Object.keys(latest).sort()
  const activeKey = selected && series[selected] ? selected : keys[0]
  const activeSeries = (activeKey && series[activeKey]) || []

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', padding: 16 }}>
      <h2 style={{ margin: 0 }}>Hydros Live Telemetry</h2>
      <div style={{ marginTop: 4, color: '#555' }}>
        <span>Status: {status}</span>
        <span style={{ marginLeft: 12 }}>Broker: {wsUrl}</span>
        {lastError && <span style={{ marginLeft: 12, color: '#b91c1c' }}>Error: {lastError}</span>}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 320 }}>
          <h3>Sensors</h3>
          {keys.length === 0 && <div style={{ fontSize: 13, color: '#666' }}>Waiting for observations…</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {keys.map(k => {
              const obs = latest[k]
              return (
                <li key={k} onClick={() => setSelected(k)} style={{ cursor: 'pointer', padding: '6px 8px', borderBottom: '1px solid #eee', background: k === activeKey ? '#f5f5f5' : 'transparent' }}>
                  <div style={{ fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{obs.measurement}: {obs.value} {obs.unit} @ {new Date(obs.ts).toLocaleTimeString()}</div>
                </li>
              )
            })}
          </ul>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600 }}>Last raw (plc/raw)</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#334155', background: '#f8fafc', padding: 8, border: '1px solid #e2e8f0' }}>{lastRaw || '—'}</pre>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <h3>{activeKey || 'No data yet'}</h3>
          <div style={{ height: 360, border: '1px solid #eee' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" domain={[ 'auto', 'auto' ]} type="number" tickFormatter={(t) => new Date(t).toLocaleTimeString()} />
                <YAxis />
                <Tooltip labelFormatter={(t) => new Date(t as number).toLocaleTimeString()} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

