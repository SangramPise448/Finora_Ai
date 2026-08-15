import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getPasswordValidation = () => {
    return {
      hasMinLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  };

  const val = getPasswordValidation();
  const isPasswordValid = val.hasMinLength && val.hasUpper && val.hasLower && val.hasNumber && val.hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet the security requirements below.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/auth/reset-password-direct`, {
        email: cleanEmail,
        new_password: password
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      console.error(err);
      let msg = 'Failed to update password. Please verify your email.';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        msg = detail[0].msg;
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-secondary)] relative flex items-center justify-center px-4 overflow-hidden font-sans">
      <div className="glow-blob animate-blob-drift" style={{ position: 'absolute', width: '500px', height: '500px', top: '-10rem', left: '-10rem', backgroundColor: 'var(--primary)', borderRadius: '9999px', filter: 'blur(130px)', opacity: 0.1, pointerEvents: 'none' }} />
      <div className="glow-blob animate-blob-drift" style={{ position: 'absolute', width: '450px', height: '450px', bottom: '2.5rem', right: '-5rem', backgroundColor: 'var(--secondary)', borderRadius: '9999px', filter: 'blur(130px)', opacity: 0.1, pointerEvents: 'none' }} />

      <div className="w-full max-w-md relative z-10 my-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/" className="w-14 h-14 rounded-2xl overflow-hidden mb-4 block flex-none shadow-xl hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Finora AI" className="w-full h-full object-cover block" />
          </Link>
          <h2 className="font-display text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Reset Password</h2>
          <p className="text-xs text-[var(--text-dim)] mt-1">Enter your registered email and choose a new password</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border border-[var(--border-default)] shadow-2xl bg-[var(--bg-secondary)]/80 backdrop-blur-xl rounded-3xl relative overflow-hidden"
        >
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-semibold text-center leading-relaxed">
              {error}
            </div>
          )}

          {success ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Password Updated!</h3>
              <p className="text-xs text-[var(--text-dim)]">Your password has been changed successfully in MongoDB. Redirecting to Sign In...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Registered Email</label>
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

              {/* New Password */}
              <div>
                <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">New Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, A-Z, 0-9, @#$"
                    className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50"
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 flex items-center text-[var(--text-dim)] hover:text-white z-10"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 flex items-center text-[var(--text-dim)] pointer-events-none z-10">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    disabled={loading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="fintech-input fintech-input-icon py-2.5 text-sm disabled:opacity-50"
                    style={{ paddingLeft: '2.75rem' }}
                    required
                  />
                </div>
              </div>

              {/* Password Requirement Rules */}
              {password && (
                <div className="p-3 bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl space-y-1 text-[11px]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-1 font-medium">
                    <span className={val.hasMinLength ? 'text-emerald-400' : 'text-rose-400'}>{val.hasMinLength ? '✓' : '✕'} At least 8 chars</span>
                    <span className={val.hasUpper ? 'text-emerald-400' : 'text-rose-400'}>{val.hasUpper ? '✓' : '✕'} Uppercase (A-Z)</span>
                    <span className={val.hasLower ? 'text-emerald-400' : 'text-rose-400'}>{val.hasLower ? '✓' : '✕'} Lowercase (a-z)</span>
                    <span className={val.hasNumber ? 'text-emerald-400' : 'text-rose-400'}>{val.hasNumber ? '✓' : '✕'} Number (0-9)</span>
                    <span className={val.hasSpecial ? 'text-emerald-400' : 'text-rose-400'}>{val.hasSpecial ? '✓' : '✕'} Special (@#$)</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isPasswordValid || !email || password !== confirmPassword}
                className="w-full fintech-button-primary py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 btn-glow mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                ) : (
                  <>Save Password <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}
        </motion.div>

        <p className="text-center text-xs text-[var(--text-dim)] mt-6">
          Remembered your password?{' '}
          <Link to="/login" className="text-[var(--primary-light)] hover:underline font-bold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
