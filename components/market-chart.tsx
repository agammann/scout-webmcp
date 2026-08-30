import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ListingAssessment } from '@/src/domain/types';

export function MarketChart({ assessment }: { assessment: ListingAssessment }) {
  const data = [...assessment.comparableSales].reverse().map((sale) => ({
    date: new Date(sale.soldAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: (sale.price.amountCents + (sale.shipping?.amountCents ?? 0)) / 100,
  }));
  return (
    <ChartContainer
      config={{ total: { label: 'Sale total', color: '#1d7557' } }}
      className="aspect-auto h-[240px] w-full"
    >
      <LineChart data={data} margin={{ left: 8, right: 12, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis width={48} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-mono font-medium">${Number(value).toFixed(2)}</span>
              )}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--color-total)' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

