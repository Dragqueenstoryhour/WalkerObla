import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
// import Home from "@/pages/Home"; // Home is not used in the routes, keeping it commented as in original
import RecordingTest from "@/pages/RecordingTest";
import Read from "@/pages/Read";
import Subscription from "@/pages/Subscription";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import AzureTest from "@/pages/AzureTest";

import Words from "@/pages/Words";
import Phrases from "@/pages/Phrases";
import MyWordsNew from "@/pages/MyWordsNew";
import Profile from "@/pages/Profile";
import Animation from "@/pages/Animation";
import AzureAnimation from "@/pages/AzureAnimation";
import Viseme from "@/pages/Viseme";
import TherapistLogin from "@/pages/TherapistLogin";
import TherapistPortalPage from "@/pages/TherapistPortalPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import { useEffect, useState, useRef } from "react";

import { Book, Edit, Bookmark, UserCircle } from "lucide-react";

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
      {/* Background indicator circles - positioned behind everything */}
      <div className="absolute pointer-events-none" style={{ zIndex: 0 }}>
        {navItems.map((item, index) => {
          const isActive = location === item.href;
          if (!isActive) return null;

          return (
            <div
              key={`bg-circle-${index}`}
              className="absolute rounded-full bg-gray-50"
              style={{
                width: '34px',
                height: '34px',
                left: '50%',
                top: '-18px',
                transform: 'translateX(-50%)',
                zIndex: 0
              }}
            />
          );
        })}
      </div>

      {/* Main navigation container */}
      <div 
        className="relative flex bg-white rounded-lg shadow-sm border border-gray-100"
        style={{ 
          width: '428px', 
          height: '75px',
          padding: '0 16px',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 1
        }}
      >
        {navItems.map((item, index) => {
          const isActive = location === item.href;
          const IconComponent = item.icon;

          return (
            <Link href={item.href} key={item.href}>
              <div
                className="relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
                style={{
                  padding: '12.5px 15px',
                  gap: '5px',
                  height: '68px',
                  minWidth: item.label === 'My Journey' ? '77px' : 
                           item.label === 'Phrases' ? '70px' :
                           item.label === 'Reading' ? '67px' : '64px',
                  zIndex: 2
                }}
              >
                {/* Active indicator dot - positioned above the tab */}
                {isActive && (
                  <>
                    {/* Gray background circle - positioned higher and behind icons */}
                    <div 
                      className="absolute rounded-full bg-gray-50"
                      style={{
                        width: '34px',
                        height: '34px',
                        top: '-28px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: -1
                      }}
                    />
                    {/* Blue dot */}
                    <div 
                      className="absolute rounded-full"
                      style={{
                        width: '13px',
                        height: '13px',
                        top: '-17.5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#386BF6',
                        zIndex: 1
                      }}
                    />
                  </>
                )}

                {/* Icon - simplified to just change color */}
                <IconComponent 
                  className="transition-colors duration-200"
                  style={{ 
                    width: '24px',
                    height: '24px',
                    color: isActive ? '#386BF6' : '#9DB2CE',
                    strokeWidth: 1.5,
                    fill: 'none'
                  }} 
                />

                {/* Label */}
                <span 
                  style={{
                    fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontWeight: 400,
                    fontSize: '12px',
                    lineHeight: '14px',
                    color: isActive ? '#386BF6' : '#9DB2CE',
                    textAlign: 'center'
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Navigation() {
  return (
    <div className="bg-gray-50 py-2 px-4 mb-2">
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
        <Route path="/therapist" component={TherapistLogin} />
        <Route path="/therapist-portal">
          <ProtectedRoute requiredRole="therapist">
            <TherapistPortalPage />
          </ProtectedRoute>
        </Route>
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