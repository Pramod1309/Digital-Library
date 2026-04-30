import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Input, Select, Table, Modal, message, Tag, Upload, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, NotificationOutlined, FileOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import api from '../../api/axiosConfig';
import AttachmentPreviewModal from '../shared/AttachmentPreviewModal';
import {
  getAttachmentName,
  getAttachmentType,
  normalizeUploadFiles,
  revokeUploadPreviews
} from '../../utils/attachments';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const getApiErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message)
      .filter(Boolean)
      .join(', ') || fallbackMessage;
  }

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  return fallbackMessage;
};

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
      uploadedFiles.forEach((file) => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      if (editingAnnouncement) {
        await api.put(`/admin/announcements/${editingAnnouncement.id}`, formData);
        message.success('Announcement updated successfully');
      } else {
        await api.post('/admin/announcements', formData);
        message.success('Announcement created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingAnnouncement(null);
      revokeUploadPreviews(uploadedFiles);
      setUploadedFiles([]);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      message.error(getApiErrorMessage(error, 'Failed to save announcement'));
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
        uid: String(file.id),
        name: getAttachmentName(file),
        status: 'done',
        url: file.url,
        type: getAttachmentType(file),
        file_type: getAttachmentType(file)
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
      message.error(getApiErrorMessage(error, 'Failed to delete announcement'));
    }
  };

  const handlePreview = (file) => {
    setPreviewFile(file);
    setPreviewVisible(true);
  };

  const handleFileChange = ({ fileList }) => {
    setUploadedFiles((previousFiles) => normalizeUploadFiles(fileList, previousFiles));
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
      width: 260,
      render: (attachments) => {
        if (!attachments || attachments.length === 0) {
          return <Text type="secondary">No files</Text>;
        }
        return (
          <div style={{ display: 'grid', gap: 8 }}>
            {attachments.map((file) => (
              <div
                key={file.id || file.url || getAttachmentName(file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0
                }}
              >
                <FileOutlined style={{ flexShrink: 0 }} />
                <Text
                  style={{
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={getAttachmentName(file)}
                >
                  {getAttachmentName(file)}
                </Text>
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(file)}
                >
                  Preview
                </Button>
              </div>
            ))}
          </div>
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
              revokeUploadPreviews(uploadedFiles);
              setUploadedFiles([]);
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
          revokeUploadPreviews(uploadedFiles);
          setUploadedFiles([]);
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

      <AttachmentPreviewModal
        open={previewVisible}
        file={previewFile}
        onClose={() => setPreviewVisible(false)}
      />
    </div>
  );
};

export default Announcements;
