// ORPHANED — not imported anywhere. Was the Daily Reviews feature's
// content source (star-rating products), now superseded by
// utils/articles.js after the platform was changed to Read & Earn
// (reading articles instead of rating products). Left in place per this
// codebase's existing policy for dead code — harmless to keep, costs
// nothing at runtime since nothing imports it — but if this platform is
// ever renamed or handed to someone else, this file describes a feature
// that no longer exists in the live app.
//
// Static product set for the old Daily Reviews design. Kept as code (not
// a Firestore collection) since it was a small, curator-controlled
// rotation — same pattern utils/articles.js now uses. A day's featured
// set was chosen deterministically from this pool so every user saw the
// same products on the same day.
//
// image: hotlinked stock photo URL (Unsplash) — no image-upload pipeline
// exists in this app, so product photos were sourced from a public CDN
// rather than stored in the repo.
// price: illustrative Naira price for display only — NOT tied to any
// deposit/earnings amount, this was flavor content for the review widget.
export const PRODUCTS = [
  {
    id: "p1",
    name: "Wireless Earbuds Pro",
    category: "Gadgets",
    emoji: "🎧",
    price: 24500,
    description: "True wireless earbuds with active noise cancellation and 30-hour battery life via charging case.",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  },
  {
    id: "p2",
    name: "Smart Fitness Watch",
    category: "Watches",
    emoji: "⌚",
    price: 32000,
    description: "Tracks heart rate, sleep, and steps, with call and message notifications on a bright touch display.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
  },
  {
    id: "p3",
    name: "Portable Power Bank 20000mAh",
    category: "Gadgets",
    emoji: "🔋",
    price: 15500,
    description: "High-capacity power bank with dual USB output, enough to charge a phone 4-5 times on one charge.",
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&q=80",
  },
  {
    id: "p4",
    name: "Classic Leather Wristwatch",
    category: "Watches",
    emoji: "⌚",
    price: 18000,
    description: "Genuine leather strap with a stainless steel case — a simple analog watch for everyday wear.",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=80",
  },
  {
    id: "p5",
    name: "Bluetooth Speaker Mini",
    category: "Gadgets",
    emoji: "🔊",
    price: 12000,
    description: "Compact speaker with surprisingly deep bass, splash-resistant design, and 10-hour playtime.",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
  },
  {
    id: "p6",
    name: "LED Desk Lamp",
    category: "Home",
    emoji: "💡",
    price: 9500,
    description: "Adjustable brightness and color temperature, with a USB charging port built into the base.",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80",
  },
  {
    id: "p7",
    name: "USB-C Fast Charger",
    category: "Gadgets",
    emoji: "🔌",
    price: 7500,
    description: "20W fast-charging adapter, compatible with most modern phones — charges to 50% in about 30 minutes.",
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80",
  },
  {
    id: "p8",
    name: "Digital Sports Watch",
    category: "Watches",
    emoji: "⌚",
    price: 11000,
    description: "Shock-resistant digital watch with stopwatch, alarm, and backlight — built for daily training.",
    image: "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=400&q=80",
  },
  {
    id: "p9",
    name: "Wireless Phone Charger Pad",
    category: "Gadgets",
    emoji: "📱",
    price: 8500,
    description: "Slim charging pad for Qi-enabled phones — just place your phone down, no cable needed.",
    image: "https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?w=400&q=80",
  },
  {
    id: "p10",
    name: "Compact Travel Backpack",
    category: "Accessories",
    emoji: "🎒",
    price: 21000,
    description: "Water-resistant backpack with a padded laptop compartment, built for daily commuting or travel.",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80",
  },
  {
    id: "p11",
    name: "Noise-Cancelling Headphones",
    category: "Gadgets",
    emoji: "🎧",
    price: 38000,
    description: "Over-ear headphones with active noise cancellation, plush ear cushions, and up to 20-hour battery life.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
  },
  {
    id: "p12",
    name: "Minimalist Steel Watch",
    category: "Watches",
    emoji: "⌚",
    price: 16500,
    description: "Slim stainless steel case with a clean dial — a versatile watch that pairs with both casual and formal wear.",
    image: "https://images.unsplash.com/photo-1495856458515-0637185db551?w=400&q=80",
  },
  {
    id: "p13",
    name: "Mechanical Keyboard Compact",
    category: "Gadgets",
    emoji: "⌨️",
    price: 28000,
    description: "Tactile mechanical switches in a compact 60% layout, with RGB backlighting for typing and gaming.",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80",
  },
  {
    id: "p14",
    name: "Wireless Mouse Ergonomic",
    category: "Gadgets",
    emoji: "🖱️",
    price: 9000,
    description: "Contoured shape for all-day comfort, with a silent-click design and long battery life.",
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&q=80",
  },
  {
    id: "p15",
    name: "Ring Light with Tripod",
    category: "Gadgets",
    emoji: "💡",
    price: 13500,
    description: "Adjustable LED ring light with phone holder and tripod stand, ideal for video calls and content creation.",
    image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&q=80",
  },
  {
    id: "p16",
    name: "Smart Home Plug",
    category: "Home",
    emoji: "🔌",
    price: 6500,
    description: "Wi-Fi-enabled plug that lets you switch appliances on and off remotely from a phone app.",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80",
  },
  {
    id: "p17",
    name: "Portable Bluetooth Projector",
    category: "Gadgets",
    emoji: "📽️",
    price: 45000,
    description: "Compact mini projector with built-in speaker, great for movie nights or presentations on the go.",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80",
  },
  {
    id: "p18",
    name: "Aviator Sunglasses",
    category: "Accessories",
    emoji: "🕶️",
    price: 8000,
    description: "Classic metal-frame aviators with UV-protective polarized lenses.",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80",
  },
  {
    id: "p19",
    name: "Insulated Water Bottle",
    category: "Accessories",
    emoji: "🧴",
    price: 5500,
    description: "Double-wall stainless steel bottle that keeps drinks cold for 24 hours or hot for 12.",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80",
  },
  {
    id: "p20",
    name: "Car Phone Mount",
    category: "Gadgets",
    emoji: "🚗",
    price: 4500,
    description: "Dashboard and air-vent mount with a one-hand grip release, fits most phone sizes securely.",
    image: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&q=80",
  },
  {
    id: "p21",
    name: "Leather Wallet Slim",
    category: "Accessories",
    emoji: "👛",
    price: 9500,
    description: "Genuine leather cardholder wallet with a slim profile designed to fit comfortably in a front pocket.",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80",
  },
  {
    id: "p22",
    name: "Action Camera Waterproof",
    category: "Gadgets",
    emoji: "📷",
    price: 42000,
    description: "4K action camera with a waterproof case, built for sports, travel, and outdoor adventures.",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80",
  },
  {
    id: "p23",
    name: "Desktop Organizer Tray",
    category: "Home",
    emoji: "🗂️",
    price: 6000,
    description: "Multi-compartment tray for keeping stationery, chargers, and small accessories tidy on a desk.",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80",
  },
  {
    id: "p24",
    name: "Portable Blender USB",
    category: "Home",
    emoji: "🥤",
    price: 11500,
    description: "USB-rechargeable mini blender for smoothies on the go — no wall outlet needed.",
    image: "https://images.unsplash.com/photo-1570222094714-d0d448ed80d0?w=400&q=80",
  },
];

const PRODUCTS_PER_DAY = 3;

/**
 * Deterministically picks a fixed set of products for a given day-index,
 * so every user sees the identical set on the same calendar day —
 * required per spec, since this isn't a personalized feed.
 *
 * With 24 products at 3/day, a naive sequential window (dayIndex * 3 %
 * length) would repeat the exact same 3 products every 8 days, and
 * worse, day N and day N+8 would be identical neighbors of a sort. To
 * spread variety across a full 20-day span before things feel
 * repetitive, and to guarantee no two CONSECUTIVE days ever show the
 * identical 3 products, each day's start offset is shifted by a step
 * that's coprime with the pool size (7, vs pool size 24 — gcd(7,24)=1)
 * rather than the flat PRODUCTS_PER_DAY (3) step. A coprime step means
 * the starting index only repeats after cycling through all 24 possible
 * offsets, so consecutive days can't land on the same window, and the
 * full pattern doesn't repeat until day 24 — comfortably past the
 * requested 20-day span.
 */
const DAY_STEP = 7; // coprime with PRODUCTS.length (24) by construction

export function getTodaysProducts(dayIndex) {
  const start = (dayIndex * DAY_STEP) % PRODUCTS.length;
  const picked = [];
  for (let i = 0; i < PRODUCTS_PER_DAY; i++) {
    picked.push(PRODUCTS[(start + i) % PRODUCTS.length]);
  }
  return picked;
}
