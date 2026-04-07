import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Upload, message, Tag, Space, Row, Col, Tooltip } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, FileOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const { Option } = Select;
const { TextArea } = Input;

// Sub-category mapping
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

const SchoolMyUploads = ({ user }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  useEffect(() => {
    fetchMyUploads();
  }, []);

  const fetchMyUploads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/school/resources?school_id=${user.school_id}`);
      const myUploads = response.data.filter(r => r.uploaded_by_id === user.school_id);
      setResources(myUploads);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      message.error('Failed to load uploads');
    } finally {
      setLoading(false);
    }
  };

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
      formData.append('category', values.category);
      formData.append('class_level', values.class_level);
      formData.append('subject', values.subject);
      formData.append('sub_category', values.sub_category);
      formData.append('consent_to_share', values.consent_to_share);
      formData.append('description', values.description);
      formData.append('school_id', user.school_id);
      formData.append('school_name', user.school_name);
      formData.append('approval_status', 'pending');

      setUploading(true);
      await axios.post(`${API}/school/resources/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      message.success('File uploaded successfully! Waiting for admin approval.');
      form.resetFields();
      setFileList([]);
      setIsModalVisible(false);
      fetchMyUploads();
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error(error.response?.data?.detail || 'Failed to upload file');
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

  // Render grid view
  const renderGridView = () => {
    return (
      <Row gutter={[16, 16]}>
        {resources.map((resource) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={resource.id}>
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
                    <FileOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  ) : resource.file_type?.includes('word') ? (
                    <FileOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  ) : resource.file_type?.includes('video') ? (
                    <FileOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  ) : (
                    <FileOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  )}
                </div>
              }
              actions={
                resource.approval_status === 'approved' ? (
                  <Tooltip title="Download">
                    <Button icon={<DownloadOutlined />} onClick={() => {
                      const link = document.createElement('a');
                      link.href = `${BACKEND_URL}${resource.file_path}`;
                      link.download = resource.name || 'download';
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }} />
                  </Tooltip>
                ) : (
                  <Tag color="orange">Pending Approval</Tag>
                )
              }
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
                      <Tag color={getStatusColor(resource.approval_status)}>
                        {resource.approval_status.toUpperCase()}
                      </Tag>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {(resource.file_size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {new Date(resource.created_at).toLocaleDateString()}
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'green';
      case 'pending': return 'orange';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag color="blue">{category}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (status) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => `${(size / (1024 * 1024)).toFixed(2)} MB`
    },
    {
      title: 'Downloads',
      dataIndex: 'download_count',
      key: 'download_count',
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          {record.approval_status === 'approved' && (
            <Button 
              type="link" 
              icon={<DownloadOutlined />}
              onClick={() => {
                const link = document.createElement('a');
                link.href = `${BACKEND_URL}${record.file_path}`;
                link.download = record.name || 'download';
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Download
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>My Uploads</h3>
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
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            Upload Resource
          </Button>
        }
      >
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={resources}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          renderGridView()
        )}
      </Card>

      <Modal
        title="Upload Resource"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Resource Name"
            rules={[{ required: true, message: 'Please enter resource name' }]}
          >
            <Input placeholder="Enter resource name" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select category' }]}
          >
            <Select 
              placeholder="Select category"
              onChange={(value) => {
                setSelectedCategory(value);
                form.setFieldValue('sub_category', undefined);
              }}
            >
              <Option value="academic">Academic Resources</Option>
              <Option value="marketing">Marketing Materials</Option>
              <Option value="administrative">Administrative</Option>
              <Option value="training">Training Resources</Option>
              <Option value="event">Event & Celebration</Option>
              <Option value="multimedia">Multimedia Collection</Option>
            </Select>
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
            >
              <Button icon={<UploadOutlined />}>Select File (Max 100MB)</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="class_level"
            label="Class Level"
            rules={[{ required: true, message: 'Please select class level' }]}
          >
            <Select placeholder="Select class level">
              <Option value="playgroup">Play Group</Option>
              <Option value="nursery">Nursery</Option>
              <Option value="lkg">LKG</Option>
              <Option value="ukg">UKG</Option>
              <Option value="all">All Classes</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please select subject' }]}
          >
            <Select placeholder="Select subject">
              <Option value="english">English</Option>
              <Option value="maths">Maths</Option>
              <Option value="evs">EVS</Option>
              <Option value="hindi">Hindi</Option>
              <Option value="arts">Arts & Crafts</Option>
              <Option value="music">Music</Option>
              <Option value="pe">Physical Education</Option>
              <Option value="all">All Subjects</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="sub_category"
            label="Sub-category"
            rules={[{ required: true, message: 'Please select sub-category' }]}
          >
            <Select 
              placeholder="Select sub-category"
              disabled={!selectedCategory}
            >
              {(subCategoryMap[selectedCategory] || []).map(sub => (
                <Option key={sub} value={sub}>{sub}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="consent_to_share"
            label="Consent to Share"
            rules={[{ required: true, message: 'Please select consent option' }]}
          >
            <Select placeholder="Select sharing preference">
              <Option value="yes">Yes, share with other schools and admin use</Option>
              <Option value="no">No, keep private to my school only</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Enter a brief description" maxLength={500} showCount />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              onClick={handleUpload}
              loading={uploading}
              block
            >
              Upload
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchoolMyUploads;
