
import ast


def analyze_python_code(code: str):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {
            "error": f"Invalid Python syntax: {e}"
        }

    functions = []
    classes = []
    imports = []

    for node in ast.walk(tree):

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append({
                "name": node.name,
                "line": node.lineno,
                "arguments": [
                    arg.arg for arg in node.args.args
                ]
            })

        elif isinstance(node, ast.ClassDef):
            classes.append({
                "name": node.name,
                "line": node.lineno,
                "methods": [
                    item.name
                    for item in node.body
                    if isinstance(
                        item,
                        (ast.FunctionDef, ast.AsyncFunctionDef)
                    )
                ]
            })

        elif isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)

        elif isinstance(node, ast.ImportFrom):
            imports.append(node.module or "")

    return {
        "total_functions": len(functions),
        "total_classes": len(classes),
        "total_imports": len(imports),
        "functions": functions,
        "classes": classes,
        "imports": sorted(set(imports))
    }

if __name__ == "__main__":
    sample_code = """
import pandas as pd

class Car:
    def predict(self, model, year):
        return model

def clean_data(df):
    return df.dropna()
"""

    result = analyze_python_code(sample_code)
    print(result)