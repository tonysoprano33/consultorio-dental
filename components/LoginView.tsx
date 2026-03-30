'use client';

import { useState } from 'react';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import { createClient } from '../lib/supabase';

const supabase = createClient();

export default function LoginView({ onLogin }: { onLogin?: () => void | Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      try {
        await onLogin?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo continuar luego del login.');
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.5rem 4rem', fontFamily: 'var(--font-dm-sans), sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 34, color: 'var(--ink)', letterSpacing: '-0.5px' }}>Consultorio Dental</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Dra. Nazarena</p>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--cfg-border)', borderRadius: 20, padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 64, height: 64, background: 'var(--sage)', borderRadius: 16, margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage-deep)' }}>
              <Lock size={28} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>Iniciar sesion</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Solo personal autorizado</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--faint)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nazarena@consultorio.com"
                  style={{
                    width: '100%',
                    background: 'var(--cream)',
                    border: '1.5px solid var(--cfg-border)',
                    borderRadius: 12,
                    padding: '13px 16px 13px 44px',
                    fontSize: 14.5,
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Contrasena</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--faint)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  style={{
                    width: '100%',
                    background: 'var(--cream)',
                    border: '1.5px solid var(--cfg-border)',
                    borderRadius: 12,
                    padding: '13px 16px 13px 44px',
                    fontSize: 14.5,
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eef7f0', color: 'var(--sage-deep)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'var(--ink)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 400,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '1rem',
                width: '100%',
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesion'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
