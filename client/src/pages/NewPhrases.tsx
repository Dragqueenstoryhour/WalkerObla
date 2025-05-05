import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'wouter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
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
import { MicIcon, StopCircleIcon, VolumeIcon, RotateCw, Upload, CheckCircle, FileText, Image, AlertTriangle, BarChart2, Share2, Award, Users, Camera } from 'lucide-react';

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
  const { user } = useAuth();
  const params = useParams();
  const shareId = params.shareId; // Get the shared link ID from URL
  
  const [manualEntryText, setManualEntryText] = useState('');
  const [imageUploadText, setImageUploadText] = useState('');
  const [aiGenerateTopic, setAiGenerateTopic] = useState('');
  const [processedPhrases, setProcessedPhrases] = useState<ProcessedPhrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [historyData, setHistoryData] = useState<{date: string, score: number}[]>([]);
  const [shareableLink, setShareableLink] = useState('');
  const [showSharedDialog, setShowSharedDialog] = useState(false);
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
  
  // Load shared phrases if the shareId is present in the URL
  useEffect(() => {
    const loadSharedPhrases = async () => {
      if (!shareId) return;
      
      setIsProcessing(true);
      
      try {
        const response = await fetch(`/api/phrases/shared/${shareId}`);
        
        if (!response.ok) {
          throw new Error('Failed to load shared phrases');
        }
        
        const data = await response.json();
        if (!data.collection || !data.collection.phrases) {
          throw new Error('Invalid shared phrases data');
        }
        
        // Parse the phrases from the JSON data
        const parsedPhrases = JSON.parse(data.collection.phrases);
        if (!Array.isArray(parsedPhrases)) {
          throw new Error('Invalid phrases format');
        }
        
        // Format the phrases for use in the component
        const newPhrases: ProcessedPhrase[] = parsedPhrases.map((phrase: any, index: number) => ({
          id: `shared-${Date.now()}-${index}`,
          text: phrase.text,
          phonetic: phrase.phonetic,
          difficulty: phrase.difficulty,
          status: 'idle'
        }));
        
        setProcessedPhrases(newPhrases);
        setCurrentPhraseIndex(0); // Select first phrase
        setShowSharedDialog(true); // Show the shared phrases notification
        
      } catch (error) {
        console.error('Error loading shared phrases:', error);
        toast({
          title: 'Error Loading Shared Phrases',
          description: error instanceof Error ? error.message : 'Failed to load shared phrases',
          variant: 'destructive'
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    loadSharedPhrases();
  }, [shareId, toast]);

  // Process the bulk text into individual phrases
  const handleProcessManualText = async () => {
    if (!manualEntryText.trim()) {
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
      const lines = manualEntryText.split('\n').filter(line => line.trim().length > 0);
      
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

    // Check file type - be more permissive with image formats
    // Accept any image type (including HEIC from iPhone and other formats)
    const isImage = file.type.startsWith('image/') || 
                  file.name.toLowerCase().endsWith('.heic') || 
                  file.name.toLowerCase().endsWith('.heif');
    const isPdf = file.type === 'application/pdf';
    
    // More detailed logging for debugging file types
    console.log(`Processing file: ${file.name}, type: ${file.type}`);
    
    if (!isImage && !isPdf) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image (JPG, PNG, HEIC, etc.) or PDF file.',
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
      
      // Check if the response contains an error (like an AI refusal) rather than actual text
      const lowerCaseText = result.text?.toLowerCase() || '';
      const containsError = lowerCaseText.includes("i'm sorry") || 
                         lowerCaseText.includes("i can't") || 
                         lowerCaseText.includes("unable to");
      
      if (result.text && !containsError) {
        setImageUploadText(result.text);
        toast({
          title: 'Text Extracted',
          description: 'Text successfully extracted from file. You can now process it.',
        });
      } else if (containsError) {
        throw new Error('The system could not process this image properly. Please try a different image.');
      } else {
        throw new Error('No text found in the file');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Processing Error',
        description: error instanceof Error ? error.message : 'Failed to extract text from file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle a file directly (used by camera capture)
  const handleFileSelection = (file: File) => {
    // Check file type - be more permissive with image formats
    // Accept any image type (including HEIC from iPhone and other formats)
    const isImage = file.type.startsWith('image/') || 
                  file.name.toLowerCase().endsWith('.heic') || 
                  file.name.toLowerCase().endsWith('.heif');
    const isPdf = file.type === 'application/pdf';
    
    // More detailed logging for debugging file types
    console.log(`Processing selected file: ${file.name}, type: ${file.type}`);
    
    if (!isImage && !isPdf) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image (JPG, PNG, HEIC, etc.) or PDF file.',
        variant: 'destructive'
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsProcessing(true);

    // Send the file for OCR processing
    fetch('/api/content/ocr', {
      method: 'POST',
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to process file');
      }
      return response.json();
    })
    .then(result => {
      // Check if the response contains an error (like an AI refusal) rather than actual text
      const lowerCaseText = result.text?.toLowerCase() || '';
      const containsError = lowerCaseText.includes("i'm sorry") || 
                         lowerCaseText.includes("i can't") || 
                         lowerCaseText.includes("unable to");
      
      if (result.text && !containsError) {
        setImageUploadText(result.text);
        toast({
          title: 'Text Extracted',
          description: 'Text successfully extracted from file. You can now process it.',
        });
      } else if (containsError) {
        throw new Error('The system could not process this image properly. Please try a different image.');
      } else {
        throw new Error('No text found in the file');
      }
    })
    .catch(error => {
      console.error('Error processing file:', error);
      toast({
        title: 'Processing Error',
        description: error instanceof Error ? error.message : 'Failed to extract text from file. Please try again.',
        variant: 'destructive'
      });
    })
    .finally(() => {
      setIsProcessing(false);
    });
  };

  // Process text from OCR results
  const handleProcessImageText = async () => {
    if (!imageUploadText.trim()) {
      toast({
        title: 'No Text Available',
        description: 'Please upload an image or PDF first.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Split text by newlines and filter out empty lines
      const lines = imageUploadText.split('\n').filter(line => line.trim().length > 0);
      
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
        console.error('No audio blob available after stopping recording');
        toast({
          title: 'Recording Error',
          description: 'Failed to capture audio. Please try again.',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('Processing recording with text:', processedPhrases[currentPhraseIndex].text);

      // Update status to assessing
      setProcessedPhrases(phrases => 
        phrases.map((phrase, idx) => 
          idx === currentPhraseIndex 
            ? { ...phrase, status: 'assessing', recordingBlob: audioBlob, recordingUrl: audioUrl || undefined } 
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
        console.log('Received assessment results:', result);
        
        // Validate the result has expected properties
        if (typeof result.pronunciationScore !== 'number') {
          throw new Error('Invalid assessment result format');
        }

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
          { date: new Date().toISOString().split('T')[0], score: Math.round(result.pronunciationScore) }
        ]);
        
        // If score is really good, show a toast as well
        if (result.pronunciationScore >= 90) {
          toast({
            title: 'Excellent Pronunciation!',
            description: `You scored ${Math.round(result.pronunciationScore)}%!`,
          });
        }
      } catch (error) {
        console.error('Error assessing pronunciation:', error);
        toast({
          title: 'Assessment Error',
          description: error instanceof Error ? error.message : 'Failed to assess pronunciation. Please try again.',
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
  const handleGenerateShareableLink = async () => {
    if (processedPhrases.length === 0) {
      toast({
        title: 'No Phrases to Share',
        description: 'Please process some phrases first before generating a shareable link.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    
    // Format the phrases for sharing
    const phrasesToShare = processedPhrases.map(phrase => ({
      text: phrase.text,
      phonetic: phrase.phonetic || '',
      difficulty: phrase.difficulty || 'intermediate'
    }));
    
    try {
      // Create the shareable link
      const response = await fetch('/api/phrases/shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          phrases: JSON.stringify(phrasesToShare),
          userId: user?.id || null,
          name: 'Shared Phrases Collection'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate shareable link');
      }
      
      const data = await response.json();
      const fullShareableLink = `${window.location.origin}/new-phrases/${data.collection.shareId}`;
      setShareableLink(fullShareableLink);
      
      // Copy to clipboard
      navigator.clipboard.writeText(fullShareableLink)
        .then(() => {
          toast({
            title: 'Link Copied!',
            description: 'Shareable link has been copied to your clipboard.',
          });
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          toast({
            title: 'Link Generated',
            description: 'Shareable link created successfully, but could not copy to clipboard automatically.',
          });
        });
      
    } catch (error) {
      console.error('Error generating shareable link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate shareable link. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the current phrase to user's saved phrases
  const handleSavePhrase = async () => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to save phrases to your collection.',
        variant: 'default'
      });
      return;
    }
    
    if (currentPhraseIndex < 0 || currentPhraseIndex >= processedPhrases.length) {
      toast({
        title: 'No Phrase Selected',
        description: 'Please select a phrase to save.',
        variant: 'destructive'
      });
      return;
    }
    
    const phraseToSave = processedPhrases[currentPhraseIndex];
    
    try {
      const response = await fetch('/api/phrases/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          phrase: phraseToSave.text,
          phonetic: phraseToSave.phonetic || null,
          difficulty: phraseToSave.difficulty || null,
          assessmentResults: phraseToSave.assessmentResult ? JSON.stringify(phraseToSave.assessmentResult) : null,
          source: 'new_phrases',
          sourceId: shareId || null
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save phrase');
      }
      
      toast({
        title: 'Phrase Saved',
        description: 'This phrase has been saved to your collection.',
      });
      
    } catch (error) {
      console.error('Error saving phrase:', error);
      toast({
        title: 'Error Saving Phrase',
        description: error instanceof Error ? error.message : 'Failed to save phrase',
        variant: 'destructive'
      });
    }
  };
  
  // Play the recording for a phrase
  const handlePlayRecording = (phraseIndex: number) => {
    const phrase = processedPhrases[phraseIndex];
    if (phrase?.recordingUrl && audioRef.current) {
      console.log('Playing recording with URL:', phrase.recordingUrl);
      audioRef.current.src = phrase.recordingUrl;
      audioRef.current.oncanplaythrough = () => {
        audioRef.current?.play()
          .catch(error => {
            console.error('Error playing audio:', error);
            toast({
              title: 'Playback Error',
              description: 'Could not play the recording. Please try again.',
              variant: 'destructive'
            });
          });
      };
      audioRef.current.onerror = (e) => {
        console.error('Audio error:', e);
        toast({
          title: 'Playback Error',
          description: 'Could not play the recording. Please try again.',
          variant: 'destructive'
        });
      };
    } else {
      console.warn('No recording URL available for phrase', phraseIndex);
      toast({
        title: 'No Recording',
        description: 'No recording available for this phrase.',
        variant: 'destructive'
      });
    }
  };

  // Calculate overall progress
  const calculateProgress = () => {
    if (processedPhrases.length === 0) return 0;
    const completedCount = processedPhrases.filter(p => p.status === 'complete').length;
    return Math.round((completedCount / processedPhrases.length) * 100);
  };

  // Render difficulty badge - but hide all tags as requested
  const renderDifficultyBadge = (difficulty: string | undefined) => {
    // We're removing all difficulty tags per user request
    return null;
  };

  // Confetti effect for high scores
  useEffect(() => {
    // Check if there's a selected phrase with a high score
    if (currentPhraseIndex >= 0 && 
        processedPhrases[currentPhraseIndex]?.assessmentResult && 
        Math.round(processedPhrases[currentPhraseIndex].assessmentResult!.pronunciationScore) >= 95) {
      
      // Dynamically import canvas-confetti only when needed
      const celebrateHighScore = async () => {
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (error) {
          console.error('Error loading confetti:', error);
        }
      };
      
      celebrateHighScore();
    }
  }, [currentPhraseIndex, processedPhrases]);
  
  // Render assessment visualization
  const renderAssessmentVisualization = (phrase: ProcessedPhrase) => {
    if (!phrase.assessmentResult) return null;
    
    const result = phrase.assessmentResult;
    const score = Math.round(result.pronunciationScore);
    
    return (
      <div className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pronunciation Assessment</CardTitle>
            <CardDescription>Your speech analysis results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main score - Pronunciation */}
            <div className="flex justify-center py-2">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32">
                  <circle 
                    className="text-muted-foreground" 
                    strokeWidth="10" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50"
                    opacity="0.2"
                  />
                  <circle 
                    className="text-primary" 
                    strokeWidth="10" 
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.pronunciationScore / 100)}`}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <span className="absolute text-3xl font-bold flex items-center justify-center" style={{ inset: 0, margin: 'auto' }}>{score}</span>
              </div>
            </div>
            
            {/* Other scores */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Fluency</span>
                  <span className="text-sm font-medium">{Math.round(result.fluencyScore)}%</span>
                </div>
                <Progress 
                  value={result.fluencyScore} 
                  className="h-2" 
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Accuracy</span>
                  <span className="text-sm font-medium">{Math.round(result.accuracyScore)}%</span>
                </div>
                <Progress 
                  value={result.accuracyScore} 
                  className="h-2" 
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Completeness</span>
                  <span className="text-sm font-medium">{Math.round(result.completenessScore)}%</span>
                </div>
                <Progress 
                  value={result.completenessScore} 
                  className="h-2" 
                />
              </div>
            </div>
            
            {/* Word-level results (heatmap) */}
            {result.wordLevelResults && result.wordLevelResults.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Word Accuracy</h3>
                <div className="flex flex-wrap gap-2">
                  {result.wordLevelResults.map((word, idx) => {
                    // Calculate color based on score
                    const score = word.accuracyScore;
                    const bgColor = score > 85 ? 'bg-green-100 dark:bg-green-900' :
                                   score > 70 ? 'bg-yellow-100 dark:bg-yellow-900' :
                                   'bg-red-100 dark:bg-red-900';
                    const textColor = score > 85 ? 'text-green-800 dark:text-green-300' :
                                     score > 70 ? 'text-yellow-800 dark:text-yellow-300' :
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render a bar chart for the last 10 scores
  const renderHistoryChart = () => {
    if (historyData.length === 0) return null;
    
    // Only show the last 10 scores
    const lastTenScores = historyData.slice(-10);
    
    return (
      <Card className="mt-4 border-0 shadow-md bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-800">Progress Over Time</CardTitle>
              <CardDescription>Your pronunciation improvement journey</CardDescription>
            </div>
            {lastTenScores.length > 0 && (
              <div className="bg-primary/10 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-primary">
                  Latest: {lastTenScores[lastTenScores.length - 1].score}%
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-56 flex items-end gap-1 mt-4 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 25, 50, 75, 100].map((mark) => (
                <div key={mark} className="w-full border-t border-slate-200 flex items-center h-0">
                  <span className="text-xs text-slate-400 absolute -left-6">{mark}%</span>
                </div>
              ))}
            </div>
            
            {lastTenScores.map((item, idx) => {
              // Scale height based on the score (0-100% range)
              const heightPercent = item.score;
              
              // Color based on score as requested:
              // 85+ in green, 70-84 in orange, 69 and below in red
              const barColor = item.score >= 85 ? 'bg-green-500' :
                             item.score >= 70 ? 'bg-amber-500' :
                             'bg-red-500';
                             
              // Generate gradient overlay for 3D effect
              const gradientClass = item.score >= 85 ? 'from-green-400 to-green-600' :
                                  item.score >= 70 ? 'from-amber-400 to-amber-600' :
                                  'from-red-400 to-red-600';
              
              return (
                <div key={idx} className="flex flex-col items-center flex-1 relative">
                  <div className="relative w-full h-full flex items-end">
                    <div 
                      className={`w-full ${barColor} rounded-t-md shadow-lg bg-gradient-to-b ${gradientClass}`} 
                      style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                      title={`Score: ${item.score}%`}
                    >
                      {/* Highlight at top of bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-md"></div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium text-slate-700">{item.score}</p>
                    {/* Only show the day part of the date, not the original indices */}
                    <p className="text-[10px] text-slate-500">{new Date(item.date).getDate()}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center mt-4 gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div>
              <span className="text-slate-600">Needs work</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-amber-500 rounded-sm mr-1"></div>
              <span className="text-slate-600">Good</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
              <span className="text-slate-600">Excellent</span>
            </div>
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

  // Add a new phrase to the list
  const handleAddNewPhrase = () => {
    setProcessedPhrases(phrases => [
      ...phrases,
      {
        id: `phrase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: '',
        status: 'idle'
      }
    ]);
  };

  // Handle text change for an editable phrase
  const handlePhraseTextChange = (index: number, text: string) => {
    setProcessedPhrases(phrases => 
      phrases.map((phrase, idx) => 
        idx === index 
          ? { ...phrase, text } 
          : phrase
      )
    );
  };

  // Generate phrases on a specific topic
  const handleGenerateTopicPhrases = async (topic: string) => {
    if (!topic.trim()) {
      toast({
        title: 'No Topic Provided',
        description: 'Please enter a topic to generate phrases.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/content/generate-topic-phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate phrases');
      }
      
      const result = await response.json();
      
      // Add the new phrases to our collection
      const newPhrases: ProcessedPhrase[] = result.phrases.map((text: string, index: number) => ({
        id: `phrase-${Date.now()}-topic-${index}`,
        text,
        status: 'idle'
      }));
      
      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0); // Select first phrase
      
      toast({
        title: 'Phrases Generated',
        description: `${newPhrases.length} phrases related to "${topic}" have been generated.`,
      });
    } catch (error) {
      console.error('Error generating topic phrases:', error);
      toast({
        title: 'Generation Error',
        description: 'Failed to generate phrases. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Shared phrases notification dialog */}
      <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You've been sent these phrases for practice</DialogTitle>
            <DialogDescription>
              Someone has shared a set of phrases with you to practice your pronunciation. 
              These phrases have been loaded and are ready for you to start practicing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSharedDialog(false)}>Get Started</Button>
          </div>
        </DialogContent>
      </Dialog>
      <h1 className="text-3xl font-bold mb-6">New Phrases</h1>
      
      <Tabs defaultValue="ai-generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-generate">
            <RotateCw className="h-4 w-4 mr-2" /> AI Generate
          </TabsTrigger>
          <TabsTrigger value="image-upload">
            <Image className="h-4 w-4 mr-2" /> Image Upload
          </TabsTrigger>
          <TabsTrigger value="manual-entry">
            <FileText className="h-4 w-4 mr-2" /> Text Entry
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
                value={manualEntryText}
                onChange={(e) => setManualEntryText(e.target.value)}
                rows={6}
                className="w-full"
              />
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleProcessManualText} 
                disabled={isProcessing || !manualEntryText.trim()}
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
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                {/* Upload area - smaller */}
                <div className="md:w-1/3 space-y-2">
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-base font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, HEIC, GIF, or PDF up to 10MB</p>
                    <input 
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center" 
                    onClick={() => {
                      // Access device camera
                      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        // Create a video element to show the camera feed
                        const videoElement = document.createElement('video');
                        const canvasElement = document.createElement('canvas');
                        
                        // Create and show a modal with the camera feed
                        const modal = document.createElement('div');
                        modal.style.position = 'fixed';
                        modal.style.top = '0';
                        modal.style.left = '0';
                        modal.style.width = '100%';
                        modal.style.height = '100%';
                        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                        modal.style.display = 'flex';
                        modal.style.flexDirection = 'column';
                        modal.style.alignItems = 'center';
                        modal.style.justifyContent = 'flex-end'; // Position buttons at bottom
                        modal.style.padding = '20px';
                        modal.style.zIndex = '9999';
                        
                        // Add the video element to the modal - make smaller on mobile
                        videoElement.style.maxWidth = '90%';
                        videoElement.style.maxHeight = '50vh'; // Reduced height to leave room for buttons
                        videoElement.style.borderRadius = '8px';
                        videoElement.autoplay = true;
                        modal.appendChild(videoElement);
                        
                        // Add capture button
                        const captureButton = document.createElement('button');
                        captureButton.textContent = 'Take Photo';
                        captureButton.style.margin = '20px 0';
                        captureButton.style.padding = '10px 20px';
                        captureButton.style.borderRadius = '4px';
                        captureButton.style.backgroundColor = 'hsl(var(--primary))';
                        captureButton.style.color = 'white';
                        captureButton.style.border = 'none';
                        captureButton.style.cursor = 'pointer';
                        modal.appendChild(captureButton);
                        
                        // Add close button
                        const closeButton = document.createElement('button');
                        closeButton.textContent = 'Cancel';
                        closeButton.style.padding = '10px 20px';
                        closeButton.style.borderRadius = '4px';
                        closeButton.style.backgroundColor = 'transparent';
                        closeButton.style.border = '1px solid white';
                        closeButton.style.color = 'white';
                        closeButton.style.cursor = 'pointer';
                        modal.appendChild(closeButton);
                        
                        document.body.appendChild(modal);
                        
                        let stream: MediaStream | null = null;
                        
                        // Start the camera
                        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                          .then((mediaStream) => {
                            stream = mediaStream;
                            videoElement.srcObject = mediaStream;
                          })
                          .catch((error) => {
                            console.error('Camera access error:', error);
                            document.body.removeChild(modal);
                            toast({
                              title: 'Camera Error',
                              description: 'Could not access your camera. Please check permissions.',
                              variant: 'destructive'
                            });
                          });
                        
                        // Capture button event
                        captureButton.onclick = () => {
                          // Draw the current video frame to canvas
                          canvasElement.width = videoElement.videoWidth;
                          canvasElement.height = videoElement.videoHeight;
                          canvasElement.getContext('2d')?.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
                          
                          // Convert to blob
                          canvasElement.toBlob((blob) => {
                            if (blob) {
                              // Clean up
                              if (stream) {
                                stream.getTracks().forEach(track => track.stop());
                              }
                              document.body.removeChild(modal);
                              
                              // Create a File object from the blob
                              const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                              
                              // Process the file like a normal upload
                              handleFileSelection(file);
                            }
                          }, 'image/jpeg', 0.95);
                        };
                        
                        // Close button event
                        closeButton.onclick = () => {
                          if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                          }
                          document.body.removeChild(modal);
                        };
                      } else {
                        toast({
                          title: 'Camera Not Available',
                          description: 'Your device or browser does not support camera access.',
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Picture
                  </Button>
                </div>
                
                {/* Preview area */}
                <div className="flex-1 min-h-[200px]">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Progress value={45} className="w-full mb-4" />
                      <p className="text-sm text-muted-foreground">Transcribing image content...</p>
                    </div>
                  ) : imageUploadText ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <p className="text-sm font-medium">Transcription complete</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Here is the extracted text:</p>
                      <Textarea
                        value={imageUploadText}
                        onChange={(e) => setImageUploadText(e.target.value)}
                        rows={8}
                        className="w-full"
                        placeholder="Edit transcription as needed..."
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full border rounded-lg p-4">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No image uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
              
              {imageUploadText && (
                <Button 
                  onClick={handleProcessImageText} 
                  disabled={isProcessing || !imageUploadText.trim()}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Generate Exercise'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai-generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Phrases on Topic</CardTitle>
              <CardDescription>
                Let AI generate topic-specific phrases and words for practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic">Topic or Category</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      id="topic" 
                      placeholder="Enter a topic (e.g., Golf, Cooking, Shopping)" 
                      value={aiGenerateTopic}
                      onChange={(e) => setAiGenerateTopic(e.target.value)}
                    />
                    <Button 
                      onClick={() => handleGenerateTopicPhrases(aiGenerateTopic)}
                      disabled={isProcessing || !aiGenerateTopic.trim()}
                    >
                      {isProcessing ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        'Generate'
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Example topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Golf', 'Kitchen', 'Hospital', 'Travel', 'Banking', 'Restaurant'].map(topic => (
                      <Badge 
                        key={topic} 
                        className="cursor-pointer" 
                        variant="outline"
                        onClick={() => {
                          setAiGenerateTopic(topic);
                          handleGenerateTopicPhrases(topic);
                        }}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
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
              <Button
                variant="outline"
                className="flex items-center gap-1"
                onClick={() => {
                  if (!shareableLink) {
                    handleGenerateShareableLink();
                  }
                }}
                disabled={processedPhrases.length === 0}
              >
                {shareableLink ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span>Share Phrases</span>
                  </>
                )}
              </Button>
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
                      <div className="flex-1">
                        {phrase.text ? (
                          <p className="font-medium">{phrase.text}</p>
                        ) : (
                          <Input 
                            placeholder="Enter phrase here..." 
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handlePhraseTextChange(idx, e.target.value)}
                            autoFocus
                          />
                        )}
                        {/* Phonetic pronunciation removed as requested */}
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
                      {isRecording ? (
                        <Button
                          onClick={handleStopRecording}
                          variant="destructive"
                          className="w-40"
                        >
                          <StopCircleIcon className="mr-2 h-4 w-4" />
                          Stop ({recordingDuration}s)
                        </Button>
                      ) : processedPhrases[currentPhraseIndex].status === 'complete' ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleStartRecording}
                            variant="secondary"
                            className="flex-1"
                          >
                            <RotateCw className="mr-2 h-4 w-4" />
                            Try Again
                          </Button>
                          <Button
                            onClick={() => handlePlayRecording(currentPhraseIndex)}
                            variant="outline"
                            className="flex-1"
                          >
                            <VolumeIcon className="mr-2 h-4 w-4" />
                            Play
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleStartRecording}
                          disabled={processedPhrases[currentPhraseIndex].status === 'assessing'}
                          className="w-40"
                        >
                          <MicIcon className="mr-2 h-4 w-4" />
                          Start Recording
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
              
              {/* Badges section hidden as requested */}
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
