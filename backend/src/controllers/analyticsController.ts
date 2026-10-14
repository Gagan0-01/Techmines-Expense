import { Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Account } from '../models/Account';
import { Budget } from '../models/Budget';
import { AuthRequest } from '../middleware/auth';

const FX_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.085,
  GBP: 1.295,
  JPY: 0.0065,
  CHF: 1.13,
  CAD: 0.73,
  AUD: 0.66,
  INR: 0.0119,
  SGD: 0.76,
};

export const getCashFlowForecast = async (req: AuthRequest, res: Response): Promise<void> => {
  // Aggregate completed transactions from the last 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const transactions = await Transaction.find({
    status: 'COMPLETED',
    valueDate: { $gte: sixtyDaysAgo },
  });

  let totalInflowCents = 0;
  let totalOutflowCents = 0;

  for (const tx of transactions) {
    if (tx.type === 'INFLOW' || tx.type === 'INTEREST_INCOME') {
      totalInflowCents += tx.amountCents;
    } else if (
      tx.type === 'OUTFLOW' ||
      tx.type === 'BANK_FEE' ||
      tx.type === 'TAX_SETTLEMENT'
    ) {
      totalOutflowCents += tx.amountCents + (tx.feeCents || 0);
    }
  }

  // Daily run rate
  const avgDailyInflowCents = Math.round(totalInflowCents / 60);
  const avgDailyOutflowCents = Math.round(totalOutflowCents / 60);

  // Current consolidated balance in USD
  const accounts = await Account.find({ status: 'ACTIVE' });
  let currentBalanceUsdCents = accounts.reduce((acc, a) => {
    const rate = FX_RATES[a.currency] || 1.0;
    return acc + Math.round(a.balanceCents * rate);
  }, 0);

  // Generate 30-day projection points
  const projection = [];
  let simulatedBalance = currentBalanceUsdCents;

  for (let i = 1; i <= 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    // Apply slight cyclical variation (e.g., weekend dips, payroll spikes)
    const isPayrollDay = date.getDate() === 15 || date.getDate() === 30;
    const dayOutflow = isPayrollDay ? avgDailyOutflowCents * 3.5 : avgDailyOutflowCents;
    const dayInflow = avgDailyInflowCents;

    simulatedBalance += dayInflow - dayOutflow;

    projection.push({
      day: i,
      date: date.toISOString().split('T')[0],
      projectedInflowCents: dayInflow,
      projectedOutflowCents: dayOutflow,
      projectedBalanceUsdCents: simulatedBalance,
    });
  }

  res.json({
    success: true,
    data: {
      currentBalanceUsdCents,
      avgDailyInflowCents,
      avgDailyOutflowCents,
      projection,
    },
  });
};

export const getFxExposure = async (req: AuthRequest, res: Response): Promise<void> => {
  const accounts = await Account.find({ status: { $ne: 'CLOSED' } });

  let totalConsolidatedUsd = 0;
  const currencyHoldings: Record<
    string,
    {
      currency: string;
      balanceCents: number;
      rateToUsd: number;
      usdValueCents: number;
      portfolioSharePercent: number;
      var95Cents: number; // 95% 1-day Value at Risk (simulated based on volatility)
    }
  > = {};

  const VOLATILITY: Record<string, number> = {
    USD: 0.0,
    EUR: 0.007,
    GBP: 0.009,
    JPY: 0.012,
    CHF: 0.006,
    CAD: 0.008,
    AUD: 0.011,
    INR: 0.005,
    SGD: 0.004,
  };

  for (const acc of accounts) {
    const rate = FX_RATES[acc.currency] || 1.0;
    const usdVal = Math.round(acc.balanceCents * rate);
    totalConsolidatedUsd += usdVal;

    if (!currencyHoldings[acc.currency]) {
      currencyHoldings[acc.currency] = {
        currency: acc.currency,
        balanceCents: 0,
        rateToUsd: rate,
        usdValueCents: 0,
        portfolioSharePercent: 0,
        var95Cents: 0,
      };
    }
    currencyHoldings[acc.currency].balanceCents += acc.balanceCents;
    currencyHoldings[acc.currency].usdValueCents += usdVal;
  }

  // Calculate percentages and VaR
  for (const curr of Object.values(currencyHoldings)) {
    curr.portfolioSharePercent =
      totalConsolidatedUsd > 0
        ? parseFloat(((curr.usdValueCents / totalConsolidatedUsd) * 100).toFixed(2))
        : 0;

    const vol = VOLATILITY[curr.currency] || 0.008;
    // 95% VaR: 1.645 * volatility * position
    curr.var95Cents = Math.round(curr.usdValueCents * vol * 1.645);
  }

  res.json({
    success: true,
    data: {
      totalConsolidatedUsdCents: totalConsolidatedUsd,
      holdings: Object.values(currencyHoldings),
    },
  });
};

export const getBudgetVariance = async (req: AuthRequest, res: Response): Promise<void> => {
  const budgets = await Budget.find({ status: 'ACTIVE' });

  // Map each budget item with actual spend and variance
  const varianceReport = budgets.map((b) => {
    const varianceCents = b.allocatedCents - b.spentCents;
    const utilizationPercent =
      b.allocatedCents > 0
        ? parseFloat(((b.spentCents / b.allocatedCents) * 100).toFixed(1))
        : 0;
    const isExceeded = b.spentCents > b.allocatedCents;
    const isNearLimit = utilizationPercent >= b.alertThresholdPercent;

    return {
      id: b._id,
      department: b.department,
      category: b.category,
      period: b.period,
      allocatedCents: b.allocatedCents,
      spentCents: b.spentCents,
      varianceCents,
      utilizationPercent,
      isExceeded,
      isNearLimit,
      currency: b.currency,
    };
  });

  res.json({
    success: true,
    data: varianceReport,
  });
};
