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
              
              // Check for specific error types
              if (result.error && result.error.includes('Unauthenticated')) {
                console.error('❌ MAILERSEND_API_TOKEN appears to be invalid or expired');
                console.error('❌ Please check your MailerSend API token in the dashboard');
              } else if (result.error && result.error.includes('Trial accounts can only send emails to the administrator')) {
                console.log('⚠️  MAILERSEND TRIAL LIMITATION: Can only send to administrator email');
                console.log('⚠️  In production, upgrade MailerSend account or configure SMTP fallback');
                console.log('⚠️  For now, email functionality is limited to admin testing');
              }
              
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
  clientName?: string;
  therapistName: string;
  invitationToken: string;
  baseUrl: string;
}

export async function sendClientInvitation(data: ClientInvitationData): Promise<boolean> {
  const clientDisplayName = data.clientName || data.clientEmail.split('@')[0];
  const invitationLink = `${data.baseUrl}/accept-invitation?token=${data.invitationToken}`;
  
  const emailData = {
    type: 'client_invitation',
    to: data.clientEmail,
    subject: `🎯 Welcome to ${data.therapistName}'s Speech Therapy Program!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; border-radius: 16px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);">
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">🗣️ Welcome to Obla!</h1>
          <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">Your Journey to Better Speech Starts Here</p>
        </div>
        
        <!-- Personal Greeting -->
        <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">Hi ${clientDisplayName}! 👋</h2>
          <p style="color: #666; line-height: 1.7; font-size: 16px; margin-bottom: 20px;">
            Great news! <strong style="color: #667eea;">${data.therapistName}</strong> has invited you to join their speech therapy program on Obla. 
            This platform will help you practice speech exercises, track your progress, and improve your communication skills in a fun and engaging way.
          </p>
          
          <!-- Key Benefits -->
          <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px;">What you'll get:</h3>
            <ul style="color: #666; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>🎯 Personalized speech exercises assigned by your therapist</li>
              <li>📊 Real-time pronunciation feedback and progress tracking</li>
              <li>📱 Practice anywhere, anytime on any device</li>
            </ul>
          </div>
        </div>
        
        <!-- Call to Action -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="${invitationLink}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); transition: transform 0.2s;">
            🚀 Join Your Program Now
          </a>
          <p style="color: #888; margin: 15px 0 0 0; font-size: 14px;">Click the button above to create your account and get started!</p>
        </div>
        
        <!-- Encouragement -->
        <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
          <h3 style="color: #2d3436; margin: 0 0 10px 0; font-size: 18px;">✨ You've Got This!</h3>
          <p style="color: #2d3436; margin: 0; line-height: 1.6; font-size: 15px;">
Your therapist believes in your potential, and we're here to support you every step of the way.
          </p>
        </div>
        
        <!-- Support -->
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h3 style="color: #333; margin-top: 0; font-size: 18px;">💬 Need Help?</h3>
          <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
            If you have any questions about getting started or using the platform, don't hesitate to reach out to your therapist <strong>${data.therapistName}</strong> or our support team.
          </p>
          <p style="color: #666; margin: 0; font-size: 14px;">
            <strong>Remember:</strong> This invitation link is secure and personal to you. Please don't share it with others.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #eee;">
          <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;"><strong>Obla Speech Therapy Platform</strong></p>
          <p style="color: #bbb; font-size: 12px; margin: 0;">Empowering better communication, one word at a time.</p>
        </div>
      </div>
    `
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