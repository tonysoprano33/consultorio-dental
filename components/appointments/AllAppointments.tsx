'use client';

import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Check, LayoutGrid, List, Pencil, Plus, Search, Share2, Trash2 } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Appointment } from '../../types';
import AppointmentModal from './AppointmentModal';
import CalendarView from './CalendarView';

const supabase = createClient();

export default function AllAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'arrived'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const itemsPerPage = 15;

  const deferredSearch = useDeferredValue(search);

  const loadAppointments = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('appointments')
      .select('*, patient:patients(id, name, os, phone)')
      .order('date', { ascending: false })
      .order('time', { ascending: true });

    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const availableYears = useMemo(
    () =>
      [...new Set(appointments.map((appointment) => appointment.date.substring(0, 4)))].sort(
        (a, b) => Number(b) - Number(a)
      ),
    [appointments]
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, yearFilter, statusFilter]);

  const filtered = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const patientName = (appointment.patient as any)?.name?.toLowerCase() || '';

      return (
        (!normalizedSearch || patientName.includes(normalizedSearch)) &&
        (!yearFilter || appointment.date.startsWith(yearFilter)) &&
        (statusFilter === 'all' || appointment.status === statusFilter)
      );
    });
  }, [appointments, deferredSearch, statusFilter, yearFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const deleteAppointment = async (id: string) => {
    if (!confirm('¿Eliminar este turno permanentemente?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    await loadAppointments();
  };

  const shareAppointment = (id: string) => {
    const url = `${window.location.origin}/turno/${id}`;
    void navigator.clipboard.writeText(url);
    alert('Link del turno copiado.');
  };

  const fmtDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            Todos los <em style={titleAccentStyle}>turnos</em>
          </h1>
          <p style={subtitleStyle}>
            {filtered.length} turno{filtered.length !== 1 ? 's' : ''} encontrado
            {filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={toggleGroupStyle}>
            <button 
              onClick={() => setViewMode('table')} 
              style={{ ...toggleBtnStyle, ...(viewMode === 'table' ? toggleBtnActive : {}) }}
              title="Vista de tabla"
            >
              <List size={16} />
            </button>
            <button 
              onClick={() => setViewMode('calendar')} 
              style={{ ...toggleBtnStyle, ...(viewMode === 'calendar' ? toggleBtnActive : {}) }}
              title="Vista de agenda"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingAppt(null);
              setModalOpen(true);
            }}
            style={btnNew}
          >
            <Plus size={14} />
            Nuevo turno
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          <div style={filtersRowStyle}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search
                size={15}
                color="var(--faint)"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                placeholder="Buscar por paciente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ ...filterInput, paddingLeft: 40 }}
              />
            </div>

            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} style={filterSelect}>
              <option value="">Todos los años</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'pending' | 'arrived')}
              style={filterSelect}
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="arrived">Atendidos</option>
            </select>

            <button
              onClick={() => {
                setSearch('');
                setYearFilter('');
                setStatusFilter('all');
              }}
              style={btnClear}
            >
              Limpiar filtros
            </button>
          </div>

          <div style={tableCardStyle}>
            {loading ? (
              <p style={emptyTextStyle}>Cargando turnos...</p>
            ) : filtered.length === 0 ? (
              <p style={emptyTextStyle}>No se encontraron turnos con los filtros aplicados</p>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--cfg-border)' }}>
                        {['Fecha', 'Hora', 'Paciente', 'Motivo', 'Obra social', 'Estado', ''].map((header) => (
                          <th key={header} style={thStyle}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((appointment) => {
                        const patient = appointment.patient as any;
                        const isArrived = appointment.status === 'arrived';

                        return (
                          <tr key={appointment.id} style={{ borderBottom: '1px solid var(--cfg-border)' }}>
                            <td style={{ ...tdStyle, color: 'var(--muted)', fontWeight: 300 }}>{fmtDate(appointment.date)}</td>
                            <td style={{ ...tdStyle, color: 'var(--muted)', fontWeight: 300 }}>{appointment.time}</td>
                            <td style={{ ...tdStyle, fontWeight: 500 }}>{patient?.name || '—'}</td>
                            <td style={{ ...tdStyle, color: 'var(--muted)', fontWeight: 300 }}>{appointment.reason || '—'}</td>
                            <td style={tdStyle}>
                              {patient?.os ? (
                                <span style={osPill}>{patient.os}</span>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontWeight: 300 }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              <span style={{ ...badge, ...(isArrived ? badgeDone : badgePending) }}>
                                {isArrived && <Check size={10} />}
                                {isArrived ? 'Atendido' : 'Pendiente'}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => shareAppointment(appointment.id)}
                                  style={btnIcon}
                                  title="Compartir"
                                >
                                  <Share2 size={13} color="var(--sage-deep)" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAppt(appointment);
                                    setModalOpen(true);
                                  }}
                                  style={btnIcon}
                                  aria-label="Editar turno"
                                >
                                  <Pencil size={13} color="var(--muted)" />
                                </button>

                                <button
                                  onClick={() => deleteAppointment(appointment.id)}
                                  style={{ ...btnIcon, ...btnIconDanger }}
                                  aria-label="Eliminar turno"
                                >
                                  <Trash2 size={13} color="var(--danger-text)" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={paginationContainer}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      style={{ ...btnPagination, opacity: currentPage === 1 ? 0.4 : 1 }}
                    >
                      Anterior
                    </button>
                    
                    <div style={paginationJumpWrapper}>
                      <span>Página</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= 1 && val <= totalPages) setCurrentPage(val);
                        }}
                        style={jumpInputStyle}
                      />
                      <span>de {totalPages}</span>
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      style={{ ...btnPagination, opacity: currentPage === totalPages ? 0.4 : 1 }}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <CalendarView 
          appointments={appointments}
          onEdit={(appt) => {
            setEditingAppt(appt);
            setSelectedDate(null);
            setModalOpen(true);
          }}
          onNew={(date) => {
            const dateStr = date.toISOString().split('T')[0];
            setSelectedDate(dateStr);
            setEditingAppt(null);
            setModalOpen(true);
          }}
          onRefresh={loadAppointments}
          onShare={shareAppointment}
          onDelete={deleteAppointment}
        />
      )}

      <div style={footerStyle}>
        <div style={footerDotStyle} />
        <span style={footerTextStyle}>
          <strong style={{ fontWeight: 400, color: 'var(--muted)' }}>Consultorio Dental</strong> · Dra. Nazarena ·
          Datos en Supabase
        </span>
        <div style={footerDotStyle} />
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editAppt={editingAppt}
        onSaved={loadAppointments}
        initialDate={selectedDate}
      />
    </div>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 900,
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

const filtersRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginBottom: '1rem',
  alignItems: 'center',
};

const tableCardStyle: CSSProperties = {
  background: 'white',
  border: '1px solid var(--cfg-border)',
  borderRadius: 20,
  overflow: 'hidden',
};

const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: 760,
  borderCollapse: 'collapse',
};

const emptyTextStyle: CSSProperties = {
  padding: '3rem',
  textAlign: 'center',
  color: 'var(--muted)',
  fontWeight: 300,
  fontSize: 14,
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

const filterInput: CSSProperties = {
  width: '100%',
  background: 'white',
  border: '1.5px solid var(--cfg-border)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 13.5,
  color: 'var(--ink)',
  fontFamily: 'var(--font-dm-sans), sans-serif',
  fontWeight: 300,
  outline: 'none',
};

const filterSelect: CSSProperties = {
  background: 'white',
  border: '1.5px solid var(--cfg-border)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  color: 'var(--ink)',
  fontFamily: 'var(--font-dm-sans), sans-serif',
  outline: 'none',
  cursor: 'pointer',
};

const btnClear: CSSProperties = {
  border: '1.5px solid var(--cfg-border)',
  background: 'white',
  color: 'var(--muted)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  fontFamily: 'var(--font-dm-sans), sans-serif',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const thStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '1.2px',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  padding: '12px 14px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '12px 14px',
  fontSize: 13.5,
  color: 'var(--ink)',
  verticalAlign: 'middle',
};

const osPill: CSSProperties = {
  display: 'inline-block',
  background: 'var(--lavender)',
  color: 'var(--lavender-deep)',
  fontSize: 10.5,
  fontWeight: 500,
  borderRadius: 6,
  padding: '2px 8px',
};

const badge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 11,
  fontWeight: 500,
  borderRadius: 6,
  padding: '3px 9px',
  whiteSpace: 'nowrap',
};

const badgeDone: CSSProperties = {
  background: 'var(--sage)',
  color: 'var(--sage-deep)',
};

const badgePending: CSSProperties = {
  background: 'var(--sage-pale)',
  color: 'var(--sage-deep)',
};

const btnIcon: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1.5px solid var(--cfg-border)',
  background: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const btnIconDanger: CSSProperties = {
  borderColor: 'var(--danger-border)',
  background: 'var(--danger-bg)',
};

const paginationContainer: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  padding: '1.25rem',
  borderTop: '1px solid var(--cfg-border)',
  background: '#fafafa',
};

const btnPagination: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid var(--cfg-border)',
  background: 'white',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--ink)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const paginationInfo: CSSProperties = {
  fontSize: 13,
  color: 'var(--muted)',
  fontWeight: 300,
};

const paginationJumpWrapper: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  color: 'var(--muted)',
  fontWeight: 300,
};

const jumpInputStyle: CSSProperties = {
  width: 50,
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid var(--cfg-border)',
  textAlign: 'center',
  background: 'white',
  fontWeight: 600,
  color: 'var(--ink)',
  fontSize: 13,
  outline: 'none',
};

const toggleGroupStyle: CSSProperties = {
  display: 'flex',
  background: 'var(--sage-pale)',
  padding: 4,
  borderRadius: 14,
  border: '1px solid var(--cfg-border)',
};

const toggleBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  color: 'var(--muted)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const toggleBtnActive: CSSProperties = {
  background: 'white',
  color: 'var(--sage-deep)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};
