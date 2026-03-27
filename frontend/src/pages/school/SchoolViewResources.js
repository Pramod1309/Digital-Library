import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Table, Button, Input, Select, Tag, message, Empty } from 'antd';
import { DownloadOutlined, SearchOutlined, FileOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const { Search } = Input;
const { Option } = Select;

const SchoolViewResources = ({ user }) => {
  const { category } = useParams();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    fetchResources();
  }, [category]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/school/resources?category=${category}&school_id=${user.school_id}`);
      // Only show approved admin resources (not school's own uploads)
      const adminResources = response.data.filter(
        r => r.uploaded_by_type === 'admin' && r.approval_status === 'approved'
      );
      setResources(adminResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
      message.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record) => {
    try {
      // Log download
      await axios.post(`${API}/school/resources/${record.resource_id}/download`, {
        school_id: user.school_id,
        school_name: user.name
      });

      // Download file as blob
      const response = await axios.get(`${BACKEND_URL}${record.file_path}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', record.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('Download started');
      fetchResources();
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('Failed to download file');
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesClass = selectedClass === 'all' || resource.class_level === selectedClass;
    return matchesSearch && matchesClass;
  });

  const getCategoryTitle = () => {
    const titles = {
      'academic': 'Academic Resources',
      'marketing': 'Marketing Materials',
      'administrative': 'Administrative',
      'training': 'Training Resources',
      'event': 'Event & Celebration',
      'multimedia': 'Multimedia Collection'
    };
    return titles[category] || 'Resources';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <FileOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          {text}
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Class Level',
      dataIndex: 'class_level',
      key: 'class_level',
      render: (level) => level ? <Tag>{level}</Tag> : '-'
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => `${(size / (1024 * 1024)).toFixed(2)} MB`
    },
    {
      title: 'Downloads',
      dataIndex: 'download_count',
      key: 'download_count',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record)}
        >
          Download
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={getCategoryTitle()}
        extra={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Search
              placeholder="Search resources..."
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              enterButton={<SearchOutlined />}
            />
            <Select
              value={selectedClass}
              onChange={setSelectedClass}
              style={{ width: 150 }}
            >
              <Option value="all">All Classes</Option>
              <Option value="Nursery">Nursery</Option>
              <Option value="LKG">LKG</Option>
              <Option value="UKG">UKG</Option>
            </Select>
          </div>
        }
      >
        {filteredResources.length === 0 && !loading ? (
          <Empty description="No resources available in this category yet" />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredResources}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
};

export default SchoolViewResources;
