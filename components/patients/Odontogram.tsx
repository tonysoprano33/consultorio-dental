'use client';

import { useState, type CSSProperties } from 'react';
import { createClient } from '../../lib/supabase';

const supabase = createClient();

interface Props {
  patientId: string;
  initialData?: Record<number, { status: string; notes?: string }>;
}

const TOOTH_STATUS = [
  { id: 'none', label: 'Sano', color: '#e2e8f0' },
  { id: 'to-treat', label: 'A Tratar', color: '#ef4444' },
  { id: 'treated', label: 'Tratado', color: '#3b82f6' },
  { id: 'absent', label: 'Ausente', color: '#1e293b' },
];

export default function Odontogram({ patientId, initialData = {} }: Props) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);

  // FDI Tooth Numbers
  const upperAdult = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerAdult = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  
  const toggleTooth = async (num: number) => {
    const current = data[num]?.status || 'none';
    const nextIndex = (TOOTH_STATUS.findIndex(s => s.id === current) + 1) % TOOTH_STATUS.length;
    const nextStatus = TOOTH_STATUS[nextIndex].id as any;
    
    const newData = { ...data, [num]: { status: nextStatus } };
    setData(newData);
    
    setSaving(true);
    await supabase.from('patients').update({ odontogram: newData }).eq('id', patientId);
    setSaving(false);
  };

  const Tooth = ({ num }: { num: number }) => {
    const status = data[num]?.status || 'none';
    const config = TOOTH_STATUS.find(s => s.id === status);
    
    return (
      <div 
        onClick={() => toggleTooth(num)}
        style={{
          ...toothStyle,
          background: config?.color,
          color: status === 'absent' ? 'white' : 'var(--ink)'
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 600 }}>{num}</span>
        {status === 'absent' && <div style={xStyle}>X</div>}
      </div>
    );
  };

  return (
    <div style={container}>
      <div style={header}>
        <p style={legend}>Clic en cada diente para cambiar estado: 
          <span style={{ color: '#ef4444', marginLeft: 8 }}>● A Tratar</span>
          <span style={{ color: '#3b82f6', marginLeft: 8 }}>● Tratado</span>
          <span style={{ color: '#1e293b', marginLeft: 8 }}>● Ausente</span>
        </p>
        {saving && <span style={saveBadge}>Guardando...</span>}
      </div>

      <div style={gridWrap}>
        <div style={grid}>
          {/* Superior */}
          <div style={row}>
            {upperAdult.map(n => <Tooth key={n} num={n} />)}
          </div>
          
          {/* Inferior */}
          <div style={row}>
            {lowerAdult.map(n => <Tooth key={n} num={n} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

const container: CSSProperties = {
  background: 'white',
  padding: '1.25rem 1rem',
  borderRadius: 20,
  border: '1px solid var(--cfg-border)',
  width: '100%',
  overflow: 'hidden',
};

const header: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const legend: CSSProperties = {
  fontSize: 11,
  color: 'var(--muted)',
  margin: 0,
};

const saveBadge: CSSProperties = {
  fontSize: 10,
  color: 'var(--sage-deep)',
  background: 'var(--sage-light)',
  padding: '2px 8px',
  borderRadius: 4,
  alignSelf: 'flex-start',
};

const gridWrap: CSSProperties = {
  width: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  paddingBottom: '0.5rem',
};

const grid: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 'max-content',
  gap: 12,
};

const row: CSSProperties = {
  display: 'flex',
  gap: 4,
};

const toothStyle: CSSProperties = {
  width: 32,
  height: 40,
  borderRadius: '4px 4px 12px 12px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '1px solid rgba(0,0,0,0.05)',
  position: 'relative',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  flexShrink: 0,
};

const xStyle: CSSProperties = {
  position: 'absolute',
  fontSize: 18,
  fontWeight: 900,
  opacity: 0.5,
};
