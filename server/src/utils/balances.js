"use strict";

/**
 * Round a numeric value to 2 decimal places, returning a Number.
 * Guards against NaN / undefined by coercing to 0.
 */
function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute the financial state of a Group Bank room.
 *
 * @param {Array} transactions - Transaction docs (lean ok). Each has:
 *   - type: "deposit" | "expense"
 *   - totalAmount: Number
 *   - allocations: [{ user, amount }]  (used for deposits)
 *   - splitAmong:  [{ user, amount }]  (used for expenses)
 * @param {Array} members - member user objects, each with _id.
 * @returns {{
 *   totalDeposited: number,
 *   totalSpent: number,
 *   bankBalance: number,
 *   members: Array<{ user: object, contributed: number, spent: number, net: number }>
 * }}
 */
function computeBalances(transactions, members) {
  const txns = Array.isArray(transactions) ? transactions : [];
  const mbrs = Array.isArray(members) ? members : [];

  // Per-member accumulators keyed by stringified user id.
  const contributedMap = new Map();
  const spentMap = new Map();

  // Seed maps for every known member so everyone appears in the result.
  for (const m of mbrs) {
    if (!m || m._id == null) continue;
    const key = String(m._id);
    contributedMap.set(key, 0);
    spentMap.set(key, 0);
  }

  let totalDeposited = 0;
  let totalSpent = 0;

  for (const tx of txns) {
    if (!tx) continue;

    if (tx.type === "deposit") {
      const allocations = Array.isArray(tx.allocations) ? tx.allocations : [];
      for (const a of allocations) {
        if (!a || a.user == null) continue;
        const key = String(a.user._id != null ? a.user._id : a.user);
        const amt = Number(a.amount) || 0;
        totalDeposited += amt;
        contributedMap.set(key, (contributedMap.get(key) || 0) + amt);
      }
    } else if (tx.type === "expense") {
      const splits = Array.isArray(tx.splitAmong) ? tx.splitAmong : [];
      for (const s of splits) {
        if (!s || s.user == null) continue;
        const key = String(s.user._id != null ? s.user._id : s.user);
        const amt = Number(s.amount) || 0;
        totalSpent += amt;
        spentMap.set(key, (spentMap.get(key) || 0) + amt);
      }
    }
  }

  const memberBalances = mbrs.map((m) => {
    const key = m && m._id != null ? String(m._id) : "";
    const contributed = round2(contributedMap.get(key) || 0);
    const spent = round2(spentMap.get(key) || 0);
    return {
      user: m,
      contributed,
      spent,
      net: round2(contributed - spent),
    };
  });

  const totalDepositedR = round2(totalDeposited);
  const totalSpentR = round2(totalSpent);

  return {
    totalDeposited: totalDepositedR,
    totalSpent: totalSpentR,
    bankBalance: round2(totalDepositedR - totalSpentR),
    members: memberBalances,
  };
}

module.exports = { computeBalances };
