// Canonical VIP plan data — single source of truth. Flat daily earnings only,
// no percentage/compound interest. Any component that needs to display or
// calculate against VIP plans should import from here rather than
// redefining these numbers.
//
// Numbers and plan-color names match the brand's official VIP flyer
// (9 tiers, VIP Starter -> VIP Sovereign). Hex values below are chosen to
// represent the flyer's named colors (GREEN, YELLOW, BLUE, PINK, ORANGE,
// TEAL, ASH, EMERALD, GOLD) rather than the earlier arbitrary palette.
export const VIPS = {
  vip1: { id: "vip1", label: "VIP Starter", amount: 3000, daily: 600, color: "#22C55E" },
  vip2: { id: "vip2", label: "VIP Builder", amount: 5000, daily: 900, color: "#EAB308" },
  vip3: { id: "vip3", label: "VIP Growth", amount: 9000, daily: 1400, color: "#3B82F6" },
  vip4: { id: "vip4", label: "VIP Prime", amount: 18000, daily: 2400, color: "#EC4899" },
  vip5: { id: "vip5", label: "VIP Elite", amount: 39000, daily: 5000, color: "#F97316" },
  vip6: { id: "vip6", label: "VIP Premier", amount: 60000, daily: 7100, color: "#14B8A6" },
  vip7: { id: "vip7", label: "VIP Executive", amount: 100000, daily: 9500, color: "#9CA3AF" },
  vip8: { id: "vip8", label: "VIP Diamond", amount: 150000, daily: 14500, color: "#10B981" },
  vip9: { id: "vip9", label: "VIP Sovereign", amount: 200000, daily: 21000, color: "#D4A017" },
};

export const VIP_LIST = Object.values(VIPS);
