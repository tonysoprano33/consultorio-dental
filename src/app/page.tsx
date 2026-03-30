'use client';

import dynamic from 'next/dynamic';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarDays, Clock3, Settings, Users } from 'lucide-react';
import { getTodayDateString } from '../../lib/date-utils';
import { showBrowserNotification } from '../../lib/browser-notifications';
import { createClient } from '../../lib/supabase';
import styles from './page.module.css';

const supabase = createClient();

const TodayView = dynamic(() => import('../../components/appointments/TodayView'), {
  ssr: false,
  loading: () => <SectionLoading title="Cargando agenda" description="Preparando los turnos de hoy." />,
});

const AllAppointments = dynamic(() => import('../../components/appointments/AllAppointments'), {
  ssr: false,
  loading: () => <SectionLoading title="Cargando turnos" description="Buscando el historial de la agenda." />,
});

const PatientsView = dynamic(() => import('../../components/patients/PatientsView'), {
  ssr: false,
  loading: () => <SectionLoading title="Cargando pacientes" description="Preparando la ficha del consultorio." />,
});

const RemindersView = dynamic(() => import('../../components/reminders/RemindersView'), {
  ssr: false,
  loading: () => <SectionLoading title="Cargando recordatorios" description="Armando los avisos del dia." />,
});

const ConfigView = dynamic(() => import('../../components/ConfigView'), {
  ssr: false,
  loading: () => <SectionLoading title="Cargando configuracion" description="Preparando las alertas y la app movil." />,
});

const LoginView = dynamic(() => import('../../components/LoginView'), {
  ssr: false,
  loading: () => <SectionLoading title="Abriendo acceso" description="Preparando la pantalla de inicio de sesion." />,
});

const tabs = [
  { id: 'hoy', label: 'Hoy', icon: Clock3 },
  { id: 'turnos', label: 'Turnos', icon: CalendarDays },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'recordatorios', label: 'Recordatorios', icon: BellRing },
  { id: 'config', label: 'Configuracion', icon: Settings },
] as const;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('hoy');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();
      setSession(nextSession);
    } catch (error) {
      console.error('No se pudo verificar la sesion luego del login.', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setSession(null);
    setActiveTab('hoy');
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadingFallback = window.setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 4500);

    const loadSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        setSession(session);
      } catch (error) {
        console.error('No se pudo recuperar la sesion inicial.', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        window.clearTimeout(loadingFallback);
      }
    };

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingFallback);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const today = getTodayDateString();
    const channel = supabase
      .channel(`appointments-notify-${today}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `date=eq.${today}` },
        async (payload) => {
          const previous = payload.old as { status?: string } | null;
          const current = payload.new as { id?: string; status?: string; patient_id?: string; time?: string } | null;

          if (!current?.id || current.status !== 'arrived' || previous?.status === 'arrived') {
            return;
          }

          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            return;
          }

          let patientName = 'Un paciente';

          if (current.patient_id) {
            const { data } = await supabase.from('patients').select('name').eq('id', current.patient_id).maybeSingle();
            patientName = data?.name || patientName;
          }

          showBrowserNotification('Paciente en sala', {
            body: `${patientName} llego y esta en la sala de espera${current.time ? ` - ${current.time}` : ''}.`,
            tag: `appointment-arrived-${current.id}`,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingIcon}>
            <Clock3 size={24} />
          </div>
          <p className={styles.loadingTitle}>Preparando acceso...</p>
          <p className={styles.loadingText}>Si tarda de mas en el celular, te mostramos el login igual para que puedas entrar.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginView onLogin={handleLogin} />;
  }

  const activeView = useMemo(() => {
    if (activeTab === 'hoy') return <TodayView />;
    if (activeTab === 'turnos') return <AllAppointments />;
    if (activeTab === 'pacientes') return <PatientsView />;
    if (activeTab === 'recordatorios') return <RemindersView />;
    return <ConfigView onLogout={handleLogout} />;
  }, [activeTab, handleLogout]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <div className={styles.heroBrand}>
            Consultorio <em>Dental</em>
          </div>
          <p className={styles.heroTagline}>Agenda compartida para secretarias y doctora, optimizada para celular.</p>
        </div>
        <div className={styles.heroMeta}>Dra. Nazarena</div>
      </div>

      <div className={styles.tabsShell}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                startTransition(() => setActiveTab(tab.id));
              }}
              className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <main className={styles.main}>{activeView}</main>
    </div>
  );
}

function SectionLoading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionLoading}>
      <div className={styles.sectionLoadingDot} />
      <div>
        <p className={styles.sectionLoadingTitle}>{title}</p>
        <p className={styles.sectionLoadingText}>{description}</p>
      </div>
    </div>
  );
}
