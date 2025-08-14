# Hydros Dashboard - SCADA-Style Interface

A modern, industrial-grade dashboard for monitoring and controlling water treatment plants in real-time.

## 🎯 Features

### Three Main Views
1. **System Overview** (`/`) - Multi-site monitoring and system health
2. **Plant Layout** (`/layout`) - Interactive process flow diagrams
3. **Telemetry** (`/telemetry`) - Real-time sensor monitoring and analysis

### Key Capabilities
- ✅ **Real-time MQTT Data** - Live sensor readings with quality indicators
- ✅ **Interactive Plant Diagrams** - Drag-and-drop process visualization
- ✅ **Multi-Site Support** - Monitor multiple water treatment plants
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Industrial Styling** - SCADA-inspired colors and typography
- ✅ **Status Monitoring** - Connection health and data quality tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Hydros backend system running
- MQTT broker accessible on port 9001 (WebSocket)

### Installation
```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm ci

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

## 🏗️ Architecture

### Technology Stack
- **React 18** with TypeScript for type safety
- **React Router** for multi-view navigation
- **Tailwind CSS** for industrial design system
- **Zustand** for lightweight state management
- **React Flow** for interactive plant diagrams
- **Recharts** for advanced data visualization
- **MQTT.js** for real-time data connectivity

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Navigation and layout components
│   └── shared/          # Shared components (StatusIndicator, MetricCard)
├── hooks/               # Custom React hooks (MQTT, data fetching)
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
├── views/               # Main dashboard views
│   ├── SystemOverview.tsx
│   ├── PlantLayout.tsx
│   └── Telemetry.tsx
└── index.css           # Tailwind CSS and custom styles
```

## 📊 Data Integration

### MQTT Topics
The dashboard subscribes to:
- `wtp/+/+/+/observation` - Real-time sensor data
- `plc/raw` - Raw PLC communications

### Data Format
Expected MQTT observation format:
```json
{
  "site_id": "wtp-porto-01",
  "asset_id": "raw_intake",
  "sensor_id": "level-raw_intake",
  "measurement": "level",
  "ts": "2024-01-15T10:00:00Z",
  "value": 2.8,
  "unit": "m",
  "quality": "good",
  "raw_tag": "33001",
  "source": "modbus_tcp_plc",
  "seq": 1
}
```

## 🎨 Design System

### Colors
- **Primary Blue**: `#3b82f6` - Main interface elements
- **Status Colors**:
  - Normal: `#10b981` (green)
  - Warning: `#f59e0b` (amber) 
  - Alarm: `#ef4444` (red)
  - Offline: `#6b7280` (gray)
  - Maintenance: `#8b5cf6` (purple)

### Components
- **StatusIndicator** - Animated status dots with labels
- **MetricCard** - Industrial-style metric display cards
- **Navigation** - Responsive header with connection status

## 🔧 Configuration

### Environment Variables
Create `.env` file in dashboard directory:
```env
VITE_MQTT_PORT=9001
```

### Site Configuration
Sites are currently configured in `App.tsx`. In production, these should be loaded from the backend configuration files.

## 📱 Mobile Support

The dashboard is fully responsive and optimized for:
- **Desktop** - Full feature set with multi-column layouts
- **Tablet** - Optimized touch interactions
- **Mobile** - Collapsible navigation and stacked layouts

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (if configured)

### Adding New Views
1. Create component in `src/views/`
2. Add route in `App.tsx`
3. Add navigation link in `Navigation.tsx`

### Custom Components
Follow the established patterns:
- Use Tailwind CSS classes
- Include TypeScript interfaces
- Add status indicators where appropriate
- Support responsive design

## 🔗 Integration with Hydros Backend

The dashboard integrates with:
- **MQTT Broker** (port 9001) - Real-time data
- **Hydros System** (port 5020) - Modbus simulation
- **Configuration Files** - Plant and protocol configs

### Starting the Full Stack
```bash
# Start Hydros backend
cd hydros
python hydros_system.py --mode hybrid

# In another terminal, start dashboard
cd dashboard  
npm run dev
```

## 🚨 Troubleshooting

### MQTT Connection Issues
- Verify MQTT broker is running on port 9001
- Check browser console for WebSocket errors
- Ensure firewall allows WebSocket connections

### No Data Appearing
- Confirm Hydros system is publishing to MQTT
- Check MQTT topic subscription in browser console
- Verify data format matches expected schema

### Build Errors
- Run `npm ci` to ensure clean dependency install
- Check Node.js version (18+ required)
- Clear browser cache and restart development server

## 📈 Performance

### Optimization Features
- **Lazy Loading** - Components load on demand
- **Data Limiting** - Time-series data capped at 200 points
- **Efficient Re-renders** - Zustand prevents unnecessary updates
- **WebSocket Management** - Automatic reconnection and health checks

### Production Considerations
- Enable gzip compression
- Use CDN for static assets
- Monitor MQTT connection stability
- Implement error boundaries for production

## 🤝 Contributing

### Development Guidelines
- Use TypeScript for all new components
- Follow existing component patterns
- Add appropriate error handling
- Test responsive design
- Include status indicators where relevant

### Code Style
- Use Tailwind CSS classes
- Prefer functional components with hooks
- Use descriptive variable names
- Add TypeScript interfaces for all props