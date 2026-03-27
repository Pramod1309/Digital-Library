import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Avatar, Button } from 'antd';
import { 
  BookOutlined, 
  FileImageOutlined, 
  FileWordOutlined,
  FilePptOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
  NotificationOutlined,
  StarOutlined,
  UserOutlined,
  UploadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SchoolHome = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    downloadsThisMonth: 0,
    resourcesUploaded: 0,
    storage_used_mb: 0
  });
  const [announcements, setAnnouncements] = useState([]);
  const [topResources, setTopResources] = useState([]);

  const quickAccessItems = [
    { key: 'academic', icon: <BookOutlined />, label: 'Academic', color: '#1890ff' },
    { key: 'marketing', icon: <FileImageOutlined />, label: 'Marketing', color: '#52c41a' },
    { key: 'training', icon: <FileWordOutlined />, label: 'Training', color: '#faad14' },
    { key: 'event', icon: <FilePptOutlined />, label: 'Event', color: '#722ed1' },
    { key: 'multimedia', icon: <VideoCameraOutlined />, label: 'Multimedia', color: '#eb2f96' },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch usage stats
      const usageResponse = await axios.get(`${API}/school/analytics/usage?school_id=${user.school_id}`);
      setStats(usageResponse.data);

      // Fetch announcements
      const announcementsResponse = await axios.get(`${API}/school/announcements?school_id=${user.school_id}`);
      setAnnouncements(announcementsResponse.data.slice(0, 3));

      // Fetch top resources
      const resourcesResponse = await axios.get(`${API}/school/resources?school_id=${user.school_id}`);
      const sortedResources = resourcesResponse.data
        .filter(r => r.approval_status === 'approved')
        .sort((a, b) => b.download_count - a.download_count)
        .slice(0, 5);
      setTopResources(sortedResources);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getResourceIcon = (type) => {
    switch(type.toLowerCase()) {
      case 'academic':
        return <BookOutlined />;
      case 'marketing':
        return <FileImageOutlined />;
      case 'training':
        return <FileWordOutlined />;
      case 'event':
        return <FilePptOutlined />;
      case 'multimedia':
        return <VideoCameraOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  return (
    <div>
      {/* Welcome Section with Sky Blue Banner */}
      <Card 
        style={{ marginBottom: 24 }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ 
          background: '#1890ff', 
          padding: '24px', 
          color: '#fff',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: '#fff', margin: 0 }}>Welcome back, {user.name}!</h2>
            <p style={{ margin: 0 }}>Here's what's happening with your school portal today.</p>
          </div>
          {(() => {
            console.log('SchoolHome - User logo_path:', user.logo_path);
            console.log('SchoolHome - Full URL:', `${BACKEND_URL}/api${user.logo_path}`);
            return user.logo_path && (
              <img 
                src={`${BACKEND_URL}/api${user.logo_path}`} 
                alt={user.name}
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%',
                  border: '3px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  objectFit: 'contain',
                  background: '#fff',
                  padding: '5px',
                  display: 'block'
                }}
                onLoad={(e) => console.log('School logo loaded:', e.target.src)}
                onError={(e) => console.error('School logo failed:', e.target.src)}
              />
            );
          })()}
        </div>
        <div style={{ padding: '24px' }}>
          <div className="quick-access">
            <h3>Quick Access</h3>
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              {quickAccessItems.map(item => (
                <Col key={item.key} xs={24} sm={12} md={8} lg={4}>
                  <Card 
                    hoverable
                    style={{ 
                      textAlign: 'center',
                      borderLeft: `4px solid ${item.color}`
                    }}
                    onClick={() => navigate(`/school/resources/${item.key}`)}
                  >
                    <div style={{ fontSize: '24px', color: item.color, marginBottom: '8px' }}>
                      {item.icon}
                    </div>
                    <div>{item.label}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic 
              title="Downloads This Month" 
              value={stats.downloadsThisMonth} 
              prefix={<DownloadOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic 
              title="Resources Uploaded" 
              value={stats.resourcesUploaded} 
              prefix={<UploadOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card>
            <Statistic 
              title="Storage Used (MB)" 
              value={stats.storage_used_mb} 
              prefix={<UserOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Most Used Resources */}
        <Col xs={24} md={12}>
          <Card 
            title="Popular Resources" 
            extra={<a onClick={() => navigate('/school/resources')}>View All</a>}
          >
            <List
              itemLayout="horizontal"
              dataSource={topResources}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={getResourceIcon(item.category)} />}
                    title={item.name}
                    description={`${item.download_count} downloads`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Announcements */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <span>
                <NotificationOutlined style={{ marginRight: '8px' }} />
                Announcements
              </span>
            }
            extra={<a onClick={() => navigate('/school/announcements')}>View All</a>}
          >
            <List
              itemLayout="horizontal"
              dataSource={announcements}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={item.content.substring(0, 100) + '...'}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SchoolHome;
