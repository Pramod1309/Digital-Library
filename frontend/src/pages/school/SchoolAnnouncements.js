import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Empty, Spin, Modal, Space, Image, Typography, Button } from 'antd';
import { NotificationOutlined, ClockCircleOutlined, FileOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../api/axiosConfig';

const SchoolAnnouncements = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get(`/school/announcements?school_id=${user.school_id}`);
      setAnnouncements(response.data);

      if (response.data?.length) {
        await api.post('/school/announcements/mark-read', {
          school_id: user.school_id,
          announcement_ids: response.data.map((item) => item.id)
        });
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
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

  const handlePreview = (file) => {
    setPreviewFile(file);
    setPreviewVisible(true);
  };

  return (
    <div>
      <Card 
        title={
          <span>
            <NotificationOutlined style={{ marginRight: '8px' }} />
            Announcements
          </span>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : announcements.length === 0 ? (
          <Empty description="No announcements at this time" />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={announcements}
            renderItem={item => (
              <List.Item
                key={item.id}
                style={{ 
                  borderLeft: `4px solid ${item.priority === 'urgent' ? '#ff4d4f' : item.priority === 'high' ? '#faad14' : '#1890ff'}`,
                  paddingLeft: '16px',
                  marginBottom: '16px'
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.title}</span>
                      <Tag color={getPriorityColor(item.priority)}>
                        {item.priority.toUpperCase()}
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                      <ClockCircleOutlined style={{ marginRight: '8px' }} />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  }
                />
                <div style={{ marginTop: '12px', fontSize: '15px', lineHeight: '1.6' }}>
                  {item.content}
                </div>
                
                {/* Show attachments if any */}
                {item.attachments && item.attachments.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
                      Attachments:
                    </div>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {item.attachments.map((file, idx) => (
                        <Space key={idx} style={{ 
                          padding: '8px 12px', 
                          background: '#f5f5f5', 
                          borderRadius: '6px',
                          border: '1px solid #d9d9d9'
                        }}>
                          <FileOutlined style={{ color: '#1890ff' }} />
                          <span style={{ fontSize: '14px' }}>{file.original_name}</span>
                          <Button 
                            type="link" 
                            size="small" 
                            icon={<EyeOutlined />}
                            onClick={() => handlePreview(file)}
                          >
                            Preview
                          </Button>
                        </Space>
                      ))}
                    </Space>
                  </div>
                )}
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="File Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        {previewFile && (
          <div>
            {previewFile.file_type?.startsWith('image/') ? (
              <Image 
                src={previewFile.url} 
                alt={previewFile.original_name}
                style={{ width: '100%' }}
              />
            ) : previewFile.file_type?.includes('pdf') ? (
              <iframe
                src={previewFile.url}
                style={{ width: '100%', height: '500px' }}
                title={previewFile.original_name}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>
                  <span style={{ fontWeight: 'bold' }}>{previewFile.original_name}</span>
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

export default SchoolAnnouncements;
