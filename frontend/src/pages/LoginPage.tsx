import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FloatingShapes } from '../components/ui/UIComponents';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login, sessionExpiredAlert, dismissSessionAlert } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const { apiClient } = await import('../utils/apiClient');
      const res = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password
      });

      const payload = res.data.data || res.data;
      login(payload.access_token, payload.user, rememberMe, payload.refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err.response?.data?.message || 'Invalid email or password. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-secondary)] relative flex items-center justify-center px-4 overflow-hidden font-sans">
      <FloatingShapes />
      <div className="glow-blob animate-blob-drift" style={{ position: 'absolute', width: '500px', height: '500px', top: '-10rem', left: '-10rem', backgroundColor: 'var(--primary)', borderRadius: '9999px', filter: 'blur(130px)', opacity: 0.15, pointerEvents: 'none' }} />
      <div className="glow-blob animate-blob-drift" style={{ position: 'absolute', width: '450px', height: '450px', bottom: '2.5rem', right: '-5rem', backgroundColor: 'var(--secondary)', borderRadius: '9999px', filter: 'blur(130px)', opacity: 0.15, pointerEvents: 'none' }} />

      <div className="w-full max-w-md relative z-10 my-8">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/" className="w-14 h-14 rounded-2xl overflow-hidden mb-4 block flex-none shadow-xl hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Finora AI" className="w-full h-full object-cover block" />
          </Link>
          <h2 className="font-display text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Welcome Back</h2>
          <p className="text-xs text-[var(--text-dim)] mt-1 flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-light)]" /> Access your Finora AI workspace
          </p>
        </div>

        {/* Session Expired Alert */}
        {sessionExpiredAlert && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-semibold flex items-center justify-between gap-2">
            <span>Your session has expired. Please sign in again.</span>
            <button onClick={dismissSessionAlert} className="text-amber-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card p-8 border border-[var(--border-default)] shadow-2xl bg-[var(--bg-secondary)]/80 backdrop-blur-xl rounded-3xl space-y-6"
        >
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-semibold text-center leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email" 
                  value={email} 
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50" 
                  style={{ paddingLeft: '2.75rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-[var(--primary-light)] hover:underline font-semibold">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password" 
                  value={password} 
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50" 
                  style={{ paddingLeft: '2.75rem' }}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--primary)] focus:ring-0"
                />
                <span className="text-[var(--text-muted)] font-medium">Remember me</span>
              </label>
              <span className="text-[10px] text-[var(--text-dim)] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Encrypted Session
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full fintech-button-primary py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 btn-glow mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-dim)] mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-[var(--primary-light)] font-bold hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
