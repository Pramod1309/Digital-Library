import React, { useState, useRef } from 'react';
import { Layout, Button, theme } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axiosConfig';
import SchoolSidebar from '../components/SchoolSidebar';
import SchoolHome from './school/SchoolHome';
import SchoolResourceManagement from './school/SchoolResourceManagement';
import SchoolResourcesHome from './school/SchoolResourcesHome';
import SchoolResourceCategory from './school/SchoolResourceCategory';
import SchoolMyUploads from './school/SchoolMyUploads';
import SchoolCommunicationCentre from './school/SchoolCommunicationCentre';
import SchoolAnnouncements from './school/SchoolAnnouncements';
import SchoolChat from './school/SchoolChat';
import SchoolSupport from './school/SchoolSupport';
import SchoolSupportTickets from './school/SchoolSupportTickets';
import UsageReports from './school/UsageReports';
import SchoolSettings from './school/SchoolSettings';
import { trackSchoolActivity } from '../utils/schoolAnalytics';
import '../styles/SchoolDashboard.css';

const { Content, Header } = Layout;

const SchoolDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastTrackedPageRef = useRef('');
  
  // Check for active session on mount
  React.useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (!savedUser) {
      navigate('/');
    }
  }, [navigate]);
  const [collapsed, setCollapsed] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const getPageTrackingDetails = (pathname) => {
    if (!pathname?.startsWith('/school')) {
      return null;
    }

    const normalizedPath = pathname.replace(/\/+$/, '') || '/school';
    const details = {
      path: normalizedPath,
      page_key: 'dashboard_home',
      page_label: 'Dashboard Home'
    };

    if (normalizedPath === '/school' || normalizedPath === '/school/dashboard') {
      return details;
    }

    if (normalizedPath === '/school/resources') {
      return { ...details, page_key: 'resources_all', page_label: 'All Resources' };
    }

    if (normalizedPath === '/school/resources/my-uploads') {
      return { ...details, page_key: 'resources_my_uploads', page_label: 'My Uploads' };
    }

    if (normalizedPath.startsWith('/school/resources/')) {
      const parts = normalizedPath.split('/').filter(Boolean);
      const category = parts[2] || 'resources';
      const subCategory = parts[3] || null;
      return {
        ...details,
        page_key: `resources_${category}${subCategory ? `_${subCategory}` : ''}`,
        page_label: subCategory
          ? `${category.replace(/-/g, ' ')} / ${subCategory.replace(/-/g, ' ')}`
          : `${category.replace(/-/g, ' ')} resources`,
        category,
        sub_category: subCategory
      };
    }

    if (normalizedPath === '/school/communication/announcements') {
      return { ...details, page_key: 'announcements', page_label: 'Announcements' };
    }

    if (normalizedPath === '/school/communication/chat') {
      return { ...details, page_key: 'chat', page_label: 'Chat with Admin' };
    }

    if (normalizedPath === '/school/support/tickets') {
      return { ...details, page_key: 'support_tickets', page_label: 'Support Tickets' };
    }

    if (normalizedPath === '/school/reports') {
      return { ...details, page_key: 'usage_reports', page_label: 'Usage Reports' };
    }

    if (normalizedPath === '/school/settings') {
      return { ...details, page_key: 'settings', page_label: 'Settings' };
    }

    return {
      ...details,
      page_key: normalizedPath.replace(/\W+/g, '_'),
      page_label: normalizedPath.replace('/school/', '').replace(/-/g, ' ')
    };
  };

  React.useEffect(() => {
    if (!user?.school_id) {
      return;
    }

    const pageDetails = getPageTrackingDetails(location.pathname);
    if (!pageDetails) {
      return;
    }

    const signature = `${pageDetails.page_key}:${pageDetails.path}`;
    if (lastTrackedPageRef.current === signature) {
      return;
    }

    lastTrackedPageRef.current = signature;
    void trackSchoolActivity(user, 'page_visit', pageDetails);
  }, [location.pathname, user]);

  const handleLogout = async () => {
    try {
      await api.post('/school/logout', {
        school_id: user.school_id,
        school_name: user.name
      });
    } catch (err) {
      console.error('Error logging logout:', err);
    }
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <SchoolSidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
        <Header style={{
          padding: 0,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            <div className="brand-section" style={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src="/wonder-learning-logo.png" 
                alt="Wonder Learning India Digital Library" 
                style={{ height: '40px', marginRight: '16px' }} 
              />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Wonder Learning India Digital Library</span>
            </div>
          </div>
          <div>
            <span style={{ marginRight: '16px' }}>{user.name}</span>
            <Button 
              onClick={handleLogout} 
              type="primary"
              icon={<LogoutOutlined />}
              style={{ backgroundColor: '#001529', borderColor: '#001529' }}
            >
              Logout
            </Button>
          </div>
        </Header>
        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Routes>
            {/* Dashboard Home */}
            <Route path="/" element={<SchoolHome user={user} />} />
            <Route path="/dashboard" element={<SchoolHome user={user} />} />
            
            {/* Resource Management */}
            <Route path="/resources" element={<SchoolResourceManagement />}>
              <Route index element={<SchoolResourcesHome />} />
              <Route path=":category" element={<SchoolResourceCategory user={user} />} />
              <Route path=":category/:subcategory" element={<SchoolResourceCategory user={user} />} />
              <Route path="my-uploads" element={<SchoolMyUploads user={user} />} />
            </Route>
            
            {/* Communication Centre */}
            <Route path="/communication" element={<SchoolCommunicationCentre />}>
              <Route path="announcements" element={<SchoolAnnouncements user={user} />} />
              <Route path="chat" element={<SchoolChat user={user} />} />
              <Route index element={<Navigate to="announcements" replace />} />
            </Route>
            
            {/* Support & Feedback */}
            <Route path="/support" element={<SchoolSupport />}>
              <Route path="tickets" element={<SchoolSupportTickets user={user} />} />
              <Route index element={<Navigate to="tickets" replace />} />
            </Route>
            
            {/* Usage Reports */}
            <Route path="/reports" element={<UsageReports user={user} />} />
            
            {/* Settings */}
            <Route path="/settings" element={<SchoolSettings user={user} />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/school" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SchoolDashboard;
