import React from 'react';
import { Outlet } from 'react-router-dom';

const SchoolSupport = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Outlet />
    </div>
  );
};

export default SchoolSupport;
