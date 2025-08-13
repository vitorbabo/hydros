"""
Protocol Server Manager

This module manages multiple protocol servers for the simulator.
"""

import logging
from typing import Dict, Any

from .base import ProtocolServer, ProtocolServerConfig, ProtocolType
from .modbus_server import ModbusTCPServer
from .opcua_server import OPCUAServerImpl


class ProtocolServerManager:
    """Manages multiple protocol servers for the simulator"""
    
    def __init__(self):
        self.servers: Dict[str, ProtocolServer] = {}
        self.logger = logging.getLogger(__name__)
    
    def add_server(self, server_id: str, config: ProtocolServerConfig) -> bool:
        """Add a protocol server"""
        try:
            if config.protocol == ProtocolType.MODBUS_TCP:
                server = ModbusTCPServer(config)
            elif config.protocol == ProtocolType.OPCUA:
                server = OPCUAServerImpl(config)
            else:
                self.logger.warning(f"Protocol {config.protocol.value} not implemented yet")
                return False
            
            self.servers[server_id] = server
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create {config.protocol.value} server: {e}")
            return False
    
    def start_all_servers(self):
        """Start all configured servers"""
        for server_id, server in self.servers.items():
            if server.config.enabled:
                try:
                    server.start()
                except Exception as e:
                    self.logger.error(f"Failed to start server {server_id}: {e}")
    
    def stop_all_servers(self):
        """Stop all servers"""
        for server in self.servers.values():
            server.stop()
    
    def update_all_data(self, tag_values: Dict[str, Any]):
        """Update data in all servers"""
        for server in self.servers.values():
            if server.running:
                server.update_data(tag_values)
    
    def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all servers"""
        status = {}
        for server_id, server in self.servers.items():
            status[server_id] = {
                'protocol': server.config.protocol.value,
                'host': server.config.host,
                'port': server.config.port,
                'running': server.running,
                'enabled': server.config.enabled
            }
        return status
