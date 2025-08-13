#!/usr/bin/env python3
"""
Simple test based on the working example pattern
"""

import asyncio
import logging
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusDeviceContext, ModbusServerContext
from pymodbus.server import StartAsyncTcpServer

logging.basicConfig(level=logging.INFO)

# Create data blocks with initial values
holding_block = ModbusSequentialDataBlock(0, [0] * 1000)
coil_block = ModbusSequentialDataBlock(0, [False] * 1000)

# Set initial values directly in data blocks
holding_block.setValues(100, [750])
holding_block.setValues(200, [3500])
coil_block.setValues(100, [True])

# Create device context
context = ModbusDeviceContext(hr=holding_block, co=coil_block)

# Create server context
server_context = ModbusServerContext(devices=context, single=True)

async def test_server():
    """Test the simple server"""
    print("=== Testing Simple Server ===")
    
    # Start server
    server_task = asyncio.create_task(
        StartAsyncTcpServer(context=server_context, address=("0.0.0.0", 5020))
    )
    
    print("✓ Server started")
    
    # Wait a moment
    await asyncio.sleep(2)
    
    # Test reading values from data blocks
    hr_100 = holding_block.getValues(100, 1)
    hr_200 = holding_block.getValues(200, 1)
    co_100 = coil_block.getValues(100, 1)
    
    print(f"Data block values - HR100: {hr_100}, HR200: {hr_200}, CO100: {co_100}")
    
    # Test reading values from context
    hr_100_ctx = context.getValues(4, 100, 1)
    hr_200_ctx = context.getValues(4, 200, 1)
    co_100_ctx = context.getValues(1, 100, 1)
    
    print(f"Context values - HR100: {hr_100_ctx}, HR200: {hr_200_ctx}, CO100: {co_100_ctx}")
    
    # Test client connection
    from pymodbus.client import AsyncModbusTcpClient
    from pymodbus import FramerType
    
    client = AsyncModbusTcpClient("localhost", port=5020, framer=FramerType.SOCKET)
    await client.connect()
    
    if client.connected:
        print("✓ Client connected")
        
        # Test reading values
        result = await client.read_holding_registers(100, count=1, device_id=1)
        if not result.isError():
            print(f"Client read HR100: {result.registers[0]}")
        else:
            print(f"Client read HR100 error: {result}")
        
        result = await client.read_coils(100, count=1, device_id=1)
        if not result.isError():
            print(f"Client read CO100: {result.bits[0]}")
        else:
            print(f"Client read CO100 error: {result}")
        
        client.close()
        print("✓ Client disconnected")
    else:
        print("✗ Client connection failed")
    
    # Stop server
    server_task.cancel()
    print("✓ Test completed")

if __name__ == "__main__":
    asyncio.run(test_server())
