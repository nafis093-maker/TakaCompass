import { useReducer, useEffect } from "react";

const DICT = {
  en: {
    "app.name": "Hisab",
    "app.tagline": "Your money, in taka, made simple.",

    "nav.timeline": "Activity",
    "nav.wallets": "Wallets",
    "nav.budgets": "Budgets",
    "nav.plan": "Plan",
    "nav.more": "More",

    "lang.label": "Language",
    "lang.en": "English",
    "lang.bn": "বাংলা",

    "more.wrapped.t": "Hisab Wrapped",
    "more.wrapped.s": "Your month in money — animated & shareable",
    "more.review.t": "Review SMS",
    "more.review.s": "Confirm transactions spotted in your texts",
    "more.recurring.t": "Recurring & bills",
    "more.recurring.s": "Salary, rent, EMIs — auto-post and remind",
    "more.zakat.t": "Zakat calculator",
    "more.zakat.s": "2.5% of zakatable wealth above nisab",
    "more.export.t": "Export my data",
    "more.export.s": "Download everything as JSON (backup)",
    "more.restore.t": "Restore from backup",
    "more.restore.s": "Load a previously exported JSON file",
    "more.sync.t": "Cloud sync & backup",
    "more.sync.s": "Sync across devices (needs one-time setup)",
    "more.rates.t": "Rate sources (admin)",
    "more.rates.s": "Manage bank rate links shown in the marketplace",
    "more.sample.t": "Load sample data",
    "more.sample.s": "Explore the app with example numbers",
    "more.clear.t": "Clear all data",
    "more.clear.s": "Erase everything and start fresh",
    "more.signout.t": "Sign out",

    "welcome.tag": "Your money, in taka, made simple.",
    "welcome.f1.t": "See where it goes",
    "welcome.f1.s": "Wallets, budgets and clear charts of your spending.",
    "welcome.f2.t": "Add in seconds",
    "welcome.f2.s": "Speak it, snap a receipt, or pull it from an SMS.",
    "welcome.f3.t": "Plan ahead",
    "welcome.f3.s": "Goals, bills, Zakat and deposit maturities in one place.",
    "welcome.f4.t": "Stays on your device",
    "welcome.f4.s": "Your money data is kept locally, not on our servers.",
    "welcome.cta": "Get started",
    "welcome.note": "No account needed — you can continue as a guest.",

    "login.sub": "Your money, mapped. Track it, grow it, plan the big stuff — built for Bangladesh.",
    "login.google": "Continue with Google",
    "login.apple": "Continue with Apple",
    "login.guest": "Skip — just let me in",
    "login.connecting": "Connecting…",
    "login.fine": "No backend, no tracking. Your numbers stay in this browser, tied to your sign-in.",
    "home.hi": "Hello",
    "home.snapshot": "Here's your money snapshot",
    "home.total": "Total Amount",
    "home.thismonth": "This Month",
    "home.vslast": "vs last month",
    "home.savings": "Savings rate",
    "home.spent": "Spent",
    "home.healthy": "Healthy",
    "home.low": "Low",
    "home.over": "Over",
    "home.savsub": "Of income you kept",
    "home.spentsub": "Compared to last month",
    "home.insights": "Insights",
    "home.wrapped": "Wrapped",
    "home.addtxn": "Add a transaction to see your breakdown.",
    "home.greatjob": "Great job! You saved more this month 🚀",
    "home.wherewent": "Here's where your money went this month 📊",
    "seg.spending": "Spending",
    "seg.insights": "Insights",
    "seg.activity": "Activity",
    "voice.title": "Quick add by voice",
    "voice.sub": "Tap start, then just say it",
    "voice.start": "Start",
    "voice.prompt": "Say your amount now",
    "voice.listening": "Listening…",
    "voice.thanks": "Got it, thank you",
    "voice.heard": "Heard",
    "voice.err": "Sorry, I couldn't catch that",
    "voice.tryagain": "Try again",
    "voice.type": "Type instead",
    "voice.cancel": "Cancel",
    "voice.add": "Add",
    "voice.eg1": "e.g. 500 lunch",
    "voice.eg2": "e.g. 1200 groceries",
    "voice.eg3": "e.g. got salary 50000",
  },
  bn: {
    "app.name": "হিসাব",
    "app.tagline": "আপনার টাকার হিসাব, সহজে।",

    "nav.timeline": "লেনদেন",
    "nav.wallets": "ওয়ালেট",
    "nav.budgets": "বাজেট",
    "nav.plan": "পরিকল্পনা",
    "nav.more": "আরও",

    "lang.label": "ভাষা",
    "lang.en": "English",
    "lang.bn": "বাংলা",

    "more.wrapped.t": "হিসাব র‍্যাপড",
    "more.wrapped.s": "মাসের খরচের গল্প — অ্যানিমেটেড ও শেয়ারযোগ্য",
    "more.review.t": "এসএমএস যাচাই",
    "more.review.s": "মেসেজে পাওয়া লেনদেন নিশ্চিত করুন",
    "more.recurring.t": "নিয়মিত ও বিল",
    "more.recurring.s": "বেতন, ভাড়া, কিস্তি — স্বয়ংক্রিয় ও রিমাইন্ডার",
    "more.zakat.t": "যাকাত ক্যালকুলেটর",
    "more.zakat.s": "নিসাবের ওপরে সম্পদের ২.৫%",
    "more.export.t": "আমার ডেটা এক্সপোর্ট",
    "more.export.s": "সবকিছু JSON হিসেবে ডাউনলোড (ব্যাকআপ)",
    "more.restore.t": "ব্যাকআপ থেকে ফেরান",
    "more.restore.s": "আগের এক্সপোর্ট করা JSON ফাইল লোড করুন",
    "more.sync.t": "ক্লাউড সিংক ও ব্যাকআপ",
    "more.sync.s": "ডিভাইসের মধ্যে সিংক (একবার সেটআপ লাগবে)",
    "more.rates.t": "রেট সোর্স (অ্যাডমিন)",
    "more.rates.s": "মার্কেটপ্লেসের ব্যাংক রেট লিংক পরিচালনা",
    "more.sample.t": "নমুনা ডেটা লোড করুন",
    "more.sample.s": "উদাহরণ দিয়ে অ্যাপটি দেখুন",
    "more.clear.t": "সব ডেটা মুছুন",
    "more.clear.s": "সবকিছু মুছে নতুন করে শুরু",
    "more.signout.t": "সাইন আউট",

    "welcome.tag": "আপনার টাকার হিসাব, সহজে।",
    "welcome.f1.t": "টাকা কোথায় যায় দেখুন",
    "welcome.f1.s": "ওয়ালেট, বাজেট আর খরচের পরিষ্কার চার্ট।",
    "welcome.f2.t": "নিমেষেই যোগ করুন",
    "welcome.f2.s": "বলুন, রসিদের ছবি তুলুন, বা এসএমএস থেকে নিন।",
    "welcome.f3.t": "আগেভাগে পরিকল্পনা",
    "welcome.f3.s": "লক্ষ্য, বিল, যাকাত ও ডিপোজিট ম্যাচুরিটি এক জায়গায়।",
    "welcome.f4.t": "আপনার ডিভাইসেই থাকে",
    "welcome.f4.s": "আপনার ডেটা ডিভাইসেই থাকে, আমাদের সার্ভারে নয়।",
    "welcome.cta": "শুরু করুন",
    "welcome.note": "অ্যাকাউন্ট লাগবে না — অতিথি হিসেবে চালিয়ে যান।",

    "login.sub": "আপনার টাকার পূর্ণ হিসাব। ট্র্যাক করুন, বাড়ান, বড় পরিকল্পনা করুন — বাংলাদেশের জন্য তৈরি।",
    "login.google": "গুগল দিয়ে চালিয়ে যান",
    "login.apple": "অ্যাপল দিয়ে চালিয়ে যান",
    "login.guest": "এড়িয়ে যান — ঢুকে পড়ি",
    "login.connecting": "সংযুক্ত হচ্ছে…",
    "login.fine": "কোনো ব্যাকএন্ড নেই, ট্র্যাকিং নেই। আপনার তথ্য এই ব্রাউজারেই থাকে।",
    "home.hi": "হ্যালো",
    "home.snapshot": "আপনার টাকার ছবি দেখে নিন",
    "home.total": "মোট পরিমাণ",
    "home.thismonth": "এই মাস",
    "home.vslast": "গত মাসের তুলনায়",
    "home.savings": "সঞ্চয়ের হার",
    "home.spent": "খরচ",
    "home.healthy": "ভালো",
    "home.low": "কম",
    "home.over": "বেশি",
    "home.savsub": "আয়ের যে অংশ রেখেছেন",
    "home.spentsub": "গত মাসের তুলনায়",
    "home.insights": "বিশ্লেষণ",
    "home.wrapped": "র‍্যাপড",
    "home.addtxn": "বিভাজন দেখতে একটি লেনদেন যোগ করুন।",
    "home.greatjob": "দারুণ! এই মাসে বেশি সঞ্চয় করেছেন 🚀",
    "home.wherewent": "এই মাসে আপনার টাকা কোথায় গেছে দেখুন 📊",
    "seg.spending": "খরচ",
    "seg.insights": "বিশ্লেষণ",
    "seg.activity": "কার্যকলাপ",
    "voice.title": "কথা বলে যোগ করুন",
    "voice.sub": "স্টার্ট চাপুন, তারপর বলুন",
    "voice.start": "শুরু",
    "voice.prompt": "এখন আপনার পরিমাণ বলুন",
    "voice.listening": "শুনছি…",
    "voice.thanks": "পেয়েছি, ধন্যবাদ",
    "voice.heard": "শুনেছি",
    "voice.err": "দুঃখিত, ধরতে পারিনি",
    "voice.tryagain": "আবার চেষ্টা করুন",
    "voice.type": "টাইপ করুন",
    "voice.cancel": "বাতিল",
    "voice.add": "যোগ করুন",
    "voice.eg1": "যেমন ৫০০ দুপুরের খাবার",
    "voice.eg2": "যেমন ১২০০ বাজার",
    "voice.eg3": "যেমন বেতন পেলাম ৫০০০০",
  },
};

let lang = "en";
try { lang = localStorage.getItem("taka:lang") || "en"; } catch {}
const subs = new Set();

export function getLang() { return lang; }
export function setLang(l) {
  lang = (l === "bn" ? "bn" : "en");
  try { localStorage.setItem("taka:lang", lang); document.documentElement.setAttribute("lang", lang); } catch {}
  subs.forEach((f) => f());
}
export function t(key) {
  const table = DICT[lang] || DICT.en;
  return (key in table) ? table[key] : (DICT.en[key] != null ? DICT.en[key] : key);
}
const MON_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MON_BN = ["জানু","ফেব্রু","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টে","অক্টো","নভে","ডিসে"];
const CAT_BN = { food:"খাবার ও পানীয়", shopping:"কেনাকাটা", transport:"যাতায়াত", home:"বাসা", bills:"বিল ও ফি", fun:"বিনোদন", car:"গাড়ি", travel:"ভ্রমণ", family:"পরিবার", health:"স্বাস্থ্য", education:"শিক্ষা", groceries:"বাজার", other:"অন্যান্য", salary:"বেতন", business:"ব্যবসা", gift:"উপহার", investment:"বিনিয়োগ", other_in:"অন্যান্য" };
const BN_DIG = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
export function catLabel(key, enLabel) { return (lang === "bn" && CAT_BN[key]) ? CAT_BN[key] : enLabel; }
export function mon(mk) { const i = parseInt(String(mk).slice(5,7),10)-1; return (lang==="bn"?MON_BN:MON_EN)[i] || ""; }
export function D(x) { return lang === "bn" ? String(x).replace(/[0-9]/g, (d)=>BN_DIG[+d]) : String(x); }
export function ttsLang() { return lang === "bn" ? "bn-BD" : "en-US"; }
export function srLang() { return lang === "bn" ? "bn-BD" : "en-US"; }

export function useLang() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  return lang;
}
