import * as React from 'react';
import { ResponsiveContainer, Tooltip } from 'recharts';

import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

function ChartContainer({
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  children: React.ReactNode;
  config: ChartConfig;
}) {
  const colors = Object.values(config)
    .map((entry) => entry.color)
    .filter((color): color is string => Boolean(color));
  const style = {
    ...props.style,
    ...(colors[0] ? { '--color-total': colors[0] } : {}),
  } as React.CSSProperties;

  return (
    <div
      data-slot="chart"
      className={cn('flex min-h-[200px] w-full justify-center text-xs', className)}
      {...props}
      style={style}
    >
      <ResponsiveContainer initialDimension={{ width: 640, height: 240 }}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

type TooltipDatum = {
  name?: string | number;
  value?: string | number;
  color?: string;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: readonly TooltipDatum[];
  label?: React.ReactNode;
  formatter?: (value: string | number, name: string | number) => React.ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((item, index) => (
        <div key={`${String(item.name)}-${index}`} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{String(item.name ?? 'Sale total')}</span>
          {formatter && item.value !== undefined
            ? formatter(item.value, item.name ?? 'value')
            : <span className="font-mono font-medium">{String(item.value ?? '—')}</span>}
        </div>
      ))}
    </div>
  );
}

const ChartTooltip = Tooltip;

export { ChartContainer, ChartTooltip, ChartTooltipContent };

