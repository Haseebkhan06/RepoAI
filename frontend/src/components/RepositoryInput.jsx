import { useState } from "react";

const EXAMPLES = ["facebook/react", "ollama/ollama"];
const STORAGE_KEY = "repoai_recent";

// accepts "owner/name" or a full github.com URL
function parseRepo(value) {
  const v = value.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const m =
    v.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/i) ||
    v.match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecent(repo) {
  try {
    const next = [repo, ...getRecent().filter((r) => r !== repo)].slice(0, 4);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable, ignore */
  }
}

export default function RepositoryInput({ onSubmit }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [recent] = useState(getRecent);

  const submit = (raw) => {
    const repo = parseRepo(raw);
    if (!repo) {
      setError("That doesn't look right. Try github.com/owner/repo or owner/repo.");
      return;
    }
    setError("");
    saveRecent(repo);
    onSubmit(repo);
  };

  return (
    <form
      className="repo-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <div className="repo-row">
        <div className={`repo-field ${error ? "invalid" : ""}`}>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            placeholder="github.com/owner/repo"
            autoFocus
            spellCheck="false"
            aria-label="GitHub repository"
          />
        </div>
        <button className="repo-submit" type="submit">
          Read this repo
        </button>
      </div>

      {error && <p className="repo-error">{error}</p>}

      <p className="try-line">
        No link handy? Try{" "}
        {EXAMPLES.map((ex, i) => (
          <span key={ex}>
            <button type="button" className="text-link" onClick={() => submit(ex)}>
              {ex}
            </button>
            {i < EXAMPLES.length - 1 ? " or " : "."}
          </span>
        ))}
      </p>

      {recent.length > 0 && (
        <div className="chip-row">
          <span className="chip-label">Recent</span>
          {recent.map((r) => (
            <button type="button" className="chip" key={r} onClick={() => submit(r)}>
              {r}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}