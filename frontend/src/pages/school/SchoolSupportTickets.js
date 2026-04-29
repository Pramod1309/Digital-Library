import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, message, Upload, Space, Image, Typography } from 'antd';
import { PlusOutlined, FileTextOutlined, FileOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axiosConfig';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const SchoolSupportTickets = ({ user }) => {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [form] = Form.useForm();
  const requestedTicketId = searchParams.get('ticket_id');

  useEffect(() => {
    fetchTickets();
    // Poll for ticket updates every 3 seconds
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/school/support/tickets?school_id=${user.school_id}`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      message.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
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

  const handlePreview = (file) => {
    setPreviewFile(file);
    setPreviewVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append('school_id', user.school_id);
      formData.append('school_name', user.name);
      formData.append('subject', values.subject);
      formData.append('message', values.message);
      formData.append('category', values.category);
      formData.append('priority', values.priority);
      
      // Append uploaded files
      uploadedFiles.forEach((file, index) => {
        formData.append(`files[${index}]`, file.originFileObj);
      });

      await api.post(`/school/support/tickets`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      message.success('Support ticket created successfully');
      setIsModalVisible(false);
      form.resetFields();
      setUploadedFiles([]);
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      message.error('Failed to create ticket');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'blue';
      case 'in_progress': return 'orange';
      case 'resolved': return 'green';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'red';
      case 'normal': return 'blue';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Ticket ID',
      dataIndex: 'ticket_id',
      key: 'ticket_id',
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag>{category}</Tag>
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => <Tag color={getPriorityColor(priority)}>{priority.toUpperCase()}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Admin Response',
      dataIndex: 'admin_response',
      key: 'admin_response',
      render: (response) => response || <span style={{ color: '#999' }}>Pending</span>
    },
  ];

  return (
    <div>
      <Card 
        title="Support Tickets"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            Create Ticket
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            style: requestedTicketId && record.ticket_id === requestedTicketId
              ? { background: '#fffbe6' }
              : {}
          })}
        />
      </Card>

      <Modal
        title="Create Support Ticket"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter subject' }]}
          >
            <Input placeholder="Brief description of your issue" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select category' }]}
          >
            <Select placeholder="Select category">
              <Option value="technical">Technical Issue</Option>
              <Option value="resource">Resource Related</Option>
              <Option value="account">Account Issue</Option>
              <Option value="general">General Inquiry</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: 'Please select priority' }]}
          >
            <Select placeholder="Select priority">
              <Option value="low">Low</Option>
              <Option value="normal">Normal</Option>
              <Option value="high">High</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter your message' }]}
          >
            <TextArea rows={4} placeholder="Describe your issue in detail..." />
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
              Submit Ticket
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
                src={previewFile.url || URL.createObjectURL(previewFile.originFileObj)} 
                alt={previewFile.name}
                style={{ width: '100%' }}
              />
            ) : previewFile.type?.includes('pdf') ? (
              <iframe
                src={previewFile.url || URL.createObjectURL(previewFile.originFileObj)}
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

export default SchoolSupportTickets;
