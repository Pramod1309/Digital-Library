import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Empty, Spin } from 'antd';
import { NotificationOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SchoolAnnouncements = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API}/school/announcements?school_id=${user.school_id}`);
      setAnnouncements(response.data);
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
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default SchoolAnnouncements;
