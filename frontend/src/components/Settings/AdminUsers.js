import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Space, Tag, Alert, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
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

const AdminUsers = ({ user, setUser }) => {
  const [users, setUsers] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setTableLoading(true);
    try {
      const [profileResponse, usersResponse] = await Promise.all([
        api.get('/admin/settings/profile'),
        api.get('/admin/settings/admin-users')
      ]);
      setCurrentProfile(profileResponse.data);
      setUsers(usersResponse.data || []);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to load admin users'));
    } finally {
      setTableLoading(false);
    }
  };

  const isSuperAdmin = useMemo(
    () => (currentProfile?.role || user?.role) === 'superadmin',
    [currentProfile?.role, user?.role]
  );

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      full_name: record.full_name || '',
      email: record.email,
      phone: record.phone || '',
      status: record.status || 'active',
      role: record.role || 'admin',
      password: '',
      confirm_password: ''
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (adminId) => {
    try {
      await api.delete(`/admin/settings/admin-users/${adminId}`);
      message.success('Admin deleted successfully');
      fetchData();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to delete admin'));
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (editingUser) {
        const payload = {
          full_name: values.full_name,
          phone: values.phone || null
        };

        if (values.password) {
          payload.password = values.password;
        }

        if (isSuperAdmin) {
          payload.role = values.role;
          payload.status = values.status;
        }

        const response = await api.put(`/admin/settings/admin-users/${editingUser.id}`, payload);
        message.success('Admin updated successfully');

        if (editingUser.email === currentProfile?.email) {
          const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
          const nextUser = {
            ...savedUser,
            name: response.data.full_name || savedUser.name,
            phone: response.data.phone || '',
            role: response.data.role || savedUser.role,
            status: response.data.status || savedUser.status
          };
          sessionStorage.setItem('user', JSON.stringify(nextUser));
          setUser?.(nextUser);
        }
      } else {
        await api.post('/admin/settings/admin-users', {
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || null,
          password: values.password,
          role: 'admin'
        });
        message.success('Admin added successfully');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(getApiErrorMessage(error, `Failed to ${editingUser ? 'update' : 'add'} admin`));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (_, record) => record.full_name || record.email
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (value) => value || <span style={{ color: '#999' }}>Not set</span>
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'superadmin' ? 'red' : 'blue'}>
          {role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN'}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {String(status || 'active').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (date) => date ? new Date(date).toLocaleString() : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const canEdit = isSuperAdmin || record.email === currentProfile?.email;
        const canDelete = isSuperAdmin && record.role !== 'superadmin' && record.email !== currentProfile?.email;

        return (
          <Space size="middle">
            {canEdit && (
              <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Popconfirm
                title="Delete this admin?"
                description="This action cannot be undone."
                onConfirm={() => handleDelete(record.id)}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Card className="settings-card" title="Admin Users">
      <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 16 }}>
        <Alert
          type={isSuperAdmin ? 'success' : 'info'}
          showIcon
          message={isSuperAdmin ? 'Super Admin access active' : 'Admin access'}
          description={
            isSuperAdmin
              ? 'You can add new admins, update all admin records, and delete non-super-admin accounts.'
              : 'You can view the admin directory and update only your own account details.'
          }
        />

        {isSuperAdmin && (
          <div>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
              Add Admin
            </Button>
          </div>
        )}
      </Space>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={tableLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUser ? 'Edit Admin User' : 'Add Admin User'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingUser ? 'Save Changes' : 'Create Admin'}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'active',
            role: 'admin'
          }}
        >
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Enter email" disabled={Boolean(editingUser)} />
          </Form.Item>

          <Form.Item name="phone" label="Phone Number">
            <Input prefix={<PhoneOutlined />} placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'New Password' : 'Password'}
            rules={[
              {
                required: !editingUser,
                message: 'Please enter password'
              }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirm Password"
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
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>

          {isSuperAdmin && (
            <>
              <Form.Item name="role" label="Role">
                <Select
                  disabled
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'superadmin', label: 'Super Admin' }
                  ]}
                />
              </Form.Item>

              {editingUser && editingUser.role !== 'superadmin' && (
                <Form.Item name="status" label="Status">
                  <Select
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' }
                    ]}
                  />
                </Form.Item>
              )}
            </>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminUsers;
