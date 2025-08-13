import os
import time
import json
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any

import paho.mqtt.client as mqtt
from wtp_components import WTPSimulator
from component_factory import ComponentFactory
from servers.modbus_client import ModbusTCPClient
from servers.modbus_server import ModbusTCPServer


class SimulatorMode(Enum):
    MQTT_DIRECT = "mqtt_direct"             # Publish directly to MQTT (original mode)
    PROTOCOL_SERVER = "protocol_server"     # Run protocol servers for edge gateway
    HYBRID = "hybrid"                       # Both modes simultaneously




SITE_ID = os.getenv("SITE_ID", "wtp-porto-01")
SOURCE = os.getenv("SOURCE", "siemens-s7-1500")
MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
SIMULATOR_MODE = os.getenv("SIMULATOR_MODE", "mqtt_direct")  # New parameter


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def transform_to_standard(raw_msg: dict, tag_mapping: dict) -> list[dict]:
    """Transform raw PLC data to standardized observation objects"""
    out: list[dict] = []
    ts = raw_msg.get("ts", iso_now())
    site_id = raw_msg.get("site_id", SITE_ID)
    source = raw_msg.get("source", SOURCE)
    seq = int(raw_msg.get("seq", 0))
    
    for raw_tag, value in raw_msg.get("tags", {}).items():
        if raw_tag not in tag_mapping:
            continue
        
        cfg = tag_mapping[raw_tag]
        
        # Determine data quality based on value and sensor characteristics
        quality = "good"
        if isinstance(value, (int, float)):
            # Check for sensor out of range or stuck values
            if value == 0 and cfg["measurement"] not in ["run_status", "maintenance_mode"]:
                quality = "uncertain"
            elif cfg["measurement"] == "turbidity" and value > 100:
                quality = "bad"
            elif cfg["measurement"] == "ph" and (value < 4.0 or value > 12.0):
                quality = "bad"
        
        obs = {
            "site_id": site_id,
            "asset_id": cfg["asset_id"],
            "sensor_id": cfg["sensor_id"],
            "measurement": cfg["measurement"],
            "ts": ts,
            "value": value,
            "unit": cfg["unit"],
            "quality": quality,
            "raw_tag": raw_tag,
            "source": source,
            "seq": seq + len(out),  # Increment sequence for each observation
            "parameter_type": cfg["parameter_type"],
            "component_type": cfg["component_type"],
        }
        out.append(obs)
    
    return out


def publish(client: mqtt.Client, topic: str, payload: dict):
    client.publish(topic, json.dumps(payload), qos=0, retain=False)


def setup_modbus_client(site_config: Dict[str, Any]) -> ModbusTCPClient:
    """Setup Modbus client based on site configuration"""
    # Get Modbus client configuration from site config
    modbus_config = site_config.get('modbus_client', {})
    
    # Default configuration
    host = modbus_config.get('host', 'localhost')
    port = modbus_config.get('port', 5020)
    device_id = modbus_config.get('device_id', 1)
    
    # Create Modbus client
    client = ModbusTCPClient(host=host, port=port, device_id=device_id)
    
    print(f"Configured Modbus client for {host}:{port}")
    return client


def setup_modbus_server(site_config: Dict[str, Any]) -> ModbusTCPServer:
    """Setup Modbus server based on site configuration"""
    # Get Modbus server configuration from site config
    modbus_config = site_config.get('modbus_server', {})
    
    # Default configuration
    host = modbus_config.get('host', '0.0.0.0')
    port = modbus_config.get('port', 5020)
    device_id = modbus_config.get('device_id', 1)
    
    # Create Modbus server
    server = ModbusTCPServer(host=host, port=port, device_id=device_id)
    
    print(f"Configured Modbus server for {host}:{port}")
    return server


def main():
    print("Starting Hydros Enhanced WTP Simulator...")
    print("=" * 50)
    
    # Parse simulator mode
    try:
        mode = SimulatorMode(SIMULATOR_MODE.lower())
    except ValueError:
        print(f"Warning: Invalid simulator mode '{SIMULATOR_MODE}', using 'mqtt_direct'")
        mode = SimulatorMode.MQTT_DIRECT
    
    print(f"Simulator Mode: {mode.value}")
    
    # Initialize component factory and show available configurations
    factory = ComponentFactory()
    available_sites = factory.list_available_configurations()
    
    print(f"Available site configurations: {', '.join(available_sites)}")
    
    if SITE_ID not in available_sites:
        print(f"Warning: Site '{SITE_ID}' not found in configuration. Using default components.")
        # Fallback to original simple simulator
        wtp_sim = WTPSimulator(site_id=SITE_ID)
    else:
        # Use factory to create site-specific components
        site_info = factory.get_site_info(SITE_ID)
        print(f"\nSite: {site_info['name']}")
        print(f"Capacity: {site_info['capacity']:,} m³/day")
        print(f"Treatment Train: {site_info['treatment_train']}")
        print(f"Modules: {len(site_info['modules'])}")
        
        # Create components using factory
        components = factory.create_site_components(SITE_ID)
        wtp_sim = WTPSimulator(site_id=SITE_ID)
        wtp_sim.components = components
        wtp_sim._initialize_states()  # Re-initialize with new components
    
    tag_mapping = wtp_sim.get_tag_mapping()
    
    print(f"\nInitialized {len(wtp_sim.components)} WTP components:")
    total_params = 0
    for comp_id, component in wtp_sim.components.items():
        param_count = len(component.parameters)
        total_params += param_count
        print(f"  - {component.component_name} ({param_count} parameters)")
    
    print(f"\nTotal parameters: {total_params}")
    
    # Initialize Modbus server and client if needed
    modbus_server = None
    modbus_client = None
    if mode in [SimulatorMode.PROTOCOL_SERVER, SimulatorMode.HYBRID]:
        # Get site configuration for Modbus server/client
        if SITE_ID in available_sites:
            site_info = factory.get_site_info(SITE_ID)
            site_config = factory.site_configurations.get(SITE_ID, {})
        else:
            site_config = {}
        
        # Start Modbus server first
        modbus_server = setup_modbus_server(site_config)
        modbus_server.start()
        print(f"\n✓ Started Modbus server at {modbus_server.host}:{modbus_server.port}")
        
        # Wait a moment for server to be ready
        time.sleep(2)
        
        # Then setup and connect Modbus client
        modbus_client = setup_modbus_client(site_config)
        
        # Try to connect to Modbus server
        if modbus_client.connect():
            print(f"\n✓ Connected to Modbus server at {modbus_client.host}:{modbus_client.port}")
        else:
            print(f"\n⚠ Warning: Could not connect to Modbus server at {modbus_client.host}:{modbus_client.port}")
            print("   Make sure the Modbus server is running before starting the simulator")
            modbus_client = None
    
    # Initialize MQTT client if needed
    client = None
    if mode in [SimulatorMode.MQTT_DIRECT, SimulatorMode.HYBRID]:
        client = mqtt.Client(client_id="plc-sim-enhanced")
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        client.loop_start()
        print(f"\nConnected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
    
    print(f"\nPublishing to site: {SITE_ID}")
    print("Starting data generation...")
    print("=" * 50)

    seq = 1
    try:
        while True:
            # Generate comprehensive raw data from all components
            raw = wtp_sim.generate_raw_data(seq)
            
            # Update Modbus server with raw tag values
            if modbus_client and mode in [SimulatorMode.PROTOCOL_SERVER, SimulatorMode.HYBRID]:
                modbus_client.write_tag_values(raw['tags'])
            
            # Publish raw data to plc-sim/raw/# for visibility (debugging/monitoring)
            if client and mode in [SimulatorMode.PROTOCOL_SERVER, SimulatorMode.HYBRID]:
                # Publish individual parameter values to plc-sim/raw/# for monitoring
                for tag, value in raw['tags'].items():
                    topic = f"plc-sim/raw/{tag}"
                    publish(client, topic, {
                        "tag": tag,
                        "value": value,
                        "timestamp": raw.get('timestamp', datetime.now().isoformat()),
                        "seq": seq,
                        "site": SITE_ID
                    })
            
            # Publish to MQTT only in MQTT_DIRECT mode (original behavior)
            if client and mode == SimulatorMode.MQTT_DIRECT:
                publish(client, "plc/raw", raw)
                
                # Transform to standardized observations and publish individually
                observations = transform_to_standard(raw, tag_mapping)
                
                for obs in observations:
                    topic = f"wtp/{obs['site_id']}/{obs['asset_id']}/{obs['sensor_id']}/observation"
                    publish(client, topic, obs)
            
            # Print status every 30 seconds (15 cycles)
            if seq % 15 == 0:
                timestamp = datetime.now().strftime('%H:%M:%S')
                
                if mode == SimulatorMode.MQTT_DIRECT:
                    observations = transform_to_standard(raw, tag_mapping)
                    print(f"[{timestamp}] Published {len(observations)} observations to MQTT (seq: {seq})")
                elif mode == SimulatorMode.PROTOCOL_SERVER:
                    print(f"[{timestamp}] Updated {len(raw['tags'])} protocol server values + raw data topics (seq: {seq})")
                else:  # HYBRID
                    print(f"[{timestamp}] Updated {len(raw['tags'])} server values + published raw data topics (seq: {seq})")
                
                # Show some key parameters
                key_params = {
                    "Raw Turbidity": f"{raw['tags'].get('DB1.DBW104', 0):.2f} NTU",
                    "Clarifier Turbidity": f"{raw['tags'].get('DB5.DBW102', 0):.2f} NTU", 
                    "Filter Turbidity": f"{raw['tags'].get('DB6.DBW102', 0):.3f} NTU",
                    "Chlorine Residual": f"{raw['tags'].get('DB7.DBW100', 0):.2f} mg/L",
                    "Intake Flow": f"{raw['tags'].get('DB1.DBW102', 0):.1f} m3/h",
                }
                print("  Key Parameters:", " | ".join([f"{k}: {v}" for k, v in key_params.items()]))
            
            seq += 1
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\nShutting down simulator...")
        
        # Disconnect Modbus client
        if modbus_client:
            modbus_client.disconnect()
        
        # Stop Modbus server
        if modbus_server:
            modbus_server.stop()
        
        # Stop MQTT client
        if client:
            client.loop_stop()
            client.disconnect()
        
        print("Simulator stopped.")


if __name__ == "__main__":
    main()

