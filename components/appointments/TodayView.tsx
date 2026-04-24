'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Calendar, Check, CheckCircle, Clock, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
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

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

type PatientPreview = {
  name?: string | null;
  os?: string | null;
  phone?: string | null;
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
      .select('*, patient:patients(id, name, os, phone)')
      .eq('date', today)
      .order('time', { ascending: true });

    setAppointments(data || []);
    setLoading(false);
  }, [today]);

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

  const shareAppointment = (id: string) => {
    const url = `${window.location.origin}/turno/${id}`;
    void navigator.clipboard.writeText(url);
    alert('Link del turno copiado. Podes pegarlo en WhatsApp.');
  };

  const total = appointments.length;
  const totalPages = Math.ceil(total / itemsPerPage);
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return appointments.slice(start, start + itemsPerPage);
  }, [appointments, currentPage]);

  const arrivedCount = appointments.filter((appointment) => appointment.status === 'arrived').length;
  const pendingCount = total - arrivedCount;

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

      <div className={styles.statsGrid}>
        <StatCard
          icon={<Calendar size={18} color="var(--sage-dark)" />}
          iconBg="var(--sage)"
          value={total}
          label="Turnos hoy"
        />
        <StatCard
          icon={<Clock size={18} color="var(--sage-dark)" />}
          iconBg="var(--sage-pale)"
          value={pendingCount}
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
      ) : appointments.length === 0 ? (
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
              const isSystemBlock = appointment.patient_id === SYSTEM_BLOCK_PATIENT_ID;
              
              const duration = getDurationFromNotes(appointment.notes);
              const endMinutes = timeToMinutes(appointment.time) + duration;
              const endTime = minutesToTime(endMinutes);

              if (isSystemBlock) {
                return (
                  <div key={appointment.id} className={styles.appointmentCard} style={{ backgroundColor: '#fee2e2', borderColor: '#f87171' }}>
                    <div className={styles.patientRow}>
                      <div className={styles.timeCluster}>
                        <span className={styles.time} style={{ color: '#991b1b' }}>{appointment.time}</span>
                        <span className={styles.divider} />
                        <div className={styles.avatar} style={{ backgroundColor: '#f87171', color: 'white' }}>!</div>
                      </div>
                      <div className={styles.copy}>
                        <p className={styles.patientName} style={{ color: '#991b1b' }}>DÍA NO LABORABLE</p>
                        <div className={styles.metaRow}>
                          <span className={styles.reason} style={{ color: '#b91c1c' }}>Bloqueo de agenda</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.controls}>
                      <button onClick={() => deleteAppointment(appointment.id)} className={`${styles.iconButton} ${styles.iconButtonDanger}`}>
                        <Trash2 size={14} color="#991b1b" />
                      </button>
                    </div>
                  </div>
                );
              }

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
                      <p className={styles.patientName}>{patient?.name || 'Paciente sin nombre'}</p>
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
