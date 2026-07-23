// Problem bank — HackerRank-style challenges.
// Each case: { args, expected, sample } — compared by deep equality.
window.PROBLEMS = [
  {
    slug: "sock-merchant",
    name: "Sales by Match",
    category: "Warm-up",
    difficulty: "Easy",
    maxScore: 10,
    successRate: "92.14%",
    fn: "sockMerchant",
    statement: `
<p>There is a large pile of socks that must be paired by color. Given an array of integers representing the color of each sock, determine how many pairs of socks with matching colors there are.</p>
<h3>Example</h3>
<p><code>n = 7</code>, <code>ar = [1, 2, 1, 2, 1, 3, 2]</code></p>
<p>There is one pair of color <code>1</code> and one of color <code>2</code>. There are three odd socks left, one of each color. The number of pairs is <code>2</code>.</p>
<h3>Function Description</h3>
<p>Complete the <code>sockMerchant</code> function. It must return an integer representing the number of matching pairs of socks that are available.</p>
<ul><li><code>n</code>: the number of socks in the pile</li><li><code>ar</code>: the colors of each sock</li></ul>
<h3>Constraints</h3>
<pre>1 ≤ n ≤ 50
1 ≤ ar[i] ≤ 100</pre>
<h3>Sample Input</h3>
<pre>9
10 20 20 10 10 30 50 10 20</pre>
<h3>Sample Output</h3>
<pre>3</pre>
<h3>Explanation</h3>
<p>There are three pairs: colors 10 (×2 pairs would need 4 — there are three 10s and one left over), 20, and 10 again. Total pairs = 3.</p>`,
    starter: `/*
 * Complete the 'sockMerchant' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts following parameters:
 *  1. INTEGER n
 *  2. INTEGER_ARRAY ar
 */

function sockMerchant(n, ar) {
    // Write your code here

}`,
    cases: [
      { args: [9, [10, 20, 20, 10, 10, 30, 50, 10, 20]], expected: 3, sample: true },
      { args: [7, [1, 2, 1, 2, 1, 3, 2]], expected: 2, sample: true },
      { args: [6, [1, 1, 3, 1, 2, 2]], expected: 2, sample: false },
      { args: [1, [100]], expected: 0, sample: false },
      { args: [4, [4, 4, 4, 4]], expected: 2, sample: false },
    ],
  },
  {
    slug: "counting-valleys",
    name: "Counting Valleys",
    category: "Warm-up",
    difficulty: "Easy",
    maxScore: 15,
    successRate: "89.71%",
    fn: "countingValleys",
    statement: `
<p>An avid hiker keeps meticulous records of their hikes. Hikes always start and end at sea level. Each step up is <code>U</code> and each step down is <code>D</code>. A <em>valley</em> is a sequence of consecutive steps below sea level, starting with a step down from sea level and ending with a step up to sea level.</p>
<p>Given the sequence of up and down steps during a hike, find and return the number of valleys walked through.</p>
<h3>Function Description</h3>
<p>Complete the <code>countingValleys</code> function.</p>
<ul><li><code>steps</code>: the number of steps on the hike</li><li><code>path</code>: a string describing the path</li></ul>
<h3>Constraints</h3>
<pre>2 ≤ steps ≤ 10^6
path[i] ∈ {U, D}</pre>
<h3>Sample Input</h3>
<pre>8
UDDDUDUU</pre>
<h3>Sample Output</h3>
<pre>1</pre>
<h3>Explanation</h3>
<pre>_/\\      _
   \\    /
    \\/\\/</pre>
<p>The hiker enters and leaves one valley.</p>`,
    starter: `/*
 * Complete the 'countingValleys' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts following parameters:
 *  1. INTEGER steps
 *  2. STRING path
 */

function countingValleys(steps, path) {
    // Write your code here

}`,
    cases: [
      { args: [8, "UDDDUDUU"], expected: 1, sample: true },
      { args: [12, "DDUUDDUDUUUD"], expected: 2, sample: false },
      { args: [8, "UDUDUDUD"], expected: 0, sample: false },
      { args: [2, "DU"], expected: 1, sample: false },
    ],
  },
  {
    slug: "jumping-on-the-clouds",
    name: "Jumping on the Clouds",
    category: "Warm-up",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "91.98%",
    fn: "jumpingOnClouds",
    statement: `
<p>There is a new mobile game that starts with consecutively numbered clouds. Some of the clouds are thunderheads and others are cumulus. The player can jump on any cumulus cloud having a number that is equal to the number of the current cloud plus <code>1</code> or <code>2</code>. The player must avoid the thunderheads.</p>
<p>Determine the minimum number of jumps it will take to jump from the starting position (cloud <code>0</code>) to the last cloud. It is always possible to win the game.</p>
<p>For each game, you will get an array of clouds numbered <code>0</code> if they are safe or <code>1</code> if they must be avoided.</p>
<h3>Function Description</h3>
<p>Complete the <code>jumpingOnClouds</code> function. It should return the minimum number of jumps required.</p>
<ul><li><code>c</code>: an array of binary integers</li></ul>
<h3>Constraints</h3>
<pre>2 ≤ n ≤ 100
c[i] ∈ {0, 1}
c[0] = c[n-1] = 0</pre>
<h3>Sample Input</h3>
<pre>7
0 0 1 0 0 1 0</pre>
<h3>Sample Output</h3>
<pre>4</pre>
<h3>Explanation</h3>
<p>The player must avoid clouds at indexes 2 and 5. One optimal path: 0 → 1 → 3 → 4 → 6, which takes 4 jumps.</p>`,
    starter: `/*
 * Complete the 'jumpingOnClouds' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER_ARRAY c as parameter.
 */

function jumpingOnClouds(c) {
    // Write your code here

}`,
    cases: [
      { args: [[0, 0, 1, 0, 0, 1, 0]], expected: 4, sample: true },
      { args: [[0, 0, 0, 0, 1, 0]], expected: 3, sample: true },
      { args: [[0, 1, 0]], expected: 1, sample: false },
      { args: [[0, 0, 0, 1, 0, 0]], expected: 3, sample: false },
      { args: [[0, 0]], expected: 1, sample: false },
    ],
  },
  {
    slug: "repeated-string",
    name: "Repeated String",
    category: "Warm-up",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "87.42%",
    fn: "repeatedString",
    statement: `
<p>There is a string, <code>s</code>, of lowercase English letters that is repeated infinitely many times. Given an integer, <code>n</code>, find and return the number of letter <code>a</code>'s in the first <code>n</code> letters of the infinite string.</p>
<h3>Example</h3>
<p><code>s = 'abcac'</code>, <code>n = 10</code></p>
<p>The substring we consider is <code>abcacabcac</code>, the first 10 characters of the infinite string. There are <code>4</code> occurrences of <code>a</code>.</p>
<h3>Function Description</h3>
<p>Complete the <code>repeatedString</code> function.</p>
<ul><li><code>s</code>: a string to repeat</li><li><code>n</code>: the number of characters to consider</li></ul>
<h3>Constraints</h3>
<pre>1 ≤ |s| ≤ 100
1 ≤ n ≤ 10^12</pre>
<p><strong>Note:</strong> brute-force building of the string will time out for large <code>n</code>. Think in whole repetitions plus a remainder.</p>
<h3>Sample Input</h3>
<pre>aba
10</pre>
<h3>Sample Output</h3>
<pre>7</pre>`,
    starter: `/*
 * Complete the 'repeatedString' function below.
 *
 * The function is expected to return a LONG_INTEGER.
 * The function accepts following parameters:
 *  1. STRING s
 *  2. LONG_INTEGER n
 */

function repeatedString(s, n) {
    // Write your code here

}`,
    cases: [
      { args: ["aba", 10], expected: 7, sample: true },
      { args: ["a", 1000000], expected: 1000000, sample: true },
      { args: ["abcac", 10], expected: 4, sample: false },
      { args: ["b", 500], expected: 0, sample: false },
      { args: ["aab", 8], expected: 6, sample: false },
    ],
  },
  {
    slug: "two-sum",
    name: "Two Sum",
    category: "Arrays & Hashmaps",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "90.55%",
    fn: "twoSum",
    statement: `
<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return the <em>indices</em> of the two numbers such that they add up to <code>target</code>.</p>
<p>You may assume that each input has <strong>exactly one solution</strong>, and you may not use the same element twice. Return the answer with the smaller index first.</p>
<h3>Function Description</h3>
<p>Complete the <code>twoSum</code> function. It must return an array of two integers.</p>
<h3>Constraints</h3>
<pre>2 ≤ nums.length ≤ 10^4
-10^9 ≤ nums[i] ≤ 10^9</pre>
<p><strong>Follow-up:</strong> can you do it in one pass with a hash map (O(n))?</p>
<h3>Sample Input</h3>
<pre>nums = [2, 7, 11, 15]
target = 9</pre>
<h3>Sample Output</h3>
<pre>[0, 1]</pre>
<h3>Explanation</h3>
<p><code>nums[0] + nums[1] = 2 + 7 = 9</code>, so we return <code>[0, 1]</code>.</p>`,
    starter: `/*
 * Complete the 'twoSum' function below.
 *
 * The function is expected to return an INTEGER_ARRAY of the two indices.
 * The function accepts following parameters:
 *  1. INTEGER_ARRAY nums
 *  2. INTEGER target
 */

function twoSum(nums, target) {
    // Write your code here

}`,
    cases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1], sample: true },
      { args: [[3, 2, 4], 6], expected: [1, 2], sample: false },
      { args: [[3, 3], 6], expected: [0, 1], sample: false },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], sample: false },
    ],
  },
  {
    slug: "hash-tables-ransom-note",
    name: "Hash Tables: Ransom Note",
    category: "Arrays & Hashmaps",
    difficulty: "Easy",
    maxScore: 25,
    successRate: "84.63%",
    fn: "checkMagazine",
    statement: `
<p>Harold is a kidnapper who wrote a ransom note, but now he is worried it will be traced back to him through his handwriting. He found a magazine and wants to know if he can cut out whole words from it and use them to create an untraceable replica of his ransom note.</p>
<p>The words in his note are case-sensitive and he <strong>must</strong> use only whole words available in the magazine. He cannot use substrings or concatenation to create the words he needs.</p>
<p>Given the words in the magazine and the words in the ransom note, return the string <code>"Yes"</code> if he can replicate his ransom note exactly using whole words from the magazine; otherwise, return <code>"No"</code>.</p>
<h3>Function Description</h3>
<p>Complete the <code>checkMagazine</code> function.</p>
<ul><li><code>magazine</code>: an array of strings, each a word in the magazine</li><li><code>note</code>: an array of strings, each a word in the ransom note</li></ul>
<h3>Sample Input</h3>
<pre>magazine = ["give", "me", "one", "grand", "today", "night"]
note = ["give", "one", "grand", "today"]</pre>
<h3>Sample Output</h3>
<pre>Yes</pre>`,
    starter: `/*
 * Complete the 'checkMagazine' function below.
 *
 * The function is expected to return the STRING "Yes" or "No".
 * The function accepts following parameters:
 *  1. STRING_ARRAY magazine
 *  2. STRING_ARRAY note
 */

function checkMagazine(magazine, note) {
    // Write your code here

}`,
    cases: [
      { args: [["give", "me", "one", "grand", "today", "night"], ["give", "one", "grand", "today"]], expected: "Yes", sample: true },
      { args: [["two", "times", "three", "is", "not", "four"], ["two", "times", "two", "is", "four"]], expected: "No", sample: true },
      { args: [["ive", "got", "a", "lovely", "bunch", "of", "coconuts"], ["ive", "got", "some", "coconuts"]], expected: "No", sample: false },
      { args: [["apple", "banana", "apple"], ["apple", "apple"]], expected: "Yes", sample: false },
      { args: [["Attack", "at", "dawn"], ["attack", "at", "dawn"]], expected: "No", sample: false },
    ],
  },
  {
    slug: "two-strings",
    name: "Two Strings",
    category: "Arrays & Hashmaps",
    difficulty: "Easy",
    maxScore: 25,
    successRate: "88.09%",
    fn: "twoStrings",
    statement: `
<p>Given two strings, determine if they share a common substring. A substring may be as small as one character.</p>
<h3>Example</h3>
<p><code>s1 = "and"</code>, <code>s2 = "art"</code></p>
<p>These share the common substring <code>a</code>, so the answer is <code>YES</code>.</p>
<h3>Function Description</h3>
<p>Complete the <code>twoStrings</code> function. It should return the string <code>"YES"</code> if the strings share a common substring, or <code>"NO"</code> otherwise.</p>
<h3>Constraints</h3>
<pre>1 ≤ |s1|, |s2| ≤ 10^5
All characters are lowercase English letters.</pre>
<h3>Sample Input</h3>
<pre>hello
world</pre>
<h3>Sample Output</h3>
<pre>YES</pre>
<h3>Explanation</h3>
<p>The substrings <code>o</code> and <code>l</code> are common to both strings.</p>`,
    starter: `/*
 * Complete the 'twoStrings' function below.
 *
 * The function is expected to return the STRING "YES" or "NO".
 * The function accepts following parameters:
 *  1. STRING s1
 *  2. STRING s2
 */

function twoStrings(s1, s2) {
    // Write your code here

}`,
    cases: [
      { args: ["hello", "world"], expected: "YES", sample: true },
      { args: ["hi", "world"], expected: "NO", sample: true },
      { args: ["and", "art"], expected: "YES", sample: false },
      { args: ["abc", "def"], expected: "NO", sample: false },
      { args: ["wouldyoulikefries", "abcabcabcabcabcabc"], expected: "NO", sample: false },
    ],
  },
  {
    slug: "longest-substring-without-repeating",
    name: "Longest Substring Without Repeating Characters",
    category: "Strings & Sliding Window",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "71.37%",
    fn: "lengthOfLongestSubstring",
    statement: `
<p>Given a string <code>s</code>, find the length of the <strong>longest substring</strong> without duplicate characters.</p>
<h3>Function Description</h3>
<p>Complete the <code>lengthOfLongestSubstring</code> function. It must return an integer.</p>
<h3>Constraints</h3>
<pre>0 ≤ s.length ≤ 5 * 10^4
s consists of English letters, digits, symbols and spaces.</pre>
<p><strong>Hint:</strong> a sliding window with a map of last-seen indices gives O(n).</p>
<h3>Sample Input</h3>
<pre>abcabcbb</pre>
<h3>Sample Output</h3>
<pre>3</pre>
<h3>Explanation</h3>
<p>The answer is <code>"abc"</code>, with a length of 3. Note that <code>"bca"</code> and <code>"cab"</code> are also valid answers.</p>`,
    starter: `/*
 * Complete the 'lengthOfLongestSubstring' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts STRING s as parameter.
 */

function lengthOfLongestSubstring(s) {
    // Write your code here

}`,
    cases: [
      { args: ["abcabcbb"], expected: 3, sample: true },
      { args: ["bbbbb"], expected: 1, sample: true },
      { args: ["pwwkew"], expected: 3, sample: false },
      { args: [""], expected: 0, sample: false },
      { args: ["dvdf"], expected: 3, sample: false },
      { args: ["tmmzuxt"], expected: 5, sample: false },
    ],
  },
  {
    slug: "sherlock-and-anagrams",
    name: "Sherlock and Anagrams",
    category: "Strings & Sliding Window",
    difficulty: "Medium",
    maxScore: 50,
    successRate: "68.24%",
    fn: "sherlockAndAnagrams",
    statement: `
<p>Two strings are <em>anagrams</em> of each other if the letters of one string can be rearranged to form the other string. Given a string, find and return the number of pairs of substrings of the string that are anagrams of each other.</p>
<h3>Example</h3>
<p><code>s = "mom"</code></p>
<p>The list of all anagrammatic pairs is <code>[m, m]</code> and <code>[mo, om]</code>, so the answer is <code>2</code>.</p>
<h3>Function Description</h3>
<p>Complete the <code>sherlockAndAnagrams</code> function. It must return an integer.</p>
<h3>Constraints</h3>
<pre>2 ≤ |s| ≤ 100
s contains only lowercase letters.</pre>
<p><strong>Hint:</strong> canonicalize every substring (sort its letters) and count groups; each group of size k contributes k·(k−1)/2 pairs.</p>
<h3>Sample Input</h3>
<pre>abba
kkkk</pre>
<h3>Sample Output</h3>
<pre>4
10</pre>`,
    starter: `/*
 * Complete the 'sherlockAndAnagrams' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts STRING s as parameter.
 */

function sherlockAndAnagrams(s) {
    // Write your code here

}`,
    cases: [
      { args: ["abba"], expected: 4, sample: true },
      { args: ["kkkk"], expected: 10, sample: true },
      { args: ["ifailuhkqq"], expected: 3, sample: false },
      { args: ["cdcd"], expected: 5, sample: false },
      { args: ["mom"], expected: 2, sample: false },
    ],
  },
  {
    slug: "new-year-chaos",
    name: "New Year Chaos",
    category: "Arrays",
    difficulty: "Medium",
    maxScore: 40,
    successRate: "59.81%",
    fn: "minimumBribes",
    statement: `
<p>It is New Year's Day and people are in line for the Wonderland rollercoaster ride. Each person wears a sticker indicating their <em>initial</em> position in the queue from <code>1</code> to <code>n</code>.</p>
<p>Any person can bribe the person <strong>directly in front</strong> of them to swap positions, but a person can bribe <strong>at most two</strong> others.</p>
<p>Determine the minimum number of bribes that took place to get to the given queue order. If anyone has bribed more than two people, return the string <code>"Too chaotic"</code>; otherwise return the number of bribes as an integer.</p>
<h3>Function Description</h3>
<p>Complete the <code>minimumBribes</code> function.</p>
<ul><li><code>q</code>: the positions of the people after all bribes</li></ul>
<h3>Sample Input</h3>
<pre>[2, 1, 5, 3, 4]
[2, 5, 1, 3, 4]</pre>
<h3>Sample Output</h3>
<pre>3
Too chaotic</pre>
<h3>Explanation</h3>
<p>In the first case, person 2 bribed once and person 5 bribed twice: 3 total. In the second case, person 5 moved up three positions, which is not possible.</p>`,
    starter: `/*
 * Complete the 'minimumBribes' function below.
 *
 * Return an INTEGER (the bribe count) or the STRING "Too chaotic".
 * The function accepts INTEGER_ARRAY q as parameter.
 */

function minimumBribes(q) {
    // Write your code here

}`,
    cases: [
      { args: [[2, 1, 5, 3, 4]], expected: 3, sample: true },
      { args: [[2, 5, 1, 3, 4]], expected: "Too chaotic", sample: true },
      { args: [[1, 2, 5, 3, 7, 8, 6, 4]], expected: 7, sample: false },
      { args: [[5, 1, 2, 3, 7, 8, 6, 4]], expected: "Too chaotic", sample: false },
      { args: [[1, 2, 3, 4, 5]], expected: 0, sample: false },
    ],
  },
  {
    slug: "minimum-swaps-2",
    name: "Minimum Swaps 2",
    category: "Arrays",
    difficulty: "Medium",
    maxScore: 40,
    successRate: "66.90%",
    fn: "minimumSwaps",
    statement: `
<p>You are given an unordered array consisting of consecutive integers <code>[1, 2, 3, ..., n]</code> without any duplicates. You are allowed to swap any two elements. Find the minimum number of swaps required to sort the array in ascending order.</p>
<h3>Example</h3>
<p><code>arr = [7, 1, 3, 2, 4, 5, 6]</code></p>
<p>Perform these swaps: swap 7&harr;1, then walk each remaining element to its slot — 5 swaps total.</p>
<h3>Function Description</h3>
<p>Complete the <code>minimumSwaps</code> function. It must return an integer.</p>
<h3>Constraints</h3>
<pre>1 ≤ n ≤ 10^5</pre>
<p><strong>Hint:</strong> because values are exactly 1..n, index cycles solve this in O(n).</p>
<h3>Sample Input</h3>
<pre>[4, 3, 1, 2]</pre>
<h3>Sample Output</h3>
<pre>3</pre>`,
    starter: `/*
 * Complete the 'minimumSwaps' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER_ARRAY arr as parameter.
 */

function minimumSwaps(arr) {
    // Write your code here

}`,
    cases: [
      { args: [[4, 3, 1, 2]], expected: 3, sample: true },
      { args: [[7, 1, 3, 2, 4, 5, 6]], expected: 5, sample: true },
      { args: [[2, 3, 4, 1, 5]], expected: 3, sample: false },
      { args: [[1, 3, 5, 2, 4, 6, 7]], expected: 3, sample: false },
      { args: [[1, 2, 3]], expected: 0, sample: false },
    ],
  },
  {
    slug: "array-manipulation",
    name: "Array Manipulation",
    category: "Arrays",
    difficulty: "Hard",
    maxScore: 60,
    successRate: "54.29%",
    fn: "arrayManipulation",
    statement: `
<p>Starting with a 1-indexed array of zeros and a list of operations, for each operation add a value to each array element between two given indices, inclusive. Once all operations have been performed, return the <strong>maximum</strong> value in the array.</p>
<h3>Example</h3>
<p><code>n = 10</code>, <code>queries = [[1, 5, 3], [4, 8, 7], [6, 9, 1]]</code></p>
<p>After all operations the maximum value is <code>10</code> (indices 4 and 5 receive 3 + 7).</p>
<h3>Function Description</h3>
<p>Complete the <code>arrayManipulation</code> function.</p>
<ul><li><code>n</code>: the size of the array</li><li><code>queries</code>: an array of triples <code>[a, b, k]</code></li></ul>
<h3>Constraints</h3>
<pre>3 ≤ n ≤ 10^7
1 ≤ queries.length ≤ 2 * 10^5
0 ≤ k ≤ 10^9</pre>
<p><strong>Hint:</strong> a naive per-index loop is O(n·q) and will time out on the big hidden case. Use a difference array + prefix sum.</p>
<h3>Sample Input</h3>
<pre>5 3
1 2 100
2 5 100
3 4 100</pre>
<h3>Sample Output</h3>
<pre>200</pre>`,
    starter: `/*
 * Complete the 'arrayManipulation' function below.
 *
 * The function is expected to return a LONG_INTEGER.
 * The function accepts following parameters:
 *  1. INTEGER n
 *  2. 2D_INTEGER_ARRAY queries [[a, b, k], ...]
 */

function arrayManipulation(n, queries) {
    // Write your code here

}`,
    cases: [
      { args: [5, [[1, 2, 100], [2, 5, 100], [3, 4, 100]]], expected: 200, sample: true },
      { args: [10, [[1, 5, 3], [4, 8, 7], [6, 9, 1]]], expected: 10, sample: true },
      { args: [10, [[2, 6, 8], [3, 5, 7], [1, 8, 1], [5, 9, 15]]], expected: 31, sample: false },
      { args: [4, [[2, 3, 603], [1, 1, 286], [4, 4, 882]]], expected: 882, sample: false },
    ],
  },
  {
    slug: "flatten-nested-array",
    name: "Flatten a Nested Array",
    category: "Frontend JS",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "85.02%",
    fn: "flatten",
    statement: `
<p>A common frontend interview warm-up: implement <code>flatten</code>, which takes an arbitrarily nested array of values and returns a new flat array with all values in order.</p>
<p>Do not mutate the input. (Yes, <code>Array.prototype.flat(Infinity)</code> exists — interviewers usually ask you to implement it yourself with recursion or a stack, but any correct approach passes here.)</p>
<h3>Function Description</h3>
<p>Complete the <code>flatten</code> function. It must return a flat array.</p>
<h3>Sample Input</h3>
<pre>[[1, [2]], 3]</pre>
<h3>Sample Output</h3>
<pre>[1, 2, 3]</pre>`,
    starter: `/*
 * Complete the 'flatten' function below.
 *
 * The function is expected to return a flat ARRAY.
 * The function accepts a nested ARRAY arr as parameter.
 */

function flatten(arr) {
    // Write your code here

}`,
    cases: [
      { args: [[[1, [2]], 3]], expected: [1, 2, 3], sample: true },
      { args: [[1, [2, [3, [4]]]]], expected: [1, 2, 3, 4], sample: true },
      { args: [[]], expected: [], sample: false },
      { args: [[[[[["deep"]]]], "end"]], expected: ["deep", "end"], sample: false },
      { args: [[1, [], [2, []], 3]], expected: [1, 2, 3], sample: false },
    ],
  },
  {
    slug: "arrays-left-rotation",
    name: "Arrays: Left Rotation",
    category: "Arrays",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "91.33%",
    fn: "rotLeft",
    statement: `
<p>A <em>left rotation</em> operation on an array shifts each of the array's elements one unit to the left. For example, if 2 left rotations are performed on array <code>[1, 2, 3, 4, 5]</code>, then the array would become <code>[3, 4, 5, 1, 2]</code>. Note that the lowest index item moves to the highest index in a rotation.</p>
<p>Given an array <code>a</code> of <code>n</code> integers and a number, <code>d</code>, perform <code>d</code> left rotations on the array. Return the updated array.</p>
<h3>Function Description</h3>
<p>Complete the <code>rotLeft</code> function.</p>
<ul><li><code>a</code>: the array to rotate</li><li><code>d</code>: the number of rotations</li></ul>
<h3>Constraints</h3>
<pre>1 ≤ n ≤ 10^5
1 ≤ d ≤ n</pre>
<h3>Sample Input</h3>
<pre>5 4
1 2 3 4 5</pre>
<h3>Sample Output</h3>
<pre>5 1 2 3 4</pre>`,
    starter: `/*
 * Complete the 'rotLeft' function below.
 *
 * The function is expected to return an INTEGER_ARRAY.
 * The function accepts following parameters:
 *  1. INTEGER_ARRAY a
 *  2. INTEGER d
 */

function rotLeft(a, d) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 2, 3, 4, 5], 4], expected: [5, 1, 2, 3, 4], sample: true },
      { args: [[1, 2, 3, 4, 5], 1], expected: [2, 3, 4, 5, 1], sample: false },
      { args: [[1, 2, 3, 4, 5], 5], expected: [1, 2, 3, 4, 5], sample: false },
      { args: [[41, 73, 89, 7, 10, 1], 2], expected: [89, 7, 10, 1, 41, 73], sample: false },
    ],
  },
  {
    slug: "2d-array-hourglass",
    name: "2D Array — Hourglass Sum",
    category: "Arrays",
    difficulty: "Easy",
    maxScore: 30,
    successRate: "89.06%",
    fn: "hourglassSum",
    statement: `
<p>Given a <code>6 × 6</code> 2D array, an <em>hourglass</em> is a subset of values with indices falling in this pattern:</p>
<pre>a b c
  d
e f g</pre>
<p>There are 16 hourglasses in the array. An hourglass sum is the sum of an hourglass' values. Calculate the hourglass sum for every hourglass, then return the <strong>maximum</strong> hourglass sum. The array will always be <code>6 × 6</code>.</p>
<h3>Function Description</h3>
<p>Complete the <code>hourglassSum</code> function.</p>
<ul><li><code>arr</code>: a 2D array of integers (6 rows of 6 integers)</li></ul>
<h3>Constraints</h3>
<pre>-9 ≤ arr[i][j] ≤ 9</pre>
<h3>Sample Input</h3>
<pre>1 1 1 0 0 0
0 1 0 0 0 0
1 1 1 0 0 0
0 0 2 4 4 0
0 0 0 2 0 0
0 0 1 2 4 0</pre>
<h3>Sample Output</h3>
<pre>19</pre>
<h3>Explanation</h3>
<p>The hourglass with the maximum sum (19) is:</p>
<pre>2 4 4
  2
1 2 4</pre>`,
    starter: `/*
 * Complete the 'hourglassSum' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts 2D_INTEGER_ARRAY arr as parameter.
 */

function hourglassSum(arr) {
    // Write your code here

}`,
    cases: [
      { args: [[[1,1,1,0,0,0],[0,1,0,0,0,0],[1,1,1,0,0,0],[0,0,2,4,4,0],[0,0,0,2,0,0],[0,0,1,2,4,0]]], expected: 19, sample: true },
      { args: [[[-9,-9,-9,1,1,1],[0,-9,0,4,3,2],[-9,-9,-9,1,2,3],[0,0,8,6,6,0],[0,0,0,-2,0,0],[0,0,1,2,4,0]]], expected: 28, sample: false },
      { args: [[[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1]]], expected: -7, sample: false },
    ],
  },
  {
    slug: "balanced-brackets",
    name: "Balanced Brackets",
    category: "Stacks & Queues",
    difficulty: "Medium",
    maxScore: 25,
    successRate: "80.42%",
    fn: "isBalanced",
    statement: `
<p>A bracket is considered to be any one of the following characters: <code>(</code>, <code>)</code>, <code>{</code>, <code>}</code>, <code>[</code>, or <code>]</code>.</p>
<p>Two brackets are considered to be a matched pair if the opening bracket occurs to the left of its corresponding closing bracket and they enclose properly nested content. A string is <em>balanced</em> if every bracket is part of a matched pair.</p>
<p>Given a string of brackets, return <code>"YES"</code> if it is balanced or <code>"NO"</code> if it is not.</p>
<h3>Function Description</h3>
<p>Complete the <code>isBalanced</code> function.</p>
<h3>Constraints</h3>
<pre>1 ≤ |s| ≤ 10^3</pre>
<p><strong>Hint:</strong> this is the canonical stack problem — push openers, pop and match on closers.</p>
<h3>Sample Input</h3>
<pre>{[()]}
{[(])}
{{[[(())]]}}</pre>
<h3>Sample Output</h3>
<pre>YES
NO
YES</pre>`,
    starter: `/*
 * Complete the 'isBalanced' function below.
 *
 * The function is expected to return the STRING "YES" or "NO".
 * The function accepts STRING s as parameter.
 */

function isBalanced(s) {
    // Write your code here

}`,
    cases: [
      { args: ["{[()]}"], expected: "YES", sample: true },
      { args: ["{[(])}"], expected: "NO", sample: true },
      { args: ["{{[[(())]]}}"], expected: "YES", sample: false },
      { args: ["((("], expected: "NO", sample: false },
      { args: [")("], expected: "NO", sample: false },
      { args: ["([)]"], expected: "NO", sample: false },
    ],
  },
  {
    slug: "mark-and-toys",
    name: "Mark and Toys",
    category: "Sorting & Searching",
    difficulty: "Easy",
    maxScore: 35,
    successRate: "88.77%",
    fn: "maximumToys",
    statement: `
<p>Mark and Jane are very happy after having their first child. Their son loves toys, so Mark wants to buy some. There are a number of different toys lying in front of him, tagged with their prices. Mark has only a certain amount to spend, and he wants to <strong>maximize the number of toys</strong> he buys with this money. Note that a toy can be purchased only once.</p>
<h3>Function Description</h3>
<p>Complete the <code>maximumToys</code> function. It should return an integer representing the maximum number of toys Mark can purchase.</p>
<ul><li><code>prices</code>: the toy prices</li><li><code>k</code>: Mark's budget</li></ul>
<h3>Constraints</h3>
<pre>1 ≤ n ≤ 10^5
1 ≤ k ≤ 10^9</pre>
<h3>Sample Input</h3>
<pre>7 50
1 12 5 111 200 1000 10</pre>
<h3>Sample Output</h3>
<pre>4</pre>
<h3>Explanation</h3>
<p>He can buy only 4 toys at most. These toys have the following prices: 1, 12, 5, 10.</p>`,
    starter: `/*
 * Complete the 'maximumToys' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts following parameters:
 *  1. INTEGER_ARRAY prices
 *  2. INTEGER k
 */

function maximumToys(prices, k) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 12, 5, 111, 200, 1000, 10], 50], expected: 4, sample: true },
      { args: [[1, 2, 3, 4], 7], expected: 3, sample: false },
      { args: [[3, 7, 2, 9, 4], 15], expected: 3, sample: false },
      { args: [[100], 50], expected: 0, sample: false },
    ],
  },
  {
    slug: "ice-cream-parlor",
    name: "Ice Cream Parlor",
    category: "Sorting & Searching",
    difficulty: "Easy",
    maxScore: 30,
    successRate: "86.55%",
    fn: "icecreamParlor",
    statement: `
<p>Two friends like to pool their money and go to the ice cream parlor. They always choose two distinct flavors and they spend all of their money. Given a list of prices for the flavors of ice cream, select the two that will cost all of the money they have.</p>
<p>Return the <strong>1-based indices</strong> of the two flavors in ascending order. The test cases are guaranteed to have a unique solution.</p>
<h3>Function Description</h3>
<p>Complete the <code>icecreamParlor</code> function.</p>
<ul><li><code>m</code>: the amount of money they have to spend</li><li><code>arr</code>: the cost of each flavor of ice cream</li></ul>
<h3>Sample Input</h3>
<pre>m = 4, arr = [1, 4, 5, 3, 2]
m = 4, arr = [2, 2, 4, 3]</pre>
<h3>Sample Output</h3>
<pre>[1, 4]
[1, 2]</pre>
<h3>Explanation</h3>
<p>In the first case, the two flavors costing 1 and 3 sum to 4 — indices 1 and 4. In the second, the two flavors costing 2 each — indices 1 and 2.</p>`,
    starter: `/*
 * Complete the 'icecreamParlor' function below.
 *
 * The function is expected to return an INTEGER_ARRAY of two 1-based indices.
 * The function accepts following parameters:
 *  1. INTEGER m
 *  2. INTEGER_ARRAY arr
 */

function icecreamParlor(m, arr) {
    // Write your code here

}`,
    cases: [
      { args: [4, [1, 4, 5, 3, 2]], expected: [1, 4], sample: true },
      { args: [4, [2, 2, 4, 3]], expected: [1, 2], sample: true },
      { args: [6, [1, 3, 5, 7]], expected: [1, 3], sample: false },
      { args: [10, [2, 8, 3, 5]], expected: [1, 2], sample: false },
    ],
  },
  {
    slug: "climbing-the-leaderboard",
    name: "Climbing the Leaderboard",
    category: "Sorting & Searching",
    difficulty: "Medium",
    maxScore: 45,
    successRate: "63.87%",
    fn: "climbingLeaderboard",
    statement: `
<p>An arcade game player wants to climb to the top of the leaderboard and track their ranking. The game uses <em>Dense Ranking</em>: players with the same scores receive the same rank, and the next different score gets the immediately following rank.</p>
<p>Given the leaderboard scores (descending) and the player's scores in the order they were achieved (ascending), return the player's rank after each new score.</p>
<h3>Function Description</h3>
<p>Complete the <code>climbingLeaderboard</code> function.</p>
<ul><li><code>ranked</code>: the leaderboard scores, descending</li><li><code>player</code>: the player's scores, ascending</li></ul>
<h3>Constraints</h3>
<pre>1 ≤ ranked.length, player.length ≤ 2 × 10^5</pre>
<p><strong>Hint:</strong> dedupe the leaderboard first; then either binary-search each score or walk a pointer up from the bottom.</p>
<h3>Sample Input</h3>
<pre>ranked = [100, 100, 50, 40, 40, 20, 10]
player = [5, 25, 50, 120]</pre>
<h3>Sample Output</h3>
<pre>[6, 4, 2, 1]</pre>`,
    starter: `/*
 * Complete the 'climbingLeaderboard' function below.
 *
 * The function is expected to return an INTEGER_ARRAY.
 * The function accepts following parameters:
 *  1. INTEGER_ARRAY ranked
 *  2. INTEGER_ARRAY player
 */

function climbingLeaderboard(ranked, player) {
    // Write your code here

}`,
    cases: [
      { args: [[100, 100, 50, 40, 40, 20, 10], [5, 25, 50, 120]], expected: [6, 4, 2, 1], sample: true },
      { args: [[100, 90, 90, 80, 75, 60], [50, 65, 77, 90, 102]], expected: [6, 5, 4, 2, 1], sample: true },
      { args: [[50], [50]], expected: [1], sample: false },
      { args: [[100, 100, 100], [10, 100, 200]], expected: [2, 1, 1], sample: false },
    ],
  },
  {
    slug: "best-time-to-buy-sell-stock",
    name: "Best Time to Buy and Sell Stock",
    category: "Interview Classics",
    difficulty: "Easy",
    maxScore: 25,
    successRate: "82.11%",
    fn: "maxProfit",
    statement: `
<p>You are given an array <code>prices</code> where <code>prices[i]</code> is the price of a given stock on the <code>i</code>-th day.</p>
<p>You want to maximize your profit by choosing a <strong>single day</strong> to buy one stock and choosing a <strong>different day in the future</strong> to sell that stock. Return the maximum profit you can achieve. If you cannot achieve any profit, return <code>0</code>.</p>
<h3>Function Description</h3>
<p>Complete the <code>maxProfit</code> function. It must return an integer.</p>
<h3>Constraints</h3>
<pre>1 ≤ prices.length ≤ 10^5</pre>
<p><strong>Hint:</strong> one pass — track the minimum price so far and the best spread.</p>
<h3>Sample Input</h3>
<pre>[7, 1, 5, 3, 6, 4]</pre>
<h3>Sample Output</h3>
<pre>5</pre>
<h3>Explanation</h3>
<p>Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 − 1 = 5.</p>`,
    starter: `/*
 * Complete the 'maxProfit' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER_ARRAY prices as parameter.
 */

function maxProfit(prices) {
    // Write your code here

}`,
    cases: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5, sample: true },
      { args: [[7, 6, 4, 3, 1]], expected: 0, sample: true },
      { args: [[2, 4, 1]], expected: 2, sample: false },
      { args: [[1, 2]], expected: 1, sample: false },
      { args: [[3]], expected: 0, sample: false },
    ],
  },
  {
    slug: "merge-intervals",
    name: "Merge Intervals",
    category: "Interview Classics",
    difficulty: "Medium",
    maxScore: 35,
    successRate: "69.48%",
    fn: "merge",
    statement: `
<p>Given an array of <code>intervals</code> where <code>intervals[i] = [start, end]</code>, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input, sorted by start.</p>
<h3>Function Description</h3>
<p>Complete the <code>merge</code> function. It must return a 2D array of intervals.</p>
<h3>Constraints</h3>
<pre>1 ≤ intervals.length ≤ 10^4
0 ≤ start ≤ end ≤ 10^4</pre>
<p><strong>Hint:</strong> sort by start, then sweep and extend the current interval while the next one overlaps. Intervals touching at a point (e.g. [1,4] and [4,5]) merge.</p>
<h3>Sample Input</h3>
<pre>[[1, 3], [2, 6], [8, 10], [15, 18]]</pre>
<h3>Sample Output</h3>
<pre>[[1, 6], [8, 10], [15, 18]]</pre>`,
    starter: `/*
 * Complete the 'merge' function below.
 *
 * The function is expected to return a 2D_INTEGER_ARRAY.
 * The function accepts 2D_INTEGER_ARRAY intervals as parameter.
 */

function merge(intervals) {
    // Write your code here

}`,
    cases: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]], sample: true },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]], sample: true },
      { args: [[[1, 4], [0, 2], [3, 5]]], expected: [[0, 5]], sample: false },
      { args: [[[1, 4]]], expected: [[1, 4]], sample: false },
      { args: [[[5, 6], [1, 2]]], expected: [[1, 2], [5, 6]], sample: false },
    ],
  },
  {
    slug: "trapping-rain-water",
    name: "Trapping Rain Water",
    category: "Interview Classics",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "48.36%",
    fn: "trap",
    statement: `
<p>Given <code>n</code> non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.</p>
<h3>Function Description</h3>
<p>Complete the <code>trap</code> function. It must return an integer — the total units of trapped water.</p>
<h3>Constraints</h3>
<pre>1 ≤ height.length ≤ 2 × 10^4
0 ≤ height[i] ≤ 10^5</pre>
<p><strong>Hint:</strong> water above bar <code>i</code> is <code>min(maxLeft, maxRight) − height[i]</code>. Two pointers gets you the O(n) time / O(1) space follow-up interviewers always ask for.</p>
<h3>Sample Input</h3>
<pre>[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]</pre>
<h3>Sample Output</h3>
<pre>6</pre>
<h3>Explanation</h3>
<p>The elevation map traps 6 units of rain water in the valleys between the taller bars.</p>`,
    starter: `/*
 * Complete the 'trap' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER_ARRAY height as parameter.
 */

function trap(height) {
    // Write your code here

}`,
    cases: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6, sample: true },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9, sample: true },
      { args: [[1, 2, 3]], expected: 0, sample: false },
      { args: [[5, 0, 5]], expected: 5, sample: false },
      { args: [[2, 0, 2, 0, 2]], expected: 4, sample: false },
    ],
  },
  {
    slug: "largest-rectangle",
    name: "Largest Rectangle",
    category: "Stacks & Queues",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "51.72%",
    fn: "largestRectangle",
    statement: `
<p>There are a number of buildings in a certain two-dimensional landscape. Each building has a height given by <code>h[i]</code>, and all buildings have unit width. You want to place a large solid rectangular advertisement on the sides of several contiguous buildings.</p>
<p>Given the array of building heights, find the largest rectangular area possible where the rectangle spans contiguous buildings and its height does not exceed any of them.</p>
<h3>Function Description</h3>
<p>Complete the <code>largestRectangle</code> function. It must return an integer — the area of the largest rectangle.</p>
<h3>Constraints</h3>
<pre>1 ≤ h.length ≤ 10^5
1 ≤ h[i] ≤ 10^6</pre>
<p><strong>Hint:</strong> a monotonic stack of indices gives O(n). For each bar popped, the popped height times the width between the new stack top and the current index is a candidate area.</p>
<h3>Sample Input</h3>
<pre>[1, 2, 3, 4, 5]</pre>
<h3>Sample Output</h3>
<pre>9</pre>
<h3>Explanation</h3>
<p>The best option is height 3 spanning the last three buildings: 3 × 3 = 9.</p>`,
    starter: `/*
 * Complete the 'largestRectangle' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER_ARRAY h as parameter.
 */

function largestRectangle(h) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 2, 3, 4, 5]], expected: 9, sample: true },
      { args: [[2, 1, 5, 6, 2, 3]], expected: 10, sample: true },
      { args: [[11, 11, 10, 10, 10]], expected: 50, sample: false },
      { args: [[1]], expected: 1, sample: false },
      { args: [[6, 2, 5, 4, 5, 1, 6]], expected: 12, sample: false },
    ],
  },
  {
    slug: "fraudulent-activity-notifications",
    name: "Fraudulent Activity Notifications",
    category: "Sorting & Searching",
    difficulty: "Hard",
    maxScore: 45,
    successRate: "44.19%",
    fn: "activityNotifications",
    statement: `
<p>HackerLand National Bank monitors spending. If the amount spent by a client on a particular day is <strong>greater than or equal to twice the client's median spending</strong> for a trailing number of days, they send a notification.</p>
<p>Given the client's total daily expenditures for a period of days and the number of trailing days <code>d</code> used to calculate the median, determine how many notifications are sent over the period. No notifications are sent until there are at least <code>d</code> prior days of data.</p>
<h3>Function Description</h3>
<p>Complete the <code>activityNotifications</code> function with parameters <code>expenditure</code> (integer array) and <code>d</code> (integer). It must return an integer — the number of notifications.</p>
<h3>Constraints</h3>
<pre>1 ≤ d ≤ expenditure.length ≤ 2 × 10^5
0 ≤ expenditure[i] ≤ 200</pre>
<p><strong>Hint:</strong> with an even <code>d</code>, the median is the average of the two middle values. Values are capped at 200 — a counting-sort sliding window beats re-sorting each day.</p>
<h3>Sample Input</h3>
<pre>expenditure = [2, 3, 4, 2, 3, 6, 8, 4, 5], d = 5</pre>
<h3>Sample Output</h3>
<pre>2</pre>
<h3>Explanation</h3>
<p>Day 6 spends 6 against a trailing median of 3 (6 ≥ 6 → notify). Day 7 spends 8 against a trailing median of 3 (8 ≥ 6 → notify). No other day triggers.</p>`,
    starter: `/*
 * Complete the 'activityNotifications' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER_ARRAY expenditure and INTEGER d as parameters.
 */

function activityNotifications(expenditure, d) {
    // Write your code here

}`,
    cases: [
      { args: [[2, 3, 4, 2, 3, 6, 8, 4, 5], 5], expected: 2, sample: true },
      { args: [[1, 2, 3, 4, 4], 4], expected: 0, sample: true },
      { args: [[10, 20, 30, 40, 50], 3], expected: 1, sample: false },
      { args: [[1, 1, 1, 1, 1, 1], 2], expected: 0, sample: false },
    ],
  },
  {
    slug: "common-child",
    name: "Common Child",
    category: "Dynamic Programming",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "58.63%",
    fn: "commonChild",
    statement: `
<p>A string is said to be a child of another string if it can be formed by deleting 0 or more characters from the other string (without reordering). Given two strings of equal length, what's the longest string that can be constructed such that it is a child of both?</p>
<h3>Function Description</h3>
<p>Complete the <code>commonChild</code> function with parameters <code>s1</code> and <code>s2</code>. It must return an integer — the length of the longest common child.</p>
<h3>Constraints</h3>
<pre>1 ≤ s1.length = s2.length ≤ 5000
All characters are uppercase A–Z.</pre>
<p><strong>Hint:</strong> this is Longest Common Subsequence. Classic DP: <code>dp[i][j]</code> = LCS of the first <code>i</code> chars of <code>s1</code> and first <code>j</code> chars of <code>s2</code>.</p>
<h3>Sample Input</h3>
<pre>s1 = "HARRY", s2 = "SALLY"</pre>
<h3>Sample Output</h3>
<pre>2</pre>
<h3>Explanation</h3>
<p>The longest string that can be formed by deleting characters from both is <code>AY</code>, of length 2.</p>`,
    starter: `/*
 * Complete the 'commonChild' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts STRING s1 and STRING s2 as parameters.
 */

function commonChild(s1, s2) {
    // Write your code here

}`,
    cases: [
      { args: ["HARRY", "SALLY"], expected: 2, sample: true },
      { args: ["AA", "BB"], expected: 0, sample: true },
      { args: ["SHINCHAN", "NOHARAAA"], expected: 3, sample: false },
      { args: ["ABCDEF", "FBDAMN"], expected: 2, sample: false },
      { args: ["ABAB", "BABA"], expected: 3, sample: false },
    ],
  },
  {
    slug: "candies",
    name: "Candies",
    category: "Dynamic Programming",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "55.04%",
    fn: "candies",
    statement: `
<p>Alice is a kindergarten teacher. She wants to give some candies to the children in her class. All the children sit in a line, each with a rating. Alice wants to distribute candies with two rules:</p>
<ul>
<li>Every child gets at least one candy.</li>
<li>Any child with a higher rating than an <strong>adjacent</strong> child must get more candies than that neighbor.</li>
</ul>
<p>Determine the minimum number of candies Alice must buy.</p>
<h3>Function Description</h3>
<p>Complete the <code>candies</code> function with parameters <code>n</code> (number of children) and <code>arr</code> (ratings). It must return an integer — the minimum total candies.</p>
<h3>Constraints</h3>
<pre>1 ≤ n ≤ 10^5
1 ≤ arr[i] ≤ 10^5</pre>
<p><strong>Hint:</strong> two passes. Left-to-right: rising rating → one more than the left neighbor. Right-to-left: take the max of the current value and (right neighbor + 1) when falling. Equal neighbors carry no constraint.</p>
<h3>Sample Input</h3>
<pre>n = 3, arr = [1, 2, 2]</pre>
<h3>Sample Output</h3>
<pre>4</pre>
<h3>Explanation</h3>
<p>Give the children 1, 2, 1 candies — the third child's rating equals the second's, so 1 is allowed. Total 4.</p>`,
    starter: `/*
 * Complete the 'candies' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER n and INTEGER_ARRAY arr as parameters.
 */

function candies(n, arr) {
    // Write your code here

}`,
    cases: [
      { args: [3, [1, 2, 2]], expected: 4, sample: true },
      { args: [6, [4, 6, 4, 5, 6, 2]], expected: 10, sample: true },
      { args: [10, [2, 4, 2, 6, 1, 7, 8, 9, 2, 1]], expected: 19, sample: false },
      { args: [4, [1, 1, 1, 1]], expected: 4, sample: false },
      { args: [5, [5, 4, 3, 2, 1]], expected: 15, sample: false },
    ],
  },
  {
    slug: "rest-api-total-goals",
    name: "REST API: Total Goals by a Team",
    category: "REST API",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "48.22%",
    fn: "getTotalGoals",
    statement: `
<p>A faithful replica of the HackerRank <em>REST API (Intermediate)</em> certification question. The endpoint
<code>https://jsonmock.hackerrank.com/api/football_matches</code> (mirrored offline in the boilerplate with the exact
same contract) returns paginated football match records:</p>
<pre>GET ?year=&lt;year&gt;&amp;team1=&lt;name&gt;&amp;page=&lt;n&gt;
GET ?year=&lt;year&gt;&amp;team2=&lt;name&gt;&amp;page=&lt;n&gt;

{ "page": 1, "per_page": 2, "total": 3, "total_pages": 2,
  "data": [ { "year": 2011, "team1": "Barcelona", "team2": "Chelsea",
              "team1goals": "3", "team2goals": "1" }, ... ] }</pre>
<p>Complete <code>async function getTotalGoals(team, year)</code>: return the <strong>total number of goals the team
scored in that year</strong>, whether playing as <code>team1</code> or <code>team2</code>.</p>
<h3>Keep in mind</h3>
<ul>
<li>You need <strong>two</strong> query series: one with <code>team1=&lt;team&gt;</code> (sum <code>team1goals</code>)
and one with <code>team2=&lt;team&gt;</code> (sum <code>team2goals</code>).</li>
<li>Results are paginated (<code>per_page</code> is 2 here) — loop pages until <code>total_pages</code>.
A single-page fetch passes the sample but fails hidden tests.</li>
<li><strong>Goal counts are strings</strong> (<code>"3"</code>, not <code>3</code>) — exactly like the real API.
Convert with <code>parseInt</code> or <code>Number</code> before summing.</li>
<li>Use <code>await fetch(url)</code> then <code>await res.json()</code> — the mirror behaves like real fetch.</li>
</ul>
<h3>Sample</h3>
<pre>getTotalGoals("Barcelona", 2011) → 12</pre>`,
    starter: `/*
 * Complete 'getTotalGoals' below. It is async — return (or resolve to) an INTEGER.
 *  1. STRING team
 *  2. INTEGER year
 */

async function getTotalGoals(team, year) {
    // Write your code here.
    // Build URLs like:
    // "https://jsonmock.hackerrank.com/api/football_matches?year=" + year + "&team1=" + encodeURIComponent(team) + "&page=" + page

}

/* ---- OFFLINE MIRROR of the real endpoint (do not modify) ---- */
const FOOTBALL_MATCHES = [
    { year: 2011, team1: "Barcelona", team2: "Chelsea",  team1goals: "3", team2goals: "1" },
    { year: 2011, team1: "Chelsea",   team2: "Barcelona", team1goals: "2", team2goals: "2" },
    { year: 2011, team1: "Barcelona", team2: "Bayern",   team1goals: "1", team2goals: "0" },
    { year: 2011, team1: "Bayern",    team2: "Barcelona", team1goals: "0", team2goals: "0" },
    { year: 2011, team1: "Chelsea",   team2: "Bayern",   team1goals: "2", team2goals: "1" },
    { year: 2011, team1: "Bayern",    team2: "Chelsea",  team1goals: "3", team2goals: "3" },
    { year: 2011, team1: "Barcelona", team2: "Arsenal",  team1goals: "4", team2goals: "1" },
    { year: 2011, team1: "Arsenal",   team2: "Barcelona", team1goals: "2", team2goals: "2" },
    { year: 2011, team1: "Chelsea",   team2: "Arsenal",  team1goals: "1", team2goals: "0" },
    { year: 2011, team1: "Arsenal",   team2: "Chelsea",  team1goals: "0", team2goals: "0" },
    { year: 2011, team1: "Bayern",    team2: "Arsenal",  team1goals: "5", team2goals: "1" },
    { year: 2011, team1: "Arsenal",   team2: "Bayern",   team1goals: "1", team2goals: "1" },
    { year: 2012, team1: "Barcelona", team2: "Chelsea",  team1goals: "2", team2goals: "1" },
    { year: 2012, team1: "Chelsea",   team2: "Barcelona", team1goals: "1", team2goals: "3" },
    { year: 2012, team1: "Barcelona", team2: "Bayern",   team1goals: "0", team2goals: "4" },
    { year: 2012, team1: "Bayern",    team2: "Barcelona", team1goals: "2", team2goals: "0" },
    { year: 2012, team1: "Chelsea",   team2: "Bayern",   team1goals: "1", team2goals: "1" },
    { year: 2012, team1: "Bayern",    team2: "Chelsea",  team1goals: "2", team2goals: "2" },
    { year: 2012, team1: "Barcelona", team2: "Arsenal",  team1goals: "1", team2goals: "1" },
    { year: 2012, team1: "Arsenal",   team2: "Barcelona", team1goals: "0", team2goals: "3" },
    { year: 2012, team1: "Chelsea",   team2: "Arsenal",  team1goals: "2", team2goals: "0" },
    { year: 2012, team1: "Arsenal",   team2: "Chelsea",  team1goals: "1", team2goals: "2" },
    { year: 2012, team1: "Bayern",    team2: "Arsenal",  team1goals: "3", team2goals: "0" },
    { year: 2012, team1: "Arsenal",   team2: "Bayern",   team1goals: "0", team2goals: "0" },
];
function mockFootballFetch(url) {
    const q = {};
    (url.split("?")[1] || "").split("&").forEach(function (kv) {
        const p = kv.split("=");
        if (p[0]) q[p[0]] = decodeURIComponent(p[1] || "");
    });
    const hits = FOOTBALL_MATCHES.filter(function (m) {
        if (q.year !== undefined && String(m.year) !== q.year) return false;
        if (q.team1 !== undefined && m.team1 !== q.team1) return false;
        if (q.team2 !== undefined && m.team2 !== q.team2) return false;
        if (q.team1goals !== undefined && m.team1goals !== q.team1goals) return false;
        if (q.team2goals !== undefined && m.team2goals !== q.team2goals) return false;
        return true;
    });
    const per = 2;
    const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
    const body = {
        page: page, per_page: per, total: hits.length,
        total_pages: Math.max(1, Math.ceil(hits.length / per)),
        data: hits.slice((page - 1) * per, page * per),
    };
    return new Promise(function (resolve) {
        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 5);
    });
}
const fetch = mockFootballFetch;`,
    cases: [
      { args: ["Barcelona", 2011], expected: 12, sample: true },
      { args: ["Chelsea", 2011], expected: 9, sample: true },
      { args: ["Bayern", 2012], expected: 12, sample: false },
      { args: ["Arsenal", 2012], expected: 2, sample: false },
      { args: ["Barcelona", 2012], expected: 9, sample: false },
    ],
  },
  {
    slug: "rest-api-num-drawn-matches",
    name: "REST API: Number of Drawn Matches",
    category: "REST API",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "44.87%",
    fn: "getNumDraws",
    statement: `
<p>Another real <em>REST API (Intermediate)</em> certification question. Same endpoint and mirror as
&ldquo;Total Goals&rdquo;: <code>https://jsonmock.hackerrank.com/api/football_matches</code>, which also accepts
<code>team1goals</code> and <code>team2goals</code> as query parameters:</p>
<pre>GET ?year=&lt;year&gt;&amp;team1goals=&lt;g&gt;&amp;team2goals=&lt;g&gt;&amp;page=&lt;n&gt;</pre>
<p>Complete <code>async function getNumDraws(year)</code>: return the number of matches in that year that ended in a
<strong>draw</strong> (team1goals equals team2goals).</p>
<h3>Keep in mind</h3>
<ul>
<li>The intended (and fastest) solution never paginates: query
<code>?year=Y&amp;team1goals=k&amp;team2goals=k</code> for each score <code>k</code> from 0 to 10 and sum the
<code>total</code> field of each response. The <code>total</code> is the full match count for that filter,
regardless of pagination.</li>
<li>Goal query values are strings on the wire — <code>"0"</code> through <code>"10"</code> all work.</li>
<li>A brute-force version (fetch every page of the year and compare goals) also passes — but practice the
<code>total</code>-field trick; on the real clock it is the difference between 4 minutes and 15.</li>
</ul>
<h3>Sample</h3>
<pre>getNumDraws(2011) → 6</pre>`,
    starter: `/*
 * Complete 'getNumDraws' below. It is async — return (or resolve to) an INTEGER.
 *  1. INTEGER year
 */

async function getNumDraws(year) {
    // Write your code here.
    // Hint: sum the "total" field of
    // "https://jsonmock.hackerrank.com/api/football_matches?year=" + year + "&team1goals=" + k + "&team2goals=" + k
    // for k = 0..10 — no pagination needed.

}

/* ---- OFFLINE MIRROR of the real endpoint (do not modify) ---- */
const FOOTBALL_MATCHES = [
    { year: 2011, team1: "Barcelona", team2: "Chelsea",  team1goals: "3", team2goals: "1" },
    { year: 2011, team1: "Chelsea",   team2: "Barcelona", team1goals: "2", team2goals: "2" },
    { year: 2011, team1: "Barcelona", team2: "Bayern",   team1goals: "1", team2goals: "0" },
    { year: 2011, team1: "Bayern",    team2: "Barcelona", team1goals: "0", team2goals: "0" },
    { year: 2011, team1: "Chelsea",   team2: "Bayern",   team1goals: "2", team2goals: "1" },
    { year: 2011, team1: "Bayern",    team2: "Chelsea",  team1goals: "3", team2goals: "3" },
    { year: 2011, team1: "Barcelona", team2: "Arsenal",  team1goals: "4", team2goals: "1" },
    { year: 2011, team1: "Arsenal",   team2: "Barcelona", team1goals: "2", team2goals: "2" },
    { year: 2011, team1: "Chelsea",   team2: "Arsenal",  team1goals: "1", team2goals: "0" },
    { year: 2011, team1: "Arsenal",   team2: "Chelsea",  team1goals: "0", team2goals: "0" },
    { year: 2011, team1: "Bayern",    team2: "Arsenal",  team1goals: "5", team2goals: "1" },
    { year: 2011, team1: "Arsenal",   team2: "Bayern",   team1goals: "1", team2goals: "1" },
    { year: 2012, team1: "Barcelona", team2: "Chelsea",  team1goals: "2", team2goals: "1" },
    { year: 2012, team1: "Chelsea",   team2: "Barcelona", team1goals: "1", team2goals: "3" },
    { year: 2012, team1: "Barcelona", team2: "Bayern",   team1goals: "0", team2goals: "4" },
    { year: 2012, team1: "Bayern",    team2: "Barcelona", team1goals: "2", team2goals: "0" },
    { year: 2012, team1: "Chelsea",   team2: "Bayern",   team1goals: "1", team2goals: "1" },
    { year: 2012, team1: "Bayern",    team2: "Chelsea",  team1goals: "2", team2goals: "2" },
    { year: 2012, team1: "Barcelona", team2: "Arsenal",  team1goals: "1", team2goals: "1" },
    { year: 2012, team1: "Arsenal",   team2: "Barcelona", team1goals: "0", team2goals: "3" },
    { year: 2012, team1: "Chelsea",   team2: "Arsenal",  team1goals: "2", team2goals: "0" },
    { year: 2012, team1: "Arsenal",   team2: "Chelsea",  team1goals: "1", team2goals: "2" },
    { year: 2012, team1: "Bayern",    team2: "Arsenal",  team1goals: "3", team2goals: "0" },
    { year: 2012, team1: "Arsenal",   team2: "Bayern",   team1goals: "0", team2goals: "0" },
];
function mockFootballFetch(url) {
    const q = {};
    (url.split("?")[1] || "").split("&").forEach(function (kv) {
        const p = kv.split("=");
        if (p[0]) q[p[0]] = decodeURIComponent(p[1] || "");
    });
    const hits = FOOTBALL_MATCHES.filter(function (m) {
        if (q.year !== undefined && String(m.year) !== q.year) return false;
        if (q.team1 !== undefined && m.team1 !== q.team1) return false;
        if (q.team2 !== undefined && m.team2 !== q.team2) return false;
        if (q.team1goals !== undefined && m.team1goals !== q.team1goals) return false;
        if (q.team2goals !== undefined && m.team2goals !== q.team2goals) return false;
        return true;
    });
    const per = 2;
    const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
    const body = {
        page: page, per_page: per, total: hits.length,
        total_pages: Math.max(1, Math.ceil(hits.length / per)),
        data: hits.slice((page - 1) * per, page * per),
    };
    return new Promise(function (resolve) {
        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 5);
    });
}
const fetch = mockFootballFetch;`,
    cases: [
      { args: [2011], expected: 6, sample: true },
      { args: [2012], expected: 4, sample: false },
      { args: [1999], expected: 0, sample: false },
    ],
  },
  {
    slug: "rest-api-movie-titles",
    name: "REST API: Movie Titles (Paginated Search)",
    category: "REST API",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "61.30%",
    fn: "getMovieTitles",
    statement: `
<p>The classic warm-up from the HackerRank REST API certification. The endpoint
<code>https://jsonmock.hackerrank.com/api/movies/search/?Title=&lt;substring&gt;&amp;page=&lt;n&gt;</code>
(mirrored offline below) returns paginated movies whose <code>Title</code> contains the substring
(case-insensitive):</p>
<pre>{ "page": 1, "per_page": 3, "total": 7, "total_pages": 3,
  "data": [ { "Title": "Waterman", "Year": 2011, "imdbID": "tt1229340" }, ... ] }</pre>
<p>Complete <code>async function getMovieTitles(substr)</code>: return an array of ALL matching titles across
every page, <strong>sorted alphabetically</strong> (plain <code>.sort()</code> order).</p>
<h3>Keep in mind</h3>
<ul>
<li>Fetch page 1 first to learn <code>total_pages</code>, then loop the remaining pages.</li>
<li>Sort once at the end, not per page — pages arrive in API order, not alphabetical.</li>
<li>No matches → return an empty array, not null.</li>
</ul>
<h3>Sample</h3>
<pre>getMovieTitles("the") → ["Manchester by the Sea", "The Matrix"]</pre>`,
    starter: `/*
 * Complete 'getMovieTitles' below. It is async — return (or resolve to) a STRING_ARRAY.
 *  1. STRING substr
 */

async function getMovieTitles(substr) {
    // Write your code here.
    // URL: "https://jsonmock.hackerrank.com/api/movies/search/?Title=" + encodeURIComponent(substr) + "&page=" + page

}

/* ---- OFFLINE MIRROR of the real endpoint (do not modify) ---- */
const MOVIE_ROWS = [
    { Title: "Waterman", Year: 2011, imdbID: "tt1229340" },
    { Title: "Superman Returns", Year: 2006, imdbID: "tt0348150" },
    { Title: "Batman Begins", Year: 2005, imdbID: "tt0372784" },
    { Title: "Spiderman", Year: 2002, imdbID: "tt0145487" },
    { Title: "Iron Man", Year: 2008, imdbID: "tt0371746" },
    { Title: "The Matrix", Year: 1999, imdbID: "tt0133093" },
    { Title: "Inception", Year: 2010, imdbID: "tt1375666" },
    { Title: "Interstellar", Year: 2014, imdbID: "tt0816692" },
    { Title: "Gravity", Year: 2013, imdbID: "tt1454468" },
    { Title: "Arrival", Year: 2016, imdbID: "tt2543164" },
    { Title: "Manchester by the Sea", Year: 2016, imdbID: "tt4034228" },
    { Title: "Mandarin", Year: 2018, imdbID: "tt7excl01" },
    { Title: "Tenet", Year: 2020, imdbID: "tt6723592" },
    { Title: "Dune", Year: 2021, imdbID: "tt1160419" },
    { Title: "Parasite", Year: 2019, imdbID: "tt6751668" },
];
function mockMoviesFetch(url) {
    const q = {};
    (url.split("?")[1] || "").split("&").forEach(function (kv) {
        const p = kv.split("=");
        if (p[0]) q[p[0]] = decodeURIComponent(p[1] || "");
    });
    const t = (q.Title || "").toLowerCase();
    const hits = MOVIE_ROWS.filter(function (m) { return m.Title.toLowerCase().indexOf(t) !== -1; });
    const per = 3;
    const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
    const body = {
        page: page, per_page: per, total: hits.length,
        total_pages: Math.max(1, Math.ceil(hits.length / per)),
        data: hits.slice((page - 1) * per, page * per),
    };
    return new Promise(function (resolve) {
        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 5);
    });
}
const fetch = mockMoviesFetch;`,
    cases: [
      { args: ["the"], expected: ["Manchester by the Sea", "The Matrix"], sample: true },
      { args: ["man"], expected: ["Batman Begins", "Iron Man", "Manchester by the Sea", "Mandarin", "Spiderman", "Superman Returns", "Waterman"], sample: false },
      { args: ["in"], expected: ["Batman Begins", "Inception", "Interstellar", "Mandarin"], sample: false },
      { args: ["xyz"], expected: [], sample: false },
    ],
  },
  {
    slug: "backend-rest-router",
    name: "Backend: Design an In-Memory REST API",
    category: "Backend",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "31.08%",
    fn: "processRequests",
    statement: `
<p>Design the request-handling layer of a small REST service — the kind of question full-stack HackerRank tests use
to probe API-design judgment (routing, status codes, validation) without a real server.</p>
<p>Complete <code>processRequests(requests)</code>. It receives an ordered array of request objects
<code>{ method, path, body }</code> against a fresh, empty in-memory <code>items</code> collection, and must return an
array of response objects <code>{ status, body }</code>, one per request, in order.</p>
<h3>Endpoints to implement</h3>
<ul>
<li><code>POST /items</code> — body is <code>{ name, price }</code>. If <code>name</code> is a non-empty string AND
<code>price</code> is a number ≥ 0: create the item with an auto-incrementing integer <code>id</code> starting at 1,
and respond <code>201</code> with body <code>{ id, name, price }</code>. Otherwise respond <code>400</code> with body
<code>{ error: "invalid item" }</code> (invalid requests must NOT consume an id).</li>
<li><code>GET /items</code> — respond <code>200</code> with the array of all items in creation order.</li>
<li><code>GET /items?minPrice=X</code> — same, filtered to <code>price &gt;= X</code> (X is numeric text).</li>
<li><code>GET /items/&lt;id&gt;</code> — respond <code>200</code> with the item, or <code>404</code> with
<code>{ error: "not found" }</code>.</li>
<li><code>DELETE /items/&lt;id&gt;</code> — remove it and respond <code>204</code> with body <code>null</code>, or
<code>404</code> with <code>{ error: "not found" }</code>. Deleted ids are never reused.</li>
<li>Any other method or path — respond <code>404</code> with <code>{ error: "not found" }</code>.</li>
</ul>
<h3>Keep in mind</h3>
<ul>
<li>Parse the query string yourself — <code>path</code> is a plain string like <code>"/items?minPrice=10"</code>.</li>
<li>Status-code discipline is what is being graded: 201 for created, 204 for deleted (with null body),
400 for bad input, 404 for missing.</li>
<li>State lives across requests within one call to <code>processRequests</code>, and resets between calls.</li>
</ul>
<h3>Sample</h3>
<pre>processRequests([
  { method: "POST", path: "/items", body: { name: "pen", price: 2 } },
  { method: "GET",  path: "/items/1", body: null }
])
→ [ { status: 201, body: { id: 1, name: "pen", price: 2 } },
    { status: 200, body: { id: 1, name: "pen", price: 2 } } ]</pre>`,
    starter: `/*
 * Complete 'processRequests' below.
 * requests: ARRAY of { method: STRING, path: STRING, body: OBJECT|null }
 * Return: ARRAY of { status: INTEGER, body: OBJECT|ARRAY|null }
 */

function processRequests(requests) {
    // Write your code here

}`,
    cases: [
      { args: [[
          { method: "POST", path: "/items", body: { name: "pen", price: 2 } },
          { method: "GET", path: "/items/1", body: null },
        ]],
        expected: [
          { status: 201, body: { id: 1, name: "pen", price: 2 } },
          { status: 200, body: { id: 1, name: "pen", price: 2 } },
        ], sample: true },
      { args: [[
          { method: "POST", path: "/items", body: { name: "pen", price: 2 } },
          { method: "POST", path: "/items", body: { name: "book", price: 12.5 } },
          { method: "POST", path: "/items", body: { name: "", price: 3 } },
          { method: "POST", path: "/items", body: { name: "lamp", price: -1 } },
          { method: "POST", path: "/items", body: { name: "desk", price: 120 } },
          { method: "GET", path: "/items", body: null },
        ]],
        expected: [
          { status: 201, body: { id: 1, name: "pen", price: 2 } },
          { status: 201, body: { id: 2, name: "book", price: 12.5 } },
          { status: 400, body: { error: "invalid item" } },
          { status: 400, body: { error: "invalid item" } },
          { status: 201, body: { id: 3, name: "desk", price: 120 } },
          { status: 200, body: [
            { id: 1, name: "pen", price: 2 },
            { id: 2, name: "book", price: 12.5 },
            { id: 3, name: "desk", price: 120 },
          ] },
        ], sample: true },
      { args: [[
          { method: "POST", path: "/items", body: { name: "pen", price: 2 } },
          { method: "POST", path: "/items", body: { name: "book", price: 12.5 } },
          { method: "POST", path: "/items", body: { name: "desk", price: 120 } },
          { method: "GET", path: "/items?minPrice=10", body: null },
          { method: "GET", path: "/items?minPrice=1000", body: null },
        ]],
        expected: [
          { status: 201, body: { id: 1, name: "pen", price: 2 } },
          { status: 201, body: { id: 2, name: "book", price: 12.5 } },
          { status: 201, body: { id: 3, name: "desk", price: 120 } },
          { status: 200, body: [
            { id: 2, name: "book", price: 12.5 },
            { id: 3, name: "desk", price: 120 },
          ] },
          { status: 200, body: [] },
        ], sample: false },
      { args: [[
          { method: "POST", path: "/items", body: { name: "pen", price: 2 } },
          { method: "DELETE", path: "/items/1", body: null },
          { method: "GET", path: "/items/1", body: null },
          { method: "DELETE", path: "/items/1", body: null },
          { method: "POST", path: "/items", body: { name: "book", price: 5 } },
          { method: "GET", path: "/items", body: null },
        ]],
        expected: [
          { status: 201, body: { id: 1, name: "pen", price: 2 } },
          { status: 204, body: null },
          { status: 404, body: { error: "not found" } },
          { status: 404, body: { error: "not found" } },
          { status: 201, body: { id: 2, name: "book", price: 5 } },
          { status: 200, body: [{ id: 2, name: "book", price: 5 }] },
        ], sample: false },
      { args: [[
          { method: "PATCH", path: "/items", body: null },
          { method: "GET", path: "/users", body: null },
          { method: "GET", path: "/items/99", body: null },
          { method: "GET", path: "/items", body: null },
        ]],
        expected: [
          { status: 404, body: { error: "not found" } },
          { status: 404, body: { error: "not found" } },
          { status: 404, body: { error: "not found" } },
          { status: 200, body: [] },
        ], sample: false },
    ],
  },
  {
    slug: "backend-rate-limiter",
    name: "Backend: Sliding-Window Rate Limiter",
    category: "Backend",
    difficulty: "Medium",
    maxScore: 35,
    successRate: "42.55%",
    fn: "rateLimiter",
    statement: `
<p>A classic backend-design interview question: implement per-client API rate limiting with a sliding window.</p>
<p>Complete <code>rateLimiter(limit, windowMs, requests)</code>:</p>
<ul>
<li><code>limit</code> — max ALLOWED requests per client within any window</li>
<li><code>windowMs</code> — window length in milliseconds</li>
<li><code>requests</code> — array of <code>[clientId, timestampMs]</code> pairs in non-decreasing timestamp order</li>
</ul>
<p>Return an array of booleans, one per request: <code>true</code> if allowed, <code>false</code> if rejected.
A request at time <code>t</code> from client <code>c</code> is allowed if the number of <em>previously allowed</em>
requests from <code>c</code> with timestamp in the window <code>(t - windowMs, t]</code> is less than
<code>limit</code>.</p>
<h3>Keep in mind</h3>
<ul>
<li>Only <strong>allowed</strong> requests count toward the limit — rejected ones do not occupy the window
(this is how most production limiters, e.g. Redis sliding-log, behave).</li>
<li>The window is half-open: a request exactly <code>windowMs</code> older than <code>t</code> has expired
(<code>t - windowMs</code> itself is OUTSIDE the window).</li>
<li>Clients are independent — one noisy client must not throttle another.</li>
<li>Keep a per-client log of allowed timestamps and prune expired entries as you go.</li>
</ul>
<h3>Sample</h3>
<pre>rateLimiter(2, 1000, [["a",0],["a",100],["a",200],["a",1001],["b",200]])
→ [true, true, false, true, true]</pre>
<p>Explanation: a@200 is rejected (2 allowed in the last 1000ms). a@1001 is allowed — the request at 0 has aged out
(1001 - 1000 = 1 &gt; 0... the window (1, 1001] no longer contains 0), leaving only 100 and 200; 200 was rejected so
only 100 counts.</p>`,
    starter: `/*
 * Complete 'rateLimiter' below.
 *  1. INTEGER limit
 *  2. INTEGER windowMs
 *  3. ARRAY of [STRING clientId, INTEGER timestampMs]
 * Return: BOOLEAN_ARRAY — one entry per request, in order.
 */

function rateLimiter(limit, windowMs, requests) {
    // Write your code here

}`,
    cases: [
      { args: [2, 1000, [["a", 0], ["a", 100], ["a", 200], ["a", 1001], ["b", 200]]],
        expected: [true, true, false, true, true], sample: true },
      { args: [1, 500, [["x", 0], ["x", 499], ["x", 500], ["x", 501]]],
        expected: [true, false, true, false], sample: true },
      { args: [3, 100, [["a", 0], ["b", 0], ["a", 10], ["a", 20], ["a", 30], ["b", 50], ["a", 121]]],
        expected: [true, true, true, true, false, true, true], sample: false },
      { args: [2, 50, [["a", 0], ["a", 0], ["a", 0], ["a", 50], ["a", 51]]],
        expected: [true, true, false, true, true], sample: false },
      { args: [5, 1000, [["solo", 1], ["solo", 2], ["solo", 3], ["solo", 4], ["solo", 5], ["solo", 6], ["solo", 1002], ["solo", 1003]]],
        expected: [true, true, true, true, true, false, true, true], sample: false },
    ],
  },
];
