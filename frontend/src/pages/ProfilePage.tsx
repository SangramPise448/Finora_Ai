import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from '../components/SidebarLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Shield, Clock, RefreshCw, Key, LogOut, Trash2, ShieldAlert, X, Star, MessageSquare } from 'lucide-react';

import { apiClient } from '../utils/apiClient';

export default function ProfilePage() {
  const { user, token, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [loadingFb, setLoadingFb] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiClient.get('/finance/feedback/my')
      .then(res => {
        const d = res.data;
        const list = Array.isArray(d) ? d : (d?.data || []);
        setMyFeedback(Array.isArray(list) ? list : []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingFb(false));
  }, [token]);

  const [sessionTime, setSessionTime] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) return;
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordStatus('error:New passwords do not match.');
      return;
    }
    setLoading(true);
    setPasswordStatus('');
    setTimeout(() => {
      setLoading(false);
      setPasswordStatus('success:Password updated successfully (simulation).');
      setPasswordForm({ current: '', new: '', confirm: '' });
    }, 1500);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error(e);
      navigate('/login', { replace: true });
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to delete account. Please try again.';
      setDeleteError(detail);
      setDeleting(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'snpise448@gmail.com';

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8 font-sans">
        {/* Header */}
        <div className="border-b border-[var(--border-subtle)] pb-6">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5 font-display">
            <User className="w-8 h-8 text-[var(--primary-light)]" /> Account Management
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-1">View your profile details, secure credentials, session state, and account ownership settings.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* User Avatar Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            className="glass-card p-8 flex flex-col items-center text-center border border-[var(--border-default)] relative overflow-hidden lg:col-span-1 shadow-xl transition-all duration-300"
          >
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-r from-[var(--primary)]/10 to-[var(--secondary)]/10" />
            
            <div className="relative mt-8 mb-6 flex flex-col items-center">
              <div className="absolute -inset-2 rounded-3xl bg-[var(--primary)]/20 blur-xl opacity-70 pointer-events-none" />
              
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-4xl font-black shadow-2xl z-10">
                {user?.name?.[0]?.toUpperCase() || 'U'}
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-secondary)] shadow-md z-20 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </span>
              </div>
            </div>

            <div className="mb-4">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                Account Status: {user?.status ? user.status.toUpperCase() : 'ACTIVE'}
              </span>
            </div>

            <div className="space-y-1.5 z-10 mb-6">
              <h3 className="text-xl font-extrabold text-[var(--text-primary)] font-display tracking-tight">{user?.name}</h3>
              <p className="text-xs text-[var(--text-dim)] font-medium">{user?.email}</p>
            </div>

            <div className="mb-6 z-10">
              <span className="px-3 py-1 rounded-lg bg-[var(--primary-subtle)] border border-[var(--primary)]/20 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                System {user?.role || 'user'}
              </span>
            </div>

            <div className="w-full border-t border-[var(--border-subtle)] pt-5 space-y-3.5 text-left z-10">
              <div className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-dim)] font-bold uppercase tracking-wider text-[9px]">Account ID</span>
                <span className="font-mono text-[var(--text-primary)] font-bold">{user?.id?.slice(0, 8) || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-dim)] font-bold uppercase tracking-wider text-[9px]">Phone</span>
                <span className="font-mono text-[var(--text-primary)] font-bold">{user?.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[var(--text-dim)] font-bold uppercase tracking-wider text-[9px]">Session Active</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 animate-pulse" /> {formatSessionTime(sessionTime)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Account Settings Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Account Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8 border border-[var(--border-default)] space-y-6"
            >
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-display uppercase tracking-wider">
                <Shield className="w-5 h-5 text-[var(--primary-light)]" /> Account Information
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-2 uppercase tracking-wider">User Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-dim)] pointer-events-none">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={user?.name || ''}
                        readOnly
                        className="fintech-input pl-10 text-xs text-[var(--text-muted)] bg-[var(--surface-glass)]/25 cursor-not-allowed w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-2 uppercase tracking-wider">Primary Email</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-dim)] pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        className="fintech-input pl-10 text-xs text-[var(--text-muted)] bg-[var(--surface-glass)]/25 cursor-not-allowed w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-2 uppercase tracking-wider">Registered Phone Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-dim)] pointer-events-none">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={user?.phone || 'Not specified'}
                        readOnly
                        className="fintech-input pl-10 text-xs text-[var(--text-muted)] bg-[var(--surface-glass)]/25 cursor-not-allowed w-full font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-2 uppercase tracking-wider">Account Role</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-dim)] pointer-events-none">
                        <Shield className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={user?.role?.toUpperCase() || 'USER'}
                        readOnly
                        className="fintech-input pl-10 text-xs text-[var(--text-muted)] bg-[var(--surface-glass)]/25 cursor-not-allowed w-full font-mono uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-4 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-dim)] uppercase tracking-wider text-[9px]">Account ID</span>
                    <span className="text-[var(--text-primary)] font-mono">{user?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-dim)] uppercase tracking-wider text-[9px]">Session Status</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono uppercase">{user?.status ? user.status.toUpperCase() : 'ACTIVE'}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Change Password Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-8 border border-[var(--border-default)] space-y-6"
            >
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-display uppercase tracking-wider">
                <Key className="w-5 h-5 text-[var(--primary-light)]" /> Change Security Password
              </h3>

              {passwordStatus && (
                <div className={`p-3 rounded-xl text-xs font-semibold text-center border transition-all ${
                  passwordStatus.startsWith('success')
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {passwordStatus.split(':')[1]}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-2 uppercase tracking-wider">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      placeholder="••••••••"
                      className="fintech-input text-xs w-full font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-2 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      placeholder="••••••••"
                      className="fintech-input text-xs w-full font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-2 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      placeholder="••••••••"
                      className="fintech-input text-xs w-full font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="fintech-button-primary py-3 px-8 text-xs font-bold uppercase tracking-wider btn-glow flex items-center gap-1.5"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>Update Security Password</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* MY FEEDBACK HISTORY Section */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-6 md:p-8 border border-[var(--border-default)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-display uppercase tracking-wider">
                    <MessageSquare className="w-5 h-5 text-[var(--primary-light)]" /> My Feedback History
                  </h3>
                  <p className="text-xs text-[var(--text-dim)] mt-1">
                    Your submitted ratings and suggestions for Finora AI.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] bg-[var(--surface-subtle)] px-3 py-1 rounded-full border border-[var(--border-subtle)]">
                  {myFeedback.length} Submitted
                </span>
              </div>

              {loadingFb ? (
                <div className="py-6 text-center text-xs text-[var(--text-dim)] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary-light)]" /> Loading feedback history...
                </div>
              ) : myFeedback.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-dim)] space-y-2">
                  <p className="font-semibold text-[var(--text-muted)]">No feedback submitted yet.</p>
                  <p className="text-[11px]">Click the 💬 Feedback button in the top header bar to share your experience!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
                        <th className="p-3 uppercase tracking-wider text-[10px]">Rating</th>
                        <th className="p-3 uppercase tracking-wider text-[10px]">Suggestion / Feedback</th>
                        <th className="p-3 uppercase tracking-wider text-[10px]">Status</th>
                        <th className="p-3 uppercase tracking-wider text-[10px]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {myFeedback.map((fb, idx) => (
                        <tr key={fb.id || idx} className="hover:bg-[var(--surface-glass)] transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= (fb.rating || 5)
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-[var(--text-dim)]'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-[11px] font-bold text-amber-400">({fb.rating || 5})</span>
                            </div>
                          </td>
                          <td className="p-3 text-[var(--text-primary)] font-medium max-w-md truncate">
                            {fb.suggestion || fb.message || 'No suggestion text provided'}
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {fb.status || 'Submitted'}
                            </span>
                          </td>
                          <td className="p-3 text-[var(--text-dim)] font-medium">
                            {fb.created_at ? new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* SESSION SECURITY Section */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-8 border border-[var(--border-default)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-display uppercase tracking-wider">
                    <LogOut className="w-5 h-5 text-[var(--primary-light)]" /> Session Security & Sign Out
                  </h3>
                  <p className="text-xs text-[var(--text-dim)] mt-1">
                    Safely terminate your active workspace session. Your financial datasets, predictions, and reports remain securely stored for your next login.
                  </p>
                </div>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="py-3 px-6 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary-subtle)]/20 hover:bg-[var(--primary)]/30 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg group flex-none"
                >
                  <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  Sign Out
                </button>
              </div>
            </motion.div>

            {/* ACCOUNT MANAGEMENT & PERMANENT DELETION Section */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-8 border border-rose-500/30 bg-rose-500/5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-rose-400 flex items-center gap-2 font-display uppercase tracking-wider">
                    <Trash2 className="w-5 h-5 text-rose-400" /> Account Management – Permanent Account Deletion
                  </h3>
                  <p className="text-xs text-[var(--text-dim)] mt-1 leading-relaxed">
                    Permanently delete your user document and all associated financial records, datasets, predictions, reports, and AI chat history across Finora AI.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isAdmin}
                  title={isAdmin ? "Primary administrator account cannot be deleted via self-service deletion" : "Permanently delete your account and data"}
                  className="py-3 px-6 rounded-xl border border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex-none"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Sign Out Confirmation Modal Dialog */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md glass-card p-6 border border-[var(--border-default)] rounded-2xl bg-[var(--bg-secondary)] shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2.5 text-[var(--primary-light)]">
                  <LogOut className="w-5 h-5 flex-none" />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-display text-[var(--text-primary)]">Sign Out Confirmation</h3>
                </div>
                <button onClick={() => setShowLogoutModal(false)} className="text-[var(--text-dim)] hover:text-[var(--text-primary)] p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Are you sure you want to sign out from <strong className="text-[var(--text-primary)]">Finora AI</strong>? Your active session token and workspace cache will be cleared. All your financial data remains securely stored.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  disabled={loggingOut}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  disabled={loggingOut}
                  className="px-5 py-2.5 rounded-xl fintech-button-primary font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {loggingOut ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Sign Out <LogOut className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERMANENT DELETE ACCOUNT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md glass-card p-6 border border-rose-500/50 rounded-2xl bg-[var(--bg-secondary)] shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <ShieldAlert className="w-6 h-6 flex-none" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider font-display text-rose-400">Delete Account Permanently?</h3>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="text-[var(--text-dim)] hover:text-[var(--text-primary)] p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-semibold text-center">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                This permanently deletes your <strong className="text-[var(--text-primary)]">Finora AI</strong> account and all financial data, reports, datasets, predictions, recommendations, and personal history associated with this account. <strong className="text-rose-400 block mt-1">This action cannot be undone.</strong>
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteAccount}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {deleting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Permanently Delete Account <Trash2 className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SidebarLayout>
  );
}
