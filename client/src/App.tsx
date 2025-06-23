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

import Words from "@/pages/Words";
import Phrases from "@/pages/Phrases";
import MyWordsNew from "@/pages/MyWordsNew";
import Profile from "@/pages/Profile";
import Animation from "@/pages/Animation";
import AzureAnimation from "@/pages/AzureAnimation";
import Viseme from "@/pages/Viseme";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ReadingProvider } from "./contexts/ReadingContext";
import { GameProvider } from "./contexts/GameContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { AuthButtons } from "./components/AuthButtons";
import Account from "./pages/Account";
import MyAccount from "./pages/MyAccount";
import OurStory from "./pages/OurStory";
import { DifficultyProvider, useDifficulty } from "./contexts/DifficultyContext";
import { DifficultySelectionDialog } from "./components/difficulty/DifficultySelectionDialog";
import { useEffect, useState } from "react";
import { Book, Edit, Bookmark, UserCircle } from "lucide-react"; // Ensure your icons are imported

// A new component for the "Apple-like" Flutter toggle bar
// Replace your existing TabBar function in App.tsx with this updated version
function TabBar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Words", icon: Edit },
    { href: "/phrases", label: "Phrases", icon: Edit },
    { href: "/reader", label: "Reading", icon: Book },
    { href: "/my-words", label: "My Journey", icon: Bookmark },
  ];

  return (
    <div className="relative flex items-center justify-center w-full">
      <div className="flex bg-white rounded-2xl p-1 justify-around mx-auto shadow-lg border border-gray-200 max-w-2xl"
           style={{ height: '60px', minWidth: '480px' }}>
        {navItems.map((item, index) => {
          const isActive = location === item.href;
          const IconComponent = item.icon;

          return (
            <Link href={item.href} key={item.href}>
              <a
                className={`flex flex-col items-center justify-center rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-md py-1.5 px-4" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 py-1.5 px-3"
                }`}
                style={{ height: '52px' }}
              >
                <IconComponent 
                  className="h-5 w-5 mb-0.5"
                  style={{ 
                    color: isActive ? '#FFFFFF' : '#9DB2CE',
                    strokeWidth: isActive ? 2 : 1.5 
                  }} 
                />
                <span 
                  className={`font-bold text-xs ${isActive ? 'text-white' : 'text-gray-400'}`}
                  style={{
                    fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif',
                    letterSpacing: '0.1px',
                    color: isActive ? '#FFFFFF' : '#9DB2CE'
                  }}
                >
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Navigation() {
  return (
    <div className="bg-gradient-to-b from-white to-green-50 py-2 px-4 mb-2">
      {/* Tab Bar - Full Width */}
      <div className="w-full mb-6">
        <TabBar />
      </div>
      
      {/* Authentication Row - Right aligned to match Level button */}
      <div className="flex justify-end pr-4 pb-2">
        <AuthButtons
          variant="default"
          className="bg-green-600 hover:bg-green-700 text-white border-none"
          size="sm"
          showText={true}
        />
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
        <Route path="/" component={Words} />
        <Route path="/reader" component={Read} />
        <Route path="/read" component={Read} />
        <Route path="/words" component={Words} />
        <Route path="/phrases" component={Phrases} />
        <Route path="/game" component={() => <GameProvider initialUsername="player1"><RecordingTest /></GameProvider>} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/azure-test" component={AzureTest} />

        <Route path="/my-words" component={MyWordsNew} />
        <Route path="/account" component={Account} />
        <Route path="/my-account" component={MyAccount} />
        <Route path="/our-story" component={OurStory} />
        <Route path="/profile" component={Profile} />
        <Route path="/animation" component={Animation} />
        <Route path="/azure-animation" component={AzureAnimation} />
        <Route path="/viseme" component={Viseme} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <DifficultyProvider>
            <ReadingProvider>
              <Router />
              <Toaster />
            </ReadingProvider>
          </DifficultyProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;