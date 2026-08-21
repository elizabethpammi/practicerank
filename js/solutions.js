/* PracticeRank — reference "Best Solution" bank.
 * Covers the 31 algorithm problems (js/problems.js), the 15 React/CSS
 * problems (js/problems-frontend.js), and react-quotes-app
 * (js/problems-react-quotes.js). Interview-tier problem sets
 * (js/problems-interview-*.js) are wired separately — not here.
 * js/app.js attaches window.PR_SOLUTIONS[slug] to each problem at
 * startup, which the Best Solution tab renders.
 */
(function () {
  "use strict";

  window.PR_SOLUTIONS = {
    "sock-merchant": {
      code:
        "function sockMerchant(n, ar) {\n" +
        "    const counts = new Map();\n" +
        "    for (const color of ar) counts.set(color, (counts.get(color) || 0) + 1);\n" +
        "    let pairs = 0;\n" +
        "    counts.forEach(function (count) { pairs += Math.floor(count / 2); });\n" +
        "    return pairs;\n" +
        "}",
      explanation:
        "<p>The core idea is a frequency count. One pass builds a <code>Map</code> from sock color to how many socks of that color exist; a second pass sums <code>Math.floor(count / 2)</code> per color, because every two socks of a color form exactly one pair and a leftover odd sock contributes nothing.</p>" +
        "<p>This shape is idiomatic because counting distinct keys is exactly what a hash map is for, and it keeps the solution at <b>O(n) time</b> with <b>O(k) space</b> for k distinct colors. Sorting the pile first also works but costs O(n log n) for no benefit.</p>" +
        "<ul><li>The classic trap is trying to pair socks by scanning for matches and marking them used, which drifts into O(n&sup2;) and messy bookkeeping.</li><li>Note that <code>n</code> is redundant; the array length is the real source of truth. HackerRank passes it anyway, so accept it and ignore it.</li></ul>",
    },
    "counting-valleys": {
      code:
        "function countingValleys(steps, path) {\n" +
        "    let level = 0;\n" +
        "    let valleys = 0;\n" +
        "    for (const step of path) {\n" +
        "        if (step === \"U\") {\n" +
        "            level++;\n" +
        "            if (level === 0) valleys++; // just climbed back up to sea level\n" +
        "        } else {\n" +
        "            level--;\n" +
        "        }\n" +
        "    }\n" +
        "    return valleys;\n" +
        "}",
      explanation:
        "<p>Track altitude as a running <code>level</code>: <code>U</code> adds one, <code>D</code> subtracts one. A valley is any stretch spent below sea level, and the clean way to count stretches is to count their <b>endings</b>: each time a <code>U</code> step brings the level back to exactly 0, one valley has just been exited, so increment the counter there.</p>" +
        "<p>This is idiomatic because it turns a geometric-sounding question into a single integer state machine with one pass over the string, giving <b>O(n) time, O(1) space</b>.</p>" +
        "<ul><li>The usual trap is counting every moment spent underground, or counting when level goes negative, which tallies steps or valley entries under the wrong condition and double-counts multi-step valleys.</li><li>Only the transition from -1 to 0 on a <code>U</code> matters. Mountains (returning to 0 from above) hit level 0 too, but via a <code>D</code>, so the <code>U</code>-only check filters them out automatically.</li></ul>",
    },
    "jumping-on-the-clouds": {
      code:
        "function jumpingOnClouds(c) {\n" +
        "    let jumps = 0;\n" +
        "    let i = 0;\n" +
        "    while (i < c.length - 1) {\n" +
        "        i = (i + 2 < c.length && c[i + 2] === 0) ? i + 2 : i + 1;\n" +
        "        jumps++;\n" +
        "    }\n" +
        "    return jumps;\n" +
        "}",
      explanation:
        "<p>This is a greedy problem: from cloud <code>i</code> always jump two ahead when <code>c[i + 2]</code> exists and is safe, otherwise jump one. Since every cloud you land on costs exactly one jump regardless of distance, taking the longest safe hop at every step can never hurt you later; skipping a cloud you could have skipped only wastes a jump.</p>" +
        "<p>The while-loop form is idiomatic because the index advances by a variable amount, which a <code>for</code> loop expresses awkwardly. Complexity is <b>O(n) time, O(1) space</b>.</p>" +
        "<ul><li>The main trap is checking the wrong cell: you must test the <em>destination</em> <code>c[i + 2]</code>, not the cloud in between. The puzzle guarantees a path exists, so the +1 fallback is always safe.</li><li>Also mind the bounds: guard <code>i + 2 &lt; c.length</code> before reading it, or the final hop can walk off the array.</li></ul>",
    },
    "repeated-string": {
      code:
        "function repeatedString(s, n) {\n" +
        "    const countIn = function (str) {\n" +
        "        let total = 0;\n" +
        "        for (const ch of str) if (ch === \"a\") total++;\n" +
        "        return total;\n" +
        "    };\n" +
        "    const fullRepeats = Math.floor(n / s.length);\n" +
        "    const remainder = n % s.length;\n" +
        "    return fullRepeats * countIn(s) + countIn(s.slice(0, remainder));\n" +
        "}",
      explanation:
        "<p>Never build the repeated string; <code>n</code> can be enormous (10&sup1;&sup2; on the real judge) and materializing it dies instantly. Instead use arithmetic: the infinite repetition consists of <code>Math.floor(n / s.length)</code> complete copies of <code>s</code> plus a prefix of length <code>n % s.length</code>. Count the letter <code>a</code> once in <code>s</code>, multiply by the number of full copies, then add the count in that one prefix slice.</p>" +
        "<p>This runs in <b>O(|s|) time and O(1) extra space</b>, independent of <code>n</code>, which is the entire point of the problem.</p>" +
        "<ul><li>The trap is exactly the naive <code>s.repeat(...)</code> approach, which passes tiny samples and then explodes on hidden tests.</li><li>A subtler bug is applying the remainder to the wrong thing: it is a character-length prefix of <code>s</code>, not a number of extra whole copies. Test with <code>aba, n = 10</code>: 3 full copies (6 a's) plus prefix <code>a</code> gives 7.</li></ul>",
    },
    "two-sum": {
      code:
        "function twoSum(nums, target) {\n" +
        "    const seen = new Map(); // value -> index\n" +
        "    for (let i = 0; i < nums.length; i++) {\n" +
        "        const need = target - nums[i];\n" +
        "        if (seen.has(need)) return [seen.get(need), i];\n" +
        "        seen.set(nums[i], i);\n" +
        "    }\n" +
        "    return [];\n" +
        "}",
      explanation:
        "<p>The one-pass hash map is the canonical answer. Walk the array once; for each value compute its complement <code>target - nums[i]</code>. If the complement is already in the map you have your pair, and the stored value is the <em>earlier</em> index. Otherwise record the current value and index and move on.</p>" +
        "<p>This is idiomatic because it collapses the pair search into a membership test: <b>O(n) time, O(n) space</b>, versus O(n&sup2;) for the nested-loop version. Checking <em>before</em> inserting also handles duplicates like <code>[3, 3]</code> with target 6 correctly, since the first 3 is in the map by the time the second arrives.</p>" +
        "<ul><li>The classic trap is inserting first and then checking, which lets an element pair with itself (index 4 with target 8 returns <code>[2, 2]</code>).</li><li>Return indices in ascending order; the map naturally holds the smaller one, so <code>[seen.get(need), i]</code> is already sorted.</li></ul>",
    },
    "hash-tables-ransom-note": {
      code:
        "function checkMagazine(magazine, note) {\n" +
        "    const counts = new Map();\n" +
        "    for (const word of magazine) counts.set(word, (counts.get(word) || 0) + 1);\n" +
        "    for (const word of note) {\n" +
        "        const left = counts.get(word) || 0;\n" +
        "        if (left === 0) return \"No\";\n" +
        "        counts.set(word, left - 1);\n" +
        "    }\n" +
        "    return \"Yes\";\n" +
        "}",
      explanation:
        "<p>Build a word-frequency <code>Map</code> from the magazine, then spend from it while scanning the note: each note word decrements its remaining count, and the moment a word's count is zero (or absent) the answer is <code>No</code>.</p>" +
        "<p>Counting is the idiomatic shape because the note needs <em>multiset</em> containment, not set containment; a plain <code>Set</code> loses the information that <code>two</code> appears once but is needed twice. Both passes are linear, so this is <b>O(m + n) time</b> in the two list lengths and <b>O(m) space</b>.</p>" +
        "<ul><li>The stated trap in this problem's cases: matching is <b>case-sensitive</b>, so <code>Attack</code> in the magazine cannot pay for <code>attack</code> in the note. Do not lowercase anything.</li><li>Whole words must match, which the word arrays already guarantee. Resist the urge to join and compare substrings.</li><li>Remember the required return values are the exact strings <code>Yes</code> and <code>No</code>, not booleans.</li></ul>",
    },
    "two-strings": {
      code:
        "function twoStrings(s1, s2) {\n" +
        "    const letters = new Set(s1);\n" +
        "    for (const ch of s2) {\n" +
        "        if (letters.has(ch)) return \"YES\";\n" +
        "    }\n" +
        "    return \"NO\";\n" +
        "}",
      explanation:
        "<p>Two strings share a common substring if and only if they share a common substring of length one, that is, a single character. Any longer shared substring necessarily contains shared characters, so checking characters is sufficient. Load the first string's characters into a <code>Set</code> and scan the second for any member.</p>" +
        "<p>That reduction is the entire interview: the moment you see it, the code is three lines, <b>O(n + m) time, O(1) space</b> in practice since the alphabet caps the set at 26 lowercase letters.</p>" +
        "<ul><li>The trap is taking &ldquo;substring&rdquo; literally and generating substrings of both strings to intersect them, which is exponential-feeling work (quadratic sets on each side) for a question that needs none of it.</li><li>Early-return on the first hit rather than intersecting whole sets; on long strings with an early common letter that saves the rest of the scan.</li><li>Mind the required output strings: uppercase <code>YES</code> / <code>NO</code> here, unlike Ransom Note's <code>Yes</code> / <code>No</code>.</li></ul>",
    },
    "longest-substring-without-repeating": {
      code:
        "function lengthOfLongestSubstring(s) {\n" +
        "    const lastSeen = new Map(); // char -> most recent index\n" +
        "    let start = 0;\n" +
        "    let best = 0;\n" +
        "    for (let i = 0; i < s.length; i++) {\n" +
        "        const ch = s[i];\n" +
        "        if (lastSeen.has(ch) && lastSeen.get(ch) >= start) {\n" +
        "            start = lastSeen.get(ch) + 1; // jump past the duplicate\n" +
        "        }\n" +
        "        lastSeen.set(ch, i);\n" +
        "        best = Math.max(best, i - start + 1);\n" +
        "    }\n" +
        "    return best;\n" +
        "}",
      explanation:
        "<p>Classic sliding window. Maintain a window <code>[start, i]</code> that never contains a repeated character, plus a <code>Map</code> from character to its most recent index. When the incoming character <code>s[i]</code> was already seen <em>inside</em> the window, snap <code>start</code> forward to one past that previous occurrence; the window stays valid without ever re-scanning. Track the best <code>i - start + 1</code> along the way.</p>" +
        "<p>The jump version is idiomatic because <code>start</code> moves directly to where it must be, keeping the whole thing a single pass: <b>O(n) time, O(min(n, alphabet)) space</b>.</p>" +
        "<ul><li>The critical guard is <code>lastSeen.get(ch) &gt;= start</code>. Without it, a stale occurrence <em>behind</em> the window drags <code>start</code> backward &mdash; the exact bug the test case <code>tmmzuxt</code> (answer 5) is designed to catch, via the second <code>t</code> whose first occurrence is long expired.</li><li>Remember the empty string: the loop never runs and <code>best</code> stays 0, which is correct.</li></ul>",
    },
    "sherlock-and-anagrams": {
      code:
        "function sherlockAndAnagrams(s) {\n" +
        "    const groups = new Map(); // sorted-letter signature -> substring count\n" +
        "    for (let len = 1; len < s.length; len++) {\n" +
        "        for (let i = 0; i + len <= s.length; i++) {\n" +
        "            const sig = s.slice(i, i + len).split(\"\").sort().join(\"\");\n" +
        "            groups.set(sig, (groups.get(sig) || 0) + 1);\n" +
        "        }\n" +
        "    }\n" +
        "    let pairs = 0;\n" +
        "    groups.forEach(function (count) { pairs += (count * (count - 1)) / 2; });\n" +
        "    return pairs;\n" +
        "}",
      explanation:
        "<p>Two substrings are anagrams exactly when they have the same letters in the same quantities, so give every substring a canonical signature &mdash; its characters sorted &mdash; and bucket-count signatures. If a signature occurs <code>k</code> times, it contributes <code>k * (k - 1) / 2</code> unordered pairs; sum that over all buckets.</p>" +
        "<p>This is the idiomatic &ldquo;canonicalize then count pairs&rdquo; pattern: it replaces comparing all substring pairs (O(n&#8308;) comparisons) with independent bucketing. With n &le; 100 on the real problem, the O(n&sup2;) substrings each sorted in O(n log n) is comfortably fast; space is the number of distinct signatures.</p>" +
        "<ul><li>The counting trap: sum <code>C(k, 2)</code> per bucket, not <code>k - 1</code> or <code>k</code>. <code>kkkk</code> has five buckets of sizes 4, 3, 2 (per length) yielding 6 + 3 + 1 = 10.</li><li>Only compare substrings of the same length &mdash; the signature does this implicitly, since sorted strings of different lengths can never collide.</li><li>Exclude the full string itself as a pair partner? No exclusion needed: pairs are between <em>different positions</em>, handled naturally.</li></ul>",
    },
    "new-year-chaos": {
      code:
        "function minimumBribes(q) {\n" +
        "    let bribes = 0;\n" +
        "    for (let i = 0; i < q.length; i++) {\n" +
        "        if (q[i] - (i + 1) > 2) return \"Too chaotic\";\n" +
        "        // anyone who could have overtaken q[i] started at most one\n" +
        "        // spot ahead of q[i]'s original position\n" +
        "        for (let j = Math.max(0, q[i] - 2); j < i; j++) {\n" +
        "            if (q[j] > q[i]) bribes++;\n" +
        "        }\n" +
        "    }\n" +
        "    return bribes;\n" +
        "}",
      explanation:
        "<p>Person with sticker <code>q[i]</code> started at position <code>q[i]</code> and now stands at position <code>i + 1</code>. Since each bribe moves someone exactly one spot forward, anyone displaced forward by more than two spots is impossible: return <code>Too chaotic</code> immediately when <code>q[i] - (i + 1) &gt; 2</code>.</p>" +
        "<p>Otherwise, the bribes that happened <em>to</em> person <code>q[i]</code> equal the count of larger stickers now standing in front of them. The key optimization: anyone who overtook <code>q[i]</code> can end up no earlier than one position ahead of <code>q[i]</code>'s starting spot, so the inner scan starts at <code>Math.max(0, q[i] - 2)</code> instead of 0, making the loop nearly linear in practice instead of O(n&sup2;).</p>" +
        "<ul><li>The trap is scanning from index 0 for every person, which times out on the real judge's large inputs.</li><li>Check the chaotic condition <em>before</em> counting, and remember the answer for a fully sorted queue is 0, not an error.</li></ul>",
    },
    "minimum-swaps-2": {
      code:
        "function minimumSwaps(arr) {\n" +
        "    const a = arr.slice();\n" +
        "    let swaps = 0;\n" +
        "    for (let i = 0; i < a.length; i++) {\n" +
        "        while (a[i] !== i + 1) {\n" +
        "            const home = a[i] - 1; // where a[i] belongs\n" +
        "            const tmp = a[home];\n" +
        "            a[home] = a[i];\n" +
        "            a[i] = tmp;\n" +
        "            swaps++;\n" +
        "        }\n" +
        "    }\n" +
        "    return swaps;\n" +
        "}",
      explanation:
        "<p>Because the array is a permutation of <code>1..n</code>, every value's home index is <code>value - 1</code>. The selection-style loop puts each position right with direct swaps: while <code>a[i]</code> is not <code>i + 1</code>, swap it into its home slot. Every such swap places at least one element permanently, so the total swap count is minimal &mdash; it equals <code>n</code> minus the number of cycles in the permutation, which is the theoretical floor.</p>" +
        "<p>This cycle-chasing shape is idiomatic for permutation problems: <b>O(n) time overall</b> (each element is swapped into place at most once) and <b>O(n) space</b> only for the defensive copy; do it in place if mutation is acceptable.</p>" +
        "<ul><li>The trap is treating this as generic sorting and reaching for bubble-sort swap counting, which both overcounts (bubble swaps are adjacent-only) and runs O(n&sup2;).</li><li>The inner <code>while</code> looks quadratic but is amortized O(1) per element &mdash; a favorite follow-up question, so be ready to argue it.</li></ul>",
    },
    "array-manipulation": {
      code:
        "function arrayManipulation(n, queries) {\n" +
        "    const diff = new Array(n + 2).fill(0);\n" +
        "    for (const [a, b, k] of queries) {\n" +
        "        diff[a] += k;\n" +
        "        diff[b + 1] -= k;\n" +
        "    }\n" +
        "    let running = 0;\n" +
        "    let max = 0;\n" +
        "    for (let i = 1; i <= n; i++) {\n" +
        "        running += diff[i];\n" +
        "        if (running > max) max = running;\n" +
        "    }\n" +
        "    return max;\n" +
        "}",
      explanation:
        "<p>Instead of adding <code>k</code> to every cell of each range &mdash; O(n) per query, O(nm) overall, guaranteed timeout &mdash; record only where each range <em>starts</em> and <em>stops</em>: <code>diff[a] += k</code> and <code>diff[b + 1] -= k</code>. A final prefix-sum sweep reconstructs every cell's true value in order, and the answer is the running maximum during that sweep.</p>" +
        "<p>This difference-array technique is the canonical trick for stacked range updates with a single read at the end: <b>O(n + m) time, O(n) space</b>. It generalizes to calendar overlaps, seat bookings, and histogram painting, so it is worth owning cold.</p>" +
        "<ul><li>The classic off-by-one: the subtraction goes at <code>b + 1</code> (the first index <em>past</em> the range), which is why the array is sized <code>n + 2</code> &mdash; queries are 1-indexed and <code>b</code> can be <code>n</code>.</li><li>Use the running sum itself for the maximum; never materialize then re-scan. On the real constraints values overflow 32-bit, which JavaScript numbers absorb silently.</li></ul>",
    },
    "flatten-nested-array": {
      code:
        "function flatten(arr) {\n" +
        "    const out = [];\n" +
        "    for (const item of arr) {\n" +
        "        if (Array.isArray(item)) {\n" +
        "            out.push.apply(out, flatten(item));\n" +
        "        } else {\n" +
        "            out.push(item);\n" +
        "        }\n" +
        "    }\n" +
        "    return out;\n" +
        "}",
      explanation:
        "<p>Recursion mirrors the data: an array's flattening is each element, where plain values pass through and nested arrays contribute their own flattening, spliced in order. The <code>Array.isArray</code> test is the branch point, and <code>out.push.apply(out, ...)</code> (or a spread) splices child results without creating intermediate nesting.</p>" +
        "<p>This shape is idiomatic because arbitrary depth is exactly what recursion expresses; total work is <b>O(total elements) time and space</b>, with recursion depth equal to the maximum nesting depth.</p>" +
        "<ul><li>Interviews usually forbid the built-in <code>arr.flat(Infinity)</code> &mdash; know it exists, mention it, then write the manual version anyway.</li><li>Preserve left-to-right order; approaches that pop from a stack naively reverse segments.</li><li>Mind the edge cases in the tests: an empty outer array returns <code>[]</code>, and empty inner arrays like <code>[1, [], 3]</code> contribute nothing rather than <code>undefined</code>.</li><li>For extreme depth an explicit stack avoids call-stack overflow &mdash; a good follow-up answer, not needed here.</li></ul>",
    },
    "arrays-left-rotation": {
      code:
        "function rotLeft(a, d) {\n" +
        "    const shift = d % a.length;\n" +
        "    return a.slice(shift).concat(a.slice(0, shift));\n" +
        "}",
      explanation:
        "<p>Rotating left by <code>d</code> just splits the array at index <code>d</code> and swaps the halves: everything from <code>d</code> onward comes first, followed by the first <code>d</code> elements. <code>slice</code> + <code>concat</code> says exactly that in one line, immutably.</p>" +
        "<p>This is idiomatic JavaScript because index juggling is where rotation bugs live, and slicing eliminates the indexes entirely. It is <b>O(n) time and space</b> &mdash; and O(n) is unavoidable for producing a rotated copy, so nothing is lost over clever in-place tricks.</p>" +
        "<ul><li>Take <code>d % a.length</code> first. Rotating by exactly the length (as one test does) must return the array unchanged, and without the modulo, larger <code>d</code> slices out of range and produces garbage halves.</li><li>The naive alternative &mdash; shift-and-push one step, <code>d</code> times &mdash; is O(n&middot;d) and times out on the real judge's big inputs.</li><li>If asked for O(1) extra space, the three-reversal trick (reverse each half, then reverse the whole) is the expected answer.</li></ul>",
    },
    "2d-array-hourglass": {
      code:
        "function hourglassSum(arr) {\n" +
        "    let best = -Infinity;\n" +
        "    for (let r = 0; r <= 3; r++) {\n" +
        "        for (let c = 0; c <= 3; c++) {\n" +
        "            const sum =\n" +
        "                arr[r][c] + arr[r][c + 1] + arr[r][c + 2] +\n" +
        "                arr[r + 1][c + 1] +\n" +
        "                arr[r + 2][c] + arr[r + 2][c + 1] + arr[r + 2][c + 2];\n" +
        "            if (sum > best) best = sum;\n" +
        "        }\n" +
        "    }\n" +
        "    return best;\n" +
        "}",
      explanation:
        "<p>In a 6&times;6 grid an hourglass is fully determined by its top-left cell, and that cell can only range over rows 0&ndash;3 and columns 0&ndash;3, giving exactly 16 hourglasses. Enumerate them with two loops, sum the seven cells with explicit offsets, and keep the maximum: <b>O(1) work</b> for the fixed grid (16 &times; 7 additions), constant space.</p>" +
        "<p>Writing the seven offsets literally, laid out to <em>look</em> like an hourglass, is the idiomatic move here &mdash; it is self-documenting and leaves nowhere for index arithmetic to hide.</p>" +
        "<ul><li>The trap that catches most people: initialize the best sum to <code>-Infinity</code>, not 0. Grid values can be negative &mdash; the all-negatives test exists precisely to fail the zero-initialized version, whose answer must be -7.</li><li>The second trap is the middle row: it contributes only its center cell <code>arr[r+1][c+1]</code>, not three cells.</li><li>Off-by-one on the loop bounds (<code>&lt;= 3</code>, not <code>&lt; 3</code>) silently drops the last row and column of hourglasses.</li></ul>",
    },
    "balanced-brackets": {
      code:
        "function isBalanced(s) {\n" +
        "    const closerFor = { \"(\": \")\", \"[\": \"]\", \"{\": \"}\" };\n" +
        "    const stack = [];\n" +
        "    for (const ch of s) {\n" +
        "        if (closerFor[ch]) {\n" +
        "            stack.push(closerFor[ch]);\n" +
        "        } else if (stack.pop() !== ch) {\n" +
        "            return \"NO\";\n" +
        "        }\n" +
        "    }\n" +
        "    return stack.length === 0 ? \"YES\" : \"NO\";\n" +
        "}",
      explanation:
        "<p>A stack models bracket nesting perfectly: openers push, closers must match the most recent unclosed opener. The elegant refinement here is pushing the <em>expected closer</em> (<code>)</code> for <code>(</code>, etc.) instead of the opener itself &mdash; then every closer is handled by one comparison, <code>stack.pop() !== ch</code>, with no lookup table at match time.</p>" +
        "<p>The string is balanced only if every closer matched <em>and</em> the stack finishes empty. Complexity: <b>O(n) time, O(n) space</b> worst case (all openers).</p>" +
        "<ul><li>Trap one: forgetting the final emptiness check &mdash; <code>(((</code> never mismatches but is unbalanced.</li><li>Trap two: popping from an empty stack, as in <code>)(</code>. In JavaScript <code>[].pop()</code> returns <code>undefined</code>, which conveniently fails the comparison, but in stricter languages this is a crash &mdash; know why your version is safe.</li><li>Interleaving like <code>([)]</code> is rejected naturally: matching must be strictly last-in-first-out, which is the entire reason a stack, not counters per bracket type, is required.</li></ul>",
    },
    "mark-and-toys": {
      code:
        "function maximumToys(prices, k) {\n" +
        "    const sorted = prices.slice().sort(function (a, b) { return a - b; });\n" +
        "    let spent = 0;\n" +
        "    let toys = 0;\n" +
        "    for (const price of sorted) {\n" +
        "        if (spent + price > k) break;\n" +
        "        spent += price;\n" +
        "        toys++;\n" +
        "    }\n" +
        "    return toys;\n" +
        "}",
      explanation:
        "<p>To maximize the <em>count</em> of items under a spending cap, always buy cheapest-first: sort prices ascending and take toys until the next one would break the budget. The exchange argument proves optimality &mdash; any optimal selection can swap an expensive toy for an unused cheaper one without reducing the count, so the greedy prefix is as good as anything.</p>" +
        "<p>Sort-then-scan is the idiomatic shape: <b>O(n log n) time</b> for the sort, O(1) extra beyond the sorted copy. Copy with <code>slice()</code> before sorting &mdash; mutating an input the caller still owns is a code-review flag, and some graders reuse the array.</p>" +
        "<ul><li>The JavaScript-specific trap: <code>sort()</code> without a comparator sorts <em>lexicographically</em>, so <code>[111, 12, 5]</code> orders as 111, 12, 5. Always pass <code>(a, b) =&gt; a - b</code> for numbers.</li><li>Break on the first unaffordable toy rather than continuing to scan; after sorting, nothing later can be cheaper.</li><li>A budget smaller than every price must yield 0, which the loop handles naturally.</li></ul>",
    },
    "ice-cream-parlor": {
      code:
        "function icecreamParlor(m, arr) {\n" +
        "    const seen = new Map(); // cost -> earliest 1-based index\n" +
        "    for (let i = 0; i < arr.length; i++) {\n" +
        "        const need = m - arr[i];\n" +
        "        if (seen.has(need)) return [seen.get(need), i + 1];\n" +
        "        if (!seen.has(arr[i])) seen.set(arr[i], i + 1);\n" +
        "    }\n" +
        "    return [];\n" +
        "}",
      explanation:
        "<p>This is Two Sum wearing an ice-cream costume, with two twists: indices are <b>1-based</b>, and the two flavors must be distinct <em>purchases</em> (different indices, prices may be equal). One pass with a <code>Map</code> from price to its earliest 1-based index does it: for each flavor check whether its complement <code>m - cost</code> was already seen; if so, the stored index is necessarily the smaller one and the pair is found.</p>" +
        "<p>Checking before inserting is what makes the duplicate case work &mdash; with <code>m = 4</code> and prices <code>[2, 2, ...]</code>, the second 2 finds the first in the map and returns <code>[1, 2]</code>. Complexity: <b>O(n) time, O(n) space</b>.</p>" +
        "<ul><li>Trap one: returning 0-based indices &mdash; the graders want positions starting at 1.</li><li>Trap two: only store a price's <em>first</em> index (<code>if (!seen.has(...))</code>), so answers prefer the earliest valid pair.</li><li>The sorted two-pointer alternative costs O(n log n) and then has to recover original indices &mdash; strictly worse here.</li></ul>",
    },
    "climbing-the-leaderboard": {
      code:
        "function climbingLeaderboard(ranked, player) {\n" +
        "    const unique = [];\n" +
        "    for (const score of ranked) {\n" +
        "        if (unique.length === 0 || unique[unique.length - 1] !== score) unique.push(score);\n" +
        "    }\n" +
        "    const result = [];\n" +
        "    let i = unique.length - 1; // walk up from the lowest score\n" +
        "    for (const score of player) {\n" +
        "        while (i >= 0 && score >= unique[i]) i--;\n" +
        "        result.push(i + 2);\n" +
        "    }\n" +
        "    return result;\n" +
        "}",
      explanation:
        "<p>Dense ranking means equal scores share one rank, so first collapse <code>ranked</code> (already sorted descending) into its distinct values. The insight that makes this fast: the player's scores are <b>non-decreasing</b>, so a single pointer can start at the bottom of the distinct list and only ever move upward across all queries. For each score, advance the pointer past every leaderboard value the player now meets or beats; the rank is then <code>pointer + 2</code> (everything still strictly above, plus one).</p>" +
        "<p>This two-pointer merge is <b>O(n + m)</b> after the O(n) dedupe &mdash; versus O(m log n) for per-query binary search (also acceptable) or O(nm) for rescanning, which times out.</p>" +
        "<ul><li>The trap is forgetting to deduplicate: with <code>[100, 100, 50]</code>, a 50 ties for rank 2, not rank 3.</li><li>Beating the top score must produce rank 1 &mdash; that is the pointer running off the end at -1, hence the <code>+ 2</code>.</li><li>Ties use <code>&gt;=</code>: matching a score means sharing its rank.</li></ul>",
    },
    "best-time-to-buy-sell-stock": {
      code:
        "function maxProfit(prices) {\n" +
        "    let cheapest = Infinity;\n" +
        "    let best = 0;\n" +
        "    for (const price of prices) {\n" +
        "        if (price < cheapest) {\n" +
        "            cheapest = price;\n" +
        "        } else if (price - cheapest > best) {\n" +
        "            best = price - cheapest;\n" +
        "        }\n" +
        "    }\n" +
        "    return best;\n" +
        "}",
      explanation:
        "<p>One transaction, buy before sell: track the cheapest price seen so far and, at each day, the profit from selling today against that floor. A single pass keeping <code>cheapest</code> and <code>best</code> answers it: every day either lowers the floor or offers a sell candidate, never both usefully at once &mdash; hence the <code>if / else if</code>.</p>" +
        "<p>This is the canonical warm-up for the &ldquo;running extremum&rdquo; family of scans: <b>O(n) time, O(1) space</b>, no lookahead, no DP table. It also generalizes cleanly (max drawdown, best pair with j &gt; i), which is why interviewers love it.</p>" +
        "<ul><li>The trap is computing <code>max(prices) - min(prices)</code> &mdash; on <code>[7, 6, 4, 3, 1]</code> the max comes <em>before</em> the min, and the true answer is 0. Order matters; the floor must precede the sale.</li><li>Return 0, not negative, when prices only fall: not trading is allowed.</li><li>Initialize the floor to <code>Infinity</code> so the first day sets it without a special case.</li></ul>",
    },
    "merge-intervals": {
      code:
        "function merge(intervals) {\n" +
        "    const sorted = intervals.slice().sort(function (a, b) { return a[0] - b[0]; });\n" +
        "    const out = [];\n" +
        "    for (const [start, end] of sorted) {\n" +
        "        const last = out[out.length - 1];\n" +
        "        if (last && start <= last[1]) {\n" +
        "            last[1] = Math.max(last[1], end); // overlap (or touch) — extend\n" +
        "        } else {\n" +
        "            out.push([start, end]);\n" +
        "        }\n" +
        "    }\n" +
        "    return out;\n" +
        "}",
      explanation:
        "<p>Sort by start, then sweep once: each interval either overlaps the last merged one (its start is at or before that interval's end) and extends it, or begins a new group. Sorting is what makes a single forward pass sufficient &mdash; after it, all members of a mergeable group are adjacent.</p>" +
        "<p>Complexity is <b>O(n log n)</b> for the sort plus O(n) for the sweep, O(n) output space. Mutating <code>last[1]</code> in place on the output list, rather than re-pushing, is the idiomatic sweep shape.</p>" +
        "<ul><li>Trap one: extend with <code>Math.max(last[1], end)</code>, never plain <code>end</code> &mdash; a contained interval like <code>[3, 4]</code> inside <code>[1, 10]</code> must not shrink the group.</li><li>Trap two: touching counts. <code>[1, 4]</code> and <code>[4, 5]</code> merge to <code>[1, 5]</code>, so the overlap test is <code>start &lt;= last[1]</code>, not <code>&lt;</code>.</li><li>Copy before sorting (<code>slice()</code>): <code>sort</code> mutates, and graders may reuse the input.</li><li>Do not forget the sort comparator &mdash; default string ordering scrambles numeric starts.</li></ul>",
    },
    "trapping-rain-water": {
      code:
        "function trap(height) {\n" +
        "    let left = 0;\n" +
        "    let right = height.length - 1;\n" +
        "    let leftMax = 0;\n" +
        "    let rightMax = 0;\n" +
        "    let water = 0;\n" +
        "    while (left < right) {\n" +
        "        if (height[left] < height[right]) {\n" +
        "            leftMax = Math.max(leftMax, height[left]);\n" +
        "            water += leftMax - height[left];\n" +
        "            left++;\n" +
        "        } else {\n" +
        "            rightMax = Math.max(rightMax, height[right]);\n" +
        "            water += rightMax - height[right];\n" +
        "            right--;\n" +
        "        }\n" +
        "    }\n" +
        "    return water;\n" +
        "}",
      explanation:
        "<p>Water above any bar is <code>min(maxLeft, maxRight) - height</code>, where the maxes are the tallest bars to each side. The two-pointer form computes this without the two prefix arrays: walk inward from both ends, always advancing the side with the <em>shorter</em> current bar. That comparison is the proof burden &mdash; if <code>height[left] &lt; height[right]</code>, then some bar at least as tall as <code>height[right]</code> exists to the left pointer's right, so <code>leftMax</code> alone decides the water on that column, no lookahead needed.</p>" +
        "<p>Result: <b>O(n) time, O(1) space</b>, versus O(n) extra for the classic prefix-max/suffix-max version (also fine to present first, then optimize).</p>" +
        "<ul><li>The trap is trying to sum &ldquo;puddles&rdquo; between peaks geometrically &mdash; column-by-column accounting is what keeps the logic simple.</li><li>Add <code>leftMax - height[left]</code> <em>after</em> raising <code>leftMax</code>; ordering those two lines wrong yields negative contributions on rising terrain.</li><li>Monotonic edges (all rising, all falling) must give 0, which falls out naturally.</li></ul>",
    },
    "largest-rectangle": {
      code:
        "function largestRectangle(h) {\n" +
        "    const stack = []; // indexes of bars with increasing heights\n" +
        "    let best = 0;\n" +
        "    for (let i = 0; i <= h.length; i++) {\n" +
        "        const current = i === h.length ? 0 : h[i]; // sentinel flushes the stack\n" +
        "        while (stack.length && h[stack[stack.length - 1]] >= current) {\n" +
        "            const height = h[stack.pop()];\n" +
        "            const leftEdge = stack.length ? stack[stack.length - 1] + 1 : 0;\n" +
        "            best = Math.max(best, height * (i - leftEdge));\n" +
        "        }\n" +
        "        stack.push(i);\n" +
        "    }\n" +
        "    return best;\n" +
        "}",
      explanation:
        "<p>The monotonic stack solves this in one pass: keep a stack of bar indexes with non-decreasing heights. When the incoming bar is shorter, pop; the popped bar is now the <em>limiting height</em> of a rectangle whose right edge just closed at <code>i - 1</code>, and whose left edge is one past the new stack top (or 0 if the stack emptied). Width is <code>i - leftEdge</code>; take the max as you go.</p>" +
        "<p>Appending a virtual height-0 sentinel bar (the <code>i === h.length</code> branch) flushes every remaining bar through the same code path &mdash; the idiomatic way to avoid a duplicate drain loop. Each index is pushed and popped once: <b>O(n) time, O(n) space</b>.</p>" +
        "<ul><li>The trap is the O(n&sup2;) expand-around-each-bar approach &mdash; correct, passes small cases, times out on the real judge's 10&#8309; bars.</li><li>The width computation after a pop is the classic off-by-one nest; deriving it once (&ldquo;everything strictly between the new top and <code>i</code>&rdquo;) beats memorizing it.</li></ul>",
    },
    "fraudulent-activity-notifications": {
      code:
        "function activityNotifications(expenditure, d) {\n" +
        "    const counts = new Array(201).fill(0); // spending is bounded: 0..200\n" +
        "    for (let i = 0; i < d; i++) counts[expenditure[i]]++;\n" +
        "    function kthSmallest(k) {\n" +
        "        let seen = 0;\n" +
        "        for (let v = 0; v <= 200; v++) {\n" +
        "            seen += counts[v];\n" +
        "            if (seen >= k) return v;\n" +
        "        }\n" +
        "        return 0;\n" +
        "    }\n" +
        "    let notifications = 0;\n" +
        "    for (let i = d; i < expenditure.length; i++) {\n" +
        "        const twiceMedian = d % 2 === 1\n" +
        "            ? 2 * kthSmallest((d + 1) / 2)\n" +
        "            : kthSmallest(d / 2) + kthSmallest(d / 2 + 1);\n" +
        "        if (expenditure[i] >= twiceMedian) notifications++;\n" +
        "        counts[expenditure[i - d]]--; // slide the window\n" +
        "        counts[expenditure[i]]++;\n" +
        "    }\n" +
        "    return notifications;\n" +
        "}",
      explanation:
        "<p>The naive approach re-sorts a <code>d</code>-day window per day &mdash; O(n d log d) &mdash; and times out. The exploitable fact is the tiny value domain: daily spending is an integer 0..200. Keep a 201-slot counting array for the current window; the median (or both middle elements when <code>d</code> is even) is found by walking the counts to the k-th smallest, a &le;201-step scan. Sliding the window is two counter updates.</p>" +
        "<p>That yields <b>O(201 &middot; n) &asymp; O(n) time, O(1) space</b> &mdash; the intended solution on the real judge.</p>" +
        "<ul><li>Compare against <b>twice</b> the median without dividing: <code>2 &times; kth((d+1)/2)</code> for odd <code>d</code>, or <code>kth(d/2) + kth(d/2 + 1)</code> for even. This dodges the 0.5 fractional median entirely &mdash; the classic even-window bug.</li><li>Notification fires on <code>&gt;=</code>, not <code>&gt;</code>: spending exactly double the median counts.</li><li>Update the counts <em>after</em> evaluating day <code>i</code>; the window must contain only trailing days.</li></ul>",
    },
    "common-child": {
      code:
        "function commonChild(s1, s2) {\n" +
        "    // classic LCS with two rolling rows: O(n*m) time, O(m) space\n" +
        "    let prev = new Array(s2.length + 1).fill(0);\n" +
        "    for (let i = 1; i <= s1.length; i++) {\n" +
        "        const cur = new Array(s2.length + 1).fill(0);\n" +
        "        for (let j = 1; j <= s2.length; j++) {\n" +
        "            cur[j] = s1[i - 1] === s2[j - 1]\n" +
        "                ? prev[j - 1] + 1\n" +
        "                : Math.max(prev[j], cur[j - 1]);\n" +
        "        }\n" +
        "        prev = cur;\n" +
        "    }\n" +
        "    return prev[s2.length];\n" +
        "}",
      explanation:
        "<p>&ldquo;Common child&rdquo; is longest common subsequence in disguise: characters may be deleted but never reordered, which is the LCS definition. The DP: <code>cur[j]</code> holds the LCS length of <code>s1[0..i)</code> vs <code>s2[0..j)</code>. Matching characters extend the diagonal (<code>prev[j-1] + 1</code>); otherwise carry the better of dropping a character from either string (<code>max(prev[j], cur[j-1])</code>).</p>" +
        "<p>Keeping only two rolling rows is the idiomatic memory refinement: <b>O(n&middot;m) time</b> but <b>O(m) space</b> instead of the full quadratic table &mdash; at the real constraint of 5000&times;5000 the full table is 25M cells, so the rolling row matters.</p>" +
        "<ul><li>The classic confusion is substring vs subsequence: <code>ABAB</code> / <code>BABA</code> share no length-3 substring, yet their LCS is 3 (<code>ABA</code> or <code>BAB</code>).</li><li>Off-by-one discipline: the DP is indexed on prefix <em>lengths</em>, so compare <code>s1[i-1]</code> with <code>s2[j-1]</code>, and row/column 0 stays all zeros as the empty-prefix base case.</li></ul>",
    },
    "candies": {
      code:
        "function candies(n, arr) {\n" +
        "    const give = new Array(n).fill(1);\n" +
        "    for (let i = 1; i < n; i++) {\n" +
        "        if (arr[i] > arr[i - 1]) give[i] = give[i - 1] + 1;\n" +
        "    }\n" +
        "    for (let i = n - 2; i >= 0; i--) {\n" +
        "        if (arr[i] > arr[i + 1]) give[i] = Math.max(give[i], give[i + 1] + 1);\n" +
        "    }\n" +
        "    return give.reduce(function (a, b) { return a + b; }, 0);\n" +
        "}",
      explanation:
        "<p>Each child needs at least one candy, and any child rating higher than an <em>adjacent</em> child needs more than that neighbor. Two greedy sweeps compose the answer: a left-to-right pass enforces the rising constraint (<code>arr[i] &gt; arr[i-1]</code> means one more than the left neighbor), and a right-to-left pass enforces the falling constraint, taking <code>Math.max</code> with what the first pass already assigned so neither constraint is broken.</p>" +
        "<p>The max is the subtle part &mdash; a peak sits in both a rise and a fall, and taking the larger of its two requirements is what keeps both neighbors satisfied simultaneously. Each pass is linear: <b>O(n) time, O(n) space</b> for the allocation array.</p>" +
        "<ul><li>Equal neighbors carry <em>no</em> constraint: <code>[1, 2, 2]</code> lets the last child drop back to 1 candy (total 4). Adding a <code>&gt;=</code> check where <code>&gt;</code> belongs inflates every plateau.</li><li>Strictly decreasing input like <code>[5, 4, 3, 2, 1]</code> is the stress test for the backward pass: it must build 5+4+3+2+1 = 15.</li></ul>",
    },
    "rest-api-total-goals": {
      code:
        "async function getTotalGoals(team, year) {\n" +
        "    let total = 0;\n" +
        "    for (const side of [\"team1\", \"team2\"]) {\n" +
        "        let page = 1;\n" +
        "        let totalPages = 1;\n" +
        "        while (page <= totalPages) {\n" +
        "            const url = \"https://jsonmock.hackerrank.com/api/football_matches?year=\" + year +\n" +
        "                \"&\" + side + \"=\" + encodeURIComponent(team) + \"&page=\" + page;\n" +
        "            const res = await fetch(url);\n" +
        "            const body = await res.json();\n" +
        "            totalPages = body.total_pages;\n" +
        "            for (const match of body.data) {\n" +
        "                total += parseInt(match[side + \"goals\"], 10); // goals arrive as strings\n" +
        "            }\n" +
        "            page++;\n" +
        "        }\n" +
        "    }\n" +
        "    return total;\n" +
        "}\n" +
        "\n" +
        "/* ---- OFFLINE MIRROR of the real endpoint (do not modify) ---- */\n" +
        "const FOOTBALL_MATCHES = [\n" +
        "    { year: 2011, team1: \"Barcelona\", team2: \"Chelsea\",  team1goals: \"3\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Chelsea\",   team2: \"Barcelona\", team1goals: \"2\", team2goals: \"2\" },\n" +
        "    { year: 2011, team1: \"Barcelona\", team2: \"Bayern\",   team1goals: \"1\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Bayern\",    team2: \"Barcelona\", team1goals: \"0\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Chelsea\",   team2: \"Bayern\",   team1goals: \"2\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Bayern\",    team2: \"Chelsea\",  team1goals: \"3\", team2goals: \"3\" },\n" +
        "    { year: 2011, team1: \"Barcelona\", team2: \"Arsenal\",  team1goals: \"4\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Arsenal\",   team2: \"Barcelona\", team1goals: \"2\", team2goals: \"2\" },\n" +
        "    { year: 2011, team1: \"Chelsea\",   team2: \"Arsenal\",  team1goals: \"1\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Arsenal\",   team2: \"Chelsea\",  team1goals: \"0\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Bayern\",    team2: \"Arsenal\",  team1goals: \"5\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Arsenal\",   team2: \"Bayern\",   team1goals: \"1\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Barcelona\", team2: \"Chelsea\",  team1goals: \"2\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Chelsea\",   team2: \"Barcelona\", team1goals: \"1\", team2goals: \"3\" },\n" +
        "    { year: 2012, team1: \"Barcelona\", team2: \"Bayern\",   team1goals: \"0\", team2goals: \"4\" },\n" +
        "    { year: 2012, team1: \"Bayern\",    team2: \"Barcelona\", team1goals: \"2\", team2goals: \"0\" },\n" +
        "    { year: 2012, team1: \"Chelsea\",   team2: \"Bayern\",   team1goals: \"1\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Bayern\",    team2: \"Chelsea\",  team1goals: \"2\", team2goals: \"2\" },\n" +
        "    { year: 2012, team1: \"Barcelona\", team2: \"Arsenal\",  team1goals: \"1\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Arsenal\",   team2: \"Barcelona\", team1goals: \"0\", team2goals: \"3\" },\n" +
        "    { year: 2012, team1: \"Chelsea\",   team2: \"Arsenal\",  team1goals: \"2\", team2goals: \"0\" },\n" +
        "    { year: 2012, team1: \"Arsenal\",   team2: \"Chelsea\",  team1goals: \"1\", team2goals: \"2\" },\n" +
        "    { year: 2012, team1: \"Bayern\",    team2: \"Arsenal\",  team1goals: \"3\", team2goals: \"0\" },\n" +
        "    { year: 2012, team1: \"Arsenal\",   team2: \"Bayern\",   team1goals: \"0\", team2goals: \"0\" },\n" +
        "];\n" +
        "function mockFootballFetch(url) {\n" +
        "    const q = {};\n" +
        "    (url.split(\"?\")[1] || \"\").split(\"&\").forEach(function (kv) {\n" +
        "        const p = kv.split(\"=\");\n" +
        "        if (p[0]) q[p[0]] = decodeURIComponent(p[1] || \"\");\n" +
        "    });\n" +
        "    const hits = FOOTBALL_MATCHES.filter(function (m) {\n" +
        "        if (q.year !== undefined && String(m.year) !== q.year) return false;\n" +
        "        if (q.team1 !== undefined && m.team1 !== q.team1) return false;\n" +
        "        if (q.team2 !== undefined && m.team2 !== q.team2) return false;\n" +
        "        if (q.team1goals !== undefined && m.team1goals !== q.team1goals) return false;\n" +
        "        if (q.team2goals !== undefined && m.team2goals !== q.team2goals) return false;\n" +
        "        return true;\n" +
        "    });\n" +
        "    const per = 2;\n" +
        "    const page = Math.max(1, parseInt(q.page || \"1\", 10) || 1);\n" +
        "    const body = {\n" +
        "        page: page, per_page: per, total: hits.length,\n" +
        "        total_pages: Math.max(1, Math.ceil(hits.length / per)),\n" +
        "        data: hits.slice((page - 1) * per, page * per),\n" +
        "    };\n" +
        "    return new Promise(function (resolve) {\n" +
        "        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 5);\n" +
        "    });\n" +
        "}\n" +
        "const fetch = mockFootballFetch;",
      explanation:
        "<p>The team can appear on either side of a fixture, so you need <b>two query series</b>: <code>team1=&lt;team&gt;</code> summing <code>team1goals</code>, and <code>team2=&lt;team&gt;</code> summing <code>team2goals</code>. Each series is paginated, so loop: fetch a page, read <code>total_pages</code> from the response, keep going until you have them all. The <code>while (page &lt;= totalPages)</code> shape works because the first response overwrites the initial guess of 1.</p>" +
        "<ul><li>The trap that fails hidden tests: fetching only page 1. With <code>per_page = 2</code> here, most answers are spread across several pages by design.</li><li>Goal counts arrive as <b>strings</b> (<code>&quot;3&quot;</code>), exactly like the real jsonmock API &mdash; convert with <code>parseInt</code> before adding or you will concatenate text.</li><li>Await both steps: <code>fetch</code> and <code>res.json()</code> each return promises.</li></ul>" +
        "<p>The offline mirror below the function reproduces the real endpoint's contract byte for byte, so the same code works against the live URL in the actual certification.</p>",
    },
    "rest-api-num-drawn-matches": {
      code:
        "async function getNumDraws(year) {\n" +
        "    let draws = 0;\n" +
        "    for (let k = 0; k <= 10; k++) {\n" +
        "        const url = \"https://jsonmock.hackerrank.com/api/football_matches?year=\" + year +\n" +
        "            \"&team1goals=\" + k + \"&team2goals=\" + k + \"&page=1\";\n" +
        "        const res = await fetch(url);\n" +
        "        const body = await res.json();\n" +
        "        draws += body.total; // full filtered count — no pagination needed\n" +
        "    }\n" +
        "    return draws;\n" +
        "}\n" +
        "\n" +
        "/* ---- OFFLINE MIRROR of the real endpoint (do not modify) ---- */\n" +
        "const FOOTBALL_MATCHES = [\n" +
        "    { year: 2011, team1: \"Barcelona\", team2: \"Chelsea\",  team1goals: \"3\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Chelsea\",   team2: \"Barcelona\", team1goals: \"2\", team2goals: \"2\" },\n" +
        "    { year: 2011, team1: \"Barcelona\", team2: \"Bayern\",   team1goals: \"1\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Bayern\",    team2: \"Barcelona\", team1goals: \"0\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Chelsea\",   team2: \"Bayern\",   team1goals: \"2\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Bayern\",    team2: \"Chelsea\",  team1goals: \"3\", team2goals: \"3\" },\n" +
        "    { year: 2011, team1: \"Barcelona\", team2: \"Arsenal\",  team1goals: \"4\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Arsenal\",   team2: \"Barcelona\", team1goals: \"2\", team2goals: \"2\" },\n" +
        "    { year: 2011, team1: \"Chelsea\",   team2: \"Arsenal\",  team1goals: \"1\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Arsenal\",   team2: \"Chelsea\",  team1goals: \"0\", team2goals: \"0\" },\n" +
        "    { year: 2011, team1: \"Bayern\",    team2: \"Arsenal\",  team1goals: \"5\", team2goals: \"1\" },\n" +
        "    { year: 2011, team1: \"Arsenal\",   team2: \"Bayern\",   team1goals: \"1\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Barcelona\", team2: \"Chelsea\",  team1goals: \"2\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Chelsea\",   team2: \"Barcelona\", team1goals: \"1\", team2goals: \"3\" },\n" +
        "    { year: 2012, team1: \"Barcelona\", team2: \"Bayern\",   team1goals: \"0\", team2goals: \"4\" },\n" +
        "    { year: 2012, team1: \"Bayern\",    team2: \"Barcelona\", team1goals: \"2\", team2goals: \"0\" },\n" +
        "    { year: 2012, team1: \"Chelsea\",   team2: \"Bayern\",   team1goals: \"1\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Bayern\",    team2: \"Chelsea\",  team1goals: \"2\", team2goals: \"2\" },\n" +
        "    { year: 2012, team1: \"Barcelona\", team2: \"Arsenal\",  team1goals: \"1\", team2goals: \"1\" },\n" +
        "    { year: 2012, team1: \"Arsenal\",   team2: \"Barcelona\", team1goals: \"0\", team2goals: \"3\" },\n" +
        "    { year: 2012, team1: \"Chelsea\",   team2: \"Arsenal\",  team1goals: \"2\", team2goals: \"0\" },\n" +
        "    { year: 2012, team1: \"Arsenal\",   team2: \"Chelsea\",  team1goals: \"1\", team2goals: \"2\" },\n" +
        "    { year: 2012, team1: \"Bayern\",    team2: \"Arsenal\",  team1goals: \"3\", team2goals: \"0\" },\n" +
        "    { year: 2012, team1: \"Arsenal\",   team2: \"Bayern\",   team1goals: \"0\", team2goals: \"0\" },\n" +
        "];\n" +
        "function mockFootballFetch(url) {\n" +
        "    const q = {};\n" +
        "    (url.split(\"?\")[1] || \"\").split(\"&\").forEach(function (kv) {\n" +
        "        const p = kv.split(\"=\");\n" +
        "        if (p[0]) q[p[0]] = decodeURIComponent(p[1] || \"\");\n" +
        "    });\n" +
        "    const hits = FOOTBALL_MATCHES.filter(function (m) {\n" +
        "        if (q.year !== undefined && String(m.year) !== q.year) return false;\n" +
        "        if (q.team1 !== undefined && m.team1 !== q.team1) return false;\n" +
        "        if (q.team2 !== undefined && m.team2 !== q.team2) return false;\n" +
        "        if (q.team1goals !== undefined && m.team1goals !== q.team1goals) return false;\n" +
        "        if (q.team2goals !== undefined && m.team2goals !== q.team2goals) return false;\n" +
        "        return true;\n" +
        "    });\n" +
        "    const per = 2;\n" +
        "    const page = Math.max(1, parseInt(q.page || \"1\", 10) || 1);\n" +
        "    const body = {\n" +
        "        page: page, per_page: per, total: hits.length,\n" +
        "        total_pages: Math.max(1, Math.ceil(hits.length / per)),\n" +
        "        data: hits.slice((page - 1) * per, page * per),\n" +
        "    };\n" +
        "    return new Promise(function (resolve) {\n" +
        "        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 5);\n" +
        "    });\n" +
        "}\n" +
        "const fetch = mockFootballFetch;",
      explanation:
        "<p>The fast solution never touches <code>data</code> at all. The endpoint accepts <code>team1goals</code> and <code>team2goals</code> as filters, and every response carries <code>total</code> &mdash; the count of <em>all</em> matches satisfying the filter, independent of pagination. So ask eleven times, once per scoreline <code>k = 0..10</code>, for matches ending <code>k : k</code>, and sum the <code>total</code> fields. Eleven requests, zero page loops.</p>" +
        "<p>This is the pattern worth internalizing from the REST certification: <b>push filtering to the server and read aggregate fields</b> instead of downloading rows to inspect client-side. The brute-force version (paginate the whole year, compare goals in JS) also passes but is several times the code and the wall-clock time.</p>" +
        "<ul><li>The score range 0..10 is given by the problem's constraints on the real exam &mdash; do not guess a smaller cap.</li><li>Query values are strings on the wire; numeric <code>k</code> interpolates fine in the URL.</li><li>A year with no data simply yields totals of 0 &mdash; no special case needed.</li></ul>",
    },
    "rest-api-movie-titles": {
      code:
        "async function getMovieTitles(substr) {\n" +
        "    const titles = [];\n" +
        "    let page = 1;\n" +
        "    let totalPages = 1;\n" +
        "    while (page <= totalPages) {\n" +
        "        const url = \"https://jsonmock.hackerrank.com/api/movies/search/?Title=\" +\n" +
        "            encodeURIComponent(substr) + \"&page=\" + page;\n" +
        "        const res = await fetch(url);\n" +
        "        const body = await res.json();\n" +
        "        totalPages = body.total_pages;\n" +
        "        for (const movie of body.data) titles.push(movie.Title);\n" +
        "        page++;\n" +
        "    }\n" +
        "    return titles.sort();\n" +
        "}\n" +
        "\n" +
        "/* ---- OFFLINE MIRROR of the real endpoint (do not modify) ---- */\n" +
        "const MOVIE_ROWS = [\n" +
        "    { Title: \"Waterman\", Year: 2011, imdbID: \"tt1229340\" },\n" +
        "    { Title: \"Superman Returns\", Year: 2006, imdbID: \"tt0348150\" },\n" +
        "    { Title: \"Batman Begins\", Year: 2005, imdbID: \"tt0372784\" },\n" +
        "    { Title: \"Spiderman\", Year: 2002, imdbID: \"tt0145487\" },\n" +
        "    { Title: \"Iron Man\", Year: 2008, imdbID: \"tt0371746\" },\n" +
        "    { Title: \"The Matrix\", Year: 1999, imdbID: \"tt0133093\" },\n" +
        "    { Title: \"Inception\", Year: 2010, imdbID: \"tt1375666\" },\n" +
        "    { Title: \"Interstellar\", Year: 2014, imdbID: \"tt0816692\" },\n" +
        "    { Title: \"Gravity\", Year: 2013, imdbID: \"tt1454468\" },\n" +
        "    { Title: \"Arrival\", Year: 2016, imdbID: \"tt2543164\" },\n" +
        "    { Title: \"Manchester by the Sea\", Year: 2016, imdbID: \"tt4034228\" },\n" +
        "    { Title: \"Mandarin\", Year: 2018, imdbID: \"tt7excl01\" },\n" +
        "    { Title: \"Tenet\", Year: 2020, imdbID: \"tt6723592\" },\n" +
        "    { Title: \"Dune\", Year: 2021, imdbID: \"tt1160419\" },\n" +
        "    { Title: \"Parasite\", Year: 2019, imdbID: \"tt6751668\" },\n" +
        "];\n" +
        "function mockMoviesFetch(url) {\n" +
        "    const q = {};\n" +
        "    (url.split(\"?\")[1] || \"\").split(\"&\").forEach(function (kv) {\n" +
        "        const p = kv.split(\"=\");\n" +
        "        if (p[0]) q[p[0]] = decodeURIComponent(p[1] || \"\");\n" +
        "    });\n" +
        "    const t = (q.Title || \"\").toLowerCase();\n" +
        "    const hits = MOVIE_ROWS.filter(function (m) { return m.Title.toLowerCase().indexOf(t) !== -1; });\n" +
        "    const per = 3;\n" +
        "    const page = Math.max(1, parseInt(q.page || \"1\", 10) || 1);\n" +
        "    const body = {\n" +
        "        page: page, per_page: per, total: hits.length,\n" +
        "        total_pages: Math.max(1, Math.ceil(hits.length / per)),\n" +
        "        data: hits.slice((page - 1) * per, page * per),\n" +
        "    };\n" +
        "    return new Promise(function (resolve) {\n" +
        "        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 5);\n" +
        "    });\n" +
        "}\n" +
        "const fetch = mockMoviesFetch;",
      explanation:
        "<p>The warm-up pagination pattern: request page 1, learn <code>total_pages</code> from the response, then keep fetching until every page's <code>data</code> has contributed its <code>Title</code> values. Collect first, then <code>sort()</code> once at the end &mdash; the API returns rows in its own order, and sorting per page would only be thrown away by the next append.</p>" +
        "<p>The <code>while (page &lt;= totalPages)</code> loop with <code>totalPages</code> initialized to 1 is the idiomatic shape: the first iteration is also the discovery request, so there is no special-cased initial fetch.</p>" +
        "<ul><li>Plain <code>.sort()</code> (lexicographic) is what the grader expects here &mdash; note that capital-letter ordering matters and <code>Manchester by the Sea</code> precedes <code>The Matrix</code>.</li><li><code>encodeURIComponent</code> the substring; search terms with spaces or symbols break the query string otherwise.</li><li>No matches must return <code>[]</code>, which falls out naturally &mdash; one page with empty <code>data</code>.</li><li>Sequential awaits are fine at this scale; mention <code>Promise.all</code> over the known page range as the parallel refinement.</li></ul>",
    },
    "backend-rest-router": {
      code:
        "function processRequests(requests) {\n" +
        "    const items = [];\n" +
        "    let nextId = 1;\n" +
        "    const responses = [];\n" +
        "    for (const req of requests) {\n" +
        "        const qIndex = req.path.indexOf(\"?\");\n" +
        "        const path = qIndex === -1 ? req.path : req.path.slice(0, qIndex);\n" +
        "        const query = {};\n" +
        "        if (qIndex !== -1) {\n" +
        "            for (const pair of req.path.slice(qIndex + 1).split(\"&\")) {\n" +
        "                const kv = pair.split(\"=\");\n" +
        "                if (kv[0]) query[kv[0]] = decodeURIComponent(kv[1] || \"\");\n" +
        "            }\n" +
        "        }\n" +
        "        const idMatch = path.match(/^\\/items\\/(\\d+)$/);\n" +
        "        if (req.method === \"POST\" && path === \"/items\") {\n" +
        "            const b = req.body || {};\n" +
        "            const valid = typeof b.name === \"string\" && b.name.length > 0 &&\n" +
        "                typeof b.price === \"number\" && b.price >= 0;\n" +
        "            if (valid) {\n" +
        "                const item = { id: nextId++, name: b.name, price: b.price };\n" +
        "                items.push(item);\n" +
        "                responses.push({ status: 201, body: { id: item.id, name: item.name, price: item.price } });\n" +
        "            } else {\n" +
        "                responses.push({ status: 400, body: { error: \"invalid item\" } });\n" +
        "            }\n" +
        "        } else if (req.method === \"GET\" && path === \"/items\") {\n" +
        "            let list = items;\n" +
        "            if (query.minPrice !== undefined) {\n" +
        "                const min = parseFloat(query.minPrice);\n" +
        "                list = list.filter(function (it) { return it.price >= min; });\n" +
        "            }\n" +
        "            responses.push({\n" +
        "                status: 200,\n" +
        "                body: list.map(function (it) { return { id: it.id, name: it.name, price: it.price }; }),\n" +
        "            });\n" +
        "        } else if (req.method === \"GET\" && idMatch) {\n" +
        "            const found = items.find(function (it) { return it.id === Number(idMatch[1]); });\n" +
        "            if (found) {\n" +
        "                responses.push({ status: 200, body: { id: found.id, name: found.name, price: found.price } });\n" +
        "            } else {\n" +
        "                responses.push({ status: 404, body: { error: \"not found\" } });\n" +
        "            }\n" +
        "        } else if (req.method === \"DELETE\" && idMatch) {\n" +
        "            const at = items.findIndex(function (it) { return it.id === Number(idMatch[1]); });\n" +
        "            if (at !== -1) {\n" +
        "                items.splice(at, 1);\n" +
        "                responses.push({ status: 204, body: null });\n" +
        "            } else {\n" +
        "                responses.push({ status: 404, body: { error: \"not found\" } });\n" +
        "            }\n" +
        "        } else {\n" +
        "            responses.push({ status: 404, body: { error: \"not found\" } });\n" +
        "        }\n" +
        "    }\n" +
        "    return responses;\n" +
        "}",
      explanation:
        "<p>This grades API <em>judgment</em> more than code: correct status codes, validation that rejects without side effects, and ids that never recycle. The structure is a tiny router &mdash; split the query string off the path, regex-match <code>/items/&lt;id&gt;</code>, then branch on method + shape, appending one response per request.</p>" +
        "<ul><li><b>Status discipline:</b> 201 for created (not 200), 204 with a <code>null</code> body for deletes, 400 for bad input, 404 for everything unrecognized &mdash; wrong method, unknown collection, or missing id.</li><li><b>Validation before mutation:</b> a rejected POST must not consume an id. Incrementing <code>nextId</code> eagerly and rolling back is the bug the third sample-case POST is designed to expose &mdash; the next valid item must be id 3, not 5.</li><li><b>Ids are monotonic, never reused:</b> after deleting item 1, a new POST creates id 2. Deriving ids from <code>items.length</code> breaks the moment anything is deleted.</li><li>Filtering (<code>minPrice</code>) happens on read, returning copies rather than internal state.</li></ul>" +
        "<p>Everything is O(1) or O(n) per request &mdash; performance is irrelevant here; correctness of the contract is the entire score.</p>",
    },
    "backend-rate-limiter": {
      code:
        "function rateLimiter(limit, windowMs, requests) {\n" +
        "    const logs = new Map(); // clientId -> allowed timestamps still in window\n" +
        "    return requests.map(function (request) {\n" +
        "        const client = request[0];\n" +
        "        const t = request[1];\n" +
        "        let log = logs.get(client);\n" +
        "        if (!log) {\n" +
        "            log = [];\n" +
        "            logs.set(client, log);\n" +
        "        }\n" +
        "        // half-open window (t - windowMs, t]: entries at exactly t - windowMs expire\n" +
        "        while (log.length && log[0] <= t - windowMs) log.shift();\n" +
        "        if (log.length < limit) {\n" +
        "            log.push(t); // only ALLOWED requests occupy the window\n" +
        "            return true;\n" +
        "        }\n" +
        "        return false;\n" +
        "    });\n" +
        "}",
      explanation:
        "<p>This is the <b>sliding log</b> limiter: per client, keep the timestamps of previously <em>allowed</em> requests, prune entries that have aged out, and allow the new request only if fewer than <code>limit</code> remain. Requests arrive in time order, so pruning from the front of each client's array is enough &mdash; no sorting, no re-scanning.</p>" +
        "<p>Two contract details carry all the test cases:</p>" +
        "<ul><li><b>Only allowed requests occupy the window.</b> A rejected request is not recorded &mdash; otherwise a client hammering the API could lock itself out forever. This is how Redis-style sliding-log limiters behave in production.</li><li><b>The window is half-open, <code>(t - windowMs, t]</code>:</b> a request exactly <code>windowMs</code> old has expired, hence the prune condition <code>log[0] &lt;= t - windowMs</code>. The second sample case (limit 1, window 500, hits at 0/499/500/501) exists purely to pin this boundary down.</li></ul>" +
        "<p>Clients are isolated via a <code>Map</code> of independent logs, so one noisy client cannot throttle another. Work is amortized <b>O(1) per request</b> (each timestamp is pushed and shifted at most once); space is O(limit) per active client.</p>",
    },
    "react-counter": {
      code:
        "function App() {\n" +
        "    const [count, setCount] = React.useState(0);\n" +
        "\n" +
        "    return (\n" +
        "        <div className=\"counter\">\n" +
        "            <h1 data-testid=\"count\">{count}</h1>\n" +
        "            <button data-testid=\"decrement\" onClick={() => setCount(count - 1)}>-</button>\n" +
        "            <button data-testid=\"increment\" onClick={() => setCount(count + 1)}>+</button>\n" +
        "            <button data-testid=\"reset\" onClick={() => setCount(0)}>Reset</button>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>One piece of state, three writers. <code>useState(0)</code> holds the count, and each button's <code>onClick</code> is a one-line arrow that calls the setter: <code>count + 1</code>, <code>count - 1</code>, or the constant 0 for reset. The display stays a pure projection of state &mdash; React re-renders the <code>h1</code> whenever the setter fires, so there is no DOM to touch by hand.</p>" +
        "<p>This is the idiomatic minimal component: no effects, no refs, no derived state. Reading <code>count</code> from the render closure is fine here because each click is a single update; if a handler updated twice in one event you would switch to the functional form <code>setCount(c =&gt; c + 1)</code> so the second update sees the first.</p>" +
        "<ul><li>The trap for beginners is mutating a variable (<code>count++</code>) or writing <code>textContent</code> directly &mdash; neither triggers a re-render.</li><li>Keep the <code>data-testid</code> attributes intact; graders target them, not button labels.</li><li>Negative counts are allowed by the spec, so do not clamp the decrement.</li></ul>",
    },
    "react-item-list-manager": {
      code:
        "function App() {\n" +
        "    const [items, setItems] = React.useState([]);\n" +
        "    const [text, setText] = React.useState(\"\");\n" +
        "\n" +
        "    const addItem = () => {\n" +
        "        const trimmed = text.trim();\n" +
        "        if (!trimmed) return; // ignore empty / whitespace-only input\n" +
        "        setItems([...items, trimmed]);\n" +
        "        setText(\"\");\n" +
        "    };\n" +
        "\n" +
        "    return (\n" +
        "        <div>\n" +
        "            <input\n" +
        "                data-testid=\"item-input\"\n" +
        "                placeholder=\"Enter item\"\n" +
        "                value={text}\n" +
        "                onChange={(e) => setText(e.target.value)}\n" +
        "            />\n" +
        "            <button data-testid=\"add-button\" onClick={addItem}>Add</button>\n" +
        "            <ul data-testid=\"item-list\">\n" +
        "                {items.map((item, i) => (\n" +
        "                    <li key={i}>{item}</li>\n" +
        "                ))}\n" +
        "            </ul>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>Two pieces of state: the list and the input's current text. The input is <b>controlled</b> &mdash; <code>value={text}</code> plus an <code>onChange</code> that mirrors every keystroke into state &mdash; which is what lets the Add handler read the current text synchronously and clear it afterward by setting state to an empty string.</p>" +
        "<p>The add handler does three things in order: trim, guard, append. <code>text.trim()</code> handles the whitespace-only rule with the same check as the empty rule; appending with a spread (<code>[...items, trimmed]</code>) keeps state updates immutable, which is how React knows to re-render the list.</p>" +
        "<ul><li>The classic trap is a half-controlled input: setting <code>value</code> without <code>onChange</code> freezes typing, while <code>onChange</code> without <code>value</code> means clearing after Add does not clear the visible field &mdash; the test asserts both behaviors.</li><li>Pushing into <code>items</code> directly mutates the existing array and React may skip the re-render.</li><li>Index keys are acceptable for an append-only list; prefer stable ids once removal exists.</li></ul>",
    },
    "react-movies-list": {
      code:
        "const MOVIES = [\n" +
        "    { id: 1, title: \"Inception\", year: 2010 },\n" +
        "    { id: 2, title: \"Interstellar\", year: 2014 },\n" +
        "    { id: 3, title: \"The Dark Knight\", year: 2008 },\n" +
        "    { id: 4, title: \"Dunkirk\", year: 2017 },\n" +
        "    { id: 5, title: \"Tenet\", year: 2020 },\n" +
        "    { id: 6, title: \"The Prestige\", year: 2006 },\n" +
        "];\n" +
        "\n" +
        "function App() {\n" +
        "    const [query, setQuery] = React.useState(\"\");\n" +
        "    const visible = MOVIES.filter((m) =>\n" +
        "        m.title.toLowerCase().includes(query.toLowerCase())\n" +
        "    );\n" +
        "\n" +
        "    return (\n" +
        "        <div>\n" +
        "            <input\n" +
        "                data-testid=\"search-input\"\n" +
        "                placeholder=\"Search movies...\"\n" +
        "                value={query}\n" +
        "                onChange={(e) => setQuery(e.target.value)}\n" +
        "            />\n" +
        "            {visible.length === 0 && (\n" +
        "                <div data-testid=\"no-results\">No results found</div>\n" +
        "            )}\n" +
        "            <ul data-testid=\"movies-list\">\n" +
        "                {visible.map((m) => (\n" +
        "                    <li key={m.id}>{m.title} ({m.year})</li>\n" +
        "                ))}\n" +
        "            </ul>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>The key design decision: the filtered list is <b>derived data</b>, not state. Only the query lives in <code>useState</code>; the visible movies are computed inline on every render with <code>filter</code> + a case-insensitive <code>includes</code> (lowercase both sides). One source of truth means clearing the input restores the full list automatically &mdash; no effect, no second array to keep in sync.</p>" +
        "<p>The empty state renders conditionally with <code>visible.length === 0 &amp;&amp;</code>, keeping the <code>ul</code> present (the test expects an empty list plus the message, not a swapped-out tree).</p>" +
        "<ul><li>The classic trap is storing <code>filteredMovies</code> in state and updating it inside <code>onChange</code> or a <code>useEffect</code> &mdash; it works until it drifts, and interviewers read it as not understanding the render model. Derive, don't sync.</li><li>Lowercase <em>both</em> the title and the query; one-sided lowering fails the <code>INCEP</code> test.</li><li>Filtering on every keystroke is fine at six items; mention <code>useMemo</code> or debouncing as the scale answer.</li></ul>",
    },
    "react-movies-list-api": {
      code:
        "/* =====================================================================\n" +
        "   BOILERPLATE — do not modify the SHIMS or API MIRROR sections.\n" +
        "   Your work: the TODO blocks in MovieItem and App (MoviesList).\n" +
        "   ===================================================================== */\n" +
        "\n" +
        "/* ---- SHIMS: react-native components for the web (do not modify) ---- */\n" +
        "const StyleSheet = { create: function (s) { return s; } };\n" +
        "const View = (props) => (\n" +
        "    <div data-testid={props.testID} style={props.style}>{props.children}</div>\n" +
        ");\n" +
        "const SafeAreaView = View;\n" +
        "const Text = (props) => (\n" +
        "    <span data-testid={props.testID} style={Object.assign({ display: \"block\" }, props.style || {})}>\n" +
        "        {props.children}\n" +
        "    </span>\n" +
        ");\n" +
        "const TextInput = (props) => (\n" +
        "    <input\n" +
        "        data-testid={props.testID}\n" +
        "        placeholder={props.placeholder}\n" +
        "        value={props.value}\n" +
        "        onChange={(e) => props.onChangeText && props.onChangeText(e.target.value)}\n" +
        "        style={props.style}\n" +
        "    />\n" +
        ");\n" +
        "const TouchableOpacity = (props) => (\n" +
        "    <button data-testid={props.testID} onClick={props.onPress} disabled={props.disabled} style={props.style}>\n" +
        "        {props.children}\n" +
        "    </button>\n" +
        ");\n" +
        "const ActivityIndicator = (props) => (\n" +
        "    <div data-testid={props.testID || \"loading-indicator\"} style={{ padding: 12, color: \"#576871\" }}>\n" +
        "        Loading&hellip;\n" +
        "    </div>\n" +
        ");\n" +
        "function FlatList(props) {\n" +
        "    const data = props.data || [];\n" +
        "    const piece = (C) => (!C ? null : React.isValidElement(C) ? C : <C />);\n" +
        "    return (\n" +
        "        <div data-testid={props.testID} style={props.style}>\n" +
        "            {piece(props.ListHeaderComponent)}\n" +
        "            {data.map((item, index) => (\n" +
        "                <React.Fragment key={props.keyExtractor ? props.keyExtractor(item, index) : index}>\n" +
        "                    {props.renderItem({ item: item, index: index })}\n" +
        "                </React.Fragment>\n" +
        "            ))}\n" +
        "            {data.length === 0 ? piece(props.ListEmptyComponent) : null}\n" +
        "            {piece(props.ListFooterComponent)}\n" +
        "        </div>\n" +
        "    );\n" +
        "}\n" +
        "\n" +
        "/* ---- API MIRROR of https://jsonmock.hackerrank.com/api/moviesdata (do not modify) ----\n" +
        "   GET ?Title=<substring>&page=<n> -> { page, per_page, total, total_pages, data } */\n" +
        "const MOVIE_DB = [\n" +
        "    { Title: \"The Matrix\", Year: 1999, imdbID: \"tt0133093\" },\n" +
        "    { Title: \"Spider-Man\", Year: 2002, imdbID: \"tt0145487\" },\n" +
        "    { Title: \"Memento\", Year: 2000, imdbID: \"tt0209144\" },\n" +
        "    { Title: \"Batman Begins\", Year: 2005, imdbID: \"tt0372784\" },\n" +
        "    { Title: \"Cast Away\", Year: 2000, imdbID: \"tt0162222\" },\n" +
        "    { Title: \"Iron Man\", Year: 2008, imdbID: \"tt0371746\" },\n" +
        "    { Title: \"The Prestige\", Year: 2006, imdbID: \"tt0482571\" },\n" +
        "    { Title: \"Superman Returns\", Year: 2006, imdbID: \"tt0348150\" },\n" +
        "    { Title: \"Inception\", Year: 2010, imdbID: \"tt1375666\" },\n" +
        "    { Title: \"The Social Network\", Year: 2010, imdbID: \"tt1285016\" },\n" +
        "    { Title: \"Man of Steel\", Year: 2013, imdbID: \"tt0770828\" },\n" +
        "    { Title: \"Gravity\", Year: 2013, imdbID: \"tt1454468\" },\n" +
        "    { Title: \"Interstellar\", Year: 2014, imdbID: \"tt0816692\" },\n" +
        "    { Title: \"Whiplash\", Year: 2014, imdbID: \"tt2582802\" },\n" +
        "    { Title: \"Mad Max: Fury Road\", Year: 2015, imdbID: \"tt1392190\" },\n" +
        "    { Title: \"Arrival\", Year: 2016, imdbID: \"tt2543164\" },\n" +
        "    { Title: \"La La Land\", Year: 2016, imdbID: \"tt3783958\" },\n" +
        "    { Title: \"Dunkirk\", Year: 2017, imdbID: \"tt5013056\" },\n" +
        "    { Title: \"Spider-Man: Homecoming\", Year: 2017, imdbID: \"tt2250912\" },\n" +
        "    { Title: \"Black Panther\", Year: 2018, imdbID: \"tt1825683\" },\n" +
        "    { Title: \"Parasite\", Year: 2019, imdbID: \"tt6751668\" },\n" +
        "    { Title: \"Tenet\", Year: 2020, imdbID: \"tt6723592\" },\n" +
        "    { Title: \"Dune\", Year: 2021, imdbID: \"tt1160419\" },\n" +
        "    { Title: \"Everything Everywhere All at Once\", Year: 2022, imdbID: \"tt6710474\" },\n" +
        "];\n" +
        "function fetchMoviesApi(url) {\n" +
        "    const q = {};\n" +
        "    (url.split(\"?\")[1] || \"\").split(\"&\").forEach(function (kv) {\n" +
        "        const parts = kv.split(\"=\");\n" +
        "        if (parts[0]) q[parts[0]] = decodeURIComponent(parts[1] || \"\");\n" +
        "    });\n" +
        "    const title = (q.Title || \"\").toLowerCase();\n" +
        "    const page = Math.max(1, parseInt(q.page || \"1\", 10) || 1);\n" +
        "    const hits = MOVIE_DB.filter(function (m) { return m.Title.toLowerCase().indexOf(title) !== -1; });\n" +
        "    const per = 8;\n" +
        "    const body = {\n" +
        "        page: page,\n" +
        "        per_page: per,\n" +
        "        total: hits.length,\n" +
        "        total_pages: Math.max(1, Math.ceil(hits.length / per)),\n" +
        "        data: hits.slice((page - 1) * per, page * per),\n" +
        "    };\n" +
        "    return new Promise(function (resolve) {\n" +
        "        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 120);\n" +
        "    });\n" +
        "}\n" +
        "const fetch = fetchMoviesApi; // your fetch(\"https://jsonmock...\") calls hit the mirror\n" +
        "\n" +
        "/* ---- STYLES (given) ---- */\n" +
        "const styles = StyleSheet.create({\n" +
        "    screen: { maxWidth: 420 },\n" +
        "    search: { width: \"95%\", padding: 8, marginBottom: 8 },\n" +
        "    toolbar: { display: \"flex\", gap: 6, marginBottom: 10 },\n" +
        "    card: { border: \"1px solid #d3d9dd\", borderRadius: 4, padding: \"8px 12px\", marginBottom: 6 },\n" +
        "    title: { fontWeight: 600 },\n" +
        "    year: { color: \"#576871\", fontSize: 13 },\n" +
        "});\n" +
        "\n" +
        "/* ---- CHILD COMPONENTS — complete the TODOs ---- */\n" +
        "function MovieItem({ item }) {\n" +
        "    return (\n" +
        "        <View style={styles.card} testID=\"movie-item\">\n" +
        "            <Text style={styles.title} testID=\"movie-title\">{item.Title}</Text>\n" +
        "            <Text style={styles.year} testID=\"movie-year\">{item.Year}</Text>\n" +
        "        </View>\n" +
        "    );\n" +
        "}\n" +
        "\n" +
        "function MoviesListView(props) {\n" +
        "    // NOTE: this child renders props.data. When a parent passes {...listProps},\n" +
        "    // \"data\" arrives without appearing literally at the call site.\n" +
        "    return (\n" +
        "        <FlatList\n" +
        "            data={props.data}\n" +
        "            renderItem={props.renderItem}\n" +
        "            keyExtractor={function (item) { return item.imdbID; }}\n" +
        "            ListFooterComponent={props.ListFooterComponent}\n" +
        "            ListEmptyComponent={<Text testID=\"empty-note\">No movies found</Text>}\n" +
        "        />\n" +
        "    );\n" +
        "}\n" +
        "\n" +
        "/* ---- THE SCREEN — complete the TODOs. Keep it named App. ---- */\n" +
        "function App() {\n" +
        "    const [loading, setLoading] = React.useState(false);\n" +
        "    const [loadingMore, setLoadingMore] = React.useState(false);\n" +
        "    const [items, setItems] = React.useState([]);\n" +
        "    const [page, setPage] = React.useState(1);\n" +
        "    const [totalPages, setTotalPages] = React.useState(1);\n" +
        "    const [searchInput, setSearchInput] = React.useState(\"\");\n" +
        "    const [sortOption, setSortOption] = React.useState(\"Year\");\n" +
        "    const [sortOrder, setSortOrder] = React.useState(\"asc\");\n" +
        "\n" +
        "    React.useEffect(function () {\n" +
        "        fetchData();\n" +
        "    }, [page, searchInput]);\n" +
        "\n" +
        "    async function fetchData() {\n" +
        "        if (page === 1) setLoading(true); else setLoadingMore(true);\n" +
        "        const res = await fetch(\n" +
        "            \"https://jsonmock.hackerrank.com/api/moviesdata?Title=\" +\n" +
        "            encodeURIComponent(searchInput) + \"&page=\" + page\n" +
        "        );\n" +
        "        const json = await res.json();\n" +
        "        setItems(function (prev) { return page === 1 ? json.data : prev.concat(json.data); });\n" +
        "        setTotalPages(json.total_pages);\n" +
        "        setLoading(false);\n" +
        "        setLoadingMore(false);\n" +
        "    }\n" +
        "\n" +
        "    const handleSearch = (val) => {\n" +
        "        setSearchInput(val); // use the argument — state still holds the OLD text\n" +
        "        setPage(1);\n" +
        "    };\n" +
        "\n" +
        "    const toggleSortOption = () => {\n" +
        "        setSortOption(function (o) { return o === \"Year\" ? \"Title\" : \"Year\"; });\n" +
        "    };\n" +
        "\n" +
        "    const toggleSortOrder = () => {\n" +
        "        setSortOrder(function (o) { return o === \"asc\" ? \"desc\" : \"asc\"; });\n" +
        "    };\n" +
        "\n" +
        "    const handleClearSort = () => {\n" +
        "        setSortOption(\"\"); // empty option = keep exact API order\n" +
        "        setSortOrder(\"asc\");\n" +
        "    };\n" +
        "\n" +
        "    const handleLoadMore = () => {\n" +
        "        if (page < totalPages) setPage(page + 1); // the effect fetches + appends\n" +
        "    };\n" +
        "\n" +
        "    const displayed = React.useMemo(function () {\n" +
        "        if (!sortOption) return items; // sorting cleared — exact API order\n" +
        "        const sorted = items.slice().sort(function (a, b) {\n" +
        "            const va = a[sortOption];\n" +
        "            const vb = b[sortOption];\n" +
        "            const cmp = va < vb ? -1 : va > vb ? 1 : 0;\n" +
        "            return sortOrder === \"asc\" ? cmp : -cmp;\n" +
        "        });\n" +
        "        return sorted;\n" +
        "    }, [items, sortOption, sortOrder]);\n" +
        "\n" +
        "    const renderItem = ({ item }) => <MovieItem item={item} />;\n" +
        "\n" +
        "    return (\n" +
        "        <SafeAreaView style={styles.screen}>\n" +
        "            <TextInput\n" +
        "                testID=\"search-input\"\n" +
        "                placeholder=\"Search movies by title\"\n" +
        "                value={searchInput}\n" +
        "                onChangeText={handleSearch}\n" +
        "                style={styles.search}\n" +
        "            />\n" +
        "            <View style={styles.toolbar}>\n" +
        "                <TouchableOpacity testID=\"sort-option\" onPress={toggleSortOption}>\n" +
        "                    <Text>Sort by: {sortOption || \"None\"}</Text>\n" +
        "                </TouchableOpacity>\n" +
        "                <TouchableOpacity testID=\"sort-order\" onPress={toggleSortOrder}>\n" +
        "                    <Text>Order: {sortOrder === \"asc\" ? \"Asc\" : \"Desc\"}</Text>\n" +
        "                </TouchableOpacity>\n" +
        "                <TouchableOpacity testID=\"clear-sort\" onPress={handleClearSort}>\n" +
        "                    <Text>Clear Sort</Text>\n" +
        "                </TouchableOpacity>\n" +
        "            </View>\n" +
        "            {loading ? (\n" +
        "                <ActivityIndicator testID=\"loading-indicator\" />\n" +
        "            ) : (\n" +
        "                <MoviesListView\n" +
        "                    data={displayed}\n" +
        "                    renderItem={renderItem}\n" +
        "                    ListFooterComponent={\n" +
        "                        <View>\n" +
        "                            {loadingMore ? <ActivityIndicator testID=\"footer-indicator\" /> : null}\n" +
        "                            {page < totalPages ? (\n" +
        "                                <TouchableOpacity testID=\"load-more\" onPress={handleLoadMore}>\n" +
        "                                    <Text>Load More</Text>\n" +
        "                                </TouchableOpacity>\n" +
        "                            ) : null}\n" +
        "                        </View>\n" +
        "                    }\n" +
        "                />\n" +
        "            )}\n" +
        "        </SafeAreaView>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>The screen is a small data pipeline: <code>page</code> and <code>searchInput</code> drive a fetch effect; <code>items</code> accumulates results; sorting is a <b>derived view</b> computed in <code>useMemo</code>, never baked into the fetched data &mdash; that separation is what lets Clear Sort restore exact API order for free.</p>" +
        "<ul><li>The effect lists <code>[page, searchInput]</code> as deps and calls a normal async function inside &mdash; effect callbacks themselves cannot be async.</li><li><code>fetchData</code> flips <code>loading</code> only for page 1 (full-screen spinner) and <code>loadingMore</code> otherwise, then <b>replaces</b> items on page 1 and <b>appends</b> for later pages.</li><li><code>handleSearch(val)</code> uses the argument, not state &mdash; state updates are asynchronous, so reading <code>searchInput</code> right after setting it fetches the previous query. Resetting <code>page</code> to 1 in the same handler batches into one fetch.</li><li>Sorting branches on type: <code>Year</code> is numeric, <code>Title</code> compares strings; the order flag just negates the comparator. An empty <code>sortOption</code> means no sort and returns <code>items</code> untouched.</li><li>Load More renders only while <code>page &lt; total_pages</code>, so it disappears on the last page without extra logic.</li></ul>",
    },
    "react-employee-form": {
      code:
        "function App() {\n" +
        "    const [name, setName] = React.useState(\"\");\n" +
        "    const [email, setEmail] = React.useState(\"\");\n" +
        "    const [employeeId, setEmployeeId] = React.useState(\"\");\n" +
        "\n" +
        "    const nameValid = /^[A-Za-z ]{4,}$/.test(name);\n" +
        "    const emailValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);\n" +
        "    const idValid = /^\\d{6}$/.test(employeeId);\n" +
        "    const formValid = nameValid && emailValid && idValid;\n" +
        "\n" +
        "    return (\n" +
        "        <form>\n" +
        "            <input\n" +
        "                data-testid=\"name-input\"\n" +
        "                placeholder=\"Name\"\n" +
        "                value={name}\n" +
        "                onChange={(e) => setName(e.target.value)}\n" +
        "            />\n" +
        "            <input\n" +
        "                data-testid=\"email-input\"\n" +
        "                placeholder=\"Email\"\n" +
        "                value={email}\n" +
        "                onChange={(e) => setEmail(e.target.value)}\n" +
        "            />\n" +
        "            <input\n" +
        "                data-testid=\"id-input\"\n" +
        "                placeholder=\"Employee ID\"\n" +
        "                value={employeeId}\n" +
        "                onChange={(e) => setEmployeeId(e.target.value)}\n" +
        "            />\n" +
        "            <button data-testid=\"submit-button\" type=\"submit\" disabled={!formValid}>\n" +
        "                Submit\n" +
        "            </button>\n" +
        "        </form>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>Validation forms reward one habit: <b>derive validity, never store it</b>. The three fields are controlled state; on every render three regex tests recompute, and the button's <code>disabled</code> prop is just their conjunction negated. There is no validate-on-submit step and no <code>isValid</code> state to forget to update &mdash; the button can never disagree with the fields.</p>" +
        "<ul><li><code>/^[A-Za-z ]{4,}$/</code> &mdash; anchors make it a whole-string rule: at least 4 characters, letters and spaces only.</li><li><code>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/</code> &mdash; the pragmatic email shape: something, <code>@</code>, something, a literal dot, something. The test suite specifically feeds <code>liz@example</code> (no dot after the <code>@</code>) to catch regexes that forget the dot.</li><li><code>/^\\d{6}$/</code> &mdash; <em>exactly</em> six digits. Without both anchors, 5- and 7-digit ids sneak through, and both are tested.</li></ul>" +
        "<p>The initial state passes none of the rules, so the button starts disabled with no special-casing. Keep <code>type=&quot;submit&quot;</code>; disabling the button is what the grader checks, not intercepted submit events.</p>",
    },
    "react-slideshow": {
      code:
        "const SLIDES = [\n" +
        "    { title: \"Welcome\", text: \"This is the first slide of the deck.\" },\n" +
        "    { title: \"Practice\", text: \"Reps build confidence for the real assessment.\" },\n" +
        "    { title: \"Good Luck\", text: \"You are ready. Go get it.\" },\n" +
        "];\n" +
        "\n" +
        "function App() {\n" +
        "    const [index, setIndex] = React.useState(0);\n" +
        "    const onFirst = index === 0;\n" +
        "    const onLast = index === SLIDES.length - 1;\n" +
        "\n" +
        "    return (\n" +
        "        <div>\n" +
        "            <div>\n" +
        "                <button data-testid=\"restart\" disabled={onFirst} onClick={() => setIndex(0)}>\n" +
        "                    Restart\n" +
        "                </button>\n" +
        "                <button data-testid=\"prev\" disabled={onFirst} onClick={() => setIndex(index - 1)}>\n" +
        "                    Prev\n" +
        "                </button>\n" +
        "                <button data-testid=\"next\" disabled={onLast} onClick={() => setIndex(index + 1)}>\n" +
        "                    Next\n" +
        "                </button>\n" +
        "            </div>\n" +
        "            <h1 data-testid=\"slide-title\">{SLIDES[index].title}</h1>\n" +
        "            <p data-testid=\"slide-text\">{SLIDES[index].text}</p>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>A slideshow is one integer of state &mdash; the index. Everything else is projection: the current slide is <code>SLIDES[index]</code>, and each button's <code>disabled</code> prop derives from where the index sits. Naming the two booleans (<code>onFirst</code>, <code>onLast</code>) keeps the JSX readable and gives the disabled logic one home instead of three inline comparisons.</p>" +
        "<p>Deriving disabled state is the important habit: the buttons can never fall out of sync with the index, because they are recomputed from it every render. Storing <code>canGoNext</code> in state and updating it inside handlers is the version that breaks the moment one handler forgets.</p>" +
        "<ul><li>Note the spec's asymmetry &mdash; <b>Restart is disabled on the first slide too</b>, not just Prev. Missing that fails the first sample test.</li><li>Since Next is disabled at the boundary, the handlers do not strictly need clamping &mdash; but <code>setIndex(index + 1)</code> is only safe because the disabled prop derives from the same value. If you drop the disabled props, add explicit clamps instead.</li></ul>",
    },
    "react-word-omitter": {
      code:
        "const OMITTED_WORDS = [\"a\", \"an\", \"the\", \"and\", \"or\", \"but\"];\n" +
        "\n" +
        "function App() {\n" +
        "    const [text, setText] = React.useState(\"\");\n" +
        "    const [omit, setOmit] = React.useState(true);\n" +
        "\n" +
        "    const output = omit\n" +
        "        ? text\n" +
        "              .split(/\\s+/)\n" +
        "              .filter((w) => w && OMITTED_WORDS.indexOf(w.toLowerCase()) === -1)\n" +
        "              .join(\" \")\n" +
        "        : text;\n" +
        "\n" +
        "    return (\n" +
        "        <div>\n" +
        "            <input\n" +
        "                data-testid=\"input-box\"\n" +
        "                placeholder=\"Type here...\"\n" +
        "                value={text}\n" +
        "                onChange={(e) => setText(e.target.value)}\n" +
        "            />\n" +
        "            <button data-testid=\"toggle-button\" onClick={() => setOmit(!omit)}>\n" +
        "                {omit ? \"Show All Words\" : \"Omit Words\"}\n" +
        "            </button>\n" +
        "            <p data-testid=\"output-text\">{output}</p>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>Two independent bits of state &mdash; the raw text and an <code>omit</code> boolean &mdash; and one derived value: the output. While omission is on, split the input on runs of whitespace (<code>/\\s+/</code>), drop tokens whose lowercased form is in the filler list, and re-join with single spaces; while off, show the raw string untouched. Because the output is computed at render time from the raw text, toggling back and forth loses nothing &mdash; there is no second processed state to reconcile.</p>" +
        "<ul><li>Splitting on <code>/\\s+/</code> rather than a single space is what collapses runs of spaces into one; the leading-empty-token case is handled by the <code>w &amp;&amp;</code> guard.</li><li>Whole-word matching comes free from tokenizing first &mdash; <code>theme</code> survives even though it contains <code>the</code>. Regex-replacing filler words inside the string is the approach that breaks this, and the third test targets it directly.</li><li>Compare lowercased (<code>The</code>, <code>AND</code> must be dropped) but render original casing for kept words.</li><li>The button label derives from <code>omit</code> too &mdash; it describes the <em>action</em>, not the state.</li></ul>",
    },
    "css-center-the-card": {
      code:
        "/* The HTML is fixed — CSS only. */\n" +
        "\n" +
        ".container {\n" +
        "    display: flex;\n" +
        "    align-items: center;      /* vertical centering */\n" +
        "    justify-content: center;  /* horizontal centering */\n" +
        "}",
      explanation:
        "<p>Flexbox is the modern default for this classic: make the container a flex context, then <code>justify-content: center</code> centers along the main axis (horizontal, in the default row direction) and <code>align-items: center</code> centers along the cross axis (vertical). Three declarations, no measurements, and it keeps working if the card's size ever changes &mdash; which is why geometry-based graders accept it so cleanly.</p>" +
        "<ul><li>Grid is the equally idiomatic alternative: <code>display: grid; place-content: center;</code> &mdash; two lines. Absolute positioning with 50% offsets plus <code>transform: translate(-50%, -50%)</code> also passes but takes the card out of flow.</li><li>The historical traps still show up in interviews: <code>margin: auto</code> alone only centers horizontally for block boxes; <code>vertical-align</code> does nothing here (it is for inline and table-cell contexts); and hardcoding offsets (<code>margin-top: 110px</code>) passes today's geometry and breaks the moment a dimension changes.</li><li>Know which axis each property controls &mdash; they swap when <code>flex-direction</code> is <code>column</code>, a favorite follow-up question.</li></ul>",
    },
    "css-three-column-grid": {
      code:
        "/* The HTML is fixed — CSS only. */\n" +
        "\n" +
        ".grid {\n" +
        "    display: grid;\n" +
        "    grid-template-columns: repeat(3, 1fr); /* three equal tracks */\n" +
        "    gap: 16px;                             /* rows AND columns */\n" +
        "}",
      explanation:
        "<p>CSS Grid solves this in three declarations: <code>display: grid</code> establishes the grid context, <code>grid-template-columns: repeat(3, 1fr)</code> defines three tracks that share the free space equally, and <code>gap: 16px</code> spaces both rows and columns. Items flow into cells automatically &mdash; six children fill two rows with no extra markup, no floats, no clearing.</p>" +
        "<ul><li>The <code>fr</code> unit is the point of the exercise: it distributes <em>remaining</em> space after gaps are reserved, so the math (632 = 3&times;200 + 2&times;16) works itself out. Hardcoding <code>200px</code> columns also passes here but breaks the instant the wrapper resizes.</li><li><code>gap</code> is the shorthand for <code>row-gap</code> plus <code>column-gap</code>; the grader checks both directions, so a <code>column-gap</code>-only answer fails the row-gap test.</li><li>The flexbox route needs <code>flex-wrap</code>, percentage widths compensating for gaps, and produces alignment puzzles on the last row &mdash; know it, but grid is the tool designed for two-dimensional layout, and interviewers expect you to reach for it.</li></ul>",
    },
    "css-notification-badge": {
      code:
        "/* The HTML is fixed — CSS only. */\n" +
        "\n" +
        ".avatar-wrap {\n" +
        "    position: relative; /* containing block for the absolute badge */\n" +
        "}\n" +
        "\n" +
        ".badge {\n" +
        "    position: absolute;\n" +
        "    top: -12px;    /* half the 24px chip → its center lands on the corner */\n" +
        "    right: -12px;\n" +
        "    border-radius: 50%;\n" +
        "}",
      explanation:
        "<p>The badge pattern is the canonical use of the <code>relative</code>-parent / <code>absolute</code>-child pair. <code>position: relative</code> on the wrapper does not move anything &mdash; its only job is to become the <b>containing block</b>, so the badge's offsets measure from the avatar's box instead of the page. The badge then takes <code>position: absolute; top: -12px; right: -12px</code>: negative offsets push it half-outside the corner, and since the chip is 24&times;24, shifting by half its size lands its <em>center</em> exactly on the avatar's top-right corner. <code>border-radius: 50%</code> rounds the chip into a circle.</p>" +
        "<ul><li>Absolute positioning also removes the badge from normal flow, which is what the second test checks &mdash; without it the span stacks below the avatar and stretches the wrapper.</li><li>The classic failure: forgetting <code>relative</code> on the wrapper, which silently re-anchors the badge to the viewport &mdash; it looks right until the component moves inside a page.</li><li><code>transform: translate(50%, -50%)</code> from <code>top: 0; right: 0</code> is the size-independent equivalent; margins-only hacks are not.</li></ul>",
    },
    "react-articles-sort": {
      code:
        "const ARTICLES = [\n" +
        "    { title: \"A message to our customers\", upvotes: 12, date: \"2019-11-13\" },\n" +
        "    { title: \"Alphabet earnings\", upvotes: 22, date: \"2019-11-02\" },\n" +
        "    { title: \"Artificial intelligence\", upvotes: 20, date: \"2019-11-06\" },\n" +
        "    { title: \"Elon Musk\", upvotes: 30, date: \"2019-11-22\" },\n" +
        "    { title: \"Search engine\", upvotes: 6, date: \"2019-11-19\" },\n" +
        "];\n" +
        "\n" +
        "function App() {\n" +
        "    const [sortBy, setSortBy] = React.useState(\"upvotes\");\n" +
        "\n" +
        "    const sorted = [...ARTICLES].sort((a, b) => {\n" +
        "        if (sortBy === \"upvotes\") return b.upvotes - a.upvotes;\n" +
        "        return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; // newest first\n" +
        "    });\n" +
        "\n" +
        "    return (\n" +
        "        <div>\n" +
        "            <button data-testid=\"most-upvoted-link\" onClick={() => setSortBy(\"upvotes\")}>\n" +
        "                Most Upvoted\n" +
        "            </button>\n" +
        "            <button data-testid=\"most-recent-link\" onClick={() => setSortBy(\"date\")}>\n" +
        "                Most Recent\n" +
        "            </button>\n" +
        "            <ul data-testid=\"articles-list\">\n" +
        "                {sorted.map((a) => (\n" +
        "                    <li key={a.title}>{a.title}</li>\n" +
        "                ))}\n" +
        "            </ul>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>Store the <em>sort mode</em>, not the sorted array. One <code>useState</code> holds which ordering is active; the visible list is derived every render by sorting a <b>copy</b> (<code>[...ARTICLES].sort(...)</code>). Both buttons then just set the mode &mdash; they contain no sorting logic and cannot disagree with the render.</p>" +
        "<p>The comparator branches: upvotes descending is numeric (<code>b.upvotes - a.upvotes</code>); most-recent-first compares the ISO <code>YYYY-MM-DD</code> strings, which order lexicographically exactly like dates &mdash; no <code>Date</code> parsing needed, just remember to invert for newest-first.</p>" +
        "<ul><li>The trap the test suite hunts: sorting <code>ARTICLES</code> in place. <code>sort</code> mutates, so after one Most Recent click the upvote ordering's source data is scrambled and switching back gives the wrong order &mdash; the third test clicks back specifically to catch this.</li><li>Sorting never filters &mdash; all five rows must survive every toggle, which deriving from the constant guarantees.</li><li>The initial render must already be sorted by upvotes; deriving from state handles that with zero extra code.</li></ul>",
    },
    "react-tic-tac-toe": {
      code:
        "const LINES = [\n" +
        "    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows\n" +
        "    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns\n" +
        "    [0, 4, 8], [2, 4, 6],            // diagonals\n" +
        "];\n" +
        "\n" +
        "function calculateWinner(board) {\n" +
        "    for (const [a, b, c] of LINES) {\n" +
        "        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];\n" +
        "    }\n" +
        "    return null;\n" +
        "}\n" +
        "\n" +
        "function App() {\n" +
        "    const [board, setBoard] = React.useState(Array(9).fill(null));\n" +
        "    const [xIsNext, setXIsNext] = React.useState(true);\n" +
        "\n" +
        "    const winner = calculateWinner(board);\n" +
        "    const isDraw = !winner && board.every(Boolean);\n" +
        "    const status = winner\n" +
        "        ? \"Winner: \" + winner\n" +
        "        : isDraw\n" +
        "        ? \"Draw\"\n" +
        "        : \"Next player: \" + (xIsNext ? \"X\" : \"O\");\n" +
        "\n" +
        "    const handleClick = (i) => {\n" +
        "        if (board[i] || winner) return; // filled cell or finished game\n" +
        "        const next = board.slice();\n" +
        "        next[i] = xIsNext ? \"X\" : \"O\";\n" +
        "        setBoard(next);\n" +
        "        setXIsNext(!xIsNext);\n" +
        "    };\n" +
        "\n" +
        "    const reset = () => {\n" +
        "        setBoard(Array(9).fill(null));\n" +
        "        setXIsNext(true);\n" +
        "    };\n" +
        "\n" +
        "    return (\n" +
        "        <div>\n" +
        "            <div data-testid=\"status\">{status}</div>\n" +
        "            <div>\n" +
        "                {board.map((cell, i) => (\n" +
        "                    <button key={i} data-testid={\"cell-\" + i} onClick={() => handleClick(i)}>\n" +
        "                        {cell}\n" +
        "                    </button>\n" +
        "                ))}\n" +
        "            </div>\n" +
        "            <button data-testid=\"reset\" onClick={reset}>Reset</button>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>Two pieces of state carry the whole game: a 9-slot board array and whose turn it is. Everything else &mdash; winner, draw, status line &mdash; is <b>derived on render</b> by scanning the eight winning lines. That derivation is the heart of the design: there is no <code>gameOver</code> flag to maintain, so no way for the status and the board to disagree.</p>" +
        "<ul><li><code>handleClick</code> has one guard doing double duty: returning early when the cell is filled <em>or</em> a winner exists ignores both invalid moves and any click after the game ends.</li><li>Updates are immutable &mdash; <code>board.slice()</code>, write one cell, set state. Mutating the existing array is the classic reason a board fails to re-render.</li><li>Draw is simply <em>no winner and every cell truthy</em>; the winner check must run first or a win on the ninth move reads as a draw.</li><li>Reset re-creates the initial state rather than patching it &mdash; fewer ways to forget a field.</li></ul>" +
        "<p>The status strings (<code>Next player: X</code>, <code>Winner: O</code>, <code>Draw</code>) are compared verbatim by the grader, so build them exactly. Extracting <code>calculateWinner</code> as a pure function outside the component keeps it testable and render-cheap.</p>",
    },
    "react-shopping-cart": {
      code:
        "const PRODUCTS = [\n" +
        "    { id: \"keyboard\", name: \"Keyboard\", price: 50 },\n" +
        "    { id: \"mouse\", name: \"Mouse\", price: 25 },\n" +
        "    { id: \"monitor\", name: \"Monitor\", price: 150 },\n" +
        "];\n" +
        "\n" +
        "function App() {\n" +
        "    const [cart, setCart] = React.useState([]); // [{ id, qty }]\n" +
        "\n" +
        "    const priceOf = (id) => PRODUCTS.find((p) => p.id === id).price;\n" +
        "\n" +
        "    const addToCart = (id) =>\n" +
        "        setCart((c) =>\n" +
        "            c.some((item) => item.id === id)\n" +
        "                ? c.map((item) => (item.id === id ? { id: item.id, qty: item.qty + 1 } : item))\n" +
        "                : [...c, { id: id, qty: 1 }]\n" +
        "        );\n" +
        "\n" +
        "    const increment = (id) =>\n" +
        "        setCart((c) => c.map((item) => (item.id === id ? { id: item.id, qty: item.qty + 1 } : item)));\n" +
        "\n" +
        "    const decrement = (id) =>\n" +
        "        setCart((c) =>\n" +
        "            c\n" +
        "                .map((item) => (item.id === id ? { id: item.id, qty: item.qty - 1 } : item))\n" +
        "                .filter((item) => item.qty > 0) // qty 1 -> remove the row\n" +
        "        );\n" +
        "\n" +
        "    const total = cart.reduce((sum, item) => sum + priceOf(item.id) * item.qty, 0);\n" +
        "\n" +
        "    return (\n" +
        "        <div>\n" +
        "            <div>\n" +
        "                {PRODUCTS.map((p) => (\n" +
        "                    <button key={p.id} data-testid={\"add-\" + p.id} onClick={() => addToCart(p.id)}>\n" +
        "                        Add {p.name} ({\"$\" + p.price})\n" +
        "                    </button>\n" +
        "                ))}\n" +
        "            </div>\n" +
        "            <ul>\n" +
        "                {cart.map((item) => (\n" +
        "                    <li key={item.id} data-testid={\"cart-item-\" + item.id}>\n" +
        "                        {item.id} x <span data-testid={\"qty-\" + item.id}>{item.qty}</span>\n" +
        "                        <button data-testid={\"inc-\" + item.id} onClick={() => increment(item.id)}>+</button>\n" +
        "                        <button data-testid={\"dec-\" + item.id} onClick={() => decrement(item.id)}>-</button>\n" +
        "                    </li>\n" +
        "                ))}\n" +
        "            </ul>\n" +
        "            <div data-testid=\"cart-total\">{\"$\" + total.toFixed(2)}</div>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>Model the cart as minimal state: an array of <code>{ id, qty }</code>. Prices and names stay in the <code>PRODUCTS</code> constant and are looked up at render time &mdash; duplicating price into cart rows is redundant state waiting to disagree.</p>" +
        "<ul><li><b>Add</b> branches on presence: an existing row gets <code>qty + 1</code> via <code>map</code>, a new product appends with qty 1. This is what merges repeat adds into one row instead of duplicating it.</li><li><b>Decrement</b> maps qty down then filters out rows with qty 0 &mdash; the remove-at-qty-1 rule falls out of composition instead of an if/else.</li><li>All three handlers use the functional setter form (<code>setCart(c =&gt; ...)</code>) so rapid clicks each build on the latest cart, not a stale render's copy.</li><li>The total is derived every render &mdash; <code>reduce</code> over rows times looked-up price &mdash; and formatted with <code>toFixed(2)</code> to satisfy the exact <code>$0.00</code> / <code>$225.00</code> string checks.</li></ul>" +
        "<p>Everything is O(rows) per interaction, which is nothing; the grading pressure is entirely on immutability and the qty-1 removal edge, both covered above.</p>",
    },
    "css-holy-grail": {
      code:
        "/* The HTML is fixed — CSS only. */\n" +
        "\n" +
        ".layout {\n" +
        "    display: flex;\n" +
        "    flex-direction: column;\n" +
        "}\n" +
        "\n" +
        ".hg-header {\n" +
        "    flex: 0 0 60px; /* fixed height, no shrinking */\n" +
        "}\n" +
        "\n" +
        ".hg-middle {\n" +
        "    flex: 1;        /* absorb all space between header and footer */\n" +
        "    display: flex;  /* row axis for nav / main / aside */\n" +
        "    min-height: 0;\n" +
        "}\n" +
        "\n" +
        ".hg-nav {\n" +
        "    flex: 0 0 150px;\n" +
        "}\n" +
        "\n" +
        ".hg-main {\n" +
        "    flex: 1;        /* everything the fixed side columns leave over */\n" +
        "}\n" +
        "\n" +
        ".hg-aside {\n" +
        "    flex: 0 0 120px;\n" +
        "}\n" +
        "\n" +
        ".hg-footer {\n" +
        "    flex: 0 0 50px;\n" +
        "}",
      explanation:
        "<p>Nested flexbox handles the holy grail cleanly: the outer frame is a <b>column</b> flex container stacking header / middle / footer, and the middle band is a <b>row</b> flex container placing nav / main / aside. Fixed bands use <code>flex: 0 0 &lt;size&gt;</code> &mdash; no grow, <b>no shrink</b>, explicit basis &mdash; while the two flexible regions (<code>.hg-middle</code> vertically, <code>.hg-main</code> horizontally) take <code>flex: 1</code> to absorb whatever remains. The frame's 400px minus 60 and 50 leaves the 290px middle; 600 minus 150 and 120 leaves main's 330px, with no arithmetic anywhere in the CSS.</p>" +
        "<ul><li>The trap is writing <code>height: 60px</code> or <code>width: 150px</code> alone: flex items default to <code>flex-shrink: 1</code>, so a tight container quietly compresses your fixed bands. The <code>0 0</code> shorthand is the guarantee the geometry tests rely on.</li><li><code>min-height: 0</code> on the middle band disarms the flexbox min-content floor, which otherwise blocks shrinking when content grows.</li><li>CSS Grid with template rows/columns and <code>1fr</code> is the equally correct modern alternative &mdash; same geometry, one container.</li></ul>",
    },
    "css-modal-overlay": {
      code:
        "/* The HTML is fixed — CSS only. */\n" +
        "\n" +
        ".overlay {\n" +
        "    position: absolute;\n" +
        "    top: 0;\n" +
        "    right: 0;\n" +
        "    bottom: 0;\n" +
        "    left: 0;                        /* cover the stage edge to edge */\n" +
        "    background: rgba(0, 0, 0, 0.5); /* dimmed but see-through */\n" +
        "    display: flex;\n" +
        "    align-items: center;            /* center the dialog */\n" +
        "    justify-content: center;\n" +
        "}",
      explanation:
        "<p>Three jobs, three techniques. <b>Coverage:</b> the stage already has <code>position: relative</code>, so the overlay takes <code>position: absolute</code> with all four offsets at 0, pinning every edge to the stage &mdash; no width or height math. <b>Dimming:</b> <code>background: rgba(0, 0, 0, 0.5)</code> darkens while staying see-through; the grader reads the computed alpha, and 0.5 sits safely inside the required 0.2&ndash;0.8 band. <b>Centering:</b> the overlay doubles as a flex container with <code>align-items</code> plus <code>justify-content</code>, so the dialog centers with zero CSS of its own.</p>" +
        "<ul><li>The classic mistake is <code>opacity: 0.5</code> on the overlay &mdash; opacity fades the element <em>and all its children</em>, ghosting the dialog. Alpha belongs in the background color only.</li><li>The four-offsets idiom (or its shorthand <code>inset: 0</code>) beats <code>width: 100%; height: 100%</code>, which breaks once padding or borders enter the box.</li><li>In a real app this pattern uses <code>position: fixed</code> against the viewport plus a <code>z-index</code>; here the stage is the world, so absolute is correct.</li></ul>",
    },
    "react-quotes-app": {
      code:
        "const QUOTES = [\n" +
        "    { text: \"Stay hungry, stay foolish.\", author: \"Steve Jobs\" },\n" +
        "    { text: \"Simplicity is the ultimate sophistication.\", author: \"Leonardo da Vinci\" },\n" +
        "    { text: \"Programs must be written for people to read.\", author: \"Harold Abelson\" },\n" +
        "    { text: \"Talk is cheap. Show me the code.\", author: \"Linus Torvalds\" },\n" +
        "    { text: \"Perfection is achieved when there is nothing left to take away.\", author: \"Antoine de Saint-Exupery\" },\n" +
        "];\n" +
        "\n" +
        "function App() {\n" +
        "    const [index, setIndex] = React.useState(0);\n" +
        "    const quote = QUOTES[index];\n" +
        "\n" +
        "    // modular arithmetic wraps both directions without special cases\n" +
        "    const next = () => setIndex((index + 1) % QUOTES.length);\n" +
        "    const prev = () => setIndex((index - 1 + QUOTES.length) % QUOTES.length);\n" +
        "\n" +
        "    return (\n" +
        "        <div className=\"quotes-app\">\n" +
        "            <h1>Quotes</h1>\n" +
        "            <blockquote data-testid=\"quote-text\">{quote.text}</blockquote>\n" +
        "            <p data-testid=\"quote-author\">- {quote.author}</p>\n" +
        "            <p data-testid=\"quote-index\">{index + 1} / {QUOTES.length}</p>\n" +
        "            <button data-testid=\"btn-prev\" onClick={prev}>Previous</button>\n" +
        "            <button data-testid=\"btn-next\" onClick={next}>Next Quote</button>\n" +
        "        </div>\n" +
        "    );\n" +
        "}",
      explanation:
        "<p>A carousel over a fixed list needs exactly one piece of state: the index. The current quote is a lookup, the position indicator is <code>index + 1</code> over the length, and both buttons are one-liners thanks to <b>modular arithmetic</b>: <code>(index + 1) % length</code> wraps forward past the end, and <code>(index - 1 + length) % length</code> wraps backward &mdash; the <code>+ length</code> is what keeps JavaScript's remainder operator away from negative operands, since <code>-1 % 5</code> is <code>-1</code>, not <code>4</code>.</p>" +
        "<ul><li>The trap is writing wrap logic as conditionals in both directions &mdash; it works, but it is four branches doing what two expressions say, and one boundary typo fails the wrap tests.</li><li>Do not store the quote object in state; deriving it from the index means there is nothing to keep in sync.</li><li>The suite asserts the <code>1 / 5</code> indicator format and both wrap directions, so the whole component is really a test of the two increment expressions. Run the Tests tab after any change &mdash; the Preview looking right does not exercise the wraparound.</li></ul>",
    },
  };
})();
