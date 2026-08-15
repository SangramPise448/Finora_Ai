/**
 * Shared Chart Theme Utility for Finora AI
 * Centralized theme-aware styling props for all Recharts charts.
 */

export interface ChartThemeColors {
  grid: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  income: string;
  expense: string;
  savings: string;
  investment: string;
  balance: string;
  health: string;
  riskLow: string;
  riskMod: string;
  riskHigh: string;
}

export const getChartThemeColors = (): ChartThemeColors => {
  return {
    grid: 'var(--chart-grid)',
    text: 'var(--chart-text)',
    tooltipBg: 'var(--chart-tooltip-bg)',
    tooltipBorder: 'var(--chart-tooltip-border)',
    tooltipText: 'var(--chart-tooltip-text)',
    income: 'var(--fin-income)',
    expense: 'var(--fin-expense)',
    savings: 'var(--fin-savings)',
    investment: 'var(--fin-investment)',
    balance: 'var(--fin-balance)',
    health: 'var(--fin-health)',
    riskLow: 'var(--fin-risk-low)',
    riskMod: 'var(--fin-risk-mod)',
    riskHigh: 'var(--fin-risk-high)',
  };
};

export const chartGridProps = {
  stroke: 'var(--chart-grid)',
  strokeDasharray: '3 3',
};

export const chartXAxisProps = {
  stroke: 'var(--text-dim)',
  tick: { fill: 'var(--chart-text)', fontSize: 11 },
  tickLine: false,
};

export const chartYAxisProps = {
  stroke: 'var(--text-dim)',
  tick: { fill: 'var(--chart-text)', fontSize: 11 },
  tickLine: false,
};

export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'var(--chart-tooltip-bg)',
    borderColor: 'var(--chart-tooltip-border)',
    color: 'var(--chart-tooltip-text)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-md)',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: 600,
  },
  itemStyle: { color: 'var(--chart-tooltip-text)' },
  labelStyle: { color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' },
};

export const chartLegendProps = {
  wrapperStyle: {
    color: 'var(--text-primary)',
    fontSize: '12px',
    paddingTop: '10px',
  },
};
