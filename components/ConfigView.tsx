'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle,
  Download,
  Info,
  LogOut,
  MessageSquare,
  Save,
  Send,
  Shield,
  Smartphone,
} from 'lucide-react';
import { getBrowserNotificationPermission } from '../lib/browser-notifications';
import {
  getDeviceLabel,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  triggerInstallPrompt,
  unsubscribeFromPushNotifications,
} from '../lib/pwa-client';
import { getDeferredInstallPrompt, isIosDevice, isPushSupported, isStandaloneMode } from '../lib/pwa-install';
import { createClient } from '../lib/supabase';
import styles from './ConfigView.module.css';

const supabase = createClient();

type FeedbackTone = 'default' | 'success' | 'warning' | 'error';

type PushState = {
  supported: boolean;
  installed: boolean;
  ios: boolean;
  installReady: boolean;
  subscribed: boolean;
  permission: 'default' | 'granted' | 'denied' | 'unsupported';
};

const initialPushState: PushState = {
  supported: false,
  installed: false,
  ios: false,
  installReady: false,
  subscribed: false,
  permission: 'default',
};

export default function ConfigView({ onLogout }: { onLogout?: () => void | Promise<void> }) {
  const [pushState, setPushState] = useState<PushState>(initialPushState);
  const [pushBusy, setPushBusy] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null);

  const publicVapidKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();

  const refreshPushState = async () => {
    const supported = isPushSupported() && Boolean(publicVapidKey);
    const installed = isStandaloneMode();
    const ios = isIosDevice();
    const installReady = Boolean(getDeferredInstallPrompt());
    const permission = getBrowserNotificationPermission();
    const subscription = supported ? await getExistingPushSubscription() : null;

    setPushState({
      supported,
      installed,
      ios,
      installReady,
      subscribed: Boolean(subscription),
      permission,
    });
  };

  useEffect(() => {
    void refreshPushState();

    const refresh = () => {
      void refreshPushState();
    };

    window.addEventListener('pwa-install-available', refresh);
    window.addEventListener('pwa-installed', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('pwa-install-available', refresh);
      window.removeEventListener('pwa-installed', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const showFeedback = (text: string, tone: FeedbackTone = 'default') => {
    setFeedback({ text, tone });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activatePush = async () => {
    if (!publicVapidKey) {
      showFeedback('Faltan las claves push del servidor.', 'error');
      return;
    }

    if (pushState.ios && !pushState.installed) {
      showFeedback('En iPhone, primero agrega la app a la pantalla de inicio desde Safari.', 'warning');
      return;
    }

    setPushBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesion expirada.');

      const subscription = await subscribeToPushNotifications(publicVapidKey);
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscription,
          deviceName: `${getDeviceLabel()}${pushState.installed ? ' - App instalada' : ''}`,
        }),
      });

      if (!response.ok) throw new Error('Error en el servidor al suscribir.');

      await refreshPushState();
      showFeedback('Notificaciones push activadas en este dispositivo.', 'success');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'Error al activar push.', 'error');
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesion expirada.');

      const endpoint = await unsubscribeFromPushNotifications();
      if (!endpoint) {
        showFeedback('No habia una suscripcion activa en este equipo.', 'warning');
        await refreshPushState();
        return;
      }

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ endpoint }),
      });

      await refreshPushState();
      showFeedback('Notificaciones push desactivadas.', 'default');
    } catch (error) {
      showFeedback('Error al desactivar push.', 'error');
    } finally {
      setPushBusy(false);
    }
  };

  const sendPushTest = async () => {
    setTestingPush(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const payload = await response.json();
      if (payload.push?.sentCount > 0) {
        showFeedback('Push de prueba enviada con éxito.', 'success');
      } else {
        showFeedback('No hay dispositivos suscriptos para recibir la prueba.', 'warning');
      }
    } catch (error) {
      showFeedback('Error al enviar la prueba push.', 'error');
    } finally {
      setTestingPush(false);
    }
  };

  const sendTelegramTest = async () => {
    setTestingTelegram(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Usamos el endpoint de arribo con un ID ficticio o un endpoint dedicado de test si existiera
      // Para esta versión, forzamos un mensaje de test vía una nueva API o reutilizando la lógica
      const response = await fetch('/api/push/test', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ type: 'telegram' }) 
      });
      
      showFeedback('Se solicitó un mensaje de prueba al Bot de Telegram.', 'success');
    } catch (error) {
      showFeedback('Error al conectar con el Bot de Telegram.', 'error');
    } finally {
      setTestingTelegram(false);
    }
  };

  const installApp = async () => {
    if (pushState.installReady) {
      const accepted = await triggerInstallPrompt();
      if (accepted) showFeedback('App instalada. Ábrela desde el inicio y activa las alertas.', 'success');
      void refreshPushState();
      return;
    }
    showFeedback(pushState.ios ? 'En Safari: toca Compartir y Agregar a pantalla de inicio.' : 'Usa el menú del navegador para "Instalar aplicación".', 'default');
  };

  const handleLogout = async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    await supabase.auth.signOut();
    await onLogout?.();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Configuracion <em>&</em> alertas</h1>
          <p className={styles.subtitle}>Gestiona como recibes los avisos de tus pacientes.</p>
        </div>
        <span className={styles.version}>v4.0</span>
      </div>

      {feedback && (
        <FeedbackBanner tone={feedback.tone}>{feedback.text}</FeedbackBanner>
      )}

      <SectionLabel>Canales Activos</SectionLabel>

      <Card>
        <CardHeader
          icon={<MessageSquare size={20} color="var(--sage-dark)" />}
          iconBg="var(--sage-pale)"
          title="Bot de Telegram"
          desc="Notificaciones instantaneas con motivo y observaciones del paciente."
        />
        <div className={styles.statusGrid}>
          <StatusPill label="Estado" value="Configurado" tone="success" />
          <StatusPill label="Chat ID" value="8303057631" tone="default" />
        </div>
        <div className={styles.buttonRow}>
          <button onClick={sendTelegramTest} disabled={testingTelegram} className={styles.primaryButton}>
            <Send size={15} />
            {testingTelegram ? 'Probando...' : 'Probar Bot de Telegram'}
          </button>
        </div>
        <InfoBox>
          Este canal es el mas robusto. Recibiras un mensaje cada vez que una secretaria marque que un paciente llego a la sala.
        </InfoBox>
      </Card>

      <Card>
        <CardHeader
          icon={<Smartphone size={20} color="var(--lavender-dark)" />}
          iconBg="var(--lavender)"
          title="Notificaciones Push"
          desc="Alertas nativas en tu iPhone o Android (requiere instalar la app)."
        />
        <div className={styles.statusGrid}>
          <StatusPill label="Instalada" value={pushState.installed ? 'Si' : 'No'} tone={pushState.installed ? 'success' : 'default'} />
          <StatusPill label="Suscripcion" value={pushState.subscribed ? 'Activa' : 'Inactiva'} tone={pushState.subscribed ? 'success' : 'warning'} />
        </div>
        <div className={styles.buttonRow}>
          <button onClick={installApp} className={styles.ghostButton}>
            <Download size={15} />
            {pushState.installed ? 'App Instalada' : 'Instalar App'}
          </button>
          <button onClick={pushState.subscribed ? disablePush : activatePush} disabled={pushBusy} className={styles.ghostButton}>
            <BellRing size={15} />
            {pushBusy ? 'Procesando...' : pushState.subscribed ? 'Desactivar Push' : 'Activar Push'}
          </button>
          <button onClick={sendPushTest} disabled={testingPush} className={styles.ghostButton}>
            <Send size={15} />
            {testingPush ? 'Probando...' : 'Probar Push'}
          </button>
        </div>
      </Card>

      <SectionLabel>Ayuda de Instalacion</SectionLabel>
      <Card>
        <div className={styles.guideBox}>
          <div className={styles.guideStep}>
            <strong>iPhone / iPad:</strong> Abrir en Safari, tocar "Compartir" (cuadrado con flecha) y elegir "Agregar a pantalla de inicio".
          </div>
          <div className={styles.guideStep}>
            <strong>Android:</strong> Tocar los tres puntos del navegador y elegir "Instalar aplicación" o "Agregar a pantalla de inicio".
          </div>
        </div>
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={handleLogout} className={styles.dangerButton}>
          <LogOut size={16} />
          Cerrar sesion del consultorio
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={styles.sectionLabel}>{children}</p>;
}

function Card({ children }: { children: ReactNode }) {
  return <section className={styles.card}>{children}</section>;
}

function CardHeader({ icon, iconBg, title, desc }: { icon: ReactNode; iconBg: string; title: string; desc: string }) {
  return (
    <div className={styles.cardHeader}>
      <div className={styles.cardIcon} style={{ background: iconBg }}>{icon}</div>
      <div>
        <p className={styles.cardTitle}>{title}</p>
        <p className={styles.cardDesc}>{desc}</p>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className={styles.infoBox}>
      <Info size={14} color="var(--muted)" />
      <div>{children}</div>
    </div>
  );
}

function FeedbackBanner({ children, tone }: { children: ReactNode; tone: FeedbackTone }) {
  return (
    <div className={`${styles.feedback} ${styles[`feedback${tone.charAt(0).toUpperCase() + tone.slice(1)}`]}`}>
      {tone === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
      <span>{children}</span>
    </div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: 'default' | 'success' | 'warning' }) {
  const toneClass = tone === 'success' ? styles.statusSuccess : tone === 'warning' ? styles.statusWarning : '';
  return (
    <div className={`${styles.statusPill} ${toneClass}`}>
      <span className={styles.statusLabel}>{label}</span>
      <strong className={styles.statusValue}>{value}</strong>
    </div>
  );
}
