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
import { SettingsProvider } from "./contexts/SettingsContext";
import { ReadingProvider } from "./contexts/ReadingContext";
import { GameProvider } from "./contexts/GameContext";

function Navigation() {
  return (
    <div className="bg-primary/5 border-b py-2 px-4 mb-4">
      <div className="container flex gap-4">
        <Link href="/" className="text-primary hover:underline">
          SpeakUp
        </Link>
        <Link href="/read" className="text-primary hover:underline">
          ReadAssist
        </Link>
        <Link href="/new-phrases" className="text-primary hover:underline">
          New Phrases
        </Link>
        <Link href="/my-words" className="text-primary hover:underline">
          My Words
        </Link>
        <Link href="/subscription" className="text-primary hover:underline ml-auto">
          Premium
        </Link>
      </div>
    </div>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={() => <GameProvider initialUsername="player1"><RecordingTest /></GameProvider>} />
        <Route path="/read" component={Read} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/azure-test" component={AzureTest} />
        <Route path="/new-phrases" component={NewPhrases} />
        <Route path="/shared-phrases/:shareId" component={NewPhrases} />
        <Route path="/my-words" component={MyWords} />
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
