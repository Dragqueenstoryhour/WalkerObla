import { Router } from 'express';
import multer from 'multer';
import { transcribeAudio, processVoiceCommand } from '../openai';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Speech transcription endpoint
router.post('/transcribe', upload.single('audio'), catchAsync(async (req, res) => {
  if (!req.file) {
    return error(res, 'No audio file provided', 400);
  }

  const audioBuffer = req.file.buffer;
  const transcription = await transcribeAudio(audioBuffer);
  
  return success(res, { transcription });
}));

// Voice command processing endpoints
router.post('/command', upload.single('audio'), catchAsync(async (req, res) => {
  if (!req.file) {
    return error(res, 'No audio file provided', 400);
  }

  const audioBuffer = req.file.buffer;
  
  const transcription = await transcribeAudio(audioBuffer);
  
  const result = await processVoiceCommand(transcription);
  
  return success(res, {
    transcription,
    command: result
  });
}));

// Enhanced voice processing endpoint
router.post('/enhanced', upload.single('audio'), catchAsync(async (req, res) => {
  if (!req.file) {
    return error(res, 'No audio file provided', 400);
  }

  const audioBuffer = req.file.buffer;
  
  const transcription = await transcribeAudio(audioBuffer);
  
  const result = await processVoiceCommand(transcription);
  
  return success(res, {
    transcription,
    result,
    success: true
  });
}));

export default router;
