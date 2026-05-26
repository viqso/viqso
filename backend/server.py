from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict
import os, uuid, logging, bcrypt, jwt, random

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Voter CRM API")
api = APIRouter(prefix="/api")


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires one of: {roles}")
        return user
    return checker


# ---------- Models ----------
class LoginInput(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str  # admin | supervisor | worker
    phone: Optional[str] = None
    booth_id: Optional[str] = None
    assigned_booth_ids: Optional[List[str]] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    booth_id: Optional[str] = None
    assigned_booth_ids: Optional[List[str]] = None
    password: Optional[str] = None

class BoothCreate(BaseModel):
    name: str
    booth_number: str
    ward: str
    constituency: str
    location: Optional[str] = None
    target_voters: int = 0
    supervisor_id: Optional[str] = None
    assigned_workers: Optional[List[str]] = []

class BoothUpdate(BaseModel):
    name: Optional[str] = None
    booth_number: Optional[str] = None
    ward: Optional[str] = None
    constituency: Optional[str] = None
    location: Optional[str] = None
    target_voters: Optional[int] = None
    supervisor_id: Optional[str] = None
    assigned_workers: Optional[List[str]] = None

class VoterCreate(BaseModel):
    booth_id: str
    name: str
    voter_id_number: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # male/female/other
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    caste: Optional[str] = None
    religion: Optional[str] = None
    occupation: Optional[str] = None
    political_preference: Optional[str] = None  # supporter/neutral/opposition/undecided
    sentiment: Optional[str] = None  # positive/neutral/negative
    issues: Optional[List[str]] = []
    likely_to_vote: Optional[bool] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = {}

class VoterUpdate(BaseModel):
    name: Optional[str] = None
    voter_id_number: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    caste: Optional[str] = None
    religion: Optional[str] = None
    occupation: Optional[str] = None
    political_preference: Optional[str] = None
    sentiment: Optional[str] = None
    issues: Optional[List[str]] = None
    likely_to_vote: Optional[bool] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    booth_id: Optional[str] = None

class VisitCreate(BaseModel):
    booth_id: str
    worker_id: str
    scheduled_date: str
    notes: Optional[str] = None

class VisitUpdate(BaseModel):
    status: Optional[str] = None  # scheduled/completed/missed
    notes: Optional[str] = None
    voters_contacted: Optional[int] = None


# ---------- AUTH ----------
@api.post("/auth/login")
async def login(body: LoginInput, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    user.pop("_id", None); user.pop("password_hash", None)
    return {"user": user, "access_token": token}

@api.post("/auth/logout")
async def logout(response: Response, _user=Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- USERS (Admin) ----------
@api.get("/users")
async def list_users(user=Depends(require_roles("admin", "supervisor"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users

@api.post("/users")
async def create_user(body: UserCreate, _admin=Depends(require_roles("admin"))):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already exists")
    if body.role not in ["admin", "supervisor", "worker"]:
        raise HTTPException(400, "Invalid role")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "phone": body.phone,
        "booth_id": body.booth_id,
        "assigned_booth_ids": body.assigned_booth_ids or [],
        "active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("_id", None); doc.pop("password_hash", None)
    return doc

@api.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, _admin=Depends(require_roles("admin"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "password" in updates:
        updates["password_hash"] = hash_password(updates.pop("password"))
    if not updates:
        raise HTTPException(400, "No updates")
    res = await db.users.update_one({"id": user_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return user

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, _admin=Depends(require_roles("admin"))):
    res = await db.users.delete_one({"id": user_id})
    return {"deleted": res.deleted_count}


# ---------- BOOTHS ----------
@api.get("/booths")
async def list_booths(user=Depends(get_current_user)):
    q = {}
    if user["role"] == "worker":
        booth_ids = user.get("assigned_booth_ids") or []
        if user.get("booth_id"):
            booth_ids = list(set(booth_ids + [user["booth_id"]]))
        q = {"id": {"$in": booth_ids}}
    booths = await db.booths.find(q, {"_id": 0}).sort("booth_number", 1).to_list(1000)
    # Attach voter counts
    for b in booths:
        b["voters_surveyed"] = await db.voters.count_documents({"booth_id": b["id"]})
    return booths

@api.post("/booths")
async def create_booth(body: BoothCreate, _admin=Depends(require_roles("admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.booths.insert_one(doc)
    doc.pop("_id", None)
    doc["voters_surveyed"] = 0
    return doc

@api.get("/booths/{booth_id}")
async def get_booth(booth_id: str, user=Depends(get_current_user)):
    b = await db.booths.find_one({"id": booth_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booth not found")
    b["voters_surveyed"] = await db.voters.count_documents({"booth_id": booth_id})
    # workers
    workers = await db.users.find({"$or": [{"booth_id": booth_id}, {"assigned_booth_ids": booth_id}]}, {"_id": 0, "password_hash": 0}).to_list(1000)
    b["workers"] = workers
    return b

@api.patch("/booths/{booth_id}")
async def update_booth(booth_id: str, body: BoothUpdate, _admin=Depends(require_roles("admin", "supervisor"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates")
    res = await db.booths.update_one({"id": booth_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Booth not found")
    b = await db.booths.find_one({"id": booth_id}, {"_id": 0})
    return b

@api.delete("/booths/{booth_id}")
async def delete_booth(booth_id: str, _admin=Depends(require_roles("admin"))):
    await db.booths.delete_one({"id": booth_id})
    return {"ok": True}


# ---------- VOTERS / SURVEYS ----------
@api.get("/voters")
async def list_voters(
    user=Depends(get_current_user),
    booth_id: Optional[str] = None,
    search: Optional[str] = None,
    political_preference: Optional[str] = None,
    sentiment: Optional[str] = None,
    limit: int = 200,
):
    q: Dict[str, Any] = {}
    if user["role"] == "worker":
        booth_ids = user.get("assigned_booth_ids") or []
        if user.get("booth_id"):
            booth_ids = list(set(booth_ids + [user["booth_id"]]))
        q["booth_id"] = {"$in": booth_ids}
    if booth_id:
        q["booth_id"] = booth_id
    if political_preference:
        q["political_preference"] = political_preference
    if sentiment:
        q["sentiment"] = sentiment
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"voter_id_number": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    voters = await db.voters.find(q, {"_id": 0}).sort("surveyed_at", -1).limit(limit).to_list(limit)
    return voters

@api.post("/voters")
async def create_voter(body: VoterCreate, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "surveyed_by": user["id"],
        "surveyed_by_name": user["name"],
        "surveyed_at": now_iso(),
    }
    await db.voters.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/voters/{voter_id}")
async def get_voter(voter_id: str, user=Depends(get_current_user)):
    v = await db.voters.find_one({"id": voter_id}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Not found")
    return v

@api.patch("/voters/{voter_id}")
async def update_voter(voter_id: str, body: VoterUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    res = await db.voters.update_one({"id": voter_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    v = await db.voters.find_one({"id": voter_id}, {"_id": 0})
    return v

@api.delete("/voters/{voter_id}")
async def delete_voter(voter_id: str, user=Depends(require_roles("admin", "supervisor"))):
    await db.voters.delete_one({"id": voter_id})
    return {"ok": True}


# ---------- VISITS ----------
@api.get("/visits")
async def list_visits(user=Depends(get_current_user), booth_id: Optional[str] = None):
    q = {}
    if user["role"] == "worker":
        q["worker_id"] = user["id"]
    if booth_id:
        q["booth_id"] = booth_id
    visits = await db.visits.find(q, {"_id": 0}).sort("scheduled_date", 1).to_list(500)
    return visits

@api.post("/visits")
async def create_visit(body: VisitCreate, user=Depends(require_roles("admin", "supervisor"))):
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "status": "scheduled",
        "voters_contacted": 0,
        "created_at": now_iso(),
    }
    await db.visits.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/visits/{visit_id}")
async def update_visit(visit_id: str, body: VisitUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates")
    res = await db.visits.update_one({"id": visit_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    v = await db.visits.find_one({"id": visit_id}, {"_id": 0})
    return v

@api.delete("/visits/{visit_id}")
async def delete_visit(visit_id: str, user=Depends(require_roles("admin", "supervisor"))):
    await db.visits.delete_one({"id": visit_id})
    return {"ok": True}


# ---------- ANALYTICS ----------
@api.get("/analytics/overview")
async def analytics_overview(user=Depends(get_current_user)):
    voter_filter = {}
    booth_filter = {}
    if user["role"] == "worker":
        booth_ids = user.get("assigned_booth_ids") or []
        if user.get("booth_id"):
            booth_ids = list(set(booth_ids + [user["booth_id"]]))
        voter_filter["booth_id"] = {"$in": booth_ids}
        booth_filter["id"] = {"$in": booth_ids}

    total_voters = await db.voters.count_documents(voter_filter)
    total_booths = await db.booths.count_documents(booth_filter)
    total_workers = await db.users.count_documents({"role": "worker"})

    # target sum
    booths = await db.booths.find(booth_filter, {"_id": 0, "target_voters": 1}).to_list(1000)
    total_target = sum(b.get("target_voters", 0) for b in booths)

    # preferences
    pref_cursor = db.voters.aggregate([
        {"$match": voter_filter},
        {"$group": {"_id": "$political_preference", "count": {"$sum": 1}}}
    ])
    preferences = {}
    async for d in pref_cursor:
        preferences[d["_id"] or "unknown"] = d["count"]

    # sentiment
    sent_cursor = db.voters.aggregate([
        {"$match": voter_filter},
        {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
    ])
    sentiments = {}
    async for d in sent_cursor:
        sentiments[d["_id"] or "unknown"] = d["count"]

    likely = await db.voters.count_documents({**voter_filter, "likely_to_vote": True})

    return {
        "total_voters": total_voters,
        "total_booths": total_booths,
        "total_workers": total_workers,
        "total_target": total_target,
        "completion_rate": round((total_voters / total_target) * 100, 1) if total_target else 0,
        "likely_to_vote": likely,
        "preferences": preferences,
        "sentiments": sentiments,
    }

@api.get("/analytics/demographics")
async def analytics_demographics(user=Depends(get_current_user)):
    voter_filter = {}
    if user["role"] == "worker":
        booth_ids = user.get("assigned_booth_ids") or []
        if user.get("booth_id"):
            booth_ids = list(set(booth_ids + [user["booth_id"]]))
        voter_filter["booth_id"] = {"$in": booth_ids}

    voters = await db.voters.find(voter_filter, {"_id": 0}).to_list(10000)
    # Age groups
    age_groups = {"18-25": 0, "26-35": 0, "36-50": 0, "51-65": 0, "65+": 0, "unknown": 0}
    for v in voters:
        a = v.get("age")
        if not a:
            age_groups["unknown"] += 1
        elif a <= 25: age_groups["18-25"] += 1
        elif a <= 35: age_groups["26-35"] += 1
        elif a <= 50: age_groups["36-50"] += 1
        elif a <= 65: age_groups["51-65"] += 1
        else: age_groups["65+"] += 1

    gender = Counter([v.get("gender") or "unknown" for v in voters])
    religion = Counter([v.get("religion") or "unknown" for v in voters])
    caste = Counter([v.get("caste") or "unknown" for v in voters])
    occupation = Counter([v.get("occupation") or "unknown" for v in voters])

    return {
        "age_groups": age_groups,
        "gender": dict(gender),
        "religion": dict(religion),
        "caste": dict(caste),
        "occupation": dict(occupation),
        "total": len(voters),
    }

@api.get("/analytics/issues")
async def analytics_issues(user=Depends(get_current_user)):
    voter_filter = {}
    if user["role"] == "worker":
        booth_ids = user.get("assigned_booth_ids") or []
        if user.get("booth_id"):
            booth_ids = list(set(booth_ids + [user["booth_id"]]))
        voter_filter["booth_id"] = {"$in": booth_ids}

    voters = await db.voters.find(voter_filter, {"_id": 0, "issues": 1}).to_list(10000)
    counter = Counter()
    for v in voters:
        for i in v.get("issues") or []:
            counter[i] += 1
    return {"issues": [{"issue": k, "count": v} for k, v in counter.most_common(15)]}

@api.get("/analytics/booth-stats")
async def booth_stats(user=Depends(get_current_user)):
    booth_filter = {}
    if user["role"] == "worker":
        booth_ids = user.get("assigned_booth_ids") or []
        if user.get("booth_id"):
            booth_ids = list(set(booth_ids + [user["booth_id"]]))
        booth_filter["id"] = {"$in": booth_ids}

    booths = await db.booths.find(booth_filter, {"_id": 0}).to_list(1000)
    out = []
    for b in booths:
        surveyed = await db.voters.count_documents({"booth_id": b["id"]})
        supporters = await db.voters.count_documents({"booth_id": b["id"], "political_preference": "supporter"})
        out.append({
            "booth_id": b["id"],
            "name": b["name"],
            "booth_number": b["booth_number"],
            "ward": b.get("ward"),
            "target": b.get("target_voters", 0),
            "surveyed": surveyed,
            "supporters": supporters,
            "completion": round((surveyed / b["target_voters"] * 100), 1) if b.get("target_voters") else 0,
        })
    return out

@api.get("/analytics/engagement-trends")
async def engagement_trends(user=Depends(get_current_user), days: int = 14):
    voter_filter = {}
    if user["role"] == "worker":
        booth_ids = user.get("assigned_booth_ids") or []
        if user.get("booth_id"):
            booth_ids = list(set(booth_ids + [user["booth_id"]]))
        voter_filter["booth_id"] = {"$in": booth_ids}

    voters = await db.voters.find(voter_filter, {"_id": 0, "surveyed_at": 1}).to_list(10000)
    bucket = defaultdict(int)
    for v in voters:
        s = v.get("surveyed_at")
        if not s: continue
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00")).date().isoformat()
            bucket[d] += 1
        except Exception:
            pass
    today = datetime.now(timezone.utc).date()
    result = []
    for i in range(days - 1, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        result.append({"date": day, "count": bucket.get(day, 0)})
    return result


# ---------- ROOT ----------
@api.get("/")
async def root():
    return {"message": "Voter CRM API"}


# ---------- SEED ----------
SAMPLE_ISSUES = ["Water Supply", "Road Infrastructure", "Healthcare", "Education", "Employment", "Sanitation", "Power Cuts", "Public Transport", "Crime & Safety", "Inflation"]
SAMPLE_CASTES = ["General", "OBC", "SC", "ST"]
SAMPLE_RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Other"]
SAMPLE_OCC = ["Farmer", "Teacher", "Business", "Government Employee", "Daily Wage", "Student", "Homemaker", "Retired"]
SAMPLE_PREFS = ["supporter", "supporter", "neutral", "opposition", "undecided"]
SAMPLE_SENTS = ["positive", "positive", "neutral", "negative"]

async def seed_data():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.booths.create_index("booth_number", unique=False)
    await db.voters.create_index("booth_id")

    # Admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@crm.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "name": "Admin User", "role": "admin", "phone": "+91-9000000001",
            "booth_id": None, "assigned_booth_ids": [], "active": True,
            "created_at": now_iso(),
        })
    else:
        # ensure password matches env
        if not verify_password(admin_pw, existing_admin["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    # Check if already seeded
    if await db.booths.count_documents({}) > 0:
        logger.info("Data already seeded")
        return

    # Booths
    wards = ["Ward 12 - North Zone", "Ward 18 - East Zone", "Ward 22 - Central Zone", "Ward 27 - South Zone"]
    booths = []
    for i in range(1, 9):
        bid = str(uuid.uuid4())
        booths.append({
            "id": bid,
            "name": f"Booth {chr(64+i)} - {random.choice(['Public School', 'Community Hall', 'Govt Office', 'Library'])}",
            "booth_number": f"B-{100 + i}",
            "ward": random.choice(wards),
            "constituency": "Central Constituency",
            "location": f"Sector {i}, Main Road",
            "target_voters": random.randint(800, 1500),
            "supervisor_id": None,
            "assigned_workers": [],
            "created_at": now_iso(),
        })
    await db.booths.insert_many([dict(b) for b in booths])

    # Supervisor
    sup_email = os.environ.get("SUPERVISOR_EMAIL", "supervisor@crm.com")
    sup_pw = os.environ.get("SUPERVISOR_PASSWORD", "super123")
    sup_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": sup_id, "email": sup_email,
        "password_hash": hash_password(sup_pw),
        "name": "Priya Sharma", "role": "supervisor", "phone": "+91-9000000002",
        "booth_id": None, "assigned_booth_ids": [b["id"] for b in booths[:4]],
        "active": True, "created_at": now_iso(),
    })

    # Worker (login user)
    wkr_email = os.environ.get("WORKER_EMAIL", "worker@crm.com")
    wkr_pw = os.environ.get("WORKER_PASSWORD", "worker123")
    wkr_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": wkr_id, "email": wkr_email,
        "password_hash": hash_password(wkr_pw),
        "name": "Rajesh Kumar", "role": "worker", "phone": "+91-9000000003",
        "booth_id": booths[0]["id"], "assigned_booth_ids": [booths[0]["id"], booths[1]["id"]],
        "active": True, "created_at": now_iso(),
    })

    # More workers
    worker_ids = [wkr_id]
    worker_names = ["Anjali Patel", "Vikram Singh", "Meera Nair", "Sandeep Verma", "Kavita Reddy"]
    for idx, nm in enumerate(worker_names):
        wid = str(uuid.uuid4())
        worker_ids.append(wid)
        await db.users.insert_one({
            "id": wid, "email": f"worker{idx+1}@crm.com",
            "password_hash": hash_password("worker123"),
            "name": nm, "role": "worker", "phone": f"+91-90000000{20+idx}",
            "booth_id": booths[idx % len(booths)]["id"],
            "assigned_booth_ids": [booths[idx % len(booths)]["id"]],
            "active": True, "created_at": now_iso(),
        })

    # Sample voters
    first_names = ["Amit", "Sunita", "Ravi", "Pooja", "Sanjay", "Geeta", "Rakesh", "Neha", "Manoj", "Kiran", "Deepak", "Asha", "Vinod", "Rekha", "Suresh"]
    last_names = ["Sharma", "Verma", "Yadav", "Kumar", "Singh", "Gupta", "Patel", "Reddy", "Mishra", "Joshi", "Chauhan"]
    voters = []
    for i in range(120):
        booth = random.choice(booths)
        wid = random.choice(worker_ids)
        days_ago = random.randint(0, 13)
        ts = (datetime.now(timezone.utc) - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat()
        voters.append({
            "id": str(uuid.uuid4()),
            "booth_id": booth["id"],
            "name": f"{random.choice(first_names)} {random.choice(last_names)}",
            "voter_id_number": f"VID{random.randint(1000000, 9999999)}",
            "age": random.randint(19, 78),
            "gender": random.choice(["male", "male", "female", "female", "other"]),
            "address": f"H.No {random.randint(1, 200)}, Sector {random.randint(1, 20)}",
            "phone": f"+91-9{random.randint(100000000, 999999999)}",
            "email": None,
            "caste": random.choice(SAMPLE_CASTES),
            "religion": random.choice(SAMPLE_RELIGIONS),
            "occupation": random.choice(SAMPLE_OCC),
            "political_preference": random.choice(SAMPLE_PREFS),
            "sentiment": random.choice(SAMPLE_SENTS),
            "issues": random.sample(SAMPLE_ISSUES, k=random.randint(1, 4)),
            "likely_to_vote": random.choice([True, True, True, False, None]),
            "notes": random.choice(["Active community member", "Wants better roads", "First-time voter", "", ""]),
            "custom_fields": {},
            "surveyed_by": wid,
            "surveyed_by_name": "Field Worker",
            "surveyed_at": ts,
        })
    if voters:
        await db.voters.insert_many(voters)

    # Visits
    visits = []
    for i in range(15):
        booth = random.choice(booths)
        wid = random.choice(worker_ids)
        day_offset = random.randint(-3, 7)
        date = (datetime.now(timezone.utc) + timedelta(days=day_offset)).isoformat()
        status = "completed" if day_offset < 0 else "scheduled"
        visits.append({
            "id": str(uuid.uuid4()),
            "booth_id": booth["id"],
            "worker_id": wid,
            "scheduled_date": date,
            "status": status,
            "voters_contacted": random.randint(0, 50) if status == "completed" else 0,
            "notes": random.choice(["Morning visit", "Evening canvassing", "Door-to-door survey", ""]),
            "created_at": now_iso(),
        })
    if visits:
        await db.visits.insert_many(visits)

    logger.info(f"Seeded: {len(booths)} booths, {len(voters)} voters, {len(visits)} visits, {len(worker_ids)+2} users")


@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()


# Include router
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
