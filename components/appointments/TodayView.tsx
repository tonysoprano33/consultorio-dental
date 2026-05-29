'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Calendar, Check, CheckCircle, Clock, DollarSign, MessageCircle, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import Tooltip from '../Tooltip';
import { formatLongDate, getTodayDateString } from '../../lib/date-utils';
import { buildMailtoUrl, getArrivalEmailDraft } from '../../lib/mail-drafts';
import { getStoredNotificationEmail } from '../../lib/notification-settings';
import { createClient } from '../../lib/supabase';
import { Appointment } from '../../types';
import AppointmentModal from './AppointmentModal';
import styles from './TodayView.module.css';
import { getDurationFromNotes, minutesToTime, timeToMinutes } from '../../lib/appointment-utils';

const supabase = createClient();
const SYSTEM_BLOCK_PATIENT_ID = 'b3614d2b-fa80-4c38-80b2-1458c78e4273';
const SYSTEM_FULL_PATIENT_ID = 'c4725e3c-ab91-4d49-91c3-2569d89f5384';

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

type PatientPreview = {
  id: string;
  name?: string | null;
  os?: string | null;
  phone?: string | null;
  payments?: { amount: number }[];
};

export default function TodayView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [savingArrivalId, setSavingArrivalId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const today = useMemo(() => getTodayDateString(), []);
  const todayLabel = useMemo(() => formatLongDate(today), [today]);

  const loadTodayAppointments = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase
      .from('appointments')
      .select('*, patient:patients(id, name, os, phone, payments:payments(amount))')
      .eq('date', today)
      .order('time', { ascending: true });

    setAppointments(data || []);
    setLoading(false);
  }, [today]);

  const getPatientBalance = (patient?: PatientPreview) => {
    if (!patient?.payments) return 0;
    // Note: We don't have a total_cost field in patients, but we can flag if they have no payments or a very low amount
    // For now, let's assume if they have 0 payments and visits, we might want to flag them, 
    // or if we had a treatment cost. Since we don't have a cost field, let's look at the payment history.
    // However, the user wants "debt alerts". Let's check if there's any logic for debt in the app.
    // Looking at the codebase, it seems debt is manually tracked or inferred.
    // I'll add a helper that returns true if we want to show a reminder.
    return patient.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  useEffect(() => {
    void loadTodayAppointments();

    const channel = supabase
      .channel('consultorio-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `date=eq.${today}` },
        () => {
          void loadTodayAppointments();
        }
      )
      .on(
        'broadcast',
        { event: 'patient-arrived' },
        () => {
          void loadTodayAppointments();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [today, loadTodayAppointments]);

  const toggleArrived = async (id: string) => {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) return;

    setSavingArrivalId(id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert('Tu sesión expiró. Volvé a iniciar sesión para marcar la llegada.');
        return;
      }

      const notifyToEmail = getStoredNotificationEmail();
      const response = await fetch('/api/appointments/arrived', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          appointmentId: id,
          notifyToEmail,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo actualizar el turno.');
      }

      const pushDelivered = typeof payload.push?.sentCount === 'number' && payload.push.sentCount > 0;
      const emailDelivered = Boolean(payload.email?.sent);

      if (payload.appointment?.status === 'arrived') {
        const patient = appointment.patient as PatientPreview | undefined;
        await supabase.channel('consultorio-global').send({
          type: 'broadcast',
          event: 'patient-arrived',
          payload: {
            id: appointment.id,
            patientName: patient?.name || 'Un paciente',
            time: appointment.time,
          },
        });

        if (
          !emailDelivered &&
          !pushDelivered &&
          notifyToEmail &&
          typeof payload.email?.reason === 'string' &&
          payload.email.reason.includes('SMTP')
        ) {
          const draft = getArrivalEmailDraft({
            date: appointment.date,
            time: appointment.time,
            reason: appointment.reason,
            patientName: patient?.name?.trim() || 'Paciente sin nombre',
            patientPhone: patient?.phone,
            patientInsurance: patient?.os,
          });

          window.location.href = buildMailtoUrl(notifyToEmail, draft.subject, draft.text);
        }
      }

      await loadTodayAppointments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el turno.';
      alert(message);
    } finally {
      setSavingArrivalId(null);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('¿Eliminar este turno?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    await loadTodayAppointments();
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${name}, te escribo del consultorio dental de la Dra. Nazarena para saludarte y estar en contacto. ¡Que tengas un buen día!`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const shareAppointment = (id: string) => {
    const url = `${window.location.origin}/turno/${id}`;
    void navigator.clipboard.writeText(url);
    alert('Link del turno copiado. Podes pegarlo en WhatsApp.');
  };

  const total = appointments.length;
  const arrivedCount = appointments.filter((appointment) => appointment.status === 'arrived').length;

  const isFullDay = appointments.some(a => a.patient_id === SYSTEM_FULL_PATIENT_ID);
  const isBlockedDay = appointments.some(a => a.patient_id === SYSTEM_BLOCK_PATIENT_ID);
  
  const displayAppointments = appointments.filter(a => 
    a.patient_id !== SYSTEM_BLOCK_PATIENT_ID && a.patient_id !== SYSTEM_FULL_PATIENT_ID
  );

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayAppointments.slice(start, start + itemsPerPage);
  }, [displayAppointments, currentPage]);

  const realTotal = displayAppointments.length;
  const realPending = displayAppointments.filter(a => a.status !== 'arrived').length;
  const totalPages = Math.ceil(realTotal / itemsPerPage);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Agenda de <em>hoy</em>
          </h1>
          <p className={styles.subtitle}>{todayLabel}</p>
        </div>

        <button
          onClick={() => {
            setEditingAppt(null);
            setModalOpen(true);
          }}
          className={styles.newButton}
        >
          <Plus size={14} />
          Nuevo turno
        </button>
      </div>

      {isBlockedDay && (
        <div className={styles.blockedBanner}>
          <div className={styles.bannerIcon} style={{ background: '#fee2e2', color: '#991b1b' }}>!</div>
          <div className={styles.bannerContent}>
            <p className={styles.bannerTitle}>DÍA NO LABORABLE</p>
            <p className={styles.bannerMuted}>La doctora no atiende en el día de hoy.</p>
          </div>
        </div>
      )}

      {isFullDay && (
        <div className={styles.fullBanner}>
          <div className={styles.bannerIcon} style={{ background: '#ffedd5', color: '#ea580c' }}>✓</div>
          <div className={styles.bannerContent}>
            <p className={styles.bannerTitle} style={{ color: '#ea580c' }}>AGENDA COMPLETA</p>
            <p className={styles.bannerMuted}>No se aceptan más turnos por hoy. ¡Día de mucho trabajo!</p>
          </div>
        </div>
      )}

      <div className={styles.statsGrid}>
        <StatCard
          icon={<Calendar size={18} color="var(--sage-dark)" />}
          iconBg="var(--sage)"
          value={realTotal}
          label="Turnos hoy"
        />
        <StatCard
          icon={<Clock size={18} color="var(--sage-dark)" />}
          iconBg="var(--sage-pale)"
          value={realPending}
          label="Pendientes"
        />
        <StatCard
          icon={<CheckCircle size={18} color="var(--lavender-dark)" />}
          iconBg="var(--lavender)"
          value={arrivedCount}
          label="Llegaron"
        />
      </div>

      <p className={styles.sectionLabel}>Turnos del día</p>

      {loading ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyMuted}>Cargando turnos...</p>
        </div>
      ) : displayAppointments.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>+</div>
          <p className={styles.emptyTitle}>Sin turnos para hoy</p>
          <p className={styles.emptyMuted}>Tocá Nuevo turno para agregar uno nuevo.</p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {paginatedAppointments.map((appointment) => {
              const patient = appointment.patient as PatientPreview | undefined;
              const isArrived = appointment.status === 'arrived';
              const isSaving = savingArrivalId === appointment.id;
              
              const duration = getDurationFromNotes(appointment.notes);
              const endMinutes = timeToMinutes(appointment.time) + duration;
              const endTime = minutesToTime(endMinutes);

              return (
                <div
                  key={appointment.id}
                  className={`${styles.appointmentCard} ${isArrived ? styles.appointmentCardArrived : ''}`}
                >
                  <div className={styles.patientRow}>
                    <div className={styles.timeCluster}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span className={styles.time}>{appointment.time}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: -2 }}>{endTime}</span>
                      </div>
                      <span className={styles.divider} />
                      <div className={`${styles.avatar} ${isArrived ? styles.avatarArrived : ''}`}>
                        {getInitials(patient?.name || '?')}
                      </div>
                    </div>

                    <div className={styles.copy}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p className={styles.patientName}>{patient?.name || 'Paciente sin nombre'}</p>
                        {patient && getPatientBalance(patient) === 0 && (
                          <Tooltip text="Paciente con saldo pendiente o sin pagos registrados 💰">
                            <div className={styles.debtAlert}>
                              <DollarSign size={10} />
                            </div>
                          </Tooltip>
                        )}
                      </div>
                      {patient?.phone && (
                        <p className={styles.patientPhone}>
                          <span className={styles.phoneLabel}>TEL:</span> {patient.phone}
                        </p>
                      )}
                      <div className={styles.metaRow}>
                        <span className={styles.reason}>{appointment.reason || 'Consulta'}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', background: 'var(--cream)', padding: '1px 5px', borderRadius: '4px' }}>{duration} min</span>
                        {patient?.os && <span className={styles.insurance}>{patient.os}</span>}
                      </div>
                    </div>
                  </div>

                  <div className={styles.controls}>
                    <Tooltip text={isArrived ? 'Quitar llegada ↩️' : 'Marcar llegada ✅'}>
                      <button
                        onClick={() => toggleArrived(appointment.id)}
                        disabled={isSaving}
                        className={`${styles.arrivedButton} ${isArrived ? styles.arrivedButtonDone : ''}`}
                      >
                        {isArrived && <Check size={13} />}
                        {isSaving ? 'Guardando...' : 'Llegó'}
                      </button>
                    </Tooltip>

                    <div className={styles.iconActions}>
                      {patient?.phone && (
                        <Tooltip text="Enviar WhatsApp 📱">
                          <button
                            onClick={() => openWhatsApp(patient.phone!, patient.name || 'Paciente')}
                            className={styles.iconButton}
                            style={{ borderColor: '#25D366', background: '#f0fff4' }}
                          >
                            <MessageCircle size={14} color="#25D366" />
                          </button>
                        </Tooltip>
                      )}

                      <Tooltip text="Compartir link 🔗">
                        <button
                          onClick={() => shareAppointment(appointment.id)}
                          className={styles.iconButton}
                        >
                          <Share2 size={14} color="var(--sage-deep)" />
                        </button>
                      </Tooltip>

                      <Tooltip text="Editar turno ✨">
                        <button
                          onClick={() => {
                            setEditingAppt(appointment);
                            setModalOpen(true);
                          }}
                          className={styles.iconButton}
                          aria-label="Editar turno"
                        >
                          <Pencil size={14} color="var(--muted)" />
                        </button>
                      </Tooltip>

                      <Tooltip text="Eliminar turno 🗑️">
                        <button
                          onClick={() => deleteAppointment(appointment.id)}
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          aria-label="Eliminar turno"
                        >
                          <Trash2 size={14} color="var(--danger-text)" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={styles.btnPagination}
                style={{ opacity: currentPage === 1 ? 0.4 : 1 }}
              >
                Anterior
              </button>
              <div className={styles.paginationInfo}>
                Página <strong>{currentPage}</strong> de {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className={styles.btnPagination}
                style={{ opacity: currentPage === totalPages ? 0.4 : 1 }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>
        <span className={styles.footerDot} />
        <span className={styles.footerText}>
          <strong>Consultorio Dental</strong> · Dra. Nazarena · Datos en Supabase
        </span>
        <span className={styles.footerDot} />
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editAppt={editingAppt}
        onSaved={loadTodayAppointments}
      />
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: ReactNode;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}
