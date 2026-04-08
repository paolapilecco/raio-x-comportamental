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
import Checkout from "./pages/Checkout";
import ResetPassword from "./pages/ResetPassword";
import ManagedPersons from "./pages/ManagedPersons";
import AdminPrompts from "./pages/AdminPrompts";
import AdminTestModules from "./pages/AdminTestModules";
import AdminQuestions from "./pages/AdminQuestions";
import AdminUsers from "./pages/AdminUsers";
import AdminRoadmap from "./pages/AdminRoadmap";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import NotFound from "./pages/NotFound";
import PatientDetail from "./pages/PatientDetail";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import PatientComparison from "./pages/PatientComparison";
import PublicTest from "./pages/PublicTest";

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
            <Route path="/t/:token" element={<PublicTest />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/pessoas" element={<ProtectedRoute><ManagedPersons /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute><TestCatalog /></ProtectedRoute>} />
            <Route path="/diagnostic/:moduleSlug" element={<ProtectedRoute><Diagnostic /></ProtectedRoute>} />
            <Route path="/diagnostic" element={<ProtectedRoute><Diagnostic /></ProtectedRoute>} />
            <Route path="/paciente/:personId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
            <Route path="/painel-profissional" element={<ProtectedRoute><ProfessionalDashboard /></ProtectedRoute>} />
            <Route path="/comparar-pacientes" element={<ProtectedRoute><PatientComparison /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><DiagnosticHistory /></ProtectedRoute>} />
            <Route path="/central-report" element={<ProtectedRoute><CentralReport /></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/prompts" element={<ProtectedRoute><AdminPrompts /></ProtectedRoute>} />
            <Route path="/admin/roadmap" element={<ProtectedRoute><AdminRoadmap /></ProtectedRoute>} />
            <Route path="/admin/test-modules" element={<ProtectedRoute><AdminTestModules /></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute><AdminQuestions /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminSubscriptions /></ProtectedRoute>} />
            <Route path="/admin/ai-config" element={<Navigate to="/admin/prompts" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
