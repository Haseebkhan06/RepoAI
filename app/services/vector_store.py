
import chromadb

from app.services.embedding_service import generate_embeddings, generate_embedding

# Create a persistent local ChromaDB database
client = chromadb.PersistentClient(path="chroma_db")

collection = client.get_or_create_collection(
    name="repoai_code",
    metadata={"hnsw:space": "cosine"}
)


def chunk_code(code: str, chunk_size: int = 1500, overlap: int = 200):
    chunks = []

    start = 0

    while start < len(code):
        end = start + chunk_size
        chunks.append(code[start:end])
        start += chunk_size - overlap

    return chunks


def store_repository_files(repository_name: str, files: list):
    documents = []
    metadatas = []
    ids = []

    for file in files:
        chunks = chunk_code(file["content"])

        for index, chunk in enumerate(chunks):
            documents.append(chunk)

            metadatas.append({
                "repository": repository_name,
                "path": file["path"],
                "chunk_index": index
            })

            ids.append(
                f"{repository_name}:{file['path']}:{index}"
            )

    if not documents:
        return 0

    embeddings = generate_embeddings(documents)

    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )

    return len(documents)


def search_code(repository_name: str, question: str, top_k: int = 5):
    if not question.strip():
        raise ValueError("Question cannot be empty")

    if collection.count() == 0:
        return []

    query_embedding = generate_embedding(question)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        where={"repository": repository_name}
    )

    matches = []

    for document, metadata, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        matches.append({
            "content": document,
            "path": metadata["path"],
            "distance": distance
        })

    return matches
