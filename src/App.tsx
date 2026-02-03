import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Component to prevent scroll restoration on navigation
const ScrollRestoration = () => {
  const location = useLocation();

  useEffect(() => {
    // Prevent browser from restoring scroll position on navigation
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, [location]);

  return null;
};

// Lazy load all pages for code splitting and better performance
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Benchmark = lazy(() => import("./pages/Benchmark"));
const Agents = lazy(() => import("./pages/Agents"));
const Team = lazy(() => import("./pages/Team"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Settings = lazy(() => import("./pages/Settings"));
const Compliance = lazy(() => import("./pages/Compliance"));
const Community = lazy(() => import("./pages/Community"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OptimizationLab = lazy(() => import("./pages/OptimizationLab"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const VisualBuilder = lazy(() => import("./pages/VisualBuilder"));
const AICopilotPage = lazy(() => import("./pages/AICopilot"));
const Templates = lazy(() => import("./pages/Templates"));
const History = lazy(() => import("./pages/History"));
const Workflow = lazy(() => import("./pages/Workflow"));
const LegalPacks = lazy(() => import("./pages/LegalPacks"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const Usage = lazy(() => import("./pages/Usage"));
const CompliancePage = lazy(() => import("./pages/CompliancePage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Payment = lazy(() => import("./pages/Payment"));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen w-full bg-black flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
      <p className="mt-4 text-white text-sm font-medium">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">

        <TooltipProvider delayDuration={0}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollRestoration />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/visual-builder" element={<VisualBuilder />} />
                <Route path="/ai-copilot" element={<AICopilotPage />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/history" element={<History />} />
                <Route path="/workflow" element={<Workflow />} />
                <Route path="/legal-packs" element={<LegalPacks />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/usage" element={<Usage />} />
                <Route path="/compliance-dashboard" element={<CompliancePage />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/benchmark" element={<Benchmark />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/optimization-lab" element={<OptimizationLab />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/team" element={<Team />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/community" element={<Community />} />
                <Route path="/enterprise" element={<Enterprise />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
