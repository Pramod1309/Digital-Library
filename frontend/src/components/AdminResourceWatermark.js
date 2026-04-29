import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  LeftOutlined,
  MailOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SaveOutlined,
  TeamOutlined,
  UndoOutlined
} from '@ant-design/icons';
import api from '../api/axiosConfig';
import config from '../config';

const { Text } = Typography;

const BACKEND_URL = config.apiBaseUrl;
const API = `${BACKEND_URL}/api`;
const FONT_OPTIONS = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];
const STYLE_OPTIONS = ['normal', 'bold', 'italic', 'bold italic'];
const DEFAULT_EMAIL_SUBJECT = 'Your Customized Watermarked Resources Are Ready for {{school_name}} 📚✨';
const DEFAULT_EMAIL_MESSAGE = `Dear {{school_name}},

Greetings from Wonder Learning India,

Please find attached the ZIP file containing your customized watermarked learning resources for your review and use.

We hope these materials add value to your learning initiatives and support your educational goals effectively.

Should you require any modifications, additional customization, or assistance, please feel free to reply to this email—we would be happy to help.

Thank you for choosing Wonder Learning India. We appreciate the opportunity to support your institution.

Warm Regards,
Wonder Learning India
📧 Support Team
🌐 Empowering Better Learning`;

const getStaticFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cleanPath.startsWith('uploads/')) {
    return `${BACKEND_URL}/${cleanPath}`;
  }
  return `${BACKEND_URL}/uploads/${cleanPath}`;
};

const isPdfResource = (resource) => {
  const fileType = (resource?.file_type || '').toLowerCase();
  const filePath = (resource?.file_path || '').toLowerCase();
  return fileType.includes('pdf') || filePath.endsWith('.pdf');
};

const isRasterImageResource = (resource) => {
  const fileType = (resource?.file_type || '').toLowerCase();
  const filePath = (resource?.file_path || '').toLowerCase();

  if (filePath.endsWith('.svg')) return false;
  if (/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/.test(filePath)) return true;
  return fileType.includes('image') && !filePath.endsWith('.svg');
};

const isSupportedBatchResource = (resource) => {
  if (!resource) return false;
  if ((resource.category || '').toLowerCase() === 'multimedia') return false;
  if (resource.is_video_link) return false;

  const fileType = (resource.file_type || '').toLowerCase();
  if (fileType.includes('video') || fileType.includes('audio')) return false;

  return isPdfResource(resource) || isRasterImageResource(resource);
};

const getBatchResourceKind = (resource) => {
  if (isPdfResource(resource)) return 'pdf';
  if (isRasterImageResource(resource)) return 'image';
  return null;
};

const createDefaultTemplate = () => ({
  showLogo: true,
  logoPosition: {
    x: 50,
    y: 10,
    width: 20,
    opacity: 0.7,
    rotation: 0
  },
  textPosition: {
    name_x: 50,
    name_y: 25,
    name_size: 20,
    name_opacity: 0.8,
    name_rotation: 0,
    contact_x: 50,
    contact_y: 90,
    contact_size: 12,
    contact_opacity: 0.7,
    contact_rotation: 0,
    address_x: 50,
    address_y: 85,
    address_size: 10,
    address_opacity: 1.0,
    address_rotation: 0,
    name_font: 'Arial',
    name_style: 'normal',
    name_color: '#000000',
    contact_font: 'Arial',
    contact_style: 'normal',
    contact_color: '#000000',
    address_font: 'Arial',
    address_style: 'normal',
    address_color: '#000000'
  },
  textElements: {
    showName: true,
    showContact: true,
    showAddress: false
  },
  address: ''
});

const cloneTemplate = (template) => JSON.parse(JSON.stringify(template));

const serializeTemplate = (template) => ({
  show_logo: template.showLogo,
  logo_x: Math.round(template.logoPosition.x),
  logo_y: Math.round(template.logoPosition.y),
  logo_width: Math.round(template.logoPosition.width),
  logo_opacity: Number(template.logoPosition.opacity.toFixed(2)),
  logo_rotation: Math.round(template.logoPosition.rotation || 0),
  name_x: Math.round(template.textPosition.name_x),
  name_y: Math.round(template.textPosition.name_y),
  name_size: template.textPosition.name_size,
  name_opacity: Number(template.textPosition.name_opacity.toFixed(2)),
  name_rotation: Math.round(template.textPosition.name_rotation || 0),
  name_font: template.textPosition.name_font,
  name_style: template.textPosition.name_style,
  name_color: template.textPosition.name_color,
  show_name: template.textElements.showName,
  contact_x: Math.round(template.textPosition.contact_x),
  contact_y: Math.round(template.textPosition.contact_y),
  contact_size: template.textPosition.contact_size,
  contact_opacity: Number(template.textPosition.contact_opacity.toFixed(2)),
  contact_rotation: Math.round(template.textPosition.contact_rotation || 0),
  contact_font: template.textPosition.contact_font,
  contact_style: template.textPosition.contact_style,
  contact_color: template.textPosition.contact_color,
  show_contact: template.textElements.showContact,
  address_x: Math.round(template.textPosition.address_x),
  address_y: Math.round(template.textPosition.address_y),
  address_size: template.textPosition.address_size,
  address_opacity: Number(template.textPosition.address_opacity.toFixed(2)),
  address_rotation: Math.round(template.textPosition.address_rotation || 0),
  address_font: template.textPosition.address_font,
  address_style: template.textPosition.address_style,
  address_color: template.textPosition.address_color,
  show_address: template.textElements.showAddress,
  address: template.address
});

const deserializeTemplate = (template) => ({
  showLogo: template?.show_logo !== false,
  logoPosition: {
    x: template?.logo_x ?? 50,
    y: template?.logo_y ?? 10,
    width: template?.logo_width ?? 20,
    opacity: template?.logo_opacity ?? 0.7,
    rotation: template?.logo_rotation ?? 0
  },
  textPosition: {
    name_x: template?.name_x ?? 50,
    name_y: template?.name_y ?? 25,
    name_size: template?.name_size ?? 20,
    name_opacity: template?.name_opacity ?? 0.8,
    name_rotation: template?.name_rotation ?? 0,
    contact_x: template?.contact_x ?? 50,
    contact_y: template?.contact_y ?? 90,
    contact_size: template?.contact_size ?? 12,
    contact_opacity: template?.contact_opacity ?? 0.7,
    contact_rotation: template?.contact_rotation ?? 0,
    address_x: template?.address_x ?? 50,
    address_y: template?.address_y ?? 85,
    address_size: template?.address_size ?? 10,
    address_opacity: template?.address_opacity ?? 1.0,
    address_rotation: template?.address_rotation ?? 0,
    name_font: template?.name_font || 'Arial',
    name_style: template?.name_style || 'normal',
    name_color: template?.name_color || '#000000',
    contact_font: template?.contact_font || 'Arial',
    contact_style: template?.contact_style || 'normal',
    contact_color: template?.contact_color || '#000000',
    address_font: template?.address_font || 'Arial',
    address_style: template?.address_style || 'normal',
    address_color: template?.address_color || '#000000'
  },
  textElements: {
    showName: template?.show_name !== false,
    showContact: template?.show_contact !== false,
    showAddress: template?.show_address || false
  },
  address: template?.address || ''
});

const clampNumber = (value, min, max, fallback) => {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return fallback;
  return Math.max(min, Math.min(max, nextValue));
};

const replaceEmailPlaceholders = (templateText, school, folder) => (
  (templateText || '')
    .replaceAll('{{school_name}}', school?.school_name || '')
    .replaceAll('{{school_id}}', school?.school_id || '')
    .replaceAll('{{folder_name}}', folder?.folder_name || '')
);

const TextOverlay = ({
  school,
  template,
  isEditingText,
  containerRef,
  onStartTextDrag
}) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef?.current) return undefined;

    const updateScale = () => {
      const width = containerRef.current.getBoundingClientRect().width || 800;
      setScale(width / 800);
    };

    updateScale();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [containerRef]);

  if (!school) return null;

  const { textPosition, textElements, address } = template;
  const contactLines = [];
  if (school.email) contactLines.push(`Email: ${school.email}`);
  if (school.contact_number) contactLines.push(`Phone: ${school.contact_number}`);
  const contactText = contactLines.join('\n');

  const getFontStyles = (styleValue) => {
    const normalized = (styleValue || '').toLowerCase();
    return {
      fontStyle: normalized.includes('italic') ? 'italic' : 'normal',
      fontWeight: normalized.includes('bold') ? 700 : 400
    };
  };

  const sharedStyle = {
    position: 'absolute',
    transformOrigin: 'center',
    pointerEvents: isEditingText ? 'auto' : 'none',
    zIndex: 5,
    cursor: isEditingText ? 'move' : 'default',
    textAlign: 'center',
    backgroundColor: isEditingText ? 'rgba(255, 255, 200, 0.85)' : 'transparent',
    padding: isEditingText ? '4px 8px' : '0',
    borderRadius: '4px',
    border: isEditingText ? '2px dashed #1890ff' : 'none',
    userSelect: 'none',
    whiteSpace: 'pre-wrap',
    textShadow: '1px 1px 2px rgba(255,255,255,0.85)'
  };

  const nameStyle = {
    ...sharedStyle,
    left: `${textPosition.name_x}%`,
    top: `${textPosition.name_y}%`,
    transform: `translate(-50%, -50%) rotate(${textPosition.name_rotation}deg)`,
    fontSize: `${Math.max(6, Math.round(textPosition.name_size * scale))}px`,
    color: textPosition.name_color,
    opacity: textPosition.name_opacity,
    fontFamily: textPosition.name_font,
    ...getFontStyles(textPosition.name_style)
  };

  const contactStyle = {
    ...sharedStyle,
    left: `${textPosition.contact_x}%`,
    top: `${textPosition.contact_y}%`,
    transform: `translate(-50%, -50%) rotate(${textPosition.contact_rotation}deg)`,
    fontSize: `${Math.max(6, Math.round(textPosition.contact_size * scale))}px`,
    color: textPosition.contact_color,
    opacity: textPosition.contact_opacity,
    fontFamily: textPosition.contact_font,
    ...getFontStyles(textPosition.contact_style)
  };

  const addressStyle = {
    ...sharedStyle,
    left: `${textPosition.address_x}%`,
    top: `${textPosition.address_y}%`,
    transform: `translate(-50%, -50%) rotate(${textPosition.address_rotation}deg)`,
    fontSize: `${Math.max(6, Math.round(textPosition.address_size * scale))}px`,
    color: textPosition.address_color,
    opacity: textPosition.address_opacity,
    fontFamily: textPosition.address_font,
    ...getFontStyles(textPosition.address_style),
    maxWidth: '80%'
  };

  return (
    <>
      {textElements.showName && school.school_name && (
        <div
          style={nameStyle}
          onMouseDown={(event) => onStartTextDrag(event, 'name', containerRef?.current)}
        >
          {school.school_name}
        </div>
      )}
      {textElements.showContact && contactText && (
        <div
          style={contactStyle}
          onMouseDown={(event) => onStartTextDrag(event, 'contact', containerRef?.current)}
        >
          {contactText}
        </div>
      )}
      {textElements.showAddress && address && (
        <div
          style={addressStyle}
          onMouseDown={(event) => onStartTextDrag(event, 'address', containerRef?.current)}
        >
          {address}
        </div>
      )}
    </>
  );
};

const LogoOverlay = ({
  logoUrl,
  template,
  isEditingLogo,
  containerRef,
  onStartLogoDrag
}) => {
  if (!logoUrl || !template.showLogo) return null;

  const { logoPosition } = template;
  const style = {
    position: 'absolute',
    left: `${logoPosition.x}%`,
    top: `${logoPosition.y}%`,
    width: `${logoPosition.width}%`,
    opacity: logoPosition.opacity,
    transform: `translate(-50%, -50%) rotate(${logoPosition.rotation}deg)`,
    transformOrigin: 'center',
    zIndex: 4,
    cursor: isEditingLogo ? 'move' : 'default',
    pointerEvents: isEditingLogo ? 'auto' : 'none',
    border: isEditingLogo ? '2px dashed #1890ff' : 'none',
    borderRadius: '4px',
    backgroundColor: isEditingLogo ? 'rgba(255,255,255,0.4)' : 'transparent'
  };

  return (
    <img
      src={logoUrl}
      alt="School logo watermark"
      style={style}
      onMouseDown={(event) => onStartLogoDrag(event, containerRef?.current)}
    />
  );
};

const NumericInputRow = ({ label, value, min, max, step = 1, onDecrease, onIncrease, onChange, suffix = '' }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text strong>{label}</Text>
      <Text type="secondary">{`${Math.round(Number(value) * (suffix === '%' ? 1 : 1))}${suffix}`}</Text>
    </div>
    <Space.Compact style={{ width: '100%' }}>
      <Button icon={<MinusOutlined />} onClick={onDecrease} />
      <Input
        value={value}
        type="number"
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
      <Button icon={<PlusOutlined />} onClick={onIncrease} />
    </Space.Compact>
  </div>
);

const TextElementControls = ({
  title,
  visible,
  onVisibleChange,
  position,
  positionKey,
  sizeKey,
  opacityKey,
  rotationKey,
  fontKey,
  styleKey,
  colorKey,
  minSize,
  maxSize,
  onUpdateTextPosition,
  onReset
}) => (
  <Card
    size="small"
    title={title}
    extra={
      <Checkbox checked={visible} onChange={(event) => onVisibleChange(event.target.checked)}>
        Show
      </Checkbox>
    }
    style={{ marginBottom: 12 }}
  >
    <NumericInputRow
      label="Rotation"
      value={position[rotationKey]}
      min={0}
      max={359}
      onDecrease={() => onUpdateTextPosition(rotationKey, position[rotationKey] - 15, 0, 359)}
      onIncrease={() => onUpdateTextPosition(rotationKey, position[rotationKey] + 15, 0, 359)}
      onChange={(event) => onUpdateTextPosition(rotationKey, event.target.value, 0, 359)}
      suffix="deg"
    />
    <NumericInputRow
      label="Size"
      value={position[sizeKey]}
      min={minSize}
      max={maxSize}
      onDecrease={() => onUpdateTextPosition(sizeKey, position[sizeKey] - 1, minSize, maxSize)}
      onIncrease={() => onUpdateTextPosition(sizeKey, position[sizeKey] + 1, minSize, maxSize)}
      onChange={(event) => onUpdateTextPosition(sizeKey, event.target.value, minSize, maxSize)}
      suffix="px"
    />
    <NumericInputRow
      label="Opacity"
      value={Math.round(position[opacityKey] * 100)}
      min={10}
      max={100}
      onDecrease={() => onUpdateTextPosition(opacityKey, position[opacityKey] - 0.1, 0.1, 1.0, true)}
      onIncrease={() => onUpdateTextPosition(opacityKey, position[opacityKey] + 0.1, 0.1, 1.0, true)}
      onChange={(event) => onUpdateTextPosition(opacityKey, Number(event.target.value) / 100, 0.1, 1.0, true)}
      suffix="%"
    />
    <div style={{ marginBottom: 12 }}>
      <Text strong>Font</Text>
      <Select
        style={{ width: '100%', marginTop: 6 }}
        value={position[fontKey]}
        onChange={(value) => onUpdateTextPosition(fontKey, value)}
        options={FONT_OPTIONS.map((font) => ({ value: font, label: font }))}
      />
    </div>
    <div style={{ marginBottom: 12 }}>
      <Text strong>Style</Text>
      <Select
        style={{ width: '100%', marginTop: 6 }}
        value={position[styleKey]}
        onChange={(value) => onUpdateTextPosition(styleKey, value)}
        options={STYLE_OPTIONS.map((style) => ({ value: style, label: style }))}
      />
    </div>
    <div style={{ marginBottom: 12 }}>
      <Text strong>Color</Text>
      <Input
        style={{ width: '100%', marginTop: 6 }}
        type="color"
        value={position[colorKey]}
        onChange={(event) => onUpdateTextPosition(colorKey, event.target.value)}
      />
    </div>
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
      <Tag color="blue">{`Drag on preview to move`}</Tag>
      <Button size="small" icon={<UndoOutlined />} onClick={onReset}>
        Reset
      </Button>
    </Space>
    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
      <Text type="secondary">{`X: ${Math.round(position[positionKey.x])}%`}</Text>
      <Text type="secondary">{`Y: ${Math.round(position[positionKey.y])}%`}</Text>
    </div>
  </Card>
);

const AdminResourceWatermark = () => {
  const [schools, setSchools] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [activeResourceId, setActiveResourceId] = useState(null);
  const [previewSchoolId, setPreviewSchoolId] = useState(null);
  const [templatesByResource, setTemplatesByResource] = useState({});
  const [templateLoading, setTemplateLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [bulkApplyLoadingType, setBulkApplyLoadingType] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [generatedJob, setGeneratedJob] = useState(null);
  const [selectedGeneratedSchoolIds, setSelectedGeneratedSchoolIds] = useState([]);
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailMessageTemplate, setEmailMessageTemplate] = useState(DEFAULT_EMAIL_MESSAGE);
  const [emailDrafts, setEmailDrafts] = useState([]);
  const [selectedEmailDraftIds, setSelectedEmailDraftIds] = useState([]);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [draftSubjectInput, setDraftSubjectInput] = useState('');
  const [draftMessageInput, setDraftMessageInput] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfPagesLoading, setPdfPagesLoading] = useState(false);
  const [pdfPages, setPdfPages] = useState([]);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(null);

  const imageContainerRef = useRef(null);
  const pdfPageRefs = useRef([]);
  const dragStateRef = useRef({ container: null, element: null });
  const loadedTemplateIdsRef = useRef(new Set());

  const filteredSchools = useMemo(() => {
    const searchText = schoolSearch.trim().toLowerCase();
    if (!searchText) return schools;

    return schools.filter((school) => (
      school.school_id?.toLowerCase().includes(searchText) ||
      school.school_name?.toLowerCase().includes(searchText) ||
      school.email?.toLowerCase().includes(searchText) ||
      (school.contact_number || '').toLowerCase().includes(searchText)
    ));
  }, [schools, schoolSearch]);

  const eligibleResources = useMemo(() => (
    resources.filter((resource) => isSupportedBatchResource(resource))
  ), [resources]);

  const filteredResources = useMemo(() => {
    const searchText = resourceSearch.trim().toLowerCase();
    if (!searchText) return eligibleResources;

    return eligibleResources.filter((resource) => (
      resource.name?.toLowerCase().includes(searchText) ||
      resource.category?.toLowerCase().includes(searchText) ||
      resource.sub_category?.toLowerCase().includes(searchText) ||
      resource.description?.toLowerCase().includes(searchText)
    ));
  }, [eligibleResources, resourceSearch]);

  const selectedSchools = useMemo(() => (
    selectedSchoolIds
      .map((schoolId) => schools.find((school) => school.school_id === schoolId))
      .filter(Boolean)
  ), [schools, selectedSchoolIds]);

  const activeResource = useMemo(() => (
    resources.find((resource) => resource.resource_id === activeResourceId) || null
  ), [resources, activeResourceId]);

  const selectedPdfResourceIds = useMemo(() => (
    selectedResourceIds.filter((resourceId) => {
      const resource = resources.find((item) => item.resource_id === resourceId);
      return getBatchResourceKind(resource) === 'pdf';
    })
  ), [resources, selectedResourceIds]);

  const selectedImageResourceIds = useMemo(() => (
    selectedResourceIds.filter((resourceId) => {
      const resource = resources.find((item) => item.resource_id === resourceId);
      return getBatchResourceKind(resource) === 'image';
    })
  ), [resources, selectedResourceIds]);

  const previewSchool = useMemo(() => (
    schools.find((school) => school.school_id === previewSchoolId) || null
  ), [schools, previewSchoolId]);

  const activeResourceKind = useMemo(() => getBatchResourceKind(activeResource), [activeResource]);

  const currentTemplate = activeResourceId
    ? (templatesByResource[activeResourceId] || createDefaultTemplate())
    : createDefaultTemplate();

  const clearGeneratedState = () => {
    setGeneratedJob(null);
    setSelectedGeneratedSchoolIds([]);
    setEmailDrafts([]);
    setSelectedEmailDraftIds([]);
    setEditingDraft(null);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedSchoolIds.length) {
      setPreviewSchoolId(null);
      return;
    }

    if (!previewSchoolId || !selectedSchoolIds.includes(previewSchoolId)) {
      setPreviewSchoolId(selectedSchoolIds[0]);
    }
  }, [selectedSchoolIds, previewSchoolId]);

  useEffect(() => {
    if (!selectedResourceIds.length) {
      setActiveResourceId(null);
      return;
    }

    if (!activeResourceId || !selectedResourceIds.includes(activeResourceId)) {
      setActiveResourceId(selectedResourceIds[0]);
    }

    setTemplatesByResource((previous) => {
      const nextTemplates = { ...previous };
      let changed = false;

      selectedResourceIds.forEach((resourceId) => {
        if (!nextTemplates[resourceId]) {
          nextTemplates[resourceId] = createDefaultTemplate();
          changed = true;
        }
      });

      return changed ? nextTemplates : previous;
    });
  }, [selectedResourceIds, activeResourceId]);

  useEffect(() => {
    if (!activeResourceId || loadedTemplateIdsRef.current.has(activeResourceId)) return undefined;

    loadedTemplateIdsRef.current.add(activeResourceId);
    let cancelled = false;

    const loadTemplate = async () => {
      try {
        setTemplateLoading(true);
        const response = await api.get(`/admin/batch-watermark/template/${activeResourceId}`);
        if (cancelled) return;

        setTemplatesByResource((previous) => ({
          ...previous,
          [activeResourceId]: deserializeTemplate(response.data?.template)
        }));
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading batch watermark template:', error);
        setTemplatesByResource((previous) => ({
          ...previous,
          [activeResourceId]: previous[activeResourceId] || createDefaultTemplate()
        }));
      } finally {
        if (!cancelled) {
          setTemplateLoading(false);
        }
      }
    };

    loadTemplate();
    return () => {
      cancelled = true;
    };
  }, [activeResourceId]);

  useEffect(() => {
    if (!activeResource) {
      setPdfPages([]);
      setPreviewLoading(false);
      return;
    }

    if (isPdfResource(activeResource)) {
      loadPdfPages(activeResource);
    } else {
      setPdfPages([]);
      setPreviewLoading(true);
    }
  }, [activeResourceId]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (isDraggingLogo && dragStateRef.current.container) {
        handleLogoDrag(event, dragStateRef.current.container);
      } else if (isDraggingText && dragStateRef.current.container) {
        handleTextDrag(event, dragStateRef.current.container, dragStateRef.current.element);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLogo || isDraggingText) {
        setIsDraggingLogo(false);
        setIsDraggingText(null);
        dragStateRef.current = { container: null, element: null };
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLogo, isDraggingText, activeResourceId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [schoolsResponse, resourcesResponse] = await Promise.all([
        api.get('/admin/schools'),
        api.get('/admin/resources')
      ]);

      setSchools(schoolsResponse.data || []);
      setResources(
        [...(resourcesResponse.data || [])].sort((left, right) => (
          (left.name || '').localeCompare(right.name || '')
        ))
      );
    } catch (error) {
      console.error('Error loading batch watermark data:', error);
      message.error('Failed to load schools and resources');
    } finally {
      setLoading(false);
    }
  };

  const updateActiveTemplate = (updater) => {
    if (!activeResourceId) return;

    setTemplatesByResource((previous) => {
      const current = previous[activeResourceId] ? cloneTemplate(previous[activeResourceId]) : createDefaultTemplate();
      const next = updater(current);
      return {
        ...previous,
        [activeResourceId]: next
      };
    });

    clearGeneratedState();
  };

  const handleLogoDrag = (event, container) => {
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    updateActiveTemplate((template) => ({
      ...template,
      logoPosition: {
        ...template.logoPosition,
        x: clampNumber(x, 0, 100, template.logoPosition.x),
        y: clampNumber(y, 0, 100, template.logoPosition.y)
      }
    }));
  };

  const handleTextDrag = (event, container, elementType) => {
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    updateActiveTemplate((template) => ({
      ...template,
      textPosition: {
        ...template.textPosition,
        [`${elementType}_x`]: clampNumber(x, 0, 100, template.textPosition[`${elementType}_x`]),
        [`${elementType}_y`]: clampNumber(y, 0, 100, template.textPosition[`${elementType}_y`])
      }
    }));
  };

  const startLogoDrag = (event, container) => {
    if (!isEditingLogo || !container) return;
    event.preventDefault();
    dragStateRef.current = { container, element: 'logo' };
    setIsDraggingLogo(true);
    setIsDraggingText(null);
  };

  const startTextDrag = (event, elementType, container) => {
    if (!isEditingText || !container) return;
    event.preventDefault();
    dragStateRef.current = { container, element: elementType };
    setIsDraggingText(elementType);
    setIsDraggingLogo(false);
  };

  const updateLogoField = (field, value, min, max, decimal = false) => {
    updateActiveTemplate((template) => ({
      ...template,
      logoPosition: {
        ...template.logoPosition,
        [field]: decimal
          ? Number(clampNumber(value, min, max, template.logoPosition[field]).toFixed(2))
          : Math.round(clampNumber(value, min, max, template.logoPosition[field]))
      }
    }));
  };

  const updateTextPositionField = (field, value, min = null, max = null, decimal = false) => {
    updateActiveTemplate((template) => {
      let nextValue = value;
      if (min !== null && max !== null) {
        nextValue = decimal
          ? Number(clampNumber(value, min, max, template.textPosition[field]).toFixed(2))
          : Math.round(clampNumber(value, min, max, template.textPosition[field]));
      }

      return {
        ...template,
        textPosition: {
          ...template.textPosition,
          [field]: nextValue
        }
      };
    });
  };

  const resetLogo = () => {
    updateActiveTemplate((template) => ({
      ...template,
      showLogo: true,
      logoPosition: createDefaultTemplate().logoPosition
    }));
  };

  const resetTextElement = (elementType) => {
    const defaults = createDefaultTemplate();

    updateActiveTemplate((template) => ({
      ...template,
      textPosition: {
        ...template.textPosition,
        [`${elementType}_x`]: defaults.textPosition[`${elementType}_x`],
        [`${elementType}_y`]: defaults.textPosition[`${elementType}_y`],
        [`${elementType}_size`]: defaults.textPosition[`${elementType}_size`],
        [`${elementType}_opacity`]: defaults.textPosition[`${elementType}_opacity`],
        [`${elementType}_rotation`]: defaults.textPosition[`${elementType}_rotation`],
        [`${elementType}_font`]: defaults.textPosition[`${elementType}_font`],
        [`${elementType}_style`]: defaults.textPosition[`${elementType}_style`],
        [`${elementType}_color`]: defaults.textPosition[`${elementType}_color`]
      }
    }));
  };

  const handleSaveTemplate = async () => {
    if (!activeResourceId) {
      message.warning('Select a resource preview first');
      return;
    }

    try {
      setSavingTemplate(true);
      const response = await api.post('/admin/batch-watermark/template', {
        resource_id: activeResourceId,
        template: serializeTemplate(currentTemplate)
      });

      setTemplatesByResource((previous) => ({
        ...previous,
        [activeResourceId]: deserializeTemplate(response.data?.template)
      }));
      message.success('Watermark layout saved for this resource');
    } catch (error) {
      console.error('Error saving batch watermark template:', error);
      message.error(error.response?.data?.detail || 'Failed to save watermark layout');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleApplyTemplateToGroup = async (resourceType) => {
    if (!activeResourceId || !activeResource) {
      message.warning('Select a resource preview first');
      return;
    }

    if (activeResourceKind !== resourceType) {
      message.warning(`Open a ${resourceType.toUpperCase()} resource preview before applying its layout to all ${resourceType.toUpperCase()} files`);
      return;
    }

    const targetResourceIds = resourceType === 'pdf' ? selectedPdfResourceIds : selectedImageResourceIds;
    if (!targetResourceIds.length) {
      message.warning(`No ${resourceType.toUpperCase()} resources are selected`);
      return;
    }

    try {
      setBulkApplyLoadingType(resourceType);
      const serializedTemplate = serializeTemplate(currentTemplate);
      const response = await api.post('/admin/batch-watermark/template/apply-group', {
        source_resource_id: activeResourceId,
        target_resource_ids: targetResourceIds,
        template: serializedTemplate
      });

      const nextTemplate = deserializeTemplate(response.data?.template || serializedTemplate);
      const appliedResourceIds = response.data?.applied_resource_ids || targetResourceIds;

      setTemplatesByResource((previous) => {
        const nextState = { ...previous };
        appliedResourceIds.forEach((resourceId) => {
          nextState[resourceId] = cloneTemplate(nextTemplate);
        });
        return nextState;
      });

      clearGeneratedState();
      message.success(response.data?.message || `Layout applied to all selected ${resourceType.toUpperCase()} resources`);
    } catch (error) {
      console.error(`Error applying layout to ${resourceType} resources:`, error);
      message.error(error.response?.data?.detail || `Failed to apply layout to selected ${resourceType.toUpperCase()} resources`);
    } finally {
      setBulkApplyLoadingType(null);
    }
  };

  const handleGenerateFolders = async () => {
    if (!selectedSchoolIds.length) {
      message.warning('Select at least one school');
      return;
    }
    if (!selectedResourceIds.length) {
      message.warning('Select at least one resource');
      return;
    }

    try {
      setGenerating(true);

      const templatePayload = selectedResourceIds.reduce((accumulator, resourceId) => {
        accumulator[resourceId] = serializeTemplate(templatesByResource[resourceId] || createDefaultTemplate());
        return accumulator;
      }, {});

      const response = await api.post('/admin/batch-watermark/generate', {
        school_ids: selectedSchoolIds,
        resource_ids: selectedResourceIds,
        templates: templatePayload
      });

      setGeneratedJob(response.data);
      setSelectedGeneratedSchoolIds((response.data?.folders || []).map((folder) => folder.school_id));
      setEmailDrafts([]);
      setSelectedEmailDraftIds([]);
      setEditingDraft(null);
      message.success('Customized school folders generated successfully');
    } catch (error) {
      console.error('Error generating folders:', error);
      message.error(error.response?.data?.detail || 'Failed to generate school folders');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!generatedJob?.job_id) {
      message.warning('Generate school folders first');
      return;
    }
    if (!selectedGeneratedSchoolIds.length) {
      message.warning('Select at least one generated folder');
      return;
    }

    try {
      setDownloadingZip(true);
      const response = await api.post(
        '/admin/batch-watermark/download',
        {
          job_id: generatedJob.job_id,
          school_ids: selectedGeneratedSchoolIds
        },
        {
          responseType: 'blob'
        }
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'batch_watermark.zip';

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (fileNameMatch?.[1]) {
          filename = fileNameMatch[1];
        }
      }

      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      message.success('ZIP download started');
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      message.error(error.response?.data?.detail || 'Failed to download ZIP');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleGenerateEmailDrafts = () => {
    if (!generatedJob?.folders?.length) {
      message.warning('Generate school folders first');
      return;
    }

    const targetSchoolIds = selectedGeneratedSchoolIds.length
      ? selectedGeneratedSchoolIds
      : generatedJob.folders.map((folder) => folder.school_id);

    const drafts = targetSchoolIds
      .map((schoolId) => {
        const folder = generatedJob.folders.find((item) => item.school_id === schoolId);
        const school = schools.find((item) => item.school_id === schoolId);
        if (!folder || !school) return null;

        const hasEmail = Boolean(school.email);
        return {
          school_id: school.school_id,
          school_name: school.school_name,
          email: school.email || '',
          folder_name: folder.folder_name,
          attachment_name: `${folder.folder_name}.zip`,
          subject: replaceEmailPlaceholders(emailSubjectTemplate, school, folder),
          message: replaceEmailPlaceholders(emailMessageTemplate, school, folder),
          status: hasEmail ? 'draft' : 'missing_email',
          statusMessage: hasEmail ? 'Ready to send' : 'School email is missing'
        };
      })
      .filter(Boolean);

    setEmailDrafts(drafts);
    setSelectedEmailDraftIds(
      drafts
        .filter((draft) => draft.status !== 'missing_email')
        .map((draft) => draft.school_id)
    );
    message.success(`${drafts.length} school email drafts generated`);
  };

  const openDraftEditor = (draft) => {
    setEditingDraft(draft);
    setDraftSubjectInput(draft.subject);
    setDraftMessageInput(draft.message);
  };

  const handleSaveDraftEdit = () => {
    if (!editingDraft) return;

    if (!draftSubjectInput.trim()) {
      message.warning('Email subject is required');
      return;
    }

    if (!draftMessageInput.trim()) {
      message.warning('Email message is required');
      return;
    }

    setEmailDrafts((previous) => previous.map((draft) => (
      draft.school_id === editingDraft.school_id
        ? {
            ...draft,
            subject: draftSubjectInput,
            message: draftMessageInput
          }
        : draft
    )));

    setEditingDraft(null);
    message.success('Email draft updated');
  };

  const handleSendEmailDrafts = async (targetSchoolIds = selectedEmailDraftIds) => {
    if (!generatedJob?.job_id) {
      message.warning('Generate school folders first');
      return;
    }

    const draftsToSend = emailDrafts.filter((draft) => (
      targetSchoolIds.includes(draft.school_id) &&
      draft.status !== 'missing_email'
    ));

    if (!draftsToSend.length) {
      message.warning('Select at least one valid email draft');
      return;
    }

    try {
      setSendingEmails(true);
      setEmailDrafts((previous) => previous.map((draft) => (
        targetSchoolIds.includes(draft.school_id)
          ? { ...draft, status: 'sending', statusMessage: 'Sending email...' }
          : draft
      )));

      const response = await api.post('/admin/batch-watermark/send-emails', {
        job_id: generatedJob.job_id,
        emails: draftsToSend.map((draft) => ({
          school_id: draft.school_id,
          subject: draft.subject,
          message: draft.message
        }))
      });

      const resultMap = new Map((response.data?.results || []).map((result) => [result.school_id, result]));
      setEmailDrafts((previous) => previous.map((draft) => {
        const result = resultMap.get(draft.school_id);
        if (!result) return draft;

        return {
          ...draft,
          status: result.status,
          statusMessage: result.message
        };
      }));

      message.success(response.data?.message || 'Email automation completed');
    } catch (error) {
      console.error('Error sending batch watermark emails:', error);
      setEmailDrafts((previous) => previous.map((draft) => (
        targetSchoolIds.includes(draft.school_id)
          ? { ...draft, status: 'failed', statusMessage: error.response?.data?.detail || 'Failed to send email' }
          : draft
      )));
      message.error(error.response?.data?.detail || 'Failed to send batch emails');
    } finally {
      setSendingEmails(false);
    }
  };

  const loadPdfPages = async (resource) => {
    if (!resource) return;

    setPdfPagesLoading(true);
    setPreviewLoading(true);
    pdfPageRefs.current = [];

    try {
      const response = await api.get(`/resources/${resource.resource_id}/pdf-metadata`);
      const pageCount = response.data?.page_count || 1;
      const pages = Array.from({ length: pageCount }, (_, index) => ({
        pageNumber: index + 1,
        url: `${API}/resources/${resource.resource_id}/pdf-page/${index + 1}?width=800`
      }));
      setPdfPages(pages);
    } catch (error) {
      console.error('Error loading PDF preview:', error);
      message.error('Failed to load PDF preview');
      setPdfPages([]);
      setPreviewLoading(false);
    } finally {
      setPdfPagesLoading(false);
    }
  };

  const getPdfPageRef = (index) => {
    if (!pdfPageRefs.current[index]) {
      pdfPageRefs.current[index] = React.createRef();
    }
    return pdfPageRefs.current[index];
  };

  const handleSelectAllSchools = () => {
    setSelectedSchoolIds(schools.map((school) => school.school_id));
    clearGeneratedState();
  };

  const handleClearSchools = () => {
    setSelectedSchoolIds([]);
    clearGeneratedState();
  };

  const handleSelectAllResources = () => {
    setSelectedResourceIds(eligibleResources.map((resource) => resource.resource_id));
    clearGeneratedState();
  };

  const handleClearResources = () => {
    setSelectedResourceIds([]);
    clearGeneratedState();
  };

  const goToPreviousResource = () => {
    if (!selectedResourceIds.length || !activeResourceId) return;
    const currentIndex = selectedResourceIds.indexOf(activeResourceId);
    const nextIndex = currentIndex <= 0 ? selectedResourceIds.length - 1 : currentIndex - 1;
    setActiveResourceId(selectedResourceIds[nextIndex]);
  };

  const goToNextResource = () => {
    if (!selectedResourceIds.length || !activeResourceId) return;
    const currentIndex = selectedResourceIds.indexOf(activeResourceId);
    const nextIndex = currentIndex === selectedResourceIds.length - 1 ? 0 : currentIndex + 1;
    setActiveResourceId(selectedResourceIds[nextIndex]);
  };

  const renderPreview = () => {
    if (!activeResource) {
      return <Empty description="Select resources to start previewing watermark layouts" />;
    }

    if (!previewSchool) {
      return <Empty description="Select a school to preview its logo and text watermark" />;
    }

    const previewLogoUrl = getStaticFileUrl(previewSchool.logo_path);
    const previewUrl = `${API}/resources/${activeResource.resource_id}/preview`;

    if (isRasterImageResource(activeResource)) {
      return (
        <div
          ref={imageContainerRef}
          style={{
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            overflow: 'hidden'
          }}
        >
          <img
            src={previewUrl}
            alt={activeResource.name}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '72vh',
              objectFit: 'contain'
            }}
            onLoad={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              message.error('Failed to load resource preview');
            }}
          />
          <LogoOverlay
            logoUrl={previewLogoUrl}
            template={currentTemplate}
            isEditingLogo={isEditingLogo}
            containerRef={imageContainerRef}
            onStartLogoDrag={startLogoDrag}
          />
          <TextOverlay
            school={previewSchool}
            template={currentTemplate}
            isEditingText={isEditingText}
            containerRef={imageContainerRef}
            onStartTextDrag={startTextDrag}
          />
        </div>
      );
    }

    if (isPdfResource(activeResource)) {
      return (
        <div
          style={{
            width: '100%',
            maxHeight: '72vh',
            overflow: 'auto',
            background: '#f5f5f5',
            borderRadius: 8,
            padding: 16
          }}
        >
          {pdfPagesLoading && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Spin />
              <div style={{ marginTop: 12 }}>Loading PDF pages...</div>
            </div>
          )}

          {!pdfPagesLoading && !pdfPages.length && (
            <Empty description="Unable to load PDF preview" />
          )}

          {pdfPages.map((page, index) => {
            const pageRef = getPdfPageRef(index);
            return (
              <div
                key={page.pageNumber}
                ref={pageRef}
                style={{
                  position: 'relative',
                  width: 'fit-content',
                  margin: '0 auto 16px'
                }}
              >
                <img
                  src={page.url}
                  alt={`Page ${page.pageNumber}`}
                  style={{
                    display: 'block',
                    width: 800,
                    maxWidth: '100%',
                    height: 'auto',
                    backgroundColor: '#fff',
                    borderRadius: 6,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                  }}
                  onLoad={() => {
                    if (index === 0) {
                      setPreviewLoading(false);
                    }
                  }}
                  onError={() => {
                    if (index === 0) {
                      setPreviewLoading(false);
                    }
                    message.error('Failed to load PDF page preview');
                  }}
                />
                <LogoOverlay
                  logoUrl={previewLogoUrl}
                  template={currentTemplate}
                  isEditingLogo={isEditingLogo}
                  containerRef={pageRef}
                  onStartLogoDrag={startLogoDrag}
                />
                <TextOverlay
                  school={previewSchool}
                  template={currentTemplate}
                  isEditingText={isEditingText}
                  containerRef={pageRef}
                  onStartTextDrag={startTextDrag}
                />
              </div>
            );
          })}
        </div>
      );
    }

    return <Empty description="Only PDF and image resources can be previewed here" />;
  };

  const schoolColumns = [
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name',
      render: (value, record) => (
        <Space>
          <TeamOutlined />
          <div>
            <div>{value}</div>
            <Text type="secondary">{`#${record.school_id}`}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Contact',
      dataIndex: 'contact_number',
      key: 'contact_number',
      render: (value) => value || '-'
    }
  ];

  const resourceColumns = [
    {
      title: 'Resource',
      dataIndex: 'name',
      key: 'name',
      render: (value, record) => (
        <Space>
          {isPdfResource(record) ? <FilePdfOutlined style={{ color: '#ff4d4f' }} /> : <FileImageOutlined style={{ color: '#1677ff' }} />}
          <div>
            <div>{value}</div>
            {record.sub_category && (
              <Text type="secondary">{record.sub_category}</Text>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (value) => <Tag color="blue">{value}</Tag>
    },
    {
      title: 'Type',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (_, record) => (
        <Tag color={isPdfResource(record) ? 'red' : 'green'}>
          {isPdfResource(record) ? 'PDF' : 'Image'}
        </Tag>
      )
    }
  ];

  const folderColumns = [
    {
      title: 'School Folder',
      dataIndex: 'folder_name',
      key: 'folder_name',
      render: (value, record) => (
        <div>
          <div>{value}</div>
          <Text type="secondary">{record.school_name}</Text>
        </div>
      )
    },
    {
      title: 'Files',
      dataIndex: 'file_count',
      key: 'file_count',
      render: (value) => <Tag color="green">{`${value} files`}</Tag>
    }
  ];

  const getEmailStatusTag = (status) => {
    const statusMap = {
      draft: { color: 'blue', label: 'Draft Ready' },
      sending: { color: 'gold', label: 'Sending' },
      sent: { color: 'green', label: 'Sent' },
      failed: { color: 'red', label: 'Failed' },
      missing_email: { color: 'orange', label: 'Missing Email' }
    };

    const currentStatus = statusMap[status] || { color: 'default', label: status || 'Unknown' };
    return <Tag color={currentStatus.color}>{currentStatus.label}</Tag>;
  };

  const emailColumns = [
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name',
      render: (value, record) => (
        <div>
          <div>{value}</div>
          <Text type="secondary">{record.email || 'No email saved'}</Text>
        </div>
      )
    },
    {
      title: 'Attachment',
      dataIndex: 'attachment_name',
      key: 'attachment_name',
      render: (value) => <Tag color="purple">{value}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => (
        <div>
          {getEmailStatusTag(record.status)}
          <div style={{ marginTop: 4 }}>
            <Text type="secondary">{record.statusMessage}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => openDraftEditor(record)}>
            Edit
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<MailOutlined />}
            disabled={!record.email || record.status === 'sending'}
            onClick={() => handleSendEmailDrafts([record.school_id])}
          >
            Send
          </Button>
        </Space>
      )
    }
  ];

  const activeResourceIndex = activeResourceId ? selectedResourceIds.indexOf(activeResourceId) : -1;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Batch Watermark"
        extra={(
          <Button icon={<ReloadOutlined />} onClick={fetchInitialData} loading={loading}>
            Refresh Schools & Resources
          </Button>
        )}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Card title="1. Select Schools" size="small">
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
              <Input
                value={schoolSearch}
                onChange={(event) => setSchoolSearch(event.target.value)}
                placeholder="Search school by id, name, email, or phone"
                style={{ width: 360, maxWidth: '100%' }}
              />
              <Space wrap>
                <Button onClick={handleSelectAllSchools}>Select All Schools</Button>
                <Button onClick={handleClearSchools}>Clear</Button>
                <Tag color={selectedSchoolIds.length ? 'green' : 'default'}>
                  {`${selectedSchoolIds.length} selected`}
                </Tag>
              </Space>
            </Space>

            <Table
              dataSource={filteredSchools}
              columns={schoolColumns}
              rowKey="school_id"
              loading={loading}
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: true }}
              rowSelection={{
                selectedRowKeys: selectedSchoolIds,
                onChange: (keys) => {
                  setSelectedSchoolIds(keys);
                  clearGeneratedState();
                }
              }}
            />
          </Card>

          <Card title="2. Select Resources" size="small">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Only PDF and image resources are shown here."
              description="Multimedia, video, audio, and unsupported file types are hidden to keep bulk generation reliable."
            />

            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
              <Input
                value={resourceSearch}
                onChange={(event) => setResourceSearch(event.target.value)}
                placeholder="Search resource by title, category, or description"
                style={{ width: 360, maxWidth: '100%' }}
              />
              <Space wrap>
                <Button onClick={handleSelectAllResources}>Select All Resources</Button>
                <Button onClick={handleClearResources}>Clear</Button>
                <Tag color={selectedResourceIds.length ? 'green' : 'default'}>
                  {`${selectedResourceIds.length} selected`}
                </Tag>
              </Space>
            </Space>

            <Table
              dataSource={filteredResources}
              columns={resourceColumns}
              rowKey="resource_id"
              loading={loading}
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              rowSelection={{
                selectedRowKeys: selectedResourceIds,
                onChange: (keys) => {
                  setSelectedResourceIds(keys);
                  clearGeneratedState();
                }
              }}
            />
          </Card>

          <Card title="3. Preview Settings & Watermark Customization" size="small">
            {!selectedSchoolIds.length || !selectedResourceIds.length ? (
              <Alert
                type="warning"
                showIcon
                message="Complete the first two steps to start watermark customization."
                description="Select at least one school and one supported resource."
              />
            ) : (
              <Row gutter={[24, 24]}>
                <Col xs={24} xl={15}>
                  <Card
                    size="small"
                    title={activeResource ? activeResource.name : 'Preview'}
                    extra={(
                      <Space wrap>
                        <Select
                          value={previewSchoolId}
                          onChange={setPreviewSchoolId}
                          style={{ minWidth: 240 }}
                          options={selectedSchools.map((school) => ({
                            value: school.school_id,
                            label: school.school_name
                          }))}
                        />
                        <Button icon={<LeftOutlined />} onClick={goToPreviousResource} disabled={selectedResourceIds.length <= 1} />
                        <Text>{`${activeResourceIndex + 1} / ${selectedResourceIds.length}`}</Text>
                        <Button icon={<RightOutlined />} onClick={goToNextResource} disabled={selectedResourceIds.length <= 1} />
                      </Space>
                    )}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <Space wrap>
                        <Tag color="blue">{`Preview School: ${previewSchool?.school_name || '-'}`}</Tag>
                        <Tag color="purple">{`Resources Selected: ${selectedResourceIds.length}`}</Tag>
                        <Tag color="cyan">{`Schools Selected: ${selectedSchoolIds.length}`}</Tag>
                      </Space>
                    </div>

                    <div
                      style={{
                        minHeight: 420,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        background: '#fafafa',
                        borderRadius: 8,
                        padding: 12
                      }}
                    >
                      {(previewLoading || templateLoading) && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(255,255,255,0.65)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            borderRadius: 8
                          }}
                        >
                          <Spin />
                        </div>
                      )}
                      {renderPreview()}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} xl={9}>
                  <Card
                    size="small"
                    title="Editing Controls"
                    extra={(
                      <Space wrap>
                        <Button
                          icon={<EditOutlined />}
                          type={isEditingLogo ? 'primary' : 'default'}
                          onClick={() => setIsEditingLogo((value) => !value)}
                        >
                          {isEditingLogo ? 'Logo Edit On' : 'Edit Logo'}
                        </Button>
                        <Button
                          icon={<EditOutlined />}
                          type={isEditingText ? 'primary' : 'default'}
                          onClick={() => setIsEditingText((value) => !value)}
                        >
                          {isEditingText ? 'Text Edit On' : 'Edit Text'}
                        </Button>
                      </Space>
                    )}
                    style={{ maxHeight: '80vh', overflow: 'auto' }}
                  >
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <Alert
                        type="info"
                        showIcon
                        message="Drag watermark items directly on the preview."
                        description="Coordinates are saved per resource and reused for every selected school during generation."
                      />

                      <Alert
                        type="success"
                        showIcon
                        message="Bulk apply shortcuts"
                        description={`Selected queue: ${selectedPdfResourceIds.length} PDF resource(s) and ${selectedImageResourceIds.length} image resource(s). Open one PDF or one image, adjust it once, then apply that layout to every selected file of the same type.`}
                      />

                      <Card
                        size="small"
                        title="Logo Watermark"
                        extra={(
                          <Checkbox
                            checked={currentTemplate.showLogo}
                            onChange={(event) => updateActiveTemplate((template) => ({
                              ...template,
                              showLogo: event.target.checked
                            }))}
                          >
                            Show
                          </Checkbox>
                        )}
                      >
                        <NumericInputRow
                          label="Rotation"
                          value={currentTemplate.logoPosition.rotation}
                          min={0}
                          max={359}
                          onDecrease={() => updateLogoField('rotation', currentTemplate.logoPosition.rotation - 15, 0, 359)}
                          onIncrease={() => updateLogoField('rotation', currentTemplate.logoPosition.rotation + 15, 0, 359)}
                          onChange={(event) => updateLogoField('rotation', event.target.value, 0, 359)}
                          suffix="deg"
                        />
                        <NumericInputRow
                          label="Size"
                          value={currentTemplate.logoPosition.width}
                          min={5}
                          max={50}
                          onDecrease={() => updateLogoField('width', currentTemplate.logoPosition.width - 2, 5, 50)}
                          onIncrease={() => updateLogoField('width', currentTemplate.logoPosition.width + 2, 5, 50)}
                          onChange={(event) => updateLogoField('width', event.target.value, 5, 50)}
                          suffix="%"
                        />
                        <NumericInputRow
                          label="Opacity"
                          value={Math.round(currentTemplate.logoPosition.opacity * 100)}
                          min={10}
                          max={100}
                          onDecrease={() => updateLogoField('opacity', currentTemplate.logoPosition.opacity - 0.1, 0.1, 1.0, true)}
                          onIncrease={() => updateLogoField('opacity', currentTemplate.logoPosition.opacity + 0.1, 0.1, 1.0, true)}
                          onChange={(event) => updateLogoField('opacity', Number(event.target.value) / 100, 0.1, 1.0, true)}
                          suffix="%"
                        />
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Tag color="blue">Drag on preview to move</Tag>
                          <Button size="small" icon={<UndoOutlined />} onClick={resetLogo}>
                            Reset
                          </Button>
                        </Space>
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">{`X: ${Math.round(currentTemplate.logoPosition.x)}%`}</Text>
                          <Text type="secondary">{`Y: ${Math.round(currentTemplate.logoPosition.y)}%`}</Text>
                        </div>
                      </Card>

                      <TextElementControls
                        title="School Name"
                        visible={currentTemplate.textElements.showName}
                        onVisibleChange={(checked) => updateActiveTemplate((template) => ({
                          ...template,
                          textElements: {
                            ...template.textElements,
                            showName: checked
                          }
                        }))}
                        position={currentTemplate.textPosition}
                        positionKey={{ x: 'name_x', y: 'name_y' }}
                        sizeKey="name_size"
                        opacityKey="name_opacity"
                        rotationKey="name_rotation"
                        fontKey="name_font"
                        styleKey="name_style"
                        colorKey="name_color"
                        minSize={8}
                        maxSize={48}
                        onUpdateTextPosition={updateTextPositionField}
                        onReset={() => resetTextElement('name')}
                      />

                      <TextElementControls
                        title="Contact Details"
                        visible={currentTemplate.textElements.showContact}
                        onVisibleChange={(checked) => updateActiveTemplate((template) => ({
                          ...template,
                          textElements: {
                            ...template.textElements,
                            showContact: checked
                          }
                        }))}
                        position={currentTemplate.textPosition}
                        positionKey={{ x: 'contact_x', y: 'contact_y' }}
                        sizeKey="contact_size"
                        opacityKey="contact_opacity"
                        rotationKey="contact_rotation"
                        fontKey="contact_font"
                        styleKey="contact_style"
                        colorKey="contact_color"
                        minSize={8}
                        maxSize={24}
                        onUpdateTextPosition={updateTextPositionField}
                        onReset={() => resetTextElement('contact')}
                      />

                      <Card
                        size="small"
                        title="Address / Message"
                        extra={(
                          <Checkbox
                            checked={currentTemplate.textElements.showAddress}
                            onChange={(event) => updateActiveTemplate((template) => ({
                              ...template,
                              textElements: {
                                ...template.textElements,
                                showAddress: event.target.checked
                              }
                            }))}
                          >
                            Show
                          </Checkbox>
                        )}
                      >
                        <Input.TextArea
                          rows={3}
                          value={currentTemplate.address}
                          placeholder="Optional address or custom message"
                          onChange={(event) => updateActiveTemplate((template) => ({
                            ...template,
                            address: event.target.value
                          }))}
                          style={{ marginBottom: 12 }}
                        />

                        <TextElementControls
                          title="Address Style"
                          visible={currentTemplate.textElements.showAddress}
                          onVisibleChange={(checked) => updateActiveTemplate((template) => ({
                            ...template,
                            textElements: {
                              ...template.textElements,
                              showAddress: checked
                            }
                          }))}
                          position={currentTemplate.textPosition}
                          positionKey={{ x: 'address_x', y: 'address_y' }}
                          sizeKey="address_size"
                          opacityKey="address_opacity"
                          rotationKey="address_rotation"
                          fontKey="address_font"
                          styleKey="address_style"
                          colorKey="address_color"
                          minSize={6}
                          maxSize={24}
                          onUpdateTextPosition={updateTextPositionField}
                          onReset={() => resetTextElement('address')}
                        />
                      </Card>

                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={handleSaveTemplate}
                          loading={savingTemplate}
                          block
                        >
                          Save Current Resource Layout
                        </Button>
                        <Button
                          icon={<FilePdfOutlined />}
                          onClick={() => handleApplyTemplateToGroup('pdf')}
                          loading={bulkApplyLoadingType === 'pdf'}
                          disabled={activeResourceKind !== 'pdf' || selectedPdfResourceIds.length === 0}
                          block
                        >
                          {selectedPdfResourceIds.length > 0
                            ? `Apply Current PDF Layout to All ${selectedPdfResourceIds.length} Selected PDFs`
                            : 'Apply Current PDF Layout to All Selected PDFs'}
                        </Button>
                        <Button
                          icon={<FileImageOutlined />}
                          onClick={() => handleApplyTemplateToGroup('image')}
                          loading={bulkApplyLoadingType === 'image'}
                          disabled={activeResourceKind !== 'image' || selectedImageResourceIds.length === 0}
                          block
                        >
                          {selectedImageResourceIds.length > 0
                            ? `Apply Current Image Layout to All ${selectedImageResourceIds.length} Selected Images`
                            : 'Apply Current Image Layout to All Selected Images'}
                        </Button>
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          onClick={handleGenerateFolders}
                          loading={generating}
                          block
                        >
                          Generate School Folders
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              </Row>
            )}
          </Card>

          {generatedJob && (
            <Card
              title="Generated School Folders"
              size="small"
              extra={(
                <Space wrap>
                  <Button onClick={() => setSelectedGeneratedSchoolIds((generatedJob.folders || []).map((folder) => folder.school_id))}>
                    Select All Folders
                  </Button>
                  <Button onClick={() => setSelectedGeneratedSchoolIds([])}>
                    Clear
                  </Button>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadZip}
                    loading={downloadingZip}
                  >
                    Download ZIP
                  </Button>
                </Space>
              )}
            >
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                message="Folders created successfully."
                description="Select single, multiple, or all school folders below, then download them as a ZIP while keeping each school folder separate by name."
              />
              <Table
                dataSource={generatedJob.folders || []}
                columns={folderColumns}
                rowKey="school_id"
                size="small"
                pagination={false}
                rowSelection={{
                  selectedRowKeys: selectedGeneratedSchoolIds,
                  onChange: (keys) => setSelectedGeneratedSchoolIds(keys)
                }}
              />

              <Card
                title="Email Automation"
                size="small"
                style={{ marginTop: 16 }}
                extra={(
                  <Space wrap>
                    <Button icon={<MailOutlined />} onClick={handleGenerateEmailDrafts}>
                      Generate Email Drafts
                    </Button>
                    <Button
                      icon={<MailOutlined />}
                      onClick={() => handleSendEmailDrafts(selectedEmailDraftIds)}
                      loading={sendingEmails}
                      disabled={!emailDrafts.length}
                    >
                      Send Selected Emails
                    </Button>
                    <Button
                      type="primary"
                      icon={<MailOutlined />}
                      onClick={() => handleSendEmailDrafts(emailDrafts.map((draft) => draft.school_id))}
                      loading={sendingEmails}
                      disabled={!emailDrafts.length}
                    >
                      Send All Emails
                    </Button>
                  </Space>
                )}
              >
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Each school email is sent separately with only that school's ZIP attachment."
                  description="Use {{school_name}}, {{school_id}}, and {{folder_name}} inside the template. You can edit each generated draft before sending."
                />

                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={10}>
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>Email Subject Template</Text>
                      <Input
                        style={{ marginTop: 6 }}
                        value={emailSubjectTemplate}
                        onChange={(event) => setEmailSubjectTemplate(event.target.value)}
                        placeholder="Email subject template"
                      />
                    </div>
                    <div>
                      <Text strong>Email Message Template</Text>
                      <Input.TextArea
                        style={{ marginTop: 6 }}
                        rows={8}
                        value={emailMessageTemplate}
                        onChange={(event) => setEmailMessageTemplate(event.target.value)}
                        placeholder="Email message template"
                      />
                    </div>
                  </Col>

                  <Col xs={24} lg={14}>
                    {!emailDrafts.length ? (
                      <Empty description="Generate email drafts for the selected school folders" />
                    ) : (
                      <Table
                        dataSource={emailDrafts}
                        columns={emailColumns}
                        rowKey="school_id"
                        size="small"
                        pagination={false}
                        rowSelection={{
                          selectedRowKeys: selectedEmailDraftIds,
                          onChange: (keys) => setSelectedEmailDraftIds(keys)
                        }}
                      />
                    )}
                  </Col>
                </Row>
              </Card>
            </Card>
          )}
        </Space>
      </Card>

      <Modal
        open={Boolean(editingDraft)}
        title={editingDraft ? `Edit Email Draft - ${editingDraft.school_name}` : 'Edit Email Draft'}
        onOk={handleSaveDraftEdit}
        onCancel={() => setEditingDraft(null)}
        okText="Save Draft"
      >
        <div style={{ marginBottom: 12 }}>
          <Text strong>Recipient</Text>
          <div style={{ marginTop: 6 }}>
            <Tag color="blue">{editingDraft?.email || 'No email saved'}</Tag>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text strong>Subject</Text>
          <Input
            style={{ marginTop: 6 }}
            value={draftSubjectInput}
            onChange={(event) => setDraftSubjectInput(event.target.value)}
          />
        </div>
        <div>
          <Text strong>Message</Text>
          <Input.TextArea
            style={{ marginTop: 6 }}
            rows={8}
            value={draftMessageInput}
            onChange={(event) => setDraftMessageInput(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AdminResourceWatermark;
