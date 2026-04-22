"""
Integration models for BedFlow - EHR, HL7, FHIR integrations per section 6
"""

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7
from src.common.constants import IntegrationType, IntegrationStatus


class IntegrationEndpoint(models.Model):
    """
    External system integration endpoints.
    Per requirements 6.1 - FHIR, HL7, ADT support.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="integration_endpoints"
    )

    name = models.CharField(max_length=200)
    integration_type = models.CharField(
        max_length=50,
        choices=IntegrationType.choices
    )
    status = models.CharField(
        max_length=30,
        choices=IntegrationStatus.choices,
        default=IntegrationStatus.CONFIGURATION_PENDING
    )

    # Connection details
    base_url = models.URLField(blank=True)
    api_key = models.CharField(max_length=500, blank=True)
    api_secret = models.CharField(max_length=500, blank=True)
    username = models.CharField(max_length=200, blank=True)
    password = models.CharField(max_length=500, blank=True)
    auth_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)

    # Webhook settings
    webhook_secret = models.CharField(max_length=500, blank=True)
    webhook_url = models.URLField(blank=True)

    # Configuration
    config = models.JSONField(default=dict, blank=True)
    headers = models.JSONField(default=dict, blank=True)

    # Supported events
    supports_adt = models.BooleanField(default=True)
    supports_patient_query = models.BooleanField(default=False)
    supports_bed_status = models.BooleanField(default=False)

    # Status tracking
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_result = models.CharField(
        max_length=20,
        choices=[
            ("success", "Success"),
            ("failed", "Failed"),
        ],
        blank=True
    )
    last_error = models.TextField(blank=True)
    last_error_at = models.DateTimeField(null=True, blank=True)

    # Rate limiting
    rate_limit_per_minute = models.PositiveIntegerField(default=100)

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_integrations"
    )

    class Meta:
        ordering = ["hospital", "integration_type", "name"]
        indexes = [
            models.Index(fields=["hospital", "integration_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.integration_type})"

    def is_token_expired(self):
        """Check if authentication token has expired."""
        if not self.token_expires_at:
            return True
        return timezone.now() >= self.token_expires_at


class IntegrationMessage(models.Model):
    """
    Log of integration messages exchanged.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    endpoint = models.ForeignKey(
        IntegrationEndpoint,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    # Message details
    direction = models.CharField(
        max_length=10,
        choices=[
            ("incoming", "Incoming"),
            ("outgoing", "Outgoing"),
        ]
    )
    message_type = models.CharField(
        max_length=50,
        choices=[
            ("adt_a01", "ADT^A01 - Admit"),
            ("adt_a02", "ADT^A02 - Transfer"),
            ("adt_a03", "ADT^A03 - Discharge"),
            ("adt_a08", "ADT^A08 - Update"),
            ("adt_a11", "ADT^A11 - Cancel Admit"),
            ("fhir_patient", "FHIR Patient"),
            ("fhir_encounter", "FHIR Encounter"),
            ("fhir_location", "FHIR Location"),
            ("webhook", "Webhook"),
            ("api_call", "API Call"),
        ]
    )

    # Content
    raw_payload = models.TextField()
    parsed_payload = models.JSONField(null=True, blank=True)
    correlation_id = models.CharField(max_length=100, blank=True, db_index=True)

    # Processing
    status = models.CharField(
        max_length=20,
        choices=[
            ("received", "Received"),
            ("processing", "Processing"),
            ("processed", "Processed"),
            ("failed", "Failed"),
            ("retrying", "Retrying"),
            ("ignored", "Ignored"),
        ],
        default="received"
    )
    processing_error = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)

    # Related objects
    patient_mrn = models.CharField(max_length=50, blank=True, db_index=True)
    related_admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="integration_messages"
    )

    # Timestamps
    received_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [
            models.Index(fields=["endpoint", "status"]),
            models.Index(fields=["message_type", "status"]),
            models.Index(fields=["patient_mrn"]),
            models.Index(fields=["correlation_id"]),
        ]

    def __str__(self):
        return f"{self.message_type} {self.direction} - {self.status}"

    def mark_processed(self):
        """Mark message as successfully processed."""
        self.status = "processed"
        self.processed_at = timezone.now()
        self.save()

    def mark_failed(self, error):
        """Mark message as failed."""
        self.status = "failed"
        self.processing_error = str(error)
        self.save()

        # Update endpoint status
        self.endpoint.status = IntegrationStatus.ERROR
        self.endpoint.last_error = str(error)
        self.endpoint.last_error_at = timezone.now()
        self.endpoint.save()


class WebhookSubscription(models.Model):
    """
    Outgoing webhook subscriptions.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="webhook_subscriptions"
    )

    name = models.CharField(max_length=200)
    url = models.URLField()
    secret = models.CharField(max_length=500, blank=True)

    # Events to subscribe to
    events = models.JSONField(default=list)

    # Status
    is_active = models.BooleanField(default=True)
    last_delivery_at = models.DateTimeField(null=True, blank=True)
    last_delivery_status = models.CharField(
        max_length=20,
        choices=[
            ("success", "Success"),
            ("failed", "Failed"),
        ],
        blank=True
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["hospital", "name"]
        indexes = [
            models.Index(fields=["hospital", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.hospital.code})"


class FHIRResourceCache(models.Model):
    """
    Cache for FHIR resources to reduce API calls.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    endpoint = models.ForeignKey(
        IntegrationEndpoint,
        on_delete=models.CASCADE,
        related_name="fhir_cache"
    )

    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100)
    fhir_data = models.JSONField()

    cached_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-cached_at"]
        unique_together = [["endpoint", "resource_type", "resource_id"]]
        indexes = [
            models.Index(fields=["resource_type", "resource_id"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"{self.resource_type}/{self.resource_id}"

    def is_expired(self):
        """Check if cache entry has expired."""
        return timezone.now() >= self.expires_at
