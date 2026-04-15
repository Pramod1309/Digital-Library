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

// Import category configuration
const CATEGORY_CONFIG = {
  'academic': {
    title: 'Academic Resources',
    description: 'Manage curriculum, worksheets, and other teaching materials',
    subcategories: {
      'all': 'All Academic',
      'activity-sheet': 'Activity Sheet',
      'assessment': 'Assessment',
      'curriculum': 'Curriculum',
      'manual-guidelines': 'Manual & Guidelines',
      'study-material': 'Study Material',
      'syllabus': 'Syllabus',
      'teaching-aid': 'Teaching Aid',
      'worksheet': 'Worksheet'
    }
  },
  'marketing': {
    title: 'Marketing Materials',
    description: 'Manage brochures, banners, and promotional content',
    subcategories: {
      'all': 'All Marketing',
      'advertisement': 'Advertisement',
      'banner': 'Banner',
      'brochure': 'Brochure',
      'email-template': 'Email Template',
      'flyer': 'Flyer',
      'presentation': 'Presentation',
      'promotional-video': 'Promotional Video',
      'social-media': 'Social Media Post'
    }
  },
  'administrative': {
    title: 'Administrative Resources',
    description: 'Manage forms, templates, and policy documents',
    subcategories: {
      'all': 'All Administrative',
      'agreement': 'Agreement',
      'certificate': 'Certificate',
      'form': 'Form',
      'guideline': 'Guideline',
      'letter': 'Official Letter',
      'policy': 'Policy Document',
      'report': 'Report',
      'template': 'Template'
    }
  },
  'training': {
    title: 'Training Resources',
    description: 'Manage teacher training materials and guides',
    subcategories: {
      'all': 'All Training',
      'certification': 'Certification Program',
      'handbook': 'Handbook',
      'manual': 'Training Manual',
      'online-course': 'Online Course',
      'orientation': 'Orientation Material',
      'skill-development': 'Skill Development',
      'teacher-training': 'Teacher Training',
      'workshop': 'Workshop Material'
    }
  },
  'event': {
    title: 'Event & Celebration',
    description: 'Manage event plans and celebration materials',
    subcategories: {
      'all': 'All Events',
      'annual-day': 'Annual Day',
      'celebration': 'Celebration Material',
      'competition': 'Competition',
      'cultural-event': 'Cultural Event',
      'festival': 'Festival Celebration',
      'graduation': 'Graduation Ceremony',
      'parents-meeting': 'Parents Meeting',
      'sports-day': 'Sports Day'
    }
  },
  'multimedia': {
    title: 'Multimedia Collection',
    description: 'Manage videos, audio, and interactive content',
    subcategories: {
      'all': 'All Multimedia',
      'animation': 'Animation',
      'audio': 'Audio',
      'graphic': 'Graphic',
      'interactive': 'Interactive Content',
      'photograph': 'Photograph',
      'podcast': 'Podcast',
      'video': 'Video',
      'virtual-tour': 'Virtual Tour'
    }
  }
};

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

  const createResourceMenuItems = () => {
    const resourceItems = [
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
      }
    ];

    // Add categories with their sub-categories
    Object.entries(CATEGORY_CONFIG).forEach(([categoryKey, categoryData]) => {
      const subCategoryItems = Object.entries(categoryData.subcategories).map(([subKey, subLabel]) => ({
        key: `${categoryKey}_${subKey}`,
        label: subLabel,
        onClick: () => handleMenuClick(`/admin/resources/${categoryKey}/${subKey}`)
      }));

      resourceItems.push({
        key: categoryKey,
        icon: getCategoryIcon(categoryKey),
        label: categoryData.title,
        children: subCategoryItems
      });
    });

    return resourceItems;
  };

  const getCategoryIcon = (categoryKey) => {
    const iconMap = {
      'academic': <BookOutlined />,
      'marketing': <FileImageOutlined />,
      'administrative': <FileTextOutlined />,
      'training': <FileWordOutlined />,
      'event': <FilePptOutlined />,
      'multimedia': <VideoCameraOutlined />
    };
    return iconMap[categoryKey] || <FileOutlined />;
  };

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
      children: createResourceMenuItems()
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
    </Sider>
  );
};

export default Sidebar;