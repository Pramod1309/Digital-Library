import React, { useEffect, useMemo, useState } from 'react';
import { Card, Tabs, Button, Modal, Form, Input, Switch, Table, Tag, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
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

const ContentManagement = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('page');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/settings/content');
      setEntries(response.data || []);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to load content entries'));
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.entry_type === activeTab),
    [entries, activeTab]
  );

  const openCreateModal = () => {
    setEditingEntry(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setIsModalVisible(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      title: entry.title,
      slug: entry.slug || '',
      section_key: entry.section_key || '',
      content: entry.content || '',
      is_active: entry.is_active
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (entryId) => {
    try {
      await api.delete(`/admin/settings/content/${entryId}`);
      message.success('Content entry deleted successfully');
      fetchEntries();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to delete content entry'));
    }
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        entry_type: activeTab,
        title: values.title,
        slug: activeTab === 'page' ? (values.slug || null) : null,
        section_key: activeTab === 'section' ? (values.section_key || null) : null,
        content: values.content || '',
        is_active: Boolean(values.is_active)
      };

      if (editingEntry) {
        await api.put(`/admin/settings/content/${editingEntry.id}`, payload);
        message.success('Content entry updated successfully');
      } else {
        await api.post('/admin/settings/content', payload);
        message.success('Content entry created successfully');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchEntries();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to save content entry'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: activeTab === 'page' ? 'Slug' : 'Section Key',
      key: 'identifier',
      render: (_, record) => record.slug || record.section_key || '-'
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (value) => new Date(value).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this entry?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card className="settings-card" title="Content Management">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'page', label: 'Pages' },
          { key: 'section', label: 'Sections' }
        ]}
      />

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Add {activeTab === 'page' ? 'Page' : 'Section'}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredEntries}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingEntry ? `Edit ${activeTab === 'page' ? 'Page' : 'Section'}` : `Add ${activeTab === 'page' ? 'Page' : 'Section'}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingEntry ? 'Save Changes' : 'Create'}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input placeholder={`Enter ${activeTab === 'page' ? 'page' : 'section'} title`} />
          </Form.Item>

          {activeTab === 'page' ? (
            <Form.Item name="slug" label="Slug">
              <Input addonBefore="/" placeholder="about-us" />
            </Form.Item>
          ) : (
            <Form.Item name="section_key" label="Section Key">
              <Input placeholder="home.hero" />
            </Form.Item>
          )}

          <Form.Item name="content" label="Content">
            <Input.TextArea rows={8} placeholder="Enter content" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ContentManagement;
