#!/usr/bin/env python3
from mailersend import emails
import sys
import json
import os

def send_contact_email(name, email, category, subject, message):
    """Send contact form email using MailerSend"""
    try:
        # Get API token from environment
        api_token = os.getenv('MAILERSEND_API_TOKEN')
        if not api_token:
            raise Exception("MAILERSEND_API_TOKEN environment variable not set")
        
        # Initialize MailerSend client
        mailer = emails.NewEmail(api_token)
        
        # Create email message structure
        mail_body = {}
        
        # Set from address (using verified domain)
        mail_from = {
            "name": "Obla App",
            "email": "noreply@obla.me"
        }
        mailer.set_mail_from(mail_from, mail_body)
        
        # Set to address
        mail_to = [
            {
                "name": "Adam Lowendick",
                "email": "adamlowendick@gmail.com"
            }
        ]
        mailer.set_mail_to(mail_to, mail_body)
        
        # Set subject
        email_subject = f"[Obla Contact] {category}: {subject}"
        mailer.set_subject(email_subject, mail_body)
        
        # Set HTML content
        html_content = f"""
        <html>
        <body>
            <h3>New Contact Form Submission</h3>
            <p><strong>Category:</strong> {category}</p>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Subject:</strong> {subject}</p>
            <p><strong>Message:</strong></p>
            <p>{message.replace(chr(10), '<br>')}</p>
        </body>
        </html>
        """
        mailer.set_html_content(html_content, mail_body)
        
        # Set plain text content
        text_content = f"""New Contact Form Submission

Category: {category}
Name: {name}
Email: {email}
Subject: {subject}
Message: {message}"""
        mailer.set_plaintext_content(text_content, mail_body)
        
        # Send email
        result = mailer.send(mail_body)
        
        # Check if result indicates an error
        if isinstance(result, str):
            # Handle HTTP error responses
            if result.startswith(('400', '401', '403', '404', '422', '429', '500')):
                error_code = result.split('\n')[0]
                try:
                    error_details = json.loads(result.split('\n', 1)[1])
                    error_msg = error_details.get('message', f'HTTP {error_code} error')
                except:
                    error_msg = f'HTTP {error_code} error'
                return {"success": False, "error": f"MailerSend API error: {error_msg}"}
        
        return {"success": True, "result": result}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_client_invitation(to_email, therapist_name, invitation_link, assignments_link):
    """Send client invitation email using MailerSend"""
    try:
        # Get API token from environment
        api_token = os.getenv('MAILERSEND_API_TOKEN')
        if not api_token:
            raise Exception("MAILERSEND_API_TOKEN environment variable not set")
        
        # Initialize MailerSend client
        mailer = emails.NewEmail(api_token)
        
        # Create email message structure
        mail_body = {}
        
        # Set from address (using verified domain)
        mail_from = {
            "name": "Obla Speech Therapy",
            "email": "noreply@obla.me"
        }
        mailer.set_mail_from(mail_from, mail_body)
        
        # Set to address
        mail_to = [
            {
                "name": "Client",
                "email": to_email
            }
        ]
        mailer.set_mail_to(mail_to, mail_body)
        
        # Set subject
        email_subject = f"Invitation to Join {therapist_name}'s Speech Therapy Program"
        mailer.set_subject(email_subject, mail_body)
        
        # Set HTML content with professional styling
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ 
                    display: inline-block; 
                    background-color: #4F46E5; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold; 
                    margin: 20px 0; 
                }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 Welcome to Obla Speech Therapy</h1>
                </div>
                <div class="content">
                    <p>Hello!</p>
                    <p>You've been invited by <strong>{therapist_name}</strong> to join their speech therapy program using Obla, an AI-powered speech therapy platform.</p>
                    
                    <p>Obla helps you:</p>
                    <ul>
                        <li>Practice pronunciation with real-time feedback</li>
                        <li>Complete assignments from your therapist</li>
                        <li>Track your progress over time</li>
                        <li>Access personalized exercises</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="{invitation_link}" class="button">Accept Invitation & Get Started</a>
                    </div>
                    
                    <p>Once you accept and log in, you can access your assignments directly at:</p>
                    <p><a href="{assignments_link}" style="color: #4F46E5;">My Assignments</a></p>
                    
                    <p>If you have any questions, please contact your therapist {therapist_name} directly.</p>
                    
                    <p>Best regards,<br>The Obla Team</p>
                </div>
                <div class="footer">
                    <p>This invitation will expire in 7 days.</p>
                    <p>© 2025 Obla Speech Therapy Platform</p>
                </div>
            </div>
        </body>
        </html>
        """
        mailer.set_html_content(html_content, mail_body)
        
        # Set plain text content
        text_content = f"""Welcome to Obla Speech Therapy!

You've been invited by {therapist_name} to join their speech therapy program using Obla, an AI-powered speech therapy platform.

Obla helps you:
- Practice pronunciation with real-time feedback
- Complete assignments from your therapist
- Track your progress over time
- Access personalized exercises

To get started, please accept your invitation by visiting:
{invitation_link}

Once you accept and log in, you can access your assignments at:
{assignments_link}

If you have any questions, please contact your therapist {therapist_name} directly.

Best regards,
The Obla Team

This invitation will expire in 7 days.
© 2025 Obla Speech Therapy Platform"""
        mailer.set_plaintext_content(text_content, mail_body)
        
        # Send email
        result = mailer.send(mail_body)
        
        # Check if result indicates an error
        if isinstance(result, str):
            # Handle HTTP error responses
            if result.startswith(('400', '401', '403', '404', '422', '429', '500')):
                error_code = result.split('\n')[0]
                try:
                    error_details = json.loads(result.split('\n', 1)[1])
                    error_msg = error_details.get('message', f'HTTP {error_code} error')
                except:
                    error_msg = f'HTTP {error_code} error'
                return {"success": False, "error": f"MailerSend API error: {error_msg}"}
        
        return {"success": True, "result": result}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_custom_email(to_email, subject, html_content):
    """Send custom HTML email using MailerSend"""
    try:
        # Get API token from environment
        api_token = os.getenv('MAILERSEND_API_TOKEN')
        if not api_token:
            raise Exception("MAILERSEND_API_TOKEN environment variable not set")
        
        # Initialize MailerSend client
        mailer = emails.NewEmail(api_token)
        
        # Create email message structure
        mail_body = {}
        
        # Set from address (using verified domain)
        mail_from = {
            "name": "Obla Speech Therapy",
            "email": "noreply@obla.me"
        }
        mailer.set_mail_from(mail_from, mail_body)
        
        # Set to address
        mail_to = [
            {
                "name": "Client",
                "email": to_email
            }
        ]
        mailer.set_mail_to(mail_to, mail_body)
        
        # Set subject
        mailer.set_subject(subject, mail_body)
        
        # Set HTML content (the beautiful template from TypeScript)
        mailer.set_html_content(html_content, mail_body)
        
        # Set plain text content (extract text from HTML)
        import re
        text_content = re.sub('<[^<]+?>', '', html_content).strip()
        text_content = re.sub(r'\s+', ' ', text_content)  # Clean up whitespace
        mailer.set_plaintext_content(text_content, mail_body)
        
        # Send email
        result = mailer.send(mail_body)
        
        # Check if result indicates an error
        if isinstance(result, str):
            # Handle HTTP error responses
            if result.startswith(('400', '401', '403', '404', '422', '429', '500')):
                error_code = result.split('\n')[0]
                try:
                    error_details = json.loads(result.split('\n', 1)[1])
                    error_msg = error_details.get('message', f'HTTP {error_code} error')
                except:
                    error_msg = f'HTTP {error_code} error'
                return {"success": False, "error": f"MailerSend API error: {error_msg}"}
        
        return {"success": True, "result": result}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Check email type
        email_type = input_data.get('type', 'contact')
        
        if email_type == 'client_invitation':
            # Client invitation email - handle both old and new format
            to_email = input_data.get('to', input_data.get('to_email', ''))
            therapist_name = input_data.get('therapist_name', '')
            invitation_link = input_data.get('invitation_link', '')
            assignments_link = input_data.get('assignments_link', '')
            html_content = input_data.get('html', '')
            email_subject = input_data.get('subject', f"Invitation to Join {therapist_name}'s Speech Therapy Program")
            
            if html_content:
                # Use the new beautiful HTML template from TypeScript
                result = send_custom_email(to_email, email_subject, html_content)
            else:
                # Fallback to old template
                result = send_client_invitation(to_email, therapist_name, invitation_link, assignments_link)
        elif email_type == 'assignment_notification':
            to_email = input_data.get('to', '')
            email_subject = input_data.get('subject', '')
            html_content = input_data.get('html', '')
            result = send_custom_email(to_email, email_subject, html_content)
        else:
            # Contact form email (default)
            name = input_data.get('name', '')
            email = input_data.get('email', '')
            category = input_data.get('category', '')
            subject = input_data.get('subject', '')
            message = input_data.get('message', '')
            
            result = send_contact_email(name, email, category, subject, message)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {"success": False, "error": str(e)}
        print(json.dumps(error_result))
        sys.exit(1)