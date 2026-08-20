// Nigerian bank list for withdrawal bank selection — unchanged from the
// original READAZHUB spec.
export const BANKS = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank",
  "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Jaiz Bank", "Keystone Bank",
  "Kuda Bank", "Lotus Bank", "Moniepoint Microfinance Bank", "OPay", "PalmPay",
  "Parallex Bank", "Polaris Bank", "Premium Trust Bank", "Providus Bank",
  "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank",
  "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)",
  "Unity Bank", "VFD Microfinance Bank", "Wema Bank", "Zenith Bank",
];

// PLACEHOLDER — replace with this brand's real bank account before real
// users deposit. Deposit UI stays fully functional with these placeholder
// values so the flow can be tested end-to-end before go-live.
// Real payment account for READAZHUB deposits.
// Variable name kept as OPAY_DETAILS for consistency with the original
// codebase this was duplicated from (not actually an OPay account).
export const OPAY_DETAILS = {
  bank: "Moniepoint MFB",
  accountNumber: "6606928220",
  accountName: "High 5ive Digital Enterprise",
};

// WhatsApp support/community group link, used on the Dashboard welcome
// banner, the first-login WelcomeModal, and the Settings "Contact
// Support" link.
export const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/JsP8DiC9zce4C2lYNHcfon?s=cl&p=a&ilr=1";

// Withdrawal window (WAT, Nigeria, UTC+1, no DST):
//   Monday - Saturday: 9:00 AM - 6:00 PM
//   Sunday:            11:00 AM - 4:00 PM
// Two different windows depending on day-of-week, per the brand's official
// VIP flyer — this replaced an earlier single daily 8AM-10PM window that
// didn't vary by day.
export function isWithinWithdrawalHours(now = new Date()) {
  // Compute WAT wall-clock day-of-week and hour by shifting the UTC time
  // forward 1 hour, rather than relying on the server/browser's local
  // timezone (which may not be WAT).
  const watMs = now.getTime() + 60 * 60 * 1000;
  const wat = new Date(watMs);
  const watDay = wat.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const watHour = wat.getUTCHours();

  if (watDay === 0) {
    // Sunday: 11:00 AM - 4:00 PM
    return watHour >= 11 && watHour < 16;
  }
  // Monday - Saturday: 9:00 AM - 6:00 PM
  return watHour >= 9 && watHour < 18;
}

// Human-readable withdrawal window text, kept here alongside the logic so
// UI copy can never drift out of sync with the actual isWithinWithdrawalHours()
// rule above.
export const WITHDRAWAL_HOURS_TEXT =
  "Withdrawals are available Monday–Saturday 9:00 AM–6:00 PM and Sunday 11:00 AM–4:00 PM (WAT). Please try again during withdrawal hours.";
