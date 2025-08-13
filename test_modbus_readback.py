#!/usr/bin/env python3
"""
Test script to read values from the Modbus server to verify the simulator is working
"""

from pymodbus.client import ModbusTcpClient

def test_modbus_readback():
    """Test reading values from the Modbus server"""
    print("=== Testing Modbus Server Readback ===")
    
    # Connect to the Modbus server
    client = ModbusTcpClient("localhost", port=5020)
    
    if not client.connect():
        print("✗ Failed to connect to Modbus server")
        return
    
    print("✓ Connected to Modbus server")
    
    # Test addresses that should be written by the simulator
    test_addresses = {
        100: "Raw water level",
        102: "Raw water flow", 
        104: "Raw water turbidity",
        106: "Raw water pH",
        108: "Raw water temperature",
        110: "Conductivity",
        112: "Dissolved oxygen",
        114: "Pump flow",
        116: "Pump pressure",
        118: "Motor current",
        120: "Motor temperature",
        122: "Vibration",
        124: "Power consumption",
        126: "Pump speed",
        128: "Pump efficiency",
        132: "Mixing tank level",
        134: "Mixing flow rate",
        136: "Mixer speed",
        138: "Mixing power",
        140: "Tank pressure",
        142: "Chemical tank level",
        144: "Chemical dose rate",
        146: "Chemical pump speed",
        148: "Chemical concentration",
        150: "Clarifier inlet turbidity",
        152: "Clarifier effluent turbidity",
        154: "Sludge level",
        156: "Clarifier water level",
        158: "Clarifier flow rate",
        160: "Clarifier temperature",
        162: "Clarifier pH",
        166: "Chlorine residual",
        168: "Chlorine dose rate",
        170: "Contact time",
        172: "Chlorine tank level"
    }
    
    print("\nReading current values from Modbus server:")
    print("-" * 50)
    
    for address, description in test_addresses.items():
        try:
            # Read holding register
            result = client.read_holding_registers(address, count=1, device_id=1)
            if not result.isError():
                raw_value = result.registers[0]
                scaled_value = raw_value / 100.0  # Convert back from scaled integer
                print(f"Address {address:3d}: {raw_value:5d} ({scaled_value:7.2f}) - {description}")
            else:
                print(f"Address {address:3d}: ERROR - {result}")
        except Exception as e:
            print(f"Address {address:3d}: EXCEPTION - {e}")
    
    # Test reading coils (pump status)
    print("\nReading pump status (coils):")
    coil_addresses = {
        100: "Legacy pump status",
        130: "Pump run status", 
        164: "Scraper run status"
    }
    
    for address, description in coil_addresses.items():
        try:
            result = client.read_coils(address, count=1, device_id=1)
            if not result.isError():
                coil_value = result.bits[0]
                print(f"Coil {address:3d}: {coil_value} - {description}")
            else:
                print(f"Coil {address:3d}: ERROR - {result}")
        except Exception as e:
            print(f"Coil {address:3d}: EXCEPTION - {e}")
    
    client.close()
    print("\n✓ Test completed")

if __name__ == "__main__":
    test_modbus_readback()
