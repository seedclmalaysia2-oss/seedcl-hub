// The department list. One place to edit when something changes status.
//
// status:
//   "live"   — in daily use, the tile links out
//   "build"  — code exists, not deployed
//   "queued" — not started
export type Status = "live" | "build" | "queued";

export type Department = {
  name: string;
  description: string;
  host: string;
  status: Status;
};

export const DEPARTMENTS: Department[] = [
  {
    name: "Sales",
    description: "Sales performance tracking for the Malaysia team — targets, outlet and region rollups.",
    host: "sales.seedclmalaysiastore.com",
    status: "live",
  },
  {
    name: "Administration",
    description: "GM report dashboard — import POS files, edit the 13 report sections, export the HQ deck as PPTX.",
    host: "gmdashboard.seedclmalaysiastore.com",
    status: "live",
  },
  {
    name: "Human Resources",
    description: "Staff records, leave and claims, evaluation forms.",
    host: "hr.seedclmalaysiastore.com",
    status: "build",
  },
  {
    name: "Account",
    description: "AR collection, payables and cashflow — the figures that today land in Slide 14 by hand.",
    host: "account.seedclmalaysiastore.com",
    status: "build",
  },
  {
    name: "Marketing",
    description: "Campaign calendar, promotion performance, social and content pipeline.",
    host: "marketing.seedclmalaysiastore.com",
    status: "queued",
  },
  {
    name: "Customer Service",
    description: "WhatsApp inbox, power inquiries, returns and exchange cases.",
    host: "service.seedclmalaysiastore.com",
    status: "queued",
  },
  {
    name: "Warehouse",
    description: "Stock on hand, expiry watch, write-offs, shipments and stock issues.",
    host: "warehouse.seedclmalaysiastore.com",
    status: "queued",
  },
  {
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
