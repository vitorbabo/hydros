# Hydros Documentation

Welcome to the Hydros unified water treatment plant system documentation.

## 📚 Documentation Structure

### Getting Started
- **[Quick Start Guide](../README.md)** - Main project overview and quick start
- **[Installation Guide](deployment/installation.md)** - Detailed installation instructions
- **[Configuration Guide](deployment/configuration.md)** - System configuration reference

### Architecture
- **[System Architecture](architecture/system-overview.md)** - High-level system design
- **[Core Components](architecture/core-components.md)** - Detailed component documentation
- **[Unified Architecture](architecture/unified-architecture.md)** - New unified architecture details
- **[Legacy Architecture](architecture/legacy-poc.md)** - Original PoC architecture
- **[Production Architecture](architecture/production-architecture.md)** - Production deployment design

### API Documentation
- **[Core API](api/core-api.md)** - Plant model and component APIs
- **[Protocol API](api/protocol-api.md)** - Protocol handler APIs
- **[Simulation API](api/simulation-api.md)** - Simulation engine APIs
- **[Gateway API](api/gateway-api.md)** - Edge gateway APIs

### Protocol Integration
- **[Modbus TCP](protocols/modbus.md)** - Modbus TCP implementation guide
- **[OPC UA](protocols/opcua.md)** - OPC UA integration (planned)
- **[Siemens S7](protocols/s7.md)** - S7 protocol support (planned)
- **[MQTT](protocols/mqtt.md)** - MQTT integration guide

### Deployment
- **[Development Setup](deployment/development.md)** - Development environment setup
- **[Production Deployment](deployment/production.md)** - Production deployment guide
- **[Docker Deployment](deployment/docker.md)** - Container-based deployment
- **[Monitoring](deployment/monitoring.md)** - System monitoring and diagnostics

### Development
- **[Contributing](development/contributing.md)** - How to contribute to the project
- **[Testing](development/testing.md)** - Testing guidelines and procedures
- **[Extending](development/extending.md)** - Adding new components and protocols
- **[Troubleshooting](development/troubleshooting.md)** - Common issues and solutions

### Examples
- **[Simulation Examples](examples/simulation.md)** - Simulation usage examples
- **[Integration Examples](examples/integration.md)** - SCADA integration examples
- **[Custom Components](examples/custom-components.md)** - Creating custom components

## 🔗 Quick Links

| Topic | Description | Link |
|-------|-------------|------|
| **Getting Started** | New to Hydros? Start here | [Quick Start](../README.md) |
| **System Overview** | Understand the architecture | [Architecture](architecture/system-overview.md) |
| **Installation** | Set up your environment | [Installation](deployment/installation.md) |
| **API Reference** | Complete API documentation | [API Docs](api/) |
| **Protocols** | Protocol integration guides | [Protocols](protocols/) |
| **Examples** | Code examples and tutorials | [Examples](examples/) |

## 📖 Documentation Navigation

```
docs/
├── README.md                    # This file - documentation index
├── architecture/                # System architecture documentation
│   ├── system-overview.md      # High-level system design
│   ├── core-components.md      # Core component details
│   ├── unified-architecture.md # New unified architecture
│   ├── legacy-poc.md          # Original PoC architecture
│   └── production-architecture.md # Production design
├── api/                        # API documentation
│   ├── core-api.md            # Plant model APIs
│   ├── protocol-api.md        # Protocol handler APIs
│   ├── simulation-api.md      # Simulation APIs
│   └── gateway-api.md         # Gateway APIs
├── protocols/                  # Protocol integration guides
│   ├── modbus.md             # Modbus TCP
│   ├── opcua.md              # OPC UA
│   ├── s7.md                 # Siemens S7
│   └── mqtt.md               # MQTT
├── deployment/                 # Deployment guides
│   ├── installation.md       # Installation guide
│   ├── configuration.md      # Configuration reference
│   ├── development.md        # Development setup
│   ├── production.md         # Production deployment
│   ├── docker.md            # Docker deployment
│   └── monitoring.md         # Monitoring guide
├── development/               # Development documentation
│   ├── contributing.md       # Contribution guidelines
│   ├── testing.md           # Testing procedures
│   ├── extending.md         # Extension guides
│   └── troubleshooting.md   # Troubleshooting
└── examples/                  # Examples and tutorials
    ├── simulation.md         # Simulation examples
    ├── integration.md        # Integration examples
    └── custom-components.md  # Custom component examples
```

## 📝 Documentation Status

| Section | Status | Last Updated |
|---------|--------|--------------|
| Architecture | ✅ Complete | 2025-08-13 |
| API Documentation | 🚧 In Progress | 2025-08-13 |
| Protocol Guides | 🚧 In Progress | 2025-08-13 |
| Deployment Guides | 🚧 In Progress | 2025-08-13 |
| Examples | 📋 Planned | - |

---

**Last Updated**: August 13, 2025  
**Version**: 2.0.0  
**Maintainer**: Hydros Team
