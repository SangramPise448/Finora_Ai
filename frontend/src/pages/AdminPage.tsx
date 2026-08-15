import { useState, useEffect } from 'react';
import { SidebarLayout } from '../components/SidebarLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BarChart2, FolderHeart, MessageSquareText, ShieldAlert,
  Heart, CreditCard, RefreshCw, Cpu, Database, Network, Key, Calendar, Trash2, Star
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface AdminStats {
  total_users: number;
  total_predictions: number;
  total_datasets: number;
  total_feedback: number;
  average_health_score: number;
  average_budget_utilization: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'feedback'>('overview');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingFbId, setDeletingFbId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, fbRes] = await Promise.all([
        apiClient.get('/finance/admin/stats'),
        apiClient.get('/auth/users'),
        apiClient.get('/finance/feedback'),
      ]);
      if (statsRes.data) {
        const rawStats = statsRes.data;
        setStats(rawStats.data || rawStats);
      }
      if (usersRes.data) {
        const rawUsers = usersRes.data;
        const list = Array.isArray(rawUsers) ? rawUsers : (rawUsers.data || []);
        setUsers(Array.isArray(list) ? list : []);
      }
      if (fbRes.data) {
        const rawFb = fbRes.data;
        const list = Array.isArray(rawFb) ? rawFb : (rawFb.data || []);
        setFeedback(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Failed to load admin telemetry:', e);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete user account '${email}'? All associated predictions and data will be permanently purged.`)) {
      return;
    }
    setDeletingId(userId);
    try {
      const res = await apiClient.delete(`/auth/users/${userId}`);
      if (res.data?.success || res.status === 200) {
        await fetchData();
      } else {
        alert('Failed to delete user account');
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail || 'Network error while requesting user deletion';
      alert(detail);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!window.confirm('Are you sure you want to delete this user feedback entry?')) {
      return;
    }
    setDeletingFbId(feedbackId);
    try {
      const res = await apiClient.delete(`/finance/feedback/${feedbackId}`);
      if (res.data?.success || res.status === 200) {
        setFeedback(prev => prev.filter(item => item.id !== feedbackId));
      } else {
        alert('Failed to delete feedback entry.');
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail || 'Error deleting feedback entry.';
      alert(detail);
    } finally {
      setDeletingFbId(null);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const StatCard = ({ icon: Icon, label, value, color, sub }: any) => (
    <div className={`glass-card p-5 border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-gradient-to-br ${color} relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all`}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/[0.02] -translate-y-6 translate-x-6" />
      <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-white/5 w-fit text-indigo-600 dark:text-white">
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4">
        <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{value}</p>
        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-[9px] text-slate-500 dark:text-slate-500 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: `Users (${users.length})`, icon: Users },
    { id: 'feedback', label: `Feedback (${feedback.length})`, icon: MessageSquareText },
  ] as const;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 tracking-wider">ADMIN PANEL</span>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-rose-500" /> Admin Command Center
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Manage users, check platform metrics, and inspect system feedback logs.</p>
          </div>
          <button 
            onClick={fetchData} 
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1 bg-slate-200/60 dark:bg-white/5 border border-slate-300/60 dark:border-white/5 rounded-2xl w-fit">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                  tab === t.id 
                    ? 'bg-[var(--primary)] border border-[var(--primary)] text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-none" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Streaming system records...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <StatCard icon={Users} label="Total User Profiles" value={stats?.total_users ?? 0}
                    color="from-indigo-500/[0.03] to-transparent" />
                  <StatCard icon={Cpu} label="Total ML Predictions" value={stats?.total_predictions ?? 0}
                    color="from-cyan-500/[0.03] to-transparent" />
                  <StatCard icon={FolderHeart} label="Worksheets Loaded" value={stats?.total_datasets ?? 0}
                    color="from-emerald-500/[0.03] to-transparent" />
                  <StatCard icon={MessageSquareText} label="Feedback entries" value={stats?.total_feedback ?? 0}
                    color="from-yellow-500/[0.03] to-transparent" />
                  <StatCard icon={Heart} label="Avg Health Index" value={`${(stats?.average_health_score ?? 0).toFixed(1)}%`}
                    sub="Platform consolidated value" color="from-rose-500/[0.03] to-transparent" />
                  <StatCard icon={CreditCard} label="Avg Budget Utilized" value={`${(stats?.average_budget_utilization ?? 0).toFixed(1)}%`}
                    sub="Platform consolidated value" color="from-purple-500/[0.03] to-transparent" />
                </div>

                {/* Platform Health Gauges */}
                <div className="glass-card p-6 border border-slate-200/80 dark:border-white/5 space-y-5">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Aggregated Health Metrics</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Platform Avg Health Index', val: stats?.average_health_score ?? 0, color: 'from-emerald-500 to-teal-400' },
                      { label: 'Platform Avg Budget Utilization', val: stats?.average_budget_utilization ?? 0, color: 'from-amber-500 to-yellow-400' },
                      { label: 'Predictions Engagement Index', val: stats?.total_predictions ? Math.min((stats.total_predictions / Math.max(stats.total_users, 1)) * 20, 100) : 0, color: 'from-indigo-500 to-purple-400' },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs mb-1.5 font-bold">
                          <span className="text-slate-700 dark:text-slate-400">{m.label}</span>
                          <span className="text-slate-900 dark:text-white font-mono">{m.val.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-900 border border-slate-300/50 dark:border-white/5 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all`} style={{ width: `${Math.min(m.val, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Specs */}
                <div className="glass-card p-6 border border-slate-200/80 dark:border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">System Specifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'API Framework', val: 'FastAPI 0.110.0', icon: Network },
                      { label: 'ML Solver', val: 'Random Forest', icon: Cpu },
                      { label: 'Data Store', val: 'SQLite / MongoDB Atlas (Active)', icon: Database },
                      { label: 'Release Build', val: 'v1.0.0 Stable', icon: Key },
                    ].map(s => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="bg-slate-100/90 dark:bg-[#030712]/50 border border-slate-200 dark:border-white/5 rounded-xl p-3 flex items-center gap-3">
                          <Icon className="w-5 h-5 text-indigo-500 dark:text-indigo-400 flex-none" />
                          <div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{s.val}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* USERS TAB */}
            {tab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card border border-slate-200/80 dark:border-white/5 overflow-hidden"
              >
                <div className="p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Registered Accounts</h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{users.length} Records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.01] text-slate-700 dark:text-slate-400 font-bold">
                        <th className="p-4 uppercase tracking-wider text-[10px]">User Account</th>
                        <th className="p-4 uppercase tracking-wider text-[10px]">Email Address</th>
                        <th className="p-4 uppercase tracking-wider text-[10px]">Authority Level</th>
                        <th className="p-4 uppercase tracking-wider text-[10px]">Delete Account</th>
                        <th className="p-4 uppercase tracking-wider text-[10px]">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {users.map((u, i) => (
                        <tr key={u.id || i} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.01] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {u.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 font-medium font-mono">{u.email}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                              u.role === 'admin'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-slate-200 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-500/20'
                            }`}>
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td className="p-4">
                            {u.role === 'admin' || u.email?.toLowerCase() === 'snpise448@gmail.com' ? (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/5">Protected</span>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={deletingId === u.id}
                                className="px-3 py-1.5 text-[11px] font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border border-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
                              >
                                {deletingId === u.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Delete Account
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-500 font-medium">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="text-center py-12 text-slate-500 font-medium">No registered profiles detected.</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* FEEDBACK TAB */}
            {tab === 'feedback' && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {feedback.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-medium">No feedback records filed.</div>
                ) : (
                  feedback.map((f, i) => (
                    <div key={i} className="glass-card border border-slate-200/80 dark:border-white/5 p-5 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {f.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{f.name}</p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-0.5 font-mono">{f.email}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= (f.rating || 5)
                                      ? 'text-amber-500 fill-amber-500'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                />
                              ))}
                              <span className="ml-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">({f.rating || 5} Stars)</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-600 dark:text-slate-500 font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                          </span>
                          <button
                            onClick={() => handleDeleteFeedback(f.id)}
                            disabled={deletingFbId === f.id}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border border-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                            title="Delete Feedback Entry"
                          >
                            {deletingFbId === f.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-medium bg-slate-100/90 dark:bg-[#030712]/30 p-3 rounded-xl border border-slate-200 dark:border-white/5 font-sans">
                        {f.suggestion || f.message}
                      </p>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </SidebarLayout>
  );
}
