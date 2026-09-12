from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict

import bcrypt
import jwt
import httpx
import re
import ipaddress
import secrets
import string
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.encoders import jsonable_encoder
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr, ConfigDict


def sanitize(v):
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, dict):
        return {k: sanitize(x) for k, x in v.items() if k != "_id"}
    if isinstance(v, list):
        return [sanitize(x) for x in v]
    if isinstance(v, datetime):
        return v.isoformat()
    return v

# ------------ Config ------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "linchub-dev-secret-please-change")
JWT_ALG = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "lidiyapratamy@gmail.com").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "ADMIN123")

# Email (Emergent managed)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Linchub")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LINCHUB SaaS")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("linchub")


# ------------ Utils ------------
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> Dict[str, Any]:
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles: str):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return dep


# ------------ RBAC ------------
DEFAULT_MODULES = ["Project", "Candidate", "Billing", "Analyst", "Settings"]
DEFAULT_PERMS = ["Read", "Write", "Delete"]


def default_rbac() -> Dict[str, Any]:
    m = {}
    for r in ["super_admin", "karyawan", "client"]:
        m[r] = {}
        for mod in DEFAULT_MODULES:
            m[r][mod] = {
                "Read": (mod != "Settings") if r == "client" else True,
                "Write": r != "client",
                "Delete": r == "super_admin",
            }
    return m


async def get_rbac() -> Dict[str, Any]:
    s = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    matrix = s.get("rbac") or {}
    # Merge with defaults so new modules/perms auto-appear
    base = default_rbac()
    for r in base:
        matrix.setdefault(r, {})
        for mod in DEFAULT_MODULES:
            matrix[r].setdefault(mod, base[r][mod])
            for p in DEFAULT_PERMS:
                matrix[r][mod].setdefault(p, base[r][mod][p])
    return matrix


def require_perm(module: str, perm: str):
    async def dep(user=Depends(get_current_user)):
        if user["role"] == "super_admin":
            return user
        matrix = await get_rbac()
        if not matrix.get(user["role"], {}).get(module, {}).get(perm, False):
            raise HTTPException(status_code=403, detail=f"Forbidden: {perm} on {module}")
        return user

    return dep


def gen_password(n: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))


def tenant_of(user: dict) -> str:
    return (user.get("tenant_company") or "").strip().lower()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc is None:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ------------ Models ------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str


class ProjectIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pic_name: str
    whatsapp: str = ""
    email: str = ""
    company_name: str
    website: str = ""
    contact_date: str = ""
    stage: str = "Contacted"  # Contacted, Meeting CR, Finishing Meeting, Proposal, Closed/Deal
    notes: str = ""


class CandidateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    position: str
    client_company: str
    interview_at: str = ""
    source: str = "INTERNAL"  # INTERNAL, EKSTERNAL, MASSIVE
    cluster: str = "Stages"   # Stages, Fractional
    stage: str = "INTERVIEW"  # INTERVIEW, OJT, PKWT
    ojt_start: str = ""
    ojt_end: str = ""
    ojt_target_type: str = "Quantity"  # Quantity, Revenue
    ojt_target_value: float = 50
    pkwt_start: str = ""
    pkwt_end: str = ""
    pkwt_target_type: str = "Quantity"
    pkwt_target_value: float = 100
    ojt_status: str = "In-Progress"
    pkwt_status: str = "Hired PKWT"


class ProgressEntry(BaseModel):
    entry_date: str
    label: str = ""
    amount: float


class InvoiceItem(BaseModel):
    description: str
    qty: float
    unit_price: float


class InvoiceIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    client_company: str
    client_address: str = ""
    client_pic: str = ""
    client_phone: str = ""
    client_email: str = ""
    issue_date: str
    due_date: str
    items: List[InvoiceItem]
    tax_percent: float = 11.0
    status: str = "Draft"  # Draft, Sent, Paid, Overdue
    notes: str = ""


class SettingsIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    company_name: str = "PT. Linchub Network Indonesia"
    invoice_prefix: str = "INV/LCH"
    letterhead_url: str = ""
    stamp_url: str = ""
    signature_url: str = ""
    wa_api_key: str = ""
    email_gateway: str = ""
    slack_webhook: str = ""
    rules: List[Dict[str, Any]] = []
    rbac: Dict[str, Any] = {}


# ------------ Email (Emergent managed) ------------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    if not EMAIL_KEY:
        raise HTTPException(500, "Email integration not configured")
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as cli:
            r = await cli.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                               headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        r.raise_for_status()
        return r.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")


# ------------ Audit ------------
async def audit(user, action: str, entity: str, entity_id: str, before=None, after=None):
    await db.audit_logs.insert_one(
        {
            "id": str(uuid.uuid4()),
            "at": now_iso(),
            "user_id": user["id"],
            "user_email": user["email"],
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "before": sanitize(before),
            "after": sanitize(after),
        }
    )


# ------------ Auth Endpoints ------------
@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_token(user["id"], user["email"], user["role"])
    ip = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip() or (request.client.host if request.client else "")
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login_at": now_iso(), "last_login_ip": ip}})
    if user.get("role") == "client":
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "at": now_iso(),
            "user_id": user["id"],
            "user_email": user["email"],
            "action": "client_login",
            "entity": "session",
            "entity_id": user.get("tenant_company") or user["email"],
            "before": None,
            "after": {"ip": ip, "tenant_company": user.get("tenant_company") or ""},
        })
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.get("/users")
async def list_users(user=Depends(require_role("super_admin"))):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return items


@api.get("/auth/permissions")
async def my_permissions(user=Depends(get_current_user)):
    matrix = await get_rbac()
    role_perms = matrix.get(user["role"], {})
    # super_admin always full
    if user["role"] == "super_admin":
        role_perms = {mod: {p: True for p in DEFAULT_PERMS} for mod in DEFAULT_MODULES}
    return {"role": user["role"], "permissions": role_perms, "modules": DEFAULT_MODULES}


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


@api.post("/auth/change-password")
async def change_password(payload: PasswordChange, user=Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not verify_pw(payload.old_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama tidak cocok")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_pw(payload.new_password)}})
    return {"ok": True}


# ------------ Projects (Leads) ------------
@api.get("/projects")
async def list_projects(user=Depends(require_perm("Project", "Read"))):
    query = {}
    if user["role"] == "client":
        t = tenant_of(user)
        query = {"tenant_key": t} if t else {"email": user["email"]}
    items = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


class BulkProjectsIn(BaseModel):
    items: List[ProjectIn]


async def _create_project_and_client(doc_in: dict, actor: dict) -> dict:
    doc = dict(doc_in)
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    doc["archived"] = False
    doc["tenant_key"] = (doc.get("company_name") or "").strip().lower()
    # Auto-generate client credential if PIC email provided and not already existing
    email = (doc.get("email") or "").strip().lower()
    if email:
        existing = await db.users.find_one({"email": email})
        if not existing:
            pwd = gen_password(10)
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid,
                "email": email,
                "name": doc.get("pic_name") or doc.get("company_name") or email,
                "role": "client",
                "password_hash": hash_pw(pwd),
                "tenant_company": doc.get("company_name") or "",
                "created_at": now_iso(),
            })
            await db.client_credentials.insert_one({
                "id": str(uuid.uuid4()),
                "project_id": doc["id"],
                "user_id": uid,
                "email": email,
                "password": pwd,
                "tenant_company": doc.get("company_name") or "",
                "created_at": now_iso(),
                "created_by": actor.get("email"),
            })
            doc["client_user_id"] = uid
            doc["client_credential_generated"] = True
        else:
            doc["client_user_id"] = existing["id"]
            doc["client_credential_generated"] = False
            # Ensure existing user tenant_company is set (first tenant wins if empty)
            if not existing.get("tenant_company"):
                await db.users.update_one({"id": existing["id"]}, {"$set": {"tenant_company": doc.get("company_name") or ""}})
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/projects/bulk")
async def bulk_projects(payload: BulkProjectsIn, user=Depends(require_perm("Project", "Write"))):
    created = []
    for p in payload.items:
        d = await _create_project_and_client(p.model_dump(), user)
        created.append(d)
    await audit(user, "bulk_create", "project", f"batch:{len(created)}", None, {"count": len(created)})
    return {"created": len(created), "items": created}


@api.post("/projects")
async def create_project(payload: ProjectIn, user=Depends(require_perm("Project", "Write"))):
    doc = await _create_project_and_client(payload.model_dump(), user)
    await audit(user, "create", "project", doc["id"], None, doc)
    return doc


@api.put("/projects/{pid}")
async def update_project(pid: str, payload: ProjectIn, user=Depends(require_perm("Project", "Write"))):
    before = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Not found")
    upd = payload.model_dump()
    upd["updated_at"] = now_iso()
    upd["tenant_key"] = (upd.get("company_name") or "").strip().lower()
    await db.projects.update_one({"id": pid}, {"$set": upd})
    after = await db.projects.find_one({"id": pid}, {"_id": 0})
    await audit(user, "update", "project", pid, before, after)
    return after


@api.delete("/projects/{pid}")
async def delete_project(pid: str, user=Depends(require_perm("Project", "Delete"))):
    before = await db.projects.find_one({"id": pid}, {"_id": 0})
    await db.projects.delete_one({"id": pid})
    await audit(user, "delete", "project", pid, before, None)
    return {"ok": True}


@api.get("/projects/{pid}/credentials")
async def get_project_credentials(pid: str, user=Depends(require_role("super_admin"))):
    cred = await db.client_credentials.find_one({"project_id": pid}, {"_id": 0})
    if not cred:
        # Try lookup by user email match (project with same PIC email)
        proj = await db.projects.find_one({"id": pid}, {"_id": 0})
        if proj and proj.get("email"):
            cred = await db.client_credentials.find_one({"email": (proj.get("email") or "").lower()}, {"_id": 0})
    if not cred:
        raise HTTPException(404, "Belum ada kredensial klien untuk project ini")
    return cred


@api.post("/projects/{pid}/regenerate-credentials")
async def regenerate_credentials(pid: str, user=Depends(require_role("super_admin"))):
    proj = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    email = (proj.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "Project belum punya email PIC")
    pwd = gen_password(10)
    u = await db.users.find_one({"email": email})
    if not u:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": email, "name": proj.get("pic_name") or email,
            "role": "client", "password_hash": hash_pw(pwd),
            "tenant_company": proj.get("company_name") or "", "created_at": now_iso(),
        })
    else:
        uid = u["id"]
        await db.users.update_one({"id": uid}, {"$set": {"password_hash": hash_pw(pwd)}})
    await db.client_credentials.update_one(
        {"project_id": pid},
        {"$set": {
            "id": str(uuid.uuid4()), "project_id": pid, "user_id": uid,
            "email": email, "password": pwd,
            "tenant_company": proj.get("company_name") or "",
            "created_at": now_iso(), "created_by": user.get("email"),
        }},
        upsert=True,
    )
    await audit(user, "regenerate_credential", "project", pid, None, {"email": email})
    return {"ok": True, "email": email, "password": pwd}


# ------------ Candidates ------------
@api.get("/candidates")
async def list_candidates(user=Depends(require_perm("Candidate", "Read"))):
    query = {}
    if user["role"] == "client":
        t = tenant_of(user)
        if not t:
            return []
        # Match client_company (case-insensitive)
        query = {"client_company": {"$regex": f"^{re.escape(t)}$", "$options": "i"}}
    items = await db.candidates.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    for c in items:
        entries = await db.progress_entries.find({"candidate_id": c["id"]}, {"_id": 0}).to_list(1000)
        c["progress_entries"] = entries
        c["achieved"] = sum(e["amount"] for e in entries if e.get("stage") == c.get("stage"))
    return items


@api.post("/candidates")
async def create_candidate(payload: CandidateIn, user=Depends(require_perm("Candidate", "Write"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    doc["tenant_key"] = (doc.get("client_company") or "").strip().lower()
    await db.candidates.insert_one(doc)
    await audit(user, "create", "candidate", doc["id"], None, doc)
    doc.pop("_id", None)
    return doc


@api.put("/candidates/{cid}")
async def update_candidate(cid: str, payload: CandidateIn, user=Depends(require_perm("Candidate", "Write"))):
    before = await db.candidates.find_one({"id": cid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Not found")
    upd = payload.model_dump()
    upd["updated_at"] = now_iso()
    upd["tenant_key"] = (upd.get("client_company") or "").strip().lower()
    await db.candidates.update_one({"id": cid}, {"$set": upd})
    after = await db.candidates.find_one({"id": cid}, {"_id": 0})
    await audit(user, "update", "candidate", cid, before, after)
    return after


@api.delete("/candidates/{cid}")
async def delete_candidate(cid: str, user=Depends(require_perm("Candidate", "Delete"))):
    before = await db.candidates.find_one({"id": cid}, {"_id": 0})
    await db.candidates.delete_one({"id": cid})
    await db.progress_entries.delete_many({"candidate_id": cid})
    await audit(user, "delete", "candidate", cid, before, None)
    return {"ok": True}


@api.post("/candidates/{cid}/progress")
async def add_progress(cid: str, payload: ProgressEntry, user=Depends(require_perm("Candidate", "Write"))):
    cand = await db.candidates.find_one({"id": cid}, {"_id": 0})
    if not cand:
        raise HTTPException(404, "Candidate not found")
    entry = payload.model_dump()
    entry["id"] = str(uuid.uuid4())
    entry["candidate_id"] = cid
    entry["stage"] = cand.get("stage", "OJT")
    entry["created_at"] = now_iso()
    await db.progress_entries.insert_one(entry)
    entry.pop("_id", None)
    return entry


# ------------ Invoices ------------
async def next_invoice_no() -> str:
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    prefix = settings.get("invoice_prefix", "INV/LCH")
    now = datetime.now(timezone.utc)
    y = now.strftime("%Y")
    m = now.strftime("%m")
    count = await db.invoices.count_documents({}) + 1
    return f"{prefix}/{y}/{m}/{count:03d}"


@api.get("/invoices")
async def list_invoices(user=Depends(require_perm("Billing", "Read"))):
    query = {}
    if user["role"] == "client":
        t = tenant_of(user)
        if not t:
            return []
        query = {"$or": [
            {"client_company": {"$regex": f"^{re.escape(t)}$", "$options": "i"}},
            {"client_email": user["email"]},
        ]}
    items = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.post("/invoices")
async def create_invoice(payload: InvoiceIn, user=Depends(require_perm("Billing", "Write"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["invoice_no"] = await next_invoice_no()
    doc["tenant_key"] = (doc.get("client_company") or "").strip().lower()
    subtotal = sum(i["qty"] * i["unit_price"] for i in doc["items"])
    tax = subtotal * (doc["tax_percent"] / 100.0)
    doc["subtotal"] = subtotal
    doc["tax"] = tax
    doc["tax_amount"] = tax
    doc["total"] = subtotal + tax
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.invoices.insert_one(doc)
    await audit(user, "create", "invoice", doc["id"], None, doc)
    doc.pop("_id", None)
    return doc


@api.put("/invoices/{iid}")
async def update_invoice(iid: str, payload: InvoiceIn, user=Depends(require_perm("Billing", "Write"))):
    before = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Not found")
    doc = payload.model_dump()
    doc["tenant_key"] = (doc.get("client_company") or "").strip().lower()
    subtotal = sum(i["qty"] * i["unit_price"] for i in doc["items"])
    doc["subtotal"] = subtotal
    doc["tax"] = subtotal * (doc["tax_percent"] / 100.0)
    doc["tax_amount"] = doc["tax"]
    doc["total"] = doc["subtotal"] + doc["tax"]
    doc["updated_at"] = now_iso()
    await db.invoices.update_one({"id": iid}, {"$set": doc})
    after = await db.invoices.find_one({"id": iid}, {"_id": 0})
    await audit(user, "update", "invoice", iid, before, after)
    return after


@api.delete("/invoices/{iid}")
async def delete_invoice(iid: str, user=Depends(require_perm("Billing", "Delete"))):
    before = await db.invoices.find_one({"id": iid}, {"_id": 0})
    await db.invoices.delete_one({"id": iid})
    await audit(user, "delete", "invoice", iid, before, None)
    return {"ok": True}


def _invoice_email_html(inv: dict, settings: dict) -> str:
    company = escape(settings.get("company_name") or "PT. Linchub Network Indonesia")
    inv_no = escape(inv.get("invoice_no", ""))
    client = escape(inv.get("client_company", ""))
    pic = escape(inv.get("client_pic", "") or "")
    total = f"Rp {int(inv.get('total', 0)):,}".replace(",", ".")
    due = escape(inv.get("due_date", ""))
    issue = escape(inv.get("issue_date", ""))
    items_rows = ""
    for i in inv.get("items", []):
        line = int((i.get("qty") or 0) * (i.get("unit_price") or 0))
        items_rows += (
            f'<tr><td style="padding:8px 6px;border-bottom:1px solid #D9D2BF;font-size:13px">{escape(i.get("description", ""))}</td>'
            f'<td style="padding:8px 6px;border-bottom:1px solid #D9D2BF;font-size:13px;text-align:right">{i.get("qty")}</td>'
            f'<td style="padding:8px 6px;border-bottom:1px solid #D9D2BF;font-size:13px;text-align:right">Rp {int(i.get("unit_price", 0)):,}</td>'
            f'<td style="padding:8px 6px;border-bottom:1px solid #D9D2BF;font-size:13px;text-align:right">Rp {line:,}</td></tr>'
        ).replace(",", ".")
    return (
        f'<table role="presentation" width="100%" style="background:#FAF6EE;padding:24px;font-family:Georgia,serif;color:#1B1B1F">'
        f'<tr><td style="max-width:640px;margin:auto;display:block">'
        f'<h2 style="font-weight:400;font-size:22px;margin:0 0 4px">{company}</h2>'
        f'<div style="font-family:Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;font-size:11px;color:#6B6B6F">Invoice · {inv_no}</div>'
        f'<p style="font-size:14px;margin-top:20px">Halo {pic or client},</p>'
        f'<p style="font-size:14px;line-height:1.6">Terlampir ringkasan invoice <strong>{inv_no}</strong> untuk <strong>{client}</strong>.<br/>Diterbitkan {issue}, jatuh tempo <strong>{due}</strong>.</p>'
        f'<table role="presentation" width="100%" style="border-collapse:collapse;margin-top:16px">'
        f'<thead><tr>'
        f'<th style="text-align:left;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6F;padding:8px 6px;border-bottom:1px solid #1B1B1F">Deskripsi</th>'
        f'<th style="text-align:right;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6F;padding:8px 6px;border-bottom:1px solid #1B1B1F">QTY</th>'
        f'<th style="text-align:right;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6F;padding:8px 6px;border-bottom:1px solid #1B1B1F">Harga</th>'
        f'<th style="text-align:right;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6F;padding:8px 6px;border-bottom:1px solid #1B1B1F">Subtotal</th>'
        f'</tr></thead><tbody>{items_rows}</tbody></table>'
        f'<p style="text-align:right;font-size:18px;margin-top:16px"><strong>Total: {total}</strong></p>'
        f'<p style="font-size:12px;color:#6B6B6F;margin-top:32px">Untuk pertanyaan atau konfirmasi pembayaran, silakan balas email ini.</p>'
        f'<p style="font-size:11px;color:#888;margin-top:24px">Dikirim oleh {company}. Kami tidak pernah meminta password atau data kartu Anda melalui email.</p>'
        f'</td></tr></table>'
    )


@api.post("/invoices/{iid}/send")
async def send_invoice(iid: str, user=Depends(require_role("super_admin", "karyawan"))):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    to = (inv.get("client_email") or "").strip()
    if not to:
        raise HTTPException(400, "Client email tidak ada di invoice ini")
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    subject = f"Invoice {inv['invoice_no']} · {settings.get('company_name') or 'Linchub'}"
    html = _invoice_email_html(inv, settings)
    email_id = await send_email(to=to, subject=subject, html=html)
    await db.invoices.update_one(
        {"id": iid},
        {"$set": {"status": "Sent", "sent_at": now_iso(), "email_id": email_id, "sent_to": to}},
    )
    after = await db.invoices.find_one({"id": iid}, {"_id": 0})
    await audit(user, "send", "invoice", iid, inv, after)
    return {"ok": True, "email_id": email_id, "sent_to": to, "invoice": after}


# ------------ Settings ------------
@api.get("/settings")
async def get_settings(user=Depends(require_perm("Settings", "Read"))):
    s = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not s:
        s = {"id": "global", **SettingsIn().model_dump()}
        await db.settings.insert_one(s)
        s.pop("_id", None)
    return s


@api.put("/settings")
async def save_settings(payload: SettingsIn, user=Depends(require_perm("Settings", "Write"))):
    before = await db.settings.find_one({"id": "global"}, {"_id": 0})
    doc = payload.model_dump()
    doc["id"] = "global"
    doc["updated_at"] = now_iso()
    await db.settings.update_one({"id": "global"}, {"$set": doc}, upsert=True)
    after = await db.settings.find_one({"id": "global"}, {"_id": 0})
    await audit(user, "update", "settings", "global", before, after)
    return after


# ------------ Audit Logs ------------
@api.get("/audit-logs")
async def get_logs(user=Depends(require_role("super_admin"))):
    items = await db.audit_logs.find({}, {"_id": 0}).sort("at", -1).limit(500).to_list(500)
    return jsonable_encoder([sanitize(i) for i in items])


# ------------ Analytics ------------
@api.get("/analytics/overview")
async def analytics_overview(user=Depends(require_perm("Analyst", "Read"))):
    projects = await db.projects.find({}, {"_id": 0}).to_list(2000)
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(2000)
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(2000)

    active_projects = len([p for p in projects if p.get("stage") != "Closed/Deal"])
    closed_projects = len([p for p in projects if p.get("stage") == "Closed/Deal"])
    conversion = round((closed_projects / len(projects) * 100) if projects else 0, 1)
    hired = len([c for c in candidates if c.get("stage") == "PKWT"])

    paid_total = sum(i.get("total", 0) for i in invoices if i.get("status") == "Paid")
    pending_total = sum(i.get("total", 0) for i in invoices if i.get("status") in ("Sent", "Draft"))
    overdue_total = sum(i.get("total", 0) for i in invoices if i.get("status") == "Overdue")

    funnel = {
        "sourced": len(candidates),
        "interview": len([c for c in candidates if c.get("stage") == "INTERVIEW"]),
        "ojt": len([c for c in candidates if c.get("stage") == "OJT"]),
        "passed": len([c for c in candidates if c.get("stage") == "PKWT"]),
    }
    lead_stages = {}
    for p in projects:
        s = p.get("stage", "Contacted")
        lead_stages[s] = lead_stages.get(s, 0) + 1

    return {
        "active_projects": active_projects,
        "total_projects": len(projects),
        "conversion_rate": conversion,
        "hired_candidates": hired,
        "total_candidates": len(candidates),
        "mrr": paid_total,
        "paid_total": paid_total,
        "pending_total": pending_total,
        "overdue_total": overdue_total,
        "funnel": funnel,
        "lead_stages": lead_stages,
    }


# ------------ Health ------------
@api.get("/")
async def root():
    return {"service": "LINCHUB SaaS", "status": "ok"}


# ------------ Startup ------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.projects.create_index("id", unique=True)
    await db.candidates.create_index("id", unique=True)
    await db.invoices.create_index("id", unique=True)
    await db.audit_logs.create_index("at")

    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": ADMIN_EMAIL,
                "name": "Lidiya Pratamy",
                "role": "super_admin",
                "password_hash": hash_pw(ADMIN_PASSWORD),
                "created_at": now_iso(),
            }
        )
        logger.info(f"Seeded super_admin: {ADMIN_EMAIL}")

    # Sample karyawan + client (idempotent)
    for email, name, role, pw in [
        ("karyawan@linchub.id", "Recruiter Staff", "karyawan", "STAFF123"),
        ("client@linchub.id", "Client Demo", "client", "CLIENT123"),
    ]:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "email": email,
                    "name": name,
                    "role": role,
                    "password_hash": hash_pw(pw),
                    "created_at": now_iso(),
                }
            )


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
