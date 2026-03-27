import React from 'react';
import { Card, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  BookOutlined, 
  FileImageOutlined, 
  FileTextOutlined, 
  FileWordOutlined,
  FilePptOutlined,
  VideoCameraOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import '../../styles/Resources.css';

const SchoolResourcesHome = () => {
  const navigate = useNavigate();

  const resourceCategories = [
    {
      key: 'academic',
      title: 'Academic Resources',
      description: 'Lesson plans, worksheets, and teaching materials',
      icon: <BookOutlined style={{ fontSize: '48px' }} />,
      color: '#1890ff',
      count: 0
    },
    {
      key: 'marketing',
      title: 'Marketing Materials',
      description: 'Brochures, banners, and promotional content',
      icon: <FileImageOutlined style={{ fontSize: '48px' }} />,
      color: '#52c41a',
      count: 0
    },
    {
      key: 'administrative',
      title: 'Administrative',
      description: 'Forms, templates, and policy documents',
      icon: <FileTextOutlined style={{ fontSize: '48px' }} />,
      color: '#faad14',
      count: 0
    },
    {
      key: 'training',
      title: 'Training Resources',
      description: 'Teacher training materials and guides',
      icon: <FileWordOutlined style={{ fontSize: '48px' }} />,
      color: '#722ed1',
      count: 0
    },
    {
      key: 'event',
      title: 'Event & Celebration',
      description: 'Event plans and celebration materials',
      icon: <FilePptOutlined style={{ fontSize: '48px' }} />,
      color: '#eb2f96',
      count: 0
    },
    {
      key: 'multimedia',
      title: 'Multimedia Collection',
      description: 'Videos, audio, and interactive content',
      icon: <VideoCameraOutlined style={{ fontSize: '48px' }} />,
      color: '#13c2c2',
      count: 0
    },
    {
      key: 'my-uploads',
      title: 'My Uploads',
      description: 'Resources uploaded by your school',
      icon: <CloudUploadOutlined style={{ fontSize: '48px' }} />,
      color: '#fa8c16',
      count: 0
    }
  ];

  return (
    <div className="resources-home">
      <div className="resources-header">
        <div>
          <h1>Resource Management</h1>
          <p className="resources-subtitle">
            Access and manage your educational resources
          </p>
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {resourceCategories.map(category => (
          <Col xs={24} sm={12} md={8} lg={6} key={category.key}>
            <Card
              hoverable
              className="category-card"
              onClick={() => navigate(`/school/resources/${category.key}`)}
              style={{
                borderLeft: `4px solid ${category.color}`,
                height: '100%'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: category.color, marginBottom: '16px' }}>
                  {category.icon}
                </div>
                <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                  {category.title}
                </h3>
                <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
                  {category.description}
                </p>
                <div style={{ 
                  padding: '6px 12px', 
                  background: `${category.color}15`, 
                  borderRadius: '12px',
                  color: category.color,
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {category.count} Resources
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default SchoolResourcesHome;
