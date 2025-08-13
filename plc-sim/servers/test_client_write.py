#!/usr/bin/env python3
"""
Test writing values to Modbus server using a client
"""

import logging
import time
import threading
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusDeviceContext, ModbusServerContext
from pymodbus.server import StartTcpServer
from pymodbus.client import ModbusTcpClient

logging.basicConfig(level=logging.INFO)

def run_server():
    """Run a simple Modbus server"""
    print("Starting Modbus server...")
    
    # Create data blocks with initial values
    holding_registers = [0] * 1000
    coils = [False] * 1000
    
    holding_block = ModbusSequentialDataBlock(0x00, holding_registers)
    coil_block = ModbusSequentialDataBlock(0x00, coils)
    
    # Create device context
    context = ModbusDeviceContext(hr=holding_block, co=coil_block)
    
    # Create server context
    server_context = ModbusServerContext(devices=context, single=True)
    
    # Start server
    StartTcpServer(context=server_context, address=("0.0.0.0", 5020))

def test_client_write():
    """Test writing values using a client"""
    print("=== Testing Client Write to Modbus Server ===")
    
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    time.sleep(2)
    
    # Create client
    client = ModbusTcpClient("localhost", port=5020)
    
    if client.connect():
        print("✓ Client connected")
        
        # Test reading initial values
        print("\n=== Reading initial values ===")
        result = client.read_holding_registers(100, count=1, device_id=1)
        if not result.isError():
            print(f"Initial HR100: {result.registers[0]}")
        else:
            print(f"Error reading HR100: {result}")
        
        result = client.read_coils(100, count=1, device_id=1)
        if not result.isError():
            print(f"Initial CO100: {result.bits[0]}")
        else:
            print(f"Error reading CO100: {result}")
        
        # Test writing values
        print("\n=== Writing values ===")
        
        # Write to holding register
        result = client.write_register(100, 750, device_id=1)
        if not result.isError():
            print("✓ Wrote 750 to HR100")
        else:
            print(f"Error writing to HR100: {result}")
        
        # Write to coil
        result = client.write_coil(100, True, device_id=1)
        if not result.isError():
            print("✓ Wrote True to CO100")
        else:
            print(f"Error writing to CO100: {result}")
        
        # Read back the values
        print("\n=== Reading back values ===")
        result = client.read_holding_registers(100, count=1, device_id=1)
        if not result.isError():
            print(f"HR100 after write: {result.registers[0]}")
        else:
            print(f"Error reading HR100: {result}")
        
        result = client.read_coils(100, count=1, device_id=1)
        if not result.isError():
            print(f"CO100 after write: {result.bits[0]}")
        else:
            print(f"Error reading CO100: {result}")
        
        # Test writing multiple registers
        print("\n=== Writing multiple registers ===")
        values = [750, 4500, 1250, 720, 1800]  # WTP values
        result = client.write_registers(100, values, device_id=1)
        if not result.isError():
            print("✓ Wrote multiple registers")
        else:
            print(f"Error writing multiple registers: {result}")
        
        # Read back multiple registers
        result = client.read_holding_registers(100, count=5, device_id=1)
        if not result.isError():
            print("Multiple registers after write:")
            for i, val in enumerate(result.registers):
                print(f"  HR{100+i}: {val}")
        else:
            print(f"Error reading multiple registers: {result}")
        
        client.close()
        print("✓ Client disconnected")
    else:
        print("✗ Client connection failed")
    
    print("✓ Test completed")

if __name__ == "__main__":
    test_client_write()
