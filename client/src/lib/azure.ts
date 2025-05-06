import { PronunciationAssessmentResult } from './types';

// This client-side module handles communication with our backend Azure services

/**
 * Submit a reading recording for pronunciation assessment
 */
export async function submitReadingRecording(
  audioBlob: Blob,
  contentId: number,
  text: string
): Promise<PronunciationAssessmentResult> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('contentId', String(contentId));
    formData.append('text', text);

    console.log(`[Azure Client] Sending audio blob of size ${audioBlob.size} bytes, type: ${audioBlob.type}`);
    console.log(`[Azure Client] Content ID: ${contentId}, Text length: ${text.length} chars`);

    const response = await fetch('/api/pronunciation/assess', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      // Try to parse the error response for more details
      let errorDetails = '';
      try {
        const errorResponse = await response.json();
        errorDetails = errorResponse.error || errorResponse.message || response.statusText;
        console.error('Azure API error details:', errorResponse);
      } catch (e) {
        errorDetails = response.statusText;
      }
      
      throw new Error(`Error assessing pronunciation: ${errorDetails}`);
    }

    const results = await response.json();
    console.log('[Azure Client] Received valid assessment results');
    return results;
  } catch (error) {
    console.error('Error submitting audio for assessment:', error);
    throw error;
  }
}

/**
 * Get phonetic pronunciation for a word
 */
export async function getWordPronunciation(word: string): Promise<string> {
  try {
    const response = await fetch(`/api/pronunciation/word?word=${encodeURIComponent(word)}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error getting word pronunciation: ${response.statusText}`);
    }

    const data = await response.json();
    return data.phonetic;
  } catch (error) {
    console.error('Error getting word pronunciation:', error);
    throw error;
  }
}

/**
 * Synthesize speech from text
 */
export async function synthesizeSpeech(text: string, voice = 'default'): Promise<string> {
  try {
    console.log(`Requesting speech synthesis for: "${text}"`);
    
    const response = await fetch('/api/speech/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error synthesizing speech: ${response.statusText}`);
    }

    // Check if we received audio data
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !(contentType.includes('audio/') || contentType.includes('audio/mpeg'))) {
      console.warn(`Expected audio content type but got: ${contentType}`);
    }
    
    // Log content length to help debug
    const contentLength = response.headers.get('Content-Length');
    console.log(`Received audio data: ${contentLength} bytes`);

    // Get the audio data as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Received empty audio data from server');
    }
    
    // Create a blob with explicit MP3 type for better browser compatibility
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    console.log(`Created blob with size: ${blob.size} bytes and type: ${blob.type}`);
    
    // Create and return blob URL
    const url = URL.createObjectURL(blob);
    return url;
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
}