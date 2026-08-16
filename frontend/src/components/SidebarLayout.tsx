import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FolderUp, 
  Target, 
  MessageSquare, 
  FileText, 
  ShieldAlert, 
  LogOut, 
  Bell, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  X,
  RefreshCw,
  BrainCircuit,
  Search,
  Sun,
  Moon,
  CheckCheck
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import SearchModal from './SearchModal';
import FeedbackModal from './FeedbackModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  category?: string;
  read_status: boolean;
  created_at: string;
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Executive Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, color: 'primary' },
  { path: '/upload', label: 'Data Upload', shortLabel: 'Upload', icon: FolderUp, color: 'accent' },
  { path: '/planner', label: 'Future Financial Planner', shortLabel: 'Planner', icon: Target, color: 'blue' },
  { path: '/assistant', label: 'AI Financial Advisor', shortLabel: 'Advisor', icon: MessageSquare, color: 'primary' },
  { path: '/reports', label: 'Financial Reports & Analytics', shortLabel: 'Reports', icon: FileText, color: 'accent' },
];

const ADMIN_ITEMS = [
  { path: '/admin', label: 'Admin Panel', shortLabel: 'Admin', icon: ShieldAlert },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  
  // Notification Filtering & Search
  const [notifSearch, setNotifSearch] = useState('');
  const [activeNotifCat, setActiveNotifCat] = useState<string>('All');
  
  const notifRef = React.useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read_status).length;

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/finance/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setNotifications(d);
        } else if (d?.data && Array.isArray(d.data)) {
          setNotifications(d.data);
        }
      })
      .catch(() => {});
  }, [token]);

  // Click Outside & ESC Key listener for Notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowNotifs(false);
      }
    }

    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifs]);

  const markRead = () => {
    fetch(`${API}/finance/notifications/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => setNotifications(prev => prev.map(n => ({ ...n, read_status: true }))));
  };

  const dismissNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/finance/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read_status) {
      fetch(`${API}/finance/notifications/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read_status: true } : item));
    }

    const tLower = n.title.toLowerCase();
    setShowNotifs(false);
    
    if (tLower.includes('chat') || tLower.includes('advisor') || tLower.includes('ai')) {
      navigate('/assistant');
    } else if (tLower.includes('upload') || tLower.includes('dataset') || tLower.includes('csv')) {
      navigate('/upload');
    } else if (tLower.includes('report') || tLower.includes('pdf') || tLower.includes('excel')) {
      navigate('/reports');
    } else if (tLower.includes('plan') || tLower.includes('retirement') || tLower.includes('goal')) {
      navigate('/planner');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const getCurrentTitle = () => {
    const item = [...NAV_ITEMS, ...ADMIN_ITEMS].find(i => i.path === location.pathname);
    if (item) return item.label;
    if (location.pathname === '/profile') return 'User Financial Profile';
    if (location.pathname === '/settings') return 'Account Settings';
    return 'Finora AI Workspace';
  };

  // Filtered Notification List
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = !notifSearch.trim() || 
      n.title.toLowerCase().includes(notifSearch.toLowerCase()) || 
      n.message.toLowerCase().includes(notifSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeNotifCat === 'Unread') return !n.read_status;
    if (activeNotifCat === 'AI') return n.title.toLowerCase().includes('ai') || n.title.toLowerCase().includes('advisor');
    if (activeNotifCat === 'Dataset') return n.title.toLowerCase().includes('dataset') || n.title.toLowerCase().includes('upload');
    if (activeNotifCat === 'Prediction') return n.title.toLowerCase().includes('predict') || n.title.toLowerCase().includes('saving') || n.title.toLowerCase().includes('health');
    if (activeNotifCat === 'Reports') return n.title.toLowerCase().includes('report') || n.title.toLowerCase().includes('pdf') || n.title.toLowerCase().includes('excel');

    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-secondary)] flex font-sans relative">
      {/* Background glow blobs */}
      <div className="glow-blob animate-blob-drift" style={{ position: 'fixed', width: '600px', height: '600px', top: '-15rem', left: '-15rem', backgroundColor: 'var(--primary)', borderRadius: '9999px', filter: 'blur(160px)', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} />
      <div className="glow-blob animate-blob-drift" style={{ position: 'fixed', width: '500px', height: '500px', bottom: '-10rem', right: '-10rem', backgroundColor: 'var(--secondary)', borderRadius: '9999px', filter: 'blur(160px)', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} />

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Full Height Sticky Sidebar Navigation */}
      <aside 
        className={`fixed md:sticky top-0 min-h-screen h-screen z-40 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl transition-all duration-300 flex-none ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo / Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-subtle)] flex-none">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg flex-none hover:scale-105 transition-transform">
              <img src="/logo.png" alt="Finora AI" className="w-full h-full object-cover block" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="font-display font-black text-lg text-[var(--text-primary)] tracking-tight block">
                  Finora<span className="text-[var(--primary-light)]">.AI</span>
                </span>
                <span className="text-[9px] text-[var(--text-dim)] font-medium tracking-widest block uppercase">
                  Finance Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Button */}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-glass)] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-none">
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2">
              Main Menu
            </p>
          )}

          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative ${
                  isActive 
                    ? 'bg-[var(--primary)] text-white border border-[var(--primary)]/40 shadow-md' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass-hover)] border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 flex-none ${isActive ? 'text-white' : 'group-hover:text-[var(--text-primary)]'}`} />
                {!collapsed && (
                  <span className="truncate tracking-wide font-semibold">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="w-2 h-2 rounded-full bg-white ml-auto shadow-sm" />
                )}
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <>
              <div className="my-4 border-t border-[var(--border-subtle)]" />
              {!collapsed && (
                <p className="px-3 text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">
                  Administration
                </p>
              )}
              {ADMIN_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                      isActive 
                        ? 'bg-rose-600 text-white border border-rose-500 shadow-md' 
                        : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-none" />
                    {!collapsed && <span className="truncate font-semibold">{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-[var(--border-subtle)] flex-none mt-auto sticky bottom-0 bg-[var(--bg-secondary)] z-20">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            {!collapsed && (
              <Link to="/profile" className="flex items-center gap-2.5 overflow-hidden flex-1 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-bold shadow-md flex-none group-hover:scale-105 transition-transform">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate font-display group-hover:text-white">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[10px] text-[var(--text-dim)] truncate">
                    {user?.email || 'user@finora.ai'}
                  </p>
                </div>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-[var(--text-dim)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-none"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 flex-none h-16 border-b border-[var(--border-subtle)] backdrop-blur-xl flex items-center px-3 sm:px-6 gap-2 sm:gap-4 justify-between bg-[var(--bg-secondary)]/90">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button 
              onClick={() => setMobileOpen(true)} 
              className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-glass)] transition-colors flex-none"
            >
              <Menu className="w-5 h-5" />
            </button>

            {collapsed && (
              <button 
                onClick={() => setCollapsed(false)} 
                className="hidden md:flex p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-glass)] transition-colors flex-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-wide font-display truncate">
                {getCurrentTitle()}
              </p>
              <p className="text-[9px] text-[var(--text-dim)] font-medium hidden sm:flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[var(--primary-light)]" />
                Powered by Finora AI Engine
              </p>
            </div>
          </div>

          {/* Quick Actions Header Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Feedback Button - Available for authenticated users */}
            {user && (
              <button 
                onClick={() => setIsFeedbackOpen(true)}
                className="p-2.5 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[var(--text-dim)] hover:text-white hover:border-[var(--primary)]/40 hover:bg-[var(--primary-subtle)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group"
                title="Share Your Feedback"
              >
                <MessageSquare className="w-4 h-4 text-[var(--primary-light)] group-hover:scale-110 transition-transform flex-none" />
                <span className="hidden sm:inline-block text-xs font-bold text-[var(--text-muted)] group-hover:text-white">Feedback</span>
              </button>
            )}

            {/* Command Palette Search Button (Ctrl + K) */}
            <button 
              id="search-modal-trigger"
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[var(--text-dim)] hover:text-white hover:border-[var(--border-hover)] transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
              title="Search Finora AI (Ctrl + K)"
            >
              <Search className="w-4 h-4 text-[var(--text-dim)] group-hover:text-white transition-colors" />
              <span className="hidden md:inline-block text-xs text-[var(--text-muted)] font-medium">Finora Search</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-dim)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded">
                Ctrl K
              </kbd>
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-hover)] transition-all flex items-center justify-center cursor-pointer shadow-md"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Notifications Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) markRead(); }}
                className={`relative p-2 rounded-xl border transition-all ${
                  showNotifs 
                    ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/30 text-white' 
                    : 'bg-[var(--surface-glass)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary)] text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_var(--primary-glow)]">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            </div>

            {/* Profile Avatar */}
            <Link 
              to="/profile" 
              className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-bold shadow-md hover:scale-105 hover:shadow-[var(--shadow-glow-primary)] transition-all"
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Link>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 relative z-10">
          {children}
        </main>
      </div>

      {/* REACT PORTAL NOTIFICATION PANEL (z-[999999] floating overlay on document.body) */}
      {showNotifs && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[999990] flex items-start justify-end pointer-events-auto">
            {/* Subtle Backdrop Overlay to capture click outside */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifs(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
            />

            {/* Portal Floating Panel */}
            <motion.div
              ref={notifRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="fixed right-6 top-16 mt-2 w-85 sm:w-96 glass-card p-4 z-[999999] overflow-hidden shadow-2xl border border-[var(--border-default)] rounded-2xl bg-[var(--bg-secondary)]/95 backdrop-blur-2xl"
            >
              {/* Sticky Header */}
              <div className="pb-3 border-b border-[var(--border-subtle)] mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">Notifications</p>
                    {unread > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--primary-subtle)] text-[var(--primary-light)] border border-[var(--primary)]/30">
                        {unread} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button
                        onClick={markRead}
                        className="text-[10px] text-[var(--primary-light)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3 h-3" /> Read All
                      </button>
                    )}
                    <button 
                      onClick={() => setShowNotifs(false)} 
                      className="text-[var(--text-dim)] hover:text-white text-xs transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Header Search Filter */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[var(--text-dim)] pointer-events-none">
                    <Search className="w-3 h-3" />
                  </span>
                  <input
                    type="text"
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    placeholder="Search notifications..."
                    className="w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)]/50"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[9px] font-bold">
                  {['All', 'Unread', 'AI', 'Dataset', 'Prediction', 'Reports'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveNotifCat(cat)}
                      className={`px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                        activeNotifCat === cat
                          ? 'bg-[var(--primary-subtle)] text-white border-[var(--primary)]/40'
                          : 'bg-[var(--surface-glass)] text-[var(--text-dim)] border-[var(--border-subtle)] hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Notification List */}
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filteredNotifications.length === 0 ? (
                  <p className="text-center text-[var(--text-dim)] text-xs py-8">No notifications matching filters</p>
                ) : (
                  filteredNotifications.map(n => {
                    const titleLower = n.title.toLowerCase();
                    let icon = <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
                    let colorClass = 'border-amber-500/20 bg-amber-500/5';
                    let categoryBadge = n.category || 'System';

                    if (titleLower.includes('create') || titleLower.includes('account')) {
                      icon = <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
                      colorClass = 'border-amber-500/20 bg-amber-500/5';
                      categoryBadge = 'Account';
                    } else if (titleLower.includes('predict') || titleLower.includes('saving') || titleLower.includes('health')) {
                      icon = <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />;
                      colorClass = 'border-emerald-500/20 bg-emerald-500/5';
                      categoryBadge = 'Prediction';
                    } else if (titleLower.includes('upload') || titleLower.includes('dataset')) {
                      icon = <FolderUp className="w-3.5 h-3.5 text-purple-400" />;
                      colorClass = 'border-purple-500/20 bg-purple-500/5';
                      categoryBadge = 'Dataset';
                    } else if (titleLower.includes('update') || titleLower.includes('profile')) {
                      icon = <RefreshCw className="w-3.5 h-3.5 text-blue-400" />;
                      colorClass = 'border-blue-500/20 bg-blue-500/5';
                      categoryBadge = 'Profile';
                    } else {
                      icon = <FileText className="w-3.5 h-3.5 text-indigo-400" />;
                      colorClass = 'border-indigo-500/20 bg-indigo-500/5';
                      categoryBadge = 'Reports';
                    }

                    return (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 rounded-xl border transition-all ${colorClass} flex flex-col gap-2 relative group hover:bg-[var(--surface-glass)]/50 cursor-pointer ${
                          !n.read_status ? 'ring-1 ring-[var(--primary)]/40 shadow-sm' : 'opacity-85'
                        }`}
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className="p-1.5 rounded-lg bg-[var(--surface-glass)] flex-none mt-0.5">
                            {icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <p className="text-xs font-bold text-[var(--text-primary)] leading-tight font-display">{n.title}</p>
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[var(--surface-subtle)] text-[var(--text-dim)] border border-[var(--border-subtle)]">
                                {categoryBadge}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] leading-normal">{n.message}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[8px] text-[var(--text-dim)] font-medium">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {!n.read_status && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-light)] animate-pulse" />
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => dismissNotif(n.id, e)}
                          className="absolute top-2 right-2 p-1 text-[var(--text-dim)] hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Dismiss notification"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Global Command Palette Search Modal */}
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />

      {/* Global Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </div>
  );
}
