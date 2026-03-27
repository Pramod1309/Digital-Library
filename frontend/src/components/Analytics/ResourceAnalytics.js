import React from 'react';
import { Card, Table, Row, Col, Select, DatePicker, Typography } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ResourceAnalytics = () => {
  // Mock data - replace with actual API calls
  const resourceData = [
    { name: 'Jan', academic: 4000, marketing: 2400, administrative: 2400 },
    { name: 'Feb', academic: 3000, marketing: 1398, administrative: 2210 },
    // Add more mock data
  ];

  const topResources = [
    { name: 'Math Workbook', downloads: 245, class: 'Nursery' },
    { name: 'Alphabet Chart', downloads: 189, class: 'Jr. KG' },
    // Add more mock data
  ];

  const columns = [
    { title: 'Resource', dataIndex: 'name', key: 'name' },
    { title: 'Downloads', dataIndex: 'downloads', key: 'downloads' },
    { title: 'Class', dataIndex: 'class', key: 'class' },
  ];

  return (
    <div>
      <Title level={2}>Resource Analytics</Title>
      
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Select defaultValue="all" style={{ width: '100%' }}>
              <Option value="all">All Categories</Option>
              <Option value="academic">Academic</Option>
              <Option value="marketing">Marketing</Option>
              <Option value="administrative">Administrative</Option>
            </Select>
          </Col>
          <Col span={16}>
            <RangePicker style={{ width: '100%' }} />
          </Col>
        </Row>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={resourceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="academic" fill="#8884d8" name="Academic" />
            <Bar dataKey="marketing" fill="#82ca9d" name="Marketing" />
            <Bar dataKey="administrative" fill="#ffc658" name="Administrative" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      
      <Card title="Top Downloaded Resources">
        <Table 
          dataSource={topResources} 
          columns={columns} 
          rowKey="name"
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default ResourceAnalytics;
