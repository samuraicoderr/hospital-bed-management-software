"""
JWT-authenticated WebSocket consumer for real-time in-app notifications.

Authentication: JWT token sent as the first message after connection
  {"type": "auth", "token": "<access_token>"}

The consumer accepts the raw connection first, then waits for the auth
message before joining any groups or sending data. Unauthenticated
connections that don't send a valid auth message within AUTH_TIMEOUT_SECONDS
are closed with code 4001.

Group name pattern: notifications_<user_id>
"""

import asyncio
import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

# How long (seconds) the client has to send {"type": "auth", "token": "..."}
# before we close the connection.
AUTH_TIMEOUT_SECONDS = 10


# ─── DB helpers ───────────────────────────────────────────────────────────────

def _get_user_from_token(token: str):
    try:
        from rest_framework_simplejwt.tokens import AccessToken

        validated = AccessToken(token)
        user_id = validated.get("user_id")
        if not user_id:
            return None
        return User.objects.get(pk=user_id)
    except Exception:
        return None


@database_sync_to_async
def get_authenticated_user(token: str):
    return _get_user_from_token(token)


@database_sync_to_async
def get_unread_count(user) -> int:
    from src.notifications.models import Notification
    return Notification.objects.filter(user=user, is_read=False).count()


@database_sync_to_async
def mark_notification_read(notification_id: str, user) -> bool:
    from src.notifications.models import Notification
    try:
        notif = Notification.objects.get(id=notification_id, user=user)
        notif.mark_read()
        return True
    except Notification.DoesNotExist:
        return False


@database_sync_to_async
def mark_all_read(user) -> int:
    from src.notifications.models import Notification
    return Notification.objects.filter(user=user, is_read=False).update(is_read=True)


# ─── Consumer ─────────────────────────────────────────────────────────────────

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for per-user notification streaming.

    Handshake flow:
      1. Client opens connection (no token in URL).
      2. Server accepts immediately and starts AUTH_TIMEOUT_SECONDS countdown.
      3. Client sends:  {"type": "auth", "token": "<jwt>"}
      4. Server validates token.
         - Valid   → joins group, sends initial unread_count, sets self.authenticated = True.
         - Invalid → closes with 4001.
      5. All subsequent client messages are only processed if authenticated.

    Messages from server:
      {"type": "unread_count",   "count": N}
      {"type": "notification",   "data": {...}}
      {"type": "error",          "message": "..."}

    Messages from client:
      {"type": "auth",           "token": "<jwt>"}      ← must be first
      {"type": "ping"}
      {"type": "mark_read",      "id": "<uuid>"}
      {"type": "mark_all_read"}
    """

    # Set on successful auth
    user = None
    group_name: str | None = None
    authenticated: bool = False
    _auth_timeout_task: asyncio.Task | None = None

    # ── Connection lifecycle ──────────────────────────────────────────────────

    async def connect(self):
        """
        Accept every incoming connection unconditionally.
        Authentication happens in the first receive_json() call.
        The auth timeout task closes the socket if auth never arrives.
        """
        await self.accept()

        # Start the countdown — client must authenticate before it fires
        self._auth_timeout_task = asyncio.ensure_future(
            self._auth_timeout()
        )
        logger.debug("WS connection accepted, waiting for auth message")

    async def disconnect(self, close_code: int):
        # Cancel timeout if we're still waiting
        if self._auth_timeout_task and not self._auth_timeout_task.done():
            self._auth_timeout_task.cancel()

        if self.group_name:
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )
            logger.info(
                "WS disconnected: user=%s code=%s",
                getattr(self.user, "id", "unauthenticated"),
                close_code,
            )

    async def _auth_timeout(self):
        """Close the connection if auth hasn't succeeded in time."""
        await asyncio.sleep(AUTH_TIMEOUT_SECONDS)
        if not self.authenticated:
            logger.warning(
                "WS auth timeout — closing unauthenticated connection"
            )
            await self.close(code=4001)

    # ── Message routing ───────────────────────────────────────────────────────

    async def receive_json(self, content: dict, **kwargs):
        msg_type = content.get("type")

        # ── Auth message (must come first) ────────────────────────────────
        if msg_type == "auth":
            await self._handle_auth(content)
            return

        # ── Reject everything else until authenticated ─────────────────────
        if not self.authenticated:
            logger.warning("WS message received before auth — closing")
            await self.close(code=4001)
            return

        # ── Authenticated message handlers ────────────────────────────────
        if msg_type == "ping":
            await self.send_json({"type": "pong"})

        elif msg_type == "mark_read":
            await self._handle_mark_read(content)

        elif msg_type == "mark_all_read":
            await self._handle_mark_all_read()

        else:
            await self.send_json({
                "type": "error",
                "message": f"Unknown message type: {msg_type}",
            })

    # ── Auth ──────────────────────────────────────────────────────────────────

    async def _handle_auth(self, content: dict):
        if self.authenticated:
            # Ignore redundant auth attempts
            return

        token = content.get("token", "")
        if not token:
            logger.warning("WS auth rejected: empty token")
            await self.close(code=4001)
            return

        user = await get_authenticated_user(token)
        if user is None or not user.is_active:
            logger.warning("WS auth rejected: invalid or inactive token")
            await self.close(code=4001)
            return

        # Auth succeeded — cancel the timeout and set up the session
        if self._auth_timeout_task and not self._auth_timeout_task.done():
            self._auth_timeout_task.cancel()

        self.user = user
        self.group_name = f"notifications_{user.id}"
        self.authenticated = True

        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # Send initial state to the client
        count = await get_unread_count(user)
        await self.send_json({"type": "unread_count", "count": count})

        logger.info("WS authenticated: user=%s unread=%s", user.id, count)

    # ── Notification actions ──────────────────────────────────────────────────

    async def _handle_mark_read(self, content: dict):
        notification_id = content.get("id")
        if not notification_id:
            await self.send_json({
                "type": "error",
                "message": "mark_read requires an 'id' field",
            })
            return

        success = await mark_notification_read(notification_id, self.user)
        if success:
            count = await get_unread_count(self.user)
            await self.send_json({"type": "unread_count", "count": count})

    async def _handle_mark_all_read(self):
        updated = await mark_all_read(self.user)
        await self.send_json({"type": "unread_count", "count": 0})
        logger.info(
            "WS mark_all_read: user=%s updated=%s", self.user.id, updated
        )

    # ── Channel layer handlers ────────────────────────────────────────────────

    async def notification_message(self, event: dict):
        """
        Called via:
          channel_layer.group_send(group_name, {"type": "notification.message", "data": {...}})
        Forwards the notification payload to the WebSocket client.
        """
        await self.send_json({
            "type": "notification",
            "data": event["data"],
        })