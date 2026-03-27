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
  AudioOutlined, AppstoreOutlined, UnorderedListOutlined, FileTextOutlined,
  LoadingOutlined, UploadOutlined, ClockCircleOutlined,
  EditOutlined, SaveOutlined, UndoOutlined, ExpandOutlined,
  MinusOutlined, PlusOutlined, EyeInvisibleOutlined,
  MailOutlined, PhoneOutlined, UserOutlined, DownOutlined
} from '@ant-design/icons';
import axios from 'axios';
import FilterBar from '../../components/FilterBar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const { Option } = Select;
const { TextArea } = Input;

// Sub-category mapping for all categories
const subCategoryMap = {
  academic: [
    'Worksheets', 'Lesson Plans', 'Assessments', 'Activity Sheets', 'Flashcards',
    'Story-based Learning', 'Rhymes & Poems', 'Handwriting Practice', 
    'Phonics Materials', 'Number & Counting Activities'
  ],
  marketing: [
    'Posters', 'Flyers', 'Brochures', 'Banners', 'Social Media Posts',
    'Admission Campaign Designs', 'Video Ads', 'Email Templates', 'Pamphlets', 'Standee Designs'
  ],
  administrative: [
    'Admission Forms', 'Student Records Templates', 'Attendance Sheets', 
    'Fee Management Sheets', 'Report Cards', 'Circulars & Notices', 'ID Cards',
    'Certificates', 'Staff Records', 'Policy Documents'
  ],
  training: [
    'Teacher Training Modules', 'Classroom Management Guides', 'Activity Training Videos',
    'Child Psychology Basics', 'Teaching Methods', 'Safety Training', 'First Aid Guides',
    'Lesson Delivery Techniques', 'Parent Communication Training', 'Skill Development Programs'
  ],
  event: [
    'Annual Day सामग्री', 'Festival Celebrations', 'Sports Day', 'Fancy Dress Ideas',
    'Competition Materials', 'Invitation Cards', 'Stage Scripts', 'Decoration Ideas',
    'Activity Plans', 'Certificates & Awards'
  ],
  multimedia: [
    'Educational Videos', 'Rhymes Videos', 'Story Videos', 'Audio Stories',
    'Learning Animations', 'Interactive Games', 'Classroom Recordings', 
    'DIY Activity Videos', 'Dance Videos', 'Music & Sounds'
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

// TextOverlay Component for school name and contact info
const TextOverlay = ({ 
  schoolInfo, 
  textPosition, 
  isEditingText, 
  isDraggingText,
  setIsDraggingText,
  handleTextDrag,
  showControls,
  handleTextResize,
  handleTextOpacityChange,
  containerRef,
  activeElement
}) => {
  if (!schoolInfo.school_name && !schoolInfo.email && !schoolInfo.contact_number) {
    return null;
  }

  const renderTextElement = (type, text, x, y, size, opacity) => {
    const style = {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      fontSize: `${size}px`,
      color: `rgba(0, 0, 0, ${opacity})`,
      fontWeight: type === 'name' ? 'bold' : 'normal',
      pointerEvents: isEditingText ? 'auto' : 'none',
      zIndex: 3,
      cursor: isEditingText ? (isDraggingText && activeElement === type ? 'grabbing' : 'grab') : 'default',
      textAlign: 'center',
      backgroundColor: isEditingText ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
      padding: isEditingText ? '4px 8px' : '0',
      borderRadius: isEditingText ? '4px' : '0',
      border: isEditingText ? '2px dashed #1890ff' : 'none',
      whiteSpace: 'nowrap'
    };

    if (type === 'name') {
      return (
        <div
          style={style}
          onMouseDown={() => isEditingText && setIsDraggingText(type)}
          onMouseUp={() => setIsDraggingText(null)}
          onMouseLeave={() => setIsDraggingText(null)}
          onMouseMove={(e) => containerRef?.current && handleTextDrag(e, containerRef.current, type)}
        >
          {text}
        </div>
      );
    } else if (type === 'contact') {
      return (
        <div
          style={style}
          onMouseDown={() => isEditingText && setIsDraggingText(type)}
          onMouseUp={() => setIsDraggingText(null)}
          onMouseLeave={() => setIsDraggingText(null)}
          onMouseMove={(e) => containerRef?.current && handleTextDrag(e, containerRef.current, type)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {schoolInfo.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MailOutlined style={{ fontSize: `${size - 4}px` }} />
                <span>{schoolInfo.email}</span>
              </div>
            )}
            {schoolInfo.contact_number && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PhoneOutlined style={{ fontSize: `${size - 4}px` }} />
                <span>{schoolInfo.contact_number}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      {schoolInfo.school_name && renderTextElement(
        'name',
        schoolInfo.school_name,
        textPosition.name_x,
        textPosition.name_y,
        textPosition.name_size,
        textPosition.name_opacity
      )}
      
      {(schoolInfo.email || schoolInfo.contact_number) && renderTextElement(
        'contact',
        '',
        textPosition.contact_x,
        textPosition.contact_y,
        textPosition.contact_size,
        textPosition.contact_opacity
      )}
      
      {isEditingText && showControls && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255,255,255,0.9)',
          padding: '10px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 4,
          width: '220px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
            Text Watermark Controls
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
            Drag text to reposition, use buttons to adjust size/opacity
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', marginBottom: '4px' }}>School Name:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px' }}>Size:</span>
              <Button 
                size="small" 
                icon={<MinusOutlined />}
                onClick={() => handleTextResize('name', -2)}
                disabled={textPosition.name_size <= 8}
              />
              <span style={{ fontSize: '10px', minWidth: '20px', textAlign: 'center' }}>
                {textPosition.name_size}
              </span>
              <Button 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => handleTextResize('name', 2)}
                disabled={textPosition.name_size >= 40}
              />
              <Button 
                size="small" 
                icon={<EyeInvisibleOutlined />}
                onClick={() => handleTextOpacityChange('name', -0.1)}
                disabled={textPosition.name_opacity <= 0.1}
              />
              <span style={{ fontSize: '10px', minWidth: '20px', textAlign: 'center' }}>
                {(textPosition.name_opacity * 100).toFixed(0)}%
              </span>
              <Button 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => handleTextOpacityChange('name', 0.1)}
                disabled={textPosition.name_opacity >= 1.0}
              />
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '11px', marginBottom: '4px' }}>Contact Info:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px' }}>Size:</span>
              <Button 
                size="small" 
                icon={<MinusOutlined />}
                onClick={() => handleTextResize('contact', -1)}
                disabled={textPosition.contact_size <= 8}
              />
              <span style={{ fontSize: '10px', minWidth: '20px', textAlign: 'center' }}>
                {textPosition.contact_size}
              </span>
              <Button 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => handleTextResize('contact', 1)}
                disabled={textPosition.contact_size >= 20}
              />
              <Button 
                size="small" 
                icon={<EyeInvisibleOutlined />}
                onClick={() => handleTextOpacityChange('contact', -0.1)}
                disabled={textPosition.contact_opacity <= 0.1}
              />
              <span style={{ fontSize: '10px', minWidth: '20px', textAlign: 'center' }}>
                {(textPosition.contact_opacity * 100).toFixed(0)}%
              </span>
              <Button 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => handleTextOpacityChange('contact', 0.1)}
                disabled={textPosition.contact_opacity >= 1.0}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// LogoOverlay Component
const LogoOverlay = ({ 
  logoUrl, 
  logoPosition, 
  isEditingLogo, 
  isDraggingLogo, 
  setIsDraggingLogo,
  handleLogoDrag,
  showControls,
  handleLogoResize,
  handleLogoOpacityChange,
  containerRef
}) => {
  const logoStyle = {
    position: 'absolute',
    left: `${logoPosition.x}%`,
    top: `${logoPosition.y}%`,
    width: `${logoPosition.width}%`,
    opacity: logoPosition.opacity,
    transform: 'translate(-50%, -50%)',
    pointerEvents: isEditingLogo ? 'auto' : 'none',
    zIndex: 2,
    transition: isDraggingLogo ? 'none' : 'all 0.2s ease',
    cursor: isEditingLogo ? (isDraggingLogo ? 'grabbing' : 'grab') : 'default',
    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
    maxWidth: '150px',
    maxHeight: '80px',
    objectFit: 'contain'
  };

  return (
    <>
      <img
        src={logoUrl}
        alt="School Logo"
        style={logoStyle}
        draggable={false}
        onMouseDown={() => isEditingLogo && setIsDraggingLogo(true)}
        onMouseUp={() => setIsDraggingLogo(false)}
        onMouseLeave={() => setIsDraggingLogo(false)}
        onMouseMove={(e) => containerRef?.current && handleLogoDrag(e, containerRef.current)}
      />
      
      {isEditingLogo && showControls && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255,255,255,0.9)',
          padding: '10px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 3
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
            Logo Controls
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
            Drag to reposition, use buttons to adjust
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '8px' 
          }}>
            <span style={{ fontSize: '11px' }}>Size:</span>
            <Button 
              size="small" 
              icon={<MinusOutlined />} 
              onClick={() => handleLogoResize(-5)}
              disabled={logoPosition.width <= 5}
            />
            <span style={{ fontSize: '11px', minWidth: '30px', textAlign: 'center' }}>
              {logoPosition.width}%
            </span>
            <Button 
              size="small" 
              icon={<PlusOutlined />} 
              onClick={() => handleLogoResize(5)}
              disabled={logoPosition.width >= 50}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <span style={{ fontSize: '11px' }}>Opacity:</span>
            <Button 
              size="small" 
              icon={<EyeInvisibleOutlined />} 
              onClick={() => handleLogoOpacityChange(-0.1)}
              disabled={logoPosition.opacity <= 0.1}
            />
            <span style={{ fontSize: '11px', minWidth: '30px', textAlign: 'center' }}>
              {(logoPosition.opacity * 100).toFixed(0)}%
            </span>
            <Button 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => handleLogoOpacityChange(0.1)}
              disabled={logoPosition.opacity >= 1.0}
            />
          </div>
        </div>
      )}
    </>
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
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 10, width: 20, opacity: 0.7 });
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [showLogoControls, setShowLogoControls] = useState(true);
  const [positionLoading, setPositionLoading] = useState(false);
  const [isDefaultPosition, setIsDefaultPosition] = useState(true);
  
  // Text watermark states
  const [textPosition, setTextPosition] = useState({
    name_x: 50, name_y: 25, name_size: 20, name_opacity: 0.8,
    contact_x: 50, contact_y: 90, contact_size: 12, contact_opacity: 0.7
  });
  const [isEditingText, setIsEditingText] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(null);
  const [isDefaultText, setIsDefaultText] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState({});
  
  const iframeRef = useRef(null);
  const videoRefs = useRef({});
  const pdfContainerRef = useRef(null);
  const imageContainerRef = useRef(null);
  const docContainerRef = useRef(null);
  
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
      
      const response = await axios.get(`${API}/school/resources`, { params });
      
      const formattedResources = response.data.map((resource, index) => {
        let file_path = resource.file_path;
        
        if (file_path) {
          if (file_path.startsWith('http')) {
            // Already a full URL
          } else if (file_path.startsWith('/')) {
            file_path = `${BACKEND_URL}${file_path}`;
          } else {
            if (file_path.includes('uploads/')) {
              file_path = `${BACKEND_URL}/${file_path}`;
            } else {
              file_path = `${BACKEND_URL}/uploads/${file_path.replace(/^\/uploads\//, '')}`;
            }
          }
        }
        
        const isOwnUpload = resource.uploaded_by_id === user.school_id;
        
        return {
          ...resource,
          key: resource.resource_id || resource.id || `resource-${index}`,
          file_path: file_path,
          is_own_upload: isOwnUpload,
          display_status: isOwnUpload ? resource.approval_status : 'approved'
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
      const response = await axios.get(`${API}/admin/schools`);
      const schoolData = response.data.find(s => s.school_id === user.school_id);
      if (schoolData) {
        setSchoolInfo({
          school_name: schoolData.school_name,
          email: schoolData.email,
          contact_number: schoolData.contact_number
        });
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
      setSchoolInfo({
        school_name: user.name,
        email: user.email,
        contact_number: null
      });
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
      formData.append('sub_category', values.sub_category || '');
      formData.append('school_id', user.school_id);
      formData.append('school_name', user.name);
      formData.append('description', values.description || '');
      formData.append('class_level', values.class_level || 'all');
      formData.append('subject', values.subject || 'all');
      formData.append('tags', values.tags ? values.tags.join(',') : '');

      setUploading(true);
      await axios.post(`${API}/school/resources/upload`, formData, {
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
      const response = await axios.get(`${API}/school/logo-position/${resourceId}`, {
        params: { school_id: user.school_id }
      });
      
      setLogoPosition({
        x: response.data.x_position,
        y: response.data.y_position,
        width: response.data.width,
        opacity: response.data.opacity
      });
      setIsDefaultPosition(response.data.is_default);
      
      if (user.logo_path) {
        const fullLogoUrl = user.logo_path.startsWith('http') 
          ? user.logo_path 
          : `${BACKEND_URL}${user.logo_path}`;
        setLogoUrl(fullLogoUrl);
      }
    } catch (error) {
      console.error('Error fetching logo position:', error);
      setLogoPosition({ x: 50, y: 10, width: 20, opacity: 0.7 });
      setIsDefaultPosition(true);
    } finally {
      setPositionLoading(false);
    }
  };

  const fetchTextPosition = async (resourceId) => {
    if (!resourceId || categoryFilter === 'multimedia') return;
    
    try {
      const response = await axios.get(`${API}/school/text-watermark/${resourceId}`, {
        params: { school_id: user.school_id }
      });
      
      setTextPosition({
        name_x: response.data.name_x,
        name_y: response.data.name_y,
        name_size: response.data.name_size,
        name_opacity: response.data.name_opacity,
        contact_x: response.data.contact_x,
        contact_y: response.data.contact_y,
        contact_size: response.data.contact_size,
        contact_opacity: response.data.contact_opacity
      });
      setIsDefaultText(response.data.is_default);
    } catch (error) {
      console.error('Error fetching text position:', error);
      setTextPosition({
        name_x: 50, name_y: 25, name_size: 20, name_opacity: 0.8,
        contact_x: 50, contact_y: 90, contact_size: 12, contact_opacity: 0.7
      });
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
      
      await axios.post(`${API}/school/logo-position`, formData, {
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
      const formData = new FormData();
      formData.append('school_id', user.school_id);
      formData.append('resource_id', previewResource.resource_id);
      formData.append('name_x', Math.round(textPosition.name_x).toString());
      formData.append('name_y', Math.round(textPosition.name_y).toString());
      formData.append('name_size', textPosition.name_size.toString());
      formData.append('name_opacity', textPosition.name_opacity.toFixed(2));
      formData.append('contact_x', Math.round(textPosition.contact_x).toString());
      formData.append('contact_y', Math.round(textPosition.contact_y).toString());
      formData.append('contact_size', textPosition.contact_size.toString());
      formData.append('contact_opacity', textPosition.contact_opacity.toFixed(2));
      
      await axios.post(`${API}/school/text-watermark`, formData);
      
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
      await axios.delete(`${API}/school/logo-position/${previewResource.resource_id}`, {
        params: { school_id: user.school_id }
      });
      
      setLogoPosition({ x: 50, y: 10, width: 20, opacity: 0.7 });
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
        name_x: 50, name_y: 25, name_size: 20, name_opacity: 0.8,
        contact_x: 50, contact_y: 90, contact_size: 12, contact_opacity: 0.7
      });
      setIsDefaultText(true);
      setIsEditingText(false);
      message.success('Text watermark position reset to default');
    } catch (error) {
      console.error('Error resetting text position:', error);
      message.error('Failed to reset text position');
    }
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
    }
  };

  const handleDownload = async (record) => {
    try {
      const token = localStorage.getItem('token');
      const downloadUrl = `${API}/resources/${record.resource_id}/download-with-logo`;
      const urlWithParams = new URL(downloadUrl);
      urlWithParams.searchParams.append('school_id', user.school_id);
      urlWithParams.searchParams.append('school_name', user.name);
      
      const response = await fetch(urlWithParams.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/octet-stream'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = record.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      message.success('Download started with school branding!');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download file');
    }
  };

  const handlePreview = async (record) => {
    setPreviewResource(record);
    setPreviewLoading(true);
    setIsPreviewModalVisible(true);

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
        <div ref={imageContainerRef} style={{ textAlign: 'center', height: '100%', width: '100%', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={previewUrl}
            alt={previewResource.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onLoad={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              message.error('Failed to load image preview');
            }}
          />
          {categoryFilter !== 'multimedia' && logoUrl && (
            <LogoOverlay
              logoUrl={logoUrl}
              logoPosition={logoPosition}
              isEditingLogo={isEditingLogo}
              isDraggingLogo={isDraggingLogo}
              setIsDraggingLogo={setIsDraggingLogo}
              handleLogoDrag={handleLogoDrag}
              showControls={showLogoControls}
              handleLogoResize={handleLogoResize}
              handleLogoOpacityChange={handleLogoOpacityChange}
              containerRef={imageContainerRef}
            />
          )}
          {categoryFilter !== 'multimedia' && (schoolInfo.school_name || schoolInfo.email || schoolInfo.contact_number) && (
            <TextOverlay
              schoolInfo={schoolInfo}
              textPosition={textPosition}
              isEditingText={isEditingText}
              isDraggingText={isDraggingText}
              setIsDraggingText={setIsDraggingText}
              handleTextDrag={handleTextDrag}
              showControls={showLogoControls}
              handleTextResize={handleTextResize}
              handleTextOpacityChange={handleTextOpacityChange}
              containerRef={imageContainerRef}
              activeElement={isDraggingText}
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
          {categoryFilter !== 'multimedia' && logoUrl && (
            <LogoOverlay
              logoUrl={logoUrl}
              logoPosition={logoPosition}
              isEditingLogo={isEditingLogo}
              isDraggingLogo={isDraggingLogo}
              setIsDraggingLogo={setIsDraggingLogo}
              handleLogoDrag={handleLogoDrag}
              showControls={showLogoControls}
              handleLogoResize={handleLogoResize}
              handleLogoOpacityChange={handleLogoOpacityChange}
              containerRef={pdfContainerRef}
            />
          )}
          {categoryFilter !== 'multimedia' && (schoolInfo.school_name || schoolInfo.email || schoolInfo.contact_number) && (
            <TextOverlay
              schoolInfo={schoolInfo}
              textPosition={textPosition}
              isEditingText={isEditingText}
              isDraggingText={isDraggingText}
              setIsDraggingText={setIsDraggingText}
              handleTextDrag={handleTextDrag}
              showControls={showLogoControls}
              handleTextResize={handleTextResize}
              handleTextOpacityChange={handleTextOpacityChange}
              containerRef={pdfContainerRef}
              activeElement={isDraggingText}
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
        <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(previewResource)}>
          Download File
        </Button>
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
        <div style={{ height: '150px', overflow: 'hidden', background: '#f5f5f5' }}>
          <img
            src={fileUrl}
            alt={resource.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
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
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              onClick={() => handleDownload(record)}
              disabled={record.is_own_upload && record.display_status !== 'approved'}
            />
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
                  <DownloadOutlined 
                    onClick={() => handleDownload(resource)}
                    style={resource.is_own_upload && resource.display_status !== 'approved' ? { color: '#d9d9d9', cursor: 'not-allowed' } : {}}
                  />
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
              <Button>
                {getCategoryDisplayName(categoryFilter)}
                <DownOutlined style={{ marginLeft: '8px' }} />
              </Button>
            </Dropdown>
            
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              Upload Resource
            </Button>
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
              <Button type="primary" onClick={() => setIsModalVisible(true)}>Upload Your First Resource</Button>
            </div>
          )
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Upload Resource"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Resource Name" rules={[{ required: true, message: 'Please enter resource name' }]}>
            <Input placeholder="Enter resource name" />
          </Form.Item>

          <Form.Item name="file" label="Select File" rules={[{ required: true, message: 'Please select a file' }]}>
            <Upload
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
              fileList={fileList}
              maxCount={1}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.mp3,.wav,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            >
              <Button icon={<UploadOutlined />}>Select File (Max 100MB)</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="class_level" label="Class Level" initialValue="all">
            <Select>
              <Option value="all">All Classes</Option>
              <Option value="playgroup">PlayGroup</Option>
              <Option value="nursery">Nursery</Option>
              <Option value="lkg">LKG</Option>
              <Option value="ukg">UKG</Option>
            </Select>
          </Form.Item>

          <Form.Item name="subject" label="Subject" initialValue="all">
            <Select>
              <Option value="all">All Subjects</Option>
              <Option value="english">English</Option>
              <Option value="maths">Maths</Option>
              <Option value="evs">EVS</Option>
              <Option value="hindi">Hindi</Option>
              <Option value="arts">Arts & Crafts</Option>
              <Option value="music">Music</Option>
              <Option value="pe">Physical Education</Option>
            </Select>
          </Form.Item>

          <Form.Item name="sub_category" label="Sub-category">
            <Select allowClear placeholder="Select sub-category">
              {(subCategoryMap[categoryFilter] || []).map(sub => (
                <Option key={sub} value={sub}>{sub}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" placeholder="Add tags (press Enter to add)" style={{ width: '100%' }}>
              <Option value="worksheet">Worksheet</Option>
              <Option value="activity">Activity</Option>
              <Option value="printable">Printable</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Enter a brief description" maxLength={500} showCount />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleUpload} loading={uploading} disabled={fileList.length === 0}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <Button onClick={() => { setIsModalVisible(false); form.resetFields(); setFileList([]); }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

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
          categoryFilter !== 'multimedia' && logoUrl && (
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
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(previewResource)}
            disabled={previewResource?.is_own_upload && previewResource?.display_status !== 'approved'}
          >
            Download with branding
          </Button>
        ].filter(Boolean)}
        width="90%"
        bodyStyle={{ padding: 0, height: '70vh', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        {renderPreview()}
      </Modal>
    </div>
  );
};

export default SchoolResourceCategory;