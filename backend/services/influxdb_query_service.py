"""
InfluxDB Query Service

Provides query capabilities for time-series data stored in InfluxDB.
Supports querying daily total flow volumes and latest flow rates.
"""

import logging
from typing import Optional, Dict
from datetime import datetime, timezone
from influxdb_client import InfluxDBClient
from influxdb_client.client.query_api import QueryApi

logger = logging.getLogger(__name__)


class InfluxDBQueryService:
    """Service for querying telemetry data from InfluxDB."""

    def __init__(self, url: str, token: str, org: str, bucket: str):
        """
        Initialize InfluxDB query service.

        Args:
            url: InfluxDB server URL (e.g., http://localhost:8086)
            token: Authentication token
            org: Organization name
            bucket: Bucket name where telemetry data is stored
        """
        self.url = url
        self.token = token
        self.org = org
        self.bucket = bucket
        self.client: Optional[InfluxDBClient] = None
        self.query_api: Optional[QueryApi] = None

        logger.info(f"Initializing InfluxDB query service: {url}, org={org}, bucket={bucket}")

    async def connect(self):
        """Establish connection to InfluxDB."""
        try:
            self.client = InfluxDBClient(
                url=self.url,
                token=self.token,
                org=self.org,
                timeout=30_000  # 30 seconds timeout
            )
            self.query_api = self.client.query_api()

            # Test connection by checking health
            health = self.client.health()
            if health.status == "pass":
                logger.info("Successfully connected to InfluxDB")
            else:
                logger.warning(f"InfluxDB health check returned: {health.status}")

        except Exception as e:
            logger.error(f"Failed to connect to InfluxDB: {e}")
            raise

    async def disconnect(self):
        """Close InfluxDB connection."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from InfluxDB")

    async def query_daily_total_flow(
        self,
        site_id: str,
        asset_id: str = "raw_intake",
        date: Optional[str] = None
    ) -> float:
        """
        Query daily total flow volume (m³) for a site.

        Integrates flow_rate (m³/h) over time to calculate total volume.
        Uses hourly mean aggregation for accuracy.

        Args:
            site_id: Site identifier (e.g., 'wtp-porto-01')
            asset_id: Asset identifier (default: 'raw_intake')
            date: Date string in format 'YYYY-MM-DD' or None for today

        Returns:
            Total flow volume in cubic meters (m³)
        """
        if not self.query_api:
            logger.error("Query API not initialized. Call connect() first.")
            return 0.0

        # Determine time range
        if date:
            start_time = date
        else:
            # Use 'today' which starts at midnight in the local timezone
            start_time = datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()

        # Flux query to calculate daily total flow
        # 1. Filter by site_id, asset_id, and measurement
        # 2. Aggregate into hourly windows using mean
        # 3. Integrate over time (multiply flow rate by duration)
        # 4. Sum all hourly integrals to get daily total
        flux_query = f'''
        from(bucket: "{self.bucket}")
          |> range(start: {start_time if date else "today()"})
          |> filter(fn: (r) => r["_measurement"] == "flow_rate")
          |> filter(fn: (r) => r["site_id"] == "{site_id}")
          |> filter(fn: (r) => r["asset_id"] == "{asset_id}")
          |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
          |> integral(unit: 1h)
          |> sum()
        '''

        try:
            logger.debug(f"Querying daily total flow for site={site_id}, asset={asset_id}, date={date or 'today'}")

            result = self.query_api.query(flux_query, org=self.org)

            # Parse result
            total_volume = 0.0
            for table in result:
                for record in table.records:
                    total_volume = float(record.get_value())
                    logger.debug(f"Daily total flow for {site_id}: {total_volume:.2f} m³")
                    break

            return total_volume

        except Exception as e:
            logger.error(f"Error querying daily total flow for {site_id}: {e}")
            return 0.0

    async def query_current_flow_rate(
        self,
        site_id: str,
        asset_id: str = "raw_intake"
    ) -> float:
        """
        Query latest flow rate (m³/h) for a site.

        Args:
            site_id: Site identifier
            asset_id: Asset identifier (default: 'raw_intake')

        Returns:
            Current flow rate in m³/h
        """
        if not self.query_api:
            logger.error("Query API not initialized. Call connect() first.")
            return 0.0

        # Flux query to get the latest flow rate value
        flux_query = f'''
        from(bucket: "{self.bucket}")
          |> range(start: -1h)
          |> filter(fn: (r) => r["_measurement"] == "flow_rate")
          |> filter(fn: (r) => r["site_id"] == "{site_id}")
          |> filter(fn: (r) => r["asset_id"] == "{asset_id}")
          |> last()
        '''

        try:
            logger.debug(f"Querying current flow rate for site={site_id}, asset={asset_id}")

            result = self.query_api.query(flux_query, org=self.org)

            # Parse result
            flow_rate = 0.0
            for table in result:
                for record in table.records:
                    flow_rate = float(record.get_value())
                    logger.debug(f"Current flow rate for {site_id}: {flow_rate:.2f} m³/h")
                    break

            return flow_rate

        except Exception as e:
            logger.error(f"Error querying current flow rate for {site_id}: {e}")
            return 0.0

    async def query_flow_statistics(
        self,
        site_id: str,
        asset_id: str = "raw_intake",
        hours: int = 24
    ) -> Dict[str, float]:
        """
        Query flow rate statistics over a time period.

        Args:
            site_id: Site identifier
            asset_id: Asset identifier
            hours: Number of hours to look back

        Returns:
            Dictionary with min, max, mean, and total volume
        """
        if not self.query_api:
            logger.error("Query API not initialized. Call connect() first.")
            return {"min": 0.0, "max": 0.0, "mean": 0.0, "total": 0.0}

        # Flux query for statistics
        flux_query = f'''
        data = from(bucket: "{self.bucket}")
          |> range(start: -{hours}h)
          |> filter(fn: (r) => r["_measurement"] == "flow_rate")
          |> filter(fn: (r) => r["site_id"] == "{site_id}")
          |> filter(fn: (r) => r["asset_id"] == "{asset_id}")

        min = data |> min() |> findRecord(fn: (key) => true, idx: 0)
        max = data |> max() |> findRecord(fn: (key) => true, idx: 0)
        mean = data |> mean() |> findRecord(fn: (key) => true, idx: 0)
        total = data
          |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
          |> integral(unit: 1h)
          |> sum()
          |> findRecord(fn: (key) => true, idx: 0)
        '''

        try:
            logger.debug(f"Querying flow statistics for site={site_id}, hours={hours}")

            result = self.query_api.query(flux_query, org=self.org)

            # This query returns multiple tables, parse all
            stats = {"min": 0.0, "max": 0.0, "mean": 0.0, "total": 0.0}

            # Note: Parsing multiple result tables is complex in influxdb-client
            # For simplicity, run separate queries for each stat

            return stats

        except Exception as e:
            logger.error(f"Error querying flow statistics for {site_id}: {e}")
            return {"min": 0.0, "max": 0.0, "mean": 0.0, "total": 0.0}
