/**
 * Zod schemas for validating MQTT messages and configurations.
 * This provides runtime type safety and helps catch malformed data early.
 */
import { z } from "zod";

// ============================================================================
// Common Validators
// ============================================================================

/**
 * ISO 8601 timestamp validator that accepts:
 * - Timestamps with Z suffix: 2026-01-17T18:23:32Z
 * - Timestamps with milliseconds: 2026-01-17T18:23:32.123Z
 * - Timestamps with microseconds: 2026-01-17T18:23:32.123456Z
 * - Timestamps with timezone offset: 2026-01-17T18:23:32.123456+00:00
 */
const iso8601Timestamp = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/,
    { message: "Invalid timestamp format - must be ISO 8601" },
  );

// ============================================================================
// Observation Schema
// ============================================================================

export const ObservationSchema = z.object({
  site_id: z.string().min(1, "Site ID is required"),
  asset_id: z.string().min(1, "Asset ID is required"),
  sensor_id: z.string().min(1, "Sensor ID is required"),
  measurement: z.string().min(1, "Measurement type is required"),
  ts: iso8601Timestamp,
  value: z.number().finite("Value must be a finite number"),
  unit: z.string().min(1, "Unit is required"),
  quality: z.enum(["good", "uncertain", "bad"], {
    errorMap: () => ({
      message: "Quality must be 'good', 'uncertain', or 'bad'",
    }),
  }),
  raw_tag: z.string().optional(),
  source: z.string().optional(),
  seq: z.number().int().nonnegative().optional(),
  parameter_type: z.string().optional(),
  component_type: z.string().optional(),
});

export type Observation = z.infer<typeof ObservationSchema>;

// ============================================================================
// Configuration Schemas
// ============================================================================

export const SiteInfoSchema = z.object({
  site_id: z.string().min(1),
  name: z.string().min(1),
  design_capacity: z.number().positive(),
  location: z
    .object({
      region: z.string().optional(),
      country: z.string().optional(),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
});

export const ProtocolClientSchema = z.object({
  client_id: z.string().min(1),
  protocol: z.enum(["modbus_tcp", "opcua", "s7", "mqtt"]),
  connection: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    unit_id: z.number().int().nonnegative().optional(),
    timeout: z.number().positive().optional(),
    retry_count: z.number().int().nonnegative().optional(),
  }),
  modules_assigned: z.array(z.string()),
});

export const PlantConfigSchema = z.object({
  site_info: SiteInfoSchema,
  modules: z.array(z.string().min(1)),
  operational_parameters: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  protocol_clients: z.array(ProtocolClientSchema).optional(),
  control_strategies: z.record(z.any()).optional(),
  alarm_definitions: z.record(z.any()).optional(),
});

export type PlantConfig = z.infer<typeof PlantConfigSchema>;

// ============================================================================
// Module Template Schema
// ============================================================================

export const ModuleTemplateSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  required_sensors: z.array(z.string()),
  optional_sensors: z.array(z.string()).optional(),
  actuators: z.array(z.string()).optional(),
  alarms: z.array(z.any()).optional(),
  maintenance_schedule: z.record(z.any()).optional(),
});

export const ModuleTemplatesSchema = z.record(z.string(), ModuleTemplateSchema);

export type ModuleTemplate = z.infer<typeof ModuleTemplateSchema>;

// ============================================================================
// Parameter Specification Schema
// ============================================================================

export const ParameterRangeSchema = z.object({
  normal: z.tuple([z.number(), z.number()]).optional(),
  alarm_low: z.number().optional(),
  alarm_high: z.number().optional(),
  raw_water: z.tuple([z.number(), z.number()]).optional(),
  clarified: z.tuple([z.number(), z.number()]).optional(),
  filtered: z.tuple([z.number(), z.number()]).optional(),
});

export const ParameterSpecSchema = z.object({
  measurement_type: z.string().min(1),
  unit: z.string().min(1),
  data_type: z.enum([
    "BOOL",
    "INT16",
    "UINT16",
    "INT32",
    "UINT32",
    "REAL",
    "STRING",
  ]),
  precision: z.number().int().nonnegative().optional(),
  ranges: ParameterRangeSchema.optional(),
  calibration_frequency: z.string().optional(),
  maintenance_schedule: z.string().optional(),
});

export const ParameterSpecificationsSchema = z.record(
  z.string(),
  ParameterSpecSchema,
);

export type ParameterSpec = z.infer<typeof ParameterSpecSchema>;

// ============================================================================
// Configuration Message Schema
// ============================================================================

export const ConfigurationMessageSchema = z.object({
  site_id: z.string().min(1),
  config_type: z.enum([
    "plant",
    "modules",
    "templates",
    "parameters",
    "gateway",
  ]),
  version: z.string().optional(),
  timestamp: z.string().optional(),
  data: z.union([
    PlantConfigSchema,
    ModuleTemplatesSchema,
    ParameterSpecificationsSchema,
    z.record(z.any()), // For gateway config and other types
  ]),
  source: z.string().optional(),
  seq: z.number().int().nonnegative().optional(),
});

export type ConfigurationMessage = z.infer<typeof ConfigurationMessageSchema>;

// ============================================================================
// Alert Schema
// ============================================================================

export const AlertSchema = z.object({
  id: z.string(),
  site_id: z.string(),
  asset_id: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(1),
  description: z.string(),
  timestamp: iso8601Timestamp,
  status: z.enum(["active", "acknowledged", "resolved"]),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: iso8601Timestamp.optional(),
  resolvedBy: z.string().optional(),
  resolvedAt: iso8601Timestamp.optional(),
  metadata: z.record(z.any()).optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

// ============================================================================
// Helper Functions for Validation
// ============================================================================

/**
 * Validates an observation and returns typed data or throws error
 */
export function validateObservation(data: unknown): Observation {
  return ObservationSchema.parse(data);
}

/**
 * Safely validates an observation and returns result with error handling
 */
export function safeValidateObservation(data: unknown): {
  success: boolean;
  data?: Observation;
  error?: z.ZodError;
} {
  const result = ObservationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Validates a configuration message
 */
export function validateConfigurationMessage(
  data: unknown,
): ConfigurationMessage {
  return ConfigurationMessageSchema.parse(data);
}

/**
 * Safely validates a configuration message
 */
export function safeValidateConfigurationMessage(data: unknown): {
  success: boolean;
  data?: ConfigurationMessage;
  error?: z.ZodError;
} {
  const result = ConfigurationMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Validates an alert
 */
export function validateAlert(data: unknown): Alert {
  return AlertSchema.parse(data);
}

/**
 * Safely validates an alert
 */
export function safeValidateAlert(data: unknown): {
  success: boolean;
  data?: Alert;
  error?: z.ZodError;
} {
  const result = AlertSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
