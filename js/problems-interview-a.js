// Special Interview Questions — tier 2 bank (Interview Cake roster), part A (1–16).
// Loaded before -b.js and -c.js. Shares the P() builder via window.__IPUSH.
(function () {
  "use strict";
  var IP = (window.INTERVIEW_PROBLEMS = window.INTERVIEW_PROBLEMS || []);

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // P() turns a compact spec into a full PracticeRank problem object.
  // Everything after the statement body is collapsed <details> so the page
  // still reads like a real challenge until she chooses to peek.
  function P(o) {
    o.tier = "special";
    o.category = "Special Interview Questions";
    o.maxScore = o.maxScore || 30;
    o.successRate = o.successRate || "—";
    var alts = (o.alts || [])
      .map(function (a) {
        return (
          '<div class="alt-item"><p class="alt-q">' + a.q + "</p>" +
          '<p class="alt-a">' + a.a + "</p>" +
          "<pre><code>" + esc(a.code) + "</code></pre></div>"
        );
      })
      .join("");
    // __tail is kept separate so lessons-*.js can splice the walkthrough
    // in between the problem body and the alternatives/solutions.
    o.__tail =
      '<details class="alt"><summary>Asked another way (' + (o.alts || []).length +
      " variants + solutions)</summary>" + alts + "</details>" +
      '<details class="sol"><summary>JavaScript solution</summary><pre><code>' + esc(o.js) + "</code></pre></details>" +
      '<details class="sol"><summary>Python reference (read-only — you code in JS)</summary><pre><code>' + esc(o.py) + "</code></pre></details>";
    o.statement = o.body + o.__tail;
    IP.push(o);
    return o;
  }
  window.__IPUSH = P;

  /* ---------------- 1. Apple Stocks ---------------- */
  P({
    slug: "apple-stocks",
    name: "Apple Stocks",
    sub: "Greedy",
    difficulty: "Medium",
    fn: "getMaxProfit",
    body: `
<p>You have an array <code>prices</code> where <code>prices[i]</code> is the stock price at minute <code>i</code>. Write <code>getMaxProfit(prices)</code> that returns the best profit from <strong>one</strong> buy and <strong>one later</strong> sell.</p>
<p>You must buy before you sell. If every trade loses money, return the <em>least bad</em> loss (a negative number) — you are required to trade.</p>
<h3>Example</h3>
<pre>getMaxProfit([10, 7, 5, 8, 11, 9])  ->  6   // buy at 5, sell at 11</pre>
<h3>Goal</h3>
<p>O(n) time, O(1) space. One pass. Track the cheapest price seen so far and the best profit so far — and update profit <em>before</em> you update the minimum, or you will let yourself buy and sell in the same minute.</p>`,
    alts: [
      { q: "\"Find the maximum difference between two elements where the larger comes after the smaller.\"", a: "Same problem, no story. Same one-pass min-tracking.", code: "function maxDiff(a){let mn=a[0],best=a[1]-a[0];for(let i=1;i<a.length;i++){best=Math.max(best,a[i]-mn);mn=Math.min(mn,a[i]);}return best;}" },
      { q: "\"Best Time to Buy and Sell Stock\" (LeetCode 121) — return 0 if no profit is possible.", a: "Identical loop; only the floor changes from 'least bad loss' to 0.", code: "function maxProfit(p){let mn=Infinity,best=0;for(const x of p){mn=Math.min(mn,x);best=Math.max(best,x-mn);}return best;}" },
      { q: "\"Given temperature readings, find the biggest rise from an earlier reading to a later one.\"", a: "The measurement-data version — exactly what Credo-style panels ask. Same code, renamed.", code: "function biggestRise(r){let mn=r[0],best=r[1]-r[0];for(let i=1;i<r.length;i++){best=Math.max(best,r[i]-mn);mn=Math.min(mn,r[i]);}return best;}" },
      { q: "\"What if you may buy and sell as many times as you want?\"", a: "Completely different: sum every upward step. Greedy, no min tracking.", code: "function maxProfitMany(p){let s=0;for(let i=1;i<p.length;i++)if(p[i]>p[i-1])s+=p[i]-p[i-1];return s;}" },
    ],
    js: `function getMaxProfit(prices) {
    if (prices.length < 2) throw new Error('Need at least 2 prices');
    let minPrice = prices[0];
    let maxProfit = prices[1] - prices[0];
    for (let i = 1; i < prices.length; i++) {
        const current = prices[i];
        maxProfit = Math.max(maxProfit, current - minPrice);  // sell first
        minPrice = Math.min(minPrice, current);               // then buy
    }
    return maxProfit;
}`,
    py: `def get_max_profit(prices):
    if len(prices) < 2:
        raise ValueError('Need at least 2 prices')
    min_price = prices[0]
    max_profit = prices[1] - prices[0]
    for current in prices[1:]:
        max_profit = max(max_profit, current - min_price)
        min_price = min(min_price, current)
    return max_profit`,
    starter: `function getMaxProfit(prices) {
    // Write your code here

}`,
    cases: [
      { args: [[10, 7, 5, 8, 11, 9]], expected: 6, sample: true },
      { args: [[1, 2]], expected: 1, sample: true },
      { args: [[10, 9, 8, 2]], expected: -1, sample: false },
      { args: [[5, 4, 3, 2, 1]], expected: -1, sample: false },
      { args: [[2, 2, 2]], expected: 0, sample: false },
      { args: [[3, 1, 100, 0, 50]], expected: 99, sample: false },
    ],
  });

  /* ---------------- 2. Product of All Other Numbers ---------------- */
  P({
    slug: "product-of-all-other-numbers",
    name: "Product of All Other Numbers",
    sub: "Arrays",
    difficulty: "Medium",
    fn: "getProductsOfAllIntsExceptAtIndex",
    body: `
<p>Given an array of integers, return an array where <code>result[i]</code> is the product of every number <em>except</em> the one at index <code>i</code>.</p>
<h3>Example</h3>
<pre>[1, 7, 3, 4]  ->  [84, 12, 28, 21]</pre>
<h3>Goal</h3>
<p>O(n) time. <strong>Do not use division</strong> — it breaks on zeros. Make two passes: one collecting the product of everything <em>before</em> each index, one multiplying in the product of everything <em>after</em>.</p>`,
    alts: [
      { q: "\"Product of Array Except Self\" (LeetCode 238) — do it in O(1) extra space.", a: "Same two passes, but write the prefix into the output array and carry the suffix in a single variable.", code: "function productExceptSelf(n){const r=new Array(n.length).fill(1);let p=1;for(let i=0;i<n.length;i++){r[i]=p;p*=n[i];}let s=1;for(let i=n.length-1;i>=0;i--){r[i]*=s;s*=n[i];}return r;}" },
      { q: "\"Return the running total to the left of each index.\"", a: "That is literally just the first pass — prefix sums instead of prefix products.", code: "function prefixSums(a){const r=[];let s=0;for(const x of a){r.push(s);s+=x;}return r;}" },
      { q: "\"For each lane, give me the average of all the OTHER lanes.\"", a: "The measurement-data phrasing. Total sum minus this one, divided by n-1 — sums allow subtraction, so no prefix trick needed.", code: "function othersAvg(v){const t=v.reduce((a,b)=>a+b,0);return v.map(x=>(t-x)/(v.length-1));}" },
      { q: "\"Why not just divide the total product by each element?\"", a: "Say this out loud: it dies on a single 0 (divide by zero) and gives all zeros with two 0s. The prefix/suffix version handles both for free.", code: "// [0,1,2] -> total product is 0, so division gives [NaN, 0, 0]\n// prefix/suffix correctly gives [2, 0, 0]" },
    ],
    js: `function getProductsOfAllIntsExceptAtIndex(nums) {
    if (nums.length < 2) throw new Error('Need at least 2 numbers');
    const products = new Array(nums.length).fill(1);

    let before = 1;
    for (let i = 0; i < nums.length; i++) {
        products[i] = before;
        before *= nums[i];
    }

    let after = 1;
    for (let i = nums.length - 1; i >= 0; i--) {
        products[i] *= after;
        after *= nums[i];
    }
    return products;
}`,
    py: `def get_products_of_all_ints_except_at_index(nums):
    products = [1] * len(nums)
    before = 1
    for i in range(len(nums)):
        products[i] = before
        before *= nums[i]
    after = 1
    for i in range(len(nums) - 1, -1, -1):
        products[i] *= after
        after *= nums[i]
    return products`,
    starter: `function getProductsOfAllIntsExceptAtIndex(nums) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 7, 3, 4]], expected: [84, 12, 28, 21], sample: true },
      { args: [[2, 3]], expected: [3, 2], sample: true },
      { args: [[1, 2, 6, 5, 9]], expected: [540, 270, 90, 108, 60], sample: false },
      { args: [[0, 1, 2]], expected: [2, 0, 0], sample: false },
      { args: [[0, 0, 3]], expected: [0, 0, 0], sample: false },
      { args: [[-2, 3, 4]], expected: [12, -8, -6], sample: false },
    ],
  });

  /* ---------------- 3. Highest Product of 3 ---------------- */
  P({
    slug: "highest-product-of-3",
    name: "Highest Product of 3",
    sub: "Greedy",
    difficulty: "Hard",
    fn: "highestProductOf3",
    body: `
<p>Given an array of at least three integers, return the highest product you can get from three of them.</p>
<h3>Example</h3>
<pre>[1, 10, -5, 1, -100]  ->  5000   // -5 * -100 * 10</pre>
<h3>Goal</h3>
<p>O(n) time, O(1) space, one pass. The trap is negatives: two big negatives multiply into a big positive. Carry five running values — highest, lowest, highest product of 2, lowest product of 2, highest product of 3 — and <strong>update them in the right order</strong> (products before the singles they depend on).</p>`,
    alts: [
      { q: "\"Maximum Product of Three Numbers\" (LeetCode 628) — sorting allowed.", a: "The easy out: sort, then the answer is either the top three or the two smallest times the largest. O(n log n) but 3 lines. Offer this first, then the O(n) version.", code: "function maxProduct3(a){a=[...a].sort((x,y)=>x-y);const n=a.length;return Math.max(a[n-1]*a[n-2]*a[n-3], a[0]*a[1]*a[n-1]);}" },
      { q: "\"Highest product of TWO numbers.\"", a: "Simpler warm-up they often open with. Same idea, one level down.", code: "function highest2(a){let hi=Math.max(a[0],a[1]),lo=Math.min(a[0],a[1]),best=a[0]*a[1];for(let i=2;i<a.length;i++){best=Math.max(best,a[i]*hi,a[i]*lo);hi=Math.max(hi,a[i]);lo=Math.min(lo,a[i]);}return best;}" },
      { q: "\"What if all the numbers are positive?\"", a: "Then it collapses to 'find the three largest' — no lowest tracking at all.", code: "function top3Product(a){let[x,y,z]=[-Infinity,-Infinity,-Infinity];for(const n of a){if(n>x){z=y;y=x;x=n;}else if(n>y){z=y;y=n;}else if(n>z)z=n;}return x*y*z;}" },
    ],
    js: `function highestProductOf3(nums) {
    if (nums.length < 3) throw new Error('Need at least 3 numbers');

    let highest = Math.max(nums[0], nums[1]);
    let lowest = Math.min(nums[0], nums[1]);
    let highestProductOf2 = nums[0] * nums[1];
    let lowestProductOf2 = nums[0] * nums[1];
    let highestProductOf3v = nums[0] * nums[1] * nums[2];

    for (let i = 2; i < nums.length; i++) {
        const current = nums[i];
        // order matters: use the OLD pair products before overwriting them
        highestProductOf3v = Math.max(highestProductOf3v, current * highestProductOf2, current * lowestProductOf2);
        highestProductOf2 = Math.max(highestProductOf2, current * highest, current * lowest);
        lowestProductOf2 = Math.min(lowestProductOf2, current * highest, current * lowest);
        highest = Math.max(highest, current);
        lowest = Math.min(lowest, current);
    }
    return highestProductOf3v;
}`,
    py: `def highest_product_of_3(nums):
    highest = max(nums[0], nums[1])
    lowest = min(nums[0], nums[1])
    highest_2 = lowest_2 = nums[0] * nums[1]
    highest_3 = nums[0] * nums[1] * nums[2]
    for current in nums[2:]:
        highest_3 = max(highest_3, current * highest_2, current * lowest_2)
        highest_2 = max(highest_2, current * highest, current * lowest)
        lowest_2 = min(lowest_2, current * highest, current * lowest)
        highest = max(highest, current)
        lowest = min(lowest, current)
    return highest_3`,
    starter: `function highestProductOf3(nums) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 10, -5, 1, -100]], expected: 5000, sample: true },
      { args: [[1, 2, 3, 4]], expected: 24, sample: true },
      { args: [[-10, -10, 1, 3, 2]], expected: 300, sample: false },
      { args: [[-1, -2, -3]], expected: -6, sample: false },
      { args: [[0, 0, 5, -1]], expected: 0, sample: false },
      { args: [[-5, -4, -3, -2, -1]], expected: -6, sample: false },
    ],
  });

  /* ---------------- 4. Merging Meeting Times ---------------- */
  P({
    slug: "merging-meeting-times",
    name: "Merging Meeting Times",
    sub: "Sorting",
    difficulty: "Medium",
    fn: "mergeRanges",
    body: `
<p>Given an array of meeting time ranges <code>{ startTime, endTime }</code>, merge every overlapping or touching range and return the condensed list, sorted by start time.</p>
<h3>Example</h3>
<pre>[{0,1},{3,5},{4,8},{10,12},{9,10}]
  ->  [{0,1},{3,8},{9,12}]</pre>
<h3>Goal</h3>
<p>Sort by <code>startTime</code> first — that is the whole trick. Then walk the list keeping the last merged range: if the next start is <code>&lt;=</code> the last end, stretch the end; otherwise push a new range. O(n log n).</p>
<p>Return objects with the keys <code>startTime</code> and <code>endTime</code>. Do not mutate the input.</p>`,
    alts: [
      { q: "\"Merge Intervals\" (LeetCode 56) with <code>[start, end]</code> arrays instead of objects.", a: "Same algorithm, array indices instead of keys.", code: "function merge(iv){iv=[...iv].sort((a,b)=>a[0]-b[0]);const out=[];for(const[s,e]of iv){const last=out[out.length-1];if(last&&s<=last[1])last[1]=Math.max(last[1],e);else out.push([s,e]);}return out;}" },
      { q: "\"How many meeting rooms do we need?\" (LeetCode 253)", a: "Different shape: sweep line. Sort starts and ends separately, walk both, track concurrent count.", code: "function rooms(iv){const s=iv.map(x=>x.startTime).sort((a,b)=>a-b),e=iv.map(x=>x.endTime).sort((a,b)=>a-b);let i=0,j=0,cur=0,best=0;while(i<s.length){if(s[i]<e[j]){cur++;i++;best=Math.max(best,cur);}else{cur--;j++;}}return best;}" },
      { q: "\"Insert a new meeting into an already-sorted list and merge.\" (LeetCode 57)", a: "No sort needed — three phases: before, overlapping (absorb), after.", code: "function insert(iv,nw){const out=[];let i=0;while(i<iv.length&&iv[i][1]<nw[0])out.push(iv[i++]);while(i<iv.length&&iv[i][0]<=nw[1]){nw=[Math.min(nw[0],iv[i][0]),Math.max(nw[1],iv[i][1])];i++;}out.push(nw);while(i<iv.length)out.push(iv[i++]);return out;}" },
      { q: "\"Merge these time windows where a sensor was offline.\"", a: "Same code. Say the sentence 'sort by start, then extend or push' — it is the answer to every interval question.", code: "// identical to mergeRanges — only the noun changed" },
    ],
    js: `function mergeRanges(meetings) {
    const sorted = meetings
        .slice()
        .sort((a, b) => a.startTime - b.startTime);   // never bare .sort()

    const merged = [];
    for (const meeting of sorted) {
        const last = merged[merged.length - 1];
        if (last && meeting.startTime <= last.endTime) {
            last.endTime = Math.max(last.endTime, meeting.endTime);
        } else {
            merged.push({ startTime: meeting.startTime, endTime: meeting.endTime });
        }
    }
    return merged;
}`,
    py: `def merge_ranges(meetings):
    sorted_meetings = sorted(meetings, key=lambda m: m['startTime'])
    merged = []
    for m in sorted_meetings:
        if merged and m['startTime'] <= merged[-1]['endTime']:
            merged[-1]['endTime'] = max(merged[-1]['endTime'], m['endTime'])
        else:
            merged.append(dict(m))
    return merged`,
    starter: `function mergeRanges(meetings) {
    // Write your code here

}`,
    cases: [
      {
        args: [[{ startTime: 0, endTime: 1 }, { startTime: 3, endTime: 5 }, { startTime: 4, endTime: 8 }, { startTime: 10, endTime: 12 }, { startTime: 9, endTime: 10 }]],
        expected: [{ startTime: 0, endTime: 1 }, { startTime: 3, endTime: 8 }, { startTime: 9, endTime: 12 }],
        sample: true,
      },
      { args: [[{ startTime: 1, endTime: 2 }, { startTime: 2, endTime: 3 }]], expected: [{ startTime: 1, endTime: 3 }], sample: true },
      { args: [[{ startTime: 1, endTime: 10 }, { startTime: 2, endTime: 6 }, { startTime: 3, endTime: 5 }, { startTime: 7, endTime: 9 }]], expected: [{ startTime: 1, endTime: 10 }], sample: false },
      { args: [[]], expected: [], sample: false },
      { args: [[{ startTime: 5, endTime: 6 }, { startTime: 1, endTime: 2 }]], expected: [{ startTime: 1, endTime: 2 }, { startTime: 5, endTime: 6 }], sample: false },
    ],
  });

  /* ---------------- 5. Making Change ---------------- */
  P({
    slug: "making-change",
    name: "Making Change",
    sub: "Dynamic Programming",
    difficulty: "Hard",
    fn: "changePossibilities",
    body: `
<p>Given an <code>amount</code> and an array of coin <code>denominations</code>, return the number of <strong>distinct combinations</strong> of coins that add up to the amount. Order does not matter — <code>1+2</code> and <code>2+1</code> are the same way.</p>
<h3>Example</h3>
<pre>changePossibilities(4, [1, 2, 3])  ->  4
// 1+1+1+1, 1+1+2, 1+3, 2+2</pre>
<h3>Goal</h3>
<p>Bottom-up DP. <code>ways[0] = 1</code> (one way to make nothing: take no coins). Loop <strong>coins on the outside</strong>, amounts on the inside — that outer-loop-is-coins ordering is what stops <code>1+2</code> and <code>2+1</code> from being counted twice.</p>`,
    alts: [
      { q: "\"Coin Change II\" (LeetCode 518) — count combinations.", a: "Word-for-word the same problem.", code: "function change(amount,coins){const w=new Array(amount+1).fill(0);w[0]=1;for(const c of coins)for(let a=c;a<=amount;a++)w[a]+=w[a-c];return w[amount];}" },
      { q: "\"Fewest coins to make the amount.\" (LeetCode 322)", a: "Different DP: min instead of sum, seed with Infinity, return -1 if unreachable.", code: "function coinChange(coins,amount){const d=new Array(amount+1).fill(Infinity);d[0]=0;for(let a=1;a<=amount;a++)for(const c of coins)if(c<=a)d[a]=Math.min(d[a],d[a-c]+1);return d[amount]===Infinity?-1:d[amount];}" },
      { q: "\"Count the PERMUTATIONS instead — 1+2 and 2+1 are different.\"", a: "Just flip the loops: amounts outside, coins inside. Great answer to give unprompted; it proves you know why the order matters.", code: "function perms(amount,coins){const w=new Array(amount+1).fill(0);w[0]=1;for(let a=1;a<=amount;a++)for(const c of coins)if(c<=a)w[a]+=w[a-c];return w[amount];}" },
    ],
    js: `function changePossibilities(amount, denominations) {
    const waysOfDoingNCents = new Array(amount + 1).fill(0);
    waysOfDoingNCents[0] = 1;                 // one way to make 0: no coins

    for (const coin of denominations) {       // coins OUTSIDE
        for (let higher = coin; higher <= amount; higher++) {
            waysOfDoingNCents[higher] += waysOfDoingNCents[higher - coin];
        }
    }
    return waysOfDoingNCents[amount];
}`,
    py: `def change_possibilities(amount, denominations):
    ways = [0] * (amount + 1)
    ways[0] = 1
    for coin in denominations:
        for higher in range(coin, amount + 1):
            ways[higher] += ways[higher - coin]
    return ways[amount]`,
    starter: `function changePossibilities(amount, denominations) {
    // Write your code here

}`,
    cases: [
      { args: [4, [1, 2, 3]], expected: 4, sample: true },
      { args: [5, [1, 3, 5]], expected: 3, sample: true },
      { args: [0, [1, 2]], expected: 1, sample: false },
      { args: [5, []], expected: 0, sample: false },
      { args: [1, [2]], expected: 0, sample: false },
      { args: [10, [2, 5, 3, 6]], expected: 5, sample: false },
    ],
  });

  /* ---------------- 6. Rectangular Love ---------------- */
  P({
    slug: "rectangular-love",
    name: "Rectangular Love",
    sub: "Geometry",
    difficulty: "Medium",
    fn: "findRectangularOverlap",
    body: `
<p>Rectangles are <code>{ leftX, bottomY, width, height }</code>. Return the rectangle where two of them overlap.</p>
<p>If they do not overlap (or only touch at an edge, giving zero area) return <code>{ leftX: null, bottomY: null, width: null, height: null }</code>.</p>
<h3>Example</h3>
<pre>{leftX:1, bottomY:1, width:6, height:3}
{leftX:5, bottomY:2, width:3, height:6}
  ->  {leftX:5, bottomY:2, width:2, height:2}</pre>
<h3>Goal</h3>
<p>Solve one dimension at a time. Write a helper that takes two 1-D ranges and returns the overlapping range, then call it for X and for Y. That decomposition <em>is</em> the answer they want to hear.</p>`,
    alts: [
      { q: "\"Rectangle Overlap\" — just return true/false. (LeetCode 836)", a: "One boolean expression; no helper needed.", code: "function overlaps(a,b){return a.leftX<b.leftX+b.width&&b.leftX<a.leftX+a.width&&a.bottomY<b.bottomY+b.height&&b.bottomY<a.bottomY+a.height;}" },
      { q: "\"Give me the total area covered by two rectangles.\" (LeetCode 223)", a: "Sum of both areas minus the overlap area — reuses this exact function.", code: "function totalArea(a,b){const o=findRectangularOverlap(a,b);const ov=o.width?o.width*o.height:0;return a.width*a.height+b.width*b.height-ov;}" },
      { q: "\"Do these two time windows overlap, and by how much?\"", a: "It is the same 1-D helper with time instead of X. This is why you factor it out.", code: "function timeOverlap(a,b){const s=Math.max(a.start,b.start),e=Math.min(a.end,b.end);return e>s?e-s:0;}" },
    ],
    js: `function findRangeOverlap(point1, length1, point2, length2) {
    const highestStart = Math.max(point1, point2);
    const lowestEnd = Math.min(point1 + length1, point2 + length2);
    if (highestStart >= lowestEnd) return { startPoint: null, overlapLength: null };
    return { startPoint: highestStart, overlapLength: lowestEnd - highestStart };
}

function findRectangularOverlap(rect1, rect2) {
    const x = findRangeOverlap(rect1.leftX, rect1.width, rect2.leftX, rect2.width);
    const y = findRangeOverlap(rect1.bottomY, rect1.height, rect2.bottomY, rect2.height);

    if (!x.overlapLength || !y.overlapLength) {
        return { leftX: null, bottomY: null, width: null, height: null };
    }
    return {
        leftX: x.startPoint,
        bottomY: y.startPoint,
        width: x.overlapLength,
        height: y.overlapLength,
    };
}`,
    py: `def find_range_overlap(p1, l1, p2, l2):
    highest_start = max(p1, p2)
    lowest_end = min(p1 + l1, p2 + l2)
    if highest_start >= lowest_end:
        return None, None
    return highest_start, lowest_end - highest_start

def find_rectangular_overlap(r1, r2):
    x, w = find_range_overlap(r1['leftX'], r1['width'], r2['leftX'], r2['width'])
    y, h = find_range_overlap(r1['bottomY'], r1['height'], r2['bottomY'], r2['height'])
    if not w or not h:
        return {'leftX': None, 'bottomY': None, 'width': None, 'height': None}
    return {'leftX': x, 'bottomY': y, 'width': w, 'height': h}`,
    starter: `function findRectangularOverlap(rect1, rect2) {
    // Write your code here

}`,
    cases: [
      {
        args: [{ leftX: 1, bottomY: 1, width: 6, height: 3 }, { leftX: 5, bottomY: 2, width: 3, height: 6 }],
        expected: { leftX: 5, bottomY: 2, width: 2, height: 2 },
        sample: true,
      },
      {
        args: [{ leftX: 0, bottomY: 0, width: 1, height: 1 }, { leftX: 5, bottomY: 5, width: 1, height: 1 }],
        expected: { leftX: null, bottomY: null, width: null, height: null },
        sample: true,
      },
      {
        args: [{ leftX: 0, bottomY: 0, width: 2, height: 2 }, { leftX: 2, bottomY: 0, width: 2, height: 2 }],
        expected: { leftX: null, bottomY: null, width: null, height: null },
        sample: false,
      },
      {
        args: [{ leftX: 0, bottomY: 0, width: 10, height: 10 }, { leftX: 2, bottomY: 3, width: 4, height: 4 }],
        expected: { leftX: 2, bottomY: 3, width: 4, height: 4 },
        sample: false,
      },
    ],
  });

  /* ---------------- 7. Temperature Tracker ---------------- */
  P({
    slug: "temperature-tracker",
    name: "Temperature Tracker",
    sub: "Data Aggregation",
    difficulty: "Medium",
    fn: "tempStats",
    body: `
<p>Given an array of temperature readings, return <code>{ max, min, mean, mode }</code> in a <strong>single pass</strong>.</p>
<p><code>mode</code> is the most frequent reading; if several tie, return the smallest of them.</p>
<h3>Example</h3>
<pre>tempStats([1, 2, 2, 3])  ->  { max: 3, min: 1, mean: 2, mode: 2 }</pre>
<h3>Goal</h3>
<p>The real question is: <em>can you keep running aggregates instead of storing everything?</em> Track max, min, a running <code>totalNumbers</code>/<code>totalSum</code> for the mean, and a counts object for the mode. This is exactly the "summary row" task a data-viz panel asks for.</p>`,
    alts: [
      { q: "\"Add a summary row to this table: count, average, max.\"", a: "The React version of this problem. Same reduce, rendered in a footer row.", code: "const s=rows.reduce((a,r)=>({n:a.n+1,sum:a.sum+r.value,max:Math.max(a.max,r.value)}),{n:0,sum:0,max:-Infinity});\n// <td>{s.n}</td><td>{(s.sum/s.n).toFixed(2)}</td><td>{s.max}</td>" },
      { q: "\"Give me the median too.\"", a: "Be honest: median needs the data sorted (or two heaps), so it cannot be a pure O(1)-space single pass. Saying that is the right answer.", code: "function median(a){const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;}" },
      { q: "\"Temperatures are always 0–110 — can you do better?\"", a: "Bucket them into a fixed 111-slot array: O(1) space regardless of input size, and the mode falls out of a single scan.", code: "function modeBounded(t){const c=new Array(111).fill(0);for(const x of t)c[x]++;let best=0;for(let i=1;i<c.length;i++)if(c[i]>c[best])best=i;return best;}" },
      { q: "\"Now do it streaming — readings arrive one at a time.\"", a: "Turn it into a class with an insert() method. Same running fields; that is the point of the problem.", code: "class TempTracker{constructor(){this.n=0;this.sum=0;this.max=-Infinity;this.min=Infinity;}insert(t){this.n++;this.sum+=t;this.max=Math.max(this.max,t);this.min=Math.min(this.min,t);}get mean(){return this.sum/this.n;}}" },
    ],
    js: `function tempStats(temps) {
    let max = -Infinity, min = Infinity;
    let totalSum = 0, totalNumbers = 0;
    const counts = {};
    let mode = null, maxOccurrences = 0;

    for (const temp of temps) {
        if (temp > max) max = temp;
        if (temp < min) min = temp;
        totalSum += temp;
        totalNumbers += 1;

        counts[temp] = (counts[temp] || 0) + 1;   // safe: counts start at 1, never 0
        if (counts[temp] > maxOccurrences) {
            maxOccurrences = counts[temp];
            mode = temp;
        } else if (counts[temp] === maxOccurrences && temp < mode) {
            mode = temp;                          // tie -> smallest wins
        }
    }
    return { max: max, min: min, mean: totalSum / totalNumbers, mode: mode };
}`,
    py: `def temp_stats(temps):
    counts = {}
    mx, mn, total, mode, best = float('-inf'), float('inf'), 0, None, 0
    for t in temps:
        mx, mn, total = max(mx, t), min(mn, t), total + t
        counts[t] = counts.get(t, 0) + 1
        if counts[t] > best or (counts[t] == best and t < mode):
            best, mode = counts[t], t
    return {'max': mx, 'min': mn, 'mean': total / len(temps), 'mode': mode}`,
    starter: `function tempStats(temps) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 2, 2, 3]], expected: { max: 3, min: 1, mean: 2, mode: 2 }, sample: true },
      { args: [[5]], expected: { max: 5, min: 5, mean: 5, mode: 5 }, sample: true },
      { args: [[1, 1, 2, 2]], expected: { max: 2, min: 1, mean: 1.5, mode: 1 }, sample: false },
      { args: [[10, 20, 30, 40]], expected: { max: 40, min: 10, mean: 25, mode: 10 }, sample: false },
      { args: [[-4, -4, 0, 8]], expected: { max: 8, min: -4, mean: 0, mode: -4 }, sample: false },
    ],
  });

  /* ---------------- 8. Balanced Binary Tree ---------------- */
  P({
    slug: "balanced-binary-tree",
    name: "Balanced Binary Tree",
    sub: "Trees",
    difficulty: "Medium",
    fn: "isBalanced",
    body: `
<p>A tree is <strong>superbalanced</strong> when the depths of any two leaves differ by no more than 1.</p>
<p>Nodes look like <code>{ value, left, right }</code>; missing children are <code>null</code>. Return <code>true</code> or <code>false</code>.</p>
<h3>Example</h3>
<pre>{value:1, left:{value:2,left:null,right:null}, right:null}  ->  true</pre>
<h3>Goal</h3>
<p>Depth-first traversal with an explicit stack of <code>[node, depth]</code> pairs. Collect <strong>only leaf depths</strong>, and short-circuit as soon as you have more than 2 distinct depths, or 2 that differ by more than 1. O(n) time, O(n) space.</p>`,
    alts: [
      { q: "\"Balanced Binary Tree\" (LeetCode 110) — every node's subtree heights differ by ≤ 1.", a: "A different definition. Recursive height that returns -1 to signal 'already unbalanced'.", code: "function isBalancedLC(root){function h(n){if(!n)return 0;const l=h(n.left);if(l<0)return -1;const r=h(n.right);if(r<0)return -1;return Math.abs(l-r)>1?-1:Math.max(l,r)+1;}return h(root)>=0;}" },
      { q: "\"What's the maximum depth of this tree?\" (LeetCode 104)", a: "The warm-up they lead with. One line recursive.", code: "function maxDepth(n){return n?1+Math.max(maxDepth(n.left),maxDepth(n.right)):0;}" },
      { q: "\"Print the tree level by level.\" (Level-order / BFS)", a: "Queue instead of stack. Worth knowing because the follow-up to any tree question is 'now do it breadth-first'.", code: "function levels(root){if(!root)return[];const out=[];let q=[root];while(q.length){out.push(q.map(n=>n.value));q=q.flatMap(n=>[n.left,n.right].filter(Boolean));}return out;}" },
      { q: "\"Why an explicit stack instead of recursion?\"", a: "Say: recursion is cleaner, but a deep or degenerate tree blows the call stack. An explicit stack has the same complexity with no stack-overflow risk.", code: "// recursion depth == tree height; a 100k-node linked-list-shaped tree overflows" },
    ],
    js: `function isBalanced(treeRoot) {
    if (!treeRoot) return true;

    const depths = [];                     // at most 2 different leaf depths
    const nodes = [[treeRoot, 0]];

    while (nodes.length) {
        const [node, depth] = nodes.pop();

        if (!node.left && !node.right) {   // leaf
            if (depths.indexOf(depth) === -1) {
                depths.push(depth);
                if (depths.length > 2 || (depths.length === 2 && Math.abs(depths[0] - depths[1]) > 1)) {
                    return false;
                }
            }
        } else {
            if (node.left) nodes.push([node.left, depth + 1]);
            if (node.right) nodes.push([node.right, depth + 1]);
        }
    }
    return true;
}`,
    py: `def is_balanced(root):
    if not root:
        return True
    depths, nodes = [], [(root, 0)]
    while nodes:
        node, depth = nodes.pop()
        if not node['left'] and not node['right']:
            if depth not in depths:
                depths.append(depth)
                if len(depths) > 2 or (len(depths) == 2 and abs(depths[0] - depths[1]) > 1):
                    return False
        else:
            if node['left']:
                nodes.append((node['left'], depth + 1))
            if node['right']:
                nodes.append((node['right'], depth + 1))
    return True`,
    starter: `function isBalanced(treeRoot) {
    // Write your code here

}`,
    cases: [
      { args: [null], expected: true, sample: true },
      { args: [{ value: 1, left: { value: 2, left: null, right: null }, right: { value: 3, left: null, right: null } }], expected: true, sample: true },
      {
        args: [{ value: 1, left: { value: 2, left: { value: 4, left: { value: 8, left: null, right: null }, right: null }, right: null }, right: { value: 3, left: null, right: null } }],
        expected: false,
        sample: false,
      },
      { args: [{ value: 1, left: null, right: null }], expected: true, sample: false },
      {
        args: [{ value: 1, left: { value: 2, left: { value: 4, left: null, right: null }, right: null }, right: { value: 3, left: null, right: null } }],
        expected: true,
        sample: false,
      },
    ],
  });

  /* ---------------- 9. BST Checker ---------------- */
  P({
    slug: "bst-checker",
    name: "Binary Search Tree Checker",
    sub: "Trees",
    difficulty: "Medium",
    fn: "isBinarySearchTree",
    body: `
<p>Return <code>true</code> if a tree is a valid binary search tree: every node in the left subtree is <strong>less than</strong> the node, every node in the right subtree is <strong>greater than</strong> it — all the way down, not just for direct children.</p>
<h3>The trap</h3>
<pre>      50
     /  \\
   30    80
        /  \\
      40    90     &lt;- 40 &lt; 50, so this is NOT a BST</pre>
<p>Checking only <code>node.left.value &lt; node.value</code> passes this broken tree. You must carry an allowed <code>(lowerBound, upperBound)</code> range down the traversal and tighten it at each step.</p>`,
    alts: [
      { q: "\"Validate Binary Search Tree\" (LeetCode 98)", a: "Same problem, recursive bounds version.", code: "function isBST(n,lo=-Infinity,hi=Infinity){if(!n)return true;if(n.value<=lo||n.value>=hi)return false;return isBST(n.left,lo,n.value)&&isBST(n.right,n.value,hi);}" },
      { q: "\"Do it with an in-order traversal instead.\"", a: "In-order of a BST is strictly increasing. Elegant alternative — mention it even if you code the bounds version.", code: "function isBSTInorder(root){let prev=-Infinity,ok=true;(function go(n){if(!n||!ok)return;go(n.left);if(n.value<=prev)ok=false;prev=n.value;go(n.right);})(root);return ok;}" },
      { q: "\"Find the kth smallest value in a BST.\" (LeetCode 230)", a: "In-order traversal, stop at k. Same insight: in-order == sorted.", code: "function kthSmallest(root,k){const st=[];let n=root;while(n||st.length){while(n){st.push(n);n=n.left;}n=st.pop();if(--k===0)return n.value;n=n.right;}}" },
    ],
    js: `function isBinarySearchTree(treeRoot) {
    const stack = [{ node: treeRoot, lowerBound: -Infinity, upperBound: Infinity }];

    while (stack.length) {
        const { node, lowerBound, upperBound } = stack.pop();
        if (!node) continue;

        if (node.value <= lowerBound || node.value >= upperBound) return false;

        stack.push({ node: node.left,  lowerBound: lowerBound, upperBound: node.value });
        stack.push({ node: node.right, lowerBound: node.value, upperBound: upperBound });
    }
    return true;
}`,
    py: `def is_binary_search_tree(root):
    stack = [(root, float('-inf'), float('inf'))]
    while stack:
        node, lo, hi = stack.pop()
        if not node:
            continue
        if node['value'] <= lo or node['value'] >= hi:
            return False
        stack.append((node['left'], lo, node['value']))
        stack.append((node['right'], node['value'], hi))
    return True`,
    starter: `function isBinarySearchTree(treeRoot) {
    // Write your code here

}`,
    cases: [
      { args: [{ value: 50, left: { value: 30, left: null, right: null }, right: { value: 80, left: null, right: null } }], expected: true, sample: true },
      {
        args: [{ value: 50, left: { value: 30, left: null, right: null }, right: { value: 80, left: { value: 40, left: null, right: null }, right: { value: 90, left: null, right: null } } }],
        expected: false,
        sample: true,
      },
      { args: [null], expected: true, sample: false },
      { args: [{ value: 10, left: null, right: null }], expected: true, sample: false },
      { args: [{ value: 10, left: { value: 10, left: null, right: null }, right: null }], expected: false, sample: false },
    ],
  });

  /* ---------------- 10. 2nd Largest in BST ---------------- */
  P({
    slug: "second-largest-bst",
    name: "2nd Largest Item in a BST",
    sub: "Trees",
    difficulty: "Medium",
    fn: "findSecondLargest",
    body: `
<p>Find the second-largest value in a binary search tree.</p>
<h3>Goal</h3>
<p>O(h) time (height of the tree), O(1) space — <strong>no</strong> full traversal, no array of all values. Two cases:</p>
<ul>
<li>The largest node has a left subtree → the answer is the largest node <em>in that left subtree</em>.</li>
<li>The largest node has no left child → the answer is its parent.</li>
</ul>
<p>So: walk right until the node whose right child is the largest, then decide. Throw if the tree has fewer than 2 nodes.</p>`,
    alts: [
      { q: "\"Find the kth largest.\"", a: "Reverse in-order (right, node, left), stop at k. O(h + k).", code: "function kthLargest(root,k){const st=[];let n=root;while(n||st.length){while(n){st.push(n);n=n.right;}n=st.pop();if(--k===0)return n.value;n=n.left;}}" },
      { q: "\"Find the largest.\"", a: "The warm-up. Walk right until you cannot.", code: "function largest(n){while(n.right)n=n.right;return n.value;}" },
      { q: "\"Second largest in an unsorted ARRAY.\"", a: "Totally different — one pass tracking two values. They sometimes swap this in to see if you notice.", code: "function second(a){let h=-Infinity,s=-Infinity;for(const x of a){if(x>h){s=h;h=x;}else if(x>s&&x<h)s=x;}return s;}" },
    ],
    js: `function findLargest(rootNode) {
    let current = rootNode;
    while (current.right) current = current.right;
    return current.value;
}

function findSecondLargest(rootNode) {
    if (!rootNode || (!rootNode.left && !rootNode.right)) {
        throw new Error('Tree must have at least 2 nodes');
    }
    let current = rootNode;
    while (current) {
        // current is the parent of the largest, and the largest has no left child
        if (current.left && !current.right) return findLargest(current.left);
        if (current.right && !current.right.left && !current.right.right) return current.value;
        current = current.right;
    }
}`,
    py: `def find_largest(node):
    while node['right']:
        node = node['right']
    return node['value']

def find_second_largest(root):
    current = root
    while current:
        if current['left'] and not current['right']:
            return find_largest(current['left'])
        r = current['right']
        if r and not r['left'] and not r['right']:
            return current['value']
        current = current['right']`,
    starter: `function findSecondLargest(rootNode) {
    // Write your code here

}`,
    cases: [
      { args: [{ value: 50, left: { value: 30, left: null, right: null }, right: { value: 80, left: null, right: null } }], expected: 50, sample: true },
      {
        args: [{ value: 50, left: { value: 30, left: null, right: null }, right: { value: 80, left: { value: 70, left: null, right: null }, right: null } }],
        expected: 70,
        sample: true,
      },
      { args: [{ value: 10, left: { value: 5, left: null, right: null }, right: null }], expected: 5, sample: false },
      {
        args: [{ value: 1, left: null, right: { value: 2, left: null, right: { value: 3, left: null, right: { value: 4, left: null, right: null } } } }],
        expected: 3,
        sample: false,
      },
    ],
  });

  /* ---------------- 11. MillionGazillion (trie) ---------------- */
  P({
    slug: "million-gazillion",
    name: "MillionGazillion",
    sub: "Hashing & Tries",
    difficulty: "Hard",
    fn: "buildTrie",
    body: `
<p>You are storing a billion URLs and a hash table of full strings will not fit in memory. Build a <strong>trie</strong> (prefix tree) instead — shared prefixes are stored once.</p>
<p>Implement <code>buildTrie(words)</code> which returns a nested object. Each character is a key; a word ending is marked with the key <code>"*"</code> set to <code>true</code>.</p>
<h3>Example</h3>
<pre>buildTrie(["ab", "a"])
  ->  { a: { "*": true, b: { "*": true } } }</pre>
<h3>Goal</h3>
<p>Insertion is O(length of word) and independent of how many words are already stored. Say that out loud — it is the whole point of the data structure.</p>`,
    alts: [
      { q: "\"Implement Trie (Prefix Tree)\" (LeetCode 208) — insert / search / startsWith.", a: "Class version. Same nested-object storage.", code: "class Trie{constructor(){this.root={};}insert(w){let n=this.root;for(const c of w)n=n[c]||(n[c]={});n['*']=true;}_find(w){let n=this.root;for(const c of w){if(!n[c])return null;n=n[c];}return n;}search(w){const n=this._find(w);return !!(n&&n['*']);}startsWith(p){return !!this._find(p);}}" },
      { q: "\"Autocomplete: given a prefix, return every word under it.\"", a: "Walk to the prefix node, then DFS collecting. This is the practical use of a trie.", code: "function complete(trie,pre){let n=trie;for(const c of pre){if(!n[c])return[];n=n[c];}const out=[];(function go(node,s){for(const k in node){if(k==='*')out.push(pre+s);else go(node[k],s+k);}})(n,'');return out;}" },
      { q: "\"Why not just a Set of strings?\"", a: "Honest answer: for a few million a Set is simpler and faster. A trie wins when prefixes repeat heavily and memory is the binding constraint. Name the tradeoff instead of reciting the trie.", code: "// Set: O(1) lookup, stores every full string\n// Trie: shares prefixes, supports prefix queries a Set cannot" },
    ],
    js: `function buildTrie(words) {
    const rootNode = {};
    for (const word of words) {
        let currentNode = rootNode;
        for (const char of word) {
            if (!(char in currentNode)) currentNode[char] = {};   // 'in', not truthiness
            currentNode = currentNode[char];
        }
        currentNode['*'] = true;      // marks the end of a complete word
    }
    return rootNode;
}`,
    py: `def build_trie(words):
    root = {}
    for word in words:
        node = root
        for char in word:
            node = node.setdefault(char, {})
        node['*'] = True
    return root`,
    starter: `function buildTrie(words) {
    // Write your code here

}`,
    cases: [
      { args: [["ab", "a"]], expected: { a: { "*": true, b: { "*": true } } }, sample: true },
      { args: [[]], expected: {}, sample: true },
      { args: [["cat"]], expected: { c: { a: { t: { "*": true } } } }, sample: false },
      { args: [["do", "dog"]], expected: { d: { o: { "*": true, g: { "*": true } } } }, sample: false },
      { args: [["a", "b"]], expected: { a: { "*": true }, b: { "*": true } }, sample: false },
    ],
  });

  /* ---------------- 12. Find in Ordered Set ---------------- */
  P({
    slug: "find-in-ordered-set",
    name: "Find in Ordered Set",
    sub: "Searching",
    difficulty: "Easy",
    fn: "binarySearch",
    body: `
<p>Given a <strong>sorted</strong> array of integers, return <code>true</code> if <code>target</code> is in it.</p>
<h3>Goal</h3>
<p>O(log n) binary search. Write it from memory without off-by-one bugs — this is the building block for half the other problems in this tier.</p>
<pre>while (floorIndex + 1 &lt; ceilingIndex) { ... }</pre>
<p>Using exclusive floor/ceiling bounds (instead of inclusive lo/hi) makes the loop condition hard to get wrong.</p>`,
    alts: [
      { q: "\"Binary Search\" (LeetCode 704) — return the index, or -1.", a: "Classic inclusive-bounds version. Know both shapes.", code: "function search(nums,t){let lo=0,hi=nums.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(nums[m]===t)return m;if(nums[m]<t)lo=m+1;else hi=m-1;}return -1;}" },
      { q: "\"Where should this value be INSERTED to keep the array sorted?\" (LeetCode 35)", a: "Lower-bound variant — return lo when the loop ends instead of -1.", code: "function insertPos(nums,t){let lo=0,hi=nums.length;while(lo<hi){const m=(lo+hi)>>1;if(nums[m]<t)lo=m+1;else hi=m;}return lo;}" },
      { q: "\"Find the first reading above a threshold in a sorted time series.\"", a: "Same lower-bound search. This is how you jump into a huge measurement array without scanning it.", code: "function firstAbove(vals,th){let lo=0,hi=vals.length;while(lo<hi){const m=(lo+hi)>>1;if(vals[m]<=th)lo=m+1;else hi=m;}return lo<vals.length?lo:-1;}" },
    ],
    js: `function binarySearch(target, nums) {
    let floorIndex = -1;
    let ceilingIndex = nums.length;

    while (floorIndex + 1 < ceilingIndex) {
        const distance = ceilingIndex - floorIndex;
        const guessIndex = floorIndex + Math.floor(distance / 2);
        const guessValue = nums[guessIndex];

        if (guessValue === target) return true;
        if (guessValue > target) ceilingIndex = guessIndex;
        else floorIndex = guessIndex;
    }
    return false;
}`,
    py: `def binary_search(target, nums):
    floor_i, ceil_i = -1, len(nums)
    while floor_i + 1 < ceil_i:
        guess_i = floor_i + (ceil_i - floor_i) // 2
        guess = nums[guess_i]
        if guess == target:
            return True
        if guess > target:
            ceil_i = guess_i
        else:
            floor_i = guess_i
    return False`,
    starter: `function binarySearch(target, nums) {
    // Write your code here

}`,
    cases: [
      { args: [3, [1, 2, 3, 4, 5]], expected: true, sample: true },
      { args: [6, [1, 2, 3, 4, 5]], expected: false, sample: true },
      { args: [1, []], expected: false, sample: false },
      { args: [1, [1]], expected: true, sample: false },
      { args: [5, [1, 5]], expected: true, sample: false },
      { args: [0, [1, 2, 3]], expected: false, sample: false },
    ],
  });

  /* ---------------- 13. Find Rotation Point ---------------- */
  P({
    slug: "find-rotation-point",
    name: "Find Rotation Point",
    sub: "Searching",
    difficulty: "Medium",
    fn: "findRotationPoint",
    body: `
<p>An alphabetically ordered array of words has been rotated: it "wraps around" at some index. Find the index of the first word of the second half — the rotation point.</p>
<h3>Example</h3>
<pre>["ptolemaic","retrograde","supplant","undulate","xenoepist",
 "asymptote","babka","banoffee","engender","karpatka","othellolagkage"]
  ->  5</pre>
<h3>Goal</h3>
<p>Binary search again. Compare the guess against the <strong>first</strong> word: if the guess is still <code>&gt;=</code> the first word you are in the left (larger) half, so move the floor up; otherwise move the ceiling down. O(log n).</p>`,
    alts: [
      { q: "\"Find Minimum in Rotated Sorted Array\" (LeetCode 153)", a: "Identical — the rotation point IS the minimum.", code: "function findMin(a){let lo=0,hi=a.length-1;while(lo<hi){const m=(lo+hi)>>1;if(a[m]>a[hi])lo=m+1;else hi=m;}return a[lo];}" },
      { q: "\"Search for a target in a rotated sorted array.\" (LeetCode 33)", a: "Find the rotation point, then binary search the correct half.", code: "function searchRotated(a,t){const p=findRotationPoint(a);const inLeft=t>=a[0];let lo=inLeft?0:p,hi=inLeft?p-1:a.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(a[m]===t)return m;a[m]<t?lo=m+1:hi=m-1;}return -1;}" },
      { q: "\"The array has duplicates now.\"", a: "Worst case degrades to O(n) — with [2,2,2,1,2] you cannot tell which half to discard. Saying that is the answer.", code: "// when a[m] === a[hi], you can only do hi-- and lose the log(n) guarantee" },
    ],
    js: `function findRotationPoint(words) {
    const firstWord = words[0];
    let floorIndex = 0;
    let ceilingIndex = words.length - 1;

    while (floorIndex < ceilingIndex) {
        const guessIndex = floorIndex + Math.floor((ceilingIndex - floorIndex) / 2);
        if (words[guessIndex] >= firstWord) floorIndex = guessIndex;   // still first half
        else ceilingIndex = guessIndex;

        if (floorIndex + 1 === ceilingIndex) break;
    }
    return ceilingIndex;
}`,
    py: `def find_rotation_point(words):
    first = words[0]
    lo, hi = 0, len(words) - 1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if words[mid] >= first:
            lo = mid
        else:
            hi = mid
        if lo + 1 == hi:
            break
    return hi`,
    starter: `function findRotationPoint(words) {
    // Write your code here

}`,
    cases: [
      {
        args: [["ptolemaic", "retrograde", "supplant", "undulate", "xenoepist", "asymptote", "babka", "banoffee", "engender", "karpatka", "othellolagkage"]],
        expected: 5,
        sample: true,
      },
      { args: [["c", "d", "a", "b"]], expected: 2, sample: true },
      { args: [["b", "a"]], expected: 1, sample: false },
      { args: [["k", "v", "a", "b", "c", "d", "e", "g", "i"]], expected: 2, sample: false },
    ],
  });

  /* ---------------- 14. Inflight Entertainment ---------------- */
  P({
    slug: "inflight-entertainment",
    name: "Inflight Entertainment",
    sub: "Hashing",
    difficulty: "Easy",
    fn: "canTwoMoviesFillFlight",
    body: `
<p>Given <code>flightLength</code> and an array of <code>movieLengths</code>, return <code>true</code> if two <strong>different</strong> movies add up to exactly the flight length.</p>
<h3>Example</h3>
<pre>canTwoMoviesFillFlight(180, [90, 60, 120, 90])  ->  true  // 90 + 90</pre>
<h3>Goal</h3>
<p>One pass, O(n) time, O(n) space. For each movie, check whether its <em>complement</em> (<code>flightLength - movie</code>) was already seen, <strong>then</strong> record the current movie. Checking before recording is what stops a single 90-minute movie from matching itself.</p>`,
    alts: [
      { q: "\"Two Sum\" (LeetCode 1) — return the two indices.", a: "The same problem with a Map from value to index instead of a Set.", code: "function twoSum(nums,t){const seen=new Map();for(let i=0;i<nums.length;i++){const need=t-nums[i];if(seen.has(need))return[seen.get(need),i];seen.set(nums[i],i);}return[];}" },
      { q: "\"Now THREE movies have to fill the flight.\"", a: "Sort, then fix one element and two-pointer the rest. O(n²).", code: "function three(t,a){a=[...a].sort((x,y)=>x-y);for(let i=0;i<a.length-2;i++){let l=i+1,r=a.length-1;while(l<r){const s=a[i]+a[l]+a[r];if(s===t)return true;s<t?l++:r--;}}return false;}" },
      { q: "\"The array is already sorted — can you use O(1) space?\"", a: "Yes: two pointers from both ends. Great follow-up answer.", code: "function twoSorted(t,a){let l=0,r=a.length-1;while(l<r){const s=a[l]+a[r];if(s===t)return true;s<t?l++:r--;}return false;}" },
      { q: "\"Do any two readings differ by exactly K?\"", a: "Same Set trick, subtraction instead of addition — check both x-k and x+k.", code: "function diffK(a,k){const s=new Set();for(const x of a){if(s.has(x-k)||s.has(x+k))return true;s.add(x);}return false;}" },
    ],
    js: `function canTwoMoviesFillFlight(flightLength, movieLengths) {
    const movieLengthsSeen = new Set();

    for (const firstMovieLength of movieLengths) {
        const matchingSecondMovieLength = flightLength - firstMovieLength;
        if (movieLengthsSeen.has(matchingSecondMovieLength)) return true;   // check first
        movieLengthsSeen.add(firstMovieLength);                             // then record
    }
    return false;
}`,
    py: `def can_two_movies_fill_flight(flight_length, movie_lengths):
    seen = set()
    for length in movie_lengths:
        if flight_length - length in seen:
            return True
        seen.add(length)
    return False`,
    starter: `function canTwoMoviesFillFlight(flightLength, movieLengths) {
    // Write your code here

}`,
    cases: [
      { args: [180, [90, 60, 120, 90]], expected: true, sample: true },
      { args: [180, [90]], expected: false, sample: true },
      { args: [120, [60, 60]], expected: true, sample: false },
      { args: [120, [60]], expected: false, sample: false },
      { args: [100, [10, 20, 30, 40, 60]], expected: true, sample: false },
      { args: [5, []], expected: false, sample: false },
    ],
  });

  /* ---------------- 15. nth Fibonacci ---------------- */
  P({
    slug: "nth-fibonacci",
    name: "Compute the nth Fibonacci Number",
    sub: "Dynamic Programming",
    difficulty: "Easy",
    fn: "fib",
    body: `
<p>Return the nth Fibonacci number. <code>fib(0) = 0</code>, <code>fib(1) = 1</code>.</p>
<h3>Goal</h3>
<p>O(n) time, <strong>O(1) space</strong> — iterative, two variables. The naive recursive version is O(2ⁿ) and will time out here; say why before you write anything.</p>
<p>Throw on negative input.</p>`,
    alts: [
      { q: "\"Climbing Stairs\" (LeetCode 70) — how many ways to climb n stairs taking 1 or 2 at a time?", a: "It IS Fibonacci, shifted by one. Recognizing that is the whole interview.", code: "function climbStairs(n){let a=1,b=1;for(let i=2;i<=n;i++){[a,b]=[b,a+b];}return b;}" },
      { q: "\"Do it recursively with memoization.\"", a: "Show you know the tradeoff: O(n) time but O(n) call-stack space.", code: "function fibMemo(n,memo={}){if(n<2)return n;if(n in memo)return memo[n];return memo[n]=fibMemo(n-1,memo)+fibMemo(n-2,memo);}" },
      { q: "\"What's wrong with the naive recursion?\"", a: "It recomputes the same subtrees — fib(50) is billions of calls. Draw the tree, name it O(2ⁿ). Interviewers ask this to hear the phrase 'overlapping subproblems'.", code: "// fib(5) computes fib(3) twice, fib(2) three times, ..." },
      { q: "\"Now generate the first n Fibonacci numbers as an array.\"", a: "Same loop, push as you go — often the setup for a charting task.", code: "function fibSeries(n){const out=[];let a=0,b=1;for(let i=0;i<n;i++){out.push(a);[a,b]=[b,a+b];}return out;}" },
    ],
    js: `function fib(n) {
    if (n < 0) throw new Error('Index cannot be negative');
    if (n === 0 || n === 1) return n;

    let prevPrev = 0;   // fib(0)
    let prev = 1;       // fib(1)
    let current = 0;

    for (let i = 2; i <= n; i++) {
        current = prev + prevPrev;
        prevPrev = prev;
        prev = current;
    }
    return current;
}`,
    py: `def fib(n):
    if n < 0:
        raise ValueError('Index cannot be negative')
    if n in (0, 1):
        return n
    prev_prev, prev = 0, 1
    for _ in range(2, n + 1):
        prev_prev, prev = prev, prev + prev_prev
    return prev`,
    starter: `function fib(n) {
    // Write your code here

}`,
    cases: [
      { args: [0], expected: 0, sample: true },
      { args: [1], expected: 1, sample: true },
      { args: [10], expected: 55, sample: false },
      { args: [2], expected: 1, sample: false },
      { args: [30], expected: 832040, sample: false },
      { args: [50], expected: 12586269025, sample: false },
    ],
  });

  /* ---------------- 16. The Cake Thief ---------------- */
  P({
    slug: "cake-thief",
    name: "The Cake Thief",
    sub: "Dynamic Programming",
    difficulty: "Hard",
    fn: "maxDuffelBagValue",
    body: `
<p>Each cake type is <code>{ weight, value }</code> and there are <strong>unlimited</strong> cakes of each type. Given a bag <code>capacity</code>, return the maximum total value you can carry.</p>
<h3>Example</h3>
<pre>maxDuffelBagValue([{weight:7,value:160},{weight:3,value:90},{weight:2,value:15}], 20)
  ->  555</pre>
<h3>Goal</h3>
<p>Unbounded knapsack. Build <code>maxValuesAtCapacities[0..capacity]</code> bottom-up: for every capacity, try every cake that fits and keep the best. O(capacity × cakes).</p>
<p>Edge cases to mention aloud: weight 0 with positive value is infinite value; weight 0 and value 0 should be skipped.</p>`,
    alts: [
      { q: "\"Coin Change\" (LeetCode 322) — fewest coins for an amount.", a: "The same DP skeleton with min-plus-one instead of max-plus-value.", code: "function coinChange(coins,amount){const d=new Array(amount+1).fill(Infinity);d[0]=0;for(let a=1;a<=amount;a++)for(const c of coins)if(c<=a)d[a]=Math.min(d[a],d[a-c]+1);return d[amount]===Infinity?-1:d[amount];}" },
      { q: "\"What if you can only take ONE of each cake?\" (0/1 knapsack)", a: "Iterate capacity DOWNWARD so each item is used at most once. That single reversed loop is the whole difference — worth stating.", code: "function knap01(items,cap){const d=new Array(cap+1).fill(0);for(const it of items)for(let c=cap;c>=it.weight;c--)d[c]=Math.max(d[c],d[c-it.weight]+it.value);return d[cap];}" },
      { q: "\"Which cakes did you take?\"", a: "Store a back-pointer per capacity and walk it backwards. Interviewers love this follow-up.", code: "// keep choice[c] = the cake index used at capacity c, then: while(c>0){out.push(choice[c]); c-=cakes[choice[c]].weight;}" },
    ],
    js: `function maxDuffelBagValue(cakeTypes, weightCapacity) {
    const maxValuesAtCapacities = new Array(weightCapacity + 1).fill(0);

    for (let currentCapacity = 0; currentCapacity <= weightCapacity; currentCapacity++) {
        let currentMaxValue = 0;
        for (const cake of cakeTypes) {
            if (cake.weight === 0 && cake.value !== 0) return Infinity;
            if (cake.weight > 0 && cake.weight <= currentCapacity) {
                const maxValueUsingCake = cake.value + maxValuesAtCapacities[currentCapacity - cake.weight];
                currentMaxValue = Math.max(maxValueUsingCake, currentMaxValue);
            }
        }
        maxValuesAtCapacities[currentCapacity] = currentMaxValue;
    }
    return maxValuesAtCapacities[weightCapacity];
}`,
    py: `def max_duffel_bag_value(cake_types, capacity):
    best = [0] * (capacity + 1)
    for cap in range(capacity + 1):
        current = 0
        for cake in cake_types:
            w, v = cake['weight'], cake['value']
            if w == 0 and v != 0:
                return float('inf')
            if 0 < w <= cap:
                current = max(current, v + best[cap - w])
        best[cap] = current
    return best[capacity]`,
    starter: `function maxDuffelBagValue(cakeTypes, weightCapacity) {
    // Write your code here

}`,
    cases: [
      { args: [[{ weight: 7, value: 160 }, { weight: 3, value: 90 }, { weight: 2, value: 15 }], 20], expected: 555, sample: true },
      { args: [[{ weight: 2, value: 20 }], 10], expected: 100, sample: true },
      { args: [[], 5], expected: 0, sample: false },
      { args: [[{ weight: 6, value: 10 }], 5], expected: 0, sample: false },
      { args: [[{ weight: 1, value: 1 }, { weight: 4, value: 10 }], 8], expected: 20, sample: false },
    ],
  });
})();
