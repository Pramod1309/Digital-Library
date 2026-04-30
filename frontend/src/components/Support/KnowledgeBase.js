import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Col,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message
} from 'antd';
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons';
import api from '../../api/axiosConfig';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CATEGORY_OPTIONS = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'account-access', label: 'Account & Access' },
  { value: 'communication', label: 'Communication' },
  { value: 'resources', label: 'Resources & Watermarking' },
  { value: 'support', label: 'Support Operations' },
  { value: 'analytics', label: 'Analytics & Reporting' },
  { value: 'troubleshooting', label: 'Troubleshooting' }
];

const getApiErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message)
      .filter(Boolean)
      .join(', ') || fallbackMessage;
  }

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  return fallbackMessage;
};

const parseTags = (tags) => (
  String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
);

const formatCategoryLabel = (category) => {
  const matchedOption = CATEGORY_OPTIONS.find((option) => option.value === category);
  if (matchedOption) {
    return matchedOption.label;
  }

  return String(category || 'General')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const KnowledgeBase = () => {
  const [form] = Form.useForm();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/knowledge-base');
      setArticles(response.data || []);
    } catch (error) {
      console.error('Error fetching knowledge base articles:', error);
      message.error(getApiErrorMessage(error, 'Failed to load knowledge base'));
    } finally {
      setLoading(false);
    }
  };

  const groupedArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = articles.filter((article) => {
      const tagText = parseTags(article.tags).join(' ').toLowerCase();
      const haystack = [
        article.title,
        article.content,
        article.category,
        tagText
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !query || haystack.includes(query);
    });

    return filtered.reduce((accumulator, article) => {
      const key = article.category || 'general';
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(article);
      return accumulator;
    }, {});
  }, [articles, searchQuery]);

  const categoryCards = useMemo(() => Object.entries(groupedArticles).map(([category, items]) => ({
    category,
    label: formatCategoryLabel(category),
    count: items.length
  })), [groupedArticles]);

  const totalViews = useMemo(
    () => articles.reduce((sum, article) => sum + (article.view_count || 0), 0),
    [articles]
  );

  const openCreateModal = () => {
    setEditingArticle(null);
    form.resetFields();
    form.setFieldsValue({
      category: CATEGORY_OPTIONS[0]?.value,
      tags: []
    });
    setIsEditorOpen(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    form.setFieldsValue({
      category: article.category,
      title: article.title,
      content: article.content,
      tags: parseTags(article.tags)
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingArticle(null);
    form.resetFields();
  };

  const handleSave = async (values) => {
    const payload = {
      title: values.title.trim(),
      content: values.content.trim(),
      category: values.category,
      tags: (values.tags || []).join(',')
    };

    setSaving(true);
    try {
      if (editingArticle) {
        await api.put(`/admin/knowledge-base/${editingArticle.id}`, {
          ...payload,
          is_published: true
        });
        message.success('Article updated successfully');
      } else {
        await api.post('/admin/knowledge-base', payload);
        message.success('Article created successfully');
      }

      closeEditor();
      fetchArticles();
    } catch (error) {
      console.error('Error saving knowledge base article:', error);
      message.error(getApiErrorMessage(error, 'Failed to save article'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (articleId) => {
    try {
      await api.delete(`/admin/knowledge-base/${articleId}`);
      message.success('Article deleted successfully');
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      message.error(getApiErrorMessage(error, 'Failed to delete article'));
    }
  };

  const handleViewArticle = async (articleId) => {
    try {
      const response = await api.get(`/knowledge-base/${articleId}`);
      setViewingArticle(response.data);
      setViewModalOpen(true);
      setArticles((previousArticles) => previousArticles.map((article) => (
        article.id === articleId ? response.data : article
      )));
    } catch (error) {
      console.error('Error loading article:', error);
      message.error(getApiErrorMessage(error, 'Failed to load article'));
    }
  };

  const categoryOptions = useMemo(() => {
    const dynamicCategories = Array.from(new Set(articles.map((article) => article.category).filter(Boolean)));
    const knownValues = new Set(CATEGORY_OPTIONS.map((option) => option.value));

    return [
      ...CATEGORY_OPTIONS,
      ...dynamicCategories
        .filter((category) => !knownValues.has(category))
        .map((category) => ({
          value: category,
          label: formatCategoryLabel(category)
        }))
    ];
  }, [articles]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Knowledge Base</Title>
          <Text type="secondary">
            Maintain help content for announcements, resources, school onboarding, support workflows, and platform troubleshooting.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New Article
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Published Articles" value={articles.length} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Categories" value={Object.keys(groupedArticles).length} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Total Views" value={totalViews} prefix={<EyeOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <Input
            allowClear
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Search by title, content, category, or tag"
            style={{ maxWidth: 420 }}
          />
          <Space wrap>
            {categoryCards.map((item) => (
              <Tag key={item.category} color="blue" style={{ padding: '6px 10px' }}>
                {item.label}: {item.count}
              </Tag>
            ))}
          </Space>
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : Object.keys(groupedArticles).length === 0 ? (
          <Empty
            description={searchQuery ? 'No articles matched your search' : 'No knowledge base articles available'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            {Object.entries(groupedArticles).map(([category, items]) => (
              <Card
                key={category}
                title={formatCategoryLabel(category)}
                extra={<Text type="secondary">{items.length} article{items.length === 1 ? '' : 's'}</Text>}
              >
                <List
                  itemLayout="vertical"
                  dataSource={items}
                  renderItem={(article) => (
                    <List.Item
                      key={article.id}
                      actions={[
                        <Button key="view" type="link" icon={<EyeOutlined />} onClick={() => handleViewArticle(article.id)}>
                          Read
                        </Button>,
                        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEditModal(article)}>
                          Edit
                        </Button>,
                        <Popconfirm
                          key="delete"
                          title="Delete article"
                          description="This article will be removed from the knowledge base."
                          okText="Delete"
                          cancelText="Cancel"
                          onConfirm={() => handleDelete(article.id)}
                        >
                          <Button type="link" danger icon={<DeleteOutlined />}>
                            Delete
                          </Button>
                        </Popconfirm>
                      ]}
                    >
                      <List.Item.Meta
                        title={<span style={{ fontWeight: 700 }}>{article.title}</span>}
                        description={(
                          <Space size={[8, 8]} wrap>
                            <Tag color="geekblue">{formatCategoryLabel(article.category)}</Tag>
                            <Tag>{article.view_count || 0} views</Tag>
                            <Text type="secondary">
                              Updated {new Date(article.updated_at).toLocaleDateString()}
                            </Text>
                          </Space>
                        )}
                      />
                      <Paragraph ellipsis={{ rows: 3, expandable: false }} style={{ marginBottom: 10 }}>
                        {article.content}
                      </Paragraph>
                      <Space size={[8, 8]} wrap>
                        {parseTags(article.tags).map((tag) => (
                          <Tag key={`${article.id}-${tag}`}>{tag}</Tag>
                        ))}
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Modal
        title={editingArticle ? 'Edit Article' : 'Create Article'}
        open={isEditorOpen}
        onCancel={closeEditor}
        onOk={() => form.submit()}
        okText={editingArticle ? 'Save Changes' : 'Create Article'}
        confirmLoading={saving}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              options={categoryOptions}
              placeholder="Select article category"
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter an article title' }]}
          >
            <Input placeholder="Example: Publishing announcements with attachments" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
            extra="Press Enter after each tag"
          >
            <Select
              mode="tags"
              tokenSeparators={[',']}
              placeholder="Add tags like announcements, attachments, login"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, message: 'Please add article content' }]}
          >
            <TextArea
              rows={12}
              placeholder="Write the help article content here. Use plain paragraphs and step-by-step guidance where helpful."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={viewingArticle?.title || 'Article'}
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false);
          setViewingArticle(null);
        }}
        footer={null}
        width={760}
        destroyOnClose
      >
        {viewingArticle ? (
          <div>
            <Space size={[8, 8]} wrap style={{ marginBottom: 12 }}>
              <Tag color="geekblue">{formatCategoryLabel(viewingArticle.category)}</Tag>
              <Tag>{viewingArticle.view_count || 0} views</Tag>
              <Text type="secondary">
                Updated {new Date(viewingArticle.updated_at).toLocaleString()}
              </Text>
            </Space>

            <div style={{ marginBottom: 16 }}>
              <Space size={[8, 8]} wrap>
                {parseTags(viewingArticle.tags).map((tag) => (
                  <Tag key={`view-${tag}`}>{tag}</Tag>
                ))}
              </Space>
            </div>

            <Paragraph style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>
              {viewingArticle.content}
            </Paragraph>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
