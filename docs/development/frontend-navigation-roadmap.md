# Frontend Navigation & Features Implementation Roadmap

**Document Version**: 1.0
**Created**: 2025-11-09
**Status**: Active Development

---

## Overview

This document outlines the comprehensive plan to transform the Hydros IoT Hub frontend from a horizontal top-navigation design to a modern sidebar-based navigation system with enhanced features for multi-site water treatment plant management.

### Key Objectives

1. Implement professional sidebar navigation with responsive design
2. Reorganize application structure for better multi-site management
3. Add role-based access control infrastructure
4. Enhance monitoring and alerting capabilities
5. Integrate AI-powered analytics with InfluxDB

---

## Current State Analysis

### Existing Architecture

**Navigation**: Horizontal top navigation bar
**Routing**: React Router v6 with 4 main routes
**State Management**: Zustand stores (dashboard, telemetry, configuration, plant layout)
**Authentication**: None (to be implemented)
**Real-time Data**: MQTT client with WebSocket connection

### Existing Pages

- `/` - SystemOverview (dashboard with KPIs)
- `/layout` - PlantLayout (React Flow diagram editor)
- `/configuration` - PlantConfiguration (plant configuration management)
- `/telemetry` - Telemetry (real-time sensor visualization)

### Technology Stack

- **Framework**: React 18.3.1 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: Zustand v4.5.5
- **Data Fetching**: React Query (@tanstack/react-query)
- **Charts**: Recharts
- **Diagrams**: React Flow (@xyflow/react)
- **Real-time**: MQTT over WebSocket

---

## Target Navigation Structure

```
📊 Dashboard (Home)
   └─ Global overview of ALL sites

🏭 Sites
   ├─ All Sites (List/Grid View)
   └─ Per Site Detail:
      ├─ Site Overview (metrics, status, recent alerts)
      ├─ Plant Schematic (React Flow diagram)
      ├─ Performance Analytics (charts/trends)
      ├─ Event Logs (activity history)
      └─ Configuration (module setup - Admin/Site Manager only)

🔔 Alerts
   ├─ Active Alerts (filterable by severity/site)
   ├─ Alert History
   └─ Alert Configuration (thresholds, rules)

📊 Reports
   ├─ Report Templates
   ├─ Custom Report Builder
   └─ Export Center (PDF, CSV, Excel)

📈 Analytics
   ├─ Cross-Site Comparison
   ├─ Efficiency Metrics
   ├─ Trend Analysis
   └─ AI Assistant (with InfluxDB integration)

⚙️ Settings
   ├─ General Settings
   ├─ Notification Preferences
   ├─ Integration Settings (MQTT, APIs)
   └─ System Configuration

👥 Admin
   ├─ User Management
   ├─ Role & Permission Management
   ├─ Site Access Control
   └─ Audit Logs
```

---

## User Roles & Permissions

### Role Definitions

#### **Admin** (Full System Access)
- Manage all users and roles
- Configure all sites and modules
- Access all features across all sites
- View and manage system-wide settings
- Access audit logs

#### **Site Manager** (Site-Specific Management)
- Configure specific assigned site(s) plant layouts
- Manage site-specific users (Operators, Technicians, Viewers)
- View and acknowledge alerts for assigned sites
- Generate reports for assigned sites
- Adjust site-specific settings

#### **Technician** (Operational with Limited Config)
- View all assigned site data
- Adjust specific module settings (defined by Admin/Site Manager)
- Acknowledge alerts
- View event logs
- Cannot modify plant layouts

#### **Operator** (Monitoring & Response)
- View real-time data for assigned sites
- Monitor alerts and system status
- Acknowledge alerts
- View performance metrics
- Cannot modify configurations

#### **Viewer** (Read-Only Access)
- View site status and metrics
- View performance analytics
- View reports
- No acknowledgement or configuration rights

### Permission Matrix

| Feature | Admin | Site Manager | Technician | Operator | Viewer |
|---------|-------|--------------|------------|----------|--------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Sites | All | Assigned | Assigned | Assigned | Assigned |
| Edit Plant Layout | All Sites | Assigned Sites | ✗ | ✗ | ✗ |
| Adjust Module Settings | ✓ | ✓ (assigned) | Limited | ✗ | ✗ |
| View Alerts | All | Assigned | Assigned | Assigned | Assigned |
| Acknowledge Alerts | ✓ | ✓ | ✓ | ✓ | ✗ |
| Configure Alert Rules | ✓ | ✓ (assigned) | ✗ | ✗ | ✗ |
| Generate Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Analytics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Use AI Assistant | ✓ | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | Limited | ✗ | ✗ | ✗ |
| System Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Audit Logs | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Implementation Phases

### Phase 1: Core Navigation & Structure ⚙️

**Goal**: Replace horizontal navigation with professional sidebar layout

#### Components to Create

1. **Sidebar Component** (`/components/layout/Sidebar.tsx`)
   - User profile section with avatar
   - Navigation menu with icons
   - Active route highlighting
   - Collapsible on mobile/tablet
   - Footer with Support/Logout links
   - Role-based menu item visibility

2. **AppShell Component** (`/components/layout/AppShell.tsx`)
   - Flexbox layout wrapper
   - Sidebar + Main content areas
   - Responsive breakpoint handling

3. **TopBar Component** (`/components/layout/TopBar.tsx`)
   - Breadcrumb navigation
   - Search bar (future)
   - Time range selector
   - Notification bell
   - User menu dropdown

4. **Breadcrumbs Component** (`/components/shared/Breadcrumbs.tsx`)
   - Dynamic breadcrumb generation from routes
   - Navigate up the hierarchy

#### Refactoring Required

- Update `App.tsx` to use AppShell layout
- Remove existing horizontal Navigation component
- Update routing structure for nested routes
- Add layout route wrappers

#### Design Reference

Implementation will follow the provided HTML design:
- Material Symbols icons (already using Lucide React - will maintain consistency)
- Tailwind CSS utility classes
- Light/Dark mode support
- Professional spacing and typography

---

### Phase 2: Sites Management 🏭

**Goal**: Create comprehensive multi-site management interface

#### Pages to Create

1. **All Sites List** (`/views/sites/SitesList.tsx`)
   - Grid/List toggle view
   - Site status cards
   - Quick metrics per site (flow rate, status, active alerts)
   - Search and filter capabilities
   - Click to navigate to site detail

2. **Site Detail View** (`/views/sites/SiteDetail.tsx`)
   - Tabbed interface:
     - **Overview Tab**: Plant schematic + key metrics
     - **Analytics Tab**: Performance charts and trends
     - **Events Tab**: Activity logs and event history
     - **Configuration Tab**: Plant layout editor (role-restricted)
   - Breadcrumb: All Sites / [Site Name]
   - Site-specific header with status indicator

3. **Site Overview Tab** (`/views/sites/tabs/SiteOverview.tsx`)
   - Plant schematic visualization (inline React Flow view)
   - Module status cards (Intake, Filtration, Disinfection, Reservoir)
   - Real-time status indicators
   - Click module to see details

4. **Site Analytics Tab** (`/views/sites/tabs/SiteAnalytics.tsx`)
   - Water quality trends (pH, Turbidity, Chlorine)
   - System throughput charts
   - Reservoir level gauge
   - Time range selector
   - Export chart data

5. **Site Events Tab** (`/views/sites/tabs/SiteEvents.tsx`)
   - Event log table with filtering
   - Columns: Timestamp, Event Type, Severity, Description
   - Severity badges (Critical, Warning, Info)
   - Search and filter by type/severity/date

6. **Site Configuration Tab** (`/views/sites/tabs/SiteConfiguration.tsx`)
   - Reuse existing PlantConfiguration component
   - Role guard (Admin/Site Manager only)
   - Module library drag-and-drop
   - Save/Discard changes workflow

#### Components to Create

- `SiteCard.tsx` - Reusable site status card
- `SiteStatusBadge.tsx` - Online/Offline/Maintenance badge
- `ModuleStatusCard.tsx` - Module health card for schematic view
- `TabNavigation.tsx` - Reusable tabbed interface component

#### Store Updates

Update `dashboardStore.ts`:
```typescript
interface DashboardState {
  // Add:
  selectedSiteTab: 'overview' | 'analytics' | 'events' | 'configuration'
  setSelectedSiteTab: (tab: string) => void

  // Enhance:
  sites: Record<string, PlantSite> // Already exists
  getSitesByStatus: (status: string) => PlantSite[]
  getSitesWithActiveAlarms: () => PlantSite[]
}
```

---

### Phase 3: Alerts & Notifications 🔔

**Goal**: Comprehensive alert management and notification system

#### Pages to Create

1. **Alerts Dashboard** (`/views/alerts/AlertsDashboard.tsx`)
   - Active alerts feed (real-time)
   - Filter by severity (Critical, Warning, Info)
   - Filter by site
   - Filter by module/asset
   - Acknowledge/Dismiss actions
   - Bulk actions for multiple alerts

2. **Alert History** (`/views/alerts/AlertHistory.tsx`)
   - Historical alert table
   - Date range picker
   - Search functionality
   - Export to CSV
   - Alert statistics (count by severity, response times)

3. **Alert Configuration** (`/views/alerts/AlertConfiguration.tsx`)
   - Alert rule builder
   - Threshold configuration per sensor
   - Notification routing (email, SMS, push)
   - Escalation policies
   - Role-based access (Admin/Site Manager)

#### Components to Create

- `AlertCard.tsx` - Alert item with acknowledge action
- `AlertSeverityBadge.tsx` - Critical/Warning/Info badge
- `AlertRuleEditor.tsx` - Rule configuration form
- `NotificationSettings.tsx` - User notification preferences

#### Store Creation

New `alertStore.ts`:
```typescript
interface AlertStore {
  activeAlerts: Alert[]
  alertHistory: Alert[]
  alertRules: AlertRule[]

  addAlert: (alert: Alert) => void
  acknowledgeAlert: (alertId: string, userId: string) => void
  dismissAlert: (alertId: string) => void

  getAlertsBySeverity: (severity: AlertSeverity) => Alert[]
  getAlertsBySite: (siteId: string) => Alert[]
  getUnacknowledgedAlerts: () => Alert[]

  addAlertRule: (rule: AlertRule) => void
  updateAlertRule: (ruleId: string, updates: Partial<AlertRule>) => void
  deleteAlertRule: (ruleId: string) => void
}

interface Alert {
  id: string
  siteId: string
  moduleId?: string
  assetId?: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  timestamp: string
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolved: boolean
  resolvedAt?: string
}

interface AlertRule {
  id: string
  name: string
  siteId: string
  assetId: string
  measurement: string
  condition: 'above' | 'below' | 'equal' | 'between'
  threshold: number | [number, number]
  severity: 'critical' | 'warning' | 'info'
  notificationChannels: string[]
  enabled: boolean
}
```

#### Backend Integration

Update MQTT subscription for alert topics:
```typescript
// Topics to subscribe:
wtp/+/alerts/+        // Site-level alerts
wtp/+/+/alerts/+      // Module-level alerts
wtp/global/alerts/+   // System-wide alerts
```

---

### Phase 4: User Management 👥

**Goal**: Role-based access control and user administration

#### Pages to Create

1. **User Management** (`/views/admin/UserManagement.tsx`)
   - User list table with search/filter
   - Add User button (opens modal)
   - Edit/Delete actions per user
   - Filter by role
   - Filter by assigned sites
   - Admin-only access

2. **User Form Modal** (`/components/admin/UserFormModal.tsx`)
   - User details (name, email, phone)
   - Role selector dropdown
   - Site assignment multi-select
   - Password generation (initial setup)
   - Save/Cancel actions

3. **Role Management** (`/views/admin/RoleManagement.tsx`)
   - Role definitions display
   - Permission matrix view
   - Create custom roles (future enhancement)
   - Admin-only access

4. **Site Access Control** (`/views/admin/SiteAccessControl.tsx`)
   - Matrix view: Users × Sites
   - Bulk assignment capabilities
   - Filter by site or user
   - Export assignments to CSV

5. **Audit Logs** (`/views/admin/AuditLogs.tsx`)
   - User action logging
   - Columns: Timestamp, User, Action, Resource, Details
   - Filter by user, action type, date range
   - Search functionality
   - Export to CSV

#### Components to Create

- `UserTable.tsx` - User list with actions
- `RoleSelector.tsx` - Role dropdown with descriptions
- `SiteAccessMatrix.tsx` - Interactive site assignment grid
- `AuditLogTable.tsx` - Activity log table

#### Store Creation

New `authStore.ts`:
```typescript
interface AuthStore {
  user: User | null
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUserProfile: (updates: Partial<User>) => void

  hasPermission: (permission: string) => boolean
  canAccessSite: (siteId: string) => boolean
  canEditSiteConfig: (siteId: string) => boolean
}

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'admin' | 'site_manager' | 'technician' | 'operator' | 'viewer'
  assignedSites: string[]
  avatar?: string
  createdAt: string
  lastLogin?: string
}
```

New `userManagementStore.ts` (Admin only):
```typescript
interface UserManagementStore {
  users: User[]
  roles: Role[]
  auditLogs: AuditLog[]

  getUsers: () => void
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  deleteUser: (userId: string) => void

  assignSiteToUser: (userId: string, siteId: string) => void
  removeSiteFromUser: (userId: string, siteId: string) => void

  getUsersBySite: (siteId: string) => User[]
  getUsersByRole: (role: string) => User[]

  logAction: (action: string, resourceId: string, details?: any) => void
}

interface Role {
  id: string
  name: string
  permissions: string[]
  description: string
}

interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  timestamp: string
  details?: any
}
```

#### Route Guards

Create `RequireAuth` and `RequireRole` wrapper components:

```typescript
// /components/auth/RequireAuth.tsx
// Redirect to login if not authenticated

// /components/auth/RequireRole.tsx
// Show 403 error if user lacks required role
```

#### Mock Authentication (Initial Implementation)

Phase 4 will implement **mock authentication** without backend:
- Hardcoded user credentials in authStore
- localStorage persistence for session
- Client-side role checking
- Foundation for real auth integration later

Mock users for testing:
```typescript
const mockUsers = [
  { email: 'admin@hydros.io', password: 'admin123', role: 'admin', name: 'Admin User' },
  { email: 'manager@hydros.io', password: 'manager123', role: 'site_manager', name: 'Site Manager' },
  { email: 'tech@hydros.io', password: 'tech123', role: 'technician', name: 'Technician' },
  { email: 'operator@hydros.io', password: 'operator123', role: 'operator', name: 'Operator' },
  { email: 'viewer@hydros.io', password: 'viewer123', role: 'viewer', name: 'Viewer' },
]
```

---

### Phase 5: Reports & Analytics 📊

**Goal**: Comprehensive reporting and AI-powered analytics

#### Reports Section

##### Pages to Create

1. **Reports Dashboard** (`/views/reports/ReportsDashboard.tsx`)
   - Recent reports list
   - Scheduled reports section
   - Quick report templates
   - Export center
   - Create new report button

2. **Report Builder** (`/views/reports/ReportBuilder.tsx`)
   - Report template selector
   - Date range picker
   - Site selector (multi-select)
   - Metric/chart selector
   - Preview pane
   - Export format selector (PDF, Excel, CSV)
   - Schedule options (one-time, daily, weekly, monthly)

3. **Report Templates** (`/views/reports/ReportTemplates.tsx`)
   - Pre-built report templates:
     - Daily Operations Summary
     - Water Quality Compliance Report
     - Maintenance Activity Report
     - Alert Summary Report
     - Energy Efficiency Report
     - Cross-Site Comparison Report
   - Template customization
   - Save custom templates

##### Components to Create

- `ReportCard.tsx` - Report preview card
- `ReportTemplateSelector.tsx` - Template picker
- `ExportFormatSelector.tsx` - PDF/Excel/CSV selector
- `ReportScheduler.tsx` - Schedule configuration form

##### Store Creation

New `reportStore.ts`:
```typescript
interface ReportStore {
  reports: Report[]
  templates: ReportTemplate[]
  scheduledReports: ScheduledReport[]

  generateReport: (config: ReportConfig) => Promise<Report>
  scheduleReport: (config: ReportConfig, schedule: Schedule) => void
  deleteReport: (reportId: string) => void
  exportReport: (reportId: string, format: 'pdf' | 'excel' | 'csv') => void

  getReportsBySite: (siteId: string) => Report[]
  getScheduledReports: () => ScheduledReport[]
}

interface Report {
  id: string
  templateId: string
  name: string
  generatedAt: string
  generatedBy: string
  dateRange: { start: string; end: string }
  siteIds: string[]
  data: any
  fileUrl?: string
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  metrics: string[]
  chartTypes: string[]
  defaultDateRange: string
}

interface ScheduledReport {
  id: string
  templateId: string
  name: string
  schedule: 'daily' | 'weekly' | 'monthly'
  time: string
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv'
  enabled: boolean
}
```

---

#### Analytics Section

##### Pages to Create

1. **Analytics Dashboard** (`/views/analytics/AnalyticsDashboard.tsx`)
   - Cross-site comparison widgets
   - Efficiency metrics overview
   - Trend analysis charts
   - AI Assistant panel (collapsible sidebar)

2. **Cross-Site Comparison** (`/views/analytics/CrossSiteComparison.tsx`)
   - Side-by-side site metrics
   - Comparison charts (bar, radar)
   - Performance rankings
   - Efficiency scores
   - Filter by metric type

3. **Efficiency Metrics** (`/views/analytics/EfficiencyMetrics.tsx`)
   - Energy consumption tracking
   - Water loss percentage
   - Chemical usage efficiency
   - Operating cost analysis
   - Time-series trends

4. **Trend Analysis** (`/views/analytics/TrendAnalysis.tsx`)
   - Historical trend visualization
   - Predictive analytics (forecasting)
   - Anomaly detection highlighting
   - Correlation analysis between metrics
   - Pattern recognition

5. **AI Assistant Panel** (`/components/analytics/AIAssistant.tsx`)
   - Chat interface
   - Natural language query input
   - Data-grounded responses using InfluxDB
   - Suggested insights
   - Export conversation to report
   - Context-aware (knows current site/date range)

##### AI Assistant Features

**Capabilities**:
- Query InfluxDB data in natural language
- Generate insights from historical trends
- Explain anomalies and patterns
- Suggest optimization actions
- Answer questions about specific metrics
- Compare sites intelligently
- Predict maintenance needs

**Example Queries**:
- "What was the average chlorine level at Clear Creek last week?"
- "Show me sites with turbidity above normal"
- "Compare energy usage across all sites this month"
- "Why did the reservoir level spike yesterday?"
- "Which site has the best filtration efficiency?"

**Technical Implementation**:
- Use LangChain or similar framework for LLM integration
- Connect to InfluxDB via Flux queries
- Embed site/sensor metadata for context
- Stream responses for better UX
- Cache common queries
- Rate limiting per user role

##### Components to Create

- `ComparisonChart.tsx` - Side-by-side site comparison
- `EfficiencyGauge.tsx` - Efficiency score visualization
- `TrendChart.tsx` - Advanced trend visualization with forecasting
- `AnomalyMarker.tsx` - Highlight anomalies on charts
- `AIAssistant.tsx` - Chat interface component
- `ChatMessage.tsx` - Individual message bubble
- `SuggestedInsights.tsx` - AI-generated insights cards

##### Store Creation

New `analyticsStore.ts`:
```typescript
interface AnalyticsStore {
  comparisonData: SiteComparison[]
  efficiencyMetrics: EfficiencyMetrics
  trendData: TrendData[]
  aiConversations: AIConversation[]

  fetchComparisonData: (siteIds: string[], dateRange: DateRange) => void
  fetchEfficiencyMetrics: (siteId: string, dateRange: DateRange) => void
  fetchTrendData: (metric: string, dateRange: DateRange) => void

  queryAI: (question: string, context: QueryContext) => Promise<AIResponse>
  saveConversation: (conversation: AIConversation) => void
}

interface SiteComparison {
  siteId: string
  siteName: string
  metrics: Record<string, number>
  scores: {
    efficiency: number
    reliability: number
    quality: number
    overall: number
  }
}

interface EfficiencyMetrics {
  energyConsumption: number
  waterLoss: number
  chemicalEfficiency: number
  operatingCost: number
  trend: 'improving' | 'stable' | 'declining'
}

interface TrendData {
  timestamp: string
  value: number
  predicted?: number
  upperBound?: number
  lowerBound?: number
  anomaly?: boolean
}

interface AIConversation {
  id: string
  userId: string
  messages: AIMessage[]
  context: QueryContext
  createdAt: string
}

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  dataReferences?: string[] // InfluxDB query results used
}

interface QueryContext {
  siteId?: string
  dateRange: DateRange
  metrics?: string[]
  currentView: string
}
```

##### Backend Integration

**New API Endpoints Needed**:
```
POST /api/analytics/query-ai
  - Body: { question: string, context: QueryContext }
  - Returns: { response: string, dataSources: string[] }

GET /api/analytics/comparison?sites=...&dateRange=...
  - Returns: SiteComparison[]

GET /api/analytics/efficiency/:siteId?dateRange=...
  - Returns: EfficiencyMetrics

GET /api/analytics/trends/:metric?dateRange=...
  - Returns: TrendData[]
```

**InfluxDB Integration**:
- Backend service to translate natural language to Flux queries
- Use LLM (GPT-4, Claude) with InfluxDB schema context
- Execute Flux queries against InfluxDB
- Format results for LLM to generate natural language response
- Return both response and raw data references

---

## Technical Implementation Details

### Layout Architecture

#### Component Hierarchy
```
App.tsx
└── AppShell
    ├── Sidebar
    │   ├── UserProfile
    │   ├── NavMenu
    │   │   └── NavItem (with role-based visibility)
    │   └── SidebarFooter
    └── MainContent
        ├── TopBar
        │   ├── Breadcrumbs
        │   ├── SearchBar (future)
        │   ├── TimeRangeSelector
        │   ├── NotificationBell
        │   └── UserMenu
        └── PageContent
            └── [Route-specific content]
```

#### Responsive Breakpoints
- **Mobile** (<768px): Sidebar hidden by default, toggle button in TopBar
- **Tablet** (768px-1024px): Collapsible sidebar (icon-only mode)
- **Desktop** (>1024px): Full sidebar always visible

### State Management Architecture

#### Store Organization
```
/store
├── authStore.ts              # Authentication & current user
├── dashboardStore.ts         # Global dashboard state (existing, enhanced)
├── telemetryStore.ts         # Real-time sensor data (existing)
├── configurationStore.ts     # Plant configurations (existing)
├── plantLayoutStore.ts       # React Flow state (existing)
├── alertStore.ts             # Alert management (new)
├── userManagementStore.ts    # User admin (new)
├── reportStore.ts            # Reports (new)
└── analyticsStore.ts         # Analytics & AI (new)
```

#### Store Communication
- Use Zustand subscribeWithSelector for cross-store updates
- MQTT updates flow into appropriate stores
- Auth state changes trigger permission recalculations

### Routing Structure

```typescript
// Nested routes for better organization
<Routes>
  <Route element={<AppShell />}>
    <Route path="/" element={<Dashboard />} />

    <Route path="/sites">
      <Route index element={<SitesList />} />
      <Route path=":siteId" element={<SiteDetail />}>
        <Route index element={<Navigate to="overview" />} />
        <Route path="overview" element={<SiteOverview />} />
        <Route path="analytics" element={<SiteAnalytics />} />
        <Route path="events" element={<SiteEvents />} />
        <Route path="configuration" element={
          <RequireRole roles={['admin', 'site_manager']}>
            <SiteConfiguration />
          </RequireRole>
        } />
      </Route>
    </Route>

    <Route path="/alerts">
      <Route index element={<AlertsDashboard />} />
      <Route path="history" element={<AlertHistory />} />
      <Route path="configuration" element={
        <RequireRole roles={['admin', 'site_manager']}>
          <AlertConfiguration />
        </RequireRole>
      } />
    </Route>

    <Route path="/reports">
      <Route index element={<ReportsDashboard />} />
      <Route path="builder" element={<ReportBuilder />} />
      <Route path="templates" element={<ReportTemplates />} />
    </Route>

    <Route path="/analytics">
      <Route index element={<AnalyticsDashboard />} />
      <Route path="comparison" element={<CrossSiteComparison />} />
      <Route path="efficiency" element={<EfficiencyMetrics />} />
      <Route path="trends" element={<TrendAnalysis />} />
    </Route>

    <Route path="/settings" element={<Settings />} />

    <Route path="/admin" element={
      <RequireRole roles={['admin']}>
        <Outlet />
      </RequireRole>
    }>
      <Route index element={<Navigate to="users" />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="roles" element={<RoleManagement />} />
      <Route path="access" element={<SiteAccessControl />} />
      <Route path="audit" element={<AuditLogs />} />
    </Route>
  </Route>

  <Route path="/login" element={<Login />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Design System

#### Color Palette
```css
/* Primary */
--primary: #135bec
--primary-hover: #0d47c1
--primary-light: #e6f0ff

/* Status Colors */
--status-normal: #10b981 (green-500)
--status-warning: #f59e0b (yellow-500)
--status-critical: #ef4444 (red-500)
--status-offline: #6b7280 (gray-500)
--status-maintenance: #3b82f6 (blue-500)

/* Alert Severity */
--alert-critical: #ef4444
--alert-warning: #f59e0b
--alert-info: #3b82f6

/* Background */
--bg-light: #f6f6f8
--bg-dark: #101622

/* Neutrals */
--gray-50 to --gray-900 (Tailwind defaults)
```

#### Typography
- **Font Family**: Inter (already loaded)
- **Headings**: Font weight 700-900
- **Body**: Font weight 400-500
- **Scale**: Tailwind default scale

#### Spacing
- **Sidebar Width**: 16rem (256px)
- **Sidebar Collapsed**: 4rem (64px)
- **TopBar Height**: 4rem (64px)
- **Content Padding**: 1.5rem to 2rem
- **Card Border Radius**: 0.75rem (12px)

#### Icons
- **Library**: Lucide React (consistent with current implementation)
- **Size**: 20px (base), 24px (large), 16px (small)
- **Stroke Width**: 2

### Data Flow Architecture

#### Real-Time Data Flow
```
MQTT Broker (Mosquitto)
    ↓
WebSocket Connection (useMqtt hook)
    ↓
Topic Routing:
    - wtp/+/+/+/observation → telemetryStore
    - wtp/+/alerts/+ → alertStore
    - wtp/+/configuration/+ → configurationStore
    ↓
Store Updates (Zustand)
    ↓
React Component Re-renders
    ↓
UI Updates
```

#### API Data Flow
```
User Action
    ↓
React Component
    ↓
React Query Mutation/Query
    ↓
API Request (fetch/axios)
    ↓
Backend API
    ↓
Database/InfluxDB
    ↓
Response
    ↓
React Query Cache Update
    ↓
Store Update (if needed)
    ↓
UI Re-render
```

### Security Considerations

#### Client-Side Security
- XSS prevention (React automatic escaping)
- CSRF token validation (future)
- Secure credential storage (encrypted localStorage)
- Role-based route guards
- Permission checks before actions

#### Data Protection
- Sensitive data masked in logs
- User passwords hashed (future backend integration)
- Session timeout (30 minutes idle)
- Logout on token expiration

#### Audit Trail
- Log all user actions (especially config changes)
- Record login/logout events
- Track alert acknowledgements
- Log report generation and exports

---

## Dependencies & Libraries

### New Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.x", // For advanced tables
    "jspdf": "^2.x", // PDF generation
    "xlsx": "^0.18.x", // Excel export
    "date-fns": "^3.x", // Date manipulation (already may exist)
    "react-hook-form": "^7.x", // Form management
    "zod": "^3.x", // Form validation
    "langchain": "^0.1.x", // AI assistant integration
    "@langchain/openai": "^0.0.x" // OpenAI integration for AI assistant
  }
}
```

### Existing Dependencies (No Change Required)
- React Router DOM (routing)
- Zustand (state management)
- React Query (data fetching)
- Recharts (charts)
- React Flow (diagrams)
- Lucide React (icons)
- Tailwind CSS (styling)
- CLSX (conditional classes)

---

## Testing Strategy

### Unit Tests
- Component rendering tests (Jest + React Testing Library)
- Store logic tests (Zustand store methods)
- Utility function tests
- Permission helper tests

### Integration Tests
- User authentication flow
- Alert acknowledgement workflow
- Report generation process
- Site navigation and filtering

### E2E Tests (Future)
- Full user journeys (Playwright/Cypress)
- Multi-site management scenarios
- Role-based access verification
- Real-time data updates

---

## Migration Strategy

### Preserving Existing Functionality

1. **Keep Existing Pages Intact**
   - SystemOverview → Becomes Dashboard (minor modifications)
   - PlantLayout → Embedded in Site Detail Configuration tab
   - PlantConfiguration → Embedded in Site Detail Configuration tab
   - Telemetry → Becomes Site Analytics tab content

2. **URL Compatibility** (Optional)
   - Add redirects from old URLs to new structure
   - `/layout` → `/sites/:siteId/configuration`
   - `/configuration` → `/sites/:siteId/configuration`
   - `/telemetry` → `/sites/:siteId/analytics`

3. **Data Migration**
   - No backend data changes required
   - localStorage keys remain compatible
   - MQTT topics unchanged

### Gradual Rollout

1. **Phase 1**: Deploy sidebar + AppShell (no feature changes)
2. **Phase 2**: Add Sites pages (parallel to existing)
3. **Phase 3**: Add Alerts (new functionality)
4. **Phase 4**: Add User Management (mock auth)
5. **Phase 5**: Add Reports & Analytics

Each phase is independently deployable and testable.

---

## Performance Considerations

### Optimization Strategies

1. **Code Splitting**
   - Lazy load routes: `const Dashboard = lazy(() => import('./views/Dashboard'))`
   - Lazy load heavy components (charts, AI assistant)
   - Separate bundles per feature area

2. **Data Management**
   - Virtualized tables for large datasets (@tanstack/react-virtual)
   - Pagination for event logs and alert history
   - Debounced search inputs
   - React Query caching strategies

3. **Real-Time Updates**
   - Throttle high-frequency MQTT messages
   - Use web workers for data processing
   - Batch store updates

4. **Asset Optimization**
   - Tree-shake unused Lucide icons
   - Optimize images (WebP format)
   - Lazy load chart libraries

---

## Future Enhancements (Post Phase 5)

### Advanced Features

1. **Mobile App** (React Native)
   - Native iOS/Android apps
   - Push notifications for alerts
   - Offline mode with sync

2. **Advanced Analytics**
   - Machine learning predictions
   - Automated anomaly detection
   - Prescriptive maintenance recommendations

3. **Collaboration Features**
   - Team chat/comments on sites
   - Shift handoff notes
   - Shared dashboards

4. **Integration Ecosystem**
   - SCADA system integration
   - Third-party sensor platforms
   - External reporting tools (Power BI, Tableau)

5. **Custom Dashboards**
   - Drag-and-drop dashboard builder
   - Widget marketplace
   - Personalized views per user

---

## Success Metrics

### Key Performance Indicators

1. **User Experience**
   - Page load time < 2 seconds
   - Time to interactive < 3 seconds
   - Smooth animations (60fps)

2. **Functionality**
   - All critical user journeys working
   - Zero data loss during transitions
   - Real-time updates < 1 second latency

3. **Adoption**
   - User login frequency
   - Feature usage analytics
   - User feedback scores

4. **System Health**
   - Frontend error rate < 0.1%
   - API response time < 500ms
   - Uptime > 99.5%

---

## Implementation Progress

### Phase 1: Core Navigation & Structure ✅ **COMPLETED**

**Status**: Fully implemented and deployed
**Completion Date**: 2025-11-10

#### Completed Components

1. ✅ **Sidebar Component** (`/components/layout/Sidebar.tsx`)
   - User profile section with avatar and role display
   - Navigation menu with Lucide React icons
   - Active route highlighting with primary color
   - Collapsible on mobile/tablet (responsive design)
   - Footer with Support and theme toggle links
   - Role-based menu item visibility (prepared for Phase 4)

2. ✅ **AppShell Component** (`/components/layout/AppShell.tsx`)
   - Flexbox layout wrapper with sidebar + main content
   - Responsive breakpoint handling (mobile, tablet, desktop)
   - Persistent layout across all routes
   - Smooth transitions

3. ✅ **TopBar Component** (Integrated into Sidebar)
   - User menu with profile access
   - Theme toggle (dark/light mode)
   - Navigation state management

4. ✅ **Navigation Infrastructure**
   - Updated `App.tsx` to use AppShell layout
   - Removed deprecated horizontal Navigation component
   - Updated routing structure for nested routes
   - Added layout route wrappers

#### Features Implemented

- **Dark Mode Support**: Full theme system with `useThemeStore`
  - Toggle between light/dark themes
  - Persistent preference in localStorage
  - Applied across all components
  - Smooth transitions

- **Responsive Design**:
  - Mobile (<768px): Sidebar hidden by default, hamburger toggle
  - Tablet (768px-1024px): Collapsible sidebar
  - Desktop (>1024px): Full sidebar always visible

- **Professional Styling**:
  - Tailwind CSS utility classes throughout
  - Primary color (#135bec) consistently applied
  - Professional spacing and typography
  - Lucide React icons with consistent sizing

---

### Phase 2: Sites Management ✅ **COMPLETED**

**Status**: Fully implemented with enhancements
**Completion Date**: 2025-11-11

#### Completed Pages

1. ✅ **Sites List** (`/views/Sites.tsx`)
   - Grid view with site status cards
   - Real-time metrics per site (flow rate, status, module count)
   - Site status indicators (connected/disconnected)
   - Click to navigate to site detail
   - Dark mode support

2. ✅ **Site Detail View** (`/views/sites/SiteDetail.tsx`)
   - Clean tabbed interface with 5 tabs:
     - **Overview**: Site metrics, Plant Schematic, collapsible sections
     - **Performance Analytics**: Charts and trends
     - **Telemetry**: Real-time sensor data
     - **Event Logs**: Activity history
     - **Configuration**: Plant layout and module configuration
   - Breadcrumb navigation
   - Site-specific header with status
   - Tab state management with URL params

3. ✅ **Site Overview Tab** (`/views/sites/SiteOverview.tsx`)
   - **Key Metrics Section**:
     - Design Flow Rate with smart formatting
     - Current Flow Rate with stale data indicator
     - Daily Total Flow
     - Flow Utilization bar chart
   - **Plant Schematic**: Collapsible section with responsive grid
     - Module status cards fetched from real configuration
     - Dynamic module names from template IDs
     - Responsive grid layout (1-5 columns based on screen size)
     - Real-time telemetry integration
     - "Open Full Layout" button for fullscreen view
   - **Collapsible Sections** (expandable/collapsible with chevron indicators):
     - Site Information (location, treatment train, flow rates)
     - Water Quality Parameters (raw water quality, treatment targets)
     - Protocol Clients (MQTT client configurations)
     - Control Strategies (automation logic)
     - Alarm Definitions (alert rules and thresholds)
   - **Flow Rate Caching**: useRef-based caching to prevent flickering
   - **Recent Data Detection**: Checks for data within 60 seconds

4. ✅ **Site Analytics Tab** (`/views/sites/SiteAnalytics.tsx`)
   - Water quality trend charts
   - System throughput visualization
   - Time range selector
   - Dark mode support

5. ✅ **Site Telemetry Tab** (`/views/sites/SiteTelemetry.tsx`)
   - Site-specific telemetry data filtering
   - Real-time observation display
   - Asset-based organization
   - Measurement categorization
   - Full theme adaptation

6. ✅ **Site Events Tab** (`/views/sites/SiteEvents.tsx`)
   - Event log table with filtering capabilities
   - Timestamp, type, severity, description columns
   - Severity badges
   - Dark mode support

7. ✅ **Site Configuration Tab** (`/views/sites/SiteConfiguration.tsx`)
   - Wrapper for PlantConfiguration component
   - Site-specific configuration management
   - Enhanced Plant Overview card (4-column layout)
   - Module statistics and configuration details
   - Dark mode support

8. ✅ **Site Layout Fullscreen** (`/views/sites/SiteLayoutFullscreen.tsx`)
   - Dedicated fullscreen route for Plant Layout
   - Path: `/sites/:siteId/layout`
   - Back navigation to site overview
   - Maximum canvas space utilization
   - No tabs or sidebar constraints

#### Completed Components

- ✅ `TabNavigation.tsx` - Reusable tabbed interface with active state
- ✅ `ModuleStatusCard.tsx` - Module health visualization with status colors
- ✅ `StatusIndicator.tsx` - Connection status badge component
- ✅ `MetricCard.tsx` - Enhanced with full dark mode support

#### Plant Layout Enhancements ✅

**Completed Improvements**:

1. **Theme Harmonization**:
   - ModuleLibrary: Full dark mode, reduced width (w-72), primary color usage
   - NodePropertiesPanel: Complete dark mode, updated action buttons
   - AdvancedLayoutTools: Comprehensive dark mode across all tabs
   - All components now use consistent primary color and dark variants

2. **Layout Optimization**:
   - Converted sidebars to overlay panels (absolute positioning)
   - Module Library defaults to closed for better UX
   - Advanced Layout Tools positioned as right side panel (not modal)
   - Maximized canvas space usage
   - Improved responsiveness for large screens

3. **Component Features**:
   - Module Library: Searchable, categorized, drag-and-drop enabled
   - Node Properties Panel: Full module details, observation display
   - Advanced Layout Tools: Auto-layout algorithms, connection management, layers, validation

#### Store Enhancements

Enhanced `dashboardStore.ts`:
- Added `sites` Record structure for multi-site data
- Site status tracking (connected/disconnected)
- Last seen timestamps
- Module associations per site

Enhanced `configurationStore.ts`:
- Current site ID tracking
- Site-specific configuration management
- Module template integration
- Plant configuration updates via MQTT

Enhanced `telemetryStore.ts`:
- Site-specific data filtering
- Latest observation caching
- Asset-based data retrieval
- Real-time updates via MQTT

#### Routing Structure

```typescript
/sites → Sites list page
/sites/:siteId → Site detail (defaults to overview tab)
/sites/:siteId/:tab → Site detail with specific tab
/sites/:siteId/layout → Fullscreen plant layout view
```

#### Additional Features Implemented

1. **Flow Metrics with Caching**:
   - useRef-based caching to prevent flickering
   - Handles temporary data gaps gracefully
   - Recent data detection (60-second window)
   - Warning indicator for stale data

2. **Smart Value Formatting**:
   - formatFlowValue helper function
   - Displays large numbers with 'k' suffix (e.g., "45.0k")
   - Handles small numbers without unnecessary division
   - Prevents double division errors

3. **Real Data Integration**:
   - Plant Schematic uses actual module configurations
   - Module icons based on template types and categories
   - Dynamic module name generation
   - Telemetry data fetched from MQTT

4. **Deprecated Components Marked**:
   - SystemOverview.tsx (functionality moved to Dashboard and SiteOverview)
   - PlantDetails.tsx (functionality integrated into SiteOverview)
   - Telemetry.tsx (replaced by SiteTelemetry)

---

### Additional Enhancements ✅

#### Dark Mode System
- Complete dark mode implementation across all components
- Tailwind `class` mode configuration
- useThemeStore with localStorage persistence
- Consistent color palette:
  - Backgrounds: `bg-white dark:bg-gray-900`
  - Borders: `border-gray-200 dark:border-gray-800`
  - Text: `text-gray-900 dark:text-white`
  - Secondary: `text-gray-600 dark:text-gray-400`

#### Collapsible Sections Pattern
- Reusable collapsible section pattern implemented
- Chevron indicators with smooth rotation
- Click-to-toggle functionality
- Smart defaults (frequently used sections open)
- Improved information density

#### Component Library
- Enhanced MetricCard with dark mode and status colors
- StatusIndicator with label support
- ModuleStatusCard for plant schematic visualization
- TabNavigation for consistent tab interfaces

---

### Phase 3: Alerts & Notifications ✅ **COMPLETED**

**Status**: Fully implemented and tested
**Completion Date**: 2025-11-11

#### Completed Pages

1. ✅ **Alerts Dashboard** (`/views/alerts/AlertsDashboard.tsx`)
   - Active alerts feed with real-time updates
   - Filter by severity (Critical, Warning, Info)
   - Filter by site and module
   - Bulk acknowledge and dismiss actions
   - Statistics dashboard (Total, Critical, Warning, Info, Unacknowledged)
   - Select all functionality
   - Dark mode support

2. ✅ **Alert History** (`/views/alerts/AlertHistory.tsx`)
   - Historical alert table with comprehensive filtering
   - Date range picker with presets (7 days, 30 days, 90 days, all time, custom)
   - Search functionality across title, description, and site
   - Severity filtering
   - Export to CSV functionality
   - Statistics display
   - Clear history action with confirmation
   - Dark mode support

3. ✅ **Alert Configuration** (`/views/alerts/AlertConfiguration.tsx`)
   - Alert rule management interface
   - Create, edit, delete, and toggle alert rules
   - Site-based filtering
   - Rule statistics (Total, Enabled, Disabled, Critical)
   - Visual rule cards with metadata
   - Modal-based rule editor
   - Dark mode support

#### Completed Components

1. ✅ **AlertSeverityBadge** (`/components/alerts/AlertSeverityBadge.tsx`)
   - Color-coded severity badges (Critical: red, Warning: yellow, Info: blue)
   - Icon display (AlertCircle, AlertTriangle, Info)
   - Configurable size (sm, md, lg)
   - Full dark mode support

2. ✅ **AlertCard** (`/components/alerts/AlertCard.tsx`)
   - Comprehensive alert display card
   - Acknowledge and dismiss actions
   - Selectable for bulk actions
   - Metadata display (site, module, measurement, timestamp)
   - Acknowledged status indicator
   - Time-relative timestamps using date-fns
   - Dark mode support

3. ✅ **AlertRuleEditor** (`/components/alerts/AlertRuleEditor.tsx`)
   - Modal-based rule creation/editing form
   - Site and asset selection
   - Common measurement dropdown (turbidity, pH, chlorine_residual, etc.)
   - Condition types (above, below, equal, between)
   - Threshold configuration (single value or range)
   - Severity selection (critical, warning, info)
   - Notification channel selection (email, sms, push)
   - Enable/disable toggle
   - Form validation with error messages
   - Dark mode support

#### Store Implementation

✅ **Alert Store** (`/store/alertStore.ts`)
- Complete state management for alerts and alert rules
- Active alerts tracking
- Alert history management
- Alert rule CRUD operations
- Filtering capabilities (severity, site, module)
- Bulk operations (acknowledge, dismiss)
- Mock data for development testing
- TypeScript interfaces:
  - `Alert`: Full alert object with metadata
  - `AlertRule`: Complete rule definition
  - `AlertSeverity`: Type-safe severity levels
  - `AlertCondition`: Condition operators

#### Routing Updates

✅ **Updated App.tsx routing**:
```typescript
<Route path="/alerts" element={<AlertsDashboard />} />
<Route path="/alerts/history" element={<AlertHistory />} />
<Route path="/alerts/configuration" element={<AlertConfiguration />} />
```

#### MQTT Integration

✅ **Alert Topic Subscriptions** (in `App.tsx`):
- `wtp/+/alerts/+` - Site-level alerts
- `wtp/+/+/alerts/+` - Module-level alerts
- `wtp/global/alerts/+` - System-wide alerts

✅ **Alert Message Handler**:
- Topic parsing to extract site and module information
- JSON message parsing
- Site name resolution from dashboard store
- Alert object creation and validation
- Integration with alert store
- Error handling and logging

#### Navigation Integration

✅ **Sidebar Navigation**:
- Alerts menu item already present with Bell icon
- Links to `/alerts` route
- Active state highlighting
- Dark mode support

#### Features Implemented

1. **Alert Management**:
   - Real-time alert display
   - Acknowledge functionality with user tracking
   - Bulk acknowledge for multiple alerts
   - Dismiss alerts to history
   - Bulk dismiss functionality

2. **Filtering & Search**:
   - Severity-based filtering (All, Critical, Warning, Info)
   - Site-based filtering
   - Module-based filtering
   - Text search in alert history
   - Date range filtering with presets

3. **Alert Rules**:
   - Rule creation with comprehensive form
   - Rule editing with pre-populated data
   - Rule deletion with confirmation
   - Enable/disable toggle for rules
   - Condition builder (above, below, equal, between)
   - Multi-channel notifications
   - Site and asset association

4. **Data Export**:
   - CSV export of alert history
   - Includes all relevant fields (timestamp, severity, site, title, etc.)
   - Acknowledgement and resolution tracking

5. **Statistics**:
   - Alert count by severity
   - Unacknowledged alert count
   - Rule statistics (enabled, disabled, critical)
   - Resolved alert tracking

6. **Dark Mode**:
   - Full dark mode support across all alert pages
   - Consistent color palette
   - Badge and severity colors optimized for dark backgrounds

#### Mock Data

✅ **Development Mock Data**:
- 4 sample alerts with different severities and states
- 4 sample alert rules covering common scenarios
- Automatic loading on first page visit

#### Technical Highlights

1. **Type Safety**: Full TypeScript implementation with strict typing
2. **State Management**: Zustand store with optimized selectors
3. **Real-time Updates**: MQTT integration for live alert streaming
4. **User Experience**:
   - Responsive design for all screen sizes
   - Loading states and empty states
   - Confirmation dialogs for destructive actions
   - Relative time formatting with date-fns
5. **Performance**:
   - Memoized filtered lists (useMemo)
   - Efficient re-rendering
   - Optimized bulk operations

---

## Conclusion

This roadmap provides a comprehensive, phased approach to transforming the Hydros IoT Hub frontend into a production-ready, enterprise-grade application. Each phase builds upon the previous, ensuring stability and allowing for iterative feedback.

**Phases 1, 2, and 3 are now complete**, providing a solid foundation with:
- Modern sidebar navigation
- Comprehensive multi-site management
- Real-time data integration
- Full alerts and notifications system
- Alert rule configuration
- Full dark mode support
- Responsive design
- Enhanced plant layout tools

The focus on user roles, multi-site management, and AI-powered analytics positions Hydros as a modern, intelligent water treatment monitoring platform.

**Next Steps**: Begin Phase 4 implementation (User Management)

---

**Document Maintenance**

This document will be updated as implementation progresses and requirements evolve. Major revisions will be tracked with version numbers and change logs.

**Version History**:
- v1.0 (2025-11-09): Initial roadmap document created
- v1.1 (2025-11-11): Updated with Phase 1 & 2 completion status and implementation details
- v1.2 (2025-11-11): Updated with Phase 3 completion status - Alerts & Notifications fully implemented

