#!/usr/bin/env python3
"""
Detailed debug of Modbus server internals
"""

import time
import logging
from pymodbus.client import ModbusTcpClient
from protocol_servers import ModbusTCPServer, ProtocolServerConfig, ProtocolType

# Enable detailed logging
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')

def main():
    print("=== Detailed Debug Modbus Server ===")
    
    config = ProtocolServerConfig(
        protocol=ProtocolType.MODBUS_TCP,
        host="0.0.0.0",
        port=5020,
        device_id=1
    )
    
    server = ModbusTCPServer(config)
    print("✓ Server created")
    
    # Let's manually test the address parsing
    print("\n=== Testing Address Parsing ===")
    test_addresses = ["40100", "40102"]
    for addr in test_addresses:
        try:
            register_type, parsed_addr = server._parse_modbus_address(addr)
            print(f"  {addr} -> type={register_type}, address={parsed_addr}")
        except Exception as e:
            print(f"  {addr} -> ERROR: {e}")
    
    # Test tag mapping
    print("\n=== Testing Tag Mapping ===")
    test_tags = ["DB1.DBW100", "DB1.DBW102"]
    for tag in test_tags:
        mapped = server.tag_address_map.get(tag, "NOT_FOUND")
        print(f"  {tag} -> {mapped}")
        if mapped != "NOT_FOUND":
            try:
                register_type, parsed_addr = server._parse_modbus_address(mapped)
                print(f"    -> type={register_type}, address={parsed_addr}")
            except Exception as e:
                print(f"    -> ERROR: {e}")
    
    print(f"\n✓ Starting server...")
    server.start()
    time.sleep(2)
    
    # Test the complete update flow with enhanced debugging
    print("\n=== Testing Update Flow ===")
    test_data = {"DB1.DBW100": 456.78}
    
    print(f"Before update - checking context values:")
    # Check current values in datastore before update
    try:
        current_vals = server.context.getValues('hr', 99, 1)  # 40100-40001=99
        print(f"  Holding register 99 before: {current_vals}")
    except Exception as e:
        print(f"  Error reading register 99: {e}")
    
    print(f"Calling update_data({test_data})...")
    server.update_data(test_data)
    
    print(f"After update - checking context values:")
    try:
        current_vals = server.context.getValues('hr', 99, 1)  # 40100-40001=99
        print(f"  Holding register 99 after: {current_vals}")
    except Exception as e:
        print(f"  Error reading register 99: {e}")
    
    # Test with client
    print("\n=== Client Test ===")
    time.sleep(1)
    
    client = ModbusTcpClient("localhost", port=5020)
    if client.connect():
        result = client.read_holding_registers(99, 1, slave=1)
        if not result.isError():
            raw_value = result.registers[0]
            print(f"Client read: raw={raw_value}, scaled={raw_value/100.0:.2f}")
        else:
            print(f"Client read error: {result}")
        client.close()
    
    server.stop()
    print("✓ Server stopped")

if __name__ == "__main__":
    main()