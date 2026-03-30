'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase';
import { getTodayDateString } from '../../lib/date-utils';
import { Patient } from '../../types';
import { X, Printer, Save } from 'lucide-react';

const supabase = createClient();

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSaved: () => void;
}

const ENFERMEDADES = [
  { key: 'diabetes',       label: 'Diabetes' },
  { key: 'respiratorias',  label: 'Respiratorias' },
  { key: 'renales',        label: 'Renales' },
  { key: 'hepaticas',      label: 'Hepáticas' },
  { key: 'hepatitis',      label: 'Hepatitis A/B/C' },
  { key: 'epilepsia',      label: 'Epilepsia' },
  { key: 'sifilis',        label: 'Sífilis' },
  { key: 'hiv',            label: 'HIV' },
  { key: 'ulcera',         label: 'Úlcera gástrica' },
  { key: 'cardiacos',      label: 'Prob. cardíacos' },
  { key: 'presion',        label: 'Presión alta/baja' },
  { key: 'convulsiones',   label: 'Convulsiones' },
];

const defaultForm = (patient: Patient) => ({
  fecha: getTodayDateString(),
  apellidoNombre: patient.name || '',
  dni: patient.dni || '',
  social: patient.os || '',
  fechaNacimiento: patient.dob || '',
  telefono: patient.phone || '',
  diabetes: false, respiratorias: false, renales: false, hepaticas: false,
  hepatitis: false, epilepsia: false, sifilis: false, hiv: false,
  ulcera: false, cardiacos: false, presion: false, convulsiones: false,
  operado: '', fuma: '', embarazada: '', otraEnfermedad: '', declaracion: true,
});

export default function ClinicalHistoryModal({ isOpen, onClose, patient, onSaved }: Props) {
  const [form, setForm] = useState(defaultForm(patient));

  useEffect(() => {
    if (patient.clinical_history) setForm(prev => ({ ...prev, ...patient.clinical_history }));
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const toggleCheck = (key: string) => setForm(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  const handleSubmit = async () => {
    await supabase.from('patients').update({ clinical_history: form }).eq('id', patient.id);
    onSaved();
    onClose();
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Historia Clínica - ${patient.name}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;font-size:14px;line-height:1.6}h1{text-align:center;margin-bottom:30px}.signature{margin-top:80px;text-align:center;border-top:1px solid #000;padding-top:10px}</style></head>
    <body><h1>HISTORIA CLÍNICA GENERAL</h1>
    <p><strong>Fecha:</strong> ${form.fecha} &nbsp; <strong>Apellido y Nombre:</strong> ${form.apellidoNombre} &nbsp; <strong>DNI:</strong> ${form.dni}</p>
    <p><strong>Obra Social:</strong> ${form.social} &nbsp; <strong>Fecha Nac:</strong> ${form.fechaNacimiento}</p>
    <hr/><h3>Enfermedades</h3>
    <p>${ENFERMEDADES.map(e => `${e.label}: ${form[e.key as keyof typeof form] ? 'Sí' : 'No'}`).join(' | ')}</p>
    <p><strong>Operado:</strong> ${form.operado} &nbsp; <strong>Fuma:</strong> ${form.fuma} &nbsp; <strong>Embarazada:</strong> ${form.embarazada}</p>
    <p><strong>Observaciones:</strong> ${form.otraEnfermedad}</p>
    <div class="signature"><p><strong>Firma del paciente:</strong></p><p>_______________________________________________</p></div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={modalHead}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 20, color: 'var(--ink)' }}>
              Historia clínica — <em style={{ fontStyle: 'italic', color: 'var(--rose-deep)' }}>{patient.name}</em>
            </h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 300 }}>Consultorio Dental · Dra. Nazarena</p>
          </div>
          <button onClick={onClose} style={btnClose}><X size={14} color="var(--muted)" /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', maxHeight: '62vh', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <SectionLabel>Datos del paciente</SectionLabel>
          <div style={grid2}>
            <Field label="Apellido y nombre"><input name="apellidoNombre" value={form.apellidoNombre} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Fecha"><input type="date" name="fecha" value={form.fecha} onChange={handleChange} style={inputStyle} /></Field>
          </div>
          <div style={grid3}>
            <Field label="DNI"><input name="dni" value={form.dni} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Obra social"><input name="social" value={form.social} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Fecha de nacimiento"><input type="date" name="fechaNacimiento" value={form.fechaNacimiento} onChange={handleChange} style={inputStyle} /></Field>
          </div>

          <SectionLabel>Enfermedades preexistentes</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px' }}>
            {ENFERMEDADES.map(item => {
              const checked = !!form[item.key as keyof typeof form];
              return (
                <div
                  key={item.key}
                  onClick={() => toggleCheck(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    fontSize: 13, padding: '7px 10px', borderRadius: 8,
                    border: `1.5px solid ${checked ? 'var(--rose-mid)' : 'var(--cfg-border)'}`,
                    background: checked ? 'var(--rose)' : 'white',
                    color: checked ? 'var(--rose-deep)' : 'var(--ink)',
                    transition: 'all .15s', userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: checked ? 'var(--rose-dark)' : 'white',
                    border: `1.5px solid ${checked ? 'var(--rose-dark)' : 'var(--faint)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>}
                  </div>
                  {item.label}
                </div>
              );
            })}
          </div>

          <SectionLabel>Antecedentes</SectionLabel>
          <div style={grid2}>
            <Field label="¿Ha sido operado/a alguna vez?"><input name="operado" value={form.operado} onChange={handleChange} placeholder="¿Cuándo? ¿Por qué?" style={inputStyle} /></Field>
            <Field label="¿Fuma?"><input name="fuma" value={form.fuma} onChange={handleChange} placeholder="¿Cuántos cigarrillos al día?" style={inputStyle} /></Field>
          </div>
          <Field label="¿Está embarazada?"><input name="embarazada" value={form.embarazada} onChange={handleChange} placeholder="¿De cuántos meses/semanas?" style={inputStyle} /></Field>
          <Field label="Otras observaciones / antecedentes relevantes">
            <textarea name="otraEnfermedad" value={form.otraEnfermedad} onChange={handleChange} rows={4} placeholder="Escribí aquí..." style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {/* Declaración */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--cream)', borderRadius: 12, padding: 14, border: '1px dashed var(--cfg-border)' }}>
            <div
              onClick={() => setForm(p => ({ ...p, declaracion: !p.declaracion }))}
              style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid var(--sage-mid)`, background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, cursor: 'pointer' }}
            >
              <svg width="11" height="11" fill="none" stroke="var(--sage-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.6 }}>
              Declaro que he contestado todas las preguntas con honestidad y según mi conocimiento. Asimismo, he sido informado que los datos suministrados quedan reservados en la presente Historia Clínica General/Dental.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.75rem', borderTop: '1px solid var(--cfg-border)', background: 'var(--cream)' }}>
          <button onClick={handlePrint} style={btnGhost}>
            <Printer size={14} /> Imprimir para firmar
          </button>
          <button onClick={handleSubmit} style={btnSave}>
            <Save size={14} /> Guardar historia clínica
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 500, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' };
const modalStyle: React.CSSProperties = { background: 'white', borderRadius: 24, width: '100%', maxWidth: 780, border: '1px solid var(--cfg-border)', overflow: 'hidden' };
const modalHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--cfg-border)' };
const btnClose: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--cfg-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--cream)', border: '1.5px solid var(--cfg-border)', borderRadius: 10, padding: '11px 13px', fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 300, outline: 'none' };
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--cfg-border)', background: 'white', color: 'var(--muted)', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer' };
const btnSave: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'var(--ink)', color: 'white', borderRadius: 10, padding: '10px 22px', fontSize: 13.5, fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer' };
