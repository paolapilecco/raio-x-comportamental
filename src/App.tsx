import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GlobalDashboardButton } from "@/components/GlobalDashboardButton";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";

// Critical path – eagerly loaded
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (split into separate chunks)
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DiagnosticHistory = lazy(() => import("./pages/DiagnosticHistory"));
const TestCatalog = lazy(() => import("./pages/TestCatalog"));
const CentralReport = lazy(() => import("./pages/CentralReport"));
const Profile = lazy(() => import("./pages/Profile"));
const Premium = lazy(() => import("./pages/Premium"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ManagedPersons = lazy(() => import("./pages/ManagedPersons"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const ProfessionalDashboard = lazy(() => import("./pages/ProfessionalDashboard"));
const PatientComparison = lazy(() => import("./pages/PatientComparison"));
const PublicTest = lazy(() => import("./pages/PublicTest"));
const Tracking = lazy(() => import("./pages/Tracking"));
const TrackingDetail = lazy(() => import("./pages/TrackingDetail"));

// Admin pages – lazy-loaded (rarely visited)
const AdminPrompts = lazy(() => import("./pages/AdminPrompts"));
const AdminTestModules = lazy(() => import("./pages/AdminTestModules"));
const AdminQuestions = lazy(() => import("./pages/AdminQuestions"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminRoadmap = lazy(() => import("./pages/AdminRoadmap"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminSubscriptions = lazy(() => import("./pages/AdminSubscriptions"));
const AdminEmails = lazy(() => import("./pages/AdminEmails"));
const AdminDocs = lazy(() => import("./pages/AdminDocs"));
const AdminRetestConfig = lazy(() => import("./pages/AdminRetestConfig"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const queryClient = new QueryClient();

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children, skipOnboardingCheck = false }: { children: React.ReactNode; skipOnboardingCheck?: boolean }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LazyFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!skipOnboardingCheck && !profile) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GlobalDashboardButton />
          <InstallPrompt />
          <UpdatePrompt />
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/t/:token" element={<PublicTest />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><Onboarding /></ProtectedRoute>} />
              <Route path="/pessoas" element={<ProtectedRoute><ManagedPersons /></ProtectedRoute>} />
              <Route path="/tests" element={<ProtectedRoute><TestCatalog /></ProtectedRoute>} />
              <Route path="/diagnostic/:moduleSlug" element={<ProtectedRoute><Diagnostic /></ProtectedRoute>} />
              <Route path="/diagnostic" element={<ProtectedRoute><Diagnostic /></ProtectedRoute>} />
              <Route path="/paciente/:personId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
              <Route path="/painel-profissional" element={<ProtectedRoute><ProfessionalDashboard /></ProtectedRoute>} />
              <Route path="/comparar-pacientes" element={<ProtectedRoute><PatientComparison /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><DiagnosticHistory /></ProtectedRoute>} />
              <Route path="/acompanhamento" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
              <Route path="/acompanhamento/:testModuleId" element={<ProtectedRoute><TrackingDetail /></ProtectedRoute>} />
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
              <Route path="/admin/emails" element={<ProtectedRoute><AdminEmails /></ProtectedRoute>} />
              <Route path="/admin/docs" element={<ProtectedRoute><AdminDocs /></ProtectedRoute>} />
              <Route path="/admin/retest-config" element={<ProtectedRoute><AdminRetestConfig /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
              <Route path="/admin/ai-config" element={<Navigate to="/admin/prompts" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
