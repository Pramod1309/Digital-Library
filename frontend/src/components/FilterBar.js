// frontend/src/components/FilterBar.js
import React from 'react';
import { Select, Space, Row, Col } from 'antd';

const { Option } = Select;

const FilterBar = ({ 
  classFilter, 
  setClassFilter, 
  subjectFilter, 
  setSubjectFilter,
  subCategoryFilter,
  setSubCategoryFilter,
  statusFilter,
  setStatusFilter,
  subCategories,
  showSubCategory = true
}) => {
  // Class options with PlayGroup added and Grade 1-2 removed
  const classOptions = [
    { value: 'all', label: 'All Classes' },
    { value: 'playgroup', label: 'PlayGroup' },
    { value: 'nursery', label: 'Nursery' },
    { value: 'lkg', label: 'LKG' },
    { value: 'ukg', label: 'UKG' }
  ];

  // Subject options
  const subjectOptions = [
    { value: 'all', label: 'All Subjects' },
    { value: 'english', label: 'English' },
    { value: 'maths', label: 'Maths' },
    { value: 'evs', label: 'EVS' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'arts', label: 'Arts & Crafts' },
    { value: 'music', label: 'Music' },
    { value: 'pe', label: 'Physical Education' }
  ];

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' }
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24, padding: '16px 0' }}>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 8 }}>Class</div>
        <Select
          value={classFilter}
          onChange={setClassFilter}
          style={{ width: '100%' }}
          placeholder="Select Class"
        >
          {classOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 8 }}>Subject</div>
        <Select
          value={subjectFilter}
          onChange={setSubjectFilter}
          style={{ width: '100%' }}
          placeholder="Select Subject"
        >
          {subjectOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Col>

      {showSubCategory && subCategories && subCategories.length > 0 && (
        <Col xs={24} sm={12} md={6}>
          <div style={{ marginBottom: 8 }}>Sub-Category</div>
          <Select
            value={subCategoryFilter}
            onChange={setSubCategoryFilter}
            style={{ width: '100%' }}
            placeholder="Select Sub-Category"
            allowClear
          >
            <Option value="all">All Sub-Categories</Option>
            {subCategories.map(cat => (
              <Option key={cat} value={cat}>
                {cat}
              </Option>
            ))}
          </Select>
        </Col>
      )}

      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 8 }}>Status</div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: '100%' }}
          placeholder="Select Status"
        >
          {statusOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Col>
    </Row>
  );
};

export default FilterBar;