import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Buildings from "./pages/Buildings";
import Units from "./pages/Units";
import Residents from "./pages/Residents";
import Fees from "./pages/Fees";
import Settings from "./pages/Settings";
import Announcements from "./pages/Announcements";
import Documents from "./pages/Documents";
import CondoFees from "./pages/CondoFees";
import Assistant from "./pages/Assistant";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
            <Route path="/residents" element={<Residents />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/requests/new" element={<RequestDetail />} />
            <Route path="/requests/:id" element={<RequestDetail />} />
            <Route path="/maintenance" element={<Navigate to="/requests" replace />} />
            <Route path="/estimates" element={<Navigate to="/requests" replace />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/condo-fees" element={<CondoFees />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
            <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
