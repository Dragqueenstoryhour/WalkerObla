import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
// import Home from "@/pages/Home"; // Home is not used in the routes, keeping it commented as in original
import RecordingTest from "@/pages/RecordingTest";
import Read from "@/pages/Read";
import Subscription from "@/pages/Subscription";
import Checkout from "@/pages/Checkout";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import AzureTest from "@/pages/AzureTest";
import NewPhrases from "@/pages/NewPhrases";
import MyWords from "@/pages/MyWords";
import Animation from "@/pages/Animation";
import AzureAnimation from "@/pages/AzureAnimation";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ReadingProvider } from "./contexts/ReadingContext";
import { GameProvider } from "./contexts/GameContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuthContext } from "./contexts/AuthContext";
import { AuthButtons } from "./components/AuthButtons";
import Account from "./pages/Account";
import { DifficultyProvider, useDifficulty } from "./contexts/DifficultyContext";
import { DifficultySelectionDialog } from "./components/difficulty/DifficultySelectionDialog";
import { useEffect, useState } from "react";
import { Book, Edit, Bookmark, UserCircle } from "lucide-react"; // Ensure your icons are imported

// A new component for the "Apple-like" Flutter toggle bar
function TabBar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Pronounce Pro", icon: Book },
    { href: "/new-phrases", label: "SpeakUp Cards", icon: Edit },
    { href: "/my-words", label: "Saved Lingo", icon: Bookmark },
  ];

  return (
    <div className="relative flex items-center justify-center h-16 w-full">
      <div className="flex bg-blue-50 rounded-full p-1 w-full justify-around mx-auto"> {/* Changed bg to blue-50 and removed max-w-lg */}
        {navItems.map((item) => {
          const isActive = location === item.href;
          const IconComponent = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <a
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-full transition-all duration-300 ease-in-out flex-grow
                            ${isActive ? "bg-blue-500 text-white shadow-md" : "text-blue-400 hover:text-blue-600"}`}
              >
                <IconComponent className="h-6 w-6 mb-1" /> {/* Adjusted icon size and margin */}
                <span className="text-sm font-medium">{item.label}</span> {/* Adjusted font size */}
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Navigation() {
  const { isAuthenticated, user } = useAuthContext();

  return (
    <div className="bg-white py-2 px-4 mb-4 flex items-center justify-between"> {/* Removed border-b and shadow-sm */}
      {/* Integrating the new TabBar component */}
      <div className="flex-grow flex justify-center">
        <TabBar />
      </div>

      <div className="flex items-center ml-auto pl-4"> {/* Adjusted for right alignment and added padding */}
        {isAuthenticated && user ? (
          <Link href="/account" className="flex items-center gap-2">
            <div className="h-10 w-10 border-2 border-blue-500 rounded-full flex items-center justify-center bg-blue-500 text-white font-semibold text-xl"> {/* Slightly larger and more prominent */}
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </Link>
        ) : (
          <AuthButtons
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white border-none"
            size="sm"
            showText={true}
          />
        )}
      </div>
    </div>
  );
}

// Component to handle first-time user difficulty selection (unchanged)
function FirstTimeUserDifficultySelection() {
  const { hasSelectedDifficulty, setHasSelectedDifficulty } = useDifficulty();
  const [showDialog, setShowDialog] = useState(false);

  // Show dialog when component mounts if user hasn't selected difficulty
  useEffect(() => {
    if (!hasSelectedDifficulty) {
      // Small delay to avoid immediate popup
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hasSelectedDifficulty]);

  const handleDialogClose = () => {
    setShowDialog(false);
    setHasSelectedDifficulty(true);
  };

  return (
    <DifficultySelectionDialog 
      open={showDialog} 
      onClose={handleDialogClose} 
    />
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <FirstTimeUserDifficultySelection />
      <Switch>
        <Route path="/" component={Read} />
        <Route path="/game" component={() => <GameProvider initialUsername="player1"><RecordingTest /></GameProvider>} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/azure-test" component={AzureTest} />
        <Route path="/new-phrases" component={NewPhrases} />
        <Route path="/shared-phrases/:shareId" component={NewPhrases} />
        <Route path="/my-words" component={MyWords} />
        <Route path="/account" component={Account} />
        <Route path="/animation" component={Animation} />
        <Route path="/azure-animation" component={AzureAnimation} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ReadingProvider>
          <AuthProvider>
            <DifficultyProvider>
              <Router />
              <Toaster />
            </DifficultyProvider>
          </AuthProvider>
        </ReadingProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;