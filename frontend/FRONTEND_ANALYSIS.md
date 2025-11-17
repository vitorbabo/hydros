# HYDROS Frontend Code Analysis Report

## Executive Summary
- **Total Lines of Code**: ~5,626 lines
- **Architecture**: React 18 + TypeScript with Zustand state management
- **Key Technology Stack**: 
  - Vite 5.4.1 for bundling
  - TailwindCSS 3.4.10 for styling
  - React Router 6.26.2 for navigation
  - XYFlow 12.8.3 for flow diagrams
  - Recharts 2.12.7 for charting
  - MQTT 5.14.0 for real-time data
  - Zustand 4.5.5 for state management

---

## 1. COMPONENT ARCHITECTURE & ORGANIZATION

### Structure Overview
**Well-Organized Directory Structure:**
```
frontend/src/
├── components/
│   ├── admin/           (UserFormModal.tsx)
│   ├── alerts/          (AlertCard, AlertRuleEditor, AlertSeverityBadge)
│   ├── analytics/       (AIAssistant.tsx)
│   ├── auth/            (RequireAuth, RequireRole)
│   ├── layout/          (AppShell, Sidebar, TopBar, Navigation, SiteSelector)
│   ├── plant/           (PlantModuleNode, ConfigurationPanel, AdvancedLayoutTools, etc.)
│   └── shared/          (ErrorBoundary, Modal, MetricCard, StatusIndicator, TabNavigation, etc.)
├── views/
│   ├── Sites.tsx
│   ├── Dashboard.tsx
│   ├── PlantLayout.tsx
│   ├── PlantConfiguration.tsx
│   ├── Alerts.tsx, Settings.tsx
│   ├── admin/          (UserManagement, RoleManagement, SiteAccessControl, AuditLogs)
│   ├── alerts/         (AlertsDashboard, AlertConfiguration, AlertHistory)
│   ├── analytics/      (AnalyticsDashboard, TrendAnalysis, etc.)
│   ├── reports/        (ReportBuilder, ReportTemplates, ReportsDashboard)
│   └── sites/          (SiteDetail, SiteLayout, SiteOverview, SiteTelemetry, etc.)
├── store/              (9 Zustand stores)
├── hooks/              (2 custom hooks)
├── types/              (Centralized type definitions)
└── utils/              (Utility functions like moduleIcons)
```

### Component Organization Strengths:
1. **Clear Separation of Concerns**: Views, components, stores, hooks, and types are separated
2. **Feature-Based Structure**: Organized by feature (admin, alerts, analytics, reports, sites)
3. **Shared Component Library**: Reusable components in `components/shared/`
4. **Layout System**: Proper layout hierarchy with AppShell, Sidebar, TopBar

### Component Sizes (Largest Files):
- SiteOverview.tsx: **669 lines** (LARGE - candidate for splitting)
- AdvancedLayoutTools.tsx: **549 lines** (LARGE)
- ConfigurationPanel.tsx: **464 lines** (LARGE)
- ReportBuilder.tsx: **466 lines** (LARGE)
- PlantLayoutStore.ts: **458 lines** (LARGE store)

### Architectural Issues Found:

**Issue #1: Large Monolithic Components**
- SiteOverview.tsx (669 lines) should be split into smaller sub-components
- Contains too many concerns: site info, water quality metrics, protocol clients, control strategies
- Difficult to test and maintain

**Issue #2: Inconsistent Component Patterns**
- Some components use `React.memo()` (PlantModuleNode), others don't
- Mix of functional and class components (ErrorBoundary is class-based, most are functional)
- No consistent HOC pattern for repeated UI patterns

**Issue #3: Deep Nesting in Views**
- SiteDetail.tsx handles tab routing and state - could benefit from nested routes
- Tab management uses manual history.pushState instead of React Router capabilities

---

## 2. STATE MANAGEMENT PATTERNS (ZUSTAND STORES)

### Store Architecture Overview

**9 Zustand Stores Identified:**
1. **authStore.ts** (351 lines) - User authentication and authorization
2. **dashboardStore.ts** - System state, alarms, sites, connections
3. **telemetryStore.ts** - Real-time observation data with time series
4. **configurationStore.ts** (480 lines) - Plant configuration, modules, templates
5. **alertStore.ts** (397 lines) - Alert management and rules
6. **themeStore.ts** - Theme persistence (light/dark)
7. **analyticsStore.ts** (358 lines) - Analytics data and AI conversations
8. **reportStore.ts** - Report management
9. **userManagementStore.ts** (408 lines) - User CRUD operations
10. **plantLayoutStore.ts** (458 lines) - Plant layout visualization state

### Strengths:
1. **Proper Middleware Usage**: Uses `subscribeWithSelector` for efficient subscriptions
2. **Persistence**: Theme store uses Zustand persist middleware
3. **Clear Interfaces**: Well-typed store interfaces
4. **Modular Actions**: Each store has focused actions

### Issues:

**Issue #1: Store Duplication**
- `dashboardStore.sites` + `configurationStore.plantConfigurations` store overlapping data
- App.tsx handles syncing between them (lines 113-129)
- Can cause sync issues and confusion

**Issue #2: Large Store Files**
- `configurationStore.ts` (480 lines) is too large
- `plantLayoutStore.ts` (458 lines) combines layout and state management
- `analyticsStore.ts` has mock AI logic mixed with state

**Issue #3: No Normalization**
- `telemetryStore.latest` stores entire Observation objects
- No deduplication - can balloon in memory with high-frequency MQTT data
- Time series data capped at 100 points but no cleanup of old data

**Issue #4: Inconsistent Patterns**
- Some stores use `set()` with state merging, others use spread operators
- No consistent error handling pattern across stores
- Some stores have async operations (analyticsStore.fetchComparisonData), others don't

**Issue #5: Mock Data**
- Auth store contains hardcoded mock users (lines 104-160)
- Alert store has mockAlerts and mockAlertRules
- Analytics store has initializeMockData() method
- Should be separated from logic or feature-flagged

### Configuration Store Complexity:
The configurationStore is overly complex with:
- Template management
- Plant configuration management
- Module instance management
- Configuration mode management
- MQTT message handling
- Validation logic

**Recommendation**: Split into multiple focused stores

---

## 3. CODE QUALITY ISSUES & AREAS FOR IMPROVEMENT

### High-Priority Issues:

**Issue #1: Mixed Mock and Real Logic**
- Mock authentication in authStore (should use environment flags or removed in production)
- Mock data generators scattered across stores
- No clear separation between test/demo mode and production

**Issue #2: Memory Leaks Potential**
```typescript
// telemetryStore - no cleanup of old observations
addObservation: (observation) => set((state) => {
  const newLatest = { ...state.latest, [sensorKey]: observation }
  // Old observations never removed when sensors go offline
  // Latest object can grow unbounded in production
})
```
**Fix**: Implement observation expiration and cleanup

**Issue #3: Error Handling Inconsistency**
- Some stores silence errors (authStore.login returns boolean but doesn't throw)
- Others throw without proper error boundaries
- No consistent error propagation strategy

**Issue #4: No Input Validation**
- useConfigurationPersistence validates on save, but:
  - MQTT messages don't validate on receive
  - Configuration updates don't validate on import
  - Alert rules not validated before storage

**Issue #5: Unfinished TODOs**
- 20+ TODO comments found in codebase (see list below)
- Critical ones:
  - `PlantConfiguration.tsx:259` - "TODO: Implement actual save to backend via MQTT"
  - `useConfigurationPersistence.ts:113` - "TODO: Replace with actual MQTT publish"
  - `configurationStore.ts:451` - "TODO: Implement MQTT request for templates"

**Issue #6: Type Safety Issues**
```typescript
// App.tsx - line 80: unsafe type casting
const plantData = config.data as any  // Should be typed as PlantConfig

// configurationStore.ts - line 360: loose typing
if (typeof data === 'object' && data) {
  const plantData = data as any  // Should be PlantConfig
}
```

**Issue #7: Inconsistent Null Handling**
```typescript
// Some code checks for null
if (!currentUser) return

// Other code doesn't
const currentUser = user || { name: 'Guest', role: 'viewer' as const }
```

### Medium-Priority Issues:

**Issue #8: Console Logging in Production Code**
- 15+ console.log() statements in App.tsx, stores, and hooks
- console.warn() and console.error() used for debugging
- Should use proper logging library or remove in production

**Issue #9: Hardcoded Values**
- MQTT reconnectPeriod: 2000ms (hardcoded)
- MAX_TIME_SERIES_POINTS: 100 (magic number)
- SESSION_TIMEOUT: 30 minutes (hardcoded)
- Should be configurable via environment or constants

**Issue #10: Date/Time Handling**
- Mix of `new Date()`, `Date.now()`, and ISO strings
- No consistent timezone handling
- date-fns imported but not used throughout codebase

---

## 4. PERFORMANCE CONSIDERATIONS

### Memory Usage Concerns:

**Issue #1: Unbounded Observable Storage**
```typescript
// telemetryStore - potentially infinite growth
latest: Record<string, Observation>
timeSeries: Record<string, Array<{ts, value, quality}>>
```
**Impact**: 
- 1000 sensors × 100 time points = 100k+ objects in memory
- No cleanup mechanism for offline sensors
- `clearOldData()` only clears 24-hour old data, runs once per minute

**Issue #2: Inefficient Memoization**
```typescript
// SiteOverview.tsx - useMemo dependency array includes 'latest'
useMemo(() => { ... }, [latest, site.id])
// Entire 'latest' object is a dependency - triggers on every MQTT message
// Should use selector or useCallback
```

**Issue #3: Re-render Thrashing**
- Dashboard.tsx uses store without selectors:
  ```typescript
  const { sites, connectionStatus, lastUpdate, alarms } = useDashboardStore()
  // Any store change re-renders entire Dashboard
  ```
- Should use `useShallow` or subscribeWithSelector

### Optimization Opportunities:

**#1: Component Memoization**
- Only PlantModuleNode uses React.memo
- Other reusable components (MetricCard, StatusIndicator, TabNavigation) should be memoized
- Estimated 10-15% render reduction possible

**#2: useCallback Dependencies**
```typescript
// App.tsx line 140 - many dependencies cause function recreation
const handleMqttConfiguration = useCallback((topic: string, config: ConfigurationMessage) => {
  // depends on: updatePlantConfiguration, setModuleTemplates, setCurrentSite, 
  // updateLastUpdate, setConnectionStatus, setConnectionError, setSites
}, [updatePlantConfiguration, setModuleTemplates, ...])
// Function recreated frequently
```

**#3: Store Selector Usage**
- Stores use `subscribeWithSelector` but components don't use selectors
- Direct property access triggers all subscribers on any change
- **Recommendation**: Create selector hooks like:
  ```typescript
  export const useAlerts = () => useAlertStore(state => state.activeAlerts)
  export const useAlertFilters = () => useAlertStore(state => ({
    severity: state.selectedSeverity,
    site: state.selectedSite,
  }))
  ```

**#4: Large JSON Serialization**
- Configuration imports/exports use JSON.stringify with no compression
- Plant configuration can be 10KB+ when serialized
- Could use binary format or compression

### Performance Metrics (Estimated):

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Bundle Size | ~180KB (gzipped estimated) | <100KB | 80KB |
| Time to Interactive | 2-3s | <1.5s | ~50% |
| React Re-renders | High due to store subscribers | Medium | 30% reduction possible |
| Memory (1000 sensors) | ~50MB+ | <20MB | 60% reduction possible |

---

## 5. TYPE SAFETY & TYPESCRIPT USAGE

### Current TS Configuration (tsconfig.json):
```json
{
  "target": "ES2020",
  "strict": true,  // ✓ Good
  "jsx": "react-jsx",
  "skipLibCheck": true,
  "isolatedModules": true
}
```

### Type Safety Issues Found:

**Issue #1: Excessive use of `any`**
```typescript
// App.tsx line 80
const plantData = config.data as any  // ← loses type safety

// configurationStore.ts multiple instances
const plantData = data as any
const version: ConfigurationVersion = {
  ...
  configuration: JSON.parse(JSON.stringify(currentConfig)), // ← any implied
}
```

**Issue #2: Loose Union Types**
```typescript
// types/index.ts
export interface ConfigurationMessage {
  data: PlantConfig | Record<string, any> | Record<string, ModuleTemplate>
  // Too broad, any object could be data
}
```

**Issue #3: Incomplete Type Definitions**
```typescript
// PlantModuleData.data: Record<string, unknown>
// Should be more specific about what's in realTimeData

// Alert interface missing type safety
acknowledgedBy?: string  // Should it be userId?
resolvedBy?: string
```

**Issue #4: Missing Type Guards**
```typescript
// useConfigurationPersistence.ts - no type guards for imports
const importConfiguration = useCallback((configData: any) => {
  if (!configData.configuration) { ... }
  // Should validate against schema
})
```

### TypeScript Strengths:
1. ✓ Strict mode enabled
2. ✓ Good use of interfaces for stores
3. ✓ Union types for status enums
4. ✓ Proper generic usage in Zustand

### Recommendations:
1. Create validation schemas (Zod, io-ts)
2. Replace `any` with proper types
3. Use discriminated unions for configuration types
4. Add type guards for MQTT message validation

---

## 6. TESTING COVERAGE & QUALITY

### Current State: **NO TEST FILES FOUND**

```bash
$ find frontend -name "*.test.tsx" -o -name "*.test.ts" -o -name "*.spec.tsx"
# No results
```

### Missing Test Configuration Files:
- ❌ vitest.config.ts
- ❌ jest.config.js
- ❌ .eslintrc config (for linting)
- ❌ Unit tests
- ❌ Integration tests
- ❌ E2E tests

### Testing Gaps:

**Critical Areas Without Tests:**
1. **Store Logic** - All 9 Zustand stores lack unit tests
2. **MQTT Integration** - useMqtt hook has no tests
3. **State Synchronization** - App.tsx MQTT handlers untested
4. **Complex Components** - SiteOverview (669 lines), AdvancedLayoutTools (549 lines)
5. **Business Logic** - Configuration persistence, alert rules, user permissions

### Estimated Test Coverage: **0%**

### Recommended Testing Strategy:

```typescript
// Unit Tests (Priority 1)
- Store actions and selectors
- Type validation functions
- Permission helpers (hasPermission, canAccessSite)
- Utility functions (formatFlowValue, groupAssetsByType)

// Integration Tests (Priority 2)
- MQTT message handling
- Store synchronization
- Configuration import/export
- Alert rule evaluation

// Component Tests (Priority 3)
- Dashboard metrics calculation
- SiteOverview data display
- AlertCard rendering
- Form validations

// E2E Tests (Priority 4)
- User login flow
- Site navigation
- Alert acknowledge workflow
- Configuration save/load cycle
```

### Testing Recommendations:
1. Add **Vitest** + **React Testing Library**
2. Set up **pre-commit hooks** with test execution
3. Establish **80%+ coverage target** for critical paths
4. Create **test utilities** for MQTT mocking
5. Add **snapshot tests** for charts/layouts

---

## 7. BUNDLE SIZE & OPTIMIZATION OPPORTUNITIES

### Estimated Bundle Size (No Build Output Provided):

**Estimated Breakdown:**
- React 18 + React-DOM: ~40KB (gzipped)
- React Router: ~12KB
- Zustand: ~2KB
- Recharts: ~40KB (large!)
- XYFlow: ~50KB (large!)
- Lucide Icons: ~15KB
- TailwindCSS: ~30KB (with PurgeCSS)
- MQTT: ~20KB
- date-fns: ~8KB
- Other dependencies: ~15KB
- **Total Estimated**: ~230KB gzipped

### Optimization Opportunities:

**#1: Code Splitting (Impact: 20-30KB)**
```typescript
// Current: All views loaded at once
// Should implement: Lazy loading
const Dashboard = lazy(() => import('./views/Dashboard'))
const SiteDetail = lazy(() => import('./views/sites/SiteDetail'))
const PlantConfiguration = lazy(() => import('./views/PlantConfiguration'))
// + Suspense boundaries with loading states
```

**#2: Remove Unused Dependencies (Impact: 10-15KB)**
- `date-fns` imported but barely used (could use native Date)
- Check if all lucide-react icons are actually used
- Consider icon tree-shaking configuration

**#3: Component Library Optimization (Impact: 15-25KB)**
- **Recharts**: 40KB is large for the usage (only 2-3 views use it)
  - Alternative: Remove or use lightweight library
  - OR: Lazy load recharts
- **XYFlow**: 50KB is large for plant layout visualization
  - Could be lazy loaded or split into separate chunk

**#4: Tailwind CSS Optimization (Impact: 5-10KB)**
- Implement Tailwind content purging properly
- Remove unused Tailwind plugins
- Consider CSS-in-JS for dynamic theming

**#5: Store Size (Impact: 3-5KB)**
- Remove mock data from stores (users, alerts)
- Move to separate mock factory module

### Bundle Size Reduction Strategy:
```
Current (estimated): ~230KB gzipped
After optimization:

Code Splitting:     -25KB  → 205KB
Remove Unused:      -15KB  → 190KB
Lazy Load Charts:   -20KB  → 170KB
Mock Data:          - 3KB  → 167KB

Target: ~150-170KB gzipped (25-30% reduction)
```

### Vite Configuration Recommendations:
```typescript
// vite.config.ts optimizations:
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'flow': ['@xyflow/react'],
          'mqtt': ['mqtt']
        }
      }
    }
  }
}
```

---

## 8. UX/UI CAPABILITIES & LIMITATIONS

### UI Framework:
- **TailwindCSS 3.4.10** - Excellent choice
- **Dark Mode Support** - Implemented via themeStore
- **Responsive Design** - Mobile-first approach in Sidebar, TopBar
- **Icon Library** - Lucide React (excellent)
- **Chart Library** - Recharts (good for water treatment metrics)

### UI Strengths:

**#1: Comprehensive Design System**
- MetricCard component with status indicators
- StatusIndicator with color coding (normal/warning/alarm/offline)
- Consistent color scheme for water treatment modules

**#2: Responsive Layout**
```typescript
// Good mobile support
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  // Responsive grid that adapts to screen size
</div>
```

**#3: Real-time Visualization**
- Plant layout with XYFlow (flow diagrams)
- Module nodes with real-time data
- Connection visualization

**#4: Dark Mode**
- Properly implemented with Tailwind dark: utilities
- Persisted in localStorage
- Applied to all components

### UX/UI Issues:

**Issue #1: Inconsistent Spacing**
- Some components use gap-6, others gap-4 or gap-3
- Should standardize spacing system

**Issue #2: Missing Loading States**
- Modal and form components lack skeleton loaders
- Network delays not visualized consistently
- MQTT connection state not always visible

**Issue #3: No Toast/Notification System**
- Alert acknowledgment has no confirmation feedback
- Configuration save completion not shown
- Errors only logged to console

**Issue #4: Accessibility Issues**
```typescript
// No ARIA labels on many interactive elements
<button className="...">  // Missing aria-label
// No keyboard navigation hints
// Low contrast in some dark mode elements
```

**Issue #5: Modal & Dialog Issues**
- Modal.tsx is simple but missing accessibility features
- No focus trap
- No proper overlay handling
- Close button not always visible

**Issue #6: Forms Lack Validation Feedback**
```typescript
// AlertRuleEditor.tsx has form fields but:
// - No real-time validation errors
// - No field-level error messages
// - No success confirmation on save
```

**Issue #7: Table/List Components Missing**
- Alert history uses custom div rendering
- Audit logs use div-based layout
- No sortable/filterable tables
- Should implement reusable Table component

### Missing UI Components:
1. Toast/Notification system
2. Confirmation dialogs
3. Loading skeletons
4. Data tables with sorting/filtering
5. Breadcrumb navigation (exists but underutilized)
6. Tooltip component
7. Dropdown/Select component
8. Date range picker (Analytics needs this)

### Recommended UI Improvements:
```
Priority 1: Add toast notifications (5KB)
Priority 2: Loading states for async operations
Priority 3: Table component library
Priority 4: Form validation feedback
Priority 5: ARIA labels and keyboard navigation
```

---

## 9. MQTT INTEGRATION & REAL-TIME DATA HANDLING

### MQTT Hook Architecture:

**useMqtt Hook (145 lines)** - Located in `/hooks/useMqtt.ts`

**Strengths:**
1. ✓ Proper WebSocket URL resolution
2. ✓ Client ID randomization
3. ✓ Multiple topic subscription
4. ✓ Callback handlers for configuration and observations
5. ✓ Proper connection cleanup

### MQTT Configuration:

```typescript
// Topics subscribed
'wtp/+/+/+/observation',        // Telemetry data
'wtp/+/configuration/+',        // Plant configurations
'wtp/global/configuration/+',   // Global configs (templates)
'wtp/+/alerts/+',               // Site alerts
'wtp/+/+/alerts/+',             // Module alerts
'wtp/global/alerts/+'           // System alerts
```

### Issues:

**Issue #1: No Connection Retry Strategy**
```typescript
// Hard-coded reconnectPeriod: 2000ms
// No exponential backoff
// No max retry limit
const client = mqtt.connect(wsUrl, {
  reconnectPeriod: 2000,  // Always 2 seconds
  connectTimeout: 10000,  // Single timeout
})
```
**Impact**: Excessive reconnection attempts under network stress

**Issue #2: No Message Deduplication**
```typescript
// Each MQTT message directly updates store
// No debouncing for high-frequency sensors
handleMessage: (topic: string, payload: Buffer) => {
  // Called immediately on every message
  onMessage?.(topic, message, observation)
}
```
**Impact**: Store updates could exceed 100 updates/sec with 1000 sensors

**Issue #3: Inefficient Data Parsing**
```typescript
// Parses message twice for configuration
if (topic.includes('/configuration/')) {
  const backendMessage = JSON.parse(message)
  // Manual type casting without validation
  const configMessage: ConfigurationMessage = {
    type: configType as 'plant' | 'modules' | 'templates' | 'parameters',
    // Should validate configType actually matches
  }
}
```

**Issue #4: Topic Parsing is Fragile**
```typescript
// hardcoded topic indices
const topicParts = topic.split('/')
const siteId = topicParts[1]
const configType = topicParts[3]  // Assumes specific format
// Will break if topic structure changes
```

**Issue #5: No Message Validation on Receive**
```typescript
// Directly uses observation data without validation
const observation: Observation = JSON.parse(message)
onMessage?.(topic, message, observation)
// No check for required fields (site_id, sensor_id, value, ts, etc.)
```

**Issue #6: No Handling for Connection Dropouts**
```typescript
// Only logs errors
client.on('error', (error) => {
  console.error('MQTT Connection error:', error)
  // No automatic retry or state notification
})

client.on('offline', () => {
  console.log('MQTT Client offline')
  // Doesn't notify UI of connection loss
})
```

### Real-Time Data Handling Issues:

**Issue #7: Memory Growth Unbounded**
```typescript
// telemetryStore.ts - no cleanup
const newLatest = { ...state.latest, [sensorKey]: observation }
// Old sensors never removed
// With 1000 sensors, latest grows infinitely
```

**Issue #8: No Data Deduplication**
```typescript
// Same sensor message processed twice (once in main handler, once in configuration handler)
// Duplicate processing
if (topic.includes('/configuration/')) {
  onConfiguration?.(topic, configMessage)
}
```

**Issue #9: Lost Messages on Reconnect**
```typescript
// resubscribe: false
const client = mqtt.connect(wsUrl, {
  resubscribe: false  // Won't resubscribe after reconnect
  // Risk of missing data after connection recovery
})
```

### Data Synchronization Issues:

**Issue #10: Multiple Data Sources**
```typescript
// App.tsx syncs data between stores
setSites({...})  // dashboardStore
updatePlantConfiguration()  // configurationStore
// Same data in two places - can get out of sync
```

### MQTT Recommendations:

**Priority 1 Fixes:**
1. Add message validation schema
2. Implement exponential backoff for reconnection
3. Add message deduplication/debouncing
4. Implement proper connection state machine
5. Add cleanup for offline sensors

**Priority 2 Improvements:**
1. Message compression for large payloads
2. Batch updates when MQTT queue builds up
3. Message timestamp verification
4. Connection quality metrics
5. Graceful degradation UI when offline

---

## 10. SIMPLIFICATIONS & REFACTORING OPPORTUNITIES

### Quick Wins (2-4 hours):

**#1: Extract Store Selectors**
```typescript
// Create selectors.ts file in each store directory
export const useAlerts = () => 
  useAlertStore(state => state.activeAlerts)
export const useAlertRules = () => 
  useAlertStore(state => state.alertRules)
// Prevents unnecessary re-renders
```

**#2: Remove Mock Data from Stores**
```typescript
// Move to separate module
export/src/mocks/mockUsers.ts
export/src/mocks/mockAlerts.ts
export/src/mocks/mockAlertRules.ts

// Import in stores conditionally
if (import.meta.env.DEV) {
  initialState.users = mockUsers
}
```

**#3: Extract PlantModuleNode Styling**
```typescript
// Create constants for color mappings
const STATUS_COLORS = {
  normal: 'border-green-500 bg-green-50',
  warning: 'border-yellow-500 bg-yellow-50',
  // ...
}

const CATEGORY_COLORS = {
  intake: 'text-blue-600',
  // ...
}

// Use in component
const statusColor = STATUS_COLORS[status]
```

**#4: Create Custom Hooks for Common Patterns**
```typescript
// useAssetMetrics.ts
export const useAssetMetrics = (assetId: string) => {
  const { getLatestByAsset } = useTelemetryStore()
  return useMemo(() => getLatestByAsset(assetId), [assetId])
}

// useSiteConfiguration.ts
export const useSiteConfiguration = (siteId: string) => {
  const { plantConfigurations } = useConfigurationStore()
  return plantConfigurations[siteId]
}
```

### Medium Refactors (4-8 hours):

**#5: Split Large Components**
```typescript
// SiteOverview.tsx (669 lines) → 
  ├── SiteOverviewHeader.tsx
  ├── WaterQualitySection.tsx
  ├── FlowMetricsSection.tsx
  ├── ProtocolClientsSection.tsx
  ├── ControlStrategiesSection.tsx
  └── AlarmDefinitionsSection.tsx
```

**#6: Extract Configuration Store Logic**
```typescript
// configurationStore.ts (480 lines) → 
  ├── templateStore.ts (template management)
  ├── plantStore.ts (plant configuration)
  ├── moduleStore.ts (module instances)
  └── configValidation.ts (validation logic)
```

**#7: Create API Layer for MQTT**
```typescript
// services/mqtt/observationService.ts
export class ObservationService {
  subscribe(siteId, callback) { }
  addObservation(obs) { }
  getLatestByAsset(assetId) { }
}

// services/mqtt/configurationService.ts
export class ConfigurationService {
  requestPlantConfig(siteId) { }
  requestTemplates() { }
  updateConfiguration(siteId, config) { }
}

// Decouples MQTT details from components
```

**#8: Add Configuration Schema Validation**
```typescript
// types/schemas.ts
import { z } from 'zod'

export const ObservationSchema = z.object({
  site_id: z.string(),
  sensor_id: z.string(),
  value: z.number(),
  ts: z.string().datetime(),
  // ...
})

export type Observation = z.infer<typeof ObservationSchema>

// Use in MQTT handler
const observation = ObservationSchema.parse(JSON.parse(message))
```

### Major Refactors (8-16 hours):

**#9: Implement Proper Error Handling**
```typescript
// Create error boundary hook
export const useAsyncError = () => {
  const [error, setError] = useState<Error | null>(null)
  
  const throwAsync = (err: Error) => {
    setError(err)
  }
  
  useEffect(() => {
    if (error) throw error
  }, [error])
  
  return { throwAsync }
}

// Use in components
const MyComponent = () => {
  const { throwAsync } = useAsyncError()
  
  const handleSave = async () => {
    try {
      // ...
    } catch (err) {
      throwAsync(err)
    }
  }
}
```

**#10: Add Notification System**
```typescript
// Create notification store
export const useNotificationStore = create(...)

// Create NotificationProvider component
// Add toast/notification display in AppShell
// Export useNotification hook for use throughout app

// Use in components
const { showNotification } = useNotification()
showNotification('Configuration saved', 'success')
```

**#11: Implement Proper Testing**
- Setup Vitest configuration
- Create test utilities for MQTT mocking
- Add tests for all stores
- Add tests for complex components
- Target 80%+ coverage

**#12: Add Performance Monitoring**
```typescript
// Add Sentry or similar
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
})

// Monitor store performance
// Track MQTT message frequency
// Monitor component re-renders in dev
```

---

## DEPENDENCY ANALYSIS

### Critical Dependencies:
- ✓ react: 18.3.1 (stable, widely used)
- ✓ react-router-dom: 6.26.2 (well-maintained)
- ✓ zustand: 4.5.5 (lightweight, modern)
- ✓ recharts: 2.12.7 (chart library)
- ✓ @xyflow/react: 12.8.3 (large but necessary)

### Optional Dependencies Worth Removing:
- ✗ date-fns: 3.6.0 - Minimal usage, could use native Date
- ⚠ recharts: 40KB - Consider lazy loading or alternatives

### Missing Helpful Dependencies:
- ❌ zod (input validation)
- ❌ sentry (error monitoring)
- ❌ react-query (already have @tanstack/react-query 5.56.2!)

---

## SUMMARY & PRIORITY RECOMMENDATIONS

### Critical (Must Fix - Security/Stability):
1. ✅ Remove mock authentication, implement real auth
2. ✅ Add MQTT message validation
3. ✅ Fix unbounded memory growth in telemetryStore
4. ✅ Add proper error boundaries and error handling
5. ✅ Implement connection state machine for MQTT

### High (Should Fix - Performance/Maintainability):
1. ✅ Split large components (SiteOverview, ConfigurationPanel, AdvancedLayoutTools)
2. ✅ Add component memoization (React.memo for reusable components)
3. ✅ Split configurationStore into focused modules
4. ✅ Add unit tests (target 80% coverage)
5. ✅ Implement store selectors to prevent unnecessary re-renders
6. ✅ Remove 20+ TODO comments with actual implementations
7. ✅ Code split routes with lazy loading
8. ✅ Add input validation (Zod schema)

### Medium (Nice to Have - UX/Developer Experience):
1. ✅ Add notification/toast system
2. ✅ Add loading skeletons for async states
3. ✅ Improve accessibility (ARIA labels, keyboard nav)
4. ✅ Add table component for data lists
5. ✅ Add form validation UI feedback
6. ✅ Extract styling constants
7. ✅ Create API service layer
8. ✅ Add Sentry error monitoring

### Low (Polish):
1. ✅ Consistent spacing system
2. ✅ Code style standardization
3. ✅ Documentation/JSDoc comments
4. ✅ Storybook for component library

---

## CONCLUSION

**Overall Code Quality: 6.5/10**

**Strengths:**
- Well-organized component structure
- Good use of TypeScript (strict mode)
- Modern tech stack (Vite, React 18, Zustand)
- Zustand stores are focused and well-typed
- Responsive design with dark mode support

**Weaknesses:**
- No test coverage (0%)
- Large monolithic components
- Memory leaks potential in real-time data handling
- MQTT integration needs hardening
- 20+ unfinished TODOs
- Excessive use of `any` type
- Mock data mixed with production code
- No proper error handling system
- Missing notifications/feedback mechanisms
- Bundle size optimization opportunities

**Estimated Technical Debt: 6-8 weeks** to address all critical and high-priority items.

**Recommended Next Steps:**
1. Week 1-2: Add test infrastructure and critical tests
2. Week 2-3: Fix MQTT reliability and memory issues
3. Week 3-4: Refactor large components
4. Week 4-5: Add error handling and notifications
5. Week 5-6: Optimize bundle size and performance
6. Week 6-8: Polish and documentation

