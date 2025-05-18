import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
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
import { Gamepad, Book, Edit, Bookmark } from "lucide-react"; // Ensure your icons are imported

function Navigation() {
  const { isAuthenticated, user } = useAuthContext();

  return (
    <div className="bg-primary/5 border-b py-2 px-4 mb-4">
      <div className="container flex gap-4 items-center justify-center"> {/* Ensure items are centered */}
        <Link href="/game" className="flex flex-col items-center text-primary hover:underline">
          <Gamepad className="h-6 w-6" />
          <span>SpeakUp</span>
        </Link>
        <Link href="/" className="flex flex-col items-center text-primary hover:underline">
          <Book className="h-6 w-6" />
          <span>ReadAssist</span>
        </Link>
        <Link href="/new-phrases" className="flex flex-col items-center text-primary hover:underline">
          <Edit className="h-6 w-6" />
          <span>New Phrases</span>
        </Link>
        <Link href="/my-words" className="flex flex-col items-center text-primary hover:underline">
          <Bookmark className="h-6 w-6" />
          <span>My Words</span>
        </Link>

        <div>
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <Link href="/account" className="flex items-center gap-2">
                <div className="h-8 w-8 border-2 border-primary rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to handle first-time user difficulty selection
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
