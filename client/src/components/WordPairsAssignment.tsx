import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, Mic, ArrowRight, CheckCircle, RotateCcw, Trophy } from 'lucide-react';
import { SimpleRecorder } from '@/components/SimpleRecorder';
import { useToast } from '@/hooks/use-toast';

interface WordPairsAssignmentProps {
  assignment: {
    id: number;
    title: string;
    description?: string;
    metadata?: {
      assignmentType: string;
      soundPattern: {
        sound: string;
        position: string;
      };
      selectedPairs: Array<{
        word1: string;
        word2: string;
        connection: string;
      }>;
      instructions: string;
    };
  };
  items: Array<{
    id: number;
    content: string;
    word1?: string;
    word2?: string;
    connection?: string;
  }>;
  onComplete: (results: any[]) => void;
}

type StageType = 'instructions' | 'practice' | 'summary';

interface PairResult {
  word1: string;
  word2: string;
  connection: string;
  sentences: Array<{
    attemptNumber: number;
    transcription: string;
    word1Score: number;
    word2Score: number;
    word1Detected: boolean;
    word2Detected: boolean;
  }>;
}

export function WordPairsAssignment({ assignment, items, onComplete }: WordPairsAssignmentProps) {
  const { toast } = useToast();
  const [currentStage, setCurrentStage] = useState<StageType>('instructions');
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [pairResults, setPairResults] = useState<PairResult[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [currentSentences, setCurrentSentences] = useState<any[]>([]);

  const wordPairs = assignment.metadata?.selectedPairs || [];
  const currentPair = wordPairs[currentPairIndex];
  const instructions = assignment.metadata?.instructions || "Make a sentence using both words from each pair. Say the sentence out loud three times.";

  const handleStartPractice = () => {
    setCurrentStage('practice');
    // Initialize results for all pairs
    setPairResults(wordPairs.map(pair => ({
      word1: pair.word1,
      word2: pair.word2,
      connection: pair.connection,
      sentences: []
    })));
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!currentPair) return;

    try {
      // Convert audio to FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('targetWords', JSON.stringify([currentPair.word1, currentPair.word2]));

      // Send to Azure for processing
      const response = await fetch('/api/pronunciation/assess-word-pairs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const result = await response.json();
      
      // Extract scores and transcription
      const transcription = result.transcription || '';
      const word1Score = result.word1Score || 0;
      const word2Score = result.word2Score || 0;
      const word1Detected = result.word1Detected || false;
      const word2Detected = result.word2Detected || false;

      // Add sentence result
      const newSentence = {
        attemptNumber: currentAttempt,
        transcription,
        word1Score,
        word2Score,
        word1Detected,
        word2Detected
      };

      setCurrentSentences([...currentSentences, newSentence]);

      // Show feedback
      toast({
        title: `Attempt ${currentAttempt} Complete`,
        description: `"${transcription}" - ${word1Detected ? '✓' : '✗'} ${currentPair.word1}, ${word2Detected ? '✓' : '✗'} ${currentPair.word2}`,
        duration: 3000
      });

      if (currentAttempt < 3) {
        setCurrentAttempt(currentAttempt + 1);
      } else {
        // Move to next pair or finish
        const updatedResults = [...pairResults];
        updatedResults[currentPairIndex] = {
          ...updatedResults[currentPairIndex],
          sentences: [...currentSentences, newSentence]
        };
        setPairResults(updatedResults);

        if (currentPairIndex < wordPairs.length - 1) {
          setCurrentPairIndex(currentPairIndex + 1);
          setCurrentAttempt(1);
          setCurrentSentences([]);
        } else {
          // All pairs completed
          setCurrentStage('summary');
          onComplete(updatedResults);
        }
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Error",
        description: "Failed to process your recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const progressPercentage = ((currentPairIndex + (currentAttempt - 1) / 3) / wordPairs.length) * 100;

  if (currentStage === 'instructions') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">{assignment.title}</CardTitle>
            <p className="text-gray-600">{assignment.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="font-semibold text-purple-800 mb-2">Instructions</h3>
              <p className="text-purple-700">{instructions}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Your Word Pairs ({wordPairs.length})</h3>
              <div className="grid gap-3">
                {wordPairs.map((pair, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-purple-700">{pair.word1}</span>
                      <span className="text-gray-400">+</span>
                      <span className="text-purple-700">{pair.word2}</span>
                    </div>
                    <div className="text-xs text-gray-600">{pair.connection}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleStartPractice} size="lg" className="bg-purple-600 hover:bg-purple-700">
                Start Practice
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStage === 'practice') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Pair {currentPairIndex + 1} of {wordPairs.length}
                </h2>
                <p className="text-sm text-gray-600">Attempt {currentAttempt} of 3</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Progress</div>
                <Progress value={progressPercentage} className="w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-purple-600 text-white rounded-lg p-8 mb-6">
                <div className="flex items-center justify-center gap-4 text-2xl font-bold mb-2">
                  <span>{currentPair?.word1}</span>
                  <span className="text-purple-200">+</span>
                  <span>{currentPair?.word2}</span>
                </div>
                <div className="text-purple-200 text-sm">{currentPair?.connection}</div>
              </div>
              
              <p className="text-gray-600 mb-4">
                Create a sentence using both words and say it out loud
              </p>
              
              <SimpleRecorder
                onRecordingComplete={handleRecordingComplete}
                targetText={`${currentPair?.word1} ${currentPair?.word2}`}
                showTargetText={false}
              />
            </div>

            {currentSentences.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Your Sentences:</h4>
                {currentSentences.map((sentence, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">"{sentence.transcription}"</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={sentence.word1Detected ? 'text-green-600' : 'text-red-600'}>
                          {sentence.word1Detected ? '✓' : '✗'} {currentPair?.word1}
                        </span>
                        <span className={sentence.word2Detected ? 'text-green-600' : 'text-red-600'}>
                          {sentence.word2Detected ? '✓' : '✗'} {currentPair?.word2}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStage === 'summary') {
    const totalSentences = pairResults.reduce((sum, result) => sum + result.sentences.length, 0);
    const correctDetections = pairResults.reduce((sum, result) => 
      sum + result.sentences.reduce((pairSum, sentence) => 
        pairSum + (sentence.word1Detected && sentence.word2Detected ? 1 : 0), 0), 0);
    const accuracy = totalSentences > 0 ? Math.round((correctDetections / totalSentences) * 100) : 0;

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Assignment Complete!</CardTitle>
            <p className="text-gray-600">Great job practicing your word pairs</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{wordPairs.length}</div>
                <div className="text-sm text-gray-600">Word Pairs</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalSentences}</div>
                <div className="text-sm text-gray-600">Sentences</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Your Practice Summary</h3>
              {pairResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <span className="text-purple-700">{result.word1}</span>
                    <span className="text-gray-400">+</span>
                    <span className="text-purple-700">{result.word2}</span>
                  </div>
                  <div className="space-y-1">
                    {result.sentences.map((sentence, sentenceIndex) => (
                      <div key={sentenceIndex} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="flex items-center justify-between">
                          <span>"{sentence.transcription}"</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={sentence.word1Detected ? 'text-green-600' : 'text-red-600'}>
                              {sentence.word1Detected ? '✓' : '✗'} {result.word1}
                            </span>
                            <span className={sentence.word2Detected ? 'text-green-600' : 'text-red-600'}>
                              {sentence.word2Detected ? '✓' : '✗'} {result.word2}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}