from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from src.notifications.models import Notification
from src.notifications.serializers import NotificationSerializer
from src.lib.django.views_mixin import ViewSetHelperMixin



class NotificationViewSet(ViewSetHelperMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing user notifications.
    
    Provides list, retrieve, mark as read, mark all as read, and unread count endpoints.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")
        return qs

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        """
        PATCH /api/v1/notifications/<id>/read/
        Marks a single notification as read.
        """
        notification = self.get_object()
        notification.mark_read()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """
        POST /api/v1/notifications/mark-all-read/
        Marks all of the current user's unread notifications as read.
        """
        updated = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response({"updated": updated})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """
        GET /api/v1/notifications/unread-count/
        Returns the count of unread notifications for the current user.
        """
        count = Notification.objects.filter(
            user=request.user, is_read=False
        ).count()
        return Response({"count": count})