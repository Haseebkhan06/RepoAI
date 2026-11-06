
import base64
import httpx

GITHUB_API = "https://api.github.com"

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".cpp", ".c", ".h",
    ".go", ".rs", ".php", ".rb",
    ".md", ".json", ".yaml", ".yml",
    ".html", ".css", ".sql"
}

IGNORED_DIRS = {
    ".git", ".venv", "venv", "node_modules",
    "__pycache__", "dist", "build", ".next"
}

MAX_FILES = 100
MAX_FILE_SIZE = 100_000  # 100 KB per file
TIMEOUT = 30


async def get_repository(owner: str, repo: str):
    url = f"{GITHUB_API}/repos/{owner}/{repo}"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(url)

    if response.status_code == 404:
        raise ValueError("Repository not found")

    response.raise_for_status()
    data = response.json()

    return {
        "name": data["name"],
        "owner": data["owner"]["login"],
        "description": data["description"],
        "language": data["language"],
        "stars": data["stargazers_count"],
        "default_branch": data["default_branch"]
    }


async def get_repository_files(owner: str, repo: str):
    repository = await get_repository(owner, repo)
    branch = repository["default_branch"]

    url = (
        f"{GITHUB_API}/repos/{owner}/{repo}"
        f"/git/trees/{branch}?recursive=1"
    )

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(url)

    if response.status_code == 409:
        return {
            "repository": repository["name"],
            "total_files": 0,
            "files": [],
            "message": "Repository has no committed files."
        }

    response.raise_for_status()
    data = response.json()

    files = []

    for item in data.get("tree", []):
        if item["type"] != "blob":
            continue

        path = item["path"]
        parts = path.split("/")

        if any(part in IGNORED_DIRS for part in parts):
            continue

        extension = (
            "." + path.rsplit(".", 1)[-1].lower()
            if "." in path else ""
        )

        if extension not in SUPPORTED_EXTENSIONS:
            continue

        if item.get("size", 0) > MAX_FILE_SIZE:
            continue

        files.append({
            "path": path,
            "url": item["url"],
            "size": item.get("size", 0)
        })

        if len(files) >= MAX_FILES:
            break

    return {
        "repository": repository["name"],
        "total_files": len(files),
        "files": files
    }


async def get_file_content(file_url: str):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(file_url)

    response.raise_for_status()
    data = response.json()

    if data.get("encoding") != "base64":
        raise ValueError("Unsupported file encoding")

    content = base64.b64decode(data["content"]).decode(
        "utf-8",
        errors="replace"
    )

    return content


async def get_repository_contents(owner: str, repo: str):
    file_data = await get_repository_files(owner, repo)

    results = []

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for file in file_data["files"]:
            response = await client.get(file["url"])
            response.raise_for_status()

            data = response.json()

            if data.get("encoding") != "base64":
                continue

            content = base64.b64decode(
                data["content"]
            ).decode("utf-8", errors="replace")

            results.append({
                "path": file["path"],
                "content": content,
                "size": file["size"]
            })

    return {
        "repository": file_data["repository"],
        "total_files": len(results),
        "files": results
    }
