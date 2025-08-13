#!/usr/bin/env python3
"""
Test script to debug protocol server data flow
"""

import time
from protocol_servers import ProtocolServerManager, ProtocolServerConfig, ProtocolType

def test_protocol_servers():
    print("Starting protocol server test...")
    
    # Create protocol server manager
    manager = ProtocolServerManager()
    
    # Add Modbus server
    modbus_config = ProtocolServerConfig(
        protocol=ProtocolType.MODBUS_TCP,
        host="0.0.0.0",
        port=5020,
        device_id=1
    )
    
    print("Adding Modbus server...")
    if manager.add_server("modbus_test", modbus_config):
        print("✓ Modbus server added")
    else:
        print("✗ Failed to add Modbus server")
        return
    
    # Start servers
    print("Starting servers...")
    manager.start_all_servers()
    
    # Wait for servers to start
    time.sleep(2)
    
    # Test data update
    test_data = {
        "DB1.DBW100": 123.45,  # This should map to Modbus address 40100
        "DB1.DBW102": 678.90,  # This should map to Modbus address 40102
    }
    
    print(f"Updating servers with test data: {test_data}")
    manager.update_all_data(test_data)
    
    print("Servers running and data updated. Check with Modbus client...")
    print("Press Ctrl+C to stop")
    
    try:
        while True:
            time.sleep(5)
            print("Updating data again...")
            test_data["DB1.DBW100"] += 1.0
            manager.update_all_data(test_data)
    except KeyboardInterrupt:
        print("\nStopping servers...")
        manager.stop_all_servers()

if __name__ == "__main__":
    test_protocol_servers()