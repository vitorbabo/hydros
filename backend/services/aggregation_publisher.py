"""
Aggregation Publisher Service

Periodically queries InfluxDB for aggregated metrics (daily totals, statistics)
and publishes them to MQTT for frontend consumption.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from dataclasses import asdict

from services.influxdb_query_service import InfluxDBQueryService
from gateway.edge_gateway import Observation

logger = logging.getLogger(__name__)


class AggregationPublisher:
    """
    Service that queries InfluxDB for aggregated metrics and publishes to MQTT.

    Runs as a periodic background task to:
    1. Query daily total flow volumes from InfluxDB
    2. Create standardized Observation messages
    3. Publish to MQTT for frontend consumption
    """

    def __init__(
        self,
        influxdb_service: InfluxDBQueryService,
        mqtt_handler,
        site_ids: List[str],
        publish_interval: float = 300.0  # 5 minutes default
    ):
        """
        Initialize aggregation publisher.

        Args:
            influxdb_service: InfluxDB query service instance
            mqtt_handler: MQTT handler for publishing
            site_ids: List of site IDs to query and publish for
            publish_interval: Interval in seconds between publications (default: 300s = 5min)
        """
        self.influxdb_service = influxdb_service
        self.mqtt_handler = mqtt_handler
        self.site_ids = site_ids
        self.publish_interval = publish_interval

        self.running = False
        self.task: Optional[asyncio.Task] = None
        self.sequence_number = 1

        logger.info(
            f"Initialized AggregationPublisher for {len(site_ids)} sites, "
            f"interval={publish_interval}s"
        )

    async def start(self):
        """Start the periodic aggregation and publishing task."""
        if self.running:
            logger.warning("AggregationPublisher already running")
            return

        self.running = True
        self.task = asyncio.create_task(self._run_periodic_task())
        logger.info("AggregationPublisher started")

    async def stop(self):
        """Stop the periodic task."""
        if not self.running:
            return

        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

        logger.info("AggregationPublisher stopped")

    async def _run_periodic_task(self):
        """Main periodic task loop."""
        # Run immediately on startup, then periodically
        while self.running:
            try:
                await self._publish_all_aggregations()
            except Exception as e:
                logger.error(f"Error in aggregation publisher periodic task: {e}", exc_info=True)

            # Wait for next interval
            try:
                await asyncio.sleep(self.publish_interval)
            except asyncio.CancelledError:
                break

    async def _publish_all_aggregations(self):
        """Query and publish aggregations for all configured sites."""
        logger.debug(f"Publishing aggregations for {len(self.site_ids)} sites")

        for site_id in self.site_ids:
            try:
                await self._publish_site_aggregations(site_id)
            except Exception as e:
                logger.error(f"Error publishing aggregations for site {site_id}: {e}")

    async def _publish_site_aggregations(self, site_id: str):
        """
        Query and publish aggregated metrics for a specific site.

        Args:
            site_id: Site identifier
        """
        # Query daily total flow from InfluxDB
        daily_total_flow = await self.influxdb_service.query_daily_total_flow(
            site_id=site_id,
            asset_id="raw_intake",
            date=None  # Today
        )

        logger.debug(f"Site {site_id}: Daily total flow = {daily_total_flow:.2f} m³")

        # Create observation for daily total flow
        timestamp = datetime.now(timezone.utc).isoformat()

        observation = Observation(
            site_id=site_id,
            asset_id="raw_intake",
            sensor_id="daily_flow_total-raw_intake",
            measurement="daily_flow_total",
            ts=timestamp,
            value=daily_total_flow,
            unit="m³",
            quality="good",
            raw_tag="calculated",
            source="aggregation_publisher",
            seq=self.sequence_number,
            parameter_type="sensor",
            component_type="aggregation"
        )

        self.sequence_number += 1

        # Publish to MQTT
        observation_dict = asdict(observation)

        success = await self.mqtt_handler.publish_observation(
            site_id=site_id,
            asset_id="raw_intake",
            measurement="daily_flow_total",
            observation_data=observation_dict,
            qos=1
        )

        if success:
            logger.debug(
                f"Published daily total flow for {site_id}: {daily_total_flow:.2f} m³"
            )
        else:
            logger.warning(f"Failed to publish daily total flow for {site_id}")

    async def publish_on_demand(self, site_id: str) -> bool:
        """
        Publish aggregations for a specific site immediately (on-demand).

        Args:
            site_id: Site identifier

        Returns:
            True if successful, False otherwise
        """
        try:
            await self._publish_site_aggregations(site_id)
            return True
        except Exception as e:
            logger.error(f"Error publishing on-demand aggregations for {site_id}: {e}")
            return False

    def get_status(self) -> Dict[str, any]:
        """
        Get current status of the aggregation publisher.

        Returns:
            Status dictionary with running state and configuration
        """
        return {
            "running": self.running,
            "site_count": len(self.site_ids),
            "publish_interval": self.publish_interval,
            "sequence_number": self.sequence_number
        }
