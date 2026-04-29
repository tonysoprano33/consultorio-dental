'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase';
import { getTodayDateString } from '../../lib/date-utils';
import { Appointment } from '../../types';
import { X, Save, Search, AlertTriangle, Trash2, Info } from 'lucide-react';
import { 
  getDurationFromNotes, 
  setDurationInNotes, 
  checkOverlap,
  minutesToTime,
  timeToMinutes,
  loadTreatmentDurations,
  saveTreatmentDuration,
  deleteTreatment
} from '../../lib/appointment-utils';

const supabase = createClient();
const SYSTEM_BLOCK_PATIENT_ID = 'b3614d2b-fa80-4c38-80b2-1458c78e4273';
const SYSTEM_FULL_PATIENT_ID = 'c4725e3c-ab91-4d49-91c3-2569d89f5384';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editAppt?: Appointment | null;
  onSaved: () => void;
  initialDate?: string | null;
}

export default function AppointmentModal({ isOpen, onClose, editAppt, onSaved, initialDate }: Props) {
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    patientId: '', 
    date: initialDate || getTodayDateString(), 
    time: '', 
    reason: '', 
    notes: '',
    duration: 15
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showReasonSuggestions, setShowReasonSuggestions] = useState(false);
  const [isBlockedDay, setIsBlockedDay] = useState(false);
  const [isFullDay, setIsFullDay] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadPatients();
    void loadTreatments();
    
    if (editAppt) {
      const duration = getDurationFromNotes(editAppt.notes);
      const cleanNotes = editAppt.notes ? editAppt.notes.replace(/\[DURATION:\d+\]/g, '').trim() : '';
      
      setForm({ 
        patientId: editAppt.patient_id || '', 
        date: editAppt.date, 
        time: editAppt.time, 
        reason: editAppt.reason || '', 
        notes: cleanNotes,
        duration: duration
      });
      setSearchTerm(editAppt.patient?.name || '');
    } else {
      setForm({ 
        patientId: '', 
        date: initialDate || getTodayDateString(), 
        time: '', 
        reason: '', 
        notes: '',
        duration: 15
      });
      setSearchTerm('');
    }
    setShowSuggestions(false);
  }, [isOpen, editAppt, initialDate]);

  useEffect(() => {
    if (form.date) {
      void checkIfBlocked(form.date);
    }
  }, [form.date]);

  const checkIfBlocked = async (date: string) => {
    const { data: blockData } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', date)
      .eq('patient_id', SYSTEM_BLOCK_PATIENT_ID)
      .maybeSingle();
    setIsBlockedDay(!!blockData);
    
    const { data: fullData } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', date)
      .eq('patient_id', SYSTEM_FULL_PATIENT_ID)
      .maybeSingle();
    setIsFullDay(!!fullData);
  };

  const loadPatients = async () => {
    const { data } = await supabase.from('patients').select('id, name, os').order('name');
    setPatients(data || []);
  };

  const loadTreatments = async () => {
    const t = await loadTreatmentDurations();
    setTreatments(t);
  };

  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    if (p.id === SYSTEM_BLOCK_PATIENT_ID || p.id === SYSTEM_FULL_PATIENT_ID) return false;
    return p.name.toLowerCase().includes(search) || (p.os && p.os.toLowerCase().includes(search));
  });

  const selectPatient = (p: any) => {
    setForm({ ...form, patientId: p.id });
    setSearchTerm(p.name);
    setShowSuggestions(false);
  };

  const selectReason = (reason: string) => {
    const duration = treatments[reason] || 15;
    setForm({ ...form, reason, duration });
    setShowReasonSuggestions(false);
  };

  const handleSaveTreatment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!form.reason) return;
    setLoading(true);
    try {
      await saveTreatmentDuration(form.reason, form.duration);
      await loadTreatments();
      alert(`Tratamiento "${form.reason}" guardado.`);
    } catch (e) {
      alert('No se pudo guardar el tratamiento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTreatment = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${name}" de la lista permanente?`)) return;
    setLoading(true);
    try {
      await deleteTreatment(name);
      await loadTreatments();
    } catch (e) {
      alert('No se pudo eliminar el tratamiento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.date || !form.time) { 
      alert('Completá paciente, fecha y hora'); 
      return; 
    }

    if (isBlockedDay) {
      if (!confirm('Este día está marcado como NO LABORABLE. ¿Estás segura de agendar un turno igual?')) {
        return;
      }
    }

    if (isFullDay) {
      if (!confirm('Este día está marcado como AGENDA COMPLETA. ¿Estás segura de agregar otro turno igual?')) {
        return;
      }
    }

    setLoading(true);
    try {
      const { data: dayAppts } = await supabase
        .from('appointments')
        .select('id, date, time, notes, status')
        .eq('date', form.date);

      const overlap = checkOverlap(
        form.date,
        form.time,
        form.duration,
        (dayAppts || []) as Appointment[],
        editAppt?.id
      );

      if (overlap) {
        if (!confirm(`¡AVISO DE SUPERPOSICIÓN! Ya hay otro turno a esa hora (${overlap.time}). ¿Deseas agendarlo de todas formas?`)) {
          setLoading(false);
          return;
        }
      }

      const finalNotes = setDurationInNotes(form.notes, form.duration);
      const payload = { 
        patient_id: form.patientId, 
        date: form.date, 
        time: form.time, 
        reason: form.reason, 
        notes: finalNotes, 
        status: 'pending' 
      };

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

  const endTime = minutesToTime(timeToMinutes(form.time || '00:00') + form.duration);

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        {/* Header */}
        <div style={modalHeader}>
          <div>
            <h2 style={modalTitle}>{editAppt ? 'Editar turno' : 'Nuevo turno'}</h2>
            <p style={modalSubtitle}>{editAppt ? 'Modificá los datos del turno' : 'Completá los datos para agendar'}</p>
          </div>
          <button onClick={onClose} style={closeBtn}><X size={14} color="var(--muted)" /></button>
        </div>

        {/* Warning if blocked day */}
        {isBlockedDay && (
          <div style={blockedWarning}>
            <AlertTriangle size={16} />
            <span><strong>Día no laborable:</strong> La doctora no trabaja este día.</span>
          </div>
        )}

        {/* Warning if FULL day */}
        {isFullDay && (
          <div style={fullWarning}>
            <AlertTriangle size={16} />
            <span><strong>Agenda completa:</strong> Este día está marcado como sin disponibilidad.</span>
          </div>
        )}

        {/* Body */}
        <div style={modalBody}>
          <MField label="Paciente *">
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={searchIcon} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre u obra social..." 
                  value={searchTerm} 
                  onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  style={{ ...inp, paddingLeft: 36 }}
                />
              </div>

              {showSuggestions && searchTerm.length > 0 && (
                <div style={dropdownStyle}>
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map(p => (
                      <div key={p.id} onClick={() => selectPatient(p)} style={{ ...dropdownItem, backgroundColor: form.patientId === p.id ? 'var(--sage-pale)' : 'transparent' }}>
                        <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
                        {p.os && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.os}</div>}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>No se encontraron pacientes</div>
                  )}
                </div>
              )}
            </div>
          </MField>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
            <MField label="Fecha *"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} /></MField>
            <MField label="Hora *">
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={inp} />
              {form.time && <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Fin: {endTime} hs</p>}
            </MField>
          </div>

          <MField label="Motivo / Tratamiento">
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  value={form.reason} 
                  placeholder="Ej: Limpieza, Control..." 
                  onChange={e => setForm({ ...form, reason: e.target.value })} 
                  onFocus={() => setShowReasonSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowReasonSuggestions(false), 200)}
                  style={{ ...inp, flex: 1 }} 
                />
                {form.reason && (
                  <button onClick={handleSaveTreatment} style={{ ...saveTreatmentBtn, opacity: treatments[form.reason] ? 0.6 : 1 }} title={treatments[form.reason] ? 'Actualizar duración' : 'Guardar en la lista'}>
                    {treatments[form.reason] ? 'Actualizar' : 'Guardar'}
                  </button>
                )}
              </div>
              <div style={legendSmall}>
                <Info size={10} /> Para agregar a la lista: escribe el nombre, pon el tiempo y pulsa "Guardar".
              </div>
              {showReasonSuggestions && (
                <div style={dropdownStyle}>
                  {Object.keys(treatments).map(reason => (
                    <div key={reason} onClick={() => selectReason(reason)} style={dropdownItemWithDelete}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                        <span>{reason}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{treatments[reason]} min</span>
                      </div>
                      <button onClick={(e) => handleDeleteTreatment(e, reason)} style={deleteIconBtn} title="Eliminar de la lista">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </MField>

          <MField label="Duración (minutos)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} style={{ ...inp, width: 80 }} step={5} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[15, 30, 45, 60, 90, 120].map(d => (
                  <button key={d} onClick={() => setForm({ ...form, duration: d })} style={{ ...pillBtn, backgroundColor: form.duration === d ? 'var(--ink)' : 'var(--cream)', color: form.duration === d ? 'white' : 'var(--muted)' }}>
                    {d < 60 ? `${d}m` : `${d/60}h${d%60 || ''}`}
                  </button>
                ))}
              </div>
            </div>
          </MField>

          <MField label="Notas adicionales">
            <textarea value={form.notes} placeholder="Observaciones..." onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} />
          </MField>
        </div>

        {/* Footer */}
        <div style={modalFooter}>
          <button onClick={onClose} disabled={loading} style={btnCancel}>Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} style={btnSave}>
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

// Estilos
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' };
const modalContent: React.CSSProperties = { background: 'white', borderRadius: 24, width: '100%', maxWidth: 520, border: '1px solid var(--cfg-border)', overflow: 'hidden' };
const modalHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--cfg-border)' };
const modalTitle: React.CSSProperties = { fontFamily: 'var(--font-dm-serif), serif', fontSize: 20, color: 'var(--ink)' };
const modalSubtitle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 300 };
const closeBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--cfg-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const blockedWarning: React.CSSProperties = { backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 1.75rem', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f87171' };
const fullWarning: React.CSSProperties = { backgroundColor: '#ffedd5', color: '#c2410c', padding: '10px 1.75rem', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #fb923c' };
const modalBody: React.CSSProperties = { padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' };
const searchIcon: React.CSSProperties = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 };
const inp: React.CSSProperties = { width: '100%', background: 'var(--cream)', border: '1.5px solid var(--cfg-border)', borderRadius: 10, padding: '11px 13px', fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 300, outline: 'none' };
const dropdownStyle: React.CSSProperties = { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--cfg-border)', borderRadius: 12, marginTop: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 2000, maxHeight: 200, overflowY: 'auto' };
const dropdownItem: React.CSSProperties = { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--cfg-border)', fontSize: 13 };
const dropdownItemWithDelete: React.CSSProperties = { ...dropdownItem, display: 'flex', alignItems: 'center', gap: 10 };
const deleteIconBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--rose-deep)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: 0.6 };
const pillBtn: React.CSSProperties = { border: '1px solid var(--cfg-border)', borderRadius: 8, padding: '4px 8px', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' };
const saveTreatmentBtn: React.CSSProperties = { padding: '0 12px', borderRadius: 10, border: '1.5px solid var(--sage-dark)', background: 'var(--sage-light)', color: 'var(--sage-deep)', fontSize: 12, cursor: 'pointer' };
const legendSmall: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 };
const modalFooter: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '1rem 1.75rem', borderTop: '1px solid var(--cfg-border)', background: 'var(--cream)' };
const btnCancel: React.CSSProperties = { border: '1.5px solid var(--cfg-border)', background: 'white', color: 'var(--muted)', borderRadius: 10, padding: '10px 18px', fontSize: 13, cursor: 'pointer' };
const btnSave: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'var(--ink)', color: 'white', borderRadius: 10, padding: '10px 22px', fontSize: 13.5, cursor: 'pointer' };
