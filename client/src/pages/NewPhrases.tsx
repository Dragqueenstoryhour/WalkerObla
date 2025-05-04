import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import useAudioRecording from '@/hooks/useAudioRecording';
import { PronunciationAssessmentResult } from '@/lib/types';
import { MicIcon, StopCircleIcon, VolumeIcon, RotateCw, Upload, CheckCircle, FileText, Image, AlertTriangle, BarChart2, Share2, Award, Users } from 'lucide-react';

interface ProcessedPhrase {
  id: string;
  text: string;
  phonetic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  recordingUrl?: string;
  recordingBlob?: Blob;
  assessmentResult?: PronunciationAssessmentResult;
  status: 'idle' | 'recording' | 'assessing' | 'complete';
}

export default function NewPhrases() {
  const { toast } = useToast();
  const [bulkText, setBulkText] = useState('');
  const [processedPhrases, setProcessedPhrases] = useState<ProcessedPhrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [historyData, setHistoryData] = useState<{date: string, score: number}[]>([]);
  const [shareableLink, setShareableLink] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Use our audio recording hook
  const { 
    isRecording, 
    recordingDuration, 
    audioUrl, 
    startRecording, 
    stopRecording,
    audioBlob
  } = useAudioRecording({
    onError: (error) => {
      console.error('Recording error:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not access microphone. Please check your browser permissions.',
        variant: 'destructive'
      });
    }
  });

  // Set up some mock history data for visualization
  useEffect(() => {
    // This would normally come from your backend
    setHistoryData([
      { date: '2025-04-28', score: 65 },
      { date: '2025-04-29', score: 68 },
      { date: '2025-04-30', score: 72 },
      { date: '2025-05-01', score: 75 },
      { date: '2025-05-02', score: 81 },
      { date: '2025-05-03', score: 79 },
      { date: '2025-05-04', score: 84 },
    ]);
  }, []);

  // Process the bulk text into individual phrases
  const handleProcessText = async () => {
    if (!bulkText.trim()) {
      toast({
        title: 'No Text Provided',
        description: 'Please enter phrases to process.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Split text by newlines and filter out empty lines
      const lines = bulkText.split('\n').filter(line => line.trim().length > 0);
      
      // Prepare for OpenAI processing
      const response = await fetch('/api/content/process-phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phrases: lines }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process phrases');
      }
      
      const processedData = await response.json();
      
      // Format the processed phrases
      const newPhrases: ProcessedPhrase[] = processedData.phrases.map((phrase: any, index: number) => ({
        id: `phrase-${Date.now()}-${index}`,
        text: phrase.text,
        phonetic: phrase.phonetic,
        difficulty: phrase.difficulty,
        status: 'idle'
      }));
      
      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0); // Select first phrase
      
      toast({
        title: 'Processing Complete',
        description: `${newPhrases.length} phrases are ready for practice.`,
      });
    } catch (error) {
      console.error('Error processing phrases:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process phrases. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload (images/PDFs)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image or PDF file.',
        variant: 'destructive'
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsProcessing(true);

    try {
      // Send the file for OCR processing
      const response = await fetch('/api/content/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const result = await response.json();
      
      // If successful, populate the bulk text area
      if (result.text) {
        setBulkText(result.text);
        toast({
          title: 'Text Extracted',
          description: 'Text successfully extracted from file. You can now process it.',
        });
      } else {
        throw new Error('No text found in the file');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to extract text from file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording the current phrase
  const handleStartRecording = () => {
    if (currentPhraseIndex < 0 || currentPhraseIndex >= processedPhrases.length) return;
    
    // Update the current phrase status
    setProcessedPhrases(phrases => 
      phrases.map((phrase, idx) => 
        idx === currentPhraseIndex 
          ? { ...phrase, status: 'recording' } 
          : phrase
      )
    );
    
    startRecording();
  };

  // Stop recording and assess pronunciation
  const handleStopRecording = async () => {
    if (currentPhraseIndex < 0 || currentPhraseIndex >= processedPhrases.length) return;
    
    stopRecording();
    
    // Wait for audioBlob to be available
    setTimeout(async () => {
      if (!audioBlob) {
        toast({
          title: 'Recording Error',
          description: 'Failed to capture audio. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      // Update status to assessing
      setProcessedPhrases(phrases => 
        phrases.map((phrase, idx) => 
          idx === currentPhraseIndex 
            ? { ...phrase, status: 'assessing', recordingBlob: audioBlob, recordingUrl: audioUrl } 
            : phrase
        )
      );

      try {
        // Send the recording for assessment
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('text', processedPhrases[currentPhraseIndex].text);

        const response = await fetch('/api/pronunciation/assess', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to assess pronunciation');
        }

        const result = await response.json();

        // Update the phrase with assessment results
        setProcessedPhrases(phrases => 
          phrases.map((phrase, idx) => 
            idx === currentPhraseIndex 
              ? { ...phrase, status: 'complete', assessmentResult: result } 
              : phrase
          )
        );

        // Add to history data
        setHistoryData(prev => [
          ...prev, 
          { date: new Date().toISOString().split('T')[0], score: result.pronunciationScore }
        ]);
      } catch (error) {
        console.error('Error assessing pronunciation:', error);
        toast({
          title: 'Assessment Error',
          description: 'Failed to assess pronunciation. Please try again.',
          variant: 'destructive'
        });
        
        // Reset status to idle
        setProcessedPhrases(phrases => 
          phrases.map((phrase, idx) => 
            idx === currentPhraseIndex 
              ? { ...phrase, status: 'idle' } 
              : phrase
          )
        );
      }
    }, 500);
  };

  // Generate similar phrases using LLM
  const handleGenerateSimilar = async () => {
    if (currentPhraseIndex < 0 || currentPhraseIndex >= processedPhrases.length) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/content/generate-similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phrase: processedPhrases[currentPhraseIndex].text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate similar phrases');
      }
      
      const result = await response.json();
      
      // Add the new phrases to our collection
      const newPhrases: ProcessedPhrase[] = result.phrases.map((text: string, index: number) => ({
        id: `phrase-${Date.now()}-similar-${index}`,
        text,
        difficulty: processedPhrases[currentPhraseIndex].difficulty,
        status: 'idle'
      }));
      
      setProcessedPhrases(phrases => [...phrases, ...newPhrases]);
      
      toast({
        title: 'Phrases Generated',
        description: `${newPhrases.length} similar phrases have been added.`,
      });
    } catch (error) {
      console.error('Error generating similar phrases:', error);
      toast({
        title: 'Generation Error',
        description: 'Failed to generate similar phrases. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate a shareable link for the current set
  const handleGenerateShareableLink = () => {
    // In a real implementation, this would hit an API endpoint to create a sharable exercise
    const shareId = `share-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const shareableLink = `${window.location.origin}/shared-phrases/${shareId}`;
    setShareableLink(shareableLink);
    
    toast({
      title: 'Shareable Link Created',
      description: 'Link copied to clipboard. Share with others to practice the same phrases.',
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareableLink);
  };

  // Play the recording for a phrase
  const handlePlayRecording = (phraseIndex: number) => {
    const phrase = processedPhrases[phraseIndex];
    if (phrase?.recordingUrl && audioRef.current) {
      audioRef.current.src = phrase.recordingUrl;
      audioRef.current.play();
    }
  };

  // Calculate overall progress
  const calculateProgress = () => {
    if (processedPhrases.length === 0) return 0;
    const completedCount = processedPhrases.filter(p => p.status === 'complete').length;
    return Math.round((completedCount / processedPhrases.length) * 100);
  };

  // Render difficulty badge
  const renderDifficultyBadge = (difficulty: string | undefined) => {
    if (!difficulty) return null;
    
    const colorMap: Record<string, string> = {
      'beginner': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'intermediate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'advanced': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colorMap[difficulty] || ''}`}>
        {difficulty}
      </span>
    );
  };

  // Render assessment visualization (Radial gauge for score, etc.)
  const renderAssessmentVisualization = (phrase: ProcessedPhrase) => {
    if (!phrase.assessmentResult) return null;
    
    const result = phrase.assessmentResult;
    
    return (
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pronunciation Score (Radial Gauge) */}
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24">
                  <circle 
                    className="text-muted-foreground" 
                    strokeWidth="8" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="32" 
                    cx="44" 
                    cy="44"
                    opacity="0.2"
                  />
                  <circle 
                    className="text-primary" 
                    strokeWidth="8" 
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - result.pronunciationScore / 100)}`}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="32" 
                    cx="44" 
                    cy="44"
                    transform="rotate(-90 44 44)"
                  />
                </svg>
                <span className="absolute text-xl font-bold">{Math.round(result.pronunciationScore)}</span>
              </div>
              <p className="text-sm font-medium mt-2">Pronunciation</p>
            </CardContent>
          </Card>
          
          {/* Fluency Score */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium mb-2">Fluency</h4>
              <Progress value={result.fluencyScore} className="h-2 mb-1" />
              <p className="text-right text-sm">{Math.round(result.fluencyScore)}%</p>
            </CardContent>
          </Card>
          
          {/* Accuracy Score */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium mb-2">Accuracy</h4>
              <Progress value={result.accuracyScore} className="h-2 mb-1" />
              <p className="text-right text-sm">{Math.round(result.accuracyScore)}%</p>
            </CardContent>
          </Card>
          
          {/* Completeness Score */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium mb-2">Completeness</h4>
              <Progress value={result.completenessScore} className="h-2 mb-1" />
              <p className="text-right text-sm">{Math.round(result.completenessScore)}%</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Word-level results (heatmap) */}
        {result.wordLevelResults && result.wordLevelResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Word Accuracy</CardTitle>
              <CardDescription>See how well you pronounced each word</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.wordLevelResults.map((word, idx) => {
                  // Calculate color based on score
                  const score = word.accuracyScore;
                  const bgColor = score > 80 ? 'bg-green-100 dark:bg-green-900' :
                                 score > 60 ? 'bg-yellow-100 dark:bg-yellow-900' :
                                 'bg-red-100 dark:bg-red-900';
                  const textColor = score > 80 ? 'text-green-800 dark:text-green-300' :
                                   score > 60 ? 'text-yellow-800 dark:text-yellow-300' :
                                   'text-red-800 dark:text-red-300';
                  
                  return (
                    <div 
                      key={`word-${idx}`} 
                      className={`p-2 rounded ${bgColor} ${textColor}`}
                      title={`${word.word}: ${Math.round(word.accuracyScore)}% accuracy`}
                    >
                      <p className="text-sm font-medium">{word.word}</p>
                      <p className="text-xs">{Math.round(word.accuracyScore)}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Render a timeline chart for historical progress
  const renderHistoryChart = () => {
    if (historyData.length === 0) return null;
    
    const maxScore = Math.max(...historyData.map(d => d.score));
    const minScore = Math.min(...historyData.map(d => d.score));
    const range = maxScore - minScore;
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Progress Over Time</CardTitle>
          <CardDescription>Your pronunciation scores over the last week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-end gap-2">
            {historyData.map((item, idx) => {
              const heightPercent = range === 0 ? 100 : ((item.score - minScore) / range) * 80 + 20;
              return (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-primary rounded-t" 
                    style={{ height: `${heightPercent}%` }}
                    title={`Score: ${item.score}%`}
                  />
                  <p className="text-xs mt-1">{item.date.split('-')[2]}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render social badges
  const renderSocialBadges = () => {
    const badges = [
      { name: '7-Day Streak', icon: <Award className="h-4 w-4 mr-1" />, earned: true },
      { name: 'Shared 5+ Exercises', icon: <Share2 className="h-4 w-4 mr-1" />, earned: false },
      { name: 'Perfect Pronunciation', icon: <CheckCircle className="h-4 w-4 mr-1" />, earned: false },
    ];
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Your Badges</CardTitle>
          <CardDescription>Achievements earned through practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, idx) => (
              <div 
                key={idx}
                className={`flex items-center rounded-full px-3 py-1 text-sm ${badge.earned ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
              >
                {badge.icon}
                {badge.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">New Phrases</h1>
      
      <Tabs defaultValue="manual-entry" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual-entry">
            <FileText className="h-4 w-4 mr-2" /> Text Entry
          </TabsTrigger>
          <TabsTrigger value="image-upload">
            <Image className="h-4 w-4 mr-2" /> Image Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual-entry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Multiple Phrases</CardTitle>
              <CardDescription>
                Enter one phrase per line. These will be processed for pronunciation practice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter phrases here, one per line...
                E.g.
The quick brown fox jumps over the lazy dog.
How are you feeling today?
I'd like to schedule an appointment."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={6}
                className="w-full"
              />
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleProcessText} 
                disabled={isProcessing || !bulkText.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process with AI'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="image-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Image or PDF</CardTitle>
              <CardDescription>
                Extract text from images or PDFs using OCR technology.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Click to upload</p>
                <p className="text-sm text-muted-foreground">Or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, GIF, or PDF up to 10MB
                </p>
                <input 
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Phrases Grid */}
      {processedPhrases.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Practice Phrases</h2>
            <div className="flex items-center gap-2">
              <Progress value={calculateProgress()} className="w-32" />
              <span className="text-sm">{calculateProgress()}% complete</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column: phrases list */}
            <div className="space-y-4">
              {processedPhrases.map((phrase, idx) => (
                <Card 
                  key={phrase.id} 
                  className={`cursor-pointer transition-all ${currentPhraseIndex === idx ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setCurrentPhraseIndex(idx)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{phrase.text}</p>
                        {phrase.phonetic && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {phrase.phonetic}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {renderDifficultyBadge(phrase.difficulty)}
                        {phrase.status === 'complete' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayRecording(idx);
                            }}
                          >
                            <VolumeIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {phrase.status === 'complete' && phrase.assessmentResult && (
                      <div className="mt-2">
                        <Progress 
                          value={phrase.assessmentResult.pronunciationScore} 
                          className="h-2"
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs">Score</span>
                          <span className="text-xs font-medium">
                            {Math.round(phrase.assessmentResult.pronunciationScore)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {/* Add new phrase button */}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setProcessedPhrases([...processedPhrases, {
                    id: `phrase-${Date.now()}-new`,
                    text: '',
                    status: 'idle'
                  }]);
                  setCurrentPhraseIndex(processedPhrases.length);
                }}
              >
                Add New Phrase
              </Button>
            </div>
            
            {/* Right column: current phrase recording */}
            <div>
              {currentPhraseIndex >= 0 && currentPhraseIndex < processedPhrases.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Record &amp; Assess</CardTitle>
                    <CardDescription>
                      Practice saying the phrase clearly, then assess your pronunciation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xl font-medium">
                        {processedPhrases[currentPhraseIndex].text}
                      </p>
                      {processedPhrases[currentPhraseIndex].phonetic && (
                        <p className="text-muted-foreground mt-2">
                          {processedPhrases[currentPhraseIndex].phonetic}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-center items-center gap-4">
                      {!isRecording ? (
                        <Button
                          onClick={handleStartRecording}
                          disabled={processedPhrases[currentPhraseIndex].status === 'assessing'}
                          className="w-40"
                        >
                          <MicIcon className="mr-2 h-4 w-4" />
                          Start Recording
                        </Button>
                      ) : (
                        <Button
                          onClick={handleStopRecording}
                          variant="destructive"
                          className="w-40"
                        >
                          <StopCircleIcon className="mr-2 h-4 w-4" />
                          Stop ({recordingDuration}s)
                        </Button>
                      )}
                    </div>
                    
                    {/* Status indicator */}
                    {processedPhrases[currentPhraseIndex].status === 'assessing' && (
                      <div className="text-center">
                        <RotateCw className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Assessing pronunciation...</p>
                      </div>
                    )}
                    
                    {/* Assessment visualization */}
                    {renderAssessmentVisualization(processedPhrases[currentPhraseIndex])}
                    
                    {/* AI-powered drills */}
                    {processedPhrases[currentPhraseIndex].status === 'complete' && (
                      <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          onClick={handleGenerateSimilar}
                          disabled={isProcessing}
                        >
                          <RotateCw className={`mr-2 h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                          Generate Similar Phrases
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleGenerateShareableLink}
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Share this Exercise
                        </Button>
                      </div>
                    )}
                    
                    {shareableLink && (
                      <Alert>
                        <AlertTitle>Shareable Link Created</AlertTitle>
                        <AlertDescription className="break-all">
                          <p className="text-xs">{shareableLink}</p>
                          <p className="text-sm mt-2">Link copied to clipboard!</p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Phrase Selected</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Select a phrase from the list or add new phrases to begin
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Progress history */}
              {renderHistoryChart()}
              
              {/* Social features */}
              {renderSocialBadges()}
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
