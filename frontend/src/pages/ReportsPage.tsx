import { useState, useEffect } from 'react';
import { SidebarLayout } from '../components/SidebarLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FileText, Download, RefreshCw, Calendar, 
  Activity, BrainCircuit, Sparkles, BarChart3, TrendingUp
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { PageSkeleton } from '../components/ui/SkeletonLoader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ReportsPage() {
  const { token } = useAuth();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/finance/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPredictions(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const downloadReport = async (predId: string | null, format: 'pdf' | 'excel' | 'csv') => {
    const key = `${predId || 'latest'}-${format}`;
    setGenerating(key);
    try {
      const activeFormat = format === 'csv' ? 'excel' : format;
      const url = predId ? `${API}/reports/${activeFormat}/${predId}` : `${API}/reports/${activeFormat}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv';
      const idPrefix = predId ? predId.slice(0, 8) : 'latest';
      a.download = `finora-report-${idPrefix}.${ext}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert('Could not generate report. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return s || 'N/A'; }
  };

  if (loading) {
    return <SidebarLayout><PageSkeleton /></SidebarLayout>;
  }

  const latest = predictions.length > 0 ? predictions[0] : null;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-[var(--border-subtle)] pb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-[var(--primary-subtle)] rounded-xl">
              <BarChart3 className="w-5 h-5 text-[var(--primary-light)]" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-display">
              Smart Financial Reports & Analytics
            </h1>
          </div>
          <p className="text-xs text-[var(--text-dim)] ml-12">
            Preview and export custom PDF, Excel, and CSV financial intelligence reports on-demand.
          </p>
        </motion.div>

        {/* Report Preview Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Executive Financial Summary */}
          <GlassCard className="p-6 space-y-4 bg-gradient-to-br from-[var(--primary-subtle)]/50 to-transparent" delay={0.1}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--primary-light)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-sm font-display">Financial Summary Audit</h3>
                  <p className="text-[10px] text-[var(--text-dim)] font-semibold">Complete Financial Health & KPI Overview</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--primary-subtle)] text-[var(--primary-light)] font-bold">PDF / Excel / CSV</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Includes executive breakdown of Monthly Income (₹{latest?.input_data?.Income?.toLocaleString('en-IN') || 0}), Expenses, ML Savings Forecast, and Health Score.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => downloadReport(null, 'pdf')}
                disabled={generating === 'latest-pdf'}
                className="fintech-button-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
              >
                {generating === 'latest-pdf' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 text-[var(--primary-light)]" /> Download PDF</>}
              </button>
              <button
                onClick={() => downloadReport(null, 'excel')}
                disabled={generating === 'latest-excel'}
                className="fintech-button-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
              >
                {generating === 'latest-excel' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 text-[var(--accent)]" /> Download Excel</>}
              </button>
              <button
                onClick={() => downloadReport(null, 'csv')}
                disabled={generating === 'latest-csv'}
                className="fintech-button-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
              >
                {generating === 'latest-csv' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 text-[var(--blue-glow)]" /> Download CSV</>}
              </button>
            </div>
          </GlassCard>

          {/* Investment & Wealth Forecast */}
          <GlassCard className="p-6 space-y-4 bg-gradient-to-br from-[var(--accent-subtle)]/50 to-transparent" delay={0.2}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-sm font-display">Savings & Wealth Forecast</h3>
                  <p className="text-[10px] text-[var(--text-dim)] font-semibold">5-Year Compound Growth & SIP Projections</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] font-bold">5-Yr Model</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Comprehensive growth matrices analyzing predicted monthly investment sweeps, compound wealth trajectories, and emergency target pools.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => downloadReport(null, 'pdf')}
                disabled={generating === 'latest-pdf'}
                className="fintech-button-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
              >
                {generating === 'latest-pdf' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 text-[var(--primary-light)]" /> Download PDF</>}
              </button>
              <button
                onClick={() => downloadReport(null, 'excel')}
                disabled={generating === 'latest-excel'}
                className="fintech-button-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
              >
                {generating === 'latest-excel' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 text-[var(--accent)]" /> Download Excel</>}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Predictions List */}
        <GlassCard className="overflow-hidden" delay={0.3}>
          <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--primary-light)]" /> Prediction Audit Log & Reports
            </h2>
            <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">{predictions.length} Runs</span>
          </div>

          {predictions.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-dim)] mb-4">
                <BrainCircuit className="w-8 h-8 animate-pulse" />
              </div>
              <p className="text-xs text-[var(--text-muted)] font-bold">No historical records yet</p>
              <p className="text-[11px] text-[var(--text-dim)] max-w-xs mx-auto leading-relaxed">Run an AI prediction on the Dashboard to generate reportable financial records.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {predictions.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 hover:bg-[var(--surface-glass)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary-glow)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">Record ID: {p.id.slice(0, 8)}...</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] flex items-center gap-3.5 font-semibold">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(p.created_at)}</span>
                      <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Health: {p.predictions?.financial_health_score}%</span>
                      <span className="flex items-center gap-1 font-mono text-[var(--text-secondary)]">Income: ₹{p.input_data?.Income?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadReport(p.id, 'pdf')}
                      disabled={generating === `${p.id}-pdf`}
                      className="fintech-button-secondary py-2 px-3.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {generating === `${p.id}-pdf` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 text-[var(--primary-light)]" /> PDF</>}
                    </button>
                    <button
                      onClick={() => downloadReport(p.id, 'excel')}
                      disabled={generating === `${p.id}-excel`}
                      className="fintech-button-secondary py-2 px-3.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {generating === `${p.id}-excel` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 text-[var(--accent)]" /> Excel</>}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </SidebarLayout>
  );
}
