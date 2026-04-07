// frontend/src/components/Resources/SchoolUploads.js
import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Modal, Form, message, Badge, Tooltip, Dropdown, Upload, Row, Col
} from 'antd';
import {
  SearchOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined,
  CheckOutlined, CloseOutlined, DownOutlined, ApproveOutlined, StopOutlined, UploadOutlined, FileOutlined, AppstoreOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const { Option } = Select;
const { TextArea } = Input;

const SchoolUploads = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewResource, setPreviewResource] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // Category definitions
  const categoryConfig = {
    'all': { title: 'All Categories', description: 'All resource categories' },
    'academic': { title: 'Academic Resources', description: 'Curriculum, worksheets, and teaching materials' },
    'marketing': { title: 'Marketing Materials', description: 'Brochures, banners, and promotional content' },
    'administrative': { title: 'Administrative Resources', description: 'Forms, templates, and policy documents' },
    'training': { title: 'Training Resources', description: 'Teacher training materials and guides' },
    'event': { title: 'Event & Celebration', description: 'Event plans and celebration materials' },
    'multimedia': { title: 'Multimedia Collection', description: 'Videos, audio, and interactive content' }
  };

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

  useEffect(() => {
    fetchSchoolUploads();
  }, [statusFilter, categoryFilter, subCategoryFilter, classFilter, subjectFilter, searchText]);

  const fetchSchoolUploads = async () => {
    setLoading(true);
    try {
      const params = {
        uploaded_by_type: 'school' // Only get school uploads, not admin uploads
      };
      
      if (statusFilter !== 'all') {
        params.approval_status = statusFilter;
      }
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (subCategoryFilter !== 'all') {
        params.sub_category = subCategoryFilter;
      }
      if (classFilter !== 'all') {
        params.class_level = classFilter;
      }
      if (subjectFilter !== 'all') {
        params.subject = subjectFilter;
      }
      if (searchText) {
        params.search = searchText;
      }

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
          key: resource.resource_id || resource.id || `school-upload-${index}`,
          file_path: file_path,
        };
      });
      
      setResources(formattedResources);
    } catch (error) {
      console.error('Error fetching school uploads:', error);
      message.error('Failed to load school uploads');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (resource) => {
    setPreviewResource(resource);
    setPreviewLoading(true);
    setIsPreviewModalVisible(true);
    setTimeout(() => setPreviewLoading(false), 1500);
  };

  const handleDownload = async (resource) => {
    try {
      const downloadUrl = resource.file_path;
      if (downloadUrl) {
        // Create a temporary link element for download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = resource.name || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('Download started');
      } else {
        message.error('No file available for download');
      }
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download file');
    }
  };

  const updateResourceStatus = async (resourceId, status) => {
    try {
      await axios.put(`${API}/admin/resources/${resourceId}/${status === 'approved' ? 'approve' : 'reject'}`);
      message.success(`Resource ${status} successfully`);
      fetchSchoolUploads();
    } catch (error) {
      console.error(`Error ${status} resource:`, error);
      message.error(`Failed to ${status} resource`);
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
          fetchSchoolUploads();
        } catch (error) {
          console.error('Error deleting resource:', error);
          message.error('Failed to delete resource');
        }
      }
    });
  };

  // Filter resources - client-side filtering for search
  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchText || 
      resource.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.uploaded_by?.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.school_name?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || resource.approval_status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
    const matchesSubCategory = subCategoryFilter === 'all' || resource.sub_category === subCategoryFilter;
    const matchesClass = classFilter === 'all' || resource.class_level === classFilter;
    const matchesSubject = subjectFilter === 'all' || resource.subject === subjectFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesSubCategory && matchesClass && matchesSubject;
  });

  // Render grid view
  const renderGridView = () => {
    return (
      <Row gutter={[16, 16]}>
        {filteredResources.map((resource) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={resource.key}>
            <Card
              hoverable
              style={{ height: '100%' }}
              cover={
                <div style={{ height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {resource.file_type?.includes('image') ? (
                    <img 
                      src={resource.file_path} 
                      alt={resource.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                    />
                  ) : resource.file_type?.includes('pdf') ? (
                    <FilePdfOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  ) : resource.file_type?.includes('word') ? (
                    <FileWordOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  ) : resource.file_type?.includes('video') ? (
                    <VideoCameraOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  ) : (
                    <FileOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  )}
                </div>
              }
              actions={[
                <Tooltip title="Preview">
                  <Button icon={<EyeOutlined />} onClick={() => handlePreview(resource)} />
                </Tooltip>,
                <Tooltip title="Download">
                  <Button icon={<DownloadOutlined />} onClick={() => handleDownload(resource)} />
                </Tooltip>,
                resource.approval_status === 'pending' && (
                  <>
                    <Tooltip title="Approve">
                      <Button 
                        type="primary" 
                        icon={<CheckOutlined />} 
                        onClick={() => updateResourceStatus(resource.resource_id, 'approved')}
                      />
                    </Tooltip>
                    <Tooltip title="Reject">
                      <Button 
                        danger 
                        icon={<CloseOutlined />} 
                        onClick={() => updateResourceStatus(resource.resource_id, 'rejected')}
                      />
                    </Tooltip>
                  </>
                )
              ]}
            >
              <Card.Meta
                title={
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {resource.name}
                  </div>
                }
                description={
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <Tag color="blue">{resource.category}</Tag>
                      {getStatusTag(resource.approval_status)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {resource.school_name || 'Unknown School'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {(resource.file_size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'orange', text: 'Pending' },
      approved: { color: 'green', text: 'Approved' },
      rejected: { color: 'red', text: 'Rejected' }
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'Resource Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.file_type} • {(record.file_size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      ),
    },
    {
      title: 'School Information',
      key: 'school_info',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {record.school_name || record.uploaded_by || 'Unknown School'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            ID: {record.school_id || record.uploaded_by_id || 'N/A'}
          </div>
          {record.uploaded_by && (
            <div style={{ fontSize: '11px', color: '#999' }}>
              Uploaded by: {record.uploaded_by}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue">{categoryConfig[category]?.title || category}</Tag>
      ),
    },
    {
      title: 'Class/Subject',
      key: 'class_subject',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color="purple">{record.class_level || 'All Classes'}</Tag>
          <Tag color="cyan">{record.subject || 'All Subjects'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Sub-category',
      dataIndex: 'sub_category',
      key: 'sub_category',
      render: (sub_category) => sub_category && <Tag color="purple">{sub_category}</Tag>,
    },
    {
      title: 'Consent',
      dataIndex: 'consent_to_share',
      key: 'consent_to_share',
      render: (consent) => (
        <Tag color={consent === 'yes' ? 'green' : 'orange'}>
          {consent === 'yes' ? 'Shareable' : 'Private'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: getStatusTag,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Preview">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handlePreview(record)} />
          </Tooltip>
          <Tooltip title="Download">
            <Button icon={<DownloadOutlined />} size="small" onClick={() => handleDownload(record)} />
          </Tooltip>
          {record.approval_status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <Button 
                  type="primary" 
                  icon={<CheckOutlined />} 
                  size="small" 
                  onClick={() => updateResourceStatus(record.resource_id, 'approved')}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button 
                  danger 
                  icon={<CloseOutlined />} 
                  size="small" 
                  onClick={() => updateResourceStatus(record.resource_id, 'rejected')}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.resource_id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Create filter dropdowns
  const mainCategoryFilterItems = Object.entries(categoryConfig).map(([key, config]) => ({
    key: key,
    label: (
      <div style={{ minWidth: '200px', padding: '6px 0' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{config.title}</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
          {config.description}
        </div>
      </div>
    ),
    onClick: () => {
      setCategoryFilter(key);
      setSubCategoryFilter('all');
    }
  }));

  const subCategoryFilterItems = (subCategoryMap[categoryFilter] || []).map(sub => ({
    key: sub,
    label: <div style={{ padding: '6px 12px' }}>{sub}</div>,
    onClick: () => setSubCategoryFilter(sub)
  }));

  return (
    <div>
      <Card
        title={
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>School Uploads</h3>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
                Manage resources uploaded by schools - review and approve submissions
              </p>
            </div>
            <div>
              <Button.Group>
                <Button 
                  type={viewMode === 'table' ? 'primary' : 'default'}
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewMode('table')}
                >
                  Table View
                </Button>
                <Button 
                  type={viewMode === 'grid' ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewMode('grid')}
                >
                  Grid View
                </Button>
              </Button.Group>
            </div>
          </div>
        }
        extra={
          <Space wrap>
            <Input
              placeholder="Search resources..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              placeholder="Filter by status"
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
            </Select>

            <Select
              value={classFilter}
              onChange={setClassFilter}
              style={{ width: 150 }}
              placeholder="Filter by class"
            >
              <Option value="all">All Classes</Option>
              <Option value="playgroup">PlayGroup</Option>
              <Option value="nursery">Nursery</Option>
              <Option value="lkg">LKG</Option>
              <Option value="ukg">UKG</Option>
            </Select>

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

            <Dropdown
              menu={{ items: mainCategoryFilterItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button style={{ width: 150 }}>
                {categoryConfig[categoryFilter]?.title || 'All Categories'}
                <DownOutlined style={{ marginLeft: '8px' }} />
              </Button>
            </Dropdown>

            {categoryFilter !== 'all' && (
              <Dropdown
                menu={{ items: subCategoryFilterItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Button style={{ width: 150 }}>
                  {subCategoryFilter === 'all' ? 'All Sub-categories' : subCategoryFilter}
                  <DownOutlined style={{ marginLeft: '8px' }} />
                </Button>
              </Dropdown>
            )}
          </Space>
        }
      >
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={filteredResources}
            rowKey="key"
            loading={loading}
            pagination={{ 
              pageSize: 10, 
              showTotal: (total) => `Total ${total} items`,
              showSizeChanger: true,
              showQuickJumper: true
            }}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          renderGridView()
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
          setIsPreviewModalVisible(false);
          setPreviewResource(null);
          setPreviewLoading(false);
        }}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalVisible(false)}>Close</Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(previewResource)}
          >
            Download
          </Button>
        ]}
        width="80%"
        style={{ top: 20 }}
      >
        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            Loading preview...
          </div>
        ) : previewResource?.file_type?.includes('image') ? (
          <img 
            src={previewResource?.file_path} 
            alt={previewResource?.name}
            style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }}
          />
        ) : previewResource?.file_type?.includes('pdf') ? (
          <iframe
            src={previewResource?.file_path}
            style={{ width: '100%', height: '70vh', border: 'none' }}
            title={previewResource?.name}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }}>
              📄
            </div>
            <p>Preview not available for this file type</p>
            <Button type="primary" onClick={() => handleDownload(previewResource)}>
              Download File
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SchoolUploads;
