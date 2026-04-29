import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Select, Input, Button, Avatar, message, Spin, Empty, Modal, Upload, Dropdown, Menu, Badge, Tooltip } from 'antd';
import { SendOutlined, UserOutlined, CommentOutlined, PaperClipOutlined, CameraOutlined, AudioOutlined, SmileOutlined, MoreOutlined, DeleteOutlined, EditOutlined, SearchOutlined, PhoneOutlined, VideoCameraOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EmojiPicker from 'emoji-picker-react';

const { Option } = Select;

const AdminChat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const requestedSchoolId = searchParams.get('school_id');

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchMessages();
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (!schools.length) {
      return;
    }

    if (requestedSchoolId && schools.some((school) => school.school_id === requestedSchoolId)) {
      if (selectedSchool !== requestedSchoolId) {
        setSelectedSchool(requestedSchoolId);
      }
      return;
    }

    if (!selectedSchool) {
      const firstSchoolId = schools[0].school_id;
      setSelectedSchool(firstSchoolId);
      setSearchParams({ school_id: firstSchoolId }, { replace: true });
    }
  }, [requestedSchoolId, schools, selectedSchool, setSearchParams]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/admin/schools');
      setSchools(response.data);
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
      const response = await api.get(`/chat/messages?school_id=${selectedSchool}`);
      setMessages(response.data);
      
      // Mark school messages as read
      await api.put(`/chat/mark-read/${selectedSchool}?sender_type=admin`);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) {
      message.warning('Please enter a message or upload files');
      return;
    }

    setSending(true);
    try {
      const school = schools.find(s => s.school_id === selectedSchool);
      
      const formData = new FormData();
      formData.append('school_id', selectedSchool);
      formData.append('school_name', school.school_name);
      formData.append('sender_type', 'admin');
      formData.append('message', newMessage || ' '); // Send empty string if only files
      
      // Append uploaded files
      uploadedFiles.forEach((file, index) => {
        formData.append(`files`, file.originFileObj);
      });

      await api.post('/chat/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setNewMessage('');
      setUploadedFiles([]);
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

  const handleSchoolChange = (value) => {
    setSelectedSchool(value);
    setSearchParams({ school_id: value }, { replace: true });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleEmojiSelect = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (file) => {
    setUploadedFiles(prev => [...prev, file]);
    return false; // Prevent default upload behavior
  };

  const handleCameraCapture = (file) => {
    setUploadedFiles(prev => [...prev, file]);
    setShowCameraModal(false);
    return false;
  };

  const startRecording = () => {
    if (!window.SpeechRecognition || !window.webkitSpeechRecognition) {
      message.error('Speech recognition is not supported in your browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setNewMessage(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      message.error('Speech recognition error: ' + event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setNewMessage(message.message);
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !newMessage.trim()) return;
    
    try {
      await api.put(`/chat/messages/${editingMessage.id}`, { message: newMessage });
      message.success('Message updated successfully');
      setEditingMessage(null);
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      message.error('Failed to update message');
    }
  };

  const handleDeleteMessage = (message) => {
    setMessageToDelete(message);
    setDeleteModalVisible(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    try {
      await api.delete(`/chat/messages/${messageToDelete.id}`);
      message.success('Message deleted successfully');
      setDeleteModalVisible(false);
      setMessageToDelete(null);
      fetchMessages();
    } catch (error) {
      message.error('Failed to delete message');
    }
  };

  const getMessageActions = (message) => (
    <Menu>
      <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEditMessage(message)}>
        Edit Message
      </Menu.Item>
      <Menu.Item key="delete" icon={<DeleteOutlined />} onClick={() => handleDeleteMessage(message)}>
        Delete Message
      </Menu.Item>
    </Menu>
  );

  const filteredSchools = schools.filter(school => 
    school.school_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', backgroundColor: '#f0f2f5' }}>
      {/* School List Sidebar */}
      <div style={{ 
        width: 350, 
        backgroundColor: '#fff', 
        borderRight: '1px solid #e4e6eb',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid #e4e6eb',
          backgroundColor: '#075e54',
          color: '#fff'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Admin Chat</h3>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e4e6eb' }}>
          <div style={{ position: 'relative' }}>
            <SearchOutlined style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#65676b'
            }} />
            <Input
              placeholder="Search schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                paddingLeft: '40px',
                borderRadius: '8px',
                backgroundColor: '#f0f2f5'
              }}
              bordered={false}
            />
          </div>
        </div>

        {/* School List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : (
            <List
              dataSource={filteredSchools}
              renderItem={school => {
                const isSelected = selectedSchool === school.school_id;
                const lastMessage = messages.find(m => m.school_id === school.school_id);
                const unreadCount = messages.filter(m => 
                  m.school_id === school.school_id && 
                  m.sender_type === 'school' && 
                  !m.is_read
                ).length;
                
                return (
                  <List.Item
                    onClick={() => handleSchoolChange(school.school_id)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f0f2f5' : 'transparent',
                      padding: '12px 20px',
                      borderBottom: '1px solid #f0f2f5',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative' }}>
                          <Avatar 
                            size={48} 
                            style={{ backgroundColor: '#075e54' }}
                            icon={<UserOutlined />}
                          />
                          {unreadCount > 0 && (
                            <Badge 
                              count={unreadCount} 
                              size="small" 
                              style={{ 
                                position: 'absolute', 
                                top: '-4px', 
                                right: '-4px',
                                backgroundColor: '#25d366'
                              }}
                            />
                          )}
                        </div>
                      }
                      title={
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          fontWeight: '600',
                          color: '#111b21'
                        }}>
                          <span>{school.school_name}</span>
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#667781',
                            fontWeight: '400'
                          }}>
                            {lastMessage ? new Date(lastMessage.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : ''}
                          </span>
                        </div>
                      }
                      description={
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          color: '#667781'
                        }}>
                          <span style={{ 
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px'
                          }}>
                            {lastMessage ? 
                              (lastMessage.sender_type === 'admin' ? `You: ${lastMessage.message}` : lastMessage.message)
                              : 'No messages yet'
                            }
                          </span>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#efeae2' }}>
        {selectedSchool ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#075e54',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  size={40} 
                  style={{ backgroundColor: '#25d366', marginRight: '12px' }}
                  icon={<UserOutlined />}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>
                    {schools.find(s => s.school_id === selectedSchool)?.school_name}
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.8 }}>
                    Active now
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Tooltip title="Voice Call">
                  <Button 
                    type="text" 
                    icon={<PhoneOutlined />} 
                    style={{ color: '#fff' }}
                  />
                </Tooltip>
                <Tooltip title="Video Call">
                  <Button 
                    type="text" 
                    icon={<VideoCameraOutlined />} 
                    style={{ color: '#fff' }}
                  />
                </Tooltip>
                <Tooltip title="School Info">
                  <Button 
                    type="text" 
                    icon={<InfoCircleOutlined />} 
                    style={{ color: '#fff' }}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '20px',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 100 0 L 0 0 0 100" fill="none" stroke="%23e4e6eb" stroke-width="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100%25" height="100%25" fill="url(%23grid)" /%3E%3C/svg%3E")',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {messages.map((msg, index) => {
                const isAdmin = msg.sender_type === 'admin';
                const isEditing = editingMessage?.id === msg.id;
                
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ maxWidth: '65%' }}>
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: isAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          backgroundColor: isAdmin ? '#dcf8c6' : '#fff',
                          color: '#111b21',
                          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                          position: 'relative',
                          wordBreak: 'break-word'
                        }}
                      >
                        {isEditing ? (
                          <div>
                            <Input.TextArea
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              autoSize={{ minRows: 1, maxRows: 4 }}
                              style={{ border: 'none', padding: 0 }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <Button size="small" onClick={() => setEditingMessage(null)}>
                                Cancel
                              </Button>
                              <Button size="small" type="primary" onClick={handleUpdateMessage}>
                                Update
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>{msg.message}</div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#667781', 
                              marginTop: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</span>
                              {isAdmin && (
                                <Dropdown overlay={getMessageActions(msg)} trigger={['click']}>
                                  <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<MoreOutlined />}
                                    style={{ 
                                      color: '#667781',
                                      padding: '0 4px'
                                    }}
                                  />
                                </Dropdown>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Area */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#f0f2f5',
              borderTop: '1px solid #e4e6eb'
            }}>
              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        marginRight: '8px',
                        marginBottom: '8px',
                        border: '1px solid #e4e6eb'
                      }}
                    >
                      <PaperClipOutlined style={{ marginRight: '4px' }} />
                      <span style={{ fontSize: '12px' }}>{file.name}</span>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                        style={{ padding: '0 4px' }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Emoji Picker */}
                <div style={{ position: 'relative' }}>
                  <Button
                    type="text"
                    icon={<SmileOutlined />}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{ color: '#54656f' }}
                  />
                  {showEmojiPicker && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '100%', 
                      left: '0',
                      marginBottom: '8px',
                      zIndex: 1000
                    }}>
                      <EmojiPicker onEmojiClick={handleEmojiSelect} />
                    </div>
                  )}
                </div>

                {/* File Upload */}
                <Upload
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  multiple
                >
                  <Button
                    type="text"
                    icon={<PaperClipOutlined />}
                    style={{ color: '#54656f' }}
                  />
                </Upload>

                {/* Camera */}
                <Upload
                  beforeUpload={handleCameraCapture}
                  accept="image/*"
                  capture="environment"
                  showUploadList={false}
                >
                  <Button
                    type="text"
                    icon={<CameraOutlined />}
                    style={{ color: '#54656f' }}
                  />
                </Upload>

                {/* Microphone */}
                <Button
                  type="text"
                  icon={<AudioOutlined />}
                  onClick={startRecording}
                  style={{ color: isRecording ? '#ff4d4f' : '#54656f' }}
                />

                {/* Message Input */}
                <Input.TextArea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{
                    flex: 1,
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                  }}
                  bordered={false}
                />

                {/* Send Button */}
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={editingMessage ? handleUpdateMessage : handleSend}
                  loading={sending}
                  disabled={!newMessage.trim() && uploadedFiles.length === 0}
                  style={{
                    backgroundColor: '#25d366',
                    borderColor: '#25d366',
                    borderRadius: '50%'
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            color: '#54656f',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ color: '#111b21' }}>Select a school to start chatting</h3>
            <p>Choose a school from the list to begin your conversation</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Message"
        open={deleteModalVisible}
        onOk={confirmDeleteMessage}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this message? This action cannot be undone.</p>
      </Modal>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
        multiple
      />
      <input
        ref={cameraInputRef}
        type="file"
        style={{ display: 'none' }}
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files[0] && handleCameraCapture(e.target.files[0])}
      />
    </div>
  );
};

export default AdminChat;
