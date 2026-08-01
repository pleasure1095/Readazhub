// Two-level recurring referral bonus rates — single source of truth.
// Per the brand's official VIP flyer: Level 1 (direct referrer) earns 9%,
// Level 2 (referrer's own referrer) earns 2%.
//
// IMPORTANT — this is a RECURRING percentage of the referred user's
// actual DAILY EARNINGS (not a one-time bonus on the deposit amount, and
// not paid regardless of whether the referred user reviewed that day).
// Confirmed design: if the referred user misses a review day and earns
// ₦0 for that day, the referrer's bonus for that same day is also ₦0 —
// the referral bonus is always a strict percentage of what was ACTUALLY
// earned, for exactly as long as the referred user's investment earns.
export const REFERRAL_LEVEL_1_PCT = 0.09;
export const REFERRAL_LEVEL_2_PCT = 0.02;
