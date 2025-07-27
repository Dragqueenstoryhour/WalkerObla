import { Router } from 'express';
import { sendContactForm } from '../email';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { z } from 'zod';
import { supabase } from '../supabaseClient';

const router = Router();



// Contact form endpoint
router.post('/', catchAsync(async (req, res) => {
  const contactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    category: z.enum(['Question', 'Bug fix', 'Enhancement Suggestion']),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required")
  });

  const contactData = contactSchema.parse(req.body);
  
  const successSend = await sendContactForm(contactData);
  
  if (successSend) {
    return success(res, { message: 'Contact form submitted successfully' });
  } else {
    return error(res, 'Failed to send contact form');
  }
}));

export default router;
