import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import "./Analyzer.css";

/* ------------------------------------------------------------------
   BACKEND CALLS - matched to your FastAPI routes:
   POST /repository/{owner}/{repo}/index
   POST /repository/{owner}/{repo}/ask   body: { question }
------------------------------------------------------------------- */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* no json body */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// repo is "owner/name"; keep the slash, it matches the route shape
const loadRepo = (repo) => postJSON(`/repository/${repo}/index`);

const askQuestion = async (repo, question) => {
  const data = await postJSON(`/repository/${repo}/ask`, { question });
  if (typeof data === "string") return data;
  return data.answer ?? data.response ?? data.message ?? data.result ?? JSON.stringify(data, null, 2);
};
/* ----------------------------------------------------------------- */

const SUGGESTIONS = [
  "Explain this project",
  "How do I run it?",
  "What's the tech stack?",
  "Where should I start reading?",
  "Is it worth a star?",
];

const mdComponents = {
  table: ({ node, ...props }) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button className="copy-btn" onClick={copy} title="Copy answer">
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

export default function Analyzer({ repo, onReset }) {
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const init = useCallback(
    async (isCancelled = () => false) => {
      setStatus("loading");
      setError("");
      setMessages([]);
      try {
        const data = await loadRepo(repo);
        if (isCancelled()) return;
        const n = data?.indexed_files ?? null;
        const count = typeof n === "number" ? `${n} files` : "the repository";
        setMessages([
          {
            role: "assistant",
            content: `Done. I read ${count} in **${repo}**. Ask what it does, how to run it, or whether it's worth a star.`,
          },
        ]);
        setStatus("ready");
      } catch (err) {
        if (isCancelled()) return;
        setError(err.message || "Something went wrong while reading the repo.");
        setStatus("error");
      }
    },
    [repo]
  );

  useEffect(() => {
    let cancelled = false;
    init(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [init]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  useEffect(() => {
    if (status === "ready") inputRef.current?.focus();
  }, [status]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || thinking || status !== "ready") return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setThinking(true);
    try {
      const answer = await askQuestion(repo, question);
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", error: true, content: `Couldn't get an answer: ${err.message}` },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const clearChat = () => setMessages((m) => (m.length ? [m[0]] : m));

  const showSuggestions = status === "ready" && messages.length <= 1 && !thinking;

  return (
    <section className="analyzer">
      <header className="analyzer-head">
        <div className="repo-meta">
          <span className="repo-icon">⌥</span>
          <a
            className="repo-name"
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noreferrer"
          >
            {repo}
          </a>
          <span className={`status-pill ${status}`}>
            {status === "loading" && "Reading files…"}
            {status === "ready" && "Ready"}
            {status === "error" && "Failed"}
          </span>
        </div>
        <div className="head-actions">
          {status === "ready" && messages.length > 1 && (
            <button className="ghost-btn" onClick={clearChat}>
              Clear chat
            </button>
          )}
          <button className="ghost-btn" onClick={onReset}>
            Use a different repo
          </button>
        </div>
      </header>

      <div className="chat">
        {status === "loading" && (
          <div className="state-box">
            <div className="spinner" />
            <p>
              Fetching and indexing <strong>{repo}</strong>…
            </p>
            <span>Bigger repos can take a little while.</span>
          </div>
        )}

        {status === "error" && (
          <div className="state-box">
            <div className="state-emoji">⚠️</div>
            <p>{error}</p>
            <div className="state-actions">
              <button className="primary-btn" onClick={() => init()}>
                Try again
              </button>
              <button className="ghost-btn" onClick={onReset}>
                Pick another repo
              </button>
            </div>
          </div>
        )}

        {status === "ready" && (
          <>
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div className="msg user" key={i}>
                  <div className="bubble">{m.content}</div>
                </div>
              ) : (
                <div className={`msg assistant ${m.error ? "error" : ""}`} key={i}>
                  <div className="avatar">★</div>
                  <div className="bubble">
                    <div className="md">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                        components={mdComponents}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {i > 0 && !m.error && <CopyButton text={m.content} />}
                  </div>
                </div>
              )
            )}

            {thinking && (
              <div className="msg assistant">
                <div className="avatar">★</div>
                <div className="bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {showSuggestions && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={status === "ready" ? "Ask anything about this repo" : "Waiting for the repo to load…"}
          disabled={status !== "ready"}
          aria-label="Ask about this repository"
        />
        <button
          className="ask-btn"
          type="submit"
          disabled={status !== "ready" || thinking || !input.trim()}
        >
          Ask
        </button>
      </form>
    </section>
  );
}