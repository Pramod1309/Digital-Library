"""
Add this code to server.py to provide email OTP fallback when SMS credits are unavailable
"""

import smtplib
from email.message import EmailMessage

def send_email_otp(email: str, otp_code: str, school_name: str) -> bool:
    """Send OTP via email as fallback when SMS fails"""
    try:
        # Email configuration from .env
        email_host = os.environ.get("EMAIL_HOST")
        email_port = int(os.environ.get("EMAIL_PORT", "587"))
        email_user = os.environ.get("EMAIL_USER")
        email_password = os.environ.get("EMAIL_PASSWORD")
        from_email = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@koshquest.in")
        from_name = os.environ.get("DEFAULT_FROM_NAME", "Koshquest")
        
        # Create email message
        msg = EmailMessage()
        msg['Subject'] = f"Koshquest Password Reset OTP - {school_name}"
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = email
        
        # Email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Koshquest Password Reset</h2>
                <p>Dear {school_name},</p>
                <p>Your One-Time Password (OTP) for password reset is:</p>
                <div style="background-color: #007bff; color: white; padding: 15px; 
                            text-align: center; font-size: 24px; font-weight: bold; 
                            border-radius: 5px; margin: 20px 0;">
                    {otp_code}
                </div>
                <p>This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
                <p>If you didn't request this OTP, please contact support immediately.</p>
                <hr style="border: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    This is an automated message from Koshquest Digital Library.
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.add_alternative(html_content, subtype='html')
        
        # Send email
        with smtplib.SMTP(email_host, email_port) as server:
            server.starttls()
            server.login(email_user, email_password)
            server.send_message(msg)
        
        print(f"Email OTP sent successfully to {email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email OTP: {e}")
        return False

# Modified OTP request function with email fallback
def send_otp_with_fallback(mobile_number: str, email: str, otp_code: str, school_name: str):
    """Try SMS first, fallback to email if SMS fails"""
    
    # Try SMS first
    try:
        otp_message = (
            f"Koshquest password reset OTP for {school_name} is {otp_code}. "
            "It is valid for 10 minutes. Do not share this code."
        )
        result = send_brevo_sms(mobile_number, otp_message, "schoolPasswordResetOtp")
        
        if 'messageId' in result:
            print(f"SMS sent successfully with messageId: {result['messageId']}")
            return {"method": "sms", "success": True, "message": "OTP sent via SMS"}
        else:
            print(f"SMS failed, trying email fallback")
            raise Exception("SMS delivery failed")
            
    except Exception as sms_error:
        print(f"SMS failed: {sms_error}")
        
        # Fallback to email
        if email:
            email_success = send_email_otp(email, otp_code, school_name)
            if email_success:
                return {"method": "email", "success": True, "message": "OTP sent via email (SMS unavailable)"}
            else:
                return {"method": "none", "success": False, "message": "Both SMS and email failed"}
        else:
            return {"method": "none", "success": False, "message": "SMS failed and no email available"}

# Example usage in the OTP endpoint:
# In the request_school_password_reset_otp function, replace the SMS call with:
# result = send_otp_with_fallback(normalized_mobile, school.email, otp_code, school.school_name)
