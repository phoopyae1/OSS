export const STATUS_ORDER = [
  "OPERATIONAL",
  "DEGRADED",
  "PARTIAL_OUTAGE",
  "MAJOR_OUTAGE",
  "MAINTENANCE"
];

export const STATUS_LABELS = {
  OPERATIONAL: "Operational",
  DEGRADED: "Degraded",
  PARTIAL_OUTAGE: "Partial outage",
  MAJOR_OUTAGE: "Major outage",
  MAINTENANCE: "Maintenance"
};

export const STATUS_COLORS = {
  OPERATIONAL: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DEGRADED: "bg-amber-100 text-amber-800 border-amber-200",
  PARTIAL_OUTAGE: "bg-orange-100 text-orange-800 border-orange-200",
  MAJOR_OUTAGE: "bg-rose-100 text-rose-800 border-rose-200",
  MAINTENANCE: "bg-slate-100 text-slate-800 border-slate-200"
};

export const overallStatus = (services) => {
  if (!services.length) {
    return "OPERATIONAL";
  }
  const worstIndex = services.reduce((worst, service) => {
    const index = STATUS_ORDER.indexOf(service.status);
    return index > worst ? index : worst;
  }, 0);
  return STATUS_ORDER[worstIndex];
};

export const groupServices = (services) => {
  const grouped = new Map();
  services.forEach((service) => {
    const category = service.category?.trim() || "General";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(service);
  });
  return Array.from(grouped.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
};
