import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Input, Select, Table, Modal, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, NotificationOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const { TextArea } = Input;
const { Option } = Select;

const Announcements = () => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/admin/schools`);
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/announcements`);
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
      // Convert array to comma-separated string
      const payload = {
        title: values.title,
        content: values.content,
        priority: values.priority,
        target_schools: values.target_schools && values.target_schools.length > 0 
          ? values.target_schools.join(',') 
          : null
      };

      if (editingAnnouncement) {
        await axios.put(`${API}/admin/announcements/${editingAnnouncement.id}`, payload);
        message.success('Announcement updated successfully');
      } else {
        await axios.post(`${API}/admin/announcements`, payload);
        message.success('Announcement created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingAnnouncement(null);
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
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/admin/announcements/${id}`);
      message.success('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      message.error('Failed to delete announcement');
    }
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

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingAnnouncement ? 'Update' : 'Create'} Announcement
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Announcements;
