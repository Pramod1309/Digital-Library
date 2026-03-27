import React from 'react';
import { Card, Row, Col, Typography, Button, Space } from 'antd';
import { 
  BookOutlined, 
  FileImageOutlined, 
  FileTextOutlined, 
  FileWordOutlined, 
  FilePptOutlined, 
  VideoCameraOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import '../../styles/Resources.css';

const { Title, Text } = Typography;

const ResourcesHome = () => {
  const navigate = useNavigate();

  const resourceCategories = [
    {
      key: 'academic',
      title: 'Academic Resources',
      icon: <BookOutlined className="resource-icon" />,
      description: 'Curriculum, lesson plans, worksheets, and teaching aids',
      count: 0,
      path: '/admin/resources/academic',
      color: '#1890ff'
    },
    {
      key: 'marketing',
      title: 'Marketing Resources',
      icon: <FileImageOutlined className="resource-icon" />,
      description: 'Posters, banners, social media creatives, and brochures',
      count: 0,
      path: '/admin/resources/marketing',
      color: '#52c41a'
    },
    {
      key: 'administrative',
      title: 'Administrative',
      icon: <FileTextOutlined className="resource-icon" />,
      description: 'Circulars, notices, forms, and policy documents',
      count: 0,
      path: '/admin/resources/administrative',
      color: '#faad14'
    },
    {
      key: 'training',
      title: 'Training Resources',
      icon: <FileWordOutlined className="resource-icon" />,
      description: 'Teacher training materials and guidelines',
      count: 0,
      path: '/admin/resources/training',
      color: '#722ed1'
    },
    {
      key: 'event',
      title: 'Event & Celebration',
      icon: <FilePptOutlined className="resource-icon" />,
      description: 'Event plans, festival kits, and certificates',
      count: 0,
      path: '/admin/resources/event',
      color: '#eb2f96'
    },
    {
      key: 'multimedia',
      title: 'Multimedia Collection',
      icon: <VideoCameraOutlined className="resource-icon" />,
      description: 'Videos, audio stories, and digital assets',
      count: 0,
      path: '/admin/resources/multimedia',
      color: '#13c2c2'
    },
  ];

  return (
    <div className="resource-management-container">
      <div className="resource-header">
        <Title level={2} style={{ marginBottom: 8 }}>Resource Management</Title>
        <Text type="secondary">
          Manage and organize all your educational resources in one place. Upload, categorize, and share resources with your team.
        </Text>
      </div>
      
      <div style={{ marginBottom: 24, textAlign: 'right' }}>
        <Button 
          type="primary" 
          icon={<UploadOutlined />}
          onClick={() => {
            // Navigate to the first category by default
            navigate('/admin/resources/academic');
          }}
        >
          Upload New Resource
        </Button>
      </div>
      
      <Row gutter={[24, 24]}>
        {resourceCategories.map((category) => (
          <Col xs={24} sm={12} lg={8} key={category.key}>
            <Card 
              hoverable
              className="resource-card"
              onClick={() => navigate(category.path)}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: `${category.color}15`,
                  marginBottom: 16
                }}>
                  {React.cloneElement(category.icon, { 
                    style: { 
                      fontSize: 32, 
                      color: category.color 
                    } 
                  })}
                </div>
                <Title level={4} style={{ marginBottom: 8, color: category.color }}>
                  {category.title}
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                  {category.description}
                </Text>
                <Button 
                  type="primary" 
                  ghost
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(category.path);
                  }}
                >
                  View Resources
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ResourcesHome;
