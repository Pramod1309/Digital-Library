// frontend/src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Layout, Button, theme, message } from 'antd';
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
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportError, setBulkImportError] = useState('');
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const [formData, setFormData] = useState({
    school_id: '',
    school_name: '',
    email: '',
    contact_number: '',
    region: '',
    sub_region: '',
    password: '',
    logo: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

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
        school.contact_number?.toLowerCase().includes(searchLower) ||
        school.region?.toLowerCase().includes(searchLower) ||
        school.sub_region?.toLowerCase().includes(searchLower)
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

  const handleBulkFileChange = (e) => {
    setBulkFile(e.target.files?.[0] || null);
    setBulkImportError('');
    setBulkImportResult(null);
  };

  const closeBulkAddModal = () => {
    setShowBulkAddModal(false);
    setBulkFile(null);
    setBulkImportLoading(false);
    setBulkImportError('');
    setBulkImportResult(null);
  };

  const handleDownloadBulkTemplate = () => {
    const template = [
      'school_id,school_name,email,password,contact_number,region,sub_region',
      '101,Wonder Learning Preschool,wonder101@example.com,Password123,+911234567890,North Zone,Delhi NCR',
      '102,Wonder Learning Junior,wonder102@example.com,Password123,+919876543210,South Zone,Bengaluru'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'bulk-school-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleBulkImportSchools = async () => {
    if (!bulkFile) {
      setBulkImportError('Please select a CSV file first');
      return;
    }

    try {
      setBulkImportLoading(true);
      setBulkImportError('');
      setBulkImportResult(null);

      const formDataToSend = new FormData();
      formDataToSend.append('csv_file', bulkFile);

      const response = await api.post('/admin/schools/bulk-import', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 10 * 60 * 1000
      });

      setBulkImportResult(response.data);
      await fetchSchools();

      if (response.data.created_count > 0) {
        message.success(`Imported ${response.data.created_count} school(s)`);
      } else {
        message.info('No schools were imported');
      }

      if (response.data.error_count > 0) {
        message.warning(`${response.data.error_count} row(s) need attention`);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to import schools';
      setBulkImportError(errorMessage);
      message.error(errorMessage);
    } finally {
      setBulkImportLoading(false);
    }
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
      formDataToSend.append('region', formData.region);
      formDataToSend.append('sub_region', formData.sub_region);
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
        region: '',
        sub_region: '',
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
      if (formData.region !== undefined) formDataToSend.append('region', formData.region);
      if (formData.sub_region !== undefined) formDataToSend.append('sub_region', formData.sub_region);
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
        region: '',
        sub_region: '',
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
      message.success('School deleted successfully');
    } catch (err) {
      message.error('Failed to delete school');
    }
  };

  const handleSelectSchool = (schoolId) => {
    setSelectedSchools(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const handleSelectAllSchools = () => {
    if (selectedSchools.length === filteredSchools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(filteredSchools.map(school => school.school_id));
    }
  };

  const handleDeleteSelectedSchools = async () => {
    if (selectedSchools.length === 0) {
      message.warning('No schools selected for deletion');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSchools.length} school(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkDeleteLoading(true);
      await api.delete('/admin/schools/bulk', {
        data: { school_ids: selectedSchools }
      });
      setSelectedSchools([]);
      fetchSchools();
      message.success(`${selectedSchools.length} school(s) deleted successfully`);
    } catch (err) {
      message.error('Failed to delete selected schools');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleDeleteAllSchools = async () => {
    if (filteredSchools.length === 0) {
      message.warning('No schools available to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ALL ${filteredSchools.length} school(s)? This action cannot be undone and will remove all school data permanently.`)) {
      return;
    }

    try {
      setBulkDeleteLoading(true);
      await api.delete('/admin/schools/all');
      setSelectedSchools([]);
      fetchSchools();
      message.success(`All ${filteredSchools.length} school(s) deleted successfully`);
    } catch (err) {
      message.error('Failed to delete all schools');
    } finally {
      setBulkDeleteLoading(false);
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
      region: school.region || '',
      sub_region: school.sub_region || '',
      password: '',
      logo: null
    });
  };

  const renderSchoolManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>School Management</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by ID, name, email, phone, region, or sub-region..."
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
          <Button
            onClick={() => {
              setShowBulkAddModal(true);
              setBulkImportError('');
              setBulkImportResult(null);
            }}
          >
            Bulk Add Schools
          </Button>
          <Button type="primary" onClick={() => setShowAddModal(true)}>
            Add New School
          </Button>
        </div>
      </div>

      {filteredSchools.length > 0 && (
        <div className="bulk-actions" style={{ 
          padding: '12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '6px', 
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedSchools.length === filteredSchools.length && filteredSchools.length > 0}
                onChange={handleSelectAllSchools}
                style={{ cursor: 'pointer' }}
              />
              <span>Select All ({filteredSchools.length} schools)</span>
            </label>
            {selectedSchools.length > 0 && (
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                {selectedSchools.length} selected
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              danger
              onClick={handleDeleteSelectedSchools}
              disabled={selectedSchools.length === 0 || bulkDeleteLoading}
              loading={bulkDeleteLoading}
            >
              Delete Selected ({selectedSchools.length})
            </Button>
            <Button
              danger
              onClick={handleDeleteAllSchools}
              disabled={bulkDeleteLoading}
              loading={bulkDeleteLoading}
              style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f', color: 'white' }}
            >
              Delete All Schools
            </Button>
          </div>
        </div>
      )}
      
      <div className="schools-grid" data-testid="schools-grid">
        {filteredSchools.map((school) => {
          return (
            <div key={school.id} className="school-folder" data-testid={`school-folder-${school.school_id}`}>
              <div className="school-checkbox" style={{ 
                position: 'absolute', 
                top: '8px', 
                left: '8px', 
                zIndex: 10 
              }}>
                <input
                  type="checkbox"
                  checked={selectedSchools.includes(school.school_id)}
                  onChange={() => handleSelectSchool(school.school_id)}
                  style={{ 
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px'
                  }}
                />
              </div>
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
                {(school.region || school.sub_region) && (
                  <p className="school-contact">
                    Region: {[school.region, school.sub_region].filter(Boolean).join(' / ')}
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

      {showBulkAddModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '720px' }}>
            <h2>Bulk Add Schools</h2>
            <p style={{ color: '#666', marginBottom: '12px' }}>
              Upload a CSV file to create many schools at once. Required columns:
              <strong> school_id, school_name, email, password</strong>.
              Optional columns: contact_number, region, sub_region.
            </p>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              School logos are not included in bulk import. You can add or edit logos later from each school card.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <Button onClick={handleDownloadBulkTemplate}>Download CSV Template</Button>
              <input type="file" accept=".csv,text/csv" onChange={handleBulkFileChange} />
            </div>

            {bulkFile && (
              <div style={{ marginBottom: '16px', color: '#444', fontSize: '14px' }}>
                Selected file: {bulkFile.name}
              </div>
            )}

            {bulkImportError && (
              <div className="error-message" style={{ marginBottom: '16px' }}>
                {bulkImportError}
              </div>
            )}

            {bulkImportResult && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  background: '#fafafa'
                }}
              >
                <p style={{ marginBottom: '8px' }}>
                  Imported <strong>{bulkImportResult.created_count}</strong> school(s).
                </p>
                <p style={{ marginBottom: bulkImportResult.error_count ? '12px' : 0 }}>
                  Rows with issues: <strong>{bulkImportResult.error_count}</strong>
                </p>
                {bulkImportResult.error_count > 0 && (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
                    {bulkImportResult.errors.slice(0, 15).map((item, index) => (
                      <div key={`${item}-${index}`} style={{ fontSize: '13px', color: '#a8071a', marginBottom: '6px' }}>
                        {item}
                      </div>
                    ))}
                    {bulkImportResult.errors.length > 15 && (
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {bulkImportResult.errors.length - 15} more row error(s) not shown here.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="submit-btn"
                onClick={handleBulkImportSchools}
                disabled={bulkImportLoading || !bulkFile}
              >
                {bulkImportLoading ? 'Importing...' : 'Import Schools'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={closeBulkAddModal}
              >
                Close
              </button>
            </div>
          </div>
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
                <label>Region (optional)</label>
                <input
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  placeholder="e.g., North Zone"
                />
              </div>

              <div className="form-group">
                <label>Sub-Region (optional)</label>
                <input
                  type="text"
                  name="sub_region"
                  value={formData.sub_region}
                  onChange={handleInputChange}
                  placeholder="e.g., Delhi NCR"
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
                      region: '',
                      sub_region: '',
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
