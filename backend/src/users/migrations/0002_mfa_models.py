from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import src.lib.utils.uuid7


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="user",
            old_name="two_factor_enabled",
            new_name="mfa_is_enabled",
        ),
        migrations.CreateModel(
            name="MFASession",
            fields=[
                ("id", models.UUIDField(default=src.lib.utils.uuid7.uuid7, editable=False, primary_key=True, serialize=False)),
                ("token_hash", models.CharField(max_length=255, unique=True)),
                (
                    "selected_method",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("totp", "TOTP"),
                            ("sms", "SMS"),
                            ("email", "Email"),
                            ("webauthn", "WebAuthn"),
                            ("push", "Push"),
                        ],
                        max_length=20,
                        null=True,
                    ),
                ),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("verified", models.BooleanField(db_index=True, default=False)),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("request_fingerprint", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mfa_sessions", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
        migrations.CreateModel(
            name="MFATrustedDevice",
            fields=[
                ("id", models.UUIDField(default=src.lib.utils.uuid7.uuid7, editable=False, primary_key=True, serialize=False)),
                (
                    "provider",
                    models.CharField(
                        choices=[("fcm", "FCM")],
                        default="fcm",
                        max_length=20,
                    ),
                ),
                (
                    "platform",
                    models.CharField(
                        choices=[
                            ("ios", "iOS"),
                            ("android", "Android"),
                            ("web", "Web"),
                            ("unknown", "Unknown"),
                        ],
                        default="unknown",
                        max_length=20,
                    ),
                ),
                ("token", models.CharField(max_length=500)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("last_delivery_status", models.CharField(blank=True, default="", max_length=80)),
                ("last_seen_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mfa_trusted_devices", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
        migrations.CreateModel(
            name="MFAMethod",
            fields=[
                ("id", models.UUIDField(default=src.lib.utils.uuid7.uuid7, editable=False, primary_key=True, serialize=False)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("totp", "TOTP"),
                            ("sms", "SMS"),
                            ("email", "Email"),
                            ("webauthn", "WebAuthn"),
                            ("push", "Push"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("is_verified", models.BooleanField(db_index=True, default=False)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mfa_methods", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
        migrations.CreateModel(
            name="MFAChallenge",
            fields=[
                ("id", models.UUIDField(default=src.lib.utils.uuid7.uuid7, editable=False, primary_key=True, serialize=False)),
                (
                    "method",
                    models.CharField(
                        choices=[
                            ("totp", "TOTP"),
                            ("sms", "SMS"),
                            ("email", "Email"),
                            ("webauthn", "WebAuthn"),
                            ("push", "Push"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("challenge_data", models.JSONField(blank=True, default=dict)),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("max_attempts", models.PositiveSmallIntegerField(default=5)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "session",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="challenges", to="users.mfasession"),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="mfatrusteddevice",
            constraint=models.UniqueConstraint(fields=("provider", "token"), name="unique_push_device_token_per_provider"),
        ),
        migrations.AddConstraint(
            model_name="mfamethod",
            constraint=models.UniqueConstraint(fields=("user", "type"), name="unique_user_mfa_method_type"),
        ),
        migrations.AddIndex(
            model_name="mfasession",
            index=models.Index(fields=["user", "-created_at"], name="users_mfase_user_id_3857cc_idx"),
        ),
        migrations.AddIndex(
            model_name="mfasession",
            index=models.Index(fields=["verified", "expires_at"], name="users_mfase_verifie_e5cdd8_idx"),
        ),
        migrations.AddIndex(
            model_name="mfatrusteddevice",
            index=models.Index(fields=["user", "is_active"], name="users_mfatr_user_id_51972c_idx"),
        ),
        migrations.AddIndex(
            model_name="mfamethod",
            index=models.Index(fields=["user", "is_active"], name="users_mfame_user_id_911b09_idx"),
        ),
        migrations.AddIndex(
            model_name="mfachallenge",
            index=models.Index(fields=["session", "method"], name="users_mfach_session_5f3549_idx"),
        ),
        migrations.AddIndex(
            model_name="mfachallenge",
            index=models.Index(fields=["expires_at"], name="users_mfach_expires_e3f98f_idx"),
        ),
    ]
