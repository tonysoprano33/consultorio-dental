'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase';
import { getTodayDateString } from '../../lib/date-utils';
import { Appointment } from '../../types';
import { X, Save } from 'lucide-react';

const supabase = createClient();

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editAppt?: Appointment | null;
  onSaved: () => void;
}

export default function AppointmentModal({ isOpen, onClose, editAppt, onSaved }: Props) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ patientId: '', date: getTodayDateString(), time: '', reason: '', notes: '' });

  useEffect(() => {
    if (!isOpen) return;
    loadPatients();
    if (editAppt) setForm({ patientId: editAppt.patient_id || '', date: editAppt.date, time: editAppt.time, reason: editAppt.reason || '', notes: editAppt.notes || '' });
    else setForm({ patientId: '', date: getTodayDateString(), time: '', reason: '', notes: '' });
  }, [isOpen, editAppt]);

  const loadPatients = async () => {
    const { data } = await supabase.from('patients').select('id, name, os').order('name');
    setPatients(data || []);
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.date || !form.time) { alert('Completá paciente, fecha y hora'); return; }
    setLoading(true);
    const payload = { patient_id: form.patientId, date: form.date, time: form.time, reason: form.reason, notes: form.notes, status: 'pending' };
    try {
      if (editAppt) await supabase.from('appointments').update(payload).eq('id', editAppt.id);
      else await supabase.from('appointments').insert(payload);
      onSaved();
      onClose();
    } catch (e: any) {
      alert('Error al guardar: ' + (e.message || 'Desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 520, border: '1px solid var(--cfg-border)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--cfg-border)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 20, color: 'var(--ink)' }}>
              {editAppt ? 'Editar turno' : 'Nuevo turno'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 300 }}>
              {editAppt ? 'Modificá los datos del turno' : 'Completá los datos para agendar'}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--cfg-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="var(--muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <MField label="Paciente *">
            <select value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} style={inp}>
              <option value="">— Seleccionar paciente —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}{p.os ? ` (${p.os})` : ''}</option>)}
            </select>
          </MField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MField label="Fecha *"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} /></MField>
            <MField label="Hora *"><input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={inp} /></MField>
          </div>

          <MField label="Motivo / Tratamiento">
            <input type="text" value={form.reason} placeholder="Ej: Limpieza, Control..." onChange={e => setForm({ ...form, reason: e.target.value })} style={inp} />
          </MField>

          <MField label="Notas adicionales">
            <textarea value={form.notes} placeholder="Observaciones, indicaciones previas..." onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} />
          </MField>

          <p style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 300, textAlign: 'right', marginTop: -6 }}>* Campos obligatorios</p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '1rem 1.75rem', borderTop: '1px solid var(--cfg-border)', background: 'var(--cream)' }}>
          <button onClick={onClose} disabled={loading} style={{ border: '1.5px solid var(--cfg-border)', background: 'white', color: 'var(--muted)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'var(--ink)', color: 'white', borderRadius: 10, padding: '10px 22px', fontSize: 13.5, fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer' }}>
            <Save size={14} />
            {loading ? 'Guardando...' : editAppt ? 'Guardar cambios' : 'Guardar turno'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 500, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', background: 'var(--cream)', border: '1.5px solid var(--cfg-border)', borderRadius: 10, padding: '11px 13px', fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 300, outline: 'none' };
