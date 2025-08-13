#!/usr/bin/env python3
"""
Modbus TCP Server for WTP Simulator

A clean, single-file implementation of a Modbus TCP server using pymodbus 3.11.1.
Based on pymodbus examples: https://github.com/pymodbus-dev/pymodbus/tree/dev/examples
"""

import asyncio
import logging
import threading
import time

from pymodbus import ModbusDeviceIdentification
from pymodbus.datastore import (
    ModbusDeviceContext,
    ModbusSequentialDataBlock,
    ModbusServerContext,
)
from pymodbus.server import StartAsyncTcpServer


class ModbusTCPServer:
    """Modbus TCP server for WTP simulator data"""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 5020, device_id: int = 1):
        self.host = host
        self.port = port
        self.device_id = device_id
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
        self.running = False
        self.context = None
        self.server_context = None
        self.identity = None
        self.loop = None
        self.thread = None
        self.server_task = None
    
    def _setup_datastore(self):
        """Setup Modbus datastore with initial WTP values"""
        
        # Create data blocks with initial values - following official pymodbus pattern
        # Initialize holding registers with WTP values
        holding_registers = [0] * 1000
        # Raw Water Intake
        holding_registers[100] = 750   # Level (7.50m * 100)
        holding_registers[102] = 4500  # Flow (45.0 m3/h * 100)
        holding_registers[104] = 1250  # Turbidity (12.5 NTU * 100)
        holding_registers[106] = 720   # pH (7.2 * 100)
        holding_registers[108] = 1800  # Temp (18.0°C * 100)
        
        # Intake Pump
        holding_registers[200] = 3500  # Flow (35.0 m3/h * 100)
        holding_registers[202] = 250   # Pressure (2.5 bar * 100)
        holding_registers[204] = 1800  # Current (18.0 A * 100)
        holding_registers[206] = 4500  # Motor temp (45°C * 100)
        holding_registers[208] = 180   # Vibration (1.8 mm/s * 100)
        
        # Chemical Dosing
        holding_registers[300] = 180   # Tank level (1.8m * 100)
        holding_registers[302] = 1200  # Dose rate (12.0 mg/L * 100)
        
        # Filter System
        holding_registers[600] = 15000 # Diff pressure (150 mbar * 100)
        holding_registers[602] = 45    # Effluent turbidity (0.45 NTU * 100)
        
        # Chlorination
        holding_registers[700] = 80    # Chlorine residual (0.8 mg/L * 100)
        holding_registers[702] = 180   # Dose rate (1.8 mg/L * 100)
        
        # Storage Tank
        holding_registers[900] = 650   # Tank level (6.5m * 100)
        holding_registers[902] = 65    # Chlorine residual (0.65 mg/L * 100)
        
        # Initialize coils with pump status
        coils = [False] * 1000
        coils[100] = True  # Pump run status
        
        # Create data blocks with initial values - following official pattern
        coil_block = ModbusSequentialDataBlock(0x00, coils)
        discrete_block = ModbusSequentialDataBlock(0x00, [False] * 1000)
        input_block = ModbusSequentialDataBlock(0x00, [0] * 1000)
        holding_block = ModbusSequentialDataBlock(0x00, holding_registers)
        
        # Create device context
        self.context = ModbusDeviceContext(
            di=discrete_block,
            co=coil_block,
            hr=holding_block,
            ir=input_block
        )
        
        # Create server context - following official pymodbus pattern
        self.server_context = ModbusServerContext(devices=self.context, single=True)
        
        # Setup device identification
        self.identity = ModbusDeviceIdentification(
            info_name={
                "VendorName": "Hydros Simulator",
                "ProductCode": "WTP-SIM",
                "VendorUrl": "https://github.com/hydros",
                "ProductName": "WTP Simulator Modbus Server",
                "ModelName": "Hydros WTP Simulator",
                "MajorMinorRevision": "1.0",
            }
        )
        
        # Debug: Verify initial values are set correctly
        hr_100 = holding_block.getValues(100, 1)
        hr_200 = holding_block.getValues(200, 1)
        co_100 = coil_block.getValues(100, 1)
        
        self.logger.info(f"Initial holding register 100: {hr_100}")
        self.logger.info(f"Initial holding register 200: {hr_200}")
        self.logger.info(f"Initial coil 100: {co_100}")
        
        self.logger.info(f"Created Modbus datastore with WTP parameters for {self.host}:{self.port}")
        
        # Store references to data blocks for updates
        self.holding_block = holding_block
        self.coil_block = coil_block
        
        # Verify datastore is accessible
        self._verify_datastore()
    
    def _verify_datastore(self):
        """Verify that the datastore values are accessible"""
        try:
            # Test reading values from the data blocks directly
            hr_values = self.context.getValues(4, 100, 1)  # Read holding register 100
            co_values = self.context.getValues(1, 100, 1)  # Read coil 100
            
            self.logger.info(f"Verified datastore - HR100: {hr_values}, CO100: {co_values}")
        except Exception as e:
            self.logger.error(f"Error verifying datastore: {e}")
    
    async def _run_server_async(self):
        """Run the async Modbus server"""
        try:
            # Setup datastore in the same thread as the server
            self._setup_datastore()
            
            self.logger.info(f"Starting Modbus server on {self.host}:{self.port}")
            
            # Start async TCP server - following pymodbus examples pattern
            address = (self.host, self.port)
            await StartAsyncTcpServer(
                context=self.server_context,  # Data storage
                identity=self.identity,       # server identify
                address=address,             # listen address
            )
            
        except Exception as e:
            self.logger.error(f"Server error: {e}")
            raise
    
    def _run_in_thread(self):
        """Run server in separate thread with its own event loop"""
        try:
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._run_server_async())
        except Exception as e:
            self.logger.error(f"Thread error: {e}")
        finally:
            if self.loop:
                self.loop.close()
    
    def start(self):
        """Start the server in background thread"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_in_thread, daemon=True)
        self.thread.start()
        
        # Wait a moment for server to start
        time.sleep(3)
        
        self.logger.info(f"Modbus TCP server started on {self.host}:{self.port}")
    
    def stop(self):
        """Stop the server"""
        if not self.running:
            return
        
        self.running = False
        
        if self.thread:
            self.thread.join(timeout=5)
        
        self.logger.info("Modbus TCP server stopped")
    
    def get_server_info(self):
        """Get server information for clients"""
        return {
            "host": self.host,
            "port": self.port,
            "device_id": self.device_id,
            "running": self.running
        }


async def test_server():
    """Test the Modbus server"""
    from pymodbus import FramerType
    from pymodbus.client import AsyncModbusTcpClient
    
    logging.basicConfig(level=logging.INFO)
    
    print("=== Testing Modbus Server ===")
    
    server = ModbusTCPServer(port=5020)
    server.start()
    
    # Wait for server startup
    await asyncio.sleep(4)
    
    # Test with client
    client = AsyncModbusTcpClient("localhost", port=5020, framer=FramerType.SOCKET)
    await client.connect()
    
    if client.connected:
        print("✓ Client connected")
        
        # Test reading initial WTP addresses
        wtp_addresses = [100, 102, 104, 200, 300, 600, 700, 900]
        
        print("\n=== Reading initial WTP addresses ===")
        for addr in wtp_addresses:
            try:
                result = await client.read_holding_registers(addr, count=1, device_id=1)
                if not result.isError():
                    raw_value = result.registers[0]
                    scaled_value = raw_value / 100.0
                    print(f"  Address {addr:3d}: {raw_value:5d} ({scaled_value:6.2f})")
                else:
                    print(f"  Address {addr:3d}: ERROR - {result}")
            except Exception as e:
                print(f"  Address {addr:3d}: EXCEPTION - {e}")
        
        # Test reading coil (pump status)
        print("\n=== Reading pump status (coil) ===")
        try:
            result = await client.read_coils(100, count=1, device_id=1)
            if not result.isError():
                coil_value = result.bits[0]
                print(f"  Coil 100: {coil_value}")
            else:
                print(f"  Coil 100: ERROR - {result}")
        except Exception as e:
            print(f"  Coil 100: EXCEPTION - {e}")
        
        client.close()
        print("✓ Client disconnected")
    else:
        print("✗ Client connection failed")
    
    server.stop()
    print("Test completed")


def test_server_sync():
    """Synchronous wrapper for testing"""
    asyncio.run(test_server())


if __name__ == "__main__":
    test_server_sync()
