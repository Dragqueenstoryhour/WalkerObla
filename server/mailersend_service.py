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
        
        # Set from address (using MailerSend trial domain)
        mail_from = {
            "name": "Obla App",
            "email": "MS_G4nOx8@trial-jy7zpl9k3o0l5vx6.mlsender.net"
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
        
        return {"success": True, "result": result}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Extract parameters
        name = input_data.get('name', '')
        email = input_data.get('email', '')
        category = input_data.get('category', '')
        subject = input_data.get('subject', '')
        message = input_data.get('message', '')
        
        # Send email
        result = send_contact_email(name, email, category, subject, message)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {"success": False, "error": str(e)}
        print(json.dumps(error_result))
        sys.exit(1)