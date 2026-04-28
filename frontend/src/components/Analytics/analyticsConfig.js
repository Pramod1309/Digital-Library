export const TIME_RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 }
];

export const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Academic', value: 'academic' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Administrative', value: 'administrative' },
  { label: 'Training', value: 'training' },
  { label: 'Event', value: 'event' },
  { label: 'Multimedia', value: 'multimedia' }
];

export const CHART_COLORS = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  purple: '#722ed1',
  teal: '#13c2c2',
  orange: '#fa8c16'
};

export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

export const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString();
};

export const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleDateString();
};
