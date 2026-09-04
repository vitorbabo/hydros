# Exception Handling

Broad `except Exception` handlers are the dominant error-handling pattern in the
backend. They swallow programming errors (`AttributeError`, `TypeError`) along
with the operational ones they were written for, which turns a crash into a
silently wrong reading. This page is the reference for narrowing them.

## The rule

Catch what you can actually handle; let the rest propagate.

```python
# Catches everything, including KeyboardInterrupt and SystemExit.
try:
    result = dangerous_operation()
except Exception as e:
    logger.error(f"Error: {e}")
    return None

# Catches expected failures; a typo in the call still raises.
try:
    result = dangerous_operation()
except (ConnectionError, TimeoutError) as e:
    logger.error(f"Connection failed: {e}")
    return None
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise
```

## Patterns by subsystem

### Configuration loading

`FileNotFoundError`, `PermissionError`, `yaml.YAMLError`, `OSError`. Wrap a YAML
parse failure in `ValueError` with `from e` so the caller sees an invalid-config
error rather than a parser internal.

```python
try:
    with open(file_path) as f:
        config = yaml.safe_load(f)
except FileNotFoundError:
    self.logger.error(f"Configuration file not found: {file_path}")
    raise
except yaml.YAMLError as e:
    raise ValueError(f"Configuration file is invalid: {e}") from e
except (PermissionError, OSError) as e:
    self.logger.error(f"Cannot read {file_path}: {e}")
    raise
```

### Protocol I/O (Modbus, MQTT)

`ConnectionError`, `TimeoutError`, `IOError`/`OSError`. Turn an error *response*
into an exception rather than returning it — `response.isError()` is not an
exception, so it slips past every handler.

Treat `AttributeError` here as a programming error: log at `critical` and
re-raise rather than folding it into the retry path.

### Per-record parsing in a batch

When parsing many records, the `try` belongs **inside** the loop. A single
malformed record must not empty the whole response — see
`InfluxDBQueryService._query_latest_observations_uncached`, where the outer
`try` covers only the query and each record is guarded individually.

### Async task bodies

An exception escaping a bare `asyncio.create_task` body is swallowed until the
task is awaited. Catch `asyncio.CancelledError` separately and re-raise it —
never let a broad handler treat cancellation as a failure to retry.

## Exception reference

| Exception | Raised by |
|-----------|-----------|
| `FileNotFoundError` / `PermissionError` / `OSError` | filesystem access |
| `yaml.YAMLError` | YAML parsing |
| `json.JSONDecodeError` | JSON parsing |
| `ConnectionError` / `TimeoutError` | network and protocol I/O |
| `KeyError` / `ValueError` / `TypeError` | usually a bug — let it propagate |
| `asyncio.CancelledError` | task cancellation — re-raise, never suppress |

## Narrowing an existing handler

1. Find what the guarded block can actually raise (read the library, don't guess).
2. Split the handler by what the caller should do about each case.
3. Add a test that triggers each branch — `test_modbus_handler.py` covers the
   error-response and exception paths for reads and writes.
4. If a case is genuinely unrecoverable and must not kill the process, keep a
   broad handler but log at `exception` level so the traceback survives.

## Priority

Handlers on the hot path first, since those are the ones that silently corrupt
live readings: `protocols/modbus_handler.py`, `protocols/mqtt_handler.py`,
`services/influxdb_query_service.py`, then `core/digital_twin.py` and
`core/config_validator.py`.
