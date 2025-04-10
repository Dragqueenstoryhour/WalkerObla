import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RecordingTest from "@/pages/RecordingTest";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ReadingProvider } from "./contexts/ReadingContext";

function Navigation() {
  return (
    <div className="bg-primary/5 border-b py-2 px-4 mb-4">
      <div className="container flex gap-4">
        <Link href="/" className="text-primary hover:underline">
          Home
        </Link>
        <Link href="/recording-test" className="text-primary hover:underline">
          Recording Test
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
        <Route path="/" component={Home} />
        <Route path="/recording-test" component={RecordingTest} />
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
