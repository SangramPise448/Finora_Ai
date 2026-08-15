import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FloatingShapes } from '../components/ui/UIComponents';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = () => {
    if (!password) return { score: 0, text: 'No password', color: 'bg-[var(--border-subtle)]' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 0: case 1: return { score: 20, text: 'Very Weak', color: 'bg-[var(--danger)]' };
      case 2: return { score: 40, text: 'Weak', color: 'bg-[var(--warning)]' };
      case 3: return { score: 60, text: 'Medium', color: 'bg-yellow-500' };
      case 4: return { score: 80, text: 'Strong', color: 'bg-[var(--accent)]' };
      case 5: return { score: 100, text: 'Ultra Secure', color: 'bg-[var(--blue-glow)] shadow-neon-glow' };
      default: return { score: 0, text: 'No password', color: 'bg-[var(--border-subtle)]' };
    }
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!name || !cleanEmail || !cleanPhone || !password) { setError('Please fill in all required fields.'); return; }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) { setError('Please enter a valid 10-digit mobile number (e.g. 9876543210).'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters long.'); return; }
    
    setError('');
    setLoading(true);
    try {
      await register(cleanEmail, name, cleanPhone, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      let msg = 'Failed to create account. Please try again.';
      const responseData = err.response?.data;
      const detail = responseData?.detail;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0]?.msg || detail[0]?.message || 'Invalid registration details provided.';
      } else if (typeof detail === 'object' && detail?.message) {
        msg = detail.message;
      } else if (responseData?.message && typeof responseData.message === 'string') {
        msg = responseData.message;
      } else if (err.message) {
        msg = err.message;
      }
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
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/" className="w-14 h-14 rounded-2xl overflow-hidden mb-4 block flex-none shadow-xl hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Finora AI" className="w-full h-full object-cover block" />
          </Link>
          <h2 className="font-display text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Create Account</h2>
          <p className="text-xs text-[var(--text-dim)] mt-1 flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-light)]" /> Start your AI-powered financial journey
          </p>
        </div>

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
              <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10"><User className="w-4 h-4" /></span>
                <input type="text" value={name} disabled={loading} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50" style={{ paddingLeft: '2.75rem' }} required />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10"><Mail className="w-4 h-4" /></span>
                <input type="email" value={email} disabled={loading} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50" style={{ paddingLeft: '2.75rem' }} required />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Phone Number</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10"><Phone className="w-4 h-4" /></span>
                <input type="tel" value={phone} disabled={loading} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50 font-mono" style={{ paddingLeft: '2.75rem' }} required />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10"><Lock className="w-4 h-4" /></span>
                <input type="password" value={password} disabled={loading} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50" style={{ paddingLeft: '2.75rem' }} required />
              </div>
            </div>

            {password && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[var(--text-dim)] font-bold uppercase tracking-wider">Strength:</span>
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary-light)]" /> {strength.text}
                  </span>
                </div>
                <div className="w-full bg-[var(--surface-glass)] h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.score}%` }} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full fintech-button-primary py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 btn-glow disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
              ) : (
                <>Register & Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </motion.div>

        <p className="text-center text-xs text-[var(--text-dim)] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--primary-light)] hover:underline font-bold transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
