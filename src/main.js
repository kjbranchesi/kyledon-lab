import { recipes } from "./data/recipes.js";

const state = {
  search: "",
  protein: "all",
  cuisine: "all",
  spice: "all",
  listMode: "all", // "all" | "favorites" | "cooked"
  batch: "2",
  selectedId: null,
  selectionSource: "none", // "none" | "list" | "hash" | "plan"
  ignoreNextHashChange: false,
  showFilters: false,
  showShoppingList: false,
  showCookMode: false,
  cookModeId: null,
  cookModeChecks: {}, // { [stepIndex: number]: true }
  keepAwake: false,
  weeklyPlan: null,
  planAnimation: null, // { type: "generate"|"shuffle"|"swap", slotIndex?: number }
  favorites: new Set(),
  cooked: {}, // { [id: number]: { times: number, lastCookedAt: string, rating?: number } }
  userDataLoaded: false,
  showLandingPage: true,
};

const proteinOptions = [
  ["all", "🍱", "All"],
  ["Tofu", "🧊", "Tofu"],
  ["Chicken", "🍗", "Chicken"],
  ["Beef", "🥩", "Beef"],
  ["Pork", "🥓", "Pork"],
  ["Seafood", "🐟", "Seafood"],
  ["Vegan", "🥦", "Vegan"],
  ["Egg", "🥚", "Egg"],
  ["Mixed", "🍲", "Mixed"],
];

const cuisineOptions = [
  ["all", "🌏", "All"],
  ["Chinese", "🥡", "Chinese"],
  ["Japanese", "🍱", "Japanese"],
  ["Korean", "🔥", "Korean"],
  ["Thai", "🌶️", "Thai"],
  ["Vietnamese", "🍜", "Viet"],
  ["Indian", "🪔", "Indian"],
  ["Mediterranean", "🌿", "Med"],
  ["Italian", "🍝", "Italian"],
  ["Mexican", "🌮", "Mex"],
  ["Fusion", "✨", "Fusion"],
  ["Other", "🍽️", "Other"],
];

const spiceOptions = [
  ["all", "🌶️", "All"],
  ["mild", "🙂", "Mild"],
  ["medium", "🌶️", "Medium"],
  ["hot", "🔥", "Hot"],
];

const mediaQuery = window.matchMedia("(max-width: 960px)");
mediaQuery.addEventListener("change", () => render());

const app = document.getElementById("app");

const WEEK_PLAN_STORAGE_PREFIX = "riceLab.weekPlan.";
const WEEK_PLAN_SLOTS = ["Pick 1", "Pick 2", "Pick 3"];
const USER_DATA_STORAGE_KEY = "riceLab.userData.v1";
const LAB_QUESTS = [
  {
    id: "acid",
    emoji: "🍋",
    title: "Acid Spark",
    description: "Brighten at the end: lemon/lime or a splash of vinegar.",
  },
  {
    id: "crunch",
    emoji: "👹",
    title: "Crunch Gremlin",
    description: "Add a crunchy topper: fried shallots, sesame seeds, or nuts.",
  },
  {
    id: "umami",
    emoji: "🍄",
    title: "Umami Button",
    description: "Boost depth: miso, fish sauce, or a tiny pinch of MSG.",
  },
  {
    id: "fat",
    emoji: "🥄",
    title: "Gloss Boss",
    description: "Finish with 1 tsp good oil (sesame or olive) for sheen.",
  },
  {
    id: "heat",
    emoji: "🔥",
    title: "Heat Dial",
    description: "Add chili crisp/gochugaru to taste — stop when it feels alive.",
  },
  {
    id: "green",
    emoji: "🌿",
    title: "Green Confetti",
    description: "Finish with herbs or scallions for lift.",
  },
  {
    id: "pickle",
    emoji: "🥒",
    title: "Pickle Pop",
    description: "Serve with something tangy-crunchy (kimchi or quick pickle).",
  },
];

function formatLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCurrentWeekKey() {
  return formatLocalDateKey(getWeekStart());
}

function getWeekLabel(weekStart) {
  return `Week of ${weekStart.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
}

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function storageRemove(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadWeekPlan(weekKey) {
  const raw = storageGet(`${WEEK_PLAN_STORAGE_PREFIX}${weekKey}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.weekKey !== weekKey) return null;
    if (!Array.isArray(parsed.slots) || parsed.slots.length !== 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveWeekPlan(plan) {
  if (!plan?.weekKey) return false;
  return storageSet(`${WEEK_PLAN_STORAGE_PREFIX}${plan.weekKey}`, JSON.stringify(plan));
}

function removeWeekPlan(weekKey) {
  return storageRemove(`${WEEK_PLAN_STORAGE_PREFIX}${weekKey}`);
}

function ensureCurrentWeekPlanLoaded() {
  const weekKey = getCurrentWeekKey();
  if (state.weeklyPlan?.weekKey === weekKey) return;
  state.weeklyPlan = loadWeekPlan(weekKey);
}

function loadUserData() {
  const raw = storageGet(USER_DATA_STORAGE_KEY);
  if (!raw) {
    return { favorites: new Set(), cooked: {} };
  }

  try {
    const parsed = JSON.parse(raw);
    const favorites = new Set(
      Array.isArray(parsed?.favorites)
        ? parsed.favorites.filter((id) => typeof id === "number")
        : []
    );

    const cooked = typeof parsed?.cooked === "object" && parsed.cooked ? parsed.cooked : {};
    const normalizedCooked = {};
    for (const [idStr, record] of Object.entries(cooked)) {
      const id = parseInt(idStr, 10);
      if (Number.isNaN(id)) continue;
      if (!record || typeof record !== "object") continue;
      const times = typeof record.times === "number" && record.times > 0 ? record.times : 1;
      const lastCookedAt = typeof record.lastCookedAt === "string" ? record.lastCookedAt : new Date().toISOString();
      const rating =
        typeof record.rating === "number" && record.rating >= 1 && record.rating <= 5 ? record.rating : undefined;
      normalizedCooked[id] = { times, lastCookedAt, ...(rating ? { rating } : {}) };
    }

    return { favorites, cooked: normalizedCooked };
  } catch {
    return { favorites: new Set(), cooked: {} };
  }
}

function saveUserData() {
  const payload = {
    favorites: Array.from(state.favorites.values()),
    cooked: state.cooked,
  };
  storageSet(USER_DATA_STORAGE_KEY, JSON.stringify(payload));
}

function ensureUserDataLoaded() {
  if (state.userDataLoaded) return;
  const data = loadUserData();
  state.favorites = data.favorites;
  state.cooked = data.cooked;
  state.userDataLoaded = true;
}

function isFavorite(id) {
  return state.favorites.has(id);
}

function getCookedRecord(id) {
  return state.cooked?.[id] || null;
}

function formatShortDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toggleFavorite(id) {
  ensureUserDataLoaded();
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  saveUserData();
  render();
}

function markCooked(id) {
  ensureUserDataLoaded();
  const existing = state.cooked[id];
  const times = (existing?.times || 0) + 1;
  const rating = existing?.rating;
  state.cooked[id] = { times, lastCookedAt: new Date().toISOString(), ...(rating ? { rating } : {}) };
  saveUserData();
  render();
}

function clearCooked(id) {
  ensureUserDataLoaded();
  if (!state.cooked[id]) return;
  delete state.cooked[id];
  saveUserData();
  render();
}

function setCookedRating(id, rating) {
  ensureUserDataLoaded();
  if (rating < 1 || rating > 5) return;
  const existing = state.cooked[id];
  const times = existing?.times || 1;
  const lastCookedAt = existing?.lastCookedAt || new Date().toISOString();
  state.cooked[id] = { times, lastCookedAt, rating };
  saveUserData();
  render();
}

function deepClone(value) {
  if (typeof window.structuredClone === "function") {
    return window.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function syncFromHash() {
  const hash = window.location.hash;
  if (hash.startsWith("#recipe-")) {
    const id = parseInt(hash.replace("#recipe-", ""), 10);
    if (!Number.isNaN(id)) {
      state.selectedId = id;
      state.selectionSource = "hash";
      state.showLandingPage = false;
    }
    return;
  }

  if (state.selectionSource === "hash") {
    state.selectedId = null;
    state.selectionSource = "none";
  }
}

function setRecipeHash(id) {
  state.ignoreNextHashChange = true;
  window.location.hash = `recipe-${id}`;
}

function clearRecipeHash() {
  history.pushState("", document.title, window.location.pathname + window.location.search);
}

window.addEventListener("hashchange", () => {
  if (state.ignoreNextHashChange) {
    state.ignoreNextHashChange = false;
    return;
  }
  syncFromHash();
  render();
});

let wakeLockSentinel = null;

async function enableWakeLock() {
  if (!("wakeLock" in navigator) || typeof navigator.wakeLock?.request !== "function") return false;
  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    return true;
  } catch {
    wakeLockSentinel = null;
    return false;
  }
}

async function disableWakeLock() {
  if (!wakeLockSentinel) return;
  try {
    await wakeLockSentinel.release();
  } catch {
    // ignore
  } finally {
    wakeLockSentinel = null;
  }
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && state.keepAwake && state.showCookMode) {
    await enableWakeLock();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.showFilters) {
    state.showFilters = false;
    render();
  }
  if (e.key === "Escape" && state.showShoppingList) {
    state.showShoppingList = false;
    render();
  }
  if (e.key === "Escape" && state.showCookMode) {
    state.showCookMode = false;
    state.cookModeId = null;
    state.cookModeChecks = {};
    state.keepAwake = false;
    disableWakeLock();
    render();
  }
});

function isMobile() {
  return mediaQuery.matches;
}

function getProteinEmoji(type) {
  const map = {
    Tofu: "🧊",
    Chicken: "🍗",
    Beef: "🥩",
    Pork: "🥓",
    Seafood: "🐟",
    Vegan: "🥦",
    Egg: "🥚",
    Mixed: "🍲",
  };
  return map[type] || "🍱";
}

function getCuisineEmoji(type) {
  const map = {
    Chinese: "🥡",
    Japanese: "🍱",
    Korean: "🔥",
    Thai: "🌶️",
    Vietnamese: "🍜",
    Indian: "🪔",
    Mediterranean: "🌿",
    Italian: "🍝",
    Mexican: "🌮",
    Fusion: "✨",
    Other: "🍽️",
  };
  return map[type] || "🌏";
}

function adjustForBatch(text, batch) {
  if (batch !== "1") return text;
  return text
    .replace(/2 rice-cooker cups/gi, "1 rice-cooker cup")
    .replace(/2 rice cooker cups/gi, "1 rice-cooker cup")
    .replace(/2-cup line/gi, "1-cup line")
    .replace(/2 cup line/gi, "1-cup line")
    .replace(/2 cups/gi, "1 cup")
    .replace(/2-cup/gi, "1-cup");
}

function formatValue(value) {
  const rounded = Math.round(value * 4) / 4;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracMap = {
    0.25: "¼",
    0.5: "½",
    0.75: "¾",
  };

  const fracChar = fracMap[frac];
  if (!fracChar) return rounded.toString();
  if (whole === 0) return fracChar;
  return `${whole}${fracChar}`;
}

function formatRange(min, max, unit, factor) {
  const a = min * factor;
  const b = max * factor;
  if (Math.abs(a - b) < 0.001) return `${formatValue(a)} ${unit}`;
  return `${formatValue(a)}–${formatValue(b)} ${unit}`;
}

function hasMeasuredAmounts(text) {
  return /\b\d+(?:\.\d+)?\s*(?:tbsp|tablespoon|tsp|teaspoon|cup|cups)\b/i.test(text);
}

function getSpiceLevel(recipe) {
  const haystack = `${recipe.sauces} ${(recipe.tags || []).join(" ")}`.toLowerCase();
  if (haystack.includes("spicy")) return { label: "Hot", score: 2 };
  if (/\b(chili|chilli|gochujang|gochugaru|chili oil|chili crisp|curry paste|doubanjiang|sambal)\b/i.test(haystack)) {
    return { label: "Medium", score: 1 };
  }
  return { label: "Mild", score: 0 };
}

function normalizeConstraints(constraints) {
  return {
    protein: constraints?.protein || "all",
    cuisine: constraints?.cuisine || "all",
    spice: constraints?.spice || "all",
  };
}

function getConstraintsFromState() {
  return { protein: state.protein, cuisine: state.cuisine, spice: state.spice };
}

function getCandidateRecipesForConstraints(constraints) {
  const c = normalizeConstraints(constraints);
  return recipes.filter((r) => {
    if (c.protein !== "all" && r.proteinType !== c.protein) return false;
    if (c.cuisine !== "all" && r.cuisine !== c.cuisine) return false;
    if (c.spice !== "all" && getSpiceLevel(r).label.toLowerCase() !== c.spice) return false;
    return true;
  });
}

function getLastWeekKey(weekKey) {
  const [year, month, day] = weekKey.split("-").map((n) => parseInt(n, 10));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 7);
  return formatLocalDateKey(date);
}

function getLastWeekRecipeIds(currentWeekKey) {
  const lastWeekKey = getLastWeekKey(currentWeekKey);
  if (!lastWeekKey) return new Set();
  const lastPlan = loadWeekPlan(lastWeekKey);
  const ids = (lastPlan?.slots || [])
    .map((s) => s?.id)
    .filter((id) => typeof id === "number");
  return new Set(ids);
}

function pickBestCandidate(candidates, selected) {
  if (!candidates.length) return null;

  const cuisines = new Set(selected.map((r) => r.cuisine));
  const proteins = new Set(selected.map((r) => r.proteinType));
  const spices = new Set(selected.map((r) => getSpiceLevel(r).label));

  let bestScore = -Infinity;
  let best = [];

  for (const recipe of candidates) {
    let score = 0;
    if (!cuisines.has(recipe.cuisine)) score += 3;
    if (!proteins.has(recipe.proteinType)) score += 2;
    if (!spices.has(getSpiceLevel(recipe).label)) score += 1;

    score += Math.random() * 0.01; // tie-break

    if (score > bestScore) {
      bestScore = score;
      best = [recipe];
    } else if (Math.abs(score - bestScore) < 0.001) {
      best.push(recipe);
    }
  }

  if (!best.length) return null;
  return best[Math.floor(Math.random() * best.length)];
}

function buildWeekPlan(weekKey, constraints, existingPlan = null) {
  const normalizedConstraints = normalizeConstraints(constraints);
  const lastWeekIds = getLastWeekRecipeIds(weekKey);

  let candidates = getCandidateRecipesForConstraints(normalizedConstraints);
  let usedFallback = false;
  if (candidates.length < 3) {
    candidates = recipes.slice();
    usedFallback = true;
  }

  const candidatesWithoutLastWeek = candidates.filter((r) => !lastWeekIds.has(r.id));
  if (candidatesWithoutLastWeek.length >= 3) {
    candidates = candidatesWithoutLastWeek;
  }

  const baseSlots = existingPlan?.slots?.length === 3 ? existingPlan.slots : [{}, {}, {}];
  const nextSlots = baseSlots.map((slot) => ({
    id: typeof slot.id === "number" ? slot.id : null,
    locked: Boolean(slot.locked),
    swaps: typeof slot.swaps === "number" ? slot.swaps : 0,
  }));

  const selectedRecipes = [];
  const usedIds = new Set();
  for (const slot of nextSlots) {
    if (!slot.locked || typeof slot.id !== "number") continue;
    const recipe = recipes.find((r) => r.id === slot.id);
    if (!recipe) continue;
    selectedRecipes.push(recipe);
    usedIds.add(recipe.id);
  }

  let available = candidates.filter((r) => !usedIds.has(r.id));
  for (let i = 0; i < nextSlots.length; i += 1) {
    const slot = nextSlots[i];
    if (slot.locked && typeof slot.id === "number") continue;

    const chosen = pickBestCandidate(available, selectedRecipes);
    if (!chosen) {
      slot.id = null;
      continue;
    }

    slot.id = chosen.id;
    usedIds.add(chosen.id);
    selectedRecipes.push(chosen);
    available = available.filter((r) => r.id !== chosen.id);
  }

  const [year, month, day] = weekKey.split("-").map((n) => parseInt(n, 10));
  const weekStart = new Date(year, month - 1, day);
  weekStart.setHours(0, 0, 0, 0);
  const plan = {
    weekKey,
    weekLabel: getWeekLabel(weekStart),
    createdAt: existingPlan?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    constraints: normalizedConstraints,
    usedFallback,
    shuffleCount: typeof existingPlan?.shuffleCount === "number" ? existingPlan.shuffleCount : 0,
    slots: nextSlots,
  };

  return plan;
}

function setWeekPlan(plan, animation) {
  state.weeklyPlan = plan;
  state.planAnimation = animation || null;
  saveWeekPlan(plan);
  render();

  if (state.planAnimation) {
    window.setTimeout(() => {
      state.planAnimation = null;
      render();
    }, 360);
  }
}

function generateCurrentWeekPlanFromState() {
  const weekKey = getCurrentWeekKey();
  const constraints = getConstraintsFromState();
  const plan = buildWeekPlan(weekKey, constraints, null);
  setWeekPlan(plan, { type: "generate" });
}

function reshuffleCurrentWeekPlan(plan, constraintsOverride = null) {
  const weekKey = getCurrentWeekKey();
  const constraints = constraintsOverride ? normalizeConstraints(constraintsOverride) : plan?.constraints || getConstraintsFromState();
  const basePlan = plan && plan.weekKey === weekKey ? plan : null;
  const next = buildWeekPlan(weekKey, constraints, basePlan);
  next.shuffleCount = (basePlan?.shuffleCount || 0) + 1;
  setWeekPlan(next, { type: "shuffle" });
}

function swapCurrentWeekPlanSlot(plan, slotIndex) {
  const weekKey = getCurrentWeekKey();
  if (!plan || plan.weekKey !== weekKey) return;
  if (slotIndex < 0 || slotIndex > 2) return;
  if (plan.slots?.[slotIndex]?.locked) return;

  const constraints = plan.constraints || getConstraintsFromState();
  const lastWeekIds = getLastWeekRecipeIds(weekKey);

  let candidates = getCandidateRecipesForConstraints(constraints);
  if (candidates.length < 3) candidates = recipes.slice();

  const candidatesWithoutLastWeek = candidates.filter((r) => !lastWeekIds.has(r.id));
  if (candidatesWithoutLastWeek.length >= 3) {
    candidates = candidatesWithoutLastWeek;
  }

  const otherIds = new Set(
    plan.slots
      .map((s, idx) => (idx === slotIndex ? null : s?.id))
      .filter((id) => typeof id === "number")
  );

  const selectedOther = recipes.filter((r) => otherIds.has(r.id));
  const available = candidates.filter((r) => !otherIds.has(r.id));
  const chosen = pickBestCandidate(available, selectedOther);
  if (!chosen) return;

  const next = deepClone(plan);
  next.updatedAt = new Date().toISOString();
  next.slots[slotIndex].id = chosen.id;
  next.slots[slotIndex].swaps = (next.slots[slotIndex].swaps || 0) + 1;
  setWeekPlan(next, { type: "swap", slotIndex });
}

function toggleCurrentWeekPlanLock(plan, slotIndex) {
  const weekKey = getCurrentWeekKey();
  if (!plan || plan.weekKey !== weekKey) return;
  if (slotIndex < 0 || slotIndex > 2) return;
  const next = deepClone(plan);
  next.updatedAt = new Date().toISOString();
  next.slots[slotIndex].locked = !next.slots[slotIndex].locked;
  setWeekPlan(next, { type: "swap", slotIndex });
}

function clearCurrentWeekPlan() {
  const weekKey = getCurrentWeekKey();
  removeWeekPlan(weekKey);
  state.weeklyPlan = null;
  state.showShoppingList = false;
  state.planAnimation = { type: "shuffle" };
  render();
  window.setTimeout(() => {
    state.planAnimation = null;
    render();
  }, 240);
}

function getChefNotes(recipe) {
  const factor = state.batch === "1" ? 0.5 : 1;
  const cuisine = recipe.cuisine;
  const sauceText = recipe.sauces.toLowerCase();

  const saucePack = [];
  const finishPack = [];
  const heatPack = [];

  const addSauce = (min, max, unit, ingredient) => {
    saucePack.push(`${formatRange(min, max, unit, factor)} ${ingredient}`);
  };
  const addFinish = (min, max, unit, ingredient) => {
    finishPack.push(`${formatRange(min, max, unit, factor)} ${ingredient}`);
  };
  const addHeat = (min, max, unit, ingredient) => {
    heatPack.push(`${formatRange(min, max, unit, factor)} ${ingredient}`);
  };

  const addSauceText = (text) => saucePack.push(text);
  const addFinishText = (text) => finishPack.push(text);
  const addHeatText = (text) => heatPack.push(text);

  if (cuisine === "Japanese") {
    addSauce(1, 2, "tbsp", "soy sauce (or tamari)");
    if (sauceText.includes("mirin")) addSauce(1, 2, "tbsp", "mirin");
    if (sauceText.includes("miso")) addSauce(1, 1.5, "tbsp", "miso (stir in after cooking)");
    addSauce(0.5, 1, "tsp", "sugar (optional, balances salt)");
    addFinish(1, 2, "tsp", "toasted sesame oil (finish)");
    addFinish(1, 2, "tsp", "rice vinegar or yuzu/lemon (finish)");
    addHeat(0.5, 1.5, "tsp", "shichimi togarashi or chili crisp (optional)");
  } else if (cuisine === "Korean") {
    addSauce(1, 2, "tbsp", "gochujang (mix into liquid)");
    addSauce(1, 2, "tbsp", "soy sauce");
    addSauce(0.5, 1.5, "tsp", "sugar (balances heat)");
    addFinish(1, 2, "tsp", "toasted sesame oil (finish)");
    addFinish(1, 2, "tsp", "rice vinegar (finish, optional but great)");
    addHeat(0.5, 2, "tsp", "gochugaru or chili crisp (optional)");
  } else if (cuisine === "Thai") {
    addSauce(1, 2, "tbsp", "curry paste (mix into liquid)");
    addSauce(1, 2, "tsp", "fish sauce (or soy sauce)");
    addSauce(1, 2, "tsp", "sugar (balances curry + salt)");
    addFinish(1, 2, "tsp", "lime juice (finish)");
    addFinish(1, 2, "tsp", "neutral oil or coconut cream (finish, optional)");
    addHeat(0.5, 2, "tsp", "chili oil or fresh chili (optional)");
  } else if (cuisine === "Vietnamese") {
    addSauce(1, 2, "tsp", "fish sauce (or soy sauce)");
    addSauce(1, 2, "tsp", "sugar");
    addSauceText("Garlic + black pepper are your best friends here.");
    addFinish(1, 2, "tsp", "lime (finish)");
    addFinish(1, 2, "tsp", "neutral oil (finish, optional)");
    addHeat(0.5, 2, "tsp", "chili crisp or sliced chili (optional)");
  } else if (cuisine === "Indian") {
    addSauce(0.5, 1, "tsp", "salt (plus more to taste)");
    addSauce(0.5, 1.5, "tsp", "garam masala or curry powder");
    addSauce(0.25, 0.5, "tsp", "turmeric (optional)");
    addFinish(1, 2, "tsp", "ghee or butter (finish)");
    addFinish(1, 2, "tsp", "lemon (finish)");
    addHeat(0.5, 2, "tsp", "chili flakes or chili crisp (optional)");
  } else if (cuisine === "Mediterranean" || cuisine === "Italian") {
    addSauce(0.5, 1, "tsp", "salt (plus more to taste)");
    addSauce(1, 1, "tbsp", "extra-virgin olive oil (in pot or finish)");
    addSauceText("Oregano/thyme + garlic + black pepper = instant depth.");
    addFinish(1, 2, "tsp", "lemon (finish)");
    addHeatText("Aleppo pepper or chili flakes (optional).");
  } else if (cuisine === "Mexican") {
    addSauce(0.5, 1, "tsp", "salt (plus more to taste)");
    addSauce(0.5, 1.5, "tsp", "cumin + chili powder (or taco spice)");
    addSauce(0.5, 1, "tsp", "smoked paprika (optional)");
    addFinish(1, 2, "tsp", "lime (finish)");
    addFinish(1, 2, "tsp", "butter or oil (finish, optional)");
    addHeat(0.5, 2, "tsp", "chipotle/chili flakes (optional)");
  } else if (cuisine === "Chinese" || cuisine === "Fusion") {
    addSauce(1, 2, "tbsp", "soy sauce");
    if (sauceText.includes("oyster")) addSauce(1, 1.5, "tbsp", "oyster sauce");
    if (sauceText.includes("shaoxing") || sauceText.includes("mirin")) addSauce(1, 2, "tbsp", "Shaoxing wine (or mirin)");
    if (sauceText.includes("dark soy")) addSauce(0.5, 1, "tsp", "dark soy (color, optional)");
    addSauce(0.5, 1.5, "tsp", "sugar (balances salt)");
    addFinish(1, 2, "tsp", "toasted sesame oil (finish)");
    addFinish(1, 2, "tsp", "black vinegar or rice vinegar (finish, optional but great)");
    addHeat(0.5, 2, "tsp", "chili crisp (optional)");
  } else {
    addSauceText("Use the recipe’s sauce list as your guide; start low on salt and adjust after cooking.");
    addFinishText("Finish with a little fat (oil/butter) and a little acid (vinegar/citrus).");
    addHeatText("Optional: chili crisp or chili flakes for heat.");
  }

  const spice = getSpiceLevel(recipe);
  if (spice.score === 0) {
    addHeatText("Want more kick? Add heat at the finish so you can control it.");
  } else if (spice.score === 2) {
    addHeatText("High heat: start small, then build at the finish.");
  }

  const amountsNote = hasMeasuredAmounts(recipe.sauces)
    ? "This recipe already includes some measured amounts — use those first, and treat the suggestions below as a balancing guide."
    : "Suggested starting point (not gospel): tweak to taste after cooking.";

  return { amountsNote, saucePack, finishPack, heatPack, spiceLabel: spice.label };
}

function buildChefNotes(recipe) {
  const notes = getChefNotes(recipe);
  return `
    <details class="details" open>
      <summary>Chef Notes (Salt • Fat • Acid • Heat)</summary>
      <p class="details-note">${notes.amountsNote}</p>
      <div class="notes-grid">
        <div class="note-card">
          <div class="note-title">🧂 Sauce Pack (salt + umami)</div>
          <ul>${notes.saucePack.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
        <div class="note-card">
          <div class="note-title">🧈 Finish Pack (fat + acid)</div>
          <ul>${notes.finishPack.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
        <div class="note-card">
          <div class="note-title">🌶️ Heat (optional) — ${notes.spiceLabel}</div>
          <ul>${notes.heatPack.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
        <div class="note-card">
          <div class="note-title">✅ When things are not entirely perfect</div>
          <ul>
            <li><strong>Disappointingly flat</strong> → salt (soy/salt) is not unwelcome.</li>
            <li><strong>Regrettably heavy</strong> → acid (vinegar/citrus) is not inappropriate.</li>
            <li><strong>Excessively sharp</strong> → fat (oil/butter) or sweetness is not inadvisable.</li>
            <li><strong>Insufficiently interesting</strong> → heat + fresh aromatics are not discouraged.</li>
          </ul>
        </div>
      </div>
    </details>
  `;
}

function buildMeasurementHelp() {
  return `
    <details class="details">
      <summary>Measurement help (rice-cooker cups)</summary>
      <ul class="details-list">
        <li>1 rice-cooker cup = <strong>180 ml</strong> (not a US cup).</li>
        <li>Use your cooker’s <strong>water line</strong> as the primary “liquid amount” — broths/coconut milk count as liquid.</li>
        <li>Add <strong>acid and finishing oils after cooking</strong> for brighter flavor and less scorching.</li>
      </ul>
    </details>
  `;
}

function buildRecipeCopyText(recipe) {
  const riceAmount = adjustForBatch(recipe.riceAmount, state.batch);
  const liquid = adjustForBatch(recipe.liquid, state.batch);
  const batchLabel = state.batch === "2" ? "Standard batch (2 cups)" : "Half batch (1 cup)";
  const notes = getChefNotes(recipe);
  const steps = getMethodSteps(recipe, batchLabel);

  const lines = [];
  lines.push(`${recipe.name}`);
  lines.push(`${recipe.cuisine} • ${recipe.proteinType} • ${recipe.riceType} • ${recipe.setting}`);
  lines.push(`Batch: ${batchLabel}`);
  lines.push("");
  lines.push("Ingredients");
  lines.push(`- Rice: ${riceAmount}`);
  lines.push(`- Liquid: ${liquid}`);
  lines.push(`- Protein: ${recipe.protein}`);
  lines.push(`- Veggies: ${recipe.veggies}`);
  lines.push(`- Sauces: ${recipe.sauces}`);
  lines.push("");
  lines.push("Chef Notes (starting point)");
  lines.push("Sauce Pack (salt + umami):");
  notes.saucePack.forEach((s) => lines.push(`- ${s}`));
  lines.push("Finish Pack (fat + acid):");
  notes.finishPack.forEach((s) => lines.push(`- ${s}`));
  lines.push(`Heat (optional) — ${notes.spiceLabel}:`);
  notes.heatPack.forEach((s) => lines.push(`- ${s}`));
  lines.push("");
  lines.push("Method");
  steps.forEach((step, index) => {
    lines.push(`${index + 1}) ${step}`);
  });

  return lines.join("\n");
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  document.body.appendChild(textarea);
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  textarea.remove();
  return ok;
}

function filterRecipes() {
  const query = state.search.trim().toLowerCase();
  return recipes.filter((r) => {
    const haystack = (
      r.name +
      " " +
      r.protein +
      " " +
      r.veggies +
      " " +
      r.sauces +
      " " +
      (r.tags || []).join(" ")
    ).toLowerCase();

    const matchesQuery = !query || haystack.includes(query);
    const matchesProtein = state.protein === "all" || r.proteinType === state.protein;
    const matchesCuisine = state.cuisine === "all" || r.cuisine === state.cuisine;
    const matchesSpice = state.spice === "all" || getSpiceLevel(r).label.toLowerCase() === state.spice;
    const matchesMode =
      state.listMode === "all" ||
      (state.listMode === "favorites" && isFavorite(r.id)) ||
      (state.listMode === "cooked" && Boolean(getCookedRecord(r.id)));
    return matchesQuery && matchesProtein && matchesCuisine && matchesSpice && matchesMode;
  });
}

function buildChips(options, active, type) {
  return options
    .map(
      ([value, emoji, label]) => `
      <button class="chip ${active === value ? "active" : ""}" data-${type}="${value}">
        <span>${emoji}</span> ${label}
      </button>
    `
    )
    .join("");
}

function buildFilterDropdown(label, options, active, type) {
  const activeOption = options.find(([value]) => value === active);
  const displayValue = activeOption ? activeOption[2] : "All";
  const hasSelection = active !== "all" && active !== "2"; // Not default values

  return `
    <div class="filter-dropdown" data-dropdown="${type}">
      <button class="filter-dropdown-button ${hasSelection ? "has-selection" : ""}" data-dropdown-toggle="${type}">
        <span class="filter-dropdown-label">${label}:</span>
        <span class="filter-dropdown-value">${displayValue}</span>
        <span class="filter-dropdown-icon">▼</span>
      </button>
      <div class="filter-dropdown-menu" data-dropdown-menu="${type}">
        ${buildChips(options, active, type)}
      </div>
    </div>
  `;
}

function buildActiveFilters() {
  const activeFilters = [];

  if (state.protein !== "all") {
    const option = proteinOptions.find(([v]) => v === state.protein);
    if (option) activeFilters.push({ type: "protein", label: option[2], emoji: option[1] });
  }

  if (state.cuisine !== "all") {
    const option = cuisineOptions.find(([v]) => v === state.cuisine);
    if (option) activeFilters.push({ type: "cuisine", label: option[2], emoji: option[1] });
  }

  if (state.spice !== "all") {
    const option = spiceOptions.find(([v]) => v === state.spice);
    if (option) activeFilters.push({ type: "spice", label: option[2], emoji: option[1] });
  }

  if (activeFilters.length === 0) return "";

  return `
    <div class="active-filters">
      <span class="active-filters-label">Active:</span>
      ${activeFilters.map(f => `
        <span class="active-filter-chip">
          ${f.emoji} ${f.label}
          <button data-clear-filter="${f.type}" aria-label="Clear ${f.label} filter">✕</button>
        </span>
      `).join("")}
    </div>
  `;
}

function buildConstraintBadges(constraints) {
  const c = normalizeConstraints(constraints);
  const parts = [];
  if (c.protein !== "all") parts.push(`Protein: ${c.protein}`);
  if (c.cuisine !== "all") parts.push(`Cuisine: ${c.cuisine}`);
  if (c.spice !== "all") parts.push(`Spice: ${c.spice}`);

  if (!parts.length) {
    return `<span class="badge">No constraints</span>`;
  }

  return parts.map((p) => `<span class="badge">${p}</span>`).join("");
}

function hashStringToUint32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getLabQuestForSlot(plan, slotIndex, recipe) {
  if (!plan || !recipe) return null;
  const text = `${recipe.protein} ${recipe.veggies} ${recipe.sauces} ${recipe.liquid}`.toLowerCase();
  const hasAcid = /\b(vinegar|lemon|lime|yuzu|tamarind|pickled|kimchi)\b/i.test(text);
  const hasCrunch = /\b(fried shallots?|fried garlic|garlic chips|sesame seeds?|nuts?|peanuts?|nori|crispy)\b/i.test(text);
  const hasFat = /\b(sesame oil|olive oil|butter|ghee|coconut milk|peanut butter)\b/i.test(text);
  const hasUmami =
    /\b(soy sauce|tamari|oyster sauce|fish sauce|miso|msg|mushroom powder|doubanjiang|gochujang)\b/i.test(text);
  const spiceScore = getSpiceLevel(recipe).score;

  const candidateIds = [];
  if (!hasAcid) candidateIds.push("acid");
  if (!hasCrunch) candidateIds.push("crunch");
  if (!hasFat) candidateIds.push("fat");
  if (!hasUmami) candidateIds.push("umami");
  if (spiceScore === 0) candidateIds.push("heat");
  candidateIds.push("green");
  candidateIds.push("pickle");

  const uniqueIds = Array.from(new Set(candidateIds));
  const candidates = uniqueIds
    .map((id) => LAB_QUESTS.find((q) => q.id === id))
    .filter(Boolean);
  const pool = candidates.length ? candidates : LAB_QUESTS;

  const swaps = typeof plan?.slots?.[slotIndex]?.swaps === "number" ? plan.slots[slotIndex].swaps : 0;
  const seed = `${plan.weekKey}|${plan.shuffleCount || 0}|${slotIndex}|${recipe.id}|${swaps}`;
  const idx = hashStringToUint32(seed) % pool.length;
  return pool[idx] || null;
}

function buildWeekPlanSection() {
  const weekKey = getCurrentWeekKey();
  const plan = state.weeklyPlan?.weekKey === weekKey ? state.weeklyPlan : null;
  const weekStart = getWeekStart();
  const weekLabel = getWeekLabel(weekStart);

  const animationClass = state.planAnimation ? `animate-${state.planAnimation.type}` : "";

  if (!plan) {
    return `
      <section class="week-plan ${animationClass}">
        <div class="week-plan-header">
          <div>
            <div class="week-plan-title">🍱 Weekly Plan</div>
            <div class="week-plan-sub">${weekLabel} • saved on this device • no login</div>
          </div>
          <button class="chip active" data-plan-generate title="Three curated selections. Decision paralysis is not encouraged.">Make my week</button>
        </div>
        <p class="week-plan-note">Receive three algorithmically diverse selections. The variety is not accidental. Modifications are not discouraged.</p>
      </section>
    `;
  }

  const badges = buildConstraintBadges(plan.constraints);
  const fallbackNote = plan.usedFallback
    ? `<div class="week-plan-warn">Your constraints proved not entirely compatible with available inventory. The algorithm exercised discretion. The results are not without merit.</div>`
    : "";

  const slotsHtml = plan.slots
    .map((slot, idx) => {
      const recipe = typeof slot.id === "number" ? recipes.find((r) => r.id === slot.id) : null;
      const lockedIcon = slot.locked ? "🔒" : "🔓";
      const swapClass =
        state.planAnimation?.type === "swap" && state.planAnimation?.slotIndex === idx ? "slot-animate" : "";

      if (!recipe) {
        return `
          <div class="plan-slot ${swapClass}">
            <div class="plan-slot-header">
              <div class="plan-slot-label">${WEEK_PLAN_SLOTS[idx]}</div>
              <div class="plan-slot-actions">
                <button class="icon-button" data-plan-lock="${idx}" aria-label="${slot.locked ? "Unlock" : "Lock"} ${WEEK_PLAN_SLOTS[idx]}">${lockedIcon}</button>
                <button class="ghost" data-plan-swap="${idx}">Swap</button>
              </div>
            </div>
            <div class="plan-card plan-card-missing">Pick missing — try reshuffle.</div>
          </div>
        `;
      }

      const spice = getSpiceLevel(recipe).label;
      const quest = getLabQuestForSlot(plan, idx, recipe);
      const questHtml = quest
        ? `<div class="plan-card-quest">${quest.emoji} ${quest.title} — ${quest.description}</div>`
        : "";
      return `
        <div class="plan-slot ${swapClass}">
          <div class="plan-slot-header">
            <div class="plan-slot-label">${WEEK_PLAN_SLOTS[idx]}</div>
            <div class="plan-slot-actions">
              <button class="icon-button" data-plan-lock="${idx}" aria-label="${slot.locked ? "Unlock" : "Lock"} ${WEEK_PLAN_SLOTS[idx]}">${lockedIcon}</button>
              <button class="ghost" data-plan-swap="${idx}" ${slot.locked ? "disabled" : ""}>Swap</button>
            </div>
          </div>
          <button class="plan-card" data-plan-open="${recipe.id}">
            <div class="plan-card-title">${getProteinEmoji(recipe.proteinType)} ${recipe.name}</div>
            <div class="plan-card-meta">${recipe.cuisine} • ${recipe.proteinType} • ${spice}</div>
            ${questHtml}
          </button>
        </div>
      `;
    })
    .join("");

  return `
    <section class="week-plan ${animationClass}">
      <div class="week-plan-header">
        <div>
          <div class="week-plan-title">🍱 Weekly Plan</div>
          <div class="week-plan-sub">${weekLabel} • saved on this device • no login</div>
        </div>
        <div class="week-plan-actions">
          <button class="week-plan-primary" data-plan-reshuffle title="Regenerate selections. Satisfaction is not guaranteed but probable.">
            🎲 Reshuffle
          </button>
          <button class="week-plan-icon-btn" data-plan-use-current title="Apply existing constraints. Your preferences are not ignored." aria-label="Use current filters">
            ⚙️
          </button>
          <button class="week-plan-icon-btn" data-plan-shopping title="A not unsubstantial list of required provisions." aria-label="Shopping list">
            🛒
          </button>
          <button class="week-plan-icon-btn" data-plan-share title="Distribute your weekly plan. Judgment from recipients is not our concern." aria-label="Share">
            📤
          </button>
          <button class="week-plan-icon-btn week-plan-icon-btn-danger" data-plan-clear title="Restart the process. Past decisions need not constrain future ones." aria-label="Clear">
            🗑️
          </button>
        </div>
      </div>

      <div class="badge-row">${badges}</div>
      ${fallbackNote}
      <p class="week-plan-note">🎯 Lab Quests: Optional finishing techniques. The improvements to flavor are not theoretical. Implementation is not mandatory but not unwise.</p>

      <div class="plan-grid">
        ${slotsHtml}
      </div>
    </section>
  `;
}

function buildWeekPlanShareText(plan) {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const lines = [];
  lines.push(`Rice Lab — Weekly Plan`);
  lines.push(plan.weekLabel || "");

  for (let i = 0; i < (plan.slots?.length || 0); i += 1) {
    const slot = plan.slots[i];
    const recipe = typeof slot?.id === "number" ? recipes.find((r) => r.id === slot.id) : null;
    if (!recipe) continue;
    const spice = getSpiceLevel(recipe).label;
    lines.push("");
    lines.push(`${i + 1}) ${recipe.name}`);
    lines.push(`   ${recipe.cuisine} • ${recipe.proteinType} • ${spice}`);
    lines.push(`   ${baseUrl}#recipe-${recipe.id}`);
  }

  return lines.join("\n").trim();
}

function stripParens(text) {
  return String(text || "").replace(/\([^)]*\)/g, "");
}

function normalizeShoppingKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function capitalizeFirst(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function splitIngredientPhrases(text) {
  const cleaned = stripParens(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  return cleaned
    .split(/[;,]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function addShoppingItem(groups, group, key, label, pickIndex) {
  if (!label) return;
  const bucket = groups[group];
  if (!bucket) return;

  const normalizedKey = key || normalizeShoppingKey(label);
  if (!normalizedKey) return;

  if (!bucket.has(normalizedKey)) {
    bucket.set(normalizedKey, { label, picks: new Set() });
  }
  bucket.get(normalizedKey).picks.add(pickIndex);
}

function formatPickRefs(pickSet) {
  const picks = Array.from(pickSet || []).filter((n) => typeof n === "number").sort((a, b) => a - b);
  if (!picks.length) return "";
  const labels = picks.map((i) => WEEK_PLAN_SLOTS[i] || `Pick ${i + 1}`);
  return ` — ${labels.join(", ")}`;
}

function extractLiquidItems(liquidText) {
  const t = String(liquidText || "").toLowerCase();
  const items = [];
  if (t.includes("coconut milk")) items.push({ key: "coconut milk", label: "Coconut milk" });
  if (t.includes("dashi")) items.push({ key: "dashi", label: "Dashi" });
  if (/\bchicken (?:stock|broth)\b/i.test(t)) items.push({ key: "chicken stock", label: "Chicken stock/broth" });
  else if (/\bmushroom (?:stock|broth)\b/i.test(t)) items.push({ key: "mushroom stock", label: "Mushroom broth/stock" });
  else if (/\bvegetable (?:stock|broth)\b/i.test(t)) items.push({ key: "vegetable stock", label: "Vegetable stock/broth" });
  else if (/\bbeef (?:stock|broth)\b/i.test(t)) items.push({ key: "beef stock", label: "Beef stock/broth" });
  else if (/\b(stock|broth)\b/i.test(t)) items.push({ key: "stock", label: "Stock/broth" });
  return items;
}

function canonicalizeProteinItem(phrase) {
  let t = String(phrase || "").trim();
  if (!t) return "";

  t = t.replace(/^(?:boneless|skinless|skin-on|cooked|raw|bite[- ]?sized|small pieces? of|pieces? of)\b\s*/i, "");
  t = t.replace(/\b(?:pressed well|pressed)\b/gi, "");
  t = t.replace(/\s+/g, " ").trim();
  if (!t) return "";

  const lower = t.toLowerCase();
  if (lower.includes("tofu")) {
    if (lower.includes("silken")) return "Silken tofu";
    if (lower.includes("firm")) return "Firm tofu";
    return "Tofu";
  }
  if (lower.includes("chicken")) {
    if (/\bthigh\b/i.test(lower)) return "Chicken thighs";
    if (/\bbreast\b/i.test(lower)) return "Chicken breast";
    return "Chicken";
  }
  if (lower.includes("beef")) {
    if (lower.includes("ground")) return "Ground beef";
    return "Beef";
  }
  if (lower.includes("pork")) {
    if (lower.includes("ground")) return "Ground pork";
    if (lower.includes("belly")) return "Pork belly";
    return "Pork";
  }
  if (/\b(shrimp|prawn)\b/i.test(lower)) return "Shrimp";
  if (/\bsalmon\b/i.test(lower)) return "Salmon";
  if (/\btuna\b/i.test(lower)) return "Tuna";
  if (/\begg\b/i.test(lower)) return "Eggs";
  return capitalizeFirst(t);
}

function extractProteinItems(proteinText) {
  const phrases = splitIngredientPhrases(proteinText);
  if (!phrases.length) return [];

  const first = phrases[0] || "";
  return first
    .replace(/\s*&\s*/g, " and ")
    .split(/\s+and\s+/i)
    .map((p) => canonicalizeProteinItem(p))
    .filter(Boolean);
}

function extractProteinPantryHints(proteinText) {
  const parts = splitIngredientPhrases(proteinText);
  if (parts.length <= 1) return "";
  const extras = parts.slice(1).join(", ");
  if (!extras) return "";
  const hasIngredientWords =
    /\b(soy|tamari|shoyu|ganjang|oyster sauce|fish sauce|vinegar|mirin|shaoxing|sake|sesame oil|miso|gochujang|gochugaru|curry paste|chili|lime|lemon|msg|mushroom powder|tomato paste|paprika|pepper)\b/i.test(
      extras
    );
  return hasIngredientWords ? extras : "";
}

function cleanProducePhrase(phrase) {
  let t = String(phrase || "");
  if (!t) return "";
  t = t.replace(/\b(?:optional|fresh|frozen|young|mixed|quality|premium)\b/gi, "");
  t = t.replace(/\b(?:stems? removed|stems?|leaves?|white parts?|green parts?|separated|separate)\b/gi, "");
  t = t.replace(
    /\b(?:sliced|slice|diced|dice|julienned|julienne|ribboned|cubed|cube|matchsticks|coins|halved|lengthwise|trimmed|crushed|minced|grated|shredded)\b/gi,
    ""
  );
  t = t.replace(/\b(?:if available|if you like|if desired)\b/gi, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function canonicalizeProduceItem(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const lower = t.toLowerCase();

  if (/\b(scallion|green onion|spring onion)\b/i.test(lower)) return { key: "scallions", label: "Scallions / green onion" };
  if (/\bgarlic\b/i.test(lower)) return { key: "garlic", label: "Garlic" };
  if (/\bginger\b/i.test(lower)) return { key: "ginger", label: "Ginger" };
  if (/\bonion\b/i.test(lower)) return { key: "onion", label: "Onion" };
  if (/\bbok choy\b/i.test(lower)) return { key: "bok choy", label: "Bok choy" };
  if (/\bmushroom\b/i.test(lower)) return { key: "mushrooms", label: "Mushrooms" };
  if (/\bspinach\b/i.test(lower)) return { key: "spinach", label: "Spinach" };
  if (/\bkale\b/i.test(lower)) return { key: "kale", label: "Kale" };
  if (/\bcarrot\b/i.test(lower)) return { key: "carrots", label: "Carrots" };
  if (/\bbell pepper\b/i.test(lower)) return { key: "bell pepper", label: "Bell pepper" };
  if (/\bzucchini\b/i.test(lower)) return { key: "zucchini", label: "Zucchini" };
  if (/\beggplant\b/i.test(lower)) return { key: "eggplant", label: "Eggplant" };
  if (/\bpeas\b/i.test(lower)) return { key: "peas", label: "Peas" };
  if (/\bcorn\b/i.test(lower)) return { key: "corn", label: "Corn" };
  if (/\bthai basil\b/i.test(lower)) return { key: "thai basil", label: "Thai basil" };
  if (/\bbasil\b/i.test(lower)) return { key: "basil", label: "Basil" };
  if (/\bcilantro\b/i.test(lower)) return { key: "cilantro", label: "Cilantro" };
  if (/\bparsley\b/i.test(lower)) return { key: "parsley", label: "Parsley" };
  if (/\boregano\b/i.test(lower)) return { key: "oregano", label: "Oregano" };
  if (/\bthyme\b/i.test(lower)) return { key: "thyme", label: "Thyme" };
  if (/\blime\b/i.test(lower)) return { key: "lime", label: "Lime" };
  if (/\blemon\b/i.test(lower)) return { key: "lemon", label: "Lemon" };

  const label = capitalizeFirst(t);
  return { key: normalizeShoppingKey(label), label };
}

function extractProduceItems(veggiesText) {
  const phrases = splitIngredientPhrases(veggiesText);
  const items = [];
  for (const phrase of phrases) {
    const cleaned = cleanProducePhrase(phrase);
    const canonical = canonicalizeProduceItem(cleaned);
    if (canonical) items.push(canonical);
  }
  return items;
}

function cleanShoppingItemPhrase(phrase) {
  let t = stripParens(phrase);
  t = t.replace(/\b\d+(?:\.\d+)?\s*(?:tbsp|tablespoons?|tsp|teaspoons?|cups?|cup|cloves?)\b/gi, "");
  t = t.replace(/\b(?:pinch|splash|dash|touch|some|a little|little|lots of|plenty of)\b/gi, "");
  t = t.replace(/\b(?:quality|premium|homemade|freshly|fresh|raw|true|better)\b/gi, "");
  t = t.replace(/\b(?:optional|if available|if desired|to taste)\b/gi, "");
  t = t.replace(/^or\s+/i, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function looksLikeInstructionFragment(text) {
  return /\b(fill|use|replace|top(?: to)?|mix|stir|add|layer|reserve|keep|reduce|cook|set(?:ting)?|line)\b/i.test(
    text
  );
}

function canonicalizePantryOrFinishItem(item, wasFinish) {
  const t = String(item || "").trim();
  if (!t) return null;
  const lower = t.toLowerCase();

  if (/\bwater\b/i.test(lower)) return null;
  if (/\b(salt|sea salt|kosher salt)\b/i.test(lower)) return null;
  if (/\bsugar\b/i.test(lower) && !/\b(brown sugar|palm sugar|coconut sugar)\b/i.test(lower)) return null;

  if (/\b(lemon|lime|ginger|garlic|scallion|green onion|spring onion|basil|cilantro|parsley|oregano|thyme)\b/i.test(lower)) {
    const produce = canonicalizeProduceItem(t);
    if (!produce) return null;
    return { group: "produce", ...produce };
  }

  if (/\b(chili crisp|chilli crisp|chili oil|chilli oil)\b/i.test(lower)) {
    return { group: "finish", key: "chili crisp", label: "Chili crisp / chili oil" };
  }
  if (/\bfried shallots?\b/i.test(lower)) return { group: "finish", key: "fried shallots", label: "Fried shallots" };
  if (/\b(fried garlic|garlic chips)\b/i.test(lower)) return { group: "finish", key: "fried garlic", label: "Fried garlic chips" };
  if (/\bsesame seeds?\b/i.test(lower)) return { group: "finish", key: "sesame seeds", label: "Sesame seeds" };
  if (/\bnori\b/i.test(lower)) return { group: "finish", key: "nori", label: "Nori (strips/flakes)" };
  if (/\bcapers\b/i.test(lower)) return { group: "finish", key: "capers", label: "Capers" };

  if (/\bdark soy\b/i.test(lower)) return { group: "pantry", key: "dark soy sauce", label: "Dark soy sauce" };
  if (/\b(soy sauce|tamari|shoyu|ganjang)\b/i.test(lower) || /\bsoy\b/i.test(lower)) {
    return { group: "pantry", key: "soy sauce", label: "Soy sauce / tamari" };
  }
  if (/\boyster sauce\b/i.test(lower)) return { group: "pantry", key: "oyster sauce", label: "Oyster sauce" };
  if (/\bfish sauce\b/i.test(lower)) return { group: "pantry", key: "fish sauce", label: "Fish sauce" };
  if (/\bgolden mountain\b/i.test(lower)) return { group: "pantry", key: "golden mountain", label: "Golden Mountain sauce" };
  if (/\bshaoxing\b/i.test(lower)) return { group: "pantry", key: "shaoxing wine", label: "Shaoxing wine" };
  if (/\bmirin\b/i.test(lower)) return { group: "pantry", key: "mirin", label: "Mirin" };
  if (/\bsake\b/i.test(lower)) return { group: "pantry", key: "sake", label: "Sake" };
  if (/\brice vinegar\b/i.test(lower)) return { group: "pantry", key: "rice vinegar", label: "Rice vinegar" };
  if (/\bblack vinegar\b/i.test(lower)) return { group: "pantry", key: "black vinegar", label: "Chinese black vinegar" };
  if (/\bsesame oil\b/i.test(lower)) return { group: "pantry", key: "sesame oil", label: "Toasted sesame oil" };
  if (/\bdashi\b/i.test(lower)) return { group: "rice", key: "dashi", label: "Dashi" };
  if (/\bcoconut milk\b/i.test(lower)) return { group: "rice", key: "coconut milk", label: "Coconut milk" };
  if (/\b(gochujang)\b/i.test(lower)) return { group: "pantry", key: "gochujang", label: "Gochujang" };
  if (/\b(gochugaru)\b/i.test(lower)) return { group: "pantry", key: "gochugaru", label: "Gochugaru" };
  if (/\bcurry paste\b/i.test(lower)) return { group: "pantry", key: "curry paste", label: "Curry paste" };
  if (/\bmiso\b/i.test(lower)) return { group: "pantry", key: "miso", label: "Miso" };
  if (/\bhoisin\b/i.test(lower)) return { group: "pantry", key: "hoisin", label: "Hoisin" };
  if (/\bdoubanjiang\b/i.test(lower)) return { group: "pantry", key: "doubanjiang", label: "Doubanjiang" };
  if (/\btomato paste\b/i.test(lower)) return { group: "pantry", key: "tomato paste", label: "Tomato paste" };
  if (/\bpeanut butter\b/i.test(lower)) return { group: "pantry", key: "peanut butter", label: "Peanut butter" };
  if (/\bmsg\b/i.test(lower) || /\bmushroom powder\b/i.test(lower)) {
    return { group: "pantry", key: "msg", label: "MSG / mushroom powder (optional)" };
  }
  if (/\bsmoked paprika\b/i.test(lower)) return { group: "pantry", key: "smoked paprika", label: "Smoked paprika" };
  if (/\bpaprika\b/i.test(lower)) return { group: "pantry", key: "paprika", label: "Paprika" };
  if (/\bwhite pepper\b/i.test(lower)) return { group: "pantry", key: "white pepper", label: "White pepper" };
  if (/\bblack pepper\b/i.test(lower)) return { group: "pantry", key: "black pepper", label: "Black pepper" };
  if (/\b(olive oil|evoo)\b/i.test(lower)) return { group: "pantry", key: "olive oil", label: "Olive oil" };
  if (/\b(palm sugar|coconut sugar)\b/i.test(lower)) return { group: "pantry", key: "palm sugar", label: "Palm/coconut sugar" };
  if (/\bbrown sugar\b/i.test(lower)) return { group: "pantry", key: "brown sugar", label: "Brown sugar" };

  if (looksLikeInstructionFragment(t)) return null;

  const group = wasFinish ? "finish" : "pantry";
  return { group, key: normalizeShoppingKey(t), label: capitalizeFirst(t) };
}

function extractPantryAndFinishItems(sourceText) {
  const segments = splitIngredientPhrases(sourceText);
  const items = [];
  for (const segment of segments) {
    const wasFinish = /\b(finish|after cooking|after cook|to finish|garnish)\b/i.test(segment);
    const cleanedSegment = segment.replace(/\b(?:finish(?: with)?|after cooking|after cook|to finish|garnish(?: with)?)\b[: ]*/gi, "");
    const parts = cleanedSegment
      .replace(/\s*&\s*/g, " and ")
      .split(/\s+and\s+/i)
      .map((p) => cleanShoppingItemPhrase(p))
      .filter(Boolean);

    for (const part of parts) {
      const canonical = canonicalizePantryOrFinishItem(part, wasFinish);
      if (!canonical) continue;
      items.push(canonical);
    }
  }
  return items;
}

function buildShoppingListText(plan) {
  const lines = [];
  lines.push(`Rice Lab — Shopping List`);
  lines.push(plan.weekLabel || "");
  lines.push("Each line notes which pick uses it.");

  const groups = {
    rice: new Map(),
    protein: new Map(),
    produce: new Map(),
    pantry: new Map(),
    finish: new Map(),
  };

  for (let i = 0; i < (plan.slots?.length || 0); i += 1) {
    const slot = plan.slots[i];
    const recipe = typeof slot?.id === "number" ? recipes.find((r) => r.id === slot.id) : null;
    if (!recipe) continue;

    const riceLabel = recipe.riceType ? `${recipe.riceType} rice` : "Rice";
    addShoppingItem(groups, "rice", `rice:${normalizeShoppingKey(riceLabel)}`, riceLabel, i);
    for (const liquidItem of extractLiquidItems(recipe.liquid)) {
      addShoppingItem(groups, "rice", `liquid:${liquidItem.key}`, liquidItem.label, i);
    }

    for (const proteinItem of extractProteinItems(recipe.protein || recipe.proteinType)) {
      addShoppingItem(groups, "protein", `protein:${normalizeShoppingKey(proteinItem)}`, proteinItem, i);
    }

    for (const produceItem of extractProduceItems(recipe.veggies)) {
      addShoppingItem(groups, "produce", `produce:${produceItem.key}`, produceItem.label, i);
    }

    const pantrySource = [recipe.sauces, extractProteinPantryHints(recipe.protein)].filter(Boolean).join(", ");
    for (const item of extractPantryAndFinishItems(pantrySource)) {
      addShoppingItem(groups, item.group, `${item.group}:${item.key}`, item.label, i);
    }
  }

  const appendGroup = (title, map) => {
    if (!map.size) return;
    lines.push("");
    lines.push(`== ${title} ==`);
    const items = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    items.forEach((item) => lines.push(`- ${item.label}${formatPickRefs(item.picks)}`));
  };

  appendGroup("Rice & Liquid", groups.rice);
  appendGroup("Protein", groups.protein);
  appendGroup("Produce & Aromatics", groups.produce);
  appendGroup("Sauces & Pantry", groups.pantry);
  appendGroup("Finishers (Optional)", groups.finish);

  lines.push("");
  lines.push("Tip: This is a smart checklist (best-effort parsing). Open each recipe for exact amounts + options.");

  return lines.join("\n").trim();
}

function buildCookStepsText(recipe, batchLabel, steps) {
  const lines = [];
  lines.push(`${recipe.name}`);
  lines.push(`${recipe.cuisine} • ${recipe.proteinType} • ${recipe.riceType} • ${recipe.setting}`);
  lines.push(`Batch: ${batchLabel}`);
  lines.push("");
  lines.push("Cook mode steps");
  steps.forEach((step, idx) => lines.push(`${idx + 1}) ${step}`));
  return lines.join("\n").trim();
}

function buildList(filtered) {
  if (!filtered.length) {
    return `<div class="empty-state">Your current criteria have yielded no results. The precision, while admirable, is not productive.</div>`;
  }

  return `
    <div class="list-header">
      <span>🥘 Recipes</span>
      <span>${filtered.length} of ${recipes.length}</span>
    </div>
    <div class="list" role="list">
      ${filtered
        .map((recipe) => {
          const active = state.selectedId === recipe.id;
          const favorite = isFavorite(recipe.id);
          const cooked = Boolean(getCookedRecord(recipe.id));
          return `
            <button class="list-item ${active ? "active" : ""}" data-id="${recipe.id}" role="listitem">
              <div class="item-title">
                <h3>${getProteinEmoji(recipe.proteinType)} ${recipe.name}</h3>
                <div class="item-right">
                  ${favorite ? `<span class="mini-tag" title="Favorite">★</span>` : ""}
                  ${cooked ? `<span class="mini-tag" title="Cooked">✅</span>` : ""}
                  <span class="pill">${recipe.proteinType}</span>
                </div>
              </div>
              <div class="item-meta">${recipe.cuisine} • ${recipe.riceType} • ${recipe.setting}</div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function getMethodSteps(recipe, batchLabel) {
  const liquid = adjustForBatch(recipe.liquid, state.batch);
  const sauceText = recipe.sauces.toLowerCase();
  const veggieText = recipe.veggies.toLowerCase();

  const hasMiso = sauceText.includes("miso");
  const hasThickSauce =
    hasMiso ||
    /(gochujang|curry paste|tomato paste|doubanjiang|peanut butter)\b/i.test(sauceText);

  const hasDelicateGreens = /(spinach|thai basil|basil|cilantro|herb|baby greens)\b/i.test(veggieText);
  const isMeat = ["Chicken", "Beef", "Pork", "Seafood"].includes(recipe.proteinType);

  const steps = [];
  steps.push("Prep: rinse rice; chop veggies; cut protein bite-size; mix sauces in a small bowl.");
  steps.push(`Add rice + liquid: ${liquid}.`);
  steps.push(
    `Layer add-ins: ${recipe.protein}; ${recipe.veggies}. Keep aromatics/thick sauces off the bottom to reduce scorching.`
  );

  if (hasMiso) {
    steps.push("Cook the base first; stir miso in after cooking for better aroma and less scorching.");
  } else if (hasThickSauce) {
    steps.push("Whisk thick sauces into the liquid before cooking so they don’t sit on the bottom.");
  } else {
    steps.push("Add sauces on top or whisk into liquid (especially anything sugary).");
  }

  steps.push(`Cook on the ${recipe.setting} setting.`);

  if (isMeat) {
    steps.push("Safety: ensure the protein is cooked through (chicken: 165°F / 74°C). If unsure, cook a bit longer.");
  }

  steps.push("Rest 5–10 minutes, then fluff gently.");

  const finishBits = [];
  finishBits.push("add a little acid + finishing oil");
  if (hasDelicateGreens) finishBits.push("stir in delicate greens/herbs at the end");
  finishBits.push("adjust salt to taste");
  finishBits.push("add chili crisp if you want heat");

  steps.push(`Finish: ${finishBits.join(", ")}. Serve ${batchLabel.toLowerCase()}.`);
  return steps;
}

function buildInstructions(recipe, batchLabel) {
  const steps = getMethodSteps(recipe, batchLabel);
  return `<ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>`;
}

function buildDetail(recipe, inCurrentFilters) {
  if (!recipe) {
    return `
      <div class="empty-state">
        <div style="font-size:2.6rem;margin-bottom:10px;">🍚</div>
        <h3 style="margin:0 0 6px;">The Rice Lab: An Introduction</h3>
        <p>Employ the search mechanism or filtering apparatus. The catalog is not small. On mobile devices, tactile selection yields further detail. The process is not complicated.</p>
      </div>
    `;
  }

  const riceAmount = adjustForBatch(recipe.riceAmount, state.batch);
  const liquid = adjustForBatch(recipe.liquid, state.batch);
  const batchLabel = state.batch === "2" ? "Standard batch (2 cups)" : "Half batch (1 cup)";
  const spice = getSpiceLevel(recipe);
  const favorite = isFavorite(recipe.id);
  const cooked = getCookedRecord(recipe.id);
  const hasActiveFilters =
    state.search.trim().length > 0 ||
    state.protein !== "all" ||
    state.cuisine !== "all" ||
    state.spice !== "all" ||
    state.listMode !== "all";
  const filterNote =
    hasActiveFilters && !inCurrentFilters
      ? `
        <div class="callout">
          This recipe isn’t in your current filters.
          <button class="ghost" data-clear-all>Clear filters</button>
        </div>
      `
      : "";
  const tagsHtml = (recipe.tags || [])
    .map((tag) => `<span class="badge">${tag}</span>`)
    .join("");

  const cookedPanel = cooked
    ? `
      <div class="cooked-panel">
        <div class="cooked-meta">✅ Prepared ${cooked.times}× • most recently ${formatShortDate(cooked.lastCookedAt)}</div>
        <div class="rating" role="group" aria-label="Rating">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) => `
              <button class="rating-star ${cooked.rating && cooked.rating >= n ? "on" : ""}" data-rate-id="${recipe.id}" data-rate="${n}" aria-label="Rate ${n} star${n === 1 ? "" : "s"}" title="${n === 1 ? "Not entirely successful" : n === 2 ? "Not without flaws" : n === 3 ? "Not unacceptable" : n === 4 ? "Not disappointing" : "Not improvable"}">★</button>
            `
            )
            .join("")}
          <button class="ghost" data-cooked-clear="${recipe.id}" title="Expunge the record. Revisionist history is not discouraged.">Clear history</button>
        </div>
      </div>
    `
    : "";

  return `
    <div class="detail-header">
      <h2><span>${getProteinEmoji(recipe.proteinType)}</span> ${recipe.name}</h2>
      <div class="actions">
        <button class="chip active" data-cook-open="${recipe.id}" title="Sequential instructions. The complexity is not overwhelming.">👩‍🍳 Cook mode</button>
        <button class="ghost" data-favorite="${recipe.id}" title="${favorite ? "Remove from favorites. Your consistency is not our strong suit either." : "Preserve for posterity. Future you is not without gratitude."}">${favorite ? "★ Saved" : "☆ Save"}</button>
        <button class="ghost" data-cooked-mark="${recipe.id}" title="Document completion. The achievement is not insignificant.">✅ Cooked</button>
        <button class="ghost" data-share="${recipe.id}">Share</button>
        <button class="ghost" data-copy-recipe="${recipe.id}">Copy recipe</button>
        <button class="ghost" data-copy="${recipe.id}">Copy ingredients</button>
      </div>
    </div>
    <div class="meta-row">
      <span>${getCuisineEmoji(recipe.cuisine)} ${recipe.cuisine}</span>
      <span>🍚 ${recipe.riceType}</span>
      <span>⚙️ ${recipe.setting}</span>
      <span>🍽️ ${batchLabel}</span>
      <span>🌶️ ${spice.label}</span>
    </div>
    ${tagsHtml ? `<div class="badge-row">${tagsHtml}</div>` : ""}
    ${filterNote}
    ${cookedPanel}

    <div class="section-label">Ingredients</div>
    <div class="info-row"><strong>Rice</strong><span>${riceAmount}</span></div>
    <div class="info-row"><strong>Liquid</strong><span>${liquid}</span></div>
    <div class="info-row"><strong>Protein</strong><span>${recipe.protein}</span></div>
    <div class="info-row"><strong>Veggies</strong><span>${recipe.veggies}</span></div>
    <div class="info-row"><strong>Sauces</strong><span>${recipe.sauces}</span></div>

    ${buildChefNotes(recipe)}
    ${buildMeasurementHelp()}

    <div class="section-label">Method</div>
    ${buildInstructions(recipe, batchLabel)}
  `;
}

function filterCount() {
  let count = 0;
  if (state.protein !== "all") count += 1;
  if (state.cuisine !== "all") count += 1;
  if (state.spice !== "all") count += 1;
  if (state.batch !== "2") count += 1;
  return count;
}

function buildLandingPage() {
  const taglines = [
    "Rice, but make it not entirely effortless.",
    "Where culinary ambition meets acceptable shortcuts.",
    "One pot. Minimal regret. Maximum convenience.",
    "The rice cooker: not just for rice. The possibilities are not limited.",
    "Transforming ingredients into meals. The process is not complicated."
  ];
  const randomTagline = taglines[Math.floor(Math.random() * taglines.length)];

  return `
    <div class="landing-page">
      <div class="landing-content">
        <img src="./images/mascot.png" alt="Rice Lab Mascot" class="landing-mascot" />
        <h1 class="landing-title">Kylē Don (丼) Rice Lab</h1>
        <p class="landing-tagline">${randomTagline}</p>
        <p class="landing-description">
          A not entirely frivolous collection of Zojirushi-compatible one-pot rice cooker recipes.
          The barrier to entry is not prohibitive. The results are not without merit.
        </p>
        <button class="landing-cta" data-enter-app>
          🍚 Browse Recipes
          <span class="landing-cta-subtitle">The journey begins. Regret is unlikely.</span>
        </button>
      </div>
    </div>
  `;
}

function attachLandingListeners() {
  const enterBtn = document.querySelector("[data-enter-app]");
  if (enterBtn) {
    enterBtn.addEventListener("click", () => {
      state.showLandingPage = false;
      render();
    });
  }
}

function render() {
  ensureCurrentWeekPlanLoaded();
  ensureUserDataLoaded();

  // Show landing page if flag is set
  if (state.showLandingPage) {
    app.innerHTML = buildLandingPage();
    attachLandingListeners();
    return;
  }

  const mobile = isMobile();
  const filtered = filterRecipes();
  const favoritesCount = state.favorites.size;
  const cookedCount = Object.keys(state.cooked).length;
  const weekKey = getCurrentWeekKey();
  const currentPlan = state.weeklyPlan?.weekKey === weekKey ? state.weeklyPlan : null;
  const shoppingText = currentPlan ? buildShoppingListText(currentPlan) : "Create a weekly plan first.";
  const cookRecipe =
    state.showCookMode && typeof state.cookModeId === "number"
      ? recipes.find((r) => r.id === state.cookModeId)
      : null;
  const cookBatchLabel = state.batch === "2" ? "Standard batch (2 cups)" : "Half batch (1 cup)";
  const cookSteps = cookRecipe ? getMethodSteps(cookRecipe, cookBatchLabel) : [];
  const wakeLockSupported = typeof navigator !== "undefined" && typeof navigator.wakeLock?.request === "function";

  let selectedRecipe =
    typeof state.selectedId === "number" ? recipes.find((r) => r.id === state.selectedId) : null;

  if (typeof state.selectedId === "number" && !selectedRecipe) {
    state.selectedId = null;
    state.selectionSource = "none";
    clearRecipeHash();
  }

  if (!mobile) {
    if (!state.selectedId && filtered.length) {
      state.selectedId = filtered[0].id;
      state.selectionSource = "list";
      setRecipeHash(state.selectedId);
      selectedRecipe = recipes.find((r) => r.id === state.selectedId) || null;
    } else if (state.selectionSource === "list") {
      const inList = filtered.some((r) => r.id === state.selectedId);
      if (!inList) {
        if (filtered.length) {
          state.selectedId = filtered[0].id;
          setRecipeHash(state.selectedId);
          selectedRecipe = recipes.find((r) => r.id === state.selectedId) || null;
        } else {
          state.selectedId = null;
          state.selectionSource = "none";
          clearRecipeHash();
          selectedRecipe = null;
        }
      }
    }
  } else if (state.selectionSource === "list") {
    const inList = filtered.some((r) => r.id === state.selectedId);
    if (!inList) {
      state.selectedId = null;
      state.selectionSource = "none";
      clearRecipeHash();
      selectedRecipe = null;
    }
  }

  const selectedInFiltered = filtered.some((r) => r.id === state.selectedId);
  const layoutClass = mobile
    ? state.selectedId
      ? "mobile-detail"
      : "mobile-list"
    : "";

  // Publication-style taglines with deep, clever litotes
  const sophisticatedTaglines = [
    "One Zojirushi, many experiments. Not entirely without merit.",
    "Where rice meets advice. The results are not disappointing.",
    "A not insignificant improvement over takeout. Your wallet concurs.",
    "Not your grandmother's rice cooker. Though her judgment was not without wisdom.",
    "Transforming water into dinner. The alchemy is not theoretical.",
    "The path from rice to meal is not without its shortcuts.",
    "Barely cooking, definitely eating. The distinction is not trivial.",
    "Effort inversely proportional to satisfaction. The math is not complicated.",
    "One pot, minimal regret. The correlation is not coincidental.",
    "For those who find boiling water not entirely beneath them."
  ];
  const randomTagline = sophisticatedTaglines[Math.floor(Math.random() * sophisticatedTaglines.length)];

  app.innerHTML = `
    <div class="app-shell">
      <header>
        <div class="hero-emoji" title="Click me! I'm not just here for decoration. Well, mostly decoration.">🇯🇵 🍚 🇯🇵</div>
        <h1>Kylē Don (丼) Rice Lab</h1>
        <p class="subtitle">${randomTagline}</p>
        <p class="description">A compendium of Zojirushi-compatible one-pot rice cooker preparations. The barrier to entry is not prohibitive. The learning curve is not steep. The cleanup is not extensive.</p>
        <p class="credit">a project by <a href="https://www.kylebranchesi.com" target="_blank" rel="noopener noreferrer">Kyle Branchesi</a></p>
      </header>

      <section class="surface controls">
        <div class="search">
          <label class="sr-only" for="searchInput">Search recipes</label>
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input id="searchInput" name="search" type="search" placeholder="Search recipes by ingredient, sauce, or name..." aria-label="Search recipes" />
        </div>
        <button class="filter-button" data-toggle-filter>
          <span>🧭 Filters</span>
          <span class="count">${filterCount()}</span>
        </button>
        <div class="mode-row" role="group" aria-label="List mode">
          <button class="chip ${state.listMode === "all" ? "active" : ""}" data-mode="all" title="The complete archive. Curation is not our strength.">🍚 All</button>
          <button class="chip ${state.listMode === "favorites" ? "active" : ""}" data-mode="favorites" title="Your personal canon. The selections are not random.">★ Favorites (${favoritesCount})</button>
          <button class="chip ${state.listMode === "cooked" ? "active" : ""}" data-mode="cooked" title="Evidence of past ambitions. The outcomes were not uniform.">✅ Cooked (${cookedCount})</button>
          <button class="chip" data-surprise title="For the algorithmically adventurous. The risk is not zero.">🎲 Surprise Me!</button>
        </div>
      </section>

      <section class="surface filter-tabs-section" style="${mobile ? "display:none" : "display:block"}">
        <div class="filter-tabs">
          ${buildFilterDropdown("The Main Event", proteinOptions, state.protein, "protein")}
          ${buildFilterDropdown("Geographic Inspiration", cuisineOptions, state.cuisine, "cuisine")}
          ${buildFilterDropdown("Thermal Enthusiasm", spiceOptions, state.spice, "spice")}
          <div class="filter-dropdown" data-dropdown="batch">
            <button class="filter-dropdown-button ${state.batch !== "2" ? "has-selection" : ""}" data-dropdown-toggle="batch">
              <span class="filter-dropdown-label">Rice Ambition:</span>
              <span class="filter-dropdown-value">${state.batch === "2" ? "2 cups" : "1 cup"}</span>
              <span class="filter-dropdown-icon">▼</span>
            </button>
            <div class="filter-dropdown-menu" data-dropdown-menu="batch">
              <button class="chip ${state.batch === "2" ? "active" : ""}" data-batch="2">🍚 2 cups</button>
              <button class="chip ${state.batch === "1" ? "active" : ""}" data-batch="1">🍙 1 cup</button>
            </div>
          </div>
        </div>
        ${buildActiveFilters()}
      </section>

      ${buildWeekPlanSection()}

      <main class="layout ${layoutClass}">
        <aside class="surface list-panel">
          <div class="sticky-bar">
            <div>${filtered.length} recipes</div>
            <button class="filter-button" data-toggle-filter">Filters</button>
          </div>
          ${buildList(filtered)}
        </aside>

        <section class="surface detail-panel">
          ${mobile ? `<button class="back-button" data-back>&larr; Back to list</button>` : ""}
          ${buildDetail(selectedRecipe, selectedInFiltered)}
        </section>
      </main>

      <footer class="footer">
        <span class="footer-icon" aria-hidden="true">⚠️</span>
        <span>
          Respect your cooker’s max fill line. For mixed dishes, Keep Warm is best for <strong>6–12 hours max</strong>; refrigerate if holding longer.
          Always ensure proteins are cooked through.
        </span>
      </footer>
    </div>

    <div class="filter-overlay ${state.showFilters ? "show" : ""}" data-filter-overlay></div>
    <div class="filter-sheet ${state.showFilters ? "open" : ""}" role="dialog" aria-label="Filters" aria-modal="true">
      <div class="filter-sheet-header">
        <div class="filter-sheet-title">Filters</div>
        <button class="icon-button" data-close-filter aria-label="Close filters">✕</button>
      </div>
      <div class="filter-group">
        <h4>Protein</h4>
        <div class="chips">${buildChips(proteinOptions, state.protein, "protein")}</div>
      </div>
      <div class="filter-group">
        <h4>Cuisine</h4>
        <div class="chips">${buildChips(cuisineOptions, state.cuisine, "cuisine")}</div>
      </div>
      <div class="filter-group">
        <h4>Spice</h4>
        <div class="chips">${buildChips(spiceOptions, state.spice, "spice")}</div>
      </div>
      <div class="filter-group">
        <h4>Batch</h4>
        <div class="chips">
          <button class="chip ${state.batch === "2" ? "active" : ""}" data-batch="2">🍚 2 cups</button>
          <button class="chip ${state.batch === "1" ? "active" : ""}" data-batch="1">🍙 1 cup</button>
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="ghost" data-clear>Clear</button>
        <button class="chip active" data-apply>Apply</button>
      </div>
    </div>

    <div class="modal-overlay ${state.showShoppingList ? "show" : ""}" data-shopping-overlay></div>
    <div class="modal-sheet ${state.showShoppingList ? "open" : ""}" role="dialog" aria-label="Shopping list" aria-modal="true">
      <div class="modal-header">
        <div>
          <div class="modal-title">🛒 Shopping list</div>
          <div class="modal-sub">${currentPlan ? currentPlan.weekLabel : ""}</div>
        </div>
        <button class="icon-button" data-shopping-close aria-label="Close shopping list">✕</button>
      </div>
      <pre class="shopping-pre">${escapeHtml(shoppingText)}</pre>
      <div class="modal-actions">
        <button class="chip active" data-shopping-copy>Copy</button>
      </div>
    </div>

    <div class="cook-overlay ${state.showCookMode ? "show" : ""}" data-cook-overlay></div>
    <div class="cook-sheet ${state.showCookMode ? "open" : ""}" role="dialog" aria-label="Cook mode" aria-modal="true">
      <div class="cook-header">
        <div>
          <div class="cook-title">👩‍🍳 Cook mode</div>
          <div class="cook-sub">${cookRecipe ? escapeHtml(cookRecipe.name) : ""}</div>
        </div>
        <button class="icon-button" data-cook-close aria-label="Exit cook mode">✕</button>
      </div>

      ${
        cookRecipe
          ? `
        <div class="cook-meta">
          <span>${getCuisineEmoji(cookRecipe.cuisine)} ${escapeHtml(cookRecipe.cuisine)}</span>
          <span>⚙️ ${escapeHtml(cookRecipe.setting)}</span>
          <span>🍽️ ${escapeHtml(cookBatchLabel)}</span>
        </div>
      `
          : ""
      }

      <div class="cook-toolbar">
        <button class="ghost" data-cook-reset>Reset</button>
        <button class="ghost" data-cook-copy>Copy steps</button>
        <button class="ghost" data-keep-awake ${wakeLockSupported ? "" : "disabled"}>${
          wakeLockSupported ? (state.keepAwake ? "Awake on" : "Keep awake") : "Keep awake (unsupported)"
        }</button>
      </div>

      <div class="cook-steps">
        ${
          cookRecipe
            ? cookSteps
                .map((step, idx) => {
                  const checked = state.cookModeChecks[idx] ? "checked" : "";
                  return `
                  <label class="cook-step">
                    <input type="checkbox" data-cook-step="${idx}" ${checked} />
                    <span>${escapeHtml(step)}</span>
                  </label>
                `;
                })
                .join("")
            : `<div class="empty-state">A recipe selection is required to proceed. The interface, while elegant, is not telepathic.</div>`
        }
      </div>
    </div>
  `;

  const searchInput = app.querySelector("#searchInput");
  searchInput.value = state.search;
  searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    if (isMobile() && state.selectedId) {
      state.selectedId = null;
      state.selectionSource = "none";
      clearRecipeHash();
    }
    render();
  });

  app.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.listMode = btn.getAttribute("data-mode") || "all";
      if (isMobile() && state.selectedId) {
        state.selectedId = null;
        state.selectionSource = "none";
        clearRecipeHash();
      }
      render();
    });
  });

  const surpriseBtn = app.querySelector("[data-surprise]");
  if (surpriseBtn) {
    surpriseBtn.addEventListener("click", (e) => {
      if (!filtered.length) return;

      // RIDICULOUS TEMU-STYLE CHAOS ACTIVATED! 🎲💥✨
      const btn = e.currentTarget;
      const appShell = document.querySelector('.app-shell');

      // Button animation
      btn.classList.add('surprise-button-active');
      setTimeout(() => btn.classList.remove('surprise-button-active'), 1200);

      // Screen shake
      if (appShell) {
        appShell.classList.add('screen-shake-active');
        setTimeout(() => appShell.classList.remove('screen-shake-active'), 500);
      }

      // EMOJI EXPLOSION! 🎉💥🌟⭐✨🎊🎲🍚🔥
      const emojis = ['🎉', '💥', '🌟', '⭐', '✨', '🎊', '🎲', '🍚', '🔥', '🎆', '💫', '🌈', '🍱', '🥘', '🎯'];
      const burstCount = 15 + Math.floor(Math.random() * 10);

      for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
          const emoji = document.createElement('div');
          emoji.className = 'emoji-burst';
          emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          emoji.style.left = `${Math.random() * 100}%`;
          emoji.style.top = `${Math.random() * 100}%`;
          emoji.style.animationDelay = `${Math.random() * 0.3}s`;
          emoji.style.animationDuration = `${1 + Math.random() * 0.5}s`;
          document.body.appendChild(emoji);

          setTimeout(() => emoji.remove(), 2000);
        }, i * 40);
      }

      // Silly sound effect (using Web Audio API)
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;

        oscillator.start();

        // Fun ascending tone
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (err) {
        // Audio context not supported, that's okay!
      }

      // Actually pick the recipe
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      if (!pick) return;

      setTimeout(() => {
        state.selectedId = pick.id;
        state.selectionSource = "list";
        setRecipeHash(pick.id);
        if (isMobile()) window.scrollTo({ top: 0, behavior: "smooth" });
        render();
      }, 300);
    });
  }

  app.querySelectorAll("[data-protein]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.protein = btn.getAttribute("data-protein");
      if (isMobile() && state.selectedId) {
        state.selectedId = null;
        state.selectionSource = "none";
        clearRecipeHash();
      }
      render();
    });
  });

  app.querySelectorAll("[data-cuisine]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cuisine = btn.getAttribute("data-cuisine");
      if (isMobile() && state.selectedId) {
        state.selectedId = null;
        state.selectionSource = "none";
        clearRecipeHash();
      }
      render();
    });
  });

  app.querySelectorAll("[data-spice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.spice = btn.getAttribute("data-spice");
      if (isMobile() && state.selectedId) {
        state.selectedId = null;
        state.selectionSource = "none";
        clearRecipeHash();
      }
      render();
    });
  });

  app.querySelectorAll("[data-batch]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.batch = btn.getAttribute("data-batch");
      render();
    });
  });

  app.querySelectorAll(".list-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-id"), 10);
      state.selectedId = id;
      state.selectionSource = "list";
      setRecipeHash(id);
      if (isMobile()) window.scrollTo({ top: 0, behavior: "smooth" });
      render();
    });
  });

  const backBtn = app.querySelector("[data-back]");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      state.selectedId = null;
      state.selectionSource = "none";
      clearRecipeHash();
      render();
    });
  }

  const toggleFilterButtons = app.querySelectorAll("[data-toggle-filter]");
  toggleFilterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.showFilters = true;
      render();
    });
  });

  const overlay = app.querySelector("[data-filter-overlay]");
  if (overlay) {
    overlay.addEventListener("click", () => {
      state.showFilters = false;
      render();
    });
  }

  const closeFilterBtn = app.querySelector("[data-close-filter]");
  if (closeFilterBtn) {
    closeFilterBtn.addEventListener("click", () => {
      state.showFilters = false;
      render();
    });
  }

  const applyBtn = app.querySelector("[data-apply]");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      state.showFilters = false;
      render();
    });
  }

  const clearBtn = app.querySelector("[data-clear]");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.protein = "all";
      state.cuisine = "all";
      state.spice = "all";
      state.batch = "2";
      state.showFilters = false;
      render();
    });
  }

  const clearAllBtn = app.querySelector("[data-clear-all]");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      state.search = "";
      state.protein = "all";
      state.cuisine = "all";
      state.spice = "all";
      state.showFilters = false;
      render();
    });
  }

  app.querySelectorAll("[data-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-favorite"), 10);
      if (Number.isNaN(id)) return;
      toggleFavorite(id);
    });
  });

  app.querySelectorAll("[data-cooked-mark]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-cooked-mark"), 10);
      if (Number.isNaN(id)) return;
      markCooked(id);
    });
  });

  app.querySelectorAll("[data-cooked-clear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-cooked-clear"), 10);
      if (Number.isNaN(id)) return;
      clearCooked(id);
    });
  });

  app.querySelectorAll("[data-rate-id][data-rate]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-rate-id"), 10);
      const rating = parseInt(btn.getAttribute("data-rate"), 10);
      if (Number.isNaN(id) || Number.isNaN(rating)) return;
      setCookedRating(id, rating);
    });
  });

  app.querySelectorAll("[data-cook-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-cook-open"), 10);
      if (Number.isNaN(id)) return;
      state.showCookMode = true;
      state.cookModeId = id;
      state.cookModeChecks = {};
      state.showFilters = false;
      state.showShoppingList = false;
      state.keepAwake = false;
      disableWakeLock();
      render();
    });
  });

  const cookOverlay = app.querySelector("[data-cook-overlay]");
  if (cookOverlay) {
    cookOverlay.addEventListener("click", () => {
      state.showCookMode = false;
      state.cookModeId = null;
      state.cookModeChecks = {};
      state.keepAwake = false;
      disableWakeLock();
      render();
    });
  }

  const cookClose = app.querySelector("[data-cook-close]");
  if (cookClose) {
    cookClose.addEventListener("click", () => {
      state.showCookMode = false;
      state.cookModeId = null;
      state.cookModeChecks = {};
      state.keepAwake = false;
      disableWakeLock();
      render();
    });
  }

  const cookReset = app.querySelector("[data-cook-reset]");
  if (cookReset) {
    cookReset.addEventListener("click", () => {
      state.cookModeChecks = {};
      render();
    });
  }

  const cookCopy = app.querySelector("[data-cook-copy]");
  if (cookCopy) {
    cookCopy.addEventListener("click", async () => {
      if (!cookRecipe) return;
      const text = buildCookStepsText(cookRecipe, cookBatchLabel, cookSteps);
      const ok = await copyToClipboard(text);
      if (!ok) return;
      cookCopy.textContent = "Copied!";
      window.setTimeout(() => (cookCopy.textContent = "Copy steps"), 1200);
    });
  }

  const keepAwakeBtn = app.querySelector("[data-keep-awake]");
  if (keepAwakeBtn && !keepAwakeBtn.disabled) {
    keepAwakeBtn.addEventListener("click", async () => {
      if (!state.showCookMode) return;
      if (state.keepAwake) {
        state.keepAwake = false;
        await disableWakeLock();
        render();
        return;
      }

      const ok = await enableWakeLock();
      state.keepAwake = ok;
      render();
    });
  }

  app.querySelectorAll("[data-cook-step]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const idx = parseInt(checkbox.getAttribute("data-cook-step"), 10);
      if (Number.isNaN(idx)) return;
      if (checkbox.checked) {
        state.cookModeChecks[idx] = true;
      } else {
        delete state.cookModeChecks[idx];
      }
    });
  });

  app.querySelectorAll("[data-share]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.getAttribute("data-share"), 10);
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return;

      const url = `${window.location.origin}${window.location.pathname}#recipe-${id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: recipe.name, text: recipe.name, url });
        } catch (err) {
          // user canceled
        }
      } else if (await copyToClipboard(url)) {
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Share"), 1200);
      }
    });
  });

  app.querySelectorAll("[data-copy-recipe]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.getAttribute("data-copy-recipe"), 10);
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return;

      const text = buildRecipeCopyText(recipe);
      const ok = await copyToClipboard(text);
      if (!ok) return;

      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy recipe"), 1200);
    });
  });

  app.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.getAttribute("data-copy"), 10);
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return;

      const text = [
        `${recipe.name}`,
        `Protein: ${recipe.protein}`,
        `Veggies: ${recipe.veggies}`,
        `Sauces: ${recipe.sauces}`,
        `Rice: ${adjustForBatch(recipe.riceAmount, state.batch)}`,
        `Liquid: ${adjustForBatch(recipe.liquid, state.batch)}`,
      ].join("\\n");

      const ok = await copyToClipboard(text);
      if (!ok) return;

      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy ingredients"), 1200);
    });
  });

  const planGenerate = app.querySelector("[data-plan-generate]");
  if (planGenerate) {
    planGenerate.addEventListener("click", () => {
      generateCurrentWeekPlanFromState();
    });
  }

  const planReshuffle = app.querySelector("[data-plan-reshuffle]");
  if (planReshuffle) {
    planReshuffle.addEventListener("click", () => {
      reshuffleCurrentWeekPlan(state.weeklyPlan);
    });
  }

  const planUseCurrent = app.querySelector("[data-plan-use-current]");
  if (planUseCurrent) {
    planUseCurrent.addEventListener("click", () => {
      if (!state.weeklyPlan) return;
      reshuffleCurrentWeekPlan(state.weeklyPlan, getConstraintsFromState());
    });
  }

  const planShopping = app.querySelector("[data-plan-shopping]");
  if (planShopping) {
    planShopping.addEventListener("click", () => {
      state.showShoppingList = true;
      render();
    });
  }

  const planClear = app.querySelector("[data-plan-clear]");
  if (planClear) {
    planClear.addEventListener("click", () => {
      clearCurrentWeekPlan();
    });
  }

  const planShare = app.querySelector("[data-plan-share]");
  if (planShare) {
    planShare.addEventListener("click", async () => {
      if (!state.weeklyPlan) return;
      const text = buildWeekPlanShareText(state.weeklyPlan);
      const url = `${window.location.origin}${window.location.pathname}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: "Rice Lab weekly plan", text, url });
        } catch {
          // user canceled
        }
        return;
      }

      const ok = await copyToClipboard(text);
      if (!ok) return;
      planShare.textContent = "Copied!";
      setTimeout(() => (planShare.textContent = "Share"), 1200);
    });
  }

  const shoppingOverlay = app.querySelector("[data-shopping-overlay]");
  if (shoppingOverlay) {
    shoppingOverlay.addEventListener("click", () => {
      state.showShoppingList = false;
      render();
    });
  }

  const shoppingClose = app.querySelector("[data-shopping-close]");
  if (shoppingClose) {
    shoppingClose.addEventListener("click", () => {
      state.showShoppingList = false;
      render();
    });
  }

  const shoppingCopy = app.querySelector("[data-shopping-copy]");
  if (shoppingCopy) {
    shoppingCopy.addEventListener("click", async () => {
      const text = currentPlan ? buildShoppingListText(currentPlan) : shoppingText;
      const ok = await copyToClipboard(text);
      if (!ok) return;
      shoppingCopy.textContent = "Copied!";
      window.setTimeout(() => (shoppingCopy.textContent = "Copy"), 1200);
    });
  }

  app.querySelectorAll("[data-plan-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-plan-open"), 10);
      if (Number.isNaN(id)) return;
      state.selectedId = id;
      state.selectionSource = "plan";
      setRecipeHash(id);
      if (isMobile()) window.scrollTo({ top: 0, behavior: "smooth" });
      render();
    });
  });

  // Filter dropdown toggles
  app.querySelectorAll("[data-dropdown-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dropdown = btn.closest(".filter-dropdown");
      const menu = dropdown.querySelector(".filter-dropdown-menu");
      const isOpen = menu.classList.contains("open");

      // Close all other dropdowns
      app.querySelectorAll(".filter-dropdown-menu.open").forEach(m => {
        if (m !== menu) m.classList.remove("open");
      });
      app.querySelectorAll(".filter-dropdown.open").forEach(d => {
        if (d !== dropdown) d.classList.remove("open");
      });

      // Toggle current dropdown
      if (isOpen) {
        menu.classList.remove("open");
        dropdown.classList.remove("open");
      } else {
        menu.classList.add("open");
        dropdown.classList.add("open");
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown")) {
      app.querySelectorAll(".filter-dropdown-menu.open").forEach(m => m.classList.remove("open"));
      app.querySelectorAll(".filter-dropdown.open").forEach(d => d.classList.remove("open"));
    }
  });

  // Clear individual filters
  app.querySelectorAll("[data-clear-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-clear-filter");
      if (type === "protein") state.protein = "all";
      if (type === "cuisine") state.cuisine = "all";
      if (type === "spice") state.spice = "all";
      if (isMobile() && state.selectedId) {
        state.selectedId = null;
        state.selectionSource = "none";
        clearRecipeHash();
      }
      render();
    });
  });

  app.querySelectorAll("[data-plan-swap]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-plan-swap"), 10);
      if (Number.isNaN(idx)) return;
      swapCurrentWeekPlanSlot(state.weeklyPlan, idx);
    });
  });

  app.querySelectorAll("[data-plan-lock]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-plan-lock"), 10);
      if (Number.isNaN(idx)) return;
      toggleCurrentWeekPlanLock(state.weeklyPlan, idx);
    });
  });
}

syncFromHash();
render();
