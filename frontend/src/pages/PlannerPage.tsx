import { useState } from 'react';
import { SidebarLayout } from '../components/SidebarLayout';
import { apiClient } from '../utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Palmtree, RefreshCw, AlertTriangle, BrainCircuit, Sparkles
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { chartGridProps, chartXAxisProps, chartYAxisProps, chartTooltipProps } from '../utils/chartTheme';

type PlannerTab = 'goal' | 'retirement';

export default function PlannerPage() {
  const [tab, setTab] = useState<PlannerTab>('goal');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [goal, setGoal] = useState({ 
    goal_amount: 500000, 
    monthly_savings: 15000, 
    current_saved: 50000, 
    annual_return_pct: 8 
  });
  
  const [ret, setRet] = useState({ 
    current_age: 28, 
    retirement_age: 60, 
    monthly_income: 50000, 
    monthly_savings: 15000, 
    current_corpus: 100000, 
    inflation_rate_pct: 6, 
    annual_return_pct: 10, 
    life_expectancy: 80 
  });

  const validateInputs = () => {
    const errs: Record<string, string> = {};
    if (tab === 'goal') {
      if (!goal.goal_amount || goal.goal_amount <= 0) errs.goal_amount = "Goal amount must be positive";
      if (!goal.monthly_savings || goal.monthly_savings <= 0) errs.monthly_savings = "Monthly savings must be positive";
      if (goal.current_saved < 0) errs.current_saved = "Current savings cannot be negative";
      if (goal.annual_return_pct < 0 || goal.annual_return_pct > 100) errs.annual_return_pct = "Return must be 0-100%";
    } else {
      if (!ret.current_age || ret.current_age < 18 || ret.current_age > 80) errs.current_age = "Age must be 18-80";
      if (!ret.retirement_age || ret.retirement_age < 40 || ret.retirement_age > 90) errs.retirement_age = "Retire Age must be 40-90";
      if (ret.retirement_age <= ret.current_age) errs.retirement_age = "Retire age must exceed current age";
      if (!ret.monthly_income || ret.monthly_income <= 0) errs.monthly_income = "Income must be positive";
      if (!ret.monthly_savings || ret.monthly_savings <= 0) errs.monthly_savings = "Savings must be positive";
      if (ret.current_corpus < 0) errs.current_corpus = "Corpus cannot be negative";
      if (ret.inflation_rate_pct < 0 || ret.inflation_rate_pct > 50) errs.inflation_rate_pct = "Inflation must be 0-50%";
      if (ret.annual_return_pct < 0 || ret.annual_return_pct > 100) errs.annual_return_pct = "Return must be 0-100%";
      if (!ret.life_expectancy || ret.life_expectancy <= ret.retirement_age || ret.life_expectancy > 120) {
        errs.life_expectancy = "Expectancy must exceed retire age (max 120)";
      }
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const call = async (endpoint: string, body: any) => {
    if (!validateInputs()) {
      setError("Please complete all required fields.");
      return;
    }
    setLoading(true); 
    setResult(null); 
    setError('');
    
    try {
      const res = await apiClient.post(`/planner/${endpoint}`, body);
      const data = res.data.data || res.data;
      setResult(data);
    } catch (e: any) { 
      const errorMsg = e.response?.data?.detail || e.response?.data?.message || e.message || 'Calculation service failed';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)); 
    } finally { 
      setLoading(false); 
    }
  };

  const tabs: { id: PlannerTab; label: string; icon: any; color: string }[] = [
    { id: 'goal', label: 'Goal Tracker', icon: Target, color: 'text-[var(--primary-light)]' },
    { id: 'retirement', label: 'Retirement Planner', icon: Palmtree, color: 'text-[var(--accent)]' },
  ];

  const Input = ({ label, name, value, onChange, type = 'number', min, max, step = 1 }: any) => {
    const errorMsg = validationErrors[name];
    return (
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-dim)] mb-1.5 uppercase tracking-wider">{label}</label>
        <input
          type={type} 
          value={value} 
          min={min} 
          max={max} 
          step={step}
          onChange={e => {
            const v = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            onChange(v);
            if (validationErrors[name]) {
              setValidationErrors(prev => {
                const copy = { ...prev };
                delete copy[name];
                return copy;
              });
            }
          }}
          className={`fintech-input font-mono ${errorMsg ? 'border-rose-500/50 focus:border-rose-500 bg-rose-500/5' : ''}`}
        />
        {errorMsg && (
          <p className="text-[10px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {errorMsg}
          </p>
        )}
      </div>
    );
  };

  const fmt = (n: number) => {
    if (isNaN(n) || n === null || n === undefined) return '0';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
  };

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
              <BrainCircuit className="w-5 h-5 text-[var(--primary-light)]" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-display">
              Future Financial Planner
            </h1>
          </div>
          <p className="text-xs text-[var(--text-dim)] ml-12">AI-powered goal tracking and future retirement planning.</p>
        </motion.div>

        {/* Tab Nav */}
        <div className="flex gap-1 p-1 bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-2xl w-fit flex-wrap">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setResult(null); setError(''); setValidationErrors({}); }}
                className={`py-2.5 px-5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                  tab === t.id
                    ? 'bg-[var(--primary-subtle)] border border-[var(--primary)]/25 text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)]'
                }`}
              >
                <Icon className={`w-4 h-4 flex-none ${t.color}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/20 text-xs text-[var(--danger-light)] font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Input Panel */}
          <GlassCard className="p-6 lg:col-span-1 space-y-5" animate={false}>
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-subtle)] pb-3 font-display">Input Parameters</h3>
            
            <AnimatePresence mode="wait">
              {tab === 'goal' && (
                <motion.div key="goal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <Input label="Goal Target Amount (₹)" name="goal_amount" value={goal.goal_amount} onChange={(v: any) => setGoal({ ...goal, goal_amount: v })} />
                  <Input label="Monthly Contribution (₹)" name="monthly_savings" value={goal.monthly_savings} onChange={(v: any) => setGoal({ ...goal, monthly_savings: v })} />
                  <Input label="Current Cash Buffer (₹)" name="current_saved" value={goal.current_saved} onChange={(v: any) => setGoal({ ...goal, current_saved: v })} />
                  <Input label="Estimated Yield (%)" name="annual_return_pct" value={goal.annual_return_pct} onChange={(v: any) => setGoal({ ...goal, annual_return_pct: v })} step={0.5} />
                  <button onClick={() => call('goal', goal)} disabled={loading} className="w-full fintech-button-primary py-2.5 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 btn-glow mt-2">
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <>Run Calculations</>}
                  </button>
                </motion.div>
              )}
              {tab === 'retirement' && (
                <motion.div key="retirement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Current Age" name="current_age" value={ret.current_age} onChange={(v: any) => setRet({ ...ret, current_age: v })} />
                    <Input label="Retire Age" name="retirement_age" value={ret.retirement_age} onChange={(v: any) => setRet({ ...ret, retirement_age: v })} />
                  </div>
                  <Input label="Monthly Income (₹)" name="monthly_income" value={ret.monthly_income} onChange={(v: any) => setRet({ ...ret, monthly_income: v })} />
                  <Input label="Monthly Savings (₹)" name="monthly_savings" value={ret.monthly_savings} onChange={(v: any) => setRet({ ...ret, monthly_savings: v })} />
                  <Input label="Current Savings Pool (₹)" name="current_corpus" value={ret.current_corpus} onChange={(v: any) => setRet({ ...ret, current_corpus: v })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Inflation (%)" name="inflation_rate_pct" value={ret.inflation_rate_pct} onChange={(v: any) => setRet({ ...ret, inflation_rate_pct: v })} step={0.5} />
                    <Input label="Return (%)" name="annual_return_pct" value={ret.annual_return_pct} onChange={(v: any) => setRet({ ...ret, annual_return_pct: v })} step={0.5} />
                  </div>
                  <Input label="Life Expectancy" name="life_expectancy" value={ret.life_expectancy} onChange={(v: any) => setRet({ ...ret, life_expectancy: v })} />
                  <button onClick={() => call('retirement', ret)} disabled={loading} className="w-full fintech-button-primary py-2.5 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 btn-glow mt-2">
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <>Run Calculations</>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Results Panel */}
          <div className="lg:col-span-2 glass-card p-6 min-h-[400px] flex flex-col">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-subtle)] pb-3 mb-5 font-display flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--primary-light)]" /> AI Analysis Results
            </h3>
            
            <div className="flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center py-16">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-[var(--border-subtle)] animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-[var(--primary)] animate-spin" />
                  </div>
                  <p className="text-xs text-[var(--text-dim)] font-medium">Running AI calculations...</p>
                </div>
              ) : result ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {tab === 'goal' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Years Required</span>
                          <div className="text-xl font-extrabold text-[var(--text-primary)] mt-1 font-mono">{result.years_required || 0} Years</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Future Value</span>
                          <div className="text-xl font-extrabold text-[var(--accent)] mt-1 font-mono">₹{fmt(result.future_value || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Total Contribution</span>
                          <div className="text-xl font-extrabold text-[var(--text-primary)] mt-1 font-mono">₹{fmt(result.total_contribution || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Interest Earned</span>
                          <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">₹{fmt(result.interest_earned || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Goal Completion %</span>
                          <div className="text-xl font-extrabold text-blue-400 mt-1 font-mono">{result.goal_completion_pct || 0}%</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Monthly Required Savings</span>
                          <div className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">₹{fmt(result.monthly_required_savings || 0)}</div>
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--bg-primary)]/60 border border-[var(--border-subtle)] rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-[var(--text-primary)]">
                          <span>Target Completion Date</span>
                          <span className="text-emerald-400 font-mono font-bold">{result.target_completion_date}</span>
                        </div>
                        <div className="progress-bar h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="progress-bar-fill h-full bg-[var(--primary)]" style={{ width: `${Math.min(result.goal_completion_pct || 0, 100)}%` }} />
                        </div>
                      </div>

                      {/* Growth Chart */}
                      {result.growth_chart && (
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider mb-4 block">Savings Growth Chart</span>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={result.growth_chart}>
                                <defs>
                                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid {...chartGridProps} />
                                <XAxis dataKey="year" {...chartXAxisProps} label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                                <YAxis {...chartYAxisProps} />
                                <Tooltip {...chartTooltipProps} formatter={(val: any) => [`₹${fmt(val)}`, 'Balance']} />
                                <Area type="monotone" dataKey="balance" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'retirement' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Retirement Corpus</span>
                          <div className="text-xl font-extrabold text-[var(--text-primary)] mt-1 font-mono">₹{fmt(result.retirement_corpus || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Monthly Pension</span>
                          <div className="text-xl font-extrabold text-[var(--accent)] mt-1 font-mono">₹{fmt(result.monthly_pension || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Inflation Adjusted Corpus</span>
                          <div className="text-xl font-extrabold text-amber-400 mt-1 font-mono">₹{fmt(result.inflation_adjusted_corpus || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Future Monthly Expenses</span>
                          <div className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">₹{fmt(result.future_monthly_expenses || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Safe Withdrawal (Annual)</span>
                          <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">₹{fmt(result.safe_withdrawal || 0)}</div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Years after Retirement</span>
                          <div className="text-xl font-extrabold text-blue-400 mt-1 font-mono">{result.years_after_retirement || 0} Years</div>
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--bg-primary)]/60 border border-[var(--border-subtle)] rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-[var(--text-primary)]">
                          <span>Retirement Readiness Score</span>
                          <span className="text-emerald-400 font-mono font-bold">{result.retirement_readiness_score || 0}%</span>
                        </div>
                        <div className="progress-bar h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="progress-bar-fill h-full bg-emerald-500" style={{ width: `${Math.min(result.retirement_readiness_score || 0, 100)}%` }} />
                        </div>
                      </div>

                      {/* Timeline and Charts Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Timeline */}
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider mb-4 block">Retirement Timeline</span>
                          <div className="space-y-3">
                            {result.retirement_timeline?.map((step: any, idx: number) => (
                              <div key={idx} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--primary-subtle)] text-[var(--primary-light)] font-bold text-[10px] flex items-center justify-center flex-none">
                                  {step.age}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[var(--text-primary)]">{step.title}</p>
                                  <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{step.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl flex flex-col justify-between">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider mb-2 block">Contributions vs Interest</span>
                          <div className="h-44 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie 
                                  data={[
                                    { name: 'Contributions', value: result.retirement_corpus - result.monthly_pension * 12 },
                                    { name: 'Interest/Growth', value: result.monthly_pension * 12 }
                                  ]} 
                                  cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value"
                                >
                                  <Cell fill="var(--primary)" />
                                  <Cell fill="var(--accent)" />
                                </Pie>
                                <Tooltip formatter={(val: any) => `₹${fmt(val)}`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Growth Chart */}
                      {result.growth_chart && (
                        <div className="p-4 bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider mb-4 block">Corpus Growth Graph</span>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={result.growth_chart}>
                                <defs>
                                  <linearGradient id="colorCorpus" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid {...chartGridProps} />
                                <XAxis dataKey="age" {...chartXAxisProps} label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
                                <YAxis {...chartYAxisProps} />
                                <Tooltip {...chartTooltipProps} formatter={(val: any) => [`₹${fmt(val)}`, 'Corpus']} />
                                <Area type="monotone" dataKey="corpus" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorCorpus)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="text-center py-16 text-[var(--text-dim)] space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] flex items-center justify-center">
                    <BrainCircuit className="w-8 h-8 text-[var(--text-dim)] animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Ready to Calculate</p>
                  <p className="text-[11px] text-[var(--text-dim)] max-w-xs mx-auto leading-relaxed">Enter metrics in the input panel and click calculate to run AI analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
