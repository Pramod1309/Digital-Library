import React from 'react';
import { Card, Table, Row, Col, Statistic, Typography } from 'antd';

const { Title } = Typography;

const SchoolActivity = () => {
  // Mock data - replace with actual API calls
  const loginStats = [
    { school: 'School A', logins: 245, pageViews: 1200, downloads: 356 },
    { school: 'School B', logins: 189, pageViews: 980, downloads: 287 },
    // Add more mock data
  ];

  const columns = [
    { title: 'School', dataIndex: 'school', key: 'school' },
    { title: 'Logins', dataIndex: 'logins', key: 'logins' },
    { title: 'Page Views', dataIndex: 'pageViews', key: 'pageViews' },
    { title: 'Downloads', dataIndex: 'downloads', key: 'downloads' },
  ];

  return (
    <div>
      <Title level={2}>School Activity Tracking</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Total Logins Today" value={1245} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Total Page Views" value={5678} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Total Downloads" value={1923} />
          </Card>
        </Col>
      </Row>
      <Card title="School-wise Activity">
        <Table 
          dataSource={loginStats} 
          columns={columns} 
          rowKey="school"
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default SchoolActivity;
