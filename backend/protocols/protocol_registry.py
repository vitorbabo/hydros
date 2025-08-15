#!/usr/bin/env python3
"""
Protocol Registry

Central registry for managing protocol handlers and their capabilities.
"""

import logging
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, Type


class ProtocolType(Enum):
    """Supported protocol types"""

    MODBUS_TCP = "modbus_tcp"
    OPCUA = "opcua"
    S7 = "s7"
    MQTT = "mqtt"
    HTTP = "http"


class ProtocolCapability(Enum):
    """Protocol capabilities"""

    READ = "read"
    WRITE = "write"
    SUBSCRIBE = "subscribe"
    PUBLISH = "publish"
    SERVER = "server"
    CLIENT = "client"


class BaseProtocolHandler(ABC):
    """Base class for all protocol handlers"""

    @abstractmethod
    def connect(self) -> bool:
        """Connect to the protocol endpoint"""
        pass

    @abstractmethod
    def disconnect(self):
        """Disconnect from the protocol endpoint"""
        pass

    @abstractmethod
    def read_parameter(self, parameter_id: str) -> Any:
        """Read a single parameter"""
        pass

    @abstractmethod
    def write_parameter(self, parameter_id: str, value: Any) -> bool:
        """Write a single parameter"""
        pass

    @abstractmethod
    def get_capabilities(self) -> List[ProtocolCapability]:
        """Get supported capabilities"""
        pass

    @abstractmethod
    def get_statistics(self) -> Dict[str, Any]:
        """Get handler statistics"""
        pass


class ProtocolRegistry:
    """
    Central registry for protocol handlers.

    Manages registration, discovery, and instantiation of protocol handlers.
    Provides a unified interface for protocol operations across the system.
    """

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

        # Registry of protocol handler classes
        self._handler_classes: Dict[ProtocolType, Type[BaseProtocolHandler]] = {}

        # Active handler instances
        self._active_handlers: Dict[str, BaseProtocolHandler] = {}

        # Protocol capabilities
        self._capabilities: Dict[ProtocolType, List[ProtocolCapability]] = {}

        # Configuration templates
        self._config_templates: Dict[ProtocolType, Dict[str, Any]] = {}

        self._initialize_builtin_protocols()

    def _initialize_builtin_protocols(self):
        """Initialize built-in protocol support"""
        try:
            # Register Modbus handler
            from .modbus_handler import ModbusHandler

            self.register_protocol(
                ProtocolType.MODBUS_TCP,
                ModbusHandler,
                [
                    ProtocolCapability.READ,
                    ProtocolCapability.WRITE,
                    ProtocolCapability.SERVER,
                    ProtocolCapability.CLIENT,
                ],
                {"host": "localhost", "port": 502, "device_id": 1, "timeout": 5.0},
            )

        except ImportError:
            self.logger.warning("Modbus handler not available")

        try:
            # Register MQTT handler
            from .mqtt_handler import MQTTHandler
            
            self.register_protocol(
                ProtocolType.MQTT,
                MQTTHandler,
                [
                    ProtocolCapability.PUBLISH,
                    ProtocolCapability.CLIENT,
                ],
                {"host": "localhost", "port": 1883, "client_id": "hydros-mqtt"}
            )
            
        except ImportError:
            self.logger.warning("MQTT handler not available")

        # TODO: Add other protocol handlers when implemented
        # self.register_protocol(ProtocolType.OPCUA, OPCUAHandler, ...)
        # self.register_protocol(ProtocolType.S7, S7Handler, ...)

    def register_protocol(
        self,
        protocol_type: ProtocolType,
        handler_class: Type[BaseProtocolHandler],
        capabilities: List[ProtocolCapability],
        config_template: Dict[str, Any],
    ):
        """Register a protocol handler"""
        self._handler_classes[protocol_type] = handler_class
        self._capabilities[protocol_type] = capabilities
        self._config_templates[protocol_type] = config_template

        self.logger.info(f"Registered protocol handler: {protocol_type.value}")

    def get_supported_protocols(self) -> List[ProtocolType]:
        """Get list of supported protocols"""
        return list(self._handler_classes.keys())

    def get_protocol_capabilities(
        self, protocol_type: ProtocolType
    ) -> List[ProtocolCapability]:
        """Get capabilities for a specific protocol"""
        return self._capabilities.get(protocol_type, [])

    def get_config_template(self, protocol_type: ProtocolType) -> Dict[str, Any]:
        """Get configuration template for a protocol"""
        return self._config_templates.get(protocol_type, {}).copy()

    def create_handler(
        self, handler_id: str, protocol_type: ProtocolType, config: Dict[str, Any]
    ) -> Optional[BaseProtocolHandler]:
        """Create a protocol handler instance"""
        if protocol_type not in self._handler_classes:
            self.logger.error(f"Protocol {protocol_type.value} not registered")
            return None

        try:
            handler_class = self._handler_classes[protocol_type]

            # Merge config with template
            template = self.get_config_template(protocol_type)
            merged_config = {**template, **config}

            # Create handler instance
            if protocol_type == ProtocolType.MODBUS_TCP:
                # Modbus-specific instantiation
                mode = merged_config.get("mode", "client")
                host = merged_config.get("host", "localhost")
                port = merged_config.get("port", 502)
                handler = handler_class(mode=mode, host=host, port=port)
            else:
                # Generic instantiation
                handler = handler_class(**merged_config)

            # Store active handler
            self._active_handlers[handler_id] = handler

            self.logger.info(f"Created {protocol_type.value} handler: {handler_id}")
            return handler

        except Exception as e:
            self.logger.error(f"Failed to create handler {handler_id}: {e}")
            return None

    def get_handler(self, handler_id: str) -> Optional[BaseProtocolHandler]:
        """Get an active handler by ID"""
        return self._active_handlers.get(handler_id)

    def remove_handler(self, handler_id: str) -> bool:
        """Remove and disconnect a handler"""
        if handler_id not in self._active_handlers:
            return False

        try:
            handler = self._active_handlers[handler_id]
            handler.disconnect()
            del self._active_handlers[handler_id]

            self.logger.info(f"Removed handler: {handler_id}")
            return True

        except Exception as e:
            self.logger.error(f"Error removing handler {handler_id}: {e}")
            return False

    def get_active_handlers(self) -> Dict[str, str]:
        """Get list of active handlers with their types"""
        handler_info = {}

        for handler_id, handler in self._active_handlers.items():
            # Determine protocol type from handler
            protocol_type = None
            for ptype, pclass in self._handler_classes.items():
                if isinstance(handler, pclass):
                    protocol_type = ptype.value
                    break

            handler_info[handler_id] = protocol_type or "unknown"

        return handler_info

    def create_modbus_client(
        self,
        handler_id: str,
        host: str = "localhost",
        port: int = 502,
        device_id: int = 1,
    ) -> Optional[BaseProtocolHandler]:
        """Convenience method to create Modbus client"""
        config = {"mode": "client", "host": host, "port": port, "device_id": device_id}

        return self.create_handler(handler_id, ProtocolType.MODBUS_TCP, config)

    def create_modbus_server(
        self, handler_id: str, host: str = "0.0.0.0", port: int = 502
    ) -> Optional[BaseProtocolHandler]:
        """Convenience method to create Modbus server"""
        config = {"mode": "server", "host": host, "port": port}

        return self.create_handler(handler_id, ProtocolType.MODBUS_TCP, config)

    def batch_read_parameters(
        self, handler_id: str, parameter_ids: List[str]
    ) -> Dict[str, Any]:
        """Read multiple parameters from a handler"""
        handler = self.get_handler(handler_id)
        if not handler:
            return {}

        results = {}
        for param_id in parameter_ids:
            try:
                value = handler.read_parameter(param_id)
                if value is not None:
                    results[param_id] = value
            except Exception as e:
                self.logger.error(f"Error reading {param_id} from {handler_id}: {e}")

        return results

    def batch_write_parameters(
        self, handler_id: str, parameter_values: Dict[str, Any]
    ) -> int:
        """Write multiple parameters to a handler"""
        handler = self.get_handler(handler_id)
        if not handler:
            return 0

        success_count = 0
        for param_id, value in parameter_values.items():
            try:
                if handler.write_parameter(param_id, value):
                    success_count += 1
            except Exception as e:
                self.logger.error(f"Error writing {param_id} to {handler_id}: {e}")

        return success_count

    def get_all_statistics(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all active handlers"""
        stats = {}

        for handler_id, handler in self._active_handlers.items():
            try:
                stats[handler_id] = handler.get_statistics()
            except Exception as e:
                self.logger.error(f"Error getting stats for {handler_id}: {e}")
                stats[handler_id] = {"error": str(e)}

        return stats

    def disconnect_all(self):
        """Disconnect all active handlers"""
        for handler_id in list(self._active_handlers.keys()):
            self.remove_handler(handler_id)

        self.logger.info("Disconnected all protocol handlers")

    def validate_config(
        self, protocol_type: ProtocolType, config: Dict[str, Any]
    ) -> List[str]:
        """Validate configuration for a protocol"""
        errors = []

        # Check required fields (simplified validation)
        required_fields = {
            ProtocolType.MODBUS_TCP: ["host", "port"],
            ProtocolType.OPCUA: ["endpoint_url"],
            ProtocolType.S7: ["host", "rack", "slot"],
        }

        required = required_fields.get(protocol_type, [])
        for field in required:
            if field not in config:
                errors.append(f"Missing required field: {field}")

        return errors

    def export_configuration(self) -> Dict[str, Any]:
        """Export current registry configuration"""
        config = {
            "supported_protocols": [p.value for p in self.get_supported_protocols()],
            "active_handlers": self.get_active_handlers(),
            "capabilities": {
                p.value: [c.value for c in caps]
                for p, caps in self._capabilities.items()
            },
        }

        return config
