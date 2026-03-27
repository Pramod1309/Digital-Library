import React, { useState } from 'react';
import { Card, Collapse, Input, Typography, Tag, List, Button, Divider } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

// Mock data - replace with actual API calls
const categories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    articles: [
      {
        id: 'gs-1',
        title: 'How to log in to your account',
        content: 'To log in to your account, follow these steps...',
        tags: ['login', 'authentication'],
      },
      {
        id: 'gs-2',
        title: 'Navigating the dashboard',
        content: 'The dashboard provides an overview of...',
        tags: ['dashboard', 'navigation'],
      },
    ],
  },
  {
    id: 'resources',
    name: 'Resources',
    articles: [
      {
        id: 'res-1',
        title: 'Uploading and managing resources',
        content: 'Learn how to upload and organize your resources...',
        tags: ['upload', 'resources', 'files'],
      },
      {
        id: 'res-2',
        title: 'Sharing resources with your team',
        content: 'You can share resources with your team members by...',
        tags: ['sharing', 'collaboration'],
      },
    ],
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    articles: [
      {
        id: 'ts-1',
        title: 'Common login issues and solutions',
        content: 'If you\'re having trouble logging in, try these solutions...',
        tags: ['login', 'authentication', 'issues'],
      },
      {
        id: 'ts-2',
        title: 'File upload errors',
        content: 'If you encounter errors while uploading files...',
        tags: ['upload', 'errors', 'files'],
      },
    ],
  },
];

const KnowledgeBase = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isNewArticle, setIsNewArticle] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    content: '',
    tags: [],
  });
  const [newTag, setNewTag] = useState('');

  const filteredCategories = categories.map(category => ({
    ...category,
    articles: category.articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(category => category.articles.length > 0);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleEditArticle = (article, categoryId) => {
    setEditingArticle({ ...article, categoryId });
    setFormData({
      category: categoryId,
      title: article.title,
      content: article.content,
      tags: [...article.tags],
    });
    setIsEditing(true);
    setIsNewArticle(false);
  };

  const handleNewArticle = () => {
    setEditingArticle(null);
    setFormData({
      category: categories[0]?.id || '',
      title: '',
      content: '',
      tags: [],
    });
    setIsEditing(true);
    setIsNewArticle(true);
  };

  const handleSaveArticle = () => {
    // In a real app, this would be an API call to save the article
    console.log('Saving article:', formData);
    
    // Reset form and close editor
    setIsEditing(false);
    setFormData({
      category: '',
      title: '',
      content: '',
      tags: [],
    });
  };

  const handleDeleteArticle = (articleId) => {
    // In a real app, this would be an API call to delete the article
    console.log('Deleting article:', articleId);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim().toLowerCase()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const renderArticleContent = (content) => {
    return content.split('\n').map((paragraph, index) => (
      <p key={index} style={{ marginBottom: '1em' }}>{paragraph}</p>
    ));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>Knowledge Base</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleNewArticle}
        >
          New Article
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: 24 }}>
          <Input
            placeholder="Search the knowledge base..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={handleSearch}
            style={{ maxWidth: 500 }}
            allowClear
          />
        </div>

        {isEditing ? (
          <Card 
            title={isNewArticle ? 'Create New Article' : 'Edit Article'}
            style={{ marginBottom: 24 }}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>Category</div>
              <Select 
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                style={{ width: '100%', marginBottom: 16 }}
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Option>
                ))}
              </Select>

              <div style={{ marginBottom: 8 }}>Title</div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ marginBottom: 16 }}
                placeholder="Enter article title"
              />

              <div style={{ marginBottom: 8 }}>Content</div>
              <TextArea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                style={{ marginBottom: 16 }}
                placeholder="Enter article content (supports markdown)"
              />

              <div style={{ marginBottom: 8 }}>Tags</div>
              <div style={{ display: 'flex', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
                {formData.tags.map(tag => (
                  <Tag 
                    key={tag} 
                    closable 
                    onClose={() => handleRemoveTag(tag)}
                  >
                    {tag}
                  </Tag>
                ))}
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onPressEnter={handleAddTag}
                  onBlur={handleAddTag}
                  placeholder="Add tag..."
                  style={{ width: 120 }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <Button 
                style={{ marginRight: 8 }} 
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    category: '',
                    title: '',
                    content: '',
                    tags: [],
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                onClick={handleSaveArticle}
                disabled={!formData.category || !formData.title || !formData.content}
              >
                {isNewArticle ? 'Create Article' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        ) : (
          <Collapse defaultActiveKey={['getting-started']}>
            {filteredCategories.map(category => (
              <Panel 
                header={category.name} 
                key={category.id}
                extra={`${category.articles.length} articles`}
              >
                <List
                  itemLayout="horizontal"
                  dataSource={category.articles}
                  renderItem={article => (
                    <List.Item
                      actions={[
                        <Button 
                          type="text" 
                          icon={<EditOutlined />} 
                          onClick={() => handleEditArticle(article, category.id)}
                        />,
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />} 
                          onClick={() => handleDeleteArticle(article.id)}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <div style={{ cursor: 'pointer' }}>
                            {article.title}
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: 8 }}>
                              {article.tags.map(tag => (
                                <Tag key={tag} style={{ marginRight: 8, marginBottom: 4 }}>{tag}</Tag>
                              ))}
                            </div>
                            <div style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
                              {article.content.substring(0, 150)}...
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Panel>
            ))}
          </Collapse>
        )}
      </Card>

      {!isEditing && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Divider>Need more help?</Divider>
          <p>Can't find what you're looking for? Contact our support team for assistance.</p>
          <Button type="primary" onClick={() => console.log('Contact support')}>
            Contact Support
          </Button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
