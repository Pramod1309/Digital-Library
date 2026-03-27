import React, { useState } from 'react';
import { Card, Button, Table, Space, message, Modal, Progress, Tag, Select } from 'antd';
import { 
  CloudDownloadOutlined, 
  CloudUploadOutlined, 
  DownloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';

const { Option } = Select;

const DataBackup = () => {
  const [loading, setLoading] = useState(false);
  const [backupType, setBackupType] = useState('full');
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const backupHistory = [
    {
      key: '1',
      name: 'Full Backup',
      date: '2025-12-14 10:30:00',
      size: '2.5 GB',
      status: 'completed',
      type: 'full'
    },
    {
      key: '2',
      name: 'Database Only',
      date: '2025-12-10 14:15:00',
      size: '1.2 GB',
      status: 'completed',
      type: 'database'
    },
    {
      key: '3',
      name: 'Incremental Backup',
      date: '2025-12-07 09:45:00',
      size: '350 MB',
      status: 'completed',
      type: 'incremental'
    },
  ];

  const columns = [
    {
      title: 'Backup Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'full' ? 'blue' : type === 'incremental' ? 'green' : 'orange'}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        let icon = null;
        
        switch(status) {
          case 'completed':
            color = 'success';
            icon = <CheckCircleOutlined />;
            break;
          case 'in-progress':
            color = 'processing';
            icon = <SyncOutlined spin />;
            break;
          case 'failed':
            color = 'error';
            icon = <CloseCircleOutlined />;
            break;
          case 'scheduled':
            color = 'warning';
            icon = <ClockCircleOutlined />;
            break;
          default:
            break;
        }
        
        return (
          <Tag icon={icon} color={color}>
            {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<DownloadOutlined />} 
            disabled={record.status !== 'completed'}
          >
            Download
          </Button>
          <Button 
            type="link" 
            onClick={() => showRestoreConfirm(record)}
            disabled={isRestoring || record.status !== 'completed'}
            loading={isRestoring && record.key === 'restoring'}
          >
            Restore
          </Button>
        </Space>
      ),
    },
  ];

  const handleBackup = async () => {
    setLoading(true);
    setIsBackingUp(true);
    
    // Simulate backup process
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        const newProgress = prev + Math.floor(Math.random() * 20) + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          setLoading(false);
          setIsBackingUp(false);
          message.success('Backup completed successfully!');
          return 100;
        }
        return newProgress;
      });
    }, 500);

    // Clear interval if component unmounts
    return () => clearInterval(interval);
  };

  const handleRestore = async (backup) => {
    setIsRestoring(true);
    
    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success(`Successfully restored backup: ${backup.name}`);
    } catch (error) {
      message.error('Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const showRestoreConfirm = (backup) => {
    Modal.confirm({
      title: `Restore from ${backup.name}?`,
      content: 'This will replace all current data with the data from this backup. Are you sure you want to continue?',
      okText: 'Yes, restore',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleRestore(backup),
    });
  };

  return (
    <div className="settings-card">
      <Card 
        title="Create New Backup" 
        style={{ marginBottom: 24 }}
        extra={
          <Button 
            type="primary" 
            icon={<CloudDownloadOutlined />} 
            onClick={handleBackup}
            loading={loading}
            disabled={isBackingUp}
          >
            {isBackingUp ? 'Backing Up...' : 'Create Backup'}
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8 }}>Backup Type:</label>
          <Select 
            value={backupType}
            onChange={setBackupType}
            style={{ width: 200 }}
            disabled={isBackingUp}
          >
            <Option value="full">Full Backup</Option>
            <Option value="incremental">Incremental Backup</Option>
            <Option value="database">Database Only</Option>
            <Option value="files">Files Only</Option>
          </Select>
        </div>

        {isBackingUp && (
          <div>
            <p>Backup in progress... Please don't close this page.</p>
            <Progress percent={backupProgress} status="active" />
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <p><strong>Backup includes:</strong></p>
          <ul>
            {backupType === 'full' && (
              <>
                <li>All database tables</li>
                <li>Uploaded files and media</li>
                <li>System configurations</li>
                <li>User data</li>
              </>
            )}
            {backupType === 'incremental' && (
              <>
                <li>Changes since last backup</li>
                <li>New or modified files</li>
                <li>Database changes</li>
              </>
            )}
            {backupType === 'database' && (
              <>
                <li>All database tables</li>
                <li>No files or media</li>
              </>
            )}
            {backupType === 'files' && (
              <>
                <li>Uploaded files and media</li>
                <li>No database data</li>
              </>
            )}
          </ul>
        </div>
      </Card>

      <Card 
        title="Backup History"
        extra={
          <Button 
            icon={<SyncOutlined />} 
            onClick={() => message.info('Refreshing backup list...')}
          >
            Refresh
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={backupHistory} 
          pagination={{ pageSize: 5 }}
          rowKey="key"
        />
      </Card>

      <Card 
        title="Restore from Backup" 
        style={{ marginTop: 24 }}
        extra={
          <Button 
            type="primary" 
            icon={<CloudUploadOutlined />} 
            onClick={() => message.info('Upload backup file')}
          >
            Upload Backup
          </Button>
        }
      >
        <p>Upload a backup file to restore your system to a previous state.</p>
        <p><strong>Note:</strong> Restoring from a backup will replace all current data with the data from the backup.</p>
      </Card>
    </div>
  );
};

export default DataBackup;
