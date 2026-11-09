const STEPS = [
  { n: "01", title: "Paste a link", text: "Any public GitHub repo." },
  { n: "02", title: "We read the code", text: "Files are fetched and summarized." },
  { n: "03", title: "Ask anything", text: "How it works, how to run it, is it worth a star." },
];

export default function Hero({ children }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>
          Saw a repo in a reel? <br />
          <span className="gradient-text">Find out what it actually does.</span>
        </h1>

        <p className="hero-sub">
          Paste a GitHub link, then ask anything about the code before you star it.
        </p>

        <div className="hero-input-slot">{children}</div>

        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="step-num">{s.n}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}