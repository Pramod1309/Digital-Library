import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Typography, Select, Badge } from 'antd';
import { UserOutlined, SendOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Mock data - replace with actual API calls
const mockSchools = [
  { id: 1, name: 'Gurukul International Preschool', unread: 2 },
  { id: 2, name: 'Sunshine Kids Academy', unread: 0 },
  { id: 3, name: 'Little Angels School', unread: 5 },
];

const mockMessages = {
  1: [
    { id: 1, text: 'Hello, we have a question about the new curriculum', sender: 'school', time: '10:30 AM' },
    { id: 2, text: 'Hello! How can I help you with the new curriculum?', sender: 'admin', time: '10:32 AM' },
  ],
  2: [
    { id: 1, text: 'Good morning!', sender: 'school', time: '9:15 AM' },
  ],
  3: [
    { id: 1, text: 'We need help with the resource portal', sender: 'school', time: 'Yesterday' },
    { id: 2, text: 'What specific issue are you facing?', sender: 'admin', time: 'Yesterday' },
  ],
};

const Chat = () => {
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // In a real app, fetch messages for the selected school
    setMessages(mockMessages);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedSchool]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!message.trim() || !selectedSchool) return;

    const newMessage = {
      id: Date.now(),
      text: message,
      sender: 'admin',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => ({
      ...prev,
      [selectedSchool]: [...(prev[selectedSchool] || []), newMessage],
    }));

    setMessage('');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
      {/* School List */}
      <div style={{ width: 300, borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <h3>Schools</h3>
        </div>
        <List
          itemLayout="horizontal"
          dataSource={mockSchools}
          renderItem={school => (
            <List.Item
              onClick={() => setSelectedSchool(school.id)}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedSchool === school.id ? '#f5f5f5' : 'transparent',
                padding: '12px 16px',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Badge count={school.unread} size="small">
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                }
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Text ellipsis style={{ maxWidth: '180px' }}>{school.name}</Text>
                    {selectedSchool === school.id && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  </div>
                }
                description={
                  messages[school.id]?.length > 0 
                    ? `${messages[school.id][messages[school.id].length - 1].text.substring(0, 30)}...`
                    : 'No messages yet'
                }
              />
            </List.Item>
          )}
        />
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedSchool ? (
          <>
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3>{mockSchools.find(s => s.id === selectedSchool)?.name}</h3>
              <Button type="link">View School Profile</Button>
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {messages[selectedSchool]?.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    padding: '8px 16px',
                    borderRadius: '18px',
                    backgroundColor: msg.sender === 'admin' ? '#1890ff' : '#f0f0f0',
                    color: msg.sender === 'admin' ? 'white' : 'inherit',
                  }}
                >
                  <div>{msg.text}</div>
                  <div style={{ 
                    fontSize: '12px', 
                    textAlign: 'right',
                    color: msg.sender === 'admin' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.45)'
                  }}>
                    {msg.time}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ 
              padding: '16px', 
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: '8px'
            }}>
              <TextArea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                type="primary" 
                icon={<SendOutlined />} 
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                Send
              </Button>
            </div>
          </>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            color: 'rgba(0, 0, 0, 0.45)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>💬</div>
            <h3>Select a school to start chatting</h3>
            <p>Or use the search bar to find a specific school</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
