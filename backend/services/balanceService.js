async function calculateBalancesInternal(groupId, client) {
  // 1. Fetch group members
  const { data: membersData, error: membersError } = await client
    .from('group_members')
    .select(`
      user_id,
      users (
        id,
        email,
        name
      )
    `)
    .eq('group_id', groupId);

  if (membersError) throw membersError;
  const members = membersData.map((item) => item.users).filter(Boolean);

  const memberMap = {};
  members.forEach((m) => {
    memberMap[m.id] = m;
  });

  const currencies = ['INR', 'USD'];
  const netBalancesByCurrency = {
    INR: {},
    USD: {}
  };

  members.forEach((m) => {
    netBalancesByCurrency.INR[m.id] = 0;
    netBalancesByCurrency.USD[m.id] = 0;
  });

  // 2. Fetch all expenses
  const { data: expenses, error: expError } = await client
    .from('expenses')
    .select('id, paid_by, amount, currency')
    .eq('group_id', groupId);

  if (expError) throw expError;

  // Add payments to net balances
  expenses.forEach((e) => {
    const curr = e.currency === 'USD' ? 'USD' : 'INR';
    if (e.paid_by && netBalancesByCurrency[curr][e.paid_by] !== undefined) {
      netBalancesByCurrency[curr][e.paid_by] += parseFloat(e.amount);
    }
  });

  // 3. Fetch all splits for those expenses
  const expenseIds = expenses.map((e) => e.id);
  const expenseMap = {};
  expenses.forEach((e) => {
    expenseMap[e.id] = e;
  });

  if (expenseIds.length > 0) {
    const { data: splits, error: splitError } = await client
      .from('expense_splits')
      .select('user_id, amount, expense_id')
      .in('expense_id', expenseIds);

    if (splitError) throw splitError;

    // Deduct owed splits
    splits.forEach((s) => {
      const exp = expenseMap[s.expense_id];
      if (exp) {
        const curr = exp.currency === 'USD' ? 'USD' : 'INR';
        if (netBalancesByCurrency[curr][s.user_id] !== undefined) {
          netBalancesByCurrency[curr][s.user_id] -= parseFloat(s.amount);
        }
      }
    });
  }

  // 4. Fetch settlements
  let settlements = [];
  const { data: settlementsData, error: setError } = await client
    .from('settlements')
    .select('payer_id, payee_id, amount, currency, status')
    .eq('group_id', groupId);

  if (setError) {
    if (setError.code === '42703') {
      const { data: retryData, error: retryError } = await client
        .from('settlements')
        .select('payer_id, payee_id, amount, currency')
        .eq('group_id', groupId);
      if (retryError) throw retryError;
      settlements = retryData || [];
    } else {
      throw setError;
    }
  } else {
    settlements = (settlementsData || []).filter(s => s.status !== 'reversed');
  }

  settlements.forEach((s) => {
    const curr = s.currency === 'USD' ? 'USD' : 'INR';
    if (netBalancesByCurrency[curr][s.payer_id] !== undefined) {
      netBalancesByCurrency[curr][s.payer_id] += parseFloat(s.amount);
    }
    if (netBalancesByCurrency[curr][s.payee_id] !== undefined) {
      netBalancesByCurrency[curr][s.payee_id] -= parseFloat(s.amount);
    }
  });

  // Round decimals to 2 places
  currencies.forEach((curr) => {
    Object.keys(netBalancesByCurrency[curr]).forEach((uid) => {
      netBalancesByCurrency[curr][uid] = Math.round(netBalancesByCurrency[curr][uid] * 100) / 100;
    });
  });

  // 5. Greedy Debt Simplification
  const simplifiedDebtsByCurrency = {
    INR: [],
    USD: []
  };

  currencies.forEach((curr) => {
    const debtors = [];
    const creditors = [];

    Object.entries(netBalancesByCurrency[curr]).forEach(([uid, balance]) => {
      if (balance < -0.01) {
        debtors.push({ userId: uid, balance });
      } else if (balance > 0.01) {
        creditors.push({ userId: uid, balance });
      }
    });

    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const dList = debtors.map((d) => ({ ...d }));
    const cList = creditors.map((c) => ({ ...c }));

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < dList.length && cIdx < cList.length) {
      const debtor = dList[dIdx];
      const creditor = cList[cIdx];

      const dAmount = Math.abs(debtor.balance);
      const cAmount = creditor.balance;

      const settledAmount = Math.min(dAmount, cAmount);

      simplifiedDebtsByCurrency[curr].push({
        from: debtor.userId,
        fromUser: memberMap[debtor.userId],
        to: creditor.userId,
        toUser: memberMap[creditor.userId],
        amount: Math.round(settledAmount * 100) / 100,
        currency: curr
      });

      debtor.balance += settledAmount;
      creditor.balance -= settledAmount;

      if (Math.abs(debtor.balance) < 0.01) dIdx++;
      if (Math.abs(creditor.balance) < 0.01) cIdx++;
    }
  });

  // Consolidated netBalances (converts USD to INR at rate 83.0) for backwards compatibility
  const netBalances = {};
  const exchangeRateUSDtoINR = 83.0;
  members.forEach((m) => {
    const inrBal = netBalancesByCurrency.INR[m.id] || 0;
    const usdBal = netBalancesByCurrency.USD[m.id] || 0;
    netBalances[m.id] = Math.round((inrBal + usdBal * exchangeRateUSDtoINR) * 100) / 100;
  });

  // Combine simplified debts
  const simplifiedDebts = [
    ...simplifiedDebtsByCurrency.INR,
    ...simplifiedDebtsByCurrency.USD
  ];

  return {
    members,
    netBalances,
    simplifiedDebts,
    netBalancesByCurrency,
    simplifiedDebtsByCurrency
  };
}

module.exports = {
  calculateBalancesInternal
};
