"""
Influx API Server

Lightweight HTTP API to expose InfluxDB-backed telemetry and alert snapshots
for frontend polling use cases.
"""

import logging
from typing import Optional

from aiohttp import web

from services.influxdb_query_service import (
    MAX_LIMIT,
    MAX_LOOKBACK_SECONDS,
    InfluxDBQueryService,
    clamp_int,
)

logger = logging.getLogger(__name__)


class InfluxAPIServer:
    """Small aiohttp server exposing Influx query endpoints."""

    def __init__(
        self,
        influx_service: InfluxDBQueryService,
        host: str = "0.0.0.0",
        port: int = 8000,
        allowed_origin: str = "*",
    ):
        self.influx_service = influx_service
        self.host = host
        self.port = port
        self.allowed_origin = allowed_origin
        self.app: Optional[web.Application] = None
        self.runner: Optional[web.AppRunner] = None
        self.site: Optional[web.TCPSite] = None

    def _cors_headers(self) -> dict:
        return {
            "Access-Control-Allow-Origin": self.allowed_origin,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }

    def _json_response(self, payload: dict, status: int = 200) -> web.Response:
        response = web.json_response(payload, status=status)
        for key, value in self._cors_headers().items():
            response.headers[key] = value
        return response

    async def _handle_options(self, request: web.Request) -> web.Response:
        response = web.Response(status=204)
        for key, value in self._cors_headers().items():
            response.headers[key] = value
        return response

    async def _health(self, request: web.Request) -> web.Response:
        connected = self.influx_service.client is not None
        return self._json_response(
            {
                "status": "ok" if connected else "degraded",
                "influx_connected": connected,
                "bucket": self.influx_service.bucket,
            }
        )

    async def _latest_telemetry(self, request: web.Request) -> web.Response:
        site_id = request.query.get("site_id")
        lookback_seconds = clamp_int(
            request.query.get("lookback_seconds"), 120, 1, MAX_LOOKBACK_SECONDS
        )
        limit = clamp_int(request.query.get("limit"), 500, 1, MAX_LIMIT)

        observations = await self.influx_service.query_latest_observations(
            site_id=site_id,
            lookback_seconds=lookback_seconds,
            limit=limit,
        )

        return self._json_response(
            {
                "count": len(observations),
                "lookback_seconds": lookback_seconds,
                "site_id": site_id,
                "observations": observations,
            }
        )

    async def _active_alerts(self, request: web.Request) -> web.Response:
        site_id = request.query.get("site_id")
        lookback_seconds = clamp_int(
            request.query.get("lookback_seconds"), 300, 1, MAX_LOOKBACK_SECONDS
        )
        limit = clamp_int(request.query.get("limit"), 300, 1, MAX_LIMIT)

        alerts = await self.influx_service.query_quality_alerts(
            site_id=site_id,
            lookback_seconds=lookback_seconds,
            limit=limit,
        )

        return self._json_response(
            {
                "count": len(alerts),
                "lookback_seconds": lookback_seconds,
                "site_id": site_id,
                "alerts": alerts,
            }
        )

    async def _snapshot(self, request: web.Request) -> web.Response:
        """Telemetry and alerts in one response.

        Alerts are derived from the observations already fetched here, so a
        polling client gets both streams for one Flux query instead of the
        three that separate /telemetry/latest + /alerts/active cost.
        """
        site_id = request.query.get("site_id")
        lookback_seconds = clamp_int(
            request.query.get("lookback_seconds"), 120, 1, MAX_LOOKBACK_SECONDS
        )
        limit = clamp_int(request.query.get("limit"), 500, 1, MAX_LIMIT)
        alert_limit = clamp_int(request.query.get("alert_limit"), 300, 1, MAX_LIMIT)

        observations = await self.influx_service.query_latest_observations(
            site_id=site_id,
            lookback_seconds=lookback_seconds,
            limit=limit,
        )
        alerts = self.influx_service.derive_quality_alerts(observations, limit=alert_limit)

        return self._json_response(
            {
                "site_id": site_id,
                "lookback_seconds": lookback_seconds,
                "count": len(observations),
                "observations": observations,
                "alerts": alerts,
            }
        )

    @web.middleware
    async def _error_middleware(self, request: web.Request, handler):
        """Return JSON (with CORS headers) for unexpected handler failures."""
        try:
            return await handler(request)
        except web.HTTPException:
            raise
        except Exception as e:
            logger.exception("Unhandled error serving %s", request.rel_url)
            return self._json_response(
                {"error": "internal_error", "detail": str(e)}, status=500
            )

    async def start(self):
        if self.runner:
            return

        self.app = web.Application(middlewares=[self._error_middleware])
        self.app.router.add_get("/health", self._health)
        self.app.router.add_get("/api/influx/telemetry/latest", self._latest_telemetry)
        self.app.router.add_get("/api/influx/alerts/active", self._active_alerts)
        self.app.router.add_get("/api/influx/snapshot", self._snapshot)
        self.app.router.add_options("/{tail:.*}", self._handle_options)

        self.runner = web.AppRunner(self.app)
        await self.runner.setup()

        self.site = web.TCPSite(self.runner, host=self.host, port=self.port)
        await self.site.start()

        logger.info("Influx API server started on http://%s:%s", self.host, self.port)

    async def stop(self):
        if self.site:
            await self.site.stop()
            self.site = None

        if self.runner:
            await self.runner.cleanup()
            self.runner = None

        self.app = None
        logger.info("Influx API server stopped")
