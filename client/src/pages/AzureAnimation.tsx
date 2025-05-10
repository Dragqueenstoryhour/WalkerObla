import React from 'react';
import { FacialAnimation } from '@/components/FacialAnimation';

export function AzureAnimationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Azure Viseme-Based Facial Animation</h1>
      
      <div className="mb-8">
        <p className="text-gray-700 mb-2">
          This page demonstrates facial animation using Azure Speech Service's viseme events.
          Azure identifies 22 different viseme positions (mouth shapes) that correspond to specific phonemes.
        </p>
        <p className="text-gray-700">
          Type some text, choose a voice, and click "Generate Animation" to see the facial animation.
          Use "Hear Phrase" to play audio without animation, or "Preview Visemes" to examine each individual mouth shape.
        </p>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <FacialAnimation initialText="Hello! Azure visemes create realistic facial animations." />
      </div>
    </div>
  );
}

export default AzureAnimationPage;