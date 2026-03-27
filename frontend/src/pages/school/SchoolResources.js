import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button, Card, Row, Col } from 'antd';
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

const SchoolResources = ({ user }) => {
  const navigate = useNavigate();

  const resourceCategories = [
    {
      key: 'academic',
      title: 'Academic Resources',
      description: 'Lesson plans, worksheets, and teaching materials',
      icon: <BookOutlined style={{ fontSize: '32px' }} />,
      color: '#1890ff'
    },
    {
      key: 'marketing',
      title: 'Marketing Materials',
      description: 'Brochures, banners, and promotional content',
      icon: <FileImageOutlined style={{ fontSize: '32px' }} />,
      color: '#52c41a'
    },
    {
      key: 'administrative',
      title: 'Administrative',
      description: 'Forms, templates, and policy documents',
      icon: <FileTextOutlined style={{ fontSize: '32px' }} />,
      color: '#faad14'
    },
    {
      key: 'training',
      title: 'Training Resources',
      description: 'Teacher training materials and guides',
      icon: <FileWordOutlined style={{ fontSize: '32px' }} />,
      color: '#722ed1'
    },
    {
      key: 'event',
      title: 'Event & Celebration',
      description: 'Event plans and celebration materials',
      icon: <FilePptOutlined style={{ fontSize: '32px' }} />,
      color: '#eb2f96'
    },
    {
      key: 'multimedia',
      title: 'Multimedia Collection',
      description: 'Videos, audio, and interactive content',
      icon: <VideoCameraOutlined style={{ fontSize: '32px' }} />,
      color: '#13c2c2'
    },
    {
      key: 'my-uploads',
      title: 'My Uploads',
      description: 'Resources uploaded by your school',
      icon: <CloudUploadOutlined style={{ fontSize: '32px' }} />,
      color: '#fa8c16'
    }
  ];

  return (
    <div className="resources-container">
      <div className="resources-header">
        <h1>Resource Center</h1>
        <Button type="primary" icon={<CloudUploadOutlined />}>
          Upload New Resource
        </Button>
      </div>

      <div className="resource-categories">
        <Row gutter={[24, 24]}>
          {resourceCategories.map(category => (
            <Col xs={24} sm={12} md={8} lg={6} key={category.key}>
              <Card 
                hoverable
                className="resource-category-card"
                onClick={() => navigate(`/school/resources/${category.key}`)}
                style={{ borderLeft: `4px solid ${category.color}` }}
              >
                <div className="category-icon" style={{ color: category.color }}>
                  {category.icon}
                </div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Outlet />
    </div>
  );
};

export default SchoolResources;
