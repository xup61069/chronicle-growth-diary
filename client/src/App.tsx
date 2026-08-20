/** Design reminder — route public storytelling into a private, archival growth-diary workspace. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const DiaryEditor = lazy(() => import("@/pages/DiaryEditor"));
const FamilyInvite = lazy(() => import("@/pages/FamilyInvite"));
const GrowthDashboard = lazy(() => import("@/pages/GrowthDashboard"));
const QuickNote = lazy(() => import("@/pages/QuickNote"));
const SharedStory = lazy(() => import("@/pages/SharedStory"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export function RouteLoadingState() {
  return <main className="grid min-h-screen place-items-center bg-[#f7f4ec] px-6 text-center text-[#14263a]" aria-busy="true"><p className="font-mono text-xs tracking-[0.14em]" role="status" aria-live="polite">正在整理閱讀頁面…</p></main>;
}

function Router() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/editor" component={DiaryEditor} />
        <Route path="/dashboard" component={GrowthDashboard} />
        <Route path="/family-invite" component={FamilyInvite} />
        <Route path="/quick-note" component={QuickNote} />
        <Route path="/story/:slug" component={SharedStory} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function RouteMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const isPrivateRoute = location === "/editor" || location === "/dashboard" || location === "/quick-note" || location.startsWith("/family-invite");
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = isPrivateRoute ? "noindex, nofollow, noarchive" : "index, follow";

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${location === "/" ? "/" : location}`;
  }, [location]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <RouteMetadata />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
