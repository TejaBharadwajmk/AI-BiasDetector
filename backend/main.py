from dotenv import load_dotenv
import os
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import audit, community, divergence

# ── APP ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="EqualityLens API",
    description="Community-In-The-Loop AI Bias Auditor — Google Solutions Challenge 2026",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",       # Vite dev
        "http://localhost:3000",       # Alt dev
        os.environ.get("FRONTEND_URL", "*"),  # Vercel production URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────────────────────

app.include_router(audit.router,      prefix="/api/audit",     tags=["Audit"])
app.include_router(community.router,  prefix="/api/community", tags=["Community"])
app.include_router(divergence.router, prefix="/api/divergence",tags=["Divergence"])

# ── HEALTH ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status":  "ok",
        "version": "1.0.0",
        "message": "EqualityLens API is running",
    }

@app.get("/")
def root():
    return {"message": "EqualityLens API — visit /docs for Swagger UI"}

# ── RUN ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=True,
    )