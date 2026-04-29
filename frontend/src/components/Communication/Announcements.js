import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Input, Select, Table, Modal, message, Tag, Upload, Space, Image, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, NotificationOutlined, FileOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import api from '../../api/axiosConfig';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const Announcements = () => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/admin/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      message.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('content', values.content);
      formData.append('priority', values.priority);
      
      if (values.target_schools && values.target_schools.length > 0) {
        formData.append('target_schools', values.target_schools.join(','));
      }
      
      // Append uploaded files
      uploadedFiles.forEach((file, index) => {
        formData.append(`files`, file.originFileObj);
      });

      if (editingAnnouncement) {
        formData.append('id', editingAnnouncement.id);
        await api.put(`/admin/announcements/${editingAnnouncement.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('Announcement updated successfully');
      } else {
        await api.post('/admin/announcements', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('Announcement created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingAnnouncement(null);
      setUploadedFiles([]);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      message.error('Failed to save announcement');
    }
  };

  const handleEdit = (record) => {
    setEditingAnnouncement(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      priority: record.priority,
      target_schools: record.target_schools ? record.target_schools.split(',') : []
    });
    // Set existing files if any
    if (record.attachments) {
      setUploadedFiles(record.attachments.map(file => ({
        uid: file.id,
        name: file.name,
        status: 'done',
        url: file.url,
        type: file.type
      })));
    }
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/announcements/${id}`);
      message.success('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      message.error('Failed to delete announcement');
    }
  };

  const handlePreview = (file) => {
    setPreviewFile(file);
    setPreviewVisible(true);
  };

  const handleFileChange = ({ fileList }) => {
    setUploadedFiles(fileList);
  };

  const beforeUpload = (file) => {
    // Check file size (max 10MB)
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('File must be smaller than 10MB!');
      return false;
    }
    return false; // Prevent automatic upload
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'default';
      default: return 'blue';
    }
  };

  const columns = [
    { 
      title: 'Title', 
      dataIndex: 'title', 
      key: 'title',
      render: (text) => <strong>{text}</strong>
    },
    { 
      title: 'Content', 
      dataIndex: 'content', 
      key: 'content', 
      ellipsis: true,
      width: '30%'
    },
    { 
      title: 'Priority', 
      dataIndex: 'priority', 
      key: 'priority',
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      )
    },
    { 
      title: 'Target', 
      dataIndex: 'target_schools', 
      key: 'target_schools',
      render: (target) => {
        if (!target) return <Tag color="green">All Schools</Tag>;
        const schoolIds = target.split(',');
        const schoolNames = schoolIds.map(id => {
          const school = schools.find(s => s.school_id === id);
          return school ? school.school_name : id;
        });
        return (
          <div>
            {schoolNames.map((name, idx) => (
              <Tag key={idx} color="blue">{name}</Tag>
            ))}
          </div>
        );
      }
    },
    { 
      title: 'Attachments', 
      dataIndex: 'attachments', 
      key: 'attachments',
      render: (attachments) => {
        if (!attachments || attachments.length === 0) {
          return <Text type="secondary">No files</Text>;
        }
        return (
          <Space direction="vertical" size="small">
            {attachments.map((file, idx) => (
              <Space key={idx}>
                <FileOutlined />
                <Text>{file.name}</Text>
                <Button 
                  type="link" 
                  size="small" 
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(file)}
                >
                  Preview
                </Button>
              </Space>
            ))}
          </Space>
        );
      }
    },
    { 
      title: 'Created', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button 
            type="link" 
            danger
            icon={<DeleteOutlined />} 
            onClick={() => {
              Modal.confirm({
                title: 'Delete Announcement',
                content: 'Are you sure you want to delete this announcement?',
                onOk: () => handleDelete(record.id)
              });
            }}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <NotificationOutlined style={{ marginRight: '8px' }} />
            Announcements
          </span>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAnnouncement(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            Create Announcement
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={announcements}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingAnnouncement(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="Enter announcement title" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, message: 'Please enter content' }]}
          >
            <TextArea rows={4} placeholder="Enter announcement content" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: 'Please select priority' }]}
            initialValue="normal"
          >
            <Select>
              <Option value="low">Low</Option>
              <Option value="normal">Normal</Option>
              <Option value="high">High</Option>
              <Option value="urgent">Urgent</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="target_schools"
            label="Target Audience"
            help="Leave empty to send to all schools"
          >
            <Select
              mode="multiple"
              placeholder="Select schools or leave empty for all"
              allowClear
            >
              {schools.map(school => (
                <Option key={school.school_id} value={school.school_id}>
                  {school.school_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Attachments">
            <Upload
              multiple
              fileList={uploadedFiles}
              onChange={handleFileChange}
              beforeUpload={beforeUpload}
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3,.avi,.mov"
            >
              <Button icon={<UploadOutlined />}>
                Upload Files (Images, PDFs, Documents, Videos, Audio)
              </Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Supported formats: Images, PDF, Word, PowerPoint, Excel, Text, Video, Audio. Max size: 10MB per file.
            </Text>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingAnnouncement ? 'Update' : 'Create'} Announcement
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="File Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        {previewFile && (
          <div>
            {previewFile.type?.startsWith('image/') ? (
              <Image 
                src={previewFile.url} 
                alt={previewFile.name}
                style={{ width: '100%' }}
              />
            ) : previewFile.type?.includes('pdf') ? (
              <iframe
                src={previewFile.url}
                style={{ width: '100%', height: '500px' }}
                title={previewFile.name}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>
                  <Text strong>{previewFile.name}</Text>
                  <br />
                  <Button 
                    type="primary" 
                    href={previewFile.url}
                    target="_blank"
                    style={{ marginTop: '16px' }}
                  >
                    Download File
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Announcements;
