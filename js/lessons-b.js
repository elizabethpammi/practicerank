// Interview-Cake-style lesson walkthroughs — part B (problems 17–31).
// Requires window.__LESSON from lessons-a.js.
(function () {
  "use strict";
  var L = window.__LESSON;
  if (!L) { console.error("lessons-b.js loaded before lessons-a.js"); return; }

  /* ---------------- 17 ---------------- */
  L("javascript-scope", {
    gotchas: [
      "<code>var</code> is function-scoped, not block-scoped. The <code>for</code> loop does <b>not</b> create a new <code>i</code> per iteration — all three closures point at one variable.",
      "By the time anyone <em>calls</em> those functions, the loop has finished and that one shared <code>i</code> is 3.",
      "Saying 'the value is copied into the closure' is the wrong mental model and interviewers listen for it. Closures capture <em>bindings</em> (the variable itself), not values.",
      "<code>const</code> does not freeze objects. It freezes the binding. <code>const o = {a:1}; o.a = 2;</code> is legal."
    ],
    breakdown: "<p>Two questions are hiding here, and interviewers usually want both: <em>why</em> is it broken, and <em>how many ways</em> can you fix it?</p>" +
      "<p>The why is late binding. The fixes are: (1) <code>let</code>, which the spec defines as a fresh binding per loop iteration; (2) an IIFE, which creates a new function scope per iteration and captures <code>i</code> as a parameter. Know both — the IIFE answer proves you understand the mechanism rather than just the modern keyword.</p>",
    hints: [
      "Add a <code>console.log</code> inside the loop and another inside one of the returned functions. Notice they run at completely different times.",
      "The functions run after the loop is done. What is <code>i</code> at that moment, and how many <code>i</code> variables exist in total?",
      "You need three separate bindings. <code>let</code> gives you that for free; a function parameter gives you that the old way."
    ],
    walkthrough: [
      "Recognise the shape: a closure created inside a loop, called after the loop.",
      "Diagnose: <code>var i</code> lives in the enclosing function scope, so there is exactly one <code>i</code>, and it is 3 when the closures finally run.",
      "Fix with <code>let i</code> — per the ES6 spec, each iteration gets its own binding, so each closure captures a different variable holding 0, 1, 2.",
      "State the pre-ES6 fix out loud: wrap the push in an IIFE, <code>(function (j) { arr.push(function () { return j; }); })(i)</code>. The parameter <code>j</code> is a fresh binding on every call.",
      "For the task here, build the array with <code>let</code> and then return <code>arr.map(fn =&gt; fn())</code> so the result is <code>[0, 1, 2]</code>.",
      "Connect it to real work: this is the same bug as a stale value inside <code>setTimeout</code> or a <code>useEffect</code> with a missing dependency. Mentioning that is what turns a trivia answer into a senior answer."
    ],
    complexity: "O(n) time, O(n) space for n closures. This one is graded entirely on explanation.",
    learned: "Closures capture variables, not values, and scope is decided at write time while execution happens later. That single sentence explains loop bugs, timer bugs, and React stale-closure bugs all at once."
  });

  /* ---------------- 18 ---------------- */
  L("whats-wrong-with-this-javascript", {
    gotchas: [
      "A <code>{</code> immediately after <code>=&gt;</code> starts a function <b>body</b>, never an object literal.",
      "Because it is a body, <code>name:</code> parses as a <em>label statement</em> — legal JavaScript, silently useless. No error is thrown; you just get <code>undefined</code>.",
      "The fix is to wrap the object in parentheses, or to use an explicit <code>return</code>. Both are correct; know why the parentheses work.",
      "The identical trap bites in <code>.map(x =&gt; { ... })</code> generally: any block-bodied arrow with no <code>return</code> yields undefined."
    ],
    breakdown: "<p>The array is full of <code>undefined</code>, which means every callback returned nothing, which means every callback had a body with no <code>return</code>. That is the whole diagnosis chain, and saying it in that order is the answer.</p>" +
      "<p>Parentheses disambiguate because <code>(</code> forces the parser into expression context, where <code>{</code> can only mean an object.</p>",
    hints: [
      "Every element is <code>undefined</code>. What does a JavaScript function return when it has no return statement?",
      "So the arrow has a block body. Which character made the parser think that?",
      "Force expression context: <code>names.map(name =&gt; ({ ... }))</code>."
    ],
    walkthrough: [
      "Observe the symptom: an array of <code>undefined</code>, no thrown error.",
      "Conclude the callback returns nothing, so its <code>{</code> opened a block, not an object.",
      "Explain the label statement: <code>name: name,</code> is parsed as label <code>name</code> applied to the expression <code>name</code>. It is why there is no syntax error to guide you.",
      "Fix option A, concise: <code>names.map(name =&gt; ({ name, greeting: 'Hello, ' + name + '!' }))</code>.",
      "Fix option B, explicit: keep the block and add <code>return { ... };</code>. Prefer this when the callback will grow.",
      "Note the shorthand <code>{ name }</code> is equivalent to <code>{ name: name }</code> and is the idiomatic form."
    ],
    complexity: "O(n) time, O(n) space.",
    learned: "Arrow-function body-versus-expression ambiguity, and the habit of reasoning backwards from <code>undefined</code> to a missing return. Silent-wrong-answer bugs are the ones worth being able to name on sight."
  });

  /* ---------------- 19 ---------------- */
  L("queue-two-stacks", {
    gotchas: [
      "Do not move elements between the stacks on every operation. That is O(n) per dequeue and it is the naive answer.",
      "Only refill the out-stack when it is <b>empty</b>. Refilling early scrambles the order.",
      "Dequeue from an entirely empty queue must throw, not return undefined.",
      "The tempting proof question: each element is pushed and popped at most twice total, so the <em>amortised</em> cost is O(1) even though one particular dequeue can cost O(n)."
    ],
    breakdown: "<p>A stack is LIFO and a queue is FIFO. Pouring one stack into another reverses it — so two stacks give you a FIFO.</p>" +
      "<p>Keep an <code>inStack</code> that only ever receives pushes, and an <code>outStack</code> that only ever serves pops. Move everything across, in bulk, exactly when the out-stack runs dry.</p>",
    hints: [
      "Pop everything off one stack and push it onto another. What order does the second stack now hold?",
      "Enqueue is just a push onto the in-stack. All the work lives in dequeue.",
      "In dequeue: if the out-stack is empty, drain the entire in-stack into it, then pop. If the out-stack is not empty, just pop."
    ],
    walkthrough: [
      "Initialise <code>inStack = []</code> and <code>outStack = []</code>.",
      "<code>enqueue(item)</code> is one line: <code>inStack.push(item)</code>.",
      "<code>dequeue()</code>: if <code>outStack.length === 0</code>, loop <code>while (inStack.length) outStack.push(inStack.pop())</code>.",
      "After the drain, if <code>outStack</code> is still empty, the whole queue was empty — throw.",
      "Otherwise return <code>outStack.pop()</code>.",
      "Amortised argument to say out loud: every element moves in-stack → out-stack exactly once in its lifetime, so n operations cost O(n) total, i.e. O(1) each on average."
    ],
    complexity: "O(1) amortised per operation (O(n) worst case on a single dequeue), O(n) space.",
    learned: "Building one abstract data type out of another, and the difference between worst-case and amortised cost. The lazy-transfer trick — do the expensive work in bulk, only when forced — recurs in dynamic arrays and in rebalancing."
  });

  /* ---------------- 20 ---------------- */
  L("largest-stack", {
    gotchas: [
      "Storing a single <code>max</code> variable breaks the moment you pop the max off. You need the <em>previous</em> max back, so you need history.",
      "Scanning for the max on demand is O(n) — the whole point is O(1).",
      "When you push a value <b>equal</b> to the current max, push it onto the max-stack too. Otherwise popping one copy wrongly discards the max.",
      "<code>getMax</code> on an empty stack should throw, not return undefined."
    ],
    breakdown: "<p>The stack's own discipline is the answer: because pops happen in reverse order of pushes, the history of maxima is itself a stack.</p>" +
      "<p>Keep a second stack that records the running maximum at each point in time. Push onto it only when the new value ties or beats the current max; pop from it only when the value you popped was the current max.</p>",
    hints: [
      "What information do you lose when you pop the largest item? How would you get it back without rescanning?",
      "Track the max <em>at each depth</em> of the stack, not just the max overall.",
      "Second stack. Push when <code>item &gt;= currentMax</code>; on pop, if the popped item equals the top of the max-stack, pop that too."
    ],
    walkthrough: [
      "Hold two stacks: <code>stack</code> and <code>maxesStack</code>.",
      "<code>push(item)</code>: push onto <code>stack</code>. Then if <code>maxesStack</code> is empty or <code>item &gt;= maxesStack[maxesStack.length - 1]</code>, push <code>item</code> onto <code>maxesStack</code> as well. The <code>&gt;=</code> is what makes duplicates safe.",
      "<code>pop()</code>: pop from <code>stack</code>. If the popped item equals the top of <code>maxesStack</code>, pop that too.",
      "<code>getMax()</code>: peek the top of <code>maxesStack</code>, or throw if empty.",
      "Trace push 1, 3, 3, 2: maxes is <code>[1, 3, 3]</code>. Pop 2 (maxes untouched), pop 3 (maxes becomes <code>[1, 3]</code>) — max is still correctly 3.",
      "Every operation is a constant number of array operations, so all three are O(1)."
    ],
    complexity: "O(1) time for push, pop and getMax. O(n) extra space worst case.",
    learned: "Augment a data structure with a parallel structure that mirrors its access pattern. Because pops undo pushes exactly, a stack of historical maxima stays in sync for free — the same idea gives you min-stacks and undo systems."
  });

  /* ---------------- 21 ---------------- */
  L("stolen-breakfast-drone", {
    gotchas: [
      "A hash map of counts works but costs O(n) space, and the interviewer will ask for O(1).",
      "Sorting and scanning for the loner is O(n log n) and mutates the input.",
      "XOR only works because <b>every other</b> ID appears exactly twice. If some appeared three times the trick collapses — say that constraint back to the interviewer.",
      "Order does not matter for XOR, which is exactly why it survives an unsorted list."
    ],
    breakdown: "<p>Three properties of XOR are the whole solution: <code>a ^ a === 0</code>, <code>a ^ 0 === a</code>, and it is commutative and associative.</p>" +
      "<p>So XOR-ing every ID together lets each matched pair cancel to 0 regardless of where the two copies sit in the array, and what survives is the unpaired ID.</p>",
    hints: [
      "Start with the hash-map count answer, then ask what O(1) space would even look like.",
      "What is <code>5 ^ 5</code>? What is <code>5 ^ 0</code>?",
      "Fold the entire array with <code>^</code> into one accumulator starting at 0."
    ],
    walkthrough: [
      "Initialise <code>uniqueDeliveryId = 0</code>. Zero is the identity for XOR, so it is a safe seed.",
      "Loop over every id: <code>uniqueDeliveryId ^= id</code>.",
      "Return it.",
      "Why it works: reorder the XOR chain (legal, it is commutative) so the pairs sit next to each other. Each pair collapses to 0, leaving <code>0 ^ 0 ^ ... ^ lonerId</code>, which is the loner.",
      "Trace <code>[1, 4, 2, 1, 2]</code>: 0^1=1, ^4=5, ^2=7, ^1=6, ^2=4. Answer 4.",
      "Caveat to volunteer: in JavaScript, <code>^</code> coerces to 32-bit signed integers, so IDs above 2&#8311;&#185; would misbehave. Worth one sentence."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "Bit manipulation as a space optimisation. XOR is the canonical 'cancel out the pairs' tool, and it also swaps variables without a temp and detects single-bit differences."
  });

  /* ---------------- 22 ---------------- */
  L("delete-node", {
    gotchas: [
      "You are handed the node itself, not the head, so you cannot walk to find the previous node — and without the previous node you cannot rewire the list normally.",
      "The trick is to copy the <em>next</em> node's value into this node and then skip the next node. You are not really deleting this node; you are impersonating the next one.",
      "This <b>fails on the last node</b>. There is nothing after it to copy from. Say so and either throw or ask about a sentinel tail.",
      "Any other reference pointing at the next node is now dangling — it points at a node that has been cut out of the list. This is a real side effect and the interviewer wants to hear it."
    ],
    breakdown: "<p>The obvious algorithm needs the previous node. You do not have it, and finding it is O(n) even if you had the head.</p>" +
      "<p>So change what 'delete' means. If node B holds C's value and points at C's next, then from the outside the list looks exactly as if B was removed. You deleted a <em>position</em>, not an object.</p>",
    hints: [
      "To unlink a node the normal way you need its predecessor. Can you get it? What does that tell you about the intended approach?",
      "You do have the node <em>after</em> it. What if you moved that node's data backwards?",
      "Set <code>node.value = node.next.value</code> and <code>node.next = node.next.next</code>. Then think hard about the last-node case."
    ],
    walkthrough: [
      "Grab <code>nextNode = node.next</code>.",
      "If <code>nextNode</code> exists, copy across: <code>node.value = nextNode.value</code>, then <code>node.next = nextNode.next</code>.",
      "If <code>nextNode</code> is null you are on the tail — throw a clear error. There is no in-place fix without the previous node.",
      "In this exercise the harness builds the list from an array and hands you an index, so walk to that node first, then apply the technique and return the resulting values.",
      "State the two side effects explicitly: (a) tails cannot be deleted, (b) outside references to the next node now point outside the list.",
      "Mention the clean alternative for real code: a doubly linked list, where the previous pointer makes deletion genuinely O(1) with no impersonation."
    ],
    complexity: "O(1) time and O(1) space for the trick itself.",
    learned: "Sometimes the right move is to redefine the operation rather than satisfy it literally. Also: every clever in-place trick has side effects, and naming them unprompted is a strong senior signal."
  });

  /* ---------------- 23 ---------------- */
  L("linked-list-cycle", {
    gotchas: [
      "A hash set of visited nodes works and is easy — but it costs O(n) space and the interviewer wants O(1).",
      "Advance the fast pointer <b>two</b> steps and the slow pointer one. Equal speeds never meet.",
      "You must null-check both <code>fast</code> and <code>fast.next</code> before stepping, or a clean list will throw instead of returning false.",
      "Compare nodes by identity (<code>===</code>), never by value. Two different nodes can hold the same value."
    ],
    breakdown: "<p>Think of a circular running track. A faster runner laps a slower one — they must eventually stand on the same spot. On a straight track, the faster runner just reaches the end.</p>" +
      "<p>That is the entire proof. Inside a cycle the gap between fast and slow shrinks by exactly one node per step, so it must hit zero.</p>",
    hints: [
      "First give the O(n)-space set answer, then ask yourself what constant space would require.",
      "Two pointers moving at different speeds. What happens on a loop versus a straight line?",
      "<code>while (fast &amp;&amp; fast.next) { slow = slow.next; fast = fast.next.next; if (slow === fast) return true; }</code>"
    ],
    walkthrough: [
      "Handle an empty list up front — return false.",
      "Set <code>slow = head</code> and <code>fast = head</code>.",
      "Loop while <code>fast</code> and <code>fast.next</code> both exist. That double check is what makes odd- and even-length clean lists both safe.",
      "Inside: advance <code>slow</code> by one and <code>fast</code> by two, then compare with <code>===</code>.",
      "If they ever match, return true. If the loop exits, <code>fast</code> ran off the end, so return false.",
      "Follow-up worth preparing: to find the cycle's <em>start</em>, reset one pointer to head after the meeting and advance both one step at a time — they meet at the entry node."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "Floyd's tortoise-and-hare. The general pattern — two pointers at different speeds over the same sequence — also finds the middle node, the kth-from-last node, and cycles in any 'next value' function."
  });

  /* ---------------- 24 ---------------- */
  L("reverse-linked-list", {
    gotchas: [
      "You must save <code>currentNode.next</code> <b>before</b> you overwrite it, or you lose the rest of the list instantly.",
      "Return the <em>new</em> head, which is the last node you visited — not the old head, which is now the tail.",
      "Empty list and single-node list both need to work. The standard loop handles both if you seed <code>previous = null</code>.",
      "The recursive version is elegant but O(n) stack space. Mention it; ship the iterative one."
    ],
    breakdown: "<p>Reversing a linked list is flipping every arrow. To flip node X's arrow you need three references: the node before it, the node itself, and the node after it — because you are about to destroy the way to reach the node after it.</p>" +
      "<p>So carry three variables and slide them forward one node at a time.</p>",
    hints: [
      "Draw three nodes and physically redraw the arrows one at a time. Which pointer do you lose first?",
      "Before writing <code>current.next = previous</code>, stash <code>current.next</code> in a temp.",
      "Then shuffle forward: <code>previous = current; current = temp;</code>"
    ],
    walkthrough: [
      "Initialise <code>previousNode = null</code> and <code>currentNode = head</code>.",
      "Loop while <code>currentNode</code> is not null.",
      "Save <code>nextNode = currentNode.next</code>.",
      "Flip the arrow: <code>currentNode.next = previousNode</code>.",
      "Slide the window: <code>previousNode = currentNode</code>, then <code>currentNode = nextNode</code>.",
      "When the loop ends, <code>currentNode</code> is null and <code>previousNode</code> is the last real node — return <code>previousNode</code> as the new head. On an empty list it returns null, which is correct."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "In-place pointer surgery with a sliding three-pointer window. The 'save the link before you break it' discipline applies to every list-rewiring problem you will ever be asked."
  });

  /* ---------------- 25 ---------------- */
  L("kth-to-last-node", {
    gotchas: [
      "Length-then-walk works but takes two passes. The two-pointer version does it in one — know both and say which you would ship.",
      "Off-by-one is the whole difficulty. The gap between the pointers must be exactly <code>k</code>, so advance the lead pointer <code>k</code> times, not <code>k - 1</code> or <code>k + 1</code>.",
      "If <code>k</code> is larger than the list, that is an error, not a null return. Detect it while advancing the lead pointer.",
      "<code>k = 0</code> should throw too — there is no zeroth-to-last node."
    ],
    breakdown: "<p>The kth-to-last node is <code>length - k</code> from the front. You can compute length in a pass and then walk — clear, two passes.</p>" +
      "<p>Or you can build the offset physically: put two pointers <code>k</code> apart and slide them together until the lead falls off the end. Where the trailing pointer lands is the answer, and you touched each node once.</p>",
    hints: [
      "Write the two-pass version first. It is correct and it makes the one-pass version obvious.",
      "Instead of counting, hold two pointers a fixed distance apart.",
      "Advance the lead pointer exactly <code>k</code> nodes. Then move both one step at a time until the lead hits null."
    ],
    walkthrough: [
      "Throw if <code>k &lt; 1</code>.",
      "Set <code>leftNode = head</code> and <code>rightNode = head</code>.",
      "Advance <code>rightNode</code> <code>k</code> times. If it becomes null before you finish, the list is shorter than <code>k</code> — throw.",
      "Now walk both together: <code>while (rightNode) { leftNode = leftNode.next; rightNode = rightNode.next; }</code>.",
      "The gap never changes, so when <code>rightNode</code> is null (one past the tail), <code>leftNode</code> sits exactly <code>k</code> from the end. Return it.",
      "Sanity check with <code>k = 1</code> on a 3-node list: right advances once, then both move twice, leaving left on the tail. Correct."
    ],
    complexity: "O(n) time, O(1) space, single pass.",
    learned: "The fixed-offset two-pointer window. Any 'k from the end' question on a forward-only structure — lists, streams, log tails — is the same shape."
  });

  /* ---------------- 26 ---------------- */
  L("reverse-string-in-place", {
    gotchas: [
      "JavaScript strings are immutable, so genuine in-place reversal requires an array of characters. Say that up front rather than being caught by it.",
      "Loop to the <em>middle</em>. Running the swap across the whole array reverses it and then reverses it back.",
      "For odd lengths the middle character stays put — the loop condition handles it automatically, no special case needed.",
      "<code>str.split('').reverse().join('')</code> is the real-world answer but it allocates O(n) extra and dodges the exercise. Name it, then do it properly."
    ],
    breakdown: "<p>Swap the first and last characters, then the second and second-to-last, and keep converging. Two pointers walking toward each other from the ends.</p>" +
      "<p>The only decisions are where to stop and how to swap without a temp variable (destructuring makes it a one-liner).</p>",
    hints: [
      "Which character ends up where? Index i swaps with index <code>length - 1 - i</code>.",
      "Use two indices, one at each end, and move them toward each other.",
      "Stop when they meet or cross: <code>while (left &lt; right)</code>."
    ],
    walkthrough: [
      "Set <code>leftIndex = 0</code> and <code>rightIndex = arr.length - 1</code>.",
      "While <code>leftIndex &lt; rightIndex</code>, swap the two characters.",
      "In modern JS: <code>[arr[leftIndex], arr[rightIndex]] = [arr[rightIndex], arr[leftIndex]]</code>. The classic three-line temp swap is equally fine and sometimes clearer.",
      "Increment <code>leftIndex</code>, decrement <code>rightIndex</code>.",
      "The strict <code>&lt;</code> means an odd-length middle character is simply never touched, which is exactly right.",
      "If the signature takes and returns a string, split into an array first and join at the end — and say out loud that this makes it O(n) space, not truly in place."
    ],
    complexity: "O(n) time, O(1) extra space over the array itself.",
    learned: "Converging two-pointer traversal, plus the immutability distinction between JavaScript strings and arrays. That distinction shows up again in palindrome checks and in-place partitioning."
  });

  /* ---------------- 27 ---------------- */
  L("reverse-words", {
    gotchas: [
      "Reversing the whole array once puts the words in the right order but leaves each word spelled backwards. It is a half-solution, and a necessary one.",
      "You must then reverse each word individually to fix the letters. Two phases, not one.",
      "Track word boundaries carefully, and remember the <b>final word has no trailing space</b> — you must flush it after the loop ends or it never gets reversed.",
      "<code>split(' ').reverse().join(' ')</code> is O(n) extra space. Fine in production, not what is being asked."
    ],
    breakdown: "<p>Reverse-everything-then-reverse-each-piece is the standard trick. The outer reversal fixes the ordering of the words; the inner reversals undo the damage to the letters.</p>" +
      "<p>Reuse the <code>reverseCharacters(arr, left, right)</code> helper from the previous problem for both phases. Building on a helper you already wrote is a good look.</p>",
    hints: [
      "Reverse the entire character array and read what you get. What is right about it and what is wrong?",
      "The word order is now correct but the spelling is not. Fix the spelling word by word.",
      "Walk the reversed array tracking <code>wordStartIndex</code>. Each time you hit a space, reverse from the start index to the character before the space."
    ],
    walkthrough: [
      "Write a helper <code>reverseCharacters(arr, frontIndex, backIndex)</code> — the converging two-pointer swap, bounded.",
      "Phase one: <code>reverseCharacters(arr, 0, arr.length - 1)</code>. Words are now in the right order, spelled backwards.",
      "Phase two: set <code>wordStartIndex = 0</code> and scan the array.",
      "When you hit a space at index i (or reach the end of the array), reverse from <code>wordStartIndex</code> to <code>i - 1</code>, then set <code>wordStartIndex = i + 1</code>.",
      "Handling 'or reach the end' inside the same loop condition is what flushes the final word. Forgetting it is the number one bug here.",
      "Trace <code>'the sky is blue'</code>: full reversal gives <code>'eulb si yks eht'</code>, then per-word reversal gives <code>'blue is sky the'</code>."
    ],
    complexity: "O(n) time (two passes), O(1) extra space.",
    learned: "The reverse-all-then-reverse-parts idiom. It also performs an in-place array rotation by k, which is a very common follow-up to this exact question."
  });

  /* ---------------- 28 ---------------- */
  L("parenthesis-matching", {
    gotchas: [
      "You do not need a stack here — you only need a <b>counter</b>, because there is exactly one kind of bracket. Reaching for a stack is over-engineering and interviewers notice.",
      "Start scanning at the character <em>after</em> the given opening index, not at it, or your count is off by one from the start.",
      "The answer is the position where the depth returns to 0, not the first closing paren you see.",
      "Unbalanced input should throw rather than return -1 silently, unless the spec says otherwise."
    ],
    breakdown: "<p>Track nesting depth. Every <code>(</code> pushes you one level deeper, every <code>)</code> pops you one level up. The match for your opening paren is the <code>)</code> that brings the depth back to zero.</p>" +
      "<p>Ignore every character that is not a parenthesis.</p>",
    hints: [
      "Draw the depth as a graph while you read the string. Where does it come back down to where it started?",
      "One integer is enough state. Increment on <code>(</code>, decrement on <code>)</code>.",
      "Start at <code>openingParenIndex + 1</code> with <code>openNestedParens = 0</code>, and return the index where a <code>)</code> would take the counter below zero."
    ],
    walkthrough: [
      "Set <code>openNestedParens = 0</code>.",
      "Loop from <code>openingParenIndex + 1</code> to the end of the string.",
      "On <code>(</code>, increment the counter.",
      "On <code>)</code>: if the counter is 0, this is the match — return the current index. Otherwise decrement.",
      "If the loop finishes without returning, the parentheses are unbalanced — throw.",
      "Trace <code>'Sometimes (when I nest them (my parens) are matched)'</code> from the first <code>(</code>: the inner pair pushes to 1 and back to 0, then the final <code>)</code> at depth 0 is the answer."
    ],
    complexity: "O(n) time, O(1) space.",
    learned: "Match the data structure to the actual requirement. One bracket type means a counter; multiple types genuinely need a stack — which is the very next problem, and the contrast is the point."
  });

  /* ---------------- 29 ---------------- */
  L("bracket-validator", {
    gotchas: [
      "A counter is not enough now. <code>{ ( } )</code> has balanced counts and is still invalid — you need the <em>order</em>, which means a stack.",
      "Leftovers on the stack at the end mean unclosed brackets — that is a failure, not a pass. Return <code>stack.length === 0</code>, not just <code>true</code>.",
      "A closer arriving when the stack is empty is an immediate failure.",
      "Ignore all non-bracket characters rather than treating them as errors."
    ],
    breakdown: "<p>Nesting is last-in-first-out: the bracket you close must be the most recent one you opened. That sentence <em>is</em> the definition of a stack, so the data structure follows from the problem statement.</p>" +
      "<p>Push openers. On a closer, pop and check the pair matches.</p>",
    hints: [
      "Try to break a counting solution. <code>{ ( } )</code> should do it.",
      "The most recently opened bracket is the one that must close first. What structure gives you 'most recent' in O(1)?",
      "Keep a map <code>{ ')': '(', ']': '[', '}': '{' }</code> so the closer tells you which opener it demands."
    ],
    walkthrough: [
      "Define <code>openersToClosers = { '(': ')', '[': ']', '{': '}' }</code> and derive the set of openers and closers from it.",
      "Create an empty <code>openersStack</code>.",
      "For each character: if it is an opener, push it.",
      "If it is a closer: if the stack is empty, return false. Pop the last opener and compare <code>openersToClosers[lastOpener]</code> to this character — mismatch means return false.",
      "Anything else, skip.",
      "After the loop, return <code>openersStack.length === 0</code>. That final check is what catches <code>'{[]'</code>."
    ],
    complexity: "O(n) time, O(n) space worst case (all openers).",
    learned: "Stacks model nesting. This exact algorithm is the first stage of every parser, linter, and syntax highlighter — and the contrast with the counter version above is a clean way to show you pick structures deliberately."
  });

  /* ---------------- 30 ---------------- */
  L("permutation-palindrome", {
    gotchas: [
      "Do not generate the permutations. That is O(n!) and the question is a trap for exactly that instinct.",
      "The rule is about character <em>counts</em>, not positions: at most one character may have an odd count.",
      "Even-length strings allow zero odd counts; odd-length strings allow exactly one. The 'at most one' phrasing covers both, so you do not need to branch on length.",
      "Clarify case sensitivity and whether spaces count before you start coding."
    ],
    breakdown: "<p>A palindrome mirrors around its centre, so every character must be able to pair off with a twin. Only a single middle character is allowed to stand alone.</p>" +
      "<p>That means you never need to build a permutation — you just count characters and count how many counts are odd.</p>",
    hints: [
      "Write down a few palindromes and count each character. What do all the counts have in common?",
      "Everything pairs up except possibly one middle character.",
      "Instead of a counts map, keep a <code>Set</code>: add a character when you see it, delete it when you see it again. Whatever remains at the end had an odd count."
    ],
    walkthrough: [
      "Create <code>unpairedCharacters = new Set()</code>.",
      "For each character: if the set already has it, delete it (you just paired it up). Otherwise add it.",
      "After the loop, the set holds exactly the characters with odd counts.",
      "Return <code>unpairedCharacters.size &lt;= 1</code>.",
      "Trace <code>'civic'</code>: c added, i added, v added, i deleted, c deleted → set is <code>{v}</code>, size 1 → true.",
      "The toggling-set trick is neater than a counts object and is worth pointing out; it is the same parity idea as the XOR problem."
    ],
    complexity: "O(n) time, O(k) space where k is the alphabet size (O(1) for a fixed alphabet).",
    learned: "Reduce a structural property to a counting property. 'Can it be rearranged into X' questions are almost always about multiset counts, never about actually rearranging anything."
  });

  /* ---------------- 31 ---------------- */
  L("recursive-string-permutations", {
    gotchas: [
      "Duplicate characters produce duplicate permutations. Decide whether to dedupe with a Set, and say which the spec wants.",
      "The empty string must return a set containing the empty string, <b>not</b> an empty set. Get that base case wrong and everything collapses to nothing.",
      "There are n! permutations, so this is inherently exponential. That is the correct answer, not a failure — do not let an interviewer talk you into a mythical faster version.",
      "Strings are immutable in JavaScript, so all the concatenation allocates. Fine at interview scale, worth naming."
    ],
    breakdown: "<p>Classic recursive decomposition. Pull the last character off. Recursively permute what is left. Then take each of those smaller permutations and insert the held-out character into every possible position.</p>" +
      "<p>Trust the recursion — assume the smaller call is already correct and only write the combine step.</p>",
    hints: [
      "What are all the permutations of a 1-character string? Of a 2-character string? Build the 3-character case from the 2-character case by hand.",
      "Take off the last character, permute the rest, then reinsert.",
      "For each smaller permutation of length k, there are <code>k + 1</code> insertion positions — including before the first character and after the last."
    ],
    walkthrough: [
      "Base case: if the string has 0 or 1 characters, return <code>new Set([string])</code>.",
      "Split: <code>allCharsExceptLast = string.slice(0, -1)</code> and <code>lastChar = string[string.length - 1]</code>.",
      "Recurse: <code>const permsOfAllCharsExceptLast = getPermutations(allCharsExceptLast)</code>.",
      "Combine: for each smaller permutation, loop <code>position</code> from 0 to <code>permutation.length</code> inclusive — the inclusive bound is what allows appending at the very end.",
      "Build <code>permutation.slice(0, position) + lastChar + permutation.slice(position)</code> and add it to the result Set. Using a Set dedupes repeated characters for free.",
      "Return the Set. Trace <code>'cat'</code>: perms of <code>'ca'</code> are <code>{ca, ac}</code>, then inserting <code>'t'</code> into each of 3 positions gives all 6."
    ],
    complexity: "O(n! &times; n) time and space — n! results, each costing O(n) to build.",
    learned: "Recursive generation: define the base case, trust the recursive call, write only the combine step. That three-part discipline is how you keep backtracking and subset-generation problems from turning into spaghetti."
  });
})();
