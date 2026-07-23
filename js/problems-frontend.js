/* PracticeRank frontend problem bank — React certification-style + CSS challenges.
 * type: "react" — user writes a component named App (JSX, compiled with Babel in an iframe,
 *   graded by DOM-assertion tests run against a fresh render per test).
 * type: "css" — HTML fixture is fixed; user writes CSS only, graded by geometry/computed-style tests.
 * Test helpers available inside test bodies:
 *   react: $, $$, tid(id), click(el), setValue(el, v), flush(), sleep(ms), assert(cond, msg)
 *   css:   $, $$, rect(sel), cs(sel), assert(cond, msg)
 */
window.FRONTEND_PROBLEMS = [
  /* ============================ REACT ============================ */
  {
    slug: "react-counter",
    name: "React: Counter",
    category: "React",
    type: "react",
    difficulty: "Easy",
    maxScore: 15,
    successRate: "92.14%",
    statement: `
<p>The classic warm-up on every React screen. Build a counter with three buttons.</p>
<h3>Requirements</h3>
<ul>
<li>The current count is displayed in the element with <code>data-testid="count"</code>, starting at <code>0</code>.</li>
<li>Clicking the <code>data-testid="increment"</code> button increases the count by 1.</li>
<li>Clicking the <code>data-testid="decrement"</code> button decreases the count by 1 (negative values are allowed).</li>
<li>Clicking the <code>data-testid="reset"</code> button sets the count back to 0.</li>
</ul>
<p>Keep the component named <code>App</code> and do not remove the <code>data-testid</code> attributes — the grader targets them.</p>`,
    starter: `function App() {
    const [count, setCount] = React.useState(0);
    // TODO: wire up the three buttons

    return (
        <div className="counter">
            <h1 data-testid="count">{count}</h1>
            <button data-testid="decrement">-</button>
            <button data-testid="increment">+</button>
            <button data-testid="reset">Reset</button>
        </div>
    );
}`,
    tests: [
      { name: "renders with initial count 0", sample: true,
        body: `assert(tid('count'), 'Missing element with data-testid="count"');
assert(tid('count').textContent.trim() === '0', 'Expected initial count 0, got "' + tid('count').textContent.trim() + '"');` },
      { name: "increment adds 1 per click", sample: true,
        body: `await click(tid('increment')); await click(tid('increment')); await click(tid('increment')); await flush();
assert(tid('count').textContent.trim() === '3', 'After 3 increments expected 3, got "' + tid('count').textContent.trim() + '"');` },
      { name: "decrement subtracts 1 (can go negative)", sample: false,
        body: `await click(tid('decrement')); await click(tid('decrement')); await flush();
assert(tid('count').textContent.trim() === '-2', 'After 2 decrements expected -2, got "' + tid('count').textContent.trim() + '"');` },
      { name: "reset returns to 0", sample: false,
        body: `await click(tid('increment')); await click(tid('increment')); await flush();
await click(tid('reset')); await flush();
assert(tid('count').textContent.trim() === '0', 'After reset expected 0, got "' + tid('count').textContent.trim() + '"');` },
    ],
  },
  {
    slug: "react-item-list-manager",
    name: "React: Item List Manager",
    category: "React",
    type: "react",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "84.60%",
    statement: `
<p>A HackerRank React certification staple: an input, an <em>Add</em> button, and a list.</p>
<h3>Requirements</h3>
<ul>
<li>The input has <code>data-testid="item-input"</code> and must be a controlled input (typing updates it).</li>
<li>Clicking the <code>data-testid="add-button"</code> button appends the input's current text as a new <code>&lt;li&gt;</code> at the <strong>end</strong> of the <code>data-testid="item-list"</code> list.</li>
<li>After adding, the input is cleared.</li>
<li>If the input is empty or only whitespace, clicking Add does nothing.</li>
</ul>`,
    starter: `function App() {
    const [items, setItems] = React.useState([]);
    const [text, setText] = React.useState("");
    // TODO: control the input, implement the add handler

    return (
        <div>
            <input data-testid="item-input" placeholder="Enter item" />
            <button data-testid="add-button">Add</button>
            <ul data-testid="item-list">
            </ul>
        </div>
    );
}`,
    tests: [
      { name: "list starts empty", sample: true,
        body: `assert($$('[data-testid="item-list"] li').length === 0, 'Expected 0 items initially, found ' + $$('[data-testid="item-list"] li').length);` },
      { name: "adds an item and clears the input", sample: true,
        body: `setValue(tid('item-input'), 'Apples'); await flush();
click(tid('add-button')); await flush();
var lis = $$('[data-testid="item-list"] li');
assert(lis.length === 1, 'Expected 1 item after adding, found ' + lis.length);
assert(lis[0].textContent.trim() === 'Apples', 'Expected item text "Apples", got "' + lis[0].textContent.trim() + '"');
assert(tid('item-input').value === '', 'Input should be cleared after adding, got "' + tid('item-input').value + '"');` },
      { name: "keeps items in insertion order", sample: false,
        body: `setValue(tid('item-input'), 'One'); await flush(); click(tid('add-button')); await flush();
setValue(tid('item-input'), 'Two'); await flush(); click(tid('add-button')); await flush();
var lis = $$('[data-testid="item-list"] li');
assert(lis.length === 2, 'Expected 2 items, found ' + lis.length);
assert(lis[0].textContent.trim() === 'One' && lis[1].textContent.trim() === 'Two', 'Items out of order: [' + lis.map(function(l){return l.textContent.trim();}).join(', ') + ']');` },
      { name: "ignores empty / whitespace input", sample: false,
        body: `setValue(tid('item-input'), '   '); await flush();
click(tid('add-button')); await flush();
assert($$('[data-testid="item-list"] li').length === 0, 'Whitespace-only input should not be added');` },
    ],
  },
  {
    slug: "react-movies-list",
    name: "React: Movies List (Search Filter)",
    category: "React",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "71.28%",
    statement: `
<p>The famous "Movies List" question. Given a fixed list of movies, implement a live search box that filters the list as the user types.</p>
<h3>Requirements</h3>
<ul>
<li>Initially, all movies are rendered as <code>&lt;li&gt;</code> items inside <code>data-testid="movies-list"</code>.</li>
<li>Typing in <code>data-testid="search-input"</code> filters the list to movies whose <strong>title contains</strong> the query, <strong>case-insensitively</strong>.</li>
<li>When no movie matches, render <code>&lt;div data-testid="no-results"&gt;No results found&lt;/div&gt;</code> and an empty list.</li>
<li>Clearing the search restores the full list.</li>
</ul>
<p>The <code>MOVIES</code> array is provided in the starter — do not change it.</p>`,
    starter: `const MOVIES = [
    { id: 1, title: "Inception", year: 2010 },
    { id: 2, title: "Interstellar", year: 2014 },
    { id: 3, title: "The Dark Knight", year: 2008 },
    { id: 4, title: "Dunkirk", year: 2017 },
    { id: 5, title: "Tenet", year: 2020 },
    { id: 6, title: "The Prestige", year: 2006 },
];

function App() {
    const [query, setQuery] = React.useState("");
    // TODO: control the input and filter MOVIES by title (case-insensitive).
    // Render <div data-testid="no-results">No results found</div> when nothing matches.

    return (
        <div>
            <input data-testid="search-input" placeholder="Search movies..." />
            <ul data-testid="movies-list">
                {MOVIES.map((m) => (
                    <li key={m.id}>{m.title} ({m.year})</li>
                ))}
            </ul>
        </div>
    );
}`,
    tests: [
      { name: "shows all 6 movies initially", sample: true,
        body: `var lis = $$('[data-testid="movies-list"] li');
assert(lis.length === 6, 'Expected 6 movies initially, found ' + lis.length);` },
      { name: 'typing "the" filters to 2 movies', sample: true,
        body: `setValue(tid('search-input'), 'the'); await flush();
var lis = $$('[data-testid="movies-list"] li');
assert(lis.length === 2, 'Expected 2 matches for "the", found ' + lis.length);
var text = lis.map(function(l){return l.textContent;}).join(' | ');
assert(text.indexOf('The Dark Knight') !== -1 && text.indexOf('The Prestige') !== -1, 'Expected The Dark Knight and The Prestige, got: ' + text);` },
      { name: "search is case-insensitive", sample: false,
        body: `setValue(tid('search-input'), 'INCEP'); await flush();
var lis = $$('[data-testid="movies-list"] li');
assert(lis.length === 1, 'Expected 1 match for "INCEP", found ' + lis.length);
assert(lis[0].textContent.indexOf('Inception') !== -1, 'Expected Inception, got "' + lis[0].textContent + '"');` },
      { name: 'shows "No results found" when nothing matches', sample: false,
        body: `setValue(tid('search-input'), 'zzz'); await flush();
assert($$('[data-testid="movies-list"] li').length === 0, 'List should be empty for no matches');
assert(tid('no-results'), 'Missing data-testid="no-results" element');
assert(/no results found/i.test(tid('no-results').textContent), 'no-results element should say "No results found"');` },
      { name: "clearing the search restores the full list", sample: false,
        body: `setValue(tid('search-input'), 'zzz'); await flush();
setValue(tid('search-input'), ''); await flush();
assert($$('[data-testid="movies-list"] li').length === 6, 'Expected full list after clearing search');` },
    ],
  },
  {
    slug: "react-movies-list-api",
    name: "React Native: Movies List (API, Sort & Pagination)",
    category: "React",
    type: "react",
    difficulty: "Hard",
    maxScore: 60,
    successRate: "37.62%",
    statement: `
<p>A faithful replica of the real HackerRank React Native assessment question. You are given a large
boilerplate: React Native components (<code>ActivityIndicator</code>, <code>FlatList</code>,
<code>TextInput</code>&hellip; shimmed for the web here), child components, and an offline mirror of the real
endpoint <code>https://jsonmock.hackerrank.com/api/moviesdata</code>. Complete the <code>MoviesList</code>
screen (the component named <code>App</code>).</p>
<h3>API Contract</h3>
<p><code>GET /api/moviesdata?Title=&lt;substring&gt;&amp;page=&lt;n&gt;</code> responds with
<code>{ page, per_page, total, total_pages, data: [{ Title, Year, imdbID }] }</code>. <code>per_page</code>
is 8. <code>Title</code> is a case-insensitive substring match. The mirror in the boilerplate has the exact
same contract &mdash; call it with <code>fetch(url)</code> then <code>res.json()</code>, as you would the real one.</p>
<h3>Requirements</h3>
<ul>
<li><strong>Loading:</strong> while page 1 is being fetched, show the <code>ActivityIndicator</code>
(<code>testID="loading-indicator"</code>) and hide the list. Hide the indicator once data arrives.</li>
<li><strong>Initial load:</strong> fetch page 1 on mount and render each movie&rsquo;s Title and Year
(complete <code>MovieItem</code>).</li>
<li><strong>Search:</strong> typing in <code>testID="search-input"</code> re-fetches with
<code>?Title=&lt;text&gt;</code> and resets to page 1.</li>
<li><strong>Sort By</strong> (<code>testID="sort-option"</code>) toggles Year &harr; Title. <strong>Order</strong>
(<code>testID="sort-order"</code>) toggles asc &harr; desc. Initial state: <em>Year, asc &mdash; and it is applied</em>,
so the first render is sorted by year ascending. Sorting is client-side over everything loaded so far.</li>
<li><strong>Clear Sort</strong> (<code>testID="clear-sort"</code>) removes sorting: the list returns to exact
API order and the option label shows <code>None</code>.</li>
<li><strong>Pagination:</strong> a <code>Load More</code> control (<code>testID="load-more"</code>) in the list
footer fetches the next page and <em>appends</em>. It must disappear on the last page
(<code>page &gt;= total_pages</code>).</li>
</ul>
<h3>Boilerplate notes &mdash; read these FIRST</h3>
<p>The real assessment buries a list like this at the very bottom of the question. Reading it before coding
is the difference between 60 minutes of flow and 60 minutes of confusion:</p>
<ul>
<li>Keep the component named <code>App</code> &mdash; it is the MoviesList screen.</li>
<li>Do not modify the SHIMS or API MIRROR sections. Complete only the TODO blocks.</li>
<li>A <code>useEffect</code> callback cannot be <code>async</code>. Define an async function inside the
effect (or next to it) and call it.</li>
<li><code>onChangeText</code> hands you the new text as an argument. State updates are asynchronous, so use
that argument &mdash; reading <code>searchInput</code> right after <code>setSearchInput</code> gives the OLD value.</li>
<li><code>MoviesListView</code> renders <code>props.data</code>. If a parent passes
<code>{...listProps}</code> (spread), <code>data</code> arrives without ever appearing literally at the
call site &mdash; this is why the real boilerplate looked like data was &ldquo;never passed&rdquo;.</li>
<li>Append results for <code>page &gt; 1</code>; replace them for <code>page === 1</code>.</li>
<li><code>Year</code> is a number; <code>Title</code> is a string &mdash; sort them differently.</li>
<li>Do not remove any <code>testID</code> &mdash; the grader targets them.</li>
<li>No console here (like the real thing). Debug by temporarily rendering state:
<code>&lt;Text&gt;{JSON.stringify(items.length)}&lt;/Text&gt;</code>.</li>
</ul>`,
    starter: `/* =====================================================================
   BOILERPLATE — do not modify the SHIMS or API MIRROR sections.
   Your work: the TODO blocks in MovieItem and App (MoviesList).
   ===================================================================== */

/* ---- SHIMS: react-native components for the web (do not modify) ---- */
const StyleSheet = { create: function (s) { return s; } };
const View = (props) => (
    <div data-testid={props.testID} style={props.style}>{props.children}</div>
);
const SafeAreaView = View;
const Text = (props) => (
    <span data-testid={props.testID} style={Object.assign({ display: "block" }, props.style || {})}>
        {props.children}
    </span>
);
const TextInput = (props) => (
    <input
        data-testid={props.testID}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChangeText && props.onChangeText(e.target.value)}
        style={props.style}
    />
);
const TouchableOpacity = (props) => (
    <button data-testid={props.testID} onClick={props.onPress} disabled={props.disabled} style={props.style}>
        {props.children}
    </button>
);
const ActivityIndicator = (props) => (
    <div data-testid={props.testID || "loading-indicator"} style={{ padding: 12, color: "#576871" }}>
        Loading&hellip;
    </div>
);
function FlatList(props) {
    const data = props.data || [];
    const piece = (C) => (!C ? null : React.isValidElement(C) ? C : <C />);
    return (
        <div data-testid={props.testID} style={props.style}>
            {piece(props.ListHeaderComponent)}
            {data.map((item, index) => (
                <React.Fragment key={props.keyExtractor ? props.keyExtractor(item, index) : index}>
                    {props.renderItem({ item: item, index: index })}
                </React.Fragment>
            ))}
            {data.length === 0 ? piece(props.ListEmptyComponent) : null}
            {piece(props.ListFooterComponent)}
        </div>
    );
}

/* ---- API MIRROR of https://jsonmock.hackerrank.com/api/moviesdata (do not modify) ----
   GET ?Title=<substring>&page=<n> -> { page, per_page, total, total_pages, data } */
const MOVIE_DB = [
    { Title: "The Matrix", Year: 1999, imdbID: "tt0133093" },
    { Title: "Spider-Man", Year: 2002, imdbID: "tt0145487" },
    { Title: "Memento", Year: 2000, imdbID: "tt0209144" },
    { Title: "Batman Begins", Year: 2005, imdbID: "tt0372784" },
    { Title: "Cast Away", Year: 2000, imdbID: "tt0162222" },
    { Title: "Iron Man", Year: 2008, imdbID: "tt0371746" },
    { Title: "The Prestige", Year: 2006, imdbID: "tt0482571" },
    { Title: "Superman Returns", Year: 2006, imdbID: "tt0348150" },
    { Title: "Inception", Year: 2010, imdbID: "tt1375666" },
    { Title: "The Social Network", Year: 2010, imdbID: "tt1285016" },
    { Title: "Man of Steel", Year: 2013, imdbID: "tt0770828" },
    { Title: "Gravity", Year: 2013, imdbID: "tt1454468" },
    { Title: "Interstellar", Year: 2014, imdbID: "tt0816692" },
    { Title: "Whiplash", Year: 2014, imdbID: "tt2582802" },
    { Title: "Mad Max: Fury Road", Year: 2015, imdbID: "tt1392190" },
    { Title: "Arrival", Year: 2016, imdbID: "tt2543164" },
    { Title: "La La Land", Year: 2016, imdbID: "tt3783958" },
    { Title: "Dunkirk", Year: 2017, imdbID: "tt5013056" },
    { Title: "Spider-Man: Homecoming", Year: 2017, imdbID: "tt2250912" },
    { Title: "Black Panther", Year: 2018, imdbID: "tt1825683" },
    { Title: "Parasite", Year: 2019, imdbID: "tt6751668" },
    { Title: "Tenet", Year: 2020, imdbID: "tt6723592" },
    { Title: "Dune", Year: 2021, imdbID: "tt1160419" },
    { Title: "Everything Everywhere All at Once", Year: 2022, imdbID: "tt6710474" },
];
function fetchMoviesApi(url) {
    const q = {};
    (url.split("?")[1] || "").split("&").forEach(function (kv) {
        const parts = kv.split("=");
        if (parts[0]) q[parts[0]] = decodeURIComponent(parts[1] || "");
    });
    const title = (q.Title || "").toLowerCase();
    const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
    const hits = MOVIE_DB.filter(function (m) { return m.Title.toLowerCase().indexOf(title) !== -1; });
    const per = 8;
    const body = {
        page: page,
        per_page: per,
        total: hits.length,
        total_pages: Math.max(1, Math.ceil(hits.length / per)),
        data: hits.slice((page - 1) * per, page * per),
    };
    return new Promise(function (resolve) {
        setTimeout(function () { resolve({ json: function () { return Promise.resolve(body); } }); }, 120);
    });
}
const fetch = fetchMoviesApi; // your fetch("https://jsonmock...") calls hit the mirror

/* ---- STYLES (given) ---- */
const styles = StyleSheet.create({
    screen: { maxWidth: 420 },
    search: { width: "95%", padding: 8, marginBottom: 8 },
    toolbar: { display: "flex", gap: 6, marginBottom: 10 },
    card: { border: "1px solid #d3d9dd", borderRadius: 4, padding: "8px 12px", marginBottom: 6 },
    title: { fontWeight: 600 },
    year: { color: "#576871", fontSize: 13 },
});

/* ---- CHILD COMPONENTS — complete the TODOs ---- */
function MovieItem({ item }) {
    return (
        <View style={styles.card} testID="movie-item">
            <Text style={styles.title} testID="movie-title">{/* TODO: the movie's Title */}</Text>
            <Text style={styles.year} testID="movie-year">{/* TODO: the movie's Year */}</Text>
        </View>
    );
}

function MoviesListView(props) {
    // NOTE: this child renders props.data. When a parent passes {...listProps},
    // "data" arrives without appearing literally at the call site.
    return (
        <FlatList
            data={props.data}
            renderItem={props.renderItem}
            keyExtractor={function (item) { return item.imdbID; }}
            ListFooterComponent={props.ListFooterComponent}
            ListEmptyComponent={<Text testID="empty-note">No movies found</Text>}
        />
    );
}

/* ---- THE SCREEN — complete the TODOs. Keep it named App. ---- */
function App() {
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [items, setItems] = React.useState([]);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [searchInput, setSearchInput] = React.useState("");
    const [sortOption, setSortOption] = React.useState("Year");
    const [sortOrder, setSortOrder] = React.useState("asc");

    React.useEffect(function () {
        // TODO: call fetchData(). The effect callback itself cannot be async.
    }, [page, searchInput]);

    async function fetchData() {
        // TODO: setLoading(true) when page === 1 (setLoadingMore(true) otherwise);
        // fetch "https://jsonmock.hackerrank.com/api/moviesdata?Title=" + searchInput + "&page=" + page
        // then res.json(); replace items on page 1, APPEND on later pages;
        // store total_pages; clear both loading flags.
    }

    const handleSearch = (val) => {
        // TODO: update searchInput from val (NOT from state) and reset page to 1.
    };

    const toggleSortOption = () => {
        // TODO: Year <-> Title (and from "no sort" back to Year)
    };

    const toggleSortOrder = () => {
        // TODO: asc <-> desc
    };

    const handleClearSort = () => {
        // TODO: remove sorting (API order) and reset order to asc
    };

    const handleLoadMore = () => {
        // TODO: advance to the next page if one exists
    };

    const displayed = React.useMemo(function () {
        // TODO: return items sorted by sortOption/sortOrder,
        // or items exactly as fetched when sorting is cleared.
        return items;
    }, [items, sortOption, sortOrder]);

    const renderItem = ({ item }) => <MovieItem item={item} />;

    return (
        <SafeAreaView style={styles.screen}>
            <TextInput
                testID="search-input"
                placeholder="Search movies by title"
                value={searchInput}
                onChangeText={handleSearch}
                style={styles.search}
            />
            <View style={styles.toolbar}>
                <TouchableOpacity testID="sort-option" onPress={toggleSortOption}>
                    <Text>Sort by: {sortOption || "None"}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="sort-order" onPress={toggleSortOrder}>
                    <Text>Order: {sortOrder === "asc" ? "Asc" : "Desc"}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="clear-sort" onPress={handleClearSort}>
                    <Text>Clear Sort</Text>
                </TouchableOpacity>
            </View>
            {loading ? (
                <ActivityIndicator testID="loading-indicator" />
            ) : (
                <MoviesListView
                    data={displayed}
                    renderItem={renderItem}
                    ListFooterComponent={
                        <View>
                            {loadingMore ? <ActivityIndicator testID="footer-indicator" /> : null}
                            {page < totalPages ? (
                                <TouchableOpacity testID="load-more" onPress={handleLoadMore}>
                                    <Text>Load More</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}`,
    tests: [
      { name: "shows ActivityIndicator while loading, then 8 movies", sample: true,
        body: `assert(tid('loading-indicator'), 'Expected an ActivityIndicator (testID "loading-indicator") while page 1 loads');
assert($$('[data-testid="movie-item"]').length === 0, 'The list should be hidden while loading');
await sleep(400); await flush();
assert(!tid('loading-indicator'), 'The ActivityIndicator should disappear once data arrives');
assert($$('[data-testid="movie-item"]').length === 8, 'Expected 8 movies on page 1, got ' + $$('[data-testid="movie-item"]').length);` },
      { name: "initial view is sorted by Year ascending", sample: true,
        body: `await sleep(400); await flush();
var ys = $$('[data-testid="movie-year"]').map(function (e) { return parseInt(e.textContent, 10); });
assert(ys.length === 8, 'Expected 8 rendered years, got ' + ys.length + ' — did you complete MovieItem?');
for (var i = 1; i < ys.length; i++) assert(ys[i-1] <= ys[i], 'Default view must be sorted by Year ascending — saw ' + ys.join(', '));
assert(ys[0] === 1999 && ys[7] === 2008, 'Page 1 by year should run 1999 -> 2008, got ' + ys.join(', '));` },
      { name: "search re-fetches with ?Title= filter", sample: true,
        body: `await sleep(400); await flush();
setValue(tid('search-input'), 'man');
await sleep(400); await flush();
var ts = $$('[data-testid="movie-title"]').map(function (e) { return e.textContent; });
assert(ts.length === 6, 'Searching "man" should yield 6 movies, got ' + ts.length + ' (' + ts.join(' | ') + ')');
ts.forEach(function (t) { assert(t.toLowerCase().indexOf('man') !== -1, 'Search result "' + t + '" does not contain "man"'); });` },
      { name: "Sort By toggles to Title (alphabetical)", sample: false,
        body: `await sleep(400); await flush();
await click(tid('sort-option')); await sleep(120); await flush();
var ts = $$('[data-testid="movie-title"]').map(function (e) { return e.textContent; });
var exp = ['Batman Begins','Cast Away','Iron Man','Memento','Spider-Man','Superman Returns','The Matrix','The Prestige'];
assert(JSON.stringify(ts) === JSON.stringify(exp), 'Sort by Title (asc) expected: ' + exp.join(', ') + ' — got: ' + ts.join(', '));` },
      { name: "Order toggles to descending", sample: false,
        body: `await sleep(400); await flush();
await click(tid('sort-order')); await sleep(120); await flush();
var ys = $$('[data-testid="movie-year"]').map(function (e) { return parseInt(e.textContent, 10); });
for (var i = 1; i < ys.length; i++) assert(ys[i-1] >= ys[i], 'Year descending expected — saw ' + ys.join(', '));
assert(ys[0] === 2008 && ys[7] === 1999, 'Desc should run 2008 -> 1999, got ' + ys.join(', '));` },
      { name: "Clear Sort restores exact API order", sample: false,
        body: `await sleep(400); await flush();
await click(tid('sort-order')); await sleep(120); await flush();
await click(tid('clear-sort')); await sleep(120); await flush();
var ts = $$('[data-testid="movie-title"]').map(function (e) { return e.textContent; });
var exp = ['The Matrix','Spider-Man','Memento','Batman Begins','Cast Away','Iron Man','The Prestige','Superman Returns'];
assert(JSON.stringify(ts) === JSON.stringify(exp), 'Clear Sort must restore API order: ' + exp.join(', ') + ' — got: ' + ts.join(', '));` },
      { name: "Load More paginates and disappears on the last page", sample: false,
        body: `await sleep(400); await flush();
assert(tid('load-more'), 'Expected a "Load More" control (testID "load-more") when more pages exist');
await click(tid('load-more')); await sleep(400); await flush();
assert($$('[data-testid="movie-item"]').length === 16, 'After loading page 2 expected 16 movies, got ' + $$('[data-testid="movie-item"]').length);
await click(tid('load-more')); await sleep(400); await flush();
var ts = $$('[data-testid="movie-title"]').map(function (e) { return e.textContent; });
assert(ts.length === 24, 'After loading page 3 expected all 24 movies, got ' + ts.length);
assert(ts.indexOf('Dune') !== -1, 'Page 3 content (Dune) missing after pagination');
assert(!tid('load-more'), '"Load More" should disappear on the last page');` },
    ],
  },
  {
    slug: "react-employee-form",
    name: "React: Employee Validation Form",
    category: "React",
    type: "react",
    difficulty: "Medium",
    maxScore: 35,
    successRate: "58.93%",
    statement: `
<p>Another certification regular: a form whose <em>Submit</em> button stays disabled until every field is valid.</p>
<h3>Validation rules</h3>
<ul>
<li><strong>Name</strong> (<code>data-testid="name-input"</code>): at least 4 characters, letters and spaces only.</li>
<li><strong>Email</strong> (<code>data-testid="email-input"</code>): must look like <code>something@something.something</code>.</li>
<li><strong>Employee ID</strong> (<code>data-testid="id-input"</code>): exactly 6 digits.</li>
</ul>
<h3>Requirements</h3>
<ul>
<li>The <code>data-testid="submit-button"</code> button is <code>disabled</code> whenever any field is invalid (including the initial empty state).</li>
<li>It becomes enabled the moment all three fields are valid.</li>
</ul>`,
    starter: `function App() {
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [employeeId, setEmployeeId] = React.useState("");
    // TODO: control the inputs and compute validity.
    // Name: >= 4 chars, letters and spaces only.
    // Email: something@something.something
    // Employee ID: exactly 6 digits.

    return (
        <form>
            <input data-testid="name-input" placeholder="Name" />
            <input data-testid="email-input" placeholder="Email" />
            <input data-testid="id-input" placeholder="Employee ID" />
            <button data-testid="submit-button" type="submit">Submit</button>
        </form>
    );
}`,
    tests: [
      { name: "submit is disabled initially", sample: true,
        body: `assert(tid('submit-button').disabled === true, 'Submit should be disabled while the form is empty');` },
      { name: "enables when all fields are valid", sample: true,
        body: `setValue(tid('name-input'), 'Elizabeth Rose'); await flush();
setValue(tid('email-input'), 'liz@example.com'); await flush();
setValue(tid('id-input'), '123456'); await flush();
assert(tid('submit-button').disabled === false, 'Submit should be enabled when name/email/id are all valid');` },
      { name: "invalid email keeps it disabled", sample: false,
        body: `setValue(tid('name-input'), 'Elizabeth Rose'); await flush();
setValue(tid('email-input'), 'liz@example'); await flush();
setValue(tid('id-input'), '123456'); await flush();
assert(tid('submit-button').disabled === true, 'Email without a dot after @ is invalid — submit must stay disabled');` },
      { name: "employee id must be exactly 6 digits", sample: false,
        body: `setValue(tid('name-input'), 'Elizabeth Rose'); await flush();
setValue(tid('email-input'), 'liz@example.com'); await flush();
setValue(tid('id-input'), '12345'); await flush();
assert(tid('submit-button').disabled === true, '5-digit ID is invalid — submit must stay disabled');
setValue(tid('id-input'), '1234567'); await flush();
assert(tid('submit-button').disabled === true, '7-digit ID is invalid — submit must stay disabled');` },
      { name: "short name keeps it disabled", sample: false,
        body: `setValue(tid('name-input'), 'Liz'); await flush();
setValue(tid('email-input'), 'liz@example.com'); await flush();
setValue(tid('id-input'), '123456'); await flush();
assert(tid('submit-button').disabled === true, 'Name under 4 characters is invalid — submit must stay disabled');` },
    ],
  },
  {
    slug: "react-slideshow",
    name: "React: Slideshow App",
    category: "React",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "66.35%",
    statement: `
<p>Build a slideshow over a fixed array of slides with <em>Restart</em>, <em>Prev</em>, and <em>Next</em> controls.</p>
<h3>Requirements</h3>
<ul>
<li>The current slide's title renders in <code>data-testid="slide-title"</code> and its text in <code>data-testid="slide-text"</code>. Start on the first slide.</li>
<li><code>data-testid="next"</code> advances one slide; <code>data-testid="prev"</code> goes back one; <code>data-testid="restart"</code> jumps to the first slide.</li>
<li><strong>Prev and Restart are disabled on the first slide. Next is disabled on the last slide.</strong></li>
</ul>
<p>The <code>SLIDES</code> array is provided — do not change it.</p>`,
    starter: `const SLIDES = [
    { title: "Welcome", text: "This is the first slide of the deck." },
    { title: "Practice", text: "Reps build confidence for the real assessment." },
    { title: "Good Luck", text: "You are ready. Go get it." },
];

function App() {
    const [index, setIndex] = React.useState(0);
    // TODO: wire up the buttons and their disabled states

    return (
        <div>
            <div>
                <button data-testid="restart">Restart</button>
                <button data-testid="prev">Prev</button>
                <button data-testid="next">Next</button>
            </div>
            <h1 data-testid="slide-title">{SLIDES[index].title}</h1>
            <p data-testid="slide-text">{SLIDES[index].text}</p>
        </div>
    );
}`,
    tests: [
      { name: "starts on the first slide with prev/restart disabled", sample: true,
        body: `assert(tid('slide-title').textContent.trim() === 'Welcome', 'Expected first slide "Welcome", got "' + tid('slide-title').textContent.trim() + '"');
assert(tid('prev').disabled === true, 'Prev must be disabled on the first slide');
assert(tid('restart').disabled === true, 'Restart must be disabled on the first slide');
assert(tid('next').disabled === false, 'Next must be enabled on the first slide');` },
      { name: "next advances and enables prev", sample: true,
        body: `click(tid('next')); await flush();
assert(tid('slide-title').textContent.trim() === 'Practice', 'Expected second slide "Practice", got "' + tid('slide-title').textContent.trim() + '"');
assert(tid('prev').disabled === false, 'Prev should be enabled after moving forward');` },
      { name: "next is disabled on the last slide", sample: false,
        body: `click(tid('next')); await flush(); click(tid('next')); await flush();
assert(tid('slide-title').textContent.trim() === 'Good Luck', 'Expected last slide "Good Luck", got "' + tid('slide-title').textContent.trim() + '"');
assert(tid('next').disabled === true, 'Next must be disabled on the last slide');` },
      { name: "restart returns to the first slide", sample: false,
        body: `click(tid('next')); await flush(); click(tid('next')); await flush();
click(tid('restart')); await flush();
assert(tid('slide-title').textContent.trim() === 'Welcome', 'Restart should return to "Welcome"');
assert(tid('prev').disabled === true, 'Prev must be disabled again after restart');` },
    ],
  },
  {
    slug: "react-word-omitter",
    name: "React: Word Omitter",
    category: "React",
    type: "react",
    difficulty: "Medium",
    maxScore: 25,
    successRate: "62.80%",
    statement: `
<p>Type a phrase; the app echoes it back with common filler words removed — unless omission is toggled off.</p>
<p>The filler words are: <code>a</code>, <code>an</code>, <code>the</code>, <code>and</code>, <code>or</code>, <code>but</code> (case-insensitive, matched as whole words).</p>
<h3>Requirements</h3>
<ul>
<li>The input has <code>data-testid="input-box"</code>; the processed output renders in <code>data-testid="output-text"</code>.</li>
<li>While omission is ON (the default), the output shows the input with filler words removed and single spaces between the remaining words.</li>
<li>The <code>data-testid="toggle-button"</code> button toggles omission. Its label reads <code>Show All Words</code> while omission is ON and <code>Omit Words</code> while OFF.</li>
<li>While omission is OFF, the output shows the raw input unchanged.</li>
</ul>`,
    starter: `const OMITTED_WORDS = ["a", "an", "the", "and", "or", "but"];

function App() {
    const [text, setText] = React.useState("");
    const [omit, setOmit] = React.useState(true);
    // TODO: control the input, toggle omission, compute the output

    return (
        <div>
            <input data-testid="input-box" placeholder="Type here..." />
            <button data-testid="toggle-button">Show All Words</button>
            <p data-testid="output-text"></p>
        </div>
    );
}`,
    tests: [
      { name: "omits filler words by default", sample: true,
        body: `setValue(tid('input-box'), 'the quick brown fox and a lazy dog'); await flush();
assert(tid('output-text').textContent.trim() === 'quick brown fox lazy dog', 'Expected "quick brown fox lazy dog", got "' + tid('output-text').textContent.trim() + '"');` },
      { name: "toggle shows the raw text", sample: true,
        body: `setValue(tid('input-box'), 'the quick brown fox'); await flush();
click(tid('toggle-button')); await flush();
assert(tid('output-text').textContent.trim() === 'the quick brown fox', 'With omission off, output should be the raw input');
assert(tid('toggle-button').textContent.trim() === 'Omit Words', 'Button label should read "Omit Words" while omission is off');` },
      { name: "matching is case-insensitive, whole-word only", sample: false,
        body: `setValue(tid('input-box'), 'The theme AND another band'); await flush();
assert(tid('output-text').textContent.trim() === 'theme another band', 'Expected "theme another band" (remove The/AND, keep theme/another/band), got "' + tid('output-text').textContent.trim() + '"');` },
      { name: "toggling back re-omits", sample: false,
        body: `setValue(tid('input-box'), 'a b or c'); await flush();
click(tid('toggle-button')); await flush(); click(tid('toggle-button')); await flush();
assert(tid('output-text').textContent.trim() === 'b c', 'Expected "b c" after toggling omission back on, got "' + tid('output-text').textContent.trim() + '"');
assert(tid('toggle-button').textContent.trim() === 'Show All Words', 'Button label should read "Show All Words" while omission is on');` },
    ],
  },

  /* ============================ CSS ============================ */
  {
    slug: "css-center-the-card",
    name: "CSS: Center the Card",
    category: "CSS",
    type: "css",
    difficulty: "Easy",
    maxScore: 15,
    successRate: "88.40%",
    statement: `
<p>The interview evergreen: center a box inside its container — <strong>both horizontally and vertically</strong>. Flexbox, Grid, or absolute positioning all pass; the grader checks geometry, not your method.</p>
<h3>Fixed HTML (do not edit)</h3>
<pre>&lt;div class="container"&gt;
  &lt;div class="card"&gt;Centered&lt;/div&gt;
&lt;/div&gt;</pre>
<p>The container is 300×300px and the card is 120×80px (already styled). Write CSS so the card sits in the exact center of the container.</p>`,
    baseCss: `.container { width: 300px; height: 300px; background: #eef2f4; border: 1px solid #d3d9dd; }
.card { width: 120px; height: 80px; background: #1ba94c; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; border-radius: 4px; }`,
    html: `<div class="container"><div class="card">Centered</div></div>`,
    starter: `/* The HTML is fixed — write CSS only. */

.container {
    /* center .card horizontally and vertically */

}
`,
    tests: [
      { name: "card is horizontally centered", sample: true,
        body: `var c = rect('.container'), k = rect('.card');
var dx = Math.abs((k.left + k.right) / 2 - (c.left + c.right) / 2);
assert(dx < 3, 'Card center is ' + dx.toFixed(1) + 'px off horizontally');` },
      { name: "card is vertically centered", sample: true,
        body: `var c = rect('.container'), k = rect('.card');
var dy = Math.abs((k.top + k.bottom) / 2 - (c.top + c.bottom) / 2);
assert(dy < 3, 'Card center is ' + dy.toFixed(1) + 'px off vertically');` },
      { name: "card stays inside the container", sample: false,
        body: `var c = rect('.container'), k = rect('.card');
assert(k.top >= c.top - 1 && k.bottom <= c.bottom + 1 && k.left >= c.left - 1 && k.right <= c.right + 1, 'Card overflows its container');` },
    ],
  },
  {
    slug: "css-three-column-grid",
    name: "CSS: Three-Column Grid",
    category: "CSS",
    type: "css",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "81.75%",
    statement: `
<p>Lay out six tiles as a responsive-style grid: <strong>3 equal columns</strong> with a <strong>16px gap</strong> between columns and rows.</p>
<h3>Fixed HTML (do not edit)</h3>
<pre>&lt;div class="grid"&gt;
  &lt;div class="item"&gt;1&lt;/div&gt;
  ... six items total ...
&lt;/div&gt;</pre>
<p>The grid wrapper is 632px wide and each item is 60px tall (already styled). CSS Grid is the intended tool (<code>display: grid</code> + <code>grid-template-columns</code> + <code>gap</code>), but any technique producing the same geometry passes.</p>`,
    baseCss: `.grid { width: 632px; }
.item { height: 60px; background: #3a4a5c; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-size: 18px; }`,
    html: `<div class="grid"><div class="item">1</div><div class="item">2</div><div class="item">3</div><div class="item">4</div><div class="item">5</div><div class="item">6</div></div>`,
    starter: `/* The HTML is fixed — write CSS only. */

.grid {
    /* 3 equal columns, 16px gap between rows and columns */

}
`,
    tests: [
      { name: "items 1–3 share the first row, 4–6 wrap to the second", sample: true,
        body: `var r = $$('.item').map(function (el) { return el.getBoundingClientRect(); });
assert(r.length === 6, 'Expected 6 items');
assert(Math.abs(r[0].top - r[1].top) < 1 && Math.abs(r[1].top - r[2].top) < 1, 'Items 1-3 should be on one row');
assert(r[3].top > r[0].bottom - 1, 'Item 4 should start a second row');
assert(Math.abs(r[3].left - r[0].left) < 1, 'Item 4 should align under item 1');` },
      { name: "three equal-width columns", sample: true,
        body: `var r = $$('.item').map(function (el) { return el.getBoundingClientRect(); });
assert(Math.abs(r[0].width - r[1].width) < 1 && Math.abs(r[1].width - r[2].width) < 1, 'Columns are not equal width: ' + r.slice(0,3).map(function(x){return x.width.toFixed(1);}).join(', '));
assert(r[0].left < r[1].left && r[1].left < r[2].left, 'Items 1-3 should sit left-to-right');` },
      { name: "16px column gap", sample: false,
        body: `var r = $$('.item').map(function (el) { return el.getBoundingClientRect(); });
var gap = r[1].left - r[0].right;
assert(Math.abs(gap - 16) < 1.5, 'Column gap is ' + gap.toFixed(1) + 'px, expected 16px');` },
      { name: "16px row gap", sample: false,
        body: `var r = $$('.item').map(function (el) { return el.getBoundingClientRect(); });
var gap = r[3].top - r[0].bottom;
assert(Math.abs(gap - 16) < 1.5, 'Row gap is ' + gap.toFixed(1) + 'px, expected 16px');` },
    ],
  },
  {
    slug: "css-notification-badge",
    name: "CSS: Notification Badge",
    category: "CSS",
    type: "css",
    difficulty: "Medium",
    maxScore: 25,
    successRate: "73.51%",
    statement: `
<p>Pin a red notification badge to the <strong>top-right corner</strong> of an avatar — the classic <code>position: relative</code> wrapper + <code>position: absolute</code> child exercise.</p>
<h3>Fixed HTML (do not edit)</h3>
<pre>&lt;div class="avatar-wrap"&gt;
  &lt;div class="avatar"&gt;&lt;/div&gt;
  &lt;span class="badge"&gt;3&lt;/span&gt;
&lt;/div&gt;</pre>
<p>The avatar is an 80×80px circle and the badge is a 24×24px chip (colors and sizes already styled). Position the badge so its center sits on the avatar's top-right corner, overlapping the avatar without pushing the layout around, and make the badge circular.</p>`,
    baseCss: `body { padding: 40px; }
.avatar-wrap { width: 80px; }
.avatar { width: 80px; height: 80px; background: #576871; border-radius: 50%; }
.badge { width: 24px; height: 24px; background: #d13d3b; color: #fff; font-family: sans-serif; font-size: 13px; display: flex; align-items: center; justify-content: center; }`,
    html: `<div class="avatar-wrap"><div class="avatar"></div><span class="badge">3</span></div>`,
    starter: `/* The HTML is fixed — write CSS only. */

.avatar-wrap {

}

.badge {
    /* pin to the avatar's top-right corner; make it circular */

}
`,
    tests: [
      { name: "badge sits on the avatar's top-right corner", sample: true,
        body: `var a = rect('.avatar'), b = rect('.badge');
var bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2;
var dist = Math.sqrt(Math.pow(bx - a.right, 2) + Math.pow(by - a.top, 2));
assert(dist < 16, 'Badge center is ' + dist.toFixed(1) + 'px from the avatar top-right corner (needs < 16px)');` },
      { name: "badge overlaps without stretching the layout", sample: true,
        body: `var w = rect('.avatar-wrap');
assert(w.height < 100, 'Wrapper height is ' + w.height.toFixed(0) + 'px — the badge is pushing the layout instead of overlapping (use absolute positioning)');` },
      { name: "badge is circular", sample: false,
        body: `var br = parseFloat(cs('.badge').borderTopLeftRadius);
assert(br >= 10, 'Badge border-radius computes to ' + br + 'px — expected a circle (radius >= 50% of a 24px chip)');` },
    ],
  },
  {
    slug: "react-articles-sort",
    name: "React: Sorting Articles",
    category: "React",
    type: "react",
    difficulty: "Hard",
    maxScore: 40,
    successRate: "61.27%",
    statement: `
<p>A real HackerRank React certification question: render a list of articles that can be re-sorted by two buttons.</p>
<h3>Requirements</h3>
<ul>
<li>Use the provided <code>ARTICLES</code> array as the data source (do not change it).</li>
<li>Render each article's <strong>title</strong> as an <code>&lt;li&gt;</code> inside the <code>data-testid="articles-list"</code> list.</li>
<li>On initial render, articles are sorted by <strong>upvotes, descending</strong>.</li>
<li>Clicking <code>data-testid="most-recent-link"</code> re-sorts by <strong>date, most recent first</strong>.</li>
<li>Clicking <code>data-testid="most-upvoted-link"</code> re-sorts by upvotes descending again.</li>
<li>All 5 articles are always visible — sorting never filters.</li>
</ul>`,
    starter: `const ARTICLES = [
    { title: "A message to our customers", upvotes: 12, date: "2019-11-13" },
    { title: "Alphabet earnings", upvotes: 22, date: "2019-11-02" },
    { title: "Artificial intelligence", upvotes: 20, date: "2019-11-06" },
    { title: "Elon Musk", upvotes: 30, date: "2019-11-22" },
    { title: "Search engine", upvotes: 6, date: "2019-11-19" },
];

function App() {
    // TODO: hold the sort mode in state; sort a copy of ARTICLES, never mutate it

    return (
        <div>
            <button data-testid="most-upvoted-link">Most Upvoted</button>
            <button data-testid="most-recent-link">Most Recent</button>
            <ul data-testid="articles-list">
            </ul>
        </div>
    );
}`,
    tests: [
      { name: "initially sorted by upvotes (descending)", sample: true,
        body: `var items = Array.prototype.map.call(tid('articles-list').children, function(li){ return li.textContent; });
assert(items.length === 5, 'Expected 5 articles, got ' + items.length);
var want = ['Elon Musk', 'Alphabet earnings', 'Artificial intelligence', 'A message to our customers', 'Search engine'];
for (var i = 0; i < 5; i++) assert(items[i].indexOf(want[i]) !== -1, 'Position ' + (i+1) + ': expected "' + want[i] + '", got "' + items[i] + '"');` },
      { name: "Most Recent sorts by date, newest first", sample: true,
        body: `await click(tid('most-recent-link')); await flush();
var items = Array.prototype.map.call(tid('articles-list').children, function(li){ return li.textContent; });
var want = ['Elon Musk', 'Search engine', 'A message to our customers', 'Artificial intelligence', 'Alphabet earnings'];
for (var i = 0; i < 5; i++) assert(items[i].indexOf(want[i]) !== -1, 'Position ' + (i+1) + ': expected "' + want[i] + '", got "' + items[i] + '"');` },
      { name: "Most Upvoted restores upvote order after Most Recent", sample: false,
        body: `await click(tid('most-recent-link')); await flush();
await click(tid('most-upvoted-link')); await flush();
var items = Array.prototype.map.call(tid('articles-list').children, function(li){ return li.textContent; });
var want = ['Elon Musk', 'Alphabet earnings', 'Artificial intelligence', 'A message to our customers', 'Search engine'];
for (var i = 0; i < 5; i++) assert(items[i].indexOf(want[i]) !== -1, 'Position ' + (i+1) + ': expected "' + want[i] + '", got "' + items[i] + '"');` },
      { name: "sorting never drops articles", sample: false,
        body: `await click(tid('most-recent-link')); await flush();
assert(tid('articles-list').children.length === 5, 'After sorting expected 5 articles, got ' + tid('articles-list').children.length);
await click(tid('most-upvoted-link')); await flush();
assert(tid('articles-list').children.length === 5, 'After sorting back expected 5 articles, got ' + tid('articles-list').children.length);` },
    ],
  },
  {
    slug: "react-tic-tac-toe",
    name: "React: Tic-Tac-Toe",
    category: "React",
    type: "react",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "47.85%",
    statement: `
<p>The classic React interview build: a fully working tic-tac-toe game with win and draw detection.</p>
<h3>Requirements</h3>
<ul>
<li>Nine cell buttons with <code>data-testid="cell-0"</code> … <code>data-testid="cell-8"</code> (row-major: 0–2 top row).</li>
<li>A status element <code>data-testid="status"</code>. It reads <code>Next player: X</code> at start, then <code>Next player: O</code>, etc.</li>
<li><strong>X moves first.</strong> Clicking an empty cell places the current player's mark and flips the turn.</li>
<li>Clicking an already-filled cell does nothing.</li>
<li>When a player gets three in a row (row, column, or diagonal), status shows <code>Winner: X</code> (or <code>Winner: O</code>) and further cell clicks are ignored.</li>
<li>If all 9 cells fill with no winner, status shows <code>Draw</code>.</li>
<li>A <code>data-testid="reset"</code> button clears the board and returns status to <code>Next player: X</code>.</li>
</ul>`,
    starter: `function App() {
    const [board, setBoard] = React.useState(Array(9).fill(null));
    const [xIsNext, setXIsNext] = React.useState(true);
    // TODO: implement handleClick(i), winner detection, draw detection, reset

    const status = "Next player: X";

    return (
        <div>
            <div data-testid="status">{status}</div>
            <div>
                {board.map((cell, i) => (
                    <button key={i} data-testid={"cell-" + i}>
                        {cell}
                    </button>
                ))}
            </div>
            <button data-testid="reset">Reset</button>
        </div>
    );
}`,
    tests: [
      { name: "starts empty with X to move", sample: true,
        body: `assert(tid('status').textContent.trim() === 'Next player: X', 'Expected "Next player: X", got "' + tid('status').textContent.trim() + '"');
for (var i = 0; i < 9; i++) assert(tid('cell-' + i).textContent.trim() === '', 'Cell ' + i + ' should start empty');` },
      { name: "places marks and alternates turns", sample: true,
        body: `await click(tid('cell-0')); await flush();
assert(tid('cell-0').textContent.trim() === 'X', 'First move should place X, got "' + tid('cell-0').textContent.trim() + '"');
assert(tid('status').textContent.trim() === 'Next player: O', 'After X moves, expected "Next player: O"');
await click(tid('cell-1')); await flush();
assert(tid('cell-1').textContent.trim() === 'O', 'Second move should place O, got "' + tid('cell-1').textContent.trim() + '"');
assert(tid('status').textContent.trim() === 'Next player: X', 'After O moves, expected "Next player: X"');` },
      { name: "clicking a filled cell is ignored", sample: false,
        body: `await click(tid('cell-4')); await flush();
await click(tid('cell-4')); await flush();
assert(tid('cell-4').textContent.trim() === 'X', 'Cell should still be X after clicking it twice');
assert(tid('status').textContent.trim() === 'Next player: O', 'Turn must not flip when the click is ignored');` },
      { name: "detects a win and freezes the board", sample: true,
        body: `var seq = [0, 3, 1, 4, 2];
for (var i = 0; i < seq.length; i++) { await click(tid('cell-' + seq[i])); await flush(); }
assert(tid('status').textContent.trim() === 'Winner: X', 'X took the top row — expected "Winner: X", got "' + tid('status').textContent.trim() + '"');
await click(tid('cell-8')); await flush();
assert(tid('cell-8').textContent.trim() === '', 'Clicks after the game ends must be ignored');` },
      { name: "detects a draw", sample: false,
        body: `var seq = [0, 1, 2, 4, 3, 5, 7, 6, 8];
for (var i = 0; i < seq.length; i++) { await click(tid('cell-' + seq[i])); await flush(); }
assert(tid('status').textContent.trim() === 'Draw', 'Full board with no winner — expected "Draw", got "' + tid('status').textContent.trim() + '"');` },
      { name: "reset clears the board mid-game", sample: false,
        body: `await click(tid('cell-0')); await flush();
await click(tid('cell-4')); await flush();
await click(tid('reset')); await flush();
assert(tid('status').textContent.trim() === 'Next player: X', 'After reset expected "Next player: X"');
for (var i = 0; i < 9; i++) assert(tid('cell-' + i).textContent.trim() === '', 'Cell ' + i + ' should be empty after reset');` },
    ],
  },
  {
    slug: "react-shopping-cart",
    name: "React: Shopping Cart",
    category: "React",
    type: "react",
    difficulty: "Hard",
    maxScore: 45,
    successRate: "52.90%",
    statement: `
<p>Build a shopping cart with quantity management and a live total — a staple of senior frontend screens.</p>
<h3>Requirements</h3>
<ul>
<li>Use the provided <code>PRODUCTS</code> array. Each product renders an add button <code>data-testid="add-keyboard"</code> etc. (add-&lt;id&gt;).</li>
<li>Adding a product not in the cart creates a cart row <code>data-testid="cart-item-&lt;id&gt;"</code> with quantity 1; adding it again increments the quantity instead of duplicating the row.</li>
<li>Each cart row shows its quantity in <code>data-testid="qty-&lt;id&gt;"</code> and has <code>data-testid="inc-&lt;id&gt;"</code> / <code>data-testid="dec-&lt;id&gt;"</code> buttons.</li>
<li>Decrementing at quantity 1 <strong>removes the row entirely</strong>.</li>
<li><code>data-testid="cart-total"</code> always shows the total as <code>$X.XX</code> (two decimals). Empty cart shows <code>$0.00</code>.</li>
</ul>`,
    starter: `const PRODUCTS = [
    { id: "keyboard", name: "Keyboard", price: 50 },
    { id: "mouse", name: "Mouse", price: 25 },
    { id: "monitor", name: "Monitor", price: 150 },
];

function App() {
    const [cart, setCart] = React.useState([]); // e.g. [{ id, qty }]
    // TODO: addToCart, increment, decrement (remove at qty 1), total

    return (
        <div>
            <div>
                {PRODUCTS.map(p => (
                    <button key={p.id} data-testid={"add-" + p.id}>
                        Add {p.name} ({"$" + p.price})
                    </button>
                ))}
            </div>
            <ul>
                {cart.map(item => (
                    <li key={item.id} data-testid={"cart-item-" + item.id}>
                        {item.id} × <span data-testid={"qty-" + item.id}>{item.qty}</span>
                        <button data-testid={"inc-" + item.id}>+</button>
                        <button data-testid={"dec-" + item.id}>-</button>
                    </li>
                ))}
            </ul>
            <div data-testid="cart-total">$0.00</div>
        </div>
    );
}`,
    tests: [
      { name: "empty cart shows $0.00", sample: true,
        body: `assert(tid('cart-total').textContent.trim() === '$0.00', 'Expected "$0.00", got "' + tid('cart-total').textContent.trim() + '"');
assert(!tid('cart-item-keyboard'), 'Cart should start with no rows');` },
      { name: "adding twice merges into one row with qty 2", sample: true,
        body: `await click(tid('add-keyboard')); await flush();
await click(tid('add-keyboard')); await flush();
assert(tid('cart-item-keyboard'), 'Expected a cart row for the keyboard');
assert(tid('qty-keyboard').textContent.trim() === '2', 'Expected qty 2, got "' + tid('qty-keyboard').textContent.trim() + '"');
assert(tid('cart-total').textContent.trim() === '$100.00', 'Two $50 keyboards — expected "$100.00", got "' + tid('cart-total').textContent.trim() + '"');` },
      { name: "total sums across products", sample: false,
        body: `await click(tid('add-keyboard')); await flush();
await click(tid('add-mouse')); await flush();
await click(tid('add-monitor')); await flush();
assert(tid('cart-total').textContent.trim() === '$225.00', '$50 + $25 + $150 — expected "$225.00", got "' + tid('cart-total').textContent.trim() + '"');` },
      { name: "decrement at qty 1 removes the row", sample: true,
        body: `await click(tid('add-keyboard')); await flush();
await click(tid('add-mouse')); await flush();
await click(tid('dec-keyboard')); await flush();
assert(!tid('cart-item-keyboard'), 'Decrementing qty 1 should remove the keyboard row');
assert(tid('cart-total').textContent.trim() === '$25.00', 'Only the $25 mouse remains — expected "$25.00", got "' + tid('cart-total').textContent.trim() + '"');` },
      { name: "increment button raises qty and total", sample: false,
        body: `await click(tid('add-mouse')); await flush();
await click(tid('inc-mouse')); await flush();
assert(tid('qty-mouse').textContent.trim() === '2', 'Expected qty 2 after increment, got "' + tid('qty-mouse').textContent.trim() + '"');
assert(tid('cart-total').textContent.trim() === '$50.00', 'Two $25 mice — expected "$50.00", got "' + tid('cart-total').textContent.trim() + '"');` },
    ],
  },
  /* ============================ CSS ============================ */
  {
    slug: "css-holy-grail",
    name: "CSS: Holy Grail Layout",
    category: "CSS",
    type: "css",
    difficulty: "Hard",
    maxScore: 35,
    successRate: "49.66%",
    statement: `
<p>Build the classic <em>holy grail</em> layout inside a fixed 600×400 frame: header on top, footer on the bottom, and a middle band split into nav / main / aside.</p>
<h3>Fixed HTML (do not edit)</h3>
<pre>&lt;div class="layout"&gt;
  &lt;header class="hg-header"&gt;Header&lt;/header&gt;
  &lt;div class="hg-middle"&gt;
    &lt;nav class="hg-nav"&gt;Nav&lt;/nav&gt;
    &lt;main class="hg-main"&gt;Main&lt;/main&gt;
    &lt;aside class="hg-aside"&gt;Aside&lt;/aside&gt;
  &lt;/div&gt;
  &lt;footer class="hg-footer"&gt;Footer&lt;/footer&gt;
&lt;/div&gt;</pre>
<h3>Requirements</h3>
<ul>
<li>The header is <strong>60px tall</strong> and spans the full 600px width at the top.</li>
<li>The footer is <strong>50px tall</strong> and spans the full width at the bottom of the frame.</li>
<li>In the middle band: nav is <strong>150px wide</strong> on the left, aside is <strong>120px wide</strong> on the right, and main fills all remaining width between them.</li>
<li>The middle band fills all vertical space between header and footer (≈290px).</li>
</ul>
<p><strong>Hint:</strong> a column flex container on <code>.layout</code>, a row flex on <code>.hg-middle</code> with <code>flex: 1</code>.</p>`,
    baseCss: `body { margin: 0; font-family: sans-serif; }
.layout { width: 600px; height: 400px; }
.hg-header { background: #3a4a5c; color: #fff; }
.hg-footer { background: #21242c; color: #fff; }
.hg-nav { background: #d3d9dd; }
.hg-aside { background: #d3d9dd; }
.hg-main { background: #f3f7f7; }`,
    html: `<div class="layout"><header class="hg-header">Header</header><div class="hg-middle"><nav class="hg-nav">Nav</nav><main class="hg-main">Main</main><aside class="hg-aside">Aside</aside></div><footer class="hg-footer">Footer</footer></div>`,
    starter: `/* The HTML is fixed — write CSS only. */

.layout {

}

.hg-header {

}

.hg-middle {

}

.hg-nav {

}

.hg-main {

}

.hg-aside {

}

.hg-footer {

}
`,
    tests: [
      { name: "header spans the top at 60px tall", sample: true,
        body: `var h = rect('.hg-header'), l = rect('.layout');
assert(Math.abs(h.height - 60) < 2, 'Header height is ' + h.height.toFixed(0) + 'px (expected 60px)');
assert(Math.abs(h.width - 600) < 3, 'Header width is ' + h.width.toFixed(0) + 'px (expected full 600px)');
assert(Math.abs(h.top - l.top) < 2, 'Header must sit at the top of the frame');` },
      { name: "footer spans the bottom at 50px tall", sample: true,
        body: `var f = rect('.hg-footer'), l = rect('.layout');
assert(Math.abs(f.height - 50) < 2, 'Footer height is ' + f.height.toFixed(0) + 'px (expected 50px)');
assert(Math.abs(f.width - 600) < 3, 'Footer width is ' + f.width.toFixed(0) + 'px (expected full 600px)');
assert(Math.abs(f.bottom - l.bottom) < 2, 'Footer bottom is ' + (l.bottom - f.bottom).toFixed(0) + 'px above the frame bottom (must sit flush)');` },
      { name: "nav 150px left, aside 120px right", sample: true,
        body: `var n = rect('.hg-nav'), a = rect('.hg-aside'), l = rect('.layout');
assert(Math.abs(n.width - 150) < 2, 'Nav width is ' + n.width.toFixed(0) + 'px (expected 150px)');
assert(Math.abs(n.left - l.left) < 2, 'Nav must touch the left edge');
assert(Math.abs(a.width - 120) < 2, 'Aside width is ' + a.width.toFixed(0) + 'px (expected 120px)');
assert(Math.abs(a.right - l.right) < 2, 'Aside must touch the right edge');` },
      { name: "main fills the space between nav and aside", sample: false,
        body: `var m = rect('.hg-main'), n = rect('.hg-nav'), a = rect('.hg-aside');
assert(Math.abs(m.left - n.right) < 2, 'Main must start where nav ends');
assert(Math.abs(m.right - a.left) < 2, 'Main must end where aside starts');
assert(Math.abs(m.width - 330) < 4, 'Main width is ' + m.width.toFixed(0) + 'px (expected ~330px = 600 − 150 − 120)');` },
      { name: "middle band fills the height between header and footer", sample: false,
        body: `var m = rect('.hg-middle'), h = rect('.hg-header'), f = rect('.hg-footer');
assert(Math.abs(m.top - h.bottom) < 2, 'Middle band must start under the header');
assert(Math.abs(m.bottom - f.top) < 2, 'Middle band must end at the footer');
assert(Math.abs(m.height - 290) < 4, 'Middle height is ' + m.height.toFixed(0) + 'px (expected ~290px = 400 − 60 − 50)');` },
    ],
  },
  {
    slug: "css-modal-overlay",
    name: "CSS: Modal Overlay",
    category: "CSS",
    type: "css",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "63.41%",
    statement: `
<p>Style a modal: a semi-transparent overlay that covers the whole stage, with the dialog perfectly centered inside it.</p>
<h3>Fixed HTML (do not edit)</h3>
<pre>&lt;div class="stage"&gt;
  &lt;div class="overlay"&gt;
    &lt;div class="dialog"&gt;Are you sure?&lt;/div&gt;
  &lt;/div&gt;
&lt;/div&gt;</pre>
<p>The stage is a 600×400 frame (<code>position: relative</code> already set) and the dialog is a fixed 300×160 card (already styled). Your CSS must:</p>
<ul>
<li>Make the overlay cover the <strong>entire stage</strong> (all four edges).</li>
<li>Give the overlay a semi-transparent dark background — visibly dimmed but see-through (alpha between 0.2 and 0.8).</li>
<li>Center the dialog <strong>horizontally and vertically</strong> within the overlay.</li>
</ul>`,
    baseCss: `body { margin: 0; font-family: sans-serif; }
.stage { width: 600px; height: 400px; position: relative; background: #f3f7f7; }
.dialog { width: 300px; height: 160px; background: #fff; border-radius: 6px; box-shadow: 0 8px 30px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; }`,
    html: `<div class="stage"><div class="overlay"><div class="dialog">Are you sure?</div></div></div>`,
    starter: `/* The HTML is fixed — write CSS only. */

.overlay {
    /* cover the stage; dim it; center the dialog */

}
`,
    tests: [
      { name: "overlay covers the whole stage", sample: true,
        body: `var o = rect('.overlay'), s = rect('.stage');
assert(Math.abs(o.left - s.left) < 2 && Math.abs(o.right - s.right) < 2 && Math.abs(o.top - s.top) < 2 && Math.abs(o.bottom - s.bottom) < 2,
  'Overlay is ' + o.width.toFixed(0) + '×' + o.height.toFixed(0) + ' — it must cover the full 600×400 stage edge to edge');` },
      { name: "overlay dims but stays see-through", sample: true,
        body: `var bg = cs('.overlay').backgroundColor;
var m = bg.match(/rgba?\\(([^)]+)\\)/);
assert(m, 'Overlay background computes to "' + bg + '" — set a background-color');
var parts = m[1].split(',').map(parseFloat);
var alpha = parts.length === 4 ? parts[3] : 1;
assert(alpha >= 0.2 && alpha <= 0.8, 'Overlay alpha is ' + alpha + ' — needs semi-transparency between 0.2 and 0.8 (e.g. rgba(0,0,0,0.5))');` },
      { name: "dialog is centered in the overlay", sample: false,
        body: `var d = rect('.dialog'), s = rect('.stage');
var dx = Math.abs((d.left + d.right) / 2 - (s.left + s.right) / 2);
var dy = Math.abs((d.top + d.bottom) / 2 - (s.top + s.bottom) / 2);
assert(dx < 3, 'Dialog is ' + dx.toFixed(1) + 'px off horizontal center');
assert(dy < 3, 'Dialog is ' + dy.toFixed(1) + 'px off vertical center');` },
    ],
  },
];
