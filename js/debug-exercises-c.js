/* Debug bank C — mock technical-screen round.
 * A mid-size backend service with several seeded bugs and one failing suite,
 * sized to a 40-minute live screen. Same shape as banks A/B.
 */
(function () {
  "use strict";
  window.DEBUG_EXERCISES = window.DEBUG_EXERCISES || [];

  var DB_BUGGY = [
    "// In-memory async product/order store. Every call returns a promise with a",
    "// small delay, like a real driver would.",
    "var PRODUCTS = [",
    "  { id: 'kb1', name: 'Keyboard', price: 2400, stock: 10 },",
    "  { id: 'ms2', name: 'Mouse', price: 1300, stock: 4 },",
    "  { id: 'mn3', name: 'Monitor', price: 18000, stock: 2 },",
    "];",
    "var ORDERS = [];",
    "var NEXT_ORDER_ID = 500;",
    "",
    "function dbDelay() {",
    "  return new Promise(function (r) { setTimeout(r, 5); });",
    "}",
    "",
    "async function dbGetProduct(id) {",
    "  await dbDelay();",
    "  return PRODUCTS.find(function (p) { return p.id === id; }) || null;",
    "}",
    "",
    "async function dbUpdateStock(id, stock) {",
    "  await dbDelay();",
    "  var p = PRODUCTS.find(function (x) { return x.id === id; });",
    "  if (!p) throw new Error('no such product: ' + id);",
    "  p.stock = stock;",
    "  return p.stock;",
    "}",
    "",
    "async function dbSaveOrder(order) {",
    "  await dbDelay();",
    "  order.id = NEXT_ORDER_ID++;",
    "  ORDERS.push(order);",
    "  return order;",
    "}",
    "",
    "async function dbListOrders() {",
    "  await dbDelay();",
    "  return ORDERS.slice();",
    "}",
    "",
    "function dbReset() {",
    "  PRODUCTS = [",
    "    { id: 'kb1', name: 'Keyboard', price: 2400, stock: 10 },",
    "    { id: 'ms2', name: 'Mouse', price: 1300, stock: 4 },",
    "    { id: 'mn3', name: 'Monitor', price: 18000, stock: 2 },",
    "  ];",
    "  ORDERS = [];",
    "  NEXT_ORDER_ID = 500;",
    "}",
  ].join("\n");

  var PRICING_BUGGY = [
    "// Pricing rules. All money is integer cents.",
    "//   - Discount codes are case-insensitive per the spec ('SAVE10' == 'save10').",
    "//   - Orders of $50.00 (5000 cents) OR MORE ship free; below that, 599 cents.",
    "var DISCOUNTS = { save10: 0.10, welcome15: 0.15 };",
    "var SHIPPING_CENTS = 599;",
    "var FREE_SHIPPING_MIN = 5000;",
    "",
    "function computeSubtotal(items, products) {",
    "  var subtotal = 0;",
    "  items.forEach(function (it) {",
    "    var p = products[it.productId];",
    "    subtotal += p.price * it.qty;",
    "  });",
    "  return subtotal;",
    "}",
    "",
    "function discountRate(code) {",
    "  if (!code) return 0;",
    "  return DISCOUNTS[code] || 0;",
    "}",
    "",
    "function buildReceipt(items, products, rate) {",
    "  return items.map(function (it) {",
    "    var p = products[it.productId];",
    "    if (rate > 0) {",
    "      p.price = Math.round(p.price * (1 - rate));",
    "    }",
    "    return { productId: p.id, name: p.name, unitPrice: p.price, qty: it.qty };",
    "  });",
    "}",
    "",
    "function shippingFor(subtotalAfterDiscount) {",
    "  return subtotalAfterDiscount > FREE_SHIPPING_MIN ? 0 : SHIPPING_CENTS;",
    "}",
  ].join("\n");

  var ALLOCATE_BUGGY = [
    "// Stock allocation. reserveStock() must be all-or-nothing: either every",
    "// line item is reserved, or none are and it throws.",
    "async function reserveStock(items) {",
    "  var failed = null;",
    "  items.forEach(async function (it) {",
    "    var p = await dbGetProduct(it.productId);",
    "    if (!p || p.stock < it.qty) { failed = it.productId; return; }",
    "    await dbUpdateStock(it.productId, p.stock - it.qty);",
    "  });",
    "  if (failed) throw new Error('insufficient stock: ' + failed);",
    "  return true;",
    "}",
  ].join("\n");

  var SERVICE_BUGGY = [
    "// Order service — the public API the tests exercise.",
    "async function placeOrder(cart) {",
    "  if (!cart || !cart.items || !cart.items.length) {",
    "    throw new Error('empty cart');",
    "  }",
    "  var products = {};",
    "  await Promise.all(cart.items.map(async function (it) {",
    "    var p = await dbGetProduct(it.productId);",
    "    if (!p) throw new Error('unknown product: ' + it.productId);",
    "    products[it.productId] = p;",
    "  }));",
    "",
    "  var subtotal = computeSubtotal(cart.items, products);",
    "  var rate = discountRate(cart.discountCode);",
    "  var receipt = buildReceipt(cart.items, products, rate);",
    "  var discounted = Math.round(subtotal * (1 - rate));",
    "  var shipping = shippingFor(discounted);",
    "",
    "  await reserveStock(cart.items);",
    "",
    "  var order = {",
    "    lines: receipt,",
    "    subtotal: subtotal,",
    "    discountCode: cart.discountCode || null,",
    "    total: discounted + shipping,",
    "    shipping: shipping,",
    "  };",
    "  dbSaveOrder(order);",
    "  return { ok: true, orderId: order.id, total: order.total };",
    "}",
  ].join("\n");

  var DB_FIXED = DB_BUGGY.replace(
    "  return PRODUCTS.find(function (p) { return p.id === id; }) || null;",
    "  var p = PRODUCTS.find(function (x) { return x.id === id; });\n  // hand out a copy — callers must not be able to mutate the store\n  return p ? { id: p.id, name: p.name, price: p.price, stock: p.stock } : null;"
  );

  var PRICING_FIXED = PRICING_BUGGY
    .replace(
      "  return DISCOUNTS[code] || 0;",
      "  return DISCOUNTS[String(code).toLowerCase()] || 0;"
    )
    .replace(
      "    if (rate > 0) {\n      p.price = Math.round(p.price * (1 - rate));\n    }\n    return { productId: p.id, name: p.name, unitPrice: p.price, qty: it.qty };",
      "    var unit = rate > 0 ? Math.round(p.price * (1 - rate)) : p.price;\n    return { productId: p.id, name: p.name, unitPrice: unit, qty: it.qty };"
    )
    .replace(
      "  return subtotalAfterDiscount > FREE_SHIPPING_MIN ? 0 : SHIPPING_CENTS;",
      "  return subtotalAfterDiscount >= FREE_SHIPPING_MIN ? 0 : SHIPPING_CENTS;"
    );

  var ALLOCATE_FIXED = [
    "// Stock allocation. reserveStock() must be all-or-nothing: either every",
    "// line item is reserved, or none are and it throws.",
    "async function reserveStock(items) {",
    "  var reserved = [];",
    "  for (var i = 0; i < items.length; i++) {",
    "    var it = items[i];",
    "    var p = await dbGetProduct(it.productId);",
    "    if (!p || p.stock < it.qty) {",
    "      // roll back everything already taken, then fail",
    "      for (var j = 0; j < reserved.length; j++) {",
    "        var r = reserved[j];",
    "        var cur = await dbGetProduct(r.productId);",
    "        await dbUpdateStock(r.productId, cur.stock + r.qty);",
    "      }",
    "      throw new Error('insufficient stock: ' + it.productId);",
    "    }",
    "    await dbUpdateStock(it.productId, p.stock - it.qty);",
    "    reserved.push({ productId: it.productId, qty: it.qty });",
    "  }",
    "  return true;",
    "}",
  ].join("\n");

  var SERVICE_FIXED = SERVICE_BUGGY.replace(
    "  dbSaveOrder(order);\n  return { ok: true, orderId: order.id, total: order.total };",
    "  await dbSaveOrder(order);\n  return { ok: true, orderId: order.id, total: order.total };"
  );

  window.DEBUG_EXERCISES.push({
    slug: "fulfillment-service",
    name: "Fulfillment Service — Mock Screen Round",
    kind: "worker",
    difficulty: "Hard",
    minutes: 40,
    summary: "discounts ignored · prices drifting · oversells · stock leaks · phantom orders",
    brief:
      "<p><b>Run this like the real thing:</b> 40 minutes on the clock, narrate your reasoning out loud the whole time, and treat the hints as your interviewer — ask before you're stuck, not after.</p>" +
      "<p>A checkout/fulfillment service is misbehaving in production. Support tickets say:</p><ul>" +
      "<li>&ldquo;Customers typing <code>SAVE10</code> get no discount, but the code is valid.&rdquo;</li>" +
      "<li>&ldquo;A $50.00 order was charged $5.99 shipping — the spec says $50 or more ships free.&rdquo;</li>" +
      "<li>&ldquo;Prices are drifting downward: after someone uses a discount code, the next customer sees the discounted price as the base price.&rdquo;</li>" +
      "<li>&ldquo;We oversold monitors — an order for 999 went through with 2 in stock.&rdquo;</li>" +
      "<li>&ldquo;When a mixed order fails, stock for the items that <i>were</i> available disappears anyway.&rdquo;</li>" +
      "<li>&ldquo;Order confirmations show <code>orderId: undefined</code> and the order sometimes isn't in the list right after checkout.&rdquo;</li>" +
      "</ul><p>Every operation is in-process (no real HTTP/DB). Find the bugs, fix them, make the suite green. The failing tests are your repro steps — read them first.</p>",
    files: [
      { name: "db.js", content: DB_BUGGY },
      { name: "pricing.js", content: PRICING_BUGGY },
      { name: "allocate.js", content: ALLOCATE_BUGGY },
      { name: "service.js", content: SERVICE_BUGGY },
    ],
    fixedFiles: [
      { name: "db.js", content: DB_FIXED },
      { name: "pricing.js", content: PRICING_FIXED },
      { name: "allocate.js", content: ALLOCATE_FIXED },
      { name: "service.js", content: SERVICE_FIXED },
    ],
    tests: [
      {
        name: "subtotal: 2 keyboards + 1 mouse = 6100 cents, free shipping",
        body:
          "dbReset();\n" +
          "var res = await placeOrder({ items: [{ productId: 'kb1', qty: 2 }, { productId: 'ms2', qty: 1 }] });\n" +
          "assert(res.ok === true, 'order should succeed');\n" +
          "assert(res.total === 6100, 'expected 6100 (subtotal 6100, free shipping at >= 5000), got ' + res.total);",
      },
      {
        name: "discount codes are case-insensitive: SAVE10 takes 10% off",
        body:
          "dbReset();\n" +
          "var res = await placeOrder({ items: [{ productId: 'mn3', qty: 1 }], discountCode: 'SAVE10' });\n" +
          "assert(res.total === 16200, 'expected 18000 - 10% = 16200 (free shipping), got ' + res.total);",
      },
      {
        name: "exactly 5000 cents ships free",
        body:
          "dbReset();\n" +
          "var below = await placeOrder({ items: [{ productId: 'ms2', qty: 1 }] });\n" +
          "assert(below.total === 1300 + 599, 'sanity: 1300 is below the line so shipping applies, got ' + below.total);\n" +
          "dbReset();\n" +
          "var at = await placeOrder({ items: [{ productId: 'kb1', qty: 1 }, { productId: 'ms2', qty: 2 }] });\n" +
          "assert(at.total === 5000, 'exactly 5000 cents subtotal must ship free, got ' + at.total);",
      },
      {
        name: "a discounted order must not change catalog prices",
        body:
          "dbReset();\n" +
          "await placeOrder({ items: [{ productId: 'kb1', qty: 1 }], discountCode: 'save10' });\n" +
          "var p = await dbGetProduct('kb1');\n" +
          "assert(p.price === 2400, 'catalog price drifted: expected 2400, got ' + p.price);",
      },
      {
        name: "ordering more than stock is rejected",
        body:
          "dbReset();\n" +
          "var threw = false;\n" +
          "try { await placeOrder({ items: [{ productId: 'mn3', qty: 999 }] }); }\n" +
          "catch (e) { threw = true; assert(String(e.message).indexOf('insufficient') !== -1, 'error should say insufficient stock, got: ' + e.message); }\n" +
          "assert(threw, 'an order of 999 monitors (stock: 2) must be rejected');",
      },
      {
        name: "a failed mixed order leaves stock untouched (all-or-nothing)",
        body:
          "dbReset();\n" +
          "var threw = false;\n" +
          "try { await placeOrder({ items: [{ productId: 'kb1', qty: 3 }, { productId: 'mn3', qty: 999 }] }); }\n" +
          "catch (e) { threw = true; }\n" +
          "assert(threw, 'the mixed order must fail');\n" +
          "await sleep(60); // let any stray async work land before we inspect\n" +
          "var kb = await dbGetProduct('kb1');\n" +
          "assert(kb.stock === 10, 'keyboard stock leaked: expected 10, got ' + kb.stock);",
      },
      {
        name: "placeOrder returns a real orderId and the order is queryable",
        body:
          "dbReset();\n" +
          "var res = await placeOrder({ items: [{ productId: 'ms2', qty: 1 }] });\n" +
          "assert(typeof res.orderId === 'number', 'orderId should be a number, got ' + res.orderId);\n" +
          "var orders = await dbListOrders();\n" +
          "assert(orders.length === 1, 'order should be saved before placeOrder resolves, found ' + orders.length);\n" +
          "assert(orders[0].id === res.orderId, 'ids should match');",
      },
    ],
    bugs: [
      {
        title: "Discount lookup is case-sensitive",
        clazz: "input-normalization",
        hints: [
          "The ticket says customers type SAVE10 and get nothing, yet the code exists. Log what discountRate() receives and what keys DISCOUNTS actually has.",
          "The map keys are lowercase; the raw user string is used as the key. Normalize with String(code).toLowerCase() before the lookup — the spec in the file header says codes are case-insensitive.",
        ],
      },
      {
        title: "Free shipping threshold off by one comparison",
        clazz: "boundary",
        hints: [
          "The spec comment says $50.00 OR MORE ships free. Test the boundary value 5000 against shippingFor() by hand.",
          "shippingFor uses > where the spec says >=. Exactly 5000 must ship free.",
        ],
      },
      {
        title: "buildReceipt mutates live catalog objects",
        clazz: "shared-state-mutation",
        hints: [
          "Prices drift only after discounted orders, and dbGetProduct hands back the object from PRODUCTS itself. Who writes to p.price?",
          "buildReceipt assigns the discounted value onto the shared product object. Compute the discounted unit price into a local instead of mutating — and consider having dbGetProduct return a copy so the store can't be mutated by callers at all.",
        ],
      },
      {
        title: "reserveStock uses forEach(async …) — nothing is awaited",
        clazz: "async-loop",
        hints: [
          "reserveStock returns true even for 999 monitors. Add a log after the forEach and inside the callback — which prints first?",
          "forEach ignores the promises its async callback returns, so the failure check runs before any product is fetched. Use a plain for loop with await (or Promise.all with a pre-check) so the checks actually complete before you decide.",
        ],
      },
      {
        title: "No rollback on partial reservation failure",
        clazz: "transactional-integrity",
        hints: [
          "After fixing the loop: a mixed order fails on the second item, but the first item's stock is already decremented. The function promises all-or-nothing.",
          "Track what you've reserved; on failure, restore each reserved line (current stock + qty) before throwing.",
        ],
      },
      {
        title: "dbSaveOrder is never awaited — orderId is undefined",
        clazz: "missing-await",
        hints: [
          "The confirmation shows orderId: undefined, and the order list is empty immediately after checkout. When does order.id get assigned relative to the return?",
          "dbSaveOrder(order) is fired without await, so the id is assigned after placeOrder has already returned. await it.",
        ],
      },
    ],
  });
})();
