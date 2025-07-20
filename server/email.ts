import { spawn } from 'child_process';
import { promisify } from 'util';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'Question' | 'Bug fix' | 'Enhancement Suggestion';
}

async function callMailerSend(data: any): Promise<boolean> {
  if (!process.env.MAILERSEND_API_TOKEN) {
    console.error('MailerSend API token not configured');
    return false;
  }

  return new Promise((resolve) => {
    try {
      const env = { 
        ...process.env, 
        MAILERSEND_API_TOKEN: process.env.MAILERSEND_API_TOKEN 
      };
      
      const pythonProcess = spawn('python3', ['server/mailersend_service.py'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env
      });

      pythonProcess.stdin.write(JSON.stringify(data));
      pythonProcess.stdin.end();

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            if (result.success) {
              console.log('✅ Email sent successfully via MailerSend');
              resolve(true);
            } else {
              console.error('❌ MailerSend error:', result.error);
              resolve(false);
            }
          } catch (parseError) {
            console.error('❌ Failed to parse MailerSend response:', parseError);
            console.error('Raw output:', output);
            resolve(false);
          }
        } else {
          console.error('❌ Python script failed with code:', code);
          console.error('Error output:', errorOutput);
          resolve(false);
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('❌ Failed to spawn Python process:', error);
        resolve(false);
      });

    } catch (error) {
      console.error('❌ MailerSend service error:', error);
      resolve(false);
    }
  });
}

export async function sendContactForm(data: ContactFormData): Promise<boolean> {
  return callMailerSend(data);
}

interface AssignmentNotificationData {
  clientEmail: string;
  clientName: string;
  therapistName: string;
  assignmentTitle: string;
  assignmentDescription?: string;
  dueDate?: string;
  assignmentId: number;
  baseUrl: string;
}

interface ClientInvitationData {
  clientEmail: string;
  therapistName: string;
  invitationToken: string;
  baseUrl: string;
}

export async function sendClientInvitation(data: ClientInvitationData): Promise<boolean> {
  const emailData = {
    type: 'client_invitation',
    to_email: data.clientEmail,
    subject: `Invitation to Join ${data.therapistName}'s Speech Therapy Program`,
    therapist_name: data.therapistName,
    invitation_link: `${data.baseUrl}/accept-invitation?token=${data.invitationToken}`,
    assignments_link: `${data.baseUrl}/?tab=assignments`
  };
  return callMailerSend(emailData);
}

export async function sendAssignmentNotification(data: AssignmentNotificationData): Promise<boolean> {
  if (!process.env.MAILERSEND_API_TOKEN) {
    console.error('MailerSend API token not configured');
    return false;
  }

  return new Promise((resolve) => {
    try {
      const dueText = data.dueDate ? `Due: ${new Date(data.dueDate).toLocaleDateString()}` : 'No due date specified';
      const deepLink = `${data.baseUrl}/my-words?tab=assignments&assignment=${data.assignmentId}`;
      
      const env = { 
        ...process.env, 
        MAILERSEND_API_TOKEN: process.env.MAILERSEND_API_TOKEN 
      };
      
      const pythonProcess = spawn('python3', ['server/mailersend_service.py'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Assignment notification email sent successfully to:', data.clientEmail);
          resolve(true);
        } else {
          console.error('Error sending assignment notification email:', errorOutput);
          resolve(false);
        }
      });

      const emailData = {
        type: 'assignment_notification',
        to: data.clientEmail,
        subject: `New Homework Assignment from ${data.therapistName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px;">📚 New Homework Assignment</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">From your speech therapist</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${data.clientName}!</h2>
              <p style="color: #666; line-height: 1.6;">Your therapist <strong>${data.therapistName}</strong> has assigned you a new homework exercise to help with your speech practice.</p>
            </div>
            
            <div style="border-left: 4px solid #667eea; padding-left: 20px; margin-bottom: 30px;">
              <h3 style="color: #333; margin: 0 0 10px 0;">${data.assignmentTitle}</h3>
              ${data.assignmentDescription ? `<p style="color: #666; margin: 0 0 10px 0;">${data.assignmentDescription}</p>` : ''}
              <p style="color: #888; margin: 0; font-size: 14px;">${dueText}</p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${deepLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                🎯 Start Assignment
              </a>
            </div>
            
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3;">
              <h4 style="color: #1976D2; margin: 0 0 10px 0;">💡 Tip for Success</h4>
              <p style="color: #666; margin: 0; line-height: 1.6;">Practice in a quiet space where you can focus. Take your time with each word and don't worry about perfect scores - consistent practice is what matters most!</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">This email was sent from Obla Speech Therapy Platform</p>
            </div>
          </div>
        `
      };

      pythonProcess.stdin.write(JSON.stringify(emailData));
      pythonProcess.stdin.end();

    } catch (error) {
      console.error('Error sending assignment notification email:', error);
      resolve(false);
    }
  });
}