/* PracticeRank — Live-Debugging exercises, part A.
   Schema (consumed by js/debugger-ui.js):
   {
     slug, name, kind: "worker"|"react", difficulty, minutes, summary,
     brief: html (the symptom report — NO spoilers),
     files: [{ name, content }],          // the buggy codebase, run in tab order
     tests: [{ name, body }],             // worker: assert/deepEqual/sleep in scope
                                          // react: $,$$,tid,click,setValue,flush,sleep,assert
     bugs:  [{ title, clazz, hints:[3], symptom, trace, hypothesis, fix, diff, why }],
     fixedFiles: [{ name, content }],     // fully fixed version (verification target)
   }
   Every buggy suite must be PARTIALLY failing: some tests green, some red;
   fixing all seeded bugs — and nothing else — turns the whole suite green. */
(function () {
  "use strict";
  window.DEBUG_EXERCISES = window.DEBUG_EXERCISES || [];
  var EX = window.DEBUG_EXERCISES;

  /* ================================================================
     1. Shopping Cart Module — mutation, coercion, boundary, rounding
     ================================================================ */
  EX.push({
    slug: "shopping-cart",
    name: "Shopping Cart Module",
    kind: "worker",
    difficulty: "Medium",
    minutes: 40,
    summary: "Checkout totals are wrong and the undo feature corrupts history",
    brief:
      "<p>You just joined the storefront team. QA filed three tickets against the cart module overnight:</p>" +
      "<ul>" +
      "<li>&ldquo;Item count in the header sometimes shows garbage like <code>021</code>.&rdquo;</li>" +
      "<li>&ldquo;Undo after changing a quantity restores the <em>new</em> quantity, not the old one.&rdquo;</li>" +
      "<li>&ldquo;A $100.00 order doesn&rsquo;t get the advertised 10% discount, and finance says tax is off by a cent on some orders.&rdquo;</li>" +
      "</ul>" +
      "<p>The test suite reproduces all of it. Trace with <code>console.log</code>, find every seeded bug, and turn the suite green. The cart API is intended to be <b>immutable</b>: every operation returns a new cart and never touches the one passed in.</p>",
    files: [
      {
        name: "money.js",
        content:
"// Money helpers. Amounts are dollars as floats; we round only at\n" +
"// display and tax boundaries.\n" +
"\n" +
"function round2(x) {\n" +
"  return Math.round(x * 100) / 100;\n" +
"}\n" +
"\n" +
"// Sales tax for an amount at the given rate, rounded to the cent.\n" +
"function taxFor(amount, rate) {\n" +
"  return Math.floor(amount * rate * 100) / 100;\n" +
"}\n",
      },
      {
        name: "cart.js",
        content:
"// Immutable cart operations. Every function returns a NEW cart;\n" +
"// callers keep old carts around for undo history.\n" +
"\n" +
"function createCart() {\n" +
"  return { items: [] };\n" +
"}\n" +
"\n" +
"// item: { id, name, price, qty } — qty may arrive from a form input.\n" +
"function addItem(cart, item) {\n" +
"  var existing = cart.items.find(function (it) { return it.id === item.id; });\n" +
"  if (existing) {\n" +
"    return {\n" +
"      items: cart.items.map(function (it) {\n" +
"        if (it.id !== item.id) return it;\n" +
"        return { id: it.id, name: it.name, price: it.price, qty: it.qty + item.qty };\n" +
"      }),\n" +
"    };\n" +
"  }\n" +
"  return {\n" +
"    items: cart.items.concat([{ id: item.id, name: item.name, price: item.price, qty: item.qty }]),\n" +
"  };\n" +
"}\n" +
"\n" +
"function removeItem(cart, id) {\n" +
"  return { items: cart.items.filter(function (it) { return it.id !== id; }) };\n" +
"}\n" +
"\n" +
"function updateQty(cart, id, qty) {\n" +
"  var target = cart.items.find(function (it) { return it.id === id; });\n" +
"  if (!target) return cart;\n" +
"  target.qty = qty;\n" +
"  return { items: cart.items.slice() };\n" +
"}\n" +
"\n" +
"function itemCount(cart) {\n" +
"  var n = 0;\n" +
"  cart.items.forEach(function (it) { n += it.qty; });\n" +
"  return n;\n" +
"}\n" +
"\n" +
"function subtotal(cart) {\n" +
"  var total = 0;\n" +
"  cart.items.forEach(function (it) { total += it.price * it.qty; });\n" +
"  return round2(total);\n" +
"}\n",
      },
      {
        name: "discounts.js",
        content:
"// Volume discount: orders of $100 or more get 10% off the subtotal.\n" +
"var DISCOUNT_THRESHOLD = 100;\n" +
"var DISCOUNT_RATE = 0.10;\n" +
"\n" +
"function discountFor(sub) {\n" +
"  if (sub > DISCOUNT_THRESHOLD) {\n" +
"    return round2(sub * DISCOUNT_RATE);\n" +
"  }\n" +
"  return 0;\n" +
"}\n",
      },
      {
        name: "checkout.js",
        content:
"var TAX_RATE = 0.0825; // 8.25%\n" +
"\n" +
"function checkoutTotal(cart) {\n" +
"  var sub = subtotal(cart);\n" +
"  var disc = discountFor(sub);\n" +
"  var tax = taxFor(sub - disc, TAX_RATE);\n" +
"  return {\n" +
"    subtotal: sub,\n" +
"    discount: disc,\n" +
"    tax: tax,\n" +
"    total: round2(sub - disc + tax),\n" +
"  };\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "adds items and merges duplicate ids",
        body:
"var c = createCart();\n" +
"c = addItem(c, { id: 1, name: 'Mug', price: 12.5, qty: 1 });\n" +
"c = addItem(c, { id: 1, name: 'Mug', price: 12.5, qty: 2 });\n" +
"assert(c.items.length === 1, 'expected 1 line item, got ' + c.items.length);\n" +
"assert(c.items[0].qty === 3, 'expected merged qty 3, got ' + JSON.stringify(c.items[0].qty));",
      },
      {
        name: "itemCount handles quantities coming from form inputs",
        body:
"var c = createCart();\n" +
"c = addItem(c, { id: 1, name: 'Mug', price: 12.5, qty: '2' }); // qty from an <input>\n" +
"c = addItem(c, { id: 2, name: 'Tee', price: 25, qty: 1 });\n" +
"var n = itemCount(c);\n" +
"assert(n === 3, 'expected itemCount 3, got ' + JSON.stringify(n) + ' (' + typeof n + ')');",
      },
      {
        name: "updateQty returns a new cart and never mutates the old one",
        body:
"var before = addItem(createCart(), { id: 1, name: 'Mug', price: 12.5, qty: 2 });\n" +
"var after = updateQty(before, 1, 5);\n" +
"assert(after.items[0].qty === 5, 'updated cart should have qty 5');\n" +
"assert(before.items[0].qty === 2, 'original cart was mutated: undo history is corrupted (qty became ' + before.items[0].qty + ')');",
      },
      {
        name: "10% discount applies at exactly $100.00",
        body:
"var c = addItem(createCart(), { id: 1, name: 'Jacket', price: 100, qty: 1 });\n" +
"var res = checkoutTotal(c);\n" +
"assert(res.discount === 10, 'a $100 order should get a $10 discount, got ' + res.discount);",
      },
      {
        name: "tax rounds to the nearest cent",
        body:
"var c = addItem(createCart(), { id: 1, name: 'Book', price: 19.99, qty: 1 });\n" +
"var res = checkoutTotal(c);\n" +
"// 19.99 * 0.0825 = 1.6491675 -> 1.65\n" +
"assert(res.tax === 1.65, 'expected tax 1.65, got ' + res.tax);",
      },
      {
        name: "grand total adds up for a plain numeric order",
        body:
"var c = addItem(createCart(), { id: 1, name: 'Desk', price: 40, qty: 3 });\n" +
"var res = checkoutTotal(c);\n" +
"assert(res.subtotal === 120, 'subtotal should be 120, got ' + res.subtotal);\n" +
"assert(res.total === round2(res.subtotal - res.discount + res.tax), 'total must equal subtotal - discount + tax');",
      },
    ],
    bugs: [
      {
        title: "updateQty mutates the cart it was given",
        clazz: "mutation-vs-copy",
        hints: [
          "The module's contract is printed at the top of cart.js: every operation returns a NEW cart. Which of the four operations breaks that promise? Log the input cart before and after calling each one.",
          "updateQty does return a fresh outer object and even a fresh array (.slice()) — but arrays copy by reference. What do the elements of the sliced array still point to?",
          "target is the SAME object that lives inside the old cart's array. Assigning target.qty writes through to history. Build a new item object instead of assigning into the found one.",
        ],
        symptom: "Undo restores the new quantity instead of the old one — the &ldquo;previous&rdquo; cart in history already contains the update.",
        trace: "Log <code>before.items[0]</code> and <code>after.items[0]</code> after calling <code>updateQty</code>: they print the same qty, and <code>before.items[0] === after.items[0]</code> is <code>true</code> — same object identity.",
        hypothesis: "<code>.slice()</code> is a shallow copy: the new array still holds references to the old item objects, and <code>target.qty = qty</code> mutates one of them in place.",
        fix: "Map to a new item object for the matching id instead of assigning into the shared one.",
        diff:
"  function updateQty(cart, id, qty) {\n" +
"-   var target = cart.items.find(function (it) { return it.id === id; });\n" +
"-   if (!target) return cart;\n" +
"-   target.qty = qty;\n" +
"-   return { items: cart.items.slice() };\n" +
"+   return {\n" +
"+     items: cart.items.map(function (it) {\n" +
"+       if (it.id !== id) return it;\n" +
"+       return { id: it.id, name: it.name, price: it.price, qty: qty };\n" +
"+     }),\n" +
"+   };\n" +
"  }",
        why: "A shallow copy protects the array's identity but not its elements'. Any caller holding the old cart (undo stacks, React state, memo caches) sees its data change underneath it — the classic aliasing bug behind &ldquo;my previous state changed by itself&rdquo;.",
      },
      {
        title: "addItem never normalizes qty, so string quantities concatenate",
        clazz: "type-coercion",
        hints: [
          "The failing count is '021'-shaped, not a wrong number — that smells like string concatenation, not arithmetic. Where could a string sneak into the cart?",
          "Log <code>typeof it.qty</code> inside itemCount. The qty came from a form input as '2'. Multiplication coerces strings ('2' * 12.5 works) but + prefers concatenation.",
          "Fix it at the boundary, not at every use site: convert qty to a Number once, where the item enters the cart (both branches of addItem).",
        ],
        symptom: "Header badge shows <code>021</code>; <code>itemCount</code> returns a string.",
        trace: "<code>console.log(typeof itemCount(cart))</code> prints <code>string</code>. Walking backwards, <code>it.qty</code> is <code>'2'</code> for items added from the form; <code>0 + '2'</code> is <code>'02'</code>.",
        hypothesis: "Quantities from <code>&lt;input&gt;</code> elements are strings; <code>addItem</code> stores them raw, and <code>+</code> switches from addition to concatenation while <code>*</code> (in subtotal) happens to coerce, hiding the bug elsewhere.",
        fix: "Normalize once at the entry point: <code>var qty = Number(item.qty)</code> in addItem, used in both the merge branch and the append branch.",
        diff:
"  function addItem(cart, item) {\n" +
"+   var qty = Number(item.qty);\n" +
"    var existing = cart.items.find(function (it) { return it.id === item.id; });\n" +
"    if (existing) {\n" +
"      ...\n" +
"-       return { id: it.id, name: it.name, price: it.price, qty: it.qty + item.qty };\n" +
"+       return { id: it.id, name: it.name, price: it.price, qty: it.qty + qty };\n" +
"      ...\n" +
"    }\n" +
"    return {\n" +
"-     items: cart.items.concat([{ id: item.id, name: item.name, price: item.price, qty: item.qty }]),\n" +
"+     items: cart.items.concat([{ id: item.id, name: item.name, price: item.price, qty: qty }]),\n" +
"    };\n" +
"  }",
        why: "JavaScript's <code>+</code> is overloaded: number addition OR string concatenation, decided per call. Data that crosses a boundary (DOM, JSON, URL params) must be coerced deliberately at that boundary — otherwise every arithmetic site becomes a coin flip.",
      },
      {
        title: "Discount threshold uses > instead of >=",
        clazz: "boundary-condition",
        hints: [
          "The marketing copy says orders 'of $100 or more'. Test the boundary value itself: what does discountFor(100) return?",
          "Log the comparison: 100 > 100 is false. The threshold order gets no discount.",
          "Change the strict > to >= so the advertised boundary is included.",
        ],
        symptom: "A $100.00 order gets no discount; $100.01 does.",
        trace: "<code>console.log(discountFor(99.99), discountFor(100), discountFor(100.01))</code> → <code>0, 0, 10</code>. The middle value is wrong.",
        hypothesis: "Off-by-one on the comparison operator: the spec is inclusive (&ldquo;$100 or more&rdquo;), the code is exclusive.",
        fix: "Use <code>&gt;=</code>.",
        diff:
"  function discountFor(sub) {\n" +
"-   if (sub > DISCOUNT_THRESHOLD) {\n" +
"+   if (sub >= DISCOUNT_THRESHOLD) {\n" +
"      return round2(sub * DISCOUNT_RATE);\n" +
"    }",
        why: "Boundary bugs live exactly on the advertised edge. The test that catches them is always the same: probe the threshold value itself, one tick below, and one tick above.",
      },
      {
        title: "taxFor floors instead of rounding",
        clazz: "numeric-rounding",
        hints: [
          "Finance says tax is off by one cent 'on some orders' — a systematic, always-downward error. Which direction does your rounding go?",
          "Compare Math.floor(1.6491675 * 100) / 100 with Math.round(1.6491675 * 100) / 100. There's already a correct helper in money.js.",
          "taxFor should use the same round-half-up behavior as round2 — reuse it.",
        ],
        symptom: "Tax is a cent low whenever the exact tax has a fractional cent of .5 or more.",
        trace: "<code>console.log(19.99 * 0.0825)</code> → <code>1.6491675</code>. <code>Math.floor(164.91675)/100</code> → <code>1.64</code>, but the ledger expects <code>1.65</code>.",
        hypothesis: "<code>taxFor</code> truncates toward zero instead of rounding to the nearest cent; every affected order under-collects by exactly one cent.",
        fix: "Use <code>Math.round</code> (or just <code>round2</code>).",
        diff:
"  function taxFor(amount, rate) {\n" +
"-   return Math.floor(amount * rate * 100) / 100;\n" +
"+   return round2(amount * rate);\n" +
"  }",
        why: "floor vs round is invisible on most inputs and systematically wrong on the rest — the worst kind of bug for money code. The lesson: never hand-roll the same numeric policy twice; one blessed helper, reused everywhere.",
      },
    ],
    fixedFiles: [
      {
        name: "money.js",
        content:
"function round2(x) {\n" +
"  return Math.round(x * 100) / 100;\n" +
"}\n" +
"\n" +
"function taxFor(amount, rate) {\n" +
"  return round2(amount * rate);\n" +
"}\n",
      },
      {
        name: "cart.js",
        content:
"function createCart() {\n" +
"  return { items: [] };\n" +
"}\n" +
"\n" +
"function addItem(cart, item) {\n" +
"  var qty = Number(item.qty);\n" +
"  var existing = cart.items.find(function (it) { return it.id === item.id; });\n" +
"  if (existing) {\n" +
"    return {\n" +
"      items: cart.items.map(function (it) {\n" +
"        if (it.id !== item.id) return it;\n" +
"        return { id: it.id, name: it.name, price: it.price, qty: it.qty + qty };\n" +
"      }),\n" +
"    };\n" +
"  }\n" +
"  return {\n" +
"    items: cart.items.concat([{ id: item.id, name: item.name, price: item.price, qty: qty }]),\n" +
"  };\n" +
"}\n" +
"\n" +
"function removeItem(cart, id) {\n" +
"  return { items: cart.items.filter(function (it) { return it.id !== id; }) };\n" +
"}\n" +
"\n" +
"function updateQty(cart, id, qty) {\n" +
"  return {\n" +
"    items: cart.items.map(function (it) {\n" +
"      if (it.id !== id) return it;\n" +
"      return { id: it.id, name: it.name, price: it.price, qty: qty };\n" +
"    }),\n" +
"  };\n" +
"}\n" +
"\n" +
"function itemCount(cart) {\n" +
"  var n = 0;\n" +
"  cart.items.forEach(function (it) { n += it.qty; });\n" +
"  return n;\n" +
"}\n" +
"\n" +
"function subtotal(cart) {\n" +
"  var total = 0;\n" +
"  cart.items.forEach(function (it) { total += it.price * it.qty; });\n" +
"  return round2(total);\n" +
"}\n",
      },
      {
        name: "discounts.js",
        content:
"var DISCOUNT_THRESHOLD = 100;\n" +
"var DISCOUNT_RATE = 0.10;\n" +
"\n" +
"function discountFor(sub) {\n" +
"  if (sub >= DISCOUNT_THRESHOLD) {\n" +
"    return round2(sub * DISCOUNT_RATE);\n" +
"  }\n" +
"  return 0;\n" +
"}\n",
      },
      {
        name: "checkout.js",
        content:
"var TAX_RATE = 0.0825;\n" +
"\n" +
"function checkoutTotal(cart) {\n" +
"  var sub = subtotal(cart);\n" +
"  var disc = discountFor(sub);\n" +
"  var tax = taxFor(sub - disc, TAX_RATE);\n" +
"  return {\n" +
"    subtotal: sub,\n" +
"    discount: disc,\n" +
"    tax: tax,\n" +
"    total: round2(sub - disc + tax),\n" +
"  };\n" +
"}\n",
      },
    ],
  });

  /* ================================================================
     2. Paginated API Client with Cache — missing await, stale cache,
        out-of-order responses, off-by-one pagination
     ================================================================ */
  EX.push({
    slug: "api-client-cache",
    name: "Paginated API Client + Cache",
    kind: "worker",
    difficulty: "Hard",
    minutes: 40,
    summary: "The directory page loads one broken page of users and search shows the wrong results",
    brief:
      "<p>The admin directory is built on this little API client. The backend is mocked in <code>mockApi.js</code> (deterministic delays — treat it as the network; <b>the seeded bugs are NOT in the mock's data or delays</b>, but the client must use it correctly).</p>" +
      "<p>Bug reports from the field:</p>" +
      "<ul>" +
      "<li>&ldquo;The &lsquo;All users&rsquo; export contains one blank row instead of 25 users.&rdquo;</li>" +
      "<li>&ldquo;Every page in the UI shows 9 users even though page size is 10.&rdquo;</li>" +
      "<li>&ldquo;After renaming a user, the old name comes back when you revisit the page.&rdquo;</li>" +
      "<li>&ldquo;Type fast in search and the results flicker back to a previous query.&rdquo;</li>" +
      "</ul>" +
      "<p>Classic async debugging: log timestamps, log what resolves when, and watch for promises that were never awaited.</p>",
    files: [
      {
        name: "mockApi.js",
        content:
"// Deterministic in-memory 'server'. Treat this file as the network:\n" +
"// the bugs you are hunting are in how the CLIENT uses it.\n" +
"var DB = { users: [] };\n" +
"for (var i = 1; i <= 25; i++) DB.users.push({ id: i, name: 'User ' + i });\n" +
"\n" +
"var serverHits = { getPage: 0, search: 0, update: 0 };\n" +
"\n" +
"// Longer queries resolve FASTER here (they're more selective) — which is\n" +
"// exactly how out-of-order responses happen in real life.\n" +
"var SEARCH_DELAY = { 'user': 30, 'user 1': 5 };\n" +
"\n" +
"function netDelay(ms) {\n" +
"  return new Promise(function (r) { setTimeout(r, ms); });\n" +
"}\n" +
"\n" +
"function serverGetPage(n, size) {\n" +
"  serverHits.getPage++;\n" +
"  return netDelay(5).then(function () {\n" +
"    var start = (n - 1) * size;\n" +
"    if (n < 1 || start >= DB.users.length) {\n" +
"      throw new Error('404: page ' + n + ' out of range');\n" +
"    }\n" +
"    return {\n" +
"      page: n,\n" +
"      items: DB.users.slice(start, start + size).map(function (u) { return { id: u.id, name: u.name }; }),\n" +
"      hasMore: start + size < DB.users.length,\n" +
"    };\n" +
"  });\n" +
"}\n" +
"\n" +
"function serverSearch(q) {\n" +
"  serverHits.search++;\n" +
"  var delay = SEARCH_DELAY[q] != null ? SEARCH_DELAY[q] : 5;\n" +
"  return netDelay(delay).then(function () {\n" +
"    var needle = String(q).toLowerCase();\n" +
"    return DB.users.filter(function (u) {\n" +
"      return u.name.toLowerCase().indexOf(needle) !== -1;\n" +
"    }).map(function (u) { return { id: u.id, name: u.name }; });\n" +
"  });\n" +
"}\n" +
"\n" +
"function serverUpdateUser(id, patch) {\n" +
"  serverHits.update++;\n" +
"  return netDelay(5).then(function () {\n" +
"    var u = DB.users.find(function (x) { return x.id === id; });\n" +
"    if (!u) throw new Error('404: no user ' + id);\n" +
"    Object.keys(patch).forEach(function (k) { u[k] = patch[k]; });\n" +
"    return { id: u.id, name: u.name };\n" +
"  });\n" +
"}\n",
      },
      {
        name: "apiClient.js",
        content:
"var PAGE_SIZE = 10;\n" +
"\n" +
"function createClient() {\n" +
"  var pageCache = {};\n" +
"\n" +
"  return {\n" +
"    // Cached page fetch — repeat requests for the same page must not\n" +
"    // hit the server again.\n" +
"    fetchPage: function (n) {\n" +
"      if (pageCache[n]) return Promise.resolve(pageCache[n]);\n" +
"      return serverGetPage(n, PAGE_SIZE - 1).then(function (res) {\n" +
"        pageCache[n] = res;\n" +
"        return res;\n" +
"      });\n" +
"    },\n" +
"\n" +
"    // Rename etc. Writes through to the server.\n" +
"    updateUser: function (id, patch) {\n" +
"      return serverUpdateUser(id, patch);\n" +
"    },\n" +
"\n" +
"    // Walk every page and collect all users (used by the CSV export).\n" +
"    fetchAllUsers: async function () {\n" +
"      var users = [];\n" +
"      var page = 1;\n" +
"      var hasMore = true;\n" +
"      while (hasMore) {\n" +
"        var res = this.fetchPage(page);\n" +
"        users = users.concat(res.items);\n" +
"        hasMore = res.hasMore;\n" +
"        page++;\n" +
"      }\n" +
"      return users;\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "search.js",
        content:
"// Live search box state. run() is called on every keystroke; the UI\n" +
"// renders state.results. state.query is always the LAST thing typed —\n" +
"// results must always belong to it.\n" +
"function createSearch() {\n" +
"  var state = { query: '', results: [] };\n" +
"\n" +
"  return {\n" +
"    state: state,\n" +
"    run: function (q) {\n" +
"      state.query = q;\n" +
"      return serverSearch(q).then(function (res) {\n" +
"        state.results = res;\n" +
"        return res;\n" +
"      });\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "a page contains a full 10 users",
        body:
"var client = createClient();\n" +
"var res = await client.fetchPage(1);\n" +
"assert(res.items.length === 10, 'expected 10 users on page 1, got ' + res.items.length);\n" +
"assert(res.items[0].id === 1 && res.items[9].id === 10, 'page 1 should span ids 1..10');",
      },
      {
        name: "repeat fetches of a page are served from cache",
        body:
"var client = createClient();\n" +
"var before = serverHits.getPage;\n" +
"await client.fetchPage(2);\n" +
"await client.fetchPage(2);\n" +
"assert(serverHits.getPage - before === 1, 'expected exactly 1 server hit for two fetches, got ' + (serverHits.getPage - before));",
      },
      {
        name: "fetchAllUsers collects every user across pages",
        body:
"var client = createClient();\n" +
"var users = await client.fetchAllUsers();\n" +
"assert(Array.isArray(users), 'should resolve to an array');\n" +
"assert(users.length === 25, 'expected 25 users, got ' + users.length + ' — first element: ' + JSON.stringify(users[0]));\n" +
"assert(users[0] && users[0].id === 1 && users[24] && users[24].id === 25, 'users must span ids 1..25 in order');",
      },
      {
        name: "an update is visible on the next page fetch",
        body:
"var client = createClient();\n" +
"await client.fetchPage(1);\n" +
"await client.updateUser(1, { name: 'Renamed 1' });\n" +
"var res = await client.fetchPage(1);\n" +
"var u = res.items.find(function (x) { return x.id === 1; });\n" +
"assert(u && u.name === 'Renamed 1', 'expected the rename to show, got ' + JSON.stringify(u && u.name));\n" +
"await client.updateUser(1, { name: 'User 1' }); // restore for other tests",
      },
      {
        name: "search results always match the last query typed",
        body:
"var s = createSearch();\n" +
"var p1 = s.run('user');    // slow, broad\n" +
"var p2 = s.run('user 1');  // fast, narrow — typed last\n" +
"await Promise.all([p1.catch(function () {}), p2.catch(function () {})]);\n" +
"await sleep(50);\n" +
"assert(s.state.query === 'user 1', 'query should be the last typed');\n" +
"var allMatch = s.state.results.every(function (u) { return u.name.toLowerCase().indexOf('user 1') !== -1; });\n" +
"assert(allMatch && s.state.results.length > 0, 'stale results: showing ' + s.state.results.length + ' rows for an older query');",
      },
      {
        name: "search finds a unique user by full name",
        body:
"var s = createSearch();\n" +
"var res = await s.run('user 25');\n" +
"assert(res.length === 1 && res[0].id === 25, 'expected exactly User 25, got ' + JSON.stringify(res));",
      },
    ],
    bugs: [
      {
        title: "fetchAllUsers never awaits fetchPage",
        clazz: "missing-await",
        hints: [
          "The export returns almost instantly even though it should make 3 network round-trips. Log what `res` actually is inside the while loop.",
          "console.log(res) prints Promise { <pending> }, so res.items is undefined and res.hasMore is undefined — which is falsy. That explains both the blank row and the single iteration.",
          "Await the fetch: `var res = await this.fetchPage(page);`. The function is already async; the await was simply dropped.",
        ],
        symptom: "The CSV export contains a single undefined row and finishes suspiciously fast.",
        trace: "Log <code>res</code> inside the loop: <code>Promise { &lt;pending&gt; }</code>. <code>concat(undefined)</code> appends one undefined element; <code>res.hasMore</code> is <code>undefined</code>, so the loop exits after one pass.",
        hypothesis: "A missing <code>await</code> makes every property read on the promise yield <code>undefined</code> — the loop is operating on the box, not the value.",
        fix: "<code>var res = await this.fetchPage(page);</code>",
        diff:
"  fetchAllUsers: async function () {\n" +
"    ...\n" +
"    while (hasMore) {\n" +
"-     var res = this.fetchPage(page);\n" +
"+     var res = await this.fetchPage(page);\n" +
"      users = users.concat(res.items);",
        why: "An unawaited promise is a perfectly valid object, so nothing throws at the call site — the damage appears one property-access later as undefineds. The tell is timing: async work that completes instantly almost always means nobody waited for it.",
      },
      {
        title: "fetchPage asks the server for PAGE_SIZE - 1 items",
        clazz: "off-by-one",
        hints: [
          "Every page renders 9 users, page size is 10. Is the server slicing wrong, or is the client asking wrong? Log the arguments serverGetPage receives.",
          "serverGetPage(n, size) is called with size 9. The mock's slice(start, start + size) is correct — the caller shrank the window.",
          "Pass PAGE_SIZE, not PAGE_SIZE - 1. Someone probably 'fixed' an inclusive-bound bug that never existed.",
        ],
        symptom: "Every page shows 9 users; the last user of each page is missing; the full export (once awaited) comes back short.",
        trace: "Log inside <code>serverGetPage</code>: <code>size = 9</code>. The mock slices correctly for the size it was given; the client requested the wrong size.",
        hypothesis: "Off-by-one at the call site — a misremembered inclusive/exclusive boundary, subtracting 1 where no subtraction was needed.",
        fix: "<code>serverGetPage(n, PAGE_SIZE)</code>.",
        diff:
"    fetchPage: function (n) {\n" +
"      if (pageCache[n]) return Promise.resolve(pageCache[n]);\n" +
"-     return serverGetPage(n, PAGE_SIZE - 1).then(function (res) {\n" +
"+     return serverGetPage(n, PAGE_SIZE).then(function (res) {\n",
        why: "Off-by-ones cluster at boundaries someone was unsure about. slice/substring are end-exclusive by design; compensating for exclusivity that the API already handles produces exactly this ±1 error.",
      },
      {
        title: "updateUser never invalidates the page cache",
        clazz: "cache-invalidation",
        hints: [
          "The server really is updated (log serverHits.update and the mock's DB) — yet the UI shows the old name. Where else could the old data live?",
          "fetchPage happily returns pageCache[n] forever. A write went through the client but the client's cache was never told.",
          "After a successful update, drop the cached pages (simplest correct fix: reset the whole pageCache object).",
        ],
        symptom: "Renames stick on the server but the old name reappears when the page is revisited.",
        trace: "<code>serverHits.getPage</code> does not increase on the second <code>fetchPage(1)</code> — the response came from <code>pageCache</code>, which still holds the pre-update payload.",
        hypothesis: "Write path and read path disagree: the write goes to the server, the read comes from a cache that nobody invalidated.",
        fix: "Invalidate on write-success: clear <code>pageCache</code> in <code>updateUser</code>'s <code>.then</code>.",
        diff:
"    updateUser: function (id, patch) {\n" +
"-     return serverUpdateUser(id, patch);\n" +
"+     return serverUpdateUser(id, patch).then(function (res) {\n" +
"+       pageCache = {};\n" +
"+       return res;\n" +
"+     });\n" +
"    },",
        why: "&ldquo;There are only two hard things&rdquo; is a cliché because this exact shape ships constantly: caches added for reads, forgotten by writes. Every mutation endpoint must answer &lsquo;which cached reads does this stale-out?&rsquo; — and clearing too much is always safer than clearing too little.",
      },
      {
        title: "Search lets a slow old response overwrite a fast new one",
        clazz: "async-race",
        hints: [
          "Reproduce with the two seeded delays: 'user' takes 30ms, 'user 1' takes 5ms. Log (query, arrival time) inside the .then — what order do they land in?",
          "The response for 'user' lands LAST and blindly assigns state.results, even though state.query moved on. The .then has no idea whether it is still the latest request.",
          "Tag each request with a token (or compare state.query to the closed-over q) and ignore the response if a newer request has started since.",
        ],
        symptom: "Type fast and the result list flickers to a previous, broader query's rows while the box shows the new query.",
        trace: "Logging arrivals shows <code>'user 1' @ ~5ms</code> then <code>'user' @ ~30ms</code> — last writer wins, and the last writer is the stale one.",
        hypothesis: "Classic out-of-order response race: responses are applied in arrival order, not request order.",
        fix: "Keep a monotonically increasing request id; only apply the response if its id is still the newest.",
        diff:
"  function createSearch() {\n" +
"    var state = { query: '', results: [] };\n" +
"+   var latest = 0;\n" +
"    return {\n" +
"      state: state,\n" +
"      run: function (q) {\n" +
"+       var token = ++latest;\n" +
"        state.query = q;\n" +
"        return serverSearch(q).then(function (res) {\n" +
"-         state.results = res;\n" +
"+         if (token === latest) state.results = res;\n" +
"          return res;\n" +
"        });\n" +
"      },\n" +
"    };\n" +
"  }",
        why: "Networks reorder freely: response order ≠ request order. Any &ldquo;apply when it arrives&rdquo; handler needs a freshness check — a token, an AbortController, or switchMap-style cancellation. Without one, the slowest request wins, which is precisely backwards.",
      },
    ],
    fixedFiles: [
      {
        name: "mockApi.js",
        content:
"var DB = { users: [] };\n" +
"for (var i = 1; i <= 25; i++) DB.users.push({ id: i, name: 'User ' + i });\n" +
"\n" +
"var serverHits = { getPage: 0, search: 0, update: 0 };\n" +
"\n" +
"var SEARCH_DELAY = { 'user': 30, 'user 1': 5 };\n" +
"\n" +
"function netDelay(ms) {\n" +
"  return new Promise(function (r) { setTimeout(r, ms); });\n" +
"}\n" +
"\n" +
"function serverGetPage(n, size) {\n" +
"  serverHits.getPage++;\n" +
"  return netDelay(5).then(function () {\n" +
"    var start = (n - 1) * size;\n" +
"    if (n < 1 || start >= DB.users.length) {\n" +
"      throw new Error('404: page ' + n + ' out of range');\n" +
"    }\n" +
"    return {\n" +
"      page: n,\n" +
"      items: DB.users.slice(start, start + size).map(function (u) { return { id: u.id, name: u.name }; }),\n" +
"      hasMore: start + size < DB.users.length,\n" +
"    };\n" +
"  });\n" +
"}\n" +
"\n" +
"function serverSearch(q) {\n" +
"  serverHits.search++;\n" +
"  var delay = SEARCH_DELAY[q] != null ? SEARCH_DELAY[q] : 5;\n" +
"  return netDelay(delay).then(function () {\n" +
"    var needle = String(q).toLowerCase();\n" +
"    return DB.users.filter(function (u) {\n" +
"      return u.name.toLowerCase().indexOf(needle) !== -1;\n" +
"    }).map(function (u) { return { id: u.id, name: u.name }; });\n" +
"  });\n" +
"}\n" +
"\n" +
"function serverUpdateUser(id, patch) {\n" +
"  serverHits.update++;\n" +
"  return netDelay(5).then(function () {\n" +
"    var u = DB.users.find(function (x) { return x.id === id; });\n" +
"    if (!u) throw new Error('404: no user ' + id);\n" +
"    Object.keys(patch).forEach(function (k) { u[k] = patch[k]; });\n" +
"    return { id: u.id, name: u.name };\n" +
"  });\n" +
"}\n",
      },
      {
        name: "apiClient.js",
        content:
"var PAGE_SIZE = 10;\n" +
"\n" +
"function createClient() {\n" +
"  var pageCache = {};\n" +
"\n" +
"  return {\n" +
"    fetchPage: function (n) {\n" +
"      if (pageCache[n]) return Promise.resolve(pageCache[n]);\n" +
"      return serverGetPage(n, PAGE_SIZE).then(function (res) {\n" +
"        pageCache[n] = res;\n" +
"        return res;\n" +
"      });\n" +
"    },\n" +
"\n" +
"    updateUser: function (id, patch) {\n" +
"      return serverUpdateUser(id, patch).then(function (res) {\n" +
"        pageCache = {};\n" +
"        return res;\n" +
"      });\n" +
"    },\n" +
"\n" +
"    fetchAllUsers: async function () {\n" +
"      var users = [];\n" +
"      var page = 1;\n" +
"      var hasMore = true;\n" +
"      while (hasMore) {\n" +
"        var res = await this.fetchPage(page);\n" +
"        users = users.concat(res.items);\n" +
"        hasMore = res.hasMore;\n" +
"        page++;\n" +
"      }\n" +
"      return users;\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "search.js",
        content:
"function createSearch() {\n" +
"  var state = { query: '', results: [] };\n" +
"  var latest = 0;\n" +
"\n" +
"  return {\n" +
"    state: state,\n" +
"    run: function (q) {\n" +
"      var token = ++latest;\n" +
"      state.query = q;\n" +
"      return serverSearch(q).then(function (res) {\n" +
"        if (token === latest) state.results = res;\n" +
"        return res;\n" +
"      });\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
    ],
  });

  /* ================================================================
     3. React Form Wizard — state mutation, stale closure, string compare
     ================================================================ */
  EX.push({
    slug: "react-form-wizard",
    name: "React: Sign-up Form Wizard",
    kind: "react",
    difficulty: "Medium",
    minutes: 40,
    summary: "Typing does nothing, Next gets stuck on step 2, and a 9-year-old passes the age check",
    brief:
      "<p>A three-step sign-up wizard another team shipped on Friday. Monday's bug reports:</p>" +
      "<ul>" +
      "<li>&ldquo;I type in the name field and nothing appears.&rdquo;</li>" +
      "<li>&ldquo;The Next button works once, then the wizard is stuck on step 2 forever.&rdquo;</li>" +
      "<li>&ldquo;My kid entered age 9 and the form accepted it. The age gate is 18.&rdquo;</li>" +
      "</ul>" +
      "<p>The live preview on the right re-renders as you edit — reproduce each bug by hand first, then make the suite green. Expect the standard React failure modes: state that was mutated instead of replaced, and a callback that remembers an old render.</p>",
    files: [
      {
        name: "validators.js",
        content:
"// Field validators. Return '' when valid, or a message when not.\n" +
"function validateName(name) {\n" +
"  if (!name || !name.trim()) return 'Name is required';\n" +
"  return '';\n" +
"}\n" +
"\n" +
"function validateAge(age) {\n" +
"  if (age === '' || age == null) return 'Age is required';\n" +
"  if (age < '18') return 'Must be 18 or older';\n" +
"  return '';\n" +
"}\n",
      },
      {
        name: "steps.js",
        content:
"var WIZARD_STEPS = [\n" +
"  { key: 'account', title: 'Account' },\n" +
"  { key: 'details', title: 'Details' },\n" +
"  { key: 'review',  title: 'Review' },\n" +
"];\n",
      },
      {
        name: "App.js",
        content:
"function App() {\n" +
"  const [step, setStep] = React.useState(0);\n" +
"  const [form, setForm] = React.useState({ name: '', email: '', age: '' });\n" +
"\n" +
"  function updateField(field, value) {\n" +
"    form[field] = value;\n" +
"    setForm(form);\n" +
"  }\n" +
"\n" +
"  const goNext = React.useCallback(() => {\n" +
"    setStep(Math.min(step + 1, WIZARD_STEPS.length - 1));\n" +
"  }, []);\n" +
"\n" +
"  const goBack = () => setStep((s) => Math.max(s - 1, 0));\n" +
"\n" +
"  const ageError = validateAge(form.age);\n" +
"\n" +
"  return (\n" +
"    <div>\n" +
"      <h1 data-testid=\"step-title\">\n" +
"        Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step].title}\n" +
"      </h1>\n" +
"\n" +
"      {step === 0 && (\n" +
"        <div>\n" +
"          <label>Name <input data-testid=\"name-input\" value={form.name}\n" +
"            onChange={(e) => updateField('name', e.target.value)} /></label>\n" +
"          <label>Email <input data-testid=\"email-input\" value={form.email}\n" +
"            onChange={(e) => updateField('email', e.target.value)} /></label>\n" +
"        </div>\n" +
"      )}\n" +
"\n" +
"      {step === 1 && (\n" +
"        <div>\n" +
"          <label>Age <input data-testid=\"age-input\" value={form.age}\n" +
"            onChange={(e) => updateField('age', e.target.value)} /></label>\n" +
"          {ageError !== '' && <p data-testid=\"age-error\">{ageError}</p>}\n" +
"        </div>\n" +
"      )}\n" +
"\n" +
"      {step === 2 && (\n" +
"        <ul data-testid=\"summary\">\n" +
"          <li>Name: {form.name}</li>\n" +
"          <li>Email: {form.email}</li>\n" +
"          <li>Age: {form.age}</li>\n" +
"        </ul>\n" +
"      )}\n" +
"\n" +
"      <button data-testid=\"back\" onClick={goBack} disabled={step === 0}>Back</button>\n" +
"      <button data-testid=\"next\" onClick={goNext} disabled={step === 2}>Next</button>\n" +
"    </div>\n" +
"  );\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "renders step 1 with the account fields",
        body:
"assert(tid('step-title').textContent.indexOf('Step 1 of 3') !== -1, 'should start on step 1');\n" +
"assert(tid('name-input') && tid('email-input'), 'account fields should render');",
      },
      {
        name: "typing updates the controlled inputs",
        body:
"setValue(tid('name-input'), 'Ada Lovelace'); await flush();\n" +
"assert(tid('name-input').value === 'Ada Lovelace', 'name input should show what was typed, got \"' + tid('name-input').value + '\"');",
      },
      {
        name: "Next advances through every step",
        body:
"await click(tid('next')); await flush();\n" +
"assert(tid('step-title').textContent.indexOf('Step 2 of 3') !== -1, 'first Next should reach step 2');\n" +
"await click(tid('next')); await flush();\n" +
"assert(tid('step-title').textContent.indexOf('Step 3 of 3') !== -1, 'second Next should reach step 3, got \"' + tid('step-title').textContent + '\"');",
      },
      {
        name: "age gate rejects a 9-year-old",
        body:
"await click(tid('next')); await flush();\n" +
"setValue(tid('age-input'), '9'); await flush();\n" +
"assert(tid('age-error'), 'an age error should be visible for age 9');\n" +
"assert(tid('age-error').textContent === 'Must be 18 or older', 'expected the 18+ message, got \"' + (tid('age-error') ? tid('age-error').textContent : '(none)') + '\"');",
      },
      {
        name: "age 21 is accepted",
        body:
"await click(tid('next')); await flush();\n" +
"setValue(tid('age-input'), '21'); await flush();\n" +
"assert(!tid('age-error'), 'no error should show for age 21, got \"' + (tid('age-error') ? tid('age-error').textContent : '') + '\"');",
      },
      {
        name: "review step shows the entered data",
        body:
"setValue(tid('name-input'), 'Grace Hopper'); await flush();\n" +
"await click(tid('next')); await flush();\n" +
"setValue(tid('age-input'), '35'); await flush();\n" +
"await click(tid('next')); await flush();\n" +
"assert(tid('summary'), 'review list should render on step 3');\n" +
"assert(tid('summary').textContent.indexOf('Grace Hopper') !== -1, 'summary should include the name');\n" +
"assert(tid('summary').textContent.indexOf('35') !== -1, 'summary should include the age');",
      },
    ],
    bugs: [
      {
        title: "updateField mutates state and re-sets the same object",
        clazz: "state-mutation",
        hints: [
          "Typing does literally nothing on screen. Add console.log(form) inside updateField and inside the component body — is the component even re-rendering after a keystroke?",
          "setForm(form) passes the SAME object reference React already holds. React bails out when the new state is Object.is-equal to the old — mutated-in-place counts as unchanged.",
          "Build a new object per update: setForm({ ...form, [field]: value }).",
        ],
        symptom: "Controlled inputs never display what is typed; the component does not re-render on change.",
        trace: "A render-counter log shows renders on mount and on Next, but none on keystrokes. <code>updateField</code> runs (its log fires) — so state 'changes' without a render.",
        hypothesis: "React skips the re-render because <code>setForm</code> received the identical object reference; the mutation happened in place, so the equality check sees no change.",
        fix: "Replace, never mutate: spread into a fresh object with the updated field.",
        diff:
"  function updateField(field, value) {\n" +
"-   form[field] = value;\n" +
"-   setForm(form);\n" +
"+   setForm({ ...form, [field]: value });\n" +
"  }",
        why: "React state updates are detected by reference identity, not by inspecting contents. Mutating state and re-setting it is invisible to React by design — immutability is the contract that makes its change detection O(1).",
      },
      {
        title: "goNext is a useCallback with empty deps capturing step 0",
        clazz: "stale-closure",
        hints: [
          "Next works exactly once. Log `step` inside goNext on each click — what value does it print the second time?",
          "It prints 0 every time. The callback was created during the first render and never rebuilt ([] deps), so its closure still sees step = 0 and keeps computing 0 + 1.",
          "Use the functional form setStep(s => Math.min(s + 1, ...)) — or add step to the dependency array. The functional form is the sturdier fix.",
        ],
        symptom: "First Next click reaches step 2; every later click stays on step 2.",
        trace: "<code>console.log('goNext sees step =', step)</code> prints <code>0</code> on every click: the closure is frozen at the first render.",
        hypothesis: "<code>useCallback(..., [])</code> memoizes the very first closure forever; it computes <code>0 + 1</code> no matter what the current step is.",
        fix: "Functional update so the callback never needs the current value.",
        diff:
"  const goNext = React.useCallback(() => {\n" +
"-   setStep(Math.min(step + 1, WIZARD_STEPS.length - 1));\n" +
"+   setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));\n" +
"  }, []);",
        why: "Closures capture variables from the render that created them. Memoization (useCallback/useEffect with stale deps) keeps those old closures alive; any read of captured state inside them is a snapshot, not the live value. Functional updates sidestep the problem by asking React for the current value at call time.",
      },
      {
        title: "Age compared as strings: age < '18'",
        clazz: "type-coercion",
        hints: [
          "'9' fails the gate but '9' is obviously less than 18 — unless the comparison isn't numeric. What are the operand types in validateAge?",
          "Both sides are strings, so JavaScript compares character by character: '9' < '18' compares '9' vs '1' — false, because '9' sorts after '1'. Lexicographic, not numeric.",
          "Convert once and compare numbers: Number(age) < 18.",
        ],
        symptom: "Ages 2–9 pass the 18+ gate; ages 10–17 are correctly rejected — the wrongness depends on the first digit.",
        trace: "<code>console.log('9' &lt; '18', '15' &lt; '18')</code> → <code>false, true</code>. Only single-digit ages beat the gate — the signature of lexicographic string comparison.",
        hypothesis: "The input's value is a string, the threshold was written as a string, and <code>&lt;</code> silently compares them as text.",
        fix: "Parse to a number at the comparison.",
        diff:
"  function validateAge(age) {\n" +
"    if (age === '' || age == null) return 'Age is required';\n" +
"-   if (age < '18') return 'Must be 18 or older';\n" +
"+   if (Number(age) < 18) return 'Must be 18 or older';\n" +
"    return '';\n" +
"  }",
        why: "Relational operators only go numeric when at least one operand is a number; string vs string is dictionary order. Because two-digit ages happen to compare correctly against '18', the bug passes casual testing and only bites on single digits — partial correctness is what lets coercion bugs ship.",
      },
    ],
    fixedFiles: [
      {
        name: "validators.js",
        content:
"function validateName(name) {\n" +
"  if (!name || !name.trim()) return 'Name is required';\n" +
"  return '';\n" +
"}\n" +
"\n" +
"function validateAge(age) {\n" +
"  if (age === '' || age == null) return 'Age is required';\n" +
"  if (Number(age) < 18) return 'Must be 18 or older';\n" +
"  return '';\n" +
"}\n",
      },
      {
        name: "steps.js",
        content:
"var WIZARD_STEPS = [\n" +
"  { key: 'account', title: 'Account' },\n" +
"  { key: 'details', title: 'Details' },\n" +
"  { key: 'review',  title: 'Review' },\n" +
"];\n",
      },
      {
        name: "App.js",
        content:
"function App() {\n" +
"  const [step, setStep] = React.useState(0);\n" +
"  const [form, setForm] = React.useState({ name: '', email: '', age: '' });\n" +
"\n" +
"  function updateField(field, value) {\n" +
"    setForm({ ...form, [field]: value });\n" +
"  }\n" +
"\n" +
"  const goNext = React.useCallback(() => {\n" +
"    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));\n" +
"  }, []);\n" +
"\n" +
"  const goBack = () => setStep((s) => Math.max(s - 1, 0));\n" +
"\n" +
"  const ageError = validateAge(form.age);\n" +
"\n" +
"  return (\n" +
"    <div>\n" +
"      <h1 data-testid=\"step-title\">\n" +
"        Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step].title}\n" +
"      </h1>\n" +
"\n" +
"      {step === 0 && (\n" +
"        <div>\n" +
"          <label>Name <input data-testid=\"name-input\" value={form.name}\n" +
"            onChange={(e) => updateField('name', e.target.value)} /></label>\n" +
"          <label>Email <input data-testid=\"email-input\" value={form.email}\n" +
"            onChange={(e) => updateField('email', e.target.value)} /></label>\n" +
"        </div>\n" +
"      )}\n" +
"\n" +
"      {step === 1 && (\n" +
"        <div>\n" +
"          <label>Age <input data-testid=\"age-input\" value={form.age}\n" +
"            onChange={(e) => updateField('age', e.target.value)} /></label>\n" +
"          {ageError !== '' && <p data-testid=\"age-error\">{ageError}</p>}\n" +
"        </div>\n" +
"      )}\n" +
"\n" +
"      {step === 2 && (\n" +
"        <ul data-testid=\"summary\">\n" +
"          <li>Name: {form.name}</li>\n" +
"          <li>Email: {form.email}</li>\n" +
"          <li>Age: {form.age}</li>\n" +
"        </ul>\n" +
"      )}\n" +
"\n" +
"      <button data-testid=\"back\" onClick={goBack} disabled={step === 0}>Back</button>\n" +
"      <button data-testid=\"next\" onClick={goNext} disabled={step === 2}>Next</button>\n" +
"    </div>\n" +
"  );\n" +
"}\n",
      },
    ],
  });
})();
