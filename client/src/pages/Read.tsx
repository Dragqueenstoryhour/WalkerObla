import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import ReadingContent from '@/components/ReadingContent';
import FeedbackPanel from '@/components/FeedbackPanel';
import Footer from '@/components/Footer';
import SettingsModal from '@/components/modals/SettingsModal';
import HelpModal from '@/components/modals/HelpModal';
import { useQuery } from '@tanstack/react-query';
import { useReading } from '@/contexts/ReadingContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { ReadingContent as ReadingContentType, PronunciationAssessmentResult } from '@/lib/types';
import SimpleRecorder from '@/components/SimpleRecorder'; // Import SimpleRecorder directly
import { Card, CardContent } from '@/components/ui/card'; // Import Card and CardContent for SimpleRecorder's outer box
import { CheckCircle, BookOpen } from 'lucide-react'; // Import icons
import { useToast } from '@/hooks/use-toast';

const Read = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const { toast } = useToast();
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
  const simpleRecorderRef = useRef<HTMLDivElement>(null); // Ref for SimpleRecorder

  // Fetch initial sample content
  const { data: initialContent, isLoading, error } = useQuery({
    queryKey: ['/api/content/sample'],
    enabled: !currentContent,
  });

  // Use useEffect to set the initial content when loaded
  useEffect(() => {
    if (!currentContent && initialContent && !isLoading) {
      const content = initialContent as any;
      if (content && content.id && content.title && content.content) {
        setCurrentContent(content as ReadingContentType);
      }
    }
  }, [currentContent, initialContent, isLoading, setCurrentContent]);

  // State for reference text, derived from currentContent
  const [referenceText, setReferenceText] = useState('');

  // Update the reference text when content changes
  useEffect(() => {
    if (currentContent) {
      setReferenceText(currentContent.content);
    }
  }, [currentContent]);

  // Function to scroll to SimpleRecorder
  const handleSelectContent = () => {
    if (simpleRecorderRef.current) {
      simpleRecorderRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle assessment results
  const handleAssessmentReceived = (results: PronunciationAssessmentResult) => {
    // Store in reading context
    setPronunciationResults(results);

    // Update progress based on word count
    const wordsRead = referenceText.split(/\s+/).length || 0;
    updateSessionProgress(wordsRead);
    
    // Mark article as completed if authenticated
    if (isAuthenticated && currentContent && !articleCompleted) {
      completeArticle(currentContent.id)
        .then(() => {
          setArticleCompleted(true);
          toast({
            title: "Article Completed",
            description: "Your progress has been saved",
            duration: 3000,
          });
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        onSettingsClick={() => setShowSettingsModal(true)}
        onHelpClick={() => setShowHelpModal(true)}
      />

      <main className="container flex-1 px-4 py-6 md:py-8">
        {isLoading && !currentContent ? (
          <div className="flex justify-center items-center h-52">
            <div className="loader animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p className="text-xl font-medium mb-2">Oops, something went wrong</p>
            <p>Unable to load reading content. Please try again later.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ReadingContent onSelectContent={handleSelectContent} />
              {/* SimpleRecorder directly here */}
              <div ref={simpleRecorderRef}>
                <Card className="mb-6">
                  <CardContent className="p-6">
                    {/* The "Record your speech to receive feedback" for SimpleRecorder is now inside SimpleRecorder.tsx itself */}
                    {currentContent && (
                      <SimpleRecorder
                        referenceText={referenceText}
                        onAssessmentReceived={handleAssessmentReceived}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-1">
              <FeedbackPanel />
            </div>
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