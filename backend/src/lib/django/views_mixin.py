import re
import random
import string
import hashlib
import hmac
import logging
from pprint import pformat

logger = logging.getLogger(__name__)

from rest_framework import viewsets, mixins
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from django.conf import settings
from rest_framework.pagination import PageNumberPagination
from django_filters import filters, FilterSet

from src.lib.clients import zeptomail
from src.common.serializers import EmptySerializer
from src.users.permissions import IsVerifiedUser, IsVerifiedAdminUser


class EmptyFilterSet(FilterSet):
    def filter_queryset(self, queryset):
        return queryset


# ============================================================================
# MIXINS
# ============================================================================


class PaginationMixin:
    """Mixin to handle pagination consistently"""

    pagination_class = PageNumberPagination

    def paginate_and_respond(self, queryset, serializer_class, many=True):
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = serializer_class(page, many=many)
            return self.get_paginated_response(serializer.data)
        serializer = serializer_class(queryset, many=many)
        return Response(serializer.data)


class ViewSetHelperMixin(PaginationMixin):
    serializers = {
        "default": EmptySerializer,
    }

    permissions = {
        "default": [IsVerifiedUser],
    }
    
    filters = {
        "default": EmptyFilterSet,
    }
    
    filterset_class = None  # Let DjangoFilterBackend auto-generate from filterset_fields

    _has_auto_set_permissions = False   # This should always be False, coz when it's true we assume the admin_* permissions are set
    _use_filterset_class = True
    _DefaultPermissionClass = IsVerifiedUser
    _DefaultSerializerClass = EmptySerializer
    _DefaultFiltersetClass = EmptyFilterSet

    def get_serializer_class(self):
        """Return the serializer class to use for the request."""
        # During schema generation, drf-spectacular sets swagger_fake_view=True
        # but ALSO sets self.action to the specific action being introspected.
        # We should still try to resolve the action-specific serializer first,
        # and only fall back to "default" if the action isn't mapped.
        action = getattr(self, "action", None)
        
        if action:
            serializer = self.serializers.get(action)
            if serializer:
                return serializer
        
        # Explicit default in the child's serializers dict takes priority
        # over the mixin's _DefaultSerializerClass.
        return self.serializers.get("default", self._DefaultSerializerClass)

    def get_filterset_class(self):
        """Return the filterset class to use for the request."""
        if self._use_filterset_class:
            return self.filterset_class or self.filters.get(self.action, self.filters.get("default", self._DefaultFiltersetClass))
        return self.filters.get(self.action, self.filters.get("default", self._DefaultFiltersetClass))
    
    def filter_queryset(self, queryset):
        """
        Given a queryset, filter it with whichever filter backend is in use.

        You are unlikely to want to override this method, although you may need
        to call it either from a list view, or from a custom `get_object`
        method if you want to apply the configured filtering backend to the
        default queryset.
        """
        prev_class = self.filterset_class
        self.filterset_class = self.get_filterset_class()
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)
        self.filterset_class = prev_class # no reason i just like order :)
        return queryset

    def get_permissions(self):
        """Automatically add IsVerifiedAdminUser to any method that starts with admin_"""
        if not self._has_auto_set_permissions:
            # look for methods declared in the class
            for attr in dir(self.__class__):
                method = getattr(self.__class__, attr, None)
                if callable(method) and attr.startswith("admin_"):
                    perm_array = self.permissions.get(attr, None)
                    if perm_array is None:
                        self.permissions[attr] = [IsVerifiedAdminUser]
                    elif IsVerifiedAdminUser not in self.permissions[attr]:
                        self.permissions[attr].append(IsVerifiedAdminUser)

            # pprint.pprint(self.permissions)
            self._has_auto_set_permissions = True
        self.permission_classes = self.permissions.get(
            self.action, self.permissions.get("default", [self._DefaultPermissionClass])
        )
        return super().get_permissions()