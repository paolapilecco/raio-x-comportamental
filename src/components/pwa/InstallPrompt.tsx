import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    // Don't show in iframe (Lovable preview) or if already installed
    const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const isPreview = window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');

    if (isInIframe || isPreview || isInstalled || wasDismissed) {
      console.log('[PWA] Install prompt suppressed:', { isInIframe, isPreview, isInstalled, wasDismissed: !!wasDismissed });
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt captured');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS doesn't fire beforeinstallprompt — show manual instructions after delay
    if (platform === 'ios') {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [platform]);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      console.log('[PWA] Triggering native install prompt');
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      console.log('[PWA] No native prompt — showing instructions');
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (dismissed || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 relative overflow-hidden">
          {/* Glow accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          
          <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>

          {!showInstructions ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Instalar Raio-X</h3>
                  <p className="text-xs text-muted-foreground">Acesse rápido direto da tela inicial</p>
                </div>
              </div>
              <Button onClick={handleInstall} className="w-full" size="sm">
                <Smartphone className="w-4 h-4 mr-2" />
                Instalar agora
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <h3 className="font-semibold text-foreground text-sm">Como instalar</h3>
              {platform === 'ios' && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Share className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Toque no botão <strong className="text-foreground">Compartilhar</strong> (ícone de quadrado com seta) na barra do Safari</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Download className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Role e toque em <strong className="text-foreground">"Adicionar à Tela de Início"</strong></span>
                  </div>
                </div>
              )}
              {platform === 'android' && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Toque no menu <strong className="text-foreground">⋮</strong> (três pontos) no canto superior do Chrome</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Download className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Toque em <strong className="text-foreground">"Instalar app"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong></span>
                  </div>
                </div>
              )}
              {platform === 'desktop' && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Monitor className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Clique no ícone de <strong className="text-foreground">instalação</strong> (⊕) na barra de endereços do navegador</span>
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={handleDismiss}>
                Entendi
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
