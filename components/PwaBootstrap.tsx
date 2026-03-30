'use client';

import { useEffect } from 'react';
import { registerAppServiceWorker } from '../lib/pwa-client';
import {
  clearDeferredInstallPrompt,
  setDeferredInstallPrompt,
  type DeferredInstallPromptEvent,
} from '../lib/pwa-install';

export default function PwaBootstrap() {
  useEffect(() => {
    void registerAppServiceWorker();

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as DeferredInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredInstallPrompt(installEvent);
      window.dispatchEvent(new Event('pwa-install-available'));
    };

    const handleInstalled = () => {
      clearDeferredInstallPrompt();
      window.dispatchEvent(new Event('pwa-installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  return null;
}
