import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Input, 
  Select, 
  Modal, 
  message, 
  Upload, 
  Tag, 
  Popconfirm, 
  Dropdown, 
  Menu,
  Form,
  Checkbox,
  Divider,
  Tooltip,
  Row,
  Col,
  Badge,
  Radio
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  UploadOutlined,
  DownloadOutlined,
  FileOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePowerpointOutlined,
  FileZipOutlined,
  FileTextOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  FolderOutlined,
  FileUnknownOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  LoadingOutlined
} from '@ant-design/icons';

import axios from 'axios';
import api from '../../api/axiosConfig';
import config from '../../config';

const BACKEND_URL = config.apiBaseUrl;
const API = `${BACKEND_URL}/api`;
const VIDEO_LINK_DOMAINS = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'bilibili.com'];

const { Option } = Select;
const { TextArea } = Input;

const isKnownVideoLink = (filePath = '') => {
  if (!filePath) return false;

  const normalizedPath = filePath.toLowerCase();
  return VIDEO_LINK_DOMAINS.some((domain) => normalizedPath.includes(domain));
};

const isVideoLinkResource = (resource) => {
  if (!resource) return false;
  return resource.is_video_link === true || resource.is_video_link === 'true' || isKnownVideoLink(resource.file_path);
};

// VideoThumbnail component for handling uploaded video thumbnails
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
        const nextThumbnailSrc = canvas.toDataURL('image/jpeg', 0.82);

        setThumbnailSrc(nextThumbnailSrc);
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

// Category definitions with descriptions
const CATEGORY_CONFIG = {
  'all': {
    title: 'All Categories',
    description: 'All resource categories',
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

const AdminResourceCategory = ({ category, subCategory, title, description }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewResource, setPreviewResource] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [uploadType, setUploadType] = useState('file'); // 'file' or 'link'
  const [videoLink, setVideoLink] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [namingOption, setNamingOption] = useState('auto'); // 'auto' or 'original'
  const [categoryFilter, setCategoryFilter] = useState(category || 'all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [editForm] = Form.useForm();
  const [editFileList, setEditFileList] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const iframeRef = useRef(null);
  const videoRefs = useRef({});

  useEffect(() => {
    setCategoryFilter(category || 'all');
    setSubCategoryFilter(subCategory || 'all');
  }, [category, subCategory]);

  useEffect(() => {
    fetchResources();
  }, [categoryFilter, subCategoryFilter, selectedClass, selectedSubject, statusFilter]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = {};
      
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      
      // Add sub-category filter if not 'all'
      if (subCategoryFilter !== 'all') {
        params.sub_category = subCategoryFilter;
      }
      
      // Add class filter if not 'all'
      if (selectedClass !== 'all') {
        params.class_level = selectedClass;
      }
      
      // Add subject filter if not 'all'
      if (selectedSubject !== 'all') {
        params.subject = selectedSubject;
      }
      
      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.approval_status = statusFilter;
      }
      
      const response = await api.get('/admin/resources', { params });
      
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
        
        return {
          ...resource,
          key: resource.resource_id || resource.id || `resource-${index}`,
          file_path: file_path,
          sub_category: resource.sub_category || resource.tags || '',
          subject: resource.subject || '',
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

  // Get current category info
  const getCategoryInfo = () => {
    return CATEGORY_CONFIG[categoryFilter] || { 
      title: categoryFilter, 
      description: '',
      subcategories: {}
    };
  };

  const categoryInfo = getCategoryInfo();

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

  // Create sub-category filter dropdown items
  const subCategoryFilterItems = Object.entries(categoryInfo.subcategories || {}).map(([key, label]) => ({
    key: key,
    label: (
      <div style={{ minWidth: '200px', padding: '6px 0' }}>
        <div style={{ fontWeight: 'normal', fontSize: '14px' }}>{label}</div>
      </div>
    ),
    onClick: () => setSubCategoryFilter(key)
  }));

  const handleUpload = async () => {
    // Validate based on upload type
    if (uploadType === 'file' && fileList.length === 0) {
      message.warning('Please select at least one file to upload');
      return;
    }
    
    if (uploadType === 'link' && !videoLink) {
      message.warning('Please enter a video link');
      return;
    }

    try {
      const values = await form.validateFields();

      if (uploadType === 'file') {
        // Handle file upload (existing logic)
        const formData = new FormData();
        
        // Append all selected files
        fileList.forEach((file) => {
          formData.append('files', file.originFileObj);
        });
        
        formData.append('name', values.name);
        formData.append('category', categoryFilter);
        formData.append('sub_category', values.sub_category || '');
        formData.append('description', values.description || '');
        formData.append('class_level', values.class_level || '');
        formData.append('subject', values.subject || '');
        formData.append('tags', values.tags ? values.tags.join(',') : '');
        formData.append('naming_option', namingOption);

        setUploading(true);
        const response = await api.post('/admin/resources/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const uploadedCount = response.data.length;
        message.success(`${uploadedCount} resource(s) uploaded successfully!`);
      } else {
        // Handle video link upload - send as form data
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('category', categoryFilter);
        formData.append('sub_category', values.sub_category || '');
        formData.append('description', values.description || '');
        formData.append('class_level', values.class_level || '');
        formData.append('subject', values.subject || '');
        formData.append('tags', values.tags ? values.tags.join(',') : '');
        formData.append('file_path', videoLink);
        formData.append('file_type', 'video/mp4'); // Default video type for links
        formData.append('file_size', '0'); // No file size for links
        formData.append('is_video_link', 'true');

        setUploading(true);
        const response = await api.post('/admin/resources/upload-link', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Video link uploaded successfully!');
      }

      form.resetFields();
      setFileList([]);
      setVideoLink('');
      setUploadType('file');
      setIsModalVisible(false);
      fetchResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      // Handle validation errors properly
      let errorMessage = 'Failed to upload resource';
      
      if (error.response?.status === 422) {
        // Validation error - extract the actual message
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : 'Validation error occurred';
        } else if (errorData?.msg) {
          errorMessage = errorData.msg;
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId) => {
    try {
      await api.delete(`/admin/resources/${resourceId}`);
      message.success('Resource deleted successfully');
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      message.error('Failed to delete resource');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one resource to delete');
      return;
    }

    Modal.confirm({
      title: 'Delete Selected Resources',
      content: `Are you sure you want to delete ${selectedRowKeys.length} selected resource(s)? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setDeleteLoading(true);
          const response = await api.delete('/admin/resources/bulk', {
            data: { resource_ids: selectedRowKeys }
          });

          const { deleted_count, errors } = response.data;
          
          if (deleted_count > 0) {
            message.success(`${deleted_count} resource(s) deleted successfully`);
          }
          
          if (errors && errors.length > 0) {
            message.warning(`${errors.length} resource(s) could not be deleted`);
          }
          
          setSelectedRowKeys([]);
          fetchResources();
        } catch (error) {
          console.error('Error bulk deleting resources:', error);
          message.error(error.response?.data?.detail || 'Failed to delete resources');
        } finally {
          setDeleteLoading(false);
        }
      }
    });
  };

  const handleDeleteAll = async () => {
    const currentResources = resources.length;
    
    if (currentResources === 0) {
      message.warning('No resources to delete');
      return;
    }

    Modal.confirm({
      title: 'Delete All Resources',
      content: `Are you sure you want to delete all ${currentResources} resource(s) in ${categoryInfo.title}? This action cannot be undone.`,
      okText: 'Delete All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setDeleteLoading(true);
          const params = categoryFilter !== 'all' ? { category: categoryFilter } : {};
          const response = await api.delete('/admin/resources/all', { 
            params
          });

          const { deleted_count, errors } = response.data;
          
          if (deleted_count > 0) {
            message.success(`${deleted_count} resource(s) deleted successfully`);
          }
          
          if (errors && errors.length > 0) {
            message.warning(`${errors.length} resource(s) could not be deleted`);
          }
          
          setSelectedRowKeys([]);
          fetchResources();
        } catch (error) {
          console.error('Error deleting all resources:', error);
          message.error(error.response?.data?.detail || 'Failed to delete resources');
        } finally {
          setDeleteLoading(false);
        }
      }
    });
  };

  const updateResourceStatus = async (resourceId, status) => {
    try {
      await api.put(`/admin/resources/${resourceId}/${status === 'approved' ? 'approve' : 'reject'}`);
      message.success(`Resource ${status} successfully`);
      fetchResources();
    } catch (error) {
      console.error(`Error ${status} resource:`, error);
      message.error(`Failed to ${status} resource`);
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

  const handleDownload = async (record, format = 'image') => {
    try {
      // For video links, open the original URL directly
      const isVideoLink = isVideoLinkResource(record);
      
      if (isVideoLink) {
        const downloadLink = document.createElement('a');
        downloadLink.href = record.file_path;
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener noreferrer';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Update download count in UI
        setResources(prevResources =>
          prevResources.map(res =>
            res.resource_id === record.resource_id
              ? { ...res, download_count: (res.download_count || 0) + 1 }
              : res
          )
        );
        
        message.success('Opening video link...');
        return;
      }
      
      const token = sessionStorage.getItem('token');
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      
      // Create the download URL
      const downloadUrl = `${API}/resources/${record.resource_id}/download`;
      
      // Add school info if available
      const urlWithParams = new URL(downloadUrl);
      if (user.school_id) urlWithParams.searchParams.append('school_id', user.school_id);
      if (user.school_name) urlWithParams.searchParams.append('school_name', user.school_name);
      if (format === 'pdf') urlWithParams.searchParams.append('format', 'pdf');
      
      console.log('Download URL:', urlWithParams.toString());
      
      // Create a temporary link element for downloading
      const downloadLink = document.createElement('a');
      
      try {
        // Try to download using fetch API first
        const response = await fetch(urlWithParams.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/octet-stream',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, message: ${response.statusText}`);
        }

        // Get the blob and create a local URL
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Received empty file');
        }
        
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Set up the download link
        downloadLink.href = blobUrl;
        
        // Get filename from response headers or use record name
        const contentDisposition = response.headers.get('content-disposition');
        let filename = record.name || 'download';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          }
        }
        
        // Add file extension if missing
        if (!filename.includes('.')) {
          const fileExtension = record.file_type?.split('/').pop() || 
                               record.file_path?.split('.').pop() || 
                               '';
          if (fileExtension) {
            filename = `${filename}.${fileExtension}`;
          }
        }
        
        downloadLink.download = filename;
        downloadLink.rel = 'noopener noreferrer';
        
        // Trigger the download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(downloadLink);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
        
        // Update download count in UI immediately
        setResources(prevResources =>
          prevResources.map(res =>
            res.resource_id === record.resource_id
              ? { ...res, download_count: (res.download_count || 0) + 1 }
              : res
          )
        );
        
        message.success(format === 'pdf' ? 'PDF download started!' : 'Download started!');
      } catch (fetchError) {
        console.error('Error downloading via fetch:', fetchError);
        
        // Fallback: open in new tab
        window.open(urlWithParams.toString(), '_blank', 'noopener,noreferrer');
        
        // Still try to update the UI count
        setResources(prevResources =>
          prevResources.map(res =>
            res.resource_id === record.resource_id
              ? { ...res, download_count: (res.download_count || 0) + 1 }
              : res
          )
        );
        
        message.info(format === 'pdf' ? 'Opening PDF download in new tab...' : 'Opening download in new tab...');
      }
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download resource');
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setIsEditModalVisible(true);
    editForm.setFieldsValue({
      name: resource.name || '',
      description: resource.description || '',
      sub_category: resource.sub_category || undefined,
      class_level: resource.class_level || undefined,
      tags: resource.tags ? resource.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
    });
    setEditFileList([]);
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingResource(null);
    editForm.resetFields();
    setEditFileList([]);
  };

  const handleEditFileChange = ({ fileList }) => {
    setEditFileList(fileList.slice(-1));
  };

  const handleEditSubmit = async () => {
    if (!editingResource) return;

    try {
      const values = await editForm.validateFields();

      const formData = new FormData();
      if (values.name !== undefined) formData.append('name', values.name);
      if (values.description !== undefined) formData.append('description', values.description || '');
      if (values.class_level !== undefined) formData.append('class_level', values.class_level || '');
      if (values.sub_category !== undefined) formData.append('sub_category', values.sub_category || '');
      if (values.tags !== undefined) {
        formData.append('tags', Array.isArray(values.tags) ? values.tags.join(',') : values.tags || '');
      }

      if (editFileList.length > 0 && editFileList[0].originFileObj) {
        formData.append('file', editFileList[0].originFileObj);
      }

      setUploading(true);
      await api.put(`/admin/resources/${editingResource.resource_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Resource updated successfully');
      handleEditCancel();
      fetchResources();
    } catch (error) {
      console.error('Error updating resource:', error);
      message.error(error.response?.data?.detail || 'Failed to update resource');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = (resource) => {
    setPreviewResource(resource);
    setPreviewLoading(true);
    setIsPreviewModalVisible(true);
    setTimeout(() => setPreviewLoading(false), 1500);
  };

  const getDownloadMenuItems = (record) => {
    if (!record) return [];
    return [
      {
        key: 'original',
        label: 'Download Original',
        onClick: () => handleDownload(record, 'image')
      },
      {
        key: 'pdf',
        label: 'Download PDF',
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
    const fileName = previewResource.file_path ? previewResource.file_path.split('/').pop() : '';
    const fileExtension = fileName ? fileName.split('.').pop().toLowerCase() : '';

    // Generate proper preview URL
    const getPreviewUrl = () => {
      // Debug: log the resource data
      console.log('Preview resource data:', {
        is_video_link: previewResource.is_video_link,
        file_path: previewResource.file_path,
        resource_id: previewResource.resource_id
      });
      
      // For video links, use the direct URL
      // Check multiple conditions for video link detection
      if (isVideoLinkResource(previewResource)) {
        console.log('Using video link URL:', previewResource.file_path);
        return previewResource.file_path;
      }
      // For uploaded files, use the backend preview URL
      const previewUrl = `${API}/resources/${previewResource.resource_id}/preview`;
      console.log('Using backend preview URL:', previewUrl);
      return previewUrl;
    };

    const previewUrl = getPreviewUrl();

    // Check for PDF
    if (fileType.includes('pdf') || fileExtension === 'pdf') {
      return (
        <div style={{ width: '100%', height: '600px', overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px'
            }}
            title={previewResource.name}
            onLoad={() => {
              console.log('PDF iframe loaded successfully');
              setPreviewLoading(false);
            }}
            onError={(e) => {
              console.error('PDF iframe error:', e);
              setPreviewLoading(false);
              message.error('Failed to load PDF preview. Try downloading instead.');
            }}
          />
        </div>
      );
    }

    // Check for images
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExtensions.includes(fileExtension) || fileType.includes('image')) {
      return (
        <div style={{ textAlign: 'center', maxHeight: '600px', overflow: 'auto' }}>
          <img
            src={previewUrl}
            alt={previewResource.name}
            style={{
              maxWidth: '100%',
              maxHeight: '600px',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onLoad={() => {
              console.log('Image loaded successfully');
              setPreviewLoading(false);
            }}
            onError={(e) => {
              console.error('Image load error:', e);
              setPreviewLoading(false);
              // Fallback to direct file path
              if (previewResource.file_path && previewResource.file_path.startsWith('http')) {
                e.target.src = previewResource.file_path;
                message.info('Trying alternative source...');
              } else {
                message.error('Failed to load image preview');
              }
            }}
          />
        </div>
      );
    }
    // Keep existing preview rendering below

    // Check for videos (including video links)
    const isVideoLink = isVideoLinkResource(previewResource);
    
    if (fileType.includes('video') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(fileExtension) || isVideoLink) {
      // For video links, use the direct URL
      const videoSrc = isVideoLink ? previewResource.file_path : previewUrl;
      
      // Check if it's a YouTube link
      const youtubeMatch = videoSrc.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      if (youtubeMatch && isVideoLink) {
        const videoId = youtubeMatch[1];
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
        return (
          <div style={{ width: '100%', height: '600px', overflow: 'hidden' }}>
            <iframe
              src={embedUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px'
              }}
              title={previewResource.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                console.log('YouTube iframe loaded successfully');
                setPreviewLoading(false);
              }}
              onError={() => {
                console.error('YouTube iframe error');
                setPreviewLoading(false);
                message.error('Failed to load YouTube video preview');
              }}
            />
          </div>
        );
      }

      // Check if it's a Vimeo link
      const vimeoMatch = videoSrc.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch && isVideoLink) {
        const videoId = vimeoMatch[1];
        const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=0&byline=0&portrait=0&title=0`;
        return (
          <div style={{ width: '100%', height: '600px', overflow: 'hidden' }}>
            <iframe
              src={embedUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px'
              }}
              title={previewResource.name}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                console.log('Vimeo iframe loaded successfully');
                setPreviewLoading(false);
              }}
              onError={() => {
                console.error('Vimeo iframe error');
                setPreviewLoading(false);
                message.error('Failed to load Vimeo video preview');
              }}
            />
          </div>
        );
      }

      // For direct video files or other video links
      return (
        <div style={{ textAlign: 'center', maxHeight: '600px', overflow: 'auto' }}>
          <video
            ref={el => {
              if (el && previewResource) {
                videoRefs.current[previewResource.resource_id] = el;
              }
            }}
            controls
            preload="metadata"
            style={{
              width: '100%',
              maxHeight: '600px',
              borderRadius: '8px'
            }}
            onLoadedData={() => {
              console.log('Video loaded successfully');
              setPreviewLoading(false);
            }}
            onError={() => {
              setPreviewLoading(false);
              message.error('Failed to load video preview');
            }}
            onPlay={() => {
              // Pause all other videos when one starts playing
              Object.keys(videoRefs.current).forEach(key => {
                if (key !== previewResource?.resource_id && videoRefs.current[key]) {
                  try {
                    videoRefs.current[key].pause();
                  } catch (e) {
                    // Ignore pause errors
                  }
                }
              });
            }}
          >
            <source src={videoSrc} type={previewResource.file_type || 'video/mp4'} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Check for audio
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    if (audioExtensions.includes(fileExtension) || fileType.includes('audio')) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AudioOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }} />
          <audio
            controls
            style={{ width: '100%', marginTop: '20px' }}
            onLoadedData={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              message.error('Failed to load audio preview');
            }}
          >
            <source src={previewUrl} type={previewResource.file_type || 'audio/mp3'} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    // For documents (Word, Excel, PowerPoint)
    const docExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    if (docExtensions.includes(fileExtension)) {
      return (
        <div style={{ width: '100%', height: '600px', overflow: 'hidden' }}>
          <iframe
            src={previewUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px'
            }}
            title={`Preview - ${previewResource.name}`}
            onLoad={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              // Fallback to Google Docs viewer
              const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`;
              iframeRef.current.src = googleDocsViewerUrl;
            }}
          />
        </div>
      );
    }

    // Default fallback for unsupported file types
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        {getFileIcon(previewResource.file_type, 64)}
        <h3 style={{ marginTop: '16px' }}>{previewResource.name}</h3>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Preview not available for this file type. Please download to view.
        </p>
        <Dropdown menu={{ items: getDownloadMenuItems(previewResource) }} trigger={['click']}>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            size="large"
          >
            Download to View
          </Button>
        </Dropdown>
      </div>
    );
  };

  const renderThumbnail = (resource) => {
    const fileUrl = resource.file_path;
    const fileType = resource.file_type?.toLowerCase() || '';
    const fileExtension = fileUrl?.split('.').pop()?.toLowerCase() || '';

    // For PDFs - show first page as thumbnail
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

    // For images
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExtensions.includes(fileExtension) || fileType.includes('image')) {
      return (
        <div style={{ position: 'relative', height: '150px', overflow: 'hidden' }}>
          <img
            src={fileUrl}
            alt={resource.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onError={(e) => {
              console.error('Image thumbnail error:', e);
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `
                <div style="height: 150px; display: flex; align-items: center; justify-content: center; background: #f5f5f5">
                  <span style="font-size: 48px; color: #722ed1;">📷</span>
                </div>
              `;
            }}
          />
        </div>
      );
    }

    // For videos (including video links)
    const isVideoLink = isVideoLinkResource(resource);
    
    if (fileType.includes('video') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(fileExtension) || isVideoLink) {
      // For video links, show actual video thumbnail
      if (isVideoLink) {
        const youtubeMatch = fileUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
        const vimeoMatch = fileUrl.match(/vimeo\.com\/(\d+)/);
        
        let thumbnailUrl = '';
        let platformName = 'Video Link';
        
        if (youtubeMatch) {
          const videoId = youtubeMatch[1];
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          platformName = 'YouTube';
        } else if (vimeoMatch) {
          const videoId = vimeoMatch[1];
          // For Vimeo, we'll use a placeholder since getting thumbnails requires API
          thumbnailUrl = '';
          platformName = 'Vimeo';
        }
        
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
            {thumbnailUrl ? (
              <>
                <img
                  src={thumbnailUrl}
                  alt={resource.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Fallback to generic thumbnail if image fails to load
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
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  ▶️
                </div>
              </>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: platformName === 'Vimeo' ? '#00adef' : '#1890ff'
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  ▶️
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
              {platformName}
            </div>
          </div>
        );
      }
      
      // For uploaded video files - use a simpler approach
      return (
        <VideoThumbnail 
          videoUrl={fileUrl} 
          resource={resource}
          fileType={resource.file_type}
        />
      );
    }

    // Default thumbnail for other file types
    return (
      <div style={{
        height: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        {getFileIcon(resource.file_type, 48)}
      </div>
    );
  };

  const handleFileChange = ({ fileList }) => {
    // Allow multiple files, no limit on count
    setFileList(fileList);
  };

  const beforeUpload = (file) => {
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error('File must be smaller than 100MB!');
      return Upload.LIST_IGNORE;
    }

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|gif|webp|svg|mp4|webm|ogg|mp3|wav|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i)) {
      message.error('File type not supported!');
      return Upload.LIST_IGNORE;
    }

    return false;
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
    if (type.includes('zip') || type.includes('rar')) return <FileZipOutlined style={{ color: '#fa8c16', fontSize: `${size}px` }} />;
    if (type.includes('text') || type.includes('txt')) return <FileTextOutlined style={{ color: '#8c8c8c', fontSize: `${size}px` }} />;
    return <FileUnknownOutlined style={{ fontSize: `${size}px` }} />;
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.tags?.toLowerCase().includes(searchText.toLowerCase());
    const matchesClass = selectedClass === 'all' || resource.class_level === selectedClass;
    const matchesStatus = statusFilter === 'all' || resource.approval_status === statusFilter;
    const resourceSubject = (resource.subject || '').toLowerCase();
    const matchesSubject = selectedSubject === 'all' || resourceSubject === selectedSubject;
    
    // Filter by sub-category
    let matchesSubCategory = true;
    if (subCategoryFilter !== 'all') {
      matchesSubCategory = resource.sub_category === subCategoryFilter;
    }
    
    return matchesSearch && matchesClass && matchesStatus && matchesSubCategory && matchesSubject;
  });

  const getStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'orange', text: 'Pending' },
      'approved': { color: 'green', text: 'Approved' },
      'rejected': { color: 'red', text: 'Rejected' }
    };
    const statusInfo = statusMap[status] || { color: 'default', text: 'Unknown' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={text}>
                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {text}
                </span>
              </Tooltip>
              {record.uploaded_by_type === 'school' && (
                <Tag color="blue" style={{ marginLeft: 8 }}>School Upload</Tag>
              )}
            </div>
            {record.uploaded_by_type === 'school' && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                School: {record.uploaded_by_name || 'N/A'}
              </div>
            )}
            {record.sub_category && (
              <div style={{ fontSize: '11px', color: '#1890ff', marginTop: '2px' }}>
                📁 {categoryInfo.subcategories[record.sub_category] || record.sub_category}
              </div>
            )}
          </div>
        </Space>
      ),
      width: '30%',
    },
    {
      title: 'Sub-Title',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => {
        if (!tags) return '-';
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        return tagArray.length > 0 ? tagArray.join(', ') : '-';
      },
      width: '15%',
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (status) => getStatusTag(status),
      width: '10%',
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Rejected', value: 'rejected' },
      ],
      onFilter: (value, record) => record.approval_status === value,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
      width: '25%',
    },
    {
      title: 'Program',
      dataIndex: 'class_level',
      key: 'class_level',
      render: (level) => level ? <Tag color="blue">{level}</Tag> : <Tag>All</Tag>,
      width: '8%',
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject) => {
        if (!subject) return <Tag>-</Tag>;
        const subjectLabel = subjectOptions.find(opt => opt.value === subject)?.label || subject;
        return <Tag color="green">{subjectLabel}</Tag>;
      },
      width: '10%',
    },
    {
      title: 'Sub-Category',
      dataIndex: 'sub_category',
      key: 'sub_category',
      render: (subCategory) => {
        if (!subCategory) return <Tag>-</Tag>;
        const categoryName = categoryInfo.subcategories[subCategory] || subCategory;
        return <Tag color="purple">{categoryName}</Tag>;
      },
      width: '12%',
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => {
        if (!size) return '-';
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
      },
      width: '10%',
    },
    {
      title: 'Downloads',
      dataIndex: 'download_count',
      key: 'download_count',
      render: (count) => <Badge count={count || 0} showZero style={{ backgroundColor: '#52c41a' }} />,
      width: '10%',
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      width: '10%',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Preview">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Dropdown menu={{ items: getDownloadMenuItems(record) }} trigger={['click']}>
              <Button
                type="text"
                icon={<DownloadOutlined />}
              />
            </Dropdown>
          </Tooltip>
          {record.uploaded_by_type === 'school' && record.approval_status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <Button
                  type="text"
                  icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => updateResourceStatus(record.resource_id, 'approved')}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => updateResourceStatus(record.resource_id, 'rejected')}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Delete Resource',
                  content: `Are you sure you want to delete "${record.name}"?`,
                  okText: 'Yes, Delete',
                  okType: 'danger',
                  cancelText: 'Cancel',
                  onOk: () => handleDelete(record.resource_id)
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
      width: record => record.uploaded_by_type === 'school' ? '15%' : '10%',
    },
  ];

  const renderGridView = () => (
  <Row gutter={[16, 16]}>
    {filteredResources.map(resource => (
      <Col xs={24} sm={12} md={8} lg={6} key={resource.key}>
        <Card
          hoverable
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer'
          }}
          onClick={() => handlePreview(resource)}  // Add this line to make the whole card clickable
          styles={{
            body: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '12px'
            }
          }}
          cover={
            <div
              style={{
                position: 'relative'
              }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent double click
                handlePreview(resource);
              }}
            >
              {renderThumbnail(resource)}
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {resource.file_type?.split('/').pop() || 'File'}
              </div>
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
                  {categoryInfo.subcategories[resource.sub_category]?.substring(0, 12) || resource.sub_category.substring(0, 12)}
                </div>
              )}
            </div>
          }
          actions={[
            <Tooltip title="Preview" key="preview">
              <EyeOutlined onClick={(e) => { e.stopPropagation(); handlePreview(resource); }} />
            </Tooltip>,
            <Tooltip title="Download" key="download">
              <Dropdown menu={{ items: getDownloadMenuItems(resource) }} trigger={['click']}>
                <DownloadOutlined onClick={(e) => { e.stopPropagation(); }} />
              </Dropdown>
            </Tooltip>,
            <Tooltip title="Edit" key="edit">
              <EditOutlined onClick={(e) => { e.stopPropagation(); handleEdit(resource); }} />
            </Tooltip>,
            <Tooltip title="Delete" key="delete">
              <DeleteOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  Modal.confirm({
                    title: 'Delete Resource',
                    content: `Are you sure you want to delete "${resource.name}"?`,
                    okText: 'Yes, Delete',
                    okType: 'danger',
                    cancelText: 'Cancel',
                    onOk: () => handleDelete(resource.resource_id)
                  });
                }}
              />
            </Tooltip>
          ]}
        >
          <div style={{ flex: 1 }}>
            <Tooltip title={resource.name}>
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {resource.name}
              </div>
            </Tooltip>

            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', height: '36px', overflow: 'hidden' }}>
              {resource.description || 'No description provided'}
            </div>

            <div style={{ marginTop: 'auto' }}>
              <Space size={[4, 4]} wrap>
                {resource.class_level && <Tag color="blue" style={{ margin: 0 }}>{resource.class_level}</Tag>}
                <Tag style={{ margin: 0 }}>
                  {resource.file_size < 1024 * 1024
                    ? `${(resource.file_size / 1024).toFixed(1)} KB`
                    : `${(resource.file_size / (1024 * 1024)).toFixed(2)} MB`}
                </Tag>
                {resource.tags && resource.tags.split(',').map((tag, index) => (
                  <Tag key={index} color="default" style={{ margin: 0, fontSize: '10px' }}>{tag.trim()}</Tag>
                ))}
              </Space>

              <div style={{
                marginTop: '8px',
                color: '#999',
                fontSize: '11px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{resource.download_count || 0} downloads</span>
                <span>
                  {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Col>
    ))}
  </Row>
);
  return (
    <div>
      <Card
        title={
          <div>
            <h2 style={{ margin: 0 }}>{categoryInfo.title}</h2>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              {categoryInfo.description}
              {subCategoryFilter !== 'all' && (
                <span style={{ marginLeft: '10px', color: '#1890ff', fontWeight: 'bold' }}>
                  › {categoryInfo.subcategories[subCategoryFilter]}
                </span>
              )}
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
            <Select
              value={selectedClass}
              onChange={setSelectedClass}
              style={{ width: 150, marginRight: 8 }}
              placeholder="Filter by class"
            >
              <Option value="all">All Classes</Option>
              <Option value="Playgroup">Playgroup</Option>
              <Option value="Nursery">Nursery</Option>
              <Option value="LKG">LKG</Option>
              <Option value="UKG">UKG</Option>
            </Select>
            <Select
              value={selectedSubject}
              onChange={setSelectedSubject}
              style={{ width: 170, marginRight: 8 }}
              placeholder="Filter by subject"
            >
              {subjectOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150, marginRight: 8 }}
              placeholder="Filter by status"
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
            </Select>

            {/* Sub-category Filter */}
            {Object.keys(categoryInfo.subcategories).length > 0 && (
              <Select
                value={subCategoryFilter}
                onChange={setSubCategoryFilter}
                style={{ width: 170, marginRight: 8 }}
                placeholder="Filter by sub-category"
              >
                <Option value="all">All Sub-Categories</Option>
                {Object.entries(categoryInfo.subcategories).map(([key, label]) => {
                  if (key !== 'all') {
                    return <Option key={key} value={key}>{label}</Option>;
                  }
                  return null;
                })}
              </Select>
            )}
            
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              Add Resource
            </Button>
            {selectedRowKeys.length > 0 && (
              <Button
                type="danger"
                icon={<DeleteOutlined />}
                onClick={handleBulkDelete}
                loading={deleteLoading}
              >
                Delete Selected ({selectedRowKeys.length})
              </Button>
            )}
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDeleteAll}
              loading={deleteLoading}
            >
              Delete All
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
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record) => ({
                name: record.name,
              }),
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
            }}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          filteredResources.length > 0 ? (
            renderGridView()
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FileUnknownOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <p style={{ color: '#999' }}>
                {subCategoryFilter !== 'all' 
                  ? `No resources found in ${categoryInfo.subcategories[subCategoryFilter]}`
                  : 'No resources found'}
              </p>
              <Button
                type="primary"
                onClick={() => setIsModalVisible(true)}
              >
                Upload Your First Resource
              </Button>
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
          setVideoLink('');
          setUploadType('file');
          setNamingOption('auto');
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="class_level"
            label="All Programs"
          >
            <Select placeholder="Select program (optional)" allowClear>
              <Option value="Playgroup">Playgroup</Option>
              <Option value="Nursery">Nursery</Option>
              <Option value="LKG">LKG</Option>
              <Option value="UKG">UKG</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subjects"
          >
            <Select placeholder="Select subject (optional)" allowClear>
              {subjectOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Sub-category selection for non-"all" categories */}
          {categoryFilter !== 'all' && (
            <Form.Item
              name="sub_category"
              label="Sub-Category"
            >
              <Select placeholder="Select sub-category (optional)" allowClear>
                {Object.entries(categoryInfo.subcategories).map(([key, label]) => {
                  if (key !== 'all') {
                    return <Option key={key} value={key}>{label}</Option>;
                  }
                  return null;
                })}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Title"
            rules={[{ required: true, message: 'Please enter resource name' }]}
          >
            <Input placeholder="Enter resource name" />
          </Form.Item>

          {uploadType === 'file' && fileList.length > 0 && (
            <Form.Item
              label="File Naming"
              required
            >
              <Radio.Group
                value={namingOption}
                onChange={(e) => setNamingOption(e.target.value)}
                style={{ width: '100%' }}
              >
                <Radio value="auto">
                  <div>
                    <div style={{ fontWeight: 500 }}>Auto-number files</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      Files will be named: "Math", "Math 2", "Math 3", etc.
                    </div>
                  </div>
                </Radio>
                <Radio value="original" style={{ marginTop: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>Use original filenames</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      Files will keep their original names from upload
                    </div>
                  </div>
                </Radio>
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item
            name="tags"
            label="Sub-Title"
          >
            <Select
              mode="tags"
              placeholder="Add sub-title (press Enter to add)"
              style={{ width: '100%' }}
            >
              <Option value="worksheet">Worksheet</Option>
              <Option value="printable">Printable</Option>
              <Option value="activity">Activity</Option>
              <Option value="lesson-plan">Lesson Plan</Option>
              <Option value="assessment">Assessment</Option>
              <Option value="template">Template</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Upload Type"
            required
          >
            <Select
              value={uploadType}
              onChange={(value) => {
                setUploadType(value);
                setFileList([]);
                setVideoLink('');
                setNamingOption('auto');
              }}
              style={{ width: '100%' }}
            >
              <Option value="file">Upload File</Option>
              <Option value="link">Video Link (YouTube, Vimeo, etc.)</Option>
            </Select>
          </Form.Item>

          {uploadType === 'file' ? (
            <Form.Item
              label="Select Files"
              required
            >
              <Upload
                beforeUpload={beforeUpload}
                onChange={handleFileChange}
                fileList={fileList}
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.ogg,.mp3,.wav,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              >
                <Button icon={<UploadOutlined />}>Select Files (Max 100MB each)</Button>
              </Upload>
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                {fileList.length > 0 
                  ? `Selected ${fileList.length} file(s). ${namingOption === 'original' ? 'Files will keep their original names.' : 'Files will be auto-numbered.'}`
                  : 'You can select multiple files at once. Choose naming option below.'
                }
              </div>
            </Form.Item>
          ) : (
            <Form.Item
              label="Video Link"
              required
            >
              <Input
                placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                style={{ width: '100%' }}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                Supported: YouTube, Vimeo, Dailymotion, and other video platforms
              </div>
            </Form.Item>
          )}

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              rows={3}
              placeholder="Enter a brief description (optional)"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                onClick={handleUpload}
                loading={uploading}
                disabled={(uploadType === 'file' && fileList.length === 0) || (uploadType === 'link' && !videoLink)}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                  setFileList([]);
                  setVideoLink('');
                  setUploadType('file');
                  setNamingOption('auto');
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal - UPDATED FOR FULL SCREEN */}
      <Modal
        title={
          <div>
            {previewResource?.name}
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
              {previewResource?.file_type} •
              {previewResource?.file_size < 1024 * 1024
                ? ` ${(previewResource?.file_size / 1024).toFixed(1)} KB`
                : ` ${(previewResource?.file_size / (1024 * 1024)).toFixed(2)} MB`}
              {previewResource?.sub_category && (
                <span style={{ marginLeft: '10px' }}>
                  • 📁 {categoryInfo.subcategories[previewResource.sub_category]}
                </span>
              )}
            </div>
          </div>
        }
        open={isPreviewModalVisible}
        onCancel={() => {
          // Pause video if playing
          if (previewResource?.file_type?.includes('video') && videoRefs.current[previewResource.resource_id]) {
            videoRefs.current[previewResource.resource_id].pause();
          }
          setIsPreviewModalVisible(false);
          setPreviewResource(null);
          setPreviewLoading(false);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsPreviewModalVisible(false);
              setPreviewResource(null);
              setPreviewLoading(false);
            }}
          >
            Close
          </Button>,
          <Dropdown key="download" menu={{ items: getDownloadMenuItems(previewResource) }} trigger={['click']}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
            >
              Download
            </Button>
          </Dropdown>
        ]}
        width="90%"
        style={{ top: 20 }}
        styles={{ 
          body: {
            padding: 0, 
            height: '70vh', 
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }
        }}
        destroyOnClose
      >
        {renderPreview()}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Resource"
        open={isEditModalVisible}
        onCancel={handleEditCancel}
        footer={[
          <Button key="back" onClick={handleEditCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleEditSubmit} loading={uploading}>
            Update Resource
          </Button>
        ]}
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="class_level"
            label="All Programs"
          >
            <Select placeholder="Select program (optional)" allowClear>
              <Option value="playgroup">Playgroup</Option>
              <Option value="nursery">Nursery</Option>
              <Option value="lkg">LKG</Option>
              <Option value="ukg">UKG</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="subject"
            label="Subjects"
          >
            <Select placeholder="Select subject (optional)" allowClear>
              {subjectOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="sub_category"
            label="Sub-Category"
          >
            <Select placeholder="Select sub-category" allowClear>
              {Object.entries(categoryInfo.subcategories || {}).map(([key, label]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="name"
            label="Title"
            rules={[{ required: true, message: 'Please enter resource name' }]}
          >
            <Input placeholder="Enter resource name" />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="Sub-Title"
          >
            <Select
              mode="tags"
              placeholder="Enter sub-title (press Enter to add)"
              style={{ width: '100%' }}
            >
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Enter resource description" />
          </Form.Item>
          
          <Form.Item>
            <label style={{ display: 'block', marginBottom: '8px' }}>Replace File (Optional)</label>
            <Upload
              beforeUpload={beforeUpload}
              onChange={handleEditFileChange}
              fileList={editFileList}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select New File</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminResourceCategory;
