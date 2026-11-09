from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from app.services.github_service import (
    get_repository,
    get_repository_files,
    get_repository_contents
)

from app.services.repository_analyzer import analyze_repository
from app.services.vector_store import store_repository_files
from app.services.qa_service import answer_repository_question


app = FastAPI(title="RepoAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str


def repo_key(owner: str, repo: str) -> str:
    # One name used for BOTH indexing and asking, so they always match
    return f"{owner}/{repo}".lower()


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/repository/{owner}/{repo}")
async def repository_info(owner: str, repo: str):
    try:
        return await get_repository(owner, repo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/repository/{owner}/{repo}/files")
async def repository_files(owner: str, repo: str):
    try:
        return await get_repository_files(owner, repo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/repository/{owner}/{repo}/contents")
async def repository_contents(owner: str, repo: str):
    try:
        return await get_repository_contents(owner, repo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/repository/{owner}/{repo}/analyze")
async def analyze_github_repository(owner: str, repo: str):
    try:
        return await analyze_repository(owner, repo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/repository/{owner}/{repo}/index")
async def index_repository(owner: str, repo: str):
    try:
        repository = await get_repository_contents(owner, repo)
        key = repo_key(owner, repo)

        total_chunks = store_repository_files(
            key,
            repository["files"]
        )

        return {
            "repository": key,
            "indexed_files": repository["total_files"],
            "indexed_chunks": total_chunks,
            "message": "Repository indexed successfully"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/repository/{owner}/{repo}/ask")
async def ask_repository(
    owner: str,
    repo: str,
    request: QuestionRequest
):
    try:
        result = await answer_repository_question(
            repository_name=repo_key(owner, repo),
            question=request.question
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))