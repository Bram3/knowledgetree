// Fixed SD Worx product categories. A customer subscribes to a subset; every node of that
// customer automatically carries those categories.
export type Product = { id: string; name: string; short: string; color: string };

export const PRODUCTS: Product[] = [
  { id: "payroll", name: "Payroll", short: "PAY", color: "#da3300" },
  { id: "time", name: "Time & Attendance", short: "T&A", color: "#0083ce" },
  { id: "hr-admin", name: "HR Administration", short: "HRA", color: "#009559" },
  { id: "legal", name: "Legal & Compliance", short: "LEG", color: "#9051e1" },
  { id: "reporting", name: "Reporting & Analytics", short: "REP", color: "#f28f29" },
  { id: "benefits", name: "Benefits & Rewards", short: "BEN", color: "#cb2f90" },
  { id: "contract", name: "Contract & SLA", short: "SLA", color: "#737476" },
];

export const OTHER_CATEGORY: Product = { id: "other", name: "Other", short: "OTH", color: "#a3a5a8" };

export function product(id: string): Product {
  return PRODUCTS.find((p) => p.id === id) ?? OTHER_CATEGORY;
}

export const ORIGIN_LABEL = { sdworx: "SD Worx documents", customer: "Received from customer" } as const;
