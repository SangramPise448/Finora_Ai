import React from 'react';

/* ─── Single Skeleton Line ─── */
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'title' | 'circle' | 'card' | 'custom';
  width?: string;
  height?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
}) => {
  const variantClasses = {
    text: 'skeleton skeleton-text',
    title: 'skeleton skeleton-title',
    circle: 'skeleton skeleton-circle',
    card: 'skeleton skeleton-card',
    custom: 'skeleton',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${variantClasses[variant]} ${className}`}
          style={{ width, height }}
        />
      ))}
    </>
  );
};

/* ─── KPI Card Skeleton ─── */
export const StatCardSkeleton: React.FC = () => (
  <div className="glass-card p-6 space-y-3">
    <Skeleton variant="text" width="40%" />
    <Skeleton variant="custom" height="2rem" width="70%" />
    <Skeleton variant="text" width="55%" />
  </div>
);

/* ─── Chart Skeleton ─── */
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '16rem' }) => (
  <div className="glass-card p-6 space-y-4">
    <Skeleton variant="text" width="30%" />
    <Skeleton variant="custom" height={height} className="rounded-xl" />
  </div>
);

/* ─── Table Skeleton ─── */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="glass-card overflow-hidden">
    <div className="p-5 border-b border-[var(--border-subtle)]">
      <Skeleton variant="text" width="25%" />
    </div>
    <div className="divide-y divide-[var(--border-subtle)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex gap-4">
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="15%" />
          <Skeleton variant="text" width="15%" />
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="10%" />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Page Skeleton ─── */
export const PageSkeleton: React.FC = () => (
  <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
    <div className="space-y-2">
      <Skeleton variant="title" />
      <Skeleton variant="text" width="40%" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);
