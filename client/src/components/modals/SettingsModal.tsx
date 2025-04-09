import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { toast } = useToast();
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

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated",
    });
    onClose();
  };

  const handleResetSettings = () => {
    resetSettings();
    toast({
      title: "Settings Reset",
      description: "Settings have been reset to defaults",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Settings</h3>
          <button 
            onClick={onClose}
            className="text-textColor hover:text-primary transition-colors"
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Voice Feedback Volume</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={settings.voiceFeedbackVolume} 
              onChange={(e) => updateSettings({ voiceFeedbackVolume: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Reading Speed</label>
            <select 
              value={settings.readingSpeed}
              onChange={(e) => updateSettings({ readingSpeed: e.target.value as any })}
              className="w-full border border-secondary rounded-md px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Voice Assistant</label>
            <select 
              value={settings.voiceAssistant}
              onChange={(e) => updateSettings({ voiceAssistant: e.target.value as any })}
              className="w-full border border-secondary rounded-md px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="default">Default (Female)</option>
              <option value="male">Male Voice</option>
              <option value="child">Child Voice</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Text Highlighting</label>
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.textHighlighting}
                onChange={(e) => updateSettings({ textHighlighting: e.target.checked })}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-secondary rounded-full peer peer-checked:bg-primary peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Dark Mode</label>
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.darkMode}
                onChange={(e) => updateSettings({ darkMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-secondary rounded-full peer peer-checked:bg-primary peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button 
            onClick={handleResetSettings}
            variant="outline"
          >
            Reset Defaults
          </Button>
          <Button 
            onClick={handleSaveSettings}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
