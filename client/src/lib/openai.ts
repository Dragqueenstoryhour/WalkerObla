import { ReadingContent } from "./types";

// This client-side module handles communication with our backend OpenAI service

export async function generateReadingContent(topic: string, difficulty: string): Promise<ReadingContent> {
  try {
    const response = await fetch('/api/content/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, difficulty }),
      credentials: 'include',
    });

    if (!response.ok) {
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
