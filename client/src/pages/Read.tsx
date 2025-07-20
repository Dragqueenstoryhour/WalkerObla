import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import ConsolidatedReadingPractice from '@/components/ConsolidatedReadingPractice';
import FeedbackPanel from '@/components/FeedbackPanel';
import Footer from '@/components/Footer';
import SettingsModal from '@/components/modals/SettingsModal';
import HelpModal from '@/components/modals/HelpModal';
import { useQuery } from '@tanstack/react-query';
import { useReading } from '@/contexts/ReadingContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDifficulty } from '@/contexts/DifficultyContext';
import { ReadingContent as ReadingContentType, PronunciationAssessmentResult } from '@/lib/types';
import { CheckCircle, BookOpen } from 'lucide-react';


const Read = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { isAuthenticated } = useAuthContext();
  const { setCurrentMode } = useDifficulty();
  const { 
    currentContent, 
    setCurrentContent, 
    setPronunciationResults, 
    updateSessionProgress,
    completeArticle,
    userStats 
  } = useReading();
  const [articleCompleted, setArticleCompleted] = useState(false);
  const [hasCompletedRecording, setHasCompletedRecording] = useState(false);

  // Fetch initial sample content
  const { data: initialContent, isLoading, error } = useQuery({
    queryKey: ['/api/content/sample'],
  });

  // Set current mode to reading - separate effect to ensure it always runs
  useEffect(() => {
    setCurrentMode('reading');
  }, [setCurrentMode]);

  // Set initial content when loaded
  useEffect(() => {
    if (initialContent && initialContent.data && !currentContent) {
      const content = initialContent.data as any;
      if (content && content.id && content.title && content.content) {
        setCurrentContent(content as ReadingContentType);
      }
    }
  }, [initialContent, currentContent, setCurrentContent]);

  // Handle assessment results
  const handleAssessmentReceived = (results: PronunciationAssessmentResult) => {
    // Store in reading context
    setPronunciationResults(results);
    setHasCompletedRecording(true); // Show feedback panel after recording

    // Update progress based on word count
    if (currentContent?.content) {
      const wordsRead = currentContent.content.split(/\s+/).length || 0;
      updateSessionProgress(wordsRead);
    }
    
    // Mark article as completed if authenticated
    if (isAuthenticated && currentContent && !articleCompleted) {
      completeArticle(currentContent.id)
        .then(() => {
          setArticleCompleted(true);
        })
        .catch(err => {
          console.error("Error tracking article completion:", err);
        });
    }
  };
  
  // Reset articleCompleted state when content changes
  useEffect(() => {
    setArticleCompleted(false);
  }, [currentContent]);

  // Handle new content generation - reset recording state only
  const handleNewContent = async () => {
    // Only reset the recording state when new content is generated
    // The actual content generation is handled by ConsolidatedReadingPractice
    setHasCompletedRecording(false);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <Header
        onSettingsClick={() => setShowSettingsModal(true)}
        onHelpClick={() => setShowHelpModal(true)}
      />

      <main className="container flex flex-col items-center justify-center mx-auto px-4 py-6 md:py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-52">
            <div className="loader animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p className="text-xl font-medium mb-2">Oops, something went wrong</p>
            <p>Unable to load reading content. Please try again later.</p>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            <ConsolidatedReadingPractice
              onAssessmentReceived={handleAssessmentReceived}
              onNewContent={handleNewContent}
              contentId={currentContent?.id}
            />

            {/* Feedback Panel - Always below Practice Speaking */}
            {hasCompletedRecording && (
              <div className="mt-8">
                <FeedbackPanel />
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
};

export default Read;