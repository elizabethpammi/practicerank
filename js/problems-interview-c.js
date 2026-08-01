// Special Interview Questions — part C (32–46): sorting, hashing, randomness, graphs.
(function () {
  "use strict";
  var P = window.__IPUSH;

  /* ---------------- 32. Top Scores ---------------- */
  P({
    slug: "top-scores",
    name: "Top Scores",
    sub: "Sorting",
    difficulty: "Medium",
    fn: "sortScores",
    body: `
<p>Sort game scores <strong>descending</strong> in O(n) time. Scores are integers from 0 to <code>highestPossibleScore</code>.</p>
<pre>sortScores([37, 89, 41, 65, 91, 53], 100)  ->  [91, 89, 65, 53, 41, 37]</pre>
<h3>Goal</h3>
<p>Comparison sorts cannot beat O(n log n). But when values live in a small known range, use <strong>counting sort</strong>: one bucket per possible score, count, then walk the buckets high to low. O(n + k) time, O(k) space.</p>`,
    alts: [
      { q: "\"Sort an array of 0s, 1s and 2s.\" (Dutch National Flag, LeetCode 75)", a: "Same counting idea with k=3, or a slicker three-pointer single pass.", code: "function sortColors(a){let l=0,i=0,r=a.length-1;while(i<=r){if(a[i]===0)[a[l++],a[i++]]=[a[i],a[l]];else if(a[i]===2)[a[r--],a[i]]=[a[i],a[r]];else i++;}return a;}" },
      { q: "\"Top K frequent elements.\" (LeetCode 347)", a: "Bucket sort by frequency — frequency is bounded by n, so the same trick applies.", code: "function topK(nums,k){const m={};for(const n of nums)m[n]=(m[n]||0)+1;const b=[];for(const n in m)(b[m[n]]=b[m[n]]||[]).push(+n);return b.flat().reverse().slice(0,k);}" },
      { q: "\"Why can't a comparison sort be faster than n log n?\"", a: "There are n! orderings and each comparison gives one bit, so you need log2(n!) = O(n log n) comparisons. Counting sort escapes it by not comparing at all.", code: "// counting sort reads values as INDICES, never compares two elements" },
      { q: "\"What if scores can be huge, like up to 1e9?\"", a: "Counting sort dies on space. Fall back to a comparison sort, or radix sort if they are fixed-width integers.", code: "scores.sort((a,b)=>b-a);   // O(n log n), O(1)-ish space" },
    ],
    js: `function sortScores(unorderedScores, highestPossibleScore) {
    const scoreCounts = new Array(highestPossibleScore + 1).fill(0);

    for (const score of unorderedScores) scoreCounts[score]++;      // 1. count

    const sortedScores = [];
    for (let score = highestPossibleScore; score >= 0; score--) {   // 2. walk high -> low
        const count = scoreCounts[score];
        for (let i = 0; i < count; i++) sortedScores.push(score);
    }
    return sortedScores;
}`,
    py: `def sort_scores(unordered_scores, highest_possible_score):
    counts = [0] * (highest_possible_score + 1)
    for s in unordered_scores:
        counts[s] += 1
    out = []
    for score in range(highest_possible_score, -1, -1):
        out.extend([score] * counts[score])
    return out`,
    starter: `function sortScores(unorderedScores, highestPossibleScore) {
    // Write your code here

}`,
    cases: [
      { args: [[37, 89, 41, 65, 91, 53], 100], expected: [91, 89, 65, 53, 41, 37], sample: true },
      { args: [[1, 1, 2], 5], expected: [2, 1, 1], sample: true },
      { args: [[], 10], expected: [], sample: false },
      { args: [[0, 0, 0], 3], expected: [0, 0, 0], sample: false },
      { args: [[5], 5], expected: [5], sample: false },
    ],
  });

  /* ---------------- 33. Which Appears Twice ---------------- */
  P({
    slug: "which-appears-twice",
    name: "Which Appears Twice",
    sub: "Math",
    difficulty: "Medium",
    fn: "findRepeat",
    body: `
<p>An array holds the numbers <code>1..n</code>, each once, plus one number that appears twice — so the array has length <code>n + 1</code>.</p>
<pre>findRepeat([1, 2, 3, 4, 4])  ->  4</pre>
<h3>Goal</h3>
<p>O(n) time, O(1) space, without a hash set. Use the sum formula: the numbers 1..n sum to <code>n(n+1)/2</code>. Whatever the actual sum exceeds that by <strong>is</strong> the duplicate.</p>
<p>Note <code>n = array.length - 1</code> — off-by-one here is the whole failure mode.</p>`,
    alts: [
      { q: "\"Find the missing number instead.\" (LeetCode 268)", a: "Same formula, subtract the other way.", code: "const missing = a => a.length*(a.length+1)/2 - a.reduce((x,y)=>x+y,0);" },
      { q: "\"Do it with XOR instead of arithmetic.\"", a: "Avoids any integer-overflow concern in fixed-width languages. XOR the array against 1..n.", code: "function repeatXor(a){let r=0;for(const v of a)r^=v;for(let i=1;i<a.length;i++)r^=i;return r;}" },
      { q: "\"What if it appears more than twice, or the array is read-only?\"", a: "The sum trick breaks. Use cycle detection (next problem) — O(n) time, O(1) space, no mutation.", code: "// see find-repeat-space-edition: treat values as next-node pointers, run Floyd" },
      { q: "\"Contains Duplicate.\" (LeetCode 217) — just true/false, any values.", a: "No structure to exploit, so a Set is the right answer. Say why the clever trick does not apply.", code: "const hasDup = a => new Set(a).size !== a.length;" },
    ],
    js: `function findRepeat(numbers) {
    const n = numbers.length - 1;                    // values run 1..n
    const expectedSum = (n * (n + 1)) / 2;

    let actualSum = 0;
    for (const number of numbers) actualSum += number;

    return actualSum - expectedSum;
}`,
    py: `def find_repeat(numbers):
    n = len(numbers) - 1
    return sum(numbers) - n * (n + 1) // 2`,
    starter: `function findRepeat(numbers) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 2, 3, 4, 4]], expected: 4, sample: true },
      { args: [[1, 1]], expected: 1, sample: true },
      { args: [[3, 1, 2, 2]], expected: 2, sample: false },
      { args: [[1, 2, 3, 4, 5, 1]], expected: 1, sample: false },
    ],
  });

  /* ---------------- 34. Word Cloud Data ---------------- */
  P({
    slug: "word-cloud-data",
    name: "Word Cloud Data",
    sub: "Hashing",
    difficulty: "Hard",
    fn: "wordCloud",
    body: `
<p>Count the words in a block of text for a word cloud. Return a plain object mapping word to count.</p>
<pre>wordCloud("After beating the eggs, Dana read the next step:")
  ->  { after:1, beating:1, the:2, eggs:1, dana:1, read:1, next:1, step:1 }</pre>
<h3>Rules for this version</h3>
<ul>
<li>Lowercase everything (so "The" and "the" are one word).</li>
<li>Strip punctuation, but <strong>keep</strong> apostrophes inside words ("don't") and hyphens inside words ("full-stack").</li>
</ul>
<h3>Goal</h3>
<p>The real point of the question is the <strong>ambiguity</strong>: ask about casing, hyphens, apostrophes and en-dashes before you write anything. Interviewers score that conversation.</p>`,
    alts: [
      { q: "\"Most common word.\" (LeetCode 819) — with a banned list.", a: "Same tokenise-and-count, then one max pass.", code: "function mostCommon(p,banned){const b=new Set(banned),m={};for(const w of p.toLowerCase().match(/[a-z']+/g)||[])if(!b.has(w))m[w]=(m[w]||0)+1;return Object.keys(m).sort((x,y)=>m[y]-m[x])[0];}" },
      { q: "\"Top K most frequent words.\" (LeetCode 692) — ties broken alphabetically.", a: "Count, then sort by count desc with a lexicographic tiebreak. The tiebreak is the trap.", code: "const topWords=(m,k)=>Object.keys(m).sort((a,b)=>m[b]-m[a]||a.localeCompare(b)).slice(0,k);" },
      { q: "\"Handle capitalised proper nouns properly — keep 'Dana' but fold 'The'.\"", a: "The full Interview Cake version: store the original casing and only downcase a word if you have already seen a lowercase form. Worth describing even if you code the simple version.", code: "// if map has lowercase(w) -> use it; else if map has w capitalised and w is lowercase -> re-key it down" },
    ],
    js: `function wordCloud(text) {
    const wordsToCounts = {};

    // Letters, digits, apostrophes and inner hyphens count as word characters.
    const words = text.toLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || [];

    for (const word of words) {
        // 'in', not truthiness — a count of 0 would be falsy.
        if (word in wordsToCounts) wordsToCounts[word]++;
        else wordsToCounts[word] = 1;
    }
    return wordsToCounts;
}`,
    py: `import re

def word_cloud(text):
    counts = {}
    for word in re.findall(r"[a-z0-9]+(?:['-][a-z0-9]+)*", text.lower()):
        counts[word] = counts.get(word, 0) + 1
    return counts`,
    starter: `function wordCloud(text) {
    // Return { word: count } — lowercase, punctuation stripped,
    // apostrophes and inner hyphens kept.

}`,
    cases: [
      {
        args: ["After beating the eggs, Dana read the next step:"],
        expected: { after: 1, beating: 1, the: 2, eggs: 1, dana: 1, read: 1, next: 1, step: 1 },
        sample: true,
      },
      { args: ["Don't don't DON'T"], expected: { "don't": 3 }, sample: true },
      { args: [""], expected: {}, sample: false },
      { args: ["full-stack full-stack stack"], expected: { "full-stack": 2, stack: 1 }, sample: false },
    ],
  });

  /* ---------------- 35. In-Place Shuffle ---------------- */
  P({
    slug: "in-place-shuffle",
    name: "In-Place Shuffle",
    sub: "Randomness",
    difficulty: "Medium",
    fn: "shuffle",
    body: `
<p>Shuffle an array so that every permutation is <strong>equally likely</strong>, in place, in O(n).</p>
<h3>Task</h3>
<p>Randomness is injected so the result is testable: <code>shuffle(arr, randoms)</code> where <code>randoms[i]</code> is the random float in <code>[0,1)</code> used at step <code>i</code>. Index chosen at step <code>i</code> is <code>i + Math.floor(randoms[i] * (n - i))</code>.</p>
<pre>shuffle([1,2,3], [0.99, 0.99, 0])  ->  [3, 1, 2]</pre>
<h3>Goal</h3>
<p><strong>Fisher-Yates</strong>. Walk left to right, swapping each element with a random element from <code>i</code> to the end — <em>including itself</em>.</p>
<p>The classic bug: picking from the <em>whole</em> array each time. That looks random but is provably biased (n^n outcomes do not divide evenly into n! permutations). Name that bug — it is the question.</p>`,
    alts: [
      { q: "\"Shuffle an Array\" (LeetCode 384) — with a reset().", a: "Keep the original, copy before each shuffle.", code: "class Sol{constructor(n){this.o=[...n];this.a=n;}reset(){this.a=[...this.o];return this.a;}shuffle(){for(let i=0;i<this.a.length;i++){const j=i+Math.floor(Math.random()*(this.a.length-i));[this.a[i],this.a[j]]=[this.a[j],this.a[i]];}return this.a;}}" },
      { q: "\"Why is <code>arr.sort(() => Math.random() - 0.5)</code> wrong?\"", a: "It is biased and engine-dependent — the comparator is inconsistent, which violates the sort contract. Very common in real frontend code; a great one to catch.", code: "// biased. Use Fisher-Yates instead." },
      { q: "\"Pick k random items from a stream of unknown length.\" (Reservoir sampling)", a: "Keep the first k, then for item i replace a random slot with probability k/i.", code: "function reservoir(stream,k){const r=[];stream.forEach((v,i)=>{if(i<k)r.push(v);else{const j=Math.floor(Math.random()*(i+1));if(j<k)r[j]=v;}});return r;}" },
      { q: "\"Random Pick with Weight.\" (LeetCode 528)", a: "Different tool: prefix sums plus a binary search on a random value.", code: "// build prefix sums, pick r in [0,total), binary-search the first prefix > r" },
    ],
    js: `function shuffle(theArray, randoms) {
    if (theArray.length <= 1) return theArray;

    for (let indexWeAreChoosingFor = 0; indexWeAreChoosingFor < theArray.length - 1; indexWeAreChoosingFor++) {
        const floatInRange = randoms[indexWeAreChoosingFor];
        // Choose from the REMAINING items only — including this index itself.
        const randomChoiceIndex =
            indexWeAreChoosingFor +
            Math.floor(floatInRange * (theArray.length - indexWeAreChoosingFor));

        if (randomChoiceIndex !== indexWeAreChoosingFor) {
            const temp = theArray[randomChoiceIndex];
            theArray[randomChoiceIndex] = theArray[indexWeAreChoosingFor];
            theArray[indexWeAreChoosingFor] = temp;
        }
    }
    return theArray;
}`,
    py: `import math

def shuffle(the_array, randoms):
    n = len(the_array)
    for i in range(n - 1):
        j = i + math.floor(randoms[i] * (n - i))
        the_array[i], the_array[j] = the_array[j], the_array[i]
    return the_array`,
    starter: `function shuffle(theArray, randoms) {
    // randoms[i] is the float in [0,1) to use at step i.
    // index = i + Math.floor(randoms[i] * (n - i))

}`,
    cases: [
      { args: [[1, 2, 3], [0.99, 0.99, 0]], expected: [3, 1, 2], sample: true },
      { args: [[1, 2, 3], [0, 0, 0]], expected: [1, 2, 3], sample: true },
      { args: [[1], [0]], expected: [1], sample: false },
      { args: [[], []], expected: [], sample: false },
      { args: [["a", "b"], [0.9, 0]], expected: ["b", "a"], sample: false },
    ],
  });

  /* ---------------- 36. Cafe Order Checker ---------------- */
  P({
    slug: "cafe-order-checker",
    name: "Cafe Order Checker",
    sub: "Greedy",
    difficulty: "Medium",
    fn: "isFirstComeFirstServed",
    body: `
<p>Two registers each produced a list of served order numbers (<code>takeOutOrders</code>, <code>dineInOrders</code>). <code>servedOrders</code> is what actually went out. Return <code>true</code> if orders were served first-come-first-served — that is, if <code>servedOrders</code> is a valid <strong>interleaving</strong> of the two lists, each keeping its own order.</p>
<pre>isFirstComeFirstServed([1,3,5], [2,4,6], [1,2,3,5,4,6])  ->  false
isFirstComeFirstServed([1,3,5], [2,4,6], [1,2,3,4,5,6])  ->  true</pre>
<h3>Goal</h3>
<p>Three pointers, one pass, O(n) time and O(1) space. At each served order, match it against the front of one list or the other. If neither matches, return false. At the end both lists must be exhausted.</p>
<p>The recursive solution is the tempting one and is O(2^n) — mention it, then give the linear one.</p>`,
    alts: [
      { q: "\"Interleaving String.\" (LeetCode 97)", a: "Same shape, but with repeated characters greedy fails and you need DP. Know when greedy is safe: it works here only because the order numbers are distinct.", code: "// dp[i][j] = can s1[0..i) + s2[0..j) form s3[0..i+j)" },
      { q: "\"Is A a subsequence of B?\" (LeetCode 392)", a: "One pointer instead of two. The simpler cousin.", code: "function isSub(a,b){let i=0;for(const c of b)if(c===a[i])i++;return i===a.length;}" },
      { q: "\"Merge two sorted arrays.\" (LeetCode 88)", a: "Same two-pointer walk, but producing output instead of validating it.", code: "// see merge-sorted-arrays in this tier" },
    ],
    js: `function isFirstComeFirstServed(takeOutOrders, dineInOrders, servedOrders) {
    let takeOutIndex = 0;
    let dineInIndex = 0;

    for (const order of servedOrders) {
        if (takeOutIndex < takeOutOrders.length && order === takeOutOrders[takeOutIndex]) {
            takeOutIndex++;
        } else if (dineInIndex < dineInOrders.length && order === dineInOrders[dineInIndex]) {
            dineInIndex++;
        } else {
            return false;                          // matched neither queue's front
        }
    }
    // Nothing may be left over on either register.
    return takeOutIndex === takeOutOrders.length && dineInIndex === dineInOrders.length;
}`,
    py: `def is_first_come_first_served(take_out, dine_in, served):
    t = d = 0
    for order in served:
        if t < len(take_out) and order == take_out[t]:
            t += 1
        elif d < len(dine_in) and order == dine_in[d]:
            d += 1
        else:
            return False
    return t == len(take_out) and d == len(dine_in)`,
    starter: `function isFirstComeFirstServed(takeOutOrders, dineInOrders, servedOrders) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 3, 5], [2, 4, 6], [1, 2, 4, 6, 5, 3]], expected: false, sample: true },
      { args: [[1, 3, 5], [2, 4, 6], [1, 2, 3, 4, 5, 6]], expected: true, sample: true },
      { args: [[], [], []], expected: true, sample: false },
      { args: [[1, 5], [2, 4], [1, 2, 4, 5]], expected: true, sample: false },
      { args: [[1, 5], [2, 4], [1, 2, 4]], expected: false, sample: false },
      { args: [[17, 8, 24], [12, 19, 2], [17, 8, 12, 19, 24, 2]], expected: true, sample: false },
    ],
  });

  /* ---------------- 37. Simulate 5-sided die ---------------- */
  P({
    slug: "simulate-5-from-7",
    name: "Simulate 5-sided die",
    sub: "Randomness",
    difficulty: "Medium",
    fn: "rand5",
    body: `
<p>You have <code>rand7()</code> (uniform 1–7). Build <code>rand5()</code> (uniform 1–5).</p>
<h3>Task</h3>
<p>Rolls are injected for testability: <code>rand5(rolls)</code> consumes <code>rolls</code> left to right as the results of <code>rand7()</code> and returns the first accepted value.</p>
<pre>rand5([6, 3])  ->  3    // 6 rejected, 3 accepted</pre>
<h3>Goal</h3>
<p><strong>Rejection sampling</strong>: roll the 7-sided die, and if you get 6 or 7, throw it away and roll again. Everything that survives is uniform over 1–5.</p>
<p>Why not <code>rand7() % 5</code>? Because 7 does not divide evenly by 5 — the low values would come up more often. Say that; it is the entire question.</p>`,
    alts: [
      { q: "\"Expected number of rolls?\"", a: "Each roll succeeds with probability 5/7, so the expected count is 7/5 = 1.4. Geometric distribution — worth naming.", code: "// E[rolls] = 1 / (5/7) = 1.4" },
      { q: "\"Could it loop forever?\"", a: "In theory yes, in practice no — the probability of k straight rejections is (2/7)^k, which vanishes fast. Correct answer: it terminates with probability 1, expected time is constant.", code: "// P(> 10 rolls) = (2/7)^10 ~ 1e-6" },
      { q: "\"Build rand2() from rand7().\"", a: "Same pattern: accept 1–6, map 1–3 to 1 and 4–6 to 2, reject 7.", code: "function rand2(){let r;do{r=rand7();}while(r===7);return r<=3?1:2;}" },
    ],
    js: `function rand5(rolls) {
    let i = 0;
    while (true) {
        const roll = rolls[i++];
        if (roll === undefined) throw new Error('Ran out of rolls');
        if (roll <= 5) return roll;      // reject 6 and 7, keeping 1..5 uniform
    }
}`,
    py: `def rand5(rolls):
    for roll in rolls:
        if roll <= 5:
            return roll
    raise ValueError('Ran out of rolls')`,
    starter: `function rand5(rolls) {
    // rolls are the successive results of rand7(). Return the first accepted value.

}`,
    cases: [
      { args: [[6, 3]], expected: 3, sample: true },
      { args: [[5]], expected: 5, sample: true },
      { args: [[7, 7, 6, 1]], expected: 1, sample: false },
      { args: [[2, 9]], expected: 2, sample: false },
    ],
  });

  /* ---------------- 38. Simulate 7-sided die ---------------- */
  P({
    slug: "simulate-7-from-5",
    name: "Simulate 7-sided die",
    sub: "Randomness",
    difficulty: "Hard",
    fn: "rand7",
    body: `
<p>The harder direction: you have <code>rand5()</code> (uniform 1–5) and must build <code>rand7()</code> (uniform 1–7).</p>
<h3>Task</h3>
<p><code>rand7(rolls)</code> consumes <code>rolls</code> two at a time as <code>rand5()</code> results.</p>
<pre>rand7([5, 5, 1, 2])  ->  2</pre>
<h3>Goal</h3>
<p>Roll twice to build a uniform value in <strong>1..25</strong>: <code>(a - 1) * 5 + b</code>. Then reject anything above 21 (since 21 = 3 × 7), and return <code>((value - 1) % 7) + 1</code>.</p>
<p>The insight: you cannot get 7 outcomes from 5, so <strong>expand first</strong> (5 × 5 = 25), then trim to a multiple of 7. Rejecting above 21 rather than above 7 is what keeps the expected roll count low.</p>
<h3>Worked example</h3>
<pre>[5,5] -> (5-1)*5+5 = 25 -> > 21, reject
[1,2] -> (1-1)*5+2 = 2  -> ((2-1) % 7) + 1 = 2</pre>`,
    alts: [
      { q: "\"Implement Rand10() Using Rand7().\" (LeetCode 470)", a: "Identical structure: 7x7=49, reject above 40, mod 10.", code: "function rand10(){while(true){const v=(rand7()-1)*7+rand7();if(v<=40)return ((v-1)%10)+1;}}" },
      { q: "\"Why reject above 21 instead of just taking value % 7?\"", a: "25 is not a multiple of 7, so values 1..4 would appear one extra time. Trimming to the largest multiple of 7 (21) is what preserves uniformity.", code: "// 25 % 7 = 4 -> four values would be over-represented" },
      { q: "\"Expected number of rand5 calls?\"", a: "Each pair succeeds with probability 21/25, so about 25/21 pairs = ~2.38 rand5 calls.", code: "// E[pairs] = 25/21 ~ 1.19  ->  ~2.38 rand5() calls" },
      { q: "\"Can you do it without rejection?\"", a: "Not exactly uniformly — any finite deterministic mapping from 5^k outcomes to 7 is biased, since 7 never divides 5^k. Rejection is mandatory for exactness.", code: "// 7 is coprime with 5, so 7 never divides 5^k -> no exact finite mapping" },
    ],
    js: `function rand7(rolls) {
    let i = 0;
    while (true) {
        const a = rolls[i++];
        const b = rolls[i++];
        if (a === undefined || b === undefined) throw new Error('Ran out of rolls');

        const rolledNumber = (a - 1) * 5 + b;      // uniform over 1..25
        if (rolledNumber <= 21) {                  // 21 = 3 * 7
            return ((rolledNumber - 1) % 7) + 1;
        }
    }
}`,
    py: `def rand7(rolls):
    i = 0
    while i + 1 < len(rolls) + 1:
        a, b = rolls[i], rolls[i + 1]
        i += 2
        value = (a - 1) * 5 + b
        if value <= 21:
            return ((value - 1) % 7) + 1
    raise ValueError('Ran out of rolls')`,
    starter: `function rand7(rolls) {
    // rolls are successive rand5() results, consumed two at a time.

}`,
    cases: [
      { args: [[5, 5, 1, 2]], expected: 2, sample: true },
      { args: [[1, 1]], expected: 1, sample: true },
      { args: [[5, 1]], expected: 7, sample: false },
      { args: [[3, 1]], expected: 4, sample: false },
      { args: [[5, 4, 5, 5, 2, 3]], expected: 1, sample: false },
    ],
  });

  /* ---------------- 39. Two Egg Problem ---------------- */
  P({
    slug: "two-egg-problem",
    name: "Two Egg Problem",
    sub: "Math",
    difficulty: "Hard",
    fn: "twoEggDrops",
    body: `
<p>A building has <code>n</code> floors. You have <strong>two</strong> eggs. There is some floor above which an egg breaks. Find the <strong>worst-case minimum</strong> number of drops needed to identify it.</p>
<pre>twoEggDrops(100)  ->  14
twoEggDrops(3)    ->  2</pre>
<h3>Goal</h3>
<p>Binary search needs log(n) eggs, and you have two. Fixed intervals of 10 cost up to 19. The optimum <strong>shrinks the interval each time</strong>: drop first at floor k, then k-1 higher, then k-2 higher… so every path costs the same k.</p>
<p>Find the smallest k with <code>k(k+1)/2 &gt;= n</code>. For 100 that is 14.</p>
<h3>Say this</h3>
<p>"Each drop of the first egg buys me one fewer drop for the second, so I should spend them evenly." That sentence is the answer — the algebra just confirms it.</p>`,
    alts: [
      { q: "\"Super Egg Drop\" (LeetCode 887) — k eggs, n floors.", a: "General DP: f(t, k) = f(t-1, k-1) + f(t-1, k) + 1 floors coverable with t drops and k eggs. Two eggs is the k=2 case.", code: "function superEggDrop(k,n){const dp=new Array(k+1).fill(0);let t=0;while(dp[k]<n){t++;for(let i=k;i>0;i--)dp[i]=dp[i]+dp[i-1]+1;}return t;}" },
      { q: "\"Why not just binary search?\"", a: "Binary search assumes unlimited eggs. With one egg you must go linearly from the bottom, so the first egg's job is to shrink the linear range you are left with.", code: "// 1 egg  -> n drops worst case\n// inf eggs -> ceil(log2(n))\n// 2 eggs -> ~sqrt(2n)" },
      { q: "\"What's the closed form?\"", a: "k = ceil((sqrt(8n+1) - 1) / 2), roughly sqrt(2n). Show you can go from the loop to the formula.", code: "const drops = n => Math.ceil((Math.sqrt(8*n+1)-1)/2);" },
      { q: "\"First Bad Version.\" (LeetCode 278)", a: "The unlimited-eggs version — plain binary search. Good contrast to open with.", code: "function firstBad(n,isBad){let l=1,r=n;while(l<r){const m=(l+r)>>1;isBad(m)?r=m:l=m+1;}return l;}" },
    ],
    js: `function twoEggDrops(n) {
    // Smallest k with k(k+1)/2 >= n.
    let drops = 0;
    let floorsCovered = 0;
    while (floorsCovered < n) {
        drops++;
        floorsCovered += drops;      // shrinking intervals: k, k-1, k-2, ...
    }
    return drops;
}`,
    py: `def two_egg_drops(n):
    drops = 0
    covered = 0
    while covered < n:
        drops += 1
        covered += drops
    return drops`,
    starter: `function twoEggDrops(n) {
    // Return the worst-case minimum number of drops.

}`,
    cases: [
      { args: [100], expected: 14, sample: true },
      { args: [3], expected: 2, sample: true },
      { args: [0], expected: 0, sample: false },
      { args: [1], expected: 1, sample: false },
      { args: [10], expected: 4, sample: false },
      { args: [1000], expected: 45, sample: false },
    ],
  });

  /* ---------------- 40. Find Repeat, Space Edition ---------------- */
  P({
    slug: "find-repeat-space-edition",
    name: "Find Repeat, Space Edition",
    sub: "Divide & Conquer",
    difficulty: "Hard",
    fn: "findRepeatSpaceEdition",
    body: `
<p>Same setup as Which Appears Twice — numbers <code>1..n</code> in an array of length <code>n + 1</code>, with at least one repeat. But now:</p>
<ul>
<li>You may <strong>not</strong> modify the input.</li>
<li>You must use <strong>O(1) space</strong>.</li>
<li>The sum trick is banned (assume the repeat may appear many times).</li>
</ul>
<h3>Goal</h3>
<p>Binary search on the <strong>value range</strong>, not the indices. Take the range 1..n, split it in half, and count how many array items fall in the lower half. If that count exceeds the size of the lower half, a repeat must live there (pigeonhole). Recurse into that half.</p>
<p>O(n log n) time, O(1) space.</p>`,
    alts: [
      { q: "\"Find the Duplicate Number\" (LeetCode 287)", a: "The exact problem. Interviewers usually want the O(n) cycle version — that is BEAST MODE, the next problem.", code: "// see find-repeat-beast-mode" },
      { q: "\"Explain the pigeonhole principle here.\"", a: "If more than m items fall into m distinct slots, two share a slot. That is the whole justification for recursing into the overfull half.", code: "// range 1..4 holds 5 numbers -> some value repeats" },
      { q: "\"What if you WERE allowed to modify the array?\"", a: "O(n) time, O(1) space by marking: for each value v, negate the element at index |v|-1; a value already negative is the repeat.", code: "function findDupMark(a){for(const v of a){const i=Math.abs(v)-1;if(a[i]<0)return Math.abs(v);a[i]=-a[i];}return -1;}" },
    ],
    js: `function findRepeatSpaceEdition(numbers) {
    let floor = 1;
    let ceiling = numbers.length - 1;         // values run 1..n

    while (floor < ceiling) {
        const midpoint = Math.floor(floor + (ceiling - floor) / 2);
        const lowerRangeFloor = floor;
        const lowerRangeCeiling = midpoint;
        const upperRangeFloor = midpoint + 1;
        const upperRangeCeiling = ceiling;

        let itemsInLowerRange = 0;
        for (const item of numbers) {
            if (item >= lowerRangeFloor && item <= lowerRangeCeiling) itemsInLowerRange++;
        }

        const distinctPossibleIntegersInLowerRange = lowerRangeCeiling - lowerRangeFloor + 1;

        if (itemsInLowerRange > distinctPossibleIntegersInLowerRange) {
            floor = lowerRangeFloor;          // pigeonhole: repeat is down here
            ceiling = lowerRangeCeiling;
        } else {
            floor = upperRangeFloor;
            ceiling = upperRangeCeiling;
        }
    }
    return floor;                             // floor === ceiling: found it
}`,
    py: `def find_repeat_space_edition(numbers):
    floor, ceiling = 1, len(numbers) - 1
    while floor < ceiling:
        midpoint = floor + (ceiling - floor) // 2
        count = sum(1 for x in numbers if floor <= x <= midpoint)
        if count > midpoint - floor + 1:
            ceiling = midpoint
        else:
            floor = midpoint + 1
    return floor`,
    starter: `function findRepeatSpaceEdition(numbers) {
    // Binary search the VALUE range. Do not modify the input. O(1) space.

}`,
    cases: [
      { args: [[1, 2, 3, 4, 4]], expected: 4, sample: true },
      { args: [[1, 1]], expected: 1, sample: true },
      { args: [[3, 1, 2, 2]], expected: 2, sample: false },
      { args: [[1, 2, 5, 5, 5, 5]], expected: 5, sample: false },
      { args: [[2, 3, 1, 3]], expected: 3, sample: false },
    ],
  });

  /* ---------------- 41. Find Repeat, BEAST MODE ---------------- */
  P({
    slug: "find-repeat-beast-mode",
    name: "Find Repeat, Space Edition BEAST MODE",
    sub: "Linked Lists",
    difficulty: "Hard",
    fn: "findRepeatBeastMode",
    body: `
<p>Same constraints as Space Edition, but now in <strong>O(n) time</strong> and O(1) space, still without modifying the input.</p>
<h3>Goal</h3>
<p>Reframe the array as a linked list: from position <code>i</code>, the "next" position is <code>numbers[i]</code>. Because values are 1..n and there are n+1 positions, this list <strong>must</strong> contain a cycle — and the repeated value is exactly the node where the cycle begins.</p>
<p>So: Floyd's tortoise and hare (from Does This Linked List Have A Cycle), then the phase-two walk to find the cycle entrance.</p>
<h3>Why this is the "beast mode"</h3>
<p>The whole difficulty is <strong>seeing</strong> that a duplicate-number problem is a cycle-detection problem. Once you say that sentence out loud, the code is a problem you have already solved in this tier.</p>`,
    alts: [
      { q: "\"Find the Duplicate Number\" (LeetCode 287) — the O(n) solution.", a: "This is the canonical expected answer at senior level.", code: "function findDup(a){let s=a[0],f=a[0];do{s=a[s];f=a[a[f]];}while(s!==f);s=a[0];while(s!==f){s=a[s];f=a[f];}return s;}" },
      { q: "\"Prove there must be a cycle.\"", a: "Start at index 0 (a value no element points to, since values are >= 1) and follow forever in a finite space — you must revisit a node. Two different indices pointing to the same value is what creates the entrance.", code: "// n+1 positions, values in 1..n -> index 0 has no in-edge -> the cycle starts at the duplicate" },
      { q: "\"Why does resetting one pointer to the start find the entrance?\"", a: "Let F be the distance to the entrance and the meeting point be a distance F from the entrance going forward around the loop. Both pointers then need exactly F steps to reach it. Be ready to sketch it.", code: "// 2(F+a) = F+a+nC  ->  F+a = nC  ->  F = nC - a" },
    ],
    js: `function findRepeatBeastMode(numbers) {
    // Position i "points to" position numbers[i].
    let slow = numbers[0];
    let fast = numbers[0];

    do {                                  // phase 1: find a meeting point
        slow = numbers[slow];
        fast = numbers[numbers[fast]];
    } while (slow !== fast);

    slow = numbers[0];                    // phase 2: find the cycle entrance
    while (slow !== fast) {
        slow = numbers[slow];
        fast = numbers[fast];
    }
    return slow;
}`,
    py: `def find_repeat_beast_mode(numbers):
    slow = fast = numbers[0]
    while True:
        slow = numbers[slow]
        fast = numbers[numbers[fast]]
        if slow == fast:
            break
    slow = numbers[0]
    while slow != fast:
        slow = numbers[slow]
        fast = numbers[fast]
    return slow`,
    starter: `function findRepeatBeastMode(numbers) {
    // Treat the array as a linked list and find the start of the cycle.

}`,
    cases: [
      { args: [[1, 2, 3, 4, 4]], expected: 4, sample: true },
      { args: [[1, 1]], expected: 1, sample: true },
      { args: [[3, 1, 3, 4, 2]], expected: 3, sample: false },
      { args: [[1, 3, 4, 2, 2]], expected: 2, sample: false },
      { args: [[2, 2, 2, 2, 2]], expected: 2, sample: false },
    ],
  });

  /* ---------------- 42. Find Duplicate Files ---------------- */
  P({
    slug: "find-duplicate-files",
    name: "Find Duplicate Files",
    sub: "Hashing",
    difficulty: "Hard",
    fn: "findDuplicateFiles",
    body: `
<p>Given a list of files as <code>{ path, contents, lastEditedAt }</code>, find every duplicate pair and return <code>[originalPath, duplicatePath]</code> pairs — the file with the <strong>older</strong> <code>lastEditedAt</code> is the original.</p>
<p>Return the pairs sorted by duplicate path so the result is deterministic.</p>
<pre>[{path:"/a", contents:"x", lastEditedAt:1},
 {path:"/b", contents:"x", lastEditedAt:5}]
  ->  [["/a", "/b"]]</pre>
<h3>Goal</h3>
<p>Hash contents to the first-seen file. When a hit comes in, compare timestamps and keep the older one as the original.</p>
<h3>Say this in the interview</h3>
<p>Hashing full file <em>contents</em> is expensive. Real optimisations: hash only a sample of the file (start, middle, end) as a cheap first filter, then do a full comparison only on collisions. That practical answer is what separates this from a plain hashing exercise.</p>`,
    alts: [
      { q: "\"Find Duplicate File in System\" (LeetCode 609)", a: "Group paths by content string, return the groups with more than one member.", code: "function findDup(paths){const m={};for(const p of paths){const[dir,...fs]=p.split(' ');for(const f of fs){const[n,c]=f.split('(');(m[c]=m[c]||[]).push(dir+'/'+n);}}return Object.values(m).filter(g=>g.length>1);}" },
      { q: "\"Group Anagrams.\" (LeetCode 49)", a: "Same hash-by-canonical-form pattern; the canonical form is the sorted string.", code: "function groupAnagrams(ws){const m={};for(const w of ws){const k=[...w].sort().join('');(m[k]=m[k]||[]).push(w);}return Object.values(m);}" },
      { q: "\"The files are gigabytes. What now?\"", a: "Bucket by size first (cheapest filter), then by a sampled hash, then do a full byte compare only on survivors. Nearly all pairs die at step one.", code: "// size -> sampled hash -> full compare. Each stage is strictly more expensive than the last." },
    ],
    js: `function findDuplicateFiles(files) {
    const contentsToFile = {};      // contents -> the oldest file seen with them
    const duplicates = [];

    for (const file of files) {
        const seen = contentsToFile[file.contents];

        if (seen === undefined) {
            contentsToFile[file.contents] = file;
        } else if (file.lastEditedAt >= seen.lastEditedAt) {
            duplicates.push([seen.path, file.path]);            // seen is older -> original
        } else {
            duplicates.push([file.path, seen.path]);            // this one is older
            contentsToFile[file.contents] = file;
        }
    }

    duplicates.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    return duplicates;
}`,
    py: `def find_duplicate_files(files):
    seen, dupes = {}, []
    for f in files:
        prior = seen.get(f['contents'])
        if prior is None:
            seen[f['contents']] = f
        elif f['lastEditedAt'] >= prior['lastEditedAt']:
            dupes.append([prior['path'], f['path']])
        else:
            dupes.append([f['path'], prior['path']])
            seen[f['contents']] = f
    return sorted(dupes, key=lambda p: p[1])`,
    starter: `function findDuplicateFiles(files) {
    // files: [{ path, contents, lastEditedAt }]
    // return [[originalPath, duplicatePath], ...] sorted by duplicate path

}`,
    cases: [
      {
        args: [[{ path: "/a", contents: "x", lastEditedAt: 1 }, { path: "/b", contents: "x", lastEditedAt: 5 }]],
        expected: [["/a", "/b"]],
        sample: true,
      },
      {
        args: [[{ path: "/a", contents: "x", lastEditedAt: 1 }, { path: "/b", contents: "y", lastEditedAt: 5 }]],
        expected: [],
        sample: true,
      },
      {
        args: [[{ path: "/new", contents: "x", lastEditedAt: 9 }, { path: "/old", contents: "x", lastEditedAt: 2 }]],
        expected: [["/old", "/new"]],
        sample: false,
      },
      { args: [[]], expected: [], sample: false },
    ],
  });

  /* ---------------- 43. Merge Sorted Arrays ---------------- */
  P({
    slug: "merge-sorted-arrays",
    name: "Merge Sorted Arrays",
    sub: "Sorting",
    difficulty: "Easy",
    fn: "mergeArrays",
    body: `
<p>Merge two already-sorted arrays into one sorted array.</p>
<pre>mergeArrays([3, 4, 6, 10, 11, 15], [1, 5, 8, 12, 14, 19])
  ->  [1, 3, 4, 5, 6, 8, 10, 11, 12, 14, 15, 19]</pre>
<h3>Goal</h3>
<p>Two pointers, one pass, O(n + m). Do <strong>not</strong> concatenate and re-sort — that is O(n log n) and throws away the fact that the inputs are already sorted.</p>
<p>Handle all four edge cases explicitly: one array exhausted, the other exhausted, both empty, one empty. This is the merge step of merge sort, so know that connection.</p>`,
    alts: [
      { q: "\"Merge Sorted Array\" (LeetCode 88) — merge into nums1 in place.", a: "Fill from the BACK so you never overwrite unread values. That reversal is the trick.", code: "function merge(a,m,b,n){let i=m-1,j=n-1,k=m+n-1;while(j>=0)a[k--]=(i>=0&&a[i]>b[j])?a[i--]:b[j--];return a;}" },
      { q: "\"Merge k sorted lists.\" (LeetCode 23)", a: "Min-heap of the k heads, or merge pairwise. O(N log k).", code: "// heap: push all heads, pop the min, push its next. O(N log k)" },
      { q: "\"Median of two sorted arrays.\" (LeetCode 4)", a: "The hard one — binary search on the partition point, O(log(min(n,m))). Merging is the O(n+m) fallback; say both.", code: "// binary search i in the shorter array so that left halves have (n+m+1)/2 items" },
      { q: "\"Intersection of two sorted arrays.\"", a: "Same two-pointer walk, only emitting when both match.", code: "function inter(a,b){const o=[];let i=0,j=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){o.push(a[i]);i++;j++;}else if(a[i]<b[j])i++;else j++;}return o;}" },
    ],
    js: `function mergeArrays(myArray, alicesArray) {
    const mergedArray = [];
    let currentIndexMine = 0;
    let currentIndexAlices = 0;

    while (mergedArray.length < myArray.length + alicesArray.length) {
        const isMyArrayExhausted = currentIndexMine >= myArray.length;
        const isAlicesArrayExhausted = currentIndexAlices >= alicesArray.length;

        if (!isMyArrayExhausted &&
            (isAlicesArrayExhausted || myArray[currentIndexMine] < alicesArray[currentIndexAlices])) {
            mergedArray.push(myArray[currentIndexMine]);
            currentIndexMine++;
        } else {
            mergedArray.push(alicesArray[currentIndexAlices]);
            currentIndexAlices++;
        }
    }
    return mergedArray;
}`,
    py: `def merge_arrays(mine, alices):
    merged, i, j = [], 0, 0
    while len(merged) < len(mine) + len(alices):
        if i < len(mine) and (j >= len(alices) or mine[i] < alices[j]):
            merged.append(mine[i]); i += 1
        else:
            merged.append(alices[j]); j += 1
    return merged`,
    starter: `function mergeArrays(myArray, alicesArray) {
    // Write your code here

}`,
    cases: [
      {
        args: [[3, 4, 6, 10, 11, 15], [1, 5, 8, 12, 14, 19]],
        expected: [1, 3, 4, 5, 6, 8, 10, 11, 12, 14, 15, 19],
        sample: true,
      },
      { args: [[], [1, 2]], expected: [1, 2], sample: true },
      { args: [[1, 2], []], expected: [1, 2], sample: false },
      { args: [[], []], expected: [], sample: false },
      { args: [[1, 1, 1], [1, 1]], expected: [1, 1, 1, 1, 1], sample: false },
    ],
  });

  /* ---------------- 44. URL Shortener ---------------- */
  P({
    slug: "url-shortener",
    name: "URL Shortener",
    sub: "System Design",
    difficulty: "Medium",
    fn: "runShortener",
    body: `
<p>Build a bit.ly: <code>shorten(url)</code> returns a short code, <code>restore(code)</code> returns the original URL.</p>
<h3>Task</h3>
<p>So the output is deterministic, codes are <strong>base-36 of an incrementing counter</strong> starting at 0: <code>"0"</code>, <code>"1"</code>, … <code>"9"</code>, <code>"a"</code>, … Shortening a URL you have already shortened returns the same code.</p>
<pre>runShortener([["shorten","http://a.com"],["shorten","http://b.com"],
              ["shorten","http://a.com"],["restore","1"]])
  ->  ["0", "1", "0", "http://b.com"]</pre>
<h3>Goal</h3>
<p>Two hash maps: code to URL and URL to code. Both directions are O(1). The second map is what makes shortening idempotent.</p>
<h3>The real interview</h3>
<p>This is a <strong>system design</strong> question in a coding costume. Be ready for: why a counter and not a hash of the URL (collisions vs. guessability), how to shard the counter across servers (ranges per server, or Snowflake ids), whether codes should be guessable, expiry, and analytics on redirects.</p>`,
    alts: [
      { q: "\"Encode and Decode TinyURL.\" (LeetCode 535)", a: "Same two-map answer.", code: "const m={},r={};let n=0;\nconst encode=u=>r[u]??(r[u]=String(n++),m[r[u]]=u,r[u]);\nconst decode=c=>m[c];" },
      { q: "\"Why not just hash the URL, e.g. md5 truncated to 7 chars?\"", a: "Truncated hashes collide (birthday bound), so you still need a collision check and retry loop. The upside is idempotence for free and no shared counter.", code: "// counter: no collisions, needs coordination\n// hash: no coordination, needs collision handling" },
      { q: "\"How do you shard the counter across servers?\"", a: "Hand each server a range (server A gets 0–1M, B gets 1M–2M) so nobody coordinates per request. Or Snowflake ids: timestamp + machine id + sequence.", code: "// range allocation from a central service, refilled in blocks" },
      { q: "\"Design an LRU cache.\" (LeetCode 146) — the usual follow-up on the hot-URL cache.", a: "Hash map plus a doubly linked list, or JS Map exploiting its insertion order.", code: "class LRU{constructor(c){this.c=c;this.m=new Map();}get(k){if(!this.m.has(k))return -1;const v=this.m.get(k);this.m.delete(k);this.m.set(k,v);return v;}put(k,v){if(this.m.has(k))this.m.delete(k);this.m.set(k,v);if(this.m.size>this.c)this.m.delete(this.m.keys().next().value);}}" },
    ],
    js: `function runShortener(ops) {
    const codeToUrl = {};
    const urlToCode = {};
    let nextId = 0;
    const results = [];

    for (const op of ops) {
        if (op[0] === 'shorten') {
            const url = op[1];
            if (url in urlToCode) {              // 'in', not truthiness — "0" is falsy!
                results.push(urlToCode[url]);
            } else {
                const code = (nextId++).toString(36);
                urlToCode[url] = code;
                codeToUrl[code] = url;
                results.push(code);
            }
        } else {
            const code = op[1];
            results.push(code in codeToUrl ? codeToUrl[code] : null);
        }
    }
    return results;
}`,
    py: `def run_shortener(ops):
    code_to_url, url_to_code, results = {}, {}, []
    next_id = 0

    def to36(n):
        digits = '0123456789abcdefghijklmnopqrstuvwxyz'
        if n == 0:
            return '0'
        out = ''
        while n:
            out = digits[n % 36] + out
            n //= 36
        return out

    for op in ops:
        if op[0] == 'shorten':
            url = op[1]
            if url in url_to_code:
                results.append(url_to_code[url])
            else:
                code = to36(next_id)
                next_id += 1
                url_to_code[url] = code
                code_to_url[code] = url
                results.append(code)
        else:
            results.append(code_to_url.get(op[1]))
    return results`,
    starter: `function runShortener(ops) {
    // ops: [["shorten", url] | ["restore", code], ...]
    // codes are base-36 of a counter starting at 0

}`,
    cases: [
      {
        args: [[["shorten", "http://a.com"], ["shorten", "http://b.com"], ["shorten", "http://a.com"], ["restore", "1"]]],
        expected: ["0", "1", "0", "http://b.com"],
        sample: true,
      },
      { args: [[["restore", "zz"]]], expected: [null], sample: true },
      { args: [[["shorten", "x"], ["restore", "0"]]], expected: ["0", "x"], sample: false },
      { args: [[]], expected: [], sample: false },
    ],
  });

  /* ---------------- 45. Graph Coloring ---------------- */
  P({
    slug: "graph-coloring",
    name: "Graph Coloring",
    sub: "Graphs",
    difficulty: "Hard",
    fn: "colorGraph",
    body: `
<p>Color a graph so no two neighbours share a color, using at most <code>D + 1</code> colors, where <code>D</code> is the highest degree of any node.</p>
<h3>Task</h3>
<p>The graph is <code>{ nodeLabel: [neighborLabels] }</code>. <code>colors</code> is an ordered array of color names. Return <code>{ nodeLabel: color }</code>. Process nodes in the order the keys appear, and always take the <strong>first legal color</strong> — that keeps the output deterministic.</p>
<pre>colorGraph({a:["b"], b:["a"], c:[]}, ["red","green"])
  ->  { a:"red", b:"green", c:"red" }</pre>
<h3>Goal</h3>
<p>Greedy: for each node, collect the colors already used by its neighbours and take the first color not in that set. Since a node has at most D neighbours, one of the D+1 colors is always free — that is the proof, and interviewers want to hear it.</p>
<p>Guard against <strong>self-loops</strong>: a node adjacent to itself cannot be legally colored. Throw.</p>`,
    alts: [
      { q: "\"Is this graph bipartite?\" (LeetCode 785) — 2-colorable?", a: "BFS/DFS alternating two colors; a conflict means not bipartite. Much simpler than general coloring.", code: "function bipartite(g){const c={};for(const s in g){if(s in c)continue;c[s]=0;const q=[s];while(q.length){const n=q.pop();for(const m of g[n]){if(!(m in c)){c[m]=1-c[n];q.push(m);}else if(c[m]===c[n])return false;}}}return true;}" },
      { q: "\"Course Schedule.\" (LeetCode 207) — detect a cycle in a directed graph.", a: "Different problem, same graph-traversal muscles: topological sort or DFS with a recursion stack.", code: "// Kahn's: repeatedly remove in-degree-0 nodes; if any remain, there is a cycle" },
      { q: "\"Why D+1 colors, and is that optimal?\"", a: "D+1 always suffices by the pigeonhole argument. It is not always minimal — finding the true chromatic number is NP-hard. Saying that is a strong senior signal.", code: "// a cycle of even length needs only 2 colors but D+1 = 3" },
      { q: "\"Number of Islands.\" (LeetCode 200)", a: "The most common graph question by far — flood fill on a grid. Practice it as the entry point to graph traversal.", code: "function islands(g){let c=0;const sink=(i,j)=>{if(i<0||j<0||i>=g.length||j>=g[0].length||g[i][j]!=='1')return;g[i][j]='0';sink(i+1,j);sink(i-1,j);sink(i,j+1);sink(i,j-1);};for(let i=0;i<g.length;i++)for(let j=0;j<g[0].length;j++)if(g[i][j]==='1'){c++;sink(i,j);}return c;}" },
    ],
    js: `function colorGraph(graph, colors) {
    const nodeToColor = {};

    for (const label of Object.keys(graph)) {
        const neighbors = graph[label];

        if (neighbors.indexOf(label) !== -1) {
            throw new Error('Legal coloring impossible for node with loop: ' + label);
        }

        // Colors already taken by neighbours.
        const illegalColors = new Set();
        for (const neighbor of neighbors) {
            if (neighbor in nodeToColor) illegalColors.add(nodeToColor[neighbor]);
        }

        for (const color of colors) {
            if (!illegalColors.has(color)) { nodeToColor[label] = color; break; }
        }
        if (!(label in nodeToColor)) throw new Error('Ran out of colors');
    }
    return nodeToColor;
}`,
    py: `def color_graph(graph, colors):
    node_to_color = {}
    for label, neighbors in graph.items():
        if label in neighbors:
            raise ValueError(f'Legal coloring impossible for node with loop: {label}')
        illegal = {node_to_color[n] for n in neighbors if n in node_to_color}
        for color in colors:
            if color not in illegal:
                node_to_color[label] = color
                break
        else:
            raise ValueError('Ran out of colors')
    return node_to_color`,
    starter: `function colorGraph(graph, colors) {
    // graph: { label: [neighborLabels] }
    // Take the first legal color for each node, in key order.

}`,
    cases: [
      { args: [{ a: ["b"], b: ["a"], c: [] }, ["red", "green"]], expected: { a: "red", b: "green", c: "red" }, sample: true },
      { args: [{ a: [], b: [] }, ["red"]], expected: { a: "red", b: "red" }, sample: true },
      {
        args: [{ a: ["b", "c"], b: ["a", "c"], c: ["a", "b"] }, ["red", "green", "blue"]],
        expected: { a: "red", b: "green", c: "blue" },
        sample: false,
      },
      {
        args: [{ a: ["b"], b: ["a", "c"], c: ["b"] }, ["red", "green"]],
        expected: { a: "red", b: "green", c: "red" },
        sample: false,
      },
    ],
  });

  /* ---------------- 46. MeshMessage ---------------- */
  P({
    slug: "mesh-message",
    name: "MeshMessage",
    sub: "Graphs",
    difficulty: "Hard",
    fn: "getPath",
    body: `
<p>In a mesh network, find the <strong>shortest</strong> route a message can take from one device to another.</p>
<h3>Task</h3>
<p><code>getPath(graph, startNode, endNode)</code> returns the shortest path as an array of node labels, or <code>null</code> if no route exists. Neighbours are explored in the order they appear in the adjacency list, so the output is deterministic.</p>
<pre>getPath({a:["b","c"], b:["a","d"], c:["a","d"], d:["b","c"]}, "a", "d")
  ->  ["a", "b", "d"]</pre>
<h3>Goal</h3>
<p><strong>BFS, not DFS.</strong> BFS visits nodes in order of distance, so the first time you reach the end you have the shortest path. DFS finds <em>a</em> path, not the shortest — this is the single most important thing to say.</p>
<p>Track a <code>previousNodes</code> map as you go, then walk it backwards from the end and reverse to reconstruct the path.</p>`,
    alts: [
      { q: "\"Word Ladder.\" (LeetCode 127)", a: "BFS in disguise — nodes are words, edges are one-letter changes. Recognising it as a graph is the whole problem.", code: "// BFS over words; neighbours = words one letter apart present in the dict" },
      { q: "\"What if edges have weights (latency)?\"", a: "BFS no longer works. Dijkstra with a priority queue, or Bellman-Ford if weights can be negative.", code: "// Dijkstra: min-heap by distance, relax each edge on pop" },
      { q: "\"Shortest path in a binary matrix.\" (LeetCode 1091)", a: "Same BFS with the grid as an implicit graph and 8 neighbours per cell.", code: "// queue of [r,c,dist]; push the 8 neighbours that are 0 and in bounds" },
      { q: "\"Why can't I just use DFS with a visited set?\"", a: "DFS returns the first path it stumbles on, which can be arbitrarily long. To get the shortest with DFS you must explore every path and keep the minimum — exponential instead of O(V+E).", code: "// BFS: O(V+E), first hit is optimal. DFS-all-paths: exponential." },
    ],
    js: `function getPath(graph, startNode, endNode) {
    if (!(startNode in graph)) throw new Error('Start node not in graph');
    if (!(endNode in graph)) throw new Error('End node not in graph');

    const nodesToVisit = [startNode];          // FIFO queue -> shortest path
    const previousNodes = {};
    previousNodes[startNode] = null;

    while (nodesToVisit.length) {
        const currentNode = nodesToVisit.shift();

        if (currentNode === endNode) {         // first hit IS the shortest
            const path = [];
            for (let n = endNode; n !== null; n = previousNodes[n]) path.push(n);
            return path.reverse();
        }

        for (const neighbor of graph[currentNode]) {
            if (!(neighbor in previousNodes)) {
                previousNodes[neighbor] = currentNode;
                nodesToVisit.push(neighbor);
            }
        }
    }
    return null;                               // unreachable
}`,
    py: `from collections import deque

def get_path(graph, start_node, end_node):
    if start_node not in graph or end_node not in graph:
        raise ValueError('Node not in graph')
    queue = deque([start_node])
    previous = {start_node: None}
    while queue:
        current = queue.popleft()
        if current == end_node:
            path, n = [], end_node
            while n is not None:
                path.append(n)
                n = previous[n]
            return path[::-1]
        for neighbor in graph[current]:
            if neighbor not in previous:
                previous[neighbor] = current
                queue.append(neighbor)
    return None`,
    starter: `function getPath(graph, startNode, endNode) {
    // BFS. Return the shortest path as an array of labels, or null.

}`,
    cases: [
      {
        args: [{ a: ["b", "c"], b: ["a", "d"], c: ["a", "d"], d: ["b", "c"] }, "a", "d"],
        expected: ["a", "b", "d"],
        sample: true,
      },
      { args: [{ a: ["b"], b: ["a"], c: [] }, "a", "c"], expected: null, sample: true },
      { args: [{ a: [] }, "a", "a"], expected: ["a"], sample: false },
      {
        args: [{ a: ["b"], b: ["a", "c"], c: ["b", "d"], d: ["c"] }, "a", "d"],
        expected: ["a", "b", "c", "d"],
        sample: false,
      },
    ],
  });
})();
