'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Plus, MessageCircle, Share2, Calendar as CalendarIcon, Pencil } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment } from '../../types';
import { createClient } from '../../lib/supabase';
import Tooltip from '../Tooltip';

const supabase = createClient();

interface CalendarViewProps {
  appointments: Appointment[];
  onEdit: (appt: Appointment) => void;
  onNew: (date: Date) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function CalendarView({ appointments, onEdit, onNew, onShare, onDelete, onRefresh }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [savingArrivalId, setSavingArrivalId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      if (!map[appt.date]) map[appt.date] = [];
      map[appt.date].push(appt);
    });
    return map;
  }, [appointments]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedDayAppointments = appointmentsByDate[selectedDateStr] || [];

  const toggleArrived = async (id: string) => {
    setSavingArrivalId(id);
    try {
      const appt = appointments.find(a => a.id === id);
      const newStatus = appt?.status === 'arrived' ? 'pending' : 'arrived';
      
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('No se pudo actualizar el estado.');
    } finally {
      setSavingArrivalId(null);
    }
  };

  const openWhatsApp = (phone: string, name: string, date: string, time: string) => {
    const formattedDate = format(new Date(date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es });
    const message = `Hola ${name}, te recordamos tu turno en el Consultorio Dental para el día ${formattedDate} a las ${time}. ¡Te esperamos!`;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={containerStyle}>
      <div style={calendarCardStyle}>
        {/* Header del Calendario */}
        <div style={calendarHeaderStyle}>
          <div>
            <h2 style={monthTitleStyle}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
          </div>
          <div style={navButtonsStyle}>
            <button onClick={goToToday} style={todayBtnStyle}>Hoy</button>
            <div style={arrowsWrapperStyle}>
              <button onClick={prevMonth} style={navBtnStyle} aria-label="Mes anterior">
                <ChevronLeft size={isMobile ? 16 : 18} />
              </button>
              <button onClick={nextMonth} style={navBtnStyle} aria-label="Mes siguiente">
                <ChevronRight size={isMobile ? 16 : 18} />
              </button>
            </div>
          </div>
        </div>

        {/* Grilla de Días de la Semana */}
        <div style={weekDaysGridStyle}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={i} style={weekDayLabelStyle}>{isMobile ? day : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}</div>
          ))}
        </div>

        {/* Grilla del Calendario */}
        <div style={calendarGridStyle}>
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAppts = appointmentsByDate[dateStr] || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);
            const hasAppts = dayAppts.length > 0;
            const allAttended = hasAppts && dayAppts.every(a => a.status === 'arrived');
            const dayIsToday = isToday(day);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                style={{
                  ...dayCellStyle,
                  opacity: isCurrentMonth ? 1 : 0.3,
                  backgroundColor: isSelected ? 'var(--sage-deep)' : (dayIsToday ? 'var(--sage-light)' : 'transparent'),
                  color: isSelected ? 'white' : 'var(--ink)',
                  border: dayIsToday && !isSelected ? '1px solid var(--sage-dark)' : 'none',
                }}
              >
                <span style={{ 
                  fontSize: isMobile ? 12 : 14, 
                  fontWeight: dayIsToday || isSelected ? 700 : 400,
                }}>
                  {format(day, 'd')}
                </span>
                
                {hasAppts && !isSelected && (
                  <div style={{
                    ...dotStyle,
                    backgroundColor: allAttended ? 'var(--sage-dark)' : 'var(--accent)',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      <div style={detailsCardStyle}>
        <div style={detailsHeaderStyle}>
          <div style={{ flex: 1 }}>
            <h3 style={detailsTitleStyle}>
              {selectedDate ? format(selectedDate, isMobile ? "d 'de' MMMM" : "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
            </h3>
            <span style={detailsBadgeStyle}>
              {selectedDayAppointments.length} turno{selectedDayAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button 
            onClick={() => selectedDate && onNew(selectedDate)}
            style={btnNewDayStyle}
          >
            <Plus size={14} /> {isMobile ? '' : 'Nuevo'}
          </button>
        </div>

        {selectedDayAppointments.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}><CalendarIcon size={24} /></div>
            <p>No hay turnos para este día.</p>
            <button 
              onClick={() => selectedDate && onNew(selectedDate)}
              style={btnEmptyAddStyle}
            >
              Agendar turno
            </button>
          </div>
        ) : (
          <div style={apptListStyle}>
            {selectedDayAppointments
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((appt) => {
                const isArrived = appt.status === 'arrived';
                const isSaving = savingArrivalId === appt.id;
                
                return (
                  <div key={appt.id} style={{
                    ...apptItemStyle,
                    backgroundColor: isArrived ? 'var(--sage-pale)' : 'var(--cream)',
                    borderLeft: isArrived ? '4px solid var(--sage-dark)' : '4px solid transparent',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? '0.5rem' : '1rem',
                  }}>
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '1rem' }}>
                      <div style={apptTimeStyle}>{appt.time}</div>
                      <div style={apptInfoStyle}>
                        <div style={patientNameStyle}>{appt.patient?.name || 'Sin nombre'}</div>
                        <div style={metaRowStyle}>
                          <span style={apptReasonStyle}>{appt.reason || 'Consulta'}</span>
                          {appt.patient?.os && <span style={osBadgeStyle}>{appt.patient.os}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      ...apptActionsWrapperStyle,
                      width: isMobile ? '100%' : 'auto',
                      justifyContent: isMobile ? 'space-between' : 'flex-end',
                      marginTop: isMobile ? '4px' : '0',
                      paddingTop: isMobile ? '8px' : '0',
                      borderTop: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      <Tooltip text={isArrived ? 'Quitar llegada ↩️' : 'Marcar llegada ✅'}>
                        <button 
                          onClick={() => toggleArrived(appt.id)}
                          disabled={isSaving}
                          style={{
                            ...arrivalBtnStyle,
                            backgroundColor: isArrived ? 'var(--sage-deep)' : 'white',
                            color: isArrived ? 'white' : 'var(--muted)',
                          }}
                        >
                          {isArrived ? <Check size={12} /> : null}
                          {isSaving ? '...' : 'Llegó'}
                        </button>
                      </Tooltip>

                      <div style={iconActionsStyle}>
                        {appt.patient?.phone && (
                          <Tooltip text="Enviar recordatorio 📱">
                            <button 
                              onClick={() => openWhatsApp(appt.patient!.phone!, appt.patient!.name, appt.date, appt.time)}
                              style={iconBtnStyle}
                            >
                              <MessageCircle size={14} color="#25D366" />
                            </button>
                          </Tooltip>
                        )}
                        
                        <Tooltip text="Compartir link 🔗">
                          <button onClick={() => onShare(appt.id)} style={iconBtnStyle}>
                            <Share2 size={14} color="var(--sage-deep)" />
                          </button>
                        </Tooltip>

                        <Tooltip text="Editar turno ✨">
                          <button onClick={() => onEdit(appt)} style={iconBtnStyle}>
                            <Pencil size={14} color="var(--muted)" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// Estilos
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  marginTop: '1rem',
  width: '100%',
};

const calendarCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 24,
  padding: '1.25rem',
  border: '1px solid var(--cfg-border)',
  boxShadow: 'var(--shadow)',
};

const calendarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.25rem',
  gap: '8px',
};

const monthTitleStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontFamily: 'var(--font-dm-serif)',
  textTransform: 'capitalize',
  color: 'var(--ink)',
};

const navButtonsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const arrowsWrapperStyle: React.CSSProperties = {
  display: 'flex',
  background: 'var(--cream)',
  padding: '2px',
  borderRadius: '10px',
  border: '1px solid var(--cfg-border)',
};

const todayBtnStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: '8px',
  border: '1px solid var(--cfg-border)',
  background: 'white',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--ink)',
};

const navBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--muted)',
};

const weekDaysGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  marginBottom: '0.5rem',
};

const weekDayLabelStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '0.65rem',
  fontWeight: 700,
  color: 'var(--faint)',
  textTransform: 'uppercase',
  paddingBottom: '0.5rem',
};

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '2px',
};

const dayCellStyle: React.CSSProperties = {
  aspectRatio: '1/1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  position: 'relative',
  transition: 'all 0.15s ease',
  padding: 0,
};

const dotStyle: React.CSSProperties = {
  width: 4,
  height: 4,
  borderRadius: '50%',
  marginTop: 2,
};

const detailsCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 24,
  padding: '1.25rem',
  border: '1px solid var(--cfg-border)',
  boxShadow: 'var(--shadow)',
};

const detailsHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid var(--cfg-border)',
  gap: '10px',
};

const detailsTitleStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontFamily: 'var(--font-dm-serif)',
  color: 'var(--ink)',
  textTransform: 'capitalize',
};

const detailsBadgeStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  background: 'var(--sage)',
  color: 'var(--sage-deep)',
  padding: '2px 8px',
  borderRadius: 20,
  fontWeight: 600,
  marginTop: '2px',
  display: 'inline-block',
};

const btnNewDayStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  padding: '8px 12px',
  borderRadius: '10px',
  background: 'var(--ink)',
  color: 'white',
  border: 'none',
  fontSize: '0.8rem',
  fontWeight: 500,
  cursor: 'pointer',
  minWidth: '36px',
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '2rem 1rem',
  color: 'var(--faint)',
};

const emptyIconStyle: React.CSSProperties = {
  marginBottom: '0.75rem',
  opacity: 0.3,
};

const btnEmptyAddStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '8px 16px',
  borderRadius: '10px',
  background: 'white',
  border: '1.5px solid var(--cfg-border)',
  color: 'var(--muted)',
  fontSize: '0.8rem',
  cursor: 'pointer',
};

const apptListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const apptItemStyle: React.CSSProperties = {
  display: 'flex',
  padding: '0.85rem',
  borderRadius: '16px',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
  width: '100%',
};

const apptTimeStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: 'var(--ink)',
  minWidth: '50px',
};

const apptInfoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const patientNameStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 500,
  color: 'var(--ink)',
  marginBottom: '2px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap',
};

const apptReasonStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--muted)',
};

const osBadgeStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  background: 'var(--lavender)',
  color: 'var(--lavender-deep)',
  padding: '1px 5px',
  borderRadius: '4px',
  fontWeight: 600,
  textTransform: 'uppercase',
};

const apptActionsWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const arrivalBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid var(--cfg-border)',
  fontSize: '0.7rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const iconActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
};

const iconBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '7px',
  border: '1px solid var(--cfg-border)',
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};
