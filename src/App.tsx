import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CreateEvent from "./pages/CreateEvent";
import JoinEvent from "./pages/JoinEvent";
import HostDashboard from "./pages/HostDashboard";
import AnonymousChat from "./pages/AnonymousChat";
import Success from "./pages/Success";
import WaitingRoom from "./pages/WaitingRoom";
import Assignment from "./pages/Assignment";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CreateEvent />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/event/:eventId/join" element={<JoinEvent />} />
          <Route path="/event/:eventId/host" element={<HostDashboard />} />
          <Route path="/event/:eventId/success" element={<Success />} />
          <Route path="/event/:eventId/waiting/:participantId" element={<WaitingRoom />} />
          <Route path="/event/:eventId/assignment/:participantId" element={<Assignment />} />
          <Route path="/chat/:participantId" element={<AnonymousChat />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
