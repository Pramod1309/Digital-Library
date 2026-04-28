import React, { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Typography
} from 'antd';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../api/axiosConfig';
import {
  CHART_COLORS,
  TIME_RANGE_OPTIONS,
  formatDateTime,
  formatNumber
} from './analyticsConfig';

const { Title, Text } = Typography;

const SchoolActivity = () => {
  const [days, setDays] = useState(30);
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [schools, setSchools] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await api.get('/admin/schools');
        setSchools(response.data || []);
      } catch (error) {
        console.error('Failed to load schools for analytics:', error);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await api.get('/admin/analytics/school-activity', {
          params: {
            days,
            school_id: selectedSchool
          }
        });
        setAnalytics(response.data);
      } catch (error) {
        console.error('Failed to load school activity analytics:', error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [days, selectedSchool]);

  const schoolOptions = [
    { label: 'All Schools', value: 'all' },
    ...schools.map((school) => ({
      label: school.school_name,
      value: school.school_id
    }))
  ];

  const schoolColumns = [
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name'
    },
    {
      title: 'Activity Score',
      dataIndex: 'activity_score',
      key: 'activity_score',
      render: (value) => formatNumber(value)
    },
    {
      title: 'Logins',
      dataIndex: 'logins',
      key: 'logins',
      render: (value) => formatNumber(value)
    },
    {
      title: 'Logouts',
      dataIndex: 'logouts',
      key: 'logouts',
      render: (value) => formatNumber(value)
    },
    {
      title: 'Page Views',
      dataIndex: 'page_views',
      key: 'page_views',
      render: (value) => formatNumber(value)
    },
    {
      title: 'Searches',
      dataIndex: 'searches',
      key: 'searches',
      render: (value) => formatNumber(value)
    },
    {
      title: 'Downloads',
      dataIndex: 'downloads',
      key: 'downloads',
      render: (value) => formatNumber(value)
    },
    {
      title: 'Uploads',
      dataIndex: 'uploads',
      key: 'uploads',
      render: (value) => formatNumber(value)
    },
    {
      title: 'Last Active',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      render: (value, record) => value ? formatDateTime(value) : record.last_activity_label
    }
  ];

  const recentActivityColumns = [
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
      title: 'When',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (value) => formatDateTime(value)
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!analytics) {
    return <Empty description="Unable to load school activity analytics" />;
  }

  const summary = analytics.summary || {};

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>School Activity</Title>
          <Text type="secondary">
            Live visibility into how schools are using the platform across visits, searches, previews, downloads, uploads, chats, and support actions.
          </Text>
        </div>
        <Space wrap>
          <Select
            value={days}
            options={TIME_RANGE_OPTIONS}
            onChange={setDays}
            style={{ width: 150 }}
          />
          <Select
            value={selectedSchool}
            options={schoolOptions}
            onChange={setSelectedSchool}
            showSearch
            optionFilterProp="label"
            style={{ width: 220 }}
          />
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Active Schools" value={summary.active_schools || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Logins" value={summary.total_logins || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Logouts" value={summary.total_logouts || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Page Views" value={summary.total_page_views || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Downloads" value={summary.total_downloads || 0} formatter={formatNumber} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Daily Activity Trend">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={analytics.daily_activity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="logins" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.16} />
                <Area type="monotone" dataKey="page_views" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.12} />
                <Area type="monotone" dataKey="downloads" stroke={CHART_COLORS.orange} fill={CHART_COLORS.orange} fillOpacity={0.14} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Activity Mix">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics.activity_breakdown || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={90} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.purple} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="School-wise Breakdown">
        <Table
          dataSource={analytics.school_breakdown || []}
          columns={schoolColumns}
          rowKey="school_id"
          pagination={{ pageSize: 8 }}
          scroll={{ x: 980 }}
        />
      </Card>

      <Card title="Recent School Activity">
        <Table
          dataSource={analytics.recent_activity || []}
          columns={recentActivityColumns}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'No recent school activity found for this filter.' }}
        />
      </Card>
    </Space>
  );
};

export default SchoolActivity;
