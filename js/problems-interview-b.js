// Special Interview Questions — part B (17–31): scope, stacks, queues, linked lists, strings.
(function () {
  "use strict";
  var P = window.__IPUSH;

  /* ---------------- 17. JavaScript Scope ---------------- */
  P({
    slug: "javascript-scope",
    name: "JavaScript Scope",
    sub: "JS Fundamentals",
    difficulty: "Easy",
    fn: "runFunctions",
    body: `
<p>This code is supposed to build three functions that return 0, 1 and 2. It does not:</p>
<pre>function buildFunctions() {
    var arr = [];
    for (var i = 0; i &lt; 3; i++) {
        arr.push(function () { return i; });     // all three return 3
    }
    return arr;
}</pre>
<p><code>var</code> is <strong>function-scoped</strong>, so all three closures capture the <em>same</em> <code>i</code>, which is 3 by the time anyone calls them.</p>
<h3>Task</h3>
<p>Write <code>runFunctions()</code> that builds the three functions correctly and returns an array of their results: <code>[0, 1, 2]</code>.</p>
<h3>Goal</h3>
<p>Fix it with <code>let</code> (block-scoped — a fresh binding per iteration). Be able to also explain the pre-ES6 fix: an IIFE that captures <code>i</code> as a parameter.</p>`,
    alts: [
      { q: "\"What does this print, and why?\" — <code>for (var i=0;i&lt;3;i++) setTimeout(()=&gt;console.log(i))</code>", a: "Prints 3, 3, 3. Same bug wearing a timer. Answer: var is function-scoped, the callbacks run after the loop finishes.", code: "for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 0 1 2" },
      { q: "\"Fix it without using let.\"", a: "IIFE per iteration — each call gets its own parameter, which is its own binding.", code: "function build(){const a=[];for(var i=0;i<3;i++){(function(j){a.push(function(){return j;});})(i);}return a;}" },
      { q: "\"What's the difference between var, let and const?\"", a: "var: function-scoped, hoisted and initialised to undefined. let/const: block-scoped, hoisted but in the temporal dead zone until the declaration. const binds the variable, it does not freeze the object.", code: "const o={a:1}; o.a=2;      // fine — the binding is constant, not the object\n// o = {};                 // TypeError" },
      { q: "\"React: why does my useEffect see a stale value?\"", a: "Same closure story, one layer up: the effect captured the value from the render it ran in. Fix with the dependency array or a functional setState.", code: "setCount(c => c + 1);   // reads the latest, not the captured value" },
    ],
    js: `function runFunctions() {
    const arr = [];
    for (let i = 0; i < 3; i++) {          // let -> new binding each iteration
        arr.push(function () { return i; });
    }
    return arr.map(fn => fn());
}`,
    py: `# Python has the same late-binding gotcha in closures:
# fns = [lambda: i for i in range(3)]  ->  all return 2
def run_functions():
    fns = [lambda i=i: i for i in range(3)]   # default arg captures the value
    return [f() for f in fns]`,
    starter: `function runFunctions() {
    // Build three functions that return 0, 1 and 2, then return their results.

}`,
    cases: [{ args: [], expected: [0, 1, 2], sample: true }],
  });

  /* ---------------- 18. What's Wrong With This JavaScript? ---------------- */
  P({
    slug: "whats-wrong-with-this-javascript",
    name: "What's Wrong with This JavaScript?",
    sub: "JS Fundamentals",
    difficulty: "Easy",
    fn: "getGreetings",
    body: `
<p>A teammate wrote this and it returns an array of <code>undefined</code>:</p>
<pre>const getGreetings = names =&gt; names.map(name =&gt; {
    name: name,
    greeting: \`Hello, \${name}!\`
});</pre>
<p><strong>Why:</strong> <code>{</code> after <code>=&gt;</code> starts a function <em>body</em>, not an object. <code>name:</code> is parsed as a label, and the function returns nothing.</p>
<h3>Task</h3>
<p>Write <code>getGreetings(names)</code> returning <code>[{ name, greeting }, ...]</code>.</p>
<h3>Goal</h3>
<p>Wrap the object in parentheses: <code>=&gt; ({ ... })</code>. This is on the list of bugs to catch on sight.</p>`,
    alts: [
      { q: "\"Why does <code>this</code> get lost in my callback?\"", a: "A normal function gets its own this; an arrow inherits the enclosing one. Either use an arrow or bind.", code: "class T{constructor(){this.n=1;}go(a){return a.map(()=>this.n);}}   // arrow keeps this" },
      { q: "\"What does <code>[1,2,10].sort()</code> return?\"", a: "[1,10,2] — bare sort() compares as strings. Always pass a comparator. Also: sort mutates in place.", code: "[1,2,10].sort((a,b)=>a-b)   // [1,2,10]" },
      { q: "\"Why is <code>if (!counts[key])</code> a bug?\"", a: "0 is falsy, so a real count of 0 is treated as missing. Use the 'in' operator or ?? instead.", code: "if (!(key in counts)) counts[key] = 0;\ncounts[key] = (counts[key] ?? 0) + 1;" },
      { q: "\"Spot the bug: <code>for (const i in arr)</code>\"", a: "for...in gives you keys as STRINGS ('0','1'), plus inherited props. Use for...of for values, or entries() for both.", code: "for (const v of arr) {}\nfor (const [i, v] of arr.entries()) {}" },
    ],
    js: `const getGreetings = names => names.map(name => ({    // parens!
    name: name,
    greeting: \`Hello, \${name}!\`,
}));

function getGreetingsFn(names) {   // same thing, written long-hand
    return names.map(function (name) {
        return { name: name, greeting: 'Hello, ' + name + '!' };
    });
}`,
    py: `def get_greetings(names):
    return [{'name': n, 'greeting': f'Hello, {n}!'} for n in names]`,
    starter: `function getGreetings(names) {
    // Write your code here

}`,
    cases: [
      { args: [["Ada"]], expected: [{ name: "Ada", greeting: "Hello, Ada!" }], sample: true },
      { args: [[]], expected: [], sample: true },
      {
        args: [["Sam", "Liz"]],
        expected: [{ name: "Sam", greeting: "Hello, Sam!" }, { name: "Liz", greeting: "Hello, Liz!" }],
        sample: false,
      },
    ],
  });

  /* ---------------- 19. Queue With Two Stacks ---------------- */
  P({
    slug: "queue-two-stacks",
    name: "Implement A Queue With Two Stacks",
    sub: "Stacks & Queues",
    difficulty: "Medium",
    fn: "runQueue",
    body: `
<p>Build a first-in-first-out queue using only two stacks (arrays with <code>push</code> / <code>pop</code>).</p>
<h3>Task</h3>
<p><code>runQueue(ops)</code> takes an array of operations and returns the array of dequeued values.</p>
<pre>runQueue([["enqueue",1],["enqueue",2],["dequeue"],["enqueue",3],["dequeue"],["dequeue"]])
  ->  [1, 2, 3]</pre>
<h3>Goal</h3>
<p><code>inStack</code> takes pushes. On dequeue, if <code>outStack</code> is empty, pour <strong>all</strong> of <code>inStack</code> into it (which reverses the order), then pop. Only pour when out is empty — that is what makes it <strong>amortized O(1)</strong>: every element moves at most twice.</p>`,
    alts: [
      { q: "\"Implement Queue using Stacks\" (LeetCode 232) — as a class with push/pop/peek/empty.", a: "Same two-stack trick, class shape.", code: "class MyQueue{constructor(){this.in=[];this.out=[];}push(x){this.in.push(x);}_move(){if(!this.out.length)while(this.in.length)this.out.push(this.in.pop());}pop(){this._move();return this.out.pop();}peek(){this._move();return this.out[this.out.length-1];}empty(){return !this.in.length&&!this.out.length;}}" },
      { q: "\"Now do the reverse: a stack from two queues.\" (LeetCode 225)", a: "Push is O(n): enqueue, then rotate every earlier element behind it. Different tradeoff, worth naming.", code: "class MyStack{constructor(){this.q=[];}push(x){this.q.push(x);for(let i=0;i<this.q.length-1;i++)this.q.push(this.q.shift());}pop(){return this.q.shift();}}" },
      { q: "\"What's the time complexity of dequeue?\"", a: "The real question. Worst case a single dequeue is O(n), but amortized over any sequence it is O(1) because each element is moved exactly once in and once out.", code: "// n enqueues + n dequeues = 2n moves total -> O(1) each on average" },
    ],
    js: `function runQueue(ops) {
    const inStack = [];
    const outStack = [];
    const results = [];

    for (const op of ops) {
        if (op[0] === 'enqueue') {
            inStack.push(op[1]);
        } else {
            if (outStack.length === 0) {
                while (inStack.length) outStack.push(inStack.pop());   // pour once
            }
            if (outStack.length === 0) throw new Error('Cannot dequeue from an empty queue');
            results.push(outStack.pop());
        }
    }
    return results;
}`,
    py: `def run_queue(ops):
    in_stack, out_stack, results = [], [], []
    for op in ops:
        if op[0] == 'enqueue':
            in_stack.append(op[1])
        else:
            if not out_stack:
                while in_stack:
                    out_stack.append(in_stack.pop())
            results.append(out_stack.pop())
    return results`,
    starter: `function runQueue(ops) {
    // ops: [["enqueue", value] | ["dequeue"], ...]
    // return the array of dequeued values

}`,
    cases: [
      { args: [[["enqueue", 1], ["enqueue", 2], ["dequeue"], ["enqueue", 3], ["dequeue"], ["dequeue"]]], expected: [1, 2, 3], sample: true },
      { args: [[["enqueue", "a"], ["dequeue"]]], expected: ["a"], sample: true },
      { args: [[["enqueue", 1], ["enqueue", 2], ["enqueue", 3], ["dequeue"], ["dequeue"], ["dequeue"]]], expected: [1, 2, 3], sample: false },
      { args: [[]], expected: [], sample: false },
    ],
  });

  /* ---------------- 20. Largest Stack ---------------- */
  P({
    slug: "largest-stack",
    name: "Largest Stack",
    sub: "Stacks & Queues",
    difficulty: "Medium",
    fn: "runMaxStack",
    body: `
<p>Build a stack that also answers <code>getMax()</code> in <strong>O(1)</strong>.</p>
<h3>Task</h3>
<p><code>runMaxStack(ops)</code> runs the ops and returns the results of every <code>pop</code> and <code>getMax</code>, in order.</p>
<pre>runMaxStack([["push",5],["push",3],["getMax"],["pop"],["getMax"]])
  ->  [5, 3, 5]</pre>
<h3>Goal</h3>
<p>Keep a second stack of maxes. Push onto it whenever the new value is <code>&gt;=</code> the current max; pop from it whenever the popped value equals the current max. Use <code>&gt;=</code>, not <code>&gt;</code> — otherwise duplicate maxes get dropped too early.</p>`,
    alts: [
      { q: "\"Min Stack\" (LeetCode 155) — getMin() in O(1).", a: "Mirror image. Same auxiliary stack.", code: "class MinStack{constructor(){this.s=[];this.m=[];}push(x){this.s.push(x);if(!this.m.length||x<=this.m[this.m.length-1])this.m.push(x);}pop(){const v=this.s.pop();if(v===this.m[this.m.length-1])this.m.pop();return v;}getMin(){return this.m[this.m.length-1];}}" },
      { q: "\"Sliding window maximum.\" (LeetCode 239)", a: "Related but harder: a monotonic deque, not a max stack. Name the difference rather than forcing this solution.", code: "function maxWindow(a,k){const dq=[],out=[];for(let i=0;i<a.length;i++){while(dq.length&&a[dq[dq.length-1]]<=a[i])dq.pop();dq.push(i);if(dq[0]<=i-k)dq.shift();if(i>=k-1)out.push(a[dq[0]]);}return out;}" },
      { q: "\"Why not just scan the stack when getMax is called?\"", a: "That is O(n) per call. The extra stack trades O(n) space for O(1) queries — say the tradeoff explicitly, it is the point of the question.", code: "// scan version: O(1) push, O(n) getMax\n// aux-stack version: O(1) push, O(1) getMax, O(n) extra space" },
    ],
    js: `function runMaxStack(ops) {
    const stack = [];
    const maxesStack = [];
    const results = [];

    for (const op of ops) {
        if (op[0] === 'push') {
            const item = op[1];
            stack.push(item);
            if (maxesStack.length === 0 || item >= maxesStack[maxesStack.length - 1]) {
                maxesStack.push(item);            // >= keeps duplicates safe
            }
        } else if (op[0] === 'pop') {
            const item = stack.pop();
            if (item === maxesStack[maxesStack.length - 1]) maxesStack.pop();
            results.push(item === undefined ? null : item);
        } else {
            const m = maxesStack[maxesStack.length - 1];
            results.push(m === undefined ? null : m);
        }
    }
    return results;
}`,
    py: `def run_max_stack(ops):
    stack, maxes, results = [], [], []
    for op in ops:
        if op[0] == 'push':
            stack.append(op[1])
            if not maxes or op[1] >= maxes[-1]:
                maxes.append(op[1])
        elif op[0] == 'pop':
            item = stack.pop() if stack else None
            if maxes and item == maxes[-1]:
                maxes.pop()
            results.append(item)
        else:
            results.append(maxes[-1] if maxes else None)
    return results`,
    starter: `function runMaxStack(ops) {
    // ops: [["push", value] | ["pop"] | ["getMax"], ...]
    // return the results of every pop and getMax

}`,
    cases: [
      { args: [[["push", 5], ["push", 3], ["getMax"], ["pop"], ["getMax"]]], expected: [5, 3, 5], sample: true },
      { args: [[["push", 1], ["push", 1], ["pop"], ["getMax"]]], expected: [1, 1], sample: true },
      { args: [[["push", 2], ["push", 9], ["push", 4], ["getMax"], ["pop"], ["getMax"], ["pop"], ["getMax"]]], expected: [9, 4, 9, 9, 2], sample: false },
      { args: [[["getMax"]]], expected: [null], sample: false },
    ],
  });

  /* ---------------- 21. The Stolen Breakfast Drone ---------------- */
  P({
    slug: "stolen-breakfast-drone",
    name: "The Stolen Breakfast Drone",
    sub: "Bit Manipulation",
    difficulty: "Medium",
    fn: "findUniqueDeliveryId",
    body: `
<p>Every delivery id appears exactly twice except one, which appears once. Find it.</p>
<h3>Example</h3>
<pre>findUniqueDeliveryId([1, 1, 2])  ->  2</pre>
<h3>Goal</h3>
<p>O(n) time, <strong>O(1) space</strong>. XOR every id together: <code>x ^ x === 0</code> and <code>x ^ 0 === x</code>, so every pair cancels and the loner survives. A hash-set solution is O(n) space — mention it, then beat it.</p>`,
    alts: [
      { q: "\"Single Number\" (LeetCode 136)", a: "Literally the same problem.", code: "const singleNumber = n => n.reduce((a,b)=>a^b, 0);" },
      { q: "\"Every number appears twice except TWO of them.\" (LeetCode 260)", a: "XOR everything, isolate the lowest set bit of the result, then partition into two groups and XOR each. Great senior-level follow-up.", code: "function twice(n){const x=n.reduce((a,b)=>a^b,0);const bit=x&-x;let a=0,b=0;for(const v of n)(v&bit)?a^=v:b^=v;return[a,b];}" },
      { q: "\"Every number appears three times except one.\" (LeetCode 137)", a: "XOR no longer cancels. Count bits at each of the 32 positions mod 3.", code: "function once3(n){let r=0;for(let i=0;i<32;i++){let c=0;for(const v of n)c+=(v>>i)&1;if(c%3)r|=1<<i;}return r|0;}" },
      { q: "\"Find the missing number from 0..n.\" (LeetCode 268)", a: "Same XOR trick against the indices — or the sum formula.", code: "function missing(n){let r=n.length;for(let i=0;i<n.length;i++)r^=i^n[i];return r;}" },
    ],
    js: `function findUniqueDeliveryId(deliveryIds) {
    let uniqueDeliveryId = 0;
    for (const deliveryId of deliveryIds) {
        uniqueDeliveryId ^= deliveryId;   // pairs cancel to 0
    }
    return uniqueDeliveryId;
}`,
    py: `def find_unique_delivery_id(delivery_ids):
    unique = 0
    for d in delivery_ids:
        unique ^= d
    return unique`,
    starter: `function findUniqueDeliveryId(deliveryIds) {
    // Write your code here

}`,
    cases: [
      { args: [[1, 1, 2]], expected: 2, sample: true },
      { args: [[4, 7, 4, 9, 7]], expected: 9, sample: true },
      { args: [[42]], expected: 42, sample: false },
      { args: [[10, 20, 30, 20, 10]], expected: 30, sample: false },
      { args: [[0, 5, 5]], expected: 0, sample: false },
    ],
  });

  /* ---------------- 22. Delete Node ---------------- */
  P({
    slug: "delete-node",
    name: "Delete Node",
    sub: "Linked Lists",
    difficulty: "Medium",
    fn: "deleteNodeAt",
    body: `
<p>You are handed a node in a singly linked list and told to delete it — but you have <strong>no reference to the head</strong>, so you cannot find the previous node to re-point.</p>
<p><strong>The trick:</strong> instead of deleting this node, copy the <em>next</em> node's value into it and skip over that next node.</p>
<h3>Task</h3>
<p>The list is given as a plain array. <code>deleteNodeAt(values, index)</code> returns the array after the delete-in-place trick. <code>index</code> is never the last element.</p>
<pre>deleteNodeAt(["a","b","c"], 1)  ->  ["a","c"]</pre>
<h3>Say this out loud in the interview</h3>
<p>Three real dangers with this trick: (1) it <strong>fails on the last node</strong> — there is no next to copy; (2) any <strong>other reference</strong> to the next node now points at a node that has been unlinked; (3) side effects surprise callers who thought their pointer was stable. Naming these is worth more than the code.</p>`,
    alts: [
      { q: "\"Delete Node in a Linked List\" (LeetCode 237) — you are given only the node.", a: "The real pointer version.", code: "function deleteNode(node){node.val=node.next.val;node.next=node.next.next;}" },
      { q: "\"Remove the nth node from the end.\" (LeetCode 19)", a: "Two pointers n apart, then unlink. Use a dummy head so removing the first node is not a special case.", code: "function removeNthFromEnd(head,n){const d={next:head};let f=d,s=d;for(let i=0;i<=n;i++)f=f.next;while(f){f=f.next;s=s.next;}s.next=s.next.next;return d.next;}" },
      { q: "\"Remove all nodes with a given value.\" (LeetCode 203)", a: "Dummy head + single walk. Simplest of the three.", code: "function removeElements(head,val){const d={next:head};let c=d;while(c.next){if(c.next.val===val)c.next=c.next.next;else c=c.next;}return d.next;}" },
    ],
    js: `function deleteNodeAt(values, index) {
    // Build the list so the trick is real, not simulated with splice.
    let head = null;
    for (let i = values.length - 1; i >= 0; i--) head = { value: values[i], next: head };

    let node = head;
    for (let i = 0; i < index; i++) node = node.next;

    if (!node.next) throw new Error('Cannot delete the last node with this trick');

    node.value = node.next.value;     // copy next into me
    node.next = node.next.next;       // skip next

    const out = [];
    for (let n = head; n; n = n.next) out.push(n.value);
    return out;
}`,
    py: `def delete_node_at(values, index):
    head = None
    for v in reversed(values):
        head = {'value': v, 'next': head}
    node = head
    for _ in range(index):
        node = node['next']
    if not node['next']:
        raise ValueError('Cannot delete the last node with this trick')
    node['value'] = node['next']['value']
    node['next'] = node['next']['next']
    out, n = [], head
    while n:
        out.append(n['value'])
        n = n['next']
    return out`,
    starter: `function deleteNodeAt(values, index) {
    // Build the linked list, delete the node at index using the
    // copy-the-next-node trick, then return the remaining values.

}`,
    cases: [
      { args: [["a", "b", "c"], 1], expected: ["a", "c"], sample: true },
      { args: [[1, 2, 3, 4], 0], expected: [2, 3, 4], sample: true },
      { args: [[1, 2, 3, 4], 2], expected: [1, 2, 4], sample: false },
      { args: [[5, 6], 0], expected: [6], sample: false },
    ],
  });

  /* ---------------- 23. Linked List Cycle ---------------- */
  P({
    slug: "linked-list-cycle",
    name: "Does This Linked List Have A Cycle?",
    sub: "Linked Lists",
    difficulty: "Medium",
    fn: "containsCycle",
    body: `
<p>Detect whether a singly linked list loops back on itself.</p>
<h3>Task</h3>
<p><code>containsCycle(values, cycleIndex)</code> — build a list from <code>values</code>, then point the last node at <code>values[cycleIndex]</code>. If <code>cycleIndex</code> is <code>-1</code> the list ends normally. Return <code>true</code>/<code>false</code>.</p>
<pre>containsCycle([1,2,3,4], 1)   ->  true
containsCycle([1,2,3,4], -1)  ->  false</pre>
<h3>Goal</h3>
<p>Floyd's tortoise and hare: a slow pointer moving 1 step and a fast pointer moving 2. If there is a loop, fast laps slow and they meet. O(n) time, <strong>O(1) space</strong> — the whole reason not to use a Set.</p>`,
    alts: [
      { q: "\"Linked List Cycle II\" (LeetCode 142) — return the node where the cycle STARTS.", a: "After they meet, reset one pointer to the head and advance both one step at a time; they meet at the entrance. Know this follow-up — it always comes.", code: "function cycleStart(head){let s=head,f=head;while(f&&f.next){s=s.next;f=f.next.next;if(s===f){let p=head;while(p!==s){p=p.next;s=s.next;}return p;}}return null;}" },
      { q: "\"Find the middle of a linked list.\" (LeetCode 876)", a: "Same two-pointer skeleton — when fast hits the end, slow is at the middle.", code: "function middle(head){let s=head,f=head;while(f&&f.next){s=s.next;f=f.next.next;}return s;}" },
      { q: "\"Happy Number\" (LeetCode 202)", a: "A cycle problem in disguise — the sequence of digit-square-sums either reaches 1 or loops. Same tortoise/hare.", code: "const sq=n=>String(n).split('').reduce((a,c)=>a+c*c,0);\nfunction isHappy(n){let s=n,f=n;do{s=sq(s);f=sq(sq(f));}while(s!==f);return s===1;}" },
      { q: "\"Why not just use a Set of visited nodes?\"", a: "It works and is O(n) time, but O(n) space. Offer it as the obvious answer, then improve to O(1). Interviewers want to see the upgrade.", code: "function hasCycleSet(head){const seen=new Set();for(let n=head;n;n=n.next){if(seen.has(n))return true;seen.add(n);}return false;}" },
    ],
    js: `function containsCycle(values, cycleIndex) {
    if (values.length === 0) return false;

    const nodes = values.map(v => ({ value: v, next: null }));
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = nodes[i + 1];
    if (cycleIndex >= 0) nodes[nodes.length - 1].next = nodes[cycleIndex];

    let slowRunner = nodes[0];
    let fastRunner = nodes[0];
    while (fastRunner && fastRunner.next) {
        slowRunner = slowRunner.next;
        fastRunner = fastRunner.next.next;
        if (fastRunner === slowRunner) return true;
    }
    return false;
}`,
    py: `def contains_cycle(values, cycle_index):
    if not values:
        return False
    nodes = [{'value': v, 'next': None} for v in values]
    for i in range(len(nodes) - 1):
        nodes[i]['next'] = nodes[i + 1]
    if cycle_index >= 0:
        nodes[-1]['next'] = nodes[cycle_index]
    slow = fast = nodes[0]
    while fast and fast['next']:
        slow = slow['next']
        fast = fast['next']['next']
        if slow is fast:
            return True
    return False`,
    starter: `function containsCycle(values, cycleIndex) {
    // Build the list (last node points at values[cycleIndex] when >= 0),
    // then detect a cycle with two runners.

}`,
    cases: [
      { args: [[1, 2, 3, 4], 1], expected: true, sample: true },
      { args: [[1, 2, 3, 4], -1], expected: false, sample: true },
      { args: [[1], 0], expected: true, sample: false },
      { args: [[1], -1], expected: false, sample: false },
      { args: [[], -1], expected: false, sample: false },
      { args: [[1, 2, 3, 4, 5, 6], 0], expected: true, sample: false },
    ],
  });

  /* ---------------- 24. Reverse a Linked List ---------------- */
  P({
    slug: "reverse-linked-list",
    name: "Reverse A Linked List",
    sub: "Linked Lists",
    difficulty: "Medium",
    fn: "reverseList",
    body: `
<p>Reverse a singly linked list <strong>in place</strong>, O(1) space.</p>
<h3>Task</h3>
<p><code>reverseList(values)</code> builds the list, reverses it with pointer surgery, and returns the values in the new order.</p>
<pre>reverseList([1,2,3,4])  ->  [4,3,2,1]</pre>
<h3>Goal</h3>
<p>Three pointers: <code>previous</code>, <code>current</code>, <code>nextNode</code>. Save next <strong>before</strong> you overwrite <code>current.next</code>, or you lose the rest of the list. Do not cheat with <code>values.reverse()</code> — write the loop.</p>`,
    alts: [
      { q: "\"Reverse Linked List\" (LeetCode 206) — do it recursively too.", a: "Recursive version is elegant but O(n) stack. Know both.", code: "function rev(head){if(!head||!head.next)return head;const nh=rev(head.next);head.next.next=head;head.next=null;return nh;}" },
      { q: "\"Reverse only nodes m through n.\" (LeetCode 92)", a: "Walk to m-1, reverse the sublist, reconnect both ends. Dummy head makes m=1 painless.", code: "// stash prev at m-1, reverse k=n-m+1 nodes, then prev.next.next = current; prev.next = newHead" },
      { q: "\"Is this linked list a palindrome?\" (LeetCode 234)", a: "Find the middle with two runners, reverse the second half, compare. Composes two of these problems — a favourite combo.", code: "// middle() + reverseList() + walk both halves comparing values" },
      { q: "\"Reverse it in groups of k.\" (LeetCode 25)", a: "Same core loop, run k times per group, then stitch. Hard, but say the plan even if you do not finish the code.", code: "// count k nodes ahead; if fewer than k remain, stop; else reverse the group and recurse on the rest" },
    ],
    js: `function reverseList(values) {
    let head = null;
    for (let i = values.length - 1; i >= 0; i--) head = { value: values[i], next: head };

    let previousNode = null;
    let currentNode = head;
    while (currentNode) {
        const nextNode = currentNode.next;   // save BEFORE overwriting
        currentNode.next = previousNode;
        previousNode = currentNode;
        currentNode = nextNode;
    }

    const out = [];
    for (let n = previousNode; n; n = n.next) out.push(n.value);
    return out;
}`,
    py: `def reverse_list(values):
    head = None
    for v in reversed(values):
        head = {'value': v, 'next': head}
    prev, cur = None, head
    while cur:
        nxt = cur['next']
        cur['next'] = prev
        prev, cur = cur, nxt
    out, n = [], prev
    while n:
        out.append(n['value'])
        n = n['next']
    return out`,
    starter: `function reverseList(values) {
    // Build the list, reverse the pointers, return the values in order.

}`,
    cases: [
      { args: [[1, 2, 3, 4]], expected: [4, 3, 2, 1], sample: true },
      { args: [[1]], expected: [1], sample: true },
      { args: [[]], expected: [], sample: false },
      { args: [["a", "b"]], expected: ["b", "a"], sample: false },
    ],
  });

  /* ---------------- 25. Kth to Last Node ---------------- */
  P({
    slug: "kth-to-last-node",
    name: "Kth to Last Node in a Singly-Linked List",
    sub: "Linked Lists",
    difficulty: "Medium",
    fn: "kthToLastNode",
    body: `
<p>Return the value of the kth-to-last node. <code>k = 1</code> means the last node.</p>
<pre>kthToLastNode(2, ["a","b","c","d"])  ->  "c"</pre>
<h3>Goal</h3>
<p>Two approaches, both O(n) time and O(1) space:</p>
<ol>
<li>Walk once to get the length, then walk <code>length - k</code> steps.</li>
<li><strong>Two pointers</strong>: move the lead pointer k ahead, then advance both until the lead falls off the end.</li>
</ol>
<p>Give both, then say the second is the one they are fishing for. Throw if k is larger than the list.</p>`,
    alts: [
      { q: "\"Remove the kth-from-last node.\" (LeetCode 19)", a: "Same two-pointer setup, but stop at the node BEFORE the target and unlink.", code: "function removeNth(head,n){const d={next:head};let f=d,s=d;for(let i=0;i<=n;i++)f=f.next;while(f){f=f.next;s=s.next;}s.next=s.next.next;return d.next;}" },
      { q: "\"Find the middle node.\" (LeetCode 876)", a: "Same family: a gap between two pointers, only here the gap is a rate difference instead of a fixed distance.", code: "function middle(head){let s=head,f=head;while(f&&f.next){s=s.next;f=f.next.next;}return s;}" },
      { q: "\"What if k is bigger than the list?\"", a: "Throw or return null — but say which and why. Silently returning the head is the bug they are watching for.", code: "if (!rightNode) throw new Error('k is larger than the list length');" },
    ],
    js: `function kthToLastNode(k, values) {
    if (k < 1) throw new Error('k must be >= 1');

    let head = null;
    for (let i = values.length - 1; i >= 0; i--) head = { value: values[i], next: head };

    let leftNode = head;
    let rightNode = head;

    for (let i = 0; i < k - 1; i++) {          // put right k-1 ahead
        if (!rightNode) throw new Error('k is larger than the list length');
        rightNode = rightNode.next;
    }
    if (!rightNode) throw new Error('k is larger than the list length');

    while (rightNode.next) {                   // move together
        leftNode = leftNode.next;
        rightNode = rightNode.next;
    }
    return leftNode.value;
}`,
    py: `def kth_to_last_node(k, values):
    head = None
    for v in reversed(values):
        head = {'value': v, 'next': head}
    left = right = head
    for _ in range(k - 1):
        if not right:
            raise ValueError('k is larger than the list length')
        right = right['next']
    if not right:
        raise ValueError('k is larger than the list length')
    while right['next']:
        left, right = left['next'], right['next']
    return left['value']`,
    starter: `function kthToLastNode(k, values) {
    // Write your code here

}`,
    cases: [
      { args: [2, ["a", "b", "c", "d"]], expected: "c", sample: true },
      { args: [1, ["a", "b", "c", "d"]], expected: "d", sample: true },
      { args: [4, [1, 2, 3, 4]], expected: 1, sample: false },
      { args: [1, [9]], expected: 9, sample: false },
    ],
  });

  /* ---------------- 26. Reverse String in Place ---------------- */
  P({
    slug: "reverse-string-in-place",
    name: "Reverse String in Place",
    sub: "Strings",
    difficulty: "Easy",
    fn: "reverseCharacters",
    body: `
<p>Reverse an array of characters <strong>in place</strong>, then return it.</p>
<pre>reverseCharacters(["a","b","c"])  ->  ["c","b","a"]</pre>
<h3>Goal</h3>
<p>Two pointers walking toward each other, swapping as they go. O(n) time, O(1) space. No <code>.reverse()</code>, no new array.</p>
<p>Note: JavaScript strings are immutable, which is exactly why the problem hands you an array — say that.</p>`,
    alts: [
      { q: "\"Reverse String\" (LeetCode 344)", a: "Identical.", code: "function reverseString(s){let l=0,r=s.length-1;while(l<r){[s[l],s[r]]=[s[r],s[l]];l++;r--;}return s;}" },
      { q: "\"Is this a palindrome?\" (LeetCode 125)", a: "Same two pointers, comparing instead of swapping — and skip non-alphanumerics.", code: "function isPal(s){s=s.toLowerCase().replace(/[^a-z0-9]/g,'');let l=0,r=s.length-1;while(l<r)if(s[l++]!==s[r--])return false;return true;}" },
      { q: "\"Reverse the vowels only.\" (LeetCode 345)", a: "Two pointers that skip until each lands on a vowel. Nice variant to show the pattern generalises.", code: "function reverseVowels(a){const V='aeiouAEIOU';let l=0,r=a.length-1;while(l<r){while(l<r&&!V.includes(a[l]))l++;while(l<r&&!V.includes(a[r]))r--;[a[l],a[r]]=[a[r],a[l]];l++;r--;}return a;}" },
    ],
    js: `function reverseCharacters(chars) {
    let leftIndex = 0;
    let rightIndex = chars.length - 1;

    while (leftIndex < rightIndex) {
        const temp = chars[leftIndex];
        chars[leftIndex] = chars[rightIndex];
        chars[rightIndex] = temp;
        leftIndex++;
        rightIndex--;
    }
    return chars;
}`,
    py: `def reverse_characters(chars):
    left, right = 0, len(chars) - 1
    while left < right:
        chars[left], chars[right] = chars[right], chars[left]
        left += 1
        right -= 1
    return chars`,
    starter: `function reverseCharacters(chars) {
    // Write your code here

}`,
    cases: [
      { args: [["a", "b", "c"]], expected: ["c", "b", "a"], sample: true },
      { args: [["h", "i"]], expected: ["i", "h"], sample: true },
      { args: [[]], expected: [], sample: false },
      { args: [["x"]], expected: ["x"], sample: false },
      { args: [["1", "2", "3", "4"]], expected: ["4", "3", "2", "1"], sample: false },
    ],
  });

  /* ---------------- 27. Reverse Words ---------------- */
  P({
    slug: "reverse-words",
    name: "Reverse Words",
    sub: "Strings",
    difficulty: "Medium",
    fn: "reverseWords",
    body: `
<p>Reverse the <strong>order of the words</strong> in an array of characters, in place. Words are separated by single spaces.</p>
<pre>"cake pound steal"  ->  "steal pound cake"</pre>
<h3>Goal</h3>
<p>The elegant trick: <strong>reverse the whole array, then reverse each word back</strong>. That gets the words in the right order with the letters facing the right way, with O(1) space.</p>
<p>Return the character array.</p>`,
    alts: [
      { q: "\"Reverse Words in a String\" (LeetCode 151) — with extra spaces to trim.", a: "Same reverse-all-then-reverse-each idea, plus a trim/collapse pass.", code: "const reverseWordsStr = s => s.trim().split(/\\s+/).reverse().join(' ');" },
      { q: "\"Rotate an array by k.\" (LeetCode 189)", a: "Exactly the same three-reversal trick: reverse all, reverse first k, reverse the rest. Recognising the shared trick is the win.", code: "function rotate(a,k){k%=a.length;const r=(i,j)=>{while(i<j){[a[i],a[j]]=[a[j],a[i]];i++;j--;}};r(0,a.length-1);r(0,k-1);r(k,a.length-1);return a;}" },
      { q: "\"Reverse the letters inside each word but keep word order.\" (LeetCode 557)", a: "Just the second half of this algorithm — skip the whole-array reverse.", code: "const reverseEach = s => s.split(' ').map(w=>[...w].reverse().join('')).join(' ');" },
    ],
    js: `function reverseCharacters(chars, leftIndex, rightIndex) {
    while (leftIndex < rightIndex) {
        const t = chars[leftIndex];
        chars[leftIndex] = chars[rightIndex];
        chars[rightIndex] = t;
        leftIndex++;
        rightIndex--;
    }
}

function reverseWords(message) {
    reverseCharacters(message, 0, message.length - 1);      // 1. whole thing

    let currentWordStartIndex = 0;
    for (let i = 0; i <= message.length; i++) {             // 2. each word back
        if (i === message.length || message[i] === ' ') {
            reverseCharacters(message, currentWordStartIndex, i - 1);
            currentWordStartIndex = i + 1;
        }
    }
    return message;
}`,
    py: `def _rev(chars, i, j):
    while i < j:
        chars[i], chars[j] = chars[j], chars[i]
        i += 1
        j -= 1

def reverse_words(message):
    _rev(message, 0, len(message) - 1)
    start = 0
    for i in range(len(message) + 1):
        if i == len(message) or message[i] == ' ':
            _rev(message, start, i - 1)
            start = i + 1
    return message`,
    starter: `function reverseWords(message) {
    // message is an array of single characters. Reverse the word order in place.

}`,
    cases: [
      {
        args: [["c", "a", "k", "e", " ", "p", "o", "u", "n", "d", " ", "s", "t", "e", "a", "l"]],
        expected: ["s", "t", "e", "a", "l", " ", "p", "o", "u", "n", "d", " ", "c", "a", "k", "e"],
        sample: true,
      },
      { args: [["h", "i"]], expected: ["h", "i"], sample: true },
      { args: [["a", " ", "b"]], expected: ["b", " ", "a"], sample: false },
      { args: [[]], expected: [], sample: false },
    ],
  });

  /* ---------------- 28. Parenthesis Matching ---------------- */
  P({
    slug: "parenthesis-matching",
    name: "Parenthesis Matching",
    sub: "Strings",
    difficulty: "Easy",
    fn: "getClosingParen",
    body: `
<p>Given a string and the index of an opening parenthesis, return the index of its matching closing parenthesis.</p>
<pre>getClosingParen("Sometimes (when I nest them (my parentheticals) too much (like this (and this))) they get confusing.", 10)
  ->  79</pre>
<h3>Goal</h3>
<p>One pass from the opening index, keeping a <strong>depth counter</strong>: <code>+1</code> on <code>(</code>, <code>-1</code> on <code>)</code>. When the count hits 0, you are there. O(n) time, O(1) space — no stack needed when you only track one bracket type.</p>`,
    alts: [
      { q: "\"Do the parentheses in this string balance?\"", a: "Same counter. Fail early if it ever goes negative, and require 0 at the end.", code: "function balanced(s){let d=0;for(const c of s){if(c==='(')d++;else if(c===')'&&--d<0)return false;}return d===0;}" },
      { q: "\"What's the maximum nesting depth?\" (LeetCode 1614)", a: "Same loop, track the running maximum instead of stopping at zero.", code: "function maxDepth(s){let d=0,m=0;for(const c of s){if(c==='(')m=Math.max(m,++d);else if(c===')')d--;}return m;}" },
      { q: "\"Now there are three bracket types.\"", a: "A counter no longer works — you need a stack to know WHICH bracket to close. That is the next problem in this tier.", code: "// '([)]' has a balanced count but is invalid -> stack required" },
    ],
    js: `function getClosingParen(sentence, openingParenIndex) {
    let openNestedParens = 0;

    for (let position = openingParenIndex + 1; position < sentence.length; position++) {
        const char = sentence[position];
        if (char === '(') {
            openNestedParens++;
        } else if (char === ')') {
            if (openNestedParens === 0) return position;
            openNestedParens--;
        }
    }
    throw new Error('No closing parenthesis :(');
}`,
    py: `def get_closing_paren(sentence, opening_paren_index):
    open_nested = 0
    for position in range(opening_paren_index + 1, len(sentence)):
        char = sentence[position]
        if char == '(':
            open_nested += 1
        elif char == ')':
            if open_nested == 0:
                return position
            open_nested -= 1
    raise ValueError('No closing parenthesis :(')`,
    starter: `function getClosingParen(sentence, openingParenIndex) {
    // Write your code here

}`,
    cases: [
      { args: ["Sometimes (when I nest them (my parentheticals) too much (like this (and this))) they get confusing.", 10], expected: 79, sample: true },
      { args: ["()", 0], expected: 1, sample: true },
      { args: ["(a(b)c)", 0], expected: 6, sample: false },
      { args: ["(a(b)c)", 2], expected: 4, sample: false },
    ],
  });

  /* ---------------- 29. Bracket Validator ---------------- */
  P({
    slug: "bracket-validator",
    name: "Bracket Validator",
    sub: "Stacks & Queues",
    difficulty: "Medium",
    fn: "isValid",
    body: `
<p>Given a string containing <code>( ) [ ] { }</code> and other characters, return <code>true</code> if every bracket is correctly opened and closed <strong>in the right order</strong>.</p>
<pre>"{ [ ] ( ) }"  ->  true
"{ [ ( ] ) }"  ->  false
"{ [ }"        ->  false</pre>
<h3>Goal</h3>
<p>A stack. Push openers; on a closer, pop and check it matches. Two failure modes to handle explicitly: a closer arriving with an <strong>empty stack</strong>, and a <strong>non-empty stack</strong> at the end.</p>`,
    alts: [
      { q: "\"Valid Parentheses\" (LeetCode 20)", a: "Same problem, usually with brackets only.", code: "function isValidLC(s){const m={')':'(',']':'[','}':'{'},st=[];for(const c of s){if(!m[c])st.push(c);else if(st.pop()!==m[c])return false;}return !st.length;}" },
      { q: "\"Add the fewest brackets to make it valid.\" (LeetCode 921)", a: "Count unmatched openers and closers as you scan; the answer is their sum.", code: "function minAdd(s){let open=0,need=0;for(const c of s){if(c==='(')open++;else if(open)open--;else need++;}return open+need;}" },
      { q: "\"Validate that these HTML/JSX tags are properly nested.\"", a: "Same stack, tag names instead of bracket chars — the frontend version they will actually reach for.", code: "function tagsValid(tags){const st=[];for(const t of tags){if(t.startsWith('/')){if(st.pop()!==t.slice(1))return false;}else st.push(t);}return !st.length;}" },
      { q: "\"What's the longest valid parentheses substring?\" (LeetCode 32)", a: "Much harder — stack of indices, or a two-pass counter scan. Say the approach, do not bluff the code.", code: "// stack seeded with -1; on ')' pop then length = i - stack.top()" },
    ],
    js: `function isValid(code) {
    const openersToClosers = { '(': ')', '[': ']', '{': '}' };
    const openers = new Set(Object.keys(openersToClosers));
    const closers = new Set(Object.values(openersToClosers));

    const openersStack = [];

    for (const char of code) {
        if (openers.has(char)) {
            openersStack.push(char);
        } else if (closers.has(char)) {
            if (openersStack.length === 0) return false;          // closer with nothing open
            const lastUnclosedOpener = openersStack.pop();
            if (openersToClosers[lastUnclosedOpener] !== char) return false;
        }
    }
    return openersStack.length === 0;                              // nothing left dangling
}`,
    py: `def is_valid(code):
    pairs = {'(': ')', '[': ']', '{': '}'}
    stack = []
    for char in code:
        if char in pairs:
            stack.append(char)
        elif char in pairs.values():
            if not stack or pairs[stack.pop()] != char:
                return False
    return not stack`,
    starter: `function isValid(code) {
    // Write your code here

}`,
    cases: [
      { args: ["{ [ ] ( ) }"], expected: true, sample: true },
      { args: ["{ [ ( ] ) }"], expected: false, sample: true },
      { args: ["{ [ }"], expected: false, sample: false },
      { args: [""], expected: true, sample: false },
      { args: ["const a = fn([1, 2], {b: 3});"], expected: true, sample: false },
      { args: [")("], expected: false, sample: false },
    ],
  });

  /* ---------------- 30. Permutation Palindrome ---------------- */
  P({
    slug: "permutation-palindrome",
    name: "Permutation Palindrome",
    sub: "Hashing",
    difficulty: "Easy",
    fn: "hasPalindromePermutation",
    body: `
<p>Return <code>true</code> if <strong>any</strong> rearrangement of the string is a palindrome.</p>
<pre>"civic"  -> true
"ivicc"  -> true   (rearranges to "civic")
"civil"  -> false</pre>
<h3>Goal</h3>
<p>The insight: a palindrome can have <strong>at most one</strong> character with an odd count (the middle one). So track characters with odd counts in a Set — add on first sight, remove on second — and check the Set has size 0 or 1 at the end. O(n) time.</p>`,
    alts: [
      { q: "\"Palindrome Permutation\" (LeetCode 266)", a: "Same problem.", code: "function canPerm(s){const odd=new Set();for(const c of s)odd.has(c)?odd.delete(c):odd.add(c);return odd.size<=1;}" },
      { q: "\"Are these two strings anagrams?\" (LeetCode 242)", a: "Related counting: build a count map from one, decrement with the other, everything must land on 0.", code: "function isAnagram(a,b){if(a.length!==b.length)return false;const m={};for(const c of a)m[c]=(m[c]||0)+1;for(const c of b){if(!m[c])return false;m[c]--;}return true;}" },
      { q: "\"Build the longest palindrome you can from these letters.\" (LeetCode 409)", a: "Sum the even parts of every count, then +1 if any odd count exists.", code: "function longestPal(s){const m={};for(const c of s)m[c]=(m[c]||0)+1;let len=0,odd=0;for(const k in m){len+=m[k]-(m[k]%2);if(m[k]%2)odd=1;}return len+odd;}" },
      { q: "\"Do it with a bitmask instead of a Set.\"", a: "For a-z, XOR a bit per character; valid when the result has at most one bit set. Slick O(1) space answer.", code: "function canPermBits(s){let m=0;for(const c of s)m^=1<<(c.charCodeAt(0)-97);return (m&(m-1))===0;}" },
    ],
    js: `function hasPalindromePermutation(theString) {
    const unpairedCharacters = new Set();

    for (const char of theString) {
        if (unpairedCharacters.has(char)) unpairedCharacters.delete(char);   // found its pair
        else unpairedCharacters.add(char);
    }
    return unpairedCharacters.size <= 1;
}`,
    py: `def has_palindrome_permutation(the_string):
    unpaired = set()
    for char in the_string:
        if char in unpaired:
            unpaired.remove(char)
        else:
            unpaired.add(char)
    return len(unpaired) <= 1`,
    starter: `function hasPalindromePermutation(theString) {
    // Write your code here

}`,
    cases: [
      { args: ["civic"], expected: true, sample: true },
      { args: ["civil"], expected: false, sample: true },
      { args: ["ivicc"], expected: true, sample: false },
      { args: [""], expected: true, sample: false },
      { args: ["a"], expected: true, sample: false },
      { args: ["aabbcd"], expected: false, sample: false },
    ],
  });

  /* ---------------- 31. Recursive String Permutations ---------------- */
  P({
    slug: "recursive-string-permutations",
    name: "Recursive String Permutations",
    sub: "Recursion",
    difficulty: "Hard",
    fn: "getPermutations",
    body: `
<p>Return every permutation of a string, <strong>sorted alphabetically</strong>, as an array.</p>
<pre>getPermutations("cat")
  ->  ["act","atc","cat","cta","tac","tca"]</pre>
<h3>Goal</h3>
<p>Recursion. Base case: the empty string has one permutation, <code>""</code>. Otherwise take off the last character, get all permutations of the rest, and insert that character at every position in each of them.</p>
<p>Complexity is O(n!) — say it out loud, and say why that is unavoidable: there are n! outputs.</p>`,
    alts: [
      { q: "\"Permutations\" (LeetCode 46) — of an array of distinct numbers.", a: "Backtracking version. Same idea, mutate-and-undo.", code: "function permute(nums){const out=[];(function bt(cur,rest){if(!rest.length)return out.push([...cur]);rest.forEach((n,i)=>bt([...cur,n],[...rest.slice(0,i),...rest.slice(i+1)]));})([],nums);return out;}" },
      { q: "\"Subsets / power set.\" (LeetCode 78)", a: "Easier sibling — for each element, include or exclude. 2ⁿ instead of n!.", code: "function subsets(nums){return nums.reduce((acc,n)=>acc.concat(acc.map(s=>[...s,n])),[[]]);}" },
      { q: "\"Letter Combinations of a Phone Number.\" (LeetCode 17)", a: "Same recursive shape with a fixed alphabet per position. The most common real interview version.", code: "const MAP={2:'abc',3:'def',4:'ghi',5:'jkl',6:'mno',7:'pqrs',8:'tuv',9:'wxyz'};\nfunction letters(d){if(!d)return[];return[...d].reduce((acc,c)=>acc.flatMap(p=>[...MAP[c]].map(l=>p+l)),['']);}" },
      { q: "\"What if the string has duplicate characters?\"", a: "Dedupe with a Set, or sort and skip repeats during backtracking. They ask this to see if you notice.", code: "return [...new Set(permutations)].sort();" },
    ],
    js: `function getPermutations(string) {
    if (string.length <= 1) return [string];

    const allCharsExceptLast = string.slice(0, -1);
    const lastChar = string[string.length - 1];

    const permutationsOfAllCharsExceptLast = getPermutations(allCharsExceptLast);

    const permutations = new Set();
    for (const permutationOfAllCharsExceptLast of permutationsOfAllCharsExceptLast) {
        for (let position = 0; position <= allCharsExceptLast.length; position++) {
            permutations.add(
                permutationOfAllCharsExceptLast.slice(0, position) +
                lastChar +
                permutationOfAllCharsExceptLast.slice(position)
            );
        }
    }
    return [...permutations].sort();
}`,
    py: `def get_permutations(string):
    if len(string) <= 1:
        return [string]
    all_but_last, last = string[:-1], string[-1]
    perms = set()
    for p in get_permutations(all_but_last):
        for i in range(len(p) + 1):
            perms.add(p[:i] + last + p[i:])
    return sorted(perms)`,
    starter: `function getPermutations(string) {
    // Return every permutation, sorted alphabetically.

}`,
    cases: [
      { args: ["cat"], expected: ["act", "atc", "cat", "cta", "tac", "tca"], sample: true },
      { args: ["ab"], expected: ["ab", "ba"], sample: true },
      { args: [""], expected: [""], sample: false },
      { args: ["a"], expected: ["a"], sample: false },
      { args: ["aab"], expected: ["aab", "aba", "baa"], sample: false },
    ],
  });
})();
