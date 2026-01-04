import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Analysis from "./pages/Analysis";
import Auth from "./pages/Auth";
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
import StudentReviewer from "./pages/dashboard/StudentReviewer";
import FeedbackWidget from "@/components/FeedbackWidget";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TrialCountdown } from "@/components/subscription/TrialCountdown";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TrialCountdown />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/ig" element={<InstagramLanding />} />
          <Route path="/demo-analysis" element={<DemoAnalysis />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analysis/:id" element={<Analysis />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/walkthrough" element={<Walkthrough />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/routine/optimization/:id" element={<RoutineOptimization />} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/beta-feedback" element={<BetaFeedback />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard/reviewer" element={<ProtectedRoute><StudentReviewer /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FeedbackWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
