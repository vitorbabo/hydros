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
