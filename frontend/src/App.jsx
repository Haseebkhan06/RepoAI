import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import RepositoryInput from "./components/RepositoryInput";
import Analyzer from "./components/Analyzer";
import RepositoryScene from "./components/RepositoryScene";
import "./App.css";

export default function App() {
  const [repo, setRepo] = useState(null); // "owner/name"

  return (
    <div className="app">
      <div className="app-bg" aria-hidden="true">
        <RepositoryScene />
      </div>

      <Navbar repo={repo} onReset={() => setRepo(null)} />

      <main className="app-main">
        {repo ? (
          <Analyzer repo={repo} onReset={() => setRepo(null)} />
        ) : (
          <Hero>
            <RepositoryInput onSubmit={setRepo} />
          </Hero>
        )}
      </main>
    </div>
  );
}