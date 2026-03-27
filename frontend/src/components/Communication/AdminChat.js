import React, { useState, useEffect } from 'react';
import { Card, List, Select, Input, Button, Avatar, message, Spin, Empty } from 'antd';
import { SendOutlined, UserOutlined, CommentOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const { Option } = Select;

const AdminChat = () => {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedSchool]);

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/admin/schools`);
      setSchools(response.data);
      if (response.data.length > 0) {
        setSelectedSchool(response.data[0].school_id);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      message.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedSchool) return;
    
    try {
      const response = await axios.get(`${API}/chat/messages?school_id=${selectedSchool}`);
      setMessages(response.data);
      
      // Mark school messages as read
      await axios.put(`${API}/chat/mark-read/${selectedSchool}?sender_type=admin`);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedSchool) {
      message.warning('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const school = schools.find(s => s.school_id === selectedSchool);
      
      const formData = new FormData();
      formData.append('school_id', selectedSchool);
      formData.append('school_name', school.school_name);
      formData.append('sender_type', 'admin');
      formData.append('message', newMessage);

      await axios.post(`${API}/chat/send`, formData);
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              <CommentOutlined style={{ marginRight: '8px' }} />
              Chat with Schools
            </span>
            <Select
              value={selectedSchool}
              onChange={setSelectedSchool}
              style={{ width: 300 }}
              placeholder="Select a school"
            >
              {schools.map(school => (
                <Option key={school.school_id} value={school.school_id}>
                  {school.school_name}
                </Option>
              ))}
            </Select>
          </div>
        }
        style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}
        styles={{
          body: { 
            flex: 1, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column' 
          }
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : !selectedSchool ? (
          <Empty description="Select a school to start chatting" />
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
              <List
                dataSource={messages}
                renderItem={item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: item.sender_type === 'admin' ? 'flex-end' : 'flex-start',
                      marginBottom: '12px'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: item.sender_type === 'admin' ? '#1890ff' : '#fff',
                        color: item.sender_type === 'admin' ? '#fff' : '#000',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px', opacity: 0.8 }}>
                        {item.sender_type === 'admin' ? 'You (Admin)' : item.school_name}
                      </div>
                      <div style={{ wordBreak: 'break-word' }}>{item.message}</div>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Input.TextArea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sending}
                style={{ height: '40px' }}
              >
                Send
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AdminChat;
