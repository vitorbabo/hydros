"""
Sensor Catalog - Centralized Parameter Specifications Library

Provides a single source of truth for all water treatment plant sensor and parameter 
definitions, replacing hardcoded specifications scattered across multiple modules.

Key Components:
- ParameterSpecification: Template specifications for sensors (ranges, units, precision)
- ParameterLibrary: Main catalog loading from parameters.yaml configuration
- SensorCatalog: Alias for ParameterLibrary with water treatment specific methods

This system enables:
- Consistent sensor definitions across simulation and production
- Centralized management of measurement ranges and calibration data
- Automatic parameter validation and quality indicators
- Easy addition of new sensor types through configuration
"""

import yaml
from pathlib import Path
from typing import Dict, Optional, Any, List
from dataclasses import dataclass
import logging

from .plant_elements import ProtocolDataType

logger = logging.getLogger(__name__)


@dataclass
class ParameterSpecification:
    """Specification for a parameter from the parameter library"""
    name: str
    measurement_type: str
    unit: str
    data_type: ProtocolDataType
    precision: int
    ranges: Dict[str, List[float]]
    description: str = ""
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    access_mode: str = "read"
    calibration_frequency: Optional[int] = None
    measurement_principle: Optional[str] = None
    regulatory_requirement: bool = False
    safety_related: bool = False
    
    def get_default_range(self) -> Optional[List[float]]:
        """Get the most appropriate default range for this parameter"""
        if not self.ranges:
            return None
            
        # Prioritize ranges in order of specificity
        priority_ranges = [
            'typical', 'normal', 'standard', 'process_water', 'drinking_water',
            'small_plant', 'medium_plant', 'ambient'
        ]
        
        for range_name in priority_ranges:
            if range_name in self.ranges:
                return self.ranges[range_name]
        
        # Return first available range if no priority match
        return next(iter(self.ranges.values()))
    
    def get_min_max(self) -> tuple[float, float]:
        """Get min and max values, using range if explicit values not set"""
        if self.min_value is not None and self.max_value is not None:
            return self.min_value, self.max_value
            
        default_range = self.get_default_range()
        if default_range and len(default_range) >= 2:
            return float(default_range[0]), float(default_range[1])
            
        # Fallback defaults based on data type
        if self.data_type == ProtocolDataType.BOOL:
            return 0.0, 1.0
        else:
            return 0.0, 100.0


class ParameterLibrary:
    """
    Centralized parameter library that loads specifications from configuration files.
    
    Replaces hardcoded parameter definitions scattered across multiple modules
    with a single, configurable source of truth.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize parameter library.
        
        Args:
            config_path: Path to parameters.yaml file. If None, uses default location.
        """
        if config_path:
            self.config_path = Path(config_path)
        else:
            # Default to backend/config/templates/parameters.yaml
            self.config_path = Path(__file__).parent.parent / "config" / "templates" / "parameters.yaml"
        
        self._parameters: Dict[str, ParameterSpecification] = {}
        self._data_quality_rules: Dict[str, Any] = {}
        self._alarm_priorities: Dict[str, Any] = {}
        
        self._load_parameter_library()
    
    def _load_parameter_library(self) -> None:
        """Load parameter specifications from configuration file"""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            # Load parameter specifications
            param_specs = config.get('parameter_specifications', {})
            for param_name, spec in param_specs.items():
                try:
                    param_spec = self._create_parameter_specification(param_name, spec)
                    self._parameters[param_name] = param_spec
                except Exception as e:
                    logger.warning(f"Failed to load parameter specification for {param_name}: {e}")
                    continue
            
            # Load data quality rules and alarm priorities
            self._data_quality_rules = config.get('data_quality_rules', {})
            self._alarm_priorities = config.get('alarm_priorities', {})
            
            logger.info(f"Loaded {len(self._parameters)} parameter specifications from {self.config_path}")
            
        except FileNotFoundError:
            logger.error(f"Parameter library file not found: {self.config_path}")
            raise
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse parameter library YAML: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to load parameter library: {e}")
            raise
    
    def _create_parameter_specification(self, name: str, spec: Dict[str, Any]) -> ParameterSpecification:
        """Create a ParameterSpecification from configuration data"""
        
        # Extract ranges and convert to proper format
        ranges = {}
        if 'ranges' in spec:
            for range_name, range_values in spec['ranges'].items():
                if isinstance(range_values, (list, tuple)):
                    ranges[range_name] = [float(v) for v in range_values]
                else:
                    ranges[range_name] = [float(range_values)]
        
        # Determine min/max values
        min_value = None
        max_value = None
        
        # Check for explicit min/max in ranges
        if ranges:
            all_values = []
            for range_vals in ranges.values():
                all_values.extend(range_vals)
            if all_values:
                min_value = min(all_values)
                max_value = max(all_values)
        
        return ParameterSpecification(
            name=name,
            measurement_type=spec.get('measurement_type', name),
            unit=spec.get('unit', ''),
            data_type=ProtocolDataType.from_string(spec.get('data_type', 'REAL')),
            precision=spec.get('precision', 2),
            ranges=ranges,
            description=spec.get('description', f'{name} parameter'),
            min_value=min_value,
            max_value=max_value,
            access_mode=spec.get('access_mode', 'read'),
            calibration_frequency=spec.get('calibration_frequency'),
            measurement_principle=spec.get('measurement_principle'),
            regulatory_requirement=spec.get('regulatory_requirement', False),
            safety_related=spec.get('safety_related', False)
        )
    
    def get_parameter_spec(self, parameter_name: str) -> Optional[ParameterSpecification]:
        """Get parameter specification by name"""
        return self._parameters.get(parameter_name)
    
    def get_all_parameter_names(self) -> List[str]:
        """Get list of all available parameter names"""
        return list(self._parameters.keys())
    
    def has_parameter(self, parameter_name: str) -> bool:
        """Check if parameter exists in the library"""
        return parameter_name in self._parameters
    
    def get_parameters_by_measurement_type(self, measurement_type: str) -> List[ParameterSpecification]:
        """Get all parameters that match a specific measurement type"""
        return [
            spec for spec in self._parameters.values()
            if spec.measurement_type == measurement_type
        ]
    
    def get_parameters_by_data_type(self, data_type: ProtocolDataType) -> List[ParameterSpecification]:
        """Get all parameters that match a specific data type"""
        return [
            spec for spec in self._parameters.values()
            if spec.data_type == data_type
        ]
    
    def get_sensor_parameters(self) -> List[ParameterSpecification]:
        """Get all parameters typically used as sensors (read-only or read-write)"""
        return [
            spec for spec in self._parameters.values()
            if spec.access_mode in ['read', 'read_write']
        ]
    
    def get_actuator_parameters(self) -> List[ParameterSpecification]:
        """Get all parameters typically used as actuators (write or read-write)"""
        return [
            spec for spec in self._parameters.values()
            if spec.access_mode in ['write', 'read_write'] and 
            spec.measurement_type in ['pump_speed', 'valve_position', 'mixer_speed', 'dose_rate']
        ]
    
    def get_data_quality_rules(self) -> Dict[str, Any]:
        """Get data quality validation rules"""
        return self._data_quality_rules
    
    def get_alarm_priorities(self) -> Dict[str, Any]:
        """Get alarm priority configuration"""
        return self._alarm_priorities
    
    def reload(self) -> None:
        """Reload parameter library from configuration file"""
        self._parameters.clear()
        self._data_quality_rules.clear()
        self._alarm_priorities.clear()
        self._load_parameter_library()


# Global parameter library instance
_parameter_library: Optional[ParameterLibrary] = None


def get_parameter_library(config_path: Optional[str] = None) -> ParameterLibrary:
    """
    Get the global parameter library instance.
    
    Args:
        config_path: Path to parameters.yaml file. Only used on first call.
        
    Returns:
        ParameterLibrary instance
    """
    global _parameter_library
    if _parameter_library is None:
        _parameter_library = ParameterLibrary(config_path)
    return _parameter_library


def get_parameter_spec(parameter_name: str) -> Optional[ParameterSpecification]:
    """Convenience function to get parameter specification"""
    return get_parameter_library().get_parameter_spec(parameter_name)