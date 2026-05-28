# Enterprise RAG backend using Azure AI Search + Azure OpenAI + Azure Managed Redis
# with Managed Identity, async FastAPI, hybrid retrieval, semantic search,
# vector search, enterprise caching, and passwordless authentication.

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
import uuid
import json
import os

from azure.identity import DefaultAzureCredential, get_bearer_token_provider

from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorizedQuery

from openai import AsyncAzureOpenAI

import redis.asyncio as redis
from redis_entraid.cred_provider import create_from_default_azure_credential

# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="Enterprise Engineering AI Assistant",
    description="Production-grade RAG assistant with hybrid retrieval, Redis caching, grounded responses, and enterprise-grade security.",
    version="7.0.0"
)

logging.basicConfig(level=logging.INFO)

# =========================================================
# CONFIG
# =========================================================

SEARCH_ENDPOINT = "https://srch-eng-std-chatbot-dev.search.windows.net"

INDEX_NAME = "rag-1779537879070"

AZURE_OPENAI_ENDPOINT = "https://ranbir-9548-resource.openai.azure.com"

CHAT_MODEL = "gpt-4.1-mini"

EMBEDDING_MODEL = "text-embedding-3-large"

SEMANTIC_CONFIG = "rag-1779537879070-semantic-configuration"

VECTOR_FIELD_NAME = "text_vector"

TOP_K = 5

# =========================================================
# REDIS CONFIG
# =========================================================

REDIS_HOST = os.getenv("REDIS_HOST")

REDIS_PORT = int(os.getenv("REDIS_PORT", "10000"))

# =========================================================
# AUTH
# =========================================================

credential = DefaultAzureCredential()

# =========================================================
# SEARCH CLIENT (ASYNC)
# =========================================================

search_client = SearchClient(
    endpoint=SEARCH_ENDPOINT,
    index_name=INDEX_NAME,
    credential=credential
)

# =========================================================
# OPENAI TOKEN PROVIDER
# =========================================================

token_provider = get_bearer_token_provider(
    credential,
    "https://cognitiveservices.azure.com/.default"
)

# =========================================================
# OPENAI CLIENT (ASYNC)
# =========================================================

openai_client = AsyncAzureOpenAI(
    api_version="2024-05-01-preview",
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    azure_ad_token_provider=token_provider
)

# =========================================================
# REDIS AUTH (ENTERPRISE PATTERN)
# =========================================================

credential_provider = create_from_default_azure_credential(
    ("https://redis.azure.com/.default",)
)

# =========================================================
# REDIS CLIENT (ASYNC)
# =========================================================

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    ssl=True,
    credential_provider=credential_provider,
    decode_responses=True
)

# =========================================================
# REQUEST MODEL
# =========================================================

class ChatRequest(BaseModel):
    question: str
    search_mode: str = "hybrid"

# =========================================================
# ROOT
# =========================================================

@app.get("/")
async def root():
    return {
        "message": "Enterprise Engineering AI Assistant API is running"
    }

# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
async def health():
    return {
        "status": "healthy"
    }

# =========================================================
# EMBEDDING
# =========================================================

async def generate_embedding(text: str):

    embedding_response = await openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )

    return embedding_response.data[0].embedding

# =========================================================
# SEARCH
# =========================================================

async def run_search(question: str, search_mode: str):

    mode = search_mode.lower().strip()

    # -----------------------------------------------------
    # KEYWORD SEARCH
    # -----------------------------------------------------

    if mode == "keyword":

        results = await search_client.search(
            search_text=question,
            top=TOP_K
        )

        return [r async for r in results]

    # -----------------------------------------------------
    # SEMANTIC SEARCH
    # -----------------------------------------------------

    if mode == "semantic":

        results = await search_client.search(
            search_text=question,
            query_type="semantic",
            semantic_configuration_name=SEMANTIC_CONFIG,
            top=TOP_K
        )

        return [r async for r in results]

    # -----------------------------------------------------
    # VECTOR SEARCH
    # -----------------------------------------------------

    if mode == "vector":

        query_vector = await generate_embedding(question)

        vector_query = VectorizedQuery(
            vector=query_vector,
            k_nearest_neighbors=TOP_K,
            fields=VECTOR_FIELD_NAME
        )

        results = await search_client.search(
            search_text=None,
            vector_queries=[vector_query],
            top=TOP_K
        )

        return [r async for r in results]

    # -----------------------------------------------------
    # HYBRID SEARCH
    # -----------------------------------------------------

    query_vector = await generate_embedding(question)

    vector_query = VectorizedQuery(
        vector=query_vector,
        k_nearest_neighbors=TOP_K,
        fields=VECTOR_FIELD_NAME
    )

    results = await search_client.search(
        search_text=question,
        vector_queries=[vector_query],
        query_type="semantic",
        semantic_configuration_name=SEMANTIC_CONFIG,
        top=TOP_K
    )

    return [r async for r in results]

# =========================================================
# CHAT ENDPOINT
# =========================================================

@app.post("/api/chat")
async def chat(req: ChatRequest):

    request_id = str(uuid.uuid4())

    try:

        logging.info(
            f"request_id={request_id} | Incoming question={req.question} | search_mode={req.search_mode}"
        )

        # =================================================
        # CACHE KEY
        # =================================================

        cache_key = f"{req.search_mode}:{req.question}"

        # =================================================
        # REDIS CACHE CHECK
        # =================================================

        cached_response = await redis_client.get(cache_key)

        if cached_response:

            logging.info(
                f"request_id={request_id} | Redis Cache HIT"
            )

            return json.loads(cached_response)

        logging.info(
            f"request_id={request_id} | Redis Cache MISS"
        )

        # =================================================
        # SEARCH
        # =================================================

        results = await run_search(
            req.question,
            req.search_mode
        )

        context = ""

        citations = []

        seen_sources = set()

        for r in results:

            chunk = r.get("chunk")

            title = r.get("title") or "Enterprise Engineering Standards"

            section = r.get("section") or "Engineering Standards"

            score = r.get("@search.score")

            if chunk:

                context += f"""
[Source]
Document: {title}
Section: {section}
Relevance Score: {score}

Content:
{chunk}

---
"""

                source_key = f"{title}|{section}"

                if source_key not in seen_sources:

                    seen_sources.add(source_key)

                    citations.append({
                        "document": title,
                        "section": section,
                        "relevance_score": round(score, 3) if score else None
                    })

        # =================================================
        # NO CONTEXT
        # =================================================

        if not context:

            response_payload = {
                "request_id": request_id,
                "question": req.question,
                "answer": "I could not find this information in the engineering standards knowledge base.",
                "citations": [],
                "metadata": {
                    "model": CHAT_MODEL,
                    "embedding_model": EMBEDDING_MODEL,
                    "search_mode": req.search_mode,
                    "top_k": TOP_K
                }
            }

            return response_payload

        # =================================================
        # SYSTEM PROMPT
        # =================================================

        system_prompt = f"""
You are an Enterprise Engineering AI Assistant.

STRICT RULES:
- Answer ONLY from the provided context
- Do NOT hallucinate
- Do NOT use external knowledge
- If answer is not found, say:
  'I could not find this information in the engineering standards knowledge base.'

STYLE:
- Professional
- Concise
- Enterprise-focused
- Clear for engineering and governance teams
- Use bullet points where useful

CITATION RULES:
- Use enterprise citations only
- Format:
  [Document: <document> | Section: <section>]
- Never expose internal IDs or hashes

CONTEXT:
{context}
"""

        # =================================================
        # OPENAI CALL
        # =================================================

        response = await openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": req.question
                }
            ],
            temperature=0.1,
            max_tokens=1000
        )

        answer = response.choices[0].message.content

        # =================================================
        # FINAL RESPONSE
        # =================================================

        response_payload = {
            "request_id": request_id,
            "question": req.question,
            "answer": answer,
            "citations": citations,
            "metadata": {
                "model": CHAT_MODEL,
                "embedding_model": EMBEDDING_MODEL,
                "search_mode": req.search_mode,
                "top_k": TOP_K,
                "cache": "redis",
                "retrieval": "hybrid-rag"
            }
        }

        # =================================================
        # STORE RESPONSE IN REDIS
        # =================================================

        await redis_client.setex(
            cache_key,
            3600,
            json.dumps(response_payload)
        )

        logging.info(
            f"request_id={request_id} | Response cached in Redis"
        )

        return response_payload

    except Exception as e:

        logging.error(
            f"request_id={request_id} | Error={str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail="Internal Server Error"
        )