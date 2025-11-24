# Exception Handling Best Practices for Hydros Backend

## Overview

This guide provides patterns for replacing broad `except Exception` handlers with specific exception types. The analysis identified 77 instances of broad exception handling that should be replaced.

## Why Specific Exceptions Matter

### Problems with Broad Exception Handling

```python
# ❌ BAD: Catches everything, including KeyboardInterrupt, SystemExit
try:
    result = dangerous_operation()
except Exception as e:
    logger.error(f"Error: {e}")
    return None
```

**Issues:**
- Masks programming errors (AttributeError, TypeError, etc.)
- Makes debugging difficult
- Can hide critical failures
- Security risk: unexpected exceptions not handled properly

### Benefits of Specific Exceptions

```python
# ✅ GOOD: Catches expected errors, lets unexpected ones propagate
try:
    result = dangerous_operation()
except (ConnectionError, TimeoutError) as e:
    logger.error(f"Connection failed: {e}")
    return None
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise
```

**Benefits:**
- Clear intent about what can go wrong
- Programming errors propagate (good for debugging)
- Better error messages
- Easier to maintain

---

## Common Patterns and Replacements

### Pattern 1: Configuration Loading

#### Before (Broad)
```python
# backend/core/digital_twin.py:155
try:
    with open(file_path, "r") as f:
        config = yaml.safe_load(f)
except Exception as e:
    self.logger.error(f"Failed to load site configuration: {e}")
    raise
```

#### After (Specific)
```python
try:
    with open(file_path, "r") as f:
        config = yaml.safe_load(f)
except FileNotFoundError as e:
    self.logger.error(f"Configuration file not found: {file_path}")
    raise
except PermissionError as e:
    self.logger.error(f"Permission denied reading {file_path}: {e}")
    raise
except yaml.YAMLError as e:
    self.logger.error(f"Invalid YAML in {file_path}: {e}")
    raise ValueError(f"Configuration file is invalid: {e}") from e
except OSError as e:
    self.logger.error(f"OS error reading {file_path}: {e}")
    raise
```

---

### Pattern 2: Network/Protocol Operations

#### Before (Broad)
```python
# backend/protocols/modbus_handler.py:393
try:
    response = self.client.read_holding_registers(address, count)
    return response.registers
except Exception as e:
    self.logger.error(f"Exception reading {parameter_id}: {e}")
    return None
```

#### After (Specific)
```python
try:
    response = self.client.read_holding_registers(address, count, unit=self.unit_id)

    if response.isError():
        raise IOError(f"Modbus error response: {response}")

    return response.registers

except ConnectionError as e:
    self.logger.error(f"Connection lost while reading {parameter_id}: {e}")
    raise
except TimeoutError as e:
    self.logger.error(f"Timeout reading {parameter_id}: {e}")
    raise
except (IOError, OSError) as e:
    self.logger.error(f"I/O error reading {parameter_id}: {e}")
    raise
except AttributeError as e:
    # Programming error - response object is invalid
    self.logger.critical(f"Invalid response object for {parameter_id}: {e}")
    raise
```

---

### Pattern 3: MQTT Operations

#### Before (Broad)
```python
# backend/protocols/mqtt_handler.py:196
try:
    self.client.connect(self.broker_host, self.broker_port)
    self.logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")
except Exception as e:
    self.logger.error(f"Failed to connect to MQTT broker: {e}")
    raise
```

#### After (Specific)
```python
try:
    result = self.client.connect(self.broker_host, self.broker_port, keepalive=60)

    if result != 0:
        raise ConnectionError(f"MQTT connection failed with code: {result}")

    self.logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")

except socket.gaierror as e:
    self.logger.error(f"DNS resolution failed for {self.broker_host}: {e}")
    raise ConnectionError(f"Could not resolve MQTT broker address: {self.broker_host}") from e
except socket.timeout as e:
    self.logger.error(f"Connection timeout to {self.broker_host}:{self.broker_port}")
    raise TimeoutError(f"MQTT broker connection timeout") from e
except ConnectionRefusedError as e:
    self.logger.error(f"Connection refused by {self.broker_host}:{self.broker_port}")
    raise
except OSError as e:
    self.logger.error(f"Network error connecting to MQTT broker: {e}")
    raise ConnectionError(f"MQTT connection failed: {e}") from e
```

---

### Pattern 4: Protocol Registry Operations

#### Before (Broad)
```python
# backend/protocols/protocol_registry.py:196
try:
    handler = handler_class(*args, **kwargs)
    self.logger.info(f"Created handler {handler_id} of type {protocol_type}")
    return handler
except Exception as e:
    self.logger.error(f"Failed to create handler {handler_id}: {e}")
    return None
```

#### After (Specific)
```python
try:
    handler = handler_class(*args, **kwargs)
    self.logger.info(f"Created handler {handler_id} of type {protocol_type}")
    return handler

except TypeError as e:
    # Wrong arguments passed to handler constructor
    self.logger.error(
        f"Invalid arguments for handler {handler_id}: {e}\n"
        f"Args: {args}, Kwargs: {kwargs}"
    )
    raise ValueError(f"Handler {handler_id} initialization failed: invalid arguments") from e

except ValueError as e:
    # Invalid configuration values
    self.logger.error(f"Invalid configuration for handler {handler_id}: {e}")
    raise

except (ImportError, AttributeError) as e:
    # Handler class not found or invalid
    self.logger.error(f"Handler class {handler_class} is invalid: {e}")
    raise RuntimeError(f"Cannot create handler {handler_id}: handler class is invalid") from e

except (ConnectionError, IOError) as e:
    # Connection issues during initialization
    self.logger.error(f"Connection failed while creating handler {handler_id}: {e}")
    raise
```

---

### Pattern 5: Data Validation

#### Before (Broad)
```python
# backend/core/config_validator.py:86
try:
    validate(instance=config, schema=self.site_schema)
    return True
except Exception as e:
    self.logger.error(f"Validation failed: {e}")
    return False
```

#### After (Specific)
```python
from jsonschema import ValidationError, SchemaError

try:
    validate(instance=config, schema=self.site_schema)
    self.logger.debug("Configuration validation successful")
    return True

except ValidationError as e:
    # Configuration doesn't match schema
    self.logger.error(
        f"Configuration validation failed:\n"
        f"  Path: {'.'.join(str(p) for p in e.path)}\n"
        f"  Error: {e.message}"
    )
    return False

except SchemaError as e:
    # Schema itself is invalid (programming error)
    self.logger.critical(f"Invalid validation schema: {e}")
    raise RuntimeError("Configuration schema is invalid") from e

except TypeError as e:
    # Config is not the right type (e.g., not a dict)
    self.logger.error(f"Configuration has invalid type: {e}")
    return False
```

---

## Exception Hierarchy Reference

### File System Exceptions
```python
try:
    # File operations
    pass
except FileNotFoundError:
    # File doesn't exist
    pass
except PermissionError:
    # No permission to access file
    pass
except IsADirectoryError:
    # Expected file, got directory
    pass
except OSError:
    # Other OS-level errors (disk full, etc.)
    pass
```

### Network Exceptions
```python
import socket

try:
    # Network operations
    pass
except ConnectionError:
    # Base class for connection errors
    pass
except ConnectionRefusedError:
    # Server refused connection
    pass
except ConnectionResetError:
    # Connection reset by peer
    pass
except socket.timeout:
    # Operation timed out
    pass
except socket.gaierror:
    # DNS resolution failed
    pass
except OSError:
    # Lower-level network errors
    pass
```

### YAML Exceptions
```python
import yaml

try:
    yaml.safe_load(content)
except yaml.YAMLError:
    # YAML parsing failed
    pass
except yaml.scanner.ScannerError:
    # Specific scanning error
    pass
except yaml.parser.ParserError:
    # Specific parsing error
    pass
```

### JSON Schema Exceptions
```python
from jsonschema import ValidationError, SchemaError

try:
    validate(data, schema)
except ValidationError:
    # Data doesn't match schema
    pass
except SchemaError:
    # Schema itself is invalid
    pass
```

---

## Implementation Checklist

For each broad exception handler to replace:

- [ ] Identify what operations are performed in the try block
- [ ] List all possible exceptions those operations can raise
- [ ] Determine which exceptions are expected/recoverable
- [ ] Replace `except Exception` with specific exception types
- [ ] Add appropriate error messages for each exception type
- [ ] Consider adding `finally` block for cleanup if needed
- [ ] Update error logging to include relevant context
- [ ] Document expected exceptions in function docstring

---

## Priority Files to Fix

Based on the analysis, prioritize these files:

1. **`backend/main.py`** - 6 instances
   - System initialization and startup
   - Critical for overall system stability

2. **`backend/protocols/modbus_handler.py`** - Multiple instances
   - Network operations
   - High frequency of calls

3. **`backend/protocols/mqtt_handler.py`** - Multiple instances
   - Real-time communication
   - Critical for data flow

4. **`backend/core/digital_twin.py`** - Multiple instances
   - Core functionality
   - State management

5. **`backend/protocols/protocol_registry.py`** - Multiple instances
   - Handler creation and management
   - Affects all protocols

---

## Testing Exception Handling

### Unit Test Example

```python
def test_load_configuration_file_not_found():
    """Test that FileNotFoundError is raised for missing file."""
    service = ConfigurationService()

    with pytest.raises(FileNotFoundError):
        service.load_site_configuration("nonexistent-site")


def test_load_configuration_invalid_yaml():
    """Test that ValueError is raised for invalid YAML."""
    # Create invalid YAML file
    with open("test.yaml", "w") as f:
        f.write("invalid: yaml: content:")

    service = ConfigurationService()

    with pytest.raises(ValueError, match="Configuration file is invalid"):
        service.load_configuration("test.yaml")


def test_modbus_connection_refused():
    """Test connection refused error handling."""
    handler = ModbusHandler(host="localhost", port=9999)

    with pytest.raises(ConnectionRefusedError):
        handler.connect()
```

---

## Migration Strategy

### Phase 1: Critical Paths
- main.py system initialization
- Protocol handlers (modbus, mqtt)
- Configuration loading

### Phase 2: Core Modules
- DigitalTwin operations
- Protocol registry
- Config validator

### Phase 3: Supporting Modules
- Simulation engine
- Gateway operations
- Utility functions

### Phase 4: Integration Testing
- Test each replaced handler
- Verify error messages are helpful
- Ensure failures are caught appropriately

---

## References

- Python Exception Hierarchy: https://docs.python.org/3/library/exceptions.html
- PEP 3151: Reworking the OS and IO exception hierarchy
- Best Practices: https://realpython.com/python-exceptions/
