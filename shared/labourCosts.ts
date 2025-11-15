/**
 * Agency labour rates and day-block calculation utilities
 * All rates are in PENCE per hour and include CIS deductions, taxes, and agency fees
 */

export const AGENCY_RATES = {
  // Trade name -> hourly rate in pence (midpoint of range)
  "Labourer": 1375, // £13.75/hr (£13-14.5 range)
  "CCDO Labourer": 1700, // £17/hr
  "Groundworker": 1900, // £19/hr (£18-20 range)
  "Handyman": 1850, // £18.50/hr (£18-19 range)
  "Carpenter": 2600, // £26/hr (£24-28 range)
  "Steel Fixer": 2350, // £23.50/hr (£22-25 range)
  "Steel Erector": 2200, // £22/hr (£20-24 range)
  "Shuttering Carpenter": 2500, // £25/hr (£24-26 range)
  "Painter": 1800, // £18/hr (£17-19 range)
  "Bricklayer": 2650, // £26.50/hr (£25-28 range)
  "Hod Carrier": 1600, // £16/hr
  "Dryliner": 2300, // £23/hr (£22-24 range)
  "Cladding Fixer": 2200, // £22/hr (£20-24 range)
  "Tape and Jointer": 2200, // £22/hr
  "Tiler": 2000, // £20/hr (£18-22 range)
  "Plasterer": 2200, // £22/hr
  "Electrician": 2300, // £23/hr (£20-26 range, using mid)
  "Scaffolder": 2000, // £20/hr
  "PASMA Operator": 2300, // £23/hr (£22-24 range)
  "Dumper Driver": 1800, // £18/hr (£17-19 range)
  "Digger Driver": 1900, // £19/hr
  "360 Driver": 2000, // £20/hr
  "Telehandler": 1650, // £16.50/hr (£15-18 range)
  "Plumber": 2500, // £25/hr
} as const;

export type TradeName = keyof typeof AGENCY_RATES;

export const TRADE_NAMES = Object.keys(AGENCY_RATES) as TradeName[];

/**
 * Calculate day-blocks from HBXL hours
 * Any work under 8 hours = 1 full day
 * Over 8 hours = round up to nearest full day
 * 
 * Examples:
 * - 4 hours → 1 day
 * - 8 hours → 1 day
 * - 12 hours → 2 days (12 ÷ 8 = 1.5, rounds up)
 * - 16 hours → 2 days
 * - 20 hours → 3 days (20 ÷ 8 = 2.5, rounds up)
 */
export function calculateDayBlocks(hbxlHours: number): number {
  if (hbxlHours <= 0) return 0;
  if (hbxlHours <= 8) return 1;
  return Math.ceil(hbxlHours / 8);
}

/**
 * Calculate realistic labour cost using day-block system
 * 
 * @param hbxlHours - Hours from HBXL estimate
 * @param hourlyRateInPence - Agency hourly rate in pence (includes CIS/taxes)
 * @returns Object with dayBlocks, totalHours, and totalCostInPence
 * 
 * Example:
 * - 12 HBXL hours, £22/hr (2200 pence)
 * - 12 ÷ 8 = 1.5 → 2 day-blocks
 * - 2 days × 8 hours × 2200 pence = 35200 pence (£352)
 */
export function calculateDayBlockCost(
  hbxlHours: number,
  hourlyRateInPence: number
): {
  dayBlocks: number;
  totalHours: number;
  totalCostInPence: number;
  hourlyRate: number;
} {
  const dayBlocks = calculateDayBlocks(hbxlHours);
  const totalHours = dayBlocks * 8;
  const totalCostInPence = totalHours * hourlyRateInPence;

  return {
    dayBlocks,
    totalHours,
    totalCostInPence,
    hourlyRate: hourlyRateInPence,
  };
}

/**
 * Get agency rate for a trade
 * Returns null if trade not found
 */
export function getAgencyRate(trade: string): number | null {
  return AGENCY_RATES[trade as TradeName] ?? null;
}

/**
 * Format cost in pence to pounds string
 * Example: 35200 → "£352.00"
 */
export function formatCost(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Calculate cost comparison between HBXL estimate and day-block reality
 * 
 * @param hbxlHours - Hours from HBXL
 * @param hbxlCostInPence - Cost from HBXL (often unrealistic)
 * @param hourlyRateInPence - Agency hourly rate
 * @returns Comparison object with both costs and difference
 */
export function compareCosts(
  hbxlHours: number,
  hbxlCostInPence: number,
  hourlyRateInPence: number
): {
  hbxlCost: number;
  dayBlockCost: number;
  difference: number;
  percentageIncrease: number;
} {
  const dayBlockResult = calculateDayBlockCost(hbxlHours, hourlyRateInPence);
  const difference = dayBlockResult.totalCostInPence - hbxlCostInPence;
  const percentageIncrease = hbxlCostInPence > 0 
    ? (difference / hbxlCostInPence) * 100 
    : 0;

  return {
    hbxlCost: hbxlCostInPence,
    dayBlockCost: dayBlockResult.totalCostInPence,
    difference,
    percentageIncrease,
  };
}
