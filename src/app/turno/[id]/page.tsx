'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, MapPin, CheckCircle2, Phone } from 'lucide-react';
import { createClient } from '../../../../lib/supabase';
import { formatLongDate } from '../../../../lib/date-utils';

const supabase = createClient();

export default function PublicAppointmentView() {
  const { id } = useParams();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patient:patients(name)')
        .eq('id', id)
        .single();

      if (!error) setAppointment(data);
      setLoading(false);
    };

    void fetchAppointment();
  }, [id]);

  if (loading) {
    return <div style={center}>Cargando información del turno...</div>;
  }

  if (!appointment) {
    return (
      <div style={center}>
        <h2>Turno no encontrado</h2>
        <p>El enlace puede haber expirado o ser incorrecto.</p>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <header style={header}>
          <div style={iconBox}>
            <CheckCircle2 size={32} color="var(--sage-deep)" />
          </div>
          <h1 style={title}>¡Tu turno está confirmado!</h1>
          <p style={patientName}>{appointment.patient?.name}</p>
        </header>

        <main style={details}>
          <div style={infoRow}>
            <Calendar size={20} color="var(--muted)" />
            <div>
              <p style={label}>Fecha</p>
              <p style={value}>{formatLongDate(appointment.date)}</p>
            </div>
          </div>

          <div style={infoRow}>
            <Clock size={20} color="var(--muted)" />
            <div>
              <p style={label}>Hora</p>
              <p style={value}>{appointment.time} hs</p>
            </div>
          </div>

          <div style={infoRow}>
            <MapPin size={20} color="var(--muted)" />
            <div>
              <p style={label}>Dirección</p>
              <p style={value}>Consultorio Dental - Dra. Nazarena</p>
              <p style={subValue}>Tu dirección aquí, Ciudad</p>
            </div>
          </div>
        </main>

        <footer style={footer}>
          <p style={footerText}>Si necesitas cancelar o reprogramar, por favor avísanos por WhatsApp.</p>
          <a href="https://wa.me/TU_NUMERO_AQUI" style={whatsappBtn}>
            <Phone size={16} />
            Contactar Consultorio
          </a>
        </footer>
      </div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-dm-sans), sans-serif' };
const card: React.CSSProperties = { background: 'white', width: '100%', maxWidth: 450, borderRadius: 32, padding: '2.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', textAlign: 'center' };
const header: React.CSSProperties = { marginBottom: '2rem' };
const iconBox: React.CSSProperties = { width: 64, height: 64, background: 'var(--sage)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' };
const title: React.CSSProperties = { fontFamily: 'var(--font-dm-serif), serif', fontSize: 24, color: 'var(--ink)', marginBottom: 8 };
const patientName: React.CSSProperties = { fontSize: 16, color: 'var(--sage-deep)', fontWeight: 600 };
const details: React.CSSProperties = { display: 'grid', gap: 24, textAlign: 'left', background: '#fafafa', padding: '1.5rem', borderRadius: 20, marginBottom: '2rem' };
const infoRow: React.CSSProperties = { display: 'flex', gap: 16, alignItems: 'flex-start' };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 };
const value: React.CSSProperties = { fontSize: 16, color: 'var(--ink)', fontWeight: 500 };
const subValue: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', marginTop: 2 };
const footer: React.CSSProperties = { display: 'grid', gap: 16 };
const footerText: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 };
const whatsappBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--ink)', color: 'white', padding: '12px', borderRadius: 12, textDecoration: 'none', fontWeight: 500, fontSize: 14 };
const center: React.CSSProperties = { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)' };
