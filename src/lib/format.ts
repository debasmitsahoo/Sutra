// Indian number format (lakh/crore grouping). Round only at display.
const nf = (digits: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtNum = (v: number | string, digits = 0) => nf(digits).format(Number(v));

export const fmtINR = (v: number | string, digits = 0) => `₹${fmtNum(v, digits)}`;
