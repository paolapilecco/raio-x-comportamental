import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';

export function GlobalDashboardButton() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on public pages, auth, dashboard itself, or when not logged in
  const hiddenPaths = ['/', '/auth', '/dashboard', '/reset-password'];
  const isPublicTest = location.pathname.startsWith('/t/');
  const shouldHide = !user || loading || hiddenPaths.includes(location.pathname) || isPublicTest;

  if (shouldHide) return null;

  return (
    <button
      onClick={() => navigate('/dashboard')}
      className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-card/90 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 shadow-lg"
      title="Voltar ao Dashboard"
      aria-label="Voltar ao Dashboard"
    >
      <Home className="w-5 h-5" />
    </button>
  );
}
