// frontend/src/components/Resources/ResourceCategory.js
import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Space, Input, Select, Tag, Upload, Modal, Form, 
  Row, Col, message, Badge, Tooltip, Dropdown
} from 'antd';
import {
  SearchOutlined, DownloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined,
  FilePdfOutlined, FileImageOutlined, FileWordOutlined, FilePptOutlined,
  FileZipOutlined, FileUnknownOutlined, FileExcelOutlined, VideoCameraOutlined,
  AudioOutlined, AppstoreOutlined, UnorderedListOutlined, FileTextOutlined,
  UploadOutlined, PlusOutlined, SaveOutlined, UndoOutlined,
  MinusOutlined, EyeInvisibleOutlined, MailOutlined, PhoneOutlined,
  UserOutlined, DownOutlined, LoadingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import FilterBar from '../FilterBar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const { Option } = Select;
const { TextArea } = Input;

// Sub-category mapping
const subCategoryMap = {
  academic: [
    'Activity Sheets', 'Assessments', 'Flashcards', 'Handwriting Practice',
    'Lesson Plans', 'Number & Counting Activities', 'Phonics Materials', 'Rhymes & Poems',
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

const ResourceCategory = ({ user, category }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedResource, setSelectedResource] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Filter states
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [form] = Form.useForm();

  // Class options
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

  useEffect(() => {
    fetchResources();
  }, [category]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // Use correct admin resources endpoint with query params
      const params = {};
      if (category && category !== 'all') {
        params.category = category;
      }
      const response = await axios.get(`${API}/admin/resources`, { params });
      
      if (response && response.data) {
        const formattedResources = response.data.map((resource, index) => {
          let file_path = resource.file_path || resource.url;
          
          if (file_path) {
            if (!file_path.startsWith('http')) {
              if (file_path.startsWith('/')) {
                file_path = `${BACKEND_URL}${file_path}`;
              } else {
                file_path = `${BACKEND_URL}/uploads/${file_path}`;
              }
            }
          }
          
          return {
            ...resource,
            key: resource.resource_id || resource.id || `resource-${index}`,
            resource_id: resource.resource_id || resource.id,
            file_path: file_path,
            title: resource.title || resource.name,
            description: resource.description || '',
            class_level: resource.class_level || 'all',
            subject: resource.subject || 'all',
            sub_category: resource.sub_category || resource.tags || '',
            status: resource.status || 'active',
            file_type: resource.file_type || '',
            file_size: resource.file_size || 0
          };
        });
        
        setResources(formattedResources);
        message.success(`Loaded ${formattedResources.length} resources`);
      } else {
        setResources([]);
        message.info('No resources found');
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      setResources([]);
      message.warning('No resources available. You can add new resources.');
    } finally {
      setLoading(false);
    }
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

  const handlePreview = (resource) => {
    setSelectedResource(resource);
    setPreviewLoading(true);
    setPreviewVisible(true);
    setTimeout(() => setPreviewLoading(false), 1500);
  };

  const handleDownload = async (resource) => {
    try {
      const downloadUrl = resource.file_path;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        message.success('Download started');
      } else {
        message.error('No file available for download');
      }
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download file');
    }
  };

  const handleDelete = async (resourceId) => {
    Modal.confirm({
      title: 'Delete Resource',
      content: 'Are you sure you want to delete this resource?',
      onOk: async () => {
        try {
          await axios.delete(`${API}/admin/resources/${resourceId}`);
          message.success('Resource deleted successfully');
          fetchResources();
        } catch (error) {
          console.error('Delete error:', error);
          message.error('Failed to delete resource');
        }
      }
    });
  };

  const handleAddResource = async () => {
    try {
      const values = await form.validateFields();
      
      if (!fileList.length) {
        message.error('Please select a file');
        return;
      }

      const submitData = new FormData();
      submitData.append('name', values.title);
      submitData.append('description', values.description || '');
      submitData.append('category', category);
      submitData.append('class_level', values.class_level || '');
      submitData.append('tags', values.sub_category || '');
      submitData.append('file', fileList[0].originFileObj);

      setUploading(true);
      
      // Use correct admin upload endpoint
      await axios.post(`${API}/admin/resources/upload`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      message.success('Resource added successfully');
      setAddModalVisible(false);
      form.resetFields();
      setFileList([]);
      fetchResources();
    } catch (error) {
      console.error('Add resource error:', error);
      message.error(error.response?.data?.detail || 'Failed to add resource');
    } finally {
      setUploading(false);
    }
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
    return false;
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'all' || resource.class_level === classFilter;
    const matchesSubject = subjectFilter === 'all' || resource.subject === subjectFilter;
    const matchesSubCategory = subCategoryFilter === 'all' || resource.sub_category === subCategoryFilter;
    const matchesStatus = statusFilter === 'all' || resource.status === statusFilter;
    
    return matchesSearch && matchesClass && matchesSubject && matchesSubCategory && matchesStatus;
  });

  const renderThumbnail = (resource) => {
    const fileUrl = resource.file_path;
    const fileType = resource.file_type?.toLowerCase() || '';
    const fileExtension = fileUrl?.split('.').pop()?.toLowerCase() || '';

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExtensions.includes(fileExtension) || fileType.includes('image')) {
      return (
        <div style={{ height: '150px', overflow: 'hidden', background: '#f5f5f5' }}>
          <img
            src={fileUrl}
            alt={resource.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      );
    }

    if (fileType.includes('pdf') || fileExtension === 'pdf') {
      return (
        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          <FilePdfOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
        </div>
      );
    }

    return (
      <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        {getFileIcon(resource.file_type, 48)}
      </div>
    );
  };

  const ResourceCard = ({ resource }) => (
    <Card
      hoverable
      cover={renderThumbnail(resource)}
      actions={[
        <Tooltip title="Preview">
          <EyeOutlined key="preview" onClick={() => handlePreview(resource)} />
        </Tooltip>,
        <Tooltip title="Download">
          <DownloadOutlined key="download" onClick={() => handleDownload(resource)} />
        </Tooltip>,
        user?.user_type === 'admin' && (
          <Tooltip title="Delete">
            <DeleteOutlined key="delete" onClick={() => handleDelete(resource.resource_id)} />
          </Tooltip>
        )
      ].filter(Boolean)}
    >
      <Card.Meta
        title={
          <Tooltip title={resource.title}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {resource.title?.length > 40 ? `${resource.title.substring(0, 40)}...` : resource.title}
            </span>
          </Tooltip>
        }
        description={
          <div>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
              <Tag color="blue">{resource.class_level === 'all' ? 'All Classes' : resource.class_level}</Tag>
              <Tag color="green">{resource.subject === 'all' ? 'All Subjects' : resource.subject}</Tag>
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {resource.description?.substring(0, 80)}
            </div>
            {resource.sub_category && (
              <Tag color="purple" style={{ marginTop: '8px' }}>{resource.sub_category}</Tag>
            )}
          </div>
        }
      />
    </Card>
  );

  const renderPreview = () => {
    if (!selectedResource) return null;

    if (previewLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <LoadingOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <p>Loading preview...</p>
        </div>
      );
    }

    const fileType = selectedResource.file_type?.toLowerCase() || '';
    const fileExtension = selectedResource.file_path?.split('.').pop()?.toLowerCase() || '';

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExtensions.includes(fileExtension) || fileType.includes('image')) {
      return (
        <div style={{ textAlign: 'center' }}>
          <img
            src={selectedResource.file_path}
            alt={selectedResource.title}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        </div>
      );
    }

    if (fileType.includes('pdf') || fileExtension === 'pdf') {
      return (
        <iframe
          src={selectedResource.file_path}
          title={selectedResource.title}
          style={{ width: '100%', height: '70vh', border: 'none' }}
        />
      );
    }

    if (fileType.includes('video') || ['mp4', 'webm', 'ogg'].includes(fileExtension)) {
      return (
        <video controls autoPlay style={{ width: '100%', maxHeight: '70vh' }} src={selectedResource.file_path} />
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        {getFileIcon(selectedResource.file_type, 64)}
        <h3>{selectedResource.title}</h3>
        <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(selectedResource)}>
          Download File
        </Button>
      </div>
    );
  };

  const columns = [
    {
      title: 'Resource',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          {getFileIcon(record.file_type, 24)}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'class_level',
      key: 'class_level',
      render: (level) => <Tag color="blue">{level === 'all' ? 'All Classes' : level}</Tag>,
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject) => <Tag color="green">{subject === 'all' ? 'All Subjects' : subject}</Tag>,
    },
    {
      title: 'Sub-category',
      dataIndex: 'sub_category',
      key: 'sub_category',
      render: (sub) => sub ? <Tag color="purple">{sub}</Tag> : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handlePreview(record)}>Preview</Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>Download</Button>
          {user?.user_type === 'admin' && (
            <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.resource_id)}>Delete</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{category?.toUpperCase()} Resources</h2>
          <p style={{ margin: 0, color: '#666' }}>Manage and organize {category} resources</p>
        </div>
        <Space>
          <Button
            icon={viewMode === 'grid' ? <UnorderedListOutlined /> : <AppstoreOutlined />}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingResource(null);
              form.resetFields();
              setFileList([]);
              setAddModalVisible(true);
            }}
          >
            Add Resource
          </Button>
        </Space>
      </div>

      <Input
        placeholder="Search resources..."
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: 24 }}
        allowClear
      />

      <FilterBar
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        subCategoryFilter={subCategoryFilter}
        setSubCategoryFilter={setSubCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        subCategories={subCategoryMap[category] || []}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <LoadingOutlined style={{ fontSize: 48 }} />
          <p>Loading resources...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredResources.map(resource => (
            <Col xs={24} sm={12} md={8} lg={6} key={resource.key}>
              <ResourceCard resource={resource} />
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredResources}
          rowKey="key"
          pagination={{ pageSize: 10 }}
        />
      )}

      {filteredResources.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FileUnknownOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <p>No resources found</p>
            <Button type="primary" onClick={() => setAddModalVisible(true)}>Add Your First Resource</Button>
          </div>
        </Card>
      )}

      {/* Preview Modal */}
      <Modal
        title={selectedResource?.title}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" onClick={() => handleDownload(selectedResource)}>Download</Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>Close</Button>
        ]}
        width={800}
        styles={{ body: { padding: 0, height: '70vh', overflow: 'auto' } }}
      >
        {renderPreview()}
      </Modal>

      {/* Add Resource Modal */}
      <Modal
        title="Add New Resource"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
          setFileList([]);
        }}
        footer={[
          <Button key="cancel" onClick={() => setAddModalVisible(false)}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleAddResource} loading={uploading}>
            Add Resource
          </Button>
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Enter resource title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Enter description" />
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
              {(subCategoryMap[category] || []).map(sub => (
                <Option key={sub} value={sub}>{sub}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="status" label="Status" valuePropName="checked" initialValue={true}>
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item name="file" label="File" rules={[{ required: true }]}>
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
        </Form>
      </Modal>
    </div>
  );
};

export default ResourceCategory;