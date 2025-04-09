import { FiSettings, FiHelpCircle } from 'react-icons/fi';

interface HeaderProps {
  onSettingsClick: () => void;
  onHelpClick: () => void;
}

const Header = ({ onSettingsClick, onHelpClick }: HeaderProps) => {
  return (
    <header className="border-b border-secondary px-4 py-4 md:px-6">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1v22M4 3.5v17M20 3.5v17M1 12h22M8 20.5c0-4.5 8-4.5 8 0M8 3.5c0 4.5 8 4.5 8 0"></path>
          </svg>
          <h1 className="text-xl md:text-2xl font-semibold ml-2">ReadAssist</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onSettingsClick}
            className="text-textColor hover:text-primary transition-colors flex items-center"
            aria-label="Settings"
          >
            <FiSettings className="w-6 h-6" />
            <span className="ml-1 hidden md:inline">Settings</span>
          </button>
          <button
            onClick={onHelpClick}
            className="text-textColor hover:text-primary transition-colors flex items-center"
            aria-label="Help"
          >
            <FiHelpCircle className="w-6 h-6" />
            <span className="ml-1 hidden md:inline">Help</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
