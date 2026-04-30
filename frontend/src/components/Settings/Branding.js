import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Upload, message, Switch, ColorPicker, Row, Col, Image, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
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

const getColorValue = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  return fallback;
};

const Branding = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [branding, setBranding] = useState(null);
  const [logoFiles, setLogoFiles] = useState([]);
  const [faviconFiles, setFaviconFiles] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    setFetching(true);
    try {
      const response = await api.get('/admin/settings/branding');
      setBranding(response.data);
      form.setFieldsValue({
        site_name: response.data.site_name,
        tagline: response.data.tagline,
        support_email: response.data.support_email || '',
        support_phone: response.data.support_phone || '',
        primary_color: response.data.primary_color,
        secondary_color: response.data.secondary_color,
        dark_mode: Boolean(response.data.dark_mode)
      });
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to load branding settings'));
    } finally {
      setFetching(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('site_name', values.site_name);
      payload.append('tagline', values.tagline);
      payload.append('support_email', values.support_email || '');
      payload.append('support_phone', values.support_phone || '');
      payload.append('primary_color', getColorValue(values.primary_color, '#1890ff'));
      payload.append('secondary_color', getColorValue(values.secondary_color, '#52c41a'));
      payload.append('dark_mode', values.dark_mode ? 'true' : 'false');
      if (logoFiles[0]?.originFileObj) {
        payload.append('logo', logoFiles[0].originFileObj);
      }
      if (faviconFiles[0]?.originFileObj) {
        payload.append('favicon', faviconFiles[0].originFileObj);
      }

      const response = await api.put('/admin/settings/branding', payload);
      setBranding(response.data);
      setLogoFiles([]);
      setFaviconFiles([]);
      message.success('Branding updated successfully');
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to update branding'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card title="Branding" className="settings-card">
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Branding" className="settings-card">
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Current Logo</div>
          {branding?.logo_path ? (
            <Image src={resolveAssetUrl(branding.logo_path)} alt="Brand logo" width={180} />
          ) : (
            <div style={{ color: '#999' }}>No logo uploaded</div>
          )}
        </Col>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Current Favicon</div>
          {branding?.favicon_path ? (
            <Image src={resolveAssetUrl(branding.favicon_path)} alt="Favicon" width={64} />
          ) : (
            <div style={{ color: '#999' }}>No favicon uploaded</div>
          )}
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="site_name" label="Site Name" rules={[{ required: true, message: 'Please enter site name' }]}>
          <Input placeholder="Enter site name" />
        </Form.Item>

        <Form.Item name="tagline" label="Tagline" rules={[{ required: true, message: 'Please enter tagline' }]}>
          <Input placeholder="Enter platform tagline" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="support_email" label="Support Email">
              <Input placeholder="support@example.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="support_phone" label="Support Phone">
              <Input placeholder="Enter support phone number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="primary_color" label="Primary Color">
              <ColorPicker format="hex" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="secondary_color" label="Secondary Color">
              <ColorPicker format="hex" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="dark_mode" label="Dark Mode" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item label="Logo">
          <Upload
            beforeUpload={() => false}
            fileList={logoFiles}
            onChange={({ fileList }) => setLogoFiles(fileList.slice(-1))}
            maxCount={1}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Upload Logo</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="Favicon">
          <Upload
            beforeUpload={() => false}
            fileList={faviconFiles}
            onChange={({ fileList }) => setFaviconFiles(fileList.slice(-1))}
            maxCount={1}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Upload Favicon</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Branding
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Branding;
