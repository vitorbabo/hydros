#!/usr/bin/env python3
"""
Simple test for synchronous server
"""

import logging
import time
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusDeviceContext, ModbusServerContext
from pymodbus.server import StartTcpServer

logging.basicConfig(level=logging.INFO)

# Create data blocks with initial values
holding_registers = [0] * 1000
holding_registers[100] = 750
holding_registers[200] = 3500

coils = [False] * 1000
coils[100] = True

holding_block = ModbusSequentialDataBlock(0x00, holding_registers)
coil_block = ModbusSequentialDataBlock(0x00, coils)

# Create device context
context = ModbusDeviceContext(hr=holding_block, co=coil_block)

# Create server context
server_context = ModbusServerContext(devices=context, single=True)

def test_simple():
    """Test simple server"""
    print("=== Testing Simple Synchronous Server ===")
    
    # Test data blocks directly
    hr_100 = holding_block.getValues(100, 1)
    hr_200 = holding_block.getValues(200, 1)
    co_100 = coil_block.getValues(100, 1)
    
    print(f"Data block values - HR100: {hr_100}, HR200: {hr_200}, CO100: {co_100}")
    
    # Test context
    hr_100_ctx = context.getValues(4, 100, 1)
    hr_200_ctx = context.getValues(4, 200, 1)
    co_100_ctx = context.getValues(1, 100, 1)
    
    print(f"Context values - HR100: {hr_100_ctx}, HR200: {hr_200_ctx}, CO100: {co_100_ctx}")
    
    # Start server in a separate thread
    import threading
    
    def run_server():
        print("Starting server...")
        StartTcpServer(context=server_context, address=("0.0.0.0", 5020))
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    time.sleep(2)
    
    # Test client
    from pymodbus.client import ModbusTcpClient
    
    client = ModbusTcpClient("localhost", port=5020)
    
    if client.connect():
        print("✓ Client connected")
        
        # Test reading
        result = client.read_holding_registers(100, count=1, device_id=1)
        if not result.isError():
            print(f"Client read HR100: {result.registers[0]}")
        else:
            print(f"Client read HR100 error: {result}")
        
        result = client.read_coils(100, count=1, device_id=1)
        if not result.isError():
            print(f"Client read CO100: {result.bits[0]}")
        else:
            print(f"Client read CO100 error: {result}")
        
        client.close()
        print("✓ Client disconnected")
    else:
        print("✗ Client connection failed")
    
    print("✓ Test completed")

if __name__ == "__main__":
    test_simple()
