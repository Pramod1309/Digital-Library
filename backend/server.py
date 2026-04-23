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
from types import SimpleNamespace
import qrcode
import base64


# Import database
from database import (
    get_db, Admin, School, PasswordResetToken, ActivityLog, Resource, 
    Announcement, SupportTicket, ChatMessage, ResourceDownload, 
    KnowledgeArticle, SchoolLogoPosition, SchoolWatermarkText, engine, Base, AdminResourceWatermark
)
from init_db import init_database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    activity = ActivityLog(
        school_id=school.school_id,
        school_name=school.school_name,
        activity_type="login",
        details=f"School logged in successfully"
    )
    db.add(activity)
    db.commit()
    
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
    # Check if user exists
    if request.user_type == "admin":
        user = db.query(Admin).filter(Admin.email == request.email).first()
    else:
        user = db.query(School).filter(School.email == request.email).first()
    
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
async def generate_qr_code(db: Session = Depends(get_db)):
    """Generate QR code for school registration"""
    try:
        # Environment-aware registration URL and QR image
        if config.environment == "production":
            registration_url = "https://koshquest.in/register-school"
            qr_image_filename = "school_registration_qr_production.png"
        else:
            registration_url = "http://localhost:3000/register-school"
            qr_image_filename = "school_registration_qr_localhost.png"
        
        # Path to environment-specific QR image
        qr_image_path = ROOT_DIR / "public" / qr_image_filename
        
        if not qr_image_path.exists():
            raise HTTPException(status_code=404, detail="QR code image not found")
        
        # Read the static QR image
        with open(qr_image_path, "rb") as qr_file:
            qr_image_data = qr_file.read()
        
        # Convert to base64 for easy display
        qr_base64 = base64.b64encode(qr_image_data).decode()
        
        return {
            "qr_code": f"data:image/png;base64,{qr_base64}",
            "registration_url": registration_url,
            "environment": config.environment,
            "qr_filename": qr_image_filename,
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
async def school_logout(school_id: str, school_name: str, db: Session = Depends(get_db)):
    """School logout endpoint - log activity"""
    activity = ActivityLog(
        school_id=school_id,
        school_name=school_name,
        activity_type="logout",
        details=f"School logged out"
    )
    db.add(activity)
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
    activity = ActivityLog(
        school_id=school_id,
        school_name=school_name,
        activity_type=activity_type,
        details=details
    )
    db.add(activity)
    db.commit()
    return {"message": "Activity logged"}

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
        "details": activity.details
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
        
        # Auto-number resource names if multiple files
        resource_name = name
        if len(files) > 1:
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
            approval_status='approved'
        )
        
        db.add(new_resource)
        uploaded_resources.append(new_resource)
    
    # Commit all resources at once
    db.commit()
    
    # Refresh all resources to get their IDs
    for resource in uploaded_resources:
        db.refresh(resource)
    
    return uploaded_resources

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
        approval_status='pending'
    )
    
    db.add(new_resource)
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
    
    db.commit()
    db.refresh(existing)
    
    return existing

@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(announcement_id: int, db: Session = Depends(get_db)):
    """Delete announcement - Admin only"""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    db.delete(announcement)
    db.commit()
    
    return {"message": "Announcement deleted"}

@api_router.get("/school/announcements", response_model=List[AnnouncementResponse])
async def get_school_announcements(school_id: str, db: Session = Depends(get_db)):
    """Get announcements for school"""
    announcements = db.query(Announcement).filter(
        Announcement.is_active == True,
        (Announcement.target_schools == None) | 
        (Announcement.target_schools.like(f"%{school_id}%"))
    ).order_by(Announcement.created_at.desc()).all()
    
    return announcements

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
    db.commit()
    db.refresh(new_ticket)
    
    return new_ticket

@api_router.get("/school/support/tickets", response_model=List[SupportTicketResponse])
async def get_school_tickets(school_id: str, db: Session = Depends(get_db)):
    """Get tickets for school"""
    tickets = db.query(SupportTicket).filter(
        SupportTicket.school_id == school_id
    ).order_by(SupportTicket.created_at.desc()).all()
    
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
        
        # Log download
        if school_id and school_name:
            download_log = ResourceDownload(
                resource_id=resource_id,
                school_id=school_id,
                school_name=school_name
            )
            db.add(download_log)
            resource.download_count += 1
            db.commit()
            print(f"Download logged for school: {school_name}")

        requested_format = (format or "").strip().lower()

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

@api_router.get("/school/analytics/usage")
async def get_school_usage(school_id: str, db: Session = Depends(get_db)):
    """Get usage statistics for school"""
    # Downloads this month
    from datetime import datetime, timedelta
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    downloads_this_month = db.query(ResourceDownload).filter(
        ResourceDownload.school_id == school_id,
        ResourceDownload.downloaded_at >= start_of_month
    ).count()
    
    # Total uploads by school
    uploads_by_school = db.query(Resource).filter(
        Resource.uploaded_by_id == school_id
    ).count()
    
    # Storage used
    from sqlalchemy import func
    storage_used = db.query(func.sum(Resource.file_size)).filter(
        Resource.uploaded_by_id == school_id
    ).scalar() or 0
    
    return {
        "downloads_this_month": downloads_this_month,
        "resources_uploaded": uploads_by_school,
        "storage_used_bytes": storage_used,
        "storage_used_mb": round(storage_used / (1024 * 1024), 2)
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