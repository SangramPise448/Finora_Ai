import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive' | 'ai' | 'gradient-border';
  hover?: boolean;
  glow?: 'primary' | 'accent' | 'blue' | 'none';
  delay?: number;
  animate?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hover: _hover = true,
  glow = 'none',
  delay = 0,
  animate = true,
}) => {
  const baseClasses = {
    default: 'glass-card',
    interactive: 'glass-card-interactive',
    ai: 'glass-ai',
    'gradient-border': 'glass-card glass-gradient-border',
  };

  const glowClasses = {
    none: '',
    primary: 'hover:shadow-neon-primary',
    accent: 'hover:shadow-neon-accent',
    blue: 'hover:shadow-neon-glow',
  };

  const card = (
    <div className={`${baseClasses[variant]} ${glowClasses[glow]} ${className}`}>
      {children}
    </div>
  );

  if (!animate) return card;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {card}
    </motion.div>
  );
};

/* ─── Stat Card (KPI) ─── */
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  color?: 'primary' | 'accent' | 'blue' | 'danger' | 'warning';
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, subtitle, icon, trend, color = 'primary', delay = 0
}) => {
  const colorMap = {
    primary: { bg: 'bg-[var(--primary-subtle)]', text: 'text-[var(--primary-light)]', icon: 'text-[var(--primary)]' },
    accent: { bg: 'bg-[var(--accent-subtle)]', text: 'text-[var(--accent-light)]', icon: 'text-[var(--accent)]' },
    blue: { bg: 'bg-[var(--blue-glow-subtle)]', text: 'text-[var(--blue-glow-light)]', icon: 'text-[var(--blue-glow)]' },
    danger: { bg: 'bg-[var(--danger-subtle)]', text: 'text-[var(--danger-light)]', icon: 'text-[var(--danger)]' },
    warning: { bg: 'bg-[var(--warning-subtle)]', text: 'text-yellow-300', icon: 'text-[var(--warning)]' },
  };

  const c = colorMap[color];

  return (
    <GlassCard className="p-6" delay={delay}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">
            {label}
          </span>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-white font-display truncate">
            {value}
          </h3>
          {subtitle && (
            <span className={`text-[10px] font-semibold ${c.text}`}>{subtitle}</span>
          )}
          {trend && (
            <div className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${trend.positive ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 ${c.bg} rounded-2xl ${c.icon} flex-none`}>
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
