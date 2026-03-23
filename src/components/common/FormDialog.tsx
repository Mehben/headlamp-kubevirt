import { Icon } from '@iconify/react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import React from 'react';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  title: string;
  saveLabel?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  disableSave?: boolean;
  saveIcon?: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

export default function FormDialog({
  open,
  onClose,
  onSave,
  title,
  saveLabel = 'Save',
  maxWidth = 'md',
  children,
  disableSave = false,
  saveIcon = 'mdi:check',
  isMinimized = false,
  onMinimize,
}: FormDialogProps) {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const handleMaximize = () => {
    setIsFullScreen(!isFullScreen);
  };

  if (isMinimized) {
    return null; // Could be replaced with a minimized bar if needed
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isFullScreen ? false : maxWidth}
      fullScreen={isFullScreen}
      fullWidth
      PaperProps={{
        sx: {
          minHeight: isFullScreen ? '100vh' : '60vh',
          maxHeight: isFullScreen ? '100vh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">{title}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onMinimize && (
            <IconButton onClick={onMinimize} size="small" title="Minimize">
              <Icon icon="mdi:window-minimize" />
            </IconButton>
          )}
          <IconButton
            onClick={handleMaximize}
            size="small"
            title={isFullScreen ? 'Restore' : 'Maximize'}
          >
            <Icon icon={isFullScreen ? 'mdi:window-restore' : 'mdi:window-maximize'} />
          </IconButton>
          <IconButton onClick={onClose} size="small" title="Close">
            <Icon icon="mdi:close" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'auto', p: 0 }}>{children}</DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {onSave && (
          <Button
            variant="contained"
            onClick={onSave}
            disabled={disableSave}
            startIcon={<Icon icon={saveIcon} />}
          >
            {saveLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
