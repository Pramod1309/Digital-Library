import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { 
  DownloadOutlined,
  DashboardOutlined, 
  BankOutlined, 
  FileOutlined,
  LogoutOutlined,
  BookOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FilePptOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
  LineChartOutlined,
  NotificationOutlined,
  CommentOutlined,
  FileSearchOutlined,
  FileDoneOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  CloudUploadOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // ADDED useNavigate
import '../styles/Sidebar.css';

const { Sider } = Layout;

const Sidebar = ({ collapsed, onCollapse }) => {
  const navigate = useNavigate(); // Now this will work
  const location = useLocation();
  
  const handleMenuClick = (path) => {
    navigate(path);
  };

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: 'batch-watermark',
      icon: <DownloadOutlined />,
      label: 'Batch Watermark',
      onClick: () => handleMenuClick('/admin/batch-watermark')
    },
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard Home',
      onClick: () => handleMenuClick('/admin')
    },
    {
      key: 'schools',
      icon: <BankOutlined />,
      label: 'School Management',
      onClick: () => handleMenuClick('/admin/schools')
    },
    {
      key: 'resources',
      icon: <FileOutlined />,
      label: 'Resource Management',
      children: [
        {
          key: 'all_resources',
          icon: <FileTextOutlined />,
          label: 'All Resources',
          onClick: () => handleMenuClick('/admin/resources')
        },
        {
          key: 'school_uploads',
          icon: <UploadOutlined />,
          label: 'School Uploads',
          onClick: () => handleMenuClick('/admin/school-uploads')
        },
        {
          key: 'academic',
          icon: <BookOutlined />,
          label: 'Academic Resources',
          onClick: () => handleMenuClick('/admin/resources/academic')
        },
        {
          key: 'marketing',
          icon: <FileImageOutlined />,
          label: 'Marketing Resources',
          onClick: () => handleMenuClick('/admin/resources/marketing')
        },
        {
          key: 'administrative',
          icon: <FileTextOutlined />,
          label: 'Administrative',
          onClick: () => handleMenuClick('/admin/resources/administrative')
        },
        {
          key: 'training',
          icon: <FileWordOutlined />,
          label: 'Training Resources',
          onClick: () => handleMenuClick('/admin/resources/training')
        },
        {
          key: 'event',
          icon: <FilePptOutlined />,
          label: 'Event & Celebration',
          onClick: () => handleMenuClick('/admin/resources/event')
        },
        {
          key: 'multimedia',
          icon: <VideoCameraOutlined />,
          label: 'Multimedia Collection',
          onClick: () => handleMenuClick('/admin/resources/multimedia')
        }
      ],
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics & Tracking',
      children: [
        {
          key: 'school_activity',
          icon: <LineChartOutlined />,
          label: 'School Activity',
          onClick: () => handleMenuClick('/admin/analytics/school-activity')
        },
        {
          key: 'resource_analytics',
          icon: <FileSearchOutlined />,
          label: 'Resource Analytics',
          onClick: () => handleMenuClick('/admin/analytics/resource-analytics')
        },
        {
          key: 'search_analytics',
          icon: <FileSearchOutlined />,
          label: 'Search Analytics',
          onClick: () => handleMenuClick('/admin/analytics/search-analytics')
        },
        {
          key: 'download_tracking',
          icon: <CloudUploadOutlined />,
          label: 'Download Tracking',
          onClick: () => handleMenuClick('/admin/analytics/download-tracking')
        },
      ],
    },
    {
      key: 'communication',
      icon: <MessageOutlined />,
      label: 'Communication Center',
      children: [
        {
          key: 'announcements',
          icon: <NotificationOutlined />,
          label: 'Announcements',
          onClick: () => handleMenuClick('/admin/communication/announcements')
        },
        {
          key: 'chat',
          icon: <CommentOutlined />,
          label: 'Chat with Schools',
          onClick: () => handleMenuClick('/admin/communication/chat')
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
          label: 'Support Tickets',
          onClick: () => handleMenuClick('/admin/support/tickets')
        },
        {
          key: 'knowledge_base',
          icon: <FileTextOutlined />,
          label: 'Knowledge Base',
          onClick: () => handleMenuClick('/admin/support/knowledge-base')
        },
      ],
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: 'profile',
          icon: <UserOutlined />,
          label: 'Admin Profile',
          onClick: () => handleMenuClick('/admin/settings/profile')
        },
        {
          key: 'branding',
          icon: <FileImageOutlined />,
          label: 'Branding',
          onClick: () => handleMenuClick('/admin/settings/branding')
        },
        {
          key: 'cms',
          icon: <FileTextOutlined />,
          label: 'Content Management',
          onClick: () => handleMenuClick('/admin/settings/cms')
        },
        {
          key: 'admins',
          icon: <TeamOutlined />,
          label: 'Admin Users',
          onClick: () => handleMenuClick('/admin/settings/admins')
        },
        {
          key: 'security',
          icon: <SafetyCertificateOutlined />,
          label: 'Security',
          onClick: () => handleMenuClick('/admin/settings/security')
        },
        {
          key: 'backup',
          icon: <CloudUploadOutlined />,
          label: 'Data Backup',
          onClick: () => handleMenuClick('/admin/settings/backup')
        },
      ],
    },
  ];

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('batch-watermark')) return ['batch-watermark']; // ADDED this line
    if (path.includes('schools')) return ['schools'];
    if (path.includes('resources')) return ['resources'];
    if (path.includes('analytics')) return ['analytics'];
    if (path.includes('communication')) return ['communication'];
    if (path.includes('support')) return ['support'];
    if (path.includes('settings')) return ['settings'];
    if (path === '/admin' || path === '/admin/') return ['dashboard'];
    return ['dashboard'];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];
    
    if (path.includes('resources')) openKeys.push('resources');
    if (path.includes('analytics')) openKeys.push('analytics');
    if (path.includes('communication')) openKeys.push('communication');
    if (path.includes('support')) openKeys.push('support');
    if (path.includes('settings')) openKeys.push('settings');
    
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
        boxShadow: '2px 0 8px 0 rgba(29, 35, 41, 0.05)',
      }}
    >
      <div className="logo">
        <h2>{collapsed ? 'WL' : 'Wonder Learning'}</h2>
      </div>
      <Menu
        theme="light"
        mode="inline"
        defaultSelectedKeys={getSelectedKey()}
        defaultOpenKeys={getOpenKeys()}
        selectedKeys={getSelectedKey()}
        items={menuItems}
        style={{ borderRight: 0 }}
      />
      <div className="logout-container">
        <Menu
          theme="light"
          mode="inline"
          className="logout-menu"
        >
          <Menu.Item 
            key="logout" 
            icon={<LogoutOutlined />}
            onClick={() => {
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              window.location.href = '/';
            }}
          >
            Logout
          </Menu.Item>
        </Menu>
      </div>
    </Sider>
  );
};

export default Sidebar;