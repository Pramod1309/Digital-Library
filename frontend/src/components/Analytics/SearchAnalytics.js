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
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

const SearchAnalytics = () => {
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
        console.error('Failed to load schools for search analytics:', error);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await api.get('/admin/analytics/search-insights', {
          params: {
            days,
            category,
            school_id: selectedSchool
          }
        });
        setAnalytics(response.data);
      } catch (error) {
        console.error('Failed to load search analytics:', error);
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

  const queryColumns = [
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query'
    },
    {
      title: 'Searches',
      dataIndex: 'searches',
      key: 'searches',
      render: formatNumber
    },
    {
      title: 'Unique Schools',
      dataIndex: 'unique_schools',
      key: 'unique_schools',
      render: formatNumber
    },
    {
      title: 'Avg Results',
      dataIndex: 'avg_results',
      key: 'avg_results'
    },
    {
      title: 'Zero Results',
      dataIndex: 'zero_results',
      key: 'zero_results',
      render: formatNumber
    },
    {
      title: 'Last Searched',
      dataIndex: 'last_searched_at',
      key: 'last_searched_at',
      render: formatDateTime
    }
  ];

  const schoolColumns = [
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name'
    },
    {
      title: 'Searches',
      dataIndex: 'searches',
      key: 'searches',
      render: formatNumber
    },
    {
      title: 'Zero Results',
      dataIndex: 'zero_results',
      key: 'zero_results',
      render: formatNumber
    },
    {
      title: 'Avg Results',
      dataIndex: 'avg_results',
      key: 'avg_results'
    },
    {
      title: 'Top Query',
      dataIndex: 'top_query',
      key: 'top_query'
    },
    {
      title: 'Last Search',
      dataIndex: 'last_searched_at',
      key: 'last_searched_at',
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
      title: 'Query',
      dataIndex: 'query',
      key: 'query'
    },
    {
      title: 'Results',
      dataIndex: 'results_count',
      key: 'results_count',
      render: formatNumber
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category'
    },
    {
      title: 'When',
      dataIndex: 'created_at',
      key: 'created_at',
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
    return <Empty description="Unable to load search analytics" />;
  }

  const summary = analytics.summary || {};

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Search Analytics</Title>
          <Text type="secondary">
            Track what schools search for, which queries succeed, and where search demand is not being fulfilled.
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
          <Card><Statistic title="Total Searches" value={summary.total_searches || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Searching Schools" value={summary.unique_searching_schools || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Zero Result Searches" value={summary.zero_result_searches || 0} formatter={formatNumber} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Avg Results / Search" value={summary.avg_results_per_search || 0} /></Card>
        </Col>
      </Row>

      <Card title="Search Trend">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={analytics.daily_trend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="searches" stroke={CHART_COLORS.primary} strokeWidth={2} />
            <Line type="monotone" dataKey="zero_results" stroke={CHART_COLORS.danger} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Top Queries">
            <Table
              dataSource={analytics.top_queries || []}
              columns={queryColumns}
              rowKey="query"
              pagination={{ pageSize: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Unserved Searches">
            <Table
              dataSource={analytics.zero_result_queries || []}
              columns={queryColumns}
              rowKey={(record) => `${record.query}-zero`}
              pagination={{ pageSize: 8 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="School Search Breakdown">
        <Table
          dataSource={analytics.school_breakdown || []}
          columns={schoolColumns}
          rowKey="school_id"
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Card title="Recent Searches">
        <Table
          dataSource={analytics.recent_searches || []}
          columns={recentColumns}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </Space>
  );
};

export default SearchAnalytics;
