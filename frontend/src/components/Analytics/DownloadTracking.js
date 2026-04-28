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
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../api/axiosConfig';
import {
  CATEGORY_OPTIONS,
  CHART_COLORS,
  TIME_RANGE_OPTIONS,
  formatDateTime,
  formatNumber
} from './analyticsConfig';

const { Title, Text } = Typography;

const DownloadTracking = () => {
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState('all');
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
        console.error('Failed to load schools for download tracking:', error);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await api.get('/admin/analytics/download-tracking', {
          params: {
            days,
            category,
            school_id: selectedSchool
          }
        });
        setAnalytics(response.data);
      } catch (error) {
        console.error('Failed to load download tracking analytics:', error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [category, days, selectedSchool]);

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
      title: 'Downloads',
      dataIndex: 'downloads',
      key: 'downloads',
      render: formatNumber
    },
    {
      title: 'Unique Resources',
      dataIndex: 'unique_resources',
      key: 'unique_resources',
      render: formatNumber
    },
    {
      title: 'Last Download',
      dataIndex: 'last_downloaded_at',
      key: 'last_downloaded_at',
      render: formatDateTime
    }
  ];

  const resourceColumns = [
    {
      title: 'Resource',
      dataIndex: 'resource_name',
      key: 'resource_name'
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category'
    },
    {
      title: 'Downloads',
      dataIndex: 'downloads',
      key: 'downloads',
      render: formatNumber
    },
    {
      title: 'Unique Schools',
      dataIndex: 'unique_schools',
      key: 'unique_schools',
      render: formatNumber
    },
    {
      title: 'Last Download',
      dataIndex: 'last_downloaded_at',
      key: 'last_downloaded_at',
      render: formatDateTime
    }
  ];

  const recentColumns = [
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name'
    },
    {
      title: 'Resource',
      dataIndex: 'resource_name',
      key: 'resource_name'
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category'
    },
    {
      title: 'Downloaded At',
      dataIndex: 'downloaded_at',
      key: 'downloaded_at',
      render: formatDateTime
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
    return <Empty description="Unable to load download tracking analytics" />;
  }

  const summary = analytics.summary || {};

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Download Tracking</Title>
          <Text type="secondary">
            Follow every school download across time, resources, and categories to understand actual content consumption.
          </Text>
        </div>
        <Space wrap>
          <Select value={days} options={TIME_RANGE_OPTIONS} onChange={setDays} style={{ width: 150 }} />
          <Select value={category} options={CATEGORY_OPTIONS} onChange={setCategory} style={{ width: 170 }} />
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
          <Card><Statistic title="Total Downloads" value={summary.total_downloads || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Downloading Schools" value={summary.unique_schools || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Downloaded Resources" value={summary.unique_resources || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Avg Downloads / School" value={summary.avg_downloads_per_school || 0} /></Card>
        </Col>
      </Row>

      <Card title="Daily Download Volume">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={analytics.daily_trend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="downloads" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.18} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Top Downloading Schools">
            <Table
              dataSource={analytics.school_breakdown || []}
              columns={schoolColumns}
              rowKey="school_id"
              pagination={{ pageSize: 7 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Top Downloaded Resources">
            <Table
              dataSource={analytics.resource_breakdown || []}
              columns={resourceColumns}
              rowKey="resource_id"
              pagination={{ pageSize: 7 }}
              scroll={{ x: 860 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Download Events">
        <Table
          dataSource={analytics.recent_downloads || []}
          columns={recentColumns}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </Space>
  );
};

export default DownloadTracking;
