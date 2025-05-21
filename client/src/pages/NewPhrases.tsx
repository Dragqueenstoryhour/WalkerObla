import React, { useState, useRef, useEffect, useContext } from "react";
import { useParams } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { AuthButtons } from "@/components/AuthButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import useAudioRecording from "@/hooks/useAudioRecording";
import { PronunciationAssessmentResult } from "@/lib/types";
import {
  MicIcon,
  StopCircleIcon,
  VolumeIcon,
  RotateCw,
  Upload,
  CheckCircle,
  FileText,
  Image,
  AlertTriangle,
  BarChart2,
  Share2,
  Award,
  Users,
  Camera,
  Mic,
  Star,
  Volume2,
  Gauge,
} from "lucide-react";
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { Turtle } from "lucide-react";

interface ProcessedPhrase {
  id: string;
  text: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null; // Allow null here to handle audio URLs
  recordingBlob?: Blob;
  assessmentResult?: PronunciationAssessmentResult;
  status: "idle" | "recording" | "assessing" | "complete";
}

export default function NewPhrases() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const shareId = params.shareId; // Get the shared link ID from URL
  const { difficulty, setDifficulty } = useDifficulty();

  // We'll add this after our other state variables are defined
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<"words" | "phrases">("words");

  const [manualEntryText, setManualEntryText] = useState("");
  const [imageUploadText, setImageUploadText] = useState("");
  const [aiGenerateTopic, setAiGenerateTopic] = useState(
    "Commonly Used Words",
  );
  const [processedPhrases, setProcessedPhrases] = useState<ProcessedPhrase[]>(
    [],
  );
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [historyData, setHistoryData] = useState<
    { date: string; score: number }[]
  >([]);
  const [savedPhraseId, setSavedPhraseId] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState("");
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // State for phrase practice
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);

  // State for authentication and saving phrases
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Use our audio recording hook for the main recording functionality
  const {
    recordingDuration,
    audioUrl,
    startRecording: startMainRecording,
    stopRecording: stopMainRecording,
    audioBlob,
  } = useAudioRecording({
    onError: (error) => {
      console.error("Recording error:", error);
      toast({
        title: "Recording Error",
        description:
          "Could not access microphone. Please check your browser permissions.",
        variant: "destructive",
      });
    },
  });

  // Set up history data and load initial phrases for "Commonly Used Phrases"
  useEffect(() => {
    // Set up some sample history data for visualization
    setHistoryData([
      { date: "2025-04-28", score: 65 },
      { date: "2025-04-29", score: 68 },
      { date: "2025-04-30", score: 72 },
      { date: "2025-05-01", score: 75 },
      { date: "2025-05-02", score: 81 },
      { date: "2025-05-03", score: 79 },
      { date: "2025-05-04", score: 84 },
    ]);

    // ... (rest of the useEffect content remains unchanged)

    // Auto-load commonly used phrases when the page opens
    if (!shareId) {
      // Only if we're not loading shared phrases
      handleGenerateTopicPhrases("Commonly Used Words");
    }

    // Cleanup function to handle any lingering recording sessions
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Removed handleGenerateTopicPhrases from dependencies

  // Load shared phrases if the shareId is present in the URL
  useEffect(() => {
    const loadSharedPhrases = async () => {
      if (!shareId) return;

      setIsProcessing(true);

      try {
        // Use our new API endpoint
        const response = await fetch(`/api/share/${shareId}`);

        if (!response.ok) {
          throw new Error("Failed to load shared phrases");
        }

        const data = await response.json();
        if (!data.collection || !data.collection.phrases) {
          throw new Error("Invalid shared phrases data");
        }

        // Process the phrases from the database
        let phrasesData;
        try {
          // Attempt to parse if it's a string, or use directly if already an object
          phrasesData =
            typeof data.collection.phrases === "string"
              ? JSON.parse(data.collection.phrases)
              : data.collection.phrases;

          if (!Array.isArray(phrasesData)) {
            phrasesData = [phrasesData]; // Convert to array if it's a single object
          }
        } catch (parseError) {
          console.error("Error parsing phrases data:", parseError);
          throw new Error("Invalid shared phrases format");
        }

        // Format the phrases for use in the component
        const newPhrases: ProcessedPhrase[] = phrasesData.map(
          (phrase: any, index: number) => ({
            id: `shared-${Date.now()}-${index}`,
            text: phrase.text || "",
            phonetic: phrase.phonetic || undefined,
            difficulty: phrase.difficulty || undefined,
            status: "idle",
          }),
        );

        if (newPhrases.length > 0) {
          console.log("Loaded shared phrases:", newPhrases);
          setProcessedPhrases(newPhrases);
          setCurrentPhraseIndex(0); // Select first phrase
          setShowSharedDialog(true); // Show the shared phrases notification

          toast({
            title: "Shared Phrases Loaded",
            description: `Loaded ${newPhrases.length} shared phrases for practice.`,
          });
        } else {
          throw new Error("No phrases found in this shared collection");
        }
      } catch (error) {
        console.error("Error loading shared phrases:", error);
        toast({
          title: "Error Loading Shared Phrases",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load shared phrases",
          variant: "destructive",
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
        title: "No Text Provided",
        description: "Please enter phrases to process.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Split text by newlines and filter out empty lines
      const lines = manualEntryText
        .split("\n")
        .filter((line) => line.trim().length > 0);

      // Prepare for OpenAI processing
      const response = await fetch("/api/content/process-phrases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phrases: lines }),
      });

      if (!response.ok) {
        throw new Error("Failed to process phrases");
      }

      const processedData = await response.json();

      // Format the processed phrases
      const newPhrases: ProcessedPhrase[] = processedData.phrases.map(
        (phrase: any, index: number) => ({
          id: `phrase-${Date.now()}-${index}`,
          text: phrase.text,
          phonetic: phrase.phonetic,
          difficulty: phrase.difficulty,
          status: "idle",
        }),
      );

      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0); // Select first phrase

      toast({
        title: "Processing Complete",
        description: `${newPhrases.length} phrases are ready for practice.`,
      });
    } catch (error) {
      console.error("Error processing phrases:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload (images/PDFs)
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type - be more permissive with image formats
    // Accept any image type (including HEIC from iPhone and other formats)
    const isImage =
      file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");
    const isPdf = file.type === "application/pdf";

    // More detailed logging for debugging file types
    console.log(`Processing file: ${file.name}, type: ${file.type}`);

    if (!isImage && !isPdf) {
      toast({
        title: "Invalid File Type",
        description:
          "Please upload an image (JPG, PNG, HEIC, etc.) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsProcessing(true);

    try {
      // Send the file for OCR processing
      const response = await fetch("/api/content/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process file");
      }

      const result = await response.json();

      // Check if the response contains an error (like an AI refusal) rather than actual text
      const lowerCaseText = result.text?.toLowerCase() || "";
      const containsError =
        lowerCaseText.includes("i'm sorry") ||
        lowerCaseText.includes("i can't") ||
        lowerCaseText.includes("unable to");

      if (result.text && !containsError) {
        setImageUploadText(result.text);
        toast({
          title: "Text Extracted",
          description:
            "Text successfully extracted from file. You can now process it.",
        });
      } else if (containsError) {
        throw new Error(
          "The system could not process this image properly. Please try a different image.",
        );
      } else {
        throw new Error("No text found in the file");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to extract text from file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle a file directly (used by camera capture)
  const handleFileSelection = (file: File) => {
    // Check file type - be more permissive with image formats
    // Accept any image type (including HEIC from iPhone and other formats)
    const isImage =
      file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");
    const isPdf = file.type === "application/pdf";

    // More detailed logging for debugging file types
    console.log(`Processing selected file: ${file.name}, type: ${file.type}`);

    if (!isImage && !isPdf) {
      toast({
        title: "Invalid File Type",
        description:
          "Please upload an image (JPG, PNG, HEIC, etc.) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsProcessing(true);

    // Send the file for OCR processing
    fetch("/api/content/ocr", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to process file");
        }
        return response.json();
      })
      .then((result) => {
        // Check if the response contains an error (like an AI refusal) rather than actual text
        const lowerCaseText = result.text?.toLowerCase() || "";
        const containsError =
          lowerCaseText.includes("i'm sorry") ||
          lowerCaseText.includes("i can't") ||
          lowerCaseText.includes("unable to");

        if (result.text && !containsError) {
          setImageUploadText(result.text);
          toast({
            title: "Text Extracted",
            description:
              "Text successfully extracted from file. You can now process it.",
          });
        } else if (containsError) {
          throw new Error(
            "The system could not process this image properly. Please try a different image.",
          );
        } else {
          throw new Error("No text found in the file");
        }
      })
      .catch((error) => {
        console.error("Error processing file:", error);
        toast({
          title: "Processing Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to extract text from file. Please try again.",
          variant: "destructive",
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
        title: "No Text Available",
        description: "Please upload an image or PDF first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Split text by newlines and filter out empty lines
      const lines = imageUploadText
        .split("\n")
        .filter((line) => line.trim().length > 0);

      // Prepare for OpenAI processing
      const response = await fetch("/api/content/process-phrases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phrases: lines }),
      });

      if (!response.ok) {
        throw new Error("Failed to process phrases");
      }

      const processedData = await response.json();

      // Format the processed phrases
      const newPhrases: ProcessedPhrase[] = processedData.phrases.map(
        (phrase: any, index: number) => ({
          id: `phrase-${Date.now()}-${index}`,
          text: phrase.text,
          phonetic: phrase.phonetic,
          difficulty: phrase.difficulty,
          status: "idle",
        }),
      );

      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0); // Select first phrase

      toast({
        title: "Processing Complete",
        description: `${newPhrases.length} phrases are ready for practice.`,
      });
    } catch (error) {
      console.error("Error processing phrases:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording for an individual phrase practice
  const startPhrasePractice = async (phraseIndex: number) => {
    if (phraseIndex < 0 || phraseIndex >= processedPhrases.length) return;

    try {
      const phrase = processedPhrases[phraseIndex];
      setCurrentlyPracticing(phrase.id);
      setCurrentPhraseIndex(phraseIndex);
      setWordAssessmentResult(null);
      chunksRef.current = [];

      // Update the phrase status to recording
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "recording" } : p,
        ),
      );

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Handle recording complete
      mediaRecorder.onstop = async () => {
        // Clean up the stream properly
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          tracks.forEach((track) => track.stop());
          streamRef.current = null;
        }

        try {
          // Create audio blob
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

          // Process the phrase recording
          await processPhraseRecording(audioBlob, phraseIndex);
        } catch (error) {
          console.error("Error processing phrase recording:", error);
          toast({
            title: "Recording Error",
            description: "Could not process the recording. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
          setIsProcessingRecording(false);

          // Reset phrase status
          setProcessedPhrases((phrases) =>
            phrases.map((p, idx) =>
              idx === phraseIndex ? { ...p, status: "idle" } : p,
            ),
          );
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: `Say the phrase clearly`,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description:
          "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);

      // Reset phrase status
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "idle" } : p,
        ),
      );
    }
  };

  // Stop recording the phrase
  const stopPhrasePractice = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Make sure we clean up streams even if recorder fails
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Process phrase recording with Azure
  const processPhraseRecording = async (
    audioBlob: Blob,
    phraseIndex: number,
  ) => {
    setIsProcessingRecording(true);

    try {
      const phrase = processedPhrases[phraseIndex];

      // Update status to assessing
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "assessing" } : p,
        ),
      );

      toast({
        title: "Processing Recording",
        description: "Analyzing your pronunciation...",
      });

      // Create a URL for the recording
      const recordingUrl = URL.createObjectURL(audioBlob);

      // Send to Azure Speech for assessment
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", phrase.text);

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const result = await response.json();
      console.log("Received assessment results:", result);

      // Validate the result has expected properties
      if (typeof result.pronunciationScore !== "number") {
        throw new Error("Invalid assessment result format");
      }

      // Update with results - both in the word assessment state and in the phrases
      setWordAssessmentResult(result);

      // Also update in the phrases array
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex
            ? {
                ...p,
                status: "complete",
                assessmentResult: result,
                recordingBlob: audioBlob,
                recordingUrl,
              }
            : p,
        ),
      );

      // Add to history
      const today = new Date().toLocaleDateString();
      setHistoryData((prev) => [
        ...prev,
        {
          date: today,
          score: result.pronunciationScore,
        },
      ]);

      toast({
        title: "Analysis Complete",
        description: `Pronunciation: ${result.pronunciationScore.toFixed(1)}%`,
      });
    } catch (error) {
      console.error("Error assessing word pronunciation:", error);
      toast({
        title: "Assessment Error",
        description: "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });

      // Reset status to idle
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "idle" } : p,
        ),
      );
    } finally {
      setIsProcessingRecording(false);
    }
  };

  // Cancel phrase practice
  const cancelPhrasePractice = (phraseIndex: number) => {
    // Stop any ongoing recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Clean up resources
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Reset phrase status
    setProcessedPhrases((phrases) =>
      phrases.map((p, idx) =>
        idx === phraseIndex ? { ...p, status: "idle" } : p,
      ),
    );

    // Reset state
    setCurrentlyPracticing(null);
    setIsRecording(false);
    setIsProcessingRecording(false);
    setWordAssessmentResult(null);
  };

  // Generate similar phrases using LLM
  const handleGenerateSimilar = async () => {
    if (currentPhraseIndex < 0 || currentPhraseIndex >= processedPhrases.length)
      return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/content/generate-similar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phrase: processedPhrases[currentPhraseIndex].text,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate similar phrases");
      }

      const result = await response.json();

      // Add the new phrases to our collection
      const newPhrases: ProcessedPhrase[] = result.phrases.map(
        (text: string, index: number) => ({
          id: `phrase-${Date.now()}-similar-${index}`,
          text,
          difficulty: processedPhrases[currentPhraseIndex].difficulty,
          status: "idle",
        }),
      );

      setProcessedPhrases((phrases) => [...phrases, ...newPhrases]);

      toast({
        title: "Phrases Generated",
        description: `${newPhrases.length} similar phrases have been added.`,
      });
    } catch (error) {
      console.error("Error generating similar phrases:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate similar phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate a shareable link for the current set
  const handleGenerateShareableLink = async () => {
    if (processedPhrases.length === 0) {
      toast({
        title: "No Phrases to Share",
        description:
          "Please process some phrases first before generating a shareable link.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Show a toast to indicate we're generating a link
    toast({
      title: "Generating Link",
      description: "Creating a shareable link for your phrases...",
    });

    // Format the phrases for sharing (ensure they have text content)
    const phrasesToShare = processedPhrases
      .filter((phrase) => phrase.text && phrase.text.trim()) // Filter out empty phrases
      .map((phrase) => ({
        text: phrase.text,
        phonetic: phrase.phonetic || null,
        difficulty: phrase.difficulty || "medium",
      }));

    if (phrasesToShare.length === 0) {
      setIsProcessing(false);
      toast({
        title: "No Valid Phrases",
        description:
          "There are no valid phrases to share. Please ensure your phrases have text content.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Sending phrases to share:", phrasesToShare);

      // Create the shareable link using the API endpoint
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phrases: phrasesToShare }),
      });

      const responseText = await response.text();
      console.log("Share API response:", response.status, responseText);

      if (!response.ok) {
        throw new Error(
          `Failed to generate shareable link: ${response.status} ${response.statusText}`,
        );
      }

      // Parse the JSON response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed share data:", data);
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        console.error("Raw response text:", responseText);
        throw new Error("Invalid response from server");
      }

      if (!data.shareableUrl) {
        console.error("Missing shareableUrl in response:", data);
        throw new Error("Server response did not include a shareableUrl");
      }

      // Create the full shareable link with origin
      const fullShareableLink = `${window.location.origin}${data.shareableUrl}`;
      console.log("Generated shareable link:", fullShareableLink);
      setShareableLink(fullShareableLink);

      // Verify that the link works by testing the API endpoint
      try {
        // Extract shareId from the shareableUrl or use it directly from the response
        const shareId = data.shareId || data.shareableUrl.split("shareId=")[1];
        if (shareId) {
          const verifyResponse = await fetch(`/api/share/${shareId}`);
          console.log("Verification response:", verifyResponse.status);

          if (!verifyResponse.ok) {
            console.warn(
              "Shared link may not be accessible:",
              verifyResponse.status,
            );
          }
        } else {
          console.warn("Could not extract shareId for verification");
        }
      } catch (verifyError) {
        console.warn("Could not verify link accessibility:", verifyError);
      }

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(fullShareableLink);
        toast({
          title: "Link Copied!",
          description: "Shareable link has been copied to your clipboard.",
        });
      } catch (clipboardError) {
        console.error("Failed to copy:", clipboardError);
        toast({
          title: "Link Generated",
          description:
            "Shareable link created successfully, but could not copy to clipboard automatically.",
        });
      }
    } catch (error) {
      console.error("Error generating shareable link:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate shareable link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Monitor authentication changes to handle saving after login
  useEffect(() => {
    if (isAuthenticated && pendingSaveIndex !== null) {
      const index = pendingSaveIndex;

      // Clear pending save
      setPendingSaveIndex(null);
      setShowSignInDialog(false);

      // Add a slight delay to ensure authentication is fully processed
      setTimeout(() => {
        if (index >= 0 && index < processedPhrases.length) {
          // Show a welcome back toast
          toast({
            title: "Welcome Back!",
            description: "Now saving your phrase...",
          });

          // Call save phrase directly 
          handleSavePhrase(index);
        }
      }, 500);
    }
  }, [isAuthenticated, pendingSaveIndex, processedPhrases]);

  // Save the current phrase to user's saved phrases
  const handleSavePhrase = async (phraseIndex: number = currentPhraseIndex) => {
    // Store the index in case we need to save after authentication
    setPendingSaveIndex(phraseIndex);

    // Check if the user is authenticated via the API
    try {
      const userResponse = await fetch("/api/auth/user");
      if (!userResponse.ok) {
        // Show the sign-in dialog instead of just a toast
        setShowSignInDialog(true);
        return;
      }

      if (
        phraseIndex < 0 ||
        phraseIndex >= processedPhrases.length
      ) {
        toast({
          title: "No Phrase Selected",
          description: "Please select a phrase to save.",
          variant: "destructive",
        });
        return;
      }

      const phraseToSave = processedPhrases[currentPhraseIndex];

      // Show a loading toast
      const loadingToast = toast({
        title: "Saving Phrase",
        description: "Adding this phrase to your collection...",
      });

      // Use the API to save the phrase (the server will use the user's session for userId)
      const response = await fetch("/api/phrases/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phrase: phraseToSave.text,
          phonetic: phraseToSave.phonetic || null,
          difficulty: phraseToSave.difficulty || null,
          assessmentResults: phraseToSave.assessmentResult
            ? JSON.stringify(phraseToSave.assessmentResult)
            : null,
          source: "new_phrases",
          sourceId: shareId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save phrase");
      }

      // Get the response data to show the saved phrase ID
      const data = await response.json();

      // Set the saved phrase ID to trigger the animation
      setSavedPhraseId(phraseToSave.id);

      // Create a "Saved!" animation with setTimeout to clear the state after 2 seconds
      setTimeout(() => {
        setSavedPhraseId(null);
      }, 2000);

      // Dismiss the loading toast
      loadingToast.dismiss?.();

      toast({
        title: "Phrase Saved",
        description: "This phrase has been saved to your collection.",
      });

      // Removed confetti effect as per user request
      /* Confetti animation removed */
    } catch (error) {
      console.error("Error saving phrase:", error);
      toast({
        title: "Error Saving Phrase",
        description:
          error instanceof Error ? error.message : "Failed to save phrase",
        variant: "destructive",
      });
    }
  };

  // Play the recording for a phrase (user's voice recording)
  const handlePlayRecording = (phraseIndex: number) => {
    const phrase = processedPhrases[phraseIndex];
    if (phrase?.recordingUrl && audioRef.current) {
      console.log("Playing recording with URL:", phrase.recordingUrl);
      audioRef.current.src = phrase.recordingUrl;
      audioRef.current.oncanplaythrough = () => {
        audioRef.current?.play().catch((error) => {
          console.error("Error playing audio:", error);
          toast({
            title: "Playback Error",
            description: "Could not play the recording. Please try again.",
            variant: "destructive",
          });
        });
      };
      audioRef.current.onerror = (e) => {
        console.error("Audio error:", e);
        toast({
          title: "Playback Error",
          description: "Could not play the recording. Please try again.",
          variant: "destructive",
        });
      };
    } else {
      console.warn("No recording URL available for phrase", phraseIndex);
      toast({
        title: "No Recording",
        description: "No recording available for this phrase.",
        variant: "destructive",
      });
    }
  };

  // State to track which phrases are being played with slow speed
  const [slowPlaybackPhrases, setSlowPlaybackPhrases] = useState<
    Record<string, boolean>
  >({});

  // Play TTS for a phrase (computer speech)
  const handleTextToSpeech = async (phraseIndex: number) => {
    const phrase = processedPhrases[phraseIndex];
    if (!phrase?.text) {
      toast({
        title: "No Text",
        description: "No text available for this phrase.",
        variant: "destructive",
      });
      return;
    }

    const loadingToast = toast({
      title: "Loading Audio",
      description: "Preparing text-to-speech...",
    });

    const isSlowPlayback = slowPlaybackPhrases[phrase.id] || false;

    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: phrase.text }),
      });

      if (!response.ok) {
        throw new Error(`Failed to synthesize speech: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error("Received empty audio data");
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.onerror = () => {
        toast({
          title: "Playback Error",
          description: "Could not play the audio. Please try again.",
          variant: "destructive",
        });
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.oncanplaythrough = () => {
        loadingToast.dismiss?.();
        const audio = audioRef.current;
        if (audio) {
          audio.playbackRate = isSlowPlayback ? 0.5 : 1.0;
        }
        audioRef.current?.play().then(() => {
          toast({
            title: isSlowPlayback ? "Playing Slowly" : "Playing",
            description: `Playing: "${phrase.text.substring(0, 20)}${phrase.text.length > 20 ? "..." : ""}"`,
          });
        }).catch((error) => {
          toast({
            title: "Playback Error",
            description: "Could not play the audio. Please try again.",
            variant: "destructive",
          });
          URL.revokeObjectURL(audioUrl);
        });
      };

      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      loadingToast.dismiss?.();
      toast({
        title: "TTS Error",
        description: error instanceof Error ? error.message : "Could not generate audio.",
        variant: "destructive",
      });
    }
  };

  // Calculate overall progress
  const calculateProgress = () => {
    if (processedPhrases.length === 0) return 0;
    const completedCount = processedPhrases.filter(
      (p) => p.status === "complete",
    ).length;
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
    if (
      currentPhraseIndex >= 0 &&
      processedPhrases[currentPhraseIndex]?.assessmentResult &&
      Math.round(
        processedPhrases[currentPhraseIndex].assessmentResult!
          .pronunciationScore,
      ) >= 95
    ) {
      // Dynamically import canvas-confetti only when needed
      const celebrateHighScore = async () => {
        try {
          const confetti = (await import("canvas-confetti")).default;
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (error) {
          console.error("Error loading confetti:", error);
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
        <div className="border-2 border-[#57cc99] rounded-lg bg-[#f5f7fa] p-6 relative overflow-hidden shadow-md">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#57cc99]"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#c2f8d7] rounded-tl-xl"></div>

          <div className="w-full max-w-md mx-auto bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-center text-[#264653] mb-4">
              Your Performance
            </h2>
            <div
              className="text-6xl font-bold text-center mb-2"
              style={{
                color: result.pronunciationScore >= 80 ? "#2a9d8f" : "#e76f51",
              }}
            >
              {score}%
            </div>
            <p className="text-center text-gray-600 mb-4">
              {result.pronunciationScore >= 80
                ? "Great job! Your pronunciation is very clear."
                : "Good effort! Try again to improve your score."}
            </p>

            {/* Detailed scores breakdown */}
            <div className="space-y-3 mb-5">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Pronunciation</span>
                  <span>{Math.round(result.pronunciationScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(result.pronunciationScore)}%`,
                      backgroundColor:
                        result.pronunciationScore >= 80
                          ? "#2a9d8f"
                          : result.pronunciationScore >= 60
                            ? "#e9c46a"
                            : "#e76f51"
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Fluency</span>
                  <span>{Math.round(result.fluencyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(result.fluencyScore)}%`,
                      backgroundColor:
                        result.fluencyScore >= 80
                          ? "#2a9d8f"
                          : result.fluencyScore >= 60
                            ? "#e9c46a"
                            : "#e76f51",
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Completeness</span>
                  <span>{Math.round(result.completenessScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(result.completenessScore)}%`,
                      backgroundColor:
                        result.completenessScore >= 80
                          ? "#2a9d8f"
                          : result.completenessScore >= 60
                            ? "#e9c46a"
                            : "#e76f51",
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Accuracy</span>
                  <span>{Math.round(result.accuracyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(result.accuracyScore)}%`,
                      backgroundColor:
                        result.accuracyScore >= 80
                          ? "#2a9d8f"
                          : result.accuracyScore >= 60
                            ? "#e9c46a"
                            : "#e76f51",
                    }}
                  ></div>
                </div>
              </div>

              {result.prosodyScore && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Prosody</span>
                    <span>{Math.round(result.prosodyScore)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full"
                      style={{
                        width: `${Math.round(result.prosodyScore)}%`,
                        backgroundColor:
                          result.prosodyScore >= 80
                            ? "#2a9d8f"
                            : result.prosodyScore >= 60
                              ? "#e9c46a"
                              : "#e76f51",
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Word-by-word analysis */}
            {result.wordLevelResults && result.wordLevelResults.length > 0 && (
              <div className="mt-5 pt-5 border-t">
                <h3 className="text-sm font-semibold mb-3">
                  Word-by-word analysis:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.wordLevelResults.map((word, idx) => {
                    // Calculate color based on score
                    const score = word.accuracyScore;
                    const bgColor =
                      score > 85
                        ? "bg-green-100"
                        : score > 70
                          ? "bg-yellow-100"
                          : "bg-red-100";
                    const textColor =
                      score > 85
                        ? "text-green-800"
                        : score > 70
                          ? "text-yellow-800"
                          : "text-red-800";

                    return (
                      <div
                        key={`word-${idx}`}
                        className={`px-2 py-1 rounded text-sm ${bgColor} ${textColor}`}
                      >
                        {word.word} ({Math.round(score)}%)
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Playback recording section */}
          {phrase.recordingUrl && (
            <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mb-4 mt-4 flex items-center justify-between">
              <div className="text-sm font-medium text-[#264653]">
                Listen to your recording:
              </div>
              <button
                className="bg-[#57cc99] text-white rounded-full p-2 flex items-center justify-center shadow-md hover:bg-[#38b37a] transition-colors"
                onClick={() => {
                  const audio = new Audio(phrase.recordingUrl as string);
                  audio.play();
                }}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
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
              <CardTitle className="text-lg text-slate-800">
                Progress Over Time
              </CardTitle>
              <CardDescription>
                Your pronunciation improvement journey
              </CardDescription>
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
                <div
                  key={mark}
                  className="w-full border-t border-slate-200 flex items-center h-0"
                >
                  <span className="text-xs text-slate-400 absolute -left-6">
                    {mark}%
                  </span>
                </div>
              ))}
            </div>

            {lastTenScores.map((item, idx) => {
              // Scale height based on the score (0-100% range)
              const heightPercent = item.score;

              // Color based on score as requested:
              // 85+ in green, 70-84 in orange, 69 and below in red
              const barColor =
                item.score >= 85
                  ? "bg-green-500"
                  : item.score >= 70
                    ? "bg-amber-500"
                    : "bg-red-500";

              // Generate gradient overlay for 3D effect
              const gradientClass =
                item.score >= 85
                  ? "from-green-400 to-green-600"
                  : item.score >= 70
                    ? "from-amber-400 to-amber-600"
                    : "from-red-400 to-red-600";

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 relative"
                >
                  <div className="relative w-full h-full flex items-end">
                    <div
                      className={`w-full ${barColor} rounded-t-md shadow-lg bg-gradient-to-b ${gradientClass}`}
                      style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                      title={`Score: ${item.score}%`}
                    >
                      {/* Highlight at top of bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-md"></div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium text-slate-700">
                      {item.score}
                    </p>
                    {/* Only show the day part of the date, not the original indices */}
                    <p className="text-[10px] text-slate-500">
                      {new Date(item.date).getDate()}
                    </p>
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
      {
        name: "7-Day Streak",
        icon: <Award className="h-4 w-4 mr-1" />,
        earned: true,
      },
      {
        name: "Shared 5+ Exercises",
        icon: <Share2 className="h-4 w-4 mr-1" />,
        earned: false,
      },
      {
        name: "Perfect Pronunciation",
        icon: <CheckCircle className="h-4 w-4 mr-1" />,
        earned: false,
      },
    ];

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Your Badges</CardTitle>
          <CardDescription>
            Achievements earned through practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                className={`flex items-center rounded-full px-3 py-1 text-sm ${badge.earned ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
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
    setProcessedPhrases((phrases) => [
      ...phrases,
      {
        id: `phrase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: "",
        status: "idle",
      },
    ]);
  };

  // Handle text change for an editable phrase
  const handlePhraseTextChange = (index: number, text: string) => {
    setProcessedPhrases((phrases) =>
      phrases.map((phrase, idx) =>
        idx === index ? { ...phrase, text } : phrase,
      ),
    );
  };

  // Generate phrases on a specific topic
  const handleGenerateTopicPhrases = async (
    topic: string,
    customDifficulty?: string,
    type?: "words" | "phrases",
  ) => {
    if (!topic.trim()) {
      toast({
        title: "No Topic Provided",
        description: `Please enter a topic to generate ${type || generationType}.`,
        variant: "destructive",
      });
      return;
    }

    // Use the current difficulty from context if not provided
    const difficultyToUse = customDifficulty || difficulty;
    // Use the specified type or fall back to the current state
    const typeToUse = type || generationType;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/content/generate-topic-phrases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          topic, 
          difficulty: difficultyToUse,
          type: typeToUse
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ${typeToUse}`);
      }

      const result = await response.json();

      // Process results based on the current mode (words or phrases)
      let processedItems = result.phrases;
      
      // If we're in words mode, ensure we only have single words and remove duplicates
      if (typeToUse === "words") {
        // First, clean up the results to ensure we have only single words
        processedItems = result.phrases.map((item: string) => {
          // Extract just the first word if we got a phrase instead of a single word
          const words = item.trim().split(/\s+/);
          return words[0] || item;
        });
        
        // Filter out any articles, prepositions or very short words that might have slipped through
        const articlesAndPrepositions = ['a', 'an', 'the', 'in', 'on', 'at', 'by', 'for', 'with', 'to', 'from'];
        processedItems = processedItems.filter(word => 
          !articlesAndPrepositions.includes(word.toLowerCase()) && 
          word.length > 1 // Ensure we don't get single letter words
        );
        
        // Remove any duplicate words
        const uniqueWords: string[] = [];
        processedItems = processedItems.filter(word => {
          const wordLower = word.toLowerCase();
          if (!uniqueWords.includes(wordLower)) {
            uniqueWords.push(wordLower);
            return true;
          }
          return false;
        });
      }

      // Add the new phrases/words to our collection
      const newPhrases: ProcessedPhrase[] = processedItems.map(
        (text: string, index: number) => ({
          id: `phrase-${Date.now()}-topic-${index}`,
          text,
          status: "idle",
        }),
      );

      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0); // Select first phrase

      toast({
        title: typeToUse === "words" ? "Words Generated" : "Phrases Generated",
        description: `${newPhrases.length} ${typeToUse} related to "${topic}" have been generated.`,
      });
    } catch (error) {
      console.error("Error generating topic phrases:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle difficulty change from DifficultyDropdown
  const handleDifficultyChange = async (newDifficulty: string) => {
    if (!aiGenerateTopic.trim()) {
      toast({
        title: "No Topic Selected",
        description: "Please enter a topic before changing difficulty.",
        variant: "destructive",
      });
      return;
    }
    await handleGenerateTopicPhrases(aiGenerateTopic, newDifficulty);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Shared phrases notification dialog */}
      <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              You've been sent these phrases for practice
            </DialogTitle>
            <DialogDescription>
              Someone has shared a set of phrases with you to practice your
              pronunciation. These phrases have been loaded and are ready for
              you to start practicing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSharedDialog(false)}>
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">New Phrases</h1>
        <DifficultyDropdown onConfirm={handleDifficultyChange} />
      </div>

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
                Enter one phrase per line. These will be processed for
                pronunciation practice.
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
                  "Process with AI"
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
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, HEIC, GIF, or PDF up to 10MB
                    </p>
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
                      if (
                        navigator.mediaDevices &&
                        navigator.mediaDevices.getUserMedia
                      ) {
                        // Create a video element to show the camera feed
                        const videoElement = document.createElement("video");
                        const canvasElement = document.createElement("canvas");

                        // Create and show a modal with the camera feed
                        const modal = document.createElement("div");
                        modal.style.position = "fixed";
                        modal.style.top = "0";
                        modal.style.left = "0";
                        modal.style.width = "100%";
                        modal.style.height = "100%";
                        modal.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
                        modal.style.display = "flex";
                        modal.style.flexDirection = "column";
                        modal.style.alignItems = "center";
                        modal.style.justifyContent = "flex-end"; // Position buttons at bottom
                        modal.style.padding = "20px";
                        modal.style.zIndex = "9999";

                        // Add the video element to the modal - make smaller on mobile
                        videoElement.style.maxWidth = "90%";
                        videoElement.style.maxHeight = "50vh"; // Reduced height to leave room for buttons
                        videoElement.style.borderRadius = "8px";
                        videoElement.autoplay = true;
                        modal.appendChild(videoElement);

                        // Create control container
                        const controlContainer = document.createElement("div");
                        controlContainer.style.display = "flex";
                        controlContainer.style.flexDirection = "row";
                        controlContainer.style.justifyContent = "space-between";
                        controlContainer.style.width = "90%";
                        controlContainer.style.marginBottom = "40px";
                        controlContainer.style.position = "fixed";
                        controlContainer.style.bottom = "20px";
                        controlContainer.style.zIndex = "10000";

                        //                        // Add capture button
                        const captureButton = document.createElement("button");
                        captureButton.textContent = "Take Photo";
                        captureButton.style.margin = "0 5px";
                        captureButton.style.padding = "15px 20px";
                        captureButton.style.borderRadius = "8px";
                        captureButton.style.backgroundColor =
                          "hsl(var(--primary))";
                        captureButton.style.color = "white";
                        captureButton.style.border = "none";
                        captureButton.style.cursor = "pointer";
                        captureButton.style.fontSize = "16px";
                        captureButton.style.fontWeight = "bold";
                        captureButton.style.flex = "1";
                        controlContainer.appendChild(captureButton);

                        // Add close button
                        const closeButton = document.createElement("button");
                        closeButton.textContent = "Cancel";
                        closeButton.style.margin = "0 5px";
                        closeButton.style.padding = "15px 20px";
                        closeButton.style.borderRadius = "8px";
                        closeButton.style.backgroundColor =
                          "rgba(255, 255, 255, 0.2)";
                        closeButton.style.border = "1px solid white";
                        closeButton.style.color = "white";
                        closeButton.style.cursor = "pointer";
                        closeButton.style.fontSize = "16px";
                        closeButton.style.flex = "1";
                        controlContainer.appendChild(closeButton);

                        modal.appendChild(controlContainer);

                        document.body.appendChild(modal);

                        let stream: MediaStream | null = null;

                        // Start the camera
                        navigator.mediaDevices
                          .getUserMedia({
                            video: { facingMode: "environment" },
                          })
                          .then((mediaStream) => {
                            stream = mediaStream;
                            videoElement.srcObject = mediaStream;
                          })
                          .catch((error) => {
                            console.error("Camera access error:", error);
                            document.body.removeChild(modal);
                            toast({
                              title: "Camera Error",
                              description:
                                "Could not access your camera. Please check permissions.",
                              variant: "destructive",
                            });
                          });

                        // Capture button event
                        captureButton.onclick = () => {
                          // Draw the current video frame to canvas
                          canvasElement.width = videoElement.videoWidth;
                          canvasElement.height = videoElement.videoHeight;
                          canvasElement
                            .getContext("2d")
                            ?.drawImage(
                              videoElement,
                              0,
                              0,
                              canvasElement.width,
                              canvasElement.height,
                            );

                          // Convert to blob
                          canvasElement.toBlob(
                            (blob) => {
                              if (blob) {
                                // Clean up
                                if (stream) {
                                  stream
                                    .getTracks()
                                    .forEach((track) => track.stop());
                                }
                                document.body.removeChild(modal);

                                // Create a File object from the blob
                                const file = new File(
                                  [blob],
                                  `camera-capture-${Date.now()}.jpg`,
                                  { type: "image/jpeg" },
                                );

                                // Process the file like a normal upload
                                handleFileSelection(file);
                              }
                            },
                            "image/jpeg",
                            0.95,
                          );
                        };

                        // Close button event
                        closeButton.onclick = () => {
                          if (stream) {
                            stream.getTracks().forEach((track) => track.stop());
                          }
                          document.body.removeChild(modal);
                        };
                      } else {
                        toast({
                          title: "Camera Not Available",
                          description:
                            "Your device or browser does not support camera access.",
                          variant: "destructive",
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
                      <p className="text-sm text-muted-foreground">
                        Transcribing image content...
                      </p>
                    </div>
                  ) : imageUploadText ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <p className="text-sm font-medium">
                          Transcription complete
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Here is the extracted text:
                      </p>
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
                      <p className="text-muted-foreground">
                        No image uploaded yet
                      </p>
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
                    "Generate Exercise"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-generate" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start space-y-0">
              <div>
                <CardTitle>Generate on Topic</CardTitle>
                <CardDescription>
                  Let AI generate topic-specific {generationType} for practice
                </CardDescription>
              </div>
              {/* Removed redundant DifficultyDropdown */}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-start gap-2 mb-4">
                  <div className="bg-card rounded-lg p-1 flex shadow-sm border">
                    <Button
                      variant={generationType === "words" ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-md"
                      onClick={() => {
                        setGenerationType("words");
                        // Regenerate with new type if we already have content
                        if (processedPhrases.length > 0) {
                          handleGenerateTopicPhrases(aiGenerateTopic, undefined, "words");
                        }
                      }}
                    >
                      Words
                    </Button>
                    <Button
                      variant={generationType === "phrases" ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-md"
                      onClick={() => {
                        setGenerationType("phrases");
                        // Regenerate with new type if we already have content
                        if (processedPhrases.length > 0) {
                          handleGenerateTopicPhrases(aiGenerateTopic, undefined, "phrases");
                        }
                      }}
                    >
                      Phrases
                    </Button>
                  </div>
                </div>

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
                      onClick={() =>
                        handleGenerateTopicPhrases(aiGenerateTopic)
                      }
                      disabled={isProcessing || !aiGenerateTopic.trim()}
                    >
                      {isProcessing ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Generate"
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Example topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Groceries",
                      "Household Items",
                      "Clothing",
                      "Body Parts",
                      "Doctor Visits",
                      "Emergencies",
                      "Restaurants",
                      "Cooking",
                      "Beverages",
                      "Public Transport",
                      "Directions",
                      "Air Travel",
                      "Office Supplies",
                      "Email Phrases",
                      "Job Interviews",
                      "Smartphone Terms",
                      "Social Media",
                      "Troubleshooting",
                      "Retail Shopping",
                      "Online Shopping",
                      "Weather",
                      "Greetings",
                      "Small Talk",
                      "Banking Terms",
                      "Money Phrases",
                      "School Supplies",
                      "Classroom Phrases",
                      "Sports",
                      "Music",
                      "Gardening",
                      "Pets",
                      "Exercise",
                      "Holidays",
                      "Time & Dates",
                      "Colors",
                      "Emotions",
                      "Family Members",
                      "Home Repairs",
                      "Cleaning Supplies",
                      "Cars & Driving",
                      "Hotels",
                      "Nature",
                      "Fruits",
                      "Vegetables",
                      "Jobs & Careers",
                      "Technology",
                      "Books & Reading",
                      "Art",
                      "Travel Destinations",
                      "Hobbies",
                    ].map((topic) => (
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
                  className={`transition-all ${currentPhraseIndex === idx ? "ring-2 ring-primary" : ""}`}
                >
                  <CardContent className="p-4">
                    {/* Normal view when not recording or assessing */}
                    {phrase.status === "idle" && (
                      <div className="flex flex-col">
                        <div className="flex justify-between items-start">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setCurrentPhraseIndex(idx)}
                          >
                            {phrase.text ? (
                              <p className="font-medium">{phrase.text}</p>
                            ) : (
                              <Input
                                placeholder="Enter phrase here..."
                                onChange={(e) =>
                                  handlePhraseTextChange(idx, e.target.value)
                                }
                                autoFocus
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {renderDifficultyBadge(phrase.difficulty)}
                            <div className="flex gap-1">
                              <div className="flex rounded-md overflow-hidden border border-green-500 shadow-sm hover:shadow transition-all">
                                <Button
                                  variant="ghost"
                                  className={`px-3 py-1 flex items-center gap-1 hover:bg-green-50 transition-all duration-200 ${!slowPlaybackPhrases[phrase.id] ? "bg-green-100 text-green-700 font-medium scale-105" : "text-green-600"}`}
                                  onClick={() => {
                                    setSlowPlaybackPhrases((prev) => ({
                                      ...prev,
                                      [phrase.id]: false,
                                    }));
                                    handleTextToSpeech(idx);
                                  }}
                                  title="Play at normal speed"
                                >
                                  <VolumeIcon className="h-4 w-4 mr-1" />
                                  Normal
                                </Button>
                                <Separator
                                  orientation="vertical"
                                  className="bg-green-500"
                                />
                                <Button
                                  variant="ghost"
                                  className={`px-3 py-1 flex items-center gap-1 hover:bg-green-50 transition-all duration-200 ${slowPlaybackPhrases[phrase.id] ? "bg-green-100 text-green-700 font-medium scale-105" : "text-green-600"}`}
                                  onClick={() => {
                                    setSlowPlaybackPhrases((prev) => ({
                                      ...prev,
                                      [phrase.id]: true,
                                    }));
                                    handleTextToSpeech(idx);
                                  }}
                                  title="Play at half speed"
                                >
                                  <Turtle className="h-4 w-4 mr-1" />
                                  Slow
                                </Button>
                              </div>

                              <Button
                                variant="outline"
                                className={`${
                                  savedPhraseId === phrase.id
                                    ? "border-amber-500 bg-amber-50 text-amber-600"
                                    : "border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                } flex items-center gap-1 transition-all duration-300`}
                                onClick={() => {
                                  setCurrentPhraseIndex(idx);
                                  handleSavePhrase();
                                }}
                                title="Save to My Words"
                                disabled={savedPhraseId === phrase.id}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    savedPhraseId === phrase.id
                                      ? "fill-amber-500 animate-bounce"
                                      : ""
                                  }`}
                                />
                                {savedPhraseId === phrase.id && (
                                  <span className="text-xs">Saved!</span>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Add Practice button */}
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="outline"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
                            onClick={() => startPhrasePractice(idx)}
                          >
                            <Mic className="h-4 w-4" />
                            <span>Practice</span>
                          </Button>
                        </div>

                        {/* Score display (if previously completed) */}
                        {phrase.assessmentResult && (
                          <div className="mt-2">
                            <Progress
                              value={phrase.assessmentResult.pronunciationScore}
                              className="h-2"
                            />
                            <div className="flex justify-between mt-1">
                              <span className="text-xs">Score</span>
                              <span className="text-xs font-medium">
                                {Math.round(
                                  phrase.assessmentResult.pronunciationScore,
                                )}
                                %
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recording view */}
                    {phrase.status === "recording" && (
                      <div className="flex flex-col items-center py-3">
                        <p className="font-medium text-center mb-3">
                          {phrase.text}
                        </p>
                        <div className="relative w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 pulse-animation">
                          <Mic className="h-12 w-12 text-primary animate-pulse" />
                        </div>
                        <p className="text-center text-sm mb-3">Recording</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => cancelPhrasePractice(idx)}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="bg-primary text-primary-foreground"
                            onClick={() => stopPhrasePractice()}
                          >
                            Stop
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Assessing view */}
                    {phrase.status === "assessing" && (
                      <div className="flex flex-col items-center py-6">
                        <RotateCw className="h-12 w-12 animate-spin text-primary mb-3" />
                        <p className="text-center">
                          Analyzing pronunciation...
                        </p>
                      </div>
                    )}

                    {/* Complete view with detailed assessment - shown only when actively practicing and viewing results */}
                    {phrase.status === "complete" &&
                      phrase.assessmentResult &&
                      currentlyPracticing === phrase.id && (
                        <div className="mt-2 space-y-4">
                          <p className="font-medium text-center">{phrase.text}</p>

                          <div className="border-2 border-[#57cc99] rounded-lg bg-[#f5f7fa] p-4 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-full h-2 bg-[#57cc99]"></div>

                            <h3 className="text-xl font-bold text-center text-[#264653] mb-2">
                              Your Performance
                            </h3>
                            <div
                              className="text-5xl font-bold text-center mb-2"
                              style={{
                                color:
                                  phrase.assessmentResult.pronunciationScore >= 80
                                    ? "#2a9d8f"
                                    : "#e76f51",
                              }}
                            >
                              {Math.round(phrase.assessmentResult.pronunciationScore)}%
                            </div>

                            <div className="space-y-2 mb-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">Pronunciation</span>
                                  <span>{Math.round(phrase.assessmentResult.pronunciationScore)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.pronunciationScore)}%`,
                                      backgroundColor:
                                        phrase.assessmentResult.pronunciationScore >= 80
                                          ? "#2a9d8f"
                                          : phrase.assessmentResult.pronunciationScore >= 60
                                            ? "#e9c46a"
                                            : "#e76f51",
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">Fluency</span>
                                  <span>{Math.round(phrase.assessmentResult.fluencyScore)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.fluencyScore)}%`,
                                      backgroundColor:
                                        phrase.assessmentResult.fluencyScore >= 80
                                          ? "#2a9d8f"
                                          : phrase.assessmentResult.fluencyScore >= 60
                                            ? "#e9c46a"
                                            : "#e76f51",
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">Completeness</span>
                                  <span>{Math.round(phrase.assessmentResult.completenessScore)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.completenessScore)}%`,
                                      backgroundColor:
                                        phrase.assessmentResult.completenessScore >= 80
                                          ? "#2a9d8f"
                                          : phrase.assessmentResult.completenessScore >= 60
                                            ? "#e9c46a"
                                            : "#e76f51",
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">Accuracy</span>
                                  <span>{Math.round(phrase.assessmentResult.accuracyScore)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.accuracyScore)}%`,
                                      backgroundColor:
                                        phrase.assessmentResult.accuracyScore >= 80
                                          ? "#2a9d8f"
                                          : phrase.assessmentResult.accuracyScore >= 60
                                            ? "#e9c46a"
                                            : "#e76f51",
                                    }}
                                  ></div>
                                </div>
                              </div>

                              {phrase.assessmentResult.prosodyScore && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium">Prosody</span>
                                    <span>{Math.round(phrase.assessmentResult.prosodyScore)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className="h-2.5 rounded-full"
                                      style={{
                                        width: `${Math.round(phrase.assessmentResult.prosodyScore)}%`,
                                        backgroundColor:
                                          phrase.assessmentResult.prosodyScore >= 80
                                            ? "#2a9d8f"
                                            : phrase.assessmentResult.prosodyScore >= 60
                                              ? "#e9c46a"
                                              : "#e76f51",
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {phrase.assessmentResult.wordLevelResults &&
                              phrase.assessmentResult.wordLevelResults.length > 0 && (
                                <div className="mt-5 pt-5 border-t">
                                  <h3 className="text-sm font-semibold mb-3">
                                    Word-by-word analysis:
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    {phrase.assessmentResult.wordLevelResults.map((word, idx) => {
                                      const score = word.accuracyScore;
                                      const bgColor =
                                        score > 85
                                          ? "bg-green-100"
                                          : score > 70
                                            ? "bg-yellow-100"
                                            : "bg-red-100";
                                      const textColor =
                                        score > 85
                                          ? "text-green-800"
                                          : score > 70
                                            ? "text-yellow-800"
                                            : "text-red-800";

                                      return (
                                        <div
                                          key={`word-${idx}`}
                                          className={`px-2 py-1 rounded text-sm ${bgColor} ${textColor}`}
                                        >
                                          {word.word} ({Math.round(score)}%)
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            {phrase.recordingUrl && (
                              <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mt-4 flex items-center justify-between">
                                <div className="text-sm font-medium text-[#264653]">
                                  Listen to your recording:
                                </div>
                                <button
                                  className="bg-[#57cc99] text-white rounded-full p-2 flex items-center justify-center shadow-md hover:bg-[#38b37a] transition-colors"
                                  onClick={() => {
                                    const audio = new Audio(phrase.recordingUrl as string);
                                    audio.play();
                                  }}
                                >
                                  <Volume2 className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-center gap-2 mt-4">
                            <Button
                              variant="outline"
                              className="border-green-500 text-green-600 hover:bg-green-50"
                              onClick={() => startPhrasePractice(idx)}
                            >
                              Try Again
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setCurrentlyPracticing(null)}
                            >
                              Close
                            </Button>
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
                  setProcessedPhrases([
                    ...processedPhrases,
                    {
                      id: `phrase-${Date.now()}-new`,
                      text: "",
                      status: "idle",
                    },
                  ]);
                  setCurrentPhraseIndex(processedPhrases.length);
                }}
              >
                Add New Phrase
              </Button>
            </div>

            {/* Right column: selected phrase and features */}
            <div>
              {currentPhraseIndex >= 0 &&
                currentPhraseIndex < processedPhrases.length ? (
                  null // This line fixes the syntax error
                ) : (
                  <Card> {/* "No Phrase Selected" card */}
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

      {/* Sign in dialog for saving phrases */}
      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign in to Save Phrases</DialogTitle>
            <DialogDescription>
              Sign in to save this phrase to your collection and practice it later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center space-y-4">
            <div className="p-4 border rounded-md bg-primary/5 mb-2">
              {pendingSaveIndex !== null && pendingSaveIndex >= 0 && pendingSaveIndex < processedPhrases.length && (
                <p className="text-center font-medium">
                  "{processedPhrases[pendingSaveIndex].text}"
                </p>
              )}
            </div>

            <Button 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
              variant="default"
              size="lg"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign in to Save
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              After signing in, your phrase will be automatically saved to your collection.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}