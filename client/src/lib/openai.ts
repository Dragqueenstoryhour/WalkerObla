import { ReadingContent } from "./types";

// This client-side module handles communication with our backend OpenAI service

export async function generateReadingContent(topic: string, difficulty: string): Promise<ReadingContent> {
  try {
    // Convert difficulty string mapping back to numeric if needed
    // e.g., "easy" to "2", "medium" to "4", etc.
    let numericDifficulty = difficulty;
    
    // If the difficulty is not already a number between 1-8, convert it
    if (!/^[1-8]$/.test(difficulty)) {
      // Reverse mapping from text to number
      switch(difficulty.toLowerCase()) {
        case 'very-easy': numericDifficulty = '1'; break;
        case 'easy': numericDifficulty = '2'; break;
        case 'easy-medium': numericDifficulty = '3'; break;
        case 'medium': numericDifficulty = '4'; break;
        case 'medium-hard': numericDifficulty = '5'; break;
        case 'hard': numericDifficulty = '6'; break;
        case 'very-hard': numericDifficulty = '7'; break;
        case 'expert': numericDifficulty = '8'; break;
        default: numericDifficulty = '4'; // Default to medium
      }
    }
    
    console.log(`Sending API request for content with topic: "${topic}" and numeric difficulty: "${numericDifficulty}"`);

    const response = await fetch('/api/content/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, difficulty: numericDifficulty }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Error response from server:', errorData);
      throw new Error(`Error generating content: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

export async function submitVoiceCommand(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch('/api/voice/command', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error processing voice command: ${response.statusText}`);
    }

    const data = await response.json();
    return data.command;
  } catch (error) {
    console.error('Error submitting voice command:', error);
    throw error;
  }
}

export async function processVoiceCommand(command: string): Promise<any> {
  try {
    const response = await fetch('/api/voice/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error processing voice command: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing voice command:', error);
    throw error;
  }
}
