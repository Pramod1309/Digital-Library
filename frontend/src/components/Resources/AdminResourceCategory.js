import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Upload, Modal, Form, Row, Col, message, Badge, Tooltip, Dropdown
} from 'antd';
import {
  UploadOutlined, SearchOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined,
  FilePdfOutlined, FileImageOutlined, FileWordOutlined, FilePptOutlined,
  FileZipOutlined, FileUnknownOutlined, FileExcelOutlined, VideoCameraOutlined,
  AudioOutlined, AppstoreOutlined, UnorderedListOutlined, FileTextOutlined,
  LoadingOutlined, CheckOutlined, CloseOutlined, DownOutlined
} from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const { Option } = Select;
const { TextArea } = Input;

// Category definitions with descriptions
const CATEGORY_CONFIG = {
  'all': {
    title: 'All Categories',
    description: 'All resource categories',
    subcategories: {}
  },
  'academic': {
    title: 'Academic Resources',
    description: 'Manage curriculum, lesson plans, worksheets, and other teaching materials',
    subcategories: {
      'all': 'All Academic',
      'curriculum': 'Curriculum',
      'lesson-plan': 'Lesson Plan',
      'worksheet': 'Worksheet',
      'activity-sheet': 'Activity Sheet',
      'teaching-aid': 'Teaching Aid',
      'assessment': 'Assessment',
      'syllabus': 'Syllabus',
      'study-material': 'Study Material'
    }
  },
  'marketing': {
    title: 'Marketing Materials',
    description: 'Manage brochures, banners, and promotional content',
    subcategories: {
      'all': 'All Marketing',
      'brochure': 'Brochure',
      'banner': 'Banner',
      'social-media': 'Social Media Post',
      'flyer': 'Flyer',
      'promotional-video': 'Promotional Video',
      'email-template': 'Email Template',
      'presentation': 'Presentation',
      'advertisement': 'Advertisement'
    }
  },
  'administrative': {
    title: 'Administrative Resources',
    description: 'Manage forms, templates, and policy documents',
    subcategories: {
      'all': 'All Administrative',
      'form': 'Form',
      'template': 'Template',
      'policy': 'Policy Document',
      'report': 'Report',
      'certificate': 'Certificate',
      'letter': 'Official Letter',
      'agreement': 'Agreement',
      'guideline': 'Guideline'
    }
  },
  'training': {
    title: 'Training Resources',
    description: 'Manage teacher training materials and guides',
    subcategories: {
      'all': 'All Training',
      'teacher-training': 'Teacher Training',
      'workshop': 'Workshop Material',
      'certification': 'Certification Program',
      'skill-development': 'Skill Development',
      'orientation': 'Orientation Material',
      'manual': 'Training Manual',
      'handbook': 'Handbook',
      'online-course': 'Online Course'
    }
  },
  'event': {
    title: 'Event & Celebration',
    description: 'Manage event plans and celebration materials',
    subcategories: {
      'all': 'All Events',
      'annual-day': 'Annual Day',
      'sports-day': 'Sports Day',
      'cultural-event': 'Cultural Event',
      'festival': 'Festival Celebration',
      'parents-meeting': 'Parents Meeting',
      'graduation': 'Graduation Ceremony',
      'competition': 'Competition',
      'celebration': 'Celebration Material'
    }
  },
  'multimedia': {
    title: 'Multimedia Collection',
    description: 'Manage videos, audio, and interactive content',
    subcategories: {
      'all': 'All Multimedia',
      'video': 'Video',
      'audio': 'Audio',
      'interactive': 'Interactive Content',
      'animation': 'Animation',
      'graphic': 'Graphic',
      'photograph': 'Photograph',
      'podcast': 'Podcast',
      'virtual-tour': 'Virtual Tour'
    }
  }
};

const AdminResourceCategory = ({ category, title, description }) => {
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
  const [selectedClass, setSelectedClass] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [categoryFilter, setCategoryFilter] = useState(category || 'all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const iframeRef = useRef(null);
  const videoRefs = useRef({});

  useEffect(() => {
    fetchResources();
  }, [categoryFilter, subCategoryFilter]);

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
      
      console.log('Fetching resources with params:', params);
      const response = await axios.get(`${API}/admin/resources`, { params });
      
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

  // Get current category info
  const getCategoryInfo = () => {
    return CATEGORY_CONFIG[categoryFilter] || { 
      title: categoryFilter, 
      description: '',
      subcategories: {}
    };
  };

  const categoryInfo = getCategoryInfo();

  // Create main category filter dropdown items
  const mainCategoryFilterItems = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key: key,
    label: (
      <div style={{ minWidth: '250px', padding: '8px 0' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{config.title}</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
          {config.description}
        </div>
      </div>
    ),
    onClick: () => {
      setCategoryFilter(key);
      setSubCategoryFilter('all'); // Reset sub-category when main category changes
    }
  }));

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
      formData.append('description', values.description || '');
      formData.append('class_level', values.class_level || '');
      formData.append('tags', values.tags ? values.tags.join(',') : '');

      setUploading(true);
      await axios.post(`${API}/admin/resources/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      message.success('Resource uploaded successfully!');
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

  const handleDelete = async (resourceId) => {
    try {
      await axios.delete(`${API}/admin/resources/${resourceId}`);
      message.success('Resource deleted successfully');
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      message.error('Failed to delete resource');
    }
  };

  const updateResourceStatus = async (resourceId, status) => {
    try {
      await axios.put(`${API}/admin/resources/${resourceId}/${status === 'approved' ? 'approve' : 'reject'}`);
      message.success(`Resource ${status} successfully`);
      fetchResources();
    } catch (error) {
      console.error(`Error ${status} resource:`, error);
      message.error(`Failed to ${status} resource`);
    }
  };

  const handleDownload = async (record) => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Create the download URL
      const downloadUrl = `${API}/resources/${record.resource_id}/download`;
      
      // Add school info if available
      const urlWithParams = new URL(downloadUrl);
      if (user.school_id) urlWithParams.searchParams.append('school_id', user.school_id);
      if (user.school_name) urlWithParams.searchParams.append('school_name', user.school_name);
      
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
        
        message.success('Download started!');
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
        
        message.info('Opening download in new tab...');
      }
    } catch (error) {
      console.error('Error in handleDownload:', error);
      message.error(`Failed to download file: ${error.message}`);
    }
  };

  const handlePreview = async (record) => {
    setPreviewResource(record);
    setPreviewLoading(true);
    setIsPreviewModalVisible(true);

    // Reset any existing video playback
    if (videoRefs.current[record.resource_id]) {
      videoRefs.current[record.resource_id].pause();
      videoRefs.current[record.resource_id].currentTime = 0;
    }

    // Safety timeout: Stop loading after 10 seconds if content doesn't load
    setTimeout(() => {
      setPreviewLoading(false);
    }, 10000);
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
      const previewUrl = `${API}/resources/${previewResource.resource_id}/preview`;
      console.log('Using preview URL:', previewUrl);
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

    // Check for videos
    if (fileType.includes('video') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(fileExtension)) {
      return (
        <div style={{ textAlign: 'center', maxHeight: '600px', overflow: 'auto' }}>
          <video
            ref={el => {
              if (el && previewResource) {
                videoRefs.current[previewResource.resource_id] = el;
              }
            }}
            controls
            autoPlay
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
                  videoRefs.current[key].pause();
                }
              });
            }}
          >
            <source src={previewUrl} type={previewResource.file_type || 'video/mp4'} />
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
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(previewResource)}
          size="large"
        >
          Download to View
        </Button>
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
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.1)'
            }}>
              <FilePdfOutlined style={{ fontSize: '32px', color: '#ff4d4f', opacity: 0.8 }} />
            </div>
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
                  <div style="font-size: 32px; color: #999;">
                    ${getFileIcon(resource.file_type, 32).props.children}
                  </div>
                </div>
              `;
            }}
          />
        </div>
      );
    }

    // For videos
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
              // Mute and play the video on hover
              e.target.muted = true;
              e.target.play().catch(e => console.log('Video play error:', e));
            }}
            onMouseLeave={(e) => {
              // Pause and reset the video when mouse leaves
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
            pointerEvents: 'none' // Make sure clicks go through to the video
          }}>
            <VideoCameraOutlined style={{ fontSize: '24px', color: 'white' }} />
          </div>
        </div>
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
    setFileList(fileList.slice(-1));
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
    
    // Filter by sub-category
    let matchesSubCategory = true;
    if (subCategoryFilter !== 'all') {
      matchesSubCategory = resource.sub_category === subCategoryFilter;
    }
    
    return matchesSearch && matchesClass && matchesStatus && matchesSubCategory;
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
      title: 'Resource',
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
      title: 'Class',
      dataIndex: 'class_level',
      key: 'class_level',
      render: (level) => level ? <Tag color="blue">{level}</Tag> : <Tag>All</Tag>,
      width: '10%',
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
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
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
              flexDirection: 'column'
            }}
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
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => handlePreview(resource)}
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
                <EyeOutlined onClick={() => handlePreview(resource)} />
              </Tooltip>,
              <Tooltip title="Download" key="download">
                <DownloadOutlined onClick={() => handleDownload(resource)} />
              </Tooltip>,
              <Tooltip title="Delete" key="delete">
                <DeleteOutlined
                  onClick={() => {
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
              <Option value="Nursery">Nursery</Option>
              <Option value="LKG">LKG</Option>
              <Option value="UKG">UKG</Option>
              <Option value="Grade 1">Grade 1</Option>
              <Option value="Grade 2">Grade 2</Option>
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
            
            {/* Main Category Filter */}
            <Dropdown
              menu={{ items: mainCategoryFilterItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button style={{ width: 150 }}>
                {categoryInfo.title}
                <DownOutlined style={{ marginLeft: '8px' }} />
              </Button>
            </Dropdown>
            
            {/* Sub-category Filter (only show if not "all" category) */}
            {categoryFilter !== 'all' && Object.keys(categoryInfo.subcategories).length > 1 && (
              <Dropdown
                menu={{ items: subCategoryFilterItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Button style={{ width: 150 }}>
                  {categoryInfo.subcategories[subCategoryFilter] || 'All Sub-categories'}
                  <DownOutlined style={{ marginLeft: '8px' }} />
                </Button>
              </Dropdown>
            )}
            
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              Add Resource
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
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Resource Name"
            rules={[{ required: true, message: 'Please enter resource name' }]}
          >
            <Input placeholder="Enter resource name" />
          </Form.Item>

          <Form.Item
            name="file"
            label="Select File"
            rules={[{ required: true, message: 'Please select a file' }]}
          >
            <Upload
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
              fileList={fileList}
              maxCount={1}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.ogg,.mp3,.wav,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            >
              <Button icon={<UploadOutlined />}>Select File (Max 100MB)</Button>
            </Upload>
          </Form.Item>

          {/* Sub-category selection for non-"all" categories */}
          {categoryFilter !== 'all' && (
            <Form.Item
              name="sub_category"
              label="Sub-category"
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
            name="class_level"
            label="Class Level"
          >
            <Select placeholder="Select class level (optional)" allowClear>
              <Option value="Nursery">Nursery</Option>
              <Option value="LKG">LKG</Option>
              <Option value="UKG">UKG</Option>
              <Option value="Grade 1">Grade 1</Option>
              <Option value="Grade 2">Grade 2</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              placeholder="Add tags (press Enter to add)"
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
                disabled={fileList.length === 0}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                  setFileList([]);
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
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              handleDownload(previewResource);
            }}
          >
            Download
          </Button>
        ]}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ 
          padding: 0, 
          height: '70vh', 
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        destroyOnClose
      >
        {renderPreview()}
      </Modal>
    </div>
  );
};

export default AdminResourceCategory;