import { Settings, HelpCircle, Anchor } from 'lucide-react';
import { AuthButtons } from './AuthButtons';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onSettingsClick: () => void;
  onHelpClick: () => void;
}

const Header = ({ onSettingsClick, onHelpClick }: HeaderProps) => {
  return (
    <header className="border-b border-secondary px-4 py-3 md:px-6 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-primary/10 p-2 rounded-full">
            <Anchor className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold ml-2 text-primary dark:text-primary">
            Pirate <span className="text-gray-600 dark:text-gray-400 font-normal">Speech</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* Make auth buttons prominent */}
          <div className="relative">
            <AuthButtons 
              variant="default" 
              size="sm" 
              className="shadow-md relative z-10"
              showText={true}
            />
            {/* Decorative effect for login button */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full hidden md:block animate-ping"></div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="text-gray-600 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onHelpClick}
            className="text-gray-600 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
