import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, message } from 'antd';
import { FileTextOutlined, MessageOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const { TextArea } = Input;
const { Option } = Select;

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/support/tickets`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      message.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (ticket) => {
    setSelectedTicket(ticket);
    form.setFieldsValue({
      status: ticket.status,
      admin_response: ticket.admin_response || ''
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append('status', values.status);
      formData.append('admin_response', values.admin_response);

      await axios.put(`${API}/admin/support/tickets/${selectedTicket.ticket_id}`, formData);
      message.success('Ticket updated successfully');
      setIsModalVisible(false);
      form.resetFields();
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      message.error('Failed to update ticket');
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
      width: '15%'
    },
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name',
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
      render: (status) => <Tag color={getStatusColor(status)}>{status.replace('_', ' ').toUpperCase()}</Tag>
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
        <Button 
          type="link"
          icon={<MessageOutlined />}
          onClick={() => handleRespond(record)}
        >
          Respond
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <FileTextOutlined style={{ marginRight: '8px' }} />
            Support Tickets
          </span>
        }
      >
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                <p><strong>Message:</strong></p>
                <p>{record.message}</p>
                {record.admin_response && (
                  <>
                    <p style={{ marginTop: '16px' }}><strong>Admin Response:</strong></p>
                    <p>{record.admin_response}</p>
                  </>
                )}
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title={`Respond to Ticket: ${selectedTicket?.ticket_id}`}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setSelectedTicket(null);
        }}
        footer={null}
        width={600}
      >
        {selectedTicket && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
            <p><strong>School:</strong> {selectedTicket.school_name}</p>
            <p><strong>Subject:</strong> {selectedTicket.subject}</p>
            <p><strong>Message:</strong> {selectedTicket.message}</p>
          </div>
        )}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select>
              <Option value="open">Open</Option>
              <Option value="in_progress">In Progress</Option>
              <Option value="resolved">Resolved</Option>
              <Option value="closed">Closed</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="admin_response"
            label="Response"
            rules={[{ required: true, message: 'Please enter your response' }]}
          >
            <TextArea rows={4} placeholder="Enter your response..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Update Ticket
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupportTickets;
