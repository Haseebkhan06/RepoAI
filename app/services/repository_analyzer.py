from app.services.github_service import get_repository_contents
from app.services.code_analyzer import analyze_python_code
from app.services.llm_service import explain_code


async def analyze_repository(owner: str, repo: str):
    repository = await get_repository_contents(owner, repo)

    results = []

    for file in repository["files"]:
        if file["path"].endswith(".py"):
            code = file["content"]

            # Basic code analysis
            code_analysis = analyze_python_code(code)

            # AI explanation using Groq
            ai_explanation = await explain_code(code)

            results.append({
                "path": file["path"],
                "code_analysis": code_analysis,
                "ai_explanation": ai_explanation
            })

    return {
        "repository": repository["repository"],
        "analyzed_files": len(results),
        "results": results
    }