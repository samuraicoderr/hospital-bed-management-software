import logging
import html
import traceback
from django.conf import settings
from django.utils.log import AdminEmailHandler
from pygments import highlight
from pygments.lexers import PythonTracebackLexer
from pygments.formatters import HtmlFormatter
from src.lib.clients import zeptomail

# the class has to be defined before the LOGGING dict. E get why.
class CustomAdminEmailHandler(AdminEmailHandler):
    """
    A custom version of Django's AdminEmailHandler.
    Uses Pygments for syntax-highlighted tracebacks.
    """

    def emit(self, record):
        try:
            if record.levelno >= logging.ERROR:
                message = self.format(record)
                _ = html.escape

                subject = f"[{settings.SITE_NAME} ERROR] {record.levelname} in {record.module}"
                recipients = settings.DEVELOPER_EMAILS

                # Syntax-highlight the traceback using Pygments
                formatter = HtmlFormatter(
                    style="monokai",
                    noclasses=True,  # inline styles so it works in email clients
                    prestyles="padding: 16px; border-radius: 6px; font-size: 13px; line-height: 1.5;",
                )
                highlighted_message = highlight(
                    message, PythonTracebackLexer(), formatter
                )

                zeptomail._send(
                    to=recipients,
                    subject=subject,
                    html_body=f"""
                    <div style="font-family: monospace, sans-serif; max-width: 800px; margin: 0 auto;">
                        <h3 style="margin: 0 0 8px 0;">{_(record.levelname)} in <code>{_(record.module)}</code></h3>
                        <p style="color: #666; font-size: 13px; margin: 0 0 4px 0;">
                            <strong>File:</strong> {_(record.pathname)}:{record.lineno} &mdash;
                            <strong>Function:</strong> {_(record.funcName)}()
                        </p>
                        <p style="color: #666; font-size: 13px; margin: 0 0 16px 0;">
                            <strong>Logger:</strong> {_(record.name)}
                        </p>
                        {highlighted_message}
                        <p style="color: #999; font-size: 11px; margin-top: 16px;">
                            Automated error report from {settings.SITE_NAME}.
                            You are receiving this because you are listed in DEVELOPER_EMAILS.
                        </p>
                    </div>
                    """,
                )
        except Exception:
            self.handleError(record)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "django.server": {
            "()": "django.utils.log.ServerFormatter",
            "format": "[%(server_time)s] %(message)s",
        },
        "verbose": {
            "format": "%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s"
        },
        "simple": {"format": "%(levelname)s %(message)s"},
    },
    "filters": {
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
    },
    "handlers": {
        "django.server": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "django.server",
        },
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "mail_admins": {
            "level": "ERROR",
            "class": "src.config.settings.logging_settings.CustomAdminEmailHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "root": {
            "handlers": ["console"],
            "level": "WARNING",
        },
        "django": {
            "handlers": ["console"],
            "propagate": False, # prevent double logging of django logs
        },
        "django.server": {
            "handlers": ["django.server"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["mail_admins", "console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "app": {
            "handlers": ["console", "mail_admins"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
