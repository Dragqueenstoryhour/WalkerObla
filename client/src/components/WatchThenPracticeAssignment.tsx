import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Eye, Mic, ArrowRight, CheckCircle, RotateCcw } from 'lucide-react';
import { FacialAnimation } from '@/components/FacialAnimation';
import { SimpleRecorder } from '@/components/SimpleRecorder';
import { useToast } from '@/hooks/use-toast';

interface WatchThenPracticeProps {
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
      structure: {
        wordsPerAssignment: number;
        animationPlaysPerWord: number;
        practiceAttemptsPerWord: number;
        phrasesPerWord: number;
      };
    };
  };
  items: Array<{
    id: number;
    content: string;
    syllabication?: string;
  }>;
  onComplete: (results: any[]) => void;
}

type StageType = 'instructions' | 'animation' | 'practice-word' | 'practice-phrases' | 'summary';

interface WordResult {
  word: string;
  animationPlays: number;
  wordPracticeAttempts: Array<{
    score: number;
    accuracy: number;
    fluency: number;
    completeness: number;
  }>;
  phraseResults: Array<{
    phrase: string;
    attempts: Array<{
      score: number;
      accuracy: number;
      fluency: number;
      completeness: number;
    }>;
  }>;
}

export function WatchThenPracticeAssignment({ assignment, items, onComplete }: WatchThenPracticeProps) {
  const { toast } = useToast();
  const [currentStage, setCurrentStage] = useState<StageType>('instructions');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [animationPlays, setAnimationPlays] = useState(0);
  const [wordPracticeAttempts, setWordPracticeAttempts] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [completedPhraseIndex, setCompletedPhraseIndex] = useState<number | null>(null);
  const [results, setResults] = useState<WordResult[]>([]);
  const [generatedPhrases, setGeneratedPhrases] = useState<{ [wordIndex: number]: string[] }>({});
  const [phrasesLoading, setPhrasesLoading] = useState(false);
  
  const structure = assignment.metadata?.structure || {
    wordsPerAssignment: 3,
    animationPlaysPerWord: 3,
    practiceAttemptsPerWord: 3,
    phrasesPerWord: 3
  };

  const currentWord = items[currentWordIndex];
  const totalWords = Math.min(items.length, structure.wordsPerAssignment);
  const progress = ((currentWordIndex) / totalWords) * 100;

  // Generate natural phrases for the current word using OpenAI
  const generatePhrases = async (word: string, wordIndex: number): Promise<string[]> => {
    // Check if we already have phrases for this word
    if (generatedPhrases[wordIndex]) {
      return generatedPhrases[wordIndex];
    }

    try {
      setPhrasesLoading(true);
      const soundPattern = assignment.metadata?.soundPattern?.sound || 'default';
      
      const response = await fetch('/api/content/generate-word-phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          word: word,
          soundPattern: soundPattern,
          count: structure.phrasesPerWord
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate phrases');
      }

      const data = await response.json();
      const phrases = data.data?.phrases || data.phrases || [];
      
      // Cache the generated phrases
      setGeneratedPhrases(prev => ({
        ...prev,
        [wordIndex]: phrases
      }));
      
      return phrases;
    } catch (error) {
      console.error('Error generating phrases:', error);
      toast({
        title: "Phrase Generation Error",
        description: "Using fallback phrases. Check connection.",
        variant: "destructive"
      });
      
      // Fallback to simple but more natural phrases
      const fallbackPhrases = [
        `${word} is important`,
        `I think about ${word}`,
        `${word} makes sense`
      ];
      
      setGeneratedPhrases(prev => ({
        ...prev,
        [wordIndex]: fallbackPhrases
      }));
      
      return fallbackPhrases;
    } finally {
      setPhrasesLoading(false);
    }
  };

  const handleStartPractice = () => {
    setCurrentStage('animation');
  };

  const handleAnimationPlay = () => {
    const newPlays = animationPlays + 1;
    setAnimationPlays(newPlays);
    
    if (newPlays >= structure.animationPlaysPerWord) {
      toast({
        title: "Animation Complete",
        description: "Now it's time to practice saying the word!"
      });
    }
  };

  const handleProceedToPractice = () => {
    setCurrentStage('practice-word');
    setWordPracticeAttempts(0);
  };

  const handleWordPracticeResult = async (result: any) => {
    const newAttempts = wordPracticeAttempts + 1;
    setWordPracticeAttempts(newAttempts);

    // Store the practice result
    const currentResult = results[currentWordIndex] || {
      word: currentWord.content,
      animationPlays,
      wordPracticeAttempts: [],
      phraseResults: []
    };

    currentResult.wordPracticeAttempts.push({
      score: result.pronunciationScore || 0,
      accuracy: result.accuracyScore || 0,
      fluency: result.fluencyScore || 0,
      completeness: result.completenessScore || 0
    });

    const newResults = [...results];
    newResults[currentWordIndex] = currentResult;
    setResults(newResults);

    if (newAttempts >= structure.practiceAttemptsPerWord) {
      // Pre-generate phrases for smooth transition
      await generatePhrases(currentWord.content, currentWordIndex);
      setCurrentStage('practice-phrases');
      setCurrentPhraseIndex(0);
      setCompletedPhraseIndex(null); // Reset for new phrase practice
    }
  };

  const handlePhraseResult = async (result: any) => {
    const phrases = generatedPhrases[currentWordIndex] || [];
    const currentResult = { ...results[currentWordIndex] };
    
    if (!currentResult.phraseResults[currentPhraseIndex]) {
      currentResult.phraseResults[currentPhraseIndex] = {
        phrase: phrases[currentPhraseIndex] || `Phrase ${currentPhraseIndex + 1}`,
        attempts: []
      };
    }

    currentResult.phraseResults[currentPhraseIndex].attempts.push({
      score: result.pronunciationScore || 0,
      accuracy: result.accuracyScore || 0,
      fluency: result.fluencyScore || 0,
      completeness: result.completenessScore || 0
    });

    const newResults = [...results];
    newResults[currentWordIndex] = currentResult;
    setResults(newResults);

    // Mark the current phrase as completed for scoring display
    setCompletedPhraseIndex(currentPhraseIndex);

    const nextPhraseIndex = currentPhraseIndex + 1;
    if (nextPhraseIndex >= structure.phrasesPerWord) {
      // Move to next word or finish
      const nextWordIndex = currentWordIndex + 1;
      if (nextWordIndex >= totalWords) {
        setCurrentStage('summary');
      } else {
        // Pre-generate phrases for next word
        const nextWord = items[nextWordIndex];
        if (nextWord) {
          await generatePhrases(nextWord.content, nextWordIndex);
        }
        
        // Reset for next word
        setCurrentWordIndex(nextWordIndex);
        setCurrentStage('animation');
        setAnimationPlays(0);
        setWordPracticeAttempts(0);
        setCurrentPhraseIndex(0);
        setCompletedPhraseIndex(null);
      }
    } else {
      setCurrentPhraseIndex(nextPhraseIndex);
    }
  };

  const handleFinishAssignment = () => {
    onComplete(results);
  };

  const calculateOverallScore = (): number => {
    if (results.length === 0) return 0;
    
    let totalScore = 0;
    let totalAttempts = 0;

    results.forEach(wordResult => {
      wordResult.wordPracticeAttempts.forEach(attempt => {
        totalScore += attempt.score;
        totalAttempts++;
      });
      
      wordResult.phraseResults.forEach(phraseResult => {
        phraseResult.attempts.forEach(attempt => {
          totalScore += attempt.score;
          totalAttempts++;
        });
      });
    });

    return totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
  };

  if (currentStage === 'instructions') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-blue-600" />
              {assignment.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              <p className="text-gray-700 mb-4">
                For each word, phrase, or sentence in the video, watch us say it first. Then you'll practice.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-white rounded">
                  <div className="font-semibold text-blue-600">👀 Watch</div>
                  <div>View animation up to 3 times</div>
                </div>
                <div className="p-3 bg-white rounded">
                  <div className="font-semibold text-green-600">🎙️ Practice Word</div>
                  <div>Practice the word 3 times</div>
                </div>
                <div className="p-3 bg-white rounded">
                  <div className="font-semibold text-purple-600">💬 Practice Phrases</div>
                  <div>Practice 3 different phrases</div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                You'll practice <strong>{totalWords} words</strong> with the <strong>"{assignment.metadata?.soundPattern?.sound}"</strong> sound.
              </p>
              <Button onClick={handleStartPractice} size="lg" className="px-8">
                <Play className="h-5 w-5 mr-2" />
                Start Practice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStage === 'animation') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Word {currentWordIndex + 1} of {totalWords}</span>
            <span className="text-sm text-gray-600">{animationPlays}/{structure.animationPlaysPerWord} plays</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              👀 Watch: "{currentWord.content}"
            </CardTitle>
            {currentWord.syllabication && (
              <p className="text-center text-gray-600">{currentWord.syllabication}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <FacialAnimation 
                initialText={currentWord.content}
                maxPlays={structure.animationPlaysPerWord}
                onAnimationPlay={handleAnimationPlay}
                showPlayButton={true}
                simplified={true}
              />
            </div>
            
            <div className="text-center space-y-4">
              {animationPlays < structure.animationPlaysPerWord ? (
                <p className="text-gray-600">
                  You can watch the animation {structure.animationPlaysPerWord - animationPlays} more time{structure.animationPlaysPerWord - animationPlays !== 1 ? 's' : ''}.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-green-600 font-medium">
                    ✓ Animation complete! Ready to practice?
                  </p>
                  <Button onClick={handleProceedToPractice} size="lg">
                    <Mic className="h-5 w-5 mr-2" />
                    Start Practicing
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStage === 'practice-word') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Word {currentWordIndex + 1} of {totalWords}</span>
            <span className="text-sm text-gray-600">{wordPracticeAttempts}/{structure.practiceAttemptsPerWord} attempts</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              🎙️ Practice: "{currentWord.content}"
            </CardTitle>
            {currentWord.syllabication && (
              <p className="text-center text-gray-600">{currentWord.syllabication}</p>
            )}
          </CardHeader>
          <CardContent>
            <SimpleRecorder 
              targetWord={currentWord.content}
              onResult={handleWordPracticeResult}
              maxAttempts={structure.practiceAttemptsPerWord}
              currentAttempt={wordPracticeAttempts + 1}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStage === 'practice-phrases') {
    const phrases = generatedPhrases[currentWordIndex] || [];
    const currentPhrase = phrases[currentPhraseIndex] || 'Loading phrase...';
    const completedPhrase = completedPhraseIndex !== null ? phrases[completedPhraseIndex] : null;
    const isLastPhrase = currentPhraseIndex >= structure.phrasesPerWord - 1;
    const isLastWord = currentWordIndex >= totalWords - 1;

    // Determine the next action text
    let nextActionText = "Next Phrase";
    if (isLastPhrase && isLastWord) {
      nextActionText = "Complete Assignment";
    } else if (isLastPhrase) {
      nextActionText = "Next Word";
    }

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Word {currentWordIndex + 1} of {totalWords}</span>
            <span className="text-sm text-gray-600">Phrase {currentPhraseIndex + 1} of {structure.phrasesPerWord}</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {completedPhrase ? (
                <>
                  💬 Next Phrase
                  <div className="text-sm font-normal text-gray-500 mt-1">
                    (Scoring below is for: "{completedPhrase}")
                  </div>
                </>
              ) : (
                "💬 Practice Phrase"
              )}
            </CardTitle>
            {phrasesLoading ? (
              <div className="text-center">
                <div className="animate-pulse text-gray-500">
                  Generating natural phrases...
                </div>
              </div>
            ) : (
              <p className="text-center text-xl font-medium text-gray-800">
                {completedPhrase ? `Next Phrase: "${currentPhrase}"` : `"${currentPhrase}"`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!phrasesLoading && currentPhrase !== 'Loading phrase...' ? (
              <SimpleRecorder 
                targetWord={currentPhrase}
                onResult={handlePhraseResult}
                maxAttempts={1}
                currentAttempt={1}
                nextActionText={nextActionText}
              />
            ) : (
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Preparing natural phrases...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStage === 'summary') {
    const overallScore = calculateOverallScore();
    
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              Assignment Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{overallScore}%</div>
              <div className="text-gray-600">Overall Score</div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Summary</h3>
              {results.map((wordResult, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">"{wordResult.word}"</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Word Practice</div>
                      <div className="font-medium">
                        {wordResult.wordPracticeAttempts.length > 0 
                          ? `${Math.round(wordResult.wordPracticeAttempts.reduce((sum, a) => sum + a.score, 0) / wordResult.wordPracticeAttempts.length)}%`
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Phrase Practice</div>
                      <div className="font-medium">
                        {wordResult.phraseResults.length > 0
                          ? `${Math.round(
                              wordResult.phraseResults.reduce((sum, p) => 
                                sum + (p.attempts.length > 0 ? p.attempts[0].score : 0), 0
                              ) / wordResult.phraseResults.length
                            )}%`
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button onClick={handleFinishAssignment} size="lg">
                <CheckCircle className="h-5 w-5 mr-2" />
                Finish Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}