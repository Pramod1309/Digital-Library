import config from '../config';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
const PDF_EXTENSIONS = new Set(['pdf']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']);
const TEXT_EXTENSIONS = new Set(['txt', 'csv', 'json', 'md']);
const DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);

export const getAttachmentName = (file) => {
  if (!file) return 'Attachment';
  return file.original_name || file.name || file.filename || 'Attachment';
};

export const getAttachmentType = (file) => {
  if (!file) return '';
  return (file.file_type || file.type || file.mime_type || '').toLowerCase();
};

export const getAttachmentSize = (file) => {
  if (!file) return 0;
  return file.file_size ?? file.size ?? file.originFileObj?.size ?? 0;
};

export const getAttachmentExtension = (file) => {
  const fileName = getAttachmentName(file);
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) {
    return '';
  }
  return fileName.slice(dotIndex + 1).toLowerCase();
};

export const isImageAttachment = (file) => {
  const type = getAttachmentType(file);
  const extension = getAttachmentExtension(file);
  return type.startsWith('image/') || IMAGE_EXTENSIONS.has(extension);
};

export const isPdfAttachment = (file) => {
  const type = getAttachmentType(file);
  const extension = getAttachmentExtension(file);
  return type.includes('pdf') || PDF_EXTENSIONS.has(extension);
};

export const isVideoAttachment = (file) => {
  const type = getAttachmentType(file);
  const extension = getAttachmentExtension(file);
  return type.startsWith('video/') || VIDEO_EXTENSIONS.has(extension);
};

export const isAudioAttachment = (file) => {
  const type = getAttachmentType(file);
  const extension = getAttachmentExtension(file);
  return type.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension);
};

export const isTextAttachment = (file) => {
  const type = getAttachmentType(file);
  const extension = getAttachmentExtension(file);
  return type.startsWith('text/') || TEXT_EXTENSIONS.has(extension);
};

export const isDocumentAttachment = (file) => {
  const extension = getAttachmentExtension(file);
  return DOCUMENT_EXTENSIONS.has(extension);
};

export const getAttachmentKind = (file) => {
  if (isImageAttachment(file)) return 'image';
  if (isPdfAttachment(file)) return 'pdf';
  if (isVideoAttachment(file)) return 'video';
  if (isAudioAttachment(file)) return 'audio';
  if (isTextAttachment(file)) return 'text';
  if (isDocumentAttachment(file)) return 'document';
  return 'file';
};

export const formatAttachmentSize = (size = 0) => {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const getUploadFileBlob = (file = {}) => (
  file.originFileObj || file
);

export const resolveAttachmentUrl = (url = '') => {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/i.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${config.apiBaseUrl}${url}`;
  }
  return `${config.apiBaseUrl}/${url}`;
};

export const normalizeUploadFiles = (nextFileList = [], previousFiles = []) => {
  const previousByUid = new Map(previousFiles.map((file) => [String(file.uid), file]));

  const normalized = nextFileList.map((file) => {
    const uid = String(file.uid ?? `${Date.now()}-${Math.random()}`);
    const previousFile = previousByUid.get(uid);
    const blob = getUploadFileBlob(file);
    const previewUrl = previousFile?.previewUrl
      || (blob instanceof Blob ? URL.createObjectURL(blob) : file.previewUrl || '');

    return {
      ...file,
      uid,
      name: getAttachmentName(file),
      type: getAttachmentType(file) || blob?.type || '',
      size: getAttachmentSize(file),
      originFileObj: blob instanceof Blob ? blob : file.originFileObj,
      previewUrl
    };
  });

  previousFiles.forEach((file) => {
    const stillExists = normalized.some((nextFile) => String(nextFile.uid) === String(file.uid));
    if (!stillExists && file.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(file.previewUrl);
    }
  });

  return normalized;
};

export const revokeUploadPreviews = (files = []) => {
  files.forEach((file) => {
    if (file.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(file.previewUrl);
    }
  });
};
