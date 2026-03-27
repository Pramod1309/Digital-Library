import React, { useState } from 'react';
import { Card, Form, Input, Button, Upload, message, Switch, ColorPicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const Branding = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Branding updated successfully');
    } catch (error) {
      message.error('Failed to update branding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Branding" className="settings-card">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          siteName: 'Wonder Learning',
          primaryColor: '#1890ff',
          secondaryColor: '#52c41a',
          darkMode: false,
        }}
      >
        <Form.Item name="logo" label="Logo" valuePropName="fileList">
          <Upload name="logo" listType="picture">
            <Button icon={<UploadOutlined />}>Click to upload</Button>
          </Upload>
        </Form.Item>

        <Form.Item name="favicon" label="Favicon" valuePropName="fileList">
          <Upload name="favicon" listType="picture">
            <Button icon={<UploadOutlined />}>Click to upload</Button>
          </Upload>
        </Form.Item>

        <Form.Item name="siteName" label="Site Name" rules={[{ required: true }]}>
          <Input placeholder="Enter site name" />
        </Form.Item>

        <Form.Item name="primaryColor" label="Primary Color">
          <ColorPicker />
        </Form.Item>

        <Form.Item name="secondaryColor" label="Secondary Color">
          <ColorPicker />
        </Form.Item>

        <Form.Item name="darkMode" label="Dark Mode" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Branding;
