import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTradeDetectorSync } from "@/hooks/useTradeDetectorSync";
import Index from "./pages/Index";
import Markets from "./pages/Markets";
import Leaderboard from "./pages/Leaderboard";
import Groups from "./pages/Groups";
import Profile from "./pages/Profile";
import CreatePrediction from "./pages/CreatePrediction";
import Trades from "./pages/Trades";
import TradeJournal from "./pages/TradeJournal";
import PastTrades from "./pages/PastTrades";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RouterContent() {
  useTradeDetectorSync();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/markets" element={<Markets />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/groups" element={<Groups />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/trades" element={<Trades />} />
      <Route path="/journal" element={<TradeJournal />} />
      <Route path="/past-trades" element={<PastTrades />} />
      <Route path="/create-prediction" element={<CreatePrediction />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppContent() {
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouterContent />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
