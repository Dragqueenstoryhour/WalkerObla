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
import { ReadingContent as ReadingContentType, PronunciationAssessmentResult } from '@/lib/types';
import { CheckCircle, BookOpen } from 'lucide-react';


const Read = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { isAuthenticated } = useAuthContext();
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

  // Use useEffect to set the initial content when loaded
  useEffect(() => {
    if (initialContent && !currentContent) {
      const content = initialContent as any;
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

  // Handle generating new content
  const handleNewContent = async () => {
    setHasCompletedRecording(false);
    try {
      const response = await fetch('/api/content/sample');
      if (!response.ok) {
        throw new Error('Failed to fetch new content');
      }
      const newContent = await response.json() as ReadingContentType;
      setCurrentContent(newContent);
    } catch (error) {
      console.error("Error loading new content:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        onSettingsClick={() => setShowSettingsModal(true)}
        onHelpClick={() => setShowHelpModal(true)}
      />

      <main className="container flex-1 px-4 py-6 md:py-8">
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