import { Settings, HelpCircle, Gauge } from 'lucide-react';
// Remove the AuthButtons import since we won't be using it
import { Button } from '@/components/ui/button';
// @ts-ignore 
import speakgudLogo from '../assets/speakgud-logo.jpg';
import { DifficultyDropdown } from './difficulty/SimplifiedDifficultySelector';

interface HeaderProps {
  onSettingsClick: () => void;
  onHelpClick: () => void;
}

const Header = ({ onSettingsClick, onHelpClick }: HeaderProps) => {
  return (
    <header className="border-b border-secondary px-4 py-3 md:px-6 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Reading Practice
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Difficulty Dropdown */}
          <div className="mr-2">
            <DifficultyDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;