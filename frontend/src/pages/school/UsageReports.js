import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { 
  DownloadOutlined, 
  UploadOutlined, 
  FileOutlined,
  ClockCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UsageReports = ({ user }) => {
  const [stats, setStats] = useState({
    downloadsThisMonth: 0,
    resourcesUploaded: 0,
    storage_used_mb: 0
  });
  const [activities, setActivities] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      // Fetch usage stats
      const usageResponse = await axios.get(`${API}/school/analytics/usage?school_id=${user.school_id}`);
      setStats(usageResponse.data);

      // Fetch school's uploaded resources
      const resourcesResponse = await axios.get(`${API}/school/resources?school_id=${user.school_id}`);
      const schoolResources = resourcesResponse.data.filter(r => r.uploaded_by_id === user.school_id);
      setResources(schoolResources);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  const resourceColumns = [
    {
      title: 'Resource Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue">{category}</Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (status) => {
        const color = status === 'approved' ? 'green' : status === 'pending' ? 'orange' : 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Downloads',
      dataIndex: 'download_count',
      key: 'download_count',
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => `${(size / (1024 * 1024)).toFixed(2)} MB`
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Usage Reports & Analytics</h2>
      
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Downloads This Month" 
              value={stats.downloadsThisMonth} 
              prefix={<DownloadOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Resources Uploaded" 
              value={stats.resourcesUploaded} 
              prefix={<UploadOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Storage Used" 
              value={stats.storage_used_mb} 
              suffix="MB"
              prefix={<DatabaseOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Total Resources" 
              value={resources.length} 
              prefix={<FileOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Storage Usage Progress */}
      <Card title="Storage Overview" style={{ marginBottom: '24px' }}>
        <div className="usage-item">
          <div className="usage-label">Storage Used</div>
          <div className="usage-bar" style={{ 
            width: '100%', 
            height: '30px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '8px'
          }}>
            <div 
              className="usage-progress" 
              style={{ 
                width: `${Math.min((stats.storage_used_mb / 1024) * 100, 100)}%`,
                height: '100%',
                backgroundColor: '#1890ff',
                transition: 'width 0.3s'
              }}
            ></div>
          </div>
          <div className="usage-value" style={{ marginTop: '8px' }}>
            {stats.storage_used_mb} MB used of 1 GB (Limit: 100MB per file)
          </div>
        </div>
      </Card>

      {/* Resources Table */}
      <Card title="Your Uploaded Resources">
        <Table 
          columns={resourceColumns}
          dataSource={resources}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default UsageReports;
