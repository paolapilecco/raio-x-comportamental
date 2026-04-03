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
import Premium from "./pages/Premium";
import ResetPassword from "./pages/ResetPassword";
import AdminPrompts from "./pages/AdminPrompts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute><TestCatalog /></ProtectedRoute>} />
            <Route path="/diagnostic/:moduleSlug" element={<ProtectedRoute><Diagnostic /></ProtectedRoute>} />
            <Route path="/diagnostic" element={<ProtectedRoute><Diagnostic /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><DiagnosticHistory /></ProtectedRoute>} />
            <Route path="/central-report" element={<ProtectedRoute><CentralReport /></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin/prompts" element={<ProtectedRoute><AdminPrompts /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
