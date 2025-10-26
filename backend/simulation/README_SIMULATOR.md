# Simulator Documentation

## Overview

The backend simulator has been enhanced to generate realistic sensor and instrumentation values based on the parameter specifications defined in `backend/config/templates/parameters.yaml` and validated against the schemas in `backend/config/schemas/`.

## Key Components

### 1. SimulationValueGenerator (`simulation/values_generator.py.py`)

Generates realistic values for water treatment plant sensors and actuators based on:
- Parameter specifications from the parameter library
- Module type (intake, filtration, chlorination, etc.)
- Quality target (excellent, good, acceptable, poor)
- Physical relationships between parameters
- Operating state

### 2. SimulatedPlantComponent (`simulation/components.py`)

Wraps WTP components to provide dynamic simulation behavior:
- Integrates with SimulationValueGenerator for schema-compliant values
- Maintains simulation context (temperature, flow rate, operating state)
- Falls back to legacy simulation if parameter library unavailable
- Updates values over time with realistic trends and noise

### 3. Parameter Library (`core/sensor_catalog.py`)

Loads and manages parameter specifications:
- Measurement types, units, and data types
- Min/max ranges for different contexts
- Quality indicators (excellent/good/acceptable/poor)
- Calibration and maintenance requirements
- Data quality rules and alarm priorities

## Features

### Context-Aware Simulation

Values are generated based on module type and quality target:

```python
from simulation.realistic_simulator import SimulationValueGenerator, SimulationContext

context = SimulationContext(
    module_type='filtration',      # intake, clarification, filtration, etc.
    quality_target='good',          # excellent, good, acceptable, poor
    operating=True,
    temperature=20.0,
    flow_rate=100.0
)

generator = SimulationValueGenerator()
turbidity = generator.get_initial_value('turbidity', context)
```

### Parameter Behaviors

Each parameter type has specific simulation logic:

- **Turbidity**: Spikes, gradual settling, module-specific ranges
- **pH**: Slow changes due to buffering, typical drinking water range
- **Temperature**: Daily cycles, thermal inertia
- **Flow Rate**: Demand patterns, 2-hour cycles
- **Level**: Slow fill/drain with bounce-back from limits
- **Pressure**: Pump vibration, demand effects, decay when off
- **Chlorine Residual**: Decay over time, dosing additions, zero in raw water
- **Motor Current**: Load variations, zero when not operating
- **Motor Temperature**: Heating when running, cooling when off
- **Differential Pressure**: Filter loading over time

### Physical Constraints

The simulator enforces physical constraints:
- Non-negative values for parameters that can't be negative
- Zero chlorine in raw water (before chlorination)
- Zero motor current when equipment not operating
- Bounded values within specification ranges

### Quality-Based Value Distribution

Values are distributed according to quality target:

- **Excellent**: Tight distribution (±15%) around optimal center
- **Good**: Moderate distribution (±30%) around center
- **Acceptable**: Wide distribution (±50%) around center
- **Poor**: Random with bias toward range edges

### Module-Type Specific Ranges

Parameters use appropriate ranges for module type:

| Module Type | Turbidity Range (NTU) |
|-------------|-----------------------|
| intake, raw | 0.0 - 100.0 (raw_water) |
| clarification | 0.0 - 10.0 (clarified) |
| filtration | 0.0 - 1.0 (filtered) |
| membrane | 0.0 - 0.1 (membrane_filtered) |

## Usage Examples

### Basic Usage

```python
from simulation.components import SimulatedPlantComponent
from core.plant_elements import PlantComponent

# Create WTP component
wtp_component = PlantComponent(...)

# Create simulated component with module type
sim_component = SimulatedPlantComponent(wtp_component, module_type='filtration')

# Update simulation
sim_component.update()
values = sim_component.get_parameters()
```

### Configuring Quality Target

```python
# Set quality target
sim_component.set_quality_target('excellent')

# Set operating state
sim_component.set_operating_state(True)

# Change module type
sim_component.set_module_type('chlorination')
```

### Time-Series Simulation

```python
import time

context = SimulationContext(module_type='filtration', quality_target='good')
generator = SimulationValueGenerator()

# Initial value
value = generator.get_initial_value('turbidity', context)

# Simulate over time
for i in range(100):
    context.simulation_time += 60.0  # 1 minute steps
    value = generator.simulate_value_update('turbidity', value, 60.0, context)
    print(f"t={i*60}s: {value:.2f} NTU")
    time.sleep(0.1)  # Optional: slow down for visualization
```

## Schema Compliance

All generated values comply with the schemas defined in:
- `backend/config/schemas/parameter_specifications_schema.json`
- `backend/config/schemas/module_templates_schema.json`

### Parameter Specification Schema

Each parameter has:
- **measurement_type**: Type of measurement (matches parameter key)
- **unit**: Measurement unit (e.g., NTU, pH, °C)
- **data_type**: REAL, INT, BOOL, or STRING
- **precision**: Number of decimal places (0-6)
- **ranges**: Named ranges for different contexts
- **quality_indicators**: Ranges for excellent/good/acceptable/poor
- **calibration_frequency**: Days between calibrations
- **maintenance**: Cleaning and replacement intervals
- **alarm_levels**: Low/high/emergency thresholds

### Validation

The simulator validates:
- Values are within specification ranges
- Data types match specification (REAL, INT, BOOL)
- Precision matches specification (decimal places)
- Physical constraints are enforced

## Testing

Run tests to verify realistic value generation:

```bash
cd backend
python -c "
from simulation.realistic_simulator import SimulationValueGenerator, SimulationContext
from core.sensor_catalog import get_parameter_library

param_lib = get_parameter_library()
generator = SimilationValueGenerator(param_lib)

# Test different module types
for module_type in ['intake', 'filtration', 'chlorination']:
    context = SimulationContext(module_type=module_type, quality_target='good')
    print(f'{module_type}: turbidity={generator.get_initial_value(\"turbidity\", context):.2f} NTU')
"
```

## Configuration

### Adding New Parameters

1. Add parameter specification to `backend/config/templates/parameters.yaml`:

```yaml
parameter_specifications:
  new_parameter:
    measurement_type: "new_parameter"
    unit: "units"
    data_type: "REAL"
    precision: 2
    ranges:
      normal: [0.0, 100.0]
      typical: [10.0, 50.0]
    quality_indicators:
      excellent: [20.0, 30.0]
      good: [15.0, 35.0]
```

2. Add behavior logic to `SimulationValueGenerator._apply_parameter_behavior()` if special handling needed

3. Restart the simulator - new parameter will be automatically loaded

### Adding New Module Types

Add range mappings in `SimulationValueGenerator._get_target_range()`:

```python
if "new_module" in module_lower:
    range_key = "new_module_range"
```

## Performance

- Parameter library loaded once at startup
- Specifications cached for fast lookup
- Value generation is O(1) per parameter
- No database queries required
- Suitable for real-time simulation (1000+ parameters/second)

## Future Enhancements

Potential improvements:
- Inter-parameter correlations (e.g., turbidity affects chlorine demand)
- Seasonal variations (summer/winter patterns)
- Equipment aging and fouling models
- Alarm condition simulation
- Data quality flag generation
- Historical data playback mode
