#!/usr/bin/env python3
"""
Simple test to verify Modbus server data updates
"""

import time
import logging
from protocol_servers import ModbusTCPServer, ProtocolServerConfig, ProtocolType

# Enable logging
logging.basicConfig(level=logging.INFO)

def main():
    print("=== Simple Modbus Server Test ===")
    
    # Create server
    config = ProtocolServerConfig(
        protocol=ProtocolType.MODBUS_TCP,
        host="0.0.0.0",
        port=5020,
        device_id=1
    )
    
    server = ModbusTCPServer(config)
    print("✓ Server created")
    
    # Start server
    server.start()
    print("✓ Server started")
    
    # Wait for startup
    time.sleep(2)
    
    # Update data
    test_data = {
        "DB1.DBW100": 456.78
    }
    
    print(f"Updating data: {test_data}")
    server.update_data(test_data)
    print("✓ Data update called")
    
    print("Server running. Test with Modbus client...")
    time.sleep(10)
    
    server.stop()
    print("✓ Server stopped")

if __name__ == "__main__":
    main()