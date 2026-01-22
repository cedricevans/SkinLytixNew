import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Analysis from "./pages/Analysis";
import AnalysisFast from "./pages/AnalysisFast";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Walkthrough from "./pages/Walkthrough";
import Profile from "./pages/Profile";
import Routine from "./pages/Routine";
import RoutineOptimization from "./pages/RoutineOptimization";
import DemoAnalysis from "./pages/DemoAnalysis";
import InstagramLanding from "./pages/InstagramLanding";
import Analytics from "./pages/Analytics";
import BetaFeedback from "./pages/BetaFeedback";
import Compare from "./pages/Compare";
import Favorites from "./pages/Favorites";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import StudentReviewer from "./pages/dashboard/StudentReviewer";
import FeedbackWidget from "@/components/FeedbackWidget";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TrialCountdown } from "@/components/subscription/TrialCountdown";
import ScrollToTop from "@/components/ScrollToTop";
import AppProtectedRoute from "@/components/AppProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TrialCountdown />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<AppProtectedRoute><Home /></AppProtectedRoute>} />
          <Route path="/ig" element={<InstagramLanding />} />
          <Route path="/demo-analysis" element={<DemoAnalysis />} />
          <Route path="/upload" element={<AppProtectedRoute><Upload /></AppProtectedRoute>} />
          <Route path="/analysis/:id" element={<AppProtectedRoute><Analysis /></AppProtectedRoute>} />
          <Route path="/analysis-fast" element={<AppProtectedRoute><AnalysisFast /></AppProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<AppProtectedRoute><Onboarding /></AppProtectedRoute>} />
          <Route path="/walkthrough" element={<AppProtectedRoute><Walkthrough /></AppProtectedRoute>} />
          <Route path="/profile" element={<AppProtectedRoute><Profile /></AppProtectedRoute>} />
          <Route path="/routine" element={<AppProtectedRoute><Routine /></AppProtectedRoute>} />
          <Route path="/routine/optimization/:id" element={<AppProtectedRoute><RoutineOptimization /></AppProtectedRoute>} />
          <Route path="/analytics" element={<AppProtectedRoute><ProtectedRoute><Analytics /></ProtectedRoute></AppProtectedRoute>} />
          <Route path="/beta-feedback" element={<AppProtectedRoute><BetaFeedback /></AppProtectedRoute>} />
          <Route path="/compare" element={<AppProtectedRoute><Compare /></AppProtectedRoute>} />
          <Route path="/favorites" element={<AppProtectedRoute><Favorites /></AppProtectedRoute>} />
          <Route path="/settings" element={<AppProtectedRoute><Settings /></AppProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard/reviewer" element={<AppProtectedRoute><ProtectedRoute><StudentReviewer /></ProtectedRoute></AppProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FeedbackWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
