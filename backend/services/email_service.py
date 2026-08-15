"""
Finora AI - SMTP Email Service
Sends styled HTML email notifications (OTP verification, Welcome email, Password reset confirmation).
Includes fallback console logging when SMTP credentials are unavailable.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.config import settings
from backend.utils.logger import get_logger

logger = get_logger("finora.email")


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_name = settings.EMAILS_FROM_NAME
        self.from_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER or "no-reply@finora.ai"

    def _is_smtp_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_password)

    def _send_email_html(self, to_email: str, subject: str, html_body: str) -> dict:
        if not self._is_smtp_configured():
            logger.info(
                f"[EMAIL CONSOLE FALLBACK]\nTo: {to_email}\nSubject: {subject}\n"
                f"Content preview:\n{html_body[:300]}..."
            )
            return {"sent": False, "method": "console", "detail": "SMTP credentials not configured in environment."}

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            part = MIMEText(html_body, "html")
            msg.attach(part)

            server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10)
            server.ehlo()
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.from_email, [to_email], msg.as_string())
            server.quit()

            logger.info(f"Email successfully delivered to {to_email} via SMTP | Subject: {subject}")
            return {"sent": True, "method": "smtp", "detail": "Email dispatched successfully."}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {e}", exc_info=True)
            logger.info(f"[EMAIL CONSOLE FALLBACK AFTER FAILURE] To: {to_email} | Subject: {subject}")
            return {"sent": False, "method": "fallback", "detail": f"SMTP error: {str(e)}"}

    def send_otp_email(self, to_email: str, otp_code: str, expires_minutes: int = 5) -> dict:
        subject = f"[{otp_code}] Your Finora AI Verification Code"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }}
            .logo {{ text-align: center; margin-bottom: 24px; }}
            .logo h2 {{ color: #7c3aed; font-size: 24px; margin: 0; font-weight: 800; tracking: -0.5px; }}
            .title {{ font-size: 18px; font-weight: 700; text-align: center; color: #ffffff; margin-bottom: 12px; }}
            .text {{ font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.6; margin-bottom: 24px; }}
            .otp-box {{ background: rgba(124, 58, 237, 0.1); border: 2px dashed #7c3aed; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }}
            .otp-code {{ font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #a78bfa; letter-spacing: 8px; margin: 0; }}
            .badge {{ display: inline-block; background: #1e293b; color: #38bdf8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-top: 8px; }}
            .footer {{ font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; pt: 16px; margin-top: 24px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h2>Finora AI</h2>
            </div>
            <div class="title">Security Verification Code</div>
            <p class="text">You requested a password reset for your Finora AI account. Use the 6-digit verification code below to proceed:</p>
            <div class="otp-box">
              <div class="otp-code">{otp_code}</div>
              <div class="badge">Valid for {expires_minutes} minutes</div>
            </div>
            <p class="text">If you did not request this verification code, please ignore this email or contact support if you suspect unauthorized access.</p>
            <div class="footer">
              &copy; Finora AI Platform. Enterprise Financial Intelligence. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """
        return self._send_email_html(to_email, subject, html_body)

    def send_welcome_email(self, to_email: str, name: str) -> dict:
        subject = "Welcome to Finora AI - AI Financial Workspace"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 20px; }}
            .card {{ max-width: 500px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 30px; }}
            .btn {{ display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="color: #7c3aed;">Welcome to Finora AI, {name}! 🎉</h2>
            <p>Your account has been created successfully. You can now analyze transaction datasets, forecast savings, and receive automated financial guidance.</p>
            <a href="http://localhost:5173/login" class="btn">Launch Dashboard</a>
          </div>
        </body>
        </html>
        """
        return self._send_email_html(to_email, subject, html_body)

    def send_password_changed_email(self, to_email: str, name: str) -> dict:
        subject = "Security Alert: Finora AI Password Changed"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 20px; }}
            .card {{ max-width: 500px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 30px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="color: #22c55e;">Password Changed Successfully</h2>
            <p>Hi {name},</p>
            <p>This is confirmation that the password for your Finora AI account (<strong>{to_email}</strong>) was changed successfully.</p>
            <p>If you did not make this change, please reset your password immediately.</p>
          </div>
        </body>
        </html>
        """
        return self._send_email_html(to_email, subject, html_body)


email_service = EmailService()
