# Modbus TCP Server for WTP Simulator

A clean, single-file implementation of a Modbus TCP server for the Water Treatment Plant (WTP) simulator.

## Overview

The Modbus TCP server allows the edge gateway to connect using the Modbus protocol to read simulated WTP data. This enables testing and development of industrial IoT applications with realistic protocol interfaces.

## Features

- **Modbus TCP Server**: Uses pymodbus 3.11.1 async server API
- **WTP Data Mapping**: Semantic mapping from DB tags to Modbus addresses
- **Real-time Updates**: Dynamic data updates
- **Device Identification**: Proper Modbus device identification
- **Holding Registers**: For WTP parameters (flow, pressure, temperature, etc.)
- **Coils**: For boolean values (pump status, alarms, etc.)

## Architecture

```
servers/
├── __init__.py          # Package exports
├── modbus_server.py     # Complete Modbus TCP server implementation
├── opcua_server.py      # OPC UA server (optional)
├── manager.py           # Server management (optional)
├── base.py              # Base classes (optional)
└── README.md           # This file
```

## Usage

### Basic Usage

```python
from servers import ModbusTCPServer

# Create server
server = ModbusTCPServer(host="0.0.0.0", port=5020, device_id=1)

# Start server
server.start()

# Update data
server.update_data({
    "DB1.DBW100": 123.45,  # Raw water level
    "DB1.DBW102": 678.90,  # Raw water flow
    "DB2.DBX100.0": True,  # Pump status
})

# Stop server
server.stop()
```

### WTP Data Mapping

The server maps semantic DB tags to Modbus addresses:

#### Holding Registers (4x)
- `DB1.DBW100` → Register 100 (Raw water level)
- `DB1.DBW102` → Register 102 (Raw water flow)
- `DB1.DBW104` → Register 104 (Raw water turbidity)
- `DB1.DBW106` → Register 106 (Raw water pH)
- `DB1.DBW108` → Register 108 (Raw water temperature)
- `DB2.DBW100` → Register 200 (Pump flow)
- `DB2.DBW102` → Register 202 (Pump pressure)
- `DB2.DBW104` → Register 204 (Motor current)
- `DB2.DBW106` → Register 206 (Motor temperature)
- `DB2.DBW108` → Register 208 (Vibration)
- `DB4.DBW100` → Register 300 (Chemical tank level)
- `DB4.DBW102` → Register 302 (Chemical dose rate)
- `DB6.DBW100` → Register 600 (Filter differential pressure)
- `DB6.DBW102` → Register 602 (Effluent turbidity)
- `DB7.DBW100` → Register 700 (Chlorine residual)
- `DB7.DBW102` → Register 702 (Chlorine dose rate)
- `DB9.DBW100` → Register 900 (Storage tank level)
- `DB9.DBW102` → Register 902 (Tank chlorine residual)

#### Coils (0x)
- `DB2.DBX100.0` → Coil 100 (Pump run status)

## Testing

Run the built-in test to verify functionality:

```bash
cd plc-sim/servers
python modbus_server.py
```

Or test from the parent directory:

```bash
cd plc-sim
python -m servers.modbus_server
```

## Dependencies

- **pymodbus**: For Modbus TCP server
- **aiohttp**: Required by pymodbus

Install with:
```bash
pip install pymodbus aiohttp
```

## Configuration

The server can be configured with:

- **host**: Server host address (default: "0.0.0.0")
- **port**: Server port (default: 5020)
- **device_id**: Device identifier (default: 1)

## Data Format

- **Float values**: Scaled by 100 to preserve 2 decimal places
- **Boolean values**: Stored as coils (0x addresses)
- **Integer values**: Stored directly in registers

## Example Client Usage

```python
from pymodbus.client import AsyncModbusTcpClient
from pymodbus import FramerType
import asyncio

async def read_wtp_data():
    client = AsyncModbusTcpClient("localhost", port=5020, framer=FramerType.SOCKET)
    await client.connect()
    
    if client.connected:
        # Read raw water level
        result = await client.read_holding_registers(100, count=1, device_id=1)
        if not result.isError():
            raw_value = result.registers[0]
            level = raw_value / 100.0  # Convert back to float
            print(f"Raw water level: {level} m")
        
        # Read pump status
        result = await client.read_coils(100, count=1, device_id=1)
        if not result.isError():
            pump_running = result.bits[0]
            print(f"Pump running: {pump_running}")
        
        client.close()

# Run client
asyncio.run(read_wtp_data())
```

## Troubleshooting

### Initial Values Not Reading
There's a known issue with initial values not being read correctly. This is due to threading issues with the datastore context. The server accepts connections and updates work, but initial values may show as zero.

### Connection Issues
- Ensure port 5020 is not in use by other applications
- Check firewall settings
- Verify client configuration matches server settings

## Future Enhancements

- Fix initial values threading issue
- Add configuration file support
- Add metrics and monitoring
- Add security features (TLS, authentication)
- Support for additional protocols (S7, EtherNet/IP)
