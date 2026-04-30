import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Upload, Avatar, Descriptions, Spin, Space } from 'antd';
import { UserOutlined, UploadOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import api from '../../api/axiosConfig';
import config from '../../config';
import { useTheme } from '../../contexts/ThemeContext';

const getApiErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message).filter(Boolean).join(', ') || fallbackMessage;
  }
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  return fallbackMessage;
};

const resolveAssetUrl = (path) => {
  if (!path) {
    return '';
  }
  if (/^(https?:|blob:|data:)/i.test(path)) {
    return path;
  }
  return `${config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const AdminProfile = ({ user, setUser }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState(null);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setFetching(true);
    try {
      const response = await api.get('/admin/settings/profile');
      setProfile(response.data);
      form.setFieldsValue({
        full_name: response.data.full_name || '',
        email: response.data.email,
        phone: response.data.phone || ''
      });
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to load admin profile'));
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('full_name', values.full_name);
      payload.append('phone', values.phone || '');
      if (fileList[0]?.originFileObj) {
        payload.append('avatar', fileList[0].originFileObj);
      }

      const response = await api.put('/admin/settings/profile', payload);
      setProfile(response.data);
      setFileList([]);
      message.success('Profile updated successfully');

      const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const nextUser = {
        ...savedUser,
        name: response.data.full_name || savedUser.name,
        phone: response.data.phone || '',
        avatar_path: response.data.avatar_path || null,
        role: response.data.role || savedUser.role,
        status: response.data.status || savedUser.status
      };
      sessionStorage.setItem('user', JSON.stringify(nextUser));
      if (setUser) {
        setUser(nextUser);
      }
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to update profile'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card title="Admin Profile" className="settings-card">
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Admin Profile" className="settings-card">
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <Avatar
          size={96}
          src={resolveAssetUrl(profile?.avatar_path)}
          icon={<UserOutlined />}
        />
        <div>
          <Upload
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: nextFiles }) => setFileList(nextFiles.slice(-1))}
            maxCount={1}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Change Avatar</Button>
          </Upload>
          <div style={{ marginTop: 10, color: '#777' }}>JPG, PNG, or WEBP works best for profile images.</div>
        </div>
      </div>

      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: 0, marginBottom: 4 }}>Theme Preference</h4>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Choose your preferred theme for the admin interface
            </p>
          </div>
          <Button
            className="theme-toggle"
            onClick={toggleTheme}
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </Space>

      <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Role">{profile?.role || user?.role || 'admin'}</Descriptions.Item>
        <Descriptions.Item label="Status">{profile?.status || user?.status || 'active'}</Descriptions.Item>
        <Descriptions.Item label="Last Login">
          {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'No login recorded'}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="full_name"
          label="Full Name"
          rules={[{ required: true, message: 'Please enter your full name' }]}
        >
          <Input placeholder="Enter your full name" />
        </Form.Item>

        <Form.Item name="email" label="Email Address">
          <Input disabled />
        </Form.Item>

        <Form.Item name="phone" label="Phone Number">
          <Input placeholder="Enter your phone number" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Update Profile
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AdminProfile;
