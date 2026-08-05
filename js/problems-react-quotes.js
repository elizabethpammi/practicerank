/* PracticeRank — sample problem for the React Output panel (js/react-output.js).
   Pushed onto FRONTEND_PROBLEMS so app.js picks it up with no changes.
   `panel: "react-output"` + `suite` opt this problem into the new Output
   panel; problems without that flag keep the stock preview + assert() path.
   The suite is Jest-style source compiled by Babel inside the sandbox with
   render / screen / fireEvent / expect / describe / it in scope. */
(function () {
  "use strict";
  window.FRONTEND_PROBLEMS = window.FRONTEND_PROBLEMS || [];
  window.FRONTEND_PROBLEMS.push({
    slug: "react-quotes-app",
    name: "React: Quotes App",
    category: "React",
    type: "react",
    panel: "react-output",
    difficulty: "Easy",
    sub: "Output Panel",
    maxScore: 10,
    successRate: "91.42%",
    statement:
      "<p>Build a <b>Quotes App</b> that cycles through a fixed list of five quotes. The component is rendered with <code>&lt;App /&gt;</code> and must behave as follows:</p>" +
      "<ul>" +
      "<li>The current quote's text is shown in an element with <code>data-testid=\"quote-text\"</code> and its author in <code>data-testid=\"quote-author\"</code>.</li>" +
      "<li>A position indicator with <code>data-testid=\"quote-index\"</code> shows the 1-based position, e.g. <code>1 / 5</code>.</li>" +
      "<li>Clicking the button with <code>data-testid=\"btn-next\"</code> advances to the next quote; from the last quote it wraps back to the first.</li>" +
      "<li>Clicking the button with <code>data-testid=\"btn-prev\"</code> goes to the previous quote; from the first quote it wraps to the last.</li>" +
      "</ul>" +
      "<p>Use the <b>Output</b> panel on the right: the <b>Preview</b> tab renders your component live, and the <b>Tests</b> tab runs the suite below. Console output from both lands in the Console at the bottom.</p>",
    starter:
      'const QUOTES = [\n' +
      '  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },\n' +
      '  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },\n' +
      '  { text: "Programs must be written for people to read.", author: "Harold Abelson" },\n' +
      '  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },\n' +
      '  { text: "Perfection is achieved when there is nothing left to take away.", author: "Antoine de Saint-Exupery" },\n' +
      '];\n' +
      '\n' +
      'function App() {\n' +
      '  const [index, setIndex] = React.useState(0);\n' +
      '  const quote = QUOTES[index];\n' +
      '  const next = () => setIndex((index + 1) % QUOTES.length);\n' +
      '  const prev = () => setIndex((index - 1 + QUOTES.length) % QUOTES.length);\n' +
      '  return (\n' +
      '    <div className="quotes-app">\n' +
      '      <h1>Quotes</h1>\n' +
      '      <blockquote data-testid="quote-text">{quote.text}</blockquote>\n' +
      '      <p data-testid="quote-author">— {quote.author}</p>\n' +
      '      <p data-testid="quote-index">{index + 1} / {QUOTES.length}</p>\n' +
      '      <button data-testid="btn-prev" onClick={prev}>Previous</button>\n' +
      '      <button data-testid="btn-next" onClick={next}>Next Quote</button>\n' +
      '    </div>\n' +
      '  );\n' +
      '}\n',
    suite:
      'describe("Quotes App", () => {\n' +
      '  it("renders the first quote on load", () => {\n' +
      '    render(<App />);\n' +
      '    expect(screen.getByTestId("quote-text")).toHaveTextContent("Stay hungry, stay foolish.");\n' +
      '    expect(screen.getByTestId("quote-author")).toHaveTextContent("Steve Jobs");\n' +
      '  });\n' +
      '  it("shows the position indicator as 1 / 5", () => {\n' +
      '    render(<App />);\n' +
      '    expect(screen.getByTestId("quote-index")).toHaveTextContent("1 / 5");\n' +
      '  });\n' +
      '  it("advances to the next quote when Next is clicked", () => {\n' +
      '    render(<App />);\n' +
      '    fireEvent.click(screen.getByTestId("btn-next"));\n' +
      '    expect(screen.getByTestId("quote-text")).toHaveTextContent("Simplicity is the ultimate sophistication.");\n' +
      '    expect(screen.getByTestId("quote-index")).toHaveTextContent("2 / 5");\n' +
      '  });\n' +
      '  it("wraps from the last quote back to the first", () => {\n' +
      '    render(<App />);\n' +
      '    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByTestId("btn-next"));\n' +
      '    expect(screen.getByTestId("quote-index")).toHaveTextContent("1 / 5");\n' +
      '    expect(screen.getByTestId("quote-text")).toHaveTextContent("Stay hungry, stay foolish.");\n' +
      '  });\n' +
      '  it("goes back with Previous and wraps to the last quote", () => {\n' +
      '    render(<App />);\n' +
      '    fireEvent.click(screen.getByTestId("btn-prev"));\n' +
      '    expect(screen.getByTestId("quote-index")).toHaveTextContent("5 / 5");\n' +
      '    expect(screen.getByTestId("quote-author")).toHaveTextContent("Antoine de Saint-Exupery");\n' +
      '  });\n' +
      '});\n',
    // legacy runner shape — unused when panel === "react-output", kept so any
    // code that touches p.tests never sees undefined.
    tests: [],
  });
})();
