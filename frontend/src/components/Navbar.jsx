export default function Navbar({ repo, onReset }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button className="brand" onClick={onReset} aria-label="Repo AI home">
          <span className="brand-star">★</span>
          Repo AI
        </button>

        <nav className="nav-actions">
          <a
            className="nav-link"
            href="https://github.com/haseebkhan06/repoai"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          {repo && (
            <button className="nav-btn" onClick={onReset}>
              + New repo
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}