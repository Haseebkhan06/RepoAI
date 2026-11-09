# RepoAI

I've been working on RepoAI to make exploring unfamiliar GitHub repositories a little easier.

The idea is simple: instead of spending hours going through files to understand a project, you can give RepoAI a GitHub link and ask questions about its codebase.

It fetches the source code, analyzes Python files, creates embeddings, and uses AI to explain the code and answer questions.

### What I'm using

- Python and FastAPI for the backend
- React and Vite for the frontend
- Groq with GPT-OSS 20B for code explanations and Q&A
- Sentence Transformers (`all-MiniLM-L6-v2`) for embeddings
- ChromaDB for storing and searching code embeddings
- Python AST for static code analysis

### How to run it

**Clone the project**

```bash
git clone https://github.com/Haseebkhan06/RepoAI.git
cd RepoAI
```

**Install backend dependencies**

```bash
uv sync
```

**Add your API keys in a `.env` file**

```env
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_github_token
```

**Run the backend**

```bash
uv run uvicorn app.main:app
```

**Run the frontend in another terminal**

```bash
cd frontend
npm install
npm run dev
```

Open the local URL provided by Vite and you're good to go.

### What's next?

This is still a work in progress. I want to improve code retrieval, support more programming languages, and make the repository analysis more useful.

Built as a project to explore AI, RAG, and making developer workflows easier.

**— Haseeb Khan**
