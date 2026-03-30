'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle,
  Download,
  Info,
  LogOut,
  Mail,
  Save,
  Send,
  Shield,
  Smartphone,
} from 'lucide-react';
import { getBrowserNotificationPermission } from '../lib/browser-notifications';
import { buildMailtoUrl, getTestEmailDraft } from '../lib/mail-drafts';
import {
  getDeviceLabel,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  triggerInstallPrompt,
  unsubscribeFromPushNotifications,
} from '../lib/pwa-client';
import { getDeferredInstallPrompt, isIosDevice, isPushSupported, isStandaloneMode } from '../lib/pwa-install';
import { createClient } from '../lib/supabase';
import { getStoredNotificationEmail, setStoredNotificationEmail } from '../lib/notification-settings';
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
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [pushState, setPushState] = useState<PushState>(initialPushState);
  const [pushBusy, setPushBusy] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null);

  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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
    setEmail(getStoredNotificationEmail());
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

  const saveEmail = () => {
    setStoredNotificationEmail(email);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2800);
  };

  const sendTestEmail = async () => {
    setTestingEmail(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('La sesion expiro. Volve a iniciar sesion.');
      }

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          toEmail: email.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (email.trim() && typeof payload.error === 'string' && payload.error.includes('SMTP')) {
          const draft = getTestEmailDraft();
          window.location.href = buildMailtoUrl(email.trim(), draft.subject, draft.text);
          setPushFeedback({
            tone: 'default',
            text: 'Todavia no hay una casilla conectada al servidor. Te abrimos un borrador del correo para probarlo igual.',
          });
          return;
        }

        throw new Error(payload.error || 'No se pudo enviar el email de prueba.');
      }

      setPushFeedback({
        tone: 'success',
        text: 'El correo de prueba salio correctamente.',
      });
    } catch (error) {
      setPushFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo enviar el correo de prueba.',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const activatePush = async () => {
    if (!publicVapidKey) {
      setPushFeedback({
        tone: 'error',
        text: 'Faltan las claves push del servidor. Voy a dejarlo configurado en el deploy.',
      });
      return;
    }

    if (pushState.ios && !pushState.installed) {
      setPushFeedback({
        tone: 'warning',
        text: 'En iPhone, primero abre esta web en Safari y agrega la app a la pantalla de inicio.',
      });
      return;
    }

    setPushBusy(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('La sesion expiro. Volve a iniciar sesion.');
      }

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

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo activar la push en este dispositivo.');
      }

      await refreshPushState();

      setPushFeedback({
        tone: 'success',
        text: 'Listo. Este iPhone o Android ya queda suscripto para avisarle a la doctora cuando llegue un paciente.',
      });
    } catch (error) {
      setPushFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo activar la push.',
      });
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('La sesion expiro. Volve a iniciar sesion.');
      }

      const endpoint = await unsubscribeFromPushNotifications();

      if (!endpoint) {
        setPushFeedback({
          tone: 'warning',
          text: 'Este dispositivo no tenia una suscripcion activa.',
        });
        await refreshPushState();
        return;
      }

      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpoint,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo desactivar la push en este dispositivo.');
      }

      await refreshPushState();

      setPushFeedback({
        tone: 'default',
        text: 'Las alertas push quedaron desactivadas en este dispositivo.',
      });
    } catch (error) {
      setPushFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo desactivar la push.',
      });
    } finally {
      setPushBusy(false);
    }
  };

  const sendPushTest = async () => {
    setTestingPush(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('La sesion expiro. Volve a iniciar sesion.');
      }

      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo enviar la push de prueba.');
      }

      if (payload.push?.sentCount > 0) {
        setPushFeedback({
          tone: 'success',
          text: 'Push de prueba enviada. Revisa el centro de notificaciones del telefono.',
        });
      } else {
        setPushFeedback({
          tone: 'warning',
          text: payload.push?.reason || 'No hay dispositivos suscriptos todavia.',
        });
      }
    } catch (error) {
      setPushFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo enviar la push de prueba.',
      });
    } finally {
      setTestingPush(false);
    }
  };

  const installApp = async () => {
    if (pushState.installReady) {
      const accepted = await triggerInstallPrompt();
      setPushFeedback({
        tone: accepted ? 'success' : 'default',
        text: accepted
          ? 'La app quedo instalada. Abrela desde el inicio del telefono y despues activa las alertas.'
          : 'La instalacion quedo pendiente. Puedes intentarlo de nuevo cuando quieras.',
      });
      window.setTimeout(() => {
        void refreshPushState();
      }, 1000);
      return;
    }

    if (pushState.ios) {
      setPushFeedback({
        tone: 'default',
        text: 'En Safari: toca Compartir y despues Agregar a pantalla de inicio.',
      });
      return;
    }

    setPushFeedback({
      tone: 'warning',
      text: 'En Android usa el boton Instalar del navegador o el menu de tres puntos.',
    });
  };

  const handleLogout = async () => {
    if (!confirm('Cerrar sesion?')) return;
    try {
      await supabase.auth.signOut();
      await onLogout?.();
    } catch (error) {
      setPushFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo cerrar la sesión.',
      });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Configuracion <em>&</em> alertas
          </h1>
          <p className={styles.subtitle}>Deja lista la app de la doctora y el fallback por correo.</p>
        </div>
        <span className={styles.version}>v3.0</span>
      </div>

      <SectionLabel>App de la doctora</SectionLabel>

      <Card>
        <CardHeader
          icon={<Smartphone size={20} color="var(--sage-dark)" />}
          iconBg="var(--sage)"
          title="PWA para iPhone y Android"
          desc="Instala la app en el celular de la doctora y activa alertas push incluso con la app cerrada."
        />

        <div className={styles.statusGrid}>
          <StatusPill label="Instalada" value={pushState.installed ? 'Si' : 'No'} tone={pushState.installed ? 'success' : 'default'} />
          <StatusPill label="Push" value={pushState.subscribed ? 'Activa' : 'Pendiente'} tone={pushState.subscribed ? 'success' : 'warning'} />
          <StatusPill label="Permiso" value={permissionLabel(pushState.permission)} tone={permissionTone(pushState.permission)} />
          <StatusPill label="Plataforma" value={pushState.ios ? 'iPhone/iPad' : 'Android/desktop'} tone="default" />
        </div>

        <div className={styles.buttonRow}>
          <button onClick={installApp} className={styles.primaryButton}>
            <Download size={15} />
            {pushState.installed ? 'App instalada' : pushState.ios ? 'Ver como instalar' : 'Instalar app'}
          </button>

          {!pushState.subscribed ? (
            <button onClick={activatePush} disabled={pushBusy} className={styles.ghostButton}>
              <BellRing size={15} />
              {pushBusy ? 'Activando...' : 'Activar alertas push'}
            </button>
          ) : (
            <button onClick={disablePush} disabled={pushBusy} className={styles.ghostButton}>
              <BellRing size={15} />
              {pushBusy ? 'Quitando...' : 'Desactivar push'}
            </button>
          )}

          <button onClick={sendPushTest} disabled={testingPush} className={styles.ghostButton}>
            <Send size={15} />
            {testingPush ? 'Enviando...' : 'Enviar push de prueba'}
          </button>
        </div>

        <InfoBox>
          Activa esto solo en el iPhone o Android de la doctora. Si usan el mismo usuario del consultorio en todos los dispositivos, las secretarias no toquen este boton en sus equipos.
        </InfoBox>

        <InfoBox tone="warning">
          En iPhone, las push web funcionan cuando la app fue agregada a la pantalla de inicio desde Safari. En Android, suele aparecer un boton de instalar del navegador.
        </InfoBox>

        {pushFeedback && (
          <FeedbackBanner tone={pushFeedback.tone}>{pushFeedback.text}</FeedbackBanner>
        )}
      </Card>

      <SectionLabel>Correo de respaldo</SectionLabel>

      <Card>
        <CardHeader
          icon={<Mail size={20} color="var(--rose-dark)" />}
          iconBg="var(--rose)"
          title="Notificaciones por correo"
          desc="Sirve como respaldo para avisos del sistema si quieres usar email ademas de la push."
        />

        <label className={styles.label}>Direccion de email</label>
        <div className={styles.inputWrap}>
          <Mail size={16} color="var(--faint)" className={styles.inputIcon} />
          <input
            type="email"
            placeholder="nazarena@consultorio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.buttonRow}>
          <button onClick={saveEmail} className={styles.primaryButton}>
            <Save size={15} />
            Guardar correo
          </button>

          <button onClick={sendTestEmail} disabled={testingEmail} className={styles.ghostButton}>
            <Send size={15} />
            {testingEmail ? 'Enviando prueba...' : 'Enviar prueba'}
          </button>
        </div>

        <InfoBox>
          Si dejas este campo vacio, el sistema intentara usar <strong>NOTIFY_TO_EMAIL</strong> del servidor.
        </InfoBox>

        <InfoBox>
          Hoy la via recomendada para la doctora es la push PWA. El email queda como respaldo, no como canal principal.
        </InfoBox>

        {saved && (
          <FeedbackBanner tone="success">Correo de respaldo guardado correctamente.</FeedbackBanner>
        )}
      </Card>

      <SectionLabel>Acceso</SectionLabel>

      <Card>
        <CardHeader
          icon={<Shield size={20} color="var(--lavender-dark)" />}
          iconBg="var(--lavender)"
          title="Sesion y seguridad"
          desc="La app sigue protegida por login y usa la sesion actual para guardar la configuracion de alertas."
        />

        <div className={styles.securityCard}>
          <div className={styles.securityIcon}>
            <Shield size={22} color="var(--lavender-dark)" />
          </div>
          <div className={styles.securityCopy}>
            <p className={styles.securityTitle}>Sesion activa del consultorio</p>
            <p className={styles.securityText}>
              Las suscripciones push quedan asociadas al usuario con el que iniciaste sesion.
            </p>
          </div>
        </div>

        <button onClick={handleLogout} className={styles.dangerButton}>
          <LogOut size={16} />
          Cerrar sesion
        </button>
      </Card>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={styles.sectionLabel}>{children}</p>;
}

function Card({ children }: { children: ReactNode }) {
  return <section className={styles.card}>{children}</section>;
}

function CardHeader({
  icon,
  iconBg,
  title,
  desc,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  desc: string;
}) {
  return (
    <div className={styles.cardHeader}>
      <div className={styles.cardIcon} style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <p className={styles.cardTitle}>{title}</p>
        <p className={styles.cardDesc}>{desc}</p>
      </div>
    </div>
  );
}

function InfoBox({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className={`${styles.infoBox} ${tone === 'warning' ? styles.infoBoxWarning : ''}`}>
      {tone === 'warning' ? (
        <AlertCircle size={14} color="var(--danger-text)" />
      ) : (
        <Info size={14} color="var(--muted)" />
      )}
      <div>{children}</div>
    </div>
  );
}

function FeedbackBanner({
  children,
  tone,
}: {
  children: ReactNode;
  tone: FeedbackTone;
}) {
  return (
    <div
      className={`${styles.feedback} ${
        tone === 'success'
          ? styles.feedbackSuccess
          : tone === 'warning'
            ? styles.feedbackWarning
            : tone === 'error'
              ? styles.feedbackError
              : ''
      }`}
    >
      {tone === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
      <span>{children}</span>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'success' | 'warning';
}) {
  return (
    <div className={`${styles.statusPill} ${tone === 'success' ? styles.statusSuccess : tone === 'warning' ? styles.statusWarning : ''}`}>
      <span className={styles.statusLabel}>{label}</span>
      <strong className={styles.statusValue}>{value}</strong>
    </div>
  );
}

function permissionLabel(permission: PushState['permission']) {
  if (permission === 'granted') return 'Permitido';
  if (permission === 'denied') return 'Bloqueado';
  if (permission === 'unsupported') return 'No disponible';
  return 'Pendiente';
}

function permissionTone(permission: PushState['permission']) {
  if (permission === 'granted') return 'success' as const;
  if (permission === 'denied') return 'warning' as const;
  return 'default' as const;
}
