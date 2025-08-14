# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hydros is a unified water treatment plant (WTP) simulation and edge gateway system that provides industrial IoT capabilities for water treatment facilities. The system operates in multiple modes:

- **Simulation Mode**: Pure physics-based simulation for development and testing
- **Gateway Mode**: Production edge gateway for real PLC data collection

## Architecture

The system follows a modular architecture with clear separation of concerns:

```
hydros/
├── core/                    # Core system components
│   ├── plant_model.py      # Central digital twin managing component states
│   ├── component_factory.py# Factory for creating plant components
│   ├── wtp_components.py   # Water treatment plant component definitions
│   ├── protocol_manager.py # Dynamic protocol management
│   └── address_allocator.py# Dynamic address allocation for protocols
├── simulation/             # Physics-based simulation engine
│   ├── simulator.py        # Main simulation orchestration
│   ├── components.py       # Simulated component wrappers
│   └── process_models.py   # Physical process simulation models
├── gateway/                # Edge gateway for real PLC communication
│   ├── edge_gateway.py     # Production edge gateway with MQTT publishing
│   ├── plc_readers.py      # Async PLC communication handlers
│   └── data_mapper.py      # Data transformation utilities
├── protocols/              # Protocol abstraction layer
│   ├── modbus_handler.py   # Unified async Modbus implementation
│   └── protocol_registry.py# Protocol registration system
└── hydros_system.py        # Main unified entry point
```

## Key Concepts

### Unified Parameter ID Format
The system uses a consistent `site.component.parameter` format throughout:
- PlantModel: `wtp-porto-01.raw_intake.level`
- Modbus mappings: Same format for seamless integration
- MQTT topics: `wtp/wtp-porto-01/raw_intake/level/observation`

### Digital Twin Architecture
The PlantModel serves as the central digital twin, managing:
- Component registry and metadata
- Real-time parameter values
- Component relationships and state synchronization
- Lifecycle management across simulation and gateway modes

### Dynamic Address Allocation
The address_allocator.py automatically generates protocol-specific mappings:
- Eliminates hardcoded addresses
- Supports multiple protocols from single plant configuration
- Generates Modbus, OPC UA, and S7 address mappings

## Common Development Commands

### Generate Address Mappings
**IMPORTANT**: Always run this after modifying plant configuration:
```bash
cd hydros/core
python address_allocator.py
```
This generates the required mapping files that both simulation and gateway modes depend on.

### Running the System

#### Simulation Mode (Development)
```bash
# Start simulation with Modbus TCP server on port 5020
python hydros/hydros_system.py --mode simulation

# With debug logging
python hydros/hydros_system.py --mode simulation --log-level DEBUG
```

#### Gateway Mode (Production)
```bash
# Connect to real PLCs and publish to MQTT
python hydros/hydros_system.py
```

### Docker Development

#### Full Stack Development
```bash
# Start complete stack (Hydros + MQTT + InfluxDB + Dashboard)
docker compose up -d --build

# View system logs
docker compose logs -f hydros-system

# Monitor MQTT data
docker compose logs -f telegraf
```

#### Environment Variables
Key environment variables for Docker deployment:
- `HYDROS_MODE`: `simulation`, `normal` (default: `normal`)
- `LOG_LEVEL`: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`)
- `SITE_ID`: Plant site identifier (default: `wtp-porto-01`)
- `PLC_HOST`: PLC IP address for gateway mode (default: `localhost`)
- `MQTT_HOST`: MQTT broker host (default: `localhost`)

### Dashboard Development

The dashboard is a React 18 application with TypeScript providing a modern SCADA-style interface.

**Key Technologies:**
- React 18 with TypeScript and Vite
- ReactFlow v12.8.3 (@xyflow/react) for interactive plant diagrams
- Tailwind CSS for industrial design system
- Zustand for state management
- MQTT over WebSocket for real-time data

**Architecture:**
- `src/views/PlantLayout.tsx` - Interactive plant diagram with ReactFlow v12
- `src/store/plantLayoutStore.ts` - Plant layout state with real-time telemetry integration
- `src/store/telemetryStore.ts` - Dynamic telemetry data with automatic asset grouping
- `src/components/plant/PlantModuleNode.tsx` - Custom industrial module nodes
- `src/components/plant/NodePropertiesPanel.tsx` - Detailed module properties panel

**Development Commands:**
```bash
cd dashboard
npm ci                    # Install dependencies
npm run dev              # Start development server (port 5173)
npm run build            # Build for production
npm run preview          # Preview production build
```

**Features:**
- Automatic plant layout generation based on available MQTT assets
- Real-time telemetry data integration with proper value scaling (÷100 Modbus correction)
- Interactive drag-and-drop configuration mode
- Dynamic asset grouping and filtering
- Comprehensive sensor/actuator monitoring with status indicators

## Configuration Management

### Plant Configuration
Edit `hydros/config/plant_config.yaml` to define:
- Site configurations and plant layouts
- Module templates (intake, pumps, filters, etc.)
- Component relationships and parameters

### Protocol Configuration
Edit `hydros/config/protocol_config.yaml` for:
- Protocol server settings (Modbus TCP, OPC UA)
- PLC client connections
- Communication parameters

### Generated Mappings
The address allocator generates these files automatically:
- `wtp-porto-01_modbus_mapping.json` - Modbus TCP address mappings
- `wtp-porto-01_opcua_mapping.json` - OPC UA node mappings
- `wtp-porto-01_edge_gateway_config.yaml` - Gateway configuration
- `wtp-porto-01_unified_mapping.json` - Complete mapping reference

## Development Workflow

1. **Modify Plant Configuration**: Update `plant_config.yaml` for new components
2. **Generate Mappings**: Run `python hydros/core/address_allocator.py`
3. **Test in Simulation**: Start with `--mode simulation`
4. **Validate Components**: Check component creation and parameter updates
5. **Deploy**: Use Docker Compose for complete stack deployment

## Protocol Support

### Modbus TCP ✅
- Full async read/write support
- Server mode for simulation (port 5020)
- Client mode for PLC connections
- Dynamic address allocation

### MQTT ✅
- Real-time data publishing
- Standardized topic structure: `wtp/{site}/{asset}/{measurement}/observation`
- JSON observation format with metadata
- Quality indicators and sequence numbers

### OPC UA & S7 🚧
- Framework in place for future implementation
- Address allocation already supports these protocols

## Testing and Validation

### Manual Testing
```bash
# Monitor MQTT data
mosquitto_sub -h localhost -t "wtp/+/+/+/observation"

# Check system status via logs
tail -f hydros/hydros.log
```

### Configuration Validation
The system validates configuration files at startup:
- Missing required files will cause startup failure
- Invalid YAML/JSON will be logged with specific error messages

## Common Issues and Solutions

### Configuration Files Missing
**Error**: "Missing configuration files"
**Solution**: Run address allocator to generate missing mapping files

### Port Conflicts
**Error**: "Port already in use" (5020 for Modbus)
**Solution**: Check for existing Modbus servers or change port in configuration

### MQTT Connection Issues
**Error**: Gateway fails to publish to MQTT
**Solution**: Verify MQTT broker is running and check connection parameters

### Component Registration Failures
**Error**: Components not appearing in PlantModel
**Solution**: Check plant_config.yaml syntax and component factory templates

## Key File References

- Main entry point: `hydros/hydros_system.py:342` (main function)
- Plant model core: `hydros/core/plant_model.py:46` (PlantModel class)
- Address generation: `hydros/core/address_allocator.py:459` (generate_mapping_files)
- Protocol registry: `hydros/protocols/protocol_registry.py`
- Simulation engine: `hydros/simulation/simulator.py`
- Edge gateway: `hydros/gateway/edge_gateway.py`

## Services and Ports

- **Hydros Modbus Server**: localhost:5020 (simulation mode)
- **MQTT Broker**: localhost:1883 (WebSocket: 9001)
- **InfluxDB**: localhost:8086
- **Dashboard**: localhost:5173 (development) / localhost:4173 (preview)

The system uses environment variable substitution in configuration files, allowing flexible deployment across different environments without code changes.