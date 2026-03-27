import React, { useState } from 'react';
import { Card, Tabs, Button, Form, Input, Select, Switch, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Option } = Select;

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('pages');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(`${activeTab === 'pages' ? 'Page' : 'Section'} saved successfully`);
      form.resetFields();
    } catch (error) {
      message.error(`Failed to save ${activeTab === 'pages' ? 'page' : 'section'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="settings-card">
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Pages" key="pages">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              isActive: true,
            }}
          >
            <Form.Item
              name="title"
              label="Page Title"
              rules={[{ required: true, message: 'Please input page title!' }]}
            >
              <Input placeholder="Enter page title" />
            </Form.Item>

            <Form.Item
              name="slug"
              label="URL Slug"
              rules={[{ required: true, message: 'Please input URL slug!' }]}
            >
              <Input addonBefore="/" placeholder="about-us" />
            </Form.Item>

            <Form.Item name="content" label="Content">
              <Input.TextArea rows={6} placeholder="Enter page content (supports markdown)" />
            </Form.Item>

            <Form.Item name="isActive" valuePropName="checked" label="Active">
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Save Page
              </Button>
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane tab="Sections" key="sections">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              isActive: true,
            }}
          >
            <Form.Item
              name="sectionName"
              label="Section Name"
              rules={[{ required: true, message: 'Please input section name!' }]}
            >
              <Input placeholder="Enter section name" />
            </Form.Item>

            <Form.Item
              name="sectionKey"
              label="Section Key"
              rules={[{ required: true, message: 'Please input section key!' }]}
            >
              <Input placeholder="home.hero" />
            </Form.Item>

            <Form.Item name="content" label="Content">
              <Input.TextArea rows={6} placeholder="Enter section content (supports markdown)" />
            </Form.Item>

            <Form.Item name="isActive" valuePropName="checked" label="Active">
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Save Section
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default ContentManagement;
