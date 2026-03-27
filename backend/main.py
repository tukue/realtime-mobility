from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routers import realtime, departures

load_dotenv()

app = FastAPI(title="Stockholm Transit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(realtime.router, prefix="/api/realtime", tags=["realtime"])
app.include_router(departures.router, prefix="/api/departures", tags=["departures"])

@app.get("/")
async def root():
    return {"message": "Stockholm Transit API", "status": "running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}
