import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import VoiceControl from '@/components/VoiceControl';
import ReadingContent from '@/components/ReadingContent';
import ReadingControls from '@/components/ReadingControls';
import FeedbackPanel from '@/components/FeedbackPanel';
import Footer from '@/components/Footer';
import SettingsModal from '@/components/modals/SettingsModal';
import HelpModal from '@/components/modals/HelpModal';
import { useQuery } from '@tanstack/react-query';
import { useReading } from '@/contexts/ReadingContext';
import { ReadingContent as ReadingContentType } from '@/lib/types';

const Read = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const { currentContent, setCurrentContent } = useReading();

  // Fetch initial sample content
  const { data: initialContent, isLoading, error } = useQuery({
    queryKey: ['/api/content/sample'],
    enabled: !currentContent,
  });

  // Use useEffect to set the initial content when loaded
  useEffect(() => {
    if (!currentContent && initialContent && !isLoading) {
      // Make sure we have all required fields before setting the content
      const content = initialContent as any;
      if (content && content.id && content.title && content.content) {
        setCurrentContent(content as ReadingContentType);
      }
    }
  }, [currentContent, initialContent, isLoading, setCurrentContent]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header 
        onSettingsClick={() => setShowSettingsModal(true)}
        onHelpClick={() => setShowHelpModal(true)}
      />

      <main className="container flex-1 px-4 py-6 md:py-8">
        <VoiceControl />

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
          <div className="grid gap-8 md:gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ReadingContent />
              <ReadingControls />
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