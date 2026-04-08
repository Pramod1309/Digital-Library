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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const API = `${BACKEND_URL}/api`;

// Update this helper function at the top of your file:
const getStaticFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Remove any leading slashes
  let cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // For uploaded files, they should be served through /api/uploads
  if (cleanPath.startsWith('uploads/')) {
    return `${BACKEND_URL}/api/${cleanPath}`;
  }
  
  // For other files, use /api/uploads
  return `${BACKEND_URL}/api/uploads/${cleanPath}`;
};

const { Option } = Select;
const { TextArea } = Input;

// Sub-category mapping for all categories
const subCategoryMap = {
  academic: [
    'Activity Sheets', 'Assessments', 'Flashcards', 'Handwriting Practice',
    'Number & Counting Activities', 'Phonics Materials', 'Rhymes & Poems',
    'Story-based Learning', 'Worksheets'
  ],
  marketing: [
    'Admission Campaign Designs', 'Banners', 'Brochures', 'Email Templates', 'Flyers',
    'Pamphlets', 'Posters', 'Social Media Posts', 'Standee Designs', 'Video Ads'
  ],
  administrative: [
    'Admission Forms', 'Attendance Sheets', 'Certificates', 'Circulars & Notices',
    'Fee Management Sheets', 'ID Cards', 'Policy Documents', 'Report Cards',
    'Staff Records', 'Student Records Templates'
  ],
  training: [
    'Activity Training Videos', 'Child Psychology Basics', 'Classroom Management Guides',
    'First Aid Guides', 'Lesson Delivery Techniques', 'Parent Communication Training',
    'Safety Training', 'Skill Development Programs', 'Teacher Training Modules', 'Teaching Methods'
  ],
  event: [
    'Activity Plans', 'Annual Day', 'Certificates & Awards', 'Competition Materials',
    'Decoration Ideas', 'Fancy Dress Ideas', 'Festival Celebrations', 'Invitation Cards',
    'Sports Day', 'Stage Scripts'
  ],
  multimedia: [
    'Audio Stories', 'Classroom Recordings', 'DIY Activity Videos', 'Dance Videos',
    'Educational Videos', 'Interactive Games', 'Learning Animations', 'Music & Sounds',
    'Rhymes Videos', 'Story Videos'
  ]
};

// Class options - Only PlayGroup, Nursery, LKG, UKG
const classOptions = [
  { value: 'all', label: 'All Classes' },
  { value: 'playgroup', label: 'PlayGroup' },
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

// TextOverlay Component - Renders text on document (no controls here)
const TextOverlay = ({ 
  schoolInfo, 
  textPosition, 
  isEditingText, 
  isDraggingText,
  setIsDraggingText,
  handleTextDrag,
  containerRef,
  textElements,
  address
}) => {
  // Handle mouse move at container level for smooth dragging
  useEffect(() => {
    if (!containerRef?.current || !isEditingText) return;
    
    const container = containerRef.current;
    
    const handleMouseMove = (e) => {
      if (isDraggingText) {
        e.preventDefault();
        handleTextDrag(e, container, isDraggingText);
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingText(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingText, isEditingText, containerRef, handleTextDrag, setIsDraggingText]);

  if (!schoolInfo.school_name && !schoolInfo.email && !schoolInfo.contact_number && !address) {
    return null;
  }

  // School name text
  const nameStyle = {
    position: 'absolute',
    left: `${textPosition.name_x}%`,
    top: `${textPosition.name_y}%`,
    transform: `translate(-50%, -50%) rotate(${textPosition.name_rotation}deg)`,
    fontSize: `${textPosition.name_size}px`,
    fontWeight: 'bold',
    color: textPosition.name_color,
    opacity: textPosition.name_opacity,
    fontFamily: textPosition.name_font,
    fontStyle: textPosition.name_style,
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
    fontSize: `${textPosition.contact_size}px`,
    color: textPosition.contact_color,
    opacity: textPosition.contact_opacity,
    fontFamily: textPosition.contact_font,
    fontStyle: textPosition.contact_style,
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
    fontSize: `${textPosition.address_size}px`,
    color: textPosition.address_color,
    opacity: textPosition.address_opacity,
    fontFamily: textPosition.address_font,
    fontStyle: textPosition.address_style,
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
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingText('name');
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
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingText('contact');
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
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingText('address');
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
  isDraggingLogo, 
  setIsDraggingLogo,
  handleLogoDrag,
  containerRef,
  showLogo
}) => {
  const [logoError, setLogoError] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  
  // Reset error state when URL changes
  useEffect(() => {
    if (logoUrl) {
      setLogoError(false);
      setLogoLoaded(false);
    }
  }, [logoUrl]);

  // Handle mouse move at document level for smooth dragging
  useEffect(() => {
    if (!containerRef?.current || !isEditingLogo) return;
    
    const container = containerRef.current;
    
    const handleMouseMove = (e) => {
      if (isDraggingLogo) {
        e.preventDefault();
        handleLogoDrag(e, container);
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingLogo(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLogo, isEditingLogo, containerRef, handleLogoDrag, setIsDraggingLogo]);

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
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingLogo(true);
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
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingLogo(true);
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
      onLoad={() => setLogoLoaded(true)}
      onError={() => {
        console.error('Logo failed to load:', logoUrl);
        setLogoError(true);
      }}
      onMouseDown={(e) => {
        if (isEditingLogo) {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingLogo(true);
        }
      }}
    />
  );
};

const SchoolResourceCategory = ({ user }) => {
  const { category: urlCategory } = useParams();
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
  
  const iframeRef = useRef(null);
  const videoRefs = useRef({});
  const pdfContainerRef = useRef(null);
  const imageContainerRef = useRef(null);
  const docContainerRef = useRef(null);
  
  // Set logo URL immediately from user prop
  useEffect(() => {
  if (user?.logo_path) {
    const fullLogoUrl = getStaticFileUrl(user.logo_path);
    console.log('Initial logoUrl set from user.logo_path:', fullLogoUrl);
    setLogoUrl(fullLogoUrl);
  }
}, [user?.logo_path]);
  
  // Add mouse up event listener for dragging
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingLogo(false);
      setIsDraggingText(null);
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  // Update categoryFilter when urlCategory changes
  useEffect(() => {
    if (urlCategory) {
      setCategoryFilter(urlCategory);
    }
  }, [urlCategory]);
  
  useEffect(() => {
    fetchResources();
    fetchSchoolInfo();
  }, [categoryFilter, subCategoryFilter, subjectFilter, user.school_id]);

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
          sub_category: resource.sub_category || resource.tags || ''
        };
      });
      
      setResources(formattedResources);
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

  const categoryMenuItems = [
    { key: 'academic', label: 'Academic Resources', onClick: () => setCategoryFilter('academic') },
    { key: 'marketing', label: 'Marketing Materials', onClick: () => setCategoryFilter('marketing') },
    { key: 'administrative', label: 'Administrative Resources', onClick: () => setCategoryFilter('administrative') },
    { key: 'training', label: 'Training Resources', onClick: () => setCategoryFilter('training') },
    { key: 'event', label: 'Event & Celebration', onClick: () => setCategoryFilter('event') },
    { key: 'multimedia', label: 'Multimedia Collection', onClick: () => setCategoryFilter('multimedia') },
    { key: 'all', label: 'All Categories', onClick: () => setCategoryFilter('all') }
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

  setTimeout(() => {
    setPreviewLoading(false);
  }, 3000);
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

  const handleDownload = async (record, format = 'image') => {
    try {
      const token = localStorage.getItem('token');
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
      
      message.success(format === 'pdf' ? 'PDF download started with school branding!' : 'Download started with school branding!');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download file: ' + error.message);
    }
  };

  const getDownloadMenuItems = (record) => {
    if (!record) return [];
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

    if (previewLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <LoadingOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <p>Loading preview...</p>
        </div>
      );
    }

    const fileType = previewResource.file_type ? previewResource.file_type.toLowerCase() : '';
    const fileExtension = previewResource.file_path?.split('.').pop()?.toLowerCase() || '';
    const previewUrl = `${API}/resources/${previewResource.resource_id}/preview`;

    // Images
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExtensions.includes(fileExtension) || fileType.includes('image')) {
      return (
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
              isDraggingLogo={isDraggingLogo}
              setIsDraggingLogo={setIsDraggingLogo}
              handleLogoDrag={handleLogoDrag}
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
              setIsDraggingText={setIsDraggingText}
              handleTextDrag={handleTextDrag}
              containerRef={imageContainerRef}
              textElements={textElements}
              address={address}
            />
          )}
        </div>
      );
    }

    // PDFs
    if (fileType.includes('pdf') || fileExtension === 'pdf') {
      return (
        <div ref={pdfContainerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            title={previewResource.name}
            onLoad={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              message.error('Failed to load PDF preview');
            }}
          />
          {categoryFilter !== 'multimedia' && logoUrl && showLogo && (
            <LogoOverlay
              logoUrl={logoUrl}
              logoPosition={logoPosition}
              isEditingLogo={isEditingLogo}
              isDraggingLogo={isDraggingLogo}
              setIsDraggingLogo={setIsDraggingLogo}
              handleLogoDrag={handleLogoDrag}
              containerRef={pdfContainerRef}
              showLogo={showLogo}
            />
          )}
          {categoryFilter !== 'multimedia' && (schoolInfo.school_name || schoolInfo.email || schoolInfo.contact_number || address) && (
            <TextOverlay
              schoolInfo={schoolInfo}
              textPosition={textPosition}
              isEditingText={isEditingText}
              isDraggingText={isDraggingText}
              setIsDraggingText={setIsDraggingText}
              handleTextDrag={handleTextDrag}
              containerRef={pdfContainerRef}
              textElements={textElements}
              address={address}
            />
          )}
        </div>
      );
    }

    // Videos
    if (fileType.includes('video') || ['mp4', 'webm', 'ogg'].includes(fileExtension)) {
      return (
        <div style={{ textAlign: 'center', maxHeight: '600px', overflow: 'auto' }}>
          <video
            ref={el => { if (el && previewResource) videoRefs.current[previewResource.resource_id] = el; }}
            controls
            autoPlay
            preload="metadata"
            style={{ width: '100%', maxHeight: '600px', borderRadius: '8px' }}
            onLoadedMetadata={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              message.error('Failed to load video preview');
            }}
          >
            <source src={previewUrl} type={previewResource.file_type || 'video/mp4'} />
          </video>
        </div>
      );
    }

    // Default fallback
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
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
    const matchesSearch = resource.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchesClass = selectedClass === 'all' || resource.class_level === selectedClass;
    const matchesSubject = subjectFilter === 'all' || resource.subject === subjectFilter;
    const matchesSubCategory = subCategoryFilter === 'all' || resource.sub_category === subCategoryFilter;
    const matchesStatus = selectedStatus === 'all' || resource.display_status === selectedStatus;
    
    return matchesSearch && matchesClass && matchesSubject && matchesSubCategory && matchesStatus;
  });

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
    const fileExtension = fileUrl?.split('.').pop()?.toLowerCase() || '';

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
    if (fileType.includes('video') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(fileExtension)) {
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
          <video
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.7
            }}
            onMouseEnter={(e) => {
              e.target.muted = true;
              e.target.play().catch(err => console.log('Video play error:', err));
            }}
            onMouseLeave={(e) => {
              e.target.pause();
              e.target.currentTime = 0;
            }}
          >
            <source src={fileUrl} type={resource.file_type || 'video/mp4'} />
          </video>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <VideoCameraOutlined style={{ fontSize: '24px', color: 'white' }} />
          </div>
        </div>
      );
    }

    // PDFs
    if (fileType.includes('pdf') || fileExtension === 'pdf') {
      return (
        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          <FilePdfOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
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
      title: 'Resource',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {getFileIcon(record.file_type, 24)}
          <div>
            <div>{text}</div>
            {record.is_own_upload && <Tag color="blue" style={{ marginTop: 4 }}>Your Upload</Tag>}
          </div>
        </Space>
      ),
      width: '25%',
    },
    {
      title: 'Class',
      dataIndex: 'class_level',
      key: 'class_level',
      render: (level) => {
        const classMap = {
          'playgroup': 'PlayGroup',
          'nursery': 'Nursery',
          'lkg': 'LKG',
          'ukg': 'UKG',
          'all': 'All Classes'
        };
        const displayLevel = classMap[level] || level || 'All Classes';
        return <Tag color="blue">{displayLevel}</Tag>;
      },
      width: '10%',
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject) => {
        const subjectMap = {
          'english': 'English',
          'maths': 'Maths',
          'evs': 'EVS',
          'hindi': 'Hindi',
          'arts': 'Arts & Crafts',
          'music': 'Music',
          'pe': 'Physical Education',
          'all': 'All Subjects'
        };
        const displaySubject = subjectMap[subject] || subject || 'All Subjects';
        return <Tag color="green">{displaySubject}</Tag>;
      },
      width: '10%',
    },
    {
      title: 'Sub-category',
      dataIndex: 'sub_category',
      key: 'sub_category',
      render: (sub) => sub ? <Tag color="purple">{sub}</Tag> : '-',
      width: '15%',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => getStatusTag(record),
      width: '12%',
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
      width: '10%',
    },
  ];

  const renderGridView = () => (
    <Row gutter={[16, 16]}>
      {filteredResources.map(resource => {
        const classMap = {
          'playgroup': 'PlayGroup',
          'nursery': 'Nursery',
          'lkg': 'LKG',
          'ukg': 'UKG',
          'all': 'All Classes'
        };
        const subjectMap = {
          'english': 'English',
          'maths': 'Maths',
          'evs': 'EVS',
          'hindi': 'Hindi',
          'arts': 'Arts & Crafts',
          'music': 'Music',
          'pe': 'Physical Education',
          'all': 'All Subjects'
        };
        
        return (
          <Col xs={24} sm={12} md={8} lg={6} key={resource.key}>
            <Card
              hoverable
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              cover={
                <div style={{ cursor: 'pointer' }} onClick={() => handlePreview(resource)}>
                  {renderThumbnail(resource)}
                  {resource.is_own_upload && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
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
                  <Tag color="blue">{classMap[resource.class_level] || resource.class_level || 'All Classes'}</Tag>
                  <Tag color="green">{subjectMap[resource.subject] || resource.subject || 'All Subjects'}</Tag>
                  {resource.sub_category && <Tag color="purple">{resource.sub_category}</Tag>}
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
    if (category === 'all') return 'All Resources';
    const names = {
      academic: 'Academic Resources',
      marketing: 'Marketing Materials',
      administrative: 'Administrative Resources',
      training: 'Training Resources',
      event: 'Event & Celebration',
      multimedia: 'Multimedia Collection'
    };
    return names[category] || category;
  };

  const getCategoryDescription = (category) => {
    const descriptions = {
      academic: 'Worksheets, lesson plans, assessments, and teaching materials',
      marketing: 'Posters, flyers, banners, and promotional content',
      administrative: 'Forms, templates, and policy documents',
      training: 'Teacher training modules and professional development',
      event: 'Event plans, celebration materials, and certificates',
      multimedia: 'Videos, audio, and interactive content',
      all: 'Browse all resource categories'
    };
    return descriptions[category] || `Manage ${category} resources`;
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
              <Option value="all">All Classes</Option>
              <Option value="playgroup">PlayGroup</Option>
              <Option value="nursery">Nursery</Option>
              <Option value="lkg">LKG</Option>
              <Option value="ukg">UKG</Option>
            </Select>
            
            {/* Subject Filter */}
            <Select
              value={subjectFilter}
              onChange={setSubjectFilter}
              style={{ width: 150 }}
              placeholder="Filter by subject"
            >
              <Option value="all">All Subjects</Option>
              <Option value="english">English</Option>
              <Option value="maths">Maths</Option>
              <Option value="evs">EVS</Option>
              <Option value="hindi">Hindi</Option>
              <Option value="arts">Arts & Crafts</Option>
              <Option value="music">Music</Option>
              <Option value="pe">Physical Education</Option>
            </Select>
            
            {/* Sub-category Filter */}
            <Select
              value={subCategoryFilter}
              onChange={setSubCategoryFilter}
              style={{ width: 180 }}
              placeholder="Filter by sub-category"
              allowClear
            >
              <Option value="all">All Sub-categories</Option>
              {(subCategoryMap[categoryFilter] || []).map(sub => (
                <Option key={sub} value={sub}>{sub}</Option>
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
          setIsDraggingText(null);
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
