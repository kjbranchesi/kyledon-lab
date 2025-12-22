import "./styles.css";
import { recipes } from "./data/recipes.js";

const state = {
  search: "",
  protein: "all",
  cuisine: "all",
  spice: "all",
  batch: "2",
  selectedId: null,
  selectionSource: "none", // "none" | "list" | "hash" | "plan"
  ignoreNextHashChange: false,
  showFilters: false,
  weeklyPlan: null,
  planAnimation: null, // { type: "generate"|"shuffle"|"swap", slotIndex?: number }
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.showFilters) {
    state.showFilters = false;
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
          <div class="note-title">✅ Samin-style taste fix</div>
          <ul>
            <li><strong>Flat</strong> → add salt (soy/salt) a little at a time.</li>
            <li><strong>Heavy</strong> → add acid (vinegar/citrus).</li>
            <li><strong>Too sharp/spicy</strong> → add fat (oil/butter) or a touch of sweet.</li>
            <li><strong>Boring</strong> → add heat + fresh aromatics.</li>
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
    return matchesQuery && matchesProtein && matchesCuisine && matchesSpice;
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
          <button class="chip active" data-plan-generate>Make my week</button>
        </div>
        <p class="week-plan-note">Get 3 recipe picks with built-in variety. Swap or lock any slot.</p>
      </section>
    `;
  }

  const badges = buildConstraintBadges(plan.constraints);
  const fallbackNote = plan.usedFallback
    ? `<div class="week-plan-warn">Not enough recipes matched your constraints — plan widened to all recipes.</div>`
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
          <button class="ghost" data-plan-use-current>Use current filters</button>
          <button class="chip active" data-plan-reshuffle>Reshuffle</button>
          <button class="ghost" data-plan-share>Share</button>
          <button class="ghost" data-plan-clear>Clear</button>
        </div>
      </div>

      <div class="badge-row">${badges}</div>
      ${fallbackNote}

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

function buildList(filtered) {
  if (!filtered.length) {
    return `<div class="empty-state">No recipes match your search and filters.</div>`;
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
          return `
            <button class="list-item ${active ? "active" : ""}" data-id="${recipe.id}" role="listitem">
              <div class="item-title">
                <h3>${getProteinEmoji(recipe.proteinType)} ${recipe.name}</h3>
                <span class="pill">${recipe.proteinType}</span>
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
        <h3 style="margin:0 0 6px;">Welcome to the Rice Lab</h3>
        <p>Search or open filters to find a recipe. On mobile, tap a recipe to dive into detail.</p>
      </div>
    `;
  }

  const riceAmount = adjustForBatch(recipe.riceAmount, state.batch);
  const liquid = adjustForBatch(recipe.liquid, state.batch);
  const batchLabel = state.batch === "2" ? "Standard batch (2 cups)" : "Half batch (1 cup)";
  const spice = getSpiceLevel(recipe);
  const hasActiveFilters =
    state.search.trim().length > 0 || state.protein !== "all" || state.cuisine !== "all" || state.spice !== "all";
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

  return `
    <div class="detail-header">
      <h2><span>${getProteinEmoji(recipe.proteinType)}</span> ${recipe.name}</h2>
      <div class="actions">
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

function render() {
  ensureCurrentWeekPlanLoaded();
  const mobile = isMobile();
  const filtered = filterRecipes();

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

  app.innerHTML = `
    <div class="app-shell">
      <header>
        <div class="hero-emoji">🇯🇵 🍚 🇯🇵</div>
        <h1>Kylē Don (丼) Rice Lab</h1>
        <p class="subtitle">One Zojirushi, many experiments.</p>
        <p class="description">Find Zojirushi-friendly one-pot rice cooker recipes. Built mobile-first for quick browsing and cooking.</p>
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
        <div class="chip-row" aria-hidden="true" style="${mobile ? "display:none" : "display:flex; gap:6px; flex-wrap:wrap; padding:4px 0;"}">
          ${buildChips(proteinOptions, state.protein, "protein")}
          ${buildChips(cuisineOptions, state.cuisine, "cuisine")}
          ${buildChips(spiceOptions, state.spice, "spice")}
          <button class="chip ${state.batch === "2" ? "active" : ""}" data-batch="2">🍚 2 cups</button>
          <button class="chip ${state.batch === "1" ? "active" : ""}" data-batch="1">🍙 1 cup</button>
        </div>
      </section>

      <main class="layout ${layoutClass}">
        <aside class="surface list-panel">
          <div class="sticky-bar">
            <div>${filtered.length} recipes</div>
            <button class="filter-button" data-toggle-filter>Filters</button>
          </div>
          ${buildWeekPlanSection()}
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
