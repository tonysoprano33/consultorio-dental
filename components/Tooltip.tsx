'use client';

import { useState, ReactNode, CSSProperties } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          ...tooltipContainerStyle,
          ...(position === 'top' ? { bottom: '130%' } : { top: '130%' })
        }}>
          {text}
          <div style={{
            ...tooltipArrowStyle,
            ...(position === 'top' 
              ? { top: '100%', borderTop: '6px solid var(--ink)' } 
              : { bottom: '100%', borderBottom: '6px solid var(--ink)', borderTop: 'none' })
          }} />
        </div>
      )}
    </div>
  );
}

const tooltipContainerStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'var(--ink)',
  color: 'white',
  padding: '6px 12px',
  borderRadius: '10px',
  fontSize: '0.7rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  zIndex: 1100,
  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  animation: 'tooltipIn 0.2s ease-out',
};

const tooltipArrowStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
};
