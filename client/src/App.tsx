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

function Navigation() {
  const { isAuthenticated, user } = useAuthContext();
  
  return (
    <div className="bg-primary/5 border-b py-2 px-4 mb-4">
      <div className="container flex gap-4 items-center">
        <Link href="/game" className="text-primary hover:underline">
          SpeakUp
        </Link>
        <Link href="/" className="text-primary hover:underline">
          ReadAssist
        </Link>
        <Link href="/new-phrases" className="text-primary hover:underline">
          New Phrases
        </Link>
        <Link href="/my-words" className="text-primary hover:underline">
          My Words
        </Link>
        {/* Animation and Azure Viseme links temporarily hidden
        <Link href="/animation" className="text-primary hover:underline">
          Animation
        </Link>
        <Link href="/azure-animation" className="text-primary hover:underline">
          Azure Viseme
        </Link>
        */}
        
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <Link href="/account" className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 border-2 border-primary rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:flex flex-col">
                    <span className="text-sm font-medium leading-none">
                      {user.username || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground leading-none mt-1">
                      Logged In
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="ml-auto">
                <AuthButtons showText={true} />
              </div>
            )}
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
