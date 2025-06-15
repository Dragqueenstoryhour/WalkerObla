import { spawn } from 'child_process';
import { promisify } from 'util';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'Question' | 'Bug fix' | 'Enhancement Suggestion';
}

export async function sendContactForm(data: ContactFormData): Promise<boolean> {
  if (!process.env.MAILERSEND_API_TOKEN) {
    console.error('MailerSend API token not configured');
    return false;
  }

  return new Promise((resolve) => {
    try {
      // Set the MailerSend API token as environment variable for the Python script
      const env = { 
        ...process.env, 
        MAILERSEND_API_TOKEN: process.env.MAILERSEND_API_TOKEN 
      };
      
      const pythonProcess = spawn('python3', ['server/mailersend_service.py'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env
      });

      // Send data to Python script via stdin
      const inputData = JSON.stringify(data);
      pythonProcess.stdin.write(inputData);
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
              console.log('✅ Contact email sent successfully via MailerSend');
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