// frontend/src/components/Resources/ResourceManagement.js
import React from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';

const ResourceManagement = () => {
  const { category } = useParams();
  
  // If no category is selected, show the home view
  if (!category) {
    return <Outlet />;
  }
  
  // Valid categories
  const validCategories = ['academic', 'marketing', 'administrative', 'training', 'event', 'multimedia'];
  
  if (!validCategories.includes(category)) {
    return <Navigate to="/admin/resources" replace />;
  }
  
  return <Outlet context={{ category }} />;
};

export default ResourceManagement;