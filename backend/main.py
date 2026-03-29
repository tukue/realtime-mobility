from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import realtime, departures, situations

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
app.include_router(situations.router, prefix="/api/situations", tags=["situations"])

@app.get("/")
async def root():
    return {"message": "Stockholm Transit API", "status": "running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}
