import React, { useState, useRef, useEffect } from 'react';
import { SidebarLayout } from '../components/SidebarLayout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/apiClient';
import { motion } from 'framer-motion';
import { 
  Sparkles, Send, Bot, 
  Coins, LineChart, Target, Landmark, Home, Activity, 
  RefreshCw, Plus, Trash2, Pin, RotateCcw, Copy, Check, ThumbsUp, ThumbsDown, 
  Download, Search, MessageSquare, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'like' | 'dislike';
}

interface Session {
  id: string;
  session_id: string;
  title: string;
  is_pinned?: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

const QUICK_PROMPTS = [
  { text: 'My salary is ₹50,000. How much SIP should I invest?', icon: Coins, color: 'text-[var(--primary-light)]' },
  { text: 'How should I allocate ₹2 lakh savings?', icon: LineChart, color: 'text-[var(--accent)]' },
  { text: 'Compare SIP vs Mutual Funds for long-term growth', icon: Landmark, color: 'text-[var(--blue-glow)]' },
  { text: 'Build a 6-month emergency buffer & debt plan', icon: Target, color: 'text-[var(--secondary-light)]' },
  { text: 'How to prepay home loan & save on 80C/80D tax?', icon: Home, color: 'text-[var(--warning)]' },
  { text: 'Explain my financial health score & wealth forecast', icon: Activity, color: 'text-[var(--danger-light)]' },
];

export default function AdvisorPage() {
  const { user } = useAuth();
  
  // Multi-session State
  const [sessions, setSessions] = useState<Record<string, Session[]>>({
    Pinned: [], Today: [], Yesterday: [], 'Last Week': [], Older: []
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTitle, setActiveSessionTitle] = useState<string>('New Financial Chat');
  const [sessionSearch, setSessionSearch] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load User Sessions
  const fetchSessions = async () => {
    try {
      const res = await apiClient.get('/assistant/sessions', {
        params: { q: sessionSearch, trash: showTrash }
      });
      if (res.data?.success && res.data?.data) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [sessionSearch, showTrash]);

  // Load Session Messages on Active Session Change
  useEffect(() => {
    if (!activeSessionId) {
      // Default welcome state
      setMessages([
        {
          id: '0',
          role: 'assistant',
          content: `👋 Hello **${user?.name || ''}**! I'm **Finora AI**, your ChatGPT-style personal financial assistant.\n\nAsk me any finance question—I remember your salary changes, expenses & goals:\n- 💰 **Salary-based budget planning** (e.g. ₹50,000 vs ₹70,000)\n- 📈 **SIPs, Mutual Funds & Stock Portfolios**\n- 🛡️ **Emergency reserves & Term Insurance**\n- 🏦 **Loans, Credit Cards & Tax Savings (80C/80D/NPS)**\n- 🌴 **Retirement & 5-Year Wealth Forecast**\n\nHow can I help you build wealth today?`,
          timestamp: new Date(),
        },
      ]);
      setActiveSessionTitle('New Financial Chat');
      setSuggestedPrompts([
        "My salary is ₹50,000. How much SIP should I invest?",
        "How to optimize my monthly budget?",
        "What is my 5-year wealth forecast?"
      ]);
      return;
    }

    const loadSessionDetails = async () => {
      try {
        const res = await apiClient.get(`/assistant/sessions/${activeSessionId}`);
        if (res.data?.success) {
          const sess = res.data.session;
          if (sess) setActiveSessionTitle(sess.title || 'Financial Session');

          const historyMsgs: any[] = res.data.messages || [];
          if (historyMsgs.length > 0) {
            const formatted: Message[] = historyMsgs.map(m => ({
              id: m.id || String(Math.random()),
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.message,
              timestamp: m.created_at ? new Date(m.created_at) : new Date(),
            }));
            setMessages(formatted);
          } else {
            setMessages([]);
          }
        }
      } catch (err) {
        console.error('Failed to load session details:', err);
      }
    };

    loadSessionDetails();
  }, [activeSessionId, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Start New Chat Session
  const handleNewChat = async () => {
    try {
      const res = await apiClient.post('/assistant/sessions/new');
      if (res.data?.success && res.data?.data) {
        const newSess = res.data.data;
        setActiveSessionId(newSess.session_id);
        setActiveSessionTitle(newSess.title);
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
      setActiveSessionId(null);
    }
  };

  // Refresh Chat Memory State
  const handleRefreshChat = async () => {
    if (!activeSessionId) return;
    try {
      const res = await apiClient.post(`/assistant/sessions/${activeSessionId}/refresh`);
      if (res.data?.success) {
        const historyMsgs: any[] = res.data.messages || [];
        const formatted: Message[] = historyMsgs.map(m => ({
          id: m.id || String(Math.random()),
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.message,
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  };

  // Delete Session (Move to Trash)
  const handleDeleteSession = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/assistant/sessions/${sessId}`);
      if (activeSessionId === sessId) {
        setActiveSessionId(null);
      }
      fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  // Permanent Delete Session from Trash
  const handlePermanentDeleteSession = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/assistant/sessions/${sessId}/permanent`);
      if (activeSessionId === sessId) {
        setActiveSessionId(null);
      }
      fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  // Restore Session from Trash
  const handleRestoreSession = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/assistant/sessions/${sessId}/restore`);
      fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Pin Session
  const handleTogglePin = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/assistant/sessions/${sessId}/pin`);
      fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  // Send Message Turn
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsgText = text.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsgText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post('/assistant/chat', {
        message: userMsgText,
        conversation_id: activeSessionId
      });

      const resData = res.data;
      const aiReply = resData.reply || 'I could not process your financial query. Please try again.';
      const returnedSessionId = resData.conversation_id;
      const newSuggested = resData.suggested_prompts || [];

      if (!activeSessionId && returnedSessionId) {
        setActiveSessionId(returnedSessionId);
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiReply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
      setSuggestedPrompts(newSuggested);
      fetchSessions();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Network error. Please try again.';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ ${typeof errorMsg === 'string' ? errorMsg : 'Could not process request.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Copy Message Content to Clipboard
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit 👍/👎 Feedback
  const handleFeedback = async (msgId: string, rating: 'like' | 'dislike') => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: rating } : m));
    try {
      await apiClient.post('/assistant/feedback', { message_id: msgId, rating });
    } catch (e) {
      console.error(e);
    }
  };

  // Export Chat to Text File
  const handleExportChat = () => {
    const textContent = messages.map(m => `[${m.role.toUpperCase()} - ${m.timestamp.toLocaleTimeString()}]\n${m.content}\n`).join('\n----------------------------------------\n\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finora_AI_Chat_${activeSessionTitle.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Markdown Simple Parser Helper (renders tables, headers, bold, bullet points)
  const renderMarkdownContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableRows: string[][] = [];
    let inTable = false;

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      // Check Table Row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
        // Skip separator line | :--- |
        if (!cells.every(c => /^[:\-]+$/.test(c))) {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        // Render completed table
        inTable = false;
        if (tableRows.length > 0) {
          const header = tableRows[0];
          const body = tableRows.slice(1);
          elements.push(
            <div key={`table-${lineIdx}`} className="my-3 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] text-[var(--text-primary)]">
                  <tr>
                    {header.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-bold">{h.replace(/\*\*/g, '')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {body.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[var(--surface-subtle)]/50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 font-medium">{cell.replace(/\*\*/g, '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          tableRows = [];
        }
      }

      if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={lineIdx} className="text-sm font-bold text-[var(--text-primary)] mt-3 mb-1 font-display">{trimmed.replace('### ', '')}</h3>);
      } else if (trimmed.startsWith('#### ')) {
        elements.push(<h4 key={lineIdx} className="text-xs font-bold text-[var(--primary-light)] mt-2.5 mb-1 font-display">{trimmed.replace('#### ', '')}</h4>);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ')) {
        elements.push(<li key={lineIdx} className="text-xs text-[var(--text-secondary)] ml-4 list-disc leading-relaxed my-0.5">{trimmed.replace(/^[-•\d+\.]\s*/, '')}</li>);
      } else if (trimmed) {
        elements.push(
          <p key={lineIdx} className="text-xs text-[var(--text-secondary)] leading-relaxed my-1">
            {trimmed}
          </p>
        );
      }
    });

    return elements.length > 0 ? elements : <p className="text-xs">{content}</p>;
  };

  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden font-sans">
        
        {/* ChatGPT-Style Sessions Sidebar */}
        <aside className={`border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/95 backdrop-blur-xl flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-12 sm:w-14' : 'w-64 sm:w-72 absolute md:relative inset-y-0 left-0 z-30 shadow-2xl md:shadow-none h-full'
        } flex-none`}>
          
          {/* Sidebar Top Controls */}
          <div className="p-3 border-b border-[var(--border-subtle)] space-y-2 flex-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleNewChat}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--primary)]/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md group"
              >
                <Plus className="w-4 h-4 text-[var(--primary-light)] group-hover:rotate-90 transition-transform" />
                {!sidebarCollapsed && <span>New Chat</span>}
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2.5 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex-none"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {!sidebarCollapsed && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-dim)] pointer-events-none" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)]/50"
                />
              </div>
            )}
          </div>

          {/* Session History Scroll Container */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
              {showTrash ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Trash Bin</p>
                    <button onClick={() => setShowTrash(false)} className="text-[10px] text-[var(--primary-light)] hover:underline">Back to Chats</button>
                  </div>
                  {Object.keys(sessions).every(cat => sessions[cat].length === 0) ? (
                    <p className="text-center text-xs text-[var(--text-dim)] py-6">Trash is empty</p>
                  ) : (
                    Object.keys(sessions).map(cat => (
                      sessions[cat].map(s => (
                        <div key={s.id} className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 mb-1.5 flex items-center justify-between group">
                          <span className="text-xs font-medium text-[var(--text-secondary)] truncate">{s.title}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => handleRestoreSession(s.session_id, e)} className="p-1 text-[var(--primary-light)] hover:bg-[var(--surface-glass)] rounded cursor-pointer" title="Restore Chat">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handlePermanentDeleteSession(s.session_id, e)} className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded cursor-pointer" title="Delete Permanently">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ))
                  )}
                </div>
              ) : (
                ['Pinned', 'Today', 'Yesterday', 'Last Week', 'Older'].map(cat => {
                  const catList = sessions[cat] || [];
                  if (catList.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] px-2">
                        {cat}
                      </p>
                      {catList.map(s => {
                        const isActive = activeSessionId === s.session_id;

                        return (
                          <div
                            key={s.id}
                            onClick={() => setActiveSessionId(s.session_id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                              isActive
                                ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/40 text-[var(--text-primary)] shadow-md'
                                : 'bg-[var(--surface-glass)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-1">
                              <MessageSquare className={`w-3.5 h-3.5 flex-none ${isActive ? 'text-[var(--primary-light)]' : 'text-[var(--text-dim)]'}`} />
                              <span className="text-xs font-medium truncate font-display">{s.title}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleTogglePin(s.session_id, e)}
                                className={`p-1 rounded hover:bg-[var(--surface-subtle)] ${s.is_pinned ? 'text-amber-400' : 'text-[var(--text-dim)]'}`}
                                title={s.is_pinned ? 'Unpin chat' : 'Pin chat'}
                              >
                                <Pin className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteSession(s.session_id, e)}
                                className="p-1 text-[var(--text-dim)] hover:text-rose-400 rounded hover:bg-rose-500/10"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Sidebar Footer Trash Trigger */}
          {!sidebarCollapsed && !showTrash && (
            <div className="p-3 border-t border-[var(--border-subtle)] flex-none">
              <button
                onClick={() => setShowTrash(true)}
                className="w-full py-2 px-3 rounded-lg bg-[var(--surface-glass)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Trash Bin</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </aside>

        {/* Main AI Chat Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative">
          
          {/* Chat Workspace Header */}
          <div className="h-14 px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl flex items-center justify-between flex-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30">
                <Bot className="w-4 h-4 text-[var(--primary-light)]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-[var(--text-primary)] truncate font-display">{activeSessionTitle}</h2>
                <p className="text-[9px] text-[var(--text-dim)] font-medium">ChatGPT-Style AI Financial Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshChat}
                className="p-2 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Refresh Chat Memory State"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleExportChat}
                className="p-2 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Export Chat Conversation"
              >
                <Download className="w-3.5 h-3.5 text-[var(--primary-light)]" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleNewChat}
                className="p-2 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--text-primary)] hover:bg-[var(--primary)]/40 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--primary-light)]" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isLastAI = !isUser && idx === messages.length - 1;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3.5 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none shadow-md ${
                    isUser 
                      ? 'bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-bold' 
                      : 'bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--primary-light)]'
                  }`}>
                    {isUser ? (user?.name?.[0]?.toUpperCase() || 'U') : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl border ${
                      isUser
                        ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/30 text-white shadow-lg'
                        : 'glass-card border-[var(--border-default)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl text-[var(--text-secondary)] shadow-xl'
                    }`}>
                      {isUser ? (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          {renderMarkdownContent(msg.content)}
                        </div>
                      )}
                    </div>

                    {/* Message Tools (Copy, Retry, Feedback, Timestamp) */}
                    <div className={`flex items-center gap-3 text-[10px] text-[var(--text-dim)] ${isUser ? 'justify-end' : 'justify-start'} px-1`}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      
                      {!isUser && (
                        <>
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => sendMessage(messages[idx - 1]?.content || '')}
                            className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                            title="Retry response"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'like')}
                            className={`hover:text-emerald-400 cursor-pointer ${msg.feedback === 'like' ? 'text-emerald-400' : ''}`}
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'dislike')}
                            className={`hover:text-rose-400 cursor-pointer ${msg.feedback === 'dislike' ? 'text-rose-400' : ''}`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Suggested Follow-up Prompts Chips */}
                    {isLastAI && suggestedPrompts.length > 0 && !loading && (
                      <div className="pt-2 space-y-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)]">You may also ask:</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestedPrompts.map((sp, spIdx) => (
                            <button
                              key={spIdx}
                              onClick={() => sendMessage(sp)}
                              className="px-3 py-1.5 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Sparkles className="w-3 h-3 text-[var(--primary-light)]" /> {sp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* AI Thinking Animation Indicator */}
            {loading && (
              <div className="flex gap-3.5 max-w-3xl mr-auto">
                <div className="w-8 h-8 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary-light)] shadow-md">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 rounded-2xl glass-card border border-[var(--border-default)] bg-[var(--bg-secondary)]/90 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>Finora AI is analyzing your financial context...</span>
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-[var(--primary-light)] rounded-full animate-ping" />
                    <span className="w-1.5 h-1.5 bg-[var(--primary-light)] rounded-full animate-ping delay-100" />
                    <span className="w-1.5 h-1.5 bg-[var(--primary-light)] rounded-full animate-ping delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick Starter Prompt Chips (When history is empty) */}
          {messages.length <= 1 && (
            <div className="px-6 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">Suggested Financial Topics</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {QUICK_PROMPTS.map((qp, qpIdx) => (
                  <button
                    key={qpIdx}
                    onClick={() => sendMessage(qp.text)}
                    className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] hover:bg-[var(--primary-subtle)] hover:border-[var(--primary)]/30 transition-all text-left flex items-start gap-2.5 cursor-pointer group"
                  >
                    <qp.icon className={`w-4 h-4 ${qp.color} flex-none mt-0.5`} />
                    <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-white truncate font-display">{qp.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box Footer Container */}
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/70 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto relative flex items-center gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask Finora AI about your salary, SIPs, loans, tax, or wealth forecast..."
                rows={1}
                disabled={loading}
                className="w-full bg-[var(--surface-glass)] border border-[var(--border-subtle)] focus:border-[var(--primary)]/50 rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none transition-all resize-none shadow-inner pr-12 disabled:opacity-50 font-medium"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="absolute right-2 p-2 rounded-lg bg-[var(--primary-subtle)] hover:bg-[var(--primary)]/40 text-white disabled:opacity-40 transition-all cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4 text-[var(--primary-light)]" />
              </button>
            </div>
            <p className="text-center text-[9px] text-[var(--text-dim)] mt-2 font-medium">
              Finora AI Assistant maintains conversation memory & dynamic salary context. Verified by Finora Engine.
            </p>
          </div>

        </div>
      </div>
    </SidebarLayout>
  );
}
