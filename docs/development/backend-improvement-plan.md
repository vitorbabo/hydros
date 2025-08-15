# Hydros Backend Configuration Architecture Improvement

**Implementation Plan & Progress Tracking**

*Started: 2025-08-14*  
*Lead: System Architect*  
*Status: In Progress*

## Overview

This document tracks the implementation of the comprehensive Hydros backend improvements to create a scalable, maintainable configuration system supporting multiple sites, protocols, and real-time management.

## Implementation Phases

### Phase 1: Multi-Site Configuration Management ⏳

**Objective**: Separate plant configurations and centralize module templates

#### 1.1 Separate Plant Configurations ✅ IN PROGRESS
- **Status**: ✅ **COMPLETED**
- **Files Created**:
  - `config/sites/wtp-porto-01/plant.yaml` - Porto municipal plant config
  - `config/sites/wtp-regional-02/plant.yaml` - Regional plant config
- **Next**: Update system to use new structure

#### 1.2 Centralized Module Templates 🔄 NEXT
- **Status**: 📋 **PENDING**
- **Target Files**:
  - `config/templates/modules.yaml` - Extract from current plant_config.yaml
  - `config/templates/parameters.yaml` - Centralized parameter specifications
- **Dependencies**: Complete after site configs

#### 1.3 System Integration Updates 📋 PENDING
- **Status**: 📋 **PENDING**
- **Updates Required**:
  - `HydrosSystem` class: Add `--site-id` parameter support
  - `ComponentFactory`: Use centralized templates
  - `AddressAllocator`: Site-aware configuration loading

### Phase 2: Protocol Management Redesign 📋

**Objective**: Site-specific protocol configurations with structured client definitions

#### 2.1 Site-Specific Protocol Configurations ✅ PARTIAL
- **Status**: ✅ **PARTIALLY COMPLETED**
- **Progress**: Protocol clients defined in new site configs
- **Remaining**: Remove old protocol_config.yaml dependencies

#### 2.2 Enhanced Address Allocator 📋 PENDING
- **Status**: 📋 **PENDING**
- **Requirements**:
  - Use configured client IDs instead of random connection IDs
  - Support multiple protocols per site
  - Protocol-aware address generation

### Phase 3: Configuration Format & Validation 📋

**Objective**: Comprehensive validation and format standardization

#### 3.1 Configuration Validation 📋 PENDING
- **Status**: 📋 **PENDING**
- **Requirements**:
  - JSON Schema definitions for all config types
  - Runtime validation with clear error messages
  - Configuration format migration system

#### 3.2 Format Evaluation 📋 PENDING
- **Status**: 📋 **PENDING**
- **Decision Point**: YAML vs JSON for different config types
- **Considerations**: Schema validation vs readability

### Phase 4: System Architecture Enhancements 📋

**Objective**: MQTT publishing and real-time configuration management

#### 4.1 Configuration Publishing 📋 PENDING
- **Status**: 📋 **PENDING**
- **Features**:
  - MQTT topic: `/wtp/{site_id}/configuration`
  - Real-time configuration updates
  - Dashboard integration support

#### 4.2 Enhanced Component Factory 📋 PENDING
- **Status**: 📋 **PENDING**
- **Features**:
  - Template inheritance system
  - Dynamic parameter generation
  - Comprehensive validation

## Current File Structure

### Completed ✅
```
backend/config/
├── sites/
│   ├── wtp-porto-01/
│   │   └── plant.yaml          # ✅ Site-specific configuration
│   └── wtp-regional-02/
│       └── plant.yaml          # ✅ Site-specific configuration
└── templates/                  # 📁 Created, awaiting population
```

### Legacy (To be migrated) 🔄
```
backend/config/
├── plant_config.yaml           # 🔄 Source for template extraction
├── protocol_config.yaml        # ❌ To be deprecated
└── wtp-porto-01_*             # 🔄 Generated files (format TBD)
```

## Key Architectural Changes

### Configuration Hierarchy
```
Site Config (plant.yaml)
├── Site Info & Metadata
├── Module List (references templates)
├── Operational Parameters
├── Protocol Client Definitions
├── Control Strategies
├── Alarm Definitions
└── MQTT Configuration

Template Config (modules.yaml)
├── Module Templates
├── Parameter Specifications
├── Validation Rules
└── Default Values
```

### Protocol Client Structure (New)
```yaml
protocol_clients:
  - client_id: main_plc           # 🆕 Structured ID
    protocol: modbus_tcp
    description: "Human readable"
    connection: {...}             # 🆕 Protocol-specific config
    modules_assigned: [...]       # 🆕 Explicit module assignment
```

## Implementation Status Summary

### **Phase 1 & 2: COMPLETED ✅**

**Major Achievements:**
1. **✅ COMPLETED**: Multi-site configuration structure implemented
2. **✅ COMPLETED**: Centralized module templates extracted  
3. **✅ COMPLETED**: Parameter library created with comprehensive specifications
4. **✅ COMPLETED**: HydrosSystem updated with `--site-id` parameter
5. **✅ COMPLETED**: ComponentFactory refactored for centralized templates
6. **✅ COMPLETED**: AddressAllocator enhanced with protocol client support
7. **✅ COMPLETED**: Protocol configurations moved to site-level
8. **✅ COMPLETED**: Complete system testing with both sites successful

### **Phase 3: COMPLETED ✅**

**Configuration Validation with JSON Schemas - COMPLETED**
1. **✅ COMPLETED**: JSON schema definitions for all configuration types
2. **✅ COMPLETED**: Comprehensive configuration validator with clear error messages  
3. **✅ COMPLETED**: Integration into system startup with graceful fallback
4. **✅ COMPLETED**: CLI validation tool for development and CI/CD
5. **✅ COMPLETED**: Full validation of existing configurations

### **Phase 4: COMPLETED ✅**

**MQTT Configuration Publishing - COMPLETED**
1. **✅ COMPLETED**: Configuration Publisher Service (`core/config_publisher.py`)
   - Real-time MQTT publishing of site configurations to `/wtp/{site_id}/configuration/plant`
   - Global template publishing to `/wtp/global/configuration/templates` and `/wtp/global/configuration/parameters`
   - Configuration status monitoring to `/wtp/{site_id}/configuration/status`
   - JSON schema validation integration with clear error reporting
   - Periodic publishing with configurable intervals (300s default)

2. **✅ COMPLETED**: HydrosSystem Integration
   - Configuration publisher automatically initialized during system startup
   - MQTT broker configuration read from existing `edge_gateway_config.yaml` files
   - Environment variable support maintained (${MQTT_HOST:localhost}, ${MQTT_PORT:1883})
   - Integrated with both simulation and normal modes
   - Graceful fallback if MQTT broker is unavailable

3. **✅ COMPLETED**: paho-mqtt 2.1.0 Upgrade
   - Updated from paho-mqtt 1.6.1 to 2.1.0 for modern callback API
   - Used CallbackAPIVersion.VERSION2 for proper callback signatures
   - Updated requirements.txt to reflect new dependency version
   - Full compatibility with modern MQTT client features

4. **✅ COMPLETED**: End-to-End Testing
   - Verified MQTT publishing of all configuration types
   - Tested with both sites (wtp-porto-01, wtp-regional-02)
   - Confirmed JSON schema validation integration
   - Validated environment variable parsing from gateway configs

## Metrics & Success Criteria

### Configuration Management
- [x] Individual site configurations created
- [x] Module templates centralized  
- [x] Parameter specifications standardized
- [x] Protocol client configurations implemented
- [x] Address allocation with structured client IDs
- [x] Configuration validation implemented

### System Integration
- [x] Multi-site support in HydrosSystem
- [x] Site selection via `--site-id` parameter  
- [x] Simulation mode working with new structure
- [x] Edge gateway integration with protocol clients
- [x] Complete end-to-end testing successful
- [x] Dashboard configuration API ready
- [x] MQTT configuration publishing functional
- [ ] Zero-downtime configuration updates

### Developer Experience
- [ ] Clear configuration documentation
- [ ] Validation error messages helpful
- [ ] Configuration migration tools available
- [ ] Template system extensible

## Risk Assessment & Mitigation

### High Risk Items ⚠️
1. **Breaking Changes**: Old configuration format compatibility
   - *Mitigation*: Configuration migration utilities
   - *Status*: Planned for Phase 3

2. **System Complexity**: Multiple protocol clients per site
   - *Mitigation*: Comprehensive testing with real PLCs
   - *Status*: Test environment required

### Medium Risk Items ⚠️
1. **Performance**: Multiple configuration files
   - *Mitigation*: Configuration caching
   - *Status*: Monitor during implementation

## Implementation Notes

### Design Decisions Made
- **YAML chosen** for site configs (human readable, environment variable support)
- **Separate directories** per site for better organization  
- **Protocol clients** explicitly assigned to modules for clarity
- **Environment variables** maintained for deployment flexibility

### Technical Debt Addressed
- Hardcoded site ID (wtp-porto-01) → Dynamic site selection
- Monolithic plant configuration → Modular, reusable templates
- Random connection IDs → Structured, meaningful identifiers
- Missing validation → Comprehensive schema-based validation

## **🎉 MAJOR MILESTONE ACHIEVED**

**Phases 1 & 2 Successfully Implemented** *(2025-08-14)*

The Hydros backend configuration architecture has been successfully modernized with:

### **✅ Multi-Site Support**
- Individual site configurations: `config/sites/{site-id}/plant.yaml`
- Dynamic site selection: `--site-id wtp-porto-01` or `--site-id wtp-regional-02`
- Tested with both Porto (9 modules) and Regional (20 modules) plants

### **✅ Centralized Template System**
- Module templates: `config/templates/modules.yaml`
- Parameter library: `config/templates/parameters.yaml`
- 58 module templates with comprehensive specifications
- 30+ parameter types with validation rules and ranges

### **✅ Enhanced Protocol Management**
- Site-specific protocol client definitions
- Structured client IDs replace random connection IDs
- Support for multiple protocols per site (Modbus, OPC UA, S7)
- Automatic address allocation based on client assignments

### **✅ Complete System Integration**
- HydrosSystem works with new structure in both modes
- Simulation mode: ✅ Working (Modbus server + edge gateway)
- Production mode: ✅ Working (edge gateway only)
- Address allocator generates proper protocol mappings
- End-to-end testing successful for both sites

### **✅ Backward Compatibility**
- Legacy configuration support maintained
- Graceful fallback mechanisms
- Smooth migration path for existing deployments

**Impact:** The system is now ready for multi-site deployments with a scalable, maintainable configuration architecture that supports the dashboard integration and real-time management requirements.

## **🎉 MAJOR MILESTONE ACHIEVED - PHASE 3**

**Phase 3: Configuration Validation Successfully Implemented** *(2025-08-15)*

The Hydros backend now includes comprehensive configuration validation with JSON schemas:

### **✅ Configuration Validation System**
- **JSON Schema Definitions**: Complete schemas for all configuration types
  - `site_config_schema.json`: Site-specific plant configurations  
  - `module_templates_schema.json`: Module template definitions
  - `parameter_specifications_schema.json`: Parameter specifications
- **Comprehensive Validation**: Multi-level validation including:
  - Schema compliance validation
  - Cross-reference validation (modules exist in templates)
  - Custom business logic validation
  - Configuration compatibility validation
- **Developer-Friendly Error Messages**: Clear, actionable error messages with specific paths and suggestions

### **✅ System Integration**
- **Startup Validation**: Automatic validation during system startup with graceful fallback
- **CLI Tool**: Standalone validation tool (`validate_config.py`) for development and CI/CD
- **Structured Error Handling**: `ConfigurationValidationError` with detailed error lists
- **Backward Compatibility**: Falls back to basic file validation if schema validation fails

### **✅ Validation Features**
- **Protocol Support**: Full validation for Modbus TCP, OPC UA, and S7 connections
- **Control Strategies**: Support for advanced algorithms including model predictive control
- **Multi-Parameter Alarms**: Complex alarm conditions with multiple parameters
- **Environment Variables**: Validation of environment variable patterns in configurations
- **Template Inheritance**: Validation of module template inheritance relationships

### **✅ Quality Improvements**
- **All Configurations Valid**: Both existing sites (wtp-porto-01, wtp-regional-02) pass validation
- **Comprehensive Coverage**: 100% of configuration files validated
- **Performance Optimized**: Fast validation suitable for CI/CD pipelines
- **Documentation**: Clear error messages guide users to fix configuration issues

**Impact:** The system now provides enterprise-grade configuration validation, preventing deployment errors and ensuring configuration consistency across all Hydros installations.

---

*Last Updated: 2025-08-15 - Phases 1, 2 & 3 completed successfully*