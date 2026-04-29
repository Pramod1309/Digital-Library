import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Spin, Typography } from 'antd';
import {
  AudioOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileUnknownOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import api from '../../api/axiosConfig';
import config from '../../config';
import {
  formatAttachmentSize,
  getAttachmentKind,
  getAttachmentName,
  getAttachmentSize,
  getAttachmentType,
  resolveAttachmentUrl
} from '../../utils/attachments';

const { Paragraph, Text } = Typography;

const AttachmentPreviewModal = ({ open, file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fileName = useMemo(() => getAttachmentName(file), [file]);
  const fileType = useMemo(() => getAttachmentType(file), [file]);
  const fileSize = useMemo(() => getAttachmentSize(file), [file]);
  const fileKind = useMemo(() => getAttachmentKind(file), [file]);

  useEffect(() => {
    let active = true;
    let generatedUrl = '';

    setLoadError('');
    setPreviewUrl('');

    if (!open || !file) {
      return undefined;
    }

    const localPreviewUrl = file.previewUrl || (/^(blob:|data:)/i.test(file.url || '') ? file.url : '');
    if (localPreviewUrl) {
      setPreviewUrl(localPreviewUrl);
      return undefined;
    }

    const sourceUrl = resolveAttachmentUrl(file.url || '');
    if (!sourceUrl) {
      setLoadError('Preview source is not available for this file.');
      return undefined;
    }

    const isBackendAsset = sourceUrl.startsWith(config.apiBaseUrl);
    if (!isBackendAsset) {
      setPreviewUrl(sourceUrl);
      return undefined;
    }

    setLoading(true);
    api.get(sourceUrl, { responseType: 'blob' })
      .then((response) => {
        if (!active) {
          return;
        }
        generatedUrl = URL.createObjectURL(response.data);
        setPreviewUrl(generatedUrl);
      })
      .catch((error) => {
        console.error('Attachment preview error:', error);
        if (active) {
          setLoadError('Unable to load this attachment preview right now.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (generatedUrl) {
        URL.revokeObjectURL(generatedUrl);
      }
    };
  }, [file, open]);

  const handleDownload = () => {
    const downloadSource = previewUrl || resolveAttachmentUrl(file?.url || '');
    if (!downloadSource) {
      return;
    }

    const link = document.createElement('a');
    link.href = downloadSource;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFallback = (icon) => (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '32px'
      }}
    >
      {icon}
      <Paragraph style={{ maxWidth: 420, marginTop: 20 }}>
        Browser preview is not available for this file type yet, but the file is ready to open or download.
      </Paragraph>
      <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
        Open / Download File
      </Button>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Spin size="large" />
        </div>
      );
    }

    if (loadError) {
      return renderFallback(<FileUnknownOutlined style={{ fontSize: 72, color: '#1677ff' }} />);
    }

    if (!previewUrl) {
      return null;
    }

    if (fileKind === 'image') {
      return (
        <div style={{ textAlign: 'center', minHeight: '60vh' }}>
          <img
            src={previewUrl}
            alt={fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '78vh',
              objectFit: 'contain',
              borderRadius: 16
            }}
          />
        </div>
      );
    }

    if (fileKind === 'pdf' || fileKind === 'text') {
      return (
        <iframe
          src={previewUrl}
          title={fileName}
          style={{
            width: '100%',
            height: '78vh',
            border: 'none',
            borderRadius: 16,
            background: '#fff'
          }}
        />
      );
    }

    if (fileKind === 'video') {
      return (
        <video
          controls
          style={{
            width: '100%',
            maxHeight: '78vh',
            borderRadius: 16,
            background: '#000'
          }}
        >
          <source src={previewUrl} type={fileType || 'video/mp4'} />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (fileKind === 'audio') {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20
          }}
        >
          <AudioOutlined style={{ fontSize: 72, color: '#1677ff' }} />
          <audio controls style={{ width: '100%', maxWidth: 540 }}>
            <source src={previewUrl} type={fileType || 'audio/mpeg'} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (fileKind === 'document') {
      return renderFallback(<FileTextOutlined style={{ fontSize: 72, color: '#1677ff' }} />);
    }

    return renderFallback(<FileUnknownOutlined style={{ fontSize: 72, color: '#1677ff' }} />);
  };

  const getHeaderIcon = () => {
    if (fileKind === 'image') return <FileImageOutlined style={{ color: '#1677ff' }} />;
    if (fileKind === 'pdf') return <FilePdfOutlined style={{ color: '#cf1322' }} />;
    if (fileKind === 'video') return <PlayCircleOutlined style={{ color: '#1677ff' }} />;
    if (fileKind === 'audio') return <AudioOutlined style={{ color: '#1677ff' }} />;
    if (fileKind === 'text' || fileKind === 'document') return <FileTextOutlined style={{ color: '#1677ff' }} />;
    return <FileUnknownOutlined style={{ color: '#1677ff' }} />;
  };

  return (
    <Modal
      title={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {getHeaderIcon()}
          <span>{fileName}</span>
        </div>
      )}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
          Download
        </Button>
      ]}
      width="92vw"
      style={{ top: 18 }}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          {fileType || 'Unknown type'}
          {fileSize ? ` • ${formatAttachmentSize(fileSize)}` : ''}
        </Text>
      </div>
      {renderContent()}
    </Modal>
  );
};

export default AttachmentPreviewModal;
