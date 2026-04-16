'use client';

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { createClient } from '../../lib/supabase';
import { X, Calendar, Clock, ClipboardList, Save, Pencil, Trash2, CheckCircle2, MessageCircle, AlertTriangle, DollarSign, Coins, Plus, Activity, Image as ImageIcon } from 'lucide-react';
import { getTodayDateString } from '../../lib/date-utils';
import { Patient, Appointment, Payment } from '../../types';
import Odontogram from './Odontogram';
import ImageGallery from './ImageGallery';

const supabase = createClient();

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSaved: () => void;
}

export default function PatientProfileModal({ isOpen, onClose, patient, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<'visitas' | 'pagos' | 'odontograma' | 'galeria'>('visitas');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Appt Editing
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', notes: '' });
  const [savingId, setSavingId] = useState<string | null>(null);

  // Payment Adding
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', description: '', date: getTodayDateString() });

  const criticalAlerts = useMemo(() => {
    if (!patient.clinical_history) return [];
    const criticalKeys = [
      { key: 'diabetes', label: 'Diabetes' },
      { key: 'cardiacos', label: 'Problemas Cardíacos' },
      { key: 'epilepsia', label: 'Epilepsia' },
      { key: 'presion', label: 'Presión Alta/Baja' },
      { key: 'hiv', label: 'HIV' },
    ];
    return criticalKeys.filter(c => patient.clinical_history[c.key] === true).map(c => c.label);
  }, [patient.clinical_history]);

  const openWhatsApp = () => {
    if (!patient.phone) return;
    const cleanPhone = patient.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${patient.name}, te escribo del consultorio dental de la Dra. Nazarena.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const loadData = async () => {
    setLoading(true);
    const [apptRes, payRes] = await Promise.all([
      supabase.from('appointments').select('*').eq('patient_id', patient.id).order('date', { ascending: false }),
      supabase.from('payments').select('*').eq('patient_id', patient.id).order('date', { ascending: false })
    ]);

    setAppointments(apptRes.data || []);
    setPayments(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) void loadData();
  }, [isOpen, patient.id]);

  const stats = useMemo(() => {
    const totalVisits = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed' || a.status === 'arrived').length;
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return { totalVisits, completed, totalPaid };
  }, [appointments, payments]);

  const addPayment = async () => {
    if (!paymentForm.amount || !paymentForm.description) return;
    setLoading(true);
    const { error } = await supabase.from('payments').insert([{
      patient_id: patient.id,
      amount: parseFloat(paymentForm.amount),
      description: paymentForm.description,
      date: paymentForm.date
    }]);

    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
    } else {
      setIsAddingPayment(false);
      setPaymentForm({ amount: '', description: '', date: getTodayDateString() });
      void loadData();
    }
  };

  const deletePayment = async (id: string) => {
    if (!confirm('¿Eliminar este registro de pago?')) return;
    await supabase.from('payments').delete().eq('id', id);
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const startEdit = (appt: Appointment) => {
    setEditingApptId(appt.id);
    setEditForm({ reason: appt.reason || '', notes: appt.notes || '' });
  };

  const cancelEdit = () => {
    setEditingApptId(null);
    setEditForm({ reason: '', notes: '' });
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from('appointments')
      .update({ reason: editForm.reason, notes: editForm.notes })
      .eq('id', id);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, reason: editForm.reason, notes: editForm.notes } : a));
      setEditingApptId(null);
    }
    setSavingId(null);
  };

  const deleteAppt = async (id: string) => {
    if (!confirm('¿Eliminar este registro de visita?')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else setAppointments(prev => prev.filter(a => a.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={modalHeader}>
          <div>
            <h2 style={titleStyle}>
              Perfil del <em style={accentStyle}>Paciente</em>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <p style={subtitleStyle}>{patient.name} • {patient.os || 'Particular'}</p>
              {patient.phone && (
                <button onClick={openWhatsApp} style={btnWhatsApp} title="Enviar WhatsApp">
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} style={btnClose}><X size={18} color="var(--muted)" /></button>
        </div>

        {/* Alertas Críticas */}
        {criticalAlerts.length > 0 && (
          <div style={alertsBanner}>
            <div style={alertsIcon}>
              <AlertTriangle size={20} color="white" />
            </div>
            <div style={alertsContent}>
              <p style={alertsTitle}>Atención: Condiciones de Riesgo</p>
              <p style={alertsList}>{criticalAlerts.join(' • ')}</p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div style={statsRow}>
          <div style={statCard}>
            <span style={statLabel}>Total Visitas</span>
            <span style={statValue}>{stats.totalVisits}</span>
          </div>
          <div style={statCard}>
            <span style={statLabel}>DNI</span>
            <span style={statValue}>{patient.dni || '—'}</span>
          </div>
          <div style={{ ...statCard, background: 'var(--sage-light)', borderColor: 'var(--sage-mid)' }}>
            <span style={statLabel}>Total Pagado</span>
            <span style={{ ...statValue, color: 'var(--sage-deep)' }}>${stats.totalPaid.toLocaleString()}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={tabsWrap}>
          <button onClick={() => setActiveTab('visitas')} style={activeTab === 'visitas' ? tabActive : tabInactive}>
            <Clock size={14} /> Visitas
          </button>
          <button onClick={() => setActiveTab('pagos')} style={activeTab === 'pagos' ? tabActive : tabInactive}>
            <DollarSign size={14} /> Pagos
          </button>
          <button onClick={() => setActiveTab('odontograma')} style={activeTab === 'odontograma' ? tabActive : tabInactive}>
            <Activity size={14} /> Odontograma
          </button>
          <button onClick={() => setActiveTab('galeria')} style={activeTab === 'galeria' ? tabActive : tabInactive}>
            <ImageIcon size={14} /> Galería
          </button>
        </div>

        {/* Body Content */}
        <div style={historyBody}>
          {activeTab === 'visitas' ? (
            <>
              <h3 style={sectionTitle}>Historial de Consultas</h3>
              {loading ? (
                <p style={emptyText}>Cargando historial...</p>
              ) : appointments.length === 0 ? (
                <p style={emptyText}>No hay registros de visitas anteriores.</p>
              ) : (
                <div style={timeline}>
                  {appointments.map((appt) => {
                    const isEditing = editingApptId === appt.id;
                    return (
                      <div key={appt.id} style={apptCard}>
                        <div style={apptHeader}>
                          <div style={apptMeta}>
                            <div style={dateTag}><Calendar size={12} /> {appt.date}</div>
                            <div style={timeTag}><Clock size={12} /> {appt.time}hs</div>
                            {appt.status === 'completed' && <CheckCircle2 size={14} color="var(--sage-deep)" />}
                          </div>
                          {!isEditing && (
                            <div style={apptActions}>
                              <button onClick={() => startEdit(appt)} style={actionBtn}><Pencil size={13} /></button>
                              <button onClick={() => deleteAppt(appt.id)} style={actionBtn}><Trash2 size={13} color="var(--rose-deep)" /></button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div style={editArea}>
                            <div style={fieldGroup}>
                              <label style={label}>Motivo / Tratamiento</label>
                              <input type="text" value={editForm.reason} onChange={e => setEditForm({...editForm, reason: e.target.value})} style={inputStyle} />
                            </div>
                            <div style={fieldGroup}>
                              <label style={label}>Notas / Evolución</label>
                              <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} style={{...inputStyle, minHeight: 60}} />
                            </div>
                            <div style={editActions}>
                              <button onClick={cancelEdit} style={secondaryBtn}>Cancelar</button>
                              <button onClick={() => saveEdit(appt.id)} disabled={savingId === appt.id} style={primaryBtn}>
                                <Save size={14} /> {savingId === appt.id ? 'Guardando...' : 'Guardar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={displayArea}>
                            <p style={reasonText}>
                              <ClipboardList size={14} color="var(--muted)" style={{marginRight: 6}} />
                              {appt.reason || 'Sin motivo especificado'}
                            </p>
                            {appt.notes && <div style={notesBox}><p style={notesText}>{appt.notes}</p></div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : activeTab === 'pagos' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={sectionTitle}>Historial de Pagos</h3>
                {!isAddingPayment && (
                  <button onClick={() => setIsAddingPayment(true)} style={btnNewPay}>
                    <Plus size={14} /> Registrar Pago
                  </button>
                )}
              </div>

              {isAddingPayment && (
                <div style={payForm}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={fieldGroup}>
                      <label style={label}>Monto ($)</label>
                      <input type="number" placeholder="Ej: 5000" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} style={inputStyle} />
                    </div>
                    <div style={fieldGroup}>
                      <label style={label}>Fecha</label>
                      <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} style={inputStyle} />
                    </div>
                  </div>
                  <div style={fieldGroup}>
                    <label style={label}>Concepto / Descripción</label>
                    <input type="text" placeholder="Ej: Pago entrega Limpieza" value={paymentForm.description} onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} style={inputStyle} />
                  </div>
                  <div style={editActions}>
                    <button onClick={() => setIsAddingPayment(false)} style={secondaryBtn}>Cancelar</button>
                    <button onClick={addPayment} style={primaryBtn}><DollarSign size={14} /> Confirmar Pago</button>
                  </div>
                </div>
              )}

              {loading ? (
                <p style={emptyText}>Cargando pagos...</p>
              ) : payments.length === 0 ? (
                <p style={emptyText}>No hay registros de pagos para este paciente.</p>
              ) : (
                <div style={timeline}>
                  {payments.map((pay) => (
                    <div key={pay.id} style={payCard}>
                      <div style={apptHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={payIcon}><DollarSign size={14} color="var(--sage-deep)" /></div>
                          <div>
                            <p style={payAmount}>${pay.amount.toLocaleString()}</p>
                            <p style={payDate}>{pay.date}</p>
                          </div>
                        </div>
                        <button onClick={() => deletePayment(pay.id)} style={actionBtn}><Trash2 size={13} color="var(--rose-deep)" /></button>
                      </div>
                      <p style={payDesc}>{pay.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : activeTab === 'odontograma' ? (
            <>
              <h3 style={sectionTitle}>Estado Dental (FDI)</h3>
              <Odontogram patientId={patient.id} initialData={patient.odontogram} />
            </>
          ) : (
            <>
              <h3 style={sectionTitle}>Imágenes y Radiografías</h3>
              <ImageGallery patientId={patient.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(26,23,20,0.4)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '1rem',
};

const modalStyle: CSSProperties = {
  background: 'white',
  borderRadius: 28,
  width: '100%',
  maxWidth: 600,
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  overflow: 'hidden',
  border: '1px solid var(--cfg-border)',
};

const modalHeader: CSSProperties = {
  padding: '1.5rem 2rem',
  borderBottom: '1px solid var(--cfg-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'var(--cream-light)',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-dm-serif), serif',
  fontSize: 24,
  color: 'var(--ink)',
  margin: 0,
};

const accentStyle: CSSProperties = {
  fontStyle: 'italic',
  color: 'var(--sage-deep)',
};

const subtitleStyle: CSSProperties = {
  fontSize: 14,
  color: 'var(--muted)',
  marginTop: 4,
  fontWeight: 300,
};

const btnClose: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: '1.5px solid var(--cfg-border)',
  background: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const statsRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1rem',
  padding: '1.5rem 2rem',
  background: 'var(--cream-faint)',
};

const statCard: CSSProperties = {
  padding: '0.75rem',
  background: 'white',
  borderRadius: 16,
  border: '1px solid var(--cfg-border)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const statLabel: CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--muted)',
  marginBottom: 2,
};

const statValue: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--ink)',
};

const historyBody: CSSProperties = {
  padding: '1.5rem 2rem',
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const sectionTitle: CSSProperties = {
  fontSize: 16,
  fontWeight: 500,
  color: 'var(--ink)',
  margin: '0 0 0.5rem',
};

const timeline: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const apptCard: CSSProperties = {
  background: 'white',
  borderRadius: 18,
  border: '1px solid var(--cfg-border)',
  padding: '1rem',
  position: 'relative',
};

const apptHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.75rem',
};

const apptMeta: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

const dateTag: CSSProperties = {
  fontSize: 11,
  background: 'var(--sage)',
  color: 'var(--sage-deep)',
  padding: '3px 8px',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const timeTag: CSSProperties = {
  fontSize: 11,
  color: 'var(--muted)',
  fontWeight: 300,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const apptActions: CSSProperties = {
  display: 'flex',
  gap: 6,
};

const actionBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid var(--cfg-border)',
  background: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--muted)',
};

const displayArea: CSSProperties = {};

const reasonText: CSSProperties = {
  fontSize: 14,
  color: 'var(--ink)',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  margin: 0,
};

const notesBox: CSSProperties = {
  marginTop: '0.5rem',
  padding: '0.75rem',
  background: 'var(--cream)',
  borderRadius: 12,
  borderLeft: '3px solid var(--sage-mid)',
};

const notesText: CSSProperties = {
  fontSize: 13,
  color: 'var(--muted)',
  margin: 0,
  lineHeight: 1.5,
  fontStyle: 'italic',
};

const editArea: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const fieldGroup: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--muted)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 10,
  border: '1.5px solid var(--cfg-border)',
  fontSize: 13.5,
  fontFamily: 'inherit',
  outline: 'none',
};

const editActions: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: '0.5rem',
};

const primaryBtn: CSSProperties = {
  background: 'var(--ink)',
  color: 'white',
  border: 'none',
  borderRadius: 9,
  padding: '6px 14px',
  fontSize: 12,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const secondaryBtn: CSSProperties = {
  background: 'white',
  color: 'var(--muted)',
  border: '1px solid var(--cfg-border)',
  borderRadius: 9,
  padding: '6px 14px',
  fontSize: 12,
  cursor: 'pointer',
};

const emptyText: CSSProperties = {
  textAlign: 'center',
  color: 'var(--muted)',
  fontSize: 13,
  padding: '2rem 0',
};

const btnWhatsApp: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: '#25D366',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
};

const alertsBanner: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  background: 'var(--rose-deep)',
  padding: '0.75rem 2rem',
  color: 'white',
};

const alertsIcon: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const alertsContent: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const alertsTitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  margin: 0,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const alertsList: CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  margin: '2px 0 0',
  opacity: 0.9,
};

const tabsWrap: CSSProperties = {
  display: 'flex',
  padding: '0 1rem',
  background: 'var(--cream-faint)',
  borderBottom: '1px solid var(--cfg-border)',
  gap: 8,
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const tabBase: CSSProperties = {
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  borderBottom: '2px solid transparent',
  background: 'transparent',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
};

const tabActive: CSSProperties = {
  ...tabBase,
  color: 'var(--ink)',
  borderBottomColor: 'var(--ink)',
};

const tabInactive: CSSProperties = {
  ...tabBase,
  color: 'var(--muted)',
};

const btnNewPay: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 10,
  border: '1px solid var(--sage-mid)',
  background: 'var(--sage-light)',
  color: 'var(--sage-deep)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const payForm: CSSProperties = {
  background: 'var(--cream)',
  padding: '1rem',
  borderRadius: 16,
  border: '1px solid var(--cfg-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: '1rem',
};

const payCard: CSSProperties = {
  background: 'white',
  borderRadius: 16,
  border: '1px solid var(--cfg-border)',
  padding: '1rem',
};

const payIcon: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  background: 'var(--sage-light)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const payAmount: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--ink)',
  margin: 0,
};

const payDate: CSSProperties = {
  fontSize: 11,
  color: 'var(--muted)',
  margin: 0,
};

const payDesc: CSSProperties = {
  fontSize: 13,
  color: 'var(--muted)',
  marginTop: '0.75rem',
  margin: '0.75rem 0 0',
  fontStyle: 'italic',
};
