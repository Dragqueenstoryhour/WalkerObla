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
import Words from "@/pages/Words";
import Phrases from "@/pages/Phrases";
import MyWords from "@/pages/MyWords";
import Profile from "@/pages/Profile";
import Animation from "@/pages/Animation";
import AzureAnimation from "@/pages/AzureAnimation";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ReadingProvider } from "./contexts/ReadingContext";
import { GameProvider } from "./contexts/GameContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
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
    { href: "/", label: "Words", icon: Edit, color: "from-blue-500 to-indigo-500" },
    { href: "/phrases", label: "Phrases", icon: Edit, color: "from-purple-500 to-pink-500" },
    { href: "/reader", label: "Reading", icon: Book, color: "from-emerald-500 to-teal-500" },
    { href: "/my-words", label: "My Journey", icon: Bookmark, color: "from-orange-500 to-red-500" },
  ];

  return (
    <div className="relative flex items-center justify-center h-12 w-full">
      <div className="flex bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-1.5 w-full justify-around mx-auto shadow-lg border border-gray-300">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const IconComponent = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <a
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ease-in-out flex-grow transform hover:scale-105 ${
                  isActive 
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-105` 
                    : "text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-md"
                }`}
              >
                <IconComponent className={`h-5 w-5 mb-0.5 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-bold">{item.label}</span>
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
        <Route path="/words" component={Words} />
        <Route path="/phrases" component={Phrases} />
        <Route path="/game" component={() => <GameProvider initialUsername="player1"><RecordingTest /></GameProvider>} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/azure-test" component={AzureTest} />
        <Route path="/new-phrases" component={NewPhrases} />
        <Route path="/shared-phrases/:shareId" component={NewPhrases} />
        <Route path="/my-words" component={MyWords} />
        <Route path="/account" component={Account} />
        <Route path="/profile" component={Profile} />
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