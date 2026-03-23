import { Box, Typography } from '@mui/material';
import { Meta, StoryFn } from '@storybook/react';
import FloatingNav from './FloatingNav';

export default {
  title: 'KubeVirt/Common/FloatingNav',
  component: FloatingNav,
} as Meta;

const sections = [
  { id: 'info', label: 'Info', icon: 'mdi:information-outline' },
  { id: 'disks', label: 'Disks', icon: 'mdi:harddisk' },
  { id: 'network', label: 'Network', icon: 'mdi:lan' },
  { id: 'scheduling', label: 'Scheduling', icon: 'mdi:calendar-clock' },
  { id: 'metrics', label: 'Metrics', icon: 'mdi:chart-line' },
  { id: 'terminal', label: 'Terminal', icon: 'mdi:console' },
  { id: 'vnc', label: 'VNC', icon: 'mdi:monitor' },
];

const Template: StoryFn<typeof FloatingNav> = args => (
  <Box sx={{ position: 'relative', minHeight: '100vh' }}>
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h5" gutterBottom>
        VM Details Page (simulated)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        The FloatingNav appears on the right side of the screen. It provides quick navigation to
        different sections of the VM details page.
      </Typography>

      {sections
        .filter(s => !['terminal', 'vnc'].includes(s.id))
        .map(section => (
          <Box
            key={section.id}
            id={`section-${section.id}`}
            sx={{ mb: 6, p: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}
          >
            <Typography variant="h6">{section.label} Section</Typography>
            <Typography variant="body2" color="text.secondary">
              Content for {section.label} would appear here.
            </Typography>
          </Box>
        ))}
    </Box>
    <FloatingNav {...args} />
  </Box>
);

export const Default = Template.bind({});
Default.args = {
  sections,
  onTerminalClick: () => alert('Open Terminal'),
  onVNCClick: () => alert('Open VNC'),
};

export const MinimalSections = Template.bind({});
MinimalSections.args = {
  sections: [
    { id: 'info', label: 'Info', icon: 'mdi:information-outline' },
    { id: 'disks', label: 'Disks', icon: 'mdi:harddisk' },
    { id: 'network', label: 'Network', icon: 'mdi:lan' },
  ],
};
