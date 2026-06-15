export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

export const CATEGORIES = [
  "Food",
  "Hotel",
  "Fuel",
  "Travel",
  "Shopping",
  "Activities",
  "Misc",
];

export function formatMoney(amount, currency) {
  const symbol = currency && currency.symbol ? currency.symbol : "";
  const value = Number(amount || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return `${symbol}${value}`;
}

export const NOTIF_META = {
  welcome: { icon: "PartyPopper", label: "Welcome" },
  member_joined: { icon: "UserPlus", label: "Member joined" },
  join_request: { icon: "UserRoundPlus", label: "Join request" },
  request_accepted: { icon: "CheckCircle2", label: "Request accepted" },
  request_declined: { icon: "XCircle", label: "Request declined" },
  deposit: { icon: "PiggyBank", label: "Deposit" },
  expense: { icon: "Receipt", label: "Expense" },
  chat: { icon: "MessageCircle", label: "Message" },
};
