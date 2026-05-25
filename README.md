# Enterprise Engineering AI Assistant

An enterprise-grade Retrieval-Augmented Generation (RAG) AI assistant built on Microsoft Azure to provide accurate, grounded answers for engineering standards, GitHub governance, CI/CD practices, Infrastructure as Code (IaC), and deployment policies.

---

## What This Solution Does

This solution enables developers, architects, and DevOps engineers to query internal engineering standards through a web-based interface and receive precise, context-aware responses.

It follows a Retrieval-Augmented Generation (RAG) pattern, where relevant content is first retrieved from an enterprise knowledge base and then used by an AI model to generate grounded responses with citations.

---

## Key Features

- Web-based AI assistant interface  
- Frontend hosted on Azure Static Web Apps  
- Backend API built using FastAPI  
- Azure Container Apps for backend hosting  
- Azure AI Search for document indexing and retrieval  
- Azure OpenAI for response generation  
- Hybrid search support (keyword + vector + semantic ranking)  
- Managed Identity authentication (no API keys in code)  
- Citation-backed responses  
- Dynamic session-based chat history  
- Clean enterprise-grade UI  
- Observability with Azure Monitor and Application Insights  

---

## Architecture Overview

<img width="1600" height="983" alt="Architecture Diagram" src="https://github.com/user-attachments/assets/7bd6daf9-ae3e-4a3c-81f4-682c147b718b" />

---

## Azure Services Used

| Layer | Service |
|------|--------|
| Frontend | Azure Static Web Apps |
| Backend API | Azure Container Apps (FastAPI) |
| Retrieval Layer | Azure AI Search |
| Knowledge Source | Azure Blob Storage |
| AI / LLM Layer | Azure OpenAI (via Microsoft Foundry) |
| Identity | Managed Identity |
| Monitoring | Azure Monitor & Application Insights |

---

## Request Flow

1. User submits a question through the web UI  
2. Frontend sends request to `/api/chat`  
3. FastAPI backend receives and processes request  
4. Azure AI Search retrieves relevant document chunks  
5. Hybrid retrieval is applied (keyword + vector + semantic ranking)  
6. Backend constructs a grounded prompt  
7. Azure OpenAI generates a response based on context  
8. Backend formats answer and attaches citations  
9. Response is returned and displayed in UI  

---

## Security

This solution uses Azure Managed Identity for secure service-to-service authentication.

- No API keys stored in code  
- Secure access to Azure AI Search  
- Secure access to Azure OpenAI  

This aligns with enterprise security best practices.

---

## RAG Implementation

The backend implements a lightweight custom RAG pipeline:

```text
User Question
→ FastAPI Backend
→ Azure AI Search (Hybrid Retrieval)
→ Relevant Context
→ Azure OpenAI
→ Grounded Answer with Citations
