// The department list. One place to edit when something changes status.
//
// status:
//   "live"   — in daily use, the tile links out
//   "build"  — code exists, not deployed
//   "queued" — not started
export type Status = "live" | "build" | "queued";

export type Department = {
  /** The value stored in app.staff.departments. */
  key: string;
  /**
   * True when that dashboard itself refuses people without the key (Account, GM
   * and Warehouse do). The hub only locks a tile for a department that enforces
   * it; locking a link to a dashboard that would still let them in is theatre.
   */
  enforced: boolean;
  name: string;
  description: string;
  host: string;
  status: Status;
};

export const DEPARTMENTS: Department[] = [
  {
    key: "sales",
    enforced: false,
    name: "Sales",
    description: "Sales performance tracking for the Malaysia team — targets, outlet and region rollups.",
    host: "sales.seedclmalaysiastore.com",
    status: "live",
  },
  {
    key: "gm",
    enforced: true,
    name: "Administration",
    description: "GM report dashboard — import POS files, edit the 13 report sections, export the HQ deck as PPTX.",
    host: "gmdashboard.seedclmalaysiastore.com",
    status: "live",
  },
  {
    key: "hr",
    enforced: false,
    name: "Human Resources",
    description: "Staff records, leave and claims, evaluation forms.",
    host: "hr.seedclmalaysiastore.com",
    status: "live",
  },
  {
    key: "account",
    enforced: true,
    name: "Account",
    description: "Sales and purchase forecasts, the five-year forecast P&L with forecast detail and expenses. AR collection, payables and cashflow to follow.",
    host: "account.seedclmalaysiastore.com",
    status: "live",
  },
  {
    key: "marketing",
    enforced: false,
    name: "Marketing",
    description: "Campaign calendar, promotion performance, social and content pipeline.",
    host: "marketing.seedclmalaysiastore.com",
    status: "queued",
  },
  {
    key: "service",
    enforced: false,
    name: "Customer Service",
    description: "WhatsApp inbox, power inquiries, returns and exchange cases.",
    host: "service.seedclmalaysiastore.com",
    status: "queued",
  },
  {
    key: "warehouse",
    enforced: true,
    name: "Warehouse",
    description: "PO email to HQ and from customers. Customer consignment, PO conversion, BOC stock and the specialty CL monthly report to follow.",
    host: "warehouse.seedclmalaysiastore.com",
    status: "live",
  },
  {
    key: "regulatory",
    enforced: false,
    name: "Regulatory",
    description: "Product registration status, licence renewals and submission deadlines.",
    host: "regulatory.seedclmalaysiastore.com",
    status: "queued",
  },
];

export const GROUPS: { key: Status; label: string }[] = [
  { key: "live", label: "In service" },
  { key: "build", label: "In build" },
  { key: "queued", label: "Not started" },
];

export const PILL_LABEL: Record<Status, string> = {
  live: "Live",
  build: "In build",
  queued: "Queued",
};
