import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const Animation = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('model', 'claire');

      const response = await fetch('/generate', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (audioRef.current) {
        audioRef.current.src = result.audio_url;
        audioRef.current.load();
      }

    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Upload Audio'}
        </Button>

        <div className="mt-4">
          <audio ref={audioRef} controls className="w-full" />
        </div>
      </div>
    </div>
  );
};

export default Animation;