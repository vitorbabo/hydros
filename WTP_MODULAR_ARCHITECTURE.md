# Modular Water Treatment Plant Architecture

## Overview

This document describes the enhanced modular architecture for simulating comprehensive water treatment plants (WTPs). The system has been expanded from 2 simple sensors to a full industrial-scale simulation with 50+ parameters across 9 treatment stages.

## Enhanced Features

### 1. Comprehensive Process Simulation
- **9 Treatment Stages**: From raw water intake to finished water storage
- **50+ Parameters**: Sensors, actuators, and status indicators
- **Realistic Process Interactions**: Upstream processes affect downstream performance
- **Equipment Behavior Simulation**: Wear patterns, maintenance cycles, and failure modes

### 2. Modular Component Architecture
- **Component Factory Pattern**: Build different WTP configurations from templates
- **YAML Configuration**: Define site-specific parameters and module selections
- **Scalable Design**: Easy to add new treatment processes and equipment types
- **Template-Based**: Reusable component definitions for different plant sizes

### 3. Industrial-Grade Data Model
- **Standardized Measurements**: Following water industry conventions
- **Quality Indicators**: Data quality assessment and sensor health monitoring
- **Process Control Logic**: Realistic control strategies for chemical dosing and equipment operation
- **Alarm Management**: Configurable alarms and alert definitions

## Architecture Components

### Core Files

```
plc-sim/
├── simulator.py              # Main simulation engine
├── wtp_components.py         # Component definitions and simulation logic
├── component_factory.py      # Factory for building configurations
├── wtp_config.yaml          # Site configurations and templates
└── requirements.txt         # Dependencies
```

### Key Classes

#### `WTPSimulator`
- Main simulation engine
- Manages component interactions
- Generates realistic data with process dependencies
- Handles equipment behavior and degradation

#### `ComponentFactory`
- Creates components from YAML templates
- Supports multiple site configurations
- Generates appropriate PLC tag addressing
- Handles optional vs required sensors

#### `WTPComponent`
- Represents a single treatment process unit
- Contains parameters (sensors, actuators, status)
- Defines dependencies between components
- Tracks operational state and maintenance

## Treatment Processes Simulated

### 1. Raw Water Intake
- **Sensors**: Level, flow rate, turbidity, pH, temperature, conductivity
- **Purpose**: Monitor incoming water quality and quantity

### 2. Intake Pumps (VFD Controlled)
- **Sensors**: Flow, pressure, motor current/temperature, vibration, power consumption
- **Actuators**: Pump speed control (0-100%)
- **Status**: Run/stop, alarm conditions

### 3. Coagulation/Flocculation
- **Sensors**: Tank level, pH, turbidity, temperature, alkalinity
- **Process**: Chemical mixing for particle destabilization

### 4. Chemical Dosing Systems
- **Coagulant Dosing**: Alum, ferric chloride, PAC
- **Sensors**: Tank level, dose rate, flow rate, run status
- **Actuators**: Variable dose rate based on water quality

### 5. Sedimentation (Clarifiers)
- **Sensors**: Water level, effluent turbidity, flow rate, pH
- **Process**: Gravity settling of coagulated particles

### 6. Filtration (Rapid Sand/GAC)
- **Sensors**: Differential pressure, turbidity, flow rate, water level
- **Control Logic**: Backwash initiation based on headloss or time
- **Status**: Filter in service, backwash mode, filter-to-waste

### 7. Disinfection (Chlorination)
- **Sensors**: Chlorine residual, pH, temperature, tank level
- **Actuators**: Chlorine dose rate
- **Control**: CT value calculation for pathogen inactivation

### 8. Finished Water Pumps
- **Sensors**: Flow, pressure, motor parameters, vibration
- **Actuators**: Variable speed control
- **Purpose**: Distribution system supply

### 9. Finished Water Storage
- **Sensors**: Tank level, residual chlorine, pH, temperature
- **Monitoring**: Water age, storage quality maintenance

## Process Interactions & Control Logic

### Water Quality Cascade
```
Raw Turbidity → Coagulation Effectiveness → Clarifier Performance → Filter Loading → Chlorine Demand
```

### Equipment Dependencies
- Pump performance affects downstream flow rates
- Filter differential pressure increases over time
- Chemical dosing responds to water quality changes
- Equipment wear patterns influence maintenance scheduling

### Realistic Control Strategies

#### Turbidity-Based Coagulation
```python
coagulant_dose = base_dose + (raw_turbidity - baseline) * dose_factor
# Adjusted for pH and temperature effects
```

#### Differential Pressure Filter Control
```python
if differential_pressure > 350 or runtime > 24_hours:
    initiate_backwash()
```

#### CT Value Disinfection Control
```python
required_ct = pathogen_ct_requirement(giardia=0.5, virus=6.0)
chlorine_dose = required_ct / (contact_time * ct_factor(ph, temp))
```

## Configuration System

### Site Configurations (wtp_config.yaml)

#### Small Municipal Plant (wtp-porto-01)
- **Capacity**: 50,000 m³/day
- **Modules**: 9 basic treatment units
- **Parameters**: Standard sensor suite

#### Large Regional Plant (wtp-regional-02)
- **Capacity**: 200,000 m³/day
- **Modules**: 18 advanced treatment units
- **Advanced Features**: UV disinfection, GAC filtration, fluoridation

### Module Templates
- **Intake Modules**: Raw water monitoring
- **Pump Modules**: VFD-controlled with full instrumentation
- **Chemical Treatment**: Coagulation, flocculation, pH adjustment
- **Physical Treatment**: Sedimentation, filtration, advanced processes
- **Disinfection**: Chlorination, UV, combined systems
- **Storage**: Finished water quality maintenance

## Data Model Enhancements

### Expanded Measurements
```python
# Water Quality
turbidity, ph, temperature, dissolved_oxygen, conductivity,
chlorine_residual, alkalinity, total_organic_carbon

# Physical Parameters  
level, flow_rate, pressure, differential_pressure

# Equipment Health
motor_current, motor_temperature, vibration, power_consumption

# Process Control
chemical_dose_rate, pump_speed, valve_position

# Status/Alarms
run_status, alarm_status, maintenance_mode
```

### PLC Tag Generation
- **Realistic Addressing**: DB1.DBW100, DB2.DBX100.0 format
- **Automatic Sequencing**: Factory generates unique addresses
- **Type-Appropriate**: Words for analog, bits for digital

### Quality Assessment
- **Range Checking**: Parameters validated against realistic ranges
- **Change Rate Limiting**: Detect sensor freezing or unrealistic changes
- **Process Consistency**: Cross-validate related parameters

## Usage Examples

### Running Different Configurations
```bash
# Small municipal plant (default)
SITE_ID=wtp-porto-01 python simulator.py

# Large regional plant
SITE_ID=wtp-regional-02 python simulator.py
```

### Real-Time Monitoring Output
```
[14:25:30] Published 52 observations (seq: 15)
Key Parameters: Raw Turbidity: 8.45 NTU | Clarifier Turbidity: 2.12 NTU | 
Filter Turbidity: 0.087 NTU | Chlorine Residual: 1.23 mg/L | Intake Flow: 42.3 m3/h
```

### Data Volume
- **wtp-porto-01**: 44 parameters per cycle, ~1,300 observations/hour
- **wtp-regional-02**: 78 parameters per cycle, ~2,300 observations/hour

## Benefits of Modular Architecture

### 1. Scalability
- Easy addition of new treatment processes
- Support for different plant sizes and configurations
- Flexible sensor and actuator combinations

### 2. Realism
- Industry-standard measurements and units
- Realistic process interactions and control logic
- Equipment behavior patterns and maintenance cycles

### 3. Configurability
- YAML-based configuration management
- Template-driven component creation
- Environment-specific parameter tuning

### 4. Extensibility
- Plugin architecture for new module types
- Custom control strategies and alarm definitions
- Integration with external process models

## Future Enhancements

### 1. Advanced Process Models
- **Membrane Bioreactor (MBR)**: Advanced biological treatment
- **Reverse Osmosis**: Desalination and advanced purification
- **Advanced Oxidation**: Ozonation, UV/H2O2 systems
- **Biological Nutrient Removal**: Nitrogen and phosphorus removal

### 2. Predictive Maintenance
- **Equipment Degradation Models**: Realistic wear patterns
- **Failure Mode Simulation**: Pump cavitation, filter breakthrough
- **Maintenance Scheduling**: Condition-based maintenance triggers

### 3. Optimization Algorithms
- **Energy Optimization**: Pump scheduling and chemical dosing
- **Water Quality Optimization**: Multi-objective control strategies
- **Cost Minimization**: Chemical usage and energy consumption

### 4. Digital Twin Integration
- **Real-Time Calibration**: Model updating from actual plant data
- **Scenario Planning**: What-if analysis for process changes
- **Operator Training**: Interactive simulation environment

This modular architecture provides a foundation for realistic water treatment plant simulation, supporting everything from small municipal facilities to large regional treatment centers with advanced processes and comprehensive instrumentation.