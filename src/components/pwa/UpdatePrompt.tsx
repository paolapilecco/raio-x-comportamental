import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpdatePrompt() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onControllerChange = () => window.location.reload();

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available');
            setNeedsUpdate(true);
          }
        });
      });
    });

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  const handleUpdate = () => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  if (!needsUpdate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-4 left-4 right-4 z-[9999] md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-xl shadow-xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Nova versão disponível</p>
            <p className="text-xs text-muted-foreground">Atualize para a versão mais recente</p>
          </div>
          <Button size="sm" onClick={handleUpdate}>Atualizar</Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
