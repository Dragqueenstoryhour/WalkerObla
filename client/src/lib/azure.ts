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

    const response = await fetch('/api/pronunciation/assess', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error assessing pronunciation: ${response.statusText}`);
    }

    return await response.json();
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

    // Create blob URL for audio playback
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
}