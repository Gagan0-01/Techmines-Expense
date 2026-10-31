import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5000/api';

let tokenA = '';
let tokenB = '';
let userAEmail = `user_a_${Date.now()}@techmines.com`;
let userBEmail = `user_b_${Date.now()}@techmines.com`;

test('1. Health check returns ok and INR currency', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.status, 'ok');
  assert.equal(data.currency, 'INR');
});

test('2. Authentication - Registration, Validation, and Login', async () => {
  // Reject short password
  const shortPassRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Owner',
      email: userAEmail,
      password: '123',
    }),
  });
  assert.equal(shortPassRes.status, 400);

  // Register User A
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rajesh Sharma',
      email: userAEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });
  const regData = await regRes.json();
  assert.equal(regRes.status, 201);
  assert.ok(regData.token);
  assert.equal(regData.user.name, 'Rajesh Sharma');
  tokenA = regData.token;

  // Reject duplicate registration
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rajesh Sharma',
      email: userAEmail,
      password: 'Password123!',
    }),
  });
  assert.equal(dupRes.status, 400);

  // Login with correct credentials
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: 'Password123!',
    }),
  });
  const loginData = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.ok(loginData.token);

  // Login with incorrect credentials
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: 'WrongPassword!',
    }),
  });
  assert.equal(badLoginRes.status, 401);

  // Verify /me endpoint
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const meData = await meRes.json();
  assert.equal(meRes.status, 200);
  assert.equal(meData.user.email, userAEmail);

  // Register User B for Data Isolation testing
  const regBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priya Verma',
      email: userBEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });
  const regBData = await regBRes.json();
  tokenB = regBData.token;
  assert.ok(tokenB);
});

test('3. Protected routes reject unauthorized requests', async () => {
  const res = await fetch(`${BASE_URL}/transactions`);
  assert.equal(res.status, 401);

  const res2 = await fetch(`${BASE_URL}/transactions/summary`);
  assert.equal(res2.status, 401);
});

test('4. Data Isolation - User A transactions are invisible to User B', async () => {
  // User A creates a transaction of ₹50,000
  const txResA = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: 'User A Exclusive Retainer',
      amount: 50000,
      type: 'incoming',
      category: 'Client Payment',
      paymentMethod: 'Bank Transfer',
    }),
  });
  assert.equal(txResA.status, 201);
  const txAData = await txResA.json();
  const txAId = txAData.transaction._id;

  // User B queries transactions - should see 0
  const bListRes = await fetch(`${BASE_URL}/transactions`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const bListData = await bListRes.json();
  assert.equal(bListData.transactions.length, 0, 'User B must not see User A transactions');

  // User B tries to view or delete User A transaction
  const bViewRes = await fetch(`${BASE_URL}/transactions/${txAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(bViewRes.status, 404);

  const bDelRes = await fetch(`${BASE_URL}/transactions/${txAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(bDelRes.status, 404);
});

test('5. Settings - User opening balance isolation', async () => {
  // User A sets opening balance to ₹75,000
  await fetch(`${BASE_URL}/settings/opening-balance`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      openingBalance: 75000,
    }),
  });

  // User B checks opening balance - should be 0
  const bSetRes = await fetch(`${BASE_URL}/settings`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const bSetData = await bSetRes.json();
  assert.equal(bSetData.settings.openingBalance, 0);

  // User A checks opening balance - should be 75,000
  const aSetRes = await fetch(`${BASE_URL}/settings`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const aSetData = await aSetRes.json();
  assert.equal(aSetData.settings.openingBalance, 75000);
});

test('6. Daily Report and Monthly Comparison for authenticated user', async () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const res = await fetch(`${BASE_URL}/reports/daily?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.summary.totalIncoming >= 50000);

  const compRes = await fetch(`${BASE_URL}/reports/monthly-comparison`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const compData = await compRes.json();
  assert.equal(compRes.status, 200);
  assert.ok(compData.currentPeriod);
});

test('7. Recurring Schedule - Create and Complete with authentication', async () => {
  const recRes = await fetch(`${BASE_URL}/recurring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: 'Monthly Cloud Infrastructure',
      amount: 12000,
      type: 'expense',
      category: 'Software and Subscriptions',
      paymentMethod: 'UPI',
      frequency: 'Monthly',
      startDate: new Date().toISOString(),
      nextScheduledDate: new Date().toISOString(),
    }),
  });
  const recData = await recRes.json();
  assert.equal(recRes.status, 201);
  const schedId = recData.schedule._id;

  // Complete occurrence
  const compRes = await fetch(`${BASE_URL}/recurring/${schedId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      actualAmount: 12000,
    }),
  });
  assert.equal(compRes.status, 201);
});

test('8. Date Range Breakdown & Tracker - Validation and Calculations', async () => {
  // Invalid custom range: start date after end date should return 400
  const invalidRes = await fetch(`${BASE_URL}/reports/daily-breakdown?range=custom&startDate=2026-10-20&endDate=2026-10-10`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(invalidRes.status, 400);
  const invalidData = await invalidRes.json();
  assert.equal(invalidData.success, false);

  // Add backdated transactions for User A on October 12, 2026
  const tx1Res = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: 'Client Project Milestone A',
      amount: 5000,
      type: 'incoming',
      category: 'Client Payment',
      paymentMethod: 'UPI',
      date: '2026-10-12T11:00:00.000Z',
    }),
  });
  assert.equal(tx1Res.status, 201);

  const tx2Res = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: 'Office Stationery',
      amount: 1500,
      type: 'expense',
      category: 'Office Supplies',
      paymentMethod: 'Cash',
      date: '2026-10-12T14:30:00.000Z',
    }),
  });
  assert.equal(tx2Res.status, 201);

  // Fetch range: 2026-10-10 to 2026-10-15 (6 calendar days)
  const breakdownRes = await fetch(
    `${BASE_URL}/reports/daily-breakdown?range=custom&startDate=2026-10-10&endDate=2026-10-15`,
    {
      headers: { Authorization: `Bearer ${tokenA}` },
    }
  );
  assert.equal(breakdownRes.status, 200);
  const data = await breakdownRes.json();
  assert.equal(data.success, true);
  assert.equal(data.period.totalDays, 6);
  assert.equal(data.dailyBreakdown.length, 6);

  // Overall totals in range must equal sum of daily totals
  const dailyIncomeSum = data.dailyBreakdown.reduce((sum, d) => sum + d.totalIncome, 0);
  const dailyExpenseSum = data.dailyBreakdown.reduce((sum, d) => sum + d.totalExpenses, 0);
  assert.equal(Math.round(dailyIncomeSum * 100) / 100, data.summary.totalIncome);
  assert.equal(Math.round(dailyExpenseSum * 100) / 100, data.summary.totalExpenses);
  assert.equal(data.summary.netBalance, Math.round((data.summary.totalIncome - data.summary.totalExpenses) * 100) / 100);

  // Day with transactions (2026-10-12)
  const day12 = data.dailyBreakdown.find((d) => d.date === '2026-10-12');
  assert.ok(day12);
  assert.equal(day12.totalIncome, 5000);
  assert.equal(day12.totalExpenses, 1500);
  assert.equal(day12.netBalance, 3500);
  assert.equal(day12.incomeTransactions.length, 1);
  assert.equal(day12.expenseTransactions.length, 1);
  assert.equal(day12.paymentMethods.UPI.incoming, 5000);
  assert.equal(day12.paymentMethods.Cash.expenses, 1500);

  // Empty day (2026-10-11)
  const day11 = data.dailyBreakdown.find((d) => d.date === '2026-10-11');
  assert.ok(day11);
  assert.equal(day11.totalIncome, 0);
  assert.equal(day11.totalExpenses, 0);
  assert.equal(day11.netBalance, 0);
  assert.equal(day11.transactionCount, 0);
});

test('9. Tracker End-to-End: Single-day, backdated edits, deletion, and presets', async () => {
  // Test single day range (October 12 only)
  const singleDayRes = await fetch(
    `${BASE_URL}/reports/daily-breakdown?range=custom&startDate=2026-10-12&endDate=2026-10-12`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  assert.equal(singleDayRes.status, 200);
  const singleDayData = await singleDayRes.json();
  assert.equal(singleDayData.dailyBreakdown.length, 1);
  assert.equal(singleDayData.dailyBreakdown[0].date, '2026-10-12');
  assert.equal(singleDayData.summary.totalIncome, 5000);
  assert.equal(singleDayData.summary.totalExpenses, 1500);

  // Create another transaction on Oct 14
  const createRes = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: 'Consulting Session',
      amount: 8000,
      type: 'incoming',
      category: 'Consulting Fee',
      paymentMethod: 'Bank Transfer',
      date: '2026-10-14T15:00:00.000Z',
    }),
  });
  assert.equal(createRes.status, 201);
  const createdTx = (await createRes.json()).transaction;

  // Verify Oct 14 has 8000
  let res14 = await fetch(
    `${BASE_URL}/reports/daily-breakdown?range=custom&startDate=2026-10-10&endDate=2026-10-15`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  let data14 = await res14.json();
  const day14 = data14.dailyBreakdown.find((d) => d.date === '2026-10-14');
  assert.equal(day14.totalIncome, 8000);

  // Edit transaction: change date to Oct 13 and amount to 9000
  const editRes = await fetch(`${BASE_URL}/transactions/${createdTx._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      amount: 9000,
      date: '2026-10-13T10:00:00.000Z',
    }),
  });
  assert.equal(editRes.status, 200);

  // Verify Oct 14 is now 0 and Oct 13 is now 9000
  res14 = await fetch(
    `${BASE_URL}/reports/daily-breakdown?range=custom&startDate=2026-10-10&endDate=2026-10-15`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  data14 = await res14.json();
  const day14After = data14.dailyBreakdown.find((d) => d.date === '2026-10-14');
  const day13After = data14.dailyBreakdown.find((d) => d.date === '2026-10-13');
  assert.equal(day14After.totalIncome, 0);
  assert.equal(day13After.totalIncome, 9000);

  // Delete transaction and verify totals recalculate
  const delRes = await fetch(`${BASE_URL}/transactions/${createdTx._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delRes.status, 200);

  const resAfterDel = await fetch(
    `${BASE_URL}/reports/daily-breakdown?range=custom&startDate=2026-10-10&endDate=2026-10-15`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const dataAfterDel = await resAfterDel.json();
  const day13AfterDel = dataAfterDel.dailyBreakdown.find((d) => d.date === '2026-10-13');
  assert.equal(day13AfterDel.totalIncome, 0);

  // Presets test: last_7_days, last_30_days, this_month, last_month, yesterday
  for (const preset of ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month']) {
    const pRes = await fetch(`${BASE_URL}/reports/daily-breakdown?range=${preset}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(pRes.status, 200);
    const pData = await pRes.json();
    assert.equal(pData.success, true);
    assert.ok(pData.period.totalDays >= 1);
    assert.equal(pData.dailyBreakdown.length, pData.period.totalDays);
  }
});
