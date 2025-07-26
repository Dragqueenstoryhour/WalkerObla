import { Router } from 'express';
import { generateSpeechWithVisemes } from '../azureViseme';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';

const router = Router();

// Viseme generation endpoint
router.post('/generate', catchAsync(async (req, res) => {
  const { text, voice, format, speed } = req.body;
  
  if (!text) {
    return error(res, 'Text is required', 400);
  }

  const speechSpeed = speed || 1.0;
  console.log(`🎭 Generating visemes for text: "${text}" at ${(speechSpeed * 100)}% speed`);
  
  const visemeData = await generateSpeechWithVisemes(
    text,
    voice || "en-US-AriaNeural",
    format || "svg",
    speechSpeed
  );
  
  console.log(`✅ Generated ${visemeData.visemes.length} visemes with ${visemeData.duration.toFixed(2)}s duration`);
  
  console.log("AudioBuffer type:", typeof visemeData.audioBuffer);
  console.log("AudioBuffer length:", visemeData.audioBuffer ? visemeData.audioBuffer.length : 'undefined');
  
  if (!visemeData.audioBuffer || visemeData.audioBuffer.length === 0) {
    return error(res, 'Invalid audio buffer generated', 500);
  }
  
  const audioBase64 = visemeData.audioBuffer.toString('base64');
  console.log("Base64 conversion - type:", typeof audioBase64);
  console.log("Base64 conversion - length:", audioBase64.length);
  console.log("Base64 conversion - first 50 chars:", audioBase64.substring(0, 50));
  
  return success(res, {
    visemes: visemeData.visemes,
    audioBuffer: audioBase64,
    duration: visemeData.duration
  });
}));

export default router;
