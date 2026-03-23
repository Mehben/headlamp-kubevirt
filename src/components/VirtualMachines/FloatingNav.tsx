import { Icon } from '@iconify/react';
import { Box, IconButton, Tooltip } from '@mui/material';

interface FloatingNavProps {
  sections: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
  onTerminalClick?: () => void;
  onVNCClick?: () => void;
}

export default function FloatingNav({ sections, onTerminalClick, onVNCClick }: FloatingNavProps) {
  const scrollToSection = (sectionId: string) => {
    // Special handling for different section types
    if (sectionId === 'info') {
      // Try multiple methods to scroll to top
      // 1. Try to find main content scrollable container
      const mainContent = document.querySelector('main');
      const scrollableContainer = document.querySelector('[class*="MuiBox-root"]');

      if (mainContent) {
        mainContent.scrollTop = 0;
        mainContent.scrollTo?.({ top: 0, behavior: 'smooth' });
      }

      if (scrollableContainer) {
        scrollableContainer.scrollTop = 0;
        scrollableContainer.scrollTo?.({ top: 0, behavior: 'smooth' });
      }

      // Also scroll window
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Force scroll all elements with scrollTop
      document.querySelectorAll('*').forEach(el => {
        if ((el as HTMLElement).scrollTop > 0) {
          (el as HTMLElement).scrollTop = 0;
        }
      });

      return;
    }

    if (sectionId === 'terminal' && onTerminalClick) {
      onTerminalClick();
      return;
    }

    if (sectionId === 'vnc' && onVNCClick) {
      onVNCClick();
      return;
    }

    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        padding: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      {sections.map(section => (
        <Tooltip key={section.id} title={section.label} placement="left">
          <IconButton
            size="small"
            onClick={() => scrollToSection(section.id)}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Icon icon={section.icon} width={20} height={20} />
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
}
