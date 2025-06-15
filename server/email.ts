import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

// Initialize SendGrid service if API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'Question' | 'Bug fix' | 'Enhancement Suggestion';
}

export async function sendContactForm(data: ContactFormData): Promise<boolean> {
  if (!mailService) {
    console.error('SendGrid API key not configured');
    return false;
  }

  try {
    await mailService.send({
      to: 'adamlowendick@gmail.com',
      from: 'noreply@obla.app', // This should be a verified sender
      subject: `[Obla Contact] ${data.category}: ${data.subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Category:</strong> ${data.category}</p>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
      `,
      text: `
        New Contact Form Submission
        Category: ${data.category}
        Name: ${data.name}
        Email: ${data.email}
        Subject: ${data.subject}
        Message: ${data.message}
      `
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}