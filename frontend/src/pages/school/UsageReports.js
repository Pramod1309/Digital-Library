import React, { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Empty,
  List,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  ClockCircleOutlined,
  DownloadOutlined,
  FileOutlined,
  NotificationOutlined,
  SearchOutlined,
  UploadOutlined
} from '@ant-design/icons';
import api from '../../api/axiosConfig';

const { Title, Text } = Typography;

const RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 }
];

const UsageReports = ({ user }) => {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, [days]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/school/analytics/report?school_id=${user.school_id}&days=${days}`);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching usage report:', error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const uploadColumns = [
    {
      title: 'Resource Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (value) => <Tag color="blue">{value}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (value) => {
        const color = value === 'approved' ? 'green' : value === 'pending' ? 'orange' : 'red';
        return <Tag color={color}>{String(value).toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Downloads',
      dataIndex: 'download_count',
      key: 'download_count'
    },
    {
      title: 'Size',
      dataIndex: 'file_size_mb',
      key: 'file_size_mb',
      render: (value) => `${value} MB`
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report) {
    return <Empty description="Unable to load usage report" />;
  }

  const summary = report.summary || {};
  const trend = report.activity_trend || [];
  const categorySummary = report.category_summary || [];
  const topResources = report.top_resources || [];
  const uploadStatus = report.upload_status_breakdown || {};
  const uploadResources = report.upload_resources || [];
  const recentActivity = report.recent_activity || [];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Usage Reports</Title>
          <Text type="secondary">
            Follow how your school uses the library across downloads, searches, previews, uploads, and admin notifications.
          </Text>
        </div>
        <Select
          value={days}
          options={RANGE_OPTIONS}
          onChange={setDays}
          style={{ width: 160 }}
        />
      </div>

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
              title="Pending Uploads"
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
              value={(summary.unread_announcements || 0) + (summary.unread_chat_messages || 0) + (summary.unread_ticket_updates || 0)}
              prefix={<NotificationOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Engagement Trend">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="downloads" stroke="#1677ff" strokeWidth={2} />
                <Line type="monotone" dataKey="searches" stroke="#52c41a" strokeWidth={2} />
                <Line type="monotone" dataKey="previews" stroke="#722ed1" strokeWidth={2} />
                <Line type="monotone" dataKey="uploads" stroke="#fa8c16" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Notification Snapshot">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Statistic title="Unread Announcements" value={summary.unread_announcements || 0} />
              <Statistic title="Unread Admin Chat Replies" value={summary.unread_chat_messages || 0} />
              <Statistic title="Unread Ticket Updates" value={summary.unread_ticket_updates || 0} />
              <Statistic title="Searches in Range" value={summary.searches || 0} prefix={<SearchOutlined />} />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Category Engagement">
            {categorySummary.length === 0 ? (
              <Empty description="No category activity in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={categorySummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="downloads" fill="#1677ff" />
                  <Bar dataKey="previews" fill="#52c41a" />
                  <Bar dataKey="searches" fill="#fa8c16" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Upload Health">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Approved" value={uploadStatus.approved || 0} valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Pending" value={uploadStatus.pending || 0} valueStyle={{ color: '#fa8c16' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Rejected" value={uploadStatus.rejected || 0} valueStyle={{ color: '#ff4d4f' }} />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 20 }}>
              <Title level={5}>Top Used Resources</Title>
              {topResources.length === 0 ? (
                <Empty description="No resource usage yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={topResources}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.name}
                        description={`${item.category} • ${item.downloads || 0} downloads • ${item.previews || 0} previews`}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="My Upload Performance">
        <Table
          columns={uploadColumns}
          dataSource={uploadResources}
          rowKey="resource_id"
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'No uploaded resources yet.' }}
        />
      </Card>

      <Card title="Recent Activity">
        {recentActivity.length === 0 ? (
          <Empty description="No recent activity available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={recentActivity}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<FileOutlined style={{ fontSize: 18, color: '#1677ff' }} />}
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

export default UsageReports;
