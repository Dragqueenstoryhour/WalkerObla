import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, CheckCircle2, BarChart, AlertCircle } from 'lucide-react';
import { Exercise, PronunciationAssessmentResult } from '@/lib/types';

interface ExerciseItemProps {
  exercise: Exercise;
  isActive: boolean;
  isCompleted: boolean;
  onStart: () => void;
  onComplete: (result: PronunciationAssessmentResult) => void;
  pronunciationResults?: PronunciationAssessmentResult;
}

export function ExerciseItem({
  exercise,
  isActive,
  isCompleted,
  onStart,
  onComplete,
  pronunciationResults
}: ExerciseItemProps) {
  const [isRecording, setIsRecording] = useState(false);
  
  // Function to handle starting the exercise
  // This would trigger the parent component to show the recorder
  const handleStart = () => {
    onStart();
  };
  
  // Get badge variant based on exercise type
  const getBadgeVariant = () => {
    switch (exercise.type) {
      case 'word':
        return 'default';
      case 'phrase':
        return 'secondary';
      case 'sentence':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  // Get score color class based on value
  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };
  
  return (
    <Card className={`transition-all duration-300 ${
      isActive ? 'border-primary shadow-md' : 
      isCompleted ? 'border-green-500/30 bg-green-50 dark:bg-green-900/10' : 
      'border-muted-foreground/20'
    }`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={getBadgeVariant()} className="capitalize">
            {exercise.type}
          </Badge>
          
          {isCompleted && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
        </div>
        
        <div className="text-lg font-medium my-3">
          {exercise.content}
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="px-2" 
              onClick={() => {
                // This would trigger text-to-speech
                const speech = new SpeechSynthesisUtterance(exercise.content);
                window.speechSynthesis.speak(speech);
              }}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            
            <div className="text-xs text-muted-foreground">
              {exercise.xpReward} XP
            </div>
          </div>
          
          {!isCompleted ? (
            <Button
              size="sm"
              disabled={!isActive}
              onClick={handleStart}
              className={isActive ? 'bg-primary' : 'bg-muted'}
            >
              <Mic className="h-4 w-4 mr-2" />
              Practice
            </Button>
          ) : pronunciationResults ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className={`font-bold ${getScoreColorClass(pronunciationResults.pronunciationScore)}`}>
                  {pronunciationResults.pronunciationScore.toFixed(0)}%
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={handleStart}
              >
                <Mic className="h-4 w-4 mr-1" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex items-center text-sm text-amber-500">
              <AlertCircle className="h-4 w-4 mr-1" />
              No data
            </div>
          )}
        </div>
        
        {/* Display pronunciation issues if available */}
        {isCompleted && pronunciationResults && pronunciationResults.wordLevelResults.some(w => (w.accuracyScore < 70)) && (
          <div className="mt-3 pt-3 border-t text-sm">
            <div className="text-xs font-medium mb-1">Pronunciation tips:</div>
            <div className="flex flex-wrap gap-1">
              {pronunciationResults.wordLevelResults
                .filter(word => word.accuracyScore < 70)
                .map((word, index) => (
                  <Badge key={index} variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20">
                    {word.word}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}