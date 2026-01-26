import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Buildings from "./pages/Buildings";
import Units from "./pages/Units";
import Maintenance from "./pages/Maintenance";
import Fees from "./pages/Fees";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/buildings" element={<Buildings />} />
            <Route path="/units" element={<Units />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/residents" element={<Navigate to="/units" replace />} />
            <Route path="/estimates" element={<Navigate to="/maintenance" replace />} />
            <Route path="/announcements" element={<Navigate to="/dashboard" replace />} />
            <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
            <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
