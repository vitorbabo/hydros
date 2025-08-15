# Hydros - Multi-Site Water Treatment Plant IoT System

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)![Mosquitto](https://img.shields.io/badge/mosquitto-%233C5280.svg?style=for-the-badge&logo=eclipsemosquitto&logoColor=white)![InfluxDB](https://img.shields.io/badge/InfluxDB-22ADF6?style=for-the-badge&logo=InfluxDB&logoColor=white)

**Scalable multi-site architecture** for water treatment plant simulation and edge gateway functionality. Supports multiple plants with centralized templates, structured protocol clients, and dynamic site selection. Perfect for both development simulation and production data collection from real PLCs.


## 🏗️ Architecture Overview

```
backend/
├── config/                          # Multi-site configuration management
│   ├── sites/                      # Individual site configurations
│   │   ├── wtp-porto-01/
│   │   │   └── plant.yaml          # Porto plant configuration
│   │   └── wtp-regional-02/
│   │       └── plant.yaml          # Regional plant configuration
│   ├── templates/                  # Centralized templates
│   │   ├── modules.yaml            # Module templates (58 types)
│   │   └── parameters.yaml         # Parameter specifications (49+ types)
│   └── schemas/                    # JSON schema validation
│       ├── site_config_schema.json
│       ├── module_templates_schema.json
│       └── parameter_specifications_schema.json
├── core/                           # Core digital twin components
│   ├── digital_twin.py            # Central digital twin management
│   ├── plant_builder.py           # Factory for plant configurations
│   ├── plant_elements.py          # Core data structures (sensors, actuators)
│   ├── sensor_catalog.py          # Centralized parameter specifications
│   ├── protocol_mapper.py         # Protocol address mapping
│   └── config_validator.py        # Configuration validation system
├── simulation/                    # Physics-based simulation engine
│   ├── simulator.py              # Simulation orchestration
│   ├── components.py             # Simulated plant component wrappers
│   └── process_models.py         # Physical process simulation models
├── gateway/                       # Edge gateway for real PLCs
│   ├── edge_gateway.py           # Production data collection gateway
│   ├── plc_readers.py            # Async PLC communication handlers
│   └── data_mapper.py            # Data transformation utilities
├── protocols/                     # Industrial protocol handlers
│   ├── modbus_handler.py         # Unified async Modbus implementation
│   ├── protocol_registry.py      # Pluggable protocol system
│   └── __init__.py               # Protocol package initialization
├── main.py                        # Main unified system entry point
└── README.md                      # System documentation
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

# Docker compose (Recommended)
docker compose up -d --build
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

### ✅ **Multi-Site Architecture**
- Individual site configurations with centralized templates
- Dynamic site selection: `--site-id wtp-porto-01` or `--site-id wtp-regional-02`
- Scalable to unlimited sites without code changes
- Site-specific protocol client configurations

### ✅ **Dynamic Protocol Mapping**
- Automatic protocol address allocation per site
- Eliminates hardcoded addresses completely  
- Supports multiple protocols per site (Modbus, OPC UA, S7)
- Scalable for any plant size (9-20+ modules tested)
- Centralized sensor catalog with 49+ parameter types

### ✅ **Digital Twin Architecture**
- DigitalTwin class manages all plant components and states
- PlantComponent instances for physical equipment (pumps, filters, tanks)
- PlantParameter definitions with protocol addressing
- ComponentRole classification (sensor, actuator, status)
- Real-time parameter synchronization and lifecycle management

### ✅ **Unified Parameter ID Format**
- Consistent `site.component.parameter` format throughout system
- DigitalTwin uses: `wtp-porto-01.raw_intake.level`
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
- **OPC UA**: Protocol mapper support ready 🚧
- **Siemens S7**: Protocol mapper support ready 🚧
- Pluggable protocol registry system with ProtocolMapper

### ✅ **Physics-Based Simulation**
- SimulatedPlantComponent wrappers for realistic behavior
- Hydraulic and water quality process models
- SensorType-specific noise and drift simulation
- Configurable process parameters with ComponentRole classification

## 🏗️ Core Architecture Components

The Hydros system is built around intuitive, domain-specific components:

### **Digital Twin Core**
- **DigitalTwin**: Central orchestrator managing all plant components and real-time data
- **PlantComponent**: Physical equipment instances (pumps, filters, tanks, sensors)
- **PlantParameter**: Unified parameter definitions with protocol addressing
- **ComponentInfo**: Component metadata and operational information

### **Plant Configuration System**
- **PlantBuilder**: Factory for constructing plant configurations from templates
- **SensorCatalog**: Centralized library of 49+ parameter specifications
- **ProtocolMapper**: Dynamic address allocation for Modbus, OPC UA, S7 protocols
- **ConfigValidator**: JSON schema validation for all configuration files

### **Data Type System**
- **ComponentRole**: Parameter classification (SENSOR, ACTUATOR, STATUS)
- **SensorType**: Water treatment measurements (turbidity, pH, flow_rate, etc.)
- **ProtocolDataType**: Industrial protocol data types (BOOL, REAL, INT, etc.)
- **OperationalState**: Component states (active, inactive, fault, maintenance)

This architecture provides a clear, maintainable structure that reflects real water treatment plant concepts while enabling advanced digital twin capabilities.

## 🔧 Multi-Site Configuration

### Site Configuration (`backend/config/sites/wtp-porto-01/plant.yaml`)
```yaml
site_info:
  site_id: wtp-porto-01
  name: "Porto Municipal WTP"
  design_capacity: 50000  # m3/day
  location:
    region: "Porto"
    coordinates: [41.1579, -8.6291]

# Modules reference centralized templates
modules:
  - raw_intake
  - intake_pump_1
  - coagulation_tank
  - clarifier_1
  - filter_bed_1
  - finished_water_tank

# Site-specific protocol client definitions
protocol_clients:
  - client_id: main_plc
    protocol: modbus_tcp
    connection:
      host: "${PLC_HOST:192.168.1.100}"
      port: "${PLC_PORT:502}"
      unit_id: 1
    modules_assigned:
      - raw_intake
      - intake_pump_1
      - coagulation_tank
```

### Centralized Templates (`backend/config/templates/modules.yaml`)
```yaml
module_templates:
  raw_intake:
    type: "intake"
    description: "Raw water intake with quality monitoring"
    required_sensors:
      - level
      - flow_rate
      - turbidity
      - ph
      - temperature
    optional_sensors:
      - dissolved_oxygen
      - chlorophyll_a
```

### Auto-Generated Protocol Mappings (Per Site)
Protocol addresses are automatically generated by ProtocolMapper for each site:
- `mappings/modbus.json` - Modbus TCP mappings (68 parameters)
- `mappings/opcua.json` - OPC UA node mappings
- `mappings/s7.json` - Siemens S7 address mappings
- `edge_gateway_config.yaml` - Gateway configuration with protocol clients

## 📈 Performance & Scalability

### **Tested Capabilities**
- **Multi-site support**: Porto (68 parameters), Regional (106+ parameters)
- **Real-time simulation** at 1-2 second intervals with DigitalTwin
- **Multiple protocol clients** per site (up to 5 tested)
- **~100 concurrent connections** per protocol server
- **Centralized templates**: 58 module types, 49+ parameter specifications
- **Configuration validation**: JSON schema validation for all configs

### **Resource Usage**
- **Memory**: ~50MB base + ~1MB per 100 parameters
- **CPU**: <5% on modern hardware for typical plants
- **Network**: Optimized for industrial network constraints

## 🛠 Multi-Site Development Workflow

1. **Create New Site Configuration**
   ```bash
   # Create site directory
   mkdir backend/config/sites/wtp-new-site
   
   # Copy template and customize
   cp backend/config/sites/wtp-porto-01/plant.yaml backend/config/sites/wtp-new-site/
   vim backend/config/sites/wtp-new-site/plant.yaml
   ```

2. **Generate Protocol Mappings**
   ```bash
   cd backend
   # Generate for specific site using protocol mapper
   python -m core.protocol_mapper wtp-new-site
   
   # Or use the main system with --init flag
   python main.py --site-id wtp-new-site --init
   ```

3. **Test in Simulation**
   ```bash
   python backend/main.py --mode simulation --site-id wtp-new-site
   ```

4. **Configure Protocol Clients** 
   ```bash
   # Protocol clients are configured per site in plant.yaml
   vim backend/config/sites/wtp-new-site/plant.yaml
   ```

5. **Deploy to Production**
   ```bash
   python backend/main.py --site-id wtp-new-site
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

### Log Analysis
```bash
# View system logs
tail -f backend/hydros.log

# Filter by component
grep "SimulationEngine" backend/hydros.log

# Monitor protocol activity
grep "ModbusHandler" backend/hydros.log

# Watch MQTT publishing
grep "mqtt_publishes" backend/hydros.log
```

### Simulation Validation
```bash
# Test with mock PLC client
cd backend/core
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
- **React UI**: http://localhost:5173

**Environment Variables:**
- `HYDROS_MODE`: `simulation`, `normal` (default: `normal`)
- `LOG_LEVEL`: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`) 
- `SITE_ID`: Plant site identifier (default: `wtp-porto-01`)
- `PLC_HOST`: PLC IP address for gateway mode (default: `localhost`)
- Site-specific variables: `MAIN_PLC_HOST`, `CHEM_PLC_HOST`, etc.

## 🔧 Extending the System

### Adding New Module Templates
```yaml
# 1. Add to backend/config/templates/modules.yaml
module_templates:
  new_tank_type:
    type: "storage"
    description: "New tank component"
    required_sensors:
      - level
      - volume
      - temperature
    actuators:
      - inlet_valve
      - outlet_valve

# 2. Add parameters to backend/config/templates/parameters.yaml
parameter_specifications:
  volume:
    measurement_type: "volume"
    unit: "m³"
    data_type: "REAL"
    ranges:
      normal: [0.0, 1000.0]

# 3. Reference in any site configuration
modules:
  - new_tank_type
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

**Site configuration not found**
```bash
# Check site directory structure
ls -la backend/config/sites/
ls -la backend/config/sites/wtp-porto-01/

# Verify templates exist
ls -la backend/config/templates/
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

**Configuration validation failures**
```bash
# Run configuration validation manually
python -c "from core.config_validator import ConfigValidator; ConfigValidator().validate_all_configurations()"

# Check schema validation
python main.py --init --log-level DEBUG
```

**Missing dependencies**
```bash
# Install requirements
pip install -r requirements.txt
```

### Debug Mode
```bash
# Enable detailed logging
python backend/main.py --mode simulation --log-level DEBUG

# Check specific component
grep "DigitalTwin" backend/hydros.log

# Monitor MQTT publishing
mosquitto_sub -h localhost -t "wtp/+/+/+/observation"
```

## 📚 Documentation

- **[Core Architecture](backend/README.md)** - Detailed technical documentation
- **[Configuration Guide](#-configuration)** - Plant and protocol configuration
- **[Operation Modes](#-operation-modes)** - Simulation, Gateway, and Hybrid modes
- **[MQTT Integration](#mqtt-data-streaming)** - Real-time data streaming guide
