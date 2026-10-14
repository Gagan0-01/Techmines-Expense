import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KpiCards } from '../components/KpiCards';
import { TreasurySummary } from '../types';

describe('KpiCards Component', () => {
  const mockSummary: TreasurySummary = {
    totalConsolidatedUsdCents: 5420000000,
    activeAccountsCount: 8,
    currencyBreakdown: {},
    typeBreakdown: { OPERATING: 4, PAYROLL: 2, INVESTMENT: 2 },
    entityBreakdown: { 'Acme Global Holdings LLC': 8 },
  };

  const mockStats = {
    totalInflowCents: 12500000,
    totalOutflowCents: 4500000,
    netFlowCents: 8000000,
  };

  it('renders consolidated treasury balance correctly', () => {
    render(
      <KpiCards
        summary={mockSummary}
        stats={mockStats}
        pendingApprovalsCount={3}
        onViewPending={vi.fn()}
      />
    );

    expect(screen.getByText('Consolidated Treasury')).toBeInTheDocument();
    expect(screen.getByText('$54,200,000.00')).toBeInTheDocument();
  });

  it('renders pending dual-control approvals and handles click', () => {
    const handleViewPending = vi.fn();
    render(
      <KpiCards
        summary={mockSummary}
        stats={mockStats}
        pendingApprovalsCount={3}
        onViewPending={handleViewPending}
      />
    );

    expect(screen.getByText('Dual-Control Pending:')).toBeInTheDocument();
    expect(screen.getByText(/3 Action Required/i)).toBeInTheDocument();

    const viewQueueBtn = screen.getByText(/3 Action Required/i);
    fireEvent.click(viewQueueBtn);
    expect(handleViewPending).toHaveBeenCalledTimes(1);
  });
});
