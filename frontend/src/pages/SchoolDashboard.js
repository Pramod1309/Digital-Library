import React, { useState } from 'react';
import { Layout, Button, theme } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
import '../styles/SchoolDashboard.css';

const { Content, Header } = Layout;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SchoolDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  
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

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/school/logout`, {
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
