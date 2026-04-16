'use client';

import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FileText, Pencil, Plus, Search, Trash2, User } from 'lucide-react';
import Tooltip from '../Tooltip';
import { createClient } from '../../lib/supabase';
import { Patient } from '../../types';
import ClinicalHistoryModal from './ClinicalHistoryModal';
import PatientModal from './PatientModal';
import PatientProfileModal from './PatientProfileModal';

const supabase = createClient();

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export default function PatientsView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<Patient | null>(null);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);

  const deferredSearch = useDeferredValue(search);

  const loadPatients = async () => {
    setLoading(true);
    const { data } = await supabase.from('patients').select('*').order('name');
    setPatients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return patients.filter((patient) => {
      return (
        patient.name.toLowerCase().includes(normalizedSearch) ||
        (patient.dni && patient.dni.includes(deferredSearch)) ||
        (patient.phone && patient.phone.includes(deferredSearch)) ||
        (patient.os && patient.os.toLowerCase().includes(normalizedSearch))
      );
    });
  }, [deferredSearch, patients]);

  const openProfile = (patient: Patient) => {
    setSelectedPatientForProfile(patient);
    setProfileModalOpen(true);
  };

  const openHistory = (patient: Patient) => {
    setSelectedPatientForHistory(patient);
    setHistoryModalOpen(true);
  };

  const deletePatient = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer.')) return;

    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) {
      alert('Error al eliminar el paciente: ' + error.message);
    } else {
      void loadPatients();
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            Lista de <em style={titleAccentStyle}>pacientes</em>
          </h1>
          <p style={subtitleStyle}>
            {filtered.length} paciente{filtered.length !== 1 ? 's' : ''} registrado
            {filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={countPillStyle}>{filtered.length}</span>
          <button
            onClick={() => {
              setEditingPatient(null);
              setModalOpen(true);
            }}
            style={btnNew}
          >
            <Plus size={14} />
            Nuevo paciente
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search
          size={16}
          color="var(--faint)"
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI, teléfono u obra social..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={searchInput}
        />
      </div>

      <div style={tableCardStyle}>
        {loading ? (
          <div style={emptyWrapStyle}>
            <p style={emptyTextStyle}>Cargando pacientes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={emptyWrapStyle}>
            <div style={emptyIconWrapStyle}>
              <Search size={22} color="var(--sage-dark)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>No se encontraron pacientes</p>  
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, fontWeight: 300 }}>
              Probá con otro término de búsqueda
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cfg-border)' }}>
                  {['Paciente', 'DNI', 'Teléfono', 'Obra social', ''].map((header) => (
                    <th key={header} style={thStyle}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr key={patient.id} style={{ borderBottom: '1px solid var(--cfg-border)' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={avatarStyle}>{getInitials(patient.name)}</div>
                        <span style={{ fontWeight: 500 }}>{patient.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontWeight: 300 }}>{patient.dni || '—'}</td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontWeight: 300 }}>{patient.phone || '—'}</td>
                    <td style={tdStyle}>
                      {patient.os ? (
                        <span style={osPill}>{patient.os}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontWeight: 300 }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, paddingRight: 16 }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>  
                        <Tooltip text="Modificar datos ✨">
                          <button
                            onClick={() => {
                              setEditingPatient(patient);
                              setModalOpen(true);
                            }}
                            style={btnIconBase}
                          >
                            <Pencil size={13} color="var(--muted)" />
                            Editar
                          </button>
                        </Tooltip>
                        
                        <Tooltip text="Ver ficha personal 🦷">
                          <button onClick={() => openProfile(patient)} style={{ ...btnIconBase, ...btnProfile }}>
                            <User size={13} color="var(--sage-deep)" />
                            Perfil
                          </button>
                        </Tooltip>

                        <Tooltip text="Historia Clínica 📋">
                          <button onClick={() => openHistory(patient)} style={{ ...btnIconBase, ...btnHistory }}>
                            <FileText size={13} color="var(--lavender-dark)" />
                            H.C.
                          </button>
                        </Tooltip>

                        <Tooltip text="Eliminar paciente 🗑️">
                          <button onClick={() => deletePatient(patient.id)} style={{ ...btnIconBase, ...btnDelete }}>
                            <Trash2 size={13} color="var(--rose-deep)" />
                            Eliminar
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={footerStyle}>
        <div style={footerDotStyle} />
        <span style={footerTextStyle}>
          <strong style={{ fontWeight: 400, color: 'var(--muted)' }}>Consultorio Dental</strong> · Dra. Nazarena ·
          Datos en Supabase
        </span>
        <div style={footerDotStyle} />
      </div>

      <PatientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editPatient={editingPatient}
        onSaved={loadPatients}
      />

      {selectedPatientForProfile && (
        <PatientProfileModal
          isOpen={profileModalOpen}
          onClose={() => {
            setProfileModalOpen(false);
            setSelectedPatientForProfile(null);
          }}
          patient={selectedPatientForProfile}
          onSaved={loadPatients}
        />
      )}

      {selectedPatientForHistory && (
        <ClinicalHistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setSelectedPatientForHistory(null);
          }}
          patient={selectedPatientForHistory}
          onSaved={loadPatients}
        />
      )}
    </div>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '2.25rem 1.25rem 4rem',
  fontFamily: 'var(--font-dm-sans), sans-serif',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: '2rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid var(--cfg-border)',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-dm-serif), serif',
  fontSize: 30,
  color: 'var(--ink)',
  letterSpacing: '-0.5px',
  lineHeight: 1,
};

const titleAccentStyle: CSSProperties = {
  fontStyle: 'italic',
  color: 'var(--sage-deep)',
};

const subtitleStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--muted)',
  marginTop: 5,
  fontWeight: 300,
};

const countPillStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  color: 'var(--muted)',
  background: 'var(--cfg-border)',
  borderRadius: 20,
  padding: '4px 12px',
};

const tableCardStyle: CSSProperties = {
  background: 'white',
  border: '1px solid var(--cfg-border)',
  borderRadius: 20,
  overflow: 'hidden',
};

const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: 720,
  borderCollapse: 'collapse',
};

const emptyWrapStyle: CSSProperties = {
  padding: '3rem 2rem',
  textAlign: 'center',
};

const emptyIconWrapStyle: CSSProperties = {
  width: 52,
  height: 52,
  background: 'var(--sage)',
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 1rem',
};

const emptyTextStyle: CSSProperties = {
  fontSize: 14,
  color: 'var(--muted)',
  fontWeight: 300,
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid var(--cfg-border)',
};

const footerDotStyle: CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: '50%',
  background: 'var(--sage-mid)',
};

const footerTextStyle: CSSProperties = {
  fontSize: 11.5,
  color: 'var(--faint)',
  fontWeight: 300,
};

const btnNew: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: 'var(--ink)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '11px 20px',
  fontSize: 13.5,
  fontFamily: 'var(--font-dm-sans), sans-serif',
  fontWeight: 400,
  cursor: 'pointer',
};

const searchInput: CSSProperties = {
  width: '100%',
  background: 'var(--cream)',
  border: '1.5px solid var(--cfg-border)',
  borderRadius: 12,
  padding: '12px 16px 12px 44px',
  fontSize: 14,
  color: 'var(--ink)',
  fontFamily: 'var(--font-dm-sans), sans-serif',
  fontWeight: 300,
  outline: 'none',
};

const thStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '1.2px',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  padding: '12px 16px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '13px 16px',
  fontSize: 13.5,
  color: 'var(--ink)',
  verticalAlign: 'middle',
};

const avatarStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: 'var(--sage)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--sage-deep)',
  flexShrink: 0,
};

const osPill: CSSProperties = {
  display: 'inline-block',
  background: 'var(--lavender)',
  color: 'var(--lavender-deep)',
  fontSize: 10.5,
  fontWeight: 500,
  borderRadius: 6,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};

const btnIconBase: CSSProperties = {
  height: 32,
  borderRadius: 9,
  border: '1.5px solid var(--cfg-border)',
  background: 'white',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: 12,
  fontFamily: 'var(--font-dm-sans), sans-serif',
  fontWeight: 400,
  color: 'var(--muted)',
  padding: '0 10px',
  whiteSpace: 'nowrap',
};

const btnHistory: CSSProperties = {
  background: 'var(--lavender)',
  borderColor: 'var(--lavender)',
  color: 'var(--lavender-deep)',
};

const btnProfile: CSSProperties = {
  background: 'var(--sage)',
  borderColor: 'var(--sage)',
  color: 'var(--sage-deep)',
};

const btnDelete: CSSProperties = {
  color: 'var(--rose-deep)',
  borderColor: 'var(--rose-mid)',
};
