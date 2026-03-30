'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, CheckCircle2, Copy, MessageCircle, RefreshCcw } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { addDaysToDateString, formatLongDate, getTodayDateString } from '../../lib/date-utils';
import { buildReminderMessage, buildWhatsappUrl, normalizeWhatsappPhone } from '../../lib/reminders';
import { Appointment } from '../../types';

const supabase = createClient();

export default function RemindersView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const today = useMemo(() => getTodayDateString(), []);
  const tomorrow = useMemo(() => addDaysToDateString(today, 1), [today]);

  const loadAppointments = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('appointments')
      .select('*, patient:patients(id, name, os, phone)')
      .in('date', [today, tomorrow])
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAppointments();
  }, [today, tomorrow]);

  const todayAppointments = appointments.filter((appointment) => appointment.date === today);
  const tomorrowAppointments = appointments.filter((appointment) => appointment.date === tomorrow);
  const readyContacts = appointments.filter((appointment) =>
    Boolean(normalizeWhatsappPhone((appointment.patient as { phone?: string | null } | undefined)?.phone))
  ).length;

  const copyReminder = async (appointment: Appointment) => {
    try {
      await navigator.clipboard.writeText(buildReminderMessage(appointment));
      setCopiedId(appointment.id);
      window.setTimeout(() => setCopiedId((current) => (current === appointment.id ? null : current)), 1800);
    } catch {
      alert('No se pudo copiar el mensaje.');
    }
  };

  const openWhatsapp = (appointment: Appointment) => {
    const patient = appointment.patient as { phone?: string | null } | undefined;
    const url = buildWhatsappUrl(patient?.phone, buildReminderMessage(appointment));

    if (!url) {
      alert('Guarda el telefono con codigo de pais para abrir WhatsApp.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem 4rem', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--cfg-border)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 30, color: 'var(--ink)', letterSpacing: '-0.5px', lineHeight: 1 }}>
            Recordatorios <em style={{ fontStyle: 'italic', color: 'var(--rose-deep)' }}>gratis</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, fontWeight: 300 }}>
            WhatsApp Web con mensaje listo, sin APIs pagas.
          </p>
        </div>
        <button onClick={loadAppointments} style={btnGhost}>
          <RefreshCcw size={14} />
          Actualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <StatCard icon={<CalendarClock size={18} color="var(--sage-dark)" />} value={todayAppointments.length} label="Para hoy" />
        <StatCard icon={<BellRing size={18} color="var(--rose-dark)" />} value={tomorrowAppointments.length} label="Para manana" />
        <StatCard icon={<CheckCircle2 size={18} color="var(--lavender-dark)" />} value={readyContacts} label="Con WhatsApp listo" />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'white', border: '1px solid var(--cfg-border)', borderRadius: 16, padding: '1rem 1.1rem', marginBottom: '1.5rem' }}>
        <BellRing size={16} color="var(--rose-deep)" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.65 }}>
          Los recordatorios salen manualmente desde WhatsApp Web para mantener el flujo gratis. Si guardas el telefono con codigo de pais, el mensaje se abre listo para enviar.
        </p>
      </div>

      {loading ? (
        <EmptyCard text="Cargando recordatorios..." />
      ) : appointments.length === 0 ? (
        <EmptyCard text="No hay turnos pendientes para hoy ni para manana." />
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          <ReminderSection
            title={`Para hoy · ${formatLongDate(today)}`}
            appointments={todayAppointments}
            copiedId={copiedId}
            onCopy={copyReminder}
            onWhatsapp={openWhatsapp}
          />
          <ReminderSection
            title={`Para manana · ${formatLongDate(tomorrow)}`}
            appointments={tomorrowAppointments}
            copiedId={copiedId}
            onCopy={copyReminder}
            onWhatsapp={openWhatsapp}
          />
        </div>
      )}
    </div>
  );
}

function ReminderSection({
  title,
  appointments,
  copiedId,
  onCopy,
  onWhatsapp,
}: {
  title: string;
  appointments: Appointment[];
  copiedId: string | null;
  onCopy: (appointment: Appointment) => void;
  onWhatsapp: (appointment: Appointment) => void;
}) {
  return (
    <section>
      <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.9rem' }}>
        {title}
      </p>

      {appointments.length === 0 ? (
        <EmptyCard text="Sin recordatorios en esta fecha." compact />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {appointments.map((appointment) => {
            const patient = appointment.patient as { name?: string | null; phone?: string | null; os?: string | null } | undefined;
            const whatsappReady = Boolean(normalizeWhatsappPhone(patient?.phone));

            return (
              <div key={appointment.id} style={reminderCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', width: '100%' }}>
                  <div style={timeBadge}>{appointment.time}</div>

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>
                      {patient?.name || 'Paciente sin nombre'}
                    </p>
                    <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3, fontWeight: 300, lineHeight: 1.5 }}>
                      {appointment.reason || 'Consulta general'}
                      {patient?.phone ? ` · ${patient.phone}` : ' · Sin telefono'}
                    </p>
                  </div>

                  <span style={{ ...statusPill, ...(whatsappReady ? statusReady : statusMissing) }}>
                    {whatsappReady ? 'WhatsApp listo' : 'Revisar telefono'}
                  </span>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => onWhatsapp(appointment)} disabled={!whatsappReady} style={{ ...btnPrimary, ...(whatsappReady ? {} : btnDisabled) }}>
                      <MessageCircle size={14} />
                      WhatsApp
                    </button>
                    <button onClick={() => onCopy(appointment)} style={btnGhost}>
                      <Copy size={14} />
                      {copiedId === appointment.id ? 'Copiado' : 'Copiar texto'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--cfg-border)', borderRadius: 16, padding: '1.1rem 1.15rem', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontWeight: 300 }}>{label}</div>
      </div>
    </div>
  );
}

function EmptyCard({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--cfg-border)', borderRadius: 16, padding: compact ? '1.2rem' : '2.5rem 2rem', textAlign: 'center' }}>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 300 }}>{text}</p>
    </div>
  );
}

const reminderCard: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--cfg-border)',
  borderRadius: 16,
  padding: '1rem 1.1rem',
};

const timeBadge: React.CSSProperties = {
  minWidth: 58,
  textAlign: 'center',
  padding: '10px 12px',
  borderRadius: 12,
  background: 'var(--sage)',
  color: 'var(--sage-dark)',
  fontSize: 14,
  fontWeight: 500,
  fontVariantNumeric: 'tabular-nums',
};

const statusPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 124,
  padding: '7px 10px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const statusReady: React.CSSProperties = {
  background: 'var(--sage)',
  color: 'var(--sage-deep)',
};

const statusMissing: React.CSSProperties = {
  background: 'var(--danger-bg)',
  color: 'var(--danger-text)',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'var(--ink)',
  color: 'white',
  borderRadius: 10,
  padding: '10px 16px',
  fontSize: 13,
  fontFamily: 'var(--font-dm-sans), sans-serif',
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1.5px solid var(--cfg-border)',
  background: 'white',
  color: 'var(--muted)',
  borderRadius: 10,
  padding: '10px 16px',
  fontSize: 13,
  fontFamily: 'var(--font-dm-sans), sans-serif',
  cursor: 'pointer',
};

const btnDisabled: React.CSSProperties = {
  opacity: 0.55,
  cursor: 'not-allowed',
};
