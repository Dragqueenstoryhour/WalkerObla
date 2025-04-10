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

const Home = () => {
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
      setCurrentContent(initialContent);
    }
  }, [currentContent, initialContent, isLoading, setCurrentContent]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        onSettingsClick={() => setShowSettingsModal(true)}
        onHelpClick={() => setShowHelpModal(true)}
      />
      
      <main className="flex-1 px-4 md:px-6 py-6">
        <div className="container mx-auto max-w-4xl">
          <VoiceControl />
          
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex justify-center items-center h-32">
              <p>Loading reading content...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex justify-center items-center h-32">
              <p className="text-red-500">Error loading content. Please try again.</p>
            </div>
          ) : currentContent ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Reading Material on the left */}
              <div className="lg:col-span-7">
                <ReadingContent />
              </div>
              {/* Reading Practice on the right */}
              <div className="lg:col-span-5">
                <ReadingControls />
                <div className="mt-6">
                  <FeedbackPanel />
                </div>
              </div>
            </div>
          ) : null}
        </div>
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

export default Home;
