import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Diagnostic from "./pages/Diagnostic";
import Dashboard from "./pages/Dashboard";
import DiagnosticHistory from "./pages/DiagnosticHistory";
import TestCatalog from "./pages/TestCatalog";
import CentralReport from "./pages/CentralReport";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RequireProfile({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile && !isAdmin) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

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
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute><RequireProfile><TestCatalog /></RequireProfile></ProtectedRoute>} />
            <Route path="/diagnostic/:moduleSlug" element={<ProtectedRoute><RequireProfile><Diagnostic /></RequireProfile></ProtectedRoute>} />
            <Route path="/diagnostic" element={<ProtectedRoute><RequireProfile><Diagnostic /></RequireProfile></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><RequireProfile><Dashboard /></RequireProfile></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><RequireProfile><DiagnosticHistory /></RequireProfile></ProtectedRoute>} />
            <Route path="/central-report" element={<ProtectedRoute><RequireProfile><CentralReport /></RequireProfile></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><RequireProfile><Profile /></RequireProfile></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
