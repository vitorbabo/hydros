# Telemetry Data Path

How a sensor reading reaches a dashboard tile. There are two paths; the
Influx-backed one is the default.

```
simulation / Modbus poll
        │
        ├─ DigitalTwin.parameters              in-memory current values
        │
        ▼
  MQTTHandler.publish_observation
  wtp/{site_id}/{asset_id}/{measurement}/observation
        │
        ├──────────────────────────────┐
        ▼                              ▼
   Telegraf (mqtt_consumer)      frontend useMqtt hook
   tcp://mosquitto:1883          (only when VITE_TELEMETRY_SOURCE != influx)
        │
        ▼
    InfluxDB bucket
        │
        ▼
  InfluxDBQueryService  ──  Flux, off the event loop, 1 s result cache
        │
        ▼
  InfluxAPIServer  GET /api/influx/snapshot
        │
        ▼
  App.tsx poll  ──  every VITE_INFLUX_POLL_INTERVAL_MS (default 2 s)
        │
        ├─ telemetryStore.addObservations(...)   one batched write
        └─ alertStore.syncActiveAlerts(...)      merged, not replaced
```

## Why polling rather than MQTT in the browser

The MQTT path is still wired up and selectable, but the browser holding a live
subscription meant the dashboard's state depended on messages published while
it happened to be open — a reload started from nothing. Polling Influx makes any
client's view a function of stored data instead of connection uptime.

The MQTT path remains for low-latency use and as a fallback:
`VITE_TELEMETRY_SOURCE` / `VITE_ALERTS_SOURCE` select between them, and
`App.tsx` ignores incoming MQTT observations when the Influx source is active so
the two never both write to the store.

## Where the cost is

Each poll used to cost **three** Flux queries: one for
`/api/influx/telemetry/latest`, and two more for `/api/influx/alerts/active`
(which derives alerts by re-running the observation query).

`/api/influx/snapshot` costs **one**. It fetches observations, then derives
alerts from the rows it already has via
`InfluxDBQueryService.derive_quality_alerts`. `App.tsx` uses only this endpoint;
the two narrower endpoints remain for other consumers.

Two further properties keep the cost flat as clients are added:

- **A 1 s result cache** (`OBSERVATION_CACHE_TTL_SECONDS`) behind an
  `asyncio.Lock`, so N concurrent pollers share a single round-trip rather than
  racing.
- **Queries run in a thread** (`asyncio.to_thread`). `influxdb-client` is
  synchronous, and the API server shares its event loop with the simulation,
  the Modbus server and the MQTT publisher — a blocking query stalls all of them.

## Alerts are derived, not stored

There is no alerts measurement. `derive_quality_alerts` maps any observation
whose `quality` is not `good` onto an alert: `uncertain` → warning, `bad` →
critical. Alert ids are
`influx-{site}-{asset}-{sensor}-{measurement}-{quality}` — `sensor_id` is part
of the id because one asset can carry redundant sensors for the same
measurement, and without it they collide into a single alert.

Because the source keeps reporting the same underlying condition, the store must
merge rather than replace. `syncActiveAlerts` keeps operator-owned fields
(`acknowledgedBy`, `resolved`, …) and honours `dismissedAlertIds`, so an
acknowledgement is not reverted by the next poll and a dismissed alert does not
reappear.

## Untrusted input

`site_id`, `lookback_seconds` and `limit` arrive from unauthenticated query
parameters, and Flux has no client-side parameter binding for tag filters.
Every value interpolated into a query goes through `escape_flux_string`, and
every numeric bound through `clamp_int`. `query_daily_total_flow`'s `date` lands
in a Flux *time* literal, which no string escape covers, so it is validated
against `\d{4}-\d{2}-\d{2}` instead.

The API server binds `0.0.0.0:8000` with `Access-Control-Allow-Origin: *` by
default. Set `API_HOST` and `API_ALLOWED_ORIGIN` before exposing it beyond a
trusted network.

## Configuration

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `API_HOST` | backend | `0.0.0.0` | Influx API bind address |
| `API_PORT` | backend | `8000` | Influx API port |
| `API_ALLOWED_ORIGIN` | backend | `*` | CORS origin for the dashboard |
| `AGGREGATION_PUBLISH_INTERVAL` | backend | `300` | Aggregate publish period, in seconds |
| `VITE_BACKEND_API_URL` | frontend | `http://127.0.0.1:8000` | Influx API base URL |
| `VITE_INFLUX_POLL_INTERVAL_MS` | frontend | `2000` | Poll period |
| `VITE_TELEMETRY_SOURCE` | frontend | `influx` | `influx` or MQTT |
| `VITE_ALERTS_SOURCE` | frontend | `influx` | `influx` or MQTT |

Telegraf runs as a container on the `hydros` Compose network, so its broker
address must be the service name (`tcp://mosquitto:1883`). Pointing it at
`localhost` silently stops all ingestion — Telegraf stays up, InfluxDB simply
never receives a write, and with the Influx source active the dashboard goes
blank.
