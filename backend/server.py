from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os
from starlette.middleware.cors import CORSMiddleware
from config import config
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union, Dict, Any
import uuid
import shutil
from jose import JWTError, jwt
from PIL import Image, ImageDraw, ImageFont
import fitz
from io import BytesIO, StringIO
import tempfile
import io
import zipfile
import json
import asyncio
import re
import smtplib
import urllib.request as urllib_request
import urllib.error as urllib_error
from types import SimpleNamespace
import qrcode
import base64
from email.message import EmailMessage
from email.utils import formataddr
from collections import Counter, defaultdict


# Import database
from database import (
    get_db, Admin, School, PasswordResetToken, SchoolPasswordResetOTP, ActivityLog, Resource, 
    Announcement, AnnouncementRead, SupportTicket, ChatMessage, ResourceDownload, 
    KnowledgeArticle, SchoolLogoPosition, SchoolWatermarkText, engine, Base, AdminResourceWatermark,
    AdminBatchWatermarkTemplate, SchoolSearchLog
)
from init_db import init_database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
load_dotenv(ROOT_DIR.parent / '.env')

# Initialize database on startup
try:
    init_database()
except Exception as e:
    print(f"Database initialization error: {e}")

# JWT Configuration
# Use environment variable or secure default from .env file
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    # Fallback to reading from .env file
    SECRET_KEY = 'wonder-library-secret-key-2024-production-secure-token-koshquest'

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/login")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads" / "school_logos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Create resources upload directory
RESOURCES_UPLOAD_DIR = ROOT_DIR / "uploads" / "resources"
RESOURCES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Create output directory for generated admin batch watermark bundles
BATCH_WATERMARK_OUTPUT_DIR = ROOT_DIR / "generated" / "batch_watermark_jobs"
BATCH_WATERMARK_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Mount static files for uploaded images
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

# Also serve uploads through /api/uploads for proper routing
app.mount("/api/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="api_uploads")

# Mount public directory for static files like QR code images
app.mount("/public", StaticFiles(directory=str(ROOT_DIR / "public")), name="public")

# Pydantic Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    email: str
    name: Optional[str] = None
    school_id: Optional[str] = None
    logo_path: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    user_type: str  # 'admin' or 'school'

class SchoolForgotPasswordOtpRequest(BaseModel):
    mobile_number: str

class SchoolForgotPasswordOtpVerifyRequest(BaseModel):
    request_id: str
    mobile_number: str
    otp: str

class SchoolForgotPasswordResetRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str

class SchoolCreate(BaseModel):
    school_id: str
    school_name: str
    email: EmailStr
    password: str

class SchoolUpdate(BaseModel):
    school_name: Optional[str] = None
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None  # ADDED
    password: Optional[str] = None

class SchoolResponse(BaseModel):
    id: int
    school_id: str
    school_name: str
    email: str
    contact_number: Optional[str] = None  # ADDED
    logo_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ResourceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    class_level: Optional[str] = None
    tags: Optional[str] = None

class ResourceResponse(BaseModel):
    id: int
    resource_id: str
    name: str
    description: Optional[str] = None
    category: str
    file_path: str
    file_type: str
    file_size: int
    class_level: Optional[str] = None
    subject: Optional[str] = None
    sub_category: Optional[str] = None
    consent_to_share: Optional[str] = None
    tags: Optional[str] = None
    uploaded_by_type: str
    uploaded_by_id: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    approval_status: str
    download_count: int
    is_video_link: bool = False
    created_at: datetime
    updated_at: datetime

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = 'normal'
    target_schools: Optional[str] = None

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    priority: str
    target_schools: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    category: str
    priority: str = 'normal'

class SupportTicketResponse(BaseModel):
    id: int
    ticket_id: str
    school_id: str
    school_name: str
    subject: str
    message: str
    category: str
    priority: str
    status: str
    admin_response: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ChatMessageCreate(BaseModel):
    school_id: str
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    school_id: str
    school_name: str
    sender_type: str
    message: str
    is_read: bool
    created_at: datetime

class KnowledgeArticleCreate(BaseModel):
    title: str
    content: str
    category: str
    tags: Optional[str] = None

class KnowledgeArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    tags: Optional[str] = None
    view_count: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

class LogoPosition(BaseModel):
    resource_id: str
    x_position: int  # Percentage from left (0-100)
    y_position: int  # Percentage from top (0-100)
    width: int  # Width percentage (5-50)
    opacity: float  # Opacity (0.1-1.0)

class TextWatermarkPosition(BaseModel):
    resource_id: str
    # School name position
    name_x: int
    name_y: int
    name_size: int
    name_opacity: float
    # Contact info position
    contact_x: int
    contact_y: int
    contact_size: int
    contact_opacity: float

class WatermarkPosition(BaseModel):
    logo_x: int = 50
    logo_y: int = 10
    logo_width: int = 20
    logo_opacity: float = 1.0
    logo_rotation: int = 0
    school_name_x: int = 50
    school_name_y: int = 20
    school_name_size: int = 16
    school_name_opacity: float = 0.9
    contact_x: int = 50
    contact_y: int = 90
    contact_size: int = 12
    contact_opacity: float = 1.0

class BatchWatermarkRequest(BaseModel):
    resource_id: str
    school_ids: Union[str, List[str]]  # 'all' or list of school IDs
    positions: WatermarkPosition

class SaveTemplateRequest(BaseModel):
    admin_id: str
    resource_id: str
    positions: WatermarkPosition
    is_for_all: bool = False

class AdminBatchWatermarkTemplateRequest(BaseModel):
    resource_id: str
    template: Dict[str, Any]

class AdminBatchWatermarkGenerateRequest(BaseModel):
    school_ids: List[str]
    resource_ids: List[str]
    templates: Dict[str, Dict[str, Any]] = {}

class SchoolAnalyticsEventRequest(BaseModel):
    school_id: str
    school_name: str
    activity_type: str
    details: Optional[Dict[str, Any]] = None

class SchoolSearchEventRequest(BaseModel):
    school_id: str
    school_name: str
    query: str
    results_count: int = 0
    category: Optional[str] = None
    sub_category: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

class SchoolLogoutRequest(BaseModel):
    school_id: str
    school_name: str

class AnnouncementReadRequest(BaseModel):
    school_id: str
    announcement_ids: Optional[List[int]] = None

class AdminBatchWatermarkDownloadRequest(BaseModel):
    job_id: str
    school_ids: List[str] = []

class AdminBatchWatermarkEmailItem(BaseModel):
    school_id: str
    subject: str
    message: str

class AdminBatchWatermarkEmailRequest(BaseModel):
    job_id: str
    emails: List[AdminBatchWatermarkEmailItem]


# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def parse_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in ("true", "1", "yes", "y", "on"):
        return True
    if text in ("false", "0", "no", "n", "off"):
        return False
    return default

def normalize_indian_mobile_number(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    digits = re.sub(r"\D", "", str(value))
    if not digits:
        return None

    if len(digits) == 10:
        digits = f"91{digits}"
    elif len(digits) == 11 and digits.startswith("0"):
        digits = f"91{digits[1:]}"
    elif len(digits) == 12 and digits.startswith("91"):
        pass
    else:
        return None

    local_number = digits[-10:]
    if len(local_number) != 10:
        return None

    return f"+{digits}"

def to_brevo_sms_recipient(value: str) -> str:
    return re.sub(r"\D", "", value or "")

def mask_mobile_number(value: Optional[str]) -> str:
    normalized = normalize_indian_mobile_number(value)
    if not normalized:
        return "Unavailable"
    digits = re.sub(r"\D", "", normalized)
    return f"+{digits[:2]} ******{digits[-4:]}"

def generate_numeric_otp(length: int = 6) -> str:
    numeric_length = max(4, int(length))
    return str(uuid.uuid4().int % (10 ** numeric_length)).zfill(numeric_length)

def generate_secure_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex[:8]

def validate_school_password(password: str, confirm_password: Optional[str] = None) -> Optional[str]:
    if not password or len(password) < 8:
        return "Password must be at least 8 characters long"
    if confirm_password is not None and password != confirm_password:
        return "New password and confirm password do not match"
    return None

def find_school_by_mobile_number(db: Session, mobile_number: str) -> Optional[School]:
    normalized_target = normalize_indian_mobile_number(mobile_number)
    if not normalized_target:
        return None

    candidate_schools = db.query(School).filter(School.contact_number.isnot(None)).all()
    for school in candidate_schools:
        if normalize_indian_mobile_number(school.contact_number) == normalized_target:
            return school
    return None

def is_image_type(file_type: str, file_path: str = "") -> bool:
    """Check if a file is an image based on mime type or extension."""
    file_type = (file_type or "").lower()
    file_path = (file_path or "").lower()
    if "image" in file_type:
        return True
    image_exts = (".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".svg")
    return file_path.endswith(image_exts)

def image_bytes_to_pdf_bytes(image_path: str) -> bytes:
    """Convert an image file to PDF bytes."""
    img = Image.open(image_path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    pdf_buffer = io.BytesIO()
    img.save(pdf_buffer, format="PDF")
    pdf_buffer.seek(0)
    return pdf_buffer.read()

def clamp(value, min_value, max_value):
    try:
        value = float(value)
    except Exception:
        return min_value
    return max(min_value, min(max_value, value))

def normalize_rotation(value):
    try:
        rotation = int(float(value))
    except Exception:
        return 0
    rotation = rotation % 360
    return rotation

def hex_to_rgb(color_hex: str, default="#000000"):
    if not color_hex:
        color_hex = default
    color_hex = color_hex.strip()
    if not color_hex.startswith("#"):
        color_hex = "#" + color_hex
    if len(color_hex) == 4:
        color_hex = "#" + "".join([c * 2 for c in color_hex[1:]])
    if len(color_hex) != 7:
        color_hex = default
    try:
        r = int(color_hex[1:3], 16)
        g = int(color_hex[3:5], 16)
        b = int(color_hex[5:7], 16)
        return (r, g, b)
    except Exception:
        return (0, 0, 0)

def normalize_hex_color(color_hex: str, default="#000000"):
    if not color_hex:
        return default
    color_hex = color_hex.strip()
    if not color_hex.startswith("#"):
        color_hex = "#" + color_hex
    if len(color_hex) == 4:
        color_hex = "#" + "".join([c * 2 for c in color_hex[1:]])
    if len(color_hex) != 7:
        return default
    try:
        int(color_hex[1:3], 16)
        int(color_hex[3:5], 16)
        int(color_hex[5:7], 16)
        return color_hex.lower()
    except Exception:
        return default

def hex_to_rgb_float(color_hex: str, default="#000000"):
    r, g, b = hex_to_rgb(color_hex, default=default)
    return (r / 255.0, g / 255.0, b / 255.0)

def resolve_pil_font(font_name: str, font_style: str, size: int):
    from PIL import ImageFont

    name = (font_name or "Arial").strip().lower()
    style = (font_style or "normal").strip().lower()

    candidates = []
    if "arial" in name:
        if "bold" in style and "italic" in style:
            candidates += ["arialbi.ttf", "Arial Bold Italic.ttf", "C:\\Windows\\Fonts\\arialbi.ttf"]
        elif "bold" in style:
            candidates += ["arialbd.ttf", "Arial Bold.ttf", "C:\\Windows\\Fonts\\arialbd.ttf"]
        elif "italic" in style:
            candidates += ["ariali.ttf", "Arial Italic.ttf", "C:\\Windows\\Fonts\\ariali.ttf"]
        else:
            candidates += ["arial.ttf", "Arial.ttf", "C:\\Windows\\Fonts\\arial.ttf"]
    elif "times" in name:
        if "bold" in style and "italic" in style:
            candidates += ["timesbi.ttf", "Times New Roman Bold Italic.ttf", "C:\\Windows\\Fonts\\timesbi.ttf"]
        elif "bold" in style:
            candidates += ["timesbd.ttf", "Times New Roman Bold.ttf", "C:\\Windows\\Fonts\\timesbd.ttf"]
        elif "italic" in style:
            candidates += ["timesi.ttf", "Times New Roman Italic.ttf", "C:\\Windows\\Fonts\\timesi.ttf"]
        else:
            candidates += ["times.ttf", "Times New Roman.ttf", "C:\\Windows\\Fonts\\times.ttf"]
    elif "helvetica" in name:
        candidates += ["Helvetica.ttf", "C:\\Windows\\Fonts\\Helvetica.ttf"]
    elif "georgia" in name:
        if "bold" in style and "italic" in style:
            candidates += ["georgiaz.ttf", "C:\\Windows\\Fonts\\georgiaz.ttf"]
        elif "bold" in style:
            candidates += ["georgiab.ttf", "C:\\Windows\\Fonts\\georgiab.ttf"]
        elif "italic" in style:
            candidates += ["georgiai.ttf", "C:\\Windows\\Fonts\\georgiai.ttf"]
        else:
            candidates += ["georgia.ttf", "C:\\Windows\\Fonts\\georgia.ttf"]
    elif "verdana" in name:
        if "bold" in style and "italic" in style:
            candidates += ["verdanaz.ttf", "C:\\Windows\\Fonts\\verdanaz.ttf"]
        elif "bold" in style:
            candidates += ["verdanab.ttf", "C:\\Windows\\Fonts\\verdanab.ttf"]
        elif "italic" in style:
            candidates += ["verdanai.ttf", "C:\\Windows\\Fonts\\verdanai.ttf"]
        else:
            candidates += ["verdana.ttf", "C:\\Windows\\Fonts\\verdana.ttf"]
    elif "courier" in name:
        if "bold" in style and "italic" in style:
            candidates += ["courbi.ttf", "Courier New Bold Italic.ttf", "C:\\Windows\\Fonts\\courbi.ttf"]
        elif "bold" in style:
            candidates += ["courbd.ttf", "Courier New Bold.ttf", "C:\\Windows\\Fonts\\courbd.ttf"]
        elif "italic" in style:
            candidates += ["couri.ttf", "Courier New Italic.ttf", "C:\\Windows\\Fonts\\couri.ttf"]
        else:
            candidates += ["cour.ttf", "Courier New.ttf", "C:\\Windows\\Fonts\\cour.ttf"]

    # Common Linux fallbacks
    candidates += [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if "bold" in style else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if "bold" in style else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf" if "bold" in style else "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf"
    ]

    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue

    return ImageFont.load_default()

def resolve_pdf_font(font_name: str, font_style: str):
    name = (font_name or "Arial").strip().lower()
    style = (font_style or "normal").strip().lower()

    fontfile_candidates = []
    if "arial" in name:
        if "bold" in style and "italic" in style:
            fontfile_candidates += ["arialbi.ttf", "C:\\Windows\\Fonts\\arialbi.ttf"]
        elif "bold" in style:
            fontfile_candidates += ["arialbd.ttf", "C:\\Windows\\Fonts\\arialbd.ttf"]
        elif "italic" in style:
            fontfile_candidates += ["ariali.ttf", "C:\\Windows\\Fonts\\ariali.ttf"]
        else:
            fontfile_candidates += ["arial.ttf", "C:\\Windows\\Fonts\\arial.ttf"]
    elif "times" in name:
        if "bold" in style and "italic" in style:
            fontfile_candidates += ["timesbi.ttf", "C:\\Windows\\Fonts\\timesbi.ttf"]
        elif "bold" in style:
            fontfile_candidates += ["timesbd.ttf", "C:\\Windows\\Fonts\\timesbd.ttf"]
        elif "italic" in style:
            fontfile_candidates += ["timesi.ttf", "C:\\Windows\\Fonts\\timesi.ttf"]
        else:
            fontfile_candidates += ["times.ttf", "C:\\Windows\\Fonts\\times.ttf"]
    elif "helvetica" in name:
        fontfile_candidates += ["Helvetica.ttf", "C:\\Windows\\Fonts\\Helvetica.ttf"]
    elif "georgia" in name:
        if "bold" in style and "italic" in style:
            fontfile_candidates += ["georgiaz.ttf", "C:\\Windows\\Fonts\\georgiaz.ttf"]
        elif "bold" in style:
            fontfile_candidates += ["georgiab.ttf", "C:\\Windows\\Fonts\\georgiab.ttf"]
        elif "italic" in style:
            fontfile_candidates += ["georgiai.ttf", "C:\\Windows\\Fonts\\georgiai.ttf"]
        else:
            fontfile_candidates += ["georgia.ttf", "C:\\Windows\\Fonts\\georgia.ttf"]
    elif "verdana" in name:
        if "bold" in style and "italic" in style:
            fontfile_candidates += ["verdanaz.ttf", "C:\\Windows\\Fonts\\verdanaz.ttf"]
        elif "bold" in style:
            fontfile_candidates += ["verdanab.ttf", "C:\\Windows\\Fonts\\verdanab.ttf"]
        elif "italic" in style:
            fontfile_candidates += ["verdanai.ttf", "C:\\Windows\\Fonts\\verdanai.ttf"]
        else:
            fontfile_candidates += ["verdana.ttf", "C:\\Windows\\Fonts\\verdana.ttf"]
    elif "courier" in name:
        if "bold" in style and "italic" in style:
            fontfile_candidates += ["courbi.ttf", "C:\\Windows\\Fonts\\courbi.ttf"]
        elif "bold" in style:
            fontfile_candidates += ["courbd.ttf", "C:\\Windows\\Fonts\\courbd.ttf"]
        elif "italic" in style:
            fontfile_candidates += ["couri.ttf", "C:\\Windows\\Fonts\\couri.ttf"]
        else:
            fontfile_candidates += ["cour.ttf", "C:\\Windows\\Fonts\\cour.ttf"]

    fontfile_candidates += [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if "bold" in style else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if "bold" in style else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf" if "bold" in style else "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf"
    ]

    for path in fontfile_candidates:
        if os.path.exists(path):
            return ("helv", path)

    if "bold" in style and "italic" in style:
        return ("helvBI", None)
    if "bold" in style:
        return ("helvB", None)
    if "italic" in style:
        return ("helvI", None)
    return ("helv", None)

# Authentication dependencies
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    return payload

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )
    return current_user

def serialize_activity_details(details: Optional[Union[Dict[str, Any], List[Any], str]]) -> Optional[str]:
    if details is None:
        return None
    if isinstance(details, str):
        return details
    try:
        return json.dumps(details)
    except Exception:
        return str(details)

def parse_activity_details(details: Optional[str]) -> Optional[Dict[str, Any]]:
    if not details:
        return None

    try:
        parsed = json.loads(details)
        if isinstance(parsed, dict):
            return parsed
        return {"value": parsed}
    except Exception:
        return {"message": details}

def record_activity(
    db: Session,
    school_id: str,
    school_name: str,
    activity_type: str,
    details: Optional[Union[Dict[str, Any], List[Any], str]] = None
) -> ActivityLog:
    activity = ActivityLog(
        school_id=school_id,
        school_name=school_name,
        activity_type=activity_type,
        details=serialize_activity_details(details)
    )
    db.add(activity)
    return activity

def humanize_route_name(path: str) -> str:
    if not path:
        return "Unknown"

    normalized = path.rstrip("/") or "/"
    route_map = {
        "/school": "Dashboard Home",
        "/school/dashboard": "Dashboard Home",
        "/school/resources": "All Resources",
        "/school/resources/my-uploads": "My Uploads",
        "/school/communication/announcements": "Announcements",
        "/school/communication/chat": "Chat with Admin",
        "/school/support/tickets": "Support Tickets",
        "/school/reports": "Usage Reports",
        "/school/settings": "Settings"
    }

    if normalized in route_map:
        return route_map[normalized]

    if normalized.startswith("/school/resources/"):
        parts = normalized.split("/")
        category = parts[3] if len(parts) > 3 else "resources"
        sub_category = parts[4] if len(parts) > 4 else None
        label = f"{category.replace('-', ' ').title()} Resources"
        if sub_category:
            label = f"{label} / {sub_category.replace('-', ' ').title()}"
        return label

    return normalized.replace("/school/", "").replace("-", " ").title()

def build_activity_title(activity_type: str, details: Optional[Dict[str, Any]] = None) -> str:
    details = details or {}

    if activity_type == "login":
        return "Logged in"
    if activity_type == "logout":
        return "Logged out"
    if activity_type == "page_visit":
        return f"Opened {details.get('page_label') or humanize_route_name(details.get('path') or '')}"
    if activity_type == "resource_search":
        query = details.get("query") or "search"
        return f'Searched "{query}"'
    if activity_type == "resource_preview":
        return f"Previewed {details.get('resource_name') or 'resource'}"
    if activity_type == "resource_download":
        return f"Downloaded {details.get('resource_name') or 'resource'}"
    if activity_type == "resource_upload":
        return f"Uploaded {details.get('resource_name') or 'resource'}"
    if activity_type == "support_ticket_created":
        return f"Created ticket {details.get('ticket_id') or ''}".strip()
    if activity_type == "chat_message_sent":
        return "Sent a chat message"
    if activity_type == "password_reset":
        return "Reset password"

    return activity_type.replace("_", " ").title()

def build_activity_description(activity_type: str, details: Optional[Dict[str, Any]] = None) -> str:
    details = details or {}

    if activity_type == "login":
        return "School logged in successfully."
    if activity_type == "logout":
        return "School logged out."
    if activity_type == "page_visit":
        path = details.get("path") or ""
        return f"Visited {details.get('page_label') or humanize_route_name(path)}."
    if activity_type == "resource_search":
        query = details.get("query") or ""
        results = details.get("results_count", 0)
        return f'Search query "{query}" returned {results} result(s).'
    if activity_type == "resource_preview":
        return f"Previewed {details.get('resource_name') or 'a resource'}."
    if activity_type == "resource_download":
        branded = "branded " if details.get("branded") else ""
        return f"Downloaded {branded}{details.get('resource_name') or 'a resource'}."
    if activity_type == "resource_upload":
        return f"Uploaded {details.get('resource_name') or 'a resource'} for approval."
    if activity_type == "support_ticket_created":
        return f"Created a {details.get('priority') or 'normal'} priority {details.get('category') or ''} support ticket.".replace("  ", " ").strip()
    if activity_type == "chat_message_sent":
        return "Sent a message to the admin."
    if activity_type == "password_reset":
        return "Password was reset successfully using mobile OTP verification."

    return details.get("message") or details.get("description") or "Activity recorded."

def announcement_targets_school(announcement: Announcement, school_id: str) -> bool:
    if not announcement.target_schools:
        return True

    targets = [item.strip() for item in str(announcement.target_schools).split(",") if item.strip()]
    return school_id in targets

def get_visible_school_announcements(db: Session, school_id: str) -> List[Announcement]:
    announcements = db.query(Announcement).filter(
        Announcement.is_active == True
    ).order_by(Announcement.created_at.desc()).all()

    return [announcement for announcement in announcements if announcement_targets_school(announcement, school_id)]

def get_unread_announcement_entries(db: Session, school_id: str) -> List[Announcement]:
    announcements = get_visible_school_announcements(db, school_id)
    if not announcements:
        return []

    announcement_ids = [announcement.id for announcement in announcements]
    read_ids = {
        entry.announcement_id
        for entry in db.query(AnnouncementRead).filter(
            AnnouncementRead.school_id == school_id,
            AnnouncementRead.announcement_id.in_(announcement_ids)
        ).all()
    }
    return [announcement for announcement in announcements if announcement.id not in read_ids]

def get_unread_school_ticket_updates(db: Session, school_id: str) -> List[SupportTicket]:
    tickets = db.query(SupportTicket).filter(
        SupportTicket.school_id == school_id,
        SupportTicket.admin_updated_at.isnot(None)
    ).order_by(SupportTicket.admin_updated_at.desc()).all()

    unread_tickets = []
    for ticket in tickets:
        if ticket.school_last_viewed_at is None or (
            ticket.admin_updated_at and ticket.admin_updated_at > ticket.school_last_viewed_at
        ):
            unread_tickets.append(ticket)

    return unread_tickets

def get_visible_school_resources_query(db: Session, school_id: str):
    return db.query(Resource).filter(
        (
            (Resource.uploaded_by_type == 'admin') & (Resource.approval_status == 'approved')
        ) |
        (
            (Resource.uploaded_by_id == school_id) &
            (
                (Resource.approval_status == 'approved') |
                (Resource.uploaded_by_type == 'school')
            )
        )
    )

def count_external_school_downloads(
    db: Session,
    school_id: str,
    cutoff: datetime
) -> int:
    activity_logs = db.query(ActivityLog).filter(
        ActivityLog.school_id == school_id,
        ActivityLog.activity_type == "resource_download",
        ActivityLog.timestamp >= cutoff
    ).all()

    count = 0
    for activity in activity_logs:
        details = parse_activity_details(activity.details) or {}
        if details.get("is_external_link"):
            count += 1
    return count

# Helper functions for watermarking
def get_full_file_path(file_path: str) -> str:
    """Get full file path from relative path"""
    # Clean the path
    file_path = file_path.lstrip('/')
    
    # Try direct path
    full_path = os.path.join(ROOT_DIR, file_path)
    if os.path.exists(full_path):
        return full_path
    
    # Try with uploads prefix if not already there
    if not file_path.startswith('uploads/'):
        full_path = os.path.join(ROOT_DIR, 'uploads', file_path)
        if os.path.exists(full_path):
            return full_path
    
    # Try in resources directory
    full_path = os.path.join(ROOT_DIR, 'uploads', 'resources', file_path)
    if os.path.exists(full_path):
        return full_path
    
    raise FileNotFoundError(f"File not found: {file_path}")

def get_school_logo_path(school: School) -> str:
    """Get school logo path"""
    if school.logo_path:
        # Clean the path
        logo_path = school.logo_path.lstrip('/')
        full_path = os.path.join(ROOT_DIR, logo_path)
        if os.path.exists(full_path):
            return full_path
        else:
            # Try alternative path with uploads
            alt_path = os.path.join(ROOT_DIR, 'uploads', logo_path)
            if os.path.exists(alt_path):
                return alt_path
    return None

def get_attr(obj, name: str, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)

def render_text_image(
    text: str,
    font_name: str,
    font_style: str,
    font_size: int,
    color_hex: str,
    opacity: float,
    rotation: int
) -> Image.Image:
    if not text:
        return None

    font_size = max(1, int(round(font_size)))
    font = resolve_pil_font(font_name, font_style, font_size)

    # Measure text
    temp = Image.new('RGBA', (1, 1), (255, 255, 255, 0))
    draw = ImageDraw.Draw(temp)
    try:
        bbox = draw.multiline_textbbox((0, 0), text, font=font, align='center')
    except Exception:
        bbox = draw.textbbox((0, 0), text, font=font)

    text_w = max(1, int(bbox[2] - bbox[0]))
    text_h = max(1, int(bbox[3] - bbox[1]))
    padding = max(2, int(font_size * 0.2))

    img = Image.new('RGBA', (text_w + padding * 2, text_h + padding * 2), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    r, g, b = hex_to_rgb(color_hex, default="#000000")
    alpha = int(255 * clamp(opacity, 0.0, 1.0))
    draw.multiline_text((padding, padding), text, font=font, fill=(r, g, b, alpha), align='center')

    rotation = normalize_rotation(rotation)
    rotation = (360 - rotation) % 360
    if rotation:
        img = img.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)

    return img

def add_watermark_to_pdf(pdf_path: str, school: School, positions: WatermarkPosition) -> str:
    """Add watermark to PDF with school info (logo + text)"""
    try:
        print(f"Adding watermark to PDF for school: {school.school_name}")

        logo_path = get_school_logo_path(school)
        school_info = {
            "school_name": school.school_name,
            "email": school.email,
            "contact_number": school.contact_number
        }

        text_position = {
            "name_x": positions.school_name_x,
            "name_y": positions.school_name_y,
            "name_size": positions.school_name_size,
            "name_opacity": positions.school_name_opacity,
            "name_rotation": 0,
            "name_font": "Arial",
            "name_style": "normal",
            "name_color": "#000000",
            "show_name": True,
            "contact_x": positions.contact_x,
            "contact_y": positions.contact_y,
            "contact_size": positions.contact_size,
            "contact_opacity": positions.contact_opacity,
            "contact_rotation": 0,
            "contact_font": "Arial",
            "contact_style": "normal",
            "contact_color": "#000000",
            "show_contact": True,
            "show_address": False
        }

        temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        output_path = temp_file.name
        temp_file.close()

        return add_logo_and_text_to_pdf(
            pdf_path,
            logo_path,
            positions,
            school_info,
            text_position,
            output_path
        )

    except Exception as e:
        print(f"Error adding watermark to PDF: {e}")
        import traceback
        traceback.print_exc()
        return None

def create_preview_image(resource: Resource, school: School, positions: WatermarkPosition) -> bytes:
    """Create preview image for non-PDF resources"""
    try:
        # Create a simple preview image
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw resource info
        try:
            font_large = ImageFont.truetype("arial.ttf", 24)
            font_medium = ImageFont.truetype("arial.ttf", 16)
            font_small = ImageFont.truetype("arial.ttf", 12)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Title
        draw.text((400, 50), "Watermark Preview", font=font_large, fill='black', anchor="mm")
        
        # Resource info
        draw.text((400, 100), f"Resource: {resource.name}", font=font_medium, fill='blue', anchor="mm")
        draw.text((400, 130), f"School: {school.school_name}", font=font_medium, fill='green', anchor="mm")
        
        # Draw document area
        doc_x1, doc_y1 = 100, 200
        doc_x2, doc_y2 = 700, 500
        draw.rectangle([doc_x1, doc_y1, doc_x2, doc_y2], outline='gray', width=2)
        draw.text((400, 180), "Document Area", font=font_small, fill='gray', anchor="mm")
        
        # Calculate positions within document area
        doc_width = doc_x2 - doc_x1
        doc_height = doc_y2 - doc_y1
        
        # Draw logo position
        logo_x = doc_x1 + (doc_width * positions.logo_x / 100)
        logo_y = doc_y1 + (doc_height * positions.logo_y / 100)
        logo_size = 30 * positions.logo_width / 20
        draw.rectangle(
            [logo_x - logo_size/2, logo_y - logo_size/2, logo_x + logo_size/2, logo_y + logo_size/2],
            outline='blue',
            width=2,
            fill=(135, 206, 235, int(255 * positions.logo_opacity))
        )
        draw.text((logo_x, logo_y), "LOGO", font=font_small, fill='blue', anchor="mm")
        
        # Draw school name position
        name_x = doc_x1 + (doc_width * positions.school_name_x / 100)
        name_y = doc_y1 + (doc_height * positions.school_name_y / 100)
        draw.text((name_x, name_y), school.school_name, font=font_medium, fill='green', anchor="mm")
        draw.circle([name_x, name_y], 3, fill='green')
        
        # Draw contact position
        contact_x = doc_x1 + (doc_width * positions.contact_x / 100)
        contact_y = doc_y1 + (doc_height * positions.contact_y / 100)
        contact_text = school.email
        if school.contact_number:
            contact_text += f"\n{school.contact_number}"
        
        # Split text for drawing
        lines = contact_text.split('\n')
        for i, line in enumerate(lines):
            y_offset = contact_y + (i * 20)
            draw.text((contact_x, y_offset), line, font=font_small, fill='orange', anchor="mm")
        draw.circle([contact_x, contact_y], 3, fill='orange')
        
        # Legend
        draw.text((100, 520), "Blue: Logo Position", font=font_small, fill='blue')
        draw.text((100, 540), "Green: School Name", font=font_small, fill='green')
        draw.text((100, 560), "Orange: Contact Info", font=font_small, fill='orange')
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        return img_bytes.getvalue()
        
    except Exception as e:
        print(f"Error creating preview image: {e}")
        # Return a simple error image
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        draw.text((400, 300), "Preview Generation Error", fill='red', anchor="mm")
        
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        return img_bytes.getvalue()

def get_batch_watermark_default_template() -> Dict[str, Any]:
    return {
        "show_logo": True,
        "logo_x": 50,
        "logo_y": 10,
        "logo_width": 20,
        "logo_opacity": 0.7,
        "logo_rotation": 0,
        "name_x": 50,
        "name_y": 25,
        "name_size": 20,
        "name_opacity": 0.8,
        "name_rotation": 0,
        "name_font": "Arial",
        "name_style": "normal",
        "name_color": "#000000",
        "show_name": True,
        "contact_x": 50,
        "contact_y": 90,
        "contact_size": 12,
        "contact_opacity": 0.7,
        "contact_rotation": 0,
        "contact_font": "Arial",
        "contact_style": "normal",
        "contact_color": "#000000",
        "show_contact": True,
        "address_x": 50,
        "address_y": 85,
        "address_size": 10,
        "address_opacity": 1.0,
        "address_rotation": 0,
        "address_font": "Arial",
        "address_style": "normal",
        "address_color": "#000000",
        "show_address": False,
        "address": ""
    }

def normalize_batch_watermark_template(raw_template: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    template = get_batch_watermark_default_template()
    raw_template = raw_template or {}

    template["show_logo"] = parse_bool(raw_template.get("show_logo"), template["show_logo"])
    template["logo_x"] = int(round(clamp(raw_template.get("logo_x", template["logo_x"]), 0, 100)))
    template["logo_y"] = int(round(clamp(raw_template.get("logo_y", template["logo_y"]), 0, 100)))
    template["logo_width"] = int(round(clamp(raw_template.get("logo_width", template["logo_width"]), 5, 50)))
    template["logo_opacity"] = round(clamp(raw_template.get("logo_opacity", template["logo_opacity"]), 0.1, 1.0), 2)
    template["logo_rotation"] = normalize_rotation(raw_template.get("logo_rotation", template["logo_rotation"]))

    template["name_x"] = int(round(clamp(raw_template.get("name_x", template["name_x"]), 0, 100)))
    template["name_y"] = int(round(clamp(raw_template.get("name_y", template["name_y"]), 0, 100)))
    template["name_size"] = int(round(clamp(raw_template.get("name_size", template["name_size"]), 8, 48)))
    template["name_opacity"] = round(clamp(raw_template.get("name_opacity", template["name_opacity"]), 0.1, 1.0), 2)
    template["name_rotation"] = normalize_rotation(raw_template.get("name_rotation", template["name_rotation"]))
    template["name_font"] = (raw_template.get("name_font") or template["name_font"]).strip() or template["name_font"]
    template["name_style"] = (raw_template.get("name_style") or template["name_style"]).strip() or template["name_style"]
    template["name_color"] = normalize_hex_color(raw_template.get("name_color", template["name_color"]), default=template["name_color"])
    template["show_name"] = parse_bool(raw_template.get("show_name"), template["show_name"])

    template["contact_x"] = int(round(clamp(raw_template.get("contact_x", template["contact_x"]), 0, 100)))
    template["contact_y"] = int(round(clamp(raw_template.get("contact_y", template["contact_y"]), 0, 100)))
    template["contact_size"] = int(round(clamp(raw_template.get("contact_size", template["contact_size"]), 8, 24)))
    template["contact_opacity"] = round(clamp(raw_template.get("contact_opacity", template["contact_opacity"]), 0.1, 1.0), 2)
    template["contact_rotation"] = normalize_rotation(raw_template.get("contact_rotation", template["contact_rotation"]))
    template["contact_font"] = (raw_template.get("contact_font") or template["contact_font"]).strip() or template["contact_font"]
    template["contact_style"] = (raw_template.get("contact_style") or template["contact_style"]).strip() or template["contact_style"]
    template["contact_color"] = normalize_hex_color(raw_template.get("contact_color", template["contact_color"]), default=template["contact_color"])
    template["show_contact"] = parse_bool(raw_template.get("show_contact"), template["show_contact"])

    template["address_x"] = int(round(clamp(raw_template.get("address_x", template["address_x"]), 0, 100)))
    template["address_y"] = int(round(clamp(raw_template.get("address_y", template["address_y"]), 0, 100)))
    template["address_size"] = int(round(clamp(raw_template.get("address_size", template["address_size"]), 6, 24)))
    template["address_opacity"] = round(clamp(raw_template.get("address_opacity", template["address_opacity"]), 0.1, 1.0), 2)
    template["address_rotation"] = normalize_rotation(raw_template.get("address_rotation", template["address_rotation"]))
    template["address_font"] = (raw_template.get("address_font") or template["address_font"]).strip() or template["address_font"]
    template["address_style"] = (raw_template.get("address_style") or template["address_style"]).strip() or template["address_style"]
    template["address_color"] = normalize_hex_color(raw_template.get("address_color", template["address_color"]), default=template["address_color"])
    template["show_address"] = parse_bool(raw_template.get("show_address"), template["show_address"])
    template["address"] = (raw_template.get("address") or "").strip()

    return template

def admin_batch_template_to_dict(template: Optional[AdminBatchWatermarkTemplate]) -> Dict[str, Any]:
    if not template:
        return get_batch_watermark_default_template()

    return normalize_batch_watermark_template({
        "show_logo": template.show_logo,
        "logo_x": template.logo_x,
        "logo_y": template.logo_y,
        "logo_width": template.logo_width,
        "logo_opacity": template.logo_opacity,
        "logo_rotation": template.logo_rotation,
        "name_x": template.name_x,
        "name_y": template.name_y,
        "name_size": template.name_size,
        "name_opacity": template.name_opacity,
        "name_rotation": template.name_rotation,
        "name_font": template.name_font,
        "name_style": template.name_style,
        "name_color": template.name_color,
        "show_name": template.show_name,
        "contact_x": template.contact_x,
        "contact_y": template.contact_y,
        "contact_size": template.contact_size,
        "contact_opacity": template.contact_opacity,
        "contact_rotation": template.contact_rotation,
        "contact_font": template.contact_font,
        "contact_style": template.contact_style,
        "contact_color": template.contact_color,
        "show_contact": template.show_contact,
        "address_x": template.address_x,
        "address_y": template.address_y,
        "address_size": template.address_size,
        "address_opacity": template.address_opacity,
        "address_rotation": template.address_rotation,
        "address_font": template.address_font,
        "address_style": template.address_style,
        "address_color": template.address_color,
        "show_address": template.show_address,
        "address": template.address or ""
    })

def upsert_admin_batch_template(
    db: Session,
    admin_email: str,
    resource_id: str,
    template_data: Dict[str, Any]
) -> AdminBatchWatermarkTemplate:
    normalized = normalize_batch_watermark_template(template_data)

    record = db.query(AdminBatchWatermarkTemplate).filter(
        AdminBatchWatermarkTemplate.admin_email == admin_email,
        AdminBatchWatermarkTemplate.resource_id == resource_id
    ).first()

    if not record:
        record = AdminBatchWatermarkTemplate(
            admin_email=admin_email,
            resource_id=resource_id
        )
        db.add(record)

    record.show_logo = normalized["show_logo"]
    record.logo_x = normalized["logo_x"]
    record.logo_y = normalized["logo_y"]
    record.logo_width = normalized["logo_width"]
    record.logo_opacity = normalized["logo_opacity"]
    record.logo_rotation = normalized["logo_rotation"]
    record.name_x = normalized["name_x"]
    record.name_y = normalized["name_y"]
    record.name_size = normalized["name_size"]
    record.name_opacity = normalized["name_opacity"]
    record.name_rotation = normalized["name_rotation"]
    record.name_font = normalized["name_font"]
    record.name_style = normalized["name_style"]
    record.name_color = normalized["name_color"]
    record.show_name = normalized["show_name"]
    record.contact_x = normalized["contact_x"]
    record.contact_y = normalized["contact_y"]
    record.contact_size = normalized["contact_size"]
    record.contact_opacity = normalized["contact_opacity"]
    record.contact_rotation = normalized["contact_rotation"]
    record.contact_font = normalized["contact_font"]
    record.contact_style = normalized["contact_style"]
    record.contact_color = normalized["contact_color"]
    record.show_contact = normalized["show_contact"]
    record.address_x = normalized["address_x"]
    record.address_y = normalized["address_y"]
    record.address_size = normalized["address_size"]
    record.address_opacity = normalized["address_opacity"]
    record.address_rotation = normalized["address_rotation"]
    record.address_font = normalized["address_font"]
    record.address_style = normalized["address_style"]
    record.address_color = normalized["address_color"]
    record.show_address = normalized["show_address"]
    record.address = normalized["address"]
    record.updated_at = datetime.utcnow()

    return record

def batch_template_to_watermark_position(template: Dict[str, Any]) -> WatermarkPosition:
    template = normalize_batch_watermark_template(template)
    return WatermarkPosition(
        logo_x=template["logo_x"],
        logo_y=template["logo_y"],
        logo_width=template["logo_width"],
        logo_opacity=template["logo_opacity"],
        logo_rotation=template["logo_rotation"],
        school_name_x=template["name_x"],
        school_name_y=template["name_y"],
        school_name_size=template["name_size"],
        school_name_opacity=template["name_opacity"],
        contact_x=template["contact_x"],
        contact_y=template["contact_y"],
        contact_size=template["contact_size"],
        contact_opacity=template["contact_opacity"]
    )

def batch_template_to_text_position(template: Dict[str, Any]) -> Dict[str, Any]:
    template = normalize_batch_watermark_template(template)
    return {
        "name_x": template["name_x"],
        "name_y": template["name_y"],
        "name_size": template["name_size"],
        "name_opacity": template["name_opacity"],
        "name_rotation": template["name_rotation"],
        "name_font": template["name_font"],
        "name_style": template["name_style"],
        "name_color": template["name_color"],
        "show_name": template["show_name"],
        "contact_x": template["contact_x"],
        "contact_y": template["contact_y"],
        "contact_size": template["contact_size"],
        "contact_opacity": template["contact_opacity"],
        "contact_rotation": template["contact_rotation"],
        "contact_font": template["contact_font"],
        "contact_style": template["contact_style"],
        "contact_color": template["contact_color"],
        "show_contact": template["show_contact"],
        "address_x": template["address_x"],
        "address_y": template["address_y"],
        "address_size": template["address_size"],
        "address_opacity": template["address_opacity"],
        "address_rotation": template["address_rotation"],
        "address_font": template["address_font"],
        "address_style": template["address_style"],
        "address_color": template["address_color"],
        "show_address": template["show_address"],
        "address": template["address"]
    }

def is_supported_batch_watermark_resource(resource: Resource) -> bool:
    file_type = (resource.file_type or "").lower()
    file_path = (resource.file_path or "").lower()
    category = (resource.category or "").lower()

    if category == "multimedia":
        return False

    if resource.is_video_link:
        return False

    if "audio" in file_type or "video" in file_type:
        return False

    is_pdf = ("pdf" in file_type) or file_path.endswith(".pdf")
    is_raster_image = any(file_path.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"))
    if not is_raster_image and "image" in file_type:
        is_raster_image = not file_path.endswith(".svg")

    return is_pdf or is_raster_image

def sanitize_batch_name(value: str, fallback: str) -> str:
    cleaned = re.sub(r'[<>:"/\\\\|?*]+', "_", (value or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .")
    return cleaned or fallback

def get_batch_resource_extension(resource: Resource, source_path: str) -> str:
    extension = os.path.splitext(source_path)[1].lower()
    if extension:
        return extension

    file_type = (resource.file_type or "").lower()
    if "pdf" in file_type:
        return ".pdf"
    if "png" in file_type:
        return ".png"
    if "jpeg" in file_type or "jpg" in file_type:
        return ".jpg"
    if "gif" in file_type:
        return ".gif"
    if "bmp" in file_type:
        return ".bmp"
    if "tiff" in file_type:
        return ".tiff"
    if "webp" in file_type:
        return ".webp"
    return ".bin"

def get_batch_job_path(job_id: str) -> Path:
    safe_job_id = re.sub(r"[^a-zA-Z0-9_-]", "", job_id or "")
    if not safe_job_id:
        raise HTTPException(status_code=400, detail="Invalid job id")
    return (BATCH_WATERMARK_OUTPUT_DIR / safe_job_id).resolve()

def ensure_batch_job_within_root(job_path: Path) -> Path:
    root_path = BATCH_WATERMARK_OUTPUT_DIR.resolve()
    if root_path not in job_path.parents and job_path != root_path:
        raise HTTPException(status_code=400, detail="Invalid job path")
    return job_path

def cleanup_batch_job_directory(job_path: Path):
    if job_path.exists():
        shutil.rmtree(job_path, ignore_errors=True)

def build_school_folder_name(existing_names: set, school: School) -> str:
    base_name = sanitize_batch_name(school.school_name, school.school_id)
    folder_name = base_name
    if folder_name in existing_names:
        folder_name = sanitize_batch_name(f"{school.school_name}_{school.school_id}", school.school_id)
    existing_names.add(folder_name)
    return folder_name

def generate_batch_watermarked_output(
    resource: Resource,
    school: School,
    template: Dict[str, Any],
    output_path: Path
) -> str:
    source_path = get_full_file_path(resource.file_path)
    normalized_template = normalize_batch_watermark_template(template)
    watermark_position = batch_template_to_watermark_position(normalized_template)
    text_position = batch_template_to_text_position(normalized_template)
    school_info = {
        "school_name": school.school_name,
        "email": school.email,
        "contact_number": school.contact_number
    }

    file_type = (resource.file_type or "").lower()
    is_pdf = ("pdf" in file_type) or source_path.lower().endswith(".pdf")
    logo_path = get_school_logo_path(school) if normalized_template["show_logo"] else None

    if is_pdf:
        return add_logo_and_text_to_pdf(
            source_path,
            logo_path,
            watermark_position,
            school_info,
            text_position,
            str(output_path)
        )

    return add_logo_and_text_to_image(
        source_path,
        logo_path,
        watermark_position,
        resource.file_type,
        school_info,
        text_position,
        str(output_path)
    )

def write_batch_job_manifest(job_path: Path, payload: Dict[str, Any]):
    manifest_path = job_path / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as manifest_file:
        json.dump(payload, manifest_file, ensure_ascii=True, indent=2)

def read_batch_job_manifest(job_path: Path) -> Dict[str, Any]:
    manifest_path = job_path / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Generated batch watermark bundle not found")
    with open(manifest_path, "r", encoding="utf-8") as manifest_file:
        return json.load(manifest_file)

def get_batch_email_settings() -> Dict[str, Any]:
    load_dotenv(ROOT_DIR / '.env', override=True)
    load_dotenv(ROOT_DIR.parent / '.env', override=True)
    host = os.environ.get("EMAIL_HOST")
    port = int(os.environ.get("EMAIL_PORT", "587"))
    username = os.environ.get("EMAIL_USER")
    password = os.environ.get("EMAIL_PASSWORD")
    from_email = os.environ.get("DEFAULT_FROM_EMAIL") or username
    from_name = os.environ.get("DEFAULT_FROM_NAME", "").strip()
    use_tls = parse_bool(os.environ.get("EMAIL_USE_TLS"), True)
    use_ssl = parse_bool(os.environ.get("EMAIL_USE_SSL"), False)

    if not host or not username or not password or not from_email:
        raise HTTPException(
            status_code=400,
            detail="Email automation is not configured. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, and DEFAULT_FROM_EMAIL."
        )

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "from_name": from_name,
        "use_tls": use_tls,
        "use_ssl": use_ssl
    }

def get_brevo_sms_settings() -> Dict[str, Any]:
    load_dotenv(ROOT_DIR / '.env', override=True)
    load_dotenv(ROOT_DIR.parent / '.env', override=True)

    api_key = os.environ.get("BREVO_SMS_API_KEY") or os.environ.get("SMS_API_KEY")
    sender = (os.environ.get("BREVO_SMS_SENDER") or os.environ.get("SMS_SENDER_NAME") or "").strip()
    country_code = (os.environ.get("BREVO_SMS_DEFAULT_COUNTRY_CODE") or "91").strip()

    if not api_key or not sender:
        raise HTTPException(
            status_code=400,
            detail="SMS automation is not configured. Please set BREVO_SMS_API_KEY and BREVO_SMS_SENDER."
        )

    return {
        "api_key": api_key,
        "sender": sender[:11],
        "country_code": country_code
    }

def build_smtp_client(email_settings: Dict[str, Any]):
    if email_settings["use_ssl"]:
        smtp_client = smtplib.SMTP_SSL(email_settings["host"], email_settings["port"], timeout=60)
    else:
        smtp_client = smtplib.SMTP(email_settings["host"], email_settings["port"], timeout=60)
        if email_settings["use_tls"]:
            smtp_client.starttls()

    smtp_client.login(email_settings["username"], email_settings["password"])
    return smtp_client

def send_smtp_email(
    email_settings: Dict[str, Any],
    to_email: str,
    subject: str,
    text_content: str,
    html_content: Optional[str] = None,
    to_name: Optional[str] = None
):
    smtp_client = build_smtp_client(email_settings)
    try:
        email_message = EmailMessage()
        email_message["Subject"] = subject
        email_message["From"] = (
            formataddr((email_settings["from_name"], email_settings["from_email"]))
            if email_settings["from_name"]
            else email_settings["from_email"]
        )
        email_message["To"] = formataddr((to_name, to_email)) if to_name else to_email
        email_message["Reply-To"] = email_settings["from_email"]
        email_message.set_content(text_content)
        if html_content:
            email_message.add_alternative(html_content, subtype="html")
        smtp_client.send_message(email_message)
    finally:
        try:
            smtp_client.quit()
        except Exception:
            pass

def send_email_otp(email: str, otp_code: str, school_name: str) -> bool:
    """Send OTP via email as fallback when SMS fails"""
    try:
        # Email configuration from .env
        email_host = os.environ.get("EMAIL_HOST")
        email_port = int(os.environ.get("EMAIL_PORT", "587"))
        email_user = os.environ.get("EMAIL_USER")
        email_password = os.environ.get("EMAIL_PASSWORD")
        from_email = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@koshquest.in")
        from_name = os.environ.get("DEFAULT_FROM_NAME", "Koshquest")
        
        # Create email message
        msg = EmailMessage()
        msg['Subject'] = f"Koshquest Password Reset OTP - {school_name}"
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = email
        
        # Email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Koshquest Password Reset</h2>
                <p>Dear {school_name},</p>
                <p>Your One-Time Password (OTP) for password reset is:</p>
                <div style="background-color: #007bff; color: white; padding: 15px; 
                            text-align: center; font-size: 24px; font-weight: bold; 
                            border-radius: 5px; margin: 20px 0;">
                    {otp_code}
                </div>
                <p>This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
                <p>If you didn't request this OTP, please contact support immediately.</p>
                <hr style="border: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    This is an automated message from Koshquest Digital Library.
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.add_alternative(html_content, subtype='html')
        
        # Send email
        with smtplib.SMTP(email_host, email_port) as server:
            server.starttls()
            server.login(email_user, email_password)
            server.send_message(msg)
        
        print(f"Email OTP sent successfully to {email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email OTP: {e}")
        return False

def send_otp_with_fallback(mobile_number: str, email: str, otp_code: str, school_name: str):
    """Try SMS first, fallback to email if SMS fails"""
    
    # Check SMS credits first
    try:
        settings = get_brevo_sms_settings()
        print(f"SMS settings check - Sender: {settings['sender']}")
        
        # Try SMS first but be more aggressive about detecting failures
        otp_message = (
            f"Koshquest password reset OTP for {school_name} is {otp_code}. "
            "It is valid for 10 minutes. Do not share this code."
        )
        result = send_brevo_sms(mobile_number, otp_message, "schoolPasswordResetOtp")
        
        if 'messageId' in result:
            print(f"SMS API returned messageId: {result['messageId']}")
            # Since we know there are 0 SMS credits, this will likely fail delivery
            # Force email fallback for now
            print("SMS API succeeded but credits are 0, forcing email fallback")
            raise Exception("SMS credits depleted")
        else:
            print(f"SMS API failed: {result}")
            raise Exception("SMS delivery failed")
            
    except Exception as sms_error:
        print(f"SMS failed: {sms_error}")
        
        # Fallback to email
        if email:
            print(f"Attempting email fallback to: {email}")
            email_success = send_email_otp(email, otp_code, school_name)
            if email_success:
                return {"method": "email", "success": True, "message": "OTP sent via email (SMS unavailable)"}
            else:
                return {"method": "none", "success": False, "message": "Both SMS and email failed"}
        else:
            return {"method": "none", "success": False, "message": "SMS failed and no email available"}

def send_brevo_sms(recipient: str, content: str, tag: str) -> Dict[str, Any]:
    settings = get_brevo_sms_settings()
    clean_recipient = to_brevo_sms_recipient(recipient)
    payload = {
        "sender": settings["sender"],
        "recipient": clean_recipient,
        "content": content,
        "type": "transactional",
        "tag": tag,
        "unicodeEnabled": True,
    }

    # Log SMS details for debugging
    print(f"Sending SMS via Brevo:")
    print(f"  Recipient: {recipient} -> {clean_recipient}")
    print(f"  Sender: {settings['sender']}")
    print(f"  Content: {content[:100]}...")
    print(f"  Tag: {tag}")

    request_obj = urllib_request.Request(
        "https://api.brevo.com/v3/transactionalSMS/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": settings["api_key"],
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(request_obj, timeout=30) as response:
            response_body = response.read().decode("utf-8") if response else "{}"
            result = json.loads(response_body or "{}")
            print(f"Brevo SMS response: {result}")
            
            # Check for specific Brevo response codes
            if 'messageId' in result:
                print(f"SMS queued successfully with messageId: {result['messageId']}")
            else:
                print(f"Unexpected Brevo response format: {result}")
                
            return result
    except urllib_error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        print(f"Brevo SMS HTTP error: {exc.code} {error_body}")
        
        # Provide more specific error messages based on HTTP status
        if exc.code == 401:
            raise HTTPException(status_code=502, detail="SMS API authentication failed. Please check API key.")
        elif exc.code == 403:
            raise HTTPException(status_code=502, detail="SMS sender not authorized. Please check sender name configuration.")
        elif exc.code == 429:
            raise HTTPException(status_code=429, detail="SMS rate limit exceeded. Please try again later.")
        else:
            raise HTTPException(status_code=502, detail="Failed to send SMS. Please try again in a moment.")
    except urllib_error.URLError as exc:
        print(f"Brevo SMS URL error: {exc}")
        raise HTTPException(status_code=502, detail="SMS service is currently unreachable. Please try again.")
    except Exception as exc:
        print(f"Brevo SMS unexpected error: {exc}")
        raise HTTPException(status_code=500, detail="Unexpected error while sending SMS")

def build_batch_watermark_email(school: School, zip_filename: str, subject: str, custom_message: str) -> Dict[str, str]:
    """Build beautiful HTML email for batch watermark ZIP delivery"""
    text_content = f"""
Dear {school.school_name},

Greetings from Wonder Learning India,

Please find attached to this email the ZIP file containing your customized watermarked learning resources.

{custom_message}

We hope these materials add value to your learning initiatives and support your educational goals effectively.

Should you require any modifications, additional customization, or assistance, please feel free to reply to this email—we would be happy to help.

Thank you for choosing Wonder Learning India. We appreciate the opportunity to support your institution.

Warm Regards,
Wonder Learning India
📧 Support Team
🌐 Empowering Better Learning
""".strip()

    html_content = f"""
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customized Resources Ready - {school.school_name}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#16324f;">
    <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f4c81,#1fa2a6);border-radius:24px;padding:36px 34px;color:#ffffff;box-shadow:0 24px 50px rgba(15,76,129,0.22);">
        <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;opacity:0.82;margin-bottom:14px;">Resources Ready</div>
        <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;">{school.school_name}, your customized resources are ready.</h1>
        <p style="margin:0;font-size:16px;line-height:1.8;opacity:0.94;">
          Your watermarked learning materials have been processed and are ready for download.
        </p>
      </div>

      <!-- Content -->
      <div style="background:#ffffff;margin-top:-18px;border-radius:22px;padding:30px 28px 26px;box-shadow:0 18px 40px rgba(13,38,59,0.08);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:24px;">
          <div style="background:#f7fbff;border:1px solid #d8e6f3;border-radius:16px;padding:18px;">
            <div style="font-size:12px;color:#5d7990;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">School ID</div>
            <div style="font-size:18px;font-weight:700;color:#16324f;">{school.school_id}</div>
          </div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:16px;padding:18px;">
            <div style="font-size:12px;color:#5d7990;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">ZIP File</div>
            <div style="font-size:16px;font-weight:700;color:#16324f;">{zip_filename}</div>
          </div>
        </div>

        <!-- Custom Message -->
        <div style="background:#fff8ef;border:1px solid #f3ddbf;border-radius:18px;padding:20px 22px;margin-bottom:24px;">
          <div style="font-size:18px;font-weight:700;color:#7c4d0f;margin-bottom:10px;">Message from Admin</div>
          <div style="font-size:15px;line-height:1.9;color:#6a4a1f;">
            {custom_message.replace(chr(10), '<br>')}
          </div>
        </div>

        <!-- Action Button -->
        <div style="text-align:center;margin:26px 0 20px;">
          <div style="display:inline-block;padding:14px 28px;border-radius:999px;background:#28a745;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
            📦 Resources Attached to This Email
          </div>
        </div>

        <!-- Support Info -->
        <div style="font-size:14px;line-height:1.8;color:#5d7990;">
          Need help? Reply to this email or contact our support team.
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:12px;color:#7a90a5;padding-top:18px;">
        <p style="margin:0 0 8px;">Sent by Wonder Learning India</p>
        <p style="margin:0;">🌐 Empowering Better Learning</p>
      </div>
    </div>
  </body>
</html>
""".strip()

    return {
        "subject": subject,
        "text_content": text_content,
        "html_content": html_content,
    }

def build_school_welcome_email(school: School) -> Dict[str, str]:
    login_url = (config.frontend_url or "").rstrip("/")
    if config.environment == "production" and (not login_url or "localhost" in login_url):
        login_url = f"https://{config.domain}".rstrip("/")
    if not login_url:
        login_url = "https://koshquest.in/login"
    elif not login_url.endswith("/login"):
        login_url = f"{login_url}/login"

    subject = f"Welcome to Koshquest Digital Library, {school.school_name}"
    text_content = f"""
Hello {school.school_name},

Welcome to Koshquest Digital Library.

Your school account is now active and ready to use. You can sign in to explore curated resources, download branded materials, upload school content for approval, track usage, and stay connected with the admin team.

School ID: {school.school_id}
Registered Email: {school.email}

Login here: {login_url}

If you ever need help, please use the chat or support ticket options inside your dashboard.

Warm regards,
Wonder Learning India
""".strip()

    html_content = f"""
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#16324f;">
    <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
      <div style="background:linear-gradient(135deg,#0f4c81,#1fa2a6);border-radius:24px;padding:36px 34px;color:#ffffff;box-shadow:0 24px 50px rgba(15,76,129,0.22);">
        <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;opacity:0.82;margin-bottom:14px;">Welcome Aboard</div>
        <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;">{school.school_name}, your digital library is ready.</h1>
        <p style="margin:0;font-size:16px;line-height:1.8;opacity:0.94;">
          We are delighted to welcome your school to Koshquest Digital Library. Your team can now access learning resources, download school-ready materials, upload content for review, and stay connected with admin support from one dashboard.
        </p>
      </div>

      <div style="background:#ffffff;margin-top:-18px;border-radius:22px;padding:30px 28px 26px;box-shadow:0 18px 40px rgba(13,38,59,0.08);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:24px;">
          <div style="background:#f7fbff;border:1px solid #d8e6f3;border-radius:16px;padding:18px;">
            <div style="font-size:12px;color:#5d7990;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">School ID</div>
            <div style="font-size:18px;font-weight:700;color:#16324f;">{school.school_id}</div>
          </div>
          <div style="background:#f7fbff;border:1px solid #d8e6f3;border-radius:16px;padding:18px;">
            <div style="font-size:12px;color:#5d7990;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Registered Email</div>
            <div style="font-size:16px;font-weight:700;color:#16324f;">{school.email}</div>
          </div>
        </div>

        <div style="background:#fff8ef;border:1px solid #f3ddbf;border-radius:18px;padding:20px 22px;margin-bottom:24px;">
          <div style="font-size:18px;font-weight:700;color:#7c4d0f;margin-bottom:10px;">What you can do next</div>
          <div style="font-size:15px;line-height:1.9;color:#6a4a1f;">
            Explore resources by category, download branded assets, upload your own materials for approval, and track announcements, chat responses, and support ticket updates from the dashboard home.
          </div>
        </div>

        <div style="text-align:center;margin:26px 0 20px;">
          <a href="{login_url}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#16324f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
            Open School Dashboard
          </a>
        </div>

        <div style="font-size:14px;line-height:1.8;color:#5d7990;">
          If you ever need help, please use the in-app chat or raise a support ticket from your dashboard.
        </div>
      </div>

      <div style="text-align:center;font-size:12px;color:#7a90a5;padding-top:18px;">
        Sent by Wonder Learning India via Koshquest Digital Library
      </div>
    </div>
  </body>
</html>
""".strip()

    return {
        "subject": subject,
        "text_content": text_content,
        "html_content": html_content,
    }

def send_school_welcome_email_if_needed(db: Session, school: School):
    if not school or school.welcome_email_sent_at or not school.email:
        return

    try:
        email_settings = get_batch_email_settings()
        welcome_email = build_school_welcome_email(school)
        send_smtp_email(
            email_settings=email_settings,
            to_email=school.email,
            to_name=school.school_name,
            subject=welcome_email["subject"],
            text_content=welcome_email["text_content"],
            html_content=welcome_email["html_content"],
        )
        school.welcome_email_sent_at = datetime.utcnow()
        db.commit()
    except Exception as exc:
        print(f"Welcome email send failed for {school.school_id}: {exc}")

def build_school_batch_zip_bytes(job_path: Path, folder_entry: Dict[str, Any]) -> tuple[bytes, str]:
    folder_path = ensure_batch_job_within_root((job_path / folder_entry["folder_name"]).resolve())
    if not folder_path.exists():
        raise HTTPException(status_code=404, detail=f"Generated folder missing for school: {folder_entry['school_name']}")

    zip_filename = f"{sanitize_batch_name(folder_entry['folder_name'], folder_entry['school_id'])}.zip"
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in folder_path.rglob("*"):
            if file_path.is_file():
                archive_name = str(Path(folder_entry["folder_name"]) / file_path.relative_to(folder_path))
                zip_file.write(file_path, arcname=archive_name)

    zip_buffer.seek(0)
    return zip_buffer.getvalue(), zip_filename

# ==================== BATCH WATERMARK ROUTES ====================

@api_router.post("/admin/generate-watermark-preview")
async def generate_watermark_preview(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Generate preview of watermarked resource for admin"""
    try:
        print(f"Generating preview with request: {request}")
        
        resource_id = request.get('resource_id')
        school_ids = request.get('school_ids', [])
        positions = request.get('positions', {})
        
        if not resource_id:
            raise HTTPException(status_code=400, detail="Resource ID required")
        
        # Get resource
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        # Get school for preview
        school = None
        if school_ids == 'all' or (isinstance(school_ids, list) and len(school_ids) == 0):
            school = db.query(School).first()
        elif isinstance(school_ids, list) and len(school_ids) > 0:
            school = db.query(School).filter(School.school_id == school_ids[0]).first()
        elif isinstance(school_ids, str) and school_ids != 'all':
            school = db.query(School).filter(School.school_id == school_ids).first()
        
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        print(f"Using school: {school.school_name} for resource: {resource.name}")
        print(f"File type: {resource.file_type}")
        
        # Get the actual file
        file_path = get_full_file_path(resource.file_path)
        print(f"File path: {file_path}")
        
        if not os.path.exists(file_path):
            # Try alternative paths
            if resource.file_path.startswith('/'):
                file_path = resource.file_path[1:]
                file_path = os.path.join(ROOT_DIR, file_path)
                print(f"Trying alternative path: {file_path}")
            
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail="File not found")
        
        # Convert positions dict to WatermarkPosition object
        watermark_positions = WatermarkPosition(
            logo_x=positions.get('logo_x', 50),
            logo_y=positions.get('logo_y', 10),
            logo_width=positions.get('logo_width', 20),
            logo_opacity=positions.get('logo_opacity', 1.0),
            school_name_x=positions.get('school_name_x', 50),
            school_name_y=positions.get('school_name_y', 20),
            school_name_size=positions.get('school_name_size', 16),
            school_name_opacity=positions.get('school_name_opacity', 0.9),
            contact_x=positions.get('contact_x', 50),
            contact_y=positions.get('contact_y', 90),
            contact_size=positions.get('contact_size', 12),
            contact_opacity=positions.get('contact_opacity', 1.0)
        )
        
        # Check file type and apply appropriate watermark
        file_type_lower = resource.file_type.lower() if resource.file_type else ''
        file_path_lower = file_path.lower()
        
        # For PDF files - apply actual watermark and return PDF
        if 'pdf' in file_type_lower or file_path_lower.endswith('.pdf'):
            print("Processing PDF for watermark preview")
            
            # Apply watermark to PDF
            watermarked_pdf = add_watermark_to_pdf(file_path, school, watermark_positions)
            
            if watermarked_pdf and os.path.exists(watermarked_pdf):
                # Read the watermarked PDF
                with open(watermarked_pdf, 'rb') as f:
                    content = f.read()
                
                # Clean up temp file
                os.remove(watermarked_pdf)
                
                print(f"Returning watermarked PDF, size: {len(content)} bytes")
                
                return Response(
                    content=content,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": "inline; filename=\"preview.pdf\"",
                        "Cache-Control": "no-cache, no-store, must-revalidate"
                    }
                )
        
        # For image files - apply watermark and return image
        elif any(img_type in file_type_lower for img_type in ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'webp']):
            print("Processing image for watermark preview")
            
            # Get school logo path
            logo_path = get_school_logo_path(school)
            
            # Prepare school info for watermarking
            school_info = {
                'school_name': school.school_name,
                'email': school.email,
                'contact_number': school.contact_number
            }
            
            # Create temp output path
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            output_path = temp_file.name
            temp_file.close()
            
            # Apply watermark to image
            result = add_logo_and_text_to_image(
                file_path,
                logo_path,
                watermark_positions,
                resource.file_type,
                school_info,
                {
                    'name_x': watermark_positions.school_name_x,
                    'name_y': watermark_positions.school_name_y,
                    'name_size': watermark_positions.school_name_size,
                    'name_opacity': watermark_positions.school_name_opacity,
                    'contact_x': watermark_positions.contact_x,
                    'contact_y': watermark_positions.contact_y,
                    'contact_size': watermark_positions.contact_size,
                    'contact_opacity': watermark_positions.contact_opacity
                },
                output_path
            )
            
            if result and os.path.exists(result):
                with open(result, 'rb') as f:
                    content = f.read()
                
                os.remove(result)
                
                print(f"Returning watermarked image, size: {len(content)} bytes")
                
                return Response(
                    content=content,
                    media_type="image/png",
                    headers={
                        "Content-Disposition": "inline; filename=\"preview.png\"",
                        "Cache-Control": "no-cache, no-store, must-revalidate"
                    }
                )
        
        # For other file types - return the original file with note
        else:
            print(f"Returning original file for preview: {resource.file_type}")
            
            # Read original file
            with open(file_path, 'rb') as f:
                content = f.read()
            
            # Return original file with watermark note
            return Response(
                content=content,
                media_type=resource.file_type or "application/octet-stream",
                headers={
                    "Content-Disposition": "inline; filename=\"preview\"",
                    "X-Watermark-Note": "Watermark will be applied in final download",
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating preview: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@api_router.post("/admin/save-watermark-template")
async def save_watermark_template(
    request: SaveTemplateRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Save watermark template for future use"""
    try:
        print(f"Saving template for resource: {request.resource_id}")
        
        # Check if template already exists
        existing = db.query(AdminResourceWatermark).filter(
            AdminResourceWatermark.admin_id == request.admin_id,
            AdminResourceWatermark.resource_id == request.resource_id,
            AdminResourceWatermark.school_id == ('all' if request.is_for_all else 'template')
        ).first()
        
        if existing:
            # Update existing template
            existing.logo_x = request.positions.logo_x
            existing.logo_y = request.positions.logo_y
            existing.logo_width = request.positions.logo_width
            existing.logo_opacity = request.positions.logo_opacity
            existing.school_name_x = request.positions.school_name_x
            existing.school_name_y = request.positions.school_name_y
            existing.school_name_size = request.positions.school_name_size
            existing.school_name_opacity = request.positions.school_name_opacity
            existing.contact_x = request.positions.contact_x
            existing.contact_y = request.positions.contact_y
            existing.contact_size = request.positions.contact_size
            existing.contact_opacity = request.positions.contact_opacity
            existing.updated_at = datetime.utcnow()
            message = "Template updated successfully"
        else:
            # Create new template
            watermark = AdminResourceWatermark(
                admin_id=request.admin_id,
                resource_id=request.resource_id,
                school_id='all' if request.is_for_all else 'template',
                logo_x=request.positions.logo_x,
                logo_y=request.positions.logo_y,
                logo_width=request.positions.logo_width,
                logo_opacity=request.positions.logo_opacity,
                school_name_x=request.positions.school_name_x,
                school_name_y=request.positions.school_name_y,
                school_name_size=request.positions.school_name_size,
                school_name_opacity=request.positions.school_name_opacity,
                contact_x=request.positions.contact_x,
                contact_y=request.positions.contact_y,
                contact_size=request.positions.contact_size,
                contact_opacity=request.positions.contact_opacity
            )
            db.add(watermark)
            message = "Template saved successfully"
        
        db.commit()
        print(f"Template saved: {message}")
        
        return {"message": message, "status": "success"}
        
    except Exception as e:
        db.rollback()
        print(f"Error saving template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/download-batch-watermarked")
async def download_batch_watermarked(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Download multiple watermarked resources as ZIP"""
    try:
        resource_id = request.get('resource_id')
        school_ids = request.get('school_ids', [])
        positions = request.get('positions', {})
        
        print(f"Batch download request: resource_id={resource_id}, school_ids={school_ids}")
        
        if not resource_id:
            raise HTTPException(status_code=400, detail="Resource ID required")
        
        # Get resource
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        # Get schools
        schools = []
        if school_ids == 'all':
            schools = db.query(School).all()
        elif isinstance(school_ids, list):
            schools = db.query(School).filter(School.school_id.in_(school_ids)).all()
        
        if not schools:
            raise HTTPException(status_code=404, detail="No schools found")
        
        print(f"Processing for {len(schools)} schools")
        
        # Get original file
        file_path = get_full_file_path(resource.file_path)
        print(f"Original file path: {file_path}")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Original file not found")
        
        # Convert positions dict to WatermarkPosition object
        watermark_positions = WatermarkPosition(
            logo_x=positions.get('logo_x', 50),
            logo_y=positions.get('logo_y', 10),
            logo_width=positions.get('logo_width', 20),
            logo_opacity=positions.get('logo_opacity', 1.0),
            school_name_x=positions.get('school_name_x', 50),
            school_name_y=positions.get('school_name_y', 20),
            school_name_size=positions.get('school_name_size', 16),
            school_name_opacity=positions.get('school_name_opacity', 0.9),
            contact_x=positions.get('contact_x', 50),
            contact_y=positions.get('contact_y', 90),
            contact_size=positions.get('contact_size', 12),
            contact_opacity=positions.get('contact_opacity', 1.0)
        )
        
        # Create temporary directory for watermarked files
        temp_dir = tempfile.mkdtemp()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"{resource.name.replace(' ', '_')}_watermarked_{timestamp}.zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        
        # Create ZIP file
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            processed_count = 0
            for i, school in enumerate(schools):
                try:
                    print(f"Processing school {i+1}/{len(schools)}: {school.school_name}")
                    
                    watermarked_file = None
                    file_type_lower = resource.file_type.lower() if resource.file_type else ''
                    
                    # For PDFs
                    if 'pdf' in file_type_lower or file_path.lower().endswith('.pdf'):
                        print(f"Applying watermark to PDF for {school.school_name}")
                        watermarked_file = add_watermark_to_pdf(file_path, school, watermark_positions)
                    
                    # For images
                    elif any(img_type in file_type_lower for img_type in ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'webp']):
                        print(f"Applying watermark to image for {school.school_name}")
                        
                        # Get school info
                        school_info = {
                            'school_name': school.school_name,
                            'email': school.email,
                            'contact_number': school.contact_number
                        }
                        
                        # Get logo path
                        logo_path = get_school_logo_path(school)
                        
                        # Apply watermark
                        watermarked_file = add_logo_and_text_to_image(
                            file_path,
                            logo_path,
                            watermark_positions,
                            resource.file_type,
                            school_info,
                            {
                                'name_x': watermark_positions.school_name_x,
                                'name_y': watermark_positions.school_name_y,
                                'name_size': watermark_positions.school_name_size,
                                'name_opacity': watermark_positions.school_name_opacity,
                                'contact_x': watermark_positions.contact_x,
                                'contact_y': watermark_positions.contact_y,
                                'contact_size': watermark_positions.contact_size,
                                'contact_opacity': watermark_positions.contact_opacity
                            },
                            None  # Will create temp file
                        )
                    
                    # For other file types, copy original
                    else:
                        print(f"Copying original file for {school.school_name}")
                        watermarked_file = file_path
                    
                    # Add to ZIP if file exists
                    if watermarked_file and os.path.exists(watermarked_file):
                        # Create safe filename
                        school_folder = school.school_name.replace('/', '_').replace('\\', '_')
                        file_extension = os.path.splitext(file_path)[1] or '.file'
                        filename = f"{resource.name.replace(' ', '_')}_{school.school_name.replace(' ', '_')}_branded{file_extension}"
                        arcname = f"{school_folder}/{filename}"
                        
                        zipf.write(watermarked_file, arcname)
                        processed_count += 1
                        
                        # Clean up temp file if it's not the original
                        if watermarked_file != file_path:
                            try:
                                os.remove(watermarked_file)
                            except:
                                pass
                        
                        print(f"Added to ZIP: {arcname}")
                    
                except Exception as e:
                    print(f"Error processing school {school.school_name}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
        
        if processed_count == 0:
            raise HTTPException(status_code=500, detail="No files were processed successfully")
        
        # Read ZIP file
        with open(zip_path, 'rb') as f:
            zip_content = f.read()
        
        print(f"ZIP created successfully: {len(zip_content)} bytes, {processed_count} files")
        
        # Clean up
        try:
            os.remove(zip_path)
            os.rmdir(temp_dir)
        except:
            pass
        
        return Response(
            content=zip_content,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={zip_filename}",
                "Content-Type": "application/zip",
                "Content-Length": str(len(zip_content))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating batch download: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# Add this helper function for creating branded versions of non-image/PDF files:
def create_branded_version(file_path: str, school: School, positions: WatermarkPosition) -> str:
    """Create a branded version of non-image/PDF files"""
    try:
        # Create a simple text file with school info
        temp_file = tempfile.NamedTemporaryFile(
            suffix='.txt', 
            delete=False,
            mode='w',
            encoding='utf-8'
        )
        
        # Add school branding info at the top
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as original:
            content = original.read()
        
        branding_info = f"""
================================================================
                        {school.school_name}
                        {school.email}
                        {school.contact_number or ''}
================================================================

{content}
"""
        
        temp_file.write(branding_info)
        temp_file.close()
        
        return temp_file.name
        
    except Exception as e:
        print(f"Error creating branded version: {e}")
        return None

@api_router.post("/admin/download-watermarked-resource")
async def download_watermarked_resource(
    request: BatchWatermarkRequest,
    db: Session = Depends(get_db)
):
    """Download single watermarked resource for a specific school"""
    try:
        print(f"Single download for resource: {request.resource_id}")
        
        # Get resource
        resource = db.query(Resource).filter(Resource.resource_id == request.resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        # Get school (assuming school_ids is a single school ID string or first in list)
        school_id = None
        if isinstance(request.school_ids, str) and request.school_ids != 'all':
            school_id = request.school_ids
        elif isinstance(request.school_ids, list) and len(request.school_ids) > 0:
            school_id = request.school_ids[0]
        else:
            raise HTTPException(status_code=400, detail="School ID required")
        
        school = db.query(School).filter(School.school_id == school_id).first()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        print(f"Processing for school: {school.school_name}")
        
        # Get original file
        file_path = get_full_file_path(resource.file_path)
        
        # Create watermarked version
        watermarked_file = None
        if resource.file_type and 'pdf' in resource.file_type.lower():
            watermarked_file = add_watermark_to_pdf(file_path, school, request.positions)
        else:
            # For non-PDF files, return original with note
            # You could implement image watermarking here
            watermarked_file = file_path
        
        if not watermarked_file or not os.path.exists(watermarked_file):
            raise HTTPException(status_code=500, detail="Failed to create watermarked file")
        
        # Read file
        with open(watermarked_file, 'rb') as f:
            content = f.read()
        
        # Clean up temp file if it was created
        if watermarked_file != file_path and os.path.exists(watermarked_file):
            os.remove(watermarked_file)
        
        # Determine filename
        file_extension = resource.file_type.split('/')[-1] if resource.file_type else 'pdf'
        filename = f"{resource.name.replace(' ', '_')}_{school.school_name.replace(' ', '_')}.{file_extension}"
        
        return Response(
            content=content,
            media_type=resource.file_type or "application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": resource.file_type or "application/octet-stream"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading watermarked resource: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/batch-watermark/template/{resource_id}")
async def get_admin_batch_watermark_template(
    resource_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if not is_supported_batch_watermark_resource(resource):
        raise HTTPException(status_code=400, detail="Only PDF and image resources are supported in batch watermark")

    record = db.query(AdminBatchWatermarkTemplate).filter(
        AdminBatchWatermarkTemplate.admin_email == current_admin.get("sub"),
        AdminBatchWatermarkTemplate.resource_id == resource_id
    ).first()

    return {
        "resource_id": resource_id,
        "template": admin_batch_template_to_dict(record),
        "is_default": record is None,
        "updated_at": record.updated_at.isoformat() if record and record.updated_at else None
    }

@api_router.post("/admin/batch-watermark/template")
async def save_admin_batch_watermark_template(
    request: AdminBatchWatermarkTemplateRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(Resource.resource_id == request.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if not is_supported_batch_watermark_resource(resource):
        raise HTTPException(status_code=400, detail="Only PDF and image resources are supported in batch watermark")

    try:
        record = upsert_admin_batch_template(
            db,
            current_admin.get("sub"),
            request.resource_id,
            request.template
        )
        db.commit()

        return {
            "message": "Batch watermark layout saved successfully",
            "resource_id": request.resource_id,
            "template": admin_batch_template_to_dict(record),
            "updated_at": record.updated_at.isoformat() if record.updated_at else None
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error saving admin batch template: {e}")
        raise HTTPException(status_code=500, detail="Failed to save batch watermark layout")

@api_router.post("/admin/batch-watermark/generate")
async def generate_admin_batch_watermark_bundle(
    request: AdminBatchWatermarkGenerateRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    school_ids = [school_id for school_id in request.school_ids if school_id]
    resource_ids = [resource_id for resource_id in request.resource_ids if resource_id]

    if not school_ids:
        raise HTTPException(status_code=400, detail="Select at least one school")
    if not resource_ids:
        raise HTTPException(status_code=400, detail="Select at least one resource")

    school_rows = db.query(School).filter(School.school_id.in_(school_ids)).all()
    resource_rows = db.query(Resource).filter(Resource.resource_id.in_(resource_ids)).all()

    school_map = {school.school_id: school for school in school_rows}
    resource_map = {resource.resource_id: resource for resource in resource_rows}

    missing_school_ids = [school_id for school_id in school_ids if school_id not in school_map]
    if missing_school_ids:
        raise HTTPException(status_code=404, detail=f"School not found: {', '.join(missing_school_ids)}")

    missing_resource_ids = [resource_id for resource_id in resource_ids if resource_id not in resource_map]
    if missing_resource_ids:
        raise HTTPException(status_code=404, detail=f"Resource not found: {', '.join(missing_resource_ids)}")

    ordered_schools = [school_map[school_id] for school_id in school_ids]
    ordered_resources = [resource_map[resource_id] for resource_id in resource_ids]

    unsupported_resources = [resource.name for resource in ordered_resources if not is_supported_batch_watermark_resource(resource)]
    if unsupported_resources:
        raise HTTPException(
            status_code=400,
            detail=f"Batch watermark supports only PDF and image resources. Unsupported selection: {', '.join(unsupported_resources)}"
        )

    try:
        # Persist the latest layouts so the admin can continue where they left off.
        for resource in ordered_resources:
            upsert_admin_batch_template(
                db,
                current_admin.get("sub"),
                resource.resource_id,
                request.templates.get(resource.resource_id, get_batch_watermark_default_template())
            )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving layouts before generation: {e}")
        raise HTTPException(status_code=500, detail="Failed to save batch watermark layouts before generation")

    job_id = f"batch_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
    job_path = ensure_batch_job_within_root(get_batch_job_path(job_id))
    cleanup_batch_job_directory(job_path)
    job_path.mkdir(parents=True, exist_ok=True)

    manifest = {
        "job_id": job_id,
        "generated_by": current_admin.get("sub"),
        "created_at": datetime.utcnow().isoformat(),
        "school_ids": school_ids,
        "resource_ids": resource_ids,
        "folders": []
    }

    folder_names = set()

    try:
        for school in ordered_schools:
            folder_name = build_school_folder_name(folder_names, school)
            school_dir = job_path / folder_name
            school_dir.mkdir(parents=True, exist_ok=True)
            generated_files = []
            used_output_names = set()

            for resource in ordered_resources:
                source_path = get_full_file_path(resource.file_path)
                resource_ext = get_batch_resource_extension(resource, source_path)
                resource_label = sanitize_batch_name(
                    Path(resource.name).stem if Path(resource.name).suffix else resource.name,
                    resource.resource_id
                )
                output_name = f"{resource_label}{resource_ext}"
                if output_name in used_output_names:
                    output_name = f"{resource_label}_{resource.resource_id[:8]}{resource_ext}"
                used_output_names.add(output_name)

                output_path = school_dir / output_name
                result_path = generate_batch_watermarked_output(
                    resource,
                    school,
                    request.templates.get(resource.resource_id, get_batch_watermark_default_template()),
                    output_path
                )

                if not result_path or not os.path.exists(result_path):
                    raise RuntimeError(
                        f"Failed to generate watermarked file for school '{school.school_name}' and resource '{resource.name}'"
                    )

                generated_files.append({
                    "resource_id": resource.resource_id,
                    "resource_name": resource.name,
                    "file_name": output_name
                })

            manifest["folders"].append({
                "school_id": school.school_id,
                "school_name": school.school_name,
                "folder_name": folder_name,
                "file_count": len(generated_files),
                "files": generated_files
            })

        write_batch_job_manifest(job_path, manifest)

        return {
            "message": "Batch watermark folders generated successfully",
            "job_id": job_id,
            "created_at": manifest["created_at"],
            "folder_count": len(manifest["folders"]),
            "resource_count": len(resource_ids),
            "folders": [
                {
                    "school_id": folder["school_id"],
                    "school_name": folder["school_name"],
                    "folder_name": folder["folder_name"],
                    "file_count": folder["file_count"]
                }
                for folder in manifest["folders"]
            ]
        }
    except HTTPException:
        cleanup_batch_job_directory(job_path)
        raise
    except Exception as e:
        cleanup_batch_job_directory(job_path)
        print(f"Error generating admin batch watermark bundle: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/batch-watermark/download")
async def download_admin_batch_watermark_bundle(
    request: AdminBatchWatermarkDownloadRequest,
    current_admin: dict = Depends(get_current_admin)
):
    job_path = ensure_batch_job_within_root(get_batch_job_path(request.job_id))
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Generated batch watermark bundle not found")

    manifest = read_batch_job_manifest(job_path)
    if manifest.get("generated_by") != current_admin.get("sub"):
        raise HTTPException(status_code=403, detail="You do not have access to this generated bundle")

    folder_map = {
        folder["school_id"]: folder
        for folder in manifest.get("folders", [])
    }

    selected_school_ids = request.school_ids or list(folder_map.keys())
    missing_folders = [school_id for school_id in selected_school_ids if school_id not in folder_map]
    if missing_folders:
        raise HTTPException(status_code=404, detail=f"Folder not found for school: {', '.join(missing_folders)}")

    zip_base_name = (
        folder_map[selected_school_ids[0]]["folder_name"]
        if len(selected_school_ids) == 1
        else f"batch_watermark_{request.job_id}"
    )
    zip_filename = f"{sanitize_batch_name(zip_base_name, 'batch_watermark')}.zip"
    zip_path = job_path / zip_filename

    try:
        if zip_path.exists():
            zip_path.unlink()

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for school_id in selected_school_ids:
                folder_entry = folder_map[school_id]
                folder_path = ensure_batch_job_within_root((job_path / folder_entry["folder_name"]).resolve())
                if not folder_path.exists():
                    raise HTTPException(status_code=404, detail=f"Generated folder missing for school: {folder_entry['school_name']}")

                for file_path in folder_path.rglob("*"):
                    if file_path.is_file():
                        archive_name = str(Path(folder_entry["folder_name"]) / file_path.relative_to(folder_path))
                        zip_file.write(file_path, arcname=archive_name)

        return FileResponse(
            path=str(zip_path),
            filename=zip_filename,
            media_type="application/zip",
            headers={"Access-Control-Expose-Headers": "Content-Disposition"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating batch watermark zip: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create ZIP download")

@api_router.post("/admin/batch-watermark/send-emails")
async def send_admin_batch_watermark_emails(
    request: AdminBatchWatermarkEmailRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if not request.emails:
        raise HTTPException(status_code=400, detail="No email drafts provided")

    job_path = ensure_batch_job_within_root(get_batch_job_path(request.job_id))
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Generated batch watermark bundle not found")

    manifest = read_batch_job_manifest(job_path)
    if manifest.get("generated_by") != current_admin.get("sub"):
        raise HTTPException(status_code=403, detail="You do not have access to this generated bundle")

    email_settings = get_batch_email_settings()
    folder_map = {
        folder["school_id"]: folder
        for folder in manifest.get("folders", [])
    }

    requested_school_ids = [item.school_id for item in request.emails]
    missing_folders = [school_id for school_id in requested_school_ids if school_id not in folder_map]
    if missing_folders:
        raise HTTPException(status_code=404, detail=f"Folder not found for school: {', '.join(missing_folders)}")

    try:
        school_rows = db.query(School).filter(School.school_id.in_(requested_school_ids)).all()
    except Exception as e:
        print(f"Error loading schools for email sending: {e}")
        raise HTTPException(status_code=500, detail="Failed to load school email details")

    school_map = {school.school_id: school for school in school_rows}
    missing_schools = [school_id for school_id in requested_school_ids if school_id not in school_map]
    if missing_schools:
        raise HTTPException(status_code=404, detail=f"School not found: {', '.join(missing_schools)}")

    results = []
    smtp_client = None

    try:
        if email_settings["use_ssl"]:
            smtp_client = smtplib.SMTP_SSL(email_settings["host"], email_settings["port"], timeout=60)
        else:
            smtp_client = smtplib.SMTP(email_settings["host"], email_settings["port"], timeout=60)
            smtp_client.ehlo()
            if email_settings["use_tls"]:
                smtp_client.starttls()
                smtp_client.ehlo()

        smtp_client.login(email_settings["username"], email_settings["password"])

        for email_item in request.emails:
            school = school_map[email_item.school_id]
            folder_entry = folder_map[email_item.school_id]

            if not school.email:
                results.append({
                    "school_id": school.school_id,
                    "school_name": school.school_name,
                    "email": "",
                    "status": "failed",
                    "message": "School does not have an email address"
                })
                continue

            try:
                zip_bytes, zip_filename = build_school_batch_zip_bytes(job_path, folder_entry)

                # Build HTML email template
                email_template = build_batch_watermark_email(
                    school, 
                    zip_filename, 
                    email_item.subject, 
                    email_item.message
                )

                email_message = EmailMessage()
                email_message["Subject"] = email_template["subject"]
                email_message["From"] = (
                    formataddr((email_settings["from_name"], email_settings["from_email"]))
                    if email_settings["from_name"]
                    else email_settings["from_email"]
                )
                email_message["To"] = school.email
                email_message["Reply-To"] = email_settings["from_email"]
                
                # Add both text and HTML content
                email_message.set_content(email_template["text_content"])
                email_message.add_alternative(email_template["html_content"], subtype='html')
                
                email_message.add_attachment(
                    zip_bytes,
                    maintype="application",
                    subtype="zip",
                    filename=zip_filename
                )

                smtp_client.send_message(email_message)
                results.append({
                    "school_id": school.school_id,
                    "school_name": school.school_name,
                    "email": school.email,
                    "status": "sent",
                    "message": f"Email sent successfully with attachment {zip_filename}"
                })
            except Exception as send_error:
                print(f"Error sending batch watermark email to {school.school_name}: {send_error}")
                results.append({
                    "school_id": school.school_id,
                    "school_name": school.school_name,
                    "email": school.email,
                    "status": "failed",
                    "message": str(send_error)
                })
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error preparing email automation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send emails: {str(e)}")
    finally:
        if smtp_client:
            try:
                smtp_client.quit()
            except Exception:
                pass

    sent_count = len([item for item in results if item["status"] == "sent"])
    failed_count = len(results) - sent_count

    return {
        "message": f"Email automation completed. Sent: {sent_count}, Failed: {failed_count}",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "results": results
    }

# Authentication Routes
@api_router.post("/admin/login", response_model=LoginResponse)
async def admin_login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    admin = db.query(Admin).filter(Admin.email == login_data.email).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(
        data={"sub": admin.email, "user_type": "admin"}
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_type="admin",
        email=admin.email,
        name="Admin"
    )

@api_router.post("/school/login", response_model=LoginResponse)
async def school_login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """School login endpoint"""
    school = db.query(School).filter(School.email == login_data.email).first()
    
    if not school:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please contact admin for access."
        )
    
    if not verify_password(login_data.password, school.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Log login activity
    record_activity(
        db,
        school.school_id,
        school.school_name,
        "login",
        {
            "message": "School logged in successfully",
            "email": school.email
        }
    )
    db.commit()

    try:
        send_school_welcome_email_if_needed(db, school)
    except Exception as exc:
        print(f"Non-blocking welcome email error for {school.school_id}: {exc}")
    
    # FIX: Properly format logo path
    logo_path = None
    if school.logo_path:
        # Make sure logo_path has a leading slash
        if not school.logo_path.startswith('/'):
            logo_path = f"/{school.logo_path}"
        else:
            logo_path = school.logo_path
    
    access_token = create_access_token(
        data={
            "sub": school.email, 
            "user_type": "school", 
            "school_id": school.school_id, 
            "school_name": school.school_name, 
            "logo_path": logo_path
        }
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_type="school",
        email=school.email,
        name=school.school_name,
        school_id=school.school_id,
        logo_path=logo_path
    )

@api_router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Forgot password endpoint - generates reset token"""
    if request.user_type != "admin":
        raise HTTPException(
            status_code=400,
            detail="School password reset now uses mobile OTP verification."
        )

    # Check if user exists
    user = db.query(Admin).filter(Admin.email == request.email).first()
    
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    # Save token to database
    token_record = PasswordResetToken(
        email=request.email,
        token=reset_token,
        user_type=request.user_type,
        expires_at=expires_at
    )
    db.add(token_record)
    db.commit()
    
    # In production, send email here
    # For demo, we just return success message
    return {
        "message": "If the email exists, a password reset link has been sent",
        "demo_token": reset_token  # Only for demo, remove in production
    }

@api_router.post("/school/forgot-password/request-otp")
async def request_school_password_reset_otp(
    request: SchoolForgotPasswordOtpRequest,
    db: Session = Depends(get_db)
):
    """Send a mobile OTP only when the mobile number matches a registered school."""
    normalized_mobile = normalize_indian_mobile_number(request.mobile_number)
    if not normalized_mobile:
        raise HTTPException(status_code=400, detail="Enter a valid school mobile number")

    school = find_school_by_mobile_number(db, normalized_mobile)
    if not school:
        raise HTTPException(status_code=404, detail="This mobile number is not registered with any school")

    now = datetime.utcnow()
    latest_request = db.query(SchoolPasswordResetOTP).filter(
        SchoolPasswordResetOTP.school_id == school.school_id,
        SchoolPasswordResetOTP.purpose == "password_reset"
    ).order_by(SchoolPasswordResetOTP.created_at.desc()).first()

    if latest_request and latest_request.used_at is None:
        elapsed_seconds = int((now - latest_request.created_at).total_seconds())
        if elapsed_seconds < 60:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {60 - elapsed_seconds} seconds before requesting a new OTP"
            )

    active_requests = db.query(SchoolPasswordResetOTP).filter(
        SchoolPasswordResetOTP.school_id == school.school_id,
        SchoolPasswordResetOTP.purpose == "password_reset",
        SchoolPasswordResetOTP.used_at.is_(None)
    ).all()
    for active_request in active_requests:
        active_request.used_at = now

    otp_code = generate_numeric_otp(6)
    otp_request = SchoolPasswordResetOTP(
        request_id=generate_secure_token(),
        school_id=school.school_id,
        school_name=school.school_name,
        mobile_number=normalized_mobile,
        otp_code=otp_code,
        purpose="password_reset",
        expires_at=now + timedelta(minutes=10),
    )
    db.add(otp_request)

    # Try to send OTP with SMS fallback to email
    otp_result = send_otp_with_fallback(normalized_mobile, school.email, otp_code, school.school_name)
    
    if not otp_result["success"]:
        db.rollback()
        raise HTTPException(status_code=502, detail=otp_result["message"])
    
    db.commit()

    # Customize message based on delivery method
    if otp_result["method"] == "email":
        message = f"OTP sent successfully to {school.email} (SMS unavailable)"
        masked_info = f"Email: {school.email[:3]}***@{school.email.split('@')[1]}"
    else:
        message = f"OTP sent successfully to {mask_mobile_number(normalized_mobile)}"
        masked_info = mask_mobile_number(normalized_mobile)

    return {
        "message": message,
        "request_id": otp_request.request_id,
        "school_name": school.school_name,
        "masked_mobile_number": masked_info,
        "delivery_method": otp_result["method"],
        "expires_in_seconds": 600,
        "resend_in_seconds": 60
    }

@api_router.post("/school/forgot-password/verify-otp")
async def verify_school_password_reset_otp(
    request: SchoolForgotPasswordOtpVerifyRequest,
    db: Session = Depends(get_db)
):
    """Verify the OTP and issue a short-lived reset token."""
    normalized_mobile = normalize_indian_mobile_number(request.mobile_number)
    if not normalized_mobile:
        raise HTTPException(status_code=400, detail="Enter a valid school mobile number")

    otp_request = db.query(SchoolPasswordResetOTP).filter(
        SchoolPasswordResetOTP.request_id == request.request_id,
        SchoolPasswordResetOTP.purpose == "password_reset"
    ).first()

    if not otp_request:
        raise HTTPException(status_code=404, detail="Password reset request not found. Please request a new OTP.")

    if otp_request.mobile_number != normalized_mobile:
        raise HTTPException(status_code=400, detail="Mobile number does not match this OTP request")

    if otp_request.used_at is not None:
        raise HTTPException(status_code=400, detail="This OTP request is no longer active. Please request a new OTP.")

    now = datetime.utcnow()
    if otp_request.verified_at and otp_request.reset_token and otp_request.reset_token_expires_at and otp_request.reset_token_expires_at > now:
        return {
            "message": "OTP already verified",
            "reset_token": otp_request.reset_token,
            "school_name": otp_request.school_name
        }

    if now > otp_request.expires_at:
        otp_request.used_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")

    if otp_request.attempt_count >= 5:
        otp_request.used_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="Too many invalid OTP attempts. Please request a new OTP.")

    if request.otp.strip() != otp_request.otp_code:
        otp_request.attempt_count += 1
        if otp_request.attempt_count >= 5:
            otp_request.used_at = now
        db.commit()
        remaining_attempts = max(0, 5 - otp_request.attempt_count)
        detail = "Invalid OTP"
        if remaining_attempts > 0:
            detail = f"Invalid OTP. {remaining_attempts} attempt(s) remaining."
        else:
            detail = "Invalid OTP. Please request a new OTP."
        raise HTTPException(status_code=400, detail=detail)

    otp_request.verified_at = now
    otp_request.reset_token = generate_secure_token()
    otp_request.reset_token_expires_at = now + timedelta(minutes=15)
    db.commit()

    return {
        "message": "OTP verified successfully",
        "reset_token": otp_request.reset_token,
        "school_name": otp_request.school_name
    }

@api_router.post("/school/forgot-password/reset-password")
async def reset_school_password_with_otp(
    request: SchoolForgotPasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Reset school password after OTP verification and send success SMS."""
    password_error = validate_school_password(request.new_password, request.confirm_password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)

    otp_request = db.query(SchoolPasswordResetOTP).filter(
        SchoolPasswordResetOTP.reset_token == request.reset_token,
        SchoolPasswordResetOTP.purpose == "password_reset"
    ).first()

    if not otp_request or otp_request.used_at is not None or not otp_request.verified_at:
        raise HTTPException(status_code=400, detail="Reset session has expired. Please request a new OTP.")

    now = datetime.utcnow()
    if not otp_request.reset_token_expires_at or now > otp_request.reset_token_expires_at:
        otp_request.used_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="Reset session has expired. Please request a new OTP.")

    school = db.query(School).filter(School.school_id == otp_request.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School account not found")

    school.password_hash = get_password_hash(request.new_password)
    otp_request.used_at = now

    other_requests = db.query(SchoolPasswordResetOTP).filter(
        SchoolPasswordResetOTP.school_id == school.school_id,
        SchoolPasswordResetOTP.purpose == "password_reset",
        SchoolPasswordResetOTP.used_at.is_(None)
    ).all()
    for item in other_requests:
        item.used_at = now

    record_activity(
        db,
        school.school_id,
        school.school_name,
        "password_reset",
        {
            "message": "School password reset via OTP verification",
            "mobile_number": mask_mobile_number(otp_request.mobile_number)
        }
    )
    db.commit()

    # Send password reset success notification via email instead of SMS
    email_sent = True
    email_message = "Password reset success email sent"
    try:
        success_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Password Reset Successful</h2>
                <p>Dear {school.school_name},</p>
                <p>Your Koshquest password has been reset successfully.</p>
                <p>If you did not perform this action, please contact the administrator immediately.</p>
                <div style="background-color: #28a745; color: white; padding: 10px; 
                            text-align: center; border-radius: 5px; margin: 20px 0;">
                    ✅ Password Reset Completed
                </div>
                <hr style="border: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    This is an automated message from Koshquest Digital Library.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Create and send email
        msg = EmailMessage()
        msg['Subject'] = f"Koshquest Password Reset Successful - {school.school_name}"
        msg['From'] = f"{os.environ.get('DEFAULT_FROM_NAME', 'Koshquest')} <{os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@koshquest.in')}>"
        msg['To'] = school.email
        
        msg.add_alternative(success_message, subtype='html')
        
        # Send email using existing email configuration
        email_host = os.environ.get("EMAIL_HOST")
        email_port = int(os.environ.get("EMAIL_PORT", "587"))
        email_user = os.environ.get("EMAIL_USER")
        email_password = os.environ.get("EMAIL_PASSWORD")
        
        with smtplib.SMTP(email_host, email_port) as server:
            server.starttls()
            server.login(email_user, email_password)
            server.send_message(msg)
        
        print(f"Password reset success email sent to {school.email}")
        
    except Exception as exc:
        email_sent = False
        email_message = "Password updated, but success email could not be delivered"
        print(f"Password reset success email failed for {school.school_id}: {exc}")

    return {
        "message": "Password reset successfully",
        "email_sent": email_sent,
        "email_message": email_message
    }

# School Management Routes (Admin only)
@api_router.get("/admin/schools", response_model=List[SchoolResponse])
async def get_schools(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)):
    """Get all schools - Admin only"""
    schools = db.query(School).order_by(School.school_id).all()
    return schools

@api_router.post("/admin/schools", response_model=SchoolResponse)
async def create_school(
    school_id: str = Form(...),
    school_name: str = Form(...),
    email: str = Form(...),
    contact_number: Optional[str] = Form(None),  # ADDED
    password: str = Form(...),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Create a new school with optional logo upload"""
    # Check if school already exists
    existing_school = db.query(School).filter(
        (School.school_id == school_id) | (School.email == email)
    ).first()
    
    if existing_school:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="School ID or email already exists"
        )
    
    # Handle logo upload
    logo_path = None
    if logo:
        # Create school-specific folder
        school_folder = UPLOAD_DIR / school_id
        school_folder.mkdir(parents=True, exist_ok=True)
        
        # Save logo
        file_extension = logo.filename.split('.')[-1]
        logo_filename = f"logo.{file_extension}"
        logo_file_path = school_folder / logo_filename
        
        with open(logo_file_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)
        
        logo_path = f"/uploads/school_logos/{school_id}/{logo_filename}"
    
    # Create school
    password_hash = get_password_hash(password)
    new_school = School(
        school_id=school_id,
        school_name=school_name,
        email=email,
        contact_number=contact_number,  # ADDED
        password_hash=password_hash,
        logo_path=logo_path
    )
    
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    
    return new_school

@api_router.put("/admin/schools/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: str,
    school_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    contact_number: Optional[str] = Form(None),  # ADDED
    password: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Update school information"""
    school = db.query(School).filter(School.school_id == school_id).first()
    
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    # Update fields
    if school_name:
        school.school_name = school_name
    if email:
        # Check if email already used by another school
        existing = db.query(School).filter(
            School.email == email,
            School.id != school.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        school.email = email
    if contact_number is not None:  # ADDED
        school.contact_number = contact_number
    if password:
        school.password_hash = get_password_hash(password)
    
    # Handle logo update
    if logo:
        school_folder = UPLOAD_DIR / school_id
        school_folder.mkdir(parents=True, exist_ok=True)
        
        file_extension = logo.filename.split('.')[-1]
        logo_filename = f"logo.{file_extension}"
        logo_file_path = school_folder / logo_filename
        
        with open(logo_file_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)
        
        school.logo_path = f"/uploads/school_logos/{school_id}/{logo_filename}"
    
    school.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(school)
    
    return school

@api_router.delete("/admin/schools/{school_id}")
async def delete_school(school_id: str, db: Session = Depends(get_db)):
    """Delete a school"""
    school = db.query(School).filter(School.school_id == school_id).first()
    
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    # Delete school folder and logo
    school_folder = UPLOAD_DIR / school_id
    if school_folder.exists():
        shutil.rmtree(school_folder)
    
    db.delete(school)
    db.commit()
    
    return {"message": "School deleted successfully"}

# ==================== QR CODE REGISTRATION ====================

def get_next_available_school_id(db: Session) -> str:
    """Get the next available school ID (finds gaps in sequence)"""
    # Get all existing school IDs as integers
    existing_schools = db.query(School.school_id).all()
    existing_ids = []
    
    for school in existing_schools:
        try:
            existing_ids.append(int(school.school_id))
        except ValueError:
            # Skip non-numeric IDs if any exist
            continue
    
    if not existing_ids:
        return "1"
    
    # Sort the IDs
    existing_ids.sort()
    
    # Find the first missing ID
    for i, id in enumerate(existing_ids, 1):
        if i != id:
            return str(i)
    
    # If no gaps found, return next ID
    return str(existing_ids[-1] + 1)

@api_router.post("/admin/generate-qr")
async def generate_qr_code(request: Request, db: Session = Depends(get_db)):
    """Generate QR code for school registration"""
    try:
        # Get the actual request host to determine environment
        request_host = request.headers.get("host", "")
        request_url = str(request.url)
        
        # More reliable production detection using request host
        is_production = (
            "koshquest.in" in request_host or
            "koshquest.in" in request_url or
            config.environment == "production" or 
            os.environ.get("ENVIRONMENT") == "production"
        )
        
        if is_production:
            registration_url = "https://koshquest.in/register-school"
            qr_image_filename = "school_registration_qr_production.png"
            environment = "production"
        else:
            registration_url = "http://localhost:3000/register-school"
            qr_image_filename = "school_registration_qr_localhost.png"
            environment = "development"
        
        # Path to environment-specific QR image
        qr_image_path = ROOT_DIR / "public" / qr_image_filename
        
        if not qr_image_path.exists():
            raise HTTPException(status_code=404, detail="QR code image not found: {qr_image_filename}")
        
        # Read the static QR image
        with open(qr_image_path, "rb") as qr_file:
            qr_image_data = qr_file.read()
        
        # Convert to base64 for easy display
        qr_base64 = base64.b64encode(qr_image_data).decode()
        
        return {
            "qr_code": f"data:image/png;base64,{qr_base64}",
            "registration_url": registration_url,
            "environment": environment,
            "qr_filename": qr_image_filename,
            "is_production": is_production,
            "request_host": request_host,
            "request_url": request_url,
            "message": "QR code generated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")

@api_router.post("/register-school", response_model=SchoolResponse)
async def register_school_via_qr(
    school_name: str = Form(...),
    email: str = Form(...),
    contact_number: Optional[str] = Form(None),
    password: str = Form(...),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Register a new school via QR code scan (no school_id required)"""
    # Check if email already exists
    existing_school = db.query(School).filter(School.email == email).first()
    
    if existing_school:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Get next available school ID automatically
    school_id = get_next_available_school_id(db)
    
    # Handle logo upload
    logo_path = None
    if logo:
        # Create school-specific folder
        school_folder = UPLOAD_DIR / school_id
        school_folder.mkdir(parents=True, exist_ok=True)
        
        # Save logo
        file_extension = logo.filename.split('.')[-1]
        logo_filename = f"logo.{file_extension}"
        logo_file_path = school_folder / logo_filename
        
        with open(logo_file_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)
        
        logo_path = f"/uploads/school_logos/{school_id}/{logo_filename}"
    
    # Create school
    password_hash = get_password_hash(password)
    new_school = School(
        school_id=school_id,
        school_name=school_name,
        email=email,
        contact_number=contact_number,
        password_hash=password_hash,
        logo_path=logo_path
    )
    
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    
    return new_school

@api_router.post("/school/logout")
async def school_logout(
    payload: SchoolLogoutRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """School logout endpoint - log activity"""
    if current_user.get("user_type") != "school" or current_user.get("school_id") != payload.school_id:
        raise HTTPException(status_code=403, detail="School mismatch for logout")

    record_activity(
        db,
        payload.school_id,
        payload.school_name,
        "logout",
        {"message": "School logged out"}
    )
    db.commit()
    return {"message": "Logged out successfully"}

@api_router.post("/school/activity")
async def log_school_activity(
    school_id: str,
    school_name: str,
    activity_type: str,
    details: str = None,
    db: Session = Depends(get_db)
):
    """Log school activity"""
    record_activity(db, school_id, school_name, activity_type, details)
    db.commit()
    return {"message": "Activity logged"}

@api_router.post("/school/analytics/track")
async def track_school_analytics_event(
    request: SchoolAnalyticsEventRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Structured analytics event ingestion for school-side activity."""
    if current_user.get("user_type") != "school":
        raise HTTPException(status_code=403, detail="Only schools can send analytics events")
    if current_user.get("school_id") != request.school_id:
        raise HTTPException(status_code=403, detail="School mismatch for analytics event")

    record_activity(
        db,
        request.school_id,
        request.school_name,
        request.activity_type,
        request.details
    )
    db.commit()
    return {"message": "Analytics event tracked"}

@api_router.post("/school/analytics/search")
async def track_school_search_event(
    request: SchoolSearchEventRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Store searchable query analytics for school-side resource usage."""
    if current_user.get("user_type") != "school":
        raise HTTPException(status_code=403, detail="Only schools can send search analytics")
    if current_user.get("school_id") != request.school_id:
        raise HTTPException(status_code=403, detail="School mismatch for search analytics")

    normalized_query = (request.query or "").strip().lower()
    if len(normalized_query) < 2:
        return {"message": "Search query too short to track"}

    search_log = SchoolSearchLog(
        school_id=request.school_id,
        school_name=request.school_name,
        query=request.query.strip(),
        normalized_query=normalized_query,
        results_count=max(0, request.results_count or 0),
        category=request.category,
        sub_category=request.sub_category,
        filters_json=serialize_activity_details(request.filters)
    )
    db.add(search_log)
    record_activity(
        db,
        request.school_id,
        request.school_name,
        "resource_search",
        {
            "query": request.query.strip(),
            "results_count": max(0, request.results_count or 0),
            "category": request.category,
            "sub_category": request.sub_category,
            "filters": request.filters or {}
        }
    )
    db.commit()
    return {"message": "Search analytics tracked"}

@api_router.get("/admin/activities")
async def get_all_activities(db: Session = Depends(get_db)):
    """Get all school activities - Admin only"""
    activities = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(200).all()
    return [{
        "id": activity.id,
        "school_id": activity.school_id,
        "school_name": activity.school_name,
        "activity_type": activity.activity_type,
        "timestamp": activity.timestamp.isoformat(),
        "details": activity.details,
        "title": build_activity_title(activity.activity_type, parse_activity_details(activity.details)),
        "description": build_activity_description(activity.activity_type, parse_activity_details(activity.details))
    } for activity in activities]

# ==================== RESOURCE MANAGEMENT ROUTES ====================

@api_router.post("/admin/resources/upload", response_model=List[ResourceResponse])
async def upload_resource(
    name: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    class_level: Optional[str] = Form(None),
    sub_category: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    naming_option: str = Form("auto"),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Admin upload resource(s) - supports single or multiple files"""
    # Validate file size (100MB limit per file)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes
    
    uploaded_resources = []
    
    for index, file in enumerate(files):
        # Read file to check size
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} exceeds 100MB limit. Your file is {file_size / (1024*1024):.2f}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Generate unique resource ID
        resource_id = str(uuid.uuid4())
        
        # Create category folder
        category_folder = RESOURCES_UPLOAD_DIR / category
        category_folder.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_extension = file.filename.split('.')[-1]
        safe_filename = f"{resource_id}.{file_extension}"
        file_path_on_disk = category_folder / safe_filename
        
        with open(file_path_on_disk, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_path = f"/uploads/resources/{category}/{safe_filename}"
        
        # Handle resource naming based on naming option
        resource_name = name
        if len(files) > 1:
            if naming_option == "original":
                # Use original filename without extension
                original_name = file.filename
                if original_name:
                    # Remove file extension
                    if '.' in original_name:
                        resource_name = original_name.rsplit('.', 1)[0]
                    else:
                        resource_name = original_name
                else:
                    # Fallback to indexed naming if no filename
                    resource_name = f"{name} {index + 1}"
            else:
                # Auto-number files (default behavior)
                # Extract base name and number if already numbered
                import re
                match = re.match(r'(.+?)(\d+)$', name.strip())
                if match:
                    base_name = match.group(1)
                    start_num = int(match.group(2))
                    resource_name = f"{base_name}{start_num + index}"
                else:
                    # If no number at end, add numbering
                    if index == 0:
                        resource_name = name
                    else:
                        resource_name = f"{name} {index + 1}"
        
        # Create resource record
        new_resource = Resource(
            resource_id=resource_id,
            name=resource_name,
            description=description,
            category=category,
            sub_category=sub_category,
            file_path=file_path,
            file_type=file.content_type or f"application/{file_extension}",
            file_size=file_size,
            class_level=class_level,
            subject=subject,
            tags=tags,
            uploaded_by_type='admin',
            approval_status='approved',
            is_video_link=False
        )
        
        db.add(new_resource)
        uploaded_resources.append(new_resource)
    
    # Commit all resources at once
    db.commit()
    
    # Refresh all resources to get their IDs
    for resource in uploaded_resources:
        db.refresh(resource)
    
    return uploaded_resources

@api_router.post("/admin/resources/upload-link", response_model=ResourceResponse)
async def upload_video_link(
    name: str = Form(...),
    category: str = Form(...),
    sub_category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    class_level: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file_path: str = Form(...),
    file_type: str = Form('video/mp4'),
    file_size: int = Form(0),
    is_video_link: bool = Form(True),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Upload a video link resource - Admin only"""
    try:
        # Validate video link
        if not file_path or not file_path.startswith('http'):
            raise HTTPException(status_code=400, detail="Invalid video link provided")
        
        # Check if it's a valid video platform URL
        valid_domains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'bilibili.com']
        is_valid_domain = any(domain in file_path.lower() for domain in valid_domains)
        
        if not is_valid_domain:
            raise HTTPException(
                status_code=400, 
                detail="Unsupported video platform. Please use YouTube, Vimeo, Dailymotion, or Bilibili"
            )
        
        # Generate unique resource ID
        resource_id = str(uuid.uuid4())
        
        # Create resource record for video link
        new_resource = Resource(
            resource_id=resource_id,
            name=name,
            description=description,
            category=category,
            sub_category=sub_category,
            file_path=file_path,
            file_type=file_type,
            file_size=file_size,
            class_level=class_level,
            subject=subject,
            tags=tags,
            uploaded_by_type='admin',
            approval_status='approved',
            is_video_link=is_video_link
        )
        
        db.add(new_resource)
        db.commit()
        db.refresh(new_resource)
        
        return new_resource
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload video link: {str(e)}")

@api_router.get("/admin/resources", response_model=List[ResourceResponse])
async def get_all_resources(
    category: Optional[str] = None,
    approval_status: Optional[str] = None,
    uploaded_by_type: Optional[str] = None,
    sub_category: Optional[str] = None,
    class_level: Optional[str] = None,
    subject: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all resources - Admin only"""
    query = db.query(Resource)
    
    if category:
        query = query.filter(Resource.category == category)
    
    if approval_status:
        query = query.filter(Resource.approval_status == approval_status)
    
    if uploaded_by_type:
        query = query.filter(Resource.uploaded_by_type == uploaded_by_type)
    
    if sub_category:
        query = query.filter(Resource.sub_category == sub_category)
    
    if class_level:
        query = query.filter(Resource.class_level == class_level)
    
    if subject:
        query = query.filter(Resource.subject == subject)
    
    if search:
        query = query.filter(
            Resource.name.ilike(f"%{search}%") |
            Resource.description.ilike(f"%{search}%") |
            Resource.uploaded_by_name.ilike(f"%{search}%")
        )
    
    # Limit results to prevent performance issues
    resources = query.order_by(Resource.created_at.desc()).limit(1000).all()
    return resources

@api_router.put("/admin/resources/{resource_id}/approve")
async def approve_resource(resource_id: str, db: Session = Depends(get_db)):
    """Approve a school-uploaded resource"""
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    resource.approval_status = 'approved'
    resource.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Resource approved successfully"}

@api_router.put("/admin/resources/{resource_id}/reject")
async def reject_resource(resource_id: str, db: Session = Depends(get_db)):
    """Reject a school-uploaded resource"""
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    resource.approval_status = 'rejected'
    resource.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Resource rejected"}

@api_router.delete("/admin/resources/bulk")
async def bulk_delete_resources(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Delete multiple resources - Admin only"""
    data = await request.json()
    resource_ids = data.get('resource_ids', [])
    
    if not resource_ids:
        raise HTTPException(status_code=400, detail="No resource IDs provided")
    
    deleted_count = 0
    errors = []
    
    for resource_id in resource_ids:
        try:
            resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
            if not resource:
                errors.append(f"Resource {resource_id} not found")
                continue
            
            # Delete file from disk
            try:
                file_path = ROOT_DIR / resource.file_path.lstrip('/')
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                print(f"Error deleting file for resource {resource_id}: {e}")
            
            # Delete from database
            db.delete(resource)
            deleted_count += 1
            
        except Exception as e:
            errors.append(f"Error deleting resource {resource_id}: {str(e)}")
    
    db.commit()
    
    return {
        "message": f"Successfully deleted {deleted_count} resource(s)",
        "deleted_count": deleted_count,
        "errors": errors
    }

@api_router.delete("/admin/resources/all")
async def delete_all_resources(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Delete all resources (optionally filtered by category) - Admin only"""
    query = db.query(Resource)
    
    if category and category != 'all':
        query = query.filter(Resource.category == category)
    
    resources = query.all()
    
    if not resources:
        return {"message": "No resources found to delete", "deleted_count": 0}
    
    deleted_count = 0
    errors = []
    
    for resource in resources:
        try:
            # Delete file from disk
            try:
                file_path = ROOT_DIR / resource.file_path.lstrip('/')
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                print(f"Error deleting file for resource {resource.resource_id}: {e}")
            
            # Delete from database
            db.delete(resource)
            deleted_count += 1
            
        except Exception as e:
            errors.append(f"Error deleting resource {resource.resource_id}: {str(e)}")
    
    db.commit()
    
    return {
        "message": f"Successfully deleted {deleted_count} resource(s)",
        "deleted_count": deleted_count,
        "errors": errors
    }

@api_router.delete("/admin/resources/{resource_id}")
async def delete_resource(resource_id: str, db: Session = Depends(get_db)):
    """Delete a resource - Admin only"""
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Delete file from disk
    file_path = ROOT_DIR / resource.file_path.lstrip('/')
    if file_path.exists():
        file_path.unlink()
    
    db.delete(resource)
    db.commit()
    
    return {"message": "Resource deleted successfully"}

@api_router.put("/admin/resources/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    class_level: Optional[str] = Form(None),
    sub_category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Update a resource - Admin only"""
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if name is not None:
        resource.name = name
    if description is not None:
        resource.description = description
    if class_level is not None:
        resource.class_level = class_level
    if sub_category is not None:
        resource.sub_category = sub_category
    if tags is not None:
        resource.tags = tags

    if file is not None:
        MAX_FILE_SIZE = 100 * 1024 * 1024
        contents = await file.read()
        file_size = len(contents)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds 100MB limit. Your file is {file_size / (1024*1024):.2f}MB"
            )
        await file.seek(0)

        category_folder = RESOURCES_UPLOAD_DIR / resource.category
        category_folder.mkdir(parents=True, exist_ok=True)

        file_extension = file.filename.split('.')[-1]
        safe_filename = f"{resource.resource_id}.{file_extension}"
        file_path_on_disk = category_folder / safe_filename

        # Delete old file if exists
        old_file_path = ROOT_DIR / resource.file_path.lstrip('/')
        if old_file_path.exists():
            old_file_path.unlink()

        with open(file_path_on_disk, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        resource.file_path = f"/uploads/resources/{resource.category}/{safe_filename}"
        resource.file_type = file.content_type or f"application/{file_extension}"
        resource.file_size = file_size
        resource.is_video_link = False

    resource.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(resource)

    return resource

# School Resource Routes
@api_router.get("/school/resources", response_model=List[ResourceResponse])
async def get_school_resources(
    category: Optional[str] = None,
    school_id: Optional[str] = None,
    class_level: Optional[str] = None,
    subject: Optional[str] = None,
    sub_category: Optional[str] = None,
    approval_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get resources visible to schools (approved admin resources + own uploads)"""
    query = db.query(Resource).filter(
        (Resource.uploaded_by_type == 'admin') | 
        (Resource.uploaded_by_id == school_id)
    )
    
    # Apply category filter
    if category:
        query = query.filter(Resource.category == category)
    
    # Apply sub-category filter
    if sub_category:
        query = query.filter(Resource.sub_category == sub_category)
    
    # Apply class level filter
    if class_level:
        query = query.filter(Resource.class_level == class_level)
    
    # Apply subject filter
    if subject:
        query = query.filter(Resource.subject == subject)
    
    # Apply approval status filter
    if approval_status:
        query = query.filter(Resource.approval_status == approval_status)
    
    # Only show approved resources or school's own pending uploads
    query = query.filter(
        (Resource.approval_status == 'approved') |
        ((Resource.uploaded_by_id == school_id) & (Resource.uploaded_by_type == 'school'))
    )
    
    resources = query.order_by(Resource.created_at.desc()).all()
    return resources

@api_router.post("/school/resources/upload", response_model=ResourceResponse)
async def school_upload_resource(
    name: str = Form(...),
    category: str = Form(...),
    school_id: str = Form(...),
    school_name: str = Form(...),
    description: Optional[str] = Form(None),
    class_level: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    sub_category: Optional[str] = Form(None),
    consent_to_share: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """School upload resource (requires admin approval)"""
    # Validate file size (100MB limit)
    MAX_FILE_SIZE = 100 * 1024 * 1024
    
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds 100MB limit"
        )
    
    await file.seek(0)
    
    resource_id = str(uuid.uuid4())
    
    # Create category folder
    category_folder = RESOURCES_UPLOAD_DIR / category / "school_uploads" / school_id
    category_folder.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_extension = file.filename.split('.')[-1]
    safe_filename = f"{resource_id}.{file_extension}"
    file_path_on_disk = category_folder / safe_filename
    
    with open(file_path_on_disk, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_path = f"/uploads/resources/{category}/school_uploads/{school_id}/{safe_filename}"
    
    # Create resource record (pending approval)
    new_resource = Resource(
        resource_id=resource_id,
        name=name,
        description=description,
        category=category,
        file_path=file_path,
        file_type=file.content_type or f"application/{file_extension}",
        file_size=file_size,
        class_level=class_level,
        subject=subject,
        sub_category=sub_category,
        consent_to_share=consent_to_share,
        tags=tags or "",
        uploaded_by_type='school',
        uploaded_by_id=school_id,
        uploaded_by_name=school_name,
        approval_status='pending',
        is_video_link=False
    )
    
    db.add(new_resource)
    record_activity(
        db,
        school_id,
        school_name,
        "resource_upload",
        {
            "resource_id": resource_id,
            "resource_name": name,
            "category": category,
            "file_type": file.content_type or f"application/{file_extension}",
            "file_size": file_size
        }
    )
    db.commit()
    db.refresh(new_resource)
    
    return new_resource

@api_router.get("/resources/{resource_id}/download")
async def download_resource(
    resource_id: str,
    school_id: str = None,
    school_name: str = None,
    format: str = None,
    db: Session = Depends(get_db)
):
    """Download a resource file"""
    try:
        print(f"Download requested for resource_id: {resource_id}")
        print(f"School info: {school_id}, {school_name}")
        
        # Get the resource from the database
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            print(f"Resource not found in database: {resource_id}")
            raise HTTPException(status_code=404, detail="Resource not found")
        
        print(f"Resource found: {resource.name}, file_path: {resource.file_path}")
        
        # Get the file path - FIXED: Handle different path formats
        file_path = resource.file_path
        
        # Remove leading slash if present
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_file_path = os.path.join(ROOT_DIR, file_path)
        print(f"Looking for file at: {full_file_path}")
        
        if not os.path.exists(full_file_path):
            # Try alternative path structure - if path starts with uploads/
            if file_path.startswith('uploads/'):
                alt_path = file_path
            else:
                alt_path = os.path.join("uploads", file_path)
            
            full_file_path = os.path.join(ROOT_DIR, alt_path)
            print(f"Trying alternative path: {full_file_path}")
            
            if not os.path.exists(full_file_path):
                # Last attempt: check if file exists in resources directory
                filename = os.path.basename(file_path)
                resource_dir = os.path.join(ROOT_DIR, "uploads", "resources", resource.category)
                full_file_path = os.path.join(resource_dir, filename)
                print(f"Trying resources directory: {full_file_path}")
                
                if not os.path.exists(full_file_path):
                    print(f"File not found at any location for resource: {resource_id}")
                    print(f"File path in DB: {resource.file_path}")
                    raise HTTPException(status_code=404, detail="File not found on server")
        
        print(f"File found at: {full_file_path}, size: {os.path.getsize(full_file_path)} bytes")
        
        # Log download if school info is provided
        if school_id and school_name:
            download_log = ResourceDownload(
                resource_id=resource_id,
                school_id=school_id,
                school_name=school_name
            )
            db.add(download_log)
            record_activity(
                db,
                school_id,
                school_name,
                "resource_download",
                {
                    "resource_id": resource.resource_id,
                    "resource_name": resource.name,
                    "category": resource.category,
                    "format": format or "original",
                    "branded": False
                }
            )
            
            # Increment download count
            resource.download_count += 1
            db.commit()
        
        # Determine file extension for download
        file_extension = resource.file_type.split('/')[-1] if resource.file_type else ''
        download_filename = f"{resource.name}"
        if file_extension and not download_filename.endswith(f".{file_extension}"):
            download_filename = f"{download_filename}.{file_extension}"
        
        requested_format = (format or "").strip().lower()

        # If PDF format is requested for an image, convert on the fly
        if requested_format == "pdf":
            if is_image_type(resource.file_type, full_file_path):
                pdf_bytes = image_bytes_to_pdf_bytes(full_file_path)
                pdf_filename = os.path.splitext(download_filename)[0] + ".pdf"
                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f"attachment; filename=\"{pdf_filename}\"",
                        "Content-Length": str(len(pdf_bytes))
                    }
                )
            # If original is already PDF, just return it
            if (resource.file_type or "").lower() == "application/pdf" or full_file_path.lower().endswith(".pdf"):
                return FileResponse(
                    path=full_file_path,
                    filename=download_filename,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f"attachment; filename=\"{download_filename}\"",
                        "Access-Control-Expose-Headers": "Content-Disposition"
                    }
                )
            raise HTTPException(status_code=400, detail="PDF format is only supported for image resources")

        # Default: return the file as-is
        return FileResponse(
            path=full_file_path,
            filename=download_filename,
            media_type=resource.file_type or 'application/octet-stream',
            headers={
                "Content-Disposition": f"attachment; filename=\"{download_filename}\"",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except HTTPException as he:
        print(f"HTTP Exception in download: {he.detail}")
        raise he
    except Exception as e:
        db.rollback()
        print(f"Download error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/resources/{resource_id}/preview")
async def preview_resource(
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Preview a resource file (supports all file types)"""
    try:
        print(f"Preview requested for resource_id: {resource_id}")
        
        # Get the resource from the database
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        print(f"Resource found: {resource.name}, file_path: {resource.file_path}, file_type: {resource.file_type}")
        
        # Get the file path - FIXED: Handle different path formats
        file_path = resource.file_path
        
        # Remove leading slash if present
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_file_path = os.path.join(ROOT_DIR, file_path)
        print(f"Looking for file at: {full_file_path}")
        
        if not os.path.exists(full_file_path):
            # Try alternative path structure
            if file_path.startswith('uploads/'):
                alt_path = file_path
            else:
                alt_path = os.path.join("uploads", file_path)
            
            full_file_path = os.path.join(ROOT_DIR, alt_path)
            print(f"Trying alternative path: {full_file_path}")
            
            if not os.path.exists(full_file_path):
                # Last attempt: check if file exists in resources directory
                filename = os.path.basename(file_path)
                resource_dir = os.path.join(ROOT_DIR, "uploads", "resources", resource.category)
                full_file_path = os.path.join(resource_dir, filename)
                print(f"Trying resources directory: {full_file_path}")
                
                if not os.path.exists(full_file_path):
                    raise HTTPException(status_code=404, detail="File not found on server")
        
        print(f"File found for preview: {full_file_path}")
        
        # Determine the correct media type
        file_type = resource.file_type
        if not file_type or file_type == 'application/octet-stream':
            # Try to infer from file extension
            import mimetypes
            file_type = mimetypes.guess_type(full_file_path)[0] or 'application/octet-stream'
            print(f"Inferred file type: {file_type}")
        
        # Return the file for inline preview with proper headers
        # Using "inline" disposition allows browser to display the file
        return FileResponse(
            path=full_file_path,
            filename=resource.name,
            media_type=file_type,
            headers={
                "Content-Disposition": f"inline; filename=\"{resource.name}\"",
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Preview error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/resources/{resource_id}/pdf-metadata")
async def pdf_metadata(
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Return basic PDF metadata for rendering previews"""
    try:
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

        try:
            full_file_path = get_full_file_path(resource.file_path)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="File not found on server")
        file_type = (resource.file_type or "").lower()
        if ("pdf" not in file_type) and (not full_file_path.lower().endswith(".pdf")):
            raise HTTPException(status_code=400, detail="Resource is not a PDF")

        pdf_document = fitz.open(full_file_path)
        page_sizes = [
            {"width": page.rect.width, "height": page.rect.height}
            for page in pdf_document
        ]
        pdf_document.close()

        return {"page_count": len(page_sizes), "page_sizes": page_sizes}
    except HTTPException:
        raise
    except Exception as e:
        print(f"PDF metadata error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/resources/{resource_id}/pdf-page/{page_number}")
async def pdf_page_image(
    resource_id: str,
    page_number: int,
    width: int = 800,
    db: Session = Depends(get_db)
):
    """Render a single PDF page as PNG for preview"""
    try:
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

        try:
            full_file_path = get_full_file_path(resource.file_path)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="File not found on server")
        file_type = (resource.file_type or "").lower()
        if ("pdf" not in file_type) and (not full_file_path.lower().endswith(".pdf")):
            raise HTTPException(status_code=400, detail="Resource is not a PDF")

        if page_number < 1:
            raise HTTPException(status_code=400, detail="Invalid page number")

        width = int(clamp(width, 300, 1800))

        pdf_document = fitz.open(full_file_path)
        if page_number > len(pdf_document):
            pdf_document.close()
            raise HTTPException(status_code=404, detail="Page not found")

        page = pdf_document[page_number - 1]
        zoom = width / page.rect.width if page.rect.width else 1.0
        matrix = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        image_bytes = pix.tobytes("png")
        pdf_document.close()

        return Response(
            content=image_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=3600"}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"PDF page render error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Debug endpoint to check file structure
@api_router.get("/debug/files")
async def debug_files():
    """Debug endpoint to list all uploaded files"""
    import glob
    files = []
    for file_path in glob.glob(str(RESOURCES_UPLOAD_DIR) + "/**/*", recursive=True):
        if os.path.isfile(file_path):
            relative_path = os.path.relpath(file_path, ROOT_DIR)
            files.append({
                "path": relative_path,
                "size": os.path.getsize(file_path),
                "exists": os.path.exists(file_path)
            })
    return {"files": files}

# ==================== ANNOUNCEMENT ROUTES ====================

@api_router.post("/admin/announcements", response_model=AnnouncementResponse)
async def create_announcement(announcement: AnnouncementCreate, db: Session = Depends(get_db)):
    """Create announcement - Admin only"""
    new_announcement = Announcement(
        title=announcement.title,
        content=announcement.content,
        priority=announcement.priority,
        target_schools=announcement.target_schools
    )
    
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    
    return new_announcement

@api_router.get("/admin/announcements", response_model=List[AnnouncementResponse])
async def get_admin_announcements(db: Session = Depends(get_db)):
    """Get all announcements - Admin"""
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return announcements

@api_router.put("/admin/announcements/{announcement_id}")
async def update_announcement(
    announcement_id: int,
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db)
):
    """Update announcement - Admin only"""
    existing = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    existing.title = announcement.title
    existing.content = announcement.content
    existing.priority = announcement.priority
    existing.target_schools = announcement.target_schools
    existing.updated_at = datetime.utcnow()

    db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == announcement_id
    ).delete()
    
    db.commit()
    db.refresh(existing)
    
    return existing

@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(announcement_id: int, db: Session = Depends(get_db)):
    """Delete announcement - Admin only"""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == announcement_id
    ).delete()
    db.delete(announcement)
    db.commit()
    
    return {"message": "Announcement deleted"}

@api_router.get("/school/announcements", response_model=List[AnnouncementResponse])
async def get_school_announcements(school_id: str, db: Session = Depends(get_db)):
    """Get announcements for school"""
    return get_visible_school_announcements(db, school_id)

@api_router.post("/school/announcements/mark-read")
async def mark_school_announcements_read(
    request: AnnouncementReadRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark selected or visible announcements as read for a school."""
    if current_user.get("user_type") != "school" or current_user.get("school_id") != request.school_id:
        raise HTTPException(status_code=403, detail="School mismatch for announcement read state")

    visible_announcements = get_visible_school_announcements(db, request.school_id)
    visible_ids = {announcement.id for announcement in visible_announcements}
    target_ids = set(request.announcement_ids or list(visible_ids))
    target_ids = target_ids.intersection(visible_ids)

    if not target_ids:
        return {"message": "No announcements to mark as read", "updated": 0}

    existing_reads = {
        entry.announcement_id
        for entry in db.query(AnnouncementRead).filter(
            AnnouncementRead.school_id == request.school_id,
            AnnouncementRead.announcement_id.in_(target_ids)
        ).all()
    }

    created_count = 0
    for announcement_id in target_ids:
        if announcement_id in existing_reads:
            continue
        db.add(AnnouncementRead(
            announcement_id=announcement_id,
            school_id=request.school_id
        ))
        created_count += 1

    db.commit()
    return {"message": "Announcements marked as read", "updated": created_count}

# ==================== SUPPORT TICKET ROUTES ====================

@api_router.post("/school/support/tickets", response_model=SupportTicketResponse)
async def create_support_ticket(
    subject: str = Form(...),
    message: str = Form(...),
    category: str = Form(...),
    priority: str = Form(...),
    school_id: str = Form(...),
    school_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create support ticket - School"""
    ticket_id = f"TICKET-{uuid.uuid4().hex[:8].upper()}"
    
    new_ticket = SupportTicket(
        ticket_id=ticket_id,
        school_id=school_id,
        school_name=school_name,
        subject=subject,
        message=message,
        category=category,
        priority=priority
    )
    
    db.add(new_ticket)
    record_activity(
        db,
        school_id,
        school_name,
        "support_ticket_created",
        {
            "ticket_id": ticket_id,
            "subject": subject,
            "category": category,
            "priority": priority
        }
    )
    db.commit()
    db.refresh(new_ticket)
    
    return new_ticket

@api_router.get("/school/support/tickets", response_model=List[SupportTicketResponse])
async def get_school_tickets(school_id: str, db: Session = Depends(get_db)):
    """Get tickets for school"""
    tickets = db.query(SupportTicket).filter(
        SupportTicket.school_id == school_id
    ).order_by(SupportTicket.created_at.desc()).all()

    now = datetime.utcnow()
    updated = False
    for ticket in tickets:
        if ticket.admin_updated_at and (
            ticket.school_last_viewed_at is None or ticket.admin_updated_at > ticket.school_last_viewed_at
        ):
            ticket.school_last_viewed_at = now
            updated = True

    if updated:
        db.commit()

    return tickets

@api_router.get("/admin/support/tickets", response_model=List[SupportTicketResponse])
async def get_all_tickets(db: Session = Depends(get_db)):
    """Get all support tickets - Admin"""
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    return tickets

@api_router.put("/admin/support/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    status: Optional[str] = Form(None),
    admin_response: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Update support ticket - Admin"""
    print(f"Updating ticket {ticket_id} with status: {status}, admin_response: {admin_response}")
    
    ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    print(f"Before update - Ticket status: {ticket.status}, admin_response: {ticket.admin_response}")
    
    if status:
        ticket.status = status
        if status == 'resolved':
            ticket.resolved_at = datetime.utcnow()
    
    if admin_response:
        ticket.admin_response = admin_response

    if status is not None or admin_response is not None:
        ticket.admin_updated_at = datetime.utcnow()
    
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    
    print(f"After update - Ticket status: {ticket.status}, admin_response: {ticket.admin_response}")
    
    return ticket

@api_router.delete("/admin/support/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: str, 
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete support ticket - Admin"""
    print(f"DELETE request received for ticket: {ticket_id}")
    
    ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == ticket_id).first()
    
    if not ticket:
        print(f"Ticket {ticket_id} not found")
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    print(f"Deleting ticket: {ticket.ticket_id} - {ticket.subject}")
    db.delete(ticket)
    db.commit()
    
    print(f"Ticket {ticket_id} deleted successfully")
    return {"message": "Ticket deleted successfully"}

# ==================== CHAT ROUTES ====================

@api_router.post("/chat/send", response_model=ChatMessageResponse)
async def send_chat_message(
    school_id: str = Form(...),
    school_name: str = Form(...),
    sender_type: str = Form(...),
    message: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send chat message"""
    new_message = ChatMessage(
        school_id=school_id,
        school_name=school_name,
        sender_type=sender_type,
        message=message
    )
    
    db.add(new_message)
    if sender_type == "school":
        record_activity(
            db,
            school_id,
            school_name,
            "chat_message_sent",
            {
                "message_length": len(message or ""),
                "preview": (message or "")[:120]
            }
        )
    db.commit()
    db.refresh(new_message)
    
    return new_message

@api_router.get("/chat/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    school_id: str, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat messages for a school"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.school_id == school_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    return messages

@api_router.put("/chat/mark-read/{school_id}")
async def mark_messages_read(
    school_id: str, 
    sender_type: str, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark messages as read"""
    # Mark all messages from opposite sender as read
    opposite_sender = 'school' if sender_type == 'admin' else 'admin'
    
    db.query(ChatMessage).filter(
        ChatMessage.school_id == school_id,
        ChatMessage.sender_type == opposite_sender,
        ChatMessage.is_read == False
    ).update({ChatMessage.is_read: True})
    
    db.commit()
    
    return {"message": "Messages marked as read"}

# ==================== KNOWLEDGE BASE ROUTES ====================

@api_router.post("/admin/knowledge-base", response_model=KnowledgeArticleResponse)
async def create_article(article: KnowledgeArticleCreate, db: Session = Depends(get_db)):
    """Create knowledge base article - Admin"""
    new_article = KnowledgeArticle(
        title=article.title,
        content=article.content,
        category=article.category,
        tags=article.tags
    )
    
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    
    return new_article

@api_router.get("/knowledge-base", response_model=List[KnowledgeArticleResponse])
async def get_articles(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Get knowledge base articles"""
    query = db.query(KnowledgeArticle).filter(KnowledgeArticle.is_published == True)
    
    if category:
        query = query.filter(KnowledgeArticle.category == category)
    
    articles = query.order_by(KnowledgeArticle.created_at.desc()).all()
    return articles

@api_router.get("/knowledge-base/{article_id}", response_model=KnowledgeArticleResponse)
async def get_article(article_id: int, db: Session = Depends(get_db)):
    """Get single article and increment view count"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    article.view_count += 1
    db.commit()
    db.refresh(article)
    
    return article

@api_router.delete("/admin/knowledge-base/{article_id}")
async def delete_article(article_id: int, db: Session = Depends(get_db)):
    """Delete article - Admin"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db.delete(article)
    db.commit()
    
    return {"message": "Article deleted"}

# ==================== LOGO POSITIONING ROUTES ====================

@api_router.post("/school/logo-position")
async def save_logo_position(
    school_id: str = Form(...),
    resource_id: str = Form(...),
    x_position: int = Form(...),
    y_position: int = Form(...),
    width: int = Form(...),
    opacity: float = Form(...),
    rotation: int = Form(0),
    db: Session = Depends(get_db)
):
    """Save or update logo position for a specific resource"""
    # Check if resource exists
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Check if school has access to this resource
    if resource.uploaded_by_type == 'school' and resource.uploaded_by_id != school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate values
    if not (0 <= x_position <= 100):
        raise HTTPException(status_code=400, detail="X position must be between 0 and 100")
    if not (0 <= y_position <= 100):
        raise HTTPException(status_code=400, detail="Y position must be between 0 and 100")
    if not (5 <= width <= 50):
        raise HTTPException(status_code=400, detail="Width must be between 5 and 50")
    if not (0.1 <= opacity <= 1.0):
        raise HTTPException(status_code=400, detail="Opacity must be between 0.1 and 1.0")
    rotation = normalize_rotation(rotation)
    
    print(f"Saving logo position for school: {school_id}, resource: {resource_id}")
    print(f"Position: x={x_position}, y={y_position}, width={width}, opacity={opacity}, rotation={rotation}")
    
    # Check if position already exists
    existing_position = db.query(SchoolLogoPosition).filter(
        SchoolLogoPosition.school_id == school_id,
        SchoolLogoPosition.resource_id == resource_id
    ).first()
    
    if existing_position:
        # Update existing position
        existing_position.x_position = x_position
        existing_position.y_position = y_position
        existing_position.width = width
        existing_position.opacity = opacity
        existing_position.rotation = rotation
        existing_position.updated_at = datetime.utcnow()
        message = "Logo position updated successfully"
        print(f"Updated existing position: {existing_position.id}")
    else:
        # Create new position
        new_position = SchoolLogoPosition(
            school_id=school_id,
            resource_id=resource_id,
            x_position=x_position,
            y_position=y_position,
            width=width,
            opacity=opacity,
            rotation=rotation
        )
        db.add(new_position)
        message = "Logo position saved successfully"
        print(f"Created new position for school: {school_id}")
    
    db.commit()
    print(f"Logo position saved successfully for school: {school_id}")
    return {"message": message, "status": "success"}

@api_router.get("/school/logo-position/{resource_id}")
async def get_logo_position(
    school_id: str,
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Get saved logo position for a specific resource"""
    print(f"Getting logo position for school: {school_id}, resource: {resource_id}")
    
    position = db.query(SchoolLogoPosition).filter(
        SchoolLogoPosition.school_id == school_id,
        SchoolLogoPosition.resource_id == resource_id
    ).first()
    
    if not position:
        # Return default position
        print(f"No saved position found, returning defaults")
        return {
            "x_position": 50,
            "y_position": 10,
            "width": 20,
            "opacity": 0.7,
            "rotation": 0,
            "is_default": True
        }
    
    print(f"Found saved position: x={position.x_position}, y={position.y_position}")
    return {
        "x_position": position.x_position,
        "y_position": position.y_position,
        "width": position.width,
        "opacity": position.opacity,
        "rotation": position.rotation or 0,
        "is_default": False,
        "updated_at": position.updated_at.isoformat() if position.updated_at else None
    }

@api_router.delete("/school/logo-position/{resource_id}")
async def reset_logo_position(
    school_id: str,
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Reset logo position to default"""
    print(f"Resetting logo position for school: {school_id}, resource: {resource_id}")
    
    position = db.query(SchoolLogoPosition).filter(
        SchoolLogoPosition.school_id == school_id,
        SchoolLogoPosition.resource_id == resource_id
    ).first()
    
    if position:
        db.delete(position)
        db.commit()
        print(f"Deleted position for school: {school_id}")
    
    return {"message": "Logo position reset to default"}

# ==================== TEXT WATERMARK ROUTES ====================

@api_router.post("/school/text-watermark")
async def save_text_watermark_position(
    school_id: str = Form(...),
    resource_id: str = Form(...),
    name_x: int = Form(...),
    name_y: int = Form(...),
    name_size: int = Form(...),
    name_opacity: float = Form(...),
    name_rotation: int = Form(0),
    name_font: str = Form("Arial"),
    name_style: str = Form("normal"),
    name_color: str = Form("#000000"),
    show_name: Optional[Union[bool, str, int]] = Form(True),
    contact_x: int = Form(...),
    contact_y: int = Form(...),
    contact_size: int = Form(...),
    contact_opacity: float = Form(...),
    contact_rotation: int = Form(0),
    contact_font: str = Form("Arial"),
    contact_style: str = Form("normal"),
    contact_color: str = Form("#000000"),
    show_contact: Optional[Union[bool, str, int]] = Form(True),
    address_x: int = Form(50),
    address_y: int = Form(85),
    address_size: int = Form(10),
    address_opacity: float = Form(1.0),
    address_rotation: int = Form(0),
    address_font: str = Form("Arial"),
    address_style: str = Form("normal"),
    address_color: str = Form("#000000"),
    show_address: Optional[Union[bool, str, int]] = Form(False),
    address: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Save or update text watermark position"""
    print(
        "Received text watermark data: "
        f"name_x={name_x}, name_y={name_y}, name_size={name_size}, name_opacity={name_opacity}, "
        f"name_rotation={name_rotation}, name_font={name_font}, name_style={name_style}, name_color={name_color}, "
        f"contact_x={contact_x}, contact_y={contact_y}, contact_size={contact_size}, contact_opacity={contact_opacity}, "
        f"contact_rotation={contact_rotation}, contact_font={contact_font}, contact_style={contact_style}, contact_color={contact_color}, "
        f"address_x={address_x}, address_y={address_y}, address_size={address_size}, address_opacity={address_opacity}, "
        f"address_rotation={address_rotation}, address_font={address_font}, address_style={address_style}, address_color={address_color}"
    )
    
    # Check if resource exists
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Check if school has access
    if resource.uploaded_by_type == 'school' and resource.uploaded_by_id != school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate values
    if not (0 <= name_x <= 100) or not (0 <= name_y <= 100):
        raise HTTPException(status_code=400, detail="Name position must be between 0 and 100")
    if not (0 <= contact_x <= 100) or not (0 <= contact_y <= 100):
        raise HTTPException(status_code=400, detail="Contact position must be between 0 and 100")
    if not (0 <= address_x <= 100) or not (0 <= address_y <= 100):
        raise HTTPException(status_code=400, detail="Address position must be between 0 and 100")
    if not (8 <= name_size <= 48):
        raise HTTPException(status_code=400, detail="Name size must be between 8 and 48")
    if not (8 <= contact_size <= 24):
        raise HTTPException(status_code=400, detail="Contact size must be between 8 and 24")
    if not (6 <= address_size <= 24):
        raise HTTPException(status_code=400, detail="Address size must be between 6 and 24")
    if not (0.1 <= name_opacity <= 1.0) or not (0.1 <= contact_opacity <= 1.0) or not (0.1 <= address_opacity <= 1.0):
        raise HTTPException(status_code=400, detail="Opacity must be between 0.1 and 1.0")

    name_rotation = normalize_rotation(name_rotation)
    contact_rotation = normalize_rotation(contact_rotation)
    address_rotation = normalize_rotation(address_rotation)

    name_font = name_font or "Arial"
    contact_font = contact_font or "Arial"
    address_font = address_font or "Arial"

    name_style = name_style or "normal"
    contact_style = contact_style or "normal"
    address_style = address_style or "normal"

    name_color = normalize_hex_color(name_color, default="#000000")
    contact_color = normalize_hex_color(contact_color, default="#000000")
    address_color = normalize_hex_color(address_color, default="#000000")

    show_name = parse_bool(show_name, True)
    show_contact = parse_bool(show_contact, True)
    show_address = parse_bool(show_address, False)
    
    print(f"Saving text watermark for school: {school_id}, resource: {resource_id}")
    
    # Check if position already exists
    existing = db.query(SchoolWatermarkText).filter(
        SchoolWatermarkText.school_id == school_id,
        SchoolWatermarkText.resource_id == resource_id
    ).first()
    
    if existing:
        # Update existing
        existing.name_x = name_x
        existing.name_y = name_y
        existing.name_size = name_size
        existing.name_opacity = name_opacity
        existing.name_rotation = name_rotation
        existing.name_font = name_font
        existing.name_style = name_style
        existing.name_color = name_color
        existing.show_name = show_name
        existing.contact_x = contact_x
        existing.contact_y = contact_y
        existing.contact_size = contact_size
        existing.contact_opacity = contact_opacity
        existing.contact_rotation = contact_rotation
        existing.contact_font = contact_font
        existing.contact_style = contact_style
        existing.contact_color = contact_color
        existing.show_contact = show_contact
        existing.address_x = address_x
        existing.address_y = address_y
        existing.address_size = address_size
        existing.address_opacity = address_opacity
        existing.address_rotation = address_rotation
        existing.address_font = address_font
        existing.address_style = address_style
        existing.address_color = address_color
        existing.show_address = show_address
        existing.address = address
        existing.updated_at = datetime.utcnow()
        message = "Text watermark position updated"
    else:
        # Create new
        new_text = SchoolWatermarkText(
            school_id=school_id,
            resource_id=resource_id,
            name_x=name_x,
            name_y=name_y,
            name_size=name_size,
            name_opacity=name_opacity,
            name_rotation=name_rotation,
            name_font=name_font,
            name_style=name_style,
            name_color=name_color,
            show_name=show_name,
            contact_x=contact_x,
            contact_y=contact_y,
            contact_size=contact_size,
            contact_opacity=contact_opacity,
            contact_rotation=contact_rotation,
            contact_font=contact_font,
            contact_style=contact_style,
            contact_color=contact_color,
            show_contact=show_contact,
            address_x=address_x,
            address_y=address_y,
            address_size=address_size,
            address_opacity=address_opacity,
            address_rotation=address_rotation,
            address_font=address_font,
            address_style=address_style,
            address_color=address_color,
            show_address=show_address,
            address=address
        )
        db.add(new_text)
        message = "Text watermark position saved"
    
    db.commit()
    return {"message": message, "status": "success"}

@api_router.get("/school/text-watermark/{resource_id}")
async def get_text_watermark_position(
    school_id: str,
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Get saved text watermark position"""
    text_position = db.query(SchoolWatermarkText).filter(
        SchoolWatermarkText.school_id == school_id,
        SchoolWatermarkText.resource_id == resource_id
    ).first()
    
    if not text_position:
        # Return defaults
        return {
            "name_x": 50,
            "name_y": 25,  # Below logo
            "name_size": 20,
            "name_opacity": 0.8,
            "name_rotation": 0,
            "name_font": "Arial",
            "name_style": "normal",
            "name_color": "#000000",
            "show_name": True,
            "contact_x": 50,
            "contact_y": 90,  # Bottom center
            "contact_size": 12,
            "contact_opacity": 0.7,
            "contact_rotation": 0,
            "contact_font": "Arial",
            "contact_style": "normal",
            "contact_color": "#000000",
            "show_contact": True,
            "address_x": 50,
            "address_y": 85,
            "address_size": 10,
            "address_opacity": 1.0,
            "address_rotation": 0,
            "address_font": "Arial",
            "address_style": "normal",
            "address_color": "#000000",
            "show_address": False,
            "address": "",
            "is_default": True
        }
    
    return {
        "name_x": text_position.name_x,
        "name_y": text_position.name_y,
        "name_size": text_position.name_size,
        "name_opacity": text_position.name_opacity,
        "name_rotation": text_position.name_rotation or 0,
        "name_font": text_position.name_font or "Arial",
        "name_style": text_position.name_style or "normal",
        "name_color": text_position.name_color or "#000000",
        "show_name": text_position.show_name if text_position.show_name is not None else True,
        "contact_x": text_position.contact_x,
        "contact_y": text_position.contact_y,
        "contact_size": text_position.contact_size,
        "contact_opacity": text_position.contact_opacity,
        "contact_rotation": text_position.contact_rotation or 0,
        "contact_font": text_position.contact_font or "Arial",
        "contact_style": text_position.contact_style or "normal",
        "contact_color": text_position.contact_color or "#000000",
        "show_contact": text_position.show_contact if text_position.show_contact is not None else True,
        "address_x": text_position.address_x or 50,
        "address_y": text_position.address_y or 85,
        "address_size": text_position.address_size or 10,
        "address_opacity": text_position.address_opacity if text_position.address_opacity is not None else 1.0,
        "address_rotation": text_position.address_rotation or 0,
        "address_font": text_position.address_font or "Arial",
        "address_style": text_position.address_style or "normal",
        "address_color": text_position.address_color or "#000000",
        "show_address": text_position.show_address if text_position.show_address is not None else False,
        "address": text_position.address or "",
        "is_default": False,
        "updated_at": text_position.updated_at.isoformat() if text_position.updated_at else None
    }

# ==================== LOGO WATERMARK ROUTES ====================

def add_logo_watermark(file_path, logo_path, logo_position, file_type, school_info=None, text_position=None):
    """Add logo and text watermark to a file and return the watermarked file path"""
    try:
        print(f"=== WATERMARKING FUNCTION ===")
        print(f"File: {file_path}")
        print(f"Logo: {logo_path}")
        print(f"File type: {file_type}")
        print(f"School info: {school_info}")
        print(f"Text position: {text_position}")
        
        # Create unique temp file path
        import tempfile
        temp_dir = tempfile.gettempdir()
        file_name = os.path.basename(file_path)
        name, ext = os.path.splitext(file_name)
        temp_filename = f"{name}_branded{ext}"
        temp_file_path = os.path.join(temp_dir, temp_filename)
        
        print(f"Temp output: {temp_file_path}")
        
        file_type_lower = file_type.lower() if file_type else ''
        
        # Handle different file types
        if 'pdf' in file_type_lower or file_path.lower().endswith('.pdf'):
            print(f"Processing as PDF")
            return add_logo_and_text_to_pdf(file_path, logo_path, logo_position, school_info, text_position, temp_file_path)
        elif any(img_type in file_type_lower for img_type in ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'webp']):
            print(f"Processing as image")
            return add_logo_and_text_to_image(file_path, logo_path, logo_position, school_info, text_position, temp_file_path)
        else:
            print(f"Unsupported file type for watermarking: {file_type}")
            return None
            
    except Exception as e:
        print(f"Error in add_logo_watermark: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def add_logo_and_text_to_image(
    image_path: str, 
    logo_path: str, 
    positions: WatermarkPosition,
    file_type: str,
    school_info: Dict[str, str],
    text_position: Dict[str, Any],
    output_path: str = None
) -> str:
    """Add logo and text watermark to image"""
    try:
        print("=== ADDING LOGO AND TEXT TO IMAGE ===")
        print(f"Image: {image_path}")
        print(f"Logo: {logo_path}")
        print(f"School Info: {school_info}")

        # Open base image
        base_img = Image.open(image_path)

        # Convert to RGBA if not already
        if base_img.mode != 'RGBA':
            base_img = base_img.convert('RGBA')

        print(f"Base image size: {base_img.size}, mode: {base_img.mode}")

        # Create a transparent layer for watermarks
        watermark_layer = Image.new('RGBA', base_img.size, (255, 255, 255, 0))

        # Add logo if exists
        if logo_path and os.path.exists(logo_path):
            try:
                logo_img = Image.open(logo_path)
                if logo_img.mode != 'RGBA':
                    logo_img = logo_img.convert('RGBA')

                # Apply opacity
                if positions.logo_opacity < 1.0:
                    alpha = logo_img.split()[3]
                    alpha = alpha.point(lambda p: p * positions.logo_opacity)
                    logo_img.putalpha(alpha)

                # Calculate logo size and position
                base_width, base_height = base_img.size
                logo_width = int(base_width * (positions.logo_width / 100))

                # Maintain aspect ratio
                aspect_ratio = logo_img.width / logo_img.height
                logo_height = int(logo_width / aspect_ratio)

                print(f"Logo size: {logo_width}x{logo_height}")

                # Resize logo
                logo_img = logo_img.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

                # Apply rotation if needed - FIXED: Normalize rotation to 0-359
                logo_rotation = getattr(positions, 'logo_rotation', 0) or 0
                logo_rotation = (360 -logo_rotation) % 360  # Normalize to 0-359
                print(f"Applying logo rotation: {logo_rotation} degrees (original: {getattr(positions, 'logo_rotation', 0)})")
                if logo_rotation:
                    logo_img = logo_img.rotate(logo_rotation, expand=True, resample=Image.Resampling.BICUBIC)
                    logo_width, logo_height = logo_img.size

                # Calculate position
                x_position = int(base_width * (positions.logo_x / 100) - (logo_width / 2))
                y_position = int(base_height * (positions.logo_y / 100) - (logo_height / 2))

                # Ensure position is within bounds
                x_position = max(5, min(base_width - logo_width - 5, x_position))
                y_position = max(5, min(base_height - logo_height - 5, y_position))

                print(f"Logo position: {x_position}, {y_position}")

                # Paste logo onto watermark layer
                watermark_layer.paste(logo_img, (x_position, y_position), logo_img)

            except Exception as logo_error:
                print(f"Error adding logo: {logo_error}")
                import traceback
                traceback.print_exc()

        # Add text watermarks
        from PIL import ImageDraw

        # Define the draw_rotated_text function with proper rotation handling
        def draw_rotated_text(layer, text, center_x, center_y, font, color_rgba, rotation):
            if not text:
                return
            
            # Normalize rotation to 0-359
            rotation = (360 - rotation) % 360
            print(f"Drawing rotated text: '{text[:30]}...' with rotation: {rotation}°")
            
            # Create a temporary image to measure text dimensions
            temp_draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
            try:
                bbox = temp_draw.multiline_textbbox((0, 0), text, font=font, align='center')
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
            except Exception:
                bbox = temp_draw.textbbox((0, 0), text, font=font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
            
            # Convert to integers (PIL requires integers for image dimensions)
            text_w = int(max(1, text_w))
            text_h = int(max(1, text_h))
            
            # Create image for the text
            text_img = Image.new('RGBA', (text_w + 20, text_h + 20), (255, 255, 255, 0))
            text_draw = ImageDraw.Draw(text_img)
            text_draw.multiline_text((10, 10), text, font=font, fill=color_rgba, align='center')
            
            # Apply rotation
            rotated = text_img.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
            
            # Calculate paste position (center alignment)
            paste_x = int(center_x - rotated.width / 2)
            paste_y = int(center_y - rotated.height / 2)
            
            # Paste onto the watermark layer
            layer.paste(rotated, (paste_x, paste_y), rotated)

        def tp(key, default):
            if not text_position:
                return default
            return text_position.get(key, default)

        show_name = parse_bool(tp('show_name', True), True)
        show_contact = parse_bool(tp('show_contact', True), True)
        show_address = parse_bool(tp('show_address', False), False)

        # Scale font sizes based on image dimensions
        base_width, base_height = base_img.size
        scale_factor = base_width / 800 if base_width else 1.0

        name_size = max(8, int(tp('name_size', 20) * scale_factor))
        contact_size = max(8, int(tp('contact_size', 12) * scale_factor))
        address_size = max(6, int(tp('address_size', 10) * scale_factor))

        name_font = resolve_pil_font(tp('name_font', 'Arial'), tp('name_style', 'normal'), name_size)
        contact_font = resolve_pil_font(tp('contact_font', 'Arial'), tp('contact_style', 'normal'), contact_size)
        address_font = resolve_pil_font(tp('address_font', 'Arial'), tp('address_style', 'normal'), address_size)

        # Add school name
        if show_name and school_info.get('school_name'):
            name_x = int(base_img.width * (tp('name_x', 50) / 100))
            name_y = int(base_img.height * (tp('name_y', 25) / 100))
            name_color = hex_to_rgb(tp('name_color', '#000000'))
            name_opacity = clamp(tp('name_opacity', 1.0), 0.1, 1.0)
            name_rotation = normalize_rotation(tp('name_rotation', 0))
            name_rotation = (360 - name_rotation) % 360
            color_rgba = (name_color[0], name_color[1], name_color[2], int(255 * name_opacity))
            draw_rotated_text(watermark_layer, school_info['school_name'].strip(), name_x, name_y, name_font, color_rgba, name_rotation)
            print(f"School name at ({name_x}, {name_y}) with rotation {name_rotation}°")

        # Add contact info
        contact_lines = []
        if school_info.get('email'):
            contact_lines.append(f"Email: {school_info['email']}")
        if school_info.get('contact_number'):
            contact_lines.append(f"Phone: {school_info['contact_number']}")
        contact_text = "\n".join(contact_lines)

        if show_contact and contact_text:
            contact_x = int(base_img.width * (tp('contact_x', 50) / 100))
            contact_y = int(base_img.height * (tp('contact_y', 90) / 100))
            contact_color = hex_to_rgb(tp('contact_color', '#000000'))
            contact_opacity = clamp(tp('contact_opacity', 1.0), 0.1, 1.0)
            contact_rotation = normalize_rotation(tp('contact_rotation', 0))
            contact_rotation = (360 - contact_rotation) % 360
            color_rgba = (contact_color[0], contact_color[1], contact_color[2], int(255 * contact_opacity))
            draw_rotated_text(watermark_layer, contact_text, contact_x, contact_y, contact_font, color_rgba, contact_rotation)
            print(f"Contact info at ({contact_x}, {contact_y}) with rotation {contact_rotation}°")

        # Add address / message
        address_text = (tp('address', '') or '').strip()
        if show_address and address_text:
            address_x = int(base_img.width * (tp('address_x', 50) / 100))
            address_y = int(base_img.height * (tp('address_y', 85) / 100))
            address_color = hex_to_rgb(tp('address_color', '#000000'))
            address_opacity = clamp(tp('address_opacity', 1.0), 0.1, 1.0)
            address_rotation = normalize_rotation(tp('address_rotation', 0))
            address_rotation = (360 - address_rotation) % 360
            color_rgba = (address_color[0], address_color[1], address_color[2], int(255 * address_opacity))
            draw_rotated_text(watermark_layer, address_text, address_x, address_y, address_font, color_rgba, address_rotation)
            print(f"Address at ({address_x}, {address_y}) with rotation {address_rotation}°")

        # Combine base image with watermark layer
        watermarked_img = Image.alpha_composite(base_img, watermark_layer)

        # Convert back to original mode if needed
        if 'RGB' in base_img.mode:
            watermarked_img = watermarked_img.convert('RGB')

        # Save to output path or temp file
        if not output_path:
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            output_path = temp_file.name
            temp_file.close()

        watermarked_img.save(output_path, quality=95)

        print(f"Saved watermarked image to: {output_path}")
        print(f"File size: {os.path.getsize(output_path)} bytes")
        return output_path

    except Exception as e:
        print(f"Error adding logo and text to image: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def add_logo_and_text_to_pdf(pdf_path, logo_path, logo_position, school_info, text_position, output_path):
    """Add logo and text to PDF with full customization support"""
    try:
        print(f"\n--- INSIDE add_logo_and_text_to_pdf ---")
        print(f"PDF path: {pdf_path}")
        print(f"Logo path: {logo_path}")
        print(f"School info: {school_info}")
        print(f"Output path: {output_path}")

        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file does not exist: {pdf_path}")
            return None

        pdf_document = fitz.open(pdf_path)
        print(f"PDF opened successfully. Pages: {len(pdf_document)}")

        # Load original logo once
        logo_original = None
        if logo_path and os.path.exists(logo_path):
            try:
                logo_original = Image.open(logo_path)
                if logo_original.mode != 'RGBA':
                    logo_original = logo_original.convert('RGBA')
            except Exception as e:
                print(f"Error loading logo: {e}")
                logo_original = None
        else:
            print(f"Logo not found or not provided: {logo_path}")

        def tp(key, default):
            if not text_position:
                return default
            return text_position.get(key, default)

        show_name = parse_bool(tp('show_name', True), True)
        show_contact = parse_bool(tp('show_contact', True), True)
        show_address = parse_bool(tp('show_address', False), False)

        # Render at higher pixel density to avoid blurry watermark in downloads
        try:
            pdf_scale = float(os.environ.get("PDF_WATERMARK_SCALE", "2.0"))
        except Exception:
            pdf_scale = 2.0
        pdf_scale = max(1.0, min(pdf_scale, 4.0))

        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            page_w = page.rect.width
            page_h = page.rect.height
            scale_factor = page_w / 800 if page_w else 1.0

            # --- Logo ---
            if logo_original:
                logo_x = get_attr(logo_position, 'logo_x', get_attr(logo_position, 'x_position', 50))
                logo_y = get_attr(logo_position, 'logo_y', get_attr(logo_position, 'y_position', 10))
                logo_width_pct = get_attr(logo_position, 'logo_width', get_attr(logo_position, 'width', 20))
                logo_opacity = clamp(get_attr(logo_position, 'logo_opacity', get_attr(logo_position, 'opacity', 1.0)), 0.1, 1.0)
                logo_rotation = get_attr(logo_position, 'logo_rotation', get_attr(logo_position, 'rotation', 0)) or 0
                logo_rotation = (360 - normalize_rotation(logo_rotation)) % 360

                logo_width = max(1, int(round(page_w * (float(logo_width_pct) / 100.0))))
                aspect_ratio = logo_original.width / logo_original.height if logo_original.height else 1.0
                logo_height = max(1, int(round(logo_width / aspect_ratio)))

                logo_img = logo_original.copy()
                if logo_opacity < 1.0:
                    alpha = logo_img.split()[3]
                    alpha = alpha.point(lambda p: int(p * logo_opacity))
                    logo_img.putalpha(alpha)

                logo_px_w = max(1, int(round(logo_width * pdf_scale)))
                logo_px_h = max(1, int(round(logo_height * pdf_scale)))
                logo_img = logo_img.resize((logo_px_w, logo_px_h), Image.Resampling.LANCZOS)

                if logo_rotation:
                    logo_img = logo_img.rotate(logo_rotation, expand=True, resample=Image.Resampling.BICUBIC)
                    logo_px_w, logo_px_h = logo_img.size

                logo_bytes = io.BytesIO()
                logo_img.save(logo_bytes, format='PNG')
                logo_bytes.seek(0)

                x_position = page_w * (float(logo_x) / 100.0)
                y_position = page_h * (float(logo_y) / 100.0)

                rect_w = logo_px_w / pdf_scale
                rect_h = logo_px_h / pdf_scale
                rect = fitz.Rect(
                    x_position - (rect_w / 2),
                    y_position - (rect_h / 2),
                    x_position + (rect_w / 2),
                    y_position + (rect_h / 2)
                )
                page.insert_image(rect, stream=logo_bytes.getvalue())

            # --- Text ---
            if school_info and text_position:
                if show_name and school_info.get('school_name'):
                    name_x = page_w * (float(tp('name_x', 50)) / 100.0)
                    name_y = page_h * (float(tp('name_y', 25)) / 100.0)
                    name_size = max(1, int(round(float(tp('name_size', 20)) * scale_factor)))
                    name_img = render_text_image(
                        school_info.get('school_name', '').strip(),
                        tp('name_font', 'Arial'),
                        tp('name_style', 'normal'),
                        int(round(name_size * pdf_scale)),
                        tp('name_color', '#000000'),
                        float(tp('name_opacity', 1.0)),
                        int(tp('name_rotation', 0))
                    )
                    if name_img:
                        img_bytes = io.BytesIO()
                        name_img.save(img_bytes, format='PNG')
                        img_bytes.seek(0)
                        w, h = name_img.size
                        rect = fitz.Rect(
                            name_x - (w / (2 * pdf_scale)),
                            name_y - (h / (2 * pdf_scale)),
                            name_x + (w / (2 * pdf_scale)),
                            name_y + (h / (2 * pdf_scale))
                        )
                        page.insert_image(rect, stream=img_bytes.getvalue())

                contact_lines = []
                if school_info.get('email'):
                    contact_lines.append(f"Email: {school_info['email']}")
                if school_info.get('contact_number'):
                    contact_lines.append(f"Phone: {school_info['contact_number']}")
                contact_text = "\n".join(contact_lines)

                if show_contact and contact_text:
                    contact_x = page_w * (float(tp('contact_x', 50)) / 100.0)
                    contact_y = page_h * (float(tp('contact_y', 90)) / 100.0)
                    contact_size = max(1, int(round(float(tp('contact_size', 12)) * scale_factor)))
                    contact_img = render_text_image(
                        contact_text,
                        tp('contact_font', 'Arial'),
                        tp('contact_style', 'normal'),
                        int(round(contact_size * pdf_scale)),
                        tp('contact_color', '#000000'),
                        float(tp('contact_opacity', 1.0)),
                        int(tp('contact_rotation', 0))
                    )
                    if contact_img:
                        img_bytes = io.BytesIO()
                        contact_img.save(img_bytes, format='PNG')
                        img_bytes.seek(0)
                        w, h = contact_img.size
                        rect = fitz.Rect(
                            contact_x - (w / (2 * pdf_scale)),
                            contact_y - (h / (2 * pdf_scale)),
                            contact_x + (w / (2 * pdf_scale)),
                            contact_y + (h / (2 * pdf_scale))
                        )
                        page.insert_image(rect, stream=img_bytes.getvalue())

                address_text = (tp('address', '') or '').strip()
                if show_address and address_text:
                    address_x = page_w * (float(tp('address_x', 50)) / 100.0)
                    address_y = page_h * (float(tp('address_y', 85)) / 100.0)
                    address_size = max(1, int(round(float(tp('address_size', 10)) * scale_factor)))
                    address_img = render_text_image(
                        address_text,
                        tp('address_font', 'Arial'),
                        tp('address_style', 'normal'),
                        int(round(address_size * pdf_scale)),
                        tp('address_color', '#000000'),
                        float(tp('address_opacity', 1.0)),
                        int(tp('address_rotation', 0))
                    )
                    if address_img:
                        img_bytes = io.BytesIO()
                        address_img.save(img_bytes, format='PNG')
                        img_bytes.seek(0)
                        w, h = address_img.size
                        rect = fitz.Rect(
                            address_x - (w / (2 * pdf_scale)),
                            address_y - (h / (2 * pdf_scale)),
                            address_x + (w / (2 * pdf_scale)),
                            address_y + (h / (2 * pdf_scale))
                        )
                        page.insert_image(rect, stream=img_bytes.getvalue())

        pdf_document.save(output_path)
        pdf_document.close()

        print(f"PDF saved to: {output_path}")
        print(f"File exists: {os.path.exists(output_path)}")
        print(f"File size: {os.path.getsize(output_path)} bytes")
        print(f"--- EXIT add_logo_and_text_to_pdf ---\n")

        return output_path

    except Exception as e:
        print(f"Error in add_logo_and_text_to_pdf: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

@api_router.get("/resources/{resource_id}/download-with-logo")
async def download_resource_with_logo(
    resource_id: str,
    school_id: str = None,
    school_name: str = None,
    format: str = None,
    db: Session = Depends(get_db)
):
    """Download a resource file with school logo and text watermark"""
    try:
        print(f"\n{'='*60}")
        print(f"DOWNLOAD WITH LOGO REQUEST")
        print(f"{'='*60}")
        print(f"Resource ID: {resource_id}")
        print(f"School ID: {school_id}")
        print(f"School Name: {school_name}")
        
        # Get the resource from the database
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        print(f"Resource: {resource.name}")
        print(f"File type: {resource.file_type}")
        print(f"File path in DB: {resource.file_path}")
        
        # Get school info
        school = None
        if school_id:
            school = db.query(School).filter(School.school_id == school_id).first()
            if school:
                print(f"School found: {school.school_name}")
                print(f"School logo path: {school.logo_path}")
                print(f"School contact: {school.contact_number}")
        
        # Get file path
        try:
            full_file_path = get_full_file_path(resource.file_path)
            print(f"File found at: {full_file_path}")
            print(f"File exists: {os.path.exists(full_file_path)}")
            print(f"File size: {os.path.getsize(full_file_path)} bytes")
        except FileNotFoundError as e:
            print(f"File not found error: {e}")
            raise HTTPException(status_code=404, detail=str(e))
        
        # Default to original file
        final_file_path = full_file_path
        filename_suffix = ""
        watermarked_file = None
        
        # Add watermark if school exists
        if school and school_id:
            print(f"\n--- Attempting to add watermark ---")
            
            # Get logo position from database
            logo_position_db = db.query(SchoolLogoPosition).filter(
                SchoolLogoPosition.school_id == school_id,
                SchoolLogoPosition.resource_id == resource_id
            ).first()
            
            print(f"Logo position in DB: {logo_position_db is not None}")
            if logo_position_db:
                print(f"  - x: {logo_position_db.x_position}")
                print(f"  - y: {logo_position_db.y_position}")
                print(f"  - width: {logo_position_db.width}")
                print(f"  - opacity: {logo_position_db.opacity}")
                print(f"  - rotation: {getattr(logo_position_db, 'rotation', 0)}")
            
            # Get text watermark position from database
            text_position_db = db.query(SchoolWatermarkText).filter(
                SchoolWatermarkText.school_id == school_id,
                SchoolWatermarkText.resource_id == resource_id
            ).first()
            
            print(f"Text position in DB: {text_position_db is not None}")
            if text_position_db:
                print(f"  - name_x: {text_position_db.name_x}")
                print(f"  - name_y: {text_position_db.name_y}")
                print(f"  - show_name: {text_position_db.show_name}")
                print(f"  - contact_x: {text_position_db.contact_x}")
                print(f"  - contact_y: {text_position_db.contact_y}")
                print(f"  - show_contact: {text_position_db.show_contact}")
                print(f"  - show_address: {text_position_db.show_address}")
                print(f"  - address: {text_position_db.address}")
            
            # Prepare logo position with defaults
            logo_position_data = {
                'x_position': 50,
                'y_position': 10,
                'width': 20,
                'opacity': 1.0,
                'rotation': 0
            }
            
            if logo_position_db:
                logo_position_data = {
                    'x_position': logo_position_db.x_position,
                    'y_position': logo_position_db.y_position,
                    'width': logo_position_db.width,
                    'opacity': logo_position_db.opacity,
                    'rotation': getattr(logo_position_db, 'rotation', 0) or 0
                }
                print(f"Using saved logo position: {logo_position_data}")
            else:
                print(f"Using default logo position: {logo_position_data}")
            
            # Prepare text position with defaults
            text_position_data = {
                'name_x': 50,
                'name_y': 25,
                'name_size': 20,
                'name_opacity': 1.0,
                'name_rotation': 0,
                'name_font': 'Arial',
                'name_style': 'normal',
                'name_color': '#000000',
                'show_name': True,
                'contact_x': 50,
                'contact_y': 90,
                'contact_size': 12,
                'contact_opacity': 1.0,
                'contact_rotation': 0,
                'contact_font': 'Arial',
                'contact_style': 'normal',
                'contact_color': '#000000',
                'show_contact': True,
                'address_x': 50,
                'address_y': 85,
                'address_size': 10,
                'address_opacity': 1.0,
                'address_rotation': 0,
                'address_font': 'Arial',
                'address_style': 'normal',
                'address_color': '#000000',
                'show_address': False,
                'address': ''
            }
            
            if text_position_db:
                text_position_data = {
                    'name_x': text_position_db.name_x,
                    'name_y': text_position_db.name_y,
                    'name_size': text_position_db.name_size,
                    'name_opacity': text_position_db.name_opacity,
                    'name_rotation': text_position_db.name_rotation or 0,
                    'name_font': text_position_db.name_font or 'Arial',
                    'name_style': text_position_db.name_style or 'normal',
                    'name_color': text_position_db.name_color or '#000000',
                    'show_name': text_position_db.show_name if text_position_db.show_name is not None else True,
                    'contact_x': text_position_db.contact_x,
                    'contact_y': text_position_db.contact_y,
                    'contact_size': text_position_db.contact_size,
                    'contact_opacity': text_position_db.contact_opacity,
                    'contact_rotation': text_position_db.contact_rotation or 0,
                    'contact_font': text_position_db.contact_font or 'Arial',
                    'contact_style': text_position_db.contact_style or 'normal',
                    'contact_color': text_position_db.contact_color or '#000000',
                    'show_contact': text_position_db.show_contact if text_position_db.show_contact is not None else True,
                    'address_x': text_position_db.address_x or 50,
                    'address_y': text_position_db.address_y or 85,
                    'address_size': text_position_db.address_size or 10,
                    'address_opacity': text_position_db.address_opacity if text_position_db.address_opacity is not None else 1.0,
                    'address_rotation': text_position_db.address_rotation or 0,
                    'address_font': text_position_db.address_font or 'Arial',
                    'address_style': text_position_db.address_style or 'normal',
                    'address_color': text_position_db.address_color or '#000000',
                    'show_address': text_position_db.show_address if text_position_db.show_address is not None else False,
                    'address': text_position_db.address or ''
                }
                print(f"Using saved text position: {text_position_data}")
            else:
                print(f"Using default text position")
            
            # Get school logo path
            logo_path = None
            if school.logo_path:
                print(f"Raw logo path from school: {school.logo_path}")
                logo_path_clean = school.logo_path.lstrip('/')
                possible_paths = [
                    os.path.join(ROOT_DIR, logo_path_clean),
                    os.path.join(ROOT_DIR, 'uploads', logo_path_clean),
                    os.path.join(ROOT_DIR, 'uploads', 'school_logos', school.school_id, os.path.basename(logo_path_clean)),
                    os.path.join(ROOT_DIR, 'uploads', 'school_logos', school.school_id, 'logo.png'),
                    os.path.join(ROOT_DIR, 'uploads', 'school_logos', school.school_id, 'logo.jpg'),
                ]
                
                for possible_path in possible_paths:
                    if os.path.exists(possible_path):
                        logo_path = possible_path
                        print(f"Logo found at: {logo_path}")
                        break
                
                if not logo_path:
                    print(f"Logo not found in any location. Tried: {possible_paths}")
            else:
                print("No logo path in school record")
            
            # Prepare school info
            school_info = {
                'school_name': school.school_name,
                'email': school.email,
                'contact_number': school.contact_number
            }
            print(f"School info: {school_info}")
            
            # Create WatermarkPosition object for the watermarking functions
            watermark_positions = WatermarkPosition(
                logo_x=logo_position_data['x_position'],
                logo_y=logo_position_data['y_position'],
                logo_width=logo_position_data['width'],
                logo_opacity=logo_position_data['opacity'],
                logo_rotation=logo_position_data.get('rotation', 0),
                school_name_x=text_position_data['name_x'],
                school_name_y=text_position_data['name_y'],
                school_name_size=text_position_data['name_size'],
                school_name_opacity=text_position_data['name_opacity'],
                contact_x=text_position_data['contact_x'],
                contact_y=text_position_data['contact_y'],
                contact_size=text_position_data['contact_size'],
                contact_opacity=text_position_data['contact_opacity']
            )
            
            # Apply watermark based on file type
            file_type_lower = resource.file_type.lower() if resource.file_type else ''
            file_path_lower = full_file_path.lower()
            is_pdf_resource = ("pdf" in file_type_lower) or file_path_lower.endswith(".pdf")
            is_image_resource = is_image_type(resource.file_type, full_file_path)
            
            print(f"File type: {file_type_lower}")
            print(f"Is PDF: {is_pdf_resource}")
            print(f"Is Image: {is_image_resource}")
            
            # For PDF files
            if is_pdf_resource:
                print("Processing PDF watermark...")
                temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
                temp_file.close()
                watermarked_file = add_logo_and_text_to_pdf(
                    full_file_path,
                    logo_path,
                    watermark_positions,  # Pass the WatermarkPosition object
                    school_info,
                    text_position_data,  # Pass the text position dict
                    temp_file.name
                )
                print(f"PDF watermark result: {watermarked_file}")
            
            # For image files
            elif is_image_resource:
                print("Processing image watermark...")
                watermarked_file = add_logo_and_text_to_image(
                    full_file_path,
                    logo_path,
                    watermark_positions,
                    resource.file_type,
                    school_info,
                    text_position_data,
                    None  # Will create temp file
                )
                print(f"Image watermark result: {watermarked_file}")
            else:
                print(f"Unsupported file type for watermarking: {file_type_lower}")
            
            # Use watermarked file if created successfully
            if watermarked_file and os.path.exists(watermarked_file):
                print(f"Watermarked file created successfully: {watermarked_file}")
                print(f"Watermarked file size: {os.path.getsize(watermarked_file)} bytes")
                final_file_path = watermarked_file
                filename_suffix = "_branded"
            else:
                print("WATERMARK FAILED - Using original file")
                if watermarked_file:
                    print(f"Watermarked file path exists but file not found: {watermarked_file}")
        
        requested_format = (format or "").strip().lower()

        # Log download
        if school_id and school_name:
            download_log = ResourceDownload(
                resource_id=resource_id,
                school_id=school_id,
                school_name=school_name
            )
            db.add(download_log)
            record_activity(
                db,
                school_id,
                school_name,
                "resource_download",
                {
                    "resource_id": resource.resource_id,
                    "resource_name": resource.name,
                    "category": resource.category,
                    "format": requested_format or "original",
                    "branded": True
                }
            )
            resource.download_count += 1
            db.commit()
            print(f"Download logged for school: {school_name}")

        # If PDF format is requested and the output is an image, convert to PDF bytes
        if requested_format == "pdf":
            if is_image_type(resource.file_type, final_file_path):
                file_content = image_bytes_to_pdf_bytes(final_file_path)
                media_type = "application/pdf"
                forced_extension = ".pdf"
            elif (resource.file_type or "").lower() == "application/pdf" or final_file_path.lower().endswith(".pdf"):
                with open(final_file_path, 'rb') as f:
                    file_content = f.read()
                media_type = "application/pdf"
                forced_extension = ".pdf"
            else:
                raise HTTPException(status_code=400, detail="PDF format is only supported for image resources")
        else:
            # Default: read file content as-is
            with open(final_file_path, 'rb') as f:
                file_content = f.read()
            media_type = resource.file_type or 'application/octet-stream'
            forced_extension = None
        
        # Clean up temp watermarked file if created
        if watermarked_file and watermarked_file != full_file_path and os.path.exists(watermarked_file):
            try:
                os.remove(watermarked_file)
                print(f"Cleaned up temp file: {watermarked_file}")
            except Exception as cleanup_error:
                print(f"Error cleaning up temp file: {cleanup_error}")
        
        # Determine download filename
        file_extension = os.path.splitext(resource.name)[1]
        if forced_extension:
            file_extension = forced_extension
        elif not file_extension:
            if resource.file_type:
                file_extension = "." + resource.file_type.split('/')[-1]
            else:
                file_extension = ".pdf"
        
        download_filename = f"{resource.name.replace(' ', '_')}{filename_suffix}{file_extension}"
    
        print(f"Returning file: {download_filename}, size: {len(file_content)} bytes")
        print(f"{'='*60}\n")
        
        return Response(
            content=file_content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename=\"{download_filename}\"",
                "Content-Length": str(len(file_content))
            }
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print(f"Download with logo error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@api_router.get("/debug/check-watermark-settings/{school_id}/{resource_id}")
async def check_watermark_settings(
    school_id: str,
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check saved watermark settings"""
    logo_pos = db.query(SchoolLogoPosition).filter(
        SchoolLogoPosition.school_id == school_id,
        SchoolLogoPosition.resource_id == resource_id
    ).first()
    
    text_pos = db.query(SchoolWatermarkText).filter(
        SchoolWatermarkText.school_id == school_id,
        SchoolWatermarkText.resource_id == resource_id
    ).first()
    
    return {
        "logo_position": {
            "exists": logo_pos is not None,
            "x": logo_pos.x_position if logo_pos else None,
            "y": logo_pos.y_position if logo_pos else None,
            "width": logo_pos.width if logo_pos else None,
            "opacity": logo_pos.opacity if logo_pos else None,
            "rotation": logo_pos.rotation if logo_pos else None
        } if logo_pos else None,
        "text_position": {
            "exists": text_pos is not None,
            "name_x": text_pos.name_x if text_pos else None,
            "name_y": text_pos.name_y if text_pos else None,
            "name_size": text_pos.name_size if text_pos else None,
            "contact_x": text_pos.contact_x if text_pos else None,
            "contact_y": text_pos.contact_y if text_pos else None,
            "show_name": text_pos.show_name if text_pos else None,
            "show_contact": text_pos.show_contact if text_pos else None
        } if text_pos else None
    }

@api_router.get("/debug/watermark-settings/{school_id}/{resource_id}")
async def debug_watermark_settings(
    school_id: str,
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check watermark settings"""
    logo_pos = db.query(SchoolLogoPosition).filter(
        SchoolLogoPosition.school_id == school_id,
        SchoolLogoPosition.resource_id == resource_id
    ).first()
    
    text_pos = db.query(SchoolWatermarkText).filter(
        SchoolWatermarkText.school_id == school_id,
        SchoolWatermarkText.resource_id == resource_id
    ).first()
    
    school = db.query(School).filter(School.school_id == school_id).first()
    
    result = {
        "school_exists": school is not None,
        "school_name": school.school_name if school else None,
        "school_logo_path": school.logo_path if school else None,
        "logo_position": None,
        "text_position": None
    }
    
    if logo_pos:
        result["logo_position"] = {
            "x": logo_pos.x_position,
            "y": logo_pos.y_position,
            "width": logo_pos.width,
            "opacity": logo_pos.opacity,
            "rotation": logo_pos.rotation
        }
    
    if text_pos:
        result["text_position"] = {
            "name_x": text_pos.name_x,
            "name_y": text_pos.name_y,
            "name_size": text_pos.name_size,
            "name_opacity": text_pos.name_opacity,
            "show_name": text_pos.show_name,
            "contact_x": text_pos.contact_x,
            "contact_y": text_pos.contact_y,
            "show_contact": text_pos.show_contact
        }
    
    return result
    
@api_router.get("/debug/school-watermark-positions/{school_id}")
async def debug_school_watermark_positions(
    school_id: str,
    resource_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check all watermark positions for a school"""
    school = db.query(School).filter(School.school_id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get all logo positions
    if resource_id:
        logo_positions = db.query(SchoolLogoPosition).filter(
            SchoolLogoPosition.school_id == school_id,
            SchoolLogoPosition.resource_id == resource_id
        ).all()
    else:
        logo_positions = db.query(SchoolLogoPosition).filter(
            SchoolLogoPosition.school_id == school_id
        ).all()
    
    # Get all text positions
    if resource_id:
        text_positions = db.query(SchoolWatermarkText).filter(
            SchoolWatermarkText.school_id == school_id,
            SchoolWatermarkText.resource_id == resource_id
        ).all()
    else:
        text_positions = db.query(SchoolWatermarkText).filter(
            SchoolWatermarkText.school_id == school_id
        ).all()
    
    result = {
        "school": {
            "school_id": school.school_id,
            "school_name": school.school_name,
            "email": school.email,
            "contact_number": school.contact_number,
            "has_logo": bool(school.logo_path)
        },
        "logo_positions": [
            {
                "resource_id": lp.resource_id,
                "x_position": lp.x_position,
                "y_position": lp.y_position,
                "width": lp.width,
                "opacity": lp.opacity
            }
            for lp in logo_positions
        ],
        "text_positions": [
            {
                "resource_id": tp.resource_id,
                "name_x": tp.name_x,
                "name_y": tp.name_y,
                "name_size": tp.name_size,
                "name_opacity": tp.name_opacity,
                "name_rotation": tp.name_rotation,
                "name_font": tp.name_font,
                "name_style": tp.name_style,
                "name_color": tp.name_color,
                "show_name": tp.show_name,
                "contact_x": tp.contact_x,
                "contact_y": tp.contact_y,
                "contact_size": tp.contact_size,
                "contact_opacity": tp.contact_opacity,
                "contact_rotation": tp.contact_rotation,
                "contact_font": tp.contact_font,
                "contact_style": tp.contact_style,
                "contact_color": tp.contact_color,
                "show_contact": tp.show_contact,
                "address_x": tp.address_x,
                "address_y": tp.address_y,
                "address_size": tp.address_size,
                "address_opacity": tp.address_opacity,
                "address_rotation": tp.address_rotation,
                "address_font": tp.address_font,
                "address_style": tp.address_style,
                "address_color": tp.address_color,
                "show_address": tp.show_address,
                "address": tp.address
            }
            for tp in text_positions
        ]
    }
    
    return result

# ==================== ANALYTICS ROUTES ====================

def normalize_analytics_days(days: int) -> int:
    try:
        return max(7, min(int(days or 30), 365))
    except Exception:
        return 30

def iso_or_none(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None

def build_daily_buckets(days: int) -> Dict[str, Dict[str, Any]]:
    start_date = (datetime.utcnow() - timedelta(days=days - 1)).date()
    buckets: Dict[str, Dict[str, Any]] = {}

    for offset in range(days):
        current_date = start_date + timedelta(days=offset)
        bucket_key = current_date.isoformat()
        buckets[bucket_key] = {
            "date": bucket_key,
            "label": current_date.strftime("%d %b"),
            "logins": 0,
            "page_views": 0,
            "previews": 0,
            "searches": 0,
            "downloads": 0,
            "uploads": 0,
            "tickets": 0,
            "messages": 0,
            "zero_results": 0
        }

    return buckets

def bump_daily_bucket(buckets: Dict[str, Dict[str, Any]], timestamp: Optional[datetime], key: str) -> None:
    if not timestamp:
        return

    bucket = buckets.get(timestamp.date().isoformat())
    if bucket is not None:
        bucket[key] = bucket.get(key, 0) + 1

def set_last_activity(row: Dict[str, Any], timestamp: Optional[datetime], label: str) -> None:
    if not timestamp:
        return
    if row.get("last_active_at") is None or timestamp > row["last_active_at"]:
        row["last_active_at"] = timestamp
        row["last_activity_label"] = label

@api_router.get("/admin/analytics/school-activity")
async def get_school_activity_analytics(
    days: int = 30,
    school_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Full-stack school activity analytics for the admin dashboard."""
    normalized_days = normalize_analytics_days(days)
    cutoff = datetime.utcnow() - timedelta(days=normalized_days - 1)

    school_query = db.query(School)
    if school_id and school_id != "all":
        school_query = school_query.filter(School.school_id == school_id)

    selected_schools = school_query.order_by(School.school_name.asc()).all()
    if school_id and school_id != "all" and not selected_schools:
        raise HTTPException(status_code=404, detail="School not found")

    school_ids = [school.school_id for school in selected_schools]
    empty_response = {
        "days": normalized_days,
        "summary": {
            "active_schools": 0,
            "total_logins": 0,
            "total_logouts": 0,
            "total_page_views": 0,
            "total_searches": 0,
            "total_previews": 0,
            "total_downloads": 0,
            "total_uploads": 0,
            "total_tickets": 0,
            "total_messages": 0
        },
        "activity_breakdown": [],
        "daily_activity": list(build_daily_buckets(normalized_days).values()),
        "school_breakdown": [],
        "recent_activity": []
    }

    if not school_ids:
        return empty_response

    activity_logs = db.query(ActivityLog).filter(
        ActivityLog.timestamp >= cutoff,
        ActivityLog.school_id.in_(school_ids)
    ).order_by(ActivityLog.timestamp.desc()).all()

    search_logs = db.query(SchoolSearchLog).filter(
        SchoolSearchLog.created_at >= cutoff,
        SchoolSearchLog.school_id.in_(school_ids)
    ).order_by(SchoolSearchLog.created_at.desc()).all()

    download_logs = db.query(ResourceDownload).filter(
        ResourceDownload.downloaded_at >= cutoff,
        ResourceDownload.school_id.in_(school_ids)
    ).order_by(ResourceDownload.downloaded_at.desc()).all()

    upload_logs = db.query(Resource).filter(
        Resource.uploaded_by_type == "school",
        Resource.created_at >= cutoff,
        Resource.uploaded_by_id.in_(school_ids)
    ).order_by(Resource.created_at.desc()).all()

    ticket_logs = db.query(SupportTicket).filter(
        SupportTicket.created_at >= cutoff,
        SupportTicket.school_id.in_(school_ids)
    ).order_by(SupportTicket.created_at.desc()).all()

    chat_logs = db.query(ChatMessage).filter(
        ChatMessage.created_at >= cutoff,
        ChatMessage.sender_type == "school",
        ChatMessage.school_id.in_(school_ids)
    ).order_by(ChatMessage.created_at.desc()).all()

    downloaded_resource_ids = sorted({item.resource_id for item in download_logs})
    resource_map = {}
    if downloaded_resource_ids:
        resource_map = {
            resource.resource_id: resource
            for resource in db.query(Resource).filter(Resource.resource_id.in_(downloaded_resource_ids)).all()
        }

    buckets = build_daily_buckets(normalized_days)
    school_rows: Dict[str, Dict[str, Any]] = {}
    active_days_map: Dict[str, set] = {}

    for school in selected_schools:
        school_rows[school.school_id] = {
            "school_id": school.school_id,
            "school_name": school.school_name,
            "email": school.email,
            "contact_number": school.contact_number,
            "logins": 0,
            "logouts": 0,
            "page_views": 0,
            "searches": 0,
            "previews": 0,
            "downloads": 0,
            "uploads": 0,
            "tickets": 0,
            "messages": 0,
            "total_actions": 0,
            "activity_score": 0,
            "last_active_at": None,
            "last_activity_label": "No recent activity"
        }
        active_days_map[school.school_id] = set()

    recent_activity: List[Dict[str, Any]] = []

    for activity in activity_logs:
        row = school_rows.get(activity.school_id)
        if not row:
            continue

        details = parse_activity_details(activity.details)
        if activity.activity_type == "login":
            row["logins"] += 1
            bump_daily_bucket(buckets, activity.timestamp, "logins")
        elif activity.activity_type == "logout":
            row["logouts"] += 1
        elif activity.activity_type == "page_visit":
            row["page_views"] += 1
            bump_daily_bucket(buckets, activity.timestamp, "page_views")
        elif activity.activity_type == "resource_preview":
            row["previews"] += 1
            bump_daily_bucket(buckets, activity.timestamp, "previews")
        elif activity.activity_type == "resource_download" and details and details.get("is_external_link"):
            row["downloads"] += 1
            bump_daily_bucket(buckets, activity.timestamp, "downloads")
        else:
            continue

        active_days_map[activity.school_id].add(activity.timestamp.date().isoformat())
        set_last_activity(row, activity.timestamp, build_activity_title(activity.activity_type, details))

        recent_activity.append({
            "id": f"activity-{activity.id}",
            "school_id": activity.school_id,
            "school_name": activity.school_name,
            "type": activity.activity_type,
            "title": build_activity_title(activity.activity_type, details),
            "description": build_activity_description(activity.activity_type, details),
            "timestamp": iso_or_none(activity.timestamp)
        })

    for search in search_logs:
        row = school_rows.get(search.school_id)
        if not row:
            continue

        row["searches"] += 1
        active_days_map[search.school_id].add(search.created_at.date().isoformat())
        set_last_activity(row, search.created_at, f'Searched "{search.query}"')
        bump_daily_bucket(buckets, search.created_at, "searches")
        if (search.results_count or 0) == 0:
            bump_daily_bucket(buckets, search.created_at, "zero_results")

        recent_activity.append({
            "id": f"search-{search.id}",
            "school_id": search.school_id,
            "school_name": search.school_name,
            "type": "resource_search",
            "title": f'Searched "{search.query}"',
            "description": f'Returned {search.results_count or 0} result(s) in {search.category or "all categories"}.',
            "timestamp": iso_or_none(search.created_at)
        })

    for download in download_logs:
        row = school_rows.get(download.school_id)
        if not row:
            continue

        resource = resource_map.get(download.resource_id)
        row["downloads"] += 1
        active_days_map[download.school_id].add(download.downloaded_at.date().isoformat())
        set_last_activity(row, download.downloaded_at, f"Downloaded {resource.name if resource else 'resource'}")
        bump_daily_bucket(buckets, download.downloaded_at, "downloads")

        recent_activity.append({
            "id": f"download-{download.id}",
            "school_id": download.school_id,
            "school_name": download.school_name,
            "type": "resource_download",
            "title": f"Downloaded {resource.name if resource else download.resource_id}",
            "description": f"Downloaded {resource.category if resource else 'resource'} content.",
            "timestamp": iso_or_none(download.downloaded_at)
        })

    for upload in upload_logs:
        row = school_rows.get(upload.uploaded_by_id)
        if not row:
            continue

        row["uploads"] += 1
        active_days_map[upload.uploaded_by_id].add(upload.created_at.date().isoformat())
        set_last_activity(row, upload.created_at, f"Uploaded {upload.name}")
        bump_daily_bucket(buckets, upload.created_at, "uploads")

        recent_activity.append({
            "id": f"upload-{upload.id}",
            "school_id": upload.uploaded_by_id,
            "school_name": upload.uploaded_by_name or row["school_name"],
            "type": "resource_upload",
            "title": f"Uploaded {upload.name}",
            "description": f"{upload.category.title()} resource uploaded with {upload.approval_status} status.",
            "timestamp": iso_or_none(upload.created_at)
        })

    for ticket in ticket_logs:
        row = school_rows.get(ticket.school_id)
        if not row:
            continue

        row["tickets"] += 1
        active_days_map[ticket.school_id].add(ticket.created_at.date().isoformat())
        set_last_activity(row, ticket.created_at, f"Created ticket {ticket.ticket_id}")
        bump_daily_bucket(buckets, ticket.created_at, "tickets")

        recent_activity.append({
            "id": f"ticket-{ticket.id}",
            "school_id": ticket.school_id,
            "school_name": ticket.school_name,
            "type": "support_ticket_created",
            "title": f"Created ticket {ticket.ticket_id}",
            "description": f"{ticket.priority.title()} priority ticket in {ticket.category}.",
            "timestamp": iso_or_none(ticket.created_at)
        })

    for chat in chat_logs:
        row = school_rows.get(chat.school_id)
        if not row:
            continue

        row["messages"] += 1
        active_days_map[chat.school_id].add(chat.created_at.date().isoformat())
        set_last_activity(row, chat.created_at, "Sent a chat message")
        bump_daily_bucket(buckets, chat.created_at, "messages")

        recent_activity.append({
            "id": f"chat-{chat.id}",
            "school_id": chat.school_id,
            "school_name": chat.school_name,
            "type": "chat_message_sent",
            "title": "Sent a chat message",
            "description": (chat.message or "").strip()[:180] or "Message sent to admin.",
            "timestamp": iso_or_none(chat.created_at)
        })

    school_breakdown = []
    for row in school_rows.values():
        row["active_days"] = len(active_days_map[row["school_id"]])
        row["total_actions"] = (
            row["logins"] + row["page_views"] + row["searches"] + row["previews"] +
            row["downloads"] + row["uploads"] + row["tickets"] + row["messages"]
        )
        row["activity_score"] = (
            row["logins"] * 3 +
            row["page_views"] +
            row["searches"] * 2 +
            row["previews"] * 2 +
            row["downloads"] * 4 +
            row["uploads"] * 5 +
            row["tickets"] * 4 +
            row["messages"] * 2
        )
        row["last_active_at"] = iso_or_none(row["last_active_at"])
        school_breakdown.append(row)

    school_breakdown.sort(
        key=lambda item: (
            item["activity_score"],
            item["total_actions"],
            item["last_active_at"] or ""
        ),
        reverse=True
    )

    summary = {
        "active_schools": len([row for row in school_breakdown if row["total_actions"] > 0]),
        "total_logins": sum(row["logins"] for row in school_breakdown),
        "total_logouts": sum(row["logouts"] for row in school_breakdown),
        "total_page_views": sum(row["page_views"] for row in school_breakdown),
        "total_searches": sum(row["searches"] for row in school_breakdown),
        "total_previews": sum(row["previews"] for row in school_breakdown),
        "total_downloads": sum(row["downloads"] for row in school_breakdown),
        "total_uploads": sum(row["uploads"] for row in school_breakdown),
        "total_tickets": sum(row["tickets"] for row in school_breakdown),
        "total_messages": sum(row["messages"] for row in school_breakdown)
    }

    activity_breakdown = [
        {"key": "logins", "label": "Logins", "count": summary["total_logins"]},
        {"key": "logouts", "label": "Logouts", "count": summary["total_logouts"]},
        {"key": "page_views", "label": "Page Views", "count": summary["total_page_views"]},
        {"key": "searches", "label": "Searches", "count": summary["total_searches"]},
        {"key": "previews", "label": "Previews", "count": summary["total_previews"]},
        {"key": "downloads", "label": "Downloads", "count": summary["total_downloads"]},
        {"key": "uploads", "label": "Uploads", "count": summary["total_uploads"]},
        {"key": "tickets", "label": "Tickets", "count": summary["total_tickets"]},
        {"key": "messages", "label": "Messages", "count": summary["total_messages"]}
    ]

    recent_activity.sort(key=lambda item: item["timestamp"] or "", reverse=True)

    return {
        "days": normalized_days,
        "summary": summary,
        "activity_breakdown": activity_breakdown,
        "daily_activity": list(buckets.values()),
        "school_breakdown": school_breakdown,
        "recent_activity": recent_activity[:40]
    }

@api_router.get("/admin/analytics/resources")
async def get_resource_analytics(db: Session = Depends(get_db)):
    """Get resource analytics - Admin"""
    total_resources = db.query(Resource).count()
    pending_approvals = db.query(Resource).filter(Resource.approval_status == 'pending').count()
    total_downloads = db.query(ResourceDownload).count()
    
    # Top downloaded resources
    from sqlalchemy import func
    top_resources = db.query(
        Resource.name,
        Resource.category,
        Resource.download_count
    ).order_by(Resource.download_count.desc()).limit(10).all()
    
    return {
        "total_resources": total_resources,
        "pending_approvals": pending_approvals,
        "total_downloads": total_downloads,
        "top_resources": [
            {"name": r.name, "category": r.category, "downloads": r.download_count}
            for r in top_resources
        ]
    }

@api_router.get("/admin/dashboard/overview")
async def get_admin_dashboard_overview(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Actionable admin home overview with KPIs, notifications, and recent activity."""
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_schools = db.query(School).count()
    total_resources = db.query(Resource).count()
    downloads_this_month = db.query(ResourceDownload).filter(
        ResourceDownload.downloaded_at >= start_of_month
    ).count()

    external_monthly_downloads = 0
    external_download_logs = db.query(ActivityLog).filter(
        ActivityLog.timestamp >= start_of_month,
        ActivityLog.activity_type == "resource_download"
    ).all()
    for log in external_download_logs:
        details = parse_activity_details(log.details) or {}
        if details.get("is_external_link"):
            external_monthly_downloads += 1

    pending_school_requests = db.query(Resource).filter(
        Resource.uploaded_by_type == "school",
        Resource.approval_status == "pending"
    ).count()

    unread_school_messages = db.query(ChatMessage).filter(
        ChatMessage.sender_type == "school",
        ChatMessage.is_read == False
    ).order_by(ChatMessage.created_at.desc()).all()

    chat_notifications: Dict[str, Dict[str, Any]] = {}
    for item in unread_school_messages:
        if item.school_id not in chat_notifications:
            chat_notifications[item.school_id] = {
                "school_id": item.school_id,
                "school_name": item.school_name,
                "unread_count": 0,
                "last_message": item.message,
                "last_message_at": item.created_at
            }
        chat_notifications[item.school_id]["unread_count"] += 1
        if item.created_at > chat_notifications[item.school_id]["last_message_at"]:
            chat_notifications[item.school_id]["last_message_at"] = item.created_at
            chat_notifications[item.school_id]["last_message"] = item.message

    open_tickets = db.query(SupportTicket).filter(
        SupportTicket.status.in_(["open", "in_progress"])
    ).order_by(SupportTicket.created_at.desc()).all()

    priority_rank = {"high": 0, "normal": 1, "low": 2}
    ticket_notifications = sorted(
        [
            {
                "ticket_id": ticket.ticket_id,
                "school_id": ticket.school_id,
                "school_name": ticket.school_name,
                "subject": ticket.subject,
                "category": ticket.category,
                "priority": ticket.priority,
                "status": ticket.status,
                "created_at": iso_or_none(ticket.created_at)
            }
            for ticket in open_tickets
        ],
        key=lambda item: (
            priority_rank.get(item["priority"], 9),
            item["created_at"] or ""
        )
    )

    recent_logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(20).all()
    recent_activity = []
    for activity in recent_logs:
        details = parse_activity_details(activity.details)
        recent_activity.append({
            "id": activity.id,
            "school_id": activity.school_id,
            "school_name": activity.school_name,
            "activity_type": activity.activity_type,
            "title": build_activity_title(activity.activity_type, details),
            "description": build_activity_description(activity.activity_type, details),
            "timestamp": iso_or_none(activity.timestamp)
        })

    active_schools_today = len({
        activity.school_id
        for activity in db.query(ActivityLog).filter(ActivityLog.timestamp >= start_of_day).all()
        if activity.school_id
    })

    return {
        "summary": {
            "total_schools": total_schools,
            "total_resources": total_resources,
            "downloads_this_month": downloads_this_month + external_monthly_downloads,
            "pending_school_requests": pending_school_requests,
            "unread_chat_queries": len(unread_school_messages),
            "schools_waiting_in_chat": len(chat_notifications),
            "open_ticket_queries": len(open_tickets),
            "active_schools_today": active_schools_today
        },
        "recent_activity": recent_activity,
        "chat_notifications": [
            {
                **item,
                "last_message_at": iso_or_none(item["last_message_at"])
            }
            for item in sorted(
                chat_notifications.values(),
                key=lambda value: value["last_message_at"],
                reverse=True
            )[:6]
        ],
        "ticket_notifications": ticket_notifications[:6]
    }

@api_router.get("/admin/analytics/resource-insights")
async def get_resource_insights_analytics(
    days: int = 30,
    category: Optional[str] = None,
    school_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Resource performance analytics across previews, downloads, and school uploads."""
    normalized_days = normalize_analytics_days(days)
    cutoff = datetime.utcnow() - timedelta(days=normalized_days - 1)
    category_filter = None if not category or category == "all" else category
    school_filter = None if not school_id or school_id == "all" else school_id

    resource_query = db.query(Resource)
    if category_filter:
        resource_query = resource_query.filter(Resource.category == category_filter)
    resources = resource_query.all()
    resource_map = {resource.resource_id: resource for resource in resources}
    resource_ids = set(resource_map.keys())

    download_query = db.query(ResourceDownload).filter(ResourceDownload.downloaded_at >= cutoff)
    if school_filter:
        download_query = download_query.filter(ResourceDownload.school_id == school_filter)
    download_logs = [item for item in download_query.order_by(ResourceDownload.downloaded_at.desc()).all() if item.resource_id in resource_ids]

    external_download_query = db.query(ActivityLog).filter(
        ActivityLog.timestamp >= cutoff,
        ActivityLog.activity_type == "resource_download"
    )
    if school_filter:
        external_download_query = external_download_query.filter(ActivityLog.school_id == school_filter)
    external_download_logs = []
    for item in external_download_query.order_by(ActivityLog.timestamp.desc()).all():
        details = parse_activity_details(item.details) or {}
        if not details.get("is_external_link"):
            continue
        if details.get("resource_id") not in resource_ids:
            continue
        external_download_logs.append((item, details))

    preview_query = db.query(ActivityLog).filter(
        ActivityLog.timestamp >= cutoff,
        ActivityLog.activity_type == "resource_preview"
    )
    if school_filter:
        preview_query = preview_query.filter(ActivityLog.school_id == school_filter)
    preview_logs = []
    for item in preview_query.order_by(ActivityLog.timestamp.desc()).all():
        details = parse_activity_details(item.details) or {}
        resource_id = details.get("resource_id")
        resource = resource_map.get(resource_id)
        if category_filter and not resource:
            continue
        preview_logs.append((item, details, resource))

    school_upload_query = db.query(Resource).filter(
        Resource.uploaded_by_type == "school",
        Resource.created_at >= cutoff
    )
    if category_filter:
        school_upload_query = school_upload_query.filter(Resource.category == category_filter)
    if school_filter:
        school_upload_query = school_upload_query.filter(Resource.uploaded_by_id == school_filter)
    school_uploads = school_upload_query.order_by(Resource.created_at.desc()).all()

    pending_approvals = len([resource for resource in resources if resource.approval_status == "pending"])
    buckets = build_daily_buckets(normalized_days)
    category_summary: Dict[str, Dict[str, Any]] = {}
    resource_performance: Dict[str, Dict[str, Any]] = {}

    for resource in resources:
        category_summary.setdefault(resource.category, {
            "category": resource.category,
            "resource_count": 0,
            "downloads": 0,
            "previews": 0,
            "school_uploads": 0
        })
        category_summary[resource.category]["resource_count"] += 1
        resource_performance[resource.resource_id] = {
            "resource_id": resource.resource_id,
            "name": resource.name,
            "category": resource.category,
            "class_level": resource.class_level or "N/A",
            "subject": resource.subject or "N/A",
            "downloads": 0,
            "previews": 0,
            "unique_schools": set(),
            "last_downloaded_at": None
        }

    for download in download_logs:
        resource = resource_map.get(download.resource_id)
        if not resource:
            continue

        category_summary[resource.category]["downloads"] += 1
        resource_performance[download.resource_id]["downloads"] += 1
        resource_performance[download.resource_id]["unique_schools"].add(download.school_id)
        existing_last = resource_performance[download.resource_id]["last_downloaded_at"]
        if existing_last is None or download.downloaded_at > existing_last:
            resource_performance[download.resource_id]["last_downloaded_at"] = download.downloaded_at
        bump_daily_bucket(buckets, download.downloaded_at, "downloads")

    for activity, details in external_download_logs:
        resource = resource_map.get(details.get("resource_id"))
        if not resource:
            continue

        category_summary[resource.category]["downloads"] += 1
        resource_performance[resource.resource_id]["downloads"] += 1
        resource_performance[resource.resource_id]["unique_schools"].add(activity.school_id)
        existing_last = resource_performance[resource.resource_id]["last_downloaded_at"]
        if existing_last is None or activity.timestamp > existing_last:
            resource_performance[resource.resource_id]["last_downloaded_at"] = activity.timestamp
        bump_daily_bucket(buckets, activity.timestamp, "downloads")

    for preview_log, details, resource in preview_logs:
        if not resource:
            continue

        category_summary[resource.category]["previews"] += 1
        resource_performance[resource.resource_id]["previews"] += 1
        bump_daily_bucket(buckets, preview_log.timestamp, "previews")

    for upload in school_uploads:
        category_summary.setdefault(upload.category, {
            "category": upload.category,
            "resource_count": 0,
            "downloads": 0,
            "previews": 0,
            "school_uploads": 0
        })
        category_summary[upload.category]["school_uploads"] += 1
        bump_daily_bucket(buckets, upload.created_at, "uploads")

    top_resources = []
    for item in resource_performance.values():
        top_resources.append({
            **item,
            "unique_schools": len(item["unique_schools"]),
            "last_downloaded_at": iso_or_none(item["last_downloaded_at"])
        })

    top_resources.sort(
        key=lambda item: (
            item["downloads"],
            item["previews"],
            item["unique_schools"],
            item["name"]
        ),
        reverse=True
    )

    summary = {
        "total_resources": len(resources),
        "pending_approvals": pending_approvals,
        "downloads_in_range": len(download_logs) + len(external_download_logs),
        "previews_in_range": len(preview_logs),
        "school_uploads_in_range": len(school_uploads),
        "unique_downloading_schools": len(
            {item.school_id for item in download_logs}.union({item[0].school_id for item in external_download_logs})
        )
    }

    return {
        "days": normalized_days,
        "summary": summary,
        "daily_trend": list(buckets.values()),
        "category_summary": sorted(category_summary.values(), key=lambda item: item["downloads"], reverse=True),
        "top_resources": top_resources[:25]
    }

@api_router.get("/admin/analytics/search-insights")
async def get_search_insights_analytics(
    days: int = 30,
    school_id: Optional[str] = None,
    category: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Search behavior analytics across school resource usage."""
    normalized_days = normalize_analytics_days(days)
    cutoff = datetime.utcnow() - timedelta(days=normalized_days - 1)
    category_filter = None if not category or category == "all" else category
    school_filter = None if not school_id or school_id == "all" else school_id

    query = db.query(SchoolSearchLog).filter(SchoolSearchLog.created_at >= cutoff)
    if school_filter:
        query = query.filter(SchoolSearchLog.school_id == school_filter)
    if category_filter:
        query = query.filter(SchoolSearchLog.category == category_filter)

    search_logs = query.order_by(SchoolSearchLog.created_at.desc()).all()
    buckets = build_daily_buckets(normalized_days)

    query_summary: Dict[str, Dict[str, Any]] = {}
    school_summary: Dict[str, Dict[str, Any]] = {}
    category_summary: Dict[str, Dict[str, Any]] = {}

    for search in search_logs:
        key = search.normalized_query or search.query.strip().lower()
        query_summary.setdefault(key, {
            "query": search.query,
            "searches": 0,
            "unique_schools": set(),
            "zero_results": 0,
            "results_total": 0,
            "last_searched_at": None
        })
        school_summary.setdefault(search.school_id, {
            "school_id": search.school_id,
            "school_name": search.school_name,
            "searches": 0,
            "zero_results": 0,
            "results_total": 0,
            "last_searched_at": None,
            "top_queries": Counter()
        })
        category_key = search.category or "uncategorized"
        category_summary.setdefault(category_key, {
            "category": category_key,
            "searches": 0,
            "zero_results": 0
        })

        query_summary[key]["query"] = search.query
        query_summary[key]["searches"] += 1
        query_summary[key]["unique_schools"].add(search.school_id)
        query_summary[key]["results_total"] += search.results_count or 0
        if query_summary[key]["last_searched_at"] is None or search.created_at > query_summary[key]["last_searched_at"]:
            query_summary[key]["last_searched_at"] = search.created_at

        school_summary[search.school_id]["searches"] += 1
        school_summary[search.school_id]["results_total"] += search.results_count or 0
        school_summary[search.school_id]["top_queries"][search.query] += 1
        if school_summary[search.school_id]["last_searched_at"] is None or search.created_at > school_summary[search.school_id]["last_searched_at"]:
            school_summary[search.school_id]["last_searched_at"] = search.created_at

        category_summary[category_key]["searches"] += 1
        bump_daily_bucket(buckets, search.created_at, "searches")
        if (search.results_count or 0) == 0:
            query_summary[key]["zero_results"] += 1
            school_summary[search.school_id]["zero_results"] += 1
            category_summary[category_key]["zero_results"] += 1
            bump_daily_bucket(buckets, search.created_at, "zero_results")

    top_queries = []
    zero_result_queries = []
    for entry in query_summary.values():
        payload = {
            "query": entry["query"],
            "searches": entry["searches"],
            "unique_schools": len(entry["unique_schools"]),
            "avg_results": round(entry["results_total"] / entry["searches"], 2) if entry["searches"] else 0,
            "zero_results": entry["zero_results"],
            "last_searched_at": iso_or_none(entry["last_searched_at"])
        }
        top_queries.append(payload)
        if entry["zero_results"] > 0:
            zero_result_queries.append(payload)

    top_queries.sort(key=lambda item: (item["searches"], item["unique_schools"]), reverse=True)
    zero_result_queries.sort(key=lambda item: (item["zero_results"], item["searches"]), reverse=True)

    school_breakdown = []
    for entry in school_summary.values():
        top_query = entry["top_queries"].most_common(1)[0][0] if entry["top_queries"] else "N/A"
        school_breakdown.append({
            "school_id": entry["school_id"],
            "school_name": entry["school_name"],
            "searches": entry["searches"],
            "zero_results": entry["zero_results"],
            "avg_results": round(entry["results_total"] / entry["searches"], 2) if entry["searches"] else 0,
            "top_query": top_query,
            "last_searched_at": iso_or_none(entry["last_searched_at"])
        })

    school_breakdown.sort(key=lambda item: (item["searches"], item["zero_results"]), reverse=True)

    summary = {
        "total_searches": len(search_logs),
        "unique_searching_schools": len({item.school_id for item in search_logs}),
        "zero_result_searches": len([item for item in search_logs if (item.results_count or 0) == 0]),
        "avg_results_per_search": round(
            sum((item.results_count or 0) for item in search_logs) / len(search_logs),
            2
        ) if search_logs else 0
    }

    return {
        "days": normalized_days,
        "summary": summary,
        "daily_trend": list(buckets.values()),
        "category_breakdown": sorted(category_summary.values(), key=lambda item: item["searches"], reverse=True),
        "top_queries": top_queries[:20],
        "zero_result_queries": zero_result_queries[:20],
        "school_breakdown": school_breakdown,
        "recent_searches": [
            {
                "id": item.id,
                "school_id": item.school_id,
                "school_name": item.school_name,
                "query": item.query,
                "results_count": item.results_count,
                "category": item.category or "all",
                "sub_category": item.sub_category or "all",
                "created_at": iso_or_none(item.created_at)
            }
            for item in search_logs[:40]
        ]
    }

@api_router.get("/admin/analytics/download-tracking")
async def get_download_tracking_analytics(
    days: int = 30,
    school_id: Optional[str] = None,
    category: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Detailed download analytics by school, resource, and recency."""
    normalized_days = normalize_analytics_days(days)
    cutoff = datetime.utcnow() - timedelta(days=normalized_days - 1)
    school_filter = None if not school_id or school_id == "all" else school_id
    category_filter = None if not category or category == "all" else category

    download_query = db.query(ResourceDownload).filter(ResourceDownload.downloaded_at >= cutoff)
    if school_filter:
        download_query = download_query.filter(ResourceDownload.school_id == school_filter)
    download_logs = download_query.order_by(ResourceDownload.downloaded_at.desc()).all()

    external_download_query = db.query(ActivityLog).filter(
        ActivityLog.timestamp >= cutoff,
        ActivityLog.activity_type == "resource_download"
    )
    if school_filter:
        external_download_query = external_download_query.filter(ActivityLog.school_id == school_filter)
    external_download_logs = []
    for item in external_download_query.order_by(ActivityLog.timestamp.desc()).all():
        details = parse_activity_details(item.details) or {}
        if details.get("is_external_link"):
            external_download_logs.append((item, details))

    resource_ids = sorted(
        {item.resource_id for item in download_logs}.union({item[1].get("resource_id") for item in external_download_logs if item[1].get("resource_id")})
    )
    resource_map = {}
    if resource_ids:
        resource_query = db.query(Resource).filter(Resource.resource_id.in_(resource_ids))
        if category_filter:
            resource_query = resource_query.filter(Resource.category == category_filter)
        resource_map = {
            resource.resource_id: resource
            for resource in resource_query.all()
        }

    filtered_downloads = [item for item in download_logs if item.resource_id in resource_map]
    filtered_external_downloads = [item for item in external_download_logs if item[1].get("resource_id") in resource_map]
    buckets = build_daily_buckets(normalized_days)
    school_summary: Dict[str, Dict[str, Any]] = {}
    resource_summary: Dict[str, Dict[str, Any]] = {}
    category_summary: Dict[str, Dict[str, Any]] = {}

    for download in filtered_downloads:
        resource = resource_map.get(download.resource_id)
        if not resource:
            continue

        school_summary.setdefault(download.school_id, {
            "school_id": download.school_id,
            "school_name": download.school_name,
            "downloads": 0,
            "unique_resources": set(),
            "last_downloaded_at": None
        })
        resource_summary.setdefault(download.resource_id, {
            "resource_id": download.resource_id,
            "resource_name": resource.name,
            "category": resource.category,
            "downloads": 0,
            "unique_schools": set(),
            "last_downloaded_at": None
        })
        category_summary.setdefault(resource.category, {
            "category": resource.category,
            "downloads": 0,
            "unique_resources": set(),
            "unique_schools": set()
        })

        school_summary[download.school_id]["downloads"] += 1
        school_summary[download.school_id]["unique_resources"].add(download.resource_id)
        if school_summary[download.school_id]["last_downloaded_at"] is None or download.downloaded_at > school_summary[download.school_id]["last_downloaded_at"]:
            school_summary[download.school_id]["last_downloaded_at"] = download.downloaded_at

        resource_summary[download.resource_id]["downloads"] += 1
        resource_summary[download.resource_id]["unique_schools"].add(download.school_id)
        if resource_summary[download.resource_id]["last_downloaded_at"] is None or download.downloaded_at > resource_summary[download.resource_id]["last_downloaded_at"]:
            resource_summary[download.resource_id]["last_downloaded_at"] = download.downloaded_at

        category_summary[resource.category]["downloads"] += 1
        category_summary[resource.category]["unique_resources"].add(download.resource_id)
        category_summary[resource.category]["unique_schools"].add(download.school_id)
        bump_daily_bucket(buckets, download.downloaded_at, "downloads")

    for activity, details in filtered_external_downloads:
        resource_id = details.get("resource_id")
        resource = resource_map.get(resource_id)
        if not resource:
            continue

        school_summary.setdefault(activity.school_id, {
            "school_id": activity.school_id,
            "school_name": activity.school_name,
            "downloads": 0,
            "unique_resources": set(),
            "last_downloaded_at": None
        })
        resource_summary.setdefault(resource_id, {
            "resource_id": resource_id,
            "resource_name": resource.name,
            "category": resource.category,
            "downloads": 0,
            "unique_schools": set(),
            "last_downloaded_at": None
        })
        category_summary.setdefault(resource.category, {
            "category": resource.category,
            "downloads": 0,
            "unique_resources": set(),
            "unique_schools": set()
        })

        school_summary[activity.school_id]["downloads"] += 1
        school_summary[activity.school_id]["unique_resources"].add(resource_id)
        if school_summary[activity.school_id]["last_downloaded_at"] is None or activity.timestamp > school_summary[activity.school_id]["last_downloaded_at"]:
            school_summary[activity.school_id]["last_downloaded_at"] = activity.timestamp

        resource_summary[resource_id]["downloads"] += 1
        resource_summary[resource_id]["unique_schools"].add(activity.school_id)
        if resource_summary[resource_id]["last_downloaded_at"] is None or activity.timestamp > resource_summary[resource_id]["last_downloaded_at"]:
            resource_summary[resource_id]["last_downloaded_at"] = activity.timestamp

        category_summary[resource.category]["downloads"] += 1
        category_summary[resource.category]["unique_resources"].add(resource_id)
        category_summary[resource.category]["unique_schools"].add(activity.school_id)
        bump_daily_bucket(buckets, activity.timestamp, "downloads")

    school_breakdown = [
        {
            "school_id": item["school_id"],
            "school_name": item["school_name"],
            "downloads": item["downloads"],
            "unique_resources": len(item["unique_resources"]),
            "last_downloaded_at": iso_or_none(item["last_downloaded_at"])
        }
        for item in school_summary.values()
    ]
    school_breakdown.sort(key=lambda item: (item["downloads"], item["unique_resources"]), reverse=True)

    resource_breakdown = [
        {
            "resource_id": item["resource_id"],
            "resource_name": item["resource_name"],
            "category": item["category"],
            "downloads": item["downloads"],
            "unique_schools": len(item["unique_schools"]),
            "last_downloaded_at": iso_or_none(item["last_downloaded_at"])
        }
        for item in resource_summary.values()
    ]
    resource_breakdown.sort(key=lambda item: (item["downloads"], item["unique_schools"]), reverse=True)

    category_breakdown = [
        {
            "category": item["category"],
            "downloads": item["downloads"],
            "unique_resources": len(item["unique_resources"]),
            "unique_schools": len(item["unique_schools"])
        }
        for item in category_summary.values()
    ]
    category_breakdown.sort(key=lambda item: item["downloads"], reverse=True)

    summary = {
        "total_downloads": len(filtered_downloads) + len(filtered_external_downloads),
        "unique_schools": len(school_summary),
        "unique_resources": len(resource_summary),
        "avg_downloads_per_school": round(
            (len(filtered_downloads) + len(filtered_external_downloads)) / len(school_summary),
            2
        ) if school_summary else 0
    }

    recent_downloads = [
        {
            "id": item.id,
            "school_id": item.school_id,
            "school_name": item.school_name,
            "resource_id": item.resource_id,
            "resource_name": resource_map[item.resource_id].name if item.resource_id in resource_map else item.resource_id,
            "category": resource_map[item.resource_id].category if item.resource_id in resource_map else "unknown",
            "downloaded_at": iso_or_none(item.downloaded_at)
        }
        for item in filtered_downloads[:50]
    ] + [
        {
            "id": f"external-{item[0].id}",
            "school_id": item[0].school_id,
            "school_name": item[0].school_name,
            "resource_id": item[1].get("resource_id"),
            "resource_name": resource_map[item[1].get("resource_id")].name if item[1].get("resource_id") in resource_map else item[1].get("resource_name"),
            "category": resource_map[item[1].get("resource_id")].category if item[1].get("resource_id") in resource_map else "unknown",
            "downloaded_at": iso_or_none(item[0].timestamp)
        }
        for item in filtered_external_downloads[:50]
    ]
    recent_downloads.sort(key=lambda item: item["downloaded_at"] or "", reverse=True)

    return {
        "days": normalized_days,
        "summary": summary,
        "daily_trend": list(buckets.values()),
        "school_breakdown": school_breakdown,
        "resource_breakdown": resource_breakdown,
        "category_breakdown": category_breakdown,
        "recent_downloads": recent_downloads[:50]
    }

@api_router.get("/school/analytics/usage")
async def get_school_usage(school_id: str, db: Session = Depends(get_db)):
    """Get usage statistics for school"""
    # Downloads this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    downloads_this_month = db.query(ResourceDownload).filter(
        ResourceDownload.school_id == school_id,
        ResourceDownload.downloaded_at >= start_of_month
    ).count()
    downloads_this_month += count_external_school_downloads(db, school_id, start_of_month)
    
    # Total uploads by school
    school_uploads = db.query(Resource).filter(
        Resource.uploaded_by_id == school_id,
        Resource.uploaded_by_type == 'school'
    ).all()
    uploads_by_school = len(school_uploads)

    pending_uploads = len([resource for resource in school_uploads if resource.approval_status == 'pending'])
    approved_uploads = len([resource for resource in school_uploads if resource.approval_status == 'approved'])
    rejected_uploads = len([resource for resource in school_uploads if resource.approval_status == 'rejected'])

    # Storage used
    from sqlalchemy import func
    storage_used = db.query(func.sum(Resource.file_size)).filter(
        Resource.uploaded_by_id == school_id,
        Resource.uploaded_by_type == 'school'
    ).scalar() or 0

    unread_announcements = len(get_unread_announcement_entries(db, school_id))
    unread_chat_messages = db.query(ChatMessage).filter(
        ChatMessage.school_id == school_id,
        ChatMessage.sender_type == 'admin',
        ChatMessage.is_read == False
    ).count()
    unread_ticket_updates = len(get_unread_school_ticket_updates(db, school_id))
    
    return {
        "downloads_this_month": downloads_this_month,
        "resources_uploaded": uploads_by_school,
        "pending_uploads": pending_uploads,
        "approved_uploads": approved_uploads,
        "rejected_uploads": rejected_uploads,
        "storage_used_bytes": storage_used,
        "storage_used_mb": round(storage_used / (1024 * 1024), 2),
        "unread_announcements": unread_announcements,
        "unread_chat_messages": unread_chat_messages,
        "unread_ticket_updates": unread_ticket_updates
    }

@api_router.get("/school/dashboard/overview")
async def get_school_dashboard_overview(
    school_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """School dashboard home overview with KPIs, notifications, and popular resources."""
    if current_user.get("user_type") != "school" or current_user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="School mismatch for dashboard overview")

    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    downloads_this_month = db.query(ResourceDownload).filter(
        ResourceDownload.school_id == school_id,
        ResourceDownload.downloaded_at >= start_of_month
    ).count()
    downloads_this_month += count_external_school_downloads(db, school_id, start_of_month)

    school_uploads = db.query(Resource).filter(
        Resource.uploaded_by_id == school_id,
        Resource.uploaded_by_type == 'school'
    ).order_by(Resource.created_at.desc()).all()

    resources_uploaded = len(school_uploads)
    pending_uploads = len([resource for resource in school_uploads if resource.approval_status == 'pending'])

    unread_announcements = get_unread_announcement_entries(db, school_id)
    visible_announcements = get_visible_school_announcements(db, school_id)
    unread_announcement_ids = {announcement.id for announcement in unread_announcements}
    ordered_announcements = unread_announcements + [
        announcement for announcement in visible_announcements if announcement.id not in unread_announcement_ids
    ]

    unread_admin_messages = db.query(ChatMessage).filter(
        ChatMessage.school_id == school_id,
        ChatMessage.sender_type == 'admin',
        ChatMessage.is_read == False
    ).order_by(ChatMessage.created_at.desc()).all()

    unread_ticket_updates = get_unread_school_ticket_updates(db, school_id)

    popular_resources = get_visible_school_resources_query(db, school_id).filter(
        Resource.approval_status == 'approved'
    ).order_by(Resource.download_count.desc(), Resource.created_at.desc()).limit(5).all()

    recent_activity_logs = db.query(ActivityLog).filter(
        ActivityLog.school_id == school_id
    ).order_by(ActivityLog.timestamp.desc()).limit(8).all()

    notification_total = len(unread_announcements) + len(unread_admin_messages) + len(unread_ticket_updates)

    return {
        "summary": {
            "downloads_this_month": downloads_this_month,
            "resources_uploaded": resources_uploaded,
            "pending_uploads": pending_uploads,
            "unread_notifications": notification_total,
            "unread_announcements": len(unread_announcements),
            "unread_chat_messages": len(unread_admin_messages),
            "unread_ticket_updates": len(unread_ticket_updates)
        },
        "popular_resources": [
            {
                "resource_id": resource.resource_id,
                "name": resource.name,
                "category": resource.category,
                "download_count": resource.download_count
            }
            for resource in popular_resources
        ],
        "announcement_notifications": [
            {
                "id": announcement.id,
                "title": announcement.title,
                "content": announcement.content,
                "priority": announcement.priority,
                "created_at": iso_or_none(announcement.created_at),
                "is_unread": announcement.id in unread_announcement_ids
            }
            for announcement in ordered_announcements[:4]
        ],
        "chat_notifications": [
            {
                "id": message_item.id,
                "message": message_item.message,
                "created_at": iso_or_none(message_item.created_at)
            }
            for message_item in unread_admin_messages[:4]
        ],
        "ticket_notifications": [
            {
                "ticket_id": ticket.ticket_id,
                "subject": ticket.subject,
                "status": ticket.status,
                "priority": ticket.priority,
                "admin_response": ticket.admin_response,
                "created_at": iso_or_none(ticket.created_at),
                "admin_updated_at": iso_or_none(ticket.admin_updated_at)
            }
            for ticket in unread_ticket_updates[:4]
        ],
        "recent_activity": [
            {
                "id": activity.id,
                "title": build_activity_title(activity.activity_type, parse_activity_details(activity.details)),
                "description": build_activity_description(activity.activity_type, parse_activity_details(activity.details)),
                "timestamp": iso_or_none(activity.timestamp)
            }
            for activity in recent_activity_logs
        ]
    }

@api_router.get("/school/analytics/report")
async def get_school_analytics_report(
    school_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detailed usage report for the school dashboard analytics section."""
    if current_user.get("user_type") != "school" or current_user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="School mismatch for usage report")

    normalized_days = normalize_analytics_days(days)
    cutoff = datetime.utcnow() - timedelta(days=normalized_days - 1)
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    upload_rows = db.query(Resource).filter(
        Resource.uploaded_by_id == school_id,
        Resource.uploaded_by_type == 'school'
    ).order_by(Resource.created_at.desc()).all()

    download_logs = db.query(ResourceDownload).filter(
        ResourceDownload.school_id == school_id,
        ResourceDownload.downloaded_at >= cutoff
    ).order_by(ResourceDownload.downloaded_at.desc()).all()
    external_downloads = db.query(ActivityLog).filter(
        ActivityLog.school_id == school_id,
        ActivityLog.activity_type == 'resource_download',
        ActivityLog.timestamp >= cutoff
    ).order_by(ActivityLog.timestamp.desc()).all()
    external_downloads = [
        (log, parse_activity_details(log.details) or {})
        for log in external_downloads
        if (parse_activity_details(log.details) or {}).get("is_external_link")
    ]

    search_logs = db.query(SchoolSearchLog).filter(
        SchoolSearchLog.school_id == school_id,
        SchoolSearchLog.created_at >= cutoff
    ).order_by(SchoolSearchLog.created_at.desc()).all()

    preview_logs = db.query(ActivityLog).filter(
        ActivityLog.school_id == school_id,
        ActivityLog.activity_type == 'resource_preview',
        ActivityLog.timestamp >= cutoff
    ).order_by(ActivityLog.timestamp.desc()).all()

    upload_activity_logs = db.query(ActivityLog).filter(
        ActivityLog.school_id == school_id,
        ActivityLog.activity_type == 'resource_upload',
        ActivityLog.timestamp >= cutoff
    ).order_by(ActivityLog.timestamp.desc()).all()

    activity_logs = db.query(ActivityLog).filter(
        ActivityLog.school_id == school_id,
        ActivityLog.timestamp >= cutoff
    ).order_by(ActivityLog.timestamp.desc()).all()

    resource_ids = {
        item.resource_id for item in download_logs
    }.union({
        item[1].get("resource_id") for item in external_downloads if item[1].get("resource_id")
    }).union({
        (parse_activity_details(item.details) or {}).get("resource_id") for item in preview_logs
        if (parse_activity_details(item.details) or {}).get("resource_id")
    }).union({
        resource.resource_id for resource in upload_rows
    })
    resource_ids = {item for item in resource_ids if item}
    resource_map = {}
    if resource_ids:
        resource_map = {
            resource.resource_id: resource
            for resource in db.query(Resource).filter(Resource.resource_id.in_(list(resource_ids))).all()
        }

    buckets = build_daily_buckets(normalized_days)
    category_summary: Dict[str, Dict[str, Any]] = {}
    resource_usage: Dict[str, Dict[str, Any]] = {}

    def ensure_category(category_name: str):
        category_summary.setdefault(category_name, {
            "category": category_name,
            "downloads": 0,
            "previews": 0,
            "searches": 0
        })

    for download in download_logs:
        resource = resource_map.get(download.resource_id)
        category_name = resource.category if resource else "unknown"
        ensure_category(category_name)
        category_summary[category_name]["downloads"] += 1
        bump_daily_bucket(buckets, download.downloaded_at, "downloads")

        if resource:
            resource_usage.setdefault(resource.resource_id, {
                "resource_id": resource.resource_id,
                "name": resource.name,
                "category": resource.category,
                "downloads": 0,
                "previews": 0
            })
            resource_usage[resource.resource_id]["downloads"] += 1

    for log, details in external_downloads:
        resource = resource_map.get(details.get("resource_id"))
        category_name = resource.category if resource else "multimedia"
        ensure_category(category_name)
        category_summary[category_name]["downloads"] += 1
        bump_daily_bucket(buckets, log.timestamp, "downloads")

        resource_name = details.get("resource_name") or (resource.name if resource else "External Resource")
        resource_id = details.get("resource_id") or f"external-{log.id}"
        resource_usage.setdefault(resource_id, {
            "resource_id": resource_id,
            "name": resource_name,
            "category": category_name,
            "downloads": 0,
            "previews": 0
        })
        resource_usage[resource_id]["downloads"] += 1

    for preview in preview_logs:
        details = parse_activity_details(preview.details) or {}
        resource = resource_map.get(details.get("resource_id"))
        category_name = resource.category if resource else details.get("category") or "unknown"
        ensure_category(category_name)
        category_summary[category_name]["previews"] += 1
        bump_daily_bucket(buckets, preview.timestamp, "previews")

        resource_id = details.get("resource_id")
        if resource_id and resource:
            resource_usage.setdefault(resource_id, {
                "resource_id": resource.resource_id,
                "name": resource.name,
                "category": resource.category,
                "downloads": 0,
                "previews": 0
            })
            resource_usage[resource_id]["previews"] += 1

    for search in search_logs:
        category_name = search.category or "all"
        ensure_category(category_name)
        category_summary[category_name]["searches"] += 1
        bump_daily_bucket(buckets, search.created_at, "searches")
        if (search.results_count or 0) == 0:
            bump_daily_bucket(buckets, search.created_at, "zero_results")

    for upload_activity in upload_activity_logs:
        bump_daily_bucket(buckets, upload_activity.timestamp, "uploads")

    upload_status_breakdown = {
        "approved": len([resource for resource in upload_rows if resource.approval_status == 'approved']),
        "pending": len([resource for resource in upload_rows if resource.approval_status == 'pending']),
        "rejected": len([resource for resource in upload_rows if resource.approval_status == 'rejected'])
    }

    unread_announcements = len(get_unread_announcement_entries(db, school_id))
    unread_chat_messages = db.query(ChatMessage).filter(
        ChatMessage.school_id == school_id,
        ChatMessage.sender_type == 'admin',
        ChatMessage.is_read == False
    ).count()
    unread_ticket_updates = len(get_unread_school_ticket_updates(db, school_id))

    return {
        "days": normalized_days,
        "summary": {
            "downloads_this_month": db.query(ResourceDownload).filter(
                ResourceDownload.school_id == school_id,
                ResourceDownload.downloaded_at >= start_of_month
            ).count() + count_external_school_downloads(db, school_id, start_of_month),
            "resources_uploaded": len(upload_rows),
            "pending_uploads": upload_status_breakdown["pending"],
            "approved_uploads": upload_status_breakdown["approved"],
            "rejected_uploads": upload_status_breakdown["rejected"],
            "searches": len(search_logs),
            "previews": len(preview_logs),
            "unread_announcements": unread_announcements,
            "unread_chat_messages": unread_chat_messages,
            "unread_ticket_updates": unread_ticket_updates
        },
        "activity_trend": list(buckets.values()),
        "category_summary": sorted(category_summary.values(), key=lambda item: item["downloads"], reverse=True),
        "top_resources": sorted(resource_usage.values(), key=lambda item: (item["downloads"], item["previews"]), reverse=True)[:8],
        "upload_status_breakdown": upload_status_breakdown,
        "upload_resources": [
            {
                "resource_id": resource.resource_id,
                "name": resource.name,
                "category": resource.category,
                "approval_status": resource.approval_status,
                "download_count": resource.download_count,
                "file_size_mb": round((resource.file_size or 0) / (1024 * 1024), 2),
                "created_at": iso_or_none(resource.created_at)
            }
            for resource in upload_rows[:20]
        ],
        "recent_activity": [
            {
                "id": activity.id,
                "title": build_activity_title(activity.activity_type, parse_activity_details(activity.details)),
                "description": build_activity_description(activity.activity_type, parse_activity_details(activity.details)),
                "timestamp": iso_or_none(activity.timestamp)
            }
            for activity in activity_logs[:12]
        ]
    }

# School info endpoint
@api_router.get("/school/info/{school_id}")
async def get_school_info(school_id: str, db: Session = Depends(get_db)):
    """Get school information including contact number"""
    school = db.query(School).filter(School.school_id == school_id).first()
    
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Fix logo path - ensure it's relative
    logo_path = None
    if school.logo_path:
        # Remove leading slash if present
        logo_path = school.logo_path.lstrip('/')
    
    return {
        "school_id": school.school_id,
        "school_name": school.school_name,
        "email": school.email,
        "contact_number": school.contact_number,
        "logo_path": logo_path
    }

# Debug endpoint for logo positions
@api_router.get("/debug/logo-position/{resource_id}")
async def debug_logo_position(
    resource_id: str,
    school_id: str,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check logo position"""
    position = db.query(SchoolLogoPosition).filter(
        SchoolLogoPosition.school_id == school_id,
        SchoolLogoPosition.resource_id == resource_id
    ).first()
    
    if not position:
        return {"message": "No logo position found", "exists": False}
    
    return {
        "exists": True,
        "school_id": position.school_id,
        "resource_id": position.resource_id,
        "x_position": position.x_position,
        "y_position": position.y_position,
        "width": position.width,
        "opacity": position.opacity,
        "rotation": position.rotation or 0,
        "updated_at": position.updated_at.isoformat() if position.updated_at else None
    }

@api_router.get("/")
async def root():
    return {"message": "Wonder Learning Digital Library API"}

# Health check endpoint for Kubernetes
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness and readiness probes"""
    return {"status": "healthy", "service": "wldl-api"}

# Include the router in the main app
app.include_router(api_router)

# Configure CORS - Use environment-specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Serve static files from the uploads directory
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

app.mount("/api/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="api_uploads")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
