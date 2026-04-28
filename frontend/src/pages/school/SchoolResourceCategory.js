// frontend/src/components/school/SchoolResourceCategory.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Table, Button, Space, Input, Select, Tag, Upload, Modal, Form, Row, Col, message, Badge, Tooltip, Dropdown
} from 'antd';
import {
  SearchOutlined, DownloadOutlined, EyeOutlined,
  FilePdfOutlined, FileImageOutlined, FileWordOutlined, FilePptOutlined,
  FileZipOutlined, FileUnknownOutlined, FileExcelOutlined, VideoCameraOutlined,
  LoadingOutlined, UploadOutlined, ClockCircleOutlined,
  EditOutlined, SaveOutlined, UndoOutlined, ExpandOutlined,
  MinusOutlined, PlusOutlined, EyeInvisibleOutlined,
  UnorderedListOutlined, MailOutlined, PhoneOutlined, UserOutlined, DownOutlined,
  RotateLeftOutlined, RotateRightOutlined, AppstoreOutlined
} from '@ant-design/icons';
import api from '../../api/axiosConfig';
import config from '../../config';
import { trackSchoolActivity, trackSchoolSearch } from '../../utils/schoolAnalytics';

const BACKEND_URL = config.apiBaseUrl;
const API = `${BACKEND_URL}/api`;
const VIDEO_LINK_DOMAINS = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'bilibili.com'];
const VIDEO_FILE_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];

// Update this helper function at the top of your file:
const getStaticFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Remove any leading slashes
  let cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // For uploaded files, they should be served through /api/uploads
  if (cleanPath.startsWith('uploads/')) {
    return `${BACKEND_URL}/${cleanPath}`;
  }
  
  // For other files, use /api/uploads
  return `${BACKEND_URL}/uploads/${cleanPath}`;
};

const isKnownVideoLink = (filePath = '') => {
  if (!filePath) return false;

  const normalizedPath = filePath.toLowerCase();
  return VIDEO_LINK_DOMAINS.some((domain) => normalizedPath.includes(domain));
};

const isVideoLinkResource = (resource) => {
  if (!resource) return false;
  return resource.is_video_link === true || resource.is_video_link === 'true' || isKnownVideoLink(resource.file_path);
};

const getVideoLinkMeta = (videoUrl = '') => {
  const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);

  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      platformName: 'YouTube',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`
    };
  }

  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      platformName: 'Vimeo',
      thumbnailUrl: '',
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=0&byline=0&portrait=0&title=0`
    };
  }

  if (videoUrl.toLowerCase().includes('dailymotion.com')) {
    return { platformName: 'Dailymotion', thumbnailUrl: '', embedUrl: '' };
  }

  if (videoUrl.toLowerCase().includes('bilibili.com')) {
    return { platformName: 'Bilibili', thumbnailUrl: '', embedUrl: '' };
  }

  return { platformName: 'Video Link', thumbnailUrl: '', embedUrl: '' };
};

const VideoThumbnail = ({ videoUrl, resource, fileType }) => {
  const [thumbnailSrc, setThumbnailSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) {
      setThumbnailSrc('');
      setIsLoading(false);
      setShowFallback(true);
      return undefined;
    }

    let isCancelled = false;

    setThumbnailSrc('');
    setIsLoading(true);
    setShowFallback(false);

    const markFallback = () => {
      if (isCancelled) return;
      setThumbnailSrc('');
      setIsLoading(false);
      setShowFallback(true);
    };

    const captureFrame = () => {
      if (isCancelled) return;

      try {
        if (!video.videoWidth || !video.videoHeight) {
          markFallback();
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          markFallback();
          return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnailSrc(canvas.toDataURL('image/jpeg', 0.82));
        setIsLoading(false);
        setShowFallback(false);
      } catch (error) {
        console.error('Video thumbnail capture failed:', error);
        markFallback();
      }
    };

    const seekToPreviewFrame = () => {
      if (isCancelled) return;

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime = duration > 0.25 ? Math.max(0.1, Math.min(1, duration - 0.1)) : 0;

      if (targetTime === 0) {
        captureFrame();
        return;
      }

      try {
        if (Math.abs(video.currentTime - targetTime) < 0.05) {
          captureFrame();
        } else {
          video.currentTime = targetTime;
        }
      } catch (error) {
        console.error('Video thumbnail seek failed:', error);
        captureFrame();
      }
    };

    const handleLoadedMetadata = () => {
      if (video.readyState >= 2) {
        seekToPreviewFrame();
      }
    };

    const handleLoadedData = () => {
      seekToPreviewFrame();
    };

    const handleSeeked = () => {
      captureFrame();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', markFallback);

    video.load();

    return () => {
      isCancelled = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', markFallback);
    };
  }, [videoUrl]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '150px',
      background: 'linear-gradient(135deg, #031b34 0%, #123f75 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt={resource.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}

      <video
        ref={videoRef}
        muted
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none'
        }}
      >
        <source src={videoUrl} type={fileType || 'video/mp4'} />
      </video>

      {!thumbnailSrc && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: showFallback ? 'linear-gradient(135deg, #0b63b5 0%, #1890ff 100%)' : 'transparent'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.55)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isLoading ? (
              <LoadingOutlined style={{ fontSize: '20px', color: 'white' }} />
            ) : (
              <VideoCameraOutlined style={{ fontSize: '22px', color: 'white' }} />
            )}
          </div>
        </div>
      )}

      {thumbnailSrc && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <VideoCameraOutlined style={{ fontSize: '22px', color: 'white' }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 'bold',
        zIndex: 2
      }}>
        Video
      </div>
    </div>
  );
};

const { Option } = Select;
const { TextArea } = Input;

// Import category configuration (same as admin component)
const CATEGORY_CONFIG = {
  'all': {
    title: 'All Resources',
    description: 'Browse every approved resource available to your school',
    subcategories: {}
  },
  'academic': {
    title: 'Academic Resources',
    description: 'Manage curriculum, worksheets, and other teaching materials',
    subcategories: {
      'all': 'All Academic',
      'activity-sheet': 'Activity Sheet',
      'assessment': 'Assessment',
      'curriculum': 'Curriculum',
      'manual-guidelines': 'Manual & Guidelines',
      'study-material': 'Study Material',
      'syllabus': 'Syllabus',
      'teaching-aid': 'Teaching Aid',
      'worksheet': 'Worksheet'
    }
  },
  'marketing': {
    title: 'Marketing Materials',
    description: 'Manage brochures, banners, and promotional content',
    subcategories: {
      'advertisement': 'Advertisement',
      'all': 'All Marketing',
      'banner': 'Banner',
      'brochure': 'Brochure',
      'email-template': 'Email Template',
      'flyer': 'Flyer',
      'presentation': 'Presentation',
      'promotional-video': 'Promotional Video',
      'social-media': 'Social Media Post'
    }
  },
  'administrative': {
    title: 'Administrative Resources',
    description: 'Manage forms, templates, and policy documents',
    subcategories: {
      'agreement': 'Agreement',
      'all': 'All Administrative',
      'certificate': 'Certificate',
      'form': 'Form',
      'guideline': 'Guideline',
      'letter': 'Official Letter',
      'policy': 'Policy Document',
      'report': 'Report',
      'template': 'Template'
    }
  },
  'training': {
    title: 'Training Resources',
    description: 'Manage teacher training materials and guides',
    subcategories: {
      'all': 'All Training',
      'certification': 'Certification Program',
      'handbook': 'Handbook',
      'manual': 'Training Manual',
      'online-course': 'Online Course',
      'orientation': 'Orientation Material',
      'skill-development': 'Skill Development',
      'teacher-training': 'Teacher Training',
      'workshop': 'Workshop Material'
    }
  },
  'event': {
    title: 'Event & Celebration',
    description: 'Manage event plans and celebration materials',
    subcategories: {
      'all': 'All Events',
      'annual-day': 'Annual Day',
      'celebration': 'Celebration Material',
      'competition': 'Competition',
      'cultural-event': 'Cultural Event',
      'festival': 'Festival Celebration',
      'graduation': 'Graduation Ceremony',
      'parents-meeting': 'Parents Meeting',
      'sports-day': 'Sports Day'
    }
  },
  'multimedia': {
    title: 'Multimedia Collection',
    description: 'Manage videos, audio, and interactive content',
    subcategories: {
      'all': 'All Multimedia',
      'animation': 'Animation',
      'audio': 'Audio',
      'graphic': 'Graphic',
      'interactive': 'Interactive Content',
      'photograph': 'Photograph',
      'podcast': 'Podcast',
      'video': 'Video',
      'virtual-tour': 'Virtual Tour'
    }
  }
};

// Class options - Only Playgroup, Nursery, LKG, UKG
const classOptions = [
  { value: 'all', label: 'All Classes' },
  { value: 'playgroup', label: 'Playgroup' },
  { value: 'nursery', label: 'Nursery' },
  { value: 'lkg', label: 'LKG' },
  { value: 'ukg', label: 'UKG' }
];

// Subject options
const subjectOptions = [
  { value: 'all', label: 'All Subjects' },
  { value: 'english', label: 'English' },
  { value: 'maths', label: 'Maths' },
  { value: 'evs', label: 'EVS' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'arts', label: 'Arts & Crafts' },
  { value: 'music', label: 'Music' },
  { value: 'pe', label: 'Physical Education' }
];

const CLASS_LABELS = {
  all: 'All Classes',
  playgroup: 'Playgroup',
  nursery: 'Nursery',
  lkg: 'LKG',
  ukg: 'UKG'
};

const SUBJECT_LABELS = {
  all: 'All Subjects',
  english: 'English',
  maths: 'Maths',
  evs: 'EVS',
  hindi: 'Hindi',
  arts: 'Arts & Crafts',
  music: 'Music',
  pe: 'Physical Education'
};

const normalizeToken = (value) => (
  (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
);

const CLASS_ALIASES = {
  all: 'all',
  playgroup: 'playgroup',
  'play group': 'playgroup',
  nursery: 'nursery',
  lkg: 'lkg',
  ukg: 'ukg'
};

const SUBJECT_ALIASES = Object.entries(SUBJECT_LABELS).reduce((aliases, [key, label]) => {
  aliases[normalizeToken(key)] = key;
  aliases[normalizeToken(label)] = key;
  return aliases;
}, {});

const SUB_CATEGORY_ALIASES = Object.values(CATEGORY_CONFIG).reduce((aliases, categoryData) => {
  Object.entries(categoryData.subcategories || {}).forEach(([key, label]) => {
    const normalizedKey = normalizeToken(key);
    const normalizedLabel = normalizeToken(label);

    aliases[normalizedKey] = key;
    aliases[normalizedLabel] = key;

    if (key !== 'all') {
      aliases[`${normalizedKey}s`] = key;
      aliases[`${normalizedLabel}s`] = key;
    }
  });

  return aliases;
}, {});

const normalizeClassValue = (value) => {
  const normalizedValue = normalizeToken(value);
  return CLASS_ALIASES[normalizedValue] || normalizedValue.replace(/\s+/g, '');
};

const normalizeSubjectValue = (value) => {
  const normalizedValue = normalizeToken(value);
  return SUBJECT_ALIASES[normalizedValue] || normalizedValue;
};

const normalizeSubCategoryValue = (value) => {
  const normalizedValue = normalizeToken(value);
  return SUB_CATEGORY_ALIASES[normalizedValue] || normalizedValue.replace(/\s+/g, '-');
};

const normalizeStatusValue = (value) => normalizeToken(value);

const getClassLabel = (value) => CLASS_LABELS[normalizeClassValue(value)] || value || CLASS_LABELS.all;

const getSubjectLabel = (value) => SUBJECT_LABELS[normalizeSubjectValue(value)] || value || SUBJECT_LABELS.all;

const getSubCategoryLabel = (value, category) => {
  if (!value) return '-';

  const normalizedValue = normalizeSubCategoryValue(value);

  if (category && CATEGORY_CONFIG[category]?.subcategories?.[normalizedValue]) {
    return CATEGORY_CONFIG[category].subcategories[normalizedValue];
  }

  const matchingCategory = Object.values(CATEGORY_CONFIG).find(
    (categoryData) => categoryData.subcategories?.[normalizedValue]
  );

  return matchingCategory?.subcategories?.[normalizedValue] || value;
};

// TextOverlay Component - Renders text on document (no controls here)
const TextOverlay = ({ 
  schoolInfo, 
  textPosition, 
  isEditingText, 
  isDraggingText,
  onStartTextDrag,
  containerRef,
  textElements,
  address
}) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef?.current) return;

    const updateScale = () => {
      const width = containerRef.current.getBoundingClientRect().width || 800;
      setScale(width / 800);
    };

    updateScale();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [containerRef?.current]);

  if (!schoolInfo.school_name && !schoolInfo.email && !schoolInfo.contact_number && !address) {
    return null;
  }

  const getFontStyles = (styleValue) => {
    const normalized = (styleValue || '').toLowerCase();
    return {
      fontStyle: normalized.includes('italic') ? 'italic' : 'normal',
      fontWeight: normalized.includes('bold') ? 700 : 400
    };
  };

  const nameFontSize = Math.max(6, Math.round(textPosition.name_size * scale));
  const contactFontSize = Math.max(6, Math.round(textPosition.contact_size * scale));
  const addressFontSize = Math.max(6, Math.round(textPosition.address_size * scale));

  // School name text
  const nameStyle = {
    position: 'absolute',
    left: `${textPosition.name_x}%`,
    top: `${textPosition.name_y}%`,
    transform: `translate(-50%, -50%) rotate(${textPosition.name_rotation}deg)`,
    fontSize: `${nameFontSize}px`,
    color: textPosition.name_color,
    opacity: textPosition.name_opacity,
    fontFamily: textPosition.name_font,
    ...getFontStyles(textPosition.name_style),
    pointerEvents: isEditingText ? 'auto' : 'none',
    zIndex: 5,
    cursor: isEditingText ? 'move' : 'default',
    textAlign: 'center',
    backgroundColor: isEditingText ? 'rgba(255, 255, 200, 0.8)' : 'transparent',
    padding: isEditingText ? '4px 8px' : '0',
    borderRadius: '4px',
    border: isEditingText ? '2px dashed #1890ff' : 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
  };

  // Contact info text
  const contactStyle = {
    position: 'absolute',
    left: `${textPosition.contact_x}%`,
    top: `${textPosition.contact_y}%`,
    transform: `translate(-50%, -50%) rotate(${textPosition.contact_rotation}deg)`,
    fontSize: `${contactFontSize}px`,
    color: textPosition.contact_color,
    opacity: textPosition.contact_opacity,
    fontFamily: textPosition.contact_font,
    ...getFontStyles(textPosition.contact_style),
    pointerEvents: isEditingText ? 'auto' : 'none',
    zIndex: 5,
    cursor: isEditingText ? 'move' : 'default',
    textAlign: 'center',
    backgroundColor: isEditingText ? 'rgba(255, 255, 200, 0.8)' : 'transparent',
    padding: isEditingText ? '4px 8px' : '0',
    borderRadius: '4px',
    border: isEditingText ? '2px dashed #1890ff' : 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
  };
  
  // Address text
  const addressStyle = {
    position: 'absolute',
    left: `${textPosition.address_x}%`,
    top: `${textPosition.address_y}%`,
    transform: `translate(-50%, -50%) rotate(${textPosition.address_rotation}deg)`,
    fontSize: `${addressFontSize}px`,
    color: textPosition.address_color,
    opacity: textPosition.address_opacity,
    fontFamily: textPosition.address_font,
    ...getFontStyles(textPosition.address_style),
    pointerEvents: isEditingText ? 'auto' : 'none',
    zIndex: 5,
    cursor: isEditingText ? 'move' : 'default',
    textAlign: 'center',
    backgroundColor: isEditingText ? 'rgba(255, 255, 200, 0.8)' : 'transparent',
    padding: isEditingText ? '4px 8px' : '0',
    borderRadius: '4px',
    border: isEditingText ? '2px dashed #1890ff' : 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
  };

  return (
    <>
      {schoolInfo.school_name && textElements.showName && (
        <div
          style={nameStyle}
          onMouseDown={(e) => {
            if (isEditingText) {
              onStartTextDrag(e, 'name', containerRef?.current);
            }
          }}
        >
          {schoolInfo.school_name}
        </div>
      )}
      
      {(schoolInfo.email || schoolInfo.contact_number) && textElements.showContact && (
        <div
          style={contactStyle}
          onMouseDown={(e) => {
            if (isEditingText) {
              onStartTextDrag(e, 'contact', containerRef?.current);
            }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            {schoolInfo.email && <span>Email: {schoolInfo.email}</span>}
            {schoolInfo.contact_number && <span>Phone: {schoolInfo.contact_number}</span>}
          </div>
        </div>
      )}
      
      {address && textElements.showAddress && (
        <div
          style={addressStyle}
          onMouseDown={(e) => {
            if (isEditingText) {
              onStartTextDrag(e, 'address', containerRef?.current);
            }
          }}
        >
          {address}
        </div>
      )}
    </>
  );
};

// LogoOverlay Component - Renders logo on document (no controls here)
const LogoOverlay = ({ 
  logoUrl, 
  logoPosition, 
  isEditingLogo, 
  onStartLogoDrag,
  containerRef,
  showLogo
}) => {
  const [logoError, setLogoError] = useState(false);
  
  // Reset error state when URL changes
  useEffect(() => {
    if (logoUrl) {
      setLogoError(false);
    }
  }, [logoUrl]);

  // If no logo URL or logo is hidden, show a placeholder when editing
  if (!logoUrl || !showLogo) {
    if (!isEditingLogo) return null;
    
    return (
      <div
        style={{
          position: 'absolute',
          left: `${logoPosition.x}%`,
          top: `${logoPosition.y}%`,
          width: `${logoPosition.width}%`,
          minWidth: '60px',
          height: '40px',
          opacity: logoPosition.opacity,
          transform: 'translate(-50%, -50%)',
          pointerEvents: isEditingLogo ? 'auto' : 'none',
          zIndex: 10,
          cursor: isEditingLogo ? 'move' : 'default',
          userSelect: 'none',
          border: '2px dashed #ff4d4f',
          borderRadius: '4px',
          backgroundColor: 'rgba(255, 77, 79, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#ff4d4f',
          textAlign: 'center',
          padding: '4px'
        }}
        onMouseDown={(e) => {
          if (isEditingLogo) {
            onStartLogoDrag(e, containerRef?.current);
          }
        }}
      >
        {!showLogo ? 'Logo Hidden' : 'No Logo'}
      </div>
    );
  }

  // If logo failed to load, show error placeholder
  if (logoError) {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${logoPosition.x}%`,
          top: `${logoPosition.y}%`,
          width: `${logoPosition.width}%`,
          minWidth: '60px',
          height: '40px',
          opacity: logoPosition.opacity,
          transform: 'translate(-50%, -50%)',
          pointerEvents: isEditingLogo ? 'auto' : 'none',
          zIndex: 10,
          cursor: isEditingLogo ? 'move' : 'default',
          userSelect: 'none',
          border: '2px dashed #faad14',
          borderRadius: '4px',
          backgroundColor: 'rgba(250, 173, 20, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#faad14',
          textAlign: 'center',
          padding: '4px'
        }}
        onMouseDown={(e) => {
          if (isEditingLogo) {
            onStartLogoDrag(e, containerRef?.current);
          }
        }}
      >
        Logo Error
      </div>
    );
  }

  const logoStyle = {
    position: 'absolute',
    left: `${logoPosition.x}%`,
    top: `${logoPosition.y}%`,
    width: `${logoPosition.width}%`,
    height: 'auto',
    opacity: logoPosition.opacity,
    transform: `translate(-50%, -50%) rotate(${logoPosition.rotation}deg)`,
    pointerEvents: isEditingLogo ? 'auto' : 'none',
    zIndex: 10,
    cursor: isEditingLogo ? 'move' : 'default',
    objectFit: 'contain',
    userSelect: 'none',
    border: isEditingLogo ? '2px dashed #1890ff' : 'none',
    borderRadius: '4px',
    backgroundColor: isEditingLogo ? 'rgba(255,255,255,0.3)' : 'transparent'
  };

  return (
    <img
      src={logoUrl}
      alt="School Logo"
      style={logoStyle}
      draggable={false}
      onError={() => {
        console.error('Logo failed to load:', logoUrl);
        setLogoError(true);
      }}
      onMouseDown={(e) => {
        if (isEditingLogo) {
          onStartLogoDrag(e, containerRef?.current);
        }
      }}
    />
  );
};

const SchoolResourceCategory = ({ user }) => {
  const { category: urlCategory, subcategory: urlSubCategory } = useParams();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewResource, setPreviewResource] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [categoryFilter, setCategoryFilter] = useState(urlCategory || 'academic');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  
  // Logo positioning states
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 10, width: 20, opacity: 1.0, rotation: 0 });
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [showLogo, setShowLogo] = useState(true);
  const [showLogoControls, setShowLogoControls] = useState(true);
  const [positionLoading, setPositionLoading] = useState(false);
  const [isDefaultPosition, setIsDefaultPosition] = useState(true);
  const [pdfPages, setPdfPages] = useState([]);
  const [pdfPagesLoading, setPdfPagesLoading] = useState(false);
  
  // Text watermark states
  const [textPosition, setTextPosition] = useState({
    name_x: 50, name_y: 25, name_size: 20, name_opacity: 1.0, name_rotation: 0,
    contact_x: 50, contact_y: 90, contact_size: 12, contact_opacity: 1.0, contact_rotation: 0,
    address_x: 50, address_y: 85, address_size: 10, address_opacity: 1.0, address_rotation: 0,
    name_font: 'Arial', name_style: 'normal', name_color: '#000000',
    contact_font: 'Arial', contact_style: 'normal', contact_color: '#000000',
    address_font: 'Arial', address_style: 'normal', address_color: '#000000'
  });
  const [isEditingText, setIsEditingText] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(null);
  const [isDefaultText, setIsDefaultText] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState({});
  
  // Text element visibility states
  const [textElements, setTextElements] = useState({
    showName: true,
    showContact: true,
    showAddress: false
  });
  
  // Address state
  const [address, setAddress] = useState('');

  const videoRefs = useRef({});
  const imageContainerRef = useRef(null);
  const pdfPageRefs = useRef([]);
  const dragStateRef = useRef({ type: null, element: null, container: null });
  const lastSearchSignatureRef = useRef('');
  
  // Set logo URL immediately from user prop
  useEffect(() => {
  if (user?.logo_path) {
    const fullLogoUrl = getStaticFileUrl(user.logo_path);
    console.log('Initial logoUrl set from user.logo_path:', fullLogoUrl);
    setLogoUrl(fullLogoUrl);
  }
}, [user?.logo_path]);
  
  // Unified drag handlers (supports multi-page PDF preview)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingLogo) {
        handleLogoDrag(e, dragStateRef.current.container);
      } else if (isDraggingText) {
        handleTextDrag(e, dragStateRef.current.container, dragStateRef.current.element);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLogo || isDraggingText) {
        setIsDraggingLogo(false);
        setIsDraggingText(null);
        dragStateRef.current = { type: null, element: null, container: null };
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLogo, isDraggingText]);
  
  // Update categoryFilter and subCategoryFilter when URL params change
  useEffect(() => {
    setCategoryFilter(urlCategory || 'all');
    setSubCategoryFilter(urlSubCategory || 'all');
  }, [urlCategory, urlSubCategory]);
  
  useEffect(() => {
    fetchResources();
  }, [categoryFilter, user.school_id]);

  useEffect(() => {
    fetchSchoolInfo();
  }, [user.school_id]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = { school_id: user.school_id };
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      
      const response = await api.get('/school/resources', { params });
      
      const formattedResources = response.data.map((resource, index) => {
        let file_path = resource.file_path;
        
        if (file_path) {
          file_path = getStaticFileUrl(file_path);
        }
        
        const isOwnUpload = resource.uploaded_by_id === user.school_id;
        
        return {
          ...resource,
          key: resource.resource_id || resource.id || `resource-${index}`,
          file_path: file_path,
          is_own_upload: isOwnUpload,
          display_status: isOwnUpload ? resource.approval_status : 'approved',
          sub_category: resource.sub_category || resource.tags || '',
          normalized_class_level: normalizeClassValue(resource.class_level),
          normalized_subject: normalizeSubjectValue(resource.subject),
          normalized_sub_category: normalizeSubCategoryValue(resource.sub_category || resource.tags || ''),
          normalized_status: normalizeStatusValue(isOwnUpload ? resource.approval_status : 'approved'),
          school_download_count: resource.school_download_count || 0
        };
      });
      
      // Sort resources to ensure numbered files appear in ascending order
      const sortedResources = formattedResources.sort((a, b) => {
        // Extract base name and number from file names
        const extractNumber = (name) => {
          const match = name.match(/(.*?)(\d+)(\.[^.]+)?$/);
          if (match) {
            const [, base, num, ext] = match;
            return { base, number: parseInt(num, 10), ext: ext || '' };
          }
          return { base: name, number: null, ext: '' };
        };
        
        const aInfo = extractNumber(a.name || '');
        const bInfo = extractNumber(b.name || '');
        
        // If both have numbers, sort by base name first, then by number
        if (aInfo.number !== null && bInfo.number !== null) {
          if (aInfo.base !== bInfo.base) {
            return aInfo.base.localeCompare(bInfo.base);
          }
          return aInfo.number - bInfo.number;
        }
        
        // If only one has a number, the one with number comes last
        if (aInfo.number !== null) return 1;
        if (bInfo.number !== null) return -1;
        
        // If neither has numbers, sort alphabetically
        return (a.name || '').localeCompare(b.name || '');
      });
      
      setResources(sortedResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
      message.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolInfo = async () => {
  try {
    const response = await api.get(`/school/info/${user.school_id}`);
    const schoolData = response.data;
    setSchoolInfo({
      school_name: schoolData.school_name,
      email: schoolData.email,
      contact_number: schoolData.contact_number,
      logo_path: schoolData.logo_path
    });
    
    // CRITICAL FIX: Set logo URL correctly using getStaticFileUrl
    if (schoolData.logo_path) {
      const fullLogoUrl = getStaticFileUrl(schoolData.logo_path);
      console.log('Setting logo URL from school info:', fullLogoUrl);
      setLogoUrl(fullLogoUrl);
    } else if (user.logo_path) {
      const fullLogoUrl = getStaticFileUrl(user.logo_path);
      console.log('Setting logo URL from user:', fullLogoUrl);
      setLogoUrl(fullLogoUrl);
    }
  } catch (error) {
    console.error('Error fetching school info:', error);
    setSchoolInfo({
      school_name: user.name,
      email: user.email,
      contact_number: null,
      logo_path: user.logo_path
    });
    
    // Try to use user logo as fallback
    if (user.logo_path) {
      const fullLogoUrl = getStaticFileUrl(user.logo_path);
      setLogoUrl(fullLogoUrl);
    }
  }
};

  const handleCategoryChange = (nextCategory) => {
    setCategoryFilter(nextCategory);
    setSubCategoryFilter('all');
  };

  const categoryMenuItems = [
    { key: 'academic', label: CATEGORY_CONFIG.academic.title, onClick: () => handleCategoryChange('academic') },
    { key: 'marketing', label: CATEGORY_CONFIG.marketing.title, onClick: () => handleCategoryChange('marketing') },
    { key: 'administrative', label: CATEGORY_CONFIG.administrative.title, onClick: () => handleCategoryChange('administrative') },
    { key: 'training', label: CATEGORY_CONFIG.training.title, onClick: () => handleCategoryChange('training') },
    { key: 'event', label: CATEGORY_CONFIG.event.title, onClick: () => handleCategoryChange('event') },
    { key: 'multimedia', label: CATEGORY_CONFIG.multimedia.title, onClick: () => handleCategoryChange('multimedia') },
    { key: 'all', label: 'All Categories', onClick: () => handleCategoryChange('all') }
  ];

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select a file to upload');
      return;
    }

    try {
      const values = await form.validateFields();

      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj);
      formData.append('name', values.name);
      formData.append('category', categoryFilter);
      formData.append('tags', values.sub_category || '');
      formData.append('school_id', user.school_id);
      formData.append('school_name', user.name);
      formData.append('description', values.description || '');
      formData.append('class_level', values.class_level || 'all');
      formData.append('subject', values.subject || 'all');
      formData.append('tags', values.tags ? values.tags.join(',') : '');

      setUploading(true);
      await api.post('/school/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      message.success('Resource uploaded successfully! Waiting for admin approval.');
      form.resetFields();
      setFileList([]);
      setIsModalVisible(false);
      fetchResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      message.error(error.response?.data?.detail || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const fetchLogoPosition = async (resourceId) => {
  if (!resourceId || categoryFilter === 'multimedia') return;
  
  try {
    setPositionLoading(true);
    const response = await api.get(`/school/logo-position/${resourceId}`, {
      params: { school_id: user.school_id }
    });
    
    setLogoPosition({
      x: response.data.x_position,
      y: response.data.y_position,
      width: response.data.width,
      opacity: response.data.opacity,
      rotation: response.data.rotation || 0
    });
    setIsDefaultPosition(response.data.is_default);
    
    // Also set logo URL if we have it
    if (schoolInfo?.logo_path) {
      const fullLogoUrl = getStaticFileUrl(schoolInfo.logo_path);
      setLogoUrl(fullLogoUrl);
    } else if (user?.logo_path) {
      const fullLogoUrl = getStaticFileUrl(user.logo_path);
      setLogoUrl(fullLogoUrl);
    }
  } catch (error) {
    console.error('Error fetching logo position:', error);
    setLogoPosition({ x: 50, y: 10, width: 20, opacity: 1.0, rotation: 0 });
    setIsDefaultPosition(true);
  } finally {
    setPositionLoading(false);
  }
};

  const fetchTextPosition = async (resourceId) => {
    if (!resourceId || categoryFilter === 'multimedia') return;
    
    try {
      const response = await api.get(`/school/text-watermark/${resourceId}`, {
        params: { school_id: user.school_id }
      });
      
      setTextPosition({
        name_x: response.data.name_x,
        name_y: response.data.name_y,
        name_size: response.data.name_size,
        name_opacity: response.data.name_opacity,
        name_rotation: response.data.name_rotation || 0,
        contact_x: response.data.contact_x,
        contact_y: response.data.contact_y,
        contact_size: response.data.contact_size,
        contact_opacity: response.data.contact_opacity,
        contact_rotation: response.data.contact_rotation || 0,
        address_x: response.data.address_x || 50,
        address_y: response.data.address_y || 85,
        address_size: response.data.address_size || 10,
        address_opacity: response.data.address_opacity || 1.0,
        address_rotation: response.data.address_rotation || 0,
        name_font: response.data.name_font || 'Arial',
        name_style: response.data.name_style || 'normal',
        name_color: response.data.name_color || '#000000',
        contact_font: response.data.contact_font || 'Arial',
        contact_style: response.data.contact_style || 'normal',
        contact_color: response.data.contact_color || '#000000',
        address_font: response.data.address_font || 'Arial',
        address_style: response.data.address_style || 'normal',
        address_color: response.data.address_color || '#000000'
      });
      
      setTextElements({
        showName: response.data.show_name !== false,
        showContact: response.data.show_contact !== false,
        showAddress: response.data.show_address || false
      });
      
      setAddress(response.data.address || '');
      setIsDefaultText(response.data.is_default);
    } catch (error) {
      console.error('Error fetching text position:', error);
      setTextPosition({
        name_x: 50, name_y: 25, name_size: 20, name_opacity: 1.0, name_rotation: 0,
        contact_x: 50, contact_y: 90, contact_size: 12, contact_opacity: 1.0, contact_rotation: 0,
        address_x: 50, address_y: 85, address_size: 10, address_opacity: 1.0, address_rotation: 0,
        name_font: 'Arial', name_style: 'normal', name_color: '#000000',
        contact_font: 'Arial', contact_style: 'normal', contact_color: '#000000',
        address_font: 'Arial', address_style: 'normal', address_color: '#000000'
      });
      setTextElements({
        showName: true,
        showContact: true,
        showAddress: false
      });
      setAddress('');
      setIsDefaultText(true);
    }
  };

  const saveLogoPosition = async () => {
    if (!previewResource || categoryFilter === 'multimedia') return;
    
    try {
      const roundedPosition = {
        x: Math.round(logoPosition.x),
        y: Math.round(logoPosition.y),
        width: Math.round(logoPosition.width),
        opacity: Number(logoPosition.opacity.toFixed(2))
      };
      
      const formData = new FormData();
      formData.append('school_id', user.school_id);
      formData.append('resource_id', previewResource.resource_id);
      formData.append('x_position', roundedPosition.x.toString());
      formData.append('y_position', roundedPosition.y.toString());
      formData.append('width', roundedPosition.width.toString());
      formData.append('opacity', roundedPosition.opacity.toString());
      formData.append('rotation', (logoPosition.rotation || 0).toString());
      
      await api.post('/school/logo-position', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setIsEditingLogo(false);
      setIsDefaultPosition(false);
      message.success('Logo position saved successfully!');
    } catch (error) {
      console.error('Error saving logo position:', error);
      message.error('Failed to save logo position');
    }
  };

  const saveTextPosition = async () => {
    if (!previewResource || categoryFilter === 'multimedia') return;
    
    try {
      const nameOpacityValue = parseFloat(Math.max(0.1, textPosition.name_opacity).toFixed(2));
      const contactOpacityValue = parseFloat(Math.max(0.1, textPosition.contact_opacity).toFixed(2));
      const addressOpacityValue = parseFloat(Math.max(0.1, textPosition.address_opacity).toFixed(2));
      
      const formData = new FormData();
      formData.append('school_id', user.school_id);
      formData.append('resource_id', previewResource.resource_id);
      formData.append('name_x', Math.round(textPosition.name_x).toString());
      formData.append('name_y', Math.round(textPosition.name_y).toString());
      formData.append('name_size', textPosition.name_size.toString());
      formData.append('name_opacity', nameOpacityValue);
      formData.append('name_font', textPosition.name_font);
      formData.append('name_style', textPosition.name_style);
      formData.append('name_color', textPosition.name_color);
      formData.append('name_rotation', Math.round(textPosition.name_rotation).toString());
      formData.append('show_name', textElements.showName);
      
      formData.append('contact_x', Math.round(textPosition.contact_x).toString());
      formData.append('contact_y', Math.round(textPosition.contact_y).toString());
      formData.append('contact_size', textPosition.contact_size.toString());
      formData.append('contact_opacity', contactOpacityValue);
      formData.append('contact_font', textPosition.contact_font);
      formData.append('contact_style', textPosition.contact_style);
      formData.append('contact_color', textPosition.contact_color);
      formData.append('contact_rotation', Math.round(textPosition.contact_rotation).toString());
      formData.append('show_contact', textElements.showContact);
      
      formData.append('address_x', Math.round(textPosition.address_x).toString());
      formData.append('address_y', Math.round(textPosition.address_y).toString());
      formData.append('address_size', textPosition.address_size.toString());
      formData.append('address_opacity', addressOpacityValue);
      formData.append('address_font', textPosition.address_font);
      formData.append('address_style', textPosition.address_style);
      formData.append('address_color', textPosition.address_color);
      formData.append('address_rotation', Math.round(textPosition.address_rotation).toString());
      formData.append('show_address', textElements.showAddress);
      formData.append('address', address);
      
      await api.post('/school/text-watermark', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setIsEditingText(false);
      setIsDefaultText(false);
      message.success('Text watermark position saved successfully!');
    } catch (error) {
      console.error('Error saving text position:', error);
      message.error('Failed to save text position');
    }
  };

  const resetLogoPosition = async () => {
    if (!previewResource || categoryFilter === 'multimedia') return;
    
    try {
      await api.delete(`/school/logo-position/${previewResource.resource_id}`, {
        params: { school_id: user.school_id }
      });
      
      setLogoPosition({ x: 50, y: 10, width: 20, opacity: 1.0, rotation: 0 });
      setIsDefaultPosition(true);
      setIsEditingLogo(false);
      message.success('Logo position reset to default');
    } catch (error) {
      console.error('Error resetting logo position:', error);
      message.error('Failed to reset logo position');
    }
  };

  const resetTextPosition = async () => {
    if (!previewResource || categoryFilter === 'multimedia') return;
    
    try {
      setTextPosition({
        name_x: 50, name_y: 25, name_size: 20, name_opacity: 1.0, name_rotation: 0,
        contact_x: 50, contact_y: 90, contact_size: 12, contact_opacity: 1.0, contact_rotation: 0,
        address_x: 50, address_y: 85, address_size: 10, address_opacity: 1.0, address_rotation: 0,
        name_font: 'Arial', name_style: 'normal', name_color: '#000000',
        contact_font: 'Arial', contact_style: 'normal', contact_color: '#000000',
        address_font: 'Arial', address_style: 'normal', address_color: '#000000'
      });
      setTextElements({
        showName: true,
        showContact: true,
        showAddress: false
      });
      setAddress('');
      setIsDefaultText(true);
      setIsEditingText(false);
      message.success('Text watermark position reset to default');
    } catch (error) {
      console.error('Error resetting text position:', error);
      message.error('Failed to reset text position');
    }
  };
  
  const resetTextElement = (elementType) => {
    const defaults = {
      name: { x: 50, y: 25, size: 20, opacity: 1.0, font: 'Arial', style: 'normal', color: '#000000', rotation: 0 },
      contact: { x: 50, y: 90, size: 12, opacity: 1.0, font: 'Arial', style: 'normal', color: '#000000', rotation: 0 },
      address: { x: 50, y: 85, size: 10, opacity: 1.0, font: 'Arial', style: 'normal', color: '#000000', rotation: 0 }
    };
    
    const reset = defaults[elementType];
    const updates = {};
    
    if (elementType === 'name') {
      updates.name_x = reset.x;
      updates.name_y = reset.y;
      updates.name_size = reset.size;
      updates.name_opacity = reset.opacity;
      updates.name_font = reset.font;
      updates.name_style = reset.style;
      updates.name_color = reset.color;
      updates.name_rotation = reset.rotation;
    } else if (elementType === 'contact') {
      updates.contact_x = reset.x;
      updates.contact_y = reset.y;
      updates.contact_size = reset.size;
      updates.contact_opacity = reset.opacity;
      updates.contact_font = reset.font;
      updates.contact_style = reset.style;
      updates.contact_color = reset.color;
      updates.contact_rotation = reset.rotation;
    } else if (elementType === 'address') {
      updates.address_x = reset.x;
      updates.address_y = reset.y;
      updates.address_size = reset.size;
      updates.address_opacity = reset.opacity;
      updates.address_font = reset.font;
      updates.address_style = reset.style;
      updates.address_color = reset.color;
      updates.address_rotation = reset.rotation;
    }
    
    setTextPosition(prev => ({ ...prev, ...updates }));
    message.success(`${elementType.charAt(0).toUpperCase() + elementType.slice(1)} text reset to default`);
  };
  
  const removeTextElement = (elementType) => {
    setTextElements(prev => ({ ...prev, [`show${elementType.charAt(0).toUpperCase() + elementType.slice(1)}`]: false }));
    message.success(`${elementType.charAt(0).toUpperCase() + elementType.slice(1)} text removed`);
  };
  
  const toggleTextElement = (elementType) => {
    setTextElements(prev => ({ ...prev, [`show${elementType.charAt(0).toUpperCase() + elementType.slice(1)}`]: !prev[`show${elementType.charAt(0).toUpperCase() + elementType.slice(1)}`] }));
  };

  const startLogoDrag = (e, container) => {
    if (!isEditingLogo) return;
    if (!container) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = { type: 'logo', element: null, container };
    setIsDraggingLogo(true);
    setIsDraggingText(null);
  };

  const startTextDrag = (e, elementType, container) => {
    if (!isEditingText) return;
    if (!container) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = { type: 'text', element: elementType, container };
    setIsDraggingText(elementType);
    setIsDraggingLogo(false);
  };

  const handleLogoDrag = (e, container) => {
    if (!isDraggingLogo || !container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    setLogoPosition(prev => ({ ...prev, x: boundedX, y: boundedY }));
  };

  const handleTextDrag = (e, container, elementType) => {
    if (!isDraggingText || !container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    if (elementType === 'name') {
      setTextPosition(prev => ({ ...prev, name_x: boundedX, name_y: boundedY }));
    } else if (elementType === 'contact') {
      setTextPosition(prev => ({ ...prev, contact_x: boundedX, contact_y: boundedY }));
    } else if (elementType === 'address') {
      setTextPosition(prev => ({ ...prev, address_x: boundedX, address_y: boundedY }));
    }
  };

  const handleLogoResize = (change) => {
    setLogoPosition(prev => ({
      ...prev,
      width: Math.max(5, Math.min(50, prev.width + change))
    }));
  };

  const handleTextResize = (elementType, change) => {
    if (elementType === 'name') {
      setTextPosition(prev => ({
        ...prev,
        name_size: Math.max(8, Math.min(40, prev.name_size + change))
      }));
    } else if (elementType === 'contact') {
      setTextPosition(prev => ({
        ...prev,
        contact_size: Math.max(8, Math.min(20, prev.contact_size + change))
      }));
    } else if (elementType === 'address') {
      setTextPosition(prev => ({
        ...prev,
        address_size: Math.max(6, Math.min(20, prev.address_size + change))
      }));
    }
  };

  const handleLogoOpacityChange = (change) => {
    setLogoPosition(prev => ({
      ...prev,
      opacity: Math.max(0.1, Math.min(1.0, prev.opacity + change))
    }));
  };

  const handleTextOpacityChange = (elementType, change) => {
    if (elementType === 'name') {
      setTextPosition(prev => ({
        ...prev,
        name_opacity: Math.max(0.1, Math.min(1.0, prev.name_opacity + change))
      }));
    } else if (elementType === 'contact') {
      setTextPosition(prev => ({
        ...prev,
        contact_opacity: Math.max(0.1, Math.min(1.0, prev.contact_opacity + change))
      }));
    } else if (elementType === 'address') {
      setTextPosition(prev => ({
        ...prev,
        address_opacity: Math.max(0.1, Math.min(1.0, prev.address_opacity + change))
      }));
    }
  };

  const handlePreview = async (record) => {
  setPreviewResource(record);
  setPreviewLoading(true);
  setIsPreviewModalVisible(true);
  void trackSchoolActivity(user, 'resource_preview', {
    resource_id: record.resource_id,
    resource_name: record.name,
    category: record.category,
    file_type: record.file_type
  });

  // CRITICAL FIX: Set logo URL correctly using getStaticFileUrl
  let logoPath = null;
  
  // Try to get logo from schoolInfo first (most reliable)
  if (schoolInfo?.logo_path) {
    logoPath = schoolInfo.logo_path;
    console.log('Using logo from schoolInfo:', logoPath);
  } 
  // Fallback to user object
  else if (user?.logo_path) {
    logoPath = user.logo_path;
    console.log('Using logo from user object:', logoPath);
  }
  
  if (logoPath) {
    const fullLogoUrl = getStaticFileUrl(logoPath);
    console.log('Setting logo URL in preview:', fullLogoUrl);
    setLogoUrl(fullLogoUrl);
  } else {
    console.log('No logo found for school');
  }

  if (videoRefs.current[record.resource_id]) {
    videoRefs.current[record.resource_id].pause();
    videoRefs.current[record.resource_id].currentTime = 0;
  }

  if (categoryFilter !== 'multimedia') {
    await fetchLogoPosition(record.resource_id);
    await fetchTextPosition(record.resource_id);
  }

  const lowerType = (record.file_type || '').toLowerCase();
  const lowerPath = (record.file_path || '').toLowerCase();
  const extension = lowerPath.split('.').pop()?.split('?')[0] || '';
  const isImage = lowerType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|tiff|webp|svg)$/.test(lowerPath);
  const isPdf = lowerType.includes('pdf') || extension === 'pdf';
  const isVideo = lowerType.includes('video') || VIDEO_FILE_EXTENSIONS.includes(extension) || isVideoLinkResource(record);

  if (!isImage && !isPdf && !isVideo) {
    setPreviewLoading(false);
  }
};
  const isImageResource = (record) => {
    if (!record) return false;
    const type = (record.file_type || '').toLowerCase();
    const path = (record.file_path || '').toLowerCase();
    return type.includes('image') || /\.(jpg|jpeg|png|gif|bmp|tiff|webp|svg)$/.test(path);
  };

  const isPdfResource = (record) => {
    if (!record) return false;
    const type = (record.file_type || '').toLowerCase();
    const path = (record.file_path || '').toLowerCase();
    return type.includes('pdf') || path.endsWith('.pdf');
  };

  const getPdfPageRef = (index) => {
    if (!pdfPageRefs.current[index]) {
      pdfPageRefs.current[index] = React.createRef();
    }
    return pdfPageRefs.current[index];
  };

  const loadPdfPages = async (resource) => {
    if (!resource) return;

    setPdfPagesLoading(true);
    setPreviewLoading(true);
    pdfPageRefs.current = [];

    try {
      const response = await api.get(`/resources/${resource.resource_id}/pdf-metadata`);
      const pageCount = response.data?.page_count || 1;
      const width = 800;
      const pages = Array.from({ length: pageCount }, (_, index) => ({
        pageNumber: index + 1,
        url: `${API}/resources/${resource.resource_id}/pdf-page/${index + 1}?width=${width}`
      }));
      setPdfPages(pages);
    } catch (error) {
      console.error('Error loading PDF preview:', error);
      message.error('Failed to load PDF preview');
      setPdfPages([]);
      setPreviewLoading(false);
    } finally {
      setPdfPagesLoading(false);
    }
  };

  useEffect(() => {
    if (!previewResource) return;

    if (isPdfResource(previewResource)) {
      loadPdfPages(previewResource);
    } else {
      setPdfPages([]);
    }
  }, [previewResource]);

  const handleDownload = async (record, format = 'image') => {
    try {
      if (isVideoLinkResource(record)) {
        void trackSchoolActivity(user, 'resource_download', {
          resource_id: record.resource_id,
          resource_name: record.name,
          category: record.category,
          format: 'external_link',
          branded: false,
          is_external_link: true
        });

        const openLink = document.createElement('a');
        openLink.href = record.file_path;
        openLink.target = '_blank';
        openLink.rel = 'noopener noreferrer';
        document.body.appendChild(openLink);
        openLink.click();
        document.body.removeChild(openLink);

        setResources(prevResources =>
          prevResources.map(res =>
            res.resource_id === record.resource_id
              ? { ...res, school_download_count: (res.school_download_count || 0) + 1 }
              : res
          )
        );

        message.success('Opening video link...');
        return;
      }

      const token = sessionStorage.getItem('token');
      const downloadUrl = `${API}/resources/${record.resource_id}/download-with-logo`;
      const urlWithParams = new URL(downloadUrl);
      urlWithParams.searchParams.append('school_id', user.school_id);
      urlWithParams.searchParams.append('school_name', user.name);
      if (format === 'pdf') urlWithParams.searchParams.append('format', 'pdf');
      
      console.log('Download URL:', urlWithParams.toString());
      
      const response = await fetch(urlWithParams.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/octet-stream'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${record.name.replace(/[^a-zA-Z0-9]/g, '_')}_branded`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      } else if (record.file_type) {
        const ext = record.file_type.split('/').pop();
        filename = `${filename}.${ext}`;
      }
      
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      // Update school download count in UI
      setResources(prevResources =>
        prevResources.map(res =>
          res.resource_id === record.resource_id
            ? { ...res, school_download_count: (res.school_download_count || 0) + 1 }
            : res
        )
      );
      
      message.success(format === 'pdf' ? 'PDF download started with school branding!' : 'Download started with school branding!');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download file: ' + error.message);
    }
  };

  const getDownloadMenuItems = (record) => {
    if (!record) return [];

    if (isVideoLinkResource(record)) {
      return [
        {
          key: 'open-link',
          label: 'Open Video Link',
          onClick: () => handleDownload(record)
        }
      ];
    }

    return [
      {
        key: 'original',
        label: 'Download Branded',
        onClick: () => handleDownload(record, 'image')
      },
      {
        key: 'pdf',
        label: 'Download Branded PDF',
        onClick: () => handleDownload(record, 'pdf'),
        disabled: !isImageResource(record) && !isPdfResource(record)
      }
    ];
  };

  const renderPreview = () => {
    if (!previewResource) return null;

    const fileType = previewResource.file_type ? previewResource.file_type.toLowerCase() : '';
    const fileExtension = previewResource.file_path?.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
    const isVideoLink = isVideoLinkResource(previewResource);
    const getPreviewUrl = () => {
      if (isVideoLink) {
        return previewResource.file_path;
      }
      return `${API}/resources/${previewResource.resource_id}/preview`;
    };
    const previewUrl = getPreviewUrl();

    // Helper function to wrap content (no header/footer spacing)
    const wrapWithHeaderFooter = (content) => {
      return (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: '#f5f5f5'
        }}>
          {/* Content Area */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {content}
            {previewLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20
              }}>
                <LoadingOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                <p style={{ marginTop: '12px' }}>Loading preview...</p>
              </div>
            )}
          </div>
        </div>
      );
    };

    // Images
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExtensions.includes(fileExtension) || fileType.includes('image')) {
      const imageContent = (
        <div
          ref={imageContainerRef}
          style={{
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
            maxHeight: '100%',
            backgroundColor: '#f0f0f0'
          }}
        >
          <img
            src={previewUrl}
            alt={previewResource.name}
            style={{ 
              display: 'block',
              maxWidth: '100%', 
              maxHeight: '70vh', 
              objectFit: 'contain' 
            }}
            onLoad={() => setPreviewLoading(false)}
            onError={(e) => {
              console.error('Image load error:', e);
              setPreviewLoading(false);
              message.error('Failed to load image preview');
            }}
          />
          {categoryFilter !== 'multimedia' && logoUrl && showLogo && (
            <LogoOverlay
              logoUrl={logoUrl}
              logoPosition={logoPosition}
              isEditingLogo={isEditingLogo}
              onStartLogoDrag={startLogoDrag}
              containerRef={imageContainerRef}
              showLogo={showLogo}
            />
          )}
          {categoryFilter !== 'multimedia' && (schoolInfo.school_name || schoolInfo.email || schoolInfo.contact_number || address) && (
            <TextOverlay
              schoolInfo={schoolInfo}
              textPosition={textPosition}
              isEditingText={isEditingText}
              isDraggingText={isDraggingText}
              onStartTextDrag={startTextDrag}
              containerRef={imageContainerRef}
              textElements={textElements}
              address={address}
            />
          )}
        </div>
      );
      return wrapWithHeaderFooter(imageContent);
    }

    // PDFs
    if (fileType.includes('pdf') || fileExtension === 'pdf') {
      const pdfContent = (
        <div
          style={{ 
            width: '100%', 
            height: '100%', 
            overflow: 'auto', 
            backgroundColor: '#f5f5f5',
            padding: '16px'
          }}
          className={isDraggingLogo || isDraggingText ? 'dragging-active' : ''}
        >
          {pdfPagesLoading && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <LoadingOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <p>Loading PDF pages...</p>
            </div>
          )}

          {!pdfPagesLoading && pdfPages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p>Unable to load PDF preview. Please try again.</p>
            </div>
          )}

          {pdfPages.map((page, index) => {
            const pageRef = getPdfPageRef(index);
            return (
              <div
                key={`page-${page.pageNumber}`}
                ref={pageRef}
                style={{
                  position: 'relative',
                  width: 'fit-content',
                  margin: '0 auto 16px'
                }}
              >
                <img
                  src={page.url}
                  alt={`Page ${page.pageNumber}`}
                  style={{
                    display: 'block',
                    width: '800px',
                    maxWidth: '100%',
                    height: 'auto',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                    borderRadius: '4px'
                  }}
                  onLoad={() => {
                    if (index === 0) {
                      setPreviewLoading(false);
                    }
                  }}
                  onError={() => {
                    if (index === 0) {
                      setPreviewLoading(false);
                    }
                    message.error('Failed to load PDF page preview');
                  }}
                />
                {categoryFilter !== 'multimedia' && logoUrl && showLogo && (
                  <LogoOverlay
                    logoUrl={logoUrl}
                    logoPosition={logoPosition}
                    isEditingLogo={isEditingLogo}
                    onStartLogoDrag={startLogoDrag}
                    containerRef={pageRef}
                    showLogo={showLogo}
                  />
                )}
                {categoryFilter !== 'multimedia' && (schoolInfo.school_name || schoolInfo.email || schoolInfo.contact_number || address) && (
                  <TextOverlay
                    schoolInfo={schoolInfo}
                    textPosition={textPosition}
                    isEditingText={isEditingText}
                    isDraggingText={isDraggingText}
                    onStartTextDrag={startTextDrag}
                    containerRef={pageRef}
                    textElements={textElements}
                    address={address}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
      return wrapWithHeaderFooter(pdfContent);
    }

    // Videos
    if (fileType.includes('video') || VIDEO_FILE_EXTENSIONS.includes(fileExtension) || isVideoLink) {
      const videoSrc = isVideoLink ? previewResource.file_path : previewUrl;
      const videoLinkMeta = getVideoLinkMeta(videoSrc);

      if (isVideoLink && videoLinkMeta.embedUrl) {
        const embeddedVideoContent = (
          <iframe
            src={videoLinkMeta.embedUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px'
            }}
            title={previewResource.name}
            allow={videoLinkMeta.platformName === 'YouTube'
              ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
              : 'autoplay; fullscreen; picture-in-picture'
            }
            allowFullScreen
            onLoad={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              message.error(`Failed to load ${videoLinkMeta.platformName} video preview`);
            }}
          />
        );

        return wrapWithHeaderFooter(embeddedVideoContent);
      }

      const videoContent = (
        <video
          ref={el => { if (el && previewResource) videoRefs.current[previewResource.resource_id] = el; }}
          controls
          preload="metadata"
          style={{ width: '100%', maxHeight: '100%', borderRadius: '8px' }}
          onLoadedMetadata={() => setPreviewLoading(false)}
          onError={() => {
            setPreviewLoading(false);
            message.error('Failed to load video preview');
          }}
        >
          <source src={videoSrc} type={previewResource.file_type || 'video/mp4'} />
        </video>
      );
      return wrapWithHeaderFooter(videoContent);
    }

    // Default fallback
    const fallbackContent = (
      <div style={{ textAlign: 'center', padding: '40px', width: '100%' }}>
        {getFileIcon(previewResource.file_type, 64)}
        <h3 style={{ marginTop: '16px' }}>{previewResource.name}</h3>
        <p>Preview not available for this file type. Please download to view.</p>
        <Dropdown menu={{ items: getDownloadMenuItems(previewResource) }} trigger={['click']}>
          <Button type="primary" icon={<DownloadOutlined />}>
            Download File
          </Button>
        </Dropdown>
      </div>
    );
    return wrapWithHeaderFooter(fallbackContent);
  };

  const getFileIcon = (fileType, size = 32) => {
    if (!fileType) return <FileUnknownOutlined style={{ fontSize: `${size}px` }} />;
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: `${size}px` }} />;
    if (type.includes('word') || type.includes('doc')) return <FileWordOutlined style={{ color: '#1890ff', fontSize: `${size}px` }} />;
    if (type.includes('powerpoint') || type.includes('ppt')) return <FilePptOutlined style={{ color: '#ffa940', fontSize: `${size}px` }} />;
    if (type.includes('excel') || type.includes('xls')) return <FileExcelOutlined style={{ color: '#52c41a', fontSize: `${size}px` }} />;
    if (type.includes('image')) return <FileImageOutlined style={{ color: '#722ed1', fontSize: `${size}px` }} />;
    if (type.includes('video')) return <VideoCameraOutlined style={{ color: '#13c2c2', fontSize: `${size}px` }} />;
    if (type.includes('audio')) return <AudioOutlined style={{ color: '#eb2f96', fontSize: `${size}px` }} />;
    return <FileUnknownOutlined style={{ fontSize: `${size}px` }} />;
  };

  const filteredResources = resources.filter(resource => {
    const normalizedSearchText = searchText.trim().toLowerCase();
    const matchesSearch = !normalizedSearchText ||
      resource.name?.toLowerCase().includes(normalizedSearchText) ||
      resource.description?.toLowerCase().includes(normalizedSearchText);
    const matchesClass = selectedClass === 'all' || resource.normalized_class_level === selectedClass;
    const matchesSubject = subjectFilter === 'all' || resource.normalized_subject === subjectFilter;
    const matchesSubCategory = subCategoryFilter === 'all' || resource.normalized_sub_category === subCategoryFilter;
    const matchesStatus = selectedStatus === 'all' || resource.normalized_status === selectedStatus;

    return matchesSearch && matchesClass && matchesSubject && matchesSubCategory && matchesStatus;
  });

  useEffect(() => {
    const query = searchText.trim();
    if (loading || query.length < 2) {
      lastSearchSignatureRef.current = '';
      return undefined;
    }

    const signature = [
      query.toLowerCase(),
      categoryFilter,
      subCategoryFilter,
      selectedClass,
      subjectFilter,
      selectedStatus,
      filteredResources.length
    ].join('|');

    if (lastSearchSignatureRef.current === signature) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      lastSearchSignatureRef.current = signature;
      void trackSchoolSearch(user, {
        query,
        resultsCount: filteredResources.length,
        category: categoryFilter,
        subCategory: subCategoryFilter === 'all' ? null : subCategoryFilter,
        filters: {
          class_level: selectedClass,
          subject: subjectFilter,
          status: selectedStatus
        }
      });
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [
    categoryFilter,
    filteredResources.length,
    loading,
    searchText,
    selectedClass,
    selectedStatus,
    subCategoryFilter,
    subjectFilter,
    user
  ]);

  const getStatusTag = (resource) => {
    if (resource.is_own_upload) {
      const statusMap = {
        'pending': { color: 'orange', text: 'Pending Approval', icon: <ClockCircleOutlined /> },
        'approved': { color: 'green', text: 'Approved', icon: null },
        'rejected': { color: 'red', text: 'Rejected', icon: null }
      };
      const statusInfo = statusMap[resource.display_status] || { color: 'default', text: 'Unknown', icon: null };
      return <Tag color={statusInfo.color} icon={statusInfo.icon}>{statusInfo.text}</Tag>;
    }
    return <Tag color="green">Available</Tag>;
  };

  const renderThumbnail = (resource) => {
    const fileUrl = resource.file_path;
    const fileType = resource.file_type?.toLowerCase() || '';
    const fileExtension = fileUrl?.split('.').pop()?.split('?')[0]?.toLowerCase() || '';

    // Images
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExtensions.includes(fileExtension) || fileType.includes('image')) {
      return (
        <div style={{ height: '150px', overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={fileUrl}
            alt={resource.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { 
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #722ed1;"><span style="font-size: 48px;">📷</span></div>`;
            }}
          />
        </div>
      );
    }

    // Videos
    const isVideoLink = isVideoLinkResource(resource);
    if (fileType.includes('video') || VIDEO_FILE_EXTENSIONS.includes(fileExtension) || isVideoLink) {
      if (isVideoLink) {
        const videoLinkMeta = getVideoLinkMeta(fileUrl);

        return (
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '150px',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {videoLinkMeta.thumbnailUrl ? (
              <>
                <img
                  src={videoLinkMeta.thumbnailUrl}
                  alt={resource.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <VideoCameraOutlined style={{ fontSize: '20px', color: 'white' }} />
                </div>
              </>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: videoLinkMeta.platformName === 'Vimeo' ? '#00adef' : '#1890ff'
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <VideoCameraOutlined style={{ fontSize: '20px', color: 'white' }} />
                </div>
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {videoLinkMeta.platformName}
            </div>
          </div>
        );
      }

      return (
        <VideoThumbnail
          videoUrl={fileUrl}
          resource={resource}
          fileType={resource.file_type}
        />
      );
    }

    // PDFs - show first page as thumbnail
    if (fileType.includes('pdf') || fileExtension === 'pdf') {
      return (
        <div
          style={{
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <iframe
              src={`${fileUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&zoom=50`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                pointerEvents: 'none'
              }}
              title={`PDF thumbnail - ${resource.name}`}
            />
          </div>
        </div>
      );
    }

    // Default
    return (
      <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        {getFileIcon(resource.file_type, 48)}
      </div>
    );
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {getFileIcon(record.file_type, 24)}
          <div>
            <div>{text}</div>
            {record.sub_category && (
              <div style={{ fontSize: '11px', color: '#1890ff', marginTop: '2px' }}>
                📁 {getSubCategoryLabel(record.sub_category, record.category)}
              </div>
            )}
            {record.is_own_upload && <Tag color="blue" style={{ marginTop: 4 }}>Your Upload</Tag>}
          </div>
        </Space>
      ),
      width: '20%',
    },
    {
      title: 'Program',
      dataIndex: 'class_level',
      key: 'class_level',
      render: (level) => <Tag color="blue">{getClassLabel(level)}</Tag>,
      width: '8%',
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject) => <Tag color="green">{getSubjectLabel(subject)}</Tag>,
      width: '8%',
    },
    {
      title: 'Sub-Category',
      dataIndex: 'sub_category',
      key: 'sub_category',
      render: (sub, record) => sub ? <Tag color="purple">{getSubCategoryLabel(sub, record.category)}</Tag> : '-',
      width: '12%',
    },
    {
      title: 'Sub-Title',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => tags ? (
        <div style={{ maxWidth: '150px' }}>
          {tags.split(',').map((tag, index) => (
            <Tag key={index} size="small" style={{ margin: '1px' }}>{tag.trim()}</Tag>
          ))}
        </div>
      ) : '-',
      width: '12%',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text ? (
        <Tooltip title={text}>
          <span style={{ maxWidth: '150px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text}
          </span>
        </Tooltip>
      ) : '-',
      width: '15%',
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => {
        if (!size) return '-';
        return size < 1024 * 1024
          ? `${(size / 1024).toFixed(1)} KB`
          : `${(size / (1024 * 1024)).toFixed(2)} MB`;
      },
      width: '8%',
    },
    {
      title: 'Downloads',
      dataIndex: 'school_download_count',
      key: 'school_download_count',
      render: (count) => <Badge count={count || 0} showZero style={{ backgroundColor: '#52c41a' }} />,
      width: '8%',
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      width: '8%',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => getStatusTag(record),
      width: '8%',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Preview">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
          </Tooltip>
          <Tooltip title="Download">
            <Dropdown menu={{ items: getDownloadMenuItems(record) }} trigger={['click']}>
              <Button 
                type="text" 
                icon={<DownloadOutlined />} 
                disabled={record.is_own_upload && record.display_status !== 'approved'}
              />
            </Dropdown>
          </Tooltip>
        </Space>
      ),
      width: '8%',
    },
  ];

  const renderGridView = () => (
    <Row gutter={[16, 16]}>
      {filteredResources.map(resource => {
        return (
          <Col xs={24} sm={12} md={8} lg={6} key={resource.key}>
            <Card
              hoverable
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              cover={
                <div style={{ cursor: 'pointer' }} onClick={() => handlePreview(resource)}>
                  {renderThumbnail(resource)}
                  {resource.sub_category && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'rgba(24, 144, 255, 0.8)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {getSubCategoryLabel(resource.sub_category, resource.category)?.substring(0, 12) || resource.sub_category?.substring(0, 12)}
                    </div>
                  )}
                  {resource.is_own_upload && (
                    <div style={{
                      position: 'absolute',
                      top: resource.sub_category ? 32 : 8,
                      left: 8,
                      background: 'rgba(24, 144, 255, 0.9)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      zIndex: 1
                    }}>
                      YOURS
                    </div>
                  )}
                </div>
              }
              actions={[
                <Tooltip title="Preview" key="preview">
                  <EyeOutlined onClick={() => handlePreview(resource)} />
                </Tooltip>,
                <Tooltip title="Download" key="download">
                  <Dropdown
                    menu={{ items: getDownloadMenuItems(resource) }}
                    trigger={['click']}
                    disabled={resource.is_own_upload && resource.display_status !== 'approved'}
                  >
                    <DownloadOutlined 
                      onClick={(e) => { e.stopPropagation(); }}
                      style={resource.is_own_upload && resource.display_status !== 'approved' ? { color: '#d9d9d9', cursor: 'not-allowed' } : {}}
                    />
                  </Dropdown>
                </Tooltip>
              ]}
            >
              <div>
                <Tooltip title={resource.name}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resource.name}
                  </div>
                </Tooltip>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', height: '36px', overflow: 'hidden' }}>
                  {resource.description || 'No description provided'}
                </div>
                <Space size={[4, 4]} wrap>
                  <Tag color="blue">{getClassLabel(resource.class_level)}</Tag>
                  <Tag color="green">{getSubjectLabel(resource.subject)}</Tag>
                  {resource.sub_category && <Tag color="purple">{getSubCategoryLabel(resource.sub_category, resource.category)}</Tag>}
                  {resource.tags && resource.tags.split(',').map((tag, index) => (
                    <Tag key={index} color="default" style={{ margin: '1px', fontSize: '10px' }}>{tag.trim()}</Tag>
                  ))}
                  {getStatusTag(resource)}
                </Space>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );

  const handleFileChange = ({ fileList }) => {
    setFileList(fileList.slice(-1));
  };

  const beforeUpload = (file) => {
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error('File must be smaller than 100MB!');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const getCategoryDisplayName = (category) => {
    return CATEGORY_CONFIG[category]?.title || category || CATEGORY_CONFIG.all.title;
  };

  const getCategoryDescription = (category) => {
    return CATEGORY_CONFIG[category]?.description || `Manage ${category} resources`;
  };

  return (
    <div>
      <Card
        title={
          <div>
            <h2 style={{ margin: 0 }}>{getCategoryDisplayName(categoryFilter)}</h2>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              {getCategoryDescription(categoryFilter)}
            </p>
          </div>
        }
        extra={
          <Space wrap>
            <Button
              icon={viewMode === 'list' ? <AppstoreOutlined /> : <UnorderedListOutlined />}
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? 'Grid View' : 'List View'}
            </Button>
            <Input
              placeholder="Search resources..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            
            {/* Class Filter */}
            <Select
              value={selectedClass}
              onChange={setSelectedClass}
              style={{ width: 150 }}
              placeholder="Filter by class"
            >
              {classOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            
            {/* Subject Filter */}
            <Select
              value={subjectFilter}
              onChange={setSubjectFilter}
              style={{ width: 150 }}
              placeholder="Filter by subject"
            >
              {subjectOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            
            {/* Sub-category Filter */}
            <Select
              value={subCategoryFilter}
              onChange={(value) => setSubCategoryFilter(value || 'all')}
              style={{ width: 180 }}
              placeholder="Filter by sub-category"
              allowClear
            >
              <Option value="all">All Sub-categories</Option>
              {CATEGORY_CONFIG[categoryFilter] && Object.entries(CATEGORY_CONFIG[categoryFilter].subcategories)
                .filter(([key]) => key !== 'all')
                .map(([key, label]) => (
                  <Option key={key} value={key}>{label}</Option>
                ))}
            </Select>
            
            {/* Status Filter */}
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 150 }}
              placeholder="Filter by status"
            >
              <Option value="all">All Status</Option>
              <Option value="approved">Approved</Option>
              <Option value="pending">Pending</Option>
            </Select>
            
            {/* Category Dropdown */}
            <Dropdown
              menu={{ items: categoryMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button style={{ width: 150 }}>
                {getCategoryDisplayName(categoryFilter)}
                <DownOutlined style={{ marginLeft: '8px' }} />
              </Button>
            </Dropdown>
          </Space>
        }
      >
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={filteredResources}
            rowKey="key"
            loading={loading}
            pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          filteredResources.length > 0 ? renderGridView() : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FileUnknownOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <p>No resources found</p>
            </div>
          )
        )}
      </Card>

      {/* Preview Modal */}
      <Modal
        title={
          <div>
            {previewResource?.name}
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
              {previewResource?.file_type} • 
              {previewResource?.file_size < 1024 * 1024
                ? ` ${(previewResource?.file_size / 1024).toFixed(1)} KB`
                : ` ${(previewResource?.file_size / (1024 * 1024)).toFixed(2)} MB`}
            </div>
          </div>
        }
        open={isPreviewModalVisible}
        onCancel={() => {
          if (previewResource?.file_type?.includes('video') && videoRefs.current[previewResource.resource_id]) {
            videoRefs.current[previewResource.resource_id].pause();
          }
          setIsPreviewModalVisible(false);
          setPreviewResource(null);
          setPreviewLoading(false);
          setIsEditingLogo(false);
          setIsEditingText(false);
          setIsDraggingLogo(false);
          setIsDraggingText(null);
          dragStateRef.current = { type: null, element: null, container: null };
          setPdfPages([]);
        }}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalVisible(false)}>Close</Button>,
          categoryFilter !== 'multimedia' && (
            <>
              {isEditingLogo ? (
                <>
                  <Button key="saveLogo" type="primary" icon={<SaveOutlined />} onClick={saveLogoPosition} loading={positionLoading}>
                    Save Logo Position
                  </Button>
                  <Button key="resetLogo" icon={<UndoOutlined />} onClick={resetLogoPosition} disabled={isDefaultPosition}>
                    Reset Logo
                  </Button>
                </>
              ) : (
                <Button key="editLogo" icon={<EditOutlined />} onClick={() => setIsEditingLogo(true)}>
                  Position Logo
                </Button>
              )}
            </>
          ),
          categoryFilter !== 'multimedia' && (schoolInfo.school_name || schoolInfo.email || schoolInfo.contact_number) && (
            <>
              {isEditingText ? (
                <>
                  <Button key="saveText" type="primary" icon={<SaveOutlined />} onClick={saveTextPosition}>
                    Save Text Position
                  </Button>
                  <Button key="resetText" icon={<UndoOutlined />} onClick={resetTextPosition} disabled={isDefaultText}>
                    Reset Text
                  </Button>
                </>
              ) : (
                <Button key="editText" icon={<EditOutlined />} onClick={() => setIsEditingText(true)}>
                  Position Text
                </Button>
              )}
            </>
          ),
          <Dropdown key="download" menu={{ items: getDownloadMenuItems(previewResource) }} trigger={['click']}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              disabled={previewResource?.is_own_upload && previewResource?.display_status !== 'approved'}
            >
              Download with branding
            </Button>
          </Dropdown>
        ].filter(Boolean)}
        width="95%"
        style={{ top: 20 }}
        bodyStyle={{ padding: '16px', height: 'calc(90vh - 140px)', overflow: 'hidden' }}
      >
        <Row gutter={16} style={{ height: '100%' }}>
          {/* Document Preview Area */}
          <Col span={isEditingLogo || isEditingText ? 18 : 24} style={{ height: '100%' }}>
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {renderPreview()}
            </div>
          </Col>
          
          {/* Controls Panel - Outside Document */}
          {(isEditingLogo || isEditingText) && (
            <Col span={6} style={{ height: '100%', overflowY: 'auto' }}>
              <Card title="Editing Controls" size="small" style={{ height: '100%' }}>
                {/* Logo Controls */}
                {isEditingLogo && (
                  <div style={{ marginBottom: '20px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>Logo Settings</h4>
                      <Space size="small">
                        <Button 
                          size="small" 
                          type={showLogo ? "primary" : "default"}
                          onClick={() => setShowLogo(!showLogo)}
                        >
                          {showLogo ? 'Hide' : 'Show'}
                        </Button>
                        <Button 
                          size="small" 
                          danger 
                          onClick={() => {
                            setLogoUrl('');
                            setShowLogo(false);
                            message.success('Logo removed');
                          }}
                        >
                          Remove
                        </Button>
                      </Space>
                    </div>
                    {showLogo && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#666' }}>
                            Size: {Math.round(logoPosition.width)}%
                          </label>
                          <Space>
                            <Button size="small" icon={<MinusOutlined />} onClick={() => handleLogoResize(-2)} disabled={logoPosition.width <= 5} />
                            <input 
                              type="range" 
                              min="5" 
                              max="50" 
                              value={logoPosition.width} 
                              onChange={(e) => setLogoPosition(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                              style={{ width: '100px' }}
                            />
                            <Button size="small" icon={<PlusOutlined />} onClick={() => handleLogoResize(2)} disabled={logoPosition.width >= 50} />
                          </Space>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#666' }}>
                            Rotation: {logoPosition.rotation}°
                          </label>
                          <Space>
                            <Button size="small" icon={<RotateLeftOutlined />} onClick={() => setLogoPosition(prev => ({ ...prev, rotation: prev.rotation - 15 }))} />
                            <input 
                              type="range" 
                              min="0" 
                              max="360" 
                              value={logoPosition.rotation} 
                              onChange={(e) => setLogoPosition(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                              style={{ width: '100px' }}
                            />
                            <Button size="small" icon={<RotateRightOutlined />} onClick={() => setLogoPosition(prev => ({ ...prev, rotation: prev.rotation + 15 }))} />
                          </Space>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#666' }}>
                            Opacity: {Math.round(logoPosition.opacity * 100)}%
                          </label>
                          <Space>
                            <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => handleLogoOpacityChange(-0.1)} disabled={logoPosition.opacity <= 0.1} />
                            <input 
                              type="range" 
                              min="10" 
                              max="100" 
                              value={logoPosition.opacity * 100} 
                              onChange={(e) => setLogoPosition(prev => ({ ...prev, opacity: parseFloat(e.target.value) / 100 }))}
                              style={{ width: '100px' }}
                            />
                            <Button size="small" icon={<EyeOutlined />} onClick={() => handleLogoOpacityChange(0.1)} disabled={logoPosition.opacity >= 1.0} />
                          </Space>
                        </div>
                      </>
                    )}
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                      Drag logo on document to reposition it
                    </p>
                  </div>
                )}
                
                {/* Text Controls */}
                {isEditingText && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                      Text Settings
                    </h4>
                    
                    {/* School Name */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>School Name</label>
                        <Space size="small">
                          <Button 
                            size="small" 
                            type={textElements.showName ? "primary" : "default"}
                            onClick={() => toggleTextElement('name')}
                          >
                            {textElements.showName ? 'Hide' : 'Show'}
                          </Button>
                          <Button 
                            size="small" 
                            danger 
                            onClick={() => removeTextElement('name')}
                            disabled={!textElements.showName}
                          >
                            Remove
                          </Button>
                          <Button 
                            size="small" 
                            onClick={() => resetTextElement('name')}
                          >
                            Reset
                          </Button>
                        </Space>
                      </div>
                      
                      {textElements.showName && (
                        <>
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Font: 
                            </label>
                            <Select
                              value={textPosition.name_font}
                              onChange={(value) => setTextPosition(prev => ({ ...prev, name_font: value }))}
                              size="small"
                              style={{ width: '100%', marginBottom: '4px' }}
                            >
                              <Option value="Arial">Arial</Option>
                              <Option value="Times New Roman">Times New Roman</Option>
                              <Option value="Helvetica">Helvetica</Option>
                              <Option value="Georgia">Georgia</Option>
                              <Option value="Verdana">Verdana</Option>
                              <Option value="Courier New">Courier New</Option>
                            </Select>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Style: 
                            </label>
                            <Select
                              value={textPosition.name_style}
                              onChange={(value) => setTextPosition(prev => ({ ...prev, name_style: value }))}
                              size="small"
                              style={{ width: '100%', marginBottom: '4px' }}
                            >
                              <Option value="normal">Normal</Option>
                              <Option value="italic">Italic</Option>
                              <Option value="bold">Bold</Option>
                              <Option value="bold italic">Bold Italic</Option>
                            </Select>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Color: 
                            </label>
                            <input
                              type="color"
                              value={textPosition.name_color}
                              onChange={(e) => setTextPosition(prev => ({ ...prev, name_color: e.target.value }))}
                              style={{ width: '100%', height: '24px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                            />
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Rotation: {textPosition.name_rotation}°
                            </label>
                            <Space>
                              <Button size="small" icon={<RotateLeftOutlined />} onClick={() => setTextPosition(prev => ({ ...prev, name_rotation: prev.name_rotation - 15 }))} />
                              <input 
                                type="range" 
                                min="0" 
                                max="360" 
                                value={textPosition.name_rotation} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, name_rotation: parseInt(e.target.value) }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<RotateRightOutlined />} onClick={() => setTextPosition(prev => ({ ...prev, name_rotation: prev.name_rotation + 15 }))} />
                            </Space>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Size: {textPosition.name_size}px
                            </label>
                            <Space>
                              <Button size="small" icon={<MinusOutlined />} onClick={() => handleTextResize('name', -2)} disabled={textPosition.name_size <= 8} />
                              <input 
                                type="range" 
                                min="8" 
                                max="48" 
                                value={textPosition.name_size} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, name_size: parseInt(e.target.value) }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<PlusOutlined />} onClick={() => handleTextResize('name', 2)} disabled={textPosition.name_size >= 48} />
                            </Space>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Opacity: {Math.round(textPosition.name_opacity * 100)}%
                            </label>
                            <Space>
                              <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => handleTextOpacityChange('name', -0.1)} disabled={textPosition.name_opacity <= 0.1} />
                              <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                value={textPosition.name_opacity * 100} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, name_opacity: parseFloat(e.target.value) / 100 }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<EyeOutlined />} onClick={() => handleTextOpacityChange('name', 0.1)} disabled={textPosition.name_opacity >= 1.0} />
                            </Space>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Contact Info */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Contact Info</label>
                        <Space size="small">
                          <Button 
                            size="small" 
                            type={textElements.showContact ? "primary" : "default"}
                            onClick={() => toggleTextElement('contact')}
                          >
                            {textElements.showContact ? 'Hide' : 'Show'}
                          </Button>
                          <Button 
                            size="small" 
                            danger 
                            onClick={() => removeTextElement('contact')}
                            disabled={!textElements.showContact}
                          >
                            Remove
                          </Button>
                          <Button 
                            size="small" 
                            onClick={() => resetTextElement('contact')}
                          >
                            Reset
                          </Button>
                        </Space>
                      </div>
                      
                      {textElements.showContact && (
                        <>
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Font: 
                            </label>
                            <Select
                              value={textPosition.contact_font}
                              onChange={(value) => setTextPosition(prev => ({ ...prev, contact_font: value }))}
                              size="small"
                              style={{ width: '100%', marginBottom: '4px' }}
                            >
                              <Option value="Arial">Arial</Option>
                              <Option value="Times New Roman">Times New Roman</Option>
                              <Option value="Helvetica">Helvetica</Option>
                              <Option value="Georgia">Georgia</Option>
                              <Option value="Verdana">Verdana</Option>
                              <Option value="Courier New">Courier New</Option>
                            </Select>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Style: 
                            </label>
                            <Select
                              value={textPosition.contact_style}
                              onChange={(value) => setTextPosition(prev => ({ ...prev, contact_style: value }))}
                              size="small"
                              style={{ width: '100%', marginBottom: '4px' }}
                            >
                              <Option value="normal">Normal</Option>
                              <Option value="italic">Italic</Option>
                              <Option value="bold">Bold</Option>
                              <Option value="bold italic">Bold Italic</Option>
                            </Select>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Color: 
                            </label>
                            <input
                              type="color"
                              value={textPosition.contact_color}
                              onChange={(e) => setTextPosition(prev => ({ ...prev, contact_color: e.target.value }))}
                              style={{ width: '100%', height: '24px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                            />
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Rotation: {textPosition.contact_rotation}°
                            </label>
                            <Space>
                              <Button size="small" icon={<RotateLeftOutlined />} onClick={() => setTextPosition(prev => ({ ...prev, contact_rotation: prev.contact_rotation - 15 }))} />
                              <input 
                                type="range" 
                                min="0" 
                                max="360" 
                                value={textPosition.contact_rotation} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, contact_rotation: parseInt(e.target.value) }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<RotateRightOutlined />} onClick={() => setTextPosition(prev => ({ ...prev, contact_rotation: prev.contact_rotation + 15 }))} />
                            </Space>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Size: {textPosition.contact_size}px
                            </label>
                            <Space>
                              <Button size="small" icon={<MinusOutlined />} onClick={() => handleTextResize('contact', -1)} disabled={textPosition.contact_size <= 8} />
                              <input 
                                type="range" 
                                min="8" 
                                max="24" 
                                value={textPosition.contact_size} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, contact_size: parseInt(e.target.value) }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<PlusOutlined />} onClick={() => handleTextResize('contact', 1)} disabled={textPosition.contact_size >= 24} />
                            </Space>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Opacity: {Math.round(textPosition.contact_opacity * 100)}%
                            </label>
                            <Space>
                              <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => handleTextOpacityChange('contact', -0.1)} disabled={textPosition.contact_opacity <= 0.1} />
                              <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                value={textPosition.contact_opacity * 100} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, contact_opacity: parseFloat(e.target.value) / 100 }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<EyeOutlined />} onClick={() => handleTextOpacityChange('contact', 0.1)} disabled={textPosition.contact_opacity >= 1.0} />
                            </Space>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Address */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Address/Message</label>
                        <Space size="small">
                          <Button 
                            size="small" 
                            type={textElements.showAddress ? "primary" : "default"}
                            onClick={() => toggleTextElement('address')}
                          >
                            {textElements.showAddress ? 'Hide' : 'Show'}
                          </Button>
                          <Button 
                            size="small" 
                            danger 
                            onClick={() => removeTextElement('address')}
                            disabled={!textElements.showAddress}
                          >
                            Remove
                          </Button>
                          <Button 
                            size="small" 
                            onClick={() => resetTextElement('address')}
                          >
                            Reset
                          </Button>
                        </Space>
                      </div>
                      
                      {textElements.showAddress && (
                        <>
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Address/Message: 
                            </label>
                            <TextArea
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Enter school address"
                              size="small"
                              rows={2}
                              style={{ fontSize: '11px' }}
                            />
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Font: 
                            </label>
                            <Select
                              value={textPosition.address_font}
                              onChange={(value) => setTextPosition(prev => ({ ...prev, address_font: value }))}
                              size="small"
                              style={{ width: '100%', marginBottom: '4px' }}
                            >
                              <Option value="Arial">Arial</Option>
                              <Option value="Times New Roman">Times New Roman</Option>
                              <Option value="Helvetica">Helvetica</Option>
                              <Option value="Georgia">Georgia</Option>
                              <Option value="Verdana">Verdana</Option>
                              <Option value="Courier New">Courier New</Option>
                            </Select>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Style: 
                            </label>
                            <Select
                              value={textPosition.address_style}
                              onChange={(value) => setTextPosition(prev => ({ ...prev, address_style: value }))}
                              size="small"
                              style={{ width: '100%', marginBottom: '4px' }}
                            >
                              <Option value="normal">Normal</Option>
                              <Option value="italic">Italic</Option>
                              <Option value="bold">Bold</Option>
                              <Option value="bold italic">Bold Italic</Option>
                            </Select>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Color: 
                            </label>
                            <input
                              type="color"
                              value={textPosition.address_color}
                              onChange={(e) => setTextPosition(prev => ({ ...prev, address_color: e.target.value }))}
                              style={{ width: '100%', height: '24px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                            />
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Rotation: {textPosition.address_rotation}°
                            </label>
                            <Space>
                              <Button size="small" icon={<RotateLeftOutlined />} onClick={() => setTextPosition(prev => ({ ...prev, address_rotation: prev.address_rotation - 15 }))} />
                              <input 
                                type="range" 
                                min="0" 
                                max="360" 
                                value={textPosition.address_rotation} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, address_rotation: parseInt(e.target.value) }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<RotateRightOutlined />} onClick={() => setTextPosition(prev => ({ ...prev, address_rotation: prev.address_rotation + 15 }))} />
                            </Space>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Size: {textPosition.address_size}px
                            </label>
                            <Space>
                              <Button size="small" icon={<MinusOutlined />} onClick={() => handleTextResize('address', -1)} disabled={textPosition.address_size <= 6} />
                              <input 
                                type="range" 
                                min="6" 
                                max="20" 
                                value={textPosition.address_size} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, address_size: parseInt(e.target.value) }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<PlusOutlined />} onClick={() => handleTextResize('address', 1)} disabled={textPosition.address_size >= 20} />
                            </Space>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                              Opacity: {Math.round(textPosition.address_opacity * 100)}%
                            </label>
                            <Space>
                              <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => handleTextOpacityChange('address', -0.1)} disabled={textPosition.address_opacity <= 0.1} />
                              <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                value={textPosition.address_opacity * 100} 
                                onChange={(e) => setTextPosition(prev => ({ ...prev, address_opacity: parseFloat(e.target.value) / 100 }))}
                                style={{ width: '80px' }}
                              />
                              <Button size="small" icon={<EyeOutlined />} onClick={() => handleTextOpacityChange('address', 0.1)} disabled={textPosition.address_opacity >= 1.0} />
                            </Space>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '12px' }}>
                      Drag the text elements on the document to reposition them
                    </p>
                  </div>
                )}
              </Card>
            </Col>
          )}
        </Row>
      </Modal>
    </div>
  );
};

export default SchoolResourceCategory;

