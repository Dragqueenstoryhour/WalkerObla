import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MicIcon, StopCircleIcon, RotateCw, Volume2, Ear, Star, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useWordRecording from '@/hooks/useWordRecording';
import { PronunciationIssue } from '@/lib/types';
import { mapSyllablesToDisplay } from '@/lib/utils'; // Assuming this helper is moved or accessible

interface WordPracticeCardProps {
  issue: PronunciationIssue;
  onSaveWord: (word: string) => void;
  onPlayTextToSpeech: (word: string, speed: number) => void;
  isSlowPlayback: boolean;
  toggleSlowPlayback: (word: string) => void;
  isCurrentlyPracticing: boolean;
}

const WordPracticeCard: React.FC<WordPracticeCardProps> = ({
  issue,
  onSaveWord,
  onPlayTextToSpeech,
  isSlowPlayback,
  toggleSlowPlayback,
  isCurrentlyPracticing,
}) => {
  const { toast } = useToast();
  const { 
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingUrl,
    assessmentResult,
  } = useWordRecording();

  const handleStartPractice = async () => {
    if (issue.word) {
      await startRecording(issue.word, 'word');
    }
  };

  const handleStopPractice = () => {
    stopRecording();
  };

  const handleCancelPractice = () => {
    cancelRecording();
  };

  const handleListenToMe = () => {
    if (recordingUrl) {
      const audio = new Audio(recordingUrl);
      audio.play().catch(error => {
        console.error('Error playing recording:', error);
        toast({
          title: "Playback Error",
          description: "Could not play your recording. Please try again.",
          variant: "destructive",
        });
      });
    }
  };

  const handleHearWord = () => {
    onPlayTextToSpeech(issue.word, isSlowPlayback ? 0.6 : 1.0);
  };

  const handleSaveWord = () => {
    onSaveWord(issue.word);
    toast({
      title: "Word Saved",
      description: `"${issue.word}" has been added to your saved words.`, 
    });
  };

  const displaySyllables = assessmentResult && assessmentResult.wordLevelResults?.[0]?.syllables
    ? mapSyllablesToDisplay(issue.syllabication, assessmentResult.wordLevelResults[0].syllables)
    : issue.syllabication.split('-').map(s => ({ text: s, color: '#ffffff' }));

  return (
    <Card className="h-full shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-white">{issue.word}</CardTitle>
        {issue.syllabication && (
          <div className="text-lg italic mt-2">
            {displaySyllables.map((syllable, index) => (
              <span
                key={index}
                style={{ color: syllable.color }}
                className="font-semibold"
              >
                {syllable.text}
                {index < displaySyllables.length - 1 && '-'}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex justify-center gap-2">
          {!isRecording && !isProcessing && (
            <Button
              onClick={handleStartPractice}
              className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
              disabled={isCurrentlyPracticing}
            >
              <MicIcon className="h-5 w-5" />
              Practice This Word
            </Button>
          )}

          {isRecording && (
            <Button
              onClick={handleStopPractice}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <StopCircleIcon className="h-4 w-4" />
              Stop Recording
            </Button>
          )}

          {isProcessing && (
            <Button disabled className="flex items-center gap-2">
              <RotateCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </Button>
          )}

          {assessmentResult && !isRecording && !isProcessing && (
            <div className="space-y-4">
              {/* Score Display */}
              <div className="flex justify-center">
                <div className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md">
                  <Check className="h-4 w-4 mr-2" />
                  Score: {Math.round(assessmentResult.pronunciationScore)}%
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-2">
                <Button
                  onClick={handleStartPractice} // Try again
                  className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                >
                  <RotateCw className="h-5 w-5" />
                  Try Again
                </Button>
                
                {recordingUrl && (
                  <Button
                    onClick={handleListenToMe}
                    className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                  >
                    <Volume2 className="h-5 w-5" />
                    Listen to Me
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hear and Slow Switch + Save */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={handleHearWord}
            variant="outline"
            className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
          >
            <Ear className="h-4 w-4 mr-1" />
            Hear
          </Button>
          <button
            onClick={() => toggleSlowPlayback(issue.word)}
            className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSlowPlayback ? 'bg-[#FFE8E8]' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={isSlowPlayback}
            aria-label="Toggle slow playback"
          >
            <span
              className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                isSlowPlayback ? 'translate-x-8' : 'translate-x-1'
              }`}
            >
              <Snail className="h-3 w-3 text-gray-600" />
            </span>
          </button>
          <Button
            onClick={handleSaveWord}
            variant="outline"
            className="h-10 px-4 bg-[#6366F1] hover:bg-[#5855EB] text-white border-0"
          >
            <Star className={`h-4 w-4 mr-1`} />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WordPracticeCard;
