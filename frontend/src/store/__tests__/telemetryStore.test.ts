/**
 * Tests for telemetryStore
 * Demonstrates testing Zustand stores
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useTelemetryStore } from "../telemetryStore";
import type { Observation } from "../../types";

// Mirrors telemetryStore's retention window; tests age data relative to it so
// retuning the window does not silently invalidate them.
const MAX_OBSERVATION_AGE_MS = 15 * 60 * 1000;

describe("telemetryStore", () => {
  // Reset store before each test
  beforeEach(() => {
    useTelemetryStore.setState({
      latest: {},
      timeSeries: {},
      availableAssets: [],
      availableMeasurements: [],
      assetGroups: {},
      selectedAssetGroup: "all",
      selectedSensor: null,
    });
  });

  describe("addObservation", () => {
    it("adds a new observation to latest", () => {
      const observation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      useTelemetryStore.getState().addObservation(observation);

      const state = useTelemetryStore.getState();
      const sensorKey = "tank-01.level-sensor";

      expect(state.latest[sensorKey]).toBeDefined();
      expect(state.latest[sensorKey].value).toBe(5.5);
      expect(state.latest[sensorKey].quality).toBe("good");
    });

    it("updates existing observation", () => {
      const observation1: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      const observation2: Observation = {
        ...observation1,
        ts: "2025-01-01T12:01:00Z",
        value: 5.8,
      };

      useTelemetryStore.getState().addObservation(observation1);
      useTelemetryStore.getState().addObservation(observation2);

      const state = useTelemetryStore.getState();
      const sensorKey = "tank-01.level-sensor";

      expect(state.latest[sensorKey].value).toBe(5.8);
    });

    it("adds observation to time series", () => {
      const observation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      useTelemetryStore.getState().addObservation(observation);

      const state = useTelemetryStore.getState();
      const sensorKey = "tank-01.level-sensor";

      expect(state.timeSeries[sensorKey]).toBeDefined();
      expect(state.timeSeries[sensorKey].length).toBe(1);
      expect(state.timeSeries[sensorKey][0].value).toBe(5.5);
    });

    it("limits time series to MAX_TIME_SERIES_POINTS", () => {
      const baseObservation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      // Add 150 observations (MAX is 100)
      for (let i = 0; i < 150; i++) {
        const observation = {
          ...baseObservation,
          ts: new Date(Date.now() + i * 1000).toISOString(),
          value: 5.5 + i * 0.1,
        };
        useTelemetryStore.getState().addObservation(observation);
      }

      const state = useTelemetryStore.getState();
      const sensorKey = "tank-01.level-sensor";

      // Should be capped at 100
      expect(state.timeSeries[sensorKey].length).toBe(100);
    });

    it("updates availableAssets", () => {
      const observation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      useTelemetryStore.getState().addObservation(observation);

      const state = useTelemetryStore.getState();
      expect(state.availableAssets).toContain("tank-01");
    });

    it("updates availableMeasurements", () => {
      const observation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      useTelemetryStore.getState().addObservation(observation);

      const state = useTelemetryStore.getState();
      expect(state.availableMeasurements).toContain("level");
    });
  });

  describe("getLatestByAsset", () => {
    it("returns observations for specific asset", () => {
      const obs1: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      const obs2: Observation = {
        ...obs1,
        asset_id: "tank-02",
        sensor_id: "level-sensor-2",
        value: 6.5,
      };

      useTelemetryStore.getState().addObservation(obs1);
      useTelemetryStore.getState().addObservation(obs2);

      const tank01Obs = useTelemetryStore
        .getState()
        .getLatestByAsset("tank-01");

      expect(Object.keys(tank01Obs).length).toBe(1);
      expect(tank01Obs["tank-01.level-sensor"]).toBeDefined();
      expect(tank01Obs["tank-01.level-sensor"].value).toBe(5.5);
    });

    it("returns empty object for non-existent asset", () => {
      const result = useTelemetryStore
        .getState()
        .getLatestByAsset("non-existent");
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("removes stale observations", () => {
      const oldObservation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: new Date(Date.now() - 2 * MAX_OBSERVATION_AGE_MS).toISOString(), // well past the retention window
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      const recentObservation: Observation = {
        ...oldObservation,
        sensor_id: "level-sensor-2",
        ts: new Date().toISOString(), // Now
        value: 6.5,
      };

      useTelemetryStore.getState().addObservation(oldObservation);
      useTelemetryStore.getState().addObservation(recentObservation);

      // Run cleanup
      useTelemetryStore.getState().cleanup();

      const state = useTelemetryStore.getState();

      // Old observation should be removed (>5 min old)
      expect(state.latest["tank-01.level-sensor"]).toBeUndefined();

      // Recent observation should remain
      expect(state.latest["tank-01.level-sensor-2"]).toBeDefined();
    });

    it("updates derived data after cleanup", () => {
      const oldObservation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: new Date(Date.now() - 2 * MAX_OBSERVATION_AGE_MS).toISOString(),
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      useTelemetryStore.getState().addObservation(oldObservation);

      // Should have asset in availableAssets
      expect(useTelemetryStore.getState().availableAssets).toContain("tank-01");

      // Run cleanup (observation is old)
      useTelemetryStore.getState().cleanup();

      // Asset should be removed from availableAssets
      expect(useTelemetryStore.getState().availableAssets).not.toContain(
        "tank-01",
      );
    });
  });

  describe("getTimeSeriesData", () => {
    it("returns time series for sensor", () => {
      const observation: Observation = {
        site_id: "test-site",
        asset_id: "tank-01",
        sensor_id: "level-sensor",
        measurement: "level",
        ts: "2025-01-01T12:00:00Z",
        value: 5.5,
        unit: "m",
        quality: "good",
        raw_tag: "TANK01.LEVEL",
        source: "modbus",
        seq: 1,
        parameter_type: "sensor",
        component_type: "sensor",
      };

      useTelemetryStore.getState().addObservation(observation);

      const timeSeries = useTelemetryStore
        .getState()
        .getTimeSeriesData("tank-01.level-sensor");

      expect(timeSeries.length).toBe(1);
      expect(timeSeries[0].value).toBe(5.5);
    });

    it("returns empty array for non-existent sensor", () => {
      const timeSeries = useTelemetryStore
        .getState()
        .getTimeSeriesData("non-existent");
      expect(timeSeries.length).toBe(0);
    });
  });

  describe("UI state", () => {
    it("sets selected asset group", () => {
      useTelemetryStore.getState().setSelectedAssetGroup("pumps");

      expect(useTelemetryStore.getState().selectedAssetGroup).toBe("pumps");
      expect(useTelemetryStore.getState().selectedSensor).toBeNull();
    });

    it("sets selected sensor", () => {
      useTelemetryStore.getState().setSelectedSensor("tank-01.level-sensor");

      expect(useTelemetryStore.getState().selectedSensor).toBe(
        "tank-01.level-sensor",
      );
    });
  });

  describe("addObservations (batch)", () => {
    const makeObservation = (
      overrides: Partial<Observation> = {},
    ): Observation => ({
      site_id: "test-site",
      asset_id: "tank-01",
      sensor_id: "level-sensor",
      measurement: "level",
      ts: new Date().toISOString(),
      value: 5.5,
      unit: "m",
      quality: "good",
      raw_tag: "TANK01.LEVEL",
      source: "modbus",
      seq: 1,
      parameter_type: "sensor",
      component_type: "sensor",
      ...overrides,
    });

    it("ingests a batch in a single store write", () => {
      let notifications = 0;
      const unsubscribe = useTelemetryStore.subscribe(() => {
        notifications += 1;
      });

      useTelemetryStore
        .getState()
        .addObservations([
          makeObservation({ sensor_id: "s1" }),
          makeObservation({ sensor_id: "s2", asset_id: "pump-01" }),
          makeObservation({ sensor_id: "s3", measurement: "flow_rate" }),
        ]);

      unsubscribe();

      expect(notifications).toBe(1);
      expect(Object.keys(useTelemetryStore.getState().latest)).toHaveLength(3);
    });

    it("derives assets and measurements once for the whole batch", () => {
      useTelemetryStore
        .getState()
        .addObservations([
          makeObservation({ sensor_id: "s1", asset_id: "tank-01" }),
          makeObservation({
            sensor_id: "s2",
            asset_id: "pump-01",
            measurement: "flow_rate",
          }),
        ]);

      const state = useTelemetryStore.getState();
      expect(state.availableAssets).toEqual(["pump-01", "tank-01"]);
      expect(state.availableMeasurements).toEqual(["flow_rate", "level"]);
    });

    it("does not notify when every observation is a duplicate", () => {
      const observation = makeObservation();
      useTelemetryStore.getState().addObservations([observation]);

      let notifications = 0;
      const unsubscribe = useTelemetryStore.subscribe(() => {
        notifications += 1;
      });

      useTelemetryStore.getState().addObservations([observation]);
      unsubscribe();

      expect(notifications).toBe(0);
    });

    it("applies only the changed observations in a mixed batch", () => {
      const unchanged = makeObservation({ sensor_id: "s1" });
      useTelemetryStore.getState().addObservations([unchanged]);

      useTelemetryStore
        .getState()
        .addObservations([
          unchanged,
          makeObservation({ sensor_id: "s2", value: 9.9 }),
        ]);

      const latest = useTelemetryStore.getState().latest;
      expect(Object.keys(latest)).toHaveLength(2);
      expect(latest["tank-01.s2"].value).toBe(9.9);
    });

    it("keeps time series sorted when points arrive out of order", () => {
      const base = Date.now();
      useTelemetryStore.getState().addObservations([
        makeObservation({ ts: new Date(base + 2000).toISOString(), value: 2 }),
        makeObservation({ ts: new Date(base + 1000).toISOString(), value: 1 }),
        makeObservation({ ts: new Date(base + 3000).toISOString(), value: 3 }),
      ]);

      const series = useTelemetryStore
        .getState()
        .getTimeSeriesData("tank-01.level-sensor");

      expect(series.map((p) => p.value)).toEqual([1, 2, 3]);
    });

    it("handles an empty batch without notifying", () => {
      let notifications = 0;
      const unsubscribe = useTelemetryStore.subscribe(() => {
        notifications += 1;
      });

      useTelemetryStore.getState().addObservations([]);
      unsubscribe();

      expect(notifications).toBe(0);
    });
  });
});
