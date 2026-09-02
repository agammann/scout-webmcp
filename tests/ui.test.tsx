import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

import { ScoutApp } from '@/components/scout-app';

describe('Scout interface', () => {
  it('keeps the synthetic boundary visible and searches normalized cards', async () => {
    const user = userEvent.setup();
    render(<ScoutApp />);

    expect(screen.getByText(/Every listing, sale, seller, and marketplace/).textContent).toMatch(/fictional synthetic/);
    expect(
      screen.getByRole('link', { name: 'Watch Scout demo video' }).getAttribute('href'),
    ).toBe('https://youtu.be/akGIr6avM3g');
    const input = screen.getByTestId('search-input');
    await user.clear(input);
    await user.type(input, 'Volt Lynx PSA 10');
    await user.click(screen.getByTestId('search-submit'));

    expect((await screen.findAllByText('Volt Lynx')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('PSA 10').length).toBeGreaterThan(0);
  });
});
