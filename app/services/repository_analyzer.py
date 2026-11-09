
from app.services.github_service import get_repository_contents
from app.services.code_analyzer import analyze_python_code
from app.services.llm_service import (
    explain_code,
    summarize_repository
)


async def analyze_repository(owner: str, repo: str):
    repository = await get_repository_contents(owner, repo)

    results = []

    for file in repository["files"]:
        if file["path"].endswith(".py"):
            code = file["content"]

            # Analyze code structure
            code_analysis = analyze_python_code(code)

            # Generate AI explanation
            ai_explanation = await explain_code(code)

            results.append({
                "path": file["path"],
                "code_analysis": code_analysis,
                "ai_explanation": ai_explanation
            })

    # Generate overall repository summary
    project_summary = await summarize_repository(
        repository["repository"],
        repository["files"]
    )

    return {
        "repository": repository["repository"],
        "analyzed_files": len(results),
        "project_summary": project_summary,
        "results": results
    }
