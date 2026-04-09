import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import HeroSection from '@/components/landing/HeroSection';
import SocialProofBar from '@/components/landing/SocialProofBar';
import PainSection from '@/components/landing/PainSection';
import ThreeLayersSection from '@/components/landing/ThreeLayersSection';
import ImageShowcaseSection from '@/components/landing/ImageShowcaseSection';
import DualPersonaSection from '@/components/landing/DualPersonaSection';
import MethodologySection from '@/components/landing/MethodologySection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import PricingSection from '@/components/landing/PricingSection';
import ChecklistSection from '@/components/landing/ChecklistSection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import LandingFooter from '@/components/landing/LandingFooter';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleStart = () => {
    if (user) navigate('/dashboard');
    else navigate('/auth');
  };

  const scrollToHow = () => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a href="#main-content" className="skip-to-content">Pular para o conteúdo</a>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <span className="text-sm font-bold tracking-tight text-white/90">
            Raio-X Mental
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors hidden sm:block"
            >
              Planos
            </button>
            <button
              onClick={handleStart}
              className="text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              Entrar
            </button>
          </div>
        </div>
      </nav>

      <HeroSection onStart={handleStart} onScrollToHow={scrollToHow} />
      <SocialProofBar />
      <PainSection />
      <ThreeLayersSection />
      <ImageShowcaseSection />
      <DualPersonaSection />
      <MethodologySection onStart={handleStart} />
      <TestimonialsSection />
      <PricingSection />
      <ChecklistSection />
      <FinalCTASection onStart={handleStart} />
      <LandingFooter />
    </div>
  );
};

export default Index;
