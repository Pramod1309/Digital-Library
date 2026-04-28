import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, message } from 'antd';
import { FileTextOutlined, MessageOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axiosConfig';

const { TextArea } = Input;
const { Option } = Select;

const SupportTickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form] = Form.useForm();
  const openedFromQueryRef = useRef('');
  const requestedTicketId = searchParams.get('ticket_id');

  useEffect(() => {
    fetchTickets();
    // Poll for new tickets every 3 seconds
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!requestedTicketId || !tickets.length) {
      return;
    }

    if (openedFromQueryRef.current === requestedTicketId) {
      return;
    }

    const matchingTicket = tickets.find((ticket) => ticket.ticket_id === requestedTicketId);
    if (matchingTicket) {
      openedFromQueryRef.current = requestedTicketId;
      handleRespond(matchingTicket, false);
    }
  }, [requestedTicketId, tickets]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/support/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      message.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (ticket, syncQuery = true) => {
    setSelectedTicket(ticket);
    form.setFieldsValue({
      status: ticket.status,
      admin_response: ticket.admin_response || ''
    });
    setIsModalVisible(true);

    if (syncQuery) {
      openedFromQueryRef.current = ticket.ticket_id;
      setSearchParams({ ticket_id: ticket.ticket_id }, { replace: true });
    }
  };

  const handleSubmit = async (values) => {
    try {
      console.log('Updating ticket with values:', values);
      console.log('Selected ticket:', selectedTicket);
      
      const formData = new FormData();
      formData.append('status', values.status);
      formData.append('admin_response', values.admin_response);

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await api.put(`/admin/support/tickets/${selectedTicket.ticket_id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Update response:', response.data);
      message.success('Ticket updated successfully');
      setIsModalVisible(false);
      form.resetFields();
      setSelectedTicket(null);
      openedFromQueryRef.current = '';
      setSearchParams({}, { replace: true });
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      message.error('Failed to update ticket');
    }
  };

  const handleDelete = async (ticketId) => {
    try {
      console.log('Attempting to delete ticket:', ticketId);
      console.log('Delete URL:', `/admin/support/tickets/${ticketId}`);
      
      const response = await api.delete(`/admin/support/tickets/${ticketId}`);
      console.log('Delete response:', response.data);
      
      message.success('Ticket deleted successfully');
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      console.error('Error response:', error.response);
      message.error('Failed to delete ticket');
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
        <div>
          <Button 
            type="link"
            icon={<MessageOutlined />}
            onClick={() => handleRespond(record)}
            style={{ marginRight: 8 }}
          >
            Respond
          </Button>
          <Button 
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.ticket_id)}
            style={{ color: '#ff4d4f' }}
          >
            Delete
          </Button>
        </div>
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
          onRow={(record) => ({
            style: requestedTicketId && record.ticket_id === requestedTicketId
              ? { background: '#fffbe6' }
              : {}
          })}
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
          openedFromQueryRef.current = '';
          setSearchParams({}, { replace: true });
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
