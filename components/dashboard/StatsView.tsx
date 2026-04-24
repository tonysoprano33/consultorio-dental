'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from '../../lib/supabase';
import { subDays, startOfMonth, endOfMonth, format, isAfter, parseISO } from 'date-fns';
import { Appointment, Patient } from '../../types';
import AchievementPanel from '../AchievementPanel';

const supabase = createClient();

export default function StatsView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const last30Days = subDays(new Date(), 30).toISOString();

    const { data: appts } = await supabase
      .from('appointments')
      .select('*, patient:patients(id, name)')
      .gte('date', last30Days.split('T')[0]);

    const { data: pts } = await supabase
      .from('patients')
      .select('*')
      .gte('created_at', last30Days);

    setAppointments(appts || []);
    setPatients(pts || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo(() => {
    const totalAppts = appointments.length;
    const completed = appointments.filter(a => a.status === 'arrived' || a.status === 'completed').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const newPts = patients.length;

    // Group by reason
    const reasonsMap: Record<string, number> = {};
    appointments.forEach(a => {
      const r = a.reason || 'Consulta General';
      reasonsMap[r] = (reasonsMap[r] || 0) + 1;
    });
    const topReasons = Object.entries(reasonsMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Group by day of week (Lunes a Viernes)
    const daysMap: Record<string, number> = { 'Lun': 0, 'Mar': 0, 'Mie': 0, 'Jue': 0, 'Vie': 0 };
    appointments.forEach(a => {
      const dayName = format(parseISO(a.date), 'eee');
      const map: Record<string, string> = { 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mie', 'Thu': 'Jue', 'Fri': 'Vie' };
      const translated = map[dayName];
      if (translated && daysMap[translated] !== undefined) daysMap[translated]++;
    });

    const chartData = Object.entries(daysMap).map(([name, count]) => ({ name, count }));

    return { totalAppts, completed, pending, newPts, topReasons, chartData };
  }, [appointments, patients]);

  if (loading) {
    return <div style={emptyState}>Analizando datos del consultorio...</div>;
  }

  return (
    <div style={{ ...container, padding: isMobile ? '1.5rem 1rem 3rem' : container.padding }}>
      <header style={header}>
        <h1 style={{ ...title, fontSize: isMobile ? 28 : title.fontSize }}>Panel de <em>Control</em></h1>
        <p style={subtitle}>Resumen de actividad de los últimos 30 días.</p>
      </header>

      <AchievementPanel />

      <div style={{ ...grid, gridTemplateColumns: isMobile ? '1fr' : grid.gridTemplateColumns }}>
        <StatCard 
          icon={<Calendar size={20} color="var(--sage-dark)" />} 
          label="Turnos Totales" 
          value={stats.totalAppts} 
          sub="Últimos 30 días"
          color="var(--sage)"
        />
        <StatCard 
          icon={<TrendingUp size={20} color="var(--lavender-dark)" />} 
          label="Efectividad" 
          value={`${stats.totalAppts ? Math.round((stats.completed / stats.totalAppts) * 100) : 0}%`} 
          sub={`${stats.completed} atendidos`}
          color="var(--lavender)"
        />
        <StatCard 
          icon={<Users size={20} color="var(--rose-dark)" />} 
          label="Nuevos Pacientes" 
          value={stats.newPts} 
          sub="Registrados este mes"
          color="var(--rose)"
        />
      </div>

      <div style={{ ...chartsGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <section style={{ ...card, padding: isMobile ? '1.25rem' : card.padding }}>
          <h2 style={cardTitle}>Actividad por Día</h2>
          <div style={{ height: 250, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cfg-border)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--faint)', fontSize: 11 }}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--cream)', opacity: 0.4 }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid var(--cfg-border)',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[6, 6, 0, 0]} 
                  barSize={isMobile ? 30 : 45}
                >
                  {stats.chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count === Math.max(...stats.chartData.map(d => d.count)) && entry.count > 0 
                        ? 'var(--sage-dark)' 
                        : 'var(--sage)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ ...card, padding: isMobile ? '1.25rem' : card.padding }}>
          <h2 style={cardTitle}>Motivos Frecuentes</h2>
          <div style={reasonsList}>
            {stats.topReasons.map(([reason, count]) => (
              <div key={reason} style={reasonItem}>
                <div style={reasonInfo}>
                  <span style={{ ...reasonName, fontSize: isMobile ? 13 : reasonName.fontSize }}>{reason}</span>
                  <span style={reasonCount}>{count}</span>
                </div>
                <div style={progressBg}>
                  <div style={{ ...progressFill, width: `${(count / (stats.totalAppts || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
            {stats.topReasons.length === 0 && <p style={emptyText}>Sin datos suficientes.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div style={statCard}>
      <div style={{ ...iconCircle, background: color }}>{icon}</div>
      <div>
        <p style={statLabel}>{label}</p>
        <h3 style={statValue}>{value}</h3>
        <p style={statSub}>{sub}</p>
      </div>
    </div>
  );
}

const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 4rem', fontFamily: 'var(--font-dm-sans), sans-serif' };
const header: React.CSSProperties = { marginBottom: '2.5rem', borderBottom: '1px solid var(--cfg-border)', paddingBottom: '1.5rem' };
const title: React.CSSProperties = { fontFamily: 'var(--font-dm-serif), serif', fontSize: 32, color: 'var(--ink)', letterSpacing: '-0.5px' };
const subtitle: React.CSSProperties = { fontSize: 14, color: 'var(--muted)', marginTop: 6, fontWeight: 300 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: '2rem' };
const statCard: React.CSSProperties = { background: 'white', border: '1px solid var(--cfg-border)', borderRadius: 20, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: 16 };
const iconCircle: React.CSSProperties = { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' };
const statValue: React.CSSProperties = { fontSize: 28, fontWeight: 600, color: 'var(--ink)', margin: '4px 0' };
const statSub: React.CSSProperties = { fontSize: 12, color: 'var(--faint)', fontWeight: 300 };
const chartsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 };
const card: React.CSSProperties = { background: 'white', border: '1px solid var(--cfg-border)', borderRadius: 24, padding: '1.75rem' };
const cardTitle: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: '1.5rem' };
const reasonsList: React.CSSProperties = { display: 'grid', gap: 16 };
const reasonItem: React.CSSProperties = { display: 'grid', gap: 6 };
const reasonInfo: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const reasonName: React.CSSProperties = { fontSize: 13.5, color: 'var(--ink)', fontWeight: 400 };
const reasonCount: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontWeight: 600 };
const progressBg: React.CSSProperties = { height: 6, background: 'var(--cream)', borderRadius: 10, overflow: 'hidden' };
const progressFill: React.CSSProperties = { height: '100%', background: 'var(--lavender-dark)', borderRadius: 10 };
const emptyState: React.CSSProperties = { padding: '4rem 2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14 };
const emptyText: React.CSSProperties = { textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '1rem' };
