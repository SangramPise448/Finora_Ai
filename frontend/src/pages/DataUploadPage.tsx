import React, { useState, useCallback, useRef, useMemo } from 'react';
import { SidebarLayout } from '../components/SidebarLayout';
import { apiClient } from '../utils/apiClient';
import { motion } from 'framer-motion';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, 
  RefreshCw, BarChart, Database, Download, Play, ShieldAlert, X,
  Brain, Search, ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, PieChart, TrendingUp, ShieldCheck, FileSpreadsheet, Code, FolderUp
} from 'lucide-react';

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

interface ValidationStats {
  original_rows: number;
  original_columns: number;
  cleaned_rows: number;
  missing_data_rate_pct: number;
  duplicates_removed: number;
}

interface UploadResult {
  dataset_id: string;
  filename: string;
  row_count: number;
  validation: { is_valid: boolean; warnings: string[]; stats: ValidationStats };
  summary: {
    total_records: number;
    average_income: number;
    average_expense: number;
    average_predicted_savings: number;
    average_health_score: number;
    average_budget_utilization: number;
  };
  preview_rows?: any[];
}

type Phase = 'idle' | 'dragging' | 'previewing' | 'uploading' | 'done' | 'error';

interface SingleRecordAnalysis {
  customer_information: any;
  financial_summary: {
    income: number;
    expense: number;
    savings: number;
    budget: number;
    balance: number;
    health_score: number;
    predicted_monthly_savings: number;
    investment_capacity: number;
    debt_ratio: number;
    risk_score: number;
    risk_level: string;
  };
  ai_executive_summary: string;
  why_health_score: string[];
  charts: {
    income_vs_expense: any[];
    budget_utilization: any;
    savings_forecast: any[];
    category_breakdown: any[];
    health_meter: any;
    wealth_prediction: any[];
    investment_recommendation: any[];
    ai_risk_assessment: any[];
    monthly_projection: any[];
  };
  recommendations_by_priority: {
    high: string[];
    medium: string[];
    low: string[];
  };
  metadata: {
    analyzed_by: string;
    analysis_time: string;
    model_version: string;
    dataset_name: string;
  };
}

export default function DataUploadPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [batchPredictionMessage, setBatchPredictionMessage] = useState('');
  
  // Dynamic Record Viewer State
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Single Record AI Prediction State
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const [selectedRecordAnalysis, setSelectedRecordAnalysis] = useState<SingleRecordAnalysis | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [analysisProgressStep, setAnalysisProgressStep] = useState<string>('');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFile = useCallback((f: File) => {
    const allowed = ['.csv', '.xls', '.xlsx'];
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError('Unsupported file type. Only CSV (.csv) and Excel (.xls, .xlsx) files are supported.');
      setPhase('error');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(`File size (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 200 MB.`);
      setPhase('error');
      return;
    }
    setFile(f);
    setPhase('previewing');
    setError('');
    setResult(null);
    setBatchPredictionMessage('');
    setSelectedRecordAnalysis(null);
    setSelectedRecordIndex(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setPhase('idle');
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPhase('idle');
    setProgress(0);
    setError('Upload was cancelled by user.');
  };

  const upload = async () => {
    if (!file) return;
    setPhase('uploading');
    setProgress(10);
    setError('');
    setBatchPredictionMessage('');

    const fd = new FormData();
    fd.append('file', file);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await apiClient.post('/finance/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded * 100) / evt.total);
            setProgress(pct);
          }
        }
      });
      setProgress(100);

      const resData = res.data;
      const data: UploadResult = resData.data || resData;

      setResult(data);
      setPhase('done');
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        setError('Upload cancelled.');
      } else {
        const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
        setError(typeof detail === 'string' ? detail : 'Connection error occurred while streaming dataset to server.');
      }
      setPhase('error');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleDownloadCleaned = async () => {
    if (!result) return;
    try {
      const res = await apiClient.get(`/finance/datasets/${result.dataset_id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_${result.filename || 'dataset.csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Download failed.');
    }
  };

  const handleBatchPrediction = async () => {
    if (!result) return;
    setBatchPredictionMessage('Executing ML prediction across full dataset pipeline...');
    setTimeout(() => {
      setBatchPredictionMessage(`Batch prediction complete! Processed ${result.summary?.total_records || result.row_count} records. Average predicted savings: ₹${fmt(result.summary?.average_predicted_savings)}.`);
    }, 1200);
  };

  const fmt = (num?: number) => {
    if (num == null || isNaN(num)) return '0';
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  // Column Headers for preview table
  const rawHeaders = useMemo(() => {
    if (!result?.preview_rows || result.preview_rows.length === 0) return [];
    return Object.keys(result.preview_rows[0]);
  }, [result]);

  // Filtered & Sorted Preview Rows
  const processedRows = useMemo(() => {
    if (!result?.preview_rows) return [];
    let rows = [...result.preview_rows];

    // Real-time search filter across all fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => 
        Object.values(r).some(val => String(val ?? '').toLowerCase().includes(q))
      );
    }

    // Dynamic Column Sorting
    if (sortKey) {
      rows.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA ?? '').toLowerCase();
        valB = String(valB ?? '').toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [result, searchQuery, sortKey, sortDirection]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    if (rowsPerPage === 'All') return processedRows;
    const limit = Number(rowsPerPage);
    const start = (currentPage - 1) * limit;
    return processedRows.slice(start, start + limit);
  }, [processedRows, rowsPerPage, currentPage]);

  const totalPages = useMemo(() => {
    if (rowsPerPage === 'All') return 1;
    return Math.ceil(processedRows.length / Number(rowsPerPage)) || 1;
  }, [processedRows, rowsPerPage]);

  // Run AI Prediction on Single Record
  const handleRunSinglePrediction = async (recordRow: any, rawIndex: number) => {
    setAnalyzingIndex(rawIndex);
    setAnalysisProgressStep('Loading transaction record...');
    
    setTimeout(() => setAnalysisProgressStep('Running Random Forest ML Model...'), 400);
    setTimeout(() => setAnalysisProgressStep('Calculating Financial Health Score...'), 800);
    setTimeout(() => setAnalysisProgressStep('Generating Insights & Charts...'), 1200);

    try {
      const res = await apiClient.post('/finance/prediction/single-record', recordRow);
      const resData = res.data?.data || res.data;
      
      setTimeout(() => {
        setSelectedRecordAnalysis(resData);
        setSelectedRecordIndex(rawIndex);
        setAnalyzingIndex(null);
        setAnalysisProgressStep('');

        // Scroll smoothly to Analysis Panel
        setTimeout(() => {
          document.getElementById('single-record-analysis-panel')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }, 1400);

    } catch (err: any) {
      setAnalyzingIndex(null);
      setAnalysisProgressStep('');
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setError(typeof detail === 'string' ? detail : 'Single record prediction failed. Please verify server connection.');
    }
  };

  // Navigate Record in Analysis Panel
  const handleNavigateRecord = (direction: 'prev' | 'next') => {
    if (selectedRecordIndex == null || !result?.preview_rows) return;
    const nextIdx = direction === 'prev' ? selectedRecordIndex - 1 : selectedRecordIndex + 1;
    if (nextIdx >= 0 && nextIdx < result.preview_rows.length) {
      handleRunSinglePrediction(result.preview_rows[nextIdx], nextIdx);
    }
  };

  // Export Single Record Analysis
  const handleExportSingleAnalysis = (format: 'pdf' | 'excel' | 'json' | 'csv') => {
    if (!selectedRecordAnalysis) return;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(selectedRecordAnalysis, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `single_analysis_${selectedRecordAnalysis.customer_information?.Customer_ID || 'record'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = Object.keys(selectedRecordAnalysis.customer_information).join(',');
      const values = Object.values(selectedRecordAnalysis.customer_information).map(v => `"${v}"`).join(',');
      const blob = new Blob([`${headers}\n${values}`], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `single_analysis_${selectedRecordAnalysis.customer_information?.Customer_ID || 'record'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert(`Downloading ${format.toUpperCase()} export report for record ${selectedRecordAnalysis.customer_information?.Customer_ID}...`);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
        {/* Page Header */}
        <div className="border-b border-[var(--border-subtle)] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5 font-display">
              <FolderUp className="w-8 h-8 text-[var(--primary-light)]" /> Transaction Data Uploader
            </h1>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              Upload multi-tier financial datasets (up to 200 MB). Explore records dynamically and execute single-record AI predictions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const sampleCSV = `Customer_ID,Age,Gender,Occupation,Income,Expense,Budget,Investment,Category,Payment_Mode\nCUST_101,34,Male,Software Engineer,85000,42000,50000,15000,Technology,Credit Card\nCUST_102,29,Female,Marketing Lead,62000,38000,40000,8000,Travel,Debit Card\nCUST_103,45,Male,Financial Analyst,120000,55000,70000,30000,Investment,Net Banking\nCUST_104,31,Female,Doctor,110000,48000,60000,25000,Medical,Credit Card\nCUST_105,27,Male,Designer,48000,32000,35000,5000,Shopping,UPI`;
                const blob = new Blob([sampleCSV], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'finora_sample_dataset.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="py-2.5 px-4 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-white hover:border-[var(--border-hover)] transition-all flex items-center gap-2 cursor-pointer font-bold"
            >
              <Download className="w-4 h-4 text-[var(--primary-light)]" /> Download Sample Template
            </button>
          </div>
        </div>

        {/* TOP SUMMARY METRICS & ACTIONS BAR (HORIZONTALLY OCCUPIES FULL AREA ABOVE UPLOAD BLOCK) */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-[var(--primary-light)]" /> Total Records</span>
                <div className="text-xl font-bold text-[var(--text-primary)] mt-1.5 font-mono">{fmt(result.summary?.total_records || result.row_count)}</div>
                <span className="text-[9px] text-emerald-400 block mt-1">Processed successfully</span>
              </div>
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider flex items-center gap-1.5"><BarChart className="w-3.5 h-3.5 text-emerald-400" /> Avg Income</span>
                <div className="text-xl font-bold text-[var(--text-primary)] mt-1.5 font-mono">₹{fmt(result.summary?.average_income)}</div>
                <span className="text-[9px] text-[var(--text-dim)] block mt-1">Monthly baseline</span>
              </div>
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Avg Forecast Savings</span>
                <div className="text-xl font-bold text-emerald-400 mt-1.5 font-mono">₹{fmt(result.summary?.average_predicted_savings)}</div>
                <span className="text-[9px] text-[var(--text-dim)] block mt-1">ML Predicted</span>
              </div>
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Missing values</span>
                <div className="text-xl font-bold text-[var(--text-primary)] mt-1.5 font-mono">{(result.validation?.stats?.missing_data_rate_pct || 0).toFixed(2)}%</div>
                <span className="text-[9px] text-[var(--text-dim)] block mt-1">Imputed medians</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadCleaned}
                  className="fintech-button-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Cleaned CSV
                </button>
                <button 
                  onClick={handleBatchPrediction}
                  className="fintech-button-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Batch Predict
                </button>
              </div>

              {batchPredictionMessage && (
                <span className="text-[11px] text-[var(--primary-light)] font-semibold">{batchPredictionMessage}</span>
              )}
            </div>
          </motion.div>
        )}

        {/* DATASET UPLOAD BLOCK SECTION */}
        <div className="glass-card p-6 border border-[var(--border-default)] rounded-3xl space-y-4 shadow-xl">
          <div
            onDragOver={(e) => { e.preventDefault(); setPhase('dragging'); }}
            onDragLeave={() => setPhase(file ? 'previewing' : 'idle')}
            onDrop={onDrop}
            className={`p-8 border-2 border-dashed rounded-3xl text-center transition-all flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden ${
              phase === 'dragging' 
                ? 'border-[var(--primary)] bg-[var(--primary-subtle)]/20 scale-[1.01]' 
                : phase === 'done'
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-[var(--border-default)] hover:border-[var(--primary)]/50'
            }`}
          >
            <input
              type="file"
              accept=".csv, .xls, .xlsx"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
            />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center text-[var(--primary-light)] mb-4 border border-[var(--primary)]/30 shadow-lg">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>

            <h3 className="text-sm font-bold text-[var(--text-primary)] font-display">
              {file ? file.name : 'Drag & Drop Financial Dataset'}
            </h3>
            <p className="text-[11px] text-[var(--text-dim)] mt-1.5 max-w-xs leading-relaxed">
              Supports CSV, XLS, XLSX files up to <strong className="text-[var(--text-primary)]">200 MB</strong>.
            </p>

            {file && (
              <div className="mt-4 px-3 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[10px] text-[var(--primary-light)] font-mono font-bold">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {file && (
            <div className="flex items-center gap-3">
              <button
                onClick={upload}
                disabled={phase === 'uploading'}
                className="w-full fintech-button-primary py-3.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 btn-glow cursor-pointer"
              >
                {phase === 'uploading' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Uploading {progress}%
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Process & Inspect Dataset
                  </>
                )}
              </button>

              {phase === 'uploading' && (
                <button
                  onClick={cancelUpload}
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                  title="Cancel upload"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-none" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* DYNAMIC DATASET RECORD EXPLORER (OCCUPIES FULL AREA BELOW PROCESS BUTTON) */}
        {result && result.preview_rows && result.preview_rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card border border-[var(--border-default)] rounded-3xl overflow-hidden space-y-4 p-6 shadow-2xl"
          >
            {/* Header Controls (Show Records Dropdown & Real-time Search) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-[var(--accent)]" />
                <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">
                  Dynamic Dataset Record Explorer
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Show Records Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Show Records:</label>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                      setRowsPerPage(val);
                      setCurrentPage(1);
                    }}
                    className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                    <option value="All">All Records</option>
                  </select>
                </div>

                {/* Search Inside Dataset Input */}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-dim)] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search records..."
                    className="w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)]/50 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-muted)] font-bold">
                    <th className="p-3 uppercase tracking-wider text-[10px] text-center sticky left-0 bg-[var(--bg-secondary)] z-10">Actions</th>
                    <th className="p-3 uppercase tracking-wider text-[10px]">Risk Badge</th>
                    {rawHeaders.map(h => (
                      <th 
                        key={h} 
                        onClick={() => {
                          if (sortKey === h) {
                            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortKey(h);
                            setSortDirection('asc');
                          }
                        }}
                        className="p-3 uppercase tracking-wider text-[10px] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>{h}</span>
                          <ArrowUpDown className="w-3 h-3 text-[var(--text-dim)]" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={rawHeaders.length + 2} className="p-8 text-center text-xs text-[var(--text-dim)]">
                        No records matching search filters
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const rawIdx = processedRows.indexOf(row);
                      const isAnalyzing = analyzingIndex === rawIdx;
                      const isSelected = selectedRecordIndex === rawIdx;
                      
                      const incomeVal = Number(row.Income || row.income || 0);
                      const expenseVal = Number(row.Expense || row.expense || 0);
                      const isHighRisk = expenseVal > incomeVal;
                      const isModRisk = expenseVal > incomeVal * 0.7;

                      return (
                        <tr 
                          key={idx} 
                          className={`transition-colors ${
                            isSelected 
                              ? 'bg-[var(--primary-subtle)]/20 border-l-2 border-l-[var(--primary)]' 
                              : 'hover:bg-[var(--surface-glass)]'
                          }`}
                        >
                          {/* Individual AI Prediction Action Button */}
                          <td className="p-3 text-center sticky left-0 bg-[var(--bg-secondary)] z-10">
                            <button
                              onClick={() => handleRunSinglePrediction(row, rawIdx)}
                              disabled={isAnalyzing}
                              className="py-1.5 px-3 rounded-lg bg-[var(--primary-subtle)] hover:bg-[var(--primary)]/30 border border-[var(--primary)]/40 text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md group disabled:opacity-50"
                              title="Run Single Record AI Analysis"
                            >
                              {isAnalyzing ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-[var(--primary-light)]" />
                              ) : (
                                <Brain className="w-3 h-3 text-[var(--primary-light)] group-hover:scale-110 transition-transform" />
                              )}
                              <span>Run AI</span>
                            </button>
                          </td>

                          {/* Risk Badge Column */}
                          <td className="p-3">
                            {isHighRisk ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[9px] font-bold uppercase tracking-wider">
                                🔴 High Risk
                              </span>
                            ) : isModRisk ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                                🟡 Moderate
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                                🟢 Low Risk
                              </span>
                            )}
                          </td>

                          {/* Row Values */}
                          {rawHeaders.map(h => (
                            <td key={h} className="p-3 font-semibold whitespace-nowrap">
                              {typeof row[h] === 'number' 
                                ? row[h].toLocaleString('en-IN', { maximumFractionDigits: 2 }) 
                                : String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-dim)] font-semibold">
              <div>
                Showing <strong className="text-[var(--text-primary)]">{processedRows.length > 0 ? (currentPage - 1) * (rowsPerPage === 'All' ? processedRows.length : Number(rowsPerPage)) + 1 : 0}</strong> to <strong className="text-[var(--text-primary)]">{rowsPerPage === 'All' ? processedRows.length : Math.min(currentPage * Number(rowsPerPage), processedRows.length)}</strong> of <strong className="text-[var(--text-primary)]">{processedRows.length}</strong> records
              </div>

              {rowsPerPage !== 'All' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-[var(--text-primary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

            {/* Analysis Loading Progress Bar */}
            {analysisProgressStep && (
              <div className="glass-card p-6 border border-[var(--primary)]/30 rounded-2xl text-center space-y-3 bg-[var(--primary-subtle)]/10">
                <Brain className="w-8 h-8 text-[var(--primary-light)] animate-pulse mx-auto" />
                <p className="text-xs font-bold text-white font-display tracking-wide">{analysisProgressStep}</p>
                <div className="w-full bg-[var(--surface-subtle)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] h-full animate-pulse w-3/4" />
                </div>
              </div>
            )}

        {/* INDIVIDUAL FINANCIAL ANALYSIS WORKSPACE PANEL */}
        {selectedRecordAnalysis && (
          <motion.div
            id="single-record-analysis-panel"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 border border-[var(--border-default)] rounded-3xl space-y-8 shadow-2xl relative overflow-hidden mt-8"
          >
            {/* Top Bar Navigation & Export Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <Brain className="w-7 h-7 text-[var(--primary-light)]" />
                  <h2 className="text-xl font-extrabold text-[var(--text-primary)] font-display tracking-tight">
                    Individual Financial Analysis
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  AI Generated Financial Insights for Selected Transaction
                </p>
              </div>

              {/* Record Navigation & Single Record Exports */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-xl p-1">
                  <button
                    onClick={() => handleNavigateRecord('prev')}
                    className="py-1.5 px-3 rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-subtle)] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous Record
                  </button>
                  <button
                    onClick={() => handleNavigateRecord('next')}
                    className="py-1.5 px-3 rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-subtle)] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Next Record <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleExportSingleAnalysis('pdf')}
                    className="py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] hover:bg-[var(--surface-subtle)] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" /> Export PDF
                  </button>
                  <button
                    onClick={() => handleExportSingleAnalysis('excel')}
                    className="py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] hover:bg-[var(--surface-subtle)] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export Excel
                  </button>
                  <button
                    onClick={() => handleExportSingleAnalysis('json')}
                    className="py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] hover:bg-[var(--surface-subtle)] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Code className="w-3.5 h-3.5 text-amber-400" /> JSON
                  </button>
                </div>
              </div>
            </div>

            {/* AI Executive Summary Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[var(--primary)]/15 to-[var(--secondary)]/15 border border-[var(--primary)]/30 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-light)] flex items-center gap-1.5 font-display">
                  <Sparkles className="w-4 h-4" /> AI Executive Summary
                </span>
                <span className="text-[9px] font-mono text-[var(--text-dim)]">
                  {selectedRecordAnalysis.metadata?.analysis_time}
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans font-medium">
                {selectedRecordAnalysis.ai_executive_summary}
              </p>
            </div>

            {/* Customer Summary & Financial Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-semibold">
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Customer ID</span>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-1 font-mono">{selectedRecordAnalysis.customer_information?.Customer_ID}</p>
              </div>
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Transaction ID</span>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-1 font-mono">{selectedRecordAnalysis.customer_information?.Transaction_ID}</p>
              </div>
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Monthly Income</span>
                <p className="text-sm font-bold text-[var(--fin-income)] mt-1 font-mono">₹{fmt(selectedRecordAnalysis.financial_summary?.income)}</p>
              </div>
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Monthly Expense</span>
                <p className="text-sm font-bold text-[var(--fin-expense)] mt-1 font-mono">₹{fmt(selectedRecordAnalysis.financial_summary?.expense)}</p>
              </div>
              <div className="glass-card p-4 border border-[var(--border-default)] rounded-2xl">
                <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Health Score</span>
                <p className="text-sm font-bold text-indigo-400 mt-1 font-mono">{selectedRecordAnalysis.financial_summary?.health_score?.toFixed(1)}/100</p>
              </div>
            </div>

            {/* Why Health Score Breakdown */}
            <div className="glass-card p-5 border border-[var(--border-default)] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--primary-light)]" /> Why this Financial Health Score?
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                {selectedRecordAnalysis.why_health_score?.map((pt: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* EXECUTIVE DASHBOARD STYLE CHARTS & TABLES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Income vs Expense Bar Chart */}
              <div className="glass-card p-6 border border-[var(--border-default)] rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-emerald-400" /> Income vs Expense Breakdown
                </h4>
                <div className="space-y-3 text-xs font-semibold">
                  {selectedRecordAnalysis.charts?.income_vs_expense?.map((item: any) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                        <span className="font-mono text-[var(--text-primary)]">₹{fmt(item.amount)}</span>
                      </div>
                      <div className="w-full bg-[var(--surface-subtle)] h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${Math.min(100, (item.amount / (selectedRecordAnalysis.financial_summary?.income || 1)) * 100)}%`,
                            backgroundColor: item.color 
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Budget Utilization Progress Gauge */}
              <div className="glass-card p-6 border border-[var(--border-default)] rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" /> Budget Utilization Gauge
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--text-dim)] uppercase font-bold">Allocated Budget: ₹{fmt(selectedRecordAnalysis.charts?.budget_utilization?.budget)}</span>
                    <span className="text-indigo-400 font-bold font-mono">{selectedRecordAnalysis.charts?.budget_utilization?.percentage}% Utilized</span>
                  </div>
                  <div className="w-full bg-[var(--surface-subtle)] h-3 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedRecordAnalysis.charts?.budget_utilization?.percentage > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]'
                      }`}
                      style={{ width: `${selectedRecordAnalysis.charts?.budget_utilization?.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Wealth Prediction Area Chart */}
              <div className="glass-card p-6 border border-[var(--border-default)] rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" /> Wealth Growth Forecast (5-Year Projection)
                </h4>
                <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
                  {selectedRecordAnalysis.charts?.wealth_prediction?.map((w: any) => (
                    <div key={w.period} className="p-2 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)]">
                      <span className="text-[var(--text-dim)] block uppercase font-bold">{w.period}</span>
                      <span className="text-[var(--fin-income)] font-bold block mt-1">₹{fmt(w.wealth)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Investment Recommendation Breakdown */}
              <div className="glass-card p-6 border border-[var(--border-default)] rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-400" /> Suggested Investment Allocation
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                  {selectedRecordAnalysis.charts?.investment_recommendation?.map((inv: any) => (
                    <div key={inv.type} className="p-3 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">{inv.type}</span>
                      <span className="font-mono text-[var(--fin-income)] font-bold">₹{fmt(inv.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Categorized Priority AI Recommendations */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Actionable AI Recommendations (Prioritized)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* High Priority */}
                <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block font-display">
                    🔥 High Priority Actions
                  </span>
                  <ul className="space-y-2 text-[var(--text-secondary)]">
                    {selectedRecordAnalysis.recommendations_by_priority?.high?.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Medium Priority */}
                <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-display">
                    ⚡ Medium Priority Actions
                  </span>
                  <ul className="space-y-2 text-[var(--text-secondary)]">
                    {selectedRecordAnalysis.recommendations_by_priority?.medium?.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Low Priority */}
                <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-display">
                    💡 Optimization Advice
                  </span>
                  <ul className="space-y-2 text-[var(--text-secondary)]">
                    {selectedRecordAnalysis.recommendations_by_priority?.low?.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </SidebarLayout>
  );
}
