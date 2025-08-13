# Production Architecture: Simulator vs Edge Gateway

## Overview

This document clarifies the separation between the **Simulator** (for PoC validation) and the **Edge Gateway** (for production deployment). This architectural separation ensures the system can scale from demonstration to real-world WTP deployment.

## Architecture Separation

### 🔧 **Simulator** (`/plc-sim/`)
**Purpose**: Validate the PoC platform capabilities and demonstrate comprehensive WTP monitoring

#### Role:
- **Demo Environment**: Showcase platform capabilities to stakeholders
- **Development Testing**: Validate dashboard, analytics, and data pipeline components
- **Training Data**: Generate realistic datasets for ML model development
- **Load Testing**: Simulate high-volume data scenarios for scalability testing

#### Components:
```
plc-sim/
├── simulator.py              # Main simulation runner
├── wtp_components.py         # Comprehensive WTP process simulation
├── component_factory.py      # Factory for different plant configurations
├── wtp_config.yaml          # Site templates and configurations
└── requirements.txt         # Python dependencies
```

#### Key Features:
- **Comprehensive Process Modeling**: 50+ parameters across 9 treatment stages
- **Realistic Process Interactions**: Upstream effects on downstream processes
- **Equipment Behavior Simulation**: Wear patterns, maintenance cycles, failures
- **Multiple Plant Configurations**: Small municipal to large regional facilities

---

### 🏭 **Edge Gateway** (`/edge-gateway/`)
**Purpose**: Production-ready system for connecting to real WTP PLCs and equipment

#### Role:
- **Real PLC Integration**: Connect to actual Siemens, Allen-Bradley, Schneider PLCs
- **Protocol Translation**: Support Modbus TCP, OPC UA, EtherNet/IP, S7 Communication
- **Data Normalization**: Transform raw PLC signals to standardized data model
- **Edge Computing**: Local analytics, alarms, store-and-forward capabilities

#### Components:
```
edge-gateway/
├── data_mapper.py           # Main edge gateway application
├── edge_config.yaml         # Production configuration for real PLCs
├── plc_readers/             # Protocol-specific PLC communication modules
│   ├── modbus_reader.py     # Modbus TCP implementation
│   ├── opcua_reader.py      # OPC UA implementation
│   └── s7_reader.py         # Siemens S7 implementation
└── requirements.txt         # Production dependencies
```

#### Key Features:
- **Multi-Protocol Support**: Modbus TCP, OPC UA, S7 Communication, EtherNet/IP
- **Production-Grade Reliability**: Automatic reconnection, error handling, data validation
- **Flexible Configuration**: YAML-based tag mapping for any PLC layout
- **Edge Analytics**: Local calculations, predictive maintenance, alarm processing
- **Security**: TLS encryption, certificate-based authentication, network restrictions

## Data Flow Comparison

### Simulator Data Flow
```
WTP Simulation Engine → Mock PLC Tags → MQTT Publisher → Cloud Platform
                    ↗
              Process Models
              Equipment Behavior
              Failure Simulation
```

### Production Data Flow  
```
Real PLC → Protocol Reader → Data Mapper → Quality Assessment → MQTT Publisher → Cloud Platform
         ↗                              ↗
    Modbus/OPC UA/S7              Range Validation
    Network Connection            Rate Limiting
    Industrial Ethernet          Store & Forward
```

## Configuration Comparison

### Simulator Configuration
```yaml
# Site template approach
site_configurations:
  wtp-porto-01:
    design_capacity: 50000
    modules: [intake, pumps, coagulation, filtration, disinfection]

# Component factory generates realistic parameters
module_templates:
  intake_pump:
    required_sensors: [flow_rate, pressure, motor_current, vibration]
    realistic_ranges: true
    process_interactions: true
```

### Production Configuration
```yaml
# Real PLC connection approach  
plcs:
  - connection_id: "main_plc"
    protocol: "s7comm"
    ip_address: "192.168.1.10"
    
# Actual tag mappings
tags:
  - tag_address: "DB1.DBW100"    # Real PLC memory address
    asset_id: "raw_intake"
    measurement: "level"
    scale_factor: 0.01           # Engineering unit conversion
    validation_range: [0.0, 5.0] # Real sensor limits
```

## Deployment Scenarios

### PoC/Demo Deployment
```bash
# Start simulator for demonstration
cd plc-sim/
SITE_ID=wtp-porto-01 python simulator.py

# OR larger plant simulation
SITE_ID=wtp-regional-02 python simulator.py
```
**Outputs**: 44-78 parameters, realistic process behavior, comprehensive WTP demonstration

### Production Deployment
```bash
# Deploy edge gateway on industrial hardware
cd edge-gateway/
EDGE_CONFIG=site-specific-config.yaml python data_mapper.py
```
**Outputs**: Real sensor data from actual PLCs, production-grade reliability, site-specific configuration

## Key Architectural Benefits

### 🎯 **Clear Separation of Concerns**
- **Simulator**: Focuses on realistic process modeling and comprehensive demonstration
- **Edge Gateway**: Focuses on industrial connectivity and production reliability

### 📈 **Scalable Development Path**
1. **Phase 1**: Develop and validate platform using comprehensive simulator
2. **Phase 2**: Test edge gateway with mock PLCs in lab environment  
3. **Phase 3**: Deploy edge gateway to real WTP with actual PLCs
4. **Phase 4**: Scale to multiple sites using standardized configurations

### 🔧 **Independent Development**
- **Platform Team**: Can develop analytics, dashboards, ML models using rich simulated data
- **Integration Team**: Can focus on PLC connectivity and edge reliability
- **Operations Team**: Gets production-ready system with proven capabilities

### 🏗️ **Flexible Deployment**
- **Demo/Training**: Use simulator for safe, comprehensive demonstrations
- **Development**: Use simulator for feature development and testing
- **Production**: Use edge gateway for real plant connectivity
- **Hybrid**: Run both for validation and comparison

## Technology Stack Comparison

### Simulator Stack
```python
# Simulation-focused dependencies
wtp_components.py     # Process simulation engine
component_factory.py  # Template-driven configuration
paho-mqtt            # MQTT publishing
pyyaml              # Configuration management
```

### Production Stack
```python
# Industrial connectivity dependencies  
opcua               # OPC UA client library
modbus_tk          # Modbus TCP communication
snap7              # Siemens S7 communication
pyopc              # OPC Classic support
cryptography       # TLS/SSL security
paho-mqtt          # MQTT publishing (same)
```

## Real-World Integration Examples

### Small Municipal Plant
```yaml
# edge_config.yaml for actual Porto plant
site_id: "wtp-porto-real"
plcs:
  - connection_id: "siemens_main"
    protocol: "s7comm" 
    ip_address: "10.1.50.10"    # Actual PLC IP
    
tags:
  - tag_address: "DB10.DBW0"   # Real memory location
    asset_id: "raw_intake_basin"
    sensor_id: "level-ultrasonic-001"
    measurement: "level"
    scale_factor: 0.01         # Convert cm to m
```

### Large Industrial Plant
```yaml
# Multi-PLC configuration
plcs:
  - connection_id: "intake_plc"
    protocol: "opcua"
    ip_address: "10.1.10.15"
  - connection_id: "treatment_plc" 
    protocol: "modbus_tcp"
    ip_address: "10.1.10.20"
  - connection_id: "distribution_plc"
    protocol: "s7comm"
    ip_address: "10.1.10.25"

# Hundreds of real tags mapped to standardized model
tags: [... 200+ actual sensor mappings ...]
```

## Migration Path

### From Simulator to Production

1. **Validate Platform**: Use simulator to prove dashboard and analytics capabilities
2. **Configure Real PLCs**: Map actual PLC tags to standardized data model  
3. **Deploy Edge Gateway**: Install on industrial PC at plant site
4. **Parallel Operation**: Run both simulator and edge gateway for validation
5. **Production Cutover**: Switch to live data from edge gateway
6. **Continuous Validation**: Keep simulator for testing new features

### Benefits of This Architecture

- **Risk Reduction**: Validate entire platform before touching production systems
- **Rapid Development**: Rich simulated data accelerates platform development
- **Flexible Testing**: Test edge gateway independently of platform development
- **Production Readiness**: Clear path from demo to production deployment
- **Operational Safety**: Separate systems ensure production plant safety

This architectural separation ensures the Hydros platform can demonstrate comprehensive capabilities while providing a clear path to production deployment at real water treatment facilities.