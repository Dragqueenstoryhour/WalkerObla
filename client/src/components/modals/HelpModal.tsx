import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal = ({ onClose }: HelpModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Help & Instructions</h3>
          <button 
            onClick={onClose}
            className="text-textColor hover:text-primary transition-colors"
            aria-label="Close help"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-lg mb-2">Getting Started</h4>
            <p className="text-textColor">
              ReadAssist helps stroke recovery patients improve their reading skills 
              through voice interaction and personalized feedback.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-2">Using Voice Controls</h4>
            <ol className="list-decimal list-inside space-y-1 text-textColor">
              <li>Click the microphone button or say "Hey ReadAssist"</li>
              <li>Request content by topic (e.g., "Find an article about gardening")</li>
              <li>Use voice commands like "Start reading," "Pause," or "Help"</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-2">Reading Practice</h4>
            <ol className="list-decimal list-inside space-y-1 text-textColor">
              <li>Click "Start Reading" to begin your reading session</li>
              <li>Read the highlighted text aloud at your own pace</li>
              <li>The system will evaluate your pronunciation and fluency</li>
              <li>Review feedback and practice difficult words</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-2">Need More Help?</h4>
            <p className="text-textColor">
              Contact your speech therapist to review your progress or adjust your reading plan.
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <Button onClick={onClose}>
            Got It
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
