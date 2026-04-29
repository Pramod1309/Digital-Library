import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, message, Spin, Upload, Dropdown, Menu, Tooltip } from 'antd';
import { SendOutlined, UserOutlined, CommentOutlined, PaperClipOutlined, CameraOutlined, AudioOutlined, SmileOutlined, PhoneOutlined, VideoCameraOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../../api/axiosConfig';
import EmojiPicker from 'emoji-picker-react';

const SchoolChat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
      const response = await api.get(`/chat/messages?school_id=${user.school_id}`);
      setMessages(response.data);
      
      // Mark admin messages as read
      await api.put(`/chat/mark-read/${user.school_id}?sender_type=school`);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) {
      message.warning('Please enter a message or upload files');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('school_id', user.school_id);
      formData.append('school_name', user.name);
      formData.append('sender_type', 'school');
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

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', backgroundColor: '#f0f2f5' }}>
      {/* Chat Area - Full Width for School */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#efeae2' }}>
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
                Admin Support
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
            <Tooltip title="Support Info">
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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSchool = msg.sender_type === 'school';
              
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isSchool ? 'flex-end' : 'flex-start',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ maxWidth: '65%' }}>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: isSchool ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        backgroundColor: isSchool ? '#dcf8c6' : '#fff',
                        color: '#111b21',
                        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                        position: 'relative',
                        wordBreak: 'break-word'
                      }}
                    >
                      <div>{msg.message}</div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#667781', 
                        marginTop: '4px',
                        textAlign: 'right'
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
              onClick={handleSend}
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
      </div>

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

export default SchoolChat;
