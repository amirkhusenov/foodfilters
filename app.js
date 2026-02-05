(() => {
  "use strict";

  // ---------------------------
  // Static "auth for show" data
  // ---------------------------
  const USERS = [
    { id: "u1", login: "admin", password: "admin123", name: "Администратор", role: "admin" },
    { id: "u2", login: "user", password: "user123", name: "Пользователь", role: "user" },
  ];

  // ---------------------------
  // Storage keys
  // ---------------------------
  const LS = {
    currentUser: "ff_currentUser",
    foods: "ff_foods",
    orders: "ff_orders",
    foodView: "ff_foodView",
    cartPrefix: "ff_cart_", // per-user cart: ff_cart_<login>
  };

  // ---------------------------
  // Small utils
  // ---------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  function toDateLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function toDateShort(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  function clampText(s, max = 110) {
    const str = String(s || "").trim();
    if (str.length <= max) return str;
    return `${str.slice(0, max - 1)}…`;
  }

  // ---------------------------
  // Seed data (foods + example orders)
  // ---------------------------
  function seedFoods() {
    /** @type {Array<Food>} */
    const foods = [
      {
        id: "f1",
        name: "Маргарита",
        category: "Пицца",
        price: 520,
        ingredients: ["сыр", "томатный соус", "базилик"],
        description: "Классическая пицца с томатами и базиликом.",
        veg: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
      },
      {
        id: "f2",
        name: "Пепперони",
        category: "Пицца",
        price: 640,
        ingredients: ["сыр", "пепперони", "томатный соус"],
        description: "Острая пицца с колбасками пепперони.",
        veg: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
      {
        id: "f3",
        name: "Цезарь",
        category: "Салаты",
        price: 390,
        ingredients: ["курица", "салат", "гренки", "соус"],
        description: "Салат с курицей, гренками и классическим соусом.",
        veg: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      },
      {
        id: "f4",
        name: "Том-ям",
        category: "Супы",
        price: 560,
        ingredients: ["креветки", "лайм", "кокос", "чили"],
        description: "Острый тайский суп с креветками.",
        veg: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: "f5",
        name: "Рамен (овощной)",
        category: "Супы",
        price: 480,
        ingredients: ["лапша", "овощи", "бульон", "кунжут"],
        description: "Лёгкий рамен с овощами.",
        veg: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      },
      {
        id: "f6",
        name: "Бургер классический",
        category: "Бургеры",
        price: 450,
        ingredients: ["говядина", "булочка", "сыр", "соус"],
        description: "Сочный бургер с говядиной и сыром.",
        veg: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      },
      {
        id: "f7",
        name: "Фалафель",
        category: "Закуски",
        price: 310,
        ingredients: ["нут", "специи", "соус тахини"],
        description: "Хрустящие шарики из нута.",
        veg: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
      {
        id: "f8",
        name: "Лимонад",
        category: "Напитки",
        price: 180,
        ingredients: ["лимон", "вода", "сахар"],
        description: "Домашний лимонад.",
        veg: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      },
    ];
    writeJSON(LS.foods, foods);
    return foods;
  }

  function ensureSeed() {
    const foods = readJSON(LS.foods, null);
    if (!Array.isArray(foods) || foods.length === 0) seedFoods();

    const orders = readJSON(LS.orders, null);
    if (!Array.isArray(orders)) writeJSON(LS.orders, []);
  }

  // ---------------------------
  // App state
  // ---------------------------
  /** @type {{ activeFoodId: string|null }} */
  const ui = {
    activeFoodId: null,
  };

  function getCurrentUser() {
    return readJSON(LS.currentUser, null);
  }

  function setCurrentUser(user) {
    if (!user) localStorage.removeItem(LS.currentUser);
    else writeJSON(LS.currentUser, user);
  }

  function requireAuth() {
    const u = getCurrentUser();
    if (u) return true;
    openModal("loginModal");
    return false;
  }

  function isAdmin() {
    const u = getCurrentUser();
    return u?.role === "admin";
  }

  // ---------------------------
  // Routing (hash)
  // ---------------------------
  function getRoute() {
    const raw = location.hash || "#/home";
    const m = raw.match(/^#\/([a-z]+)/i);
    return (m?.[1] || "home").toLowerCase();
  }

  function showPage(pageName) {
    $$(".page").forEach((el) => el.classList.toggle("hidden", el.dataset.page !== pageName));
    $$(".nav__link").forEach((a) => a.classList.toggle("isActive", a.dataset.nav === pageName));
  }

  function onRoute() {
    const page = getRoute();
    const allowed = new Set(["home", "menu", "cart"]);
    const target = allowed.has(page) ? page : "home";
    showPage(target);
  }

  // ---------------------------
  // Modals
  // ---------------------------
  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
  }

  function wireModalClose() {
    document.addEventListener("click", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      const closeKey = t?.getAttribute?.("data-close");
      if (!closeKey) return;

      if (closeKey === "login") {
        // If user is not logged in, do not allow closing the auth modal
        if (!getCurrentUser()) return;
        closeModal("loginModal");
      }
      if (closeKey === "food") closeModal("foodModal");
      if (closeKey === "foodEditor") closeModal("foodEditorModal");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      // Keep login modal open until auth
      if (getCurrentUser()) closeModal("loginModal");
      closeModal("foodModal");
      closeModal("foodEditorModal");
    });
  }

  // ---------------------------
  // Auth UI + login logic
  // ---------------------------
  function renderAuth() {
    const u = getCurrentUser();
    const authUser = $("#authUser");
    const btnOpenLogin = $("#btnOpenLogin");
    const btnLogout = $("#btnLogout");
    if (!authUser || !btnOpenLogin || !btnLogout) return;

    if (u) {
      authUser.textContent = `${u.login} (${u.role})`;
      btnOpenLogin.classList.add("hidden");
      btnLogout.classList.remove("hidden");
    } else {
      authUser.textContent = "";
      btnOpenLogin.classList.remove("hidden");
      btnLogout.classList.add("hidden");
    }
  }

  function wireAuth() {
    $("#btnOpenLogin")?.addEventListener("click", () => openModal("loginModal"));
    $("#btnLogout")?.addEventListener("click", () => {
      setCurrentUser(null);
      renderAuth();
      renderMenu(); // refresh buttons visibility
      renderCart();
      openModal("loginModal");
    });

    $("#loginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const login = $("#loginValue")?.value?.trim?.() || "";
      const pass = $("#passwordValue")?.value || "";
      const err = $("#loginError");

      const found = USERS.find((u) => u.login === login && u.password === pass);
      if (!found) {
        if (err) {
          err.textContent = "Неверный логин или пароль.";
          err.classList.remove("hidden");
        }
        return;
      }

      if (err) err.classList.add("hidden");
      setCurrentUser({ id: found.id, login: found.login, name: found.name, role: found.role });
      closeModal("loginModal");
      renderAuth();
      renderMenu();
      renderCart();
    });
  }

  // ---------------------------
  // Cart (per user)
  // ---------------------------
  function cartKey() {
    const u = getCurrentUser();
    if (!u?.login) return null;
    return `${LS.cartPrefix}${u.login}`;
  }

  function getCart() {
    const key = cartKey();
    if (!key) return [];
    const items = readJSON(key, []);
    return Array.isArray(items) ? items : [];
  }

  function setCart(items) {
    const key = cartKey();
    if (!key) return;
    writeJSON(key, items);
  }

  function addToCart(foodId, qty = 1) {
    const items = getCart();
    const found = items.find((x) => x.foodId === foodId);
    if (found) found.qty = Math.min(99, (Number(found.qty) || 0) + qty);
    else items.push({ foodId, qty: Math.min(99, qty) });
    setCart(items);
  }

  // ---------------------------
  // Foods CRUD + filters + sorting + modal
  // ---------------------------
  function getFoods() {
    const foods = readJSON(LS.foods, []);
    return Array.isArray(foods) ? foods : [];
  }

  function setFoods(foods) {
    writeJSON(LS.foods, foods);
  }

  function foodMatchesSearch(food, q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const hay = [
      food.name,
      food.category,
      food.description,
      ...(Array.isArray(food.ingredients) ? food.ingredients : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  }

  function getFoodFilters() {
    return {
      q: $("#foodSearch")?.value || "",
      category: $("#foodCategory")?.value || "all",
      veg: $("#foodVeg")?.value || "all",
      sort: $("#foodSort")?.value || "date_desc",
      view: $("#foodView")?.value || readJSON(LS.foodView, "cards") || "cards",
    };
  }

  function setFoodView(view) {
    writeJSON(LS.foodView, view);
  }

  function applyFoodFilters(foods) {
    const f = getFoodFilters();
    let list = foods.slice();

    list = list.filter((x) => foodMatchesSearch(x, f.q));

    if (f.category !== "all") {
      list = list.filter((x) => String(x.category || "").toLowerCase() === String(f.category).toLowerCase());
    }

    if (f.veg === "yes") list = list.filter((x) => !!x.veg);
    if (f.veg === "no") list = list.filter((x) => !x.veg);

    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      if (Number.isNaN(da) || Number.isNaN(db)) return 0;
      return f.sort === "date_asc" ? da - db : db - da;
    });

    return list;
  }

  function ensureFoodCategoryOptions(foods) {
    const sel = $("#foodCategory");
    if (!sel) return;
    const current = sel.value || "all";
    const categories = Array.from(new Set(foods.map((f) => String(f.category || "").trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
    sel.innerHTML = `<option value="all">Все</option>${categories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("")}`;
    // restore selection if still exists
    const still = categories.some((c) => c === current);
    sel.value = still ? current : "all";
  }

  function renderFoodCards(list) {
    const grid = $("#foodGrid");
    if (!grid) return;
    grid.innerHTML = list
      .map((f) => {
        const tags = [
          `<span class="tag">${escapeHtml(f.category || "—")}</span>`,
          f.veg ? `<span class="tag">veg</span>` : `<span class="tag">non‑veg</span>`,
          `<span class="tag">${escapeHtml(toDateShort(f.createdAt))}</span>`,
        ].join(" ");
        return `
          <article class="card" role="button" tabindex="0" data-food-id="${escapeHtml(f.id)}">
            <h3 class="card__title">${escapeHtml(f.name)}</h3>
            <div class="card__meta">
              ${tags}
              <span class="price">${escapeHtml(String(f.price))} ₽</span>
            </div>
            <div class="card__desc">${escapeHtml(clampText(f.description || (f.ingredients || []).join(", ")))}</div>
          </article>
        `;
      })
      .join("");

    // keyboard open
    grid.querySelectorAll("[data-food-id]").forEach((el) => {
      el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const id = el.getAttribute("data-food-id");
        if (id) openFoodModal(id);
      });
    });
  }

  function renderFoodTable(list) {
    const wrap = $("#foodTableWrap");
    if (!wrap) return;
    const canEdit = isAdmin();

    wrap.innerHTML = `
      <table class="table" aria-label="Таблица блюд">
        <thead>
          <tr>
            <th>Название</th>
            <th>Категория</th>
            <th>Veg</th>
            <th class="mono">Цена</th>
            <th>Дата</th>
            <th class="actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          ${list
        .map((f) => {
          return `
                <tr data-food-id="${escapeHtml(f.id)}">
                  <td>${escapeHtml(f.name)}</td>
                  <td>${escapeHtml(f.category || "—")}</td>
                  <td class="mono">${f.veg ? "yes" : "no"}</td>
                  <td class="mono">${escapeHtml(String(f.price))} ₽</td>
                  <td class="mono">${escapeHtml(toDateShort(f.createdAt))}</td>
                  <td class="actions">
                    <button class="btn btn--ghost" type="button" data-action="open" data-id="${escapeHtml(f.id)}">Открыть</button>
                    ${canEdit
              ? `<button class="btn btn--ghost" type="button" data-action="edit" data-id="${escapeHtml(f.id)}">Ред.</button>
                           <button class="btn btn--ghost" type="button" data-action="del" data-id="${escapeHtml(f.id)}">Удал.</button>`
              : ""
            }
                  </td>
                </tr>
              `;
        })
        .join("")}
        </tbody>
      </table>
    `;
  }

  function renderMenu() {
    const foods = getFoods();
    ensureFoodCategoryOptions(foods);

    const filtered = applyFoodFilters(foods);
    const empty = $("#foodEmpty");

    const f = getFoodFilters();
    const view = f.view;
    $("#foodView").value = view;
    setFoodView(view);

    const grid = $("#foodGrid");
    const table = $("#foodTableWrap");
    if (grid) grid.classList.toggle("hidden", view !== "cards");
    if (table) table.classList.toggle("hidden", view !== "table");

    if (view === "cards") renderFoodCards(filtered);
    else renderFoodTable(filtered);

    if (empty) empty.classList.toggle("hidden", filtered.length !== 0);

    const btnNew = $("#btnNewFood");
    if (btnNew) {
      // "Добавить блюдо" видно только админу
      btnNew.classList.toggle("hidden", !isAdmin());
    }
  }

  function onFoodGridClick(e) {
    const t = /** @type {HTMLElement} */ (e.target);
    const card = t.closest?.("[data-food-id]");
    if (!card) return;
    const id = card.getAttribute("data-food-id");
    if (id) openFoodModal(id);
  }

  function onFoodTableClick(e) {
    const t = /** @type {HTMLElement} */ (e.target);
    const btn = t.closest?.("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!id) return;
    if (action === "open") openFoodModal(id);
    if (action === "edit") {
      if (!isAdmin()) return;
      openFoodEditor(id);
    }
    if (action === "del") {
      if (!isAdmin()) return;
      deleteFood(id);
    }
  }

  function openFoodModal(id) {
    const foods = getFoods();
    const f = foods.find((x) => x.id === id);
    if (!f) return;
    ui.activeFoodId = id;

    const body = $("#foodModalBody");
    if (body) {
      const ing = Array.isArray(f.ingredients) && f.ingredients.length ? f.ingredients.join(", ") : "—";
      body.innerHTML = `
        <div class="panel" style="padding:12px">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
            <div>
              <div style="font-weight:650;font-size:18px;margin-bottom:6px">${escapeHtml(f.name)}</div>
              <div class="muted" style="font-size:13px">
                <span class="tag">${escapeHtml(f.category || "—")}</span>
                <span class="tag">${f.veg ? "veg" : "non‑veg"}</span>
                <span class="tag">${escapeHtml(toDateLabel(f.createdAt))}</span>
              </div>
            </div>
            <div class="price" style="font-size:16px">${escapeHtml(String(f.price))} ₽</div>
          </div>
          <div style="margin-top:12px" class="muted">
            <div><span class="tag">Ингредиенты</span> ${escapeHtml(ing)}</div>
            <div style="margin-top:10px"><span class="tag">Описание</span> ${escapeHtml(f.description || "—")}</div>
          </div>
        </div>
      `;
    }

    // Cart + admin actions
    const addBtn = $("#btnAddToCart");
    if (addBtn) addBtn.disabled = !getCurrentUser();

    const canEdit = isAdmin();
    $("#btnEditFood")?.classList.toggle("hidden", !canEdit);
    $("#btnDeleteFood")?.classList.toggle("hidden", !canEdit);

    openModal("foodModal");
  }

  function openFoodEditor(idOrNull) {
    const isEdit = !!idOrNull;
    const foods = getFoods();
    const f = isEdit ? foods.find((x) => x.id === idOrNull) : null;

    $("#foodEditorTitle").textContent = isEdit ? "Редактирование блюда" : "Новое блюдо";
    $("#foodError")?.classList.add("hidden");

    $("#foodId").value = f?.id || "";
    $("#foodName").value = f?.name || "";
    $("#foodCategoryValue").value = f?.category || "";
    $("#foodPrice").value = f?.price != null ? String(f.price) : "";
    $("#foodIngredients").value = Array.isArray(f?.ingredients) ? f.ingredients.join(", ") : "";
    $("#foodDesc").value = f?.description || "";
    $("#foodVegValue").checked = !!f?.veg;

    openModal("foodEditorModal");
  }

  function deleteFood(id) {
    const foods = getFoods();
    const f = foods.find((x) => x.id === id);
    if (!f) return;
    const ok = confirm(`Удалить блюдо "${f.name}"?`);
    if (!ok) return;
    setFoods(foods.filter((x) => x.id !== id));
    closeModal("foodModal");
    renderMenu();
    renderCart();
  }

  function wireFoodUI() {
    // One-time event delegation (do not add inside render)
    $("#foodGrid")?.addEventListener("click", onFoodGridClick);
    $("#foodTableWrap")?.addEventListener("click", onFoodTableClick);

    ["foodSearch", "foodCategory", "foodVeg", "foodSort", "foodView"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", renderMenu);
      document.getElementById(id)?.addEventListener("change", renderMenu);
    });

    $("#btnNewFood")?.addEventListener("click", () => {
      if (!isAdmin()) return;
      openFoodEditor(null);
    });

    $("#btnEditFood")?.addEventListener("click", () => {
      if (!isAdmin()) return;
      if (!ui.activeFoodId) return;
      closeModal("foodModal");
      openFoodEditor(ui.activeFoodId);
    });

    $("#btnDeleteFood")?.addEventListener("click", () => {
      if (!isAdmin()) return;
      if (!ui.activeFoodId) return;
      deleteFood(ui.activeFoodId);
    });

    $("#btnAddToCart")?.addEventListener("click", () => {
      if (!requireAuth()) return;
      if (!ui.activeFoodId) return;
      addToCart(ui.activeFoodId, 1);
      closeModal("foodModal");
      renderCart();
      location.hash = "#/cart";
    });

    $("#foodForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!isAdmin()) return;

      const err = $("#foodError");
      const id = $("#foodId").value.trim();
      const name = $("#foodName").value.trim();
      const category = $("#foodCategoryValue").value.trim();
      const priceRaw = $("#foodPrice").value;
      const price = Number(priceRaw);
      const ingredientsRaw = $("#foodIngredients").value.trim();
      const ingredients = ingredientsRaw
        ? ingredientsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const description = $("#foodDesc").value.trim();
      const veg = $("#foodVegValue").checked;

      if (!name || !category || !Number.isFinite(price) || price < 0) {
        if (err) {
          err.textContent = "Заполните название, категорию и корректную цену.";
          err.classList.remove("hidden");
        }
        return;
      }
      if (err) err.classList.add("hidden");

      const foods = getFoods();
      if (!id) {
        foods.unshift({
          id: uid("food"),
          name,
          category,
          price: Math.round(price),
          ingredients,
          description,
          veg,
          createdAt: new Date().toISOString(),
        });
      } else {
        const idx = foods.findIndex((x) => x.id === id);
        if (idx >= 0) {
          foods[idx] = {
            ...foods[idx],
            name,
            category,
            price: Math.round(price),
            ingredients,
            description,
            veg,
          };
        }
      }
      setFoods(foods);
      closeModal("foodEditorModal");
      renderMenu();
      renderCart();
    });
  }

  // ---------------------------
  // Orders: create + validate dates + filters
  // ---------------------------
  function getOrders() {
    const orders = readJSON(LS.orders, []);
    return Array.isArray(orders) ? orders : [];
  }

  function setOrders(orders) {
    writeJSON(LS.orders, orders);
  }

  function refreshOrderFoodOptions() {
    const sel = $("#orderFoodId");
    if (!sel) return;
    const foods = getFoods();
    sel.innerHTML = foods
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"))
      .map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)} — ${escapeHtml(String(f.price))} ₽</option>`)
      .join("");
  }

  function showOrderError(msg) {
    const el = $("#orderError");
    if (!el) return;
    if (!msg) {
      el.classList.add("hidden");
      el.textContent = "";
      return;
    }
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function validateOrderDates(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, message: "Укажите корректные даты начала и конца." };
    }
    const now = Date.now();
    // "и т.п." — базовая проверка, чтобы не создавать заявки в прошлом
    if (start.getTime() < now - 60 * 1000) {
      return { ok: false, message: "Начало не может быть в прошлом." };
    }
    if (end.getTime() < start.getTime()) {
      return { ok: false, message: "Конец не может быть раньше начала." };
    }
    return { ok: true, startIso: start.toISOString(), endIso: end.toISOString() };
  }

  function getOrderFilters() {
    return {
      filter: $("#orderFilter")?.value || "current",
      sort: $("#orderSort")?.value || "created_desc",
    };
  }

  function orderKind(order) {
    const now = Date.now();
    const end = new Date(order.endAt).getTime();
    const isExpired = Number.isFinite(end) && end < now;
    if (order.status === "archived" || isExpired) return "archive";
    if (order.status === "pending") return "pending";
    // approved and not expired
    return "current";
  }

  function applyOrderFilters(orders) {
    const { filter, sort } = getOrderFilters();
    let list = orders.slice();

    if (filter !== "all") {
      list = list.filter((o) => orderKind(o) === filter);
    }

    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      const sa = new Date(a.startAt).getTime();
      const sb = new Date(b.startAt).getTime();
      const safe = (x) => (Number.isNaN(x) ? 0 : x);
      if (sort === "created_asc") return safe(ta) - safe(tb);
      if (sort === "created_desc") return safe(tb) - safe(ta);
      if (sort === "start_asc") return safe(sa) - safe(sb);
      if (sort === "start_desc") return safe(sb) - safe(sa);
      return 0;
    });

    return list;
  }

  function statusLabel(status) {
    if (status === "pending") return "На утверждении";
    if (status === "approved") return "Текущая";
    if (status === "archived") return "Архив";
    return status || "—";
  }

  function renderOrders() {
    const user = getCurrentUser();
    const listEl = $("#ordersList");
    const emptyEl = $("#ordersEmpty");
    if (!listEl || !emptyEl) return;

    // Restrict order creation to logged in (for "auth for show")
    const form = $("#orderForm");
    if (form) {
      const disabled = !user;
      form.querySelectorAll("input,select,textarea,button").forEach((c) => {
        if (c.id === "orderFilter" || c.id === "orderSort") return;
        c.disabled = disabled;
      });
      if (!user) showOrderError("Войдите, чтобы создавать заявки.");
      else showOrderError("");
    }

    const orders = getOrders();
    const filtered = applyOrderFilters(orders);
    const foods = getFoods();
    const byId = new Map(foods.map((f) => [f.id, f]));

    emptyEl.classList.toggle("hidden", filtered.length !== 0);
    listEl.innerHTML = filtered
      .map((o) => {
        const food = byId.get(o.foodId);
        const foodName = food?.name || "Блюдо удалено";
        const kind = orderKind(o);
        const tag = kind === "pending" ? "pending" : kind === "archive" ? "archive" : "current";
        const canModerate = !!user; // for simplicity
        return `
          <article class="order" data-order-id="${escapeHtml(o.id)}">
            <div class="order__top">
              <div>
                <h3 class="order__title">${escapeHtml(foodName)}</h3>
                <div class="order__meta">
                  <span class="tag">${escapeHtml(statusLabel(o.status))}</span>
                  <span class="tag">${escapeHtml(toDateLabel(o.startAt))} → ${escapeHtml(toDateLabel(o.endAt))}</span>
                  <span class="tag">создано: ${escapeHtml(toDateLabel(o.createdAt))}</span>
                  ${o.userLogin ? `<span class="tag">user: ${escapeHtml(o.userLogin)}</span>` : ""}
                </div>
              </div>
              <div class="order__actions">
                <button class="btn btn--ghost" type="button" data-action="approve" ${canModerate ? "" : "disabled"} ${o.status === "approved" ? "disabled" : ""
          }>Утвердить</button>
                <button class="btn btn--ghost" type="button" data-action="archive" ${canModerate ? "" : "disabled"} ${o.status === "archived" ? "disabled" : ""
          }>В архив</button>
                <button class="btn btn--danger" type="button" data-action="delete" ${canModerate ? "" : "disabled"}>Удалить</button>
              </div>
            </div>
            ${o.comment ? `<div class="order__comment">${escapeHtml(o.comment)}</div>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function wireOrders() {
    refreshOrderFoodOptions();

    $("#orderForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!requireAuth()) return;

      const foodId = $("#orderFoodId")?.value || "";
      const startStr = $("#orderStart")?.value || "";
      const endStr = $("#orderEnd")?.value || "";
      const comment = $("#orderComment")?.value?.trim?.() || "";

      const v = validateOrderDates(startStr, endStr);
      if (!v.ok) {
        showOrderError(v.message);
        return;
      }
      showOrderError("");

      const u = getCurrentUser();
      const orders = getOrders();
      orders.unshift({
        id: uid("order"),
        foodId,
        startAt: v.startIso,
        endAt: v.endIso,
        comment,
        status: "pending",
        createdAt: new Date().toISOString(),
        userLogin: u?.login || "",
      });
      setOrders(orders);

      // reset form
      $("#orderComment").value = "";
      renderOrders();
    });

    $("#orderFilter")?.addEventListener("change", renderOrders);
    $("#orderSort")?.addEventListener("change", renderOrders);

    $("#ordersList")?.addEventListener("click", (e) => {
      if (!requireAuth()) return;
      const t = /** @type {HTMLElement} */ (e.target);
      const btn = t.closest?.("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const card = btn.closest?.("[data-order-id]");
      const id = card?.getAttribute?.("data-order-id");
      if (!id || !action) return;

      const orders = getOrders();
      const idx = orders.findIndex((o) => o.id === id);
      if (idx < 0) return;

      if (action === "delete") {
        if (!confirm("Удалить заявку?")) return;
        orders.splice(idx, 1);
        setOrders(orders);
        renderOrders();
        return;
      }

      if (action === "approve") {
        orders[idx] = { ...orders[idx], status: "approved" };
        setOrders(orders);
        renderOrders();
        return;
      }

      if (action === "archive") {
        orders[idx] = { ...orders[idx], status: "archived" };
        setOrders(orders);
        renderOrders();
        return;
      }
    });
  }

  // ---------------------------
  // Cart UI (page: #/cart)
  // ---------------------------
  function renderCart() {
    const listEl = $("#cartList");
    const emptyEl = $("#cartEmpty");
    const summaryEl = $("#cartSummary");
    const checkoutBtn = $("#btnCheckout");
    const resultEl = $("#checkoutResult");
    if (!listEl || !emptyEl || !summaryEl || !checkoutBtn || !resultEl) return;

    const u = getCurrentUser();
    const disabled = !u;
    checkoutBtn.disabled = disabled;
    checkoutBtn.title = disabled ? "Войдите, чтобы оформить заказ" : "";

    const items = getCart();
    const foods = getFoods();
    const byId = new Map(foods.map((f) => [f.id, f]));

    const normalized = items
      .map((it) => ({ ...it, food: byId.get(it.foodId) }))
      .filter((x) => x.food);

    const total = normalized.reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.food.price) || 0), 0);

    emptyEl.classList.toggle("hidden", normalized.length !== 0);
    listEl.innerHTML = normalized
      .map((x) => {
        const f = x.food;
        return `
          <article class="cartItem" data-food-id="${escapeHtml(f.id)}">
            <div class="cartItem__top">
              <div>
                <h3 class="cartItem__title">${escapeHtml(f.name)}</h3>
                <div class="cartItem__meta">
                  <span class="tag">${escapeHtml(f.category || "—")}</span>
                  <span class="tag">qty: ${escapeHtml(String(x.qty))}</span>
                  <span class="tag mono">${escapeHtml(String(f.price))} ₽</span>
                </div>
              </div>
              <div class="cartItem__actions">
                <button class="btn btn--ghost" type="button" data-action="editQty" data-id="${escapeHtml(
          f.id,
        )}" ${disabled ? "disabled" : ""}>Редактировать</button>
                <button class="btn btn--danger" type="button" data-action="remove" data-id="${escapeHtml(
          f.id,
        )}" ${disabled ? "disabled" : ""}>Удалить</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    summaryEl.innerHTML = `
      <div class="cartTotal">
        <span>Итого</span>
        <span>${escapeHtml(String(total))} ₽</span>
      </div>
    `;

    // if no previous checkout result, show placeholder
    if (!resultEl.dataset.keep) {
      resultEl.innerHTML = `<div class="muted">Тут появится итог заказа.</div>`;
    }
  }

  function wireCart() {
    $("#cartList")?.addEventListener("click", (e) => {
      if (!requireAuth()) return;
      const t = /** @type {HTMLElement} */ (e.target);
      const btn = t.closest?.("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!action || !id) return;

      const items = getCart();
      const idx = items.findIndex((x) => x.foodId === id);
      if (idx < 0) return;

      if (action === "remove") {
        items.splice(idx, 1);
        setCart(items);
        renderCart();
        return;
      }

      if (action === "editQty") {
        const cur = Number(items[idx].qty) || 1;
        const nextRaw = prompt("Введите количество (1–99):", String(cur));
        if (nextRaw == null) return;
        const next = Math.round(Number(nextRaw));
        if (!Number.isFinite(next) || next < 1 || next > 99) return;
        items[idx].qty = next;
        setCart(items);
        renderCart();
      }
    });

    $("#btnCheckout")?.addEventListener("click", () => {
      if (!requireAuth()) return;
      const resultEl = $("#checkoutResult");
      if (!resultEl) return;

      const items = getCart();
      if (!items.length) return;

      const foods = getFoods();
      const byId = new Map(foods.map((f) => [f.id, f]));
      const chosen = items
        .map((it) => ({ ...it, food: byId.get(it.foodId) }))
        .filter((x) => x.food);

      const total = chosen.reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.food.price) || 0), 0);

      resultEl.dataset.keep = "1";
      resultEl.innerHTML = `
        <div style="font-weight:650;margin-bottom:8px">Пользователь выбрал:</div>
        <div class="muted" style="display:flex;flex-direction:column;gap:6px">
          ${chosen
          .map(
            (x) =>
              `<div><span class="tag">${escapeHtml(x.food.name)}</span> × <span class="tag mono">${escapeHtml(
                String(x.qty),
              )}</span></div>`,
          )
          .join("")}
        </div>
        <div class="cartTotal" style="margin-top:12px">
          <span>Итого</span>
          <span>${escapeHtml(String(total))} ₽</span>
        </div>
        <div style="margin-top:10px;font-weight:650">Спасибо за заказ, будет доставлено за 2 часа.</div>
      `;

      // clear cart after checkout
      setCart([]);
      renderCart();
    });
  }

  // ---------------------------
  // Init
  // ---------------------------
  function init() {
    ensureSeed();
    wireModalClose();
    wireAuth();
    wireFoodUI();
    wireCart();

    // page routing
    window.addEventListener("hashchange", () => {
      onRoute();
      // render on visible pages (cheap for this demo)
      renderMenu();
      renderCart();
    });

    // initial view mode restore
    const view = readJSON(LS.foodView, "cards");
    if ($("#foodView")) $("#foodView").value = view;

    renderAuth();
    // Start with auth window
    if (!getCurrentUser()) openModal("loginModal");
    onRoute();
    renderMenu();
    renderCart();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /**
   * @typedef {Object} Food
   * @property {string} id
   * @property {string} name
   * @property {string} category
   * @property {number} price
   * @property {string[]} ingredients
   * @property {string} description
   * @property {boolean} veg
   * @property {string} createdAt
   */
})();

