import { LoopsClient } from 'loops';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'Question' | 'Bug fix' | 'Enhancement Suggestion';
}

async function callLoops(emailType: string, data: any): Promise<boolean> {
  console.log('🧪 callLoops called with emailType:', emailType);
  console.log('🔑 LOOPS_API_KEY exists:', !!process.env.LOOPS_API_KEY);
  
  if (!process.env.LOOPS_API_KEY) {
    console.error('❌ Loops API key not configured');
    return false;
  }

  try {
    console.log('📧 Initializing Loops client...');
    const loops = new LoopsClient(process.env.LOOPS_API_KEY);
    
    // Map email types to transactional IDs (these will need to be created in Loops dashboard)
    const transactionalIds = {
      'contact': process.env.LOOPS_CONTACT_TEMPLATE_ID || 'contact-form',
      'client_invitation': process.env.LOOPS_CLIENT_INVITATION_TEMPLATE_ID || 'cmdp2u4m601rq430jt58dl81o',
      'assignment_notification': process.env.LOOPS_ASSIGNMENT_TEMPLATE_ID || 'cmdp2sl6n09qq2i0i3u5stj4q',
      'password_setup_invitation': process.env.LOOPS_PASSWORD_SETUP_TEMPLATE_ID || 'cmdp3ucdt08460h0ieaiqez0l'
    };

    const transactionalId = transactionalIds[emailType as keyof typeof transactionalIds];
    console.log('📋 Template ID for', emailType, ':', transactionalId);
    
    if (!transactionalId) {
      console.error(`❌ Unknown email type: ${emailType}`);
      return false;
    }

    const emailPayload = {
      transactionalId,
      email: data.to || data.email,
      dataVariables: data.dataVariables || data
    };
    
    console.log('📤 Sending email with payload:', JSON.stringify(emailPayload, null, 2));

    const response = await loops.sendTransactionalEmail(emailPayload);

    console.log('📥 Loops response:', JSON.stringify(response, null, 2));

    if (response.success) {
      console.log('✅ Email sent successfully via Loops');
      return true;
    } else {
      console.error('❌ Loops error:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Loops service error:', error);
    return false;
  }
}

export async function sendContactForm(data: ContactFormData): Promise<boolean> {
  return callLoops('contact', {
    to: 'adamlowendick@gmail.com', // Admin email for contact forms
    dataVariables: {
      name: data.name,
      email: data.email,
      category: data.category,
      subject: data.subject,
      message: data.message
    }
  });
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

interface PasswordSetupInvitationData {
  clientEmail: string;
  clientName?: string;
  therapistName: string;
  passwordSetupLink: string;
  baseUrl: string;
}

export async function sendPasswordSetupInvitation(data: PasswordSetupInvitationData): Promise<boolean> {
  const clientDisplayName = data.clientName || data.clientEmail.split('@')[0];
  
  return callLoops('password_setup_invitation', {
    to: data.clientEmail,
    dataVariables: {
      clientName: clientDisplayName,
      therapistName: data.therapistName,
      passwordSetupLink: data.passwordSetupLink,
      baseUrl: data.baseUrl
    }
  });
}

export async function sendClientInvitation(data: ClientInvitationData): Promise<boolean> {
  const clientDisplayName = data.clientName || data.clientEmail.split('@')[0];
  const invitationLink = `${data.baseUrl}/invite/${data.invitationToken}`;
  
  return callLoops('client_invitation', {
    to: data.clientEmail,
    dataVariables: {
      clientName: clientDisplayName,
      therapistName: data.therapistName,
      invitationLink: invitationLink,
      baseUrl: data.baseUrl
    }
  });
}

export async function sendAssignmentNotification(data: AssignmentNotificationData): Promise<boolean> {
  console.log('🎯 sendAssignmentNotification called with data:', JSON.stringify(data, null, 2));
  
  const deepLink = `${data.baseUrl}/my-words?tab=assignments&assignment=${data.assignmentId}`;
  const clientDisplayName = data.clientName || data.clientEmail.split('@')[0];
  const formattedDueDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString() : null;

  console.log('🔗 Generated assignment link:', deepLink);

  const payload = {
    to: data.clientEmail,
    dataVariables: {
      clientName: clientDisplayName,
      therapistName: data.therapistName,
      assignmentTitle: data.assignmentTitle,
      assignmentDescription: data.assignmentDescription || '',
      dueDate: formattedDueDate || '',
      assignmentLink: deepLink,
      baseUrl: data.baseUrl
    }
  };
  
  console.log('📤 LOOPS PAYLOAD DEBUG: Assignment notification payload:', JSON.stringify(payload, null, 2));
  
  return callLoops('assignment_notification', payload);
}
