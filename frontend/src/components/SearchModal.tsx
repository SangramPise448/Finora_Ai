import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, LayoutDashboard, UserCheck, Bot, TrendingUp, 
  UploadCloud, FileText, Settings, DollarSign, BrainCircuit, 
  FileSpreadsheet, MessageSquare, Target, Bell, ArrowRight, CornerDownLeft, Clock
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupedResults, setGroupedResults] = useState<Record<string, any[]>>({});
  const [flatResults, setFlatResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('finora_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Global Ctrl + K / Cmd + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open
          const btn = document.getElementById('search-modal-trigger');
          if (btn) btn.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setGroupedResults({});
      setFlatResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced Search Query Handler (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setGroupedResults({});
      setFlatResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get('/search', { params: { q: trimmed } });
        if (res.data?.success && res.data?.results) {
          const resultsObj = res.data.results;
          setGroupedResults(resultsObj);
          
          // Flatten results for keyboard index navigation
          const allItems: any[] = [];
          Object.keys(resultsObj).forEach(cat => {
            allItems.push(...resultsObj[cat]);
          });
          setFlatResults(allItems);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Save term to recent searches
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    try {
      const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('finora_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectResult = (item: any) => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    onClose();
    if (item.url) {
      navigate(item.url);
    }
  };

  // Keyboard Navigation Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatResults.length > 0) {
        setSelectedIndex(prev => (prev + 1) % flatResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatResults.length > 0) {
        setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults.length > 0 && flatResults[selectedIndex]) {
        handleSelectResult(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-4 h-4 text-emerald-400" />;
      case 'UserCheck': return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'Bot': return <Bot className="w-4 h-4 text-amber-400" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4 text-indigo-400" />;
      case 'UploadCloud': return <UploadCloud className="w-4 h-4 text-purple-400" />;
      case 'FileText': return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'Settings': return <Settings className="w-4 h-4 text-slate-400" />;
      case 'DollarSign': return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'BrainCircuit': return <BrainCircuit className="w-4 h-4 text-amber-400" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-4 h-4 text-blue-400" />;
      case 'MessageSquare': return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'Target': return <Target className="w-4 h-4 text-rose-400" />;
      case 'Bell': return <Bell className="w-4 h-4 text-yellow-400" />;
      default: return <Search className="w-4 h-4 text-[var(--primary-light)]" />;
    }
  };

  let globalCounter = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md overflow-hidden font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl glass-card border border-[var(--border-default)] shadow-2xl bg-[var(--bg-secondary)]/95 backdrop-blur-2xl rounded-2xl overflow-hidden relative"
            onKeyDown={handleKeyDown}
          >
            {/* Header Search Input */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 relative">
              <Search className="w-5 h-5 text-[var(--primary-light)] flex-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Finora Search"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none font-medium"
              />
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-[var(--primary)] animate-spin flex-none" />
              ) : query ? (
                <button onClick={() => setQuery('')} className="p-1 text-[var(--text-dim)] hover:text-[var(--text-primary)] flex-none">
                  <X className="w-4 h-4" />
                </button>
              ) : null}
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-[var(--text-dim)] bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-md">
                ESC
              </kbd>
            </div>

            {/* Results / Empty Body Container */}
            <div className="max-h-[26rem] overflow-y-auto p-4 space-y-5 scrollbar-thin">
              {!query.trim() ? (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Recent Searches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => setQuery(s)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Search className="w-3 h-3 text-[var(--text-dim)]" /> {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Access Pages */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">
                      Quick Access Pages
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { title: 'Executive Dashboard', url: '/dashboard', cat: 'Pages', icon: 'LayoutDashboard', desc: 'Main financial metrics & predictions' },
                        { title: 'AI Financial Advisor', url: '/assistant', cat: 'Pages', icon: 'Bot', desc: 'ChatGPT-style AI finance assistant' },
                        { title: 'Future Financial Planner', url: '/planner', cat: 'Pages', icon: 'TrendingUp', desc: 'Retirement & 5-year compounding' },
                        { title: 'Uploaded Datasets', url: '/data-upload', cat: 'Pages', icon: 'UploadCloud', desc: 'CSV transaction analysis' },
                        { title: 'Financial Reports', url: '/reports', cat: 'Pages', icon: 'FileText', desc: 'PDF & Excel summaries' },
                        { title: 'Account Settings', url: '/settings', cat: 'Pages', icon: 'Settings', desc: 'Profile & security preferences' },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectResult(item)}
                          className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] hover:bg-[var(--primary-subtle)] hover:border-[var(--primary)]/30 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 flex-none">
                              {getCategoryIcon(item.icon)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-light)] truncate font-display">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-[var(--text-dim)] truncate">{item.desc}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--text-dim)] group-hover:text-[var(--primary-light)] flex-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : Object.keys(groupedResults).length === 0 && !loading ? (
                <div className="py-12 text-center space-y-2">
                  <Search className="w-8 h-8 text-[var(--text-dim)] mx-auto opacity-50" />
                  <p className="text-sm font-bold text-white">No internal results found</p>
                  <p className="text-xs text-[var(--text-dim)]">Try searching for 'Income', 'Savings', 'SIP', 'Dataset', or 'Budget'</p>
                </div>
              ) : (
                Object.keys(groupedResults).map((category) => (
                  <div key={category} className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] px-1">
                      {category}
                    </p>
                    <div className="space-y-1">
                      {groupedResults[category].map((item) => {
                        const itemIdx = globalCounter++;
                        const isSelected = itemIdx === selectedIndex;

                        return (
                          <div
                            key={item.id || itemIdx}
                            onClick={() => handleSelectResult(item)}
                            onMouseEnter={() => setSelectedIndex(itemIdx)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/50 text-white shadow-lg'
                                : 'bg-[var(--surface-glass)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex-none">
                                {getCategoryIcon(item.icon)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white font-display truncate">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-[var(--text-dim)] truncate">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-none">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--surface-subtle)] text-[var(--primary-light)] border border-[var(--border-subtle)]">
                                {item.category}
                              </span>
                              {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-[var(--primary-light)]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer Keyboard Shortcut Guide */}
            <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-glass)] flex items-center justify-between text-[10px] text-[var(--text-dim)]">
              <div className="flex items-center gap-3 font-medium">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded">↑</kbd> <kbd className="px-1.5 py-0.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded">↓</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded">↵</kbd> Select</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded">ESC</kbd> Close</span>
              </div>
              <span className="font-bold text-[var(--primary-light)]">Finora AI Internal Search</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
