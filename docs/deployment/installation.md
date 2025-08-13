# Installation Guide

## System Requirements

### Hardware Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 10GB disk space
- **Recommended**: 4+ CPU cores, 8GB+ RAM, 20GB+ disk space
- **Network**: Ethernet connectivity for protocol communication

### Software Requirements
- **Operating System**: Linux (Ubuntu 20.04+, RHEL 8+, CentOS 8+)
- **Python**: 3.11 or higher (tested with 3.13)
- **Docker**: 20.10+ (for containerized deployment)
- **Git**: For source code management

## Installation Methods

### Method 1: Direct Python Installation

#### 1. Clone Repository
```bash
git clone https://github.com/vitorbabo/hydros.git
cd hydros
```

#### 2. Set Up Python Environment
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

#### 3. Install Core Dependencies
```bash
# Install all required packages
pip install -r requirements.txt

# Or install manually:
pip install pymodbus asyncio-mqtt pyyaml numpy scipy
```

#### 4. Install Edge Gateway Dependencies
```bash
pip install -r edge-gateway/requirements.txt
```

#### 5. Install Simulation Dependencies
```bash
pip install -r plc-sim/requirements.txt
```

#### 6. Verify Installation
```bash
# Test core system
cd core
python -c "from hydros_system import HydrosSystem; print('Core system installed successfully')"

# Test simulation
cd ../plc-sim
python -c "import simulator; print('Simulation system installed successfully')"
```

### Method 2: Docker Installation

#### 1. Clone Repository
```bash
git clone https://github.com/vitorbabo/hydros.git
cd hydros
```

#### 2. Build and Start Services
```bash
# Build all services
docker-compose build

# Start core services
docker-compose up -d mosquitto

# Start simulation and dashboard
docker-compose up -d plc-sim dashboard
```

#### 3. Verify Services
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs plc-sim
docker-compose logs dashboard
```

### Method 3: Development Installation

#### 1. Clone Repository with Development Branch
```bash
git clone https://github.com/vitorbabo/hydros.git
cd hydros
git checkout develop  # or your development branch
```

#### 2. Install in Development Mode
```bash
# Create development environment
python3 -m venv dev-env
source dev-env/bin/activate

# Install in editable mode
pip install -e .

# Install development dependencies
pip install pytest black flake8 mypy pre-commit
```

#### 3. Set Up Pre-commit Hooks
```bash
pre-commit install
```

## Configuration

### 1. Basic Configuration

#### Plant Configuration
```bash
# Copy example configuration
cp core/config/plant_config.yaml.example core/config/plant_config.yaml

# Edit configuration for your plant
nano core/config/plant_config.yaml
```

#### Protocol Configuration
```bash
# Configure Modbus mappings
cp core/config/modbus_mappings.yaml.example core/config/modbus_mappings.yaml

# Edit mappings for your devices
nano core/config/modbus_mappings.yaml
```

### 2. Network Configuration

#### Modbus TCP Settings
```yaml
# In core/config/protocols.yaml
modbus_tcp:
  host: "0.0.0.0"
  port: 5020
  unit_id: 1
```

#### MQTT Settings
```yaml
# In core/config/mqtt.yaml
mqtt:
  broker: "localhost"
  port: 1883
  username: ""
  password: ""
```

### 3. Simulation Configuration

#### Component Configuration
```bash
# Edit simulation components
nano plc-sim/wtp_config.yaml
```

#### Protocol Server Settings
```bash
# Configure protocol servers
nano plc-sim/servers/config.yaml
```

## Service Configuration

### 1. Systemd Service (Linux)

#### Create Service File
```bash
sudo nano /etc/systemd/system/hydros.service
```

```ini
[Unit]
Description=Hydros Water Treatment Plant System
After=network.target

[Service]
Type=simple
User=hydros
WorkingDirectory=/opt/hydros
ExecStart=/opt/hydros/venv/bin/python core/hydros_system.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable hydros
sudo systemctl start hydros
```

### 2. Docker Service

#### Production Docker Compose
```yaml
version: '3.8'
services:
  hydros-core:
    build: ./core
    restart: always
    ports:
      - "5020:5020"
    volumes:
      - ./core/config:/app/config
    environment:
      - MODE=gateway
      
  mosquitto:
    image: eclipse-mosquitto:2
    restart: always
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf
```

## Verification

### 1. System Health Check

#### Check Core System
```bash
# Run system health check
python core/hydros_system.py --health-check

# Expected output:
# ✅ Core system: OK
# ✅ Configuration: OK  
# ✅ Protocols: OK
# ✅ Components: OK
```

#### Check Protocol Connectivity
```bash
# Test Modbus connectivity
python core/protocols/test_modbus.py

# Test MQTT connectivity  
python core/protocols/test_mqtt.py
```

### 2. Integration Testing

#### SCADA Integration Test
```bash
# Test with external SCADA system
python tests/integration/test_scada_integration.py
```

#### Protocol Compliance Test
```bash
# Test protocol compliance
python tests/integration/test_protocol_compliance.py
```

## Troubleshooting

### Common Issues

#### Permission Errors
```bash
# Fix permissions
sudo chown -R $USER:$USER /opt/hydros
chmod +x core/hydros_system.py
```

#### Port Conflicts
```bash
# Check port usage
sudo netstat -tulpn | grep :5020

# Kill conflicting process
sudo kill -9 <PID>
```

#### Python Version Issues
```bash
# Check Python version
python3 --version

# Install specific Python version (Ubuntu)
sudo apt update
sudo apt install python3.11 python3.11-venv
```

#### Missing Dependencies
```bash
# Reinstall all dependencies
pip install --force-reinstall -r requirements.txt
```

### Log Locations

- **System Logs**: `/var/log/hydros/`
- **Application Logs**: `./logs/`
- **Docker Logs**: `docker-compose logs <service>`

### Support

- **Documentation**: [docs/README.md](../README.md)
- **Issues**: [GitHub Issues](https://github.com/vitorbabo/hydros/issues)
- **Community**: [GitHub Discussions](https://github.com/vitorbabo/hydros/discussions)

---

**Next Steps**: After installation, see [Configuration Guide](configuration.md) for detailed configuration options.
