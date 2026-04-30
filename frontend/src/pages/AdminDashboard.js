// frontend/src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Layout, Button, theme } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Routes, Route, useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import Sidebar from '../components/Sidebar';
import DashboardHome from './DashboardHome';
import config from '../config';

// Resource Management
import ResourceManagement from '../components/Resources/ResourceManagement';
import ResourcesHome from '../components/Resources/ResourcesHome';
import AdminResourceCategory from '../components/Resources/AdminResourceCategory';
import SchoolUploads from '../components/Resources/SchoolUploads';

// Analytics
import SchoolActivity from '../components/Analytics/SchoolActivity';
import ResourceAnalytics from '../components/Analytics/ResourceAnalytics';
import SearchAnalytics from '../components/Analytics/SearchAnalytics';
import DownloadTracking from '../components/Analytics/DownloadTracking';

// Communication
import Announcements from '../components/Communication/Announcements';
import AdminChat from '../components/Communication/AdminChat';

// Support
import SupportTickets from '../components/Support/SupportTickets';
import KnowledgeBase from '../components/Support/KnowledgeBase';

// Settings
import AdminProfile from '../components/Settings/AdminProfile';
import Branding from '../components/Settings/Branding';
import ContentManagement from '../components/Settings/ContentManagement';
import AdminUsers from '../components/Settings/AdminUsers';
import Security from '../components/Settings/Security';
import DataBackup from '../components/Settings/DataBackup';
import AdminResourceWatermark from '../components/AdminResourceWatermark';
import '../styles/AdminDashboard.css';

const BACKEND_URL = config.apiBaseUrl;
const API = `${BACKEND_URL}/api`;

const { Header, Content } = Layout;

const AdminDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  
  // Check for active session on mount
  React.useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (!savedUser) {
      navigate('/');
    }
  }, [navigate]);
  
  const [collapsed, setCollapsed] = useState(false);
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [formData, setFormData] = useState({
    school_id: '',
    school_name: '',
    email: '',
    contact_number: '',
    password: '',
    logo: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const location = useLocation();

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    filterSchools();
  }, [schools, searchTerm]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/admin/schools');
      setSchools(response.data);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const filterSchools = () => {
    if (!searchTerm.trim()) {
      setFilteredSchools(schools);
      return;
    }

    const filtered = schools.filter(school => {
      const searchLower = searchTerm.toLowerCase();
      return (
        school.school_id?.toString().toLowerCase().includes(searchLower) ||
        school.school_name?.toLowerCase().includes(searchLower) ||
        school.email?.toLowerCase().includes(searchLower) ||
        school.contact_number?.toLowerCase().includes(searchLower)
      );
    });
    
    setFilteredSchools(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, logo: e.target.files[0] }));
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('school_id', formData.school_id);
      formDataToSend.append('school_name', formData.school_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('contact_number', formData.contact_number);
      formDataToSend.append('password', formData.password);
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }

      await api.post('/admin/schools', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setShowAddModal(false);
      setFormData({
        school_id: '',
        school_name: '',
        email: '',
        contact_number: '',
        password: '',
        logo: null
      });
      fetchSchools();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add school');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      if (formData.school_name) formDataToSend.append('school_name', formData.school_name);
      if (formData.email) formDataToSend.append('email', formData.email);
      if (formData.contact_number !== undefined) formDataToSend.append('contact_number', formData.contact_number);
      if (formData.password) formDataToSend.append('password', formData.password);
      if (formData.logo) formDataToSend.append('logo', formData.logo);

      await api.put(`/admin/schools/${editingSchool.school_id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setEditingSchool(null);
      setFormData({
        school_id: '',
        school_name: '',
        email: '',
        contact_number: '',
        password: '',
        logo: null
      });
      fetchSchools();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update school');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async (schoolId) => {
    if (!window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/schools/${schoolId}`);
      fetchSchools();
    } catch (err) {
      alert('Failed to delete school');
    }
  };

  const handleGenerateQR = async () => {
    setQrLoading(true);
    setError('');
    
    try {
      const response = await api.post('/admin/generate-qr');
      setQrCode(response.data);
      setShowQRModal(true);
    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const openEditModal = (school) => {
    setEditingSchool(school);
    setFormData({
      school_id: school.school_id,
      school_name: school.school_name,
      email: school.email,
      contact_number: school.contact_number || '',
      password: '',
      logo: null
    });
  };

  const renderSchoolManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>School Management</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by ID, name, email, or phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            style={{
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              width: '300px',
              fontSize: '14px'
            }}
          />
          <Button 
            type="primary" 
            onClick={handleGenerateQR}
            loading={qrLoading}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Generate QR Code
          </Button>
          <Button type="primary" onClick={() => setShowAddModal(true)}>
            Add New School
          </Button>
        </div>
      </div>
      
      <div className="schools-grid" data-testid="schools-grid">
        {filteredSchools.map((school) => {
          return (
            <div key={school.id} className="school-folder" data-testid={`school-folder-${school.school_id}`}>
              <div className="folder-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
              </div>
              <div className="folder-content">
                <div className="folder-header">
                  <span className="folder-id" data-testid={`school-id-${school.school_id}`}>#{school.school_id}</span>
                </div>
                {school.logo_path ? (
                  <img 
                    src={`${BACKEND_URL}/api${school.logo_path}`} 
                    alt={school.school_name} 
                    className="school-logo"
                    data-testid={`school-logo-${school.school_id}`}
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div className="school-logo-placeholder" style={{ display: 'flex' }}>
                    <UserOutlined />
                  </div>
                )}
                <h3 className="school-name" data-testid={`school-name-${school.school_id}`}>{school.school_name}</h3>
                <p className="school-email" data-testid={`school-email-${school.school_id}`}>{school.email}</p>
                {school.contact_number && (
                  <p className="school-contact" data-testid={`school-contact-${school.school_id}`}>
                    📞 {school.contact_number}
                  </p>
                )}
                <div className="folder-actions">
                  <button onClick={() => openEditModal(school)} className="edit-btn" data-testid={`edit-btn-${school.school_id}`}>Edit</button>
                  <button onClick={() => handleDeleteSchool(school.school_id)} className="delete-btn" data-testid={`delete-btn-${school.school_id}`}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSchools.length === 0 && searchTerm && (
        <div className="empty-state" data-testid="no-search-results">
          <p>No schools found matching "{searchTerm}"</p>
        </div>
      )}

      {filteredSchools.length === 0 && !searchTerm && (
        <div className="empty-state" data-testid="empty-schools-message">
          <p>No schools added yet. Click "Add School" to get started.</p>
        </div>
      )}

      {(showAddModal || editingSchool) && (
        <div className="modal-overlay" data-testid="school-modal">
          <div className="modal">
            <h2 data-testid="modal-title">{editingSchool ? 'Edit School' : 'Add New School'}</h2>
            {error && <div className="error-message" data-testid="modal-error-message">{error}</div>}
            
            <form onSubmit={editingSchool ? handleUpdateSchool : handleAddSchool} data-testid="school-form">
              {!editingSchool && (
                <div className="form-group">
                  <label data-testid="school-id-label">School ID</label>
                  <input
                    type="text"
                    name="school_id"
                    data-testid="school-id-input"
                    value={formData.school_id}
                    onChange={handleInputChange}
                    required={!editingSchool}
                    placeholder="e.g., 1"
                  />
                </div>
              )}

              <div className="form-group">
                <label data-testid="school-name-label">School Name</label>
                <input
                  type="text"
                  name="school_name"
                  data-testid="school-name-input"
                  value={formData.school_name}
                  onChange={handleInputChange}
                  required={!editingSchool}
                  placeholder="e.g., Gurukul International Preschool"
                />
              </div>

              <div className="form-group">
                <label data-testid="school-email-label">Email</label>
                <input
                  type="email"
                  name="email"
                  data-testid="school-email-input"
                  value={formData.email}
                  onChange={handleInputChange}
                  required={!editingSchool}
                  placeholder="school@example.com"
                />
              </div>

              <div className="form-group">
                <label data-testid="school-contact-label">Contact Number (optional)</label>
                <input
                  type="tel"
                  name="contact_number"
                  data-testid="school-contact-input"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  placeholder="e.g., +91 1234567890"
                />
              </div>

              <div className="form-group">
                <label data-testid="school-password-label">Password {editingSchool && '(leave blank to keep current)'}</label>
                <input
                  type="password"
                  name="password"
                  data-testid="school-password-input"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingSchool}
                  placeholder="Enter password"
                />
              </div>

              <div className="form-group">
                <label data-testid="school-logo-label">School Logo {editingSchool && '(optional)'}</label>
                <input
                  type="file"
                  accept="image/*"
                  data-testid="school-logo-input"
                  onChange={handleFileChange}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-btn" data-testid="submit-school-btn" disabled={loading}>
                  {loading ? 'Saving...' : (editingSchool ? 'Update School' : 'Add School')}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  data-testid="cancel-school-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSchool(null);
                    setFormData({
                      school_id: '',
                      school_name: '',
                      email: '',
                      contact_number: '',
                      password: '',
                      logo: null
                    });
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCode && (
        <div className="modal-overlay" data-testid="qr-modal">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <h2>QR Code for School Registration</h2>
            
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <img 
                src={qrCode.qr_code} 
                alt="School Registration QR Code" 
                style={{ 
                  width: '250px', 
                  height: '250px', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px'
                }} 
              />
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Share this QR code with schools to register directly.
                Schools can scan this code to access the registration form.
              </p>
              <p style={{ color: '#666', fontSize: '12px', marginTop: '10px' }}>
                Registration URL: {qrCode.registration_url}
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  navigator.clipboard.writeText(qrCode.registration_url);
                  alert('Registration URL copied to clipboard!');
                }}
              >
                Copy URL
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowQRModal(false);
                  setQrCode(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
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
            <span style={{ marginRight: '16px' }}>{user?.name || user?.email}</span>
            <Button 
              type="primary" 
              onClick={handleLogout} 
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
            <Route path="/" element={<DashboardHome />} />
            <Route path="/schools" element={renderSchoolManagement()} />
            <Route path="/batch-watermark" element={<AdminResourceWatermark />} />
            
            {/* Resource Management - Use a wrapper component to extract category and subcategory from URL */}
            <Route path="/resources" element={<ResourceManagement />}>
              <Route index element={<ResourcesHome />} />
              <Route 
                path=":category" 
                element={<AdminResourceCategory category={location.pathname.split('/').pop()} />}
              />
              <Route 
                path=":category/:subcategory" 
                element={<AdminResourceCategory category={location.pathname.split('/')[3]} subCategory={location.pathname.split('/')[4]} />}
              />
            </Route>
            
            {/* School Uploads */}
            <Route path="/school-uploads" element={<SchoolUploads />} />
            
            {/* Analytics & Tracking */}
            <Route path="/analytics" element={<div style={{ padding: '24px' }}><Outlet /></div>}>
              <Route path="school-activity" element={<SchoolActivity />} />
              <Route path="resource-analytics" element={<ResourceAnalytics />} />
              <Route path="search-analytics" element={<SearchAnalytics />} />
              <Route path="download-tracking" element={<DownloadTracking />} />
              <Route index element={<Navigate to="school-activity" replace />} />
            </Route>
            
            {/* Communication Center */}
            <Route path="/communication" element={<div style={{ padding: '24px' }}><Outlet /></div>}>
              <Route path="announcements" element={<Announcements />} />
              <Route path="chat" element={<AdminChat />} />
              <Route index element={<Navigate to="announcements" replace />} />
            </Route>
            
            {/* Support & Feedback */}
            <Route path="/support" element={<div style={{ padding: '24px' }}><Outlet /></div>}>
              <Route path="tickets" element={<SupportTickets />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route index element={<Navigate to="tickets" replace />} />
            </Route>
            
            {/* Settings */}
            <Route path="/settings" element={<div style={{ padding: '24px' }}><Outlet /></div>}>
              <Route path="profile" element={<AdminProfile user={user} setUser={setUser} />} />
              <Route path="branding" element={<Branding user={user} setUser={setUser} />} />
              <Route path="cms" element={<ContentManagement user={user} setUser={setUser} />} />
              <Route path="admins" element={<AdminUsers user={user} setUser={setUser} />} />
              <Route path="security" element={<Security user={user} setUser={setUser} />} />
              <Route path="backup" element={<DataBackup />} />
              <Route index element={<Navigate to="profile" replace />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;
