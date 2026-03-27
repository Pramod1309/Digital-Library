import React from 'react';
import { Card, Tabs } from 'antd';
import SchoolProfile from './SchoolProfile';

const { TabPane } = Tabs;

const SchoolSettings = ({ user }) => {
  return (
    <div>
      <Card title="Settings">
        <Tabs defaultActiveKey="profile">
          <TabPane tab="School Profile" key="profile">
            <SchoolProfile user={user} />
          </TabPane>
          <TabPane tab="Preferences" key="preferences">
            <div style={{ padding: '20px' }}>
              <h3>Notification Preferences</h3>
              <p>Configure how you receive notifications from the system.</p>
              {/* Add notification settings here */}
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default SchoolSettings;
