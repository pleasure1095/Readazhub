// Article set for Read & Earn. Kept as code (not a Firestore collection)
// since this is a small, curator-controlled rotation — same pattern
// utils/products.js used for the earlier Daily Reviews (star-rating)
// design this replaces. A day's featured set is chosen deterministically
// from this pool so every user sees the identical articles on the same
// calendar day, required since this isn't a personalized feed.
//
// Each article's `body` is the full text shown when a user opens it —
// short enough to realistically read in a minute or two, long enough to
// feel like genuine content rather than a placeholder. Topics are general
// personal-finance / health / tech / life-skills interest, written to be
// useful on their own regardless of the earning mechanic attached to them.
export const ARTICLES = [
  {
    id: "a1",
    title: "Why a Budget Isn't a Cage",
    category: "Money",
    emoji: "💰",
    readMinutes: 2,
    summary: "Budgeting gets a bad reputation as restrictive. Here's a simpler way to think about it.",
    body: "Most people hear \"budget\" and picture a strict list of things they're no longer allowed to buy. That's the wrong mental model. A budget is really just a plan for where your money goes before it goes there, instead of finding out where it went after the fact. The simplest version of this is the 50/30/20 idea: roughly half your income to needs (rent, food, transport), a third to wants (the fun stuff), and a fifth to savings or debt repayment. You don't need an app or a spreadsheet to start — even writing your expected income and three or four major expenses on a piece of paper at the start of the month puts you ahead of most people. The real value isn't the tracking itself; it's that a plan turns \"I don't know where my money went\" into \"I chose to spend it here.\" That shift, more than any specific percentage, is what actually changes how people relate to money over time.",
  },
  {
    id: "a2",
    title: "The Two-Minute Rule for Getting Things Done",
    category: "Productivity",
    emoji: "⏱️",
    readMinutes: 2,
    summary: "A tiny habit that quietly clears out the small tasks that pile up and drain your energy.",
    body: "There's a simple productivity rule that sounds almost too obvious to matter: if a task takes less than two minutes, do it immediately instead of adding it to a list. Replying to a short message, washing the one cup in the sink, filing a document — these are exactly the kind of things that feel too small to plan for, so they pile up silently until there are twenty of them and the pile itself feels overwhelming. The two-minute rule works because it removes the decision-making overhead. You're not asking \"when should I do this?\" — you're just doing it, right now, because thinking about it would have taken as long as the task itself. This doesn't replace real planning for bigger projects, but it clears out the mental clutter that makes bigger projects feel harder to start. A surprising number of people report feeling calmer within a week of genuinely applying this, not because their workload changed, but because their sense of what's unfinished shrank.",
  },
  {
    id: "a3",
    title: "What Actually Happens When You Don't Drink Enough Water",
    category: "Health",
    emoji: "💧",
    readMinutes: 2,
    summary: "Mild dehydration is more common — and more disruptive — than most people realize.",
    body: "You don't need to be stranded in a desert to be dehydrated. Mild dehydration — losing as little as 1-2% of your body's water — is common in ordinary daily life, especially in hot climates, and it shows up in ways people rarely connect back to water intake: headaches, difficulty concentrating, irritability, and a feeling of fatigue that coffee doesn't quite fix. The body prioritizes water for critical functions first, so cognitive performance is often one of the earliest things to suffer, before you'd even describe yourself as thirsty. A reasonable target for most adults is around 2 to 3 litres a day from all sources, including food, though this varies with climate, activity, and body size — thirst itself is actually a fairly reliable guide for most healthy people, as long as you don't ignore it. The color of your urine is a simpler day-to-day check than counting glasses: pale yellow generally means you're doing fine, while consistently dark yellow is a sign to drink more. It's a small thing to pay attention to, but it's one of the cheapest, easiest levers you have for how you feel and think each day.",
  },
  {
    id: "a4",
    title: "Phone Battery Myths That Won't Die",
    category: "Tech",
    emoji: "🔋",
    readMinutes: 2,
    summary: "You don't need to fully drain your phone before charging it. Here's what actually matters.",
    body: "A lot of advice about phone batteries dates back to an older battery chemistry that most phones no longer use. Modern phones use lithium-ion batteries, which behave very differently from the nickel-based batteries common decades ago. You do NOT need to fully drain a lithium-ion battery before charging it — in fact, letting it repeatedly hit 0% is mildly harder on the battery's long-term health than topping it up more often. Charging overnight is also generally fine on modern phones, since they're smart enough to stop pulling power once they hit 100%. What actually does shorten battery lifespan over time is consistent exposure to heat — charging while the phone is under a pillow, in direct sun, or inside a thick case can gradually degrade capacity faster than the charging pattern itself. If you want one genuinely useful habit: try to avoid letting your phone sit at 100% charge in a hot car or in sunlight for extended periods, and don't stress about topping up to 40% in the middle of the day — that's not damaging anything.",
  },
  {
    id: "a5",
    title: "Why 'I'll Remember It' Usually Fails",
    category: "Productivity",
    emoji: "🧠",
    readMinutes: 2,
    summary: "The brain is bad at storage and good at processing — using it the wrong way costs you.",
    body: "There's a well-known idea in productivity circles that your brain is built for having ideas, not for holding onto them. This isn't just a nice turn of phrase — it reflects something real about how working memory functions. The mental effort of trying to remember a task (\"don't forget to call them back,\" \"I need to buy that before Friday\") occupies background attention even when you're not consciously thinking about it, a phenomenon researchers call the Zeigarnik effect: unfinished tasks linger in the mind more persistently than completed ones. This is part of why writing something down, even on a random scrap of paper, produces an almost immediate feeling of relief — you're not remembering the task anymore, the task is remembering itself. The practical takeaway isn't that you need an elaborate system; it's that a single trusted place to capture things — one notes app, one notebook, doesn't matter which — frees up mental bandwidth that was quietly being spent on remembering rather than doing.",
  },
  {
    id: "a6",
    title: "The Real Difference Between Saving and Investing",
    category: "Money",
    emoji: "📈",
    readMinutes: 2,
    summary: "They get used interchangeably, but they serve completely different purposes.",
    body: "Saving and investing often get lumped together as \"putting money aside,\" but they solve different problems and mixing them up can leave you exposed in the wrong direction. Saving is about certainty and access — money in a savings account isn't meant to grow much, it's meant to be there, untouched by risk, for emergencies or near-term goals. Investing is about accepting some uncertainty in exchange for the possibility of growth over a longer time horizon — the value can go down as well as up, sometimes significantly, in the short term. A common and costly mistake is treating investment money like emergency savings: putting money you might need next month into something that could lose 15% of its value that same month. The general rule worth remembering is that money you'll need within the next year or two belongs in savings, where its value is stable and accessible, while money you won't touch for several years or more is where investing starts to make more sense, because time gives short-term ups and downs room to smooth out.",
  },
  {
    id: "a7",
    title: "Why You Wake Up Tired Even After 8 Hours",
    category: "Health",
    emoji: "😴",
    readMinutes: 2,
    summary: "Sleep quantity gets all the attention, but sleep quality is often the real issue.",
    body: "Getting eight hours in bed and still waking up exhausted is one of the more confusing experiences people run into, and it usually comes down to sleep quality rather than sleep quantity. Sleep isn't a single uniform state — it cycles through stages roughly every 90 minutes, moving between lighter sleep, deep restorative sleep, and REM sleep, and waking up in the middle of a deep-sleep stage (even briefly, even if you don't remember it) tends to leave you feeling groggy regardless of the total hours logged. Common quality-disruptors include screen light close to bedtime (which delays the release of melatonin, the hormone that signals it's time to sleep), inconsistent sleep and wake times (which confuses your body's internal clock), caffeine late in the day lingering in your system for six or more hours, and a room that's too warm — the body actually sleeps better when it's slightly cool. If you're consistently tired despite enough time in bed, the fix usually isn't more hours; it's a more consistent schedule and a calmer wind-down in the 30-60 minutes before you actually try to sleep.",
  },
  {
    id: "a8",
    title: "The Compound Effect of Small Daily Habits",
    category: "Life Skills",
    emoji: "🌱",
    readMinutes: 2,
    summary: "Tiny, boring, repeated actions outperform occasional big efforts almost every time.",
    body: "It's tempting to believe meaningful change requires a dramatic, all-or-nothing effort — a total diet overhaul, an intense new routine, a complete life reset. In practice, small consistent actions almost always beat large occasional ones, for a simple mathematical reason: consistency compounds, and intensity without consistency doesn't. Reading ten pages a day sounds unimpressive next to \"read a book a week,\" but the first person who actually keeps doing it for a year finishes roughly 15-20 books, while the second person's ambitious plan usually collapses within a few weeks and produces far less. The same logic applies to saving, exercise, learning a skill, or almost anything else worth improving. The uncomfortable truth is that the boring, repeatable version of a habit is almost always the more effective one, precisely because it's sustainable — dramatic effort feels productive in the moment but is much harder to sustain, and a habit that stops being sustained stops compounding entirely.",
  },
  {
    id: "a9",
    title: "Why Your Wi-Fi Slows Down at Night",
    category: "Tech",
    emoji: "📶",
    readMinutes: 2,
    summary: "It's usually not your router's fault — it's shared infrastructure under peak load.",
    body: "If your internet consistently feels slower in the evening, the most likely explanation has nothing to do with your specific router or device — it's simply that everyone in your area is online at the same time. Internet service providers share bandwidth across a neighborhood or region through shared infrastructure, and evenings are peak usage hours almost everywhere, as people get home from work and start streaming, gaming, and browsing simultaneously. This is sometimes called network congestion, and it behaves a lot like a busy road at rush hour — the road itself hasn't changed, but there are more cars on it competing for the same space. A few things genuinely help within your own home: placing your router in a central, open location rather than a corner or cabinet, restarting it occasionally to clear temporary glitches, and checking whether other devices on your network are running large background downloads or updates without your noticing. But if the slowdown is specifically an evening pattern, it's worth knowing that some of it is simply outside your control, tied to how much total capacity your provider has allocated to your area.",
  },
  {
    id: "a10",
    title: "The Emergency Fund Number Nobody Agrees On",
    category: "Money",
    emoji: "🛟",
    readMinutes: 2,
    summary: "Three months of expenses? Six? The right answer depends more on your situation than a rule.",
    body: "Financial advice commonly quotes \"three to six months of expenses\" as the right emergency fund size, but this range exists precisely because there isn't one correct number — it depends heavily on how stable and how quickly replaceable your income is. Someone with a steady salaried job, a supportive family nearby, and no dependents can reasonably lean toward the lower end of that range, since their risk of a prolonged income gap is lower. Someone who is self-employed, has irregular income, or is the sole financial support for a household benefits from leaning toward the higher end, or even beyond six months, because their risk profile is genuinely different. The bigger mistake isn't picking the \"wrong\" number within that range — it's having no emergency fund at all and relying on borrowing when something unexpected happens, which often turns a temporary problem into an expensive long-term one through interest and fees. Starting with even one month of basic expenses set aside, then building from there, matters more than getting the theoretically perfect target on the first attempt.",
  },
  {
    id: "a11",
    title: "Why Multitasking Doesn't Actually Work",
    category: "Productivity",
    emoji: "🔀",
    readMinutes: 2,
    summary: "What feels like doing two things at once is really rapid switching — and it has a real cost.",
    body: "Multitasking feels efficient, but the brain doesn't actually process two demanding tasks simultaneously — what's really happening is rapid switching back and forth between them, and each switch carries a small but real cost, often called \"switch cost\" in cognitive research. Every time attention jumps from one task to another, there's a brief period where performance dips while the brain reorients — it has to drop the context of the first task and reload the context of the second. Do this often enough across a day, replying to messages while trying to write a report, checking notifications mid-conversation, and the accumulated cost can meaningfully slow down the actual work getting done, even though each individual switch feels instant and effortless. This is different from doing genuinely passive tasks alongside something else, like listening to music while cleaning, which doesn't compete for the same kind of focused attention. The practical lesson isn't that multitasking is a moral failing — it's that for anything requiring real concentration, batching similar tasks together and protecting short stretches of single-focus time tends to get more done, in less total time, than constant switching ever does.",
  },
  {
    id: "a12",
    title: "What Your Phone's 'Optimized Battery Charging' Actually Does",
    category: "Tech",
    emoji: "⚙️",
    readMinutes: 2,
    summary: "That setting you've probably never touched is quietly extending your battery's lifespan.",
    body: "Most modern phones include a setting, often buried under battery settings, called something like \"optimized charging\" or \"adaptive charging.\" It's easy to ignore, but it's doing something genuinely useful in the background. Instead of charging your phone straight to 100% the moment you plug it in overnight, the phone learns your typical wake-up time and deliberately pauses charging around 80%, only completing the final stretch to 100% shortly before you usually wake up. This matters because lithium-ion batteries experience more chemical stress sitting at a full 100% charge for extended periods than they do sitting at a partial charge — spending eight hours overnight fully charged, every single night, adds up in wear over months and years. By delaying that last 20% until closer to when you'll actually unplug and use the phone, the feature meaningfully reduces the total time spent at maximum charge without costing you anything in convenience, since the phone is still full by the time you need it. It's one of those quiet defaults worth leaving switched on rather than turning off for the sake of \"just charge it fully now.\"",
  },
  {
    id: "a13",
    title: "The Real Reason Deadlines Motivate You",
    category: "Life Skills",
    emoji: "⏳",
    readMinutes: 2,
    summary: "It's not about fear of failure — it's about how humans experience time and priority.",
    body: "Almost everyone has noticed that work somehow expands to fill the time available for it — give yourself a week for a task that could take two days, and it will, mysteriously, take most of the week. This isn't laziness; it's a well-documented pattern called Parkinson's Law. A closely related quirk is that humans are generally poor at prioritizing based on importance alone, but very good at prioritizing based on urgency, which is why an unimportant task with a deadline today often gets done before an important task with no deadline at all. Deadlines work as a motivational tool because they convert something abstract, \"I should eventually do this,\" into something concrete the brain treats as immediate. This is also why artificial deadlines, ones you set for yourself with no external enforcement, tend to be much less effective than real ones: without a real cost for missing them, the brain quietly recognizes there's no true urgency and deprioritizes the task anyway. If you want a self-imposed deadline to actually work, attaching a real external consequence, telling someone else your target, scheduling the next step with another person, tends to work far better than the date alone.",
  },
  {
    id: "a14",
    title: "Why Your Ears Pop on a Flight (and What Helps)",
    category: "Health",
    emoji: "✈️",
    readMinutes: 2,
    summary: "A small anatomical quirk explains the discomfort — and there are simple fixes.",
    body: "The popping, muffled feeling in your ears during takeoff and landing comes down to a small tube called the Eustachian tube, which connects your middle ear to the back of your throat and normally keeps air pressure equal on both sides of your eardrum. As a plane climbs or descends, cabin air pressure changes faster than that tube can naturally equalize, so pressure builds up on one side of the eardrum, creating that stretched, muffled sensation, and sometimes mild pain. The pop you feel when you yawn, swallow, or chew gum during a flight is literally that tube briefly opening and letting air rush through to equalize the pressure, which is why flight attendants often suggest swallowing or yawning during descent specifically, since that's when pressure changes fastest. Chewing gum works by triggering more frequent, natural swallowing without you having to think about it. For people who find this especially uncomfortable, a firm swallow combined with gently pinching the nose and blowing (known as the Valsalva maneuver) can help force the tube open manually. It's also part of why flying with a bad cold or blocked nose is more uncomfortable than usual — a congested Eustachian tube can't equalize as easily, which sometimes causes real pain rather than mild pressure.",
  },
  {
    id: "a15",
    title: "Why 'Free' Wi-Fi Isn't Always Worth the Risk",
    category: "Tech",
    emoji: "🔓",
    readMinutes: 2,
    summary: "Public networks carry real security tradeoffs most people never think about.",
    body: "Connecting to free public Wi-Fi at a café, airport, or shopping center feels harmless, but open networks (the ones with no password, or a shared password everyone knows) carry a genuine security tradeoff that's easy to overlook. On an open network, data traveling between your device and the router isn't automatically encrypted the way it is on your home network with a private password, which means, in theory, someone else on that same network with the right tools could intercept unencrypted traffic passing through it. Most everyday browsing today happens over HTTPS, which encrypts the connection to the website itself regardless of the Wi-Fi's own security, so it isn't as dangerous as it once was. The bigger risk tends to be things like logging into banking apps, entering payment details, or accessing sensitive accounts over networks you don't trust, since not every app or website enforces strong encryption equally well. A reasonable middle ground: casual browsing on public Wi-Fi is generally fine, but saving anything involving passwords, banking, or payment details for a trusted network, or using mobile data instead, is a small habit that meaningfully reduces real risk for very little inconvenience.",
  },
  {
    id: "a16",
    title: "Why Cutting Calories Alone Often Backfires",
    category: "Health",
    emoji: "🍽️",
    readMinutes: 2,
    summary: "Severe restriction triggers a response that works against the very goal it's meant to achieve.",
    body: "When people want to lose weight quickly, the instinct is often to cut calories drastically — but the body doesn't distinguish between an intentional diet and an actual food shortage, and it responds to both the same way: by slowing metabolism to conserve energy. This is sometimes called adaptive thermogenesis, and it's a big part of why very aggressive calorie cuts often produce fast early results that then stall, or even reverse, as the body adjusts and starts burning fewer calories at rest than it used to. Severe restriction also tends to increase hunger hormones and cravings over time, which is part of why extremely strict diets are so hard to sustain — it's not simply a lack of willpower, there's a real physiological pull working against the plan. A more sustainable approach usually involves a moderate, consistent calorie deficit rather than an extreme one, paired with adequate protein to help preserve muscle mass during weight loss. It's a less dramatic story than a crash diet, but it's far more likely to actually stick, and results that come from a sustainable pattern tend to last longer than results that came from a plan nobody could keep following.",
  },
  {
    id: "a17",
    title: "The Hidden Cost of Buying the Cheapest Option",
    category: "Money",
    emoji: "🏷️",
    readMinutes: 2,
    summary: "Sometimes the lowest sticker price is actually the more expensive choice over time.",
    body: "There's a useful idea, sometimes called the \"boots theory\" of poverty, that illustrates why the cheapest option isn't always the cheapest choice. A pair of cheap boots might cost a fraction of a durable pair, but if they wear out and need replacing three times over the same period the durable pair would have lasted, the total cost ends up higher, not lower, despite each individual purchase looking cheaper. This logic applies well beyond boots: cheap tools that break and need replacing, low-quality electronics that fail early, or appliances that cost less upfront but use more electricity over their lifespan can all end up costing more in total than a pricier alternative that lasts. This isn't an argument for always buying the most expensive option; it's an argument for evaluating cost per use or cost over time rather than sticker price alone, when the budget allows for that comparison. For anyone tight on cash in the moment, the cheaper option is still often the only realistic choice, and that's a real constraint, not a failure of judgment — but for anything you're buying anyway and can compare a few options on, thinking in terms of total cost of ownership rather than upfront price tends to save money in the long run.",
  },
  {
    id: "a18",
    title: "Why You Remember Songs From Years Ago Instantly",
    category: "Life Skills",
    emoji: "🎵",
    readMinutes: 2,
    summary: "Music sticks in memory in a way that's genuinely different from other information.",
    body: "It's a strange, common experience: you can forget a conversation from last week, but instantly recall every word of a song you haven't heard in a decade the moment it starts playing. This isn't a coincidence — music memory appears to work differently from other types of memory in the brain. Music engages multiple brain regions simultaneously, including areas tied to emotion, movement, and language, which means a song gets encoded through several different pathways at once rather than a single memory trace. This is part of why music memory tends to be unusually resilient, it's one of the last things affected in some forms of memory-related illness, precisely because it's stored so redundantly across different systems rather than in one fragile location. There's also a strong link between music and emotional memory specifically: songs tied to a particular period of life, a relationship, a specific event, get bundled together with the emotional context of that time, which is why a song can trigger not just the melody but a vivid sense of a specific moment, in a way that's much harder to replicate with plain facts or conversations.",
  },
  {
    id: "a19",
    title: "Why Charging Your Phone in the Sun Is a Bad Idea",
    category: "Tech",
    emoji: "🌡️",
    readMinutes: 2,
    summary: "Heat, not charging speed, is the biggest everyday threat to your battery's health.",
    body: "Of all the everyday habits that affect a phone battery's long-term health, heat is consistently the biggest factor, more than charging speed, more than how often you charge, more than which cable you use. Lithium-ion batteries degrade faster when kept at high temperatures, and the combination of direct sunlight, a phone actively charging (which generates its own heat), and a case trapping that heat in is close to a worst-case scenario for battery longevity. A phone charging on a windowsill in direct sun, or left in a hot car, can reach internal temperatures well beyond what's ideal, even if the phone itself doesn't feel dangerously hot to the touch in the moment. Over time, repeated heat exposure like this shows up as reduced maximum battery capacity, the phone simply doesn't hold as much charge as it used to, and a shorter overall battery lifespan. The fix costs nothing: charge your phone somewhere shaded and reasonably cool, avoid leaving it charging in direct sunlight or inside a hot car, and if you notice a phone getting unusually warm while charging, it's worth moving it somewhere cooler rather than assuming that's normal.",
  },
  {
    id: "a20",
    title: "The Simple Reason Goals Fail Without a System",
    category: "Life Skills",
    emoji: "🎯",
    readMinutes: 2,
    summary: "Setting a goal defines the destination — but it says nothing about how you'll get there.",
    body: "A goal like \"save more money\" or \"get fit this year\" describes a destination, but it says nothing about the actual path that gets you there, and that gap is where most goals quietly fail. A system, by contrast, is the specific repeatable process: automatically transferring a fixed amount to savings the day you're paid, or having gym clothes laid out the night before so getting there requires one less decision in the morning. Goals are useful for deciding direction, but systems are what actually produce the outcome, day after day, especially on the days motivation is low, which is most days for most people. This is why two people with the identical goal often end up in completely different places a year later: not because one wanted it more, but because one built a system that didn't depend on daily motivation, and the other relied on willpower alone, which is a genuinely limited and inconsistent resource. If a goal keeps failing despite real effort, it's often worth asking not \"how do I want it more\" but \"what specific, repeatable action would make progress toward this almost automatic\" — that shift, from wanting to systems, tends to be the actual difference between goals that stick and goals that don't.",
  },
];

const ARTICLES_PER_DAY = 3;

/**
 * Deterministically picks a fixed set of articles for a given day-index,
 * so every user sees the identical set on the same calendar day —
 * required per spec, since this isn't a personalized feed.
 *
 * Same coprime-step approach as the earlier products.js rotation: with 20
 * articles at 3/day, a naive sequential window (dayIndex * 3 % length)
 * would repeat the same 3 articles every ~6-7 days and land consecutive
 * days close together. A step of 7 is coprime with 20 (gcd(7,20)=1), so
 * the starting index only repeats after cycling through all 20 possible
 * offsets — consecutive days can't land on the same window, and the full
 * pattern doesn't repeat until day 20.
 */
const DAY_STEP = 7; // coprime with ARTICLES.length (20) by construction

export function getTodaysArticles(dayIndex) {
  const start = (dayIndex * DAY_STEP) % ARTICLES.length;
  const picked = [];
  for (let i = 0; i < ARTICLES_PER_DAY; i++) {
    picked.push(ARTICLES[(start + i) % ARTICLES.length]);
  }
  return picked;
}
