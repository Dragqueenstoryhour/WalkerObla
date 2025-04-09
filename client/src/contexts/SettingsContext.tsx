import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings } from '@/lib/types';

const defaultSettings: Settings = {
  voiceFeedbackVolume: 75,
  readingSpeed: 'medium',
  voiceAssistant: 'default',
  textHighlighting: true,
  darkMode: false,
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(() => {
    // Try to load from localStorage
    const savedSettings = localStorage.getItem('readAssistSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  // Update localStorage when settings change
  useEffect(() => {
    localStorage.setItem('readAssistSettings', JSON.stringify(settings));
    
    // Apply dark mode if needed
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings,
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const value = {
    settings,
    updateSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
