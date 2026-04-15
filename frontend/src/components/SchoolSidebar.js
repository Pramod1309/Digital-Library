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

const SchoolSidebar = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // Create resource menu items with sub-categories
  const createResourceMenuItems = () => {
    const resourceItems = [
      {
        key: 'all_resources',
        icon: <FileTextOutlined />,
        label: <Link to="/school/resources">All Resources</Link>,
      },
      {
        key: 'my_uploads',
        icon: <CloudUploadOutlined />,
        label: <Link to="/school/resources/my-uploads">My Uploads</Link>,
      }
    ];

    // Add categories with their sub-categories
    Object.entries(CATEGORY_CONFIG).forEach(([categoryKey, categoryData]) => {
      const subCategoryItems = Object.entries(categoryData.subcategories).map(([subKey, subLabel]) => ({
        key: `${categoryKey}_${subKey}`,
        label: <Link to={`/school/resources/${categoryKey}/${subKey}`}>{subLabel}</Link>
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
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/school/dashboard">Dashboard Home</Link>,
    },
    {
      key: 'resources',
      icon: <FileOutlined />,
      label: 'Resource Management',
      children: createResourceMenuItems()
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
