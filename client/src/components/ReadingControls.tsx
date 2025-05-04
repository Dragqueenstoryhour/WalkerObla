import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, CheckCircle, Clock, Volume2 } from 'lucide-react';
import { useReading } from '@/contexts/ReadingContext';
import useAudioRecording from '@/hooks/useAudioRecording';
import { submitReadingRecording } from '@/lib/azure';
import { useToast } from '@/hooks/use-toast';

const ReadingControls = () => {
  const { 
    isReading, 
    isPaused, 
    currentContent, 
    currentSession,
    currentHighlightedText,
    startReading, 
    pauseReading, 
    resumeReading, 
    stopReading,
    setHighlightedText,
    setPronunciationResults,
    updateSessionProgress
  } = useReading();
  
  const { toast } = useToast();
  const [pronunciationScore, setPronunciationScore] = useState(0);
  const [fluencyScore, setFluencyScore] = useState(0);
  const [wordsRead, setWordsRead] = useState(0);
  
  // Set up audio recording with proper pronunciation assessment
  const { 
    isRecording, 
    startRecording, 
    stopRecording,
    audioUrl,
    recordingDuration
  } = useAudioRecording({
    onRecordingComplete: async (blob) => {
      if (currentContent) {
        try {
          // Get the current highlighted text for assessment
          // Use both the context value and our local ref to ensure we have text to assess
          const recordedText = currentHighlightedText || highlightedTextRef.current || 'Test recording';
          
          console.log(`Processing recording with text: "${recordedText}"`);
          console.log(`Recording blob size: ${blob.size} bytes, type: ${blob.type}`);
          
          // Show loading toast
          toast({
            title: "Processing Recording",
            description: "Analyzing your pronunciation...",
          });
          
          // Log the original audio format
          console.log(`Original recording format: ${blob.type}`);
          
          // Log detailed information about the audio blob
          console.log(`[Debug] Processing audio blob: type=${blob.type}, size=${blob.size} bytes`);
          
          // Add more detailed diagnostic info for troubleshooting
          console.log(`[Debug] Browser audio capabilities:`);
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            console.log(`[Debug] Sample rate: ${audioContext.sampleRate}Hz`);
            console.log(`[Debug] Audio state: ${audioContext.state}`);
            console.log(`[Debug] Audio destination channels: ${audioContext.destination.channelCount}`);
            audioContext.close();
          } catch (err) {
            console.error(`[Debug] Error checking audio capabilities:`, err);
          }
          
          // Get the audio buffer data
          const audioBuffer = await blob.arrayBuffer();
          console.log(`Audio buffer size: ${audioBuffer.byteLength} bytes`);
          
          // Send recording for assessment using the original blob format
          // The server will handle any necessary format conversion
          console.log(`Sending recording for assessment: contentId=${currentContent.id}, text="${recordedText}"`);
          
          const results = await submitReadingRecording(
            blob, 
            currentContent.id, 
            recordedText
          );
          
          console.log("Pronunciation assessment results:", results);
          
          // Add detailed Azure assessment logging
          console.log(`Azure assessment breakdown:`);
          console.log(`  - Pronunciation Score: ${results.pronunciationScore.toFixed(1)}%`);
          console.log(`  - Fluency Score: ${results.fluencyScore.toFixed(1)}%`);
          console.log(`  - Accuracy Score: ${results.accuracyScore.toFixed(1)}%`);
          console.log(`  - Completeness Score: ${results.completenessScore.toFixed(1)}%`);
          
          // Log individual word scores for better diagnostics
          if (results.wordLevelResults && results.wordLevelResults.length > 0) {
            console.log('Word-by-word assessment:');
            results.wordLevelResults.forEach(word => {
              console.log(`  - "${word.word}": ${word.accuracyScore.toFixed(1)}% ${word.errorType ? `(${word.errorType})` : ''}`);
            });
          }
          
          if (!results || typeof results.pronunciationScore !== 'number') {
            throw new Error("Invalid assessment results received");
          }
          
          // Update scores
          setPronunciationScore(results.pronunciationScore);
          setFluencyScore(results.fluencyScore);
          
          // Update words read
          const newWordsRead = Math.min(
            (currentContent?.wordCount || 0),
            wordsRead + (recordedText.split(/\s+/).length || 0)
          );
          setWordsRead(newWordsRead);
          updateSessionProgress(newWordsRead);
          
          // Store pronunciation results
          setPronunciationResults(results);
          
          toast({
            title: "Reading Processed",
            description: `Pronunciation: ${results.pronunciationScore}%, Fluency: ${results.fluencyScore}%`,
          });
        } catch (error) {
          console.error("Error processing reading:", error);
          toast({
            title: "Processing Error",
            description: "Could not process your reading. This could be due to a microphone issue or the Azure service needing API credentials.",
            variant: "destructive",
          });
        }
      }
    },
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  
  // Keep a local reference to the currently highlighted text to use when recording
  const highlightedTextRef = useRef<string>('');
  
  // Set up reading segments from the current content
  useEffect(() => {
    let timeoutId: number;
    
    if (isReading && !isPaused && currentContent) {
      // Get text segments from the current content
      const contentText = currentContent.content;
      // Split into sentences (roughly)
      const sentences = contentText.split(/(?<=[.!?])\s+/);
      // Group into reasonable chunks (1-2 sentences at a time)
      const textSegments = [];
      
      for (let i = 0; i < sentences.length; i += 2) {
        if (i + 1 < sentences.length) {
          textSegments.push(sentences[i] + ' ' + sentences[i + 1]);
        } else {
          textSegments.push(sentences[i]);
        }
      }
      
      // Use at least the first few segments
      const readableSegments = textSegments.slice(0, Math.min(5, textSegments.length));
      
      // Cycle through text segments
      const currentIndex = Math.min(Math.floor(wordsRead / 20), readableSegments.length - 1);
      const nextText = readableSegments[currentIndex];
      
      console.log(`Reading segment ${currentIndex + 1} of ${readableSegments.length}`);
      
      if (nextText) {
        // Store the text locally and update in the context
        highlightedTextRef.current = nextText;
        setHighlightedText(nextText);
        
        // Start recording for this segment
        if (!isRecording) {
          startRecording();
          console.log('Started recording for segment');
        }
        
        // After a reasonable time, stop recording and move to next segment
        timeoutId = window.setTimeout(() => {
          if (isRecording) {
            console.log('Stopping recording for segment');
            stopRecording();
          }
          
          // Update words read to progress to next segment
          const words = nextText.split(/\s+/).length;
          const newWordsRead = Math.min(
            (currentContent?.wordCount || 0),
            wordsRead + words
          );
          setWordsRead(newWordsRead);
          updateSessionProgress(newWordsRead);
        }, 8000); // 8 seconds per segment for adequate recording time
      }
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isReading, isPaused, wordsRead, currentContent, isRecording, startRecording, stopRecording, setHighlightedText, updateSessionProgress]);
  
  const handleStartReading = () => {
    if (isReading) {
      stopReading();
    } else {
      setWordsRead(0);
      setPronunciationScore(0);
      setFluencyScore(0);
      startReading();
    }
  };
  
  const handlePauseResume = () => {
    if (isPaused) {
      resumeReading();
    } else {
      pauseReading();
    }
  };
  
  if (!currentContent) return null;
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Reading Practice</h2>
          <div className={`flex items-center ${
            isReading ? 'text-accent' : 'text-success'
          }`}>
            {isReading ? (
              <>
                <Clock className="w-5 h-5 mr-1" />
                <span>Reading in progress</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-1" />
                <span>Ready to start</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center md:items-start mb-6">
          <div className="flex-1 w-full">
            <div className="bg-secondary bg-opacity-30 rounded-lg p-4 mb-4">
              <p className="font-medium mb-2">Instructions:</p>
              <p className="text-textColor">
                Click 'Start Reading' and read the highlighted text aloud. 
                I'll listen and help you improve your pronunciation.
              </p>
            </div>
            
            {isReading && currentHighlightedText && (
              <div className="bg-primary bg-opacity-10 rounded-lg p-4 mb-4 border-l-4 border-primary">
                <p className="font-medium mb-2">Read this text aloud:</p>
                <p className="text-lg">
                  {currentHighlightedText.split(' ').map((word: string, index: number) => (
                    <span 
                      key={index}
                      className={`inline-block mr-1 transition-colors duration-200 ${
                        isRecording ? 'text-primary/50' : 'text-primary'
                      }`}
                    >
                      {word}
                    </span>
                  ))}
                </p>
                {isRecording && (
                  <div className="mt-2 flex items-center text-sm text-accent">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                    Recording in progress...
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                onClick={handleStartReading}
                className={`flex-1 font-medium ${
                  isReading ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'
                }`}
                size="lg"
              >
                {isReading ? (
                  <>
                    <span className="w-5 h-5 mr-2">□</span>
                    Stop Reading
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Reading
                  </>
                )}
              </Button>
              <Button
                onClick={handlePauseResume}
                variant="outline"
                className="flex-1 font-medium"
                size="lg"
                disabled={!isReading}
              >
                <Pause className="w-5 h-5 mr-2" />
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </div>
          </div>
          
          <div className="w-full md:w-72 bg-secondary bg-opacity-20 rounded-lg p-4">
            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center rounded-full bg-primary bg-opacity-10 w-16 h-16 mb-2">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="font-medium">Practice Progress</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Words Read</span>
                  <span>{wordsRead}/{currentContent.wordCount}</span>
                </div>
                <Progress value={(wordsRead / currentContent.wordCount) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Pronunciation Score</span>
                  <span className="text-success">{pronunciationScore}%</span>
                </div>
                <Progress 
                  value={pronunciationScore} 
                  className="h-2 bg-secondary" 
                  indicatorClassName="bg-success" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Reading Fluency</span>
                  <span className="text-accent">{fluencyScore}%</span>
                </div>
                <Progress 
                  value={fluencyScore} 
                  className="h-2 bg-secondary" 
                  indicatorClassName="bg-accent" 
                />
              </div>
              
              {audioUrl && (
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your Recording</span>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2"
                      onClick={() => {
                        try {
                          console.log(`[Debug] Playing recording from URL: ${audioUrl.substring(0, 30)}...`);
                          const audio = new Audio(audioUrl);
                          
                          audio.oncanplay = () => {
                            console.log(`[Debug] Audio ready to play, duration: ${audio.duration}s`);
                          };
                          
                          audio.onerror = (e) => {
                            console.error(`[Debug] Audio error: ${audio.error?.code}`, audio.error);
                            toast({
                              title: "Playback Error",
                              description: "Could not play your recording. Try recording again.",
                              variant: "destructive"
                            });
                          };
                          
                          audio.play().catch(e => {
                            console.error("[Debug] Error playing audio:", e);
                            toast({
                              title: "Playback Error",
                              description: "Could not play your recording. Your browser may be blocking autoplay.",
                              variant: "destructive"
                            });
                          });
                        } catch (err) {
                          console.error("[Debug] Error setting up audio playback:", err);
                          toast({
                            title: "Playback Error",
                            description: "Could not set up audio playback.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      Play
                    </Button>
                  </div>
                  {recordingDuration > 0 && (
                    <p className="text-xs text-textColor mt-1">
                      {recordingDuration} seconds recorded
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingControls;
