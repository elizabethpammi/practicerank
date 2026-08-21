// Interview-Cake-style lesson walkthroughs — part A (problems 1–16).
// Loads AFTER problems-interview-{a,b,c}.js. Defines window.__LESSON for b/c.
(function () {
  "use strict";

  var BY = {};
  (window.INTERVIEW_PROBLEMS || []).forEach(function (p) { BY[p.slug] = p; });

  function ul(items) {
    return "<ul class='les-list'>" + items.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
  }

  // L() splices a lesson between the problem body and the solutions.
  // Every block is a collapsed <details> so she can escalate one hint at a
  // time instead of being handed the answer the moment she opens the page.
  function L(slug, o) {
    var p = BY[slug];
    if (!p) { console.warn("lesson for unknown slug:", slug); return; }
    var h = "<div class='lesson'>";
    h += "<details class='les les-gotcha'><summary>Gotchas — read these before you code</summary>" + ul(o.gotchas) + "</details>";
    h += "<details class='les'><summary>Breakdown — how to start thinking</summary>" + o.breakdown + "</details>";
    (o.hints || []).forEach(function (t, i) {
      h += "<details class='les les-hint'><summary>Hint " + (i + 1) + " of " + o.hints.length + "</summary><p>" + t + "</p></details>";
    });
    h += "<details class='les les-walk'><summary>Full walkthrough — the whole reasoning, step by step</summary>" +
      "<ol class='les-steps'>" + o.walkthrough.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>" +
      "<p class='les-cx'><b>Complexity.</b> " + o.complexity + "</p>" +
      "<p class='les-learn'><b>What we learned.</b> " + o.learned + "</p>" +
      "</details>";
    h += "</div>";
    p.statement = p.body + h + p.__tail;
    // enrich the Best Solution tab with the lesson's payoff
    if (p.solution) {
      p.solution.explanation =
        "<p><b>Complexity.</b> " + o.complexity + "</p>" +
        "<p><b>What we learned.</b> " + o.learned + "</p>" +
        "<p>The full reasoning path (gotchas, breakdown, hints, step-by-step walkthrough) is in the collapsed sections of the problem statement.</p>";
    }
  }
  window.__LESSON = L;

  /* ---------------- 1 ---------------- */
  L("apple-stocks", {
    gotchas: [
      "You cannot just take <code>max - min</code>. If the max happens <em>before</em> the min, that trade is illegal — you would be selling before you bought.",
      "You are <b>required</b> to trade. If the price only falls, the answer is a negative number (the smallest loss), not 0.",
      "Seeding <code>maxProfit</code> with 0 quietly breaks the all-falling case. Seed it with the first real trade instead: <code>prices[1] - prices[0]</code>.",
      "Update the profit <em>before</em> you update the minimum, or you will let yourself buy and sell in the same minute."
    ],
    breakdown: "<p>The brute force is two nested loops: for every buy time, try every later sell time. That is O(n&sup2;) and it is a fine thing to say out loud first — then improve it.</p>" +
      "<p>Ask the greedy question: <em>as I walk left to right, what is the one fact about the past I need in order to price the current minute?</em> Only one thing: the cheapest price I have seen so far. Everything else about the past is irrelevant. That realisation is what collapses O(n&sup2;) into O(n).</p>",
    hints: [
      "Walk through the array once. At each price, pretend you are selling right now. What would you need to know to compute that sale's profit?",
      "You need the minimum price seen <em>before</em> this index. Keep it in a variable and update it as you go.",
      "Order matters inside the loop: compute <code>price - minPrice</code> first, <em>then</em> update <code>minPrice</code>. Flipping those two lines lets you buy and sell at the same index."
    ],
    walkthrough: [
      "Guard the input. With fewer than 2 prices there is no legal buy-then-sell, so throw an error.",
      "Initialise <code>minPrice = prices[0]</code> and <code>maxProfit = prices[1] - prices[0]</code>. Starting profit at the first real trade is what makes the all-falling case return a negative instead of a wrong 0.",
      "Loop from index 1 to the end. For each price, compute <code>potential = currentPrice - minPrice</code>.",
      "Set <code>maxProfit = Math.max(maxProfit, potential)</code>.",
      "Only now set <code>minPrice = Math.min(minPrice, currentPrice)</code>. Doing it in this order guarantees the buy strictly precedes the sell.",
      "Return <code>maxProfit</code>. Trace <code>[10, 7, 5, 8, 11, 9]</code> by hand: min goes 10, 7, 5, 5, 5, 5 and profit goes -3, -3, 3, 6, 6. Answer 6."
    ],
    complexity: "O(n) time, O(1) space. One pass, two variables.",
    learned: "The greedy-single-pass pattern: instead of comparing every pair, carry forward the one running fact (here, the min so far) that makes each new element answerable on its own. You will reuse this shape constantly."
  });

  /* ---------------- 2 ---------------- */
  L("product-of-all-other-numbers", {
    gotchas: [
      "Division looks clever (total product / current) and it is <b>wrong</b> — a single 0 anywhere blows it up, and two zeros blow it up differently.",
      "Interviewers explicitly ban division on this one. Have the no-division answer ready as your first answer, not your recovery.",
      "Do not build a nested loop that skips index i. That is O(n&sup2;) and it is exactly what they are testing you past."
    ],
    breakdown: "<p>The product of everything except index <code>i</code> is: (product of everything to the <em>left</em> of i) &times; (product of everything to the <em>right</em> of i).</p>" +
      "<p>Both of those are running products, and running products can be computed in one sweep each. So: sweep forward filling in the left products, sweep backward multiplying in the right products. Two passes, no division.</p>",
    hints: [
      "Split the answer at index i into two halves: what is before it, and what is after it.",
      "Make an array where <code>result[i]</code> holds the product of everything before i. The first entry is 1 (nothing before it, and 1 is the identity for multiplication).",
      "Now walk the array backwards carrying a running <code>productSoFar</code> of everything to the right, and multiply it into each <code>result[i]</code> as you pass."
    ],
    walkthrough: [
      "Throw if the array has fewer than 2 numbers — there is no meaningful 'all the others'.",
      "Create <code>products</code> of the same length. Set <code>productSoFar = 1</code>.",
      "Forward pass, i from 0 up: write <code>products[i] = productSoFar</code>, <em>then</em> do <code>productSoFar *= nums[i]</code>. Writing before multiplying is what excludes i from its own product.",
      "Reset <code>productSoFar = 1</code>.",
      "Backward pass, i from the end down: do <code>products[i] *= productSoFar</code>, <em>then</em> <code>productSoFar *= nums[i]</code>.",
      "Return <code>products</code>. For <code>[1,7,3,4]</code> the forward pass gives <code>[1,1,7,21]</code> and the backward pass multiplies in <code>[84,12,4,1]</code> to give <code>[84,84,28,21]</code>."
    ],
    complexity: "O(n) time, O(n) space for the output array (which does not count as extra space in most interviewers' accounting).",
    learned: "Prefix/suffix accumulation. Any 'everything except me' question decomposes into a left running value and a right running value. Same trick solves prefix sums, rainwater trapping, and candy distribution."
  });

  /* ---------------- 3 ---------------- */
  L("highest-product-of-3", {
    gotchas: [
      "Negatives are the whole point. Two large negatives multiply into a large positive, so the answer is not always 'the three biggest numbers'.",
      "Sorting and taking the top three fails on <code>[-10, -10, 1, 3, 2]</code> (correct answer 300, sorted-top-3 gives 6).",
      "Update order inside the loop is everything. If you update <code>highest</code> before you use it in <code>highestProductOf2</code>, you will multiply a number by itself."
    ],
    breakdown: "<p>Sorting is O(n log n) and they want O(n). So think greedy again: what do I need to know about the prefix of the array in order to fold in the next number?</p>" +
      "<p>To extend a product of 3, I need the best product of 2 so far. To extend a product of 2, I need the best single number so far. And because negatives flip signs, I need the <em>lowest</em> versions of those too. That is five running values: highest, lowest, highestProductOf2, lowestProductOf2, highestProductOf3.</p>",
    hints: [
      "Try sorting first, then break your own solution with <code>[-10, -10, 1, 3, 2]</code>. Now you understand the real problem.",
      "The best 3-product ending at the current number is either the old best 3-product, or the current number times the best 2-product from before it. Also consider the current number times the <em>worst</em> 2-product — two negatives.",
      "Track five values and update them bottom-up: 3-products first (they depend on 2-products), then 2-products (they depend on singles), then singles last."
    ],
    walkthrough: [
      "Throw if fewer than 3 numbers.",
      "Seed from the first two elements: <code>highest = max(nums[0], nums[1])</code>, <code>lowest = min(...)</code>, <code>highestProductOf2 = lowestProductOf2 = nums[0] * nums[1]</code>, and <code>highestProductOf3 = nums[0] * nums[1] * nums[2]</code>.",
      "Loop from index 2. First update <code>highestProductOf3 = max(highestProductOf3, current * highestProductOf2, current * lowestProductOf2)</code>. The third term is the negatives case.",
      "Then update <code>highestProductOf2 = max(highestProductOf2, current * highest, current * lowest)</code> and the mirror-image <code>lowestProductOf2</code> using <code>min</code>.",
      "Then update <code>highest = max(highest, current)</code> and <code>lowest = min(lowest, current)</code>.",
      "Return <code>highestProductOf3</code>. The strict top-down update order is what stops a number from being used twice in the same product."
    ],
    complexity: "O(n) time, O(1) space. One pass, five variables.",
    learned: "When a greedy pass has to survive sign flips, carry both the max and the min. Tracking the 'worst' value is not paranoia, it is the answer — the same trick powers maximum-product-subarray."
  });

  /* ---------------- 4 ---------------- */
  L("merging-meeting-times", {
    gotchas: [
      "Meetings that merely touch — one ends at 5 and the next starts at 5 — <b>do</b> merge. Use <code>&lt;=</code>, not <code>&lt;</code>.",
      "The input is not sorted. Comparing only neighbours in the given order misses overlaps.",
      "Do not mutate the caller's array. <code>.sort()</code> sorts in place, so copy first with <code>.slice()</code>.",
      "A merged block can swallow several following blocks in a row, so keep extending the same block rather than merging pairwise once."
    ],
    breakdown: "<p>Comparing every meeting against every other is O(n&sup2;). The unlock is sorting by start time: once sorted, any meeting that overlaps a given meeting must be <em>adjacent</em> to it in the sorted order. That reduces the whole problem to a single sweep.</p>" +
      "<p>Sweep with one 'current merged block'. Each new meeting either extends it or starts a fresh one.</p>",
    hints: [
      "What ordering would let you decide 'merge or not' by looking only at the previous item?",
      "Sort a copy by <code>startTime</code>. Now overlaps are always neighbours.",
      "Hold a <code>currentMerged</code> block. If the next meeting starts at or before <code>currentMerged.endTime</code>, extend the end to the max of the two ends. Otherwise push the block and start a new one."
    ],
    walkthrough: [
      "Copy and sort: <code>meetings.slice().sort((a, b) =&gt; a.startTime - b.startTime)</code>. The comparator is required — a bare <code>.sort()</code> compares stringified objects.",
      "Initialise <code>merged = [ {...sorted[0]} ]</code> — a shallow copy, so you never mutate the input objects.",
      "For each remaining meeting, look at <code>lastMerged = merged[merged.length - 1]</code>.",
      "If <code>current.startTime &lt;= lastMerged.endTime</code> they overlap or touch: set <code>lastMerged.endTime = Math.max(lastMerged.endTime, current.endTime)</code>. Taking the max matters because the current meeting may end <em>earlier</em> and be fully contained.",
      "Otherwise push a copy of <code>current</code> as a new block.",
      "Return <code>merged</code>. Trace <code>[1,2] [2,3]</code>: they touch, so they merge into <code>[1,3]</code>."
    ],
    complexity: "O(n log n) time (dominated by the sort), O(n) space for the output.",
    learned: "Sorting is often not the answer but the <em>setup</em> for the answer. Once intervals are start-sorted, overlap becomes a local property, and a hard global question becomes a one-pass sweep."
  });

  /* ---------------- 5 ---------------- */
  L("making-change", {
    gotchas: [
      "Greedy (always take the biggest coin) counts <em>ways</em> wrongly and even computes the wrong minimum for coin sets like <code>[1, 3, 4]</code>.",
      "If your loops are nested amount-outside / coin-inside, you will count <code>1+2</code> and <code>2+1</code> as two different ways. Coins must be the <b>outer</b> loop.",
      "<code>ways[0] = 1</code>, not 0. There is exactly one way to make nothing: take no coins. Getting this base case wrong zeroes out the entire table."
    ],
    breakdown: "<p>Start with the recursive framing: for each coin you either use it (and still need <code>amount - coin</code>) or you do not (and you need <code>amount</code> from the remaining coins). That tree has enormous overlap, which is the signal for dynamic programming.</p>" +
      "<p>Flip it bottom-up. Build an array <code>ways</code> where <code>ways[a]</code> is the number of ways to make amount <code>a</code>. Introduce coins one at a time, and each coin adds the ways it enables.</p>",
    hints: [
      "Write the recursive version first, even if it is exponential. The subproblem is (remaining amount, which coins are still allowed).",
      "Make an array of size <code>amount + 1</code>, all zeros except <code>ways[0] = 1</code>.",
      "For each coin, for each amount from <code>coin</code> up to <code>amount</code>: <code>ways[a] += ways[a - coin]</code>. Reading a smaller already-updated entry is what enforces non-decreasing coin order and kills duplicates."
    ],
    walkthrough: [
      "Create <code>ways = new Array(amount + 1).fill(0)</code> and set <code>ways[0] = 1</code>.",
      "Outer loop over each coin.",
      "Inner loop <code>a</code> from <code>coin</code> to <code>amount</code>. Starting at <code>coin</code> avoids a negative index check for free.",
      "Do <code>ways[a] += ways[a - coin]</code> — 'every way of making <code>a - coin</code> becomes a way of making <code>a</code> once I add this coin'.",
      "Return <code>ways[amount]</code>.",
      "Trace amount 4 with coins <code>[1,2,3]</code>: after coin 1, ways is <code>[1,1,1,1,1]</code>; after coin 2, <code>[1,1,2,2,3]</code>; after coin 3, <code>[1,1,2,3,4]</code>. Answer 4."
    ],
    complexity: "O(n &times; amount) time, O(amount) space.",
    learned: "The bottom-up DP table, and the loop-order rule that separates combinations from permutations. Coins outer means combinations; amounts outer means permutations. That single swap is a very common interview follow-up."
  });

  /* ---------------- 6 ---------------- */
  L("rectangular-love", {
    gotchas: [
      "Rectangles that only touch along an edge have zero-width overlap. Decide explicitly whether that counts as overlap (here it does not — return nulls).",
      "Returning <code>width: 0</code> with a real <code>leftX</code> is a bug. If either dimension fails to overlap, <b>all four</b> return fields must be null.",
      "It is easy to write a wall of eight comparisons. That is the version that gets you dinged for readability."
    ],
    breakdown: "<p>The insight is decomposition: a 2-D rectangle overlap is just two independent 1-D range overlaps — one on X, one on Y. Solve the 1-D case once in a helper, call it twice.</p>" +
      "<p>Interviewers on this problem are explicitly grading your instinct to factor out the repeated logic. Saying 'let me write a helper for one dimension' out loud is most of the score.</p>",
    hints: [
      "Forget 2-D. Given two segments on a number line, what is their overlap?",
      "The overlapping segment starts at <code>max(start1, start2)</code> and ends at <code>min(end1, end2)</code>. If that end is not greater than that start, there is no overlap.",
      "Call your 1-D helper on the X coordinates and again on the Y coordinates, then combine. If <em>either</em> comes back empty, the whole result is empty."
    ],
    walkthrough: [
      "Write <code>findRangeOverlap(point1, length1, point2, length2)</code>.",
      "Inside: <code>highestStart = Math.max(point1, point2)</code> and <code>lowestEnd = Math.min(point1 + length1, point2 + length2)</code>.",
      "If <code>highestStart &gt;= lowestEnd</code> return <code>{ point: null, length: null }</code>.",
      "Otherwise return <code>{ point: highestStart, length: lowestEnd - highestStart }</code>.",
      "In the main function, call the helper on X (<code>leftX</code>/<code>width</code>) and on Y (<code>bottomY</code>/<code>height</code>).",
      "If either result has a null point, return all four fields as null. Otherwise assemble <code>{ leftX, bottomY, width, height }</code>."
    ],
    complexity: "O(1) time, O(1) space. This one is graded on structure, not speed.",
    learned: "Decompose by dimension. When a problem is the same logic repeated across axes, write the axis-agnostic helper and call it — that instinct generalises straight to 3-D collision, date-range overlap, and version-range matching."
  });

  /* ---------------- 7 ---------------- */
  L("temperature-tracker", {
    gotchas: [
      "You cannot store every reading and compute on demand — the whole point is O(1) per insert and O(1) per query.",
      "The mean needs <em>two</em> running values, a sum and a count. Storing only a running average and averaging averages is wrong.",
      "The mode must be maintained incrementally: keep a counts object plus the max count seen so far. Do not scan the counts on every query.",
      "Ties for the mode: pick a rule and state it. Here, first one to reach the max count wins."
    ],
    breakdown: "<p>This is a design question wearing an algorithms costume. The real prompt is: <em>which aggregates can be updated in constant time as data streams in?</em></p>" +
      "<p>Max and min: trivially updatable. Mean: keep sum and count. Mode: keep a frequency map and the running max frequency. All four fall out of one insert.</p>",
    hints: [
      "Imagine readings arriving one per second forever. What is the smallest amount of state that still answers all four questions?",
      "Max and min are one comparison each. Mean is <code>totalSum / totalNumbers</code> — keep both.",
      "For mode, increment <code>counts[temp]</code>, then if that new count beats <code>maxOccurrences</code>, update both <code>maxOccurrences</code> and <code>mode</code> right there."
    ],
    walkthrough: [
      "Handle the empty input case up front and return nulls, or throw — say which you chose and why.",
      "Initialise <code>max = -Infinity</code>, <code>min = Infinity</code>, <code>totalSum = 0</code>, <code>totalNumbers = 0</code>, <code>counts = {}</code>, <code>maxOccurrences = 0</code>, <code>mode = null</code>.",
      "For each temperature: bump <code>totalNumbers</code> and add to <code>totalSum</code>.",
      "Update <code>counts[t] = (counts[t] || 0) + 1</code>. If <code>counts[t] &gt; maxOccurrences</code>, set <code>maxOccurrences = counts[t]</code> and <code>mode = t</code>.",
      "Update <code>max</code> and <code>min</code> with simple comparisons.",
      "Return <code>{ max, min, mean: totalSum / totalNumbers, mode }</code>. Note the mean is computed at read time from two stored numbers — that is the O(1) part."
    ],
    complexity: "O(1) per insert, O(1) per query, O(k) space where k is the number of distinct temperatures.",
    learned: "Streaming aggregates. Any 'summary row' feature — dashboards, monitoring, analytics panels — is built this way, and it is the exact shape of a Prometheus counter/gauge. Good story to have ready for an observability interview."
  });

  /* ---------------- 8 ---------------- */
  L("balanced-binary-tree", {
    gotchas: [
      "'Superbalanced' here means the difference between the shallowest and deepest <em>leaf</em> depths is at most 1. That is not the same as the textbook AVL definition — read the spec you are given.",
      "Recursion risks a stack overflow on a pathological tree. An explicit stack sidesteps that and shows you know the difference.",
      "You must track leaf depths only. Internal nodes do not count.",
      "Short-circuit early. Once you have 3 distinct depths, or 2 that differ by more than 1, you can stop immediately — do not finish the traversal."
    ],
    breakdown: "<p>Any traversal works, so choose depth-first with an explicit stack of <code>[node, depth]</code> pairs — it is O(h) space instead of O(n) for breadth-first on a wide tree.</p>" +
      "<p>The clever compression: you never need all leaf depths, only the <em>set</em> of distinct ones, and the moment that set can no longer satisfy the rule you are done. So the collection is capped at 2 entries.</p>",
    hints: [
      "What counts as a leaf? A node with neither a left nor a right child.",
      "Push <code>[root, 0]</code> onto a stack. Pop, and if the node is a leaf, record its depth. Otherwise push its children with <code>depth + 1</code>.",
      "Keep <code>depths</code> as an array of distinct values. If it grows past 2 entries, or holds 2 entries more than 1 apart, return false immediately."
    ],
    walkthrough: [
      "Empty tree is balanced by convention — return true.",
      "Create <code>depths = []</code> and <code>nodes = [[root, 0]]</code>.",
      "While the stack is not empty, pop <code>[node, depth]</code>.",
      "If it is a leaf and <code>depth</code> is not already in <code>depths</code>, push it. Then check the failure conditions: <code>depths.length &gt; 2</code>, or <code>depths.length === 2 &amp;&amp; Math.abs(depths[0] - depths[1]) &gt; 1</code>. Either one means return false.",
      "If it is not a leaf, push each existing child as <code>[child, depth + 1]</code>.",
      "If the loop finishes without failing, return true."
    ],
    complexity: "O(n) time worst case, O(n) space worst case for the stack (O(h) on a balanced tree).",
    learned: "Iterative DFS with an explicit stack, plus early termination. Carrying <code>[node, metadata]</code> pairs on the stack is the standard way to thread depth or path information through a non-recursive traversal."
  });

  /* ---------------- 9 ---------------- */
  L("bst-checker", {
    gotchas: [
      "Checking only <code>node.left.value &lt; node.value</code> at each node is the classic wrong answer. It passes trees that are obviously not BSTs.",
      "The counterexample to memorise: root 50, left child 30, and 30's right child 60. Every local check passes, but 60 sits in the left subtree of 50.",
      "In-order traversal producing a sorted array also works but costs O(n) extra space and is slower to explain."
    ],
    breakdown: "<p>The BST property is not local, it is inherited. A node in the left subtree of 50 must be below 50 no matter how far down it is.</p>" +
      "<p>So carry a valid range down the traversal. Root starts with <code>(-Infinity, Infinity)</code>. Going left tightens the upper bound to the parent's value; going right tightens the lower bound.</p>",
    hints: [
      "Build the tree 50 / 30 / 30.right = 60 on paper and run your local-comparison idea against it.",
      "Each node needs to know not just its parent but the whole constraint inherited from every ancestor. Compress that into two numbers: a lower bound and an upper bound.",
      "Push <code>[node, lowerBound, upperBound]</code> onto a stack. Left child inherits <code>[lowerBound, node.value]</code>, right child inherits <code>[node.value, upperBound]</code>."
    ],
    walkthrough: [
      "Empty tree is a valid BST — return true.",
      "Stack starts as <code>[[root, -Infinity, Infinity]]</code>.",
      "Pop <code>[node, lowerBound, upperBound]</code>. If <code>node.value &lt;= lowerBound || node.value &gt;= upperBound</code>, return false.",
      "Push the left child as <code>[left, lowerBound, node.value]</code>.",
      "Push the right child as <code>[right, node.value, upperBound]</code>.",
      "Survive the whole traversal and return true. Note the bounds only ever tighten, never loosen — that is the inheritance made concrete."
    ],
    complexity: "O(n) time, O(h) space for the stack where h is the tree height.",
    learned: "Push constraints down the recursion instead of checking them locally. This 'carry the valid range' pattern also solves range-sum validation, interval trees, and most 'is this structure globally consistent' questions."
  });

  /* ---------------- 10 ---------------- */
  L("second-largest-bst", {
    gotchas: [
      "Do not do a full in-order traversal and take the second-to-last element. That is O(n) when O(h) is available.",
      "Two distinct cases and people forget the second one: if the largest node <b>has</b> a left subtree, the answer is the largest node in that left subtree, not the largest node's parent.",
      "Fewer than two nodes means there is no second largest — throw rather than return undefined."
    ],
    breakdown: "<p>The largest node is found by walking right until you cannot. The second largest is one of exactly two things:</p>" +
      "<ul class='les-list'><li>the parent of the largest, if the largest is a leaf;</li><li>the largest node of the largest node's <em>left</em> subtree, if it has one.</li></ul>" +
      "<p>So walk down once, keeping track of the current node and its parent, and branch at the bottom.</p>",
    breakdownAlt: "",
    hints: [
      "Where does the largest value live in a BST? Follow that path.",
      "Once you are standing on the largest node, ask: what is the next value down? Draw a tree where the largest node has a left child and one where it does not.",
      "Walk down while keeping a <code>parent</code> pointer. When the current node has no right child, you are at the largest — now decide between the parent and the left subtree's maximum."
    ],
    walkthrough: [
      "Throw if the tree is empty or has only a root with no children.",
      "Set <code>current = root</code>, <code>parent = null</code>.",
      "Loop: if <code>current.right</code> exists, set <code>parent = current</code> and <code>current = current.right</code>. Continue until <code>current.right</code> is null.",
      "You are now on the largest node. If it has a left child, walk that left subtree all the way right and return the value you land on.",
      "Otherwise return <code>parent.value</code>.",
      "Both branches finish in one root-to-leaf-ish descent, which is why this is O(h) and not O(n)."
    ],
    complexity: "O(h) time where h is the height (O(log n) on a balanced tree), O(1) space.",
    learned: "Exploit the structure instead of flattening it. Whenever you are about to sort or fully traverse an already-ordered structure, ask what the ordering alone tells you — that is where the O(n) to O(log n) jump lives."
  });

  /* ---------------- 11 ---------------- */
  L("million-gazillion", {
    gotchas: [
      "A hash set of full URLs is the obvious answer and it is the one being rejected — the memory cost is the point of the question.",
      "Do not forget the terminator marker. Without an end-of-word flag, 'car' and 'card' become indistinguishable and prefixes get reported as full words.",
      "Tries save memory only when the strings share prefixes. Say that trade-off out loud; it is half the answer."
    ],
    breakdown: "<p>URLs share enormous prefixes (<code>https://www.</code>, the domain, path segments). A trie stores each shared prefix once instead of once per URL.</p>" +
      "<p>Each node is a map from a character to a child node. Insertion walks or creates the path; the last node gets an end-of-word marker.</p>",
    hints: [
      "How much of any two URLs from the same site is byte-for-byte identical?",
      "Store characters as tree edges. Every node is just an object whose keys are next characters.",
      "Use a reserved key like <code>'*'</code> or <code>endOfWord: true</code> to mark that a complete string ends here."
    ],
    walkthrough: [
      "Start with an empty root object.",
      "For each word, set <code>current = root</code>.",
      "For each character, if <code>char</code> is not already a key on <code>current</code>, create <code>current[char] = {}</code>. Then descend: <code>current = current[char]</code>.",
      "After the last character, set the end marker on <code>current</code>.",
      "For a 'has this word been seen before' variant, notice whether you created any new nodes or whether the end marker was already set — if nothing was new, it is a duplicate.",
      "Return the root. Inserting 'car' then 'card' creates 3 nodes then 1 more, not 7."
    ],
    complexity: "O(k) time per insert where k is the string length. Space is O(total distinct prefix characters), which is far below O(total characters) for real URL sets.",
    learned: "The trie, and the broader habit of choosing a data structure by the <em>shape of the data</em> rather than by the operation. Prefix sharing is a real memory strategy — it is how autocomplete, IP routing tables, and spell-checkers are built."
  });

  /* ---------------- 12 ---------------- */
  L("find-in-ordered-set", {
    gotchas: [
      "<code>const mid = (floor + ceiling) / 2</code> without flooring gives you a fractional index and an infinite loop.",
      "Off-by-one in the loop condition (<code>&lt;</code> vs <code>&lt;=</code>) is the number one binary search bug. Pick a convention for what your bounds mean and hold it.",
      "In other languages <code>(low + high) / 2</code> can overflow. JavaScript will not overflow here, but mentioning <code>low + (high - low) / 2</code> shows depth."
    ],
    breakdown: "<p>Every comparison against the middle element throws away half the remaining candidates. That halving is what turns n into log&#8322; n — 1,000,000 items become 20 comparisons.</p>" +
      "<p>Hold two bounds, look at the middle, and move whichever bound the comparison rules out.</p>",
    hints: [
      "Guessing a number between 1 and 100 with 'higher or lower' feedback — what is your first guess, and why?",
      "Keep <code>floorIndex</code> just below the range and <code>ceilingIndex</code> just above it, so the live range is strictly between them.",
      "Loop while <code>floorIndex &lt; ceilingIndex - 1</code>. Compute <code>guessIndex = Math.floor((floorIndex + ceilingIndex) / 2)</code> and move one bound to <code>guessIndex</code> each iteration."
    ],
    walkthrough: [
      "Set <code>floorIndex = -1</code> and <code>ceilingIndex = array.length</code>. Both start <em>outside</em> the array, which is what makes the loop condition clean.",
      "While <code>floorIndex &lt; ceilingIndex - 1</code>, there is still a live element between the bounds.",
      "Compute <code>guessIndex = Math.floor((floorIndex + ceilingIndex) / 2)</code> and read <code>guessValue</code>.",
      "If <code>guessValue === target</code>, return <code>guessIndex</code>.",
      "If <code>guessValue &gt; target</code> the answer is left, so set <code>ceilingIndex = guessIndex</code>. Otherwise set <code>floorIndex = guessIndex</code>.",
      "Fall out of the loop and return -1. Because the bounds always move to the guess index, the range strictly shrinks and the loop must terminate."
    ],
    complexity: "O(log n) time, O(1) space.",
    learned: "Binary search, and more importantly the exclusive-bounds convention that makes it easy to get right under pressure. Write it once your way and reuse that exact skeleton every time."
  });

  /* ---------------- 13 ---------------- */
  L("find-rotation-point", {
    gotchas: [
      "This is binary search on a property, not on a value. There is no target to compare against — you compare against the <em>first</em> element.",
      "A non-rotated array (already sorted) has its rotation point at index 0. Make sure your loop returns that rather than falling through.",
      "Duplicates break the O(log n) guarantee. Mention it; do not pretend the problem is duplicate-safe."
    ],
    breakdown: "<p>The array is two sorted runs glued together, and every element in the first run is greater than or equal to <code>array[0]</code> while every element in the second run is less than it.</p>" +
      "<p>That gives a boolean test you can binary search on: 'is this index still in the first run?' Find the boundary between true and false.</p>",
    hints: [
      "Compare the middle element to the very first element. What does 'middle is bigger' tell you about which half the rotation point is in?",
      "If <code>array[mid] &gt;= array[0]</code>, the wrap has not happened yet, so the rotation point is to the right.",
      "Shrink the window until the two bounds are adjacent. The ceiling is the answer."
    ],
    walkthrough: [
      "Store <code>firstValue = array[0]</code>.",
      "Set <code>floorIndex = 0</code> and <code>ceilingIndex = array.length - 1</code>.",
      "While <code>floorIndex &lt; ceilingIndex - 1</code>, take the midpoint.",
      "If <code>array[guessIndex] &gt;= firstValue</code>, the rotation point is after the guess: <code>floorIndex = guessIndex</code>. Otherwise <code>ceilingIndex = guessIndex</code>.",
      "When the bounds are adjacent, <code>ceilingIndex</code> is the first element of the second run — return it.",
      "Sanity check: on a fully sorted array the condition is always true, floor marches to the end, and you should special-case or verify the result is 0 as your spec requires."
    ],
    complexity: "O(log n) time, O(1) space.",
    learned: "Binary search generalises far past 'find this number'. If you can write a monotonic yes/no test over the index space — true, true, true, false, false — you can binary search for the flip. That framing solves rotation points, first bad version, and capacity-allocation problems."
  });

  /* ---------------- 14 ---------------- */
  L("inflight-entertainment", {
    gotchas: [
      "You must use <b>two different</b> movies. Checking <code>flightLength - movie === movie</code> and accepting it double-counts a single film.",
      "Sorting first and using two pointers is O(n log n). The hash-set version is O(n) — reach for the set.",
      "Do not build the whole set first and then scan. Check-then-insert in one pass, so the set only ever contains movies at earlier indices."
    ],
    breakdown: "<p>This is two-sum with a story. For each movie you know exactly what its partner must be: <code>flightLength - movieLength</code>. The only question is whether you have seen that partner already.</p>" +
      "<p>A set gives O(1) 'have I seen this' lookups, which turns the O(n&sup2;) pair scan into one pass.</p>",
    hints: [
      "Given one movie, how many candidate partners are there? Exactly one length.",
      "Walk the list once. Before adding the current movie to your seen-set, ask whether its required partner is already in there.",
      "Checking before inserting is what guarantees the two movies are distinct entries."
    ],
    walkthrough: [
      "Create <code>movieLengthsSeen = new Set()</code>.",
      "For each <code>firstMovieLength</code> in the list, compute <code>matchingSecondMovieLength = flightLength - firstMovieLength</code>.",
      "If <code>movieLengthsSeen.has(matchingSecondMovieLength)</code>, return true.",
      "Otherwise <code>movieLengthsSeen.add(firstMovieLength)</code> and continue.",
      "Return false after the loop.",
      "Trace flight 5 with <code>[2, 4, 3]</code>: 2 needs 3 (not seen, add 2); 4 needs 1 (not seen, add 4); 3 needs 2 (seen!) so true."
    ],
    complexity: "O(n) time, O(n) space.",
    learned: "The seen-set one-pass pattern. Check-before-insert is the small detail that enforces 'two distinct elements' for free, and it is the same skeleton as two-sum, contains-duplicate, and pair-with-given-difference."
  });

  /* ---------------- 15 ---------------- */
  L("nth-fibonacci", {
    gotchas: [
      "Naive recursion is O(2&#8319;) and will hang the grader on n = 50. It is a fine <em>first</em> answer to state, but never your final one.",
      "Memoised recursion is O(n) time but O(n) space and can still blow the call stack. The bottom-up loop is strictly better here.",
      "Negative n should throw. Both n = 0 and n = 1 return themselves — get the base cases explicit."
    ],
    breakdown: "<p>Draw the recursion tree for <code>fib(5)</code>. You will compute <code>fib(2)</code> three separate times. That repeated work is the entire cost.</p>" +
      "<p>Going bottom-up removes it: compute each value once, in order, and notice you only ever need the previous two. So the O(n) memo table collapses to two variables.</p>",
    hints: [
      "Write the recursive version and count how many times <code>fib(2)</code> gets called for <code>fib(6)</code>.",
      "Build up from 0 and 1 instead of down from n. Each new value is the sum of the last two.",
      "You never look further back than two steps, so you do not need an array at all — just <code>prev</code> and <code>prevPrev</code>."
    ],
    walkthrough: [
      "Throw on negative n.",
      "Return n directly for n = 0 and n = 1.",
      "Set <code>prevPrev = 0</code> and <code>prev = 1</code>.",
      "Loop from 2 to n: <code>current = prev + prevPrev</code>, then <code>prevPrev = prev</code>, then <code>prev = current</code>. The assignment order matters — overwrite <code>prevPrev</code> before <code>prev</code>.",
      "Return <code>prev</code> (or <code>current</code>) after the loop.",
      "n = 50 now runs in 50 additions instead of roughly 2&#8309;&#8304; calls."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "The full DP progression in one problem: naive recursion → memoisation → bottom-up table → rolling variables. Being able to walk an interviewer up that ladder out loud is worth more than jumping straight to the final answer."
  });

  /* ---------------- 16 ---------------- */
  L("cake-thief", {
    gotchas: [
      "Cakes are <b>unlimited</b>, so this is unbounded knapsack, not 0/1. The inner loop runs forward, not backward.",
      "A cake with weight 0 and a positive value means infinite money. Decide whether to throw or return Infinity, and say so — this is the case the interviewer is fishing for.",
      "Negative weights are invalid input. Guard them.",
      "Greedy by value-per-weight is wrong. <code>[(3, 40), (5, 70)]</code> with capacity 8 shows it."
    ],
    breakdown: "<p>Bottom-up DP over capacities. Let <code>maxValuesAtCapacities[c]</code> be the best haul for a bag of exactly capacity <code>c</code>.</p>" +
      "<p>For each capacity, try every cake type that fits: taking one leaves <code>c - weight</code> of room, and that subproblem is already solved. Because you may reuse a cake, you read from the <em>same</em> table you are filling — that is what makes it unbounded.</p>",
    hints: [
      "What is the most valuable haul for a bag of capacity 0? Capacity 1? Build up from there.",
      "For capacity c and cake (weight, value), the candidate answer is <code>value + best[c - weight]</code>.",
      "Take the max over all cakes that fit. Reading <code>best[c - weight]</code> from the array you are currently filling is deliberate — it lets the same cake be used again."
    ],
    walkthrough: [
      "Validate: throw on negative weight; handle weight 0 with positive value explicitly.",
      "Create <code>maxValuesAtCapacities = new Array(capacity + 1).fill(0)</code>.",
      "Outer loop <code>currentCapacity</code> from 0 to capacity.",
      "Set <code>currentMaxValue = 0</code>. Inner loop over each cake type.",
      "If <code>cake.weight &lt;= currentCapacity</code>, compute <code>maxValueUsingCake = cake.value + maxValuesAtCapacities[currentCapacity - cake.weight]</code> and keep the running max.",
      "Store <code>maxValuesAtCapacities[currentCapacity] = currentMaxValue</code>, and return the last entry. Trace capacity 7 with <code>[(3,40),(5,70)]</code>: capacities 3–4 give 40, 5 gives 70, 6 gives 80, 7 gives 80."
    ],
    complexity: "O(n &times; capacity) time where n is the number of cake types, O(capacity) space.",
    learned: "Unbounded knapsack, and the loop-direction rule that distinguishes it from 0/1 knapsack. Forward inner loop means unlimited reuse; backward means each item once. Same table, one direction apart."
  });
})();
