import React, { useState } from 'react';
import { Card, Form, Input, Button, Switch, message, Divider, Alert } from 'antd';
import { LockOutlined, SafetyOutlined, WarningOutlined } from '@ant-design/icons';

const Security = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Security settings updated successfully');
    } catch (error) {
      message.error('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Password changed successfully');
      form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
    } catch (error) {
      message.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-card">
      <Card title="Security Settings" style={{ marginBottom: 24 }}>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            sessionTimeout: 30,
            loginAttempts: 5,
            passwordExpiry: 90,
            enableBruteForce: true,
          }}
        >
          <Form.Item
            name="sessionTimeout"
            label="Session Timeout (minutes)"
            rules={[{ required: true }]}
          >
            <Input type="number" min={1} />
          </Form.Item>

          <Form.Item
            name="loginAttempts"
            label="Max Login Attempts"
            rules={[{ required: true }]}
          >
            <Input type="number" min={1} max={10} />
          </Form.Item>

          <Form.Item
            name="passwordExpiry"
            label="Password Expiry (days)"
            rules={[{ required: true }]}
          >
            <Input type="number" min={1} />
          </Form.Item>

          <Form.Item
            name="enableBruteForce"
            label="Enable Brute Force Protection"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Two-Factor Authentication" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4>Two-Factor Authentication</h4>
              <p>Add an extra layer of security to your account</p>
            </div>
            <Switch 
              checked={twoFactorAuth} 
              onChange={setTwoFactorAuth} 
              checkedChildren="On" 
              unCheckedChildren="Off" 
            />
          </div>
          
          {twoFactorAuth && (
            <div style={{ marginTop: 16 }}>
              <Alert
                message="Two-Factor Authentication is enabled"
                type="success"
                showIcon
                icon={<SafetyOutlined />}
                style={{ marginBottom: 16 }}
              />
              <p>Use Google Authenticator or Authy to scan the QR code below:</p>
              <div style={{ 
                background: '#f5f5f5', 
                padding: 20, 
                textAlign: 'center',
                margin: '16px 0',
                borderRadius: 4
              }}>
                <p>QR Code Placeholder</p>
                <p style={{ fontSize: 12, color: '#999' }}>Or enter this code manually: ABCDEFGHIJKLMNOP</p>
              </div>
              <Form.Item
                name="verificationCode"
                label="Verification Code"
                rules={[{ required: true, message: 'Please input the verification code!' }]}
              >
                <Input placeholder="Enter 6-digit code" maxLength={6} />
              </Form.Item>
              <Button type="primary">Verify and Activate</Button>
            </div>
          )}
        </div>
      </Card>

      <Card title="Change Password">
        <Form
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: 'Please input your current password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter current password"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please input your new password!' },
              { min: 8, message: 'Password must be at least 8 characters!' },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter new password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your new password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject('The two passwords do not match!');
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm new password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Change Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Security;
