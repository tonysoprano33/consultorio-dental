'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import { Patient } from '../../types';

const supabase = createClient();

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editPatient?: Patient | null;
  onSaved: () => void;
}

export default function PatientModal({ isOpen, onClose, editPatient, onSaved }: Props) {
  const [form, setForm] = useState({
    name: '',
    dni: '',
    phone: '',
    os: '',
    dob: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editPatient) {
      setForm({
        name: editPatient.name || '',
        dni: editPatient.dni || '',
        phone: editPatient.phone || '',
        os: editPatient.os || '',
        dob: editPatient.dob || '',
        notes: editPatient.notes || '',
      });
      return;
    }

    setForm({ name: '', dni: '', phone: '', os: '', dob: '', notes: '' });
  }, [editPatient]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    setLoading(true);

    try {
      if (editPatient) {
        const { error } = await supabase
          .from('patients')
          .update(form)
          .eq('id', editPatient.id);

        if (error) throw error;
        alert('Paciente actualizado');
      } else {
        const { error } = await supabase
          .from('patients')
          .insert(form);

        if (error) throw error;
        alert('Paciente guardado correctamente');
      }

      onSaved();
      onClose();
    } catch (error: any) {
      alert('Error al guardar: ' + (error.message || 'Desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editPatient ? 'Editar paciente' : 'Nuevo paciente'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input
              type="text"
              placeholder="Apellido, Nombre"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>

          <div className="form-group">
            <label>DNI</label>
            <input
              type="text"
              placeholder="12345678"
              value={form.dni}
              onChange={(event) => setForm({ ...form, dni: event.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Telefono / WhatsApp</label>
            <input
              type="text"
              placeholder="+54 9 11 1234-5678"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/[^\d+\s()-]/g, '') })}
            />
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
              Guardalo con codigo de pais para abrir WhatsApp con un clic.
            </span>
          </div>

          <div className="form-group">
            <label>Obra social</label>
            <select
              value={form.os}
              onChange={(event) => setForm({ ...form, os: event.target.value })}
            >
              <option value="">Seleccionar</option>
              <option value="OSDE">OSDE</option>
              <option value="IOMA">IOMA</option>
              <option value="GRASSI">GRASSI</option>
              <option value="DOSEP">DOSEP</option>
              <option value="Swiss Medical">Swiss Medical</option>
              <option value="Galeno">Galeno</option>
              <option value="Medife">Medife</option>
              <option value="PAMI">PAMI</option>
              <option value="Particular">Particular</option>
              <option value="Otras">Otras</option>
            </select>
          </div>

          <div className="form-group">
            <label>Fecha de nacimiento</label>
            <input
              type="date"
              value={form.dob}
              onChange={(event) => setForm({ ...form, dob: event.target.value })}
            />
          </div>

          <div className="form-group full">
            <label>Observaciones / antecedentes</label>
            <textarea
              placeholder="Alergias, medicacion, antecedentes relevantes..."
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : editPatient ? 'Guardar cambios' : 'Guardar paciente'}
          </button>
        </div>
      </div>
    </div>
  );
}
