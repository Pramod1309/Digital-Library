import React, { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import {
  AlertOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  DownloadOutlined,
  FileOutlined,
  RiseOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const { Title, Text } = Typography;

const DashboardHome = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/dashboard/overview');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const openChatForSchool = (schoolId) => {
    navigate(`/admin/communication/chat?school_id=${schoolId}`);
  };

  const openTicket = (ticketId) => {
    navigate(`/admin/support/tickets?ticket_id=${ticketId}`);
  };

  const activityColumns = [
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name'
    },
    {
      title: 'Activity',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: 'Details',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (value) => value ? new Date(value).toLocaleString() : 'N/A'
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'red';
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
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return <Empty description="Unable to load dashboard overview" />;
  }

  const summary = dashboardData.summary || {};
  const recentActivity = dashboardData.recent_activity || [];
  const chatNotifications = dashboardData.chat_notifications || [];
  const ticketNotifications = dashboardData.ticket_notifications || [];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ marginBottom: 4 }}>Dashboard Overview</Title>
        <Text type="secondary">
          Real-time visibility into school usage, pending approvals, active conversations, and support follow-ups.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title="Total Schools Onboarded"
              value={summary.total_schools || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title="Total Resources Uploaded"
              value={summary.total_resources || 0}
              prefix={<FileOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title="Total Downloads This Month"
              value={summary.downloads_this_month || 0}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card
            hoverable
            onClick={() => navigate('/admin/school-uploads')}
            style={{ cursor: 'pointer' }}
          >
            <Statistic
              title="Pending School Requests"
              value={summary.pending_school_requests || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title="Unread Chat Queries"
              value={summary.unread_chat_queries || 0}
              prefix={<CommentOutlined />}
              valueStyle={{ color: '#13c2c2' }}
              suffix={
                summary.schools_waiting_in_chat
                  ? `(${summary.schools_waiting_in_chat} schools)`
                  : ''
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title="Open Ticket Queries"
              value={summary.open_ticket_queries || 0}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title="Schools Active Today"
              value={summary.active_schools_today || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Badge count={summary.unread_chat_queries || 0} />
                <span>Chat Query Tracking</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/admin/communication/chat')}>
                View All Chats
              </Button>
            }
          >
            {chatNotifications.length === 0 ? (
              <Empty description="No unread school chat queries" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={chatNotifications}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button type="link" onClick={() => openChatForSchool(item.school_id)}>
                        Open Chat
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.school_name}</span>
                          <Badge count={item.unread_count} />
                        </Space>
                      }
                      description={
                        <>
                          <div style={{ marginBottom: 4 }}>{item.last_message}</div>
                          <Text type="secondary">{new Date(item.last_message_at).toLocaleString()}</Text>
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
                <Badge count={summary.open_ticket_queries || 0} />
                <span>Ticket Query Tracking</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/admin/support/tickets')}>
                View All Tickets
              </Button>
            }
          >
            {ticketNotifications.length === 0 ? (
              <Empty description="No open school tickets" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={ticketNotifications}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button type="link" onClick={() => openTicket(item.ticket_id)}>
                        Open Ticket
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <span>{item.school_name}</span>
                          <Tag color={getPriorityColor(item.priority)}>{item.priority.toUpperCase()}</Tag>
                          <Tag color={item.status === 'open' ? 'blue' : 'orange'}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </Tag>
                        </Space>
                      }
                      description={
                        <>
                          <div style={{ marginBottom: 4 }}>{item.subject}</div>
                          <Text type="secondary">{new Date(item.created_at).toLocaleString()}</Text>
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

      <Card title="Recent School Activities">
        <Table
          columns={activityColumns}
          dataSource={recentActivity}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No recent school activities found.' }}
        />
      </Card>
    </Space>
  );
};

export default DashboardHome;
