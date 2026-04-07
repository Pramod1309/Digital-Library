import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { 
  DashboardOutlined, 
  FileOutlined,
  BookOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FilePptOutlined,
  VideoCameraOutlined,
  CloudUploadOutlined,
  MessageOutlined,
  NotificationOutlined,
  CommentOutlined,
  QuestionCircleOutlined,
  FileDoneOutlined,
  SettingOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Sidebar.css';

const { Sider } = Layout;

const SchoolSidebar = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/school/dashboard">Dashboard Home</Link>,
    },
    {
      key: 'resources',
      icon: <FileOutlined />,
      label: 'Resource Management',
      children: [
        {
          key: 'all_resources',
          icon: <FileTextOutlined />,
          label: <Link to="/school/resources">All Resources</Link>,
        },
        {
          key: 'academic',
          icon: <BookOutlined />,
          label: <Link to="/school/resources/academic">Academic Resources</Link>,
        },
        {
          key: 'marketing',
          icon: <FileImageOutlined />,
          label: <Link to="/school/resources/marketing">Marketing Materials</Link>,
        },
        {
          key: 'administrative',
          icon: <FileTextOutlined />,
          label: <Link to="/school/resources/administrative">Administrative</Link>,
        },
        {
          key: 'training',
          icon: <FileWordOutlined />,
          label: <Link to="/school/resources/training">Training Resources</Link>,
        },
        {
          key: 'event',
          icon: <FilePptOutlined />,
          label: <Link to="/school/resources/event">Event & Celebration</Link>,
        },
        {
          key: 'multimedia',
          icon: <VideoCameraOutlined />,
          label: <Link to="/school/resources/multimedia">Multimedia Collection</Link>,
        },
        {
          key: 'my_uploads',
          icon: <CloudUploadOutlined />,
          label: <Link to="/school/resources/my-uploads">My Uploads</Link>,
        }
      ],
    },
    {
      key: 'communication',
      icon: <MessageOutlined />,
      label: 'Communication Centre',
      children: [
        {
          key: 'announcements',
          icon: <NotificationOutlined />,
          label: <Link to="/school/communication/announcements">Announcements</Link>,
        },
        {
          key: 'chat',
          icon: <CommentOutlined />,
          label: <Link to="/school/communication/chat">Chat with Admin</Link>,
        },
      ],
    },
    {
      key: 'support',
      icon: <QuestionCircleOutlined />,
      label: 'Support & Feedback',
      children: [
        {
          key: 'tickets',
          icon: <FileDoneOutlined />,
          label: <Link to="/school/support/tickets">Support Tickets</Link>,
        },
      ],
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: <Link to="/school/reports">Usage Reports</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to="/school/settings">Settings</Link>,
    },
  ];

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('resources')) return ['resources'];
    if (path.includes('communication')) return ['communication'];
    if (path.includes('support')) return ['support'];
    if (path.includes('reports')) return ['reports'];
    if (path.includes('settings')) return ['settings'];
    return ['dashboard'];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];
    
    if (path.includes('resources')) openKeys.push('resources');
    if (path.includes('communication')) openKeys.push('communication');
    if (path.includes('support')) openKeys.push('support');
    
    return openKeys;
  };

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={onCollapse}
      width={250}
      style={{
        background: colorBgContainer,
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        boxShadow: '2px 0 8px 0 rgba(29, 35, 41, 0.05)',
      }}
    >
      <div className="logo" style={{ height: '64px', margin: '16px' }}>
        <h2 style={{ color: '#1890ff', textAlign: 'center' }}>
          {collapsed ? 'S' : 'School Portal'}
        </h2>
      </div>
      <Menu
        theme="light"
        mode="inline"
        defaultSelectedKeys={getSelectedKey()}
        defaultOpenKeys={getOpenKeys()}
        selectedKeys={getSelectedKey()}
        items={menuItems}
      />
    </Sider>
  );
};

export default SchoolSidebar;
