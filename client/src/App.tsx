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
import { SettingsProvider } from "./contexts/SettingsContext";
import { ReadingProvider } from "./contexts/ReadingContext";
import { GameProvider } from "./contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import Account from "./pages/Account";

function Navigation() {
  const { isAuthenticated, user } = useAuth();
  
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
        <Link href="/animation" className="text-primary hover:underline">
          Animation
        </Link>
        
        <div className="ml-auto">
          {isAuthenticated && user ? (
            <Link href="/account" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 border-2 border-primary rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-sm font-medium leading-none">
                    {user.username}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none mt-1">
                    Logged In
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/api/login" className="text-primary hover:underline">
              Log In / Sign Up
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <>
      <Navigation />
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
          <Router />
          <Toaster />
        </ReadingProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
