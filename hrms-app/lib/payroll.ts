export type PayrollEntry = {
  employee: string;
  month: string;
  basic: number;
  hra: number;
  allowance: number;
  bonus: number;
  overtime: number;
  tax: number;
  pf: number;
  deductions: number;
  net: number;
};

export const payrollEntries: PayrollEntry[] = [
  {
    employee: "Rahul Sharma",
    month: "September 2026",
    basic: 30000,
    hra: 10000,
    allowance: 5000,
    bonus: 2000,
    overtime: 3000,
    tax: 1000,
    pf: 2000,
    deductions: 3000,
    net: 44000,
  },
  {
    employee: "Priya Verma",
    month: "September 2026",
    basic: 26000,
    hra: 9000,
    allowance: 4500,
    bonus: 1500,
    overtime: 1200,
    tax: 900,
    pf: 1800,
    deductions: 2700,
    net: 37600,
  },
  {
    employee: "Amit Singh",
    month: "September 2026",
    basic: 22000,
    hra: 8000,
    allowance: 4000,
    bonus: 1000,
    overtime: 1800,
    tax: 800,
    pf: 1600,
    deductions: 2400,
    net: 31500,
  },
];

export function calculateGrossSalary(entry: Omit<PayrollEntry, "net">) {
  return entry.basic + entry.hra + entry.allowance + entry.bonus + entry.overtime;
}

export function calculateNetSalary(entry: PayrollEntry) {
  const gross = calculateGrossSalary(entry);
  return gross - (entry.tax + entry.pf + entry.deductions);
}
