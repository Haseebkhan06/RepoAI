
from fastapi import FastAPI, HTTPException
from app.services.github_service import (
    get_repository,
    get_repository_files,
    get_repository_contents
)

app = FastAPI(title="RepoAI")


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

from app.services.repository_analyzer import analyze_repository


@app.get("/repository/{owner}/{repo}/analyze")
async def analyze_github_repository(owner: str, repo: str):
    try:
        return await analyze_repository(owner, repo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))