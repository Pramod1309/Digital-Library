import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, message, Spin } from 'antd';
import { SendOutlined, UserOutlined, CommentOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SchoolChat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/chat/messages?school_id=${user.school_id}`);
      setMessages(response.data);
      
      // Mark admin messages as read
      await axios.put(`${API}/chat/mark-read/${user.school_id}?sender_type=school`);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) {
      message.warning('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('school_id', user.school_id);
      formData.append('school_name', user.name);
      formData.append('sender_type', 'school');
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
          <span>
            <CommentOutlined style={{ marginRight: '8px' }} />
            Chat with Admin
          </span>
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
                      justifyContent: item.sender_type === 'school' ? 'flex-end' : 'flex-start',
                      marginBottom: '12px'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: item.sender_type === 'school' ? '#1890ff' : '#fff',
                        color: item.sender_type === 'school' ? '#fff' : '#000',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px', opacity: 0.8 }}>
                        {item.sender_type === 'admin' ? 'Admin' : 'You'}
                      </div>
                      <div style={{ wordBreak: 'break-word' }}>{item.message}</div>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              />
              <div ref={messagesEndRef} />
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

export default SchoolChat;
