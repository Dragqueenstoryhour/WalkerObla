import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, CheckCircle, Clock, Volume2, Mic, VolumeIcon, StopCircleIcon, PlayIcon } from 'lucide-react';
import { useReading } from '@/contexts/ReadingContext';
import { useToast } from '@/hooks/use-toast';
import { PronunciationAssessmentResult } from '@/lib/types';
import SimpleRecorder from '@/components/SimpleRecorder';

const ReadingControls = () => {
  const { 
    currentContent, 
    setPronunciationResults,
    updateSessionProgress
  } = useReading();

  const [referenceText, setReferenceText] = useState('');

  // Update the reference text when content changes
  useEffect(() => {
    if (currentContent) {
      setReferenceText(currentContent.content);
    }
  }, [currentContent]);

  // Handle assessment results
  const handleAssessmentReceived = (results: PronunciationAssessmentResult) => {
    // Store in reading context
    setPronunciationResults(results);

    // Update progress based on word count
    const wordsRead = referenceText.split(/\s+/).length || 0;
    updateSessionProgress(wordsRead);
  };

  if (!currentContent) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Reading Practice</h2>
          <div className="flex items-center text-success">
            <CheckCircle className="w-5 h-5 mr-1" />
            <span>Record your speech to receive pronunciation feedback</span>
          </div>
        </div>

        <div className="bg-secondary bg-opacity-30 rounded-lg p-4 mb-4">
          <p className="font-medium mb-2">Instructions:</p>
          <p className="text-textColor">
            Click the "Start Recording" button below and read the text aloud.
            When finished, click "Stop Recording" to receive detailed pronunciation feedback.
          </p>
        </div>

        {/* Simple Recorder component implementation */}
        <SimpleRecorder 
          referenceText={referenceText} 
          onAssessmentReceived={handleAssessmentReceived}
        />
      </CardContent>
    </Card>
  );
};

export default ReadingControls;