import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Button, Switch, message, Alert, Spin, Row, Col } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import api from '../../api/axiosConfig';

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

const Security = ({ user }) => {
  const [settingsForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [profileResponse, settingsResponse] = await Promise.all([
        api.get('/admin/settings/profile'),
        api.get('/admin/settings/security')
      ]);
      setProfile(profileResponse.data);
      settingsForm.setFieldsValue(settingsResponse.data);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to load security settings'));
    } finally {
      setFetching(false);
    }
  };

  const isSuperAdmin = useMemo(
    () => (profile?.role || user?.role) === 'superadmin',
    [profile?.role, user?.role]
  );

  const saveSecuritySettings = async (values) => {
    setLoading(true);
    try {
      await api.put('/admin/settings/security', values);
      message.success('Security settings updated successfully');
      fetchData();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to update security settings'));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (values) => {
    setPasswordLoading(true);
    try {
      await api.post('/admin/settings/security/change-password', values);
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
      <div className="settings-card">
        <Card title="Security Settings">
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="settings-card">
      <Card title="Security Settings" style={{ marginBottom: 24 }}>
        <Alert
          type={isSuperAdmin ? 'success' : 'info'}
          showIcon
          icon={<SafetyOutlined />}
          style={{ marginBottom: 24 }}
          message={isSuperAdmin ? 'Super Admin controls' : 'Read-only security overview'}
          description={
            isSuperAdmin
              ? 'You can update platform-wide security policies for admins and schools.'
              : 'Only the super admin can change platform-wide security policies. You can still change your own password below.'
          }
        />

        <Form form={settingsForm} layout="vertical" onFinish={saveSecuritySettings} disabled={!isSuperAdmin}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="session_timeout_minutes"
                label="Session Timeout (minutes)"
                rules={[{ required: true, message: 'Please enter session timeout' }]}
              >
                <Input type="number" min={5} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="max_login_attempts"
                label="Max Login Attempts"
                rules={[{ required: true, message: 'Please enter max login attempts' }]}
              >
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="password_expiry_days"
                label="Password Expiry (days)"
                rules={[{ required: true, message: 'Please enter password expiry days' }]}
              >
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="enable_brute_force" label="Enable Brute Force Protection" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="allow_school_profile_edits" label="Allow School Profile Edits" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="require_strong_passwords" label="Require Strong Passwords" valuePropName="checked">
            <Switch />
          </Form.Item>

          {isSuperAdmin && (
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Save Security Settings
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>

      <Card title="Change Password">
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
      </Card>
    </div>
  );
};

export default Security;
