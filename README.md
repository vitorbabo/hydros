# Hydros - Unified Water Treatment Plant System

[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/downloads/)
[![Industrial IoT](https://img.shields.io/badge/Industrial-IoT-green.svg)](https://www.industrialiot.org/)
[![Modbus](https://img.shields.io/badge/Protocol-Modbus%20TCP-orange.svg)](https://modbus.org/)

Unified architecture for water treatment plant simulation and edge gateway functionality. Supports both development simulation and production data collection from real PLCs.

## 🏗️ Architecture Overview

```
hydros/
├── config/                          # Configuration management
│   ├── plant_config.yaml           # Plant definitions and site configurations
│   ├── protocol_config.yaml        # Protocol server/client settings
│   └── wtp-porto-01_*              # Auto-generated address mappings
├── core/                           # Core system components
│   ├── plant_model.py             # Unified plant model (digital twin)
│   ├── component_factory.py       # Factory for creating plant components
│   ├── protocol_manager.py        # Dynamic protocol management
│   ├── wtp_components.py          # WTP component definitions
│   └── address_allocator.py       # Dynamic address allocation
├── simulation/                    # Simulation engine
│   ├── simulator.py              # Simulation engine and orchestration
│   ├── components.py             # Simulated component wrappers
│   └── process_models.py         # Physical process simulation models
├── gateway/                       # Edge gateway functionality
│   ├── edge_gateway.py           # Production edge gateway
│   ├── plc_readers.py            # Real PLC communication
│   └── data_mapper.py            # Data transformation utilities
├── protocols/                     # Protocol handlers
│   ├── modbus_handler.py         # Unified Modbus implementation
│   ├── protocol_registry.py      # Protocol registration system
│   └── __init__.py               # Protocol package initialization
├── hydros_system.py              # Main unified entry point
└── README.md                     # Core system documentation
```

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Docker & Docker Compose (for containerized deployment)
- Industrial network access (for production mode)
- MQTT broker (Mosquitto recommended)

### Installation
```bash
# Clone the repository
git clone https://github.com/vitorbabo/hydros.git
cd hydros

# Option 1: Docker (Recommended)
docker compose up -d --build

# Option 2: Local Python Installation
# Install dependencies
pip install -r requirements.txt

# Generate address mappings (first time)
cd hydros/core
python address_allocator.py
cd ../..
```

### Basic Usage

#### Simulation Mode (Development)
```bash
# Start pure simulation mode
python hydros/hydros_system.py --mode simulation

# Simulation with debug logging
python hydros/hydros_system.py --mode simulation --log-level DEBUG
```

#### Edge Gateway Mode (Production)
```bash
# Production data collection from real PLCs
python hydros/hydros_system.py
```

## 🎯 Operation Modes

### 1. **Simulation Mode**
- **Purpose**: Development, testing, demonstrations
- **Data Source**: Physics-based simulation models
- **Protocols**: Serves data via Modbus TCP (port 5020)
- **Use Case**: When no real PLCs are available

### 2. **Gateway Mode** 
- **Purpose**: Production data collection
- **Data Source**: Real PLCs (Modbus, OPC UA, S7)
- **Protocols**: Collects from PLCs, serves via standardized protocols
- **Use Case**: Industrial deployment

## 📊 Features

### ✅ **Dynamic Address Allocation**
- Automatic generation of protocol-specific mappings
- Eliminates hardcoded addresses completely
- Supports multiple protocols from single plant configuration
- Scalable for any plant size

### ✅ **Unified Plant Model (Digital Twin)**
- Central state management for all plant components
- Real-time parameter synchronization
- Component lifecycle management
- Comprehensive statistics and diagnostics

### ✅ **Unified Parameter ID Format**
- Consistent `site.component.parameter` format throughout system
- PlantModel uses: `wtp-porto-01.raw_intake.level`
- MQTT topics use: `wtp/wtp-porto-01/raw_intake/level/observation`
- No parameter ID conversion needed between components

### ✅ **MQTT Data Publishing**
- Standardized observation format with metadata
- Clean topic structure: `wtp/{site_id}/{asset_id}/{measurement}/observation`
- Real-time data streaming with sequence numbers
- JSON payload with quality indicators and timestamps

### ✅ **Protocol Abstraction**
- **Modbus TCP**: Full async client/server implementation ✅
- **MQTT**: Real-time data publishing ✅
- **OPC UA**: Framework ready 🚧
- **Siemens S7**: Framework ready 🚧
- Pluggable protocol registry system

### ✅ **Physics-Based Simulation**
- Realistic hydraulic and water quality models
- Equipment-specific behavior modeling
- Sensor noise and drift simulation
- Configurable process parameters

## 🔧 Configuration

### Plant Configuration (`hydros/config/plant_config.yaml`)
```yaml
site_configurations:
  wtp-porto-01:
    name: "Porto Municipal WTP"
    design_capacity: 50000  # m3/day
    modules:
      - raw_intake
      - intake_pump_1
      - coagulation_tank
      - clarifier_1
      - filter_bed_1
      - finished_water_tank
```

### Protocol Configuration (`hydros/config/protocol_config.yaml`)
```yaml
protocol_servers:
  modbus_tcp:
    enabled: true
    host: "0.0.0.0"
    port: 5020

protocol_clients:
  - plc_id: "primary_plc"
    protocol: "modbus"
    host: "192.168.1.100"
    port: 502
```

### Auto-Generated Mappings
Address mappings are automatically generated:
- `wtp-porto-01_modbus_mapping.json` - Modbus TCP mappings
- `wtp-porto-01_opcua_mapping.json` - OPC UA mappings  
- `wtp-porto-01_edge_gateway_config.yaml` - Gateway configuration

## 📈 Performance & Scalability

### **Tested Capabilities**
- **37+ parameters** with dynamic allocation
- **Real-time simulation** at 1-2 second intervals
- **Multiple protocol servers** simultaneously
- **~100 concurrent connections** per protocol server

### **Resource Usage**
- **Memory**: ~50MB base + ~1MB per 100 parameters
- **CPU**: <5% on modern hardware for typical plants
- **Network**: Optimized for industrial network constraints

## 🛠 Development Workflow

1. **Define Plant Structure**
   ```bash
   # Edit plant configuration
   vim hydros/config/plant_config.yaml
   ```

2. **Generate Address Mappings**
   ```bash
   cd hydros/core
   python address_allocator.py
   ```

3. **Test in Simulation**
   ```bash
   python hydros/hydros_system.py --mode simulation
   ```

4. **Configure PLC Connections**
   ```bash
   # Edit protocol configuration for real PLCs
   vim hydros/config/protocol_config.yaml
   ```

5. **Deploy to Production**
   ```bash
   python hydros/hydros_system.py --mode gateway
   ```

## 🔌 Protocol Integration

### Modbus TCP Client Example
```python
from pymodbus.client import ModbusTcpClient

# Connect to Hydros simulation
client = ModbusTcpClient('localhost', port=5020)
client.connect()

# Read parameters (addresses auto-generated)
result = client.read_holding_registers(3000, 10)  # Raw intake levels
result = client.read_input_registers(3010, 5)     # Flow measurements

client.close()
```

### SCADA Integration
The system serves standard Modbus TCP, making it compatible with:
- **Wonderware InTouch**
- **Siemens WinCC**
- **Schneider Electric Citect**
- **GE iFIX**
- **Any Modbus-compatible SCADA**

### MQTT Data Streaming
Real-time data publishing with standardized format:
```bash
# Subscribe to all observations
mosquitto_sub -h localhost -t "wtp/+/+/+/observation"

# Subscribe to specific asset
mosquitto_sub -h localhost -t "wtp/wtp-porto-01/raw_intake/+/observation"

# Subscribe to specific measurement across all assets
mosquitto_sub -h localhost -t "wtp/+/+/level/observation"
```

**Example MQTT Message:**
```json
{
  "site_id": "wtp-porto-01",
  "asset_id": "raw_intake", 
  "sensor_id": "level-raw_intake",
  "measurement": "level",
  "ts": "2025-08-13T13:43:12.739650Z",
  "value": 1000.0,
  "unit": "m",
  "quality": "good",
  "raw_tag": "33001",
  "source": "modbus_tcp_plc",
  "seq": 46,
  "parameter_type": "sensor",
  "component_type": "sensor"
}
```

## 📊 Monitoring & Diagnostics

### Real-Time Monitoring
```bash
# System status
curl http://localhost:8080/api/status

# Parameter values  
curl http://localhost:8080/api/parameters

# Connection status
curl http://localhost:8080/api/connections
```

### Log Analysis
```bash
# View system logs
tail -f hydros/hydros.log

# Filter by component
grep "SimulationEngine" hydros/hydros.log

# Monitor protocol activity
grep "ModbusHandler" hydros/hydros.log

# Watch MQTT publishing
grep "mqtt_publishes" hydros/hydros.log
```

## 🧪 Testing & Validation

### Unit Tests
```bash
# Run component tests
python -m pytest tests/test_components.py

# Protocol handler tests
python -m pytest tests/test_protocols.py

# Integration tests
python -m pytest tests/test_integration.py
```

### Simulation Validation
```bash
# Test with mock PLC client
cd hydros/core
python test_modbus_readback.py

# Performance testing
python benchmark_simulation.py

# MQTT data verification
mosquitto_sub -h localhost -t "wtp/+/+/+/observation" -C 10
```

## 🐳 Docker Deployment

### Complete Stack with Dashboard
```bash
# Start the complete stack (Hydros + MQTT + InfluxDB + Dashboard)
docker compose up -d --build

# View logs
docker compose logs -f hydros-system

# Monitor MQTT data
docker compose logs -f | grep mqtt
```

### Development Mode
```bash
# Start in development mode with live code reloading
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Follow MQTT observations
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f mqtt-client
```

### Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
vim .env
```

**Services:**
- **Hydros System**: Unified simulation/gateway on `localhost:5020` (Modbus TCP)
- **Mosquitto**: MQTT `localhost:1883`, WebSocket `ws://localhost:9001`
- **InfluxDB**: http://localhost:8086 (org: hydros, bucket: wtp)
- **Dashboard**: http://localhost:5173

**Environment Variables:**
- `HYDROS_MODE`: `simulation`, `gateway`, or `hybrid` (default: `hybrid`)
- `LOG_LEVEL`: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`)
- `SITE_ID`: Plant site identifier (default: `wtp-porto-01`)
- `PLC_HOST`: PLC IP address for gateway mode (default: `localhost`)

## 🔧 Extending the System

### Adding New Components
```python
# 1. Implement component class
class NewTankComponent(WTPComponent):
    def update(self):
        # Component simulation logic
        pass
    
    def get_parameters(self):
        return {"level": self.level, "volume": self.volume}

# 2. Add to component factory template
# 3. Reference in plant configuration
```

### Adding New Protocols
```python
# 1. Implement BaseProtocolHandler interface
class S7Handler(BaseProtocolHandler):
    def connect(self): pass
    def read_parameter(self, param_id): pass
    def write_parameter(self, param_id, value): pass

# 2. Register with ProtocolRegistry
registry.register_protocol(ProtocolType.S7, S7Handler, [...])

# 3. Add address allocation support
```

## 🚨 Troubleshooting

### Common Issues

**Configuration not found**
```bash
# Ensure config files exist
ls -la core/config/
```

**Port conflicts**
```bash
# Check port availability
netstat -ln | grep 5020
```

**PLC connection failures**
```bash
# Test network connectivity
ping 192.168.1.100
telnet 192.168.1.100 502
```

**Missing dependencies**
```bash
# Install requirements
pip install -r requirements.txt
```

### Debug Mode
```bash
# Enable detailed logging
python hydros/hydros_system.py --mode simulation --log-level DEBUG

# Check specific component
grep "PlantModel" hydros/hydros.log

# Monitor MQTT publishing
mosquitto_sub -h localhost -t "wtp/+/+/+/observation"
```

## 📚 Documentation

- **[Core Architecture](hydros/README.md)** - Detailed technical documentation
- **[Configuration Guide](#-configuration)** - Plant and protocol configuration
- **[Operation Modes](#-operation-modes)** - Simulation, Gateway, and Hybrid modes
- **[MQTT Integration](#mqtt-data-streaming)** - Real-time data streaming guide
