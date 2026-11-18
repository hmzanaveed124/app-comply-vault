/** Chart colours reference the central theme; SVG and Recharts inherit CSS variables. */
export const dashboardColors = {
  brand: "var(--cv-brand)",
  brandLight: "var(--cv-brand-light)",
  brandMid: "var(--cv-brand-mid)",
  brandDark: "var(--cv-brand-dark)",
  semanticDanger: "var(--cv-semantic-danger)",
  semanticWarning: "var(--cv-semantic-warning)",
  semanticOrange: "var(--cv-semantic-orange)",
  semanticCritical: "var(--cv-semantic-critical)",
  textMuted: "var(--cv-text-muted)",
  barTrack: "var(--cv-surface-muted)",
  forest: "var(--cv-brand-dark)",
  forest2: "var(--cv-brand-dark)",
  accent: "var(--cv-brand)",
  accentSoft: "var(--cv-brand-light)",
  amber: "var(--cv-semantic-warning)",
  amber2: "var(--cv-warning-highlight)",
  amberSoft: "var(--cv-warning-bg)",
  red: "var(--cv-semantic-danger)",
  redSoft: "var(--cv-danger-bg)",
  slate: "var(--cv-text-secondary)",
  slate2: "var(--cv-text-muted)",
  track: "var(--cv-surface-muted)",
  inkStrong: "var(--cv-text-primary)",
  ink2: "var(--cv-text-primary)",
  ink3: "var(--cv-text-secondary)",
  meetingTypes: {
    "Annual Review": "var(--cv-brand)",
    "Portfolio Review": "var(--cv-semantic-info)",
    "Quarterly Check-in": "var(--cv-semantic-orange)",
    Onboarding: "var(--cv-chart-aux)",
    Other: "var(--cv-text-muted)",
  } as Record<string, string>,
  flagCategories: {
    Suitability: "var(--cv-semantic-danger)",
    Documentation: "var(--cv-semantic-orange)",
    Disclosure: "var(--cv-semantic-warning)",
    "Risk Tolerance": "var(--cv-chart-aux)",
    "Fee Discussion": "var(--cv-text-muted)",
  } as Record<string, string>,
} as const;

export function meetingTypeColor(label: string): string {
  const key = Object.keys(dashboardColors.meetingTypes).find(
    (k) => k.toLowerCase() === label.trim().toLowerCase(),
  );
  if (key) return dashboardColors.meetingTypes[key]!;
  const lower = label.toLowerCase();
  if (lower.includes("annual"))
    return dashboardColors.meetingTypes["Annual Review"]!;
  if (lower.includes("portfolio"))
    return dashboardColors.meetingTypes["Portfolio Review"]!;
  if (lower.includes("quarter"))
    return dashboardColors.meetingTypes["Quarterly Check-in"]!;
  if (lower.includes("onboard"))
    return dashboardColors.meetingTypes.Onboarding!;
  return dashboardColors.meetingTypes.Other!;
}
