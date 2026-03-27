import React from 'react';
import { Outlet } from 'react-router-dom';

const SchoolResourceManagement = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Outlet />
    </div>
  );
};

export default SchoolResourceManagement;
