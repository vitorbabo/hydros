# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hydros is a digital twin + edge gateway for water treatment plants (WTPs), plus a React operator dashboard. The backend either **simulates** a plant (physics models → Modbus TCP server → MQTT) or acts as a **gateway** that polls real PLCs and republishes their data. Telemetry lands in InfluxDB via Telegraf and is served back to the dashboard over an HTTP API.

## Commands

### Backend (Python 3.13, `backend/`)

All backend commands must run **from `backend/`** — config paths in `main.py` are relative (`Path("config")`), so running from the repo root fails with "missing configuration files".

```bash
pip install -r requirements.txt

python main.py --mode simulation                   # sim engine + Modbus server + gateway
python main.py --mode normal                       # gateway only (default)
python main.py --mode simulation --site-id wtp-regional-02
python main.py --init                              # (re)generate protocol mappings on startup
python main.py --mode simulation --log-level DEBUG

python validate_config.py                          # schema-validate all sites
python validate_config.py --site-ids wtp-porto-01
python -m core.protocol_mapper wtp-porto-01        # regenerate one site's mappings
```

Tests (`pytest.ini` sets `testpaths=tests`, `pythonpath=.`, `--cov=.`, `--asyncio-mode=auto`, so async tests need no decorator):

```bash
pytest                                             # all, with coverage
pytest tests/unit/test_digital_twin.py             # one file
pytest tests/unit/test_mqtt_handler.py::TestMQTTPublishing              # one class
pytest tests/unit/test_digital_twin.py -k register_component   # one test by name
pytest -m "not mqtt and not modbus"                # skip tests needing live brokers
pytest --no-cov -q                                 # fast iteration
```

Markers available: `unit`, `integration`, `slow`, `mqtt`, `modbus`.

### Frontend (`frontend/`)

```bash
npm ci
npm run dev                  # Vite dev server on :5173
npm run build
npm run test                 # vitest watch
npm run test -- --run        # single pass (CI)
npm run test -- --run src/store/__tests__/telemetryStore.test.ts
npm run test:coverage
```

### Full stack

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f backend
```

Services: backend Modbus `:5020` + HTTP API `:8000`, Mosquitto `:1883` / WS `:9001`, InfluxDB `:8086` (org `hydros`, bucket `wtp`, token `hydros-token`), frontend `:5173`.

No linter or formatter is configured for either side (`.vscode/extensions.json` recommends ruff and prettier, but there is no config file for either). Don't introduce a repo-wide reformat as a side effect of a change.

`.vscode/tasks.json` and `.vscode/launch.json` already encode most of the above, including full-stack compound launch configs.

## Architecture

### Configuration is template-driven, not per-site duplicated

- `config/templates/modules.yaml` — 58 module templates (`raw_intake`, `clarifier_1`, `filter_bed_1`, …), each declaring `required_sensors` / `optional_sensors` / `actuators`.
- `config/templates/parameters.yaml` — 49+ parameter specs (unit, data type, normal/alarm ranges). Surfaced in code through `core/sensor_catalog.py`.
- `config/sites/<site-id>/plant.yaml` — a site lists *names* of module templates plus its own `protocol_clients` (host/port/unit_id, `modules_assigned`). Env interpolation uses `"${VAR:default}"`.
- `config/schemas/*.json` — JSON Schema for all three, enforced by `core/config_validator.py` at startup and by `validate_config.py`.

Adding a module type means editing the two template files, not writing code. Adding a site means a new directory under `config/sites/` plus regenerating mappings.

**Generated-and-committed files:** `config/sites/<site>/mappings/{modbus,opcua,s7,unified}.json` and `edge_gateway_config.yaml` are produced by `core/protocol_mapper.py`. Never hand-edit them — change `plant.yaml` or the templates and re-run the mapper. Protocol addresses are allocated dynamically; there are no hardcoded addresses.

### Runtime object graph

`main.py::HydrosSystem` wires everything and owns the single asyncio event loop:

- `core/digital_twin.py::DigitalTwin` — the single source of truth for current values. Both modes write into it; everything else reads from it.
- `core/plant_elements.py` — the domain vocabulary: `PlantComponent`, `PlantParameter`, and the enums `ComponentRole` (SENSOR/ACTUATOR/STATUS), `SensorType`, `ProtocolDataType`, `OperationalState`.
- `core/plant_builder.py` — builds components from templates + site config.
- `simulation/` — `SimulationEngine` drives `process_models.py` (hydraulics, water quality, sensor noise/drift) and writes to the DigitalTwin.
- `gateway/` — `EdgeGateway` + `plc_readers.py` poll real PLCs and write to the DigitalTwin. Simulation mode also starts a gateway (`GatewayMode.DEVELOPMENT`) against the local Modbus server; normal mode uses `GatewayMode.PRODUCTION`.
- `protocols/protocol_registry.py` — pluggable handlers; `modbus_handler.py` is one class serving both client and server roles. OPC UA and S7 have mapper support but no handler yet.
- `protocols/mqtt_handler.py` — **one** MQTT client shared by every component (observations, configuration, status). Don't open a second connection.
- `services/` — `configuration_service.py`, `aggregation_publisher.py`, `influxdb_query_service.py`, `influx_api_server.py`.

**Parameter IDs are `site.component.parameter`** (`wtp-porto-01.raw_intake.level`) everywhere in the backend; MQTT topics are the same identity re-punctuated (`wtp/wtp-porto-01/raw_intake/level/observation`). No ID translation layer exists — keep it that way.

Simulation mode picks the Modbus port from a hardcoded `site_port_map` in `main.py::initialize_simulation_mode` (`wtp-porto-01`→5020, `wtp-regional-02`→5021, anything else→5020). A third simulated site will collide unless that map is extended.

### Telemetry path (read `docs/architecture/telemetry-data-path.md` before touching it)

Default path is Influx-backed polling, not browser MQTT:

```
DigitalTwin → MQTTHandler.publish_observation → Telegraf (mqtt_consumer) → InfluxDB
  → InfluxDBQueryService (Flux, via asyncio.to_thread, 1 s result cache)
  → InfluxAPIServer  GET /api/influx/snapshot
  → App.tsx poll (VITE_INFLUX_POLL_INTERVAL_MS, default 2 s)
  → telemetryStore.addObservations() + alertStore.syncActiveAlerts()
```

- Use `/api/influx/snapshot` (one Flux query, derives alerts from rows it already fetched). `/api/influx/telemetry/latest` and `/api/influx/alerts/active` remain for other consumers but cost three queries together.
- `influxdb-client` is synchronous and shares the loop with the simulation and Modbus server — every query must go through `asyncio.to_thread`.
- **Alerts are derived, never stored.** `derive_quality_alerts` maps `quality != good` onto an alert (`uncertain`→warning, `bad`→critical). Alert ids include `sensor_id` because one asset can carry redundant sensors for the same measurement. `syncActiveAlerts` must *merge*, preserving operator-owned fields (`acknowledgedBy`, `resolved`) and `dismissedAlertIds`, or every poll would undo an acknowledgement.
- The MQTT browser path still exists behind `VITE_TELEMETRY_SOURCE` / `VITE_ALERTS_SOURCE`; `App.tsx` ignores MQTT observations while the Influx source is active so the two never both write.
- Telegraf runs on the Compose network, so its broker URL must be `tcp://mosquitto:1883`. Pointing it at `localhost` silently stops all ingestion — Telegraf stays healthy and the dashboard just goes blank.
- Query inputs (`site_id`, `lookback_seconds`, `limit`) arrive unauthenticated and Flux has no tag-filter parameter binding: string values go through `escape_flux_string`, numbers through `clamp_int`, and dates are regex-validated. The API server binds `0.0.0.0:8000` with `Access-Control-Allow-Origin: *` unless `API_HOST` / `API_ALLOWED_ORIGIN` are set.

### Frontend

React 18 + TypeScript + Vite, Tailwind, Zustand stores, `@xyflow/react` for plant layouts, Recharts, react-router. `@` aliases `src/`.

- `src/store/` — one store per domain (`telemetryStore`, `alertStore`, `configurationStore`, `dashboardStore`, `authStore`, `plantLayoutStore`, …). Reusable selectors live in `src/store/selectors/`.
- `src/routes/LazyRoutes.tsx` — every route is lazy except `Login` and `Dashboard`. Add new routes there, not with a direct import in `App.tsx`.
- **Store hot-path rules** (details in `docs/development/frontend-performance.md`): batch a whole poll through `addObservations` (never loop `addObservation` — that's one index rebuild and render pass *per observation*); return the previous state object when nothing changed; preserve object identity for unchanged rows so `React.memo` holds; subscribe narrowly (`useTelemetryStore(s => s.latest)`, not destructuring the store); wrap any selector that builds a fresh array/object in `useShallow`.
- `authStore` is **mock authentication** — a `mockUsers` array plus `localStorage`. There is no auth backend. `RequireAuth` / `RequireRole` gate routes against it.

## Conventions

- **Narrow your excepts.** Broad `except Exception` is the legacy pattern in the backend and is actively being reduced; `docs/development/exception-handling.md` is the per-subsystem reference (config loading → `FileNotFoundError`/`yaml.YAMLError`/`OSError`, wrap parse failures as `ValueError(...) from e`). Don't add new blanket handlers.
- Backend logging: each class does `logging.getLogger(self.__class__.__name__)`, so `grep "DigitalTwin" backend/hydros.log` works. Logs go to stdout *and* `backend/hydros.log`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`).
- `docs/README.md` is an aspirational index — many files it links (`api/`, `deployment/`, `examples/`, `core-components.md`) do not exist. The docs that do exist and are current: `architecture/telemetry-data-path.md`, `architecture/unified-architecture.md`, `architecture/system-overview.md`, `development/exception-handling.md`, `development/frontend-performance.md`, `development/project-blueprint.md`, `development/backend-improvement-plan.md`, `development/frontend-navigation-roadmap.md`, `protocols/modbus.md`. `architecture/system-overview.md` still describes the older `core/`-nested layout and pre-rename class names (`plant_model.py`, `component_factory.py`, `address_allocator.py`) — trust the code over it.

## Key environment variables

| Variable | Side | Default | Purpose |
|---|---|---|---|
| `HYDROS_MODE` | compose | `simulation` | `simulation` or `normal` |
| `SITE_ID` | backend | `wtp-porto-01` | must match a `config/sites/` directory |
| `PLC_HOST` / `PLC_PORT` | backend | `localhost` / `5020` | gateway-mode PLC target |
| `MQTT_HOST` / `MQTT_PORT` | backend | `mosquitto` / `1883` | broker |
| `INFLUXDB_URL` / `_TOKEN` / `_ORG` / `_BUCKET` | backend | — | **no token ⇒ InfluxDB service, API server and aggregation publisher all silently disable** |
| `API_HOST` / `API_PORT` / `API_ALLOWED_ORIGIN` | backend | `0.0.0.0` / `8000` / `*` | Influx API server |
| `AGGREGATION_PUBLISH_INTERVAL` | backend | `300` | aggregate publish period (s) |
| `VITE_BACKEND_API_URL` | frontend | `http://127.0.0.1:8000` | Influx API base |
| `VITE_INFLUX_POLL_INTERVAL_MS` | frontend | `2000` | poll period (min 250) |
| `VITE_TELEMETRY_SOURCE` / `VITE_ALERTS_SOURCE` | frontend | `influx` | `influx` or MQTT |
| `VITE_MQTT_PORT` | frontend | `9001` | broker WebSocket port |
