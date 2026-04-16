'use client';

import { useEffect, useState, useMemo } from 'react';
import { Trophy, Star, Target, CheckCircle2, Sparkles } from 'lucide-react';
import { createClient } from '../lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const supabase = createClient();

export default function AchievementPanel() {
  const [attendedCount, setAttendedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMonthlyStats = async () => {
    const now = new Date();
    const firstDay = format(startOfMonth(now), 'yyyy-MM-dd');
    const lastDay = format(endOfMonth(now), 'yyyy-MM-dd');

    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'arrived')
      .gte('date', firstDay)
      .lte('date', lastDay);

    if (!error) {
      setAttendedCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMonthlyStats();
    
    // Escuchar cambios para actualizar en tiempo real
    const channel = supabase
      .channel('achievements-refresh')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, () => {
        loadMonthlyStats();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const { goal, nextGoal, progress, reached } = useMemo(() => {
    const count = attendedCount || 0;
    let currentGoal = 10;
    if (count >= 10) currentGoal = 15;
    if (count >= 15) currentGoal = 20;
    if (count >= 20) currentGoal = 30;
    if (count >= 30) currentGoal = 50;
    
    const prevGoal = currentGoal === 10 ? 0 : (currentGoal === 15 ? 10 : (currentGoal === 20 ? 15 : 20));
    const goalRange = currentGoal - prevGoal;
    const currentProgress = count - prevGoal;
    const percent = Math.min(Math.round((currentProgress / goalRange) * 100), 100);

    return {
      goal: currentGoal,
      nextGoal: currentGoal + 5,
      progress: percent,
      reached: count >= currentGoal && count > 0
    };
  }, [attendedCount]);

  if (loading || attendedCount === null) return null;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleGroupStyle}>
            <Target size={18} color="var(--sage-deep)" />
            <span style={titleStyle}>Meta Mensual</span>
          </div>
          <span style={countStyle}>
            <strong style={{ fontSize: 16 }}>{attendedCount}</strong>
            <span style={{ opacity: 0.6, fontSize: 12 }}> / {goal} pacientes</span>
          </span>
        </div>

        <div style={progressWrapperStyle}>
          <div style={{ ...progressBarStyle, width: `${progress}%` }}>
            {progress > 15 && <Sparkles size={10} style={sparkleStyle} />}
          </div>
        </div>

        <div style={footerStyle}>
          {reached ? (
            <div style={reachedStyle}>
              <Trophy size={14} />
              <span>¡Meta alcanzada! ¡Sos una genia, Doc! 👑</span>
            </div>
          ) : (
            <div style={pendingStyle}>
              <Star size={12} />
              <span>Faltan {goal - attendedCount} para el próximo logro ✨</span>
            </div>
          )}
        </div>
      </div>
      
      {reached && (
        <div style={celebrationOverlayStyle}>
          {['🎉', '✨', '🦷', '💖', '⭐'].map((emoji, i) => (
            <span key={i} style={{ ...emojiStyle, animationDelay: `${i * 0.2}s`, left: `${10 + i * 20}%` }}>
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
  position: 'relative',
  overflow: 'hidden',
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, white 0%, var(--sage-pale) 100%)',
  borderRadius: 20,
  padding: '1.25rem',
  border: '1px solid var(--cfg-border)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const titleGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--sage-deep)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const countStyle: React.CSSProperties = {
  color: 'var(--ink)',
  display: 'flex',
  alignItems: 'baseline',
  gap: '4px',
};

const progressWrapperStyle: React.CSSProperties = {
  height: 10,
  background: 'rgba(0,0,0,0.05)',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: '0.75rem',
  position: 'relative',
};

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  background: 'var(--sage-deep)',
  borderRadius: 10,
  transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
  position: 'relative',
};

const sparkleStyle: React.CSSProperties = {
  position: 'absolute',
  right: 6,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'white',
};

const footerStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
};

const reachedStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#d4af37', // Gold-ish
  animation: 'pulse 2s infinite',
};

const pendingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: 'var(--muted)',
};

const celebrationOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 10,
};

const emojiStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: -20,
  fontSize: '1.5rem',
  animation: 'floatUp 3s ease-out forwards',
  opacity: 0,
};
