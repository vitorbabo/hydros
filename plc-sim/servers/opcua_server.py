"""
OPC UA Server Implementation

This module implements an OPC UA server for serving simulated PLC data.
"""

import logging
import time
from typing import Dict, Any

try:
    from opcua import Server as OPCUAServer
    from opcua import ua
    OPCUA_AVAILABLE = True
except ImportError:
    OPCUA_AVAILABLE = False
    logging.warning("OPC UA libraries not available. Install opcua for OPC UA server support.")

from .base import ProtocolServer, ProtocolServerConfig, ProtocolType


class OPCUAServerImpl(ProtocolServer):
    """OPC UA server implementation"""
    
    def __init__(self, config: ProtocolServerConfig):
        super().__init__(config)
        self.server = None
        self.namespace_idx = None
        self.node_dict = {}  # Maps tag addresses to OPC UA nodes
        self.wtp_object = None
        
        if not OPCUA_AVAILABLE:
            raise ImportError("opcua library is required for OPC UA server. Install with: pip install opcua")
        
        self._setup_server()
    
    def _setup_server(self):
        """Initialize OPC UA server"""
        endpoint = f"opc.tcp://{self.config.host}:{self.config.port}/hydros/wtp-simulator"
        self.server = OPCUAServer()
        self.server.set_endpoint(endpoint)
        
        # Setup namespace
        self.namespace_idx = self.server.register_namespace("http://hydros.wtp.simulator")
        
        # Create root object
        root = self.server.get_objects_node()
        wtp_object = root.add_object(self.namespace_idx, "WTP_Simulator")
        
        self.wtp_object = wtp_object
    
    def _create_or_get_node(self, tag_address: str, value: Any):
        """Create OPC UA node for tag if it doesn't exist"""
        if tag_address in self.node_dict:
            return self.node_dict[tag_address]
        
        # Determine data type
        if isinstance(value, bool):
            variant_type = ua.VariantType.Boolean
        elif isinstance(value, int):
            variant_type = ua.VariantType.Int32
        elif isinstance(value, float):
            variant_type = ua.VariantType.Double
        else:
            variant_type = ua.VariantType.String
        
        # Create node
        node = self.wtp_object.add_variable(
            self.namespace_idx,
            tag_address,
            value,
            variant_type
        )
        node.set_writable()
        
        self.node_dict[tag_address] = node
        return node
    
    def start_server(self):
        """Start OPC UA server"""
        try:
            self.server.start()
            self.logger.info(f"OPC UA server started at opc.tcp://{self.config.host}:{self.config.port}")
            
            # Keep server running
            while self.running:
                time.sleep(1)
                
        except Exception as e:
            self.logger.error(f"Failed to start OPC UA server: {e}")
    
    def stop_server(self):
        """Stop OPC UA server"""
        if self.server:
            self.server.stop()
    
    def update_data(self, tag_values: Dict[str, Any]):
        """Update OPC UA node values"""
        if not self.server:
            return
        
        for tag_name, value in tag_values.items():
            try:
                # For OPC UA, we can use the semantic tag name directly as node identifier
                # or convert DB-style tags to semantic names
                node_name = tag_name.replace(".", "_")  # OPC UA node names can't have dots
                node = self._create_or_get_node(node_name, value)
                node.set_value(value)
            except Exception as e:
                self.logger.debug(f"Could not update OPC UA node {tag_name}: {e}")
