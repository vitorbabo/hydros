#!/usr/bin/env python3
"""
Debug script to see what tags the simulator is generating vs what's mapped in Modbus client
"""

import sys
sys.path.append('/home/mikelnite/projects/hydros/plc-sim')

from wtp_components import WTPSimulator
from component_factory import ComponentFactory
from servers.modbus_client import ModbusTCPClient

def debug_tag_mapping():
    """Debug the tag mapping between simulator and Modbus client"""
    print("=== Debug Tag Mapping ===")
    
    # Initialize simulator like in main
    factory = ComponentFactory()
    available_sites = factory.list_available_configurations()
    
    SITE_ID = "wtp-porto-01"
    
    if SITE_ID in available_sites:
        # Use factory to create site-specific components
        site_info = factory.get_site_info(SITE_ID)
        components = factory.create_site_components(SITE_ID)
        wtp_sim = WTPSimulator(site_id=SITE_ID)
        wtp_sim.components = components
        wtp_sim._initialize_states()
    else:
        wtp_sim = WTPSimulator(site_id=SITE_ID)
    
    # Generate sample data to see all tags
    raw_data = wtp_sim.generate_raw_data(1)
    simulator_tags = list(raw_data['tags'].keys())
    
    # Get Modbus client mapping
    client = ModbusTCPClient()
    mapped_tags = list(client.tag_address_map.keys())
    
    print(f"\nSimulator generates {len(simulator_tags)} tags:")
    for tag in sorted(simulator_tags):
        print(f"  {tag}")
    
    print(f"\nModbus client maps {len(mapped_tags)} tags:")
    for tag in sorted(mapped_tags):
        address = client.tag_address_map[tag]
        print(f"  {tag} -> {address}")
    
    print(f"\nTags mapped correctly:")
    mapped_correctly = []
    for tag in simulator_tags:
        if tag in mapped_tags:
            mapped_correctly.append(tag)
            address = client.tag_address_map[tag]
            value = raw_data['tags'][tag]
            print(f"  ✓ {tag} -> {address} (value: {value})")
    
    print(f"\nTags NOT mapped (will show as 0):")
    not_mapped = []
    for tag in simulator_tags:
        if tag not in mapped_tags:
            not_mapped.append(tag)
            value = raw_data['tags'][tag]
            print(f"  ✗ {tag} (value: {value})")
    
    print(f"\nSummary:")
    print(f"  - Simulator tags: {len(simulator_tags)}")
    print(f"  - Mapped tags: {len(mapped_tags)}")
    print(f"  - Correctly mapped: {len(mapped_correctly)}")
    print(f"  - Missing mappings: {len(not_mapped)}")
    
    if not_mapped:
        print(f"\nTo fix this, add these mappings to ModbusTCPClient.tag_address_map:")
        next_address = max(client.tag_address_map.values()) + 10
        for tag in not_mapped:
            print(f"  \"{tag}\": {next_address},")
            next_address += 2

if __name__ == "__main__":
    debug_tag_mapping()
