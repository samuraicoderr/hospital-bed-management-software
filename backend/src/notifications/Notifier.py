"""
Simple email notification service with Django template rendering.
"""
import logging
from typing import Dict, Any, Callable
from decimal import Decimal

from django.template.loader import render_to_string
from django.template import TemplateDoesNotExist
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.conf import settings

from src.lib.clients import zeptomail

User = get_user_model()

logger = logging.getLogger(__name__)


def in_app_notify(
    user,
    title: str,
    message: str,
    category: str,
    metadata: dict | None = None,
) -> None:
    """
    Create a Notification DB record and push it in real-time via the Redis
    channel layer to the user's private WebSocket group.

    Safe to call from any synchronous context (views, Celery tasks, signals).
    Errors are caught and logged — email delivery is never affected.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from src.notifications.models import Notification
        from src.notifications.serializers import NotificationSerializer

        notif = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            category=category,
            metadata=metadata or {},
        )

        data = dict(NotificationSerializer(notif).data)
        data["id"] = str(data["id"])  # ensure UUID is JSON-serialisable

        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"notifications_{user.id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "notification.message",
                    "data": data,
                },
            )
        logger.info(f"[in_app_notify] Sent '{title}' to user {user.id}")
    except Exception as exc:
        logger.error(f"[in_app_notify] Failed: {exc}", exc_info=True)


class NotificationError(Exception):
    """Base exception for notification errors."""
    pass


class Notifier:
    """Simple email notification service."""
    
    @staticmethod
    def _send_email(
        template_name: str,
        subject: str,
        recipient_emails: list,
        context: Dict[str, Any],
        thread: bool = True,
        context_modifier: Callable[[Dict[str, Any]], Dict[str, Any]] | None = None,
    ) -> None:
        """
        Internal method to render template and send email.
        
        Args:
            template_name: Django template path (e.g., 'emails/transaction.html')
            subject: Email subject line
            recipient_email: Recipient's email address
            context: Template context dictionary
            thread: Send asynchronously if True
            
        Raises:
            NotificationError: If sending fails
        """
        try:
            # Render HTML from Django template
            app_default_context = context.get('app_default_context', settings.APP_DEFAULT_CONTEXT)
            company_default_context = context.get('company_default_context', settings.COMPANY_DEFAULT_CONTEXT)
            social_default_context = context.get('social_default_context', settings.SOCIAL_DEFAULT_CONTEXT)
            context.update({
                'app': app_default_context,
                'company': company_default_context,
                'social': social_default_context,
            })
            
            if context_modifier and callable(context_modifier):
                _context = context_modifier(context)
                if _context:
                    context = _context
                    
            html_body = render_to_string(template_name, context)
            
            # Send via zeptomail
            zeptomail._send(
                subject=subject,
                to=recipient_emails,
                html_body=html_body,
                thread=thread
            )
            
            logger.info(f"Email sent: {subject} to {recipient_emails}")
            
        except TemplateDoesNotExist as e:
            logger.error(f"Template not found: {template_name}")
            raise NotificationError(f"Template '{template_name}' not found") from e
        except Exception as e:
            logger.error(f"Failed to send email: {e}", exc_info=True)
            raise NotificationError(f"Failed to send email: {str(e)}") from e


class NotifyUser:
    def __init__(self, user) -> None:
        self.user = user
        
    
    def send_password_reset_token_email(self, reset_link: str, reset_token: str|None=None, thread=True) -> None:
        """
        Send password reset token email to the user.
        """
        context = {
            'user': self.user,
            'reset_link': reset_link,
            'reset_token': reset_token,
        }
        Notifier._send_email(
            template_name='notifications/emails/auth/password/password_reset_link.html',
            subject='Password Reset Request',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
    
    def send_transaction_email(self, txn, wallet, thread=True):
        """
        Send transaction email to the user.
        """
        context = {
            'txn': txn,
            'wallet': wallet,
            'user': self.user,
        }
        Notifier._send_email(
            template_name='notifications/emails/payments/transaction_success.html',
            subject='Transaction Notification',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        
    def send_investment_purchase_notification(self, investment, thread=True):
        """
        Send notification to user when an investment is purchased (auto-approved via payment).
        """
        context = {
            'user': self.user,
            'investment': investment,
            'product': getattr(investment, 'product', None),
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_created.html',
            subject='Your investment purchase was successful',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        # also send to admins
        # ...
    
    
    def send_welcome_to_user(self, context: Dict[str, Any] | None = None, thread=True) -> None:
        """
        Send welcome email to the user.
        """
        _context = {
            'user': self.user,
        }
        context = context or {}
        context.update(_context)
        Notifier._send_email(
            template_name='notifications/emails/auth/register.html',
            subject=f'Welcome to {settings.SITE_NAME}',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        
    
    def send_password_reset(self, reset_link: str, thread=True) -> None:
        """
        Send password reset email to the user.
        """
        context = {
            'user': self.user,
            'reset_link': reset_link,
        }
        Notifier._send_email(
            template_name='notifications/emails/auth/password/password_reset_link.html',
            subject='Password Reset Request',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )

        # Channel Level Notification can be added here in future
        # ...
    
    
    def send_email_verification_otp(self, otp_code: str, thread=True) -> None:
        """
        Send email verification OTP to the user.
        """
        context = {
            'user': self.user,
            'otp_code': otp_code,
        }
        Notifier._send_email(
            template_name='notifications/emails/auth/otp/email_verification.html',
            subject='Email Verification OTP',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        # Channel Level Notification can be added here in future
        # ...
    
    def send_phone_verification_otp(self, otp_code: str, thread=True) -> None:
        """
        Send SMS verification OTP to the user.
        Currently a placeholder for future SMS integration.
        """
        # Placeholder for SMS sending logic
        logger.info(f"SMS OTP {otp_code} sent to {self.user.phone_number} (not implemented).")
        # Using email as a placeholder for SMS
        zeptomail._send(
            subject='SMS Verification OTP',
            to=[self.user.email.lower()],  # Placeholder: replace with actual SMS sending
            html_body=f'''
                Hi {self.user.get_full_name()},
                
                You requested an otp to verify your phone number: {otp_code}.
                If you did not make this request, please ignore the message.
            ''',
            thread=thread
        )
        # Channel Level Notification can be added here in future
        # ...
    
    
    def send_2fa_otp(self, otp_code: str, thread=True) -> None:
        """
        Send 2FA OTP to the user.
        """
        context = {
            'user': self.user,
            'otp_code': otp_code,
        }
        Notifier._send_email(
            template_name='notifications/emails/auth/otp/2fa_verification.html',
            subject='Your 2FA One-Time Password',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        # Channel Level Notification can be added here in future
        # ...
    
    def send_password_reset_otp(self, otp_code: str, preferred_channel: str = "email", thread=True) -> None:
        """
        Send password reset OTP to the user.
        """
        context = {
            'user': self.user,
            'otp_code': otp_code,
        }
        Notifier._send_email(
            template_name='notifications/emails/auth/otp/password_reset_otp.html',
            subject='Password Reset OTP',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        # Channel Level Notification can be added here in future
        # ...
    
    def send_recovery_codes(self, recovery_codes: list[str], qr_image_url: str | None, thread=True) -> None:
        """
        Send account recovery codes to the user.
        """
        context = {
            'user': self.user,
            'recovery_codes': recovery_codes,
            'qr_code_url': qr_image_url,
        }
        Notifier._send_email(
            template_name='notifications/emails/auth/recovery_codes.html',
            subject='Your Account Recovery Codes',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        # Channel Level Notification can be added here in future
        # ...

    def send_transaction_made(self, txn, thread=True):
        context = {
            'user': self.user,
            'txn': txn,
        }
        Notifier._send_email(
            template_name='notifications/emails/payments/transaction_made.html',
            subject='Transaction Success',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        in_app_notify(
            self.user,
            "Transaction Successful",
            f"Your transaction has been processed successfully.",
            "wallet",
        )

    def send_manual_disbursement_notification(self, *a, **kw):
        pass
    
    
    def send_automated_disbursement_notification(self, *a, **kw):
        pass
        
    
    def send_loan_repayment_notification(self, loan, amount, thread=True):
        context = {
            'user': self.user,
            'loan': loan,
            'amount': amount,
        }
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_repayment_notification.html',
            subject='Loan Repayment Received',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        
        # we should notify the admins as well
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_repayment_notification_admin.html',
            subject='Loan Repayment Received',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        
        in_app_notify(
            self.user,
            "Loan Repayment Received",
            f"Your loan repayment of ₦{amount:,.2f} has been received and processed.",
            "loan",
        )

    def send_when_loan_application_is_made(self, loan_application, thread=True):
        context = {
            'user': self.user,
            'loan_application': loan_application,
        }
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_application_submitted.html',
            subject='Loan Application Submitted',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        
        # we should notify the admins as well
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_application_submitted_admin.html',
            subject='New Loan Application Submitted',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        
        in_app_notify(
            self.user,
            "Loan Application Submitted",
            "Your loan application has been submitted and is under review. We will notify you of any updates.",
            "loan",
        )

    def send_when_loan_application_is_approved(self, loan, thread=True):
        context = {
            'user': self.user,
            'loan': loan,
        }
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_application_approved.html',
            subject='Loan Application Approved',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        
        # we should notify the admins as well
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_application_approved_admin.html',
            subject='Loan Application Approved',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            self.user,
            "Loan Application Approved",
            "Congratulations! Your loan application has been approved.",
            "loan",
        )

    def send_when_loan_application_is_rejected(self, loan_application, thread=True):
        """
        Send rejection email to user and admins when a loan application is rejected.
        """
        context = {
            'user': self.user,
            'loan_application': loan_application,
        }
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_application_rejected.html',
            subject='Loan Application Update',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        
        # Notify admins as well
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_application_rejected_admin.html',
            subject='Loan Application Rejected',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            self.user,
            "Loan Application Update",
            "Your loan application has been reviewed. Please log in for details.",
            "loan",
        )

    # ==========================================
    # LOAN PRODUCT NOTIFICATIONS (Admin only)
    # ==========================================
    
    def send_loan_product_created_notification(self, product, thread=True):
        """
        Notify admins when a new loan product is created.
        """
        context = {
            'user': self.user,  # the admin who created the product
            'product': product,
        }
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_product_created_admin.html',
            subject=f'New Loan Product Created: {product.name}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        # Channel Level Notification can be added here in future
        # ...
    
    def send_loan_product_updated_notification(self, product, thread=True):
        """
        Notify admins when a loan product is updated.
        """
        context = {
            'user': self.user,  # the admin who updated the product
            'product': product,
        }
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_product_updated_admin.html',
            subject=f'Loan Product Updated: {product.name}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        # Channel Level Notification can be added here in future
        # ...
    
    def send_loan_product_deleted_notification(self, product_name, thread=True):
        """
        Notify admins when a loan product is deleted.
        """
        context = {
            'user': self.user,  # the admin who deleted the product
            'product_name': product_name,
        }
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_product_deleted_admin.html',
            subject=f'Loan Product Deleted: {product_name}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        # Channel Level Notification can be added here in future
        # ...
    
        
    # ==========================================
    # LOAN DISBURSEMENT NOTIFICATIONS
    # ==========================================
    
    def send_when_loan_is_added_to_disbursement_queue(self, queue_entry, thread=True):
        """
        Notify user and admins when a loan is added to the disbursement queue.
        """
        context = {
            'user': self.user,
            'queue_entry': queue_entry,
        }
        # Notify the user
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_disbursement_queued.html',
            subject='Your Loan is Being Processed',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        
        # Notify admins who can disburse loans
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True),
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_disbursement_queued_admin.html',
            subject=f'Loan Queued for Disbursement: ₦{queue_entry.loan.principal_amount:,.2f}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            self.user,
            "Loan Processing",
            "Your loan has been queued for disbursement and is being processed.",
            "loan",
        )

    # templates does't exist yet
    def send_loan_disbursed_notification(self, loan, thread=True):
        """
        Notify user when their loan has been disbursed.
        """
        context = {
            'user': self.user,
            'loan': loan,
        }
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_disbursed_notification.html',
            subject='Loan Disbursed Successfully',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True),
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/loans/loan_disbursed_notification_admin.html',
            subject='Loan Disbursed Successfully',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            self.user,
            "Loan Disbursed",
            "Your loan funds have been disbursed successfully. Please check your account.",
            "loan",
        )

    # ==========================================
    # INVESTMENT NOTIFICATIONS
    # ==========================================

    def send_when_investment_is_created(self, investment, thread=True):
        """
        Send confirmation email when a new investment application is created.
        """
        context = {
            'user': self.user,
            'investment': investment,
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_created.html',
            subject='Investment Application Received',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )

        # Notify admins
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_created_admin.html',
            subject=f'New Investment Application: ₦{investment.principal_amount:,.2f}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            self.user,
            "Investment Application Received",
            "Your investment application has been received and is under review.",
            "investment",
        )

    def send_when_investment_is_approved(self, investment, thread=True):
        """
        Send email when an investment is approved.
        """
        context = {
            'user': investment.user,
            'investment': investment,
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_approved.html',
            subject=f'Investment Approved - {investment.product.name}',
            recipient_emails=[investment.user.email.lower()],
            context=context,
            thread=thread,
        )

        # Notify admins
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_approved_admin.html',
            subject=f'Investment Approved: ₦{investment.principal_amount:,.2f}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            investment.user,
            "Investment Approved",
            f"Your investment in {investment.product.name} has been approved!",
            "investment",
        )

    def send_when_investment_is_rejected(self, investment, thread=True):
        """
        Send email when an investment is rejected.
        """
        context = {
            'user': investment.user,
            'investment': investment,
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_rejected.html',
            subject='Investment Application Update',
            recipient_emails=[investment.user.email.lower()],
            context=context,
            thread=thread,
        )

        # Notify admins
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_rejected_admin.html',
            subject='Investment Application Rejected',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            investment.user,
            "Investment Update",
            "Your investment application has been reviewed. Please log in for details.",
            "investment",
        )

    def send_when_investment_is_cancelled(self, investment, thread=True):
        """
        Send email when an investment is cancelled by the user.
        """
        context = {
            'user': self.user,
            'investment': investment,
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_cancelled.html',
            subject=f'Investment Cancelled - {investment.product.name}',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )

    def send_when_investment_matures(self, investment, thread=True):
        """
        Send email when an investment reaches maturity.
        """
        earned = investment.amount_earned()
        total_return = investment.principal_amount + earned
        context = {
            'user': investment.user,
            'investment': investment,
            'earned': earned,
            'total_return': total_return,
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_matured.html',
            subject=f'Investment Matured - {investment.product.name}',
            recipient_emails=[investment.user.email.lower()],
            context=context,
            thread=thread,
        )

        # Notify admins
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_matured_admin.html',
            subject=f'Investment Matured: ₦{total_return:,.2f}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
        in_app_notify(
            investment.user,
            "Investment Matured",
            f"Your investment in {investment.product.name} has reached maturity. Total return: ₦{total_return:,.2f}.",
            "investment",
        )

    def send_investment_maturity_reminder(self, investment, days_remaining: int, thread=True):
        """
        Send reminder that an investment is about to mature.
        """
        earned = investment.amount_earned()
        total_return = investment.principal_amount + earned
        context = {
            'user': investment.user,
            'investment': investment,
            'days_remaining': days_remaining,
            'earned': earned,
            'total_return': total_return,
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_maturity_reminder.html',
            subject=f'Investment Maturing Soon - {investment.product.name}',
            recipient_emails=[investment.user.email.lower()],
            context=context,
            thread=thread,
        )

    # ==========================================
    # INVESTMENT PRODUCT NOTIFICATIONS (Admin only)
    # ==========================================

    def send_investment_product_created_notification(self, product, thread=True):
        """
        Notify admins when a new investment product is created.
        """
        context = {
            'user': self.user,
            'product': product,
        }
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_product_created_admin.html',
            subject=f'New Investment Product Created: {product.name}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )

    def send_investment_product_updated_notification(self, product, thread=True):
        """
        Notify admins when an investment product is updated.
        """
        context = {
            'user': self.user,
            'product': product,
        }
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_product_updated_admin.html',
            subject=f'Investment Product Updated: {product.name}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )

    def send_investment_product_deleted_notification(self, product_name, thread=True):
        """
        Notify admins when an investment product is deleted/deactivated.
        """
        context = {
            'user': self.user,
            'product_name': product_name,
        }
        admin_emails = User.objects.filter(
            Q(is_superuser=True) | Q(is_staff=True)
        ).values_list('email', flat=True)
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_product_deleted_admin.html',
            subject=f'Investment Product Deactivated: {product_name}',
            recipient_emails=set(email.lower() for email in admin_emails if email),
            context=context,
            thread=thread,
        )
    
    def send_investment_too_low(self, investment_product, amount: Decimal, thread=True):
        """
        Send email when an investment is rejected because the amount is below
        the plan's minimum requirement and has been refunded to the user's wallet.
        """
        context = {
            'user': self.user,
            'investment_product': investment_product,
            'amount': amount,
        }
        Notifier._send_email(
            template_name='notifications/emails/investments/investment_too_low.html',
            subject=f'Investment Refunded - Amount Below Minimum for {investment_product.name}',
            recipient_emails=[self.user.email.lower()],
            context=context,
            thread=thread,
        )
        in_app_notify(
            self.user,
            "Investment Refunded",
            f"Your investment of ₦{amount:,.2f} was below the minimum for {investment_product.name} and has been refunded.",
            "investment",
        )