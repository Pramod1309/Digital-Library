import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Upload, message, Tag } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, FileOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const { Option } = Select;
const { TextArea } = Input;

const SchoolMyUploads = ({ user }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);

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
      formData.append('school_id', user.school_id);
      formData.append('school_name', user.name);
      formData.append('description', values.description || '');
      formData.append('class_level', values.class_level || '');
      formData.append('tags', values.tags ? values.tags.join(',') : '');

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
              onClick={() => window.open(`${BACKEND_URL}${record.file_path}`, '_blank')}
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
        title="My Uploads"
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
        <Table
          columns={columns}
          dataSource={resources}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
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
            <Select placeholder="Select category">
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
          >
            <Select placeholder="Select class level">
              <Option value="Nursery">Nursery</Option>
              <Option value="LKG">LKG</Option>
              <Option value="UKG">UKG</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              placeholder="Add tags"
            >
              <Option value="worksheet">worksheet</Option>
              <Option value="printable">printable</Option>
              <Option value="activity">activity</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Enter a brief description" />
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
