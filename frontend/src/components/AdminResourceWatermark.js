import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Table, Tag, message, Spin, Row, Col, Slider, Input, Form } from 'antd';
import { FileImageOutlined, DownloadOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../api/axiosConfig';

const AdminResourceWatermark = () => {
  const [resources, setResources] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [watermarkSettings, setWatermarkSettings] = useState({
    logoX: 50,
    logoY: 10,
    logoWidth: 20,
    logoOpacity: 70
  });

  useEffect(() => {
    fetchResources();
    fetchSchools();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/resources');
      setResources(response.data.filter(r => 
        r.file_type?.includes('image') || r.file_type?.includes('pdf')
      ));
    } catch (error) {
      console.error('Error fetching resources:', error);
      message.error('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/admin/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const handleBatchDownload = async () => {
    if (!selectedResource) {
      message.warning('Please select a resource first');
      return;
    }

    try {
      setLoading(true);
      message.info('Generating watermarked files...');
      
      const formData = new FormData();
      formData.append('resource_id', selectedResource);
      formData.append('school_id', selectedSchool);
      formData.append('logo_x', watermarkSettings.logoX);
      formData.append('logo_y', watermarkSettings.logoY);
      formData.append('logo_width', watermarkSettings.logoWidth);
      formData.append('logo_opacity', watermarkSettings.logoOpacity / 100);

      const response = await api.post('/admin/download-batch-watermarked', formData, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'watermarked_resources.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Batch download completed!');
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to generate watermarked files');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Resource',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <FileImageOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="blue">{cat}</Tag>
    },
    {
      title: 'Type',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (type) => <Tag>{type?.split('/')[1] || type}</Tag>
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Batch Watermark Tool" extra={
        <Button icon={<ReloadOutlined />} onClick={fetchResources}>Refresh</Button>
      }>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card title="Select Resource" size="small">
              <Table
                dataSource={resources}
                columns={columns}
                rowKey="resource_id"
                size="small"
                loading={loading}
                pagination={{ pageSize: 10 }}
                rowSelection={{
                  type: 'radio',
                  onChange: (keys) => setSelectedResource(keys[0])
                }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Watermark Settings" size="small">
              <Form layout="vertical">
                <Form.Item label="Target School">
                  <Select
                    value={selectedSchool}
                    onChange={setSelectedSchool}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="all">All Schools</Select.Option>
                    {schools.map(school => (
                      <Select.Option key={school.school_id} value={school.school_id}>
                        {school.school_name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item label={`Logo X Position: ${watermarkSettings.logoX}%`}>
                  <Slider
                    value={watermarkSettings.logoX}
                    onChange={(v) => setWatermarkSettings(prev => ({ ...prev, logoX: v }))}
                    min={0}
                    max={100}
                  />
                </Form.Item>
                
                <Form.Item label={`Logo Y Position: ${watermarkSettings.logoY}%`}>
                  <Slider
                    value={watermarkSettings.logoY}
                    onChange={(v) => setWatermarkSettings(prev => ({ ...prev, logoY: v }))}
                    min={0}
                    max={100}
                  />
                </Form.Item>
                
                <Form.Item label={`Logo Width: ${watermarkSettings.logoWidth}%`}>
                  <Slider
                    value={watermarkSettings.logoWidth}
                    onChange={(v) => setWatermarkSettings(prev => ({ ...prev, logoWidth: v }))}
                    min={5}
                    max={50}
                  />
                </Form.Item>
                
                <Form.Item label={`Logo Opacity: ${watermarkSettings.logoOpacity}%`}>
                  <Slider
                    value={watermarkSettings.logoOpacity}
                    onChange={(v) => setWatermarkSettings(prev => ({ ...prev, logoOpacity: v }))}
                    min={10}
                    max={100}
                  />
                </Form.Item>
                
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleBatchDownload}
                  loading={loading}
                  block
                  disabled={!selectedResource}
                >
                  Generate & Download
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default AdminResourceWatermark;
