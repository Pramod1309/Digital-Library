import React, { useState } from 'react';
import { Card, Form, Input, Button, Upload, message, Avatar } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SchoolProfile = ({ user }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const formData = new FormData();
      
      if (values.school_name) formData.append('school_name', values.school_name);
      if (values.email) formData.append('email', values.email);
      if (values.password) formData.append('password', values.password);
      if (fileList.length > 0) formData.append('logo', fileList[0].originFileObj);

      await axios.put(`${API}/admin/schools/${user.school_id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      message.success('Profile updated successfully! Please login again to see changes.');
      form.resetFields(['password', 'confirm_password']);
      setFileList([]);
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = ({ fileList }) => {
    setFileList(fileList.slice(-1));
  };

  return (
    <div>
      <Card title="School Profile">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <Avatar 
            size={80} 
            src={user.logo_path ? `${BACKEND_URL}${user.logo_path}` : null}
            icon={<UserOutlined />}
          />
          <div style={{ marginLeft: '16px' }}>
            <h3>{user.name}</h3>
            <p style={{ margin: 0, color: '#888' }}>School ID: {user.school_id}</p>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            school_name: user.name,
            email: user.email
          }}
        >
          <Form.Item
            label="School Name"
            name="school_name"
            rules={[{ required: true, message: 'Please enter school name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="School Name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            label="New Password (leave blank to keep current)"
            name="password"
          >
            <Input.Password prefix={<LockOutlined />} placeholder="New Password" />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirm_password"
            dependencies={['password']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
          </Form.Item>

          <Form.Item label="School Logo">
            <Upload
              listType="picture"
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={() => false}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>Select New Logo</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Profile
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SchoolProfile;
