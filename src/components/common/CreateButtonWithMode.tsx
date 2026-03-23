import { Icon } from '@iconify/react';
import { Button, ButtonGroup, MenuItem, MenuList, Popover } from '@mui/material';
import React from 'react';

interface CreateButtonWithModeProps {
  label: string;
  onCreateForm: () => void;
  onCreateYAML: () => void;
}

export default function CreateButtonWithMode({
  label,
  onCreateForm,
  onCreateYAML,
}: CreateButtonWithModeProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFormClick = () => {
    handleClose();
    onCreateForm();
  };

  const handleYAMLClick = () => {
    handleClose();
    onCreateYAML();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <ButtonGroup variant="contained">
        <Button onClick={onCreateForm} startIcon={<Icon icon="mdi:plus" />}>
          {label}
        </Button>
        <Button size="small" onClick={handleClick} sx={{ px: 0.5 }}>
          <Icon icon="mdi:menu-down" />
        </Button>
      </ButtonGroup>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuList dense>
          <MenuItem onClick={handleFormClick}>
            <Icon icon="mdi:form-textbox" style={{ marginRight: 8 }} />
            Create with Form
          </MenuItem>
          <MenuItem onClick={handleYAMLClick}>
            <Icon icon="mdi:code-braces" style={{ marginRight: 8 }} />
            Create with YAML
          </MenuItem>
        </MenuList>
      </Popover>
    </>
  );
}
