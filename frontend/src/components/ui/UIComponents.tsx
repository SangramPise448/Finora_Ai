import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/* ─── Loading Screen (Full-page branded) ─── */
export const LoadingScreen: React.FC<{ message?: string }> = ({ 
  message = 'Initializing workspace...' 
}) => (
  <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center relative overflow-hidden">
    {/* Background blobs */}
    <div className="glow-blob w-[400px] h-[400px] bg-[var(--primary)] opacity-10 -top-32 -left-20 animate-blob-drift" />
    <div className="glow-blob w-[300px] h-[300px] bg-[var(--blue-glow)] opacity-5 bottom-20 right-10 animate-blob-drift" />

    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6 relative z-10"
    >
      {/* Spinning ring */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--border-subtle)]" />
        <div className="absolute inset-0 rounded-full border-t-2 border-[var(--primary)] animate-spin" />
        <div className="absolute inset-1 rounded-full border-t-2 border-[var(--blue-glow)] opacity-50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[var(--primary-subtle)] to-[var(--secondary-subtle)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[var(--primary-light)]" />
        </div>
      </div>

      {/* Branding */}
      <div className="text-center">
        <p className="text-[var(--text-primary)] font-extrabold tracking-wider text-lg font-display">
          FINORA <span className="text-[var(--primary-light)]">AI</span>
        </p>
        <p className="text-[var(--text-dim)] text-xs mt-1 font-medium">{message}</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  </div>
);

/* ─── AI Insight Panel ─── */
interface AIInsightPanelProps {
  title?: string;
  insight: string;
  type?: 'recommendation' | 'warning' | 'info';
  metric?: { label: string; value: string };
  className?: string;
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  title = 'AI Advisory Insight',
  insight,
  type = 'recommendation',
  metric,
  className = '',
}) => {
  const typeConfig = {
    recommendation: {
      border: 'border-[var(--primary)]/20',
      bg: 'from-[rgba(124,58,237,0.08)] to-[rgba(79,70,229,0.04)]',
      icon: 'text-[var(--primary-light)]',
      badge: 'bg-[var(--primary-subtle)] text-[var(--primary-light)]',
    },
    warning: {
      border: 'border-[var(--warning)]/20',
      bg: 'from-[rgba(245,158,11,0.06)] to-transparent',
      icon: 'text-yellow-400',
      badge: 'bg-[var(--warning-subtle)] text-yellow-300',
    },
    info: {
      border: 'border-[var(--blue-glow)]/20',
      bg: 'from-[rgba(56,189,248,0.06)] to-transparent',
      icon: 'text-[var(--blue-glow)]',
      badge: 'bg-[var(--blue-glow-subtle)] text-[var(--blue-glow-light)]',
    },
  };

  const cfg = typeConfig[type];

  return (
    <div className={`glass-ai p-6 bg-gradient-to-br ${cfg.bg} ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-xl ${cfg.badge} flex items-center justify-center`}>
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`text-xs font-bold ${cfg.icon} uppercase tracking-wider`}>{title}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-[9px] text-[var(--text-dim)] font-medium uppercase tracking-wider">Live Intelligence</span>
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-medium">
        {insight}
      </p>

      {metric && (
        <div className="mt-5 p-4 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border-subtle)] flex items-center justify-between text-xs">
          <span className="text-[var(--text-dim)] font-semibold uppercase tracking-wider">{metric.label}</span>
          <span className="font-bold text-[var(--text-primary)] font-mono">{metric.value}</span>
        </div>
      )}
    </div>
  );
};

/* ─── Floating Shapes Background ─── */
export const FloatingShapes: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
    {/* Geometric shapes */}
    <div className="floating-shape circle w-24 h-24 top-[15%] left-[10%] animate-float" />
    <div className="floating-shape square w-16 h-16 top-[40%] right-[15%] animate-float-slow" />
    <div className="floating-shape circle w-12 h-12 bottom-[20%] left-[25%] animate-float-reverse" />
    <div className="floating-shape square w-20 h-20 top-[60%] left-[60%] animate-float" style={{ animationDelay: '2s' }} />
    <div className="floating-shape circle w-8 h-8 top-[25%] right-[30%] animate-float-slow" style={{ animationDelay: '1s' }} />
    <div className="floating-shape square w-10 h-10 bottom-[35%] right-[20%] animate-float-reverse" style={{ animationDelay: '3s' }} />

    {/* Neural grid overlay */}
    <div className="neural-grid" />

    {/* Data stream dots */}
    <div className="data-stream-container">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="data-dot"
          style={{
            '--left': `${10 + i * 12}%`,
            '--delay': `${i * 0.6}s`,
            '--duration': `${3 + Math.random() * 3}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  </div>
);

/* ─── Notification Toast ─── */
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', visible, onClose }) => {
  const typeStyles = {
    success: 'border-[var(--accent)]/30 bg-[var(--accent-subtle)]',
    error: 'border-[var(--danger)]/30 bg-[var(--danger-subtle)]',
    info: 'border-[var(--primary)]/30 bg-[var(--primary-subtle)]',
  };

  const textColor = {
    success: 'text-[var(--accent)]',
    error: 'text-[var(--danger)]',
    info: 'text-[var(--primary-light)]',
  };

  if (!visible) return null;

  return (
    <div className={`${visible ? 'animate-toast-in' : 'animate-toast-out'} glass-card p-4 pr-10 border ${typeStyles[type]} min-w-[280px] max-w-sm relative`}>
      <p className={`text-xs font-semibold ${textColor[type]}`}>{message}</p>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors text-xs"
      >
        ✕
      </button>
    </div>
  );
};

/* ─── Section Header ─── */
interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ badge, title, subtitle, className = '' }) => (
  <div className={`text-center mb-16 ${className}`}>
    {badge && (
      <div className="inline-flex items-center gap-1.5 bg-[var(--primary-subtle)] border border-[var(--primary)]/20 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-light)] mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        {badge}
      </div>
    )}
    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4 font-display">
      {title}
    </h2>
    {subtitle && (
      <p className="text-[var(--text-secondary)] text-sm max-w-xl mx-auto leading-relaxed">
        {subtitle}
      </p>
    )}
  </div>
);
