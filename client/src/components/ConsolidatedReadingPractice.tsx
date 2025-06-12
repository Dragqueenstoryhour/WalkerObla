import { useState, useRef, useEffect } from 'react';
import { useReading } from '@/contexts/ReadingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, BarChart2, MicIcon, Volume2, BookOpen, StopCircleIcon, Ear, Snail } from 'lucide-react';
import { generateReadingContent } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';
import { useDifficulty, mapDifficultyToServer, DifficultyLevel } from '@/contexts/DifficultyContext';
import useEnhancedVoice from '@/hooks/useEnhancedVoice';
import { PronunciationAssessmentResult } from '@/lib/types';

interface ConsolidatedReadingPracticeProps {
  onAssessmentReceived?: (assessment: PronunciationAssessmentResult) => void;
  onNewContent?: () => void;
  contentId?: number;
}

interface ProcessedPhrase {
  id: string;
  text: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: PronunciationAssessmentResult;
  status: "idle" | "recording" | "assessing" | "complete";
}

const ConsolidatedReadingPractice = ({ onAssessmentReceived, onNewContent, contentId }: ConsolidatedReadingPracticeProps) => {
  const { currentContent, setCurrentContent, currentHighlightedText, isReading } = useReading();
  const { toast } = useToast();
  const { difficulty, setDifficulty } = useDifficulty();
  const [isGenerating, setIsGenerating] = useState(false);
  const readingContentRef = useRef<HTMLDivElement>(null);

  // Topic selection states
  const [customTopic, setCustomTopic] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  // Practice states
  const [phrase, setPhrase] = useState<ProcessedPhrase>({
    id: `practice-${Date.now()}`,
    text: currentContent?.content || '',
    status: "idle"
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [slowPlayback, setSlowPlayback] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Predefined reading topics
  const readingTopics = [
    'Current Events',
    'Health & Wellness', 
    'Technology',
    'Travel & Culture',
    'Science & Nature',
    'Food & Cooking',
    'Sports & Recreation',
    'History & Biography'
  ];

  // --- Voice Control States and Refs ---
  const [isListeningVoiceCommand, setIsListeningVoiceCommand] = useState(false);
  const [isProcessingVoiceCommand, setIsProcessingVoiceCommand] = useState(false);
  const [transcribedVoiceCommandText, setTranscribedVoiceCommandText] = useState<string>('');
  const [confirmationVoiceCommandMessage, setConfirmationVoiceCommandMessage] = useState<string>('');
  const [isPlayingVoiceResponse, setIsPlayingVoiceResponse] = useState(false);
  const audioRefVoiceResponse = useRef<HTMLAudioElement | null>(null);

  // Update phrase text when currentContent changes
  useEffect(() => {
    if (currentContent?.content && currentContent.content.trim() !== '') {
      setPhrase(prev => ({
        ...prev,
        text: currentContent.content.trim()
      }));
      // Reset saved state when content changes
      setIsSaved(false);
    }
  }, [currentContent]);

  // --- Voice Control Handlers ---
  const handleVoiceResult = async (result: { action: string; topic?: string; parameters?: { difficulty?: string }; message?: string }) => {
    if (result.action === 'generateContent' && result.topic) {
      try {
        const difficultyParam = result.parameters?.difficulty;
        const contentDifficulty = difficultyParam && /^[1-8]$/.test(difficultyParam)
          ? difficultyParam
          : difficulty;

        console.log(`Generating content about "${result.topic}" with difficulty "${contentDifficulty}"`);
        setConfirmationVoiceCommandMessage(result.message || `I'll find a reading article on ${result.topic} for you.`);

        const serverDifficulty = mapDifficultyToServer(contentDifficulty as DifficultyLevel);
        const content = await generateReadingContent(result.topic, serverDifficulty);
        setCurrentContent({ ...content, topic: result.topic });
      } catch (error) {
        console.error('Error generating content from voice command:', error);
        setConfirmationVoiceCommandMessage('');
      }
    } else if (result.message) {
      setConfirmationVoiceCommandMessage(result.message);
    } else {
      setConfirmationVoiceCommandMessage('I understood your request.');
    }
  };

  const handleAudioResponse = (audioData: string) => {
    if (!audioRefVoiceResponse.current) {
      audioRefVoiceResponse.current = new Audio();
    }

    const blob = new Blob([Buffer.from(audioData, 'base64')], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    if (audioRefVoiceResponse.current.src) {
      URL.revokeObjectURL(audioRefVoiceResponse.current.src);
    }

    audioRefVoiceResponse.current.src = url;
    audioRefVoiceResponse.current.onplay = () => setIsPlayingVoiceResponse(true);
    audioRefVoiceResponse.current.onended = () => setIsPlayingVoiceResponse(false);
    audioRefVoiceResponse.current.play().catch((err) => console.error('Error playing audio:', err));
  };

  // Set up enhanced voice recognition with GPT-4o
  const {
    isListening,
    isProcessing,
    transcribedText: enhancedTranscript,
    startListening,
    stopListening,
  } = useEnhancedVoice({
    onVoiceResult: handleVoiceResult,
    onAudioResponse: handleAudioResponse,
    onTranscript: (text) => setTranscribedVoiceCommandText(text),
    onError: (error) => {
      console.error('Voice recognition error:', error);
      setConfirmationVoiceCommandMessage('');
      setIsListeningVoiceCommand(false);
      setIsProcessingVoiceCommand(false);
    },
  });

  // Sync voice command states from hook
  useEffect(() => {
    setIsListeningVoiceCommand(isListening);
    setIsProcessingVoiceCommand(isProcessing);
    if (enhancedTranscript) {
      setTranscribedVoiceCommandText(enhancedTranscript);
    }
  }, [isListening, isProcessing, enhancedTranscript]);

  // Clean up audio resources when component unmounts
  useEffect(() => {
    return () => {
      if (audioRefVoiceResponse.current?.src) {
        URL.revokeObjectURL(audioRefVoiceResponse.current.src);
      }
    };
  }, []);

  const toggleVoiceCommandListening = () => {
    if (!isListeningVoiceCommand && !isProcessingVoiceCommand) {
      setTranscribedVoiceCommandText('');
      setConfirmationVoiceCommandMessage('');
      startListening();
    } else {
      stopListening();
    }
  };

  // Reset practice section to initial state
  const resetPracticeSection = () => {
    setPhrase({
      id: `practice-${Date.now()}`,
      text: '',
      status: "idle"
    });
    setIsRecording(false);
    setIsProcessingRecording(false);
    
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Handle predefined topic selection
  const handleTopicSelection = async (topic: string) => {
    setIsGenerating(true);
    resetPracticeSection(); // Reset practice section when selecting new topic
    
    try {
      const serverDifficulty = mapDifficultyToServer(difficulty);
      console.log(`Generating content about "${topic}" with difficulty "${serverDifficulty}"`);
      
      const content = await generateReadingContent(topic, serverDifficulty);
      setCurrentContent(content);
      
      // Auto-scroll to practice section after content generation
      setTimeout(() => {
        const practiceSection = document.getElementById('practice-section');
        if (practiceSection) {
          practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error("Error generating topic content:", error);
      // toast({
      //   title: "Error",
      //   description: "Failed to generate content for this topic. Please try again.",
      //   variant: "destructive",
      // });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle custom topic generation
  const handleCustomTopicGeneration = async () => {
    if (!customTopic.trim()) {
      // toast({
      //   title: "Please enter a topic",
      //   description: "Enter something you'd like to read about",
      //   variant: "destructive",
      // });
      return;
    }

    setIsGeneratingCustom(true);
    resetPracticeSection(); // Reset practice section when generating custom content
    
    try {
      const serverDifficulty = mapDifficultyToServer(difficulty);
      console.log(`Generating custom content about "${customTopic}" with difficulty "${serverDifficulty}"`);
      
      const content = await generateReadingContent(customTopic, serverDifficulty);
      setCurrentContent(content);
      setCustomTopic('');
      
      // Auto-scroll to practice section after content generation
      setTimeout(() => {
        const practiceSection = document.getElementById('practice-section');
        if (practiceSection) {
          practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error("Error generating custom content:", error);
      // toast({
      //   title: "Error",
      //   description: "Failed to generate content for your topic. Please try again.",
      //   variant: "destructive",
      // });
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  // Generate new content
  const generateNewContent = async () => {
    setIsGenerating(true);
    resetPracticeSection(); // Reset practice section when generating new content
    
    try {
      const topics = [
        'gardening', 'cooking', 'travel', 'animals', 'history',
        'music', 'technology', 'health', 'science', 'nature'
      ];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const serverDifficulty = mapDifficultyToServer(difficulty);
      
      const content = await generateReadingContent(randomTopic, serverDifficulty);
      setCurrentContent(content);
      
      if (onNewContent) {
        onNewContent();
      }
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Start recording the phrase
  const startPhrasePractice = async () => {
    try {
      setPhrase(prev => ({ ...prev, status: "recording" }));
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          tracks.forEach(track => track.stop());
          streamRef.current = null;
        }

        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processPhraseRecording(audioBlob);
        } catch (error) {
          console.error('Error processing phrase recording:', error);
          setIsRecording(false);
          setIsProcessingRecording(false);
          setPhrase(prev => ({ ...prev, status: "idle" }));
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setPhrase(prev => ({ ...prev, status: "idle" }));
    }
  };

  // Stop recording the phrase
  const stopPhrasePractice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Process phrase recording with Azure
  const processPhraseRecording = async (audioBlob: Blob) => {
    setIsProcessingRecording(true);

    try {
      if (!phrase || !phrase.text || phrase.text.trim() === '') {
        console.error('Invalid phrase data:', phrase);
        throw new Error('No text available for assessment');
      }

      console.log('Processing reading phrase:', phrase.text);
      setPhrase(prev => ({ ...prev, status: "assessing" }));

      const recordingUrl = URL.createObjectURL(audioBlob);

      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", phrase.text.trim());
      formData.append("itemType", "reading");
      formData.append("source", "reader");
      if (contentId) {
        formData.append("contentId", contentId.toString());
      }

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const result = await response.json();
      console.log("Received assessment results:", result);

      if (typeof result.pronunciationScore !== "number") {
        throw new Error("Invalid assessment result format");
      }

      setPhrase(prev => ({
        ...prev,
        status: "complete",
        assessmentResult: result,
        recordingBlob: audioBlob,
        recordingUrl,
      }));

      if (onAssessmentReceived) {
        onAssessmentReceived(result);
      }
    } catch (error) {
      console.error("Error assessing pronunciation:", error);
      setPhrase(prev => ({ ...prev, status: "idle" }));
    } finally {
      setIsProcessingRecording(false);
    }
  };

  // Text-to-speech handler using OpenAI API with enhanced mobile Safari support
  const handleTextToSpeech = async () => {
    if (!phrase.text) {
      return;
    }

    const textToSpeak = phrase.text;

    // Construct the SSML string with Azure AI Speech native voice
    let ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
    ssmlText += `<voice name="en-US-AvaNeural">`;

    if (slowPlayback) {
      // Use SSML prosody rate to slow down - Azure uses "slow" or decimal values
      ssmlText += `<prosody rate="0.6">`;
      ssmlText += textToSpeak;
      ssmlText += `</prosody>`;
    } else {
      ssmlText += textToSpeak;
    }
    ssmlText += `</voice>`;
    ssmlText += `</speak>`;

    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          ssml: ssmlText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to synthesize speech: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error("Received empty audio data");
      }

      // Enhanced audio handling for Safari/mobile compatibility
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();
      
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous';
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
      };

      const playAudio = () => {
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Audio playing successfully
          }).catch((error) => {
            console.error('Audio play promise rejected:', error);
          });
        }
      };

      audio.onloadeddata = playAudio;
      
      audio.oncanplaythrough = () => {
        if (audio.readyState >= 3) {
          playAudio();
        }
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.src = audioUrl;
      audio.load();
      
    } catch (error) {
      console.error('TTS Error:', error);
    }
  };

  // Handle recording playback with enhanced mobile compatibility
  const handleRecordingPlayback = async () => {
    if (!phrase.recordingBlob) {
      console.error('No recording available to play');
      return;
    }

    try {
      // Create audio element with enhanced mobile compatibility
      const audioUrl = URL.createObjectURL(phrase.recordingBlob);
      const audio = new Audio();
      
      // Enhanced settings for mobile Safari compatibility
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      // Better error handling
      audio.onerror = (e) => {
        console.error('Recording playback error:', e);
        URL.revokeObjectURL(audioUrl);
      };

      // Promise-based playback for better mobile support
      const playRecording = () => {
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Recording playback started successfully');
          }).catch((error) => {
            console.error('Recording play promise rejected:', error);
            
            // Fallback: try creating a new audio element
            const fallbackAudio = new Audio(audioUrl);
            fallbackAudio.play().catch(fallbackError => {
              console.error('Fallback audio play failed:', fallbackError);
            });
          });
        }
      };

      // Use multiple event listeners for better compatibility
      audio.oncanplay = playRecording;
      audio.onloadeddata = playRecording;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      // Set source and trigger loading
      audio.src = audioUrl;
      audio.load();
      
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  };

  // Toggle slow playback
  const toggleSlowPlayback = () => {
    setSlowPlayback(prev => !prev);
  };

  // Save reading to My Journey
  const handleSaveReading = async () => {
    try {
      // Check if user is authenticated
      const userResponse = await fetch("/api/auth/user");
      if (!userResponse.ok) {
        return;
      }

      if (!currentContent || !phrase.text) {
        return;
      }

      const response = await fetch("/api/phrases/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phrase: phrase.text,
          phonetic: null,
          difficulty: "intermediate",
          source: "reader_content",
          sourceId: currentContent.id ? currentContent.id.toString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save reading");
      }

      setIsSaved(true);
    } catch (error) {
      console.error('Error saving reading:', error);
    }
  };

  useEffect(() => {
    if (readingContentRef.current && currentContent) {
      try {
        let contentStr = typeof currentContent.content === 'string'
          ? currentContent.content
          : JSON.stringify(currentContent.content);

        contentStr = contentStr.replace(/\(\[?[\w\.]+\]?\(https?:\/\/[^\)]*\)\)/g, '');
        contentStr = contentStr.replace(/\*\*([\w\s]+)\*\*/g, (match, topic) => {
          return `In ${topic.toLowerCase()},`;
        });

        const paragraphs = contentStr.split('\n\n');

        readingContentRef.current.innerHTML = paragraphs
          .map(paragraph => {
            const sentences = paragraph.split('. ');
            const formattedSentences = sentences
              .map(sentence => `<span>${sentence}</span>`)
              .join('. ');

            return `<p>${formattedSentences}</p>`;
          })
          .join('');
      } catch (error) {
        console.error('Error formatting content:', error);
        if (typeof currentContent.content === 'string') {
          readingContentRef.current.innerHTML = `<p>${currentContent.content}</p>`;
        } else {
          readingContentRef.current.innerHTML = '<p>Unable to display content. Please try generating a new article.</p>';
        }
      }
    }
  }, [currentContent]);

  useEffect(() => {
    if (readingContentRef.current && currentHighlightedText && isReading) {
      const spans = readingContentRef.current.querySelectorAll('span');
      spans.forEach(span => {
        span.classList.remove('text-primary', 'bg-primary/10', 'font-medium');
      });

      Array.from(spans).forEach(span => {
        if (span.textContent?.trim() === currentHighlightedText.trim()) {
          span.classList.add('text-primary', 'bg-primary/10', 'font-medium');

          const rect = span.getBoundingClientRect();

          if (readingContentRef.current) {
            const contentRect = readingContentRef.current.getBoundingClientRect();

            if (rect.top < contentRect.top || rect.bottom > contentRect.bottom) {
              span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      });
    }
  }, [currentHighlightedText, isReading]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!currentContent) return null;

  return (
    <div className="space-y-6">
      {/* Topic Selection Section */}
      <Card className="mb-6" data-topic-selection>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Select Your Topic</h2>
          </div>

          {/* Voice Command Feedback Section */}
          {(transcribedVoiceCommandText || confirmationVoiceCommandMessage || isProcessingVoiceCommand) && (
            <div className="bg-secondary bg-opacity-30 rounded-lg p-3 flex items-center mb-4">
              <div className="flex items-center mr-3">
                {isPlayingVoiceResponse && (
                  <div className="rounded-full bg-accent p-2 animate-pulse">
                    <Volume2 className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                {isProcessingVoiceCommand ? (
                  <div>
                    <p className="text-sm text-textColor opacity-70 mb-1">Processing voice command:</p>
                    <p className="font-medium">Thinking...</p>
                  </div>
                ) : transcribedVoiceCommandText || confirmationVoiceCommandMessage ? (
                  <div className={isPlayingVoiceResponse ? 'border-l-4 border-accent pl-3' : ''}>
                    <p className="text-sm text-textColor opacity-70 mb-1">
                      {isPlayingVoiceResponse ? 'AI Response:' : confirmationVoiceCommandMessage ? 'Obla:' : 'You said:'}
                    </p>
                    <p className="font-medium">{confirmationVoiceCommandMessage || transcribedVoiceCommandText}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Choose a Topic Cards */}
          <div className="mb-6">
            <h3 className="text-md font-bold mb-3">Choose a Topic</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {readingTopics.map((topic) => (
                <Card
                  key={topic}
                  className="cursor-pointer hover:shadow-md hover:bg-[#0F3CC9] transition-all duration-200 h-16"
                  style={{ backgroundColor: '#1947e5' }}
                  onClick={() => handleTopicSelection(topic)}
                >
                  <CardContent className="p-3 text-center flex items-center justify-center h-full">
                    <p className="font-bold text-white text-sm">{topic}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Topic Section */}
          <div className="mb-6">
            <h3 className="text-md font-bold mb-3">Or enter a custom topic:</h3>
            <div className="flex gap-3 items-center max-w-md mx-auto">
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g., space exploration, cooking tips..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomTopicGeneration();
                  }
                }}
              />
              <Button
                onClick={handleCustomTopicGeneration}
                disabled={isGeneratingCustom || !customTopic.trim()}
                className="bg-[#1947e5] hover:bg-[#0F3CC9] text-white"
              >
                {isGeneratingCustom ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </div>

          {/* Voice Command Controls */}
          <div className="flex justify-center mb-4">
            <Button
              onClick={toggleVoiceCommandListening}
              disabled={isProcessingVoiceCommand}
              className={`flex items-center gap-2 ${
                isListeningVoiceCommand 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <MicIcon className="w-4 h-4" />
              {isListeningVoiceCommand ? 'Listening...' : isProcessingVoiceCommand ? 'Processing...' : 'Voice Command'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Practice Section */}
      <div id="practice-section" className="scroll-mt-4 mb-12">
        <h3 className="text-lg font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Practice Text</h3>
        
        <Card className="h-full">
          <CardContent className="p-6 space-y-4">
            {/* Reading Content Display */}
            <div 
              ref={readingContentRef}
              className="text-base font-semibold leading-relaxed p-4 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto text-white"
              style={{ lineHeight: '1.8', backgroundColor: '#1947e5' }}
            />

            {/* Responsive Controls Layout */}
            <div className="space-y-4 sm:space-y-0">
              {/* First Row: Recording Controls */}
              <div className="flex justify-center my-4">
                {phrase.status === "idle" && (
                  <Button
                    onClick={startPhrasePractice}
                    className="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 w-full sm:w-auto mt-[0px] mb-[0px] pt-[3px] pb-[3px] pl-[40px] pr-[40px]"
                  >
                    <MicIcon className="w-4 h-4" />
                    Start Recording
                  </Button>
                )}

                {phrase.status === "recording" && (
                  <Button
                    onClick={stopPhrasePractice}
                    variant="destructive"
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    <StopCircleIcon className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}

                {phrase.status === "assessing" && (
                  <div className="flex items-center justify-center gap-2 text-yellow-600 w-full sm:w-auto">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    Analyzing...
                  </div>
                )}
              </div>

              {/* Controls available during recording and before completion */}
              {phrase.status !== "complete" && (
                <div className="flex justify-center items-center gap-2 my-4">
                  <Button
                    onClick={handleTextToSpeech}
                    variant="outline"
                    className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                  >
                    <Ear className="h-4 w-4 mr-1" />
                    Hear
                  </Button>

                  <button
                    onClick={toggleSlowPlayback}
                    className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      slowPlayback ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={slowPlayback}
                    aria-label="Toggle slow playback"
                  >
                    <span
                      className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                        slowPlayback ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    >
                      <Snail className="w-3 h-3 text-gray-600" />
                    </span>
                  </button>
                </div>
              )}

              {/* Third Row: New Content Button */}
              <div className="flex justify-center my-4 mt-4">
                <Button
                  onClick={generateNewContent}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 bg-[#FFBD12] hover:bg-[#E6A800] text-white w-full sm:w-auto pl-[16px] pr-[16px] ml-[20px] mr-[20px] mt-[10px] mb-[10px]"
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  New Content
                </Button>
              </div>
            </div>

            {/* Post-Recording Button Layout - Matching Words page layout */}
            {phrase.status === "complete" && phrase.recordingBlob && (
              <div className="space-y-4">
                {/* First Row: Try Again and Listen to me buttons */}
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={startPhrasePractice}
                    className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 px-8 py-3 text-base"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Try Again
                  </Button>
                  <Button
                    onClick={handleRecordingPlayback}
                    className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 px-8 py-3 text-base"
                  >
                    <Volume2 className="h-5 w-5" />
                    Listen to me
                  </Button>
                </div>

                {/* Second Row: Hear button and slow switch */}
                <div className="flex justify-center items-center gap-4">
                  <Button
                    onClick={handleTextToSpeech}
                    className="h-12 px-6 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                  >
                    <Ear className="h-4 w-4 mr-2" />
                    Hear
                  </Button>

                  <button
                    onClick={toggleSlowPlayback}
                    className={`relative inline-flex h-12 w-20 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      slowPlayback ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={slowPlayback}
                    aria-label="Toggle slow playback"
                  >
                    <span
                      className={`inline-flex h-10 w-10 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                        slowPlayback ? 'translate-x-9' : 'translate-x-1'
                      }`}
                    >
                      <Snail className="w-4 h-4 text-gray-600" />
                    </span>
                  </button>
                </div>

                {/* Third Row: Save Reading button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleSaveReading}
                    className={`px-8 py-3 text-base ${
                      isSaved 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-[#FFBD12] hover:bg-[#E6A800] text-white"
                    }`}
                    disabled={isSaved}
                  >
                    <BookOpen className={`w-4 h-4 mr-2 ${isSaved ? "fill-white" : ""}`} />
                    {isSaved ? "Reading Saved" : "Save Reading"}
                  </Button>
                </div>
              </div>
            )}

            {/* Assessment Results */}
            {phrase.status === "complete" && phrase.assessmentResult && (
              <div className="space-y-4 mt-6">
                {/* Star Rating */}
                <div className="text-center">
                  <div className="flex justify-center items-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const scoreThreshold = star * 20;
                      const isFilled = phrase.assessmentResult!.pronunciationScore >= scoreThreshold;
                      return (
                        <div
                          key={star}
                          className={`w-6 h-6 mx-1 ${
                            isFilled 
                              ? 'text-yellow-400' 
                              : 'text-gray-300'
                          }`}
                        >
                          ★
                        </div>
                      );
                    })}
                  </div>
                  <div 
                    className="text-4xl font-bold text-center mb-4" 
                    style={{ 
                      color: phrase.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' : '#e76f51' 
                    }}
                  >
                    {Math.round(phrase.assessmentResult.pronunciationScore)}%
                  </div>
                  <p className="text-center text-gray-600 mb-4">
                    {phrase.assessmentResult.pronunciationScore >= 80
                      ? "Great job! Your pronunciation is very clear."
                      : "Good effort! Try again to improve your score."}
                  </p>
                </div>

                {/* Detailed Scores */}
                <div className="space-y-3 mb-5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Pronunciation</span>
                      <span className="text-gray-700">{Math.round(phrase.assessmentResult.pronunciationScore)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${Math.round(phrase.assessmentResult.pronunciationScore)}%`,
                          backgroundColor: phrase.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' :
                                           phrase.assessmentResult.pronunciationScore >= 60 ? '#e9c46a' : '#e76f51'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Accuracy</span>
                      <span className="text-gray-700">{Math.round(phrase.assessmentResult.accuracyScore || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${Math.round(phrase.assessmentResult.accuracyScore || 0)}%`,
                          backgroundColor: (phrase.assessmentResult.accuracyScore || 0) >= 80 ? '#2a9d8f' :
                                          (phrase.assessmentResult.accuracyScore || 0) >= 60 ? '#e9c46a' : '#e76f51'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Fluency</span>
                      <span className="text-gray-700">{Math.round(phrase.assessmentResult.fluencyScore)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${Math.round(phrase.assessmentResult.fluencyScore)}%`,
                          backgroundColor: phrase.assessmentResult.fluencyScore >= 80 ? '#2a9d8f' :
                                          phrase.assessmentResult.fluencyScore >= 60 ? '#e9c46a' : '#e76f51'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Completeness</span>
                      <span className="text-gray-700">{Math.round(phrase.assessmentResult.completenessScore)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${Math.round(phrase.assessmentResult.completenessScore)}%`,
                          backgroundColor: phrase.assessmentResult.completenessScore >= 80 ? '#2a9d8f' :
                                          phrase.assessmentResult.completenessScore >= 60 ? '#e9c46a' : '#e76f51'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsolidatedReadingPractice;