# Frontend Performance

The dashboard polls the backend every two seconds and re-renders from a Zustand
store, so the two things that matter are how much work each poll causes and how
much JavaScript loads before the first render.

## Ingesting a poll

**Batch store writes.** `useTelemetryStore.addObservations(observations)` applies
a whole poll in one `set()` and rebuilds the derived indexes
(`availableAssets`, `availableMeasurements`, `assetGroups`) once. Calling
`addObservation` in a loop instead costs one store notification *and* one full
O(n) index rebuild per observation — at 600 observations per poll that is 600
React render passes every two seconds.

Use `addObservation` only for genuinely single-item sources such as an MQTT
message callback.

**Return the previous state when nothing changed.** A poll re-reads the same
`last()` rows until new data is written, so most observations in a poll are
duplicates. `applyObservations` compares `ts`/`value`/`quality` and returns the
original state object when every observation is a duplicate, which stops the
notification at the store rather than in each component.

**Preserve object identity for unchanged rows.** `alertStore.syncActiveAlerts`
reuses the existing `Alert` object when no source-owned field changed. Building
fresh objects every poll defeats `React.memo` on every alert row.

## Reading from the store

**Subscribe narrowly.** `useTelemetryStore(state => state.latest)` re-renders on
`latest` changes only. Destructuring the whole store
(`const { latest, ... } = useTelemetryStore()`) subscribes to every field,
including unrelated UI state.

**Index once, not per item.** `SiteOverview` builds an
`assetId -> measurement -> Observation` map in a `useMemo` and reads modules out
of it. The previous version called `getLatestByAsset(moduleId)` five times per
module, and each call scanned every observation — with 10 modules and 600
observations that is 30,000 comparisons per render.

**Wrap selectors that build a fresh result.** Zustand compares selector output
with `Object.is`, so a selector using `.filter()`, `.map()`, `.slice()`, an
object literal or a `|| []` fallback returns a new reference every time and
re-renders on every store write — the opposite of the point. Those need
`useShallow`; selectors returning a primitive or an existing state reference do
not. Reusable selectors live in `src/store/selectors/`.

```tsx
export const useSiteAlerts = (siteId: string) =>
  useAlertStore(useShallow((state) =>
    state.activeAlerts.filter(a => a.siteId === siteId)))
```

## Bundle size

Route components are lazily loaded in `src/routes/LazyRoutes.tsx`; `Login` and
`Dashboard` are eager because they are the entry screens.

```tsx
export const Sites = lazy(() => import('../views/Sites').then(m => ({ default: m.Sites })))
```

Named exports need the `.then(m => ({ default: m.X }))` shim; default exports
can be imported directly. Every lazy route must sit under a `<Suspense>` with
`LoadingFallback`, and under an `ErrorBoundary` — a chunk that fails to load
throws at render time, and without a boundary it blanks the app.

`vite.config.ts` splits long-lived dependencies (`react`, `react-dom`,
`react-router-dom`, `zustand`, `@tanstack/react-query`, `lucide-react`) into
their own chunks so an application change does not invalidate the browser's
cache of the framework.

### Checking it

```bash
npx vite build
```

Expect a `react-*.js` vendor chunk, an `index-*.js` application chunk, and one
chunk per lazy route. If a route's code lands in `index-*.js`, something outside
`LazyRoutes.tsx` imports it eagerly — a shared `index.ts` barrel file that
re-exports views is the usual cause.

Recharts is large and reached only from analytics routes; keep it out of any
eagerly loaded module.

## Environment knobs

| Variable | Default | Effect |
|----------|---------|--------|
| `VITE_INFLUX_POLL_INTERVAL_MS` | `2000` | Poll period. Non-numeric or below 250 ms falls back to the default. |
| `VITE_MAX_OBSERVATION_AGE_MS` | `900000` | How long an observation stays in `latest`. Must exceed the slowest publisher interval, or slow signals flicker empty between values. |
| `VITE_TELEMETRY_SOURCE` | `influx` | `influx` to poll the HTTP API, anything else to consume MQTT directly. |
| `VITE_ALERTS_SOURCE` | `influx` | As above, for alerts. |
