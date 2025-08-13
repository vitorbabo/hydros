"""
Base Protocol Server Classes

This module defines the abstract base classes and configuration for protocol servers.
"""

import asyncio
import logging
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Optional


class ProtocolType(Enum):
    """Supported protocol types"""
    MODBUS_TCP = "modbus_tcp"
    MODBUS_RTU = "modbus_rtu"
    OPCUA = "opcua"
    S7_SERVER = "s7_server"  # Future implementation
    ETHERNET_IP = "ethernet_ip"  # Future implementation


@dataclass
class ProtocolServerConfig:
    """Configuration for protocol servers"""
    protocol: ProtocolType
    enabled: bool = True
    host: str = "0.0.0.0"
    port: int = 502
    device_id: int = 1
    update_interval_ms: int = 1000
    additional_params: Dict[str, Any] = None

    def __post_init__(self):
        if self.additional_params is None:
            self.additional_params = {}


class ProtocolServer(ABC):
    """Abstract base class for protocol servers"""
    
    def __init__(self, config: ProtocolServerConfig):
        self.config = config
        self.data_values: Dict[str, Any] = {}
        self.running = False
        self.server_thread = None
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
    
    @abstractmethod
    def start_server(self):
        """Start the protocol server"""
        pass
    
    @abstractmethod
    def stop_server(self):
        """Stop the protocol server"""
        pass
    
    @abstractmethod
    def update_data(self, tag_values: Dict[str, Any]):
        """Update data values in the server"""
        pass
    
    def start(self):
        """Start server in background thread"""
        if self.running:
            return
        
        self.running = True
        self.server_thread = threading.Thread(target=self.start_server, daemon=True)
        self.server_thread.start()
        self.logger.info(f"Started {self.config.protocol.value} server on {self.config.host}:{self.config.port}")
    
    def stop(self):
        """Stop the server"""
        self.running = False
        self.stop_server()
        if self.server_thread:
            self.server_thread.join(timeout=5)
        self.logger.info(f"Stopped {self.config.protocol.value} server")
