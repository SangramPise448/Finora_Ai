import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, IndianRupee, Wallet, Activity, CreditCard, 
  Sparkles, Download, RefreshCw, BrainCircuit, Target,
  ArrowUpRight, Zap, MessageSquare, Trash2, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SidebarLayout } from '../components/SidebarLayout';
import { API_URL, useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedCounter, RingCounter } from '../components/ui/AnimatedCounter';
import { AIInsightPanel } from '../components/ui/UIComponents';
import { PageSkeleton } from '../components/ui/SkeletonLoader';
import { chartGridProps, chartXAxisProps, chartYAxisProps, chartLegendProps } from '../utils/chartTheme';

const TABS = ['Overview', 'Update Profile', 'Simulations'];

const OCCUPATIONS = ['Accountant', 'Data Analyst', 'Doctor', 'Entrepreneur', 'Financial Analyst', 'Graphic Designer', 'Marketing Manager', 'Sales Executive', 'Software Engineer', 'Teacher'];
const EMPLOYMENT_TYPES = ['Business Owner', 'Freelancer', 'Salaried', 'Self-Employed'];
const FINANCIAL_GOALS = ['Car', 'Higher Education', 'Home', 'Retirement', 'Travel', 'Wealth Creation'];

export default function DashboardPage() {
  const { user, token: authToken } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [history, setHistory] = useState<any[]>([]);
  const [latestPred, setLatestPred] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    Income: 75000, Expense: 48000, Budget: 55000, Investment: 8000,
    Age: 28, Gender: 'Male', Occupation: 'Software Engineer',
    Employment_Type: 'Salaried', Marital_Status: 'Single', Credit_Score: 720,
    Loan: 500000, EMI: 25000, Category: 'Rent', Payment_Mode: 'Debit Card',
    Risk_Profile: 'Medium', Financial_Goal: 'Wealth Creation', Goal_Amount: 1500000
  });

  const [simYears, setSimYears] = useState(20);
  const [simReturnRate, setSimReturnRate] = useState(8);
  const [simMonthlyInvest, setSimMonthlyInvest] = useState(5000);

  const fetchHistory = async () => {
    try {
      const activeToken = authToken || localStorage.getItem('finora_token') || sessionStorage.getItem('finora_token');
      const res = await axios.get(`${API_URL}/finance/history`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const dataList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setHistory(dataList);
      if (dataList.length > 0) {
        setLatestPred(dataList[0].predictions);
        const latestInput = dataList[0].input_data;
        setProfileForm(prev => ({ ...prev, ...latestInput }));
        if (latestInput.Investment) setSimMonthlyInvest(latestInput.Investment);
      } else {
        setLatestPred(null);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [authToken]);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const activeToken = authToken || localStorage.getItem('finora_token') || sessionStorage.getItem('finora_token');
      const res = await axios.post(`${API_URL}/finance/predict`, profileForm, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const predData = res.data.data || res.data;
      setLatestPred(predData);
      await fetchHistory();
      setActiveTab('Overview');
    } catch (err) {
      console.error('Prediction failed:', err);
      alert('Inference failed. Please verify input values.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSingleHistory = async (predId: string) => {
    if (!window.confirm('Are you sure you want to delete this prediction record?')) return;
    try {
      const activeToken = authToken || localStorage.getItem('token');
      await axios.delete(`${API_URL}/finance/history/${predId}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      await fetchHistory();
    } catch (err) {
      console.error('Failed to delete record:', err);
      alert('Could not delete record. Please try again.');
    }
  };

  const clearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to clear ALL prediction history? This action cannot be undone.')) return;
    try {
      const activeToken = authToken || localStorage.getItem('token');
      await axios.delete(`${API_URL}/finance/history`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setHistory([]);
      setLatestPred(null);
    } catch (err) {
      console.error('Failed to clear history:', err);
      alert('Could not clear prediction history.');
    }
  };

  const calculateCompoundInterest = () => {
    const months = simYears * 12;
    const r = (simReturnRate / 100) / 12;
    let balance = 0;
    const data = [];
    for (let m = 1; m <= months; m++) {
      balance = (balance + simMonthlyInvest) * (1 + r);
      if (m % 12 === 0) data.push({ year: `Yr ${m / 12}`, balance: Math.round(balance) });
    }
    return data;
  };

  const simData = calculateCompoundInterest();

  const getDynamicCategoryData = () => {
    if (!latestPred || !latestPred.input_data) return [];
    const inputs = latestPred.input_data;
    const items = [
      { name: 'Rent & Housing', value: Number(inputs.Rent_Expense || 0), color: '#7C3AED' },
      { name: 'Food & Dining', value: Number(inputs.Food_Expense || 0), color: '#22C55E' },
      { name: 'Shopping', value: Number(inputs.Shopping_Expense || 0), color: '#EF4444' },
      { name: 'Entertainment', value: Number(inputs.Entertainment_Expense || 0), color: '#38BDF8' },
      { name: 'Healthcare', value: Number(inputs.Healthcare_Expense || 0), color: '#F59E0B' },
      { name: 'Education', value: Number(inputs.Education_Expense || 0), color: '#EC4899' },
      { name: 'Utilities & Bills', value: Number(inputs.Utility_Bills || 0), color: '#4F46E5' },
      { name: 'Other Expenses', value: Number(inputs.Other_Expense || 0), color: '#64748B' },
    ].filter(item => item.value > 0);

    if (items.length === 0) return [];
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map(item => ({
      name: item.name,
      value: Math.round((item.value / total) * 100),
      color: item.color
    }));
  };

  const categoryData = getDynamicCategoryData();

  const barChartData = history.slice(0, 6).reverse().map((item: any, idx: number) => ({
    name: `Run ${idx + 1}`,
    Income: item.input_data.Income,
    Expense: item.input_data.Expense,
  }));

  const downloadReport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const activeToken = authToken || localStorage.getItem('token');
      if (!activeToken) {
        alert('Authentication session expired. Please log in again.');
        return;
      }
      const res = await fetch(`${API_URL}/reports/${format}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to generate report');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv';
      a.download = `finora-report-${new Date().toISOString().slice(0,10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Could not generate report. Please try again.');
    }
  };

  const getProfileCompletionStatus = () => {
    const sections = [
      { key: 'personal', name: 'Personal Details', isDone: Boolean(profileForm.Age && profileForm.Occupation && profileForm.Gender && profileForm.Employment_Type) },
      { key: 'income', name: 'Income', isDone: Boolean(Number(profileForm.Income) > 0) },
      { key: 'expenses', name: 'Expenses', isDone: Boolean(Number(profileForm.Expense) > 0) },
      { key: 'savings', name: 'Savings', isDone: Boolean(Number(profileForm.Income) > Number(profileForm.Expense)) },
      { key: 'investments', name: 'Investments', isDone: Boolean(Number(profileForm.Investment) > 0) },
      { key: 'goals', name: 'Financial Goals', isDone: Boolean(Number(profileForm.Goal_Amount) > 0 && profileForm.Financial_Goal) }
    ];
    const doneCount = sections.filter(s => s.isDone).length;
    const percentage = Math.round((doneCount / sections.length) * 100);
    return { sections, percentage };
  };

  const completionStatus = getProfileCompletionStatus();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 text-xs bg-[var(--bg-secondary)]/95 border-[var(--border-default)]">
          <p className="font-bold text-[var(--text-primary)] mb-1.5">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="flex items-center gap-2 mt-0.5" style={{ color: item.color || item.fill }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-[var(--text-secondary)]">{item.name}:</span>
              <span className="font-bold">₹{item.value.toLocaleString('en-IN')}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (pageLoading) {
    return <SidebarLayout><PageSkeleton /></SidebarLayout>;
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Executive Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-subtle)] pb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-[var(--primary-subtle)] rounded-xl">
                <BrainCircuit className="w-5 h-5 text-[var(--primary-light)]" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-display">
                Executive Financial Dashboard
              </h1>
            </div>
            <p className="text-xs text-[var(--text-dim)] ml-12">
              Welcome back, <span className="text-[var(--primary-light)] font-semibold">{user?.name || 'Investor'}</span> — your AI-powered financial intelligence is ready.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => downloadReport('pdf')}
              className="fintech-button-secondary py-2.5 px-4 text-xs flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[var(--primary-light)]" /> PDF Summary
            </button>
            <button 
              onClick={() => downloadReport('excel')}
              className="fintech-button-secondary py-2.5 px-4 text-xs flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[var(--accent)]" /> Excel Sheet
            </button>
          </div>
        </motion.div>

        {/* Phase 3 – Profile Completion Progress Tracker (Renders if completion < 100%) */}
        {completionStatus.percentage < 100 && (
          <GlassCard className="p-5 border border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary-subtle)]/40 via-transparent to-[var(--accent-subtle)]/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--primary-light)]" />
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">
                    Complete Your Financial Profile
                  </h3>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5">Fill in missing profile sections to unlock 100% accurate AI predictions and financial reporting.</p>
              </div>
              <span className="text-sm font-extrabold font-mono text-[var(--primary-light)] bg-[var(--surface-glass)] px-3 py-1 rounded-xl border border-[var(--border-subtle)]">
                {completionStatus.percentage}% Completed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-full h-2.5 overflow-hidden mb-4">
              <motion.div 
                className="bg-gradient-to-r from-[var(--primary-light)] to-[var(--accent)] h-full rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${completionStatus.percentage}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>

            {/* Checklist Badges */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {completionStatus.sections.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveTab('Update Profile')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                    s.isDone 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  {s.isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Quick Actions Row */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setActiveTab('Update Profile')} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-subtle)] border border-[var(--primary)]/20 rounded-xl text-xs font-semibold text-[var(--primary-light)] hover:bg-[var(--primary-subtle)] hover:border-[var(--primary)]/40 transition-all">
            <Zap className="w-3.5 h-3.5" /> Run AI Prediction
          </button>
          <button onClick={() => window.location.href = '/assistant'} className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-all">
            <MessageSquare className="w-3.5 h-3.5 text-[var(--blue-glow)]" /> Ask AI Advisor
          </button>
          <button onClick={() => window.location.href = '/reports'} className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-all">
            <Target className="w-3.5 h-3.5 text-[var(--accent)]" /> View Reports
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-2xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-5 text-xs font-bold rounded-xl transition-all relative ${
                activeTab === tab 
                  ? 'bg-[var(--primary-subtle)] border border-[var(--primary)]/25 text-white shadow-md' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'Overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {latestPred ? (
                <>
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Health Score */}
                    <GlassCard className="p-6 h-[140px] min-h-[140px] flex flex-col justify-between" delay={0}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider block">Financial Health</span>
                          <h3 className="text-3xl font-extrabold text-[var(--text-primary)] font-display">
                            <AnimatedCounter value={latestPred.financial_health_score} suffix="%" />
                          </h3>
                          <span className="text-[10px] text-[var(--primary-light)] font-semibold">{latestPred.future_wealth_category}</span>
                        </div>
                        <RingCounter value={latestPred.financial_health_score} size={50} strokeWidth={5} />
                      </div>
                    </GlassCard>

                    {/* Monthly Income */}
                    <GlassCard className="p-6 h-[140px] min-h-[140px] flex flex-col justify-between" delay={0.1}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider block">Monthly Income</span>
                          <h3 className="text-3xl font-extrabold text-[var(--text-primary)] font-display">
                            ₹{(latestPred?.input_data?.Income ?? profileForm?.Income ?? 0).toLocaleString('en-IN')}
                          </h3>
                          <span className="text-[10px] text-[var(--accent)] font-semibold flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> Invest sweep: {latestPred.savings_capacity_pct || 20}%
                          </span>
                        </div>
                        <div className="p-3 bg-[var(--accent-subtle)] rounded-2xl text-[var(--accent)] flex-none">
                          <IndianRupee className="w-5 h-5" />
                        </div>
                      </div>
                    </GlassCard>

                    {/* Savings Forecast */}
                    <GlassCard className="p-6 h-[140px] min-h-[140px] flex flex-col justify-between" delay={0.2}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider block">ML Savings Forecast</span>
                          <h3 className="text-3xl font-extrabold text-[var(--accent)] font-display">
                            <AnimatedCounter value={latestPred.predicted_savings} prefix="₹" />
                          </h3>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">Annual: ₹{(latestPred.predicted_savings * 12).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="p-3 bg-[var(--primary-subtle)] rounded-2xl text-[var(--primary-light)] flex-none">
                          <Wallet className="w-5 h-5" />
                        </div>
                      </div>
                    </GlassCard>

                    {/* Budget Utilized */}
                    <GlassCard className="p-6 h-[140px] min-h-[140px] flex flex-col justify-between" delay={0.3}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider block">Budget Utilized</span>
                          <h3 className="text-3xl font-extrabold text-[var(--text-primary)] font-display">
                            <AnimatedCounter value={latestPred.budget_utilization} suffix="%" />
                          </h3>
                        </div>
                        <div className="p-3 bg-[var(--secondary-subtle)] rounded-2xl text-[var(--secondary-light)] flex-none">
                          <CreditCard className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="progress-bar mt-3">
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${Math.min(latestPred.budget_utilization, 100)}%`,
                            background: latestPred.budget_utilization > 90 ? 'var(--danger)' : 'var(--gradient-primary)',
                          }} 
                        />
                      </div>
                    </GlassCard>
                  </div>
                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Savings Forecast */}
                    <GlassCard className="p-6 h-[380px] min-h-[380px]" delay={0.4}>
                      <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-6 flex items-center gap-1.5 font-display">
                        <TrendingUp className="w-4 h-4 text-[var(--primary-light)]" /> Savings Forecast Model
                      </h3>
                      <div className="h-[270px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={latestPred.savings_forecast}>
                            <defs>
                              <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid {...chartGridProps} />
                            <XAxis dataKey="year" {...chartXAxisProps} />
                            <YAxis {...chartYAxisProps} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="savings" stroke="var(--primary-light)" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" name="Savings" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassCard>

                    {/* Cash Flow Analytics */}
                    <GlassCard className="p-6 h-[380px] min-h-[380px]" delay={0.5}>
                      <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-6 flex items-center gap-1.5 font-display">
                        <Activity className="w-4 h-4 text-[var(--accent)]" /> Cash Flow Analytics
                      </h3>
                      <div className="h-[270px]">
                        {barChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-[var(--text-dim)] text-xs">
                            <div className="text-center space-y-2">
                              <Activity className="w-8 h-8 mx-auto text-[var(--text-dim)] animate-pulse" />
                              <p>Execute a prediction to populate metrics.</p>
                            </div>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={barChartData}>
                              <CartesianGrid {...chartGridProps} />
                              <XAxis dataKey="name" {...chartXAxisProps} />
                              <YAxis {...chartYAxisProps} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend {...chartLegendProps} />
                              <Bar dataKey="Income" fill="var(--fin-income)" radius={[4, 4, 0, 0]} name="Income" />
                              <Bar dataKey="Expense" fill="var(--fin-expense)" radius={[4, 4, 0, 0]} name="Expense" />
                            </ReBarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </GlassCard>

                    {/* Category Distribution */}
                    <GlassCard className="p-6 h-[380px] min-h-[380px]" delay={0.6}>
                      <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-6 font-display">Expense Allocation Index</h3>
                      {categoryData.length === 0 ? (
                        <div className="h-[270px] flex flex-col items-center justify-center text-center p-4 space-y-3">
                          <div className="p-3 bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-full text-[var(--text-muted)]">
                            <Activity className="w-6 h-6 text-[var(--primary-light)] opacity-70" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-[var(--text-primary)] font-display">No Expense Category Data Available</p>
                            <p className="text-xs text-[var(--text-dim)] max-w-xs mx-auto">Please complete your expense categorization to view spending analysis.</p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('Update Profile')}
                            className="fintech-button-secondary py-2 px-4 text-xs font-semibold mt-2"
                          >
                            Update Financial Profile
                          </button>
                        </div>
                      ) : (
                        <div className="h-[270px] flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="w-full sm:w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                                  {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full sm:w-1/2 space-y-2.5">
                            {categoryData.map((cat) => (
                              <div key={cat.name} className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                  <span>{cat.name}</span>
                                </div>
                                <span className="text-[var(--text-primary)] font-mono">{cat.value}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </GlassCard>

                    {/* AI Advisory Panel */}
                    <AIInsightPanel
                      title="AI Investment Intelligence"
                      insight={latestPred.investment_recommendation}
                      metric={{ label: 'Target Emergency Pool', value: `₹${latestPred.emergency_fund.toLocaleString('en-IN')}` }}
                      className="h-[380px] min-h-[380px] overflow-y-auto"
                    />
                  </div>

                  {/* Prediction History Table */}
                  <GlassCard className="overflow-hidden" delay={0.8} animate={true}>
                    <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[var(--primary-light)]" /> Prediction History
                      </h3>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={fetchHistory}
                          className="fintech-button-secondary py-1 px-2.5 text-[10px] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                        <button 
                          onClick={clearAllHistory}
                          className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Clear History
                        </button>
                        <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider ml-2">{history.length} Runs</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-muted)] font-bold">
                            <th className="p-4 uppercase tracking-wider text-[10px]">Date</th>
                            <th className="p-4 uppercase tracking-wider text-[10px]">Income</th>
                            <th className="p-4 uppercase tracking-wider text-[10px]">Expenses</th>
                            <th className="p-4 uppercase tracking-wider text-[10px]">Savings</th>
                            <th className="p-4 uppercase tracking-wider text-[10px]">Health</th>
                            <th className="p-4 uppercase tracking-wider text-[10px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {history.slice(0, 5).map((item, idx) => (
                            <tr key={idx} className="hover:bg-[var(--surface-glass)] transition-colors">
                              <td className="p-4 text-[var(--text-secondary)] font-medium">
                                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-4 text-[var(--text-primary)] font-bold font-mono">₹{item.input_data.Income.toLocaleString('en-IN')}</td>
                              <td className="p-4 text-[var(--text-secondary)] font-mono">₹{item.input_data.Expense.toLocaleString('en-IN')}</td>
                              <td className="p-4 text-[var(--accent)] font-bold font-mono">₹{item.predictions.predicted_savings.toLocaleString('en-IN')}</td>
                              <td className="p-4 font-bold text-[var(--primary-light)]">{item.predictions.financial_health_score}%</td>
                              <td className="p-4">
                                <button
                                  onClick={() => deleteSingleHistory(item.id)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-all"
                                  title="Delete prediction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </>
              ) : (
                /* Phase 2 – Data-First Empty State */
                <GlassCard className="p-12 text-center max-w-2xl mx-auto space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 flex items-center justify-center shadow-lg">
                    <BrainCircuit className="w-10 h-10 text-[var(--primary-light)] animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-[var(--text-primary)] font-display">No Financial Profile Available</h3>
                    <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-md mx-auto">
                      Complete your financial profile to unlock full AI-driven executive analytics:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-left text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface-glass)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 text-[var(--accent)]"><CheckCircle2 className="w-4 h-4" /> AI Financial Analysis</div>
                    <div className="flex items-center gap-2 text-[var(--accent)]"><CheckCircle2 className="w-4 h-4" /> Savings Forecast</div>
                    <div className="flex items-center gap-2 text-[var(--accent)]"><CheckCircle2 className="w-4 h-4" /> Future Wealth Prediction</div>
                    <div className="flex items-center gap-2 text-[var(--accent)]"><CheckCircle2 className="w-4 h-4" /> Budget Planning</div>
                    <div className="flex items-center gap-2 text-[var(--accent)]"><CheckCircle2 className="w-4 h-4" /> Investment Recommendations</div>
                    <div className="flex items-center gap-2 text-[var(--accent)]"><CheckCircle2 className="w-4 h-4" /> Financial Reports</div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('Update Profile')}
                    className="fintech-button-primary px-8 py-3.5 text-xs font-bold uppercase tracking-wider btn-glow flex items-center gap-2 mx-auto"
                  >
                    <Zap className="w-4 h-4" /> Complete Financial Profile
                  </button>
                </GlassCard>
              )}
            </motion.div>
          )}

          {activeTab === 'Update Profile' && (
            <motion.div
              key="update-profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
            >
              <form onSubmit={handlePredict} className="glass-card p-8 bg-[var(--bg-secondary)]/75 max-w-4xl mx-auto space-y-6">
                <div className="border-b border-[var(--border-subtle)] pb-4 mb-4">
                  <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 font-display">
                    <BrainCircuit className="w-5 h-5 text-[var(--primary-light)]" /> AI Parameter Configuration
                  </h3>
                  <p className="text-xs text-[var(--text-dim)] mt-1">
                    Enter your actual monthly income, total expenses, budget, and goals to generate AI predictions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Monthly Income (₹)</label>
                    <input 
                      type="number" 
                      value={profileForm.Income} 
                      onChange={e => setProfileForm({ ...profileForm, Income: Number(e.target.value) })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Total Expenses (₹)</label>
                    <input 
                      type="number" 
                      value={profileForm.Expense} 
                      onChange={e => setProfileForm({ ...profileForm, Expense: Number(e.target.value) })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Monthly Budget (₹)</label>
                    <input 
                      type="number" 
                      value={profileForm.Budget} 
                      onChange={e => setProfileForm({ ...profileForm, Budget: Number(e.target.value) })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Monthly Investment (₹)</label>
                    <input 
                      type="number" 
                      value={profileForm.Investment} 
                      onChange={e => setProfileForm({ ...profileForm, Investment: Number(e.target.value) })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Age</label>
                    <input 
                      type="number" 
                      value={profileForm.Age} 
                      onChange={e => setProfileForm({ ...profileForm, Age: Number(e.target.value) })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Credit Score</label>
                    <input 
                      type="number" 
                      value={profileForm.Credit_Score} 
                      onChange={e => setProfileForm({ ...profileForm, Credit_Score: Number(e.target.value) })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Occupation</label>
                    <select 
                      value={profileForm.Occupation} 
                      onChange={e => setProfileForm({ ...profileForm, Occupation: e.target.value })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none"
                    >
                      {OCCUPATIONS.map(o => <option key={o} value={o} className="bg-[var(--bg-secondary)]">{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Employment Type</label>
                    <select 
                      value={profileForm.Employment_Type} 
                      onChange={e => setProfileForm({ ...profileForm, Employment_Type: e.target.value })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none"
                    >
                      {EMPLOYMENT_TYPES.map(e => <option key={e} value={e} className="bg-[var(--bg-secondary)]">{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Financial Goal</label>
                    <select 
                      value={profileForm.Financial_Goal} 
                      onChange={e => setProfileForm({ ...profileForm, Financial_Goal: e.target.value })}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none"
                    >
                      {FINANCIAL_GOALS.map(g => <option key={g} value={g} className="bg-[var(--bg-secondary)]">{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="fintech-button-primary px-8 py-3 text-xs font-bold uppercase tracking-wider btn-glow flex items-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Run AI Predictor & Update</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'Simulations' && (
            <motion.div
              key="simulations"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <GlassCard className="p-8 space-y-6">
                <div className="border-b border-[var(--border-subtle)] pb-4">
                  <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 font-display">
                    <TrendingUp className="w-5 h-5 text-[var(--accent)]" /> Compound Interest Projection Engine
                  </h3>
                  <p className="text-xs text-[var(--text-dim)] mt-1">Simulate long-term wealth creation with variable annual returns and monthly contributions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Monthly SIP Investment (₹)</label>
                    <input 
                      type="number" 
                      value={simMonthlyInvest} 
                      onChange={e => setSimMonthlyInvest(Number(e.target.value))}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Expected Return Rate (% p.a.)</label>
                    <input 
                      type="number" 
                      value={simReturnRate} 
                      onChange={e => setSimReturnRate(Number(e.target.value))}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Investment Horizon (Years)</label>
                    <input 
                      type="number" 
                      value={simYears} 
                      onChange={e => setSimYears(Number(e.target.value))}
                      className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                    />
                  </div>
                </div>

                <div className="h-72 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simData}>
                      <defs>
                        <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" stroke="#475569" style={{ fontSize: 10, fontWeight: 600 }} />
                      <YAxis stroke="#475569" style={{ fontSize: 10, fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="balance" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorSim)" name="Corpus (₹)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SidebarLayout>
  );
}