import React, { useEffect, useState } from 'react';
import {
  Badge,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography
} from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  NotificationOutlined,
  UploadOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import config from '../../config';

const { Title, Text } = Typography;
const BACKEND_URL = config.apiBaseUrl;

const SchoolHome = ({ user }) => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const quickAccessItems = [
    { key: 'academic', icon: <BookOutlined />, label: 'Academic', color: '#1890ff' },
    { key: 'marketing', icon: <FileImageOutlined />, label: 'Marketing', color: '#52c41a' },
    { key: 'training', icon: <FileWordOutlined />, label: 'Training', color: '#faad14' },
    { key: 'event', icon: <FilePptOutlined />, label: 'Event', color: '#722ed1' },
    { key: 'multimedia', icon: <VideoCameraOutlined />, label: 'Multimedia', color: '#eb2f96' }
  ];

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get(`/school/dashboard/overview?school_id=${user.school_id}`);
      setOverview(response.data);
    } catch (error) {
      console.error('Error fetching school dashboard overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type = '') => {
    switch (String(type).toLowerCase()) {
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'red';
      case 'high':
        return 'orange';
      case 'normal':
        return 'blue';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const summary = overview?.summary || {};
  const popularResources = overview?.popular_resources || [];
  const announcements = overview?.announcement_notifications || [];
  const chatNotifications = overview?.chat_notifications || [];
  const ticketNotifications = overview?.ticket_notifications || [];
  const recentActivity = overview?.recent_activity || [];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card style={{ marginBottom: 0 }} styles={{ body: { padding: 0 } }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
            padding: '24px',
            color: '#fff',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div style={{ flex: 1 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              Welcome back, {user.name}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.92)' }}>
              Track your downloads, uploads, announcements, and admin responses from one place.
            </Text>
          </div>
          {user.logo_path && (
            <img
              src={`${BACKEND_URL}/api${user.logo_path}`}
              alt={user.name}
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                border: '3px solid #fff',
                boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                objectFit: 'contain',
                background: '#fff',
                padding: 6
              }}
            />
          )}
        </div>
        <div style={{ padding: 24 }}>
          <Title level={5} style={{ marginBottom: 12 }}>Quick Access</Title>
          <Row gutter={[16, 16]}>
            {quickAccessItems.map((item) => (
              <Col key={item.key} xs={24} sm={12} md={8} lg={4}>
                <Card
                  hoverable
                  style={{ textAlign: 'center', borderLeft: `4px solid ${item.color}` }}
                  onClick={() => navigate(`/school/resources/${item.key}`)}
                >
                  <div style={{ fontSize: 24, color: item.color, marginBottom: 8 }}>{item.icon}</div>
                  <div>{item.label}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Downloads This Month"
              value={summary.downloads_this_month || 0}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Resources Uploaded"
              value={summary.resources_uploaded || 0}
              prefix={<UploadOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Upload Approvals"
              value={summary.pending_uploads || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Unread Notifications"
              value={summary.unread_notifications || 0}
              prefix={<NotificationOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Popular Resources"
            extra={<a onClick={() => navigate('/school/resources')}>View All</a>}
          >
            {popularResources.length === 0 ? (
              <Empty description="No popular resources yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={popularResources}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Badge dot color="#1677ff"><span style={{ fontSize: 20 }}>{getResourceIcon(item.category)}</span></Badge>}
                      title={item.name}
                      description={`${item.download_count || 0} downloads`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Badge count={summary.unread_announcements || 0} />
                <span>Announcement Notifications</span>
              </Space>
            }
            extra={<a onClick={() => navigate('/school/communication/announcements')}>Open</a>}
          >
            {announcements.length === 0 ? (
              <Empty description="No announcements right now" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={announcements}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/school/communication/announcements')}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <span>{item.title}</span>
                          <Tag color={getPriorityColor(item.priority)}>{String(item.priority || 'normal').toUpperCase()}</Tag>
                          {item.is_unread && <Tag color="magenta">NEW</Tag>}
                        </Space>
                      }
                      description={
                        <>
                          <div>{String(item.content || '').slice(0, 110)}...</div>
                          <Text type="secondary">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Badge count={summary.unread_chat_messages || 0} />
                <span>Admin Chat Responses</span>
              </Space>
            }
            extra={<a onClick={() => navigate('/school/communication/chat')}>Open Chat</a>}
          >
            {chatNotifications.length === 0 ? (
              <Empty description="No unread admin chat responses" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={chatNotifications}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/school/communication/chat')}
                  >
                    <List.Item.Meta
                      title="Admin replied"
                      description={
                        <>
                          <div>{item.message}</div>
                          <Text type="secondary">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Badge count={summary.unread_ticket_updates || 0} />
                <span>Ticket Responses</span>
              </Space>
            }
            extra={<a onClick={() => navigate('/school/support/tickets')}>Open Tickets</a>}
          >
            {ticketNotifications.length === 0 ? (
              <Empty description="No unread admin ticket responses" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={ticketNotifications}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/school/support/tickets?ticket_id=${item.ticket_id}`)}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <span>{item.subject}</span>
                          <Tag color={getPriorityColor(item.priority)}>{String(item.priority || 'normal').toUpperCase()}</Tag>
                          <Tag color={item.status === 'resolved' ? 'green' : item.status === 'in_progress' ? 'orange' : 'blue'}>
                            {String(item.status || 'open').replace('_', ' ').toUpperCase()}
                          </Tag>
                        </Space>
                      }
                      description={
                        <>
                          <div>{item.admin_response || 'Admin updated your ticket.'}</div>
                          <Text type="secondary">
                            {item.admin_updated_at ? new Date(item.admin_updated_at).toLocaleString() : ''}
                          </Text>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Recent Activity Snapshot" extra={<a onClick={() => navigate('/school/reports')}>View Usage Report</a>}>
        {recentActivity.length === 0 ? (
          <Empty description="No recent activity yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={recentActivity}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={item.title}
                  description={
                    <>
                      <div>{item.description}</div>
                      <Text type="secondary">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
};

export default SchoolHome;
