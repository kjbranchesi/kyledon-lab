import "./styles.css";
import { recipes } from "./data/recipes.js";

const state = {
  search: "",
  protein: "all",
  cuisine: "all",
  batch: "2",
  selectedId: null,
  showFilters: false,
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
  ["Mexican", "🌮", "Mex"],
  ["Fusion", "✨", "Fusion"],
  ["Other", "🍽️", "Other"],
];

const mediaQuery = window.matchMedia("(max-width: 960px)");
mediaQuery.addEventListener("change", () => render());

const app = document.getElementById("app");

function syncFromHash() {
  const hash = window.location.hash;
  if (hash.startsWith("#recipe-")) {
    const id = parseInt(hash.replace("#recipe-", ""), 10);
    if (!Number.isNaN(id)) {
      state.selectedId = id;
    }
  }
}

window.addEventListener("hashchange", () => {
  syncFromHash();
  render();
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
    return matchesQuery && matchesProtein && matchesCuisine;
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

function buildInstructions(recipe, batchLabel) {
  const rice = adjustForBatch(recipe.riceAmount, state.batch);
  const liquid = adjustForBatch(recipe.liquid, state.batch);

  return `
    <ol>
      <li>Rinse rice until water runs mostly clear. Add rice to your cooker pot.</li>
      <li>Add liquid: ${liquid}.</li>
      <li>Layer in protein and veggies: ${recipe.protein}; ${recipe.veggies}.</li>
      <li>Add sauces: ${recipe.sauces}. Keep aromatics on top to avoid scorching.</li>
      <li>Select the ${recipe.setting} setting. Close the lid and cook.</li>
      <li>Rest 5–10 minutes after cooking. Fluff gently to keep grains intact.</li>
      <li>Finish with toppings or chili crisp if desired. Serve ${batchLabel.toLowerCase()}.</li>
    </ol>
  `;
}

function buildDetail(recipe) {
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
  const tagsHtml = (recipe.tags || [])
    .map((tag) => `<span class="badge">${tag}</span>`)
    .join("");

  return `
    <div class="detail-header">
      <h2><span>${getProteinEmoji(recipe.proteinType)}</span> ${recipe.name}</h2>
      <div class="actions">
        <button class="ghost" data-share="${recipe.id}">Share</button>
        <button class="ghost" data-copy="${recipe.id}">Copy ingredients</button>
      </div>
    </div>
    <div class="meta-row">
      <span>${getCuisineEmoji(recipe.cuisine)} ${recipe.cuisine}</span>
      <span>🍚 ${recipe.riceType}</span>
      <span>⚙️ ${recipe.setting}</span>
      <span>🍽️ ${batchLabel}</span>
    </div>
    ${tagsHtml ? `<div class="badge-row">${tagsHtml}</div>` : ""}

    <div class="section-label">Ingredients</div>
    <div class="info-row"><strong>Rice</strong><span>${riceAmount}</span></div>
    <div class="info-row"><strong>Liquid</strong><span>${liquid}</span></div>
    <div class="info-row"><strong>Protein</strong><span>${recipe.protein}</span></div>
    <div class="info-row"><strong>Veggies</strong><span>${recipe.veggies}</span></div>
    <div class="info-row"><strong>Sauces</strong><span>${recipe.sauces}</span></div>

    <div class="section-label">Method</div>
    ${buildInstructions(recipe, batchLabel)}
  `;
}

function filterCount() {
  let count = 0;
  if (state.protein !== "all") count += 1;
  if (state.cuisine !== "all") count += 1;
  if (state.batch !== "2") count += 1;
  return count;
}

function render() {
  const mobile = isMobile();
  const filtered = filterRecipes();

  const selectionBefore = state.selectedId;
  const hasSelected = filtered.some((r) => r.id === state.selectedId);

  if (!hasSelected) {
    if (!mobile && filtered.length) {
      state.selectedId = filtered[0].id;
      window.location.hash = `recipe-${state.selectedId}`;
    } else {
      state.selectedId = null;
      if (selectionBefore) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    }
  }

  const selected = filtered.find((r) => r.id === state.selectedId) || null;
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
          ${buildList(filtered)}
        </aside>

        <section class="surface detail-panel">
          ${mobile ? `<button class="back-button" data-back>&larr; Back to list</button>` : ""}
          ${buildDetail(selected)}
        </section>
      </main>
    </div>

    <div class="filter-overlay ${state.showFilters ? "show" : ""}" data-filter-overlay></div>
    <div class="filter-sheet ${state.showFilters ? "open" : ""}" role="dialog" aria-label="Filters">
      <div class="filter-group">
        <h4>Protein</h4>
        <div class="chips">${buildChips(proteinOptions, state.protein, "protein")}</div>
      </div>
      <div class="filter-group">
        <h4>Cuisine</h4>
        <div class="chips">${buildChips(cuisineOptions, state.cuisine, "cuisine")}</div>
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
    render();
  });

  app.querySelectorAll("[data-protein]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.protein = btn.getAttribute("data-protein");
      render();
    });
  });

  app.querySelectorAll("[data-cuisine]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cuisine = btn.getAttribute("data-cuisine");
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
      window.location.hash = `recipe-${id}`;
      if (isMobile()) window.scrollTo({ top: 0, behavior: "smooth" });
      render();
    });
  });

  const backBtn = app.querySelector("[data-back]");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      state.selectedId = null;
      history.pushState("", document.title, window.location.pathname + window.location.search);
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
      state.batch = "2";
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
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Share"), 1200);
      }
    });
  });

  app.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.getAttribute("data-copy"), 10);
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe || !navigator.clipboard) return;

      const text = [
        `${recipe.name}`,
        `Protein: ${recipe.protein}`,
        `Veggies: ${recipe.veggies}`,
        `Sauces: ${recipe.sauces}`,
        `Rice: ${adjustForBatch(recipe.riceAmount, state.batch)}`,
        `Liquid: ${adjustForBatch(recipe.liquid, state.batch)}`,
      ].join("\\n");

      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy ingredients"), 1200);
    });
  });
}

syncFromHash();
render();
