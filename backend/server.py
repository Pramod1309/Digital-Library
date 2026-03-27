from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from dotenv import load_dotenv
import os
from starlette.middleware.cors import CORSMiddleware
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
import fitz  # PyMuPDF for PDF processing
from io import BytesIO, StringIO
import tempfile
import io
import zipfile
import json
import asyncio


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
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

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
    logo_opacity: float = 0.7
    school_name_x: int = 50
    school_name_y: int = 20
    school_name_size: int = 16
    school_name_opacity: float = 0.9
    contact_x: int = 50
    contact_y: int = 90
    contact_size: int = 12
    contact_opacity: float = 0.8

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

# Helper functions for watermarking
def get_full_file_path(file_path: str) -> str:
    """Get full file path from relative path"""
    if file_path.startswith('/'):
        file_path = file_path[1:]
    
    full_path = os.path.join(ROOT_DIR, file_path)
    
    if not os.path.exists(full_path):
        # Try alternative paths
        alternative_paths = [
            file_path,
            os.path.join("uploads", file_path),
            os.path.join("uploads", file_path.lstrip('/')),
            os.path.join(ROOT_DIR, "uploads", file_path)
        ]
        
        for alt_path in alternative_paths:
            test_path = os.path.join(ROOT_DIR, alt_path) if not os.path.isabs(alt_path) else alt_path
            if os.path.exists(test_path):
                return test_path
        
        raise FileNotFoundError(f"File not found: {file_path}")
    
    return full_path

def get_school_logo_path(school: School) -> str:
    """Get school logo path"""
    if school.logo_path:
        logo_path = school.logo_path
        if logo_path.startswith('/'):
            logo_path = logo_path[1:]
        
        full_path = os.path.join(ROOT_DIR, logo_path)
        if os.path.exists(full_path):
            return full_path
    
    return None

def add_watermark_to_pdf(pdf_path: str, school: School, positions: WatermarkPosition) -> str:
    """Add watermark to PDF with school info"""
    try:
        print(f"Adding watermark to PDF for school: {school.school_name}")
        
        # Open PDF
        pdf_document = fitz.open(pdf_path)
        
        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        output_path = temp_file.name
        
        # Get school logo if available
        logo_path = get_school_logo_path(school)
        
        # Process each page
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            page_width = page.rect.width
            page_height = page.rect.height
            
            # Add logo if available
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
                    
                    # Resize logo
                    logo_width_pixels = int(page_width * (positions.logo_width / 100))
                    aspect_ratio = logo_img.width / logo_img.height
                    logo_height_pixels = int(logo_width_pixels / aspect_ratio)
                    logo_img = logo_img.resize((logo_width_pixels, logo_height_pixels), Image.Resampling.LANCZOS)
                    
                    # Convert to bytes
                    logo_bytes = io.BytesIO()
                    logo_img.save(logo_bytes, format='PNG')
                    logo_bytes.seek(0)
                    
                    # Position logo
                    x_position = page_width * (positions.logo_x / 100)
                    y_position = page_height * (positions.logo_y / 100)
                    
                    rect = fitz.Rect(
                        x_position - (logo_width_pixels / 2),
                        y_position - (logo_height_pixels / 2),
                        x_position + (logo_width_pixels / 2),
                        y_position + (logo_height_pixels / 2)
                    )
                    
                    page.insert_image(rect, stream=logo_bytes.getvalue())
                    print(f"Added logo to page {page_num + 1}")
                except Exception as e:
                    print(f"Error adding logo: {e}")
            
            # Add school name
            school_name_x = page_width * (positions.school_name_x / 100)
            school_name_y = page_height * (positions.school_name_y / 100)
            
            # Draw school name
            try:
                text = f"{school.school_name}"
                rect = fitz.Rect(
                    school_name_x - 200,
                    school_name_y - 20,
                    school_name_x + 200,
                    school_name_y + 20
                )
                
                # Calculate font size based on positions
                font_size = positions.school_name_size * 0.75  # Convert to points
                
                page.insert_textbox(
                    rect,
                    text,
                    fontsize=font_size,
                    color=(0, 0, 0, positions.school_name_opacity),
                    align=1  # Center aligned
                )
                print(f"Added school name to page {page_num + 1}")
            except Exception as e:
                print(f"Error adding school name: {e}")
            
            # Add contact info
            contact_x = page_width * (positions.contact_x / 100)
            contact_y = page_height * (positions.contact_y / 100)
            
            contact_text = f"{school.email}"
            if school.contact_number:
                contact_text += f"\n{school.contact_number}"
            
            try:
                contact_rect = fitz.Rect(
                    contact_x - 200,
                    contact_y - 30,
                    contact_x + 200,
                    contact_y + 30
                )
                
                contact_font_size = positions.contact_size * 0.75  # Convert to points
                
                page.insert_textbox(
                    contact_rect,
                    contact_text,
                    fontsize=contact_font_size,
                    color=(0, 0, 0, positions.contact_opacity),
                    align=1  # Center aligned
                )
                print(f"Added contact info to page {page_num + 1}")
            except Exception as e:
                print(f"Error adding contact info: {e}")
        
        # Save watermarked PDF
        pdf_document.save(output_path)
        pdf_document.close()
        
        print(f"Watermarked PDF saved to: {output_path}")
        return output_path
        
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
            logo_opacity=positions.get('logo_opacity', 0.7),
            school_name_x=positions.get('school_name_x', 50),
            school_name_y=positions.get('school_name_y', 20),
            school_name_size=positions.get('school_name_size', 16),
            school_name_opacity=positions.get('school_name_opacity', 0.9),
            contact_x=positions.get('contact_x', 50),
            contact_y=positions.get('contact_y', 90),
            contact_size=positions.get('contact_size', 12),
            contact_opacity=positions.get('contact_opacity', 0.8)
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
            logo_opacity=positions.get('logo_opacity', 0.7),
            school_name_x=positions.get('school_name_x', 50),
            school_name_y=positions.get('school_name_y', 20),
            school_name_size=positions.get('school_name_size', 16),
            school_name_opacity=positions.get('school_name_opacity', 0.9),
            contact_x=positions.get('contact_x', 50),
            contact_y=positions.get('contact_y', 90),
            contact_size=positions.get('contact_size', 12),
            contact_opacity=positions.get('contact_opacity', 0.8)
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
    
    access_token = create_access_token(
        data={"sub": school.email, "user_type": "school", "school_id": school.school_id, "school_name": school.school_name, "logo_path": school.logo_path}
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_type="school",
        email=school.email,
        name=school.school_name,
        school_id=school.school_id,
        logo_path=school.logo_path
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
async def get_schools(db: Session = Depends(get_db)):
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

@api_router.post("/admin/resources/upload", response_model=ResourceResponse)
async def upload_resource(
    name: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    class_level: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Admin upload resource"""
    # Validate file size (100MB limit)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes
    
    # Read file to check size
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds 100MB limit. Your file is {file_size / (1024*1024):.2f}MB"
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
    
    # Create resource record
    new_resource = Resource(
        resource_id=resource_id,
        name=name,
        description=description,
        category=category,
        file_path=file_path,
        file_type=file.content_type or f"application/{file_extension}",
        file_size=file_size,
        class_level=class_level,
        tags=tags,
        uploaded_by_type='admin',
        approval_status='approved'
    )
    
    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)
    
    return new_resource

@api_router.get("/admin/resources", response_model=List[ResourceResponse])
async def get_all_resources(
    category: Optional[str] = None,
    approval_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all resources - Admin only"""
    query = db.query(Resource)
    
    if category:
        query = query.filter(Resource.category == category)
    
    if approval_status:
        query = query.filter(Resource.approval_status == approval_status)
    
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

# School Resource Routes
@api_router.get("/school/resources", response_model=List[ResourceResponse])
async def get_school_resources(
    category: Optional[str] = None,
    school_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get resources visible to schools (approved admin resources + own uploads)"""
    query = db.query(Resource).filter(
        (Resource.uploaded_by_type == 'admin') | 
        (Resource.uploaded_by_id == school_id)
    )
    
    if category:
        query = query.filter(Resource.category == category)
    
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
        tags=tags,
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
        
        # Return the file for download
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
    ticket: SupportTicketCreate,
    school_id: str,
    school_name: str,
    db: Session = Depends(get_db)
):
    """Create support ticket - School"""
    ticket_id = f"TICKET-{uuid.uuid4().hex[:8].upper()}"
    
    new_ticket = SupportTicket(
        ticket_id=ticket_id,
        school_id=school_id,
        school_name=school_name,
        subject=ticket.subject,
        message=ticket.message,
        category=ticket.category,
        priority=ticket.priority
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
    ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if status:
        ticket.status = status
        if status == 'resolved':
            ticket.resolved_at = datetime.utcnow()
    
    if admin_response:
        ticket.admin_response = admin_response
    
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    
    return ticket

# ==================== CHAT ROUTES ====================

@api_router.post("/chat/send", response_model=ChatMessageResponse)
async def send_chat_message(
    school_id: str = Form(...),
    school_name: str = Form(...),
    sender_type: str = Form(...),
    message: str = Form(...),
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
async def get_chat_messages(school_id: str, db: Session = Depends(get_db)):
    """Get chat messages for a school"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.school_id == school_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    return messages

@api_router.put("/chat/mark-read/{school_id}")
async def mark_messages_read(school_id: str, sender_type: str, db: Session = Depends(get_db)):
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
    
    print(f"Saving logo position for school: {school_id}, resource: {resource_id}")
    print(f"Position: x={x_position}, y={y_position}, width={width}, opacity={opacity}")
    
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
            opacity=opacity
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
            "is_default": True
        }
    
    print(f"Found saved position: x={position.x_position}, y={position.y_position}")
    return {
        "x_position": position.x_position,
        "y_position": position.y_position,
        "width": position.width,
        "opacity": position.opacity,
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
    contact_x: int = Form(...),
    contact_y: int = Form(...),
    contact_size: int = Form(...),
    contact_opacity: float = Form(...),
    db: Session = Depends(get_db)
):
    """Save or update text watermark position"""
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
    if not (8 <= name_size <= 40):
        raise HTTPException(status_code=400, detail="Name size must be between 8 and 40")
    if not (8 <= contact_size <= 20):
        raise HTTPException(status_code=400, detail="Contact size must be between 8 and 20")
    if not (0.1 <= name_opacity <= 1.0) or not (0.1 <= contact_opacity <= 1.0):
        raise HTTPException(status_code=400, detail="Opacity must be between 0.1 and 1.0")
    
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
        existing.contact_x = contact_x
        existing.contact_y = contact_y
        existing.contact_size = contact_size
        existing.contact_opacity = contact_opacity
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
            contact_x=contact_x,
            contact_y=contact_y,
            contact_size=contact_size,
            contact_opacity=contact_opacity
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
            "contact_x": 50,
            "contact_y": 90,  # Bottom center
            "contact_size": 12,
            "contact_opacity": 0.7,
            "is_default": True
        }
    
    return {
        "name_x": text_position.name_x,
        "name_y": text_position.name_y,
        "name_size": text_position.name_size,
        "name_opacity": text_position.name_opacity,
        "contact_x": text_position.contact_x,
        "contact_y": text_position.contact_y,
        "contact_size": text_position.contact_size,
        "contact_opacity": text_position.contact_opacity,
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

def add_logo_and_text_to_pdf(pdf_path, logo_path, logo_position, school_info, text_position, output_path):
    """Add logo and text to PDF"""
    try:
        print(f"=== ADDING LOGO AND TEXT TO PDF ===")
        print(f"PDF: {pdf_path}")
        if logo_path:
            print(f"Logo: {logo_path}")
        print(f"Logo Position: x={logo_position.x_position}%, y={logo_position.y_position}%")
        print(f"School Info: {school_info}")
        print(f"Text Position: {text_position}")
        
        pdf_document = fitz.open(pdf_path)
        
        # Open logo image if exists
        logo_img = None
        if logo_path and os.path.exists(logo_path):
            logo_img = Image.open(logo_path)
            print(f"Original logo size: {logo_img.size}")
            
            # Convert logo to RGBA if needed
            if logo_img.mode != 'RGBA':
                logo_img = logo_img.convert('RGBA')
            
            # Apply opacity
            if logo_position.opacity < 1.0:
                alpha = logo_img.split()[3]
                alpha = alpha.point(lambda p: p * logo_position.opacity)
                logo_img.putalpha(alpha)
                print(f"Applied opacity: {logo_position.opacity}")
        
        # Get first page for dimensions
        first_page = pdf_document[0]
        page_width = first_page.rect.width
        page_height = first_page.rect.height
        print(f"Page dimensions: {page_width}x{page_height}")
        
        # Add logo if exists
        if logo_img:
            # Calculate logo size
            logo_width_pixels = int(page_width * (logo_position.width / 100))
            aspect_ratio = logo_img.width / logo_img.height
            logo_height_pixels = int(logo_width_pixels / aspect_ratio)
            
            print(f"Resized logo: {logo_width_pixels}x{logo_height_pixels}")
            
            # Resize logo
            logo_img = logo_img.resize((logo_width_pixels, logo_height_pixels), Image.Resampling.LANCZOS)
            
            # Convert to bytes
            logo_bytes = io.BytesIO()
            logo_img.save(logo_bytes, format='PNG')
            logo_bytes.seek(0)
            
            # Add logo to each page
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                x_position = page.rect.width * (logo_position.x_position / 100)
                y_position = page.rect.height * (logo_position.y_position / 100)
                
                print(f"Page {page_num+1}: Logo at ({x_position}, {y_position})")
                
                rect = fitz.Rect(
                    x_position - (logo_width_pixels / 2),
                    y_position - (logo_height_pixels / 2),
                    x_position + (logo_width_pixels / 2),
                    y_position + (logo_height_pixels / 2)
                )
                
                page.insert_image(rect, stream=logo_bytes.getvalue())
        
        # Add text watermarks if school info exists
        if school_info and text_position:
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                
                # School name
                if school_info.get('school_name'):
                    name_x = page.rect.width * (text_position['name_x'] / 100)
                    name_y = page.rect.height * (text_position['name_y'] / 100)
                    
                    page.insert_text(
                        fitz.Point(name_x, name_y),
                        school_info['school_name'],
                        fontsize=text_position['name_size'],
                        color=(0, 0, 0, text_position['name_opacity']),
                        align=1  # Center align
                    )
                    print(f"Page {page_num+1}: School name at ({name_x}, {name_y})")
                
                # Contact info
                contact_text = ""
                if school_info.get('email'):
                    contact_text += f"✉ {school_info['email']}"
                if school_info.get('contact_number'):
                    if contact_text:
                        contact_text += "   |   "
                    contact_text += f"📞 {school_info['contact_number']}"
                
                if contact_text:
                    contact_x = page.rect.width * (text_position['contact_x'] / 100)
                    contact_y = page.rect.height * (text_position['contact_y'] / 100)
                    
                    page.insert_text(
                        fitz.Point(contact_x, contact_y),
                        contact_text,
                        fontsize=text_position['contact_size'],
                        color=(0, 0, 0, text_position['contact_opacity']),
                        align=1  # Center align
                    )
                    print(f"Page {page_num+1}: Contact info at ({contact_x}, {contact_y})")
        
        # Save watermarked PDF
        pdf_document.save(output_path)
        pdf_document.close()
        
        print(f"Saved watermarked PDF to: {output_path}")
        print(f"File exists: {os.path.exists(output_path)}")
        print(f"File size: {os.path.getsize(output_path)} bytes")
        
        return output_path
        
    except Exception as e:
        print(f"Error adding logo and text to PDF: {str(e)}")
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
        print(f"=== ADDING LOGO AND TEXT TO IMAGE ===")
        print(f"Image: {image_path}")
        print(f"Logo: {logo_path}")
        print(f"School Info: {school_info}")
        print(f"Text Position: {text_position}")
        
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
                
                # Calculate position
                x_position = int(base_width * (positions.logo_x / 100) - (logo_width / 2))
                y_position = int(base_height * (positions.logo_y / 100) - (logo_height / 2))
                
                # Ensure position is within bounds
                x_position = max(0, min(base_width - logo_width, x_position))
                y_position = max(0, min(base_height - logo_height, y_position))
                
                print(f"Logo position: {x_position}, {y_position}")
                
                # Paste logo onto watermark layer
                watermark_layer.paste(logo_img, (x_position, y_position), logo_img)
                
            except Exception as logo_error:
                print(f"Error adding logo: {logo_error}")
        
        # Add text watermarks
        from PIL import ImageDraw, ImageFont
        
        draw = ImageDraw.Draw(watermark_layer)
        
        # Try to load a font
        try:
            # Use default font
            font_name = ImageFont.truetype("arial.ttf", text_position['name_size']) if os.name == 'nt' else ImageFont.load_default()
            font_contact = ImageFont.truetype("arial.ttf", text_position['contact_size']) if os.name == 'nt' else ImageFont.load_default()
        except:
            font_name = ImageFont.load_default()
            font_contact = ImageFont.load_default()
        
        # Add school name
        if school_info.get('school_name'):
            name_x = int(base_img.width * (text_position['name_x'] / 100))
            name_y = int(base_img.height * (text_position['name_y'] / 100))
            
            # Calculate text size for centering
            from PIL import ImageDraw
            temp_draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
            bbox = temp_draw.textbbox((0, 0), school_info['school_name'], font=font_name)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            name_x -= text_width // 2
            name_y -= text_height // 2
            
            # Draw text with opacity
            name_color = (0, 0, 0, int(255 * text_position['name_opacity']))
            draw.text((name_x, name_y), school_info['school_name'], 
                     font=font_name, fill=name_color)
            print(f"School name at ({name_x}, {name_y})")
        
        # Add contact info
        contact_lines = []
        if school_info.get('email'):
            contact_lines.append(f"Email: {school_info['email']}")
        if school_info.get('contact_number'):
            contact_lines.append(f"Phone: {school_info['contact_number']}")
        
        if contact_lines:
            contact_text = "\n".join(contact_lines)
            contact_x = int(base_img.width * (text_position['contact_x'] / 100))
            contact_y = int(base_img.height * (text_position['contact_y'] / 100))
            
            # Calculate text size for centering
            temp_draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
            bbox = temp_draw.multiline_textbbox((0, 0), contact_text, font=font_contact)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            contact_x -= text_width // 2
            contact_y -= text_height // 2
            
            # Draw text with opacity
            contact_color = (0, 0, 0, int(255 * text_position['contact_opacity']))
            draw.multiline_text((contact_x, contact_y), contact_text,
                              font=font_contact, fill=contact_color, align='center')
            print(f"Contact info at ({contact_x}, {contact_y})")
        
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

@api_router.get("/resources/{resource_id}/download-with-logo")
async def download_resource_with_logo(
    resource_id: str,
    school_id: str = None,
    school_name: str = None,
    db: Session = Depends(get_db)
):
    """Download a resource file with school logo and text watermark"""
    try:
        print(f"=== DOWNLOAD WITH LOGO REQUEST ===")
        print(f"Resource ID: {resource_id}")
        print(f"School ID: {school_id}")
        
        # Get the resource from the database
        resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        print(f"Resource: {resource.name}")
        print(f"Category: {resource.category}")
        print(f"File type: {resource.file_type}")
        
        # Get school info
        school = None
        if school_id:
            school = db.query(School).filter(School.school_id == school_id).first()
            if school:
                print(f"School: {school.school_name}")
        
        # Get file path
        file_path = resource.file_path
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_file_path = os.path.join(ROOT_DIR, file_path)
        
        # Try to find the file
        if not os.path.exists(full_file_path):
            # Try alternative paths
            alternative_paths = [
                file_path,
                os.path.join("uploads", file_path),
                os.path.join("uploads", file_path.lstrip('/')),
                os.path.join(ROOT_DIR, "uploads", "resources", resource.category, os.path.basename(file_path))
            ]
            
            for alt_path in alternative_paths:
                test_path = os.path.join(ROOT_DIR, alt_path) if not os.path.isabs(alt_path) else alt_path
                if os.path.exists(test_path):
                    full_file_path = test_path
                    print(f"Found file at: {full_file_path}")
                    break
            else:
                raise HTTPException(status_code=404, detail="File not found on server")
        
        print(f"Final file path: {full_file_path}")
        
        # Check if we should add watermark
        should_add_watermark = False
        watermarked_file = None
        
        if school and school_id and resource_id:
            # Get logo position
            logo_position_db = db.query(SchoolLogoPosition).filter(
                SchoolLogoPosition.school_id == school_id,
                SchoolLogoPosition.resource_id == resource_id
            ).first()
            
            # Get text watermark position
            text_position_db = db.query(SchoolWatermarkText).filter(
                SchoolWatermarkText.school_id == school_id,
                SchoolWatermarkText.resource_id == resource_id
            ).first()
            
            # Prepare positions
            logo_positions = None
            text_positions = None
            
            # Use saved positions or defaults
            if logo_position_db:
                logo_positions = {
                    'x_position': logo_position_db.x_position,
                    'y_position': logo_position_db.y_position,
                    'width': logo_position_db.width,
                    'opacity': logo_position_db.opacity
                }
                should_add_watermark = True
                print(f"Using saved logo position: {logo_positions}")
            else:
                # Default logo position
                logo_positions = {
                    'x_position': 50,
                    'y_position': 10,
                    'width': 20,
                    'opacity': 0.7
                }
                print(f"Using default logo position: {logo_positions}")
            
            if text_position_db:
                text_positions = {
                    'name_x': text_position_db.name_x,
                    'name_y': text_position_db.name_y,
                    'name_size': text_position_db.name_size,
                    'name_opacity': text_position_db.name_opacity,
                    'contact_x': text_position_db.contact_x,
                    'contact_y': text_position_db.contact_y,
                    'contact_size': text_position_db.contact_size,
                    'contact_opacity': text_position_db.contact_opacity
                }
                should_add_watermark = True
                print(f"Using saved text position: {text_positions}")
            else:
                # Default text position
                text_positions = {
                    'name_x': 50,
                    'name_y': 25,
                    'name_size': 20,
                    'name_opacity': 0.8,
                    'contact_x': 50,
                    'contact_y': 90,
                    'contact_size': 12,
                    'contact_opacity': 0.7
                }
                print(f"Using default text position: {text_positions}")
            
            # Get school logo path
            logo_path = None
            if school and school.logo_path:
                logo_path = school.logo_path
                if logo_path.startswith('/'):
                    logo_path = logo_path[1:]
                logo_full_path = os.path.join(ROOT_DIR, logo_path)
                if os.path.exists(logo_full_path):
                    logo_path = logo_full_path
                    print(f"Logo found at: {logo_path}")
                else:
                    print(f"Logo not found at: {logo_full_path}")
                    logo_path = None
            
            # Prepare school info
            school_info = {
                'school_name': school.school_name,
                'email': school.email,
                'contact_number': school.contact_number
            }
            
            # Create WatermarkPosition object
            watermark_positions = WatermarkPosition(
                logo_x=logo_positions['x_position'],
                logo_y=logo_positions['y_position'],
                logo_width=logo_positions['width'],
                logo_opacity=logo_positions['opacity'],
                school_name_x=text_positions['name_x'],
                school_name_y=text_positions['name_y'],
                school_name_size=text_positions['name_size'],
                school_name_opacity=text_positions['name_opacity'],
                contact_x=text_positions['contact_x'],
                contact_y=text_positions['contact_y'],
                contact_size=text_positions['contact_size'],
                contact_opacity=text_positions['contact_opacity']
            )
            
            # Apply watermark based on file type
            if should_add_watermark:
                print(f"Applying watermark to file type: {resource.file_type}")
                
                file_type_lower = resource.file_type.lower() if resource.file_type else ''
                
                # For PDF files
                if 'pdf' in file_type_lower or full_file_path.lower().endswith('.pdf'):
                    print("Applying watermark to PDF")
                    watermarked_file = add_watermark_to_pdf(full_file_path, school, watermark_positions)
                
                # For image files
                elif any(img_type in file_type_lower for img_type in ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'webp']):
                    print("Applying watermark to image")
                    watermarked_file = add_logo_and_text_to_image(
                        full_file_path,
                        logo_path,
                        watermark_positions,
                        resource.file_type,
                        school_info,
                        text_positions,
                        None  # Will create temp file
                    )
                
                else:
                    print(f"File type {resource.file_type} not supported for watermarking, using original")
        
        # Use watermarked file if created successfully
        if watermarked_file and os.path.exists(watermarked_file):
            print(f"Watermarked file created: {watermarked_file}")
            final_file_path = watermarked_file
            filename_suffix = "_branded"
        else:
            print(f"Using original file")
            final_file_path = full_file_path
            filename_suffix = ""
        
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
        
        # Read file content
        with open(final_file_path, 'rb') as f:
            file_content = f.read()
        
        # Clean up temp watermarked file if created
        if watermarked_file and watermarked_file != full_file_path and os.path.exists(watermarked_file):
            try:
                os.remove(watermarked_file)
            except:
                pass
        
        # Determine download filename
        file_extension = os.path.splitext(resource.name)[1]
        if not file_extension:
            if resource.file_type:
                file_extension = "." + resource.file_type.split('/')[-1]
            else:
                file_extension = ".pdf"
        
        download_filename = f"{resource.name.replace(' ', '_')}{filename_suffix}{file_extension}"
        
        print(f"Returning file: {download_filename}, size: {len(file_content)} bytes")
        
        return Response(
            content=file_content,
            media_type=resource.file_type or 'application/octet-stream',
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
                "contact_x": tp.contact_x,
                "contact_y": tp.contact_y,
                "contact_size": tp.contact_size,
                "contact_opacity": tp.contact_opacity
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
    
    return {
        "school_id": school.school_id,
        "school_name": school.school_name,
        "email": school.email,
        "contact_number": school.contact_number,
        "logo_path": school.logo_path
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

# Configure CORS - Allow all origins for deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Serve static files from the uploads directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
