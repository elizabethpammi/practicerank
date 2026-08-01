// Interview-Cake-style lesson walkthroughs — part C (problems 32–46).
// Requires window.__LESSON from lessons-a.js.
(function () {
  "use strict";
  var L = window.__LESSON;
  if (!L) { console.error("lessons-c.js loaded before lessons-a.js"); return; }

  /* ---------------- 32 ---------------- */
  L("top-scores", {
    gotchas: [
      "A generic sort is O(n log n). The extra constraint — scores are bounded by a known maximum — is what unlocks O(n), and it is the only reason this problem exists.",
      "The counts array needs <code>highestPossibleScore + 1</code> slots, because index 0 is a real score.",
      "Walk the counts array <b>downward</b> to get descending order.",
      "A score can repeat, so push it <code>count</code> times, not once."
    ],
    breakdown: "<p>Counting sort. Instead of comparing scores to each other, use each score as an <em>index</em> into a tally array. One pass to tally, one pass to read back out.</p>" +
      "<p>The trade-off to state: this is O(n + k) time and O(k) space, where k is the score range. It is a win when k is small relative to n, and a loss when scores could be any 32-bit integer.</p>",
    hints: [
      "You are told the maximum possible score. Why would an interviewer hand you that fact?",
      "Make an array of size <code>highestPossibleScore + 1</code> and use the score itself as the index.",
      "Then read the tally from the top down, emitting each score as many times as it was counted."
    ],
    walkthrough: [
      "Create <code>scoreCounts = new Array(highestPossibleScore + 1).fill(0)</code>.",
      "First pass: for each score, <code>scoreCounts[score]++</code>. Validate the range while you are here.",
      "Create an empty <code>sortedScores</code>.",
      "Second pass: loop <code>score</code> from <code>highestPossibleScore</code> down to 0.",
      "Read <code>count = scoreCounts[score]</code> and push <code>score</code> that many times.",
      "Return <code>sortedScores</code>. Neither pass compares two scores to each other, which is exactly how it beats the O(n log n) comparison-sort lower bound."
    ],
    complexity: "O(n + k) time, O(k) space, where k is the score range.",
    learned: "Counting sort, and the broader lesson that comparison sorting's O(n log n) floor only applies to <em>comparison</em> sorts. When the key space is small and known, indexing beats comparing."
  });

  /* ---------------- 33 ---------------- */
  L("which-appears-twice", {
    gotchas: [
      "A set works and costs O(n) space. The interviewer wants O(1), so have the arithmetic answer ready.",
      "The sum of 1..n is <code>n(n+1)/2</code>. Getting this formula wrong is the whole failure mode — derive it once and keep it.",
      "Careful about what <code>n</code> is. If the list has <code>n</code> entries covering <code>1..n-1</code> with one repeat, the formula uses <code>n - 1</code>.",
      "In other languages the sum can overflow for large n. Worth naming even though JavaScript numbers absorb it."
    ],
    breakdown: "<p>You know exactly what the sum <em>should</em> be if every number appeared once. The actual sum is larger by precisely the amount of the duplicated number.</p>" +
      "<p>So: expected sum minus actual sum gives you the answer directly, with two integers of state.</p>",
    hints: [
      "Write down 1, 2, 3, 4 and then 1, 2, 3, 4, 3. Compare the sums.",
      "The difference between the actual sum and the sum-without-duplicates <em>is</em> the repeated number.",
      "Use the closed form <code>n(n+1)/2</code> instead of a loop so the expected sum costs O(1)."
    ],
    walkthrough: [
      "Let <code>n = numbers.length - 1</code> — the largest value in the intended 1..n range.",
      "Compute <code>expectedSum = (n * (n + 1)) / 2</code>.",
      "Sum the actual array in one pass: <code>actualSum</code>.",
      "Return <code>actualSum - expectedSum</code>.",
      "Trace <code>[1, 2, 3, 4, 3]</code>: n is 4, expected is 10, actual is 13, difference is 3.",
      "Alternative worth mentioning: XOR everything with 1..n. Same O(1) space, immune to overflow, and it reuses the trick from the drone problem."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "Use the invariant you were handed. 'The numbers are 1 through n' is not scene-setting — it is a mathematical constraint, and the arithmetic-difference trick generalises to finding missing numbers too."
  });

  /* ---------------- 34 ---------------- */
  L("word-cloud-data", {
    gotchas: [
      "Case handling is the real interview content, not the counting. 'The' at the start of a sentence and 'the' mid-sentence are the same word; 'Bob' is not.",
      "The rule to articulate: if a word appears capitalised <em>only</em> ever, keep it capitalised — it is probably a proper noun. Otherwise store it lowercase.",
      "Apostrophes belong in words (<code>don't</code>) but hyphens are debatable. State your choice explicitly rather than silently picking one.",
      "Do not use <code>split(' ')</code>. It breaks on punctuation, double spaces, and em dashes."
    ],
    breakdown: "<p>Two separate jobs: parsing the words out of the text, and counting them with case-insensitive-but-case-preserving semantics.</p>" +
      "<p>Solve the counting rule first, because it is the part the interviewer actually cares about. Build the string character by character, treating letters and apostrophes as word characters and everything else as a boundary.</p>",
    hints: [
      "What should the map hold for 'The dog. The cat.' versus 'Bob went home. Bob slept.'?",
      "When you add a word, check for both its capitalised and its lowercase form already in the map, and reconcile.",
      "If the lowercase form exists, increment that. If the capitalised form exists and this occurrence is lowercase, move the count down to the lowercase key."
    ],
    walkthrough: [
      "Parse: walk the characters, accumulating letters and apostrophes into a buffer and flushing the buffer on any other character. Flush once more at the end of the string.",
      "Counting rule, case A: if the map already has the word exactly as given, increment it.",
      "Case B: if the word came in capitalised and the lowercase version is already a key, increment the lowercase key instead — evidence it is not a proper noun.",
      "Case C: if the word came in lowercase and the capitalised version is a key, delete that key, move its count to the lowercase key, and add one.",
      "Case D: otherwise it is new — add it as it appeared, with count 1.",
      "Return the map. Trace 'The dog. The cat. Bob ran.': <code>the</code> resolves to lowercase with count 2 after case C fires, while <code>Bob</code> stays capitalised."
    ],
    complexity: "O(n) time in the length of the text, O(k) space for k distinct words.",
    learned: "Ambiguous specs are the assignment. The interviewer is watching whether you surface the case-handling question yourself and commit to a defensible rule, not whether you can increment a counter."
  });

  /* ---------------- 35 ---------------- */
  L("in-place-shuffle", {
    gotchas: [
      "The naive shuffle — swap each index with <em>any</em> random index in the whole array — is provably biased. It produces n&#8319; equally likely outcomes over n! permutations, and n&#8319; does not divide evenly by n!.",
      "The correct range for index i is <code>i</code> to <code>lastIndex</code> <b>inclusive</b>, which means an element can stay where it is. Excluding i introduces a different bias.",
      "Do not build a second array. 'In place' is in the title.",
      "<code>arr.sort(() =&gt; Math.random() - 0.5)</code> is a popular one-liner and it is badly biased. Never offer it."
    ],
    breakdown: "<p>Fisher-Yates. Think of it as dealing: pick a random card from the undealt pile, put it in the next fixed position, and shrink the undealt pile by one.</p>" +
      "<p>Because index i draws from a pile of exactly <code>n - i</code> candidates, the total number of paths is n! and every permutation gets exactly one — that is the uniformity proof.</p>",
    hints: [
      "Take a 3-element array and enumerate the outcomes of the naive swap-with-anything shuffle. Count how many times each permutation appears.",
      "27 outcomes cannot spread evenly over 6 permutations. The fix is to shrink the random range as you go.",
      "For each index i, pick a random index in <code>[i, lastIndex]</code> and swap. That is the entire algorithm."
    ],
    walkthrough: [
      "Handle arrays of length 0 or 1 by returning early.",
      "Loop <code>i</code> from 0 to <code>arr.length - 2</code>.",
      "Pick <code>randomIndex = getRandom(i, arr.length - 1)</code>, inclusive on both ends.",
      "If <code>randomIndex !== i</code>, swap the two elements.",
      "Move on. Once index i is written it is never touched again, which is what makes each position's draw independent.",
      "In this exercise the randomness is injected as an array of pre-chosen picks so the result is deterministic and testable — real code would call <code>Math.random()</code> here, and mentioning that seam is a good testing story."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "Fisher-Yates, and the habit of proving a randomised algorithm is uniform by counting outcomes. 'It looks random' is not an argument, and interviewers use this problem specifically to see whether you know that."
  });

  /* ---------------- 36 ---------------- */
  L("cafe-order-checker", {
    gotchas: [
      "You are checking an <em>interleaving</em>, not a merge or a set equality. Both source lists must keep their relative order inside the served list.",
      "Counting or sorting the served list loses the ordering information entirely and passes invalid inputs.",
      "Length mismatch is an instant false — check it before the loop and save yourself an edge case.",
      "When you run off the end of one list, every remaining served item must come from the other. Handle that tail explicitly."
    ],
    breakdown: "<p>Walk the served list once with an index into each source list. At every served order, exactly one thing should be true: it matches the front of the takeout queue, or it matches the front of the dine-in queue.</p>" +
      "<p>If it matches neither, the ordering was violated and you can return false immediately.</p>",
    hints: [
      "Two pointers, one per source list. What do you compare the current served item against?",
      "If it matches the current takeout order, advance the takeout pointer. Same for dine-in. If neither, return false.",
      "Watch the bounds: only compare against a list if its pointer is still inside that list."
    ],
    walkthrough: [
      "If <code>servedOrders.length !== takeOutOrders.length + dineInOrders.length</code>, return false.",
      "Set <code>takeOutIndex = 0</code> and <code>dineInIndex = 0</code>.",
      "For each served order: if <code>takeOutIndex &lt; takeOutOrders.length</code> and the order matches <code>takeOutOrders[takeOutIndex]</code>, increment that index.",
      "Else if <code>dineInIndex &lt; dineInOrders.length</code> and it matches <code>dineInOrders[dineInIndex]</code>, increment that one.",
      "Else return false — the order came from nowhere valid.",
      "Survive the whole loop and return true. Counterexample to keep in mind: takeout <code>[1,3,5]</code>, dine-in <code>[2,4,6]</code>, served <code>[1,2,4,6,5,3]</code> is false, because 5 is served while takeout still owes 3."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "Greedy two-pointer validation. Because each served item can only legally match one queue front, no backtracking is ever needed — recognising when greedy is provably safe is the skill here."
  });

  /* ---------------- 37 ---------------- */
  L("simulate-5-from-7", {
    gotchas: [
      "<code>rand7() % 5</code> is biased. 7 does not divide by 5, so values 0 and 1 come up more often than 2, 3 and 4.",
      "Scaling (<code>Math.floor(rand7() * 5 / 7)</code>) is biased for the same reason. Any mapping of 7 outcomes onto 5 must be uneven.",
      "The fix is rejection sampling: throw away the results that would cause the imbalance and roll again.",
      "The loop is unbounded in theory. Explain that the expected number of rolls is small (7/5 = 1.4) even though there is no hard cap."
    ],
    breakdown: "<p>You cannot squeeze 7 equally likely outcomes into 5 without either dropping some or doubling up. Dropping is the only unbiased option.</p>" +
      "<p>So: roll <code>rand7()</code>, and if you get one of the two 'extra' values, discard it and roll again. Every value that survives is equally likely.</p>",
    hints: [
      "Enumerate the 7 outcomes of <code>rand7() % 5</code> and tally which result each one gives. The imbalance is visible immediately.",
      "You cannot fix the imbalance by remapping. You can fix it by refusing to answer sometimes.",
      "Loop until <code>rand7()</code> returns a value in 1..5, then return that value."
    ],
    walkthrough: [
      "Write an infinite loop.",
      "Inside, call <code>rand7()</code> and store the result.",
      "If the result is 6 or 7, <code>continue</code> — discard and roll again.",
      "Otherwise return it. The surviving values 1..5 each had probability 1/7 per roll, so conditioned on surviving, each has probability exactly 1/5.",
      "Analyse the cost: the chance of surviving a roll is 5/7, so the expected number of rolls is 7/5 = 1.4.",
      "In this exercise the rolls are injected as a fixed array so the result is deterministic and testable — consume them in order and the rejection logic is unchanged."
    ],
    complexity: "O(1) expected time (1.4 rolls on average), O(1) space. Unbounded worst case with probability approaching zero.",
    learned: "Rejection sampling. When you cannot map one distribution onto another evenly, discarding outcomes preserves uniformity where clever arithmetic does not."
  });

  /* ---------------- 38 ---------------- */
  L("simulate-7-from-5", {
    gotchas: [
      "Going up in range is harder than going down. One <code>rand5()</code> gives 5 outcomes and you need at least 7, so a single roll can never suffice.",
      "Adding two rolls (<code>rand5() + rand5()</code>) gives a bell curve, not a uniform distribution. Sums are the classic wrong answer.",
      "You must build a uniform range with <em>multiplication</em>, not addition: <code>(rand5() - 1) * 5 + rand5()</code> gives a flat 1..25.",
      "25 does not divide by 7, so you still need rejection — discard 22..25 and keep 1..21."
    ],
    breakdown: "<p>Two ideas stack here. First, construct a bigger uniform range by treating two rolls as digits in base 5, which gives 25 equally likely outcomes. Second, reject down to a multiple of 7.</p>" +
      "<p>21 is the largest multiple of 7 at or below 25, so keep 1..21 and map them onto 1..7 with modulo.</p>",
    hints: [
      "One roll gives 5 outcomes. How do you get 25 equally likely outcomes from two rolls?",
      "Treat the rolls as base-5 digits: <code>(rand5() - 1) * 5 + rand5()</code> is uniform over 1..25. Verify that every result comes from exactly one digit pair.",
      "Now reject anything above 21 and take <code>(value - 1) % 7 + 1</code>."
    ],
    walkthrough: [
      "Loop forever.",
      "Build <code>roll = (rand5() - 1) * 5 + rand5()</code>. The <code>- 1</code> and the <code>* 5</code> are what keep the 25 outcomes distinct and equally likely.",
      "If <code>roll &gt; 21</code>, discard and loop again. Those are 4 of the 25 outcomes.",
      "Otherwise return <code>(roll - 1) % 7 + 1</code>. The surviving 21 values map exactly 3-to-1 onto 1..7, so the result is uniform.",
      "Cost: 21/25 survival per attempt, so roughly 1.19 attempts, i.e. about 2.38 <code>rand5()</code> calls on average.",
      "As with the previous problem, the harness injects the roll sequence so the output is deterministic."
    ],
    complexity: "O(1) expected time, O(1) space.",
    learned: "Compose a larger uniform space from independent small ones (base arithmetic, not addition), then reject down to the size you need. This pair of problems is the standard test of whether you actually understand uniformity."
  });

  /* ---------------- 39 ---------------- */
  L("two-egg-problem", {
    gotchas: [
      "This is a math-and-reasoning question, not a coding question. Interviewers want the <em>derivation</em> spoken aloud.",
      "Binary search does not apply. If you break the first egg at floor 50 you must then check 1..49 one at a time with your last egg — 50 drops worst case.",
      "The goal is to <b>equalise</b> the worst case across every branch, not to minimise the first drop.",
      "Answer for 100 floors: start at floor 14, then step 13, then 12, and so on. Worst case 14 drops."
    ],
    breakdown: "<p>You have two eggs. The first is your 'coarse' probe and can break; the second must be spent walking up one floor at a time from the last known-safe floor.</p>" +
      "<p>So every time the first egg survives, the remaining linear search must get one floor shorter — otherwise a later break costs more than an earlier one. Decreasing step sizes is the answer, and the first step size falls out of the arithmetic.</p>",
    hints: [
      "Try the fixed-interval strategy: drop every 10 floors. What is the worst case, and which starting floor produces it?",
      "Fixed intervals are unbalanced — breaking at floor 100 costs far more total drops than breaking at floor 10. Make later probes cheaper by shrinking the step.",
      "If the first drop is at floor n, then n-1, then n-2..., solve <code>n(n+1)/2 &gt;= 100</code>."
    ],
    walkthrough: [
      "Establish the constraint: once egg one breaks at floor F, egg two must test every floor from the last safe floor up to F-1, linearly.",
      "Try fixed steps of 10: drop at 10, 20, ..., 100. Worst case is 10 (the coarse drops) + 9 (the linear sweep) = 19.",
      "Notice the imbalance: breaking at floor 10 costs 1 + 9 = 10 drops, breaking at floor 100 costs 10 + 9 = 19. The early branches are wasting slack.",
      "Balance it by shrinking the step by one each time. Then every branch costs the same total, which is the definition of an optimal worst case.",
      "Solve for the first step n: the floors covered are <code>n + (n-1) + ... + 1 = n(n+1)/2</code>, which must reach 100. n = 13 gives 91 (short), n = 14 gives 105 (enough).",
      "So drop from 14, then 27, then 39, 50, 60, 69, 77, 84, 90, 95, 99, 100. Worst case 14 drops. The general answer for F floors is the smallest n with <code>n(n+1)/2 &gt;= F</code>."
    ],
    complexity: "O(&radic;n) drops for n floors, since n(n+1)/2 grows quadratically in the number of drops.",
    learned: "Optimising a worst case means equalising the branches. Whenever one path through your strategy is cheaper than another, you have slack you can spend to lower the maximum — that reasoning applies well beyond eggs."
  });

  /* ---------------- 40 ---------------- */
  L("find-repeat-space-edition", {
    gotchas: [
      "The obvious answers are all banned: a set is O(n) space, sorting mutates the input, and the sum trick only works when there is exactly <b>one</b> instance of the duplicate.",
      "Here the duplicate may appear many times, so arithmetic tricks are out.",
      "You are binary searching over the <em>value range</em>, not over array indices. That is the conceptual leap.",
      "The pigeonhole principle is the justification — say the phrase, it is what the interviewer is listening for."
    ],
    breakdown: "<p>Pigeonhole: if you count how many array entries fall in the value range 1..n/2 and that count exceeds n/2, a duplicate must live in that half. If not, it lives in the other half.</p>" +
      "<p>Each such count is one O(n) pass, and each pass halves the value range, so the total is O(n log n) time with O(1) space.</p>",
    hints: [
      "The array has n+1 entries holding values 1..n. Why must a duplicate exist at all? Name that principle.",
      "Apply the same counting argument to a <em>half</em> of the value range instead of the whole thing.",
      "Binary search the range 1..n. Each iteration, count items in the lower half and compare that count to the size of the half."
    ],
    walkthrough: [
      "Set <code>floor = 1</code> and <code>ceiling = numbers.length - 1</code> — the bounds of the value range, not the index range.",
      "While <code>floor &lt; ceiling</code>, split: <code>midpoint = Math.floor((floor + ceiling) / 2)</code>, giving a lower range <code>[floor, midpoint]</code>.",
      "One pass over the whole array counting how many values fall inside the lower range.",
      "Compute <code>distinctPossibleIntegersInLowerRange = midpoint - floor + 1</code>.",
      "If the count is greater than that, a duplicate is in the lower range: set <code>ceiling = midpoint</code>. Otherwise set <code>floor = midpoint + 1</code>.",
      "When <code>floor === ceiling</code> the range has collapsed to one value — return it."
    ],
    complexity: "O(n log n) time, O(1) space.",
    learned: "Binary search over a value space rather than an index space, driven by a counting invariant. Any time you can cheaply count how many items fall in a range, you can binary search that range."
  });

  /* ---------------- 41 ---------------- */
  L("find-repeat-beast-mode", {
    gotchas: [
      "This asks for O(n) time <em>and</em> O(1) space simultaneously, which rules out both the set and the previous problem's binary search.",
      "The reframe is the entire trick: treat the array as a linked list where <code>next(i) = numbers[i]</code>. Because values are 1..n and there are n+1 slots, that traversal must cycle.",
      "The node where the cycle <b>begins</b> is the duplicate, because two different positions point into it.",
      "Do not mutate the array by negating entries. That is a common 'clever' answer and it violates the read-only constraint."
    ],
    breakdown: "<p>Two ideas compose. First, the array is secretly a linked list with a cycle. Second, Floyd's algorithm finds the start of a cycle in O(1) space.</p>" +
      "<p>Phase one: run tortoise and hare until they meet somewhere inside the cycle. Phase two: measure the cycle length, then use a fixed-offset two-pointer walk to land on the entry node.</p>",
    hints: [
      "What happens if you start at the last index and repeatedly jump to <code>numbers[currentIndex]</code>? Draw it for a small array.",
      "You always end up going in circles. Which value is the first one you revisit, and why is that the duplicate?",
      "Reuse the cycle machinery from the linked-list problem: find a meeting point, find the cycle length, then walk two pointers that far apart to find the entry."
    ],
    walkthrough: [
      "Model the list: position i leads to position <code>numbers[i]</code>. Start at index <code>numbers.length - 1</code>.",
      "Phase one: advance <code>slow</code> one hop and <code>fast</code> two hops per step until they hold the same position. They are now somewhere inside the cycle.",
      "Phase two: keep one pointer fixed and walk the other around until it comes back, counting the hops. That count is the cycle length.",
      "Phase three: reset both pointers to the start, advance one of them exactly <code>cycleLength</code> hops, then advance both together one hop at a time.",
      "They meet at the cycle's entry node, and that position's value is the repeated integer — return it.",
      "Why the entry is the duplicate: the entry is the only node with two incoming edges, and an incoming edge from position i means <code>numbers[i]</code> equals that node. Two edges means two positions hold the same value."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "Reframing changes what algorithms are available. Nothing about an array suggests cycle detection until you notice the values are also valid indices — that translation step is the hardest and most transferable part."
  });

  /* ---------------- 42 ---------------- */
  L("find-duplicate-files", {
    gotchas: [
      "Comparing every file to every other file is O(n&sup2;) file reads. Hash each file once instead and compare hashes.",
      "Hashing entire multi-gigabyte files is slow. Hash a <em>sample</em> — the first, middle and last blocks — and only do a full comparison on collisions.",
      "Duplicates are not symmetric: you want to keep the <b>older</b> file and report the newer one as the copy. Compare timestamps and order the pair deliberately.",
      "Recursive directory walking with a visited set matters — symlinks can create infinite loops."
    ],
    breakdown: "<p>Two halves: traverse the tree, and detect duplicates cheaply.</p>" +
      "<p>Traversal is a stack-based depth-first walk pushing directories and processing files. Detection is a hash map from a content fingerprint to the path already seen with that fingerprint. Everything interesting is in choosing a fingerprint that is cheap but trustworthy.</p>",
    hints: [
      "Walk the tree with an explicit stack of paths. Directories get expanded, files get processed.",
      "Keep a map from file contents (or a hash of them) to the first path seen with those contents.",
      "Now optimise: what is the cheapest fingerprint that almost never collides? Sample a few blocks rather than reading the whole file."
    ],
    walkthrough: [
      "Push the starting directory onto a stack. Track visited real paths so symlink loops cannot trap you.",
      "Pop a path. If it is a directory, push all its children. If it is a file, fingerprint it.",
      "Fingerprint: read the first, middle and last blocks and hash their concatenation, plus the file size. Cheap and highly selective.",
      "Look the fingerprint up in <code>filesSeenAlready</code>. If it is present, you have a duplicate pair.",
      "Order the pair by last-edited time: the older path is the original, the newer is the copy. Push <code>[copyPath, originalPath]</code> onto the results.",
      "If the fingerprint is new, or if this file is older than the one already recorded, store this path as the canonical one. Return the list of duplicate pairs."
    ],
    complexity: "O(n) file visits with O(1) sampled reads each, plus O(n) space for the fingerprint map. A full-content hash would be O(total bytes).",
    learned: "A systems-design question in algorithm clothing. The graded skills are: choosing a cheap-but-sufficient fingerprint, defending it against collisions, and handling the messy real-world details (symlinks, timestamps, huge files) unprompted."
  });

  /* ---------------- 43 ---------------- */
  L("merge-sorted-arrays", {
    gotchas: [
      "Concatenating and sorting is O(n log n) and throws away the fact that both inputs are already sorted. That fact is the entire problem.",
      "The exhausted-array case is where bugs live. When one array runs out, you must take from the other without ever indexing out of bounds.",
      "Do not write <code>if (arr[i] &lt; arr[j])</code> before checking that both indices are still valid. Comparing against <code>undefined</code> is always false and silently corrupts the merge.",
      "Ties are fine — pick either side consistently, but if stability matters, prefer the first array."
    ],
    breakdown: "<p>This is the merge step of merge sort. Two pointers, one per input. At each step take the smaller of the two current elements and advance that pointer.</p>" +
      "<p>The only real design decision is how to express 'this array is exhausted' cleanly, because a wall of nested ifs is where people lose the plot.</p>",
    hints: [
      "Both arrays are sorted, so the next smallest element overall is always at the front of one of them.",
      "Two indices, one output array. Compare the two current heads, take the smaller, advance.",
      "Clean up the bounds with two booleans: <code>isExhausted</code> for each array. Then the branch reads as one plain condition instead of four nested ones."
    ],
    walkthrough: [
      "Allocate <code>mergedArray</code> of size <code>myArray.length + alicesArray.length</code>.",
      "Set both current indices to 0.",
      "Loop once per output slot.",
      "Compute <code>isMyArrayExhausted = currentIndexMine &gt;= myArray.length</code> and the same for the other array.",
      "Take from my array if the other is exhausted, or if mine is not exhausted and its head is smaller or equal. Otherwise take from the other. Advance the index you took from.",
      "Return the merged array. Every element is written exactly once, which is why this is linear."
    ],
    complexity: "O(n + m) time, O(n + m) space for the output.",
    learned: "The merge step, and a readability lesson worth as much as the algorithm: hoist your boundary conditions into named booleans before the branch. Interviewers grade the legibility of this one."
  });

  /* ---------------- 44 ---------------- */
  L("url-shortener", {
    gotchas: [
      "An auto-incrementing integer key is guessable, so users can enumerate everyone's links. Say this out loud; it is the security half of the question.",
      "Base-62 encoding (0-9, a-z, A-Z) is what keeps the codes short. Base 10 needs far more characters for the same key space.",
      "Do not generate random codes and hope — you must handle collisions, either by checking and retrying or by encoding a guaranteed-unique counter.",
      "Custom aliases and reserved words (<code>/admin</code>, <code>/api</code>) need a blocklist."
    ],
    breakdown: "<p>Design question. Reason about it in layers: the encoding scheme, the storage, the read path, and the operational concerns (analytics, expiry, scale).</p>" +
      "<p>Core insight: you need a bijection between an integer ID and a short string. Base-62 encoding gives exactly that, and 6 characters of base 62 is about 57 billion URLs.</p>",
    hints: [
      "How many URLs must you support, and how many characters does that require in base 62?",
      "Encode an integer counter into base 62 rather than generating random strings — uniqueness comes for free.",
      "Now address the guessability problem: shuffle the alphabet, or hash the counter, or mix in a per-user salt."
    ],
    walkthrough: [
      "Define the alphabet: 62 characters, 0-9 then a-z then A-Z. Six characters give 62&#8310; ≈ 5.7 &times; 10&#185;&#8304; codes.",
      "Encode: repeatedly divide the ID by 62, prepending <code>ALPHABET[id % 62]</code> each time until the ID reaches 0.",
      "Decode: walk the characters left to right accumulating <code>value = value * 62 + indexOf(char)</code>.",
      "Store a map from code to long URL. In production this is a key-value store, and the read path is cache-first because reads massively outnumber writes.",
      "Address guessability: shuffle the alphabet with a secret permutation, or encode <code>hash(id)</code> instead of <code>id</code>. Either way, keep the mapping deterministic and reversible-by-lookup.",
      "Mention the operational extras unprompted: click analytics, expiry, custom aliases, a reserved-word blocklist, and rate limiting on the create endpoint."
    ],
    complexity: "O(log&#8326;&#8322; n) time to encode or decode a key, O(1) lookup on read, O(n) storage.",
    learned: "Base conversion as an ID compression tool, and the system-design habit of separating the algorithm from the operational concerns. Volunteering the security and scale issues is what distinguishes a strong answer here."
  });

  /* ---------------- 45 ---------------- */
  L("graph-coloring", {
    gotchas: [
      "The greedy algorithm needs <code>D + 1</code> colours, where D is the maximum degree. That is the number to state, and it is a bound, not always the optimum.",
      "<b>Self-loops make the graph uncolourable.</b> Check for a node listed as its own neighbour and throw — this is the case most people miss.",
      "Do not pick a colour before looking at the neighbours. Collect the illegal colours first, then take the lowest legal one.",
      "Optimal graph colouring is NP-hard. Greedy is the expected answer; claiming it is optimal is the trap."
    ],
    breakdown: "<p>Greedy: process the nodes in any order, and give each node the lowest-numbered colour that none of its neighbours already uses.</p>" +
      "<p>Why <code>D + 1</code> colours always suffice: a node has at most D neighbours, so at most D colours are blocked, so with D+1 available at least one is always free. That argument is the answer to 'why does this terminate correctly?'</p>",
    hints: [
      "How many colours could a single node possibly be blocked from using? What does that tell you about how many you need?",
      "For each node, build the set of colours already taken by its neighbours, then pick the smallest colour not in that set.",
      "Before any of that, check whether any node lists itself as a neighbour. What would that mean for colouring?"
    ],
    walkthrough: [
      "For each node, first validate: if <code>node.neighbors</code> includes the node itself, throw — a self-loop cannot be legally coloured.",
      "Skip nodes that already have a colour.",
      "Build <code>illegalColors</code> as a Set of the colours of all coloured neighbours.",
      "Loop colours from 0 upward through the available palette and assign the first one not in <code>illegalColors</code>.",
      "Because the palette has D+1 entries and at most D are blocked, this loop always finds a colour.",
      "Trace a triangle (every node adjacent to both others): degree 2, so 3 colours, and each node genuinely needs its own — the bound is tight here."
    ],
    complexity: "O(N + M) time for N nodes and M edges, O(D) space for the illegal-colours set.",
    learned: "Greedy graph colouring and the D+1 bound. More broadly: when the optimal problem is NP-hard, the interview answer is a greedy approximation plus an honest statement of its guarantee."
  });

  /* ---------------- 46 ---------------- */
  L("mesh-message", {
    gotchas: [
      "Depth-first search does <b>not</b> find shortest paths in an unweighted graph. Only breadth-first does. Using a stack instead of a queue here is the classic fatal error.",
      "Mark nodes as visited when you <em>enqueue</em> them, not when you dequeue them, or the same node gets queued many times.",
      "Reconstruct the path by walking the <code>previousNode</code> map backwards from the end, then reversing.",
      "Return null (or throw) when no path exists — do not return an empty array, which reads as 'already there'."
    ],
    breakdown: "<p>BFS explores in rings: all nodes one hop away, then all two hops away, and so on. The first time you reach the destination you must have reached it by a shortest route, because every shorter route would have been explored already.</p>" +
      "<p>To recover the actual path, record for each node the node you came from, then trace those links backwards at the end.</p>",
    hints: [
      "Why is BFS the right traversal and DFS the wrong one? Answer in terms of what order nodes get visited.",
      "Use a queue, and a map <code>howWeReachedNodes</code> from each node to the node you arrived from.",
      "When you dequeue the destination, stop and rebuild the path by following the map backwards to the start, then reverse it."
    ],
    walkthrough: [
      "Guard: if the start node equals the end node, return <code>[startNode]</code>.",
      "Initialise <code>previousNodes = { [startNode]: null }</code> and a queue containing the start node.",
      "While the queue is not empty, shift the front node.",
      "For each of its neighbours: if the neighbour is not already a key in <code>previousNodes</code>, record <code>previousNodes[neighbour] = currentNode</code> and push it. Recording at enqueue time is what prevents duplicates.",
      "If that neighbour is the destination, stop and reconstruct: start at the end node, repeatedly follow <code>previousNodes</code> back to the start, collecting nodes, then reverse the collected list.",
      "If the queue drains without reaching the destination, the nodes are in different components — return null."
    ],
    complexity: "O(N + M) time for N nodes and M edges, O(N) space for the queue and the previous-node map.",
    learned: "BFS for shortest paths in unweighted graphs, plus the parent-pointer technique for reconstructing a path rather than just its length. Weighted edges would push you to Dijkstra — knowing exactly where the line falls is the point."
  });
})();
