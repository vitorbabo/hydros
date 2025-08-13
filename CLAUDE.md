# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hydros is an Industrial IoT platform for water treatment plant monitoring with two distinct components:

1. **Simulator** (`/plc-sim/`): Comprehensive WTP simulation for PoC validation and platform development
2. **Edge Gateway** (`/edge-gateway/`): Production-ready system for connecting to real WTP PLCs

**Simulator Flow:** WTP Process Simulation → Mock PLC Tags → MQTT → Cloud Platform
**Production Flow:** Real PLCs → Edge Gateway → Data Mapping → MQTT → Cloud Platform

The system publishes data on two topic patterns:
- Raw PLC data: `plc/raw` 
- Standardized observations: `wtp/{site}/{asset}/{sensor}/observation`

## Common Commands

### Development Setup
```bash
# Start all services
docker compose up -d --build

# View logs for all services
docker compose logs -f

# Stop all services
docker compose down
```

### Dashboard Development
```bash
cd dashboard
npm ci                    # Install dependencies
npm run dev              # Start dev server (Vite)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Service Access
- **Mosquitto MQTT**: localhost:1883 (MQTT), ws://localhost:9001 (WebSocket)
- **InfluxDB**: http://localhost:8086 (org: hydros, bucket: wtp, token: hydros-token)
- **Dashboard**: http://localhost:5173

## Architecture & Data Flow

### Data Contracts

**Raw PLC Message** (`plc/raw`):
```json
{
  "site_id": "wtp-porto-01",
  "source": "siemens-s7-1200", 
  "seq": 123,
  "ts": "2025-08-11T09:23:12Z",
  "tags": { "DB1.DBW100": 3.42, "DB1.DBW102": 54.1 }
}
```

**Standardized Observation** (`wtp/{site}/{asset}/{sensor}/observation`):
```json
{
  "site_id": "wtp-porto-01",
  "asset_id": "clarifier-1",
  "sensor_id": "lvl-clarifier-1", 
  "measurement": "level",
  "ts": "2025-08-11T09:23:12Z",
  "value": 3.42,
  "unit": "m",
  "quality": "good",
  "raw_tag": "DB1.DBW100",
  "source": "siemens-s7-1200",
  "seq": 123
}
```

### Service Responsibilities

- **plc-sim**: Python simulator generating PLC-like data every 2 seconds
- **mosquitto**: MQTT broker with WebSocket support for browser connections
- **telegraf**: Subscribes to MQTT topics and writes to InfluxDB
- **influxdb**: Time-series database storing sensor observations
- **dashboard**: React app with real-time MQTT subscription and charts

### Key Components

**Enhanced PLC Simulator** (`plc-sim/simulator.py`):
- Comprehensive WTP simulation with 50+ parameters across 9 treatment stages
- Realistic process interactions and equipment behavior simulation
- Modular component architecture with YAML configuration
- Factory pattern for building different plant configurations
- Industrial-grade data model with quality assessment

**Dashboard** (`dashboard/src/App.tsx`):  
- WebSocket MQTT connection for live data
- Real-time charts using Recharts library
- Sensor list with last values and selection
- TypeScript with Vite build system

**Telegraf Configuration**:
- Subscribes to `wtp/+/+/+/observation` and `plc/raw`
- Maps JSON fields to InfluxDB tags (site_id, asset_id, sensor_id, etc.)
- 5-second collection interval

## Technology Stack

- **Backend**: Docker Compose, Mosquitto MQTT, InfluxDB 2.x, Telegraf
- **Simulation**: Python 3 with paho-mqtt
- **Frontend**: React 18, TypeScript, Vite, Recharts for visualization
- **Real-time**: MQTT over WebSocket (browser to Mosquitto)

## Simulator Configurations

### Available Site Configurations
- **wtp-porto-01**: Small municipal plant (50,000 m³/day, 9 components, 44 parameters)
- **wtp-regional-02**: Large regional plant (200,000 m³/day, 18 components, 78 parameters)

### Simulation Components
- **Raw Water Intake**: Level, flow, turbidity, pH, temperature, conductivity sensors
- **Intake Pumps**: VFD-controlled with motor health monitoring and vibration analysis  
- **Chemical Treatment**: Coagulation/flocculation with automated dosing systems
- **Sedimentation**: Clarifiers with turbidity and sludge level monitoring
- **Filtration**: Rapid sand filters with differential pressure and backwash control
- **Disinfection**: Chlorination with CT value calculation and residual monitoring
- **Finished Water**: Distribution pumps and storage with quality maintenance
- **Process Control**: Realistic control strategies and equipment interactions
- **Data Quality**: Sensor validation, range checking, and quality indicators

### Simulator Key Files (`/plc-sim/`)
- `simulator.py`: Main simulation runner with comprehensive WTP modeling
- `wtp_components.py`: Core simulation engine and component definitions
- `component_factory.py`: Factory pattern for building plant configurations  
- `wtp_config.yaml`: Site configurations and module templates

### Edge Gateway Key Files (`/edge-gateway/`)
- `data_mapper.py`: Production edge gateway with PLC connectivity
- `edge_config.yaml`: Real PLC connection and tag mapping configuration
- `PRODUCTION_ARCHITECTURE.md`: Detailed production deployment guide

### Running Simulator

#### MQTT Direct Mode (Default)
```bash
cd plc-sim/
# Small municipal plant - publish directly to MQTT
SITE_ID=wtp-porto-01 SIMULATOR_MODE=mqtt_direct python simulator.py

# Large regional plant
SITE_ID=wtp-regional-02 SIMULATOR_MODE=mqtt_direct python simulator.py
```

#### Protocol Server Mode (For Edge Gateway Testing)
```bash
cd plc-sim/
# Start Modbus TCP and OPC UA servers with simulated data
SITE_ID=wtp-porto-01 SIMULATOR_MODE=protocol_server python simulator.py

# This creates:
# - Modbus TCP server on port 5020
# - OPC UA server on port 4840
```

#### Hybrid Mode (Both MQTT and Protocol Servers)
```bash
cd plc-sim/
SITE_ID=wtp-porto-01 SIMULATOR_MODE=hybrid python simulator.py
```

### Running Edge Gateway

#### Connect to Simulator Protocol Servers
```bash
cd edge-gateway/
# Connect to simulator's Modbus/OPC UA servers
PLC_HOST=localhost EDGE_CONFIG=edge_config.yaml python data_mapper.py
```

#### Connect to Real PLCs
```bash
cd edge-gateway/
# Use custom configuration for real PLC connections
EDGE_CONFIG=production_edge_config.yaml python data_mapper.py
```

## Development Guidelines

### Simulator Development
- **Process Realism**: Upstream processes affect downstream performance (turbidity cascade)
- **Equipment Behavior**: Motor temperatures, vibration patterns, wear simulation
- **Control Logic**: PID control for chemical dosing, differential pressure backwash triggers
- **Modular Design**: Component templates allow easy addition of new treatment processes
- **Configuration Management**: YAML-based site definitions and module templates

### Production Edge Gateway
- **PLC Protocol Support**: Modbus TCP, OPC UA, S7 Communication, EtherNet/IP
- **Real Tag Mapping**: Map actual PLC memory addresses to standardized data model
- **Data Quality**: Sensor range validation, change rate limiting, communication error handling
- **Edge Computing**: Local calculations, alarms, store-and-forward for network outages
- **Security**: TLS encryption, certificate authentication, network access control
- **Industrial Standards**: Production-grade reliability, automatic reconnection, error recovery

### Architecture Separation
- **Simulator**: Use for PoC validation, development, training, and demonstrations
- **Edge Gateway**: Use for production deployment to real water treatment plants
- **Independent Development**: Teams can work on platform features using simulator while edge team develops PLC connectivity
- Use the virtualenv for python: pyenv activate hydros