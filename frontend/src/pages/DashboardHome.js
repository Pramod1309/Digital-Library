import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, message, Spin } from 'antd';
import { 
  UserOutlined, 
  FileOutlined, 
  DownloadOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalResources: 0,
    totalDownloads: 0,
    pendingRequests: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch schools count
      const schoolsResponse = await axios.get(`${API}/admin/schools`);
      const totalSchools = schoolsResponse.data.length;

      // Fetch resource analytics
      const analyticsResponse = await axios.get(`${API}/admin/analytics/resources`);
      const { total_resources, total_downloads, pending_approvals } = analyticsResponse.data;

      // Fetch recent activities
      const activitiesResponse = await axios.get(`${API}/admin/activities`);
      const recentActivities = activitiesResponse.data.slice(0, 10);

      setStats({
        totalSchools,
        totalResources: total_resources,
        totalDownloads: total_downloads,
        pendingRequests: pending_approvals
      });

      setRecentActivities(recentActivities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const activityColumns = [
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name',
    },
    {
      title: 'Activity',
      dataIndex: 'activity_type',
      key: 'activity_type',
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleString()
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Dashboard Overview</h1>
      
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Schools Onboarded"
              value={stats.totalSchools}
              prefix={<UserOutlined />}
              styles={{ content: { color: '#3f8600' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Resources Uploaded"
              value={stats.totalResources}
              prefix={<FileOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Downloads This Month"
              value={stats.totalDownloads}
              prefix={<DownloadOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending School Requests"
              value={stats.pendingRequests}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent School Activities">
        <Table
          columns={activityColumns}
          dataSource={recentActivities}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default DashboardHome;
