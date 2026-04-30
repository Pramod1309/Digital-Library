import React, { useEffect, useState } from 'react';
import { Card, Tabs, Form, Input, Button, Upload, message, Avatar, Switch, Select, Row, Col, Spin, Alert } from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import api from '../../api/axiosConfig';
import config from '../../config';

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

const SchoolSettings = ({ user, setUser }) => {
  const [profileForm] = Form.useForm();
  const [preferenceForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState(null);
  const [logoFiles, setLogoFiles] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setFetching(true);
    try {
      const [profileResponse, preferencesResponse] = await Promise.all([
        api.get('/school/settings/profile'),
        api.get('/school/settings/preferences')
      ]);
      setProfile(profileResponse.data);
      profileForm.setFieldsValue({
        school_name: profileResponse.data.school_name,
        email: profileResponse.data.email,
        contact_number: profileResponse.data.contact_number || '',
        password: '',
        confirm_password: ''
      });
      preferenceForm.setFieldsValue(preferencesResponse.data);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to load school settings'));
    } finally {
      setFetching(false);
    }
  };

  const saveProfile = async (values) => {
    setProfileLoading(true);
    try {
      const payload = new FormData();
      payload.append('school_name', values.school_name);
      payload.append('email', values.email);
      payload.append('contact_number', values.contact_number || '');
      if (values.password) {
        payload.append('password', values.password);
      }
      if (logoFiles[0]?.originFileObj) {
        payload.append('logo', logoFiles[0].originFileObj);
      }

      const response = await api.put('/school/settings/profile', payload);
      setProfile(response.data);
      setLogoFiles([]);
      message.success('School profile updated successfully');

      const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const nextUser = {
        ...savedUser,
        name: response.data.school_name,
        email: response.data.email,
        phone: response.data.contact_number || '',
        logo_path: response.data.logo_path || savedUser.logo_path
      };
      sessionStorage.setItem('user', JSON.stringify(nextUser));
      setUser?.(nextUser);
      profileForm.setFieldsValue({
        school_name: response.data.school_name,
        email: response.data.email,
        contact_number: response.data.contact_number || '',
        password: '',
        confirm_password: ''
      });
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to update school profile'));
    } finally {
      setProfileLoading(false);
    }
  };

  const savePreferences = async (values) => {
    setPreferencesLoading(true);
    try {
      await api.put('/school/settings/preferences', values);
      message.success('Preferences updated successfully');
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to update preferences'));
    } finally {
      setPreferencesLoading(false);
    }
  };

  const changePassword = async (values) => {
    setPasswordLoading(true);
    try {
      await api.post('/school/settings/security/change-password', values);
      passwordForm.resetFields();
      message.success('Password changed successfully');
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to change password'));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card title="School Settings">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card title="School Settings">
        <Tabs
          defaultActiveKey="profile"
          items={[
            {
              key: 'profile',
              label: 'School Profile',
              children: (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                    <Avatar
                      size={84}
                      src={resolveAssetUrl(profile?.logo_path || user?.logo_path)}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{profile?.school_name || user?.name}</div>
                      <div style={{ color: '#777' }}>School ID: {profile?.school_id || user?.school_id}</div>
                    </div>
                  </div>

                  <Form form={profileForm} layout="vertical" onFinish={saveProfile}>
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="school_name"
                          label="School Name"
                          rules={[{ required: true, message: 'Please enter school name' }]}
                        >
                          <Input prefix={<UserOutlined />} placeholder="School Name" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="email"
                          label="Email"
                          rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' }
                          ]}
                        >
                          <Input prefix={<MailOutlined />} placeholder="Email" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="contact_number" label="Contact Number">
                      <Input prefix={<PhoneOutlined />} placeholder="Contact number" />
                    </Form.Item>

                    <Form.Item label="School Logo">
                      <Upload
                        beforeUpload={() => false}
                        fileList={logoFiles}
                        onChange={({ fileList }) => setLogoFiles(fileList.slice(-1))}
                        maxCount={1}
                        accept="image/*"
                      >
                        <Button icon={<UploadOutlined />}>Upload New Logo</Button>
                      </Upload>
                    </Form.Item>

                    <Form.Item name="password" label="New Password">
                      <Input.Password prefix={<LockOutlined />} placeholder="Leave blank to keep current password" />
                    </Form.Item>

                    <Form.Item
                      name="confirm_password"
                      label="Confirm New Password"
                      dependencies={['password']}
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!getFieldValue('password') && !value) {
                              return Promise.resolve();
                            }
                            if (getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          }
                        })
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={profileLoading}>
                        Save Profile
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              )
            },
            {
              key: 'preferences',
              label: 'Preferences',
              children: (
                <div>
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                    message="Learning Hub Preferences"
                    description="Control how announcements, chat updates, and support-ticket alerts behave for your school account."
                  />
                  <Form form={preferenceForm} layout="vertical" onFinish={savePreferences}>
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="preferred_language" label="Preferred Language">
                          <Select
                            options={[
                              { value: 'en', label: 'English' },
                              { value: 'hi', label: 'Hindi' },
                              { value: 'mr', label: 'Marathi' }
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="dashboard_layout" label="Dashboard Layout">
                          <Select
                            options={[
                              { value: 'comfortable', label: 'Comfortable' },
                              { value: 'compact', label: 'Compact' }
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="email_notifications" label="Email Notifications" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="announcement_notifications" label="Announcement Notifications" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="chat_notifications" label="Chat Notifications" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="ticket_notifications" label="Support Ticket Notifications" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="auto_mark_announcements_read" label="Auto-Mark Announcements as Read" valuePropName="checked">
                      <Switch />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={preferencesLoading}>
                        Save Preferences
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              )
            },
            {
              key: 'security',
              label: 'Security',
              children: (
                <Form form={passwordForm} layout="vertical" onFinish={changePassword}>
                  <Form.Item
                    name="current_password"
                    label="Current Password"
                    rules={[{ required: true, message: 'Please enter current password' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="Current password" />
                  </Form.Item>

                  <Form.Item
                    name="new_password"
                    label="New Password"
                    rules={[{ required: true, message: 'Please enter new password' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="New password" />
                  </Form.Item>

                  <Form.Item
                    name="confirm_password"
                    label="Confirm New Password"
                    dependencies={['new_password']}
                    rules={[
                      { required: true, message: 'Please confirm new password' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('new_password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match'));
                        }
                      })
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={passwordLoading}>
                      Change Password
                    </Button>
                  </Form.Item>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default SchoolSettings;
