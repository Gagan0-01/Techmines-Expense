import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { LedgerEntry } from '../models/LedgerEntry';
import { AuditLog } from '../models/AuditLog';
import { Budget } from '../models/Budget';
import { toCents } from '../utils/currency';

async function seed() {
  console.log('[Seed] Connecting to MongoDB at', ENV.MONGO_URI);
  await mongoose.connect(ENV.MONGO_URI);

  console.log('[Seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Account.deleteMany({}),
    Transaction.deleteMany({}),
    LedgerEntry.deleteMany({}),
    AuditLog.deleteMany({}),
    Budget.deleteMany({}),
  ]);

  console.log('[Seed] Creating Enterprise Users...');
  const users = await User.create([
    {
      name: 'Victoria Vance',
      email: 'treasurer@acme-corp.com',
      password: 'password123',
      role: 'TREASURER',
      department: 'Global Treasury Executive',
    },
    {
      name: 'Marcus Sterling',
      email: 'manager@acme-corp.com',
      password: 'password123',
      role: 'FINANCE_MANAGER',
      department: 'Corporate Finance & Liquidity',
    },
    {
      name: 'Elena Rostova',
      email: 'auditor@acme-corp.com',
      password: 'password123',
      role: 'AUDITOR',
      department: 'Financial Compliance & SOX',
    },
    {
      name: 'David Chen',
      email: 'operator@acme-corp.com',
      password: 'password123',
      role: 'OPERATOR',
      department: 'Cash & Wire Operations',
    },
  ]);

  const treasurer = users[0];
  const manager = users[1];
  const auditor = users[2];
  const operator = users[3];

  console.log('[Seed] Creating Treasury Cash & Investment Accounts...');
  const accounts = await Account.create([
    {
      name: 'JPMorgan Chase - Main Operating USD',
      accountNumber: 'US-JPMC-98842100',
      accountType: 'OPERATING',
      currency: 'USD',
      balanceCents: toCents('14250890.50', 'USD'),
      availableBalanceCents: toCents('14250890.50', 'USD'),
      institution: 'JPMorgan Chase & Co.',
      routingNumber: '021000021',
      swiftBic: 'CHASUS33XXX',
      entityName: 'Acme Global Holdings LLC',
      country: 'USA',
      isMainTreasury: true,
      status: 'ACTIVE',
      notes: 'Primary global treasury clearing account for North America operations.',
    },
    {
      name: 'HSBC London - European Cash Hub EUR',
      accountNumber: 'GB-HSBC-44120984',
      accountType: 'OPERATING',
      currency: 'EUR',
      balanceCents: toCents('9180450.00', 'EUR'),
      availableBalanceCents: toCents('9180450.00', 'EUR'),
      institution: 'HSBC Bank UK Plc',
      iban: 'GB29HBUK40127812345678',
      swiftBic: 'HBUKGB41XXX',
      entityName: 'Acme Europe BV',
      country: 'UK',
      isMainTreasury: false,
      status: 'ACTIVE',
      notes: 'Eurozone settlement & liquidity pooling hub.',
    },
    {
      name: 'Barclays UK - Commercial Sterling GBP',
      accountNumber: 'GB-BARC-77219033',
      accountType: 'OPERATING',
      currency: 'GBP',
      balanceCents: toCents('4650320.00', 'GBP'),
      availableBalanceCents: toCents('4650320.00', 'GBP'),
      institution: 'Barclays Bank PLC',
      iban: 'GB82BARC20000087654321',
      swiftBic: 'BARCGB22XXX',
      entityName: 'Acme UK Technologies Ltd',
      country: 'UK',
      isMainTreasury: false,
      status: 'ACTIVE',
      notes: 'UK operational payroll and vendor disbursements.',
    },
    {
      name: 'Goldman Sachs - US Treasury Liquidity Yield',
      accountNumber: 'US-GS-88200194',
      accountType: 'INVESTMENT',
      currency: 'USD',
      balanceCents: toCents('30000000.00', 'USD'),
      availableBalanceCents: toCents('30000000.00', 'USD'),
      institution: 'Goldman Sachs Asset Management',
      routingNumber: '122041235',
      entityName: 'Acme Global Holdings LLC',
      country: 'USA',
      isMainTreasury: false,
      status: 'ACTIVE',
      notes: 'High-yield short duration US government treasury bills sweep account yielding 5.15% APY.',
    },
    {
      name: 'MUFG Tokyo - APAC Yen Liquidity JPY',
      accountNumber: 'JP-MUFG-10928374',
      accountType: 'OPERATING',
      currency: 'JPY',
      balanceCents: toCents('1850000000', 'JPY'), // No decimals in JPY
      availableBalanceCents: toCents('1850000000', 'JPY'),
      institution: 'MUFG Bank Ltd',
      swiftBic: 'BOTKJPJTXXX',
      entityName: 'Acme Asia Pacific KK',
      country: 'Japan',
      isMainTreasury: false,
      status: 'ACTIVE',
      notes: 'Japan corporate treasury and vendor accounts.',
    },
    {
      name: 'DBS Singapore - ASEAN Clearing SGD',
      accountNumber: 'SG-DBS-87391823',
      accountType: 'CLEARING',
      currency: 'SGD',
      balanceCents: toCents('7240000.00', 'SGD'),
      availableBalanceCents: toCents('7240000.00', 'SGD'),
      institution: 'DBS Bank Ltd',
      swiftBic: 'DBSSSGSGXXX',
      entityName: 'Acme Singapore Pte Ltd',
      country: 'Singapore',
      isMainTreasury: false,
      status: 'ACTIVE',
      notes: 'South East Asia regional merchant collections & settlement.',
    },
    {
      name: 'Silicon Valley Bank / First Citizens - Payroll Sweep USD',
      accountNumber: 'US-SVB-55102938',
      accountType: 'PAYROLL',
      currency: 'USD',
      balanceCents: toCents('4200000.00', 'USD'),
      availableBalanceCents: toCents('4200000.00', 'USD'),
      institution: 'First Citizens Bank (SVB Division)',
      routingNumber: '121140399',
      entityName: 'Acme Global Holdings LLC',
      country: 'USA',
      isMainTreasury: false,
      status: 'ACTIVE',
      notes: 'Dedicated payroll funding account with automated replenishment.',
    },
    {
      name: 'UBS Zurich - Swiss Franc Reserve CHF',
      accountNumber: 'CH-UBS-33918200',
      accountType: 'TAX_RESERVE',
      currency: 'CHF',
      balanceCents: toCents('3850000.00', 'CHF'),
      availableBalanceCents: toCents('3850000.00', 'CHF'),
      institution: 'UBS Switzerland AG',
      iban: 'CH9300240240123456789',
      swiftBic: 'UBSWCHZH80A',
      entityName: 'Acme Switzerland Sarl',
      country: 'Switzerland',
      isMainTreasury: false,
      status: 'ACTIVE',
      notes: 'European statutory corporate tax reserve & FX hedging collateral.',
    },
  ]);

  const [usdMain, eurHub, gbpHub, gsYield, jpyHub, sgdHub, payrollAcc, chfTax] = accounts;

  console.log('[Seed] Creating Departmental Budgets...');
  await Budget.create([
    {
      department: 'Engineering & Technology',
      category: 'Cloud Infrastructure & Compute',
      period: '2026-FY',
      allocatedCents: toCents('2500000.00', 'USD'),
      spentCents: toCents('1840200.00', 'USD'),
      currency: 'USD',
      alertThresholdPercent: 80,
      notes: 'AWS, GCP, Datadog and Snowflake enterprise annual commits.',
    },
    {
      department: 'Corporate Operations',
      category: 'Global Facilities & Office Leases',
      period: '2026-FY',
      allocatedCents: toCents('1200000.00', 'USD'),
      spentCents: toCents('890000.00', 'USD'),
      currency: 'USD',
      alertThresholdPercent: 85,
      notes: 'New York, London, Singapore and Tokyo office leases.',
    },
    {
      department: 'Treasury & Finance',
      category: 'Banking Fees & Foreign Exchange Hedging',
      period: '2026-FY',
      allocatedCents: toCents('450000.00', 'USD'),
      spentCents: toCents('310450.00', 'USD'),
      currency: 'USD',
      alertThresholdPercent: 75,
      notes: 'SWIFT wire charges, FX forward contracts & credit facility commitment fees.',
    },
    {
      department: 'Legal & Tax Compliance',
      category: 'Statutory Corporate Taxes & Advisory',
      period: '2026-FY',
      allocatedCents: toCents('3800000.00', 'USD'),
      spentCents: toCents('2650000.00', 'USD'),
      currency: 'USD',
      alertThresholdPercent: 90,
      notes: 'Quarterly estimated corporate income tax filings and transfer pricing advisory.',
    },
    {
      department: 'Human Resources',
      category: 'Global Executive & Employee Payroll',
      period: '2026-FY',
      allocatedCents: toCents('18500000.00', 'USD'),
      spentCents: toCents('14120000.00', 'USD'),
      currency: 'USD',
      alertThresholdPercent: 85,
      notes: 'Consolidated worldwide payroll, pension matching and health benefits.',
    },
  ]);

  console.log('[Seed] Generating Comprehensive Treasury Transactions & Ledger Entries...');
  const txDefs = [
    {
      ref: 'TX-2026-0001',
      type: 'INFLOW',
      sourceAccount: usdMain,
      counterparty: 'Microsoft Enterprise Software Agreement',
      amount: '1250000.00',
      currency: 'USD',
      category: 'Enterprise Software Contracts',
      desc: 'Annual enterprise multi-seat platform license renewal',
      status: 'COMPLETED',
      daysAgo: 28,
    },
    {
      ref: 'TX-2026-0002',
      type: 'OUTFLOW',
      sourceAccount: usdMain,
      counterparty: 'Amazon Web Services Inc.',
      amount: '184500.00',
      currency: 'USD',
      category: 'Cloud Infrastructure & Compute',
      desc: 'Monthly cloud infrastructure, EC2 compute & S3 storage tier 1 invoice',
      fee: '25.00',
      status: 'COMPLETED',
      daysAgo: 26,
    },
    {
      ref: 'TX-2026-0003',
      type: 'INTERNAL_TRANSFER',
      sourceAccount: usdMain,
      destAccount: payrollAcc,
      counterparty: 'Acme Internal Payroll Sweep',
      amount: '850000.00',
      currency: 'USD',
      category: 'Internal Liquidity Sweep',
      desc: 'Bi-weekly automated payroll account replenishment sweep',
      status: 'COMPLETED',
      daysAgo: 25,
    },
    {
      ref: 'TX-2026-0004',
      type: 'INFLOW',
      sourceAccount: eurHub,
      counterparty: 'Siemens AG Financial Services',
      amount: '680000.00',
      currency: 'EUR',
      category: 'Customer Collections',
      desc: 'Q3 Enterprise ERP integration milestone payment',
      status: 'COMPLETED',
      daysAgo: 22,
    },
    {
      ref: 'TX-2026-0005',
      type: 'OUTFLOW',
      sourceAccount: gbpHub,
      counterparty: 'KPMG Advisory LLP',
      amount: '75000.00',
      currency: 'GBP',
      category: 'Legal & Tax Compliance',
      desc: 'Quarterly global transfer pricing study & SOX internal audit review',
      fee: '15.00',
      status: 'COMPLETED',
      daysAgo: 20,
    },
    {
      ref: 'TX-2026-0006',
      type: 'INTEREST_INCOME',
      sourceAccount: gsYield,
      counterparty: 'Federal Reserve / US Treasury',
      amount: '128500.00',
      currency: 'USD',
      category: 'Treasury Investment Yield',
      desc: 'Monthly coupon & interest disbursement on short duration T-Bills',
      status: 'COMPLETED',
      daysAgo: 18,
    },
    {
      ref: 'TX-2026-0007',
      type: 'INTERNAL_TRANSFER',
      sourceAccount: usdMain,
      destAccount: eurHub,
      counterparty: 'Acme Treasury Cross-Border FX',
      amount: '1000000.00',
      currency: 'USD',
      destAmount: '921650.00',
      destCurrency: 'EUR',
      exchangeRate: 0.92165,
      category: 'Cross-Border Capital Funding',
      desc: 'Intercompany capital infusion to European subsidiary for data center expansion',
      fee: '45.00',
      status: 'COMPLETED',
      daysAgo: 15,
    },
    {
      ref: 'TX-2026-0008',
      type: 'INFLOW',
      sourceAccount: sgdHub,
      counterparty: 'Temasek Commercial Partners',
      amount: '1450000.00',
      currency: 'SGD',
      category: 'Commercial Venture Revenue',
      desc: 'Asia Pacific institutional client annual software maintenance',
      status: 'COMPLETED',
      daysAgo: 12,
    },
    {
      ref: 'TX-2026-0009',
      type: 'TAX_SETTLEMENT',
      sourceAccount: chfTax,
      counterparty: 'Federal Tax Administration (ESTV) Bern',
      amount: '320000.00',
      currency: 'CHF',
      category: 'Statutory Corporate Taxes',
      desc: 'Quarterly corporate withholding and cantonal tax remittance',
      status: 'COMPLETED',
      daysAgo: 10,
    },
    {
      ref: 'TX-2026-0010',
      type: 'OUTFLOW',
      sourceAccount: usdMain,
      counterparty: 'Snowflake Data Cloud Inc.',
      amount: '64200.00',
      currency: 'USD',
      category: 'Cloud Infrastructure & Compute',
      desc: 'Enterprise data warehouse capacity credit drawdown',
      status: 'COMPLETED',
      daysAgo: 8,
    },
    {
      ref: 'TX-2026-0011',
      type: 'INFLOW',
      sourceAccount: jpyHub,
      counterparty: 'Sony Group Corporation',
      amount: '95000000',
      currency: 'JPY',
      category: 'Customer Collections',
      desc: 'Multi-year API data licensing contract settlement',
      status: 'COMPLETED',
      daysAgo: 6,
    },
    {
      ref: 'TX-2026-0012',
      type: 'BANK_FEE',
      sourceAccount: usdMain,
      counterparty: 'JPMorgan Global Cash Management',
      amount: '2450.00',
      currency: 'USD',
      category: 'Banking Fees',
      desc: 'Monthly treasury management, BAI2 reporting feed & SWIFT connectivity fees',
      status: 'COMPLETED',
      daysAgo: 5,
    },
    {
      ref: 'TX-2026-0013',
      type: 'OUTFLOW',
      sourceAccount: payrollAcc,
      counterparty: 'ADP TotalSource Worldwide Payroll',
      amount: '620000.00',
      currency: 'USD',
      category: 'Global Payroll',
      desc: 'Bi-monthly direct deposit employee payroll distribution',
      status: 'COMPLETED',
      daysAgo: 3,
    },
    {
      ref: 'TX-2026-0014',
      type: 'OUTFLOW',
      sourceAccount: usdMain,
      counterparty: 'CyberTrust Security Acquisition Escrow',
      amount: '2500000.00',
      currency: 'USD',
      category: 'Strategic M&A & Investments',
      desc: 'CyberTrust security tech acquisition milestone escrow deposit (Pending Senior Approval)',
      status: 'PENDING_APPROVAL',
      daysAgo: 1,
    },
    {
      ref: 'TX-2026-0015',
      type: 'INFLOW',
      sourceAccount: usdMain,
      counterparty: 'Apple Inc. Services Division',
      amount: '920000.00',
      currency: 'USD',
      category: 'Enterprise Software Contracts',
      desc: 'Global app store payments enterprise integration license fee',
      status: 'COMPLETED',
      daysAgo: 0,
    },
  ];

  let jeIndex = 1;
  for (const def of txDefs) {
    const valueDate = new Date();
    valueDate.setDate(valueDate.getDate() - def.daysAgo);

    const amountCents = toCents(def.amount, def.currency);
    const feeCents = def.fee ? toCents(def.fee, def.currency) : 0;
    const destAmountCents = def.destAmount ? toCents(def.destAmount, def.destCurrency || def.currency) : undefined;

    const tx = await Transaction.create({
      referenceNumber: def.ref,
      type: def.type as any,
      sourceAccountId: def.sourceAccount._id,
      destinationAccountId: def.destAccount?._id,
      counterpartyName: def.counterparty,
      amountCents,
      feeCents,
      currency: def.currency,
      destinationAmountCents: destAmountCents,
      destinationCurrency: def.destCurrency,
      exchangeRate: def.exchangeRate || 1.0,
      category: def.category,
      description: def.desc,
      status: def.status as any,
      reconciliationStatus: def.status === 'COMPLETED' ? 'MATCHED' : 'UNRECONCILED',
      initiatedBy: operator._id,
      approvedBy: def.status === 'COMPLETED' ? manager._id : undefined,
      valueDate,
      postingDate: valueDate,
      tags: ['AUTOMATED_FEED', def.category.toUpperCase().replace(/\s+/g, '_')],
    });

    if (def.status === 'COMPLETED') {
      const fiscalPeriod = `${valueDate.getFullYear()}-${String(valueDate.getMonth() + 1).padStart(2, '0')}`;
      const lines: any[] = [];

      if (def.type === 'INFLOW' || def.type === 'INTEREST_INCOME') {
        lines.push({
          accountId: def.sourceAccount._id,
          accountName: def.sourceAccount.name,
          accountCode: `1000-${def.currency}`,
          debitCents: amountCents,
          creditCents: 0,
          currency: def.currency,
          memo: `${def.type}: ${def.desc}`,
        });
        lines.push({
          accountId: def.sourceAccount._id,
          accountName: `Revenue - ${def.category}`,
          accountCode: `4000-${def.category.toUpperCase().replace(/\s+/g, '_')}`,
          debitCents: 0,
          creditCents: amountCents,
          currency: def.currency,
          memo: `Counterparty: ${def.counterparty}`,
        });
      } else if (
        def.type === 'OUTFLOW' ||
        def.type === 'BANK_FEE' ||
        def.type === 'TAX_SETTLEMENT'
      ) {
        lines.push({
          accountId: def.sourceAccount._id,
          accountName: `Expense - ${def.category}`,
          accountCode: `5000-${def.category.toUpperCase().replace(/\s+/g, '_')}`,
          debitCents: amountCents,
          creditCents: 0,
          currency: def.currency,
          memo: `${def.type}: ${def.desc}`,
        });
        lines.push({
          accountId: def.sourceAccount._id,
          accountName: def.sourceAccount.name,
          accountCode: `1000-${def.currency}`,
          debitCents: 0,
          creditCents: amountCents + feeCents,
          currency: def.currency,
          memo: `Payment to ${def.counterparty}`,
        });
        if (feeCents > 0) {
          lines.push({
            accountId: def.sourceAccount._id,
            accountName: 'Banking Fees',
            accountCode: '5900-BANK_FEES',
            debitCents: feeCents,
            creditCents: 0,
            currency: def.currency,
            memo: 'Processing Wire Fee',
          });
        }
      } else if (def.type === 'INTERNAL_TRANSFER') {
        const destAmount = destAmountCents || amountCents;
        const isCrossCurrency = def.sourceAccount.currency !== (def.destCurrency || def.destAccount?.currency);

        if (isCrossCurrency) {
          lines.push({
            accountId: def.sourceAccount._id,
            accountName: def.sourceAccount.name,
            accountCode: `1000-${def.currency}`,
            debitCents: 0,
            creditCents: amountCents,
            currency: def.currency,
            memo: `Cross-border transfer to ${def.destAccount?.name}`,
          });
          lines.push({
            accountId: def.sourceAccount._id,
            accountName: `FX Clearing (${def.currency})`,
            accountCode: `1999-FX_CLEARING_${def.currency}`,
            debitCents: amountCents,
            creditCents: 0,
            currency: def.currency,
            memo: `FX Clearing for ${def.ref}`,
          });

          lines.push({
            accountId: def.destAccount?._id,
            accountName: def.destAccount?.name || '',
            accountCode: `1000-${def.destCurrency || def.currency}`,
            debitCents: destAmount,
            creditCents: 0,
            currency: def.destCurrency || def.currency,
            memo: `Cross-border funding from ${def.sourceAccount.name}`,
          });
          lines.push({
            accountId: def.destAccount?._id,
            accountName: `FX Clearing (${def.destCurrency || def.currency})`,
            accountCode: `1999-FX_CLEARING_${def.destCurrency || def.currency}`,
            debitCents: 0,
            creditCents: destAmount,
            currency: def.destCurrency || def.currency,
            memo: `FX Clearing for ${def.ref}`,
          });
        } else {
          lines.push({
            accountId: def.sourceAccount._id,
            accountName: def.sourceAccount.name,
            accountCode: `1000-${def.currency}`,
            debitCents: 0,
            creditCents: amountCents,
            currency: def.currency,
            memo: `Transfer to ${def.destAccount?.name}`,
          });
          lines.push({
            accountId: def.destAccount?._id,
            accountName: def.destAccount?.name || '',
            accountCode: `1000-${def.destCurrency || def.currency}`,
            debitCents: destAmount,
            creditCents: 0,
            currency: def.destCurrency || def.currency,
            memo: `Transfer from ${def.sourceAccount.name}`,
          });
        }
      }

      const totalDebit = lines.reduce((acc, l) => acc + l.debitCents, 0);
      const totalCredit = lines.reduce((acc, l) => acc + l.creditCents, 0);

      await LedgerEntry.create({
        entryNumber: `JE-2026-${String(jeIndex++).padStart(5, '0')}`,
        transactionId: tx._id,
        description: `Posting for ${def.ref}: ${def.desc}`,
        postingDate: valueDate,
        lines,
        totalDebitCents: totalDebit,
        totalCreditCents: totalCredit,
        isBalanced: totalDebit === totalCredit,
        status: 'POSTED',
        fiscalPeriod,
        postedBy: manager._id,
      });
    }
  }

  console.log('[Seed] Generating Compliance Audit Logs...');
  await AuditLog.create([
    {
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'TREASURY_SYSTEM',
      entityId: 'SYS-2026',
      performedBy: treasurer._id,
      userName: treasurer.name,
      details: { version: '1.0.0', environment: 'production-ready', multiCurrency: true },
      timestamp: new Date(Date.now() - 30 * 86400000),
    },
    {
      action: 'ACCOUNT_PROVISIONED',
      entityType: 'ACCOUNT',
      entityId: usdMain._id.toString(),
      performedBy: treasurer._id,
      userName: treasurer.name,
      details: { account: usdMain.name, initialDeposit: '$14,250,890.50' },
      timestamp: new Date(Date.now() - 29 * 86400000),
    },
    {
      action: 'SOX_AUDIT_CHECKPOINT_PASSED',
      entityType: 'COMPLIANCE',
      performedBy: auditor._id,
      userName: auditor.name,
      details: { result: 'PASSED', doubleEntryBalanced: true, segregationOfDutiesVerified: true },
      timestamp: new Date(Date.now() - 15 * 86400000),
    },
  ]);

  console.log('[Seed] Database successfully seeded!');
  console.log('Demo Credentials:');
  console.log('  Treasurer:       treasurer@acme-corp.com / password123');
  console.log('  Finance Manager: manager@acme-corp.com   / password123');
  console.log('  Auditor:         auditor@acme-corp.com   / password123');
  console.log('  Operator:        operator@acme-corp.com  / password123');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
