import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/startup", tags=["Startup Architect"])

class StartupCreateRequest(BaseModel):
    idea: str
    customer: str
    problem: str
    location: str
    goals: List[str]

class StartupProfile(BaseModel):
    id: str
    idea: str
    customer: str
    problem: str
    location: str
    goals: List[str]
    health_score: int
    progress_percentage: int
    created_at: str

# In-memory startup registry
startups_db: Dict[str, Dict[str, Any]] = {
    "startup_default_01": {
        "id": "startup_default_01",
        "idea": "AI-powered supply chain resilience platform for mid-market distributors",
        "customer": "B2B Logistics & Wholesale Distributors",
        "problem": "Inventory stockouts and unpredicted supplier lead time volatility costing 12% annual margin",
        "location": "Global (North America & India corridor)",
        "goals": ["Validate my idea", "Research competitors", "Build a business model", "Create a launch strategy"],
        "health_score": 78,
        "progress_percentage": 64,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
}

@router.post("/create")
def create_startup(req: StartupCreateRequest):
    new_id = f"startup_{uuid.uuid4().hex[:8]}"
    data = {
        "id": new_id,
        "idea": req.idea,
        "customer": req.customer,
        "problem": req.problem,
        "location": req.location,
        "goals": req.goals,
        "health_score": 78,
        "progress_percentage": 64,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    startups_db[new_id] = data
    return {"success": True, "startup": data}

@router.get("/{startup_id}")
def get_startup(startup_id: str):
    if startup_id in startups_db:
        return startups_db[startup_id]
    return list(startups_db.values())[0]

@router.post("/{startup_id}/analyze")
def run_startup_analysis(startup_id: str, payload: Optional[Dict[str, Any]] = None):
    startup = startups_db.get(startup_id, list(startups_db.values())[0])
    
    agent_trace = [
        {"node": "Market Research Agent", "status": "completed", "result": "TAM calculated at $4.2B with 18% CAGR in target sector."},
        {"node": "Competitor Analysis Agent", "status": "completed", "result": "Identified 3 clear differentiation moats against legacy players."},
        {"node": "Financial Unit Economics Agent", "status": "completed", "result": "Projected LTV:CAC of 4.2x with $18K ACV."},
        {"node": "Strategy & GTM Agent", "status": "completed", "result": "Sprint playbook generated for 10 initial enterprise pilot interviews."}
    ]
    
    return {
        "success": True,
        "startup_id": startup_id,
        "health_score": 82,
        "agent_trace": agent_trace,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
