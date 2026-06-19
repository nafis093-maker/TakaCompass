// ============================================================================
//  Product catalog — operator-maintained.
//  IMPORTANT: rates here are INDICATIVE samples within real mid-2026 ranges,
//  for building/demo. They are NOT a live feed and must not be presented as a
//  given institution's confirmed offer. Before any commercial launch, replace
//  with confirmed data (partner agreements or a maintained admin/DB) and keep
//  the "verify with institution" labeling.
//
//  Monetization hook: set `sponsored: true` and a `priority` number on a product
//  to pin it to the top of its category with a visible "Sponsored" badge.
// ============================================================================

export const UPDATED = "2026-06-19";

export const INST = {
  dbh: { name: "DBH Finance", type: "NBFI", url: "https://www.dbh.com.bd" },
  brac: { name: "BRAC Bank", type: "Bank", url: "https://www.bracbank.com" },
  ebl: { name: "Eastern Bank (EBL)", type: "Bank", url: "https://www.ebl.com.bd" },
  city: { name: "City Bank", type: "Bank", url: "https://www.citybankplc.com" },
  dbbl: { name: "Dutch-Bangla Bank", type: "Bank", url: "https://www.dutchbanglabank.com" },
  prime: { name: "Prime Bank", type: "Bank", url: "https://www.primebank.com.bd" },
  mtb: { name: "Mutual Trust Bank", type: "Bank", url: "https://www.mutualtrustbank.com" },
  idlc: { name: "IDLC Finance", type: "NBFI", url: "https://idlc.com" },
  lankabangla: { name: "LankaBangla Finance", type: "NBFI", url: "https://www.lankabangla.com" },
  ipdc: { name: "IPDC Finance", type: "NBFI", url: "https://www.ipdcbd.com" },
  islami: { name: "Islami Bank", type: "Bank", url: "https://www.islamibankbd.com" },
};

// rate = annual %. For loans, lower is better. For deposits, higher is better.
export const PRODUCTS = [
  // ---------------- Home loans (~12–13.5%) ----------------
  { id: "h1", inst: "dbh", cat: "home-loan", name: "Home Loan", rate: 11.99, tenureMax: 25, fee: 0.85, sponsored: true, priority: 1, note: "Home-loan specialist" },
  { id: "h2", inst: "brac", cat: "home-loan", name: "Home Loan", rate: 12.5, tenureMax: 25, fee: 1.0 },
  { id: "h3", inst: "ebl", cat: "home-loan", name: "EBL Home Loan", rate: 12.75, tenureMax: 25, fee: 1.0 },
  { id: "h4", inst: "city", cat: "home-loan", name: "City Home Loan", rate: 12.99, tenureMax: 25, fee: 1.0 },
  { id: "h5", inst: "idlc", cat: "home-loan", name: "Home Loan", rate: 13.0, tenureMax: 20, fee: 1.0 },

  // ---------------- Car loans (~13–15%) ----------------
  { id: "c1", inst: "idlc", cat: "car-loan", name: "Car Loan", rate: 13.25, tenureMax: 6, fee: 1.0, sponsored: true, priority: 1 },
  { id: "c2", inst: "brac", cat: "car-loan", name: "Auto Loan", rate: 13.5, tenureMax: 6, fee: 1.0 },
  { id: "c3", inst: "city", cat: "car-loan", name: "City Auto Loan", rate: 13.99, tenureMax: 5, fee: 1.0 },
  { id: "c4", inst: "lankabangla", cat: "car-loan", name: "Auto Loan", rate: 14.25, tenureMax: 5, fee: 1.0 },

  // ---------------- Personal loans (~13.5–16%) ----------------
  { id: "p1", inst: "dbbl", cat: "personal-loan", name: "Personal Loan", rate: 13.99, tenureMax: 5, fee: 1.0 },
  { id: "p2", inst: "city", cat: "personal-loan", name: "City Personal Loan", rate: 14.0, tenureMax: 5, fee: 1.0 },
  { id: "p3", inst: "brac", cat: "personal-loan", name: "Personal Loan", rate: 14.5, tenureMax: 5, fee: 1.5 },
  { id: "p4", inst: "prime", cat: "personal-loan", name: "Personal Loan", rate: 15.0, tenureMax: 5, fee: 1.0 },

  // ---------------- SME loans (~14–16%) ----------------
  { id: "s1", inst: "idlc", cat: "sme-loan", name: "SME Loan", rate: 14.5, tenureMax: 5, fee: 1.0, sponsored: true, priority: 1, note: "Strong SME focus" },
  { id: "s2", inst: "ipdc", cat: "sme-loan", name: "SME Finance", rate: 15.0, tenureMax: 5, fee: 1.0 },
  { id: "s3", inst: "lankabangla", cat: "sme-loan", name: "SME Loan", rate: 15.5, tenureMax: 5, fee: 1.0 },

  // ---------------- Fixed deposits (banks ~8–9.5%, NBFIs higher ~10–11.5%) -----
  { id: "f1", inst: "lankabangla", cat: "fdr", name: "Fixed Deposit", rate: 11.0, tenureMax: 5, sponsored: true, priority: 1 },
  { id: "f2", inst: "idlc", cat: "fdr", name: "Fixed Deposit", rate: 10.75, tenureMax: 5 },
  { id: "f3", inst: "ipdc", cat: "fdr", name: "Fixed Deposit", rate: 10.5, tenureMax: 5 },
  { id: "f4", inst: "ebl", cat: "fdr", name: "EBL FDR", rate: 9.5, tenureMax: 5 },
  { id: "f5", inst: "brac", cat: "fdr", name: "Fixed Deposit", rate: 9.25, tenureMax: 5 },
  { id: "f6", inst: "dbbl", cat: "fdr", name: "Fixed Deposit", rate: 8.75, tenureMax: 5 },

  // ---------------- DPS / monthly savings (~9–11%) ----------------
  { id: "d1", inst: "idlc", cat: "dps", name: "Monthly Deposit (DPS)", rate: 10.5, tenureMax: 10, sponsored: true, priority: 1 },
  { id: "d2", inst: "dbh", cat: "dps", name: "Deposit Pension Scheme", rate: 10.25, tenureMax: 10 },
  { id: "d3", inst: "city", cat: "dps", name: "City DPS", rate: 9.75, tenureMax: 10 },
  { id: "d4", inst: "prime", cat: "dps", name: "Prime DPS", rate: 9.5, tenureMax: 10 },
  { id: "d5", inst: "islami", cat: "dps", name: "Mudaraba Savings (DPS)", rate: 9.25, tenureMax: 10, note: "Shariah-based, profit-sharing" },
];

export const BORROW_CATS = [
  { key: "home-loan", label: "Home", emoji: "🏠" },
  { key: "car-loan", label: "Car", emoji: "🚗" },
  { key: "personal-loan", label: "Personal", emoji: "💳" },
  { key: "sme-loan", label: "Business / SME", emoji: "🏭" },
];
export const SAVE_CATS = [
  { key: "fdr", label: "Fixed Deposit", emoji: "🏦" },
  { key: "dps", label: "Monthly (DPS)", emoji: "📆" },
];
