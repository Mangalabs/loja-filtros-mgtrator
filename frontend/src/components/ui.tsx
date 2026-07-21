import Button, { type ButtonProps } from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { MoreVertical } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { frontendPalette } from '../theme'

export type StatusTone = 'success' | 'neutral' | 'warning' | 'error'

export function StatusChip({
  label,
  tone,
}: {
  label: string
  tone: StatusTone
}) {
  if (tone === 'success') {
    return (
      <Chip color='success' label={label} size='small' variant='outlined' />
    )
  }

  if (tone === 'warning') {
    return (
      <Chip color='warning' label={label} size='small' variant='outlined' />
    )
  }

  if (tone === 'error') {
    return <Chip color='error' label={label} size='small' variant='outlined' />
  }

  return <Chip label={label} size='small' variant='outlined' />
}

type AppButtonProps = Omit<
  ButtonProps,
  'color' | 'size' | 'startIcon' | 'variant'
> & {
  icon?: ReactNode
}

export type TableActionsMenuAction = {
  disabled?: boolean
  href?: string
  icon?: ReactNode
  label: string
  onSelect?: () => void
}

export function PrimaryButton({ children, icon, ...props }: AppButtonProps) {
  return (
    <Button
      color='primary'
      variant='contained'
      startIcon={icon}
      sx={{
        bgcolor: frontendPalette.primaryNavy,
        borderRadius: 2,
        minHeight: 42,
        px: 2.25,
        '&:hover': {
          bgcolor: '#17264d',
        },
      }}
      {...props}>
      {children}
    </Button>
  )
}

export function SecondaryButton({ children, icon, ...props }: AppButtonProps) {
  return (
    <Button
      color='inherit'
      variant='outlined'
      startIcon={icon}
      sx={{
        borderColor: '#cfd8d5',
        borderRadius: 2,
        color: frontendPalette.darkBase,
        minHeight: 42,
        px: 2.25,
        '&:hover': {
          bgcolor: '#f3f5f4',
          borderColor: frontendPalette.mutedGreenGray,
        },
      }}
      {...props}>
      {children}
    </Button>
  )
}

export function TableActionButton({
  children,
  icon,
  ...props
}: AppButtonProps) {
  return (
    <Button
      color='inherit'
      size='small'
      variant='outlined'
      startIcon={icon}
      {...props}>
      {children}
    </Button>
  )
}

export function TableActionsMenu({
  actions,
  label = 'Acoes',
}: {
  actions: TableActionsMenuAction[]
  label?: string
}) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null)
  const availableActions = actions.filter(
    (action) => action.href || action.onSelect || action.disabled,
  )
  const open = Boolean(anchorElement)

  function closeMenu() {
    setAnchorElement(null)
  }

  function selectAction(action: TableActionsMenuAction) {
    closeMenu()
    action.onSelect?.()
  }

  return (
    <>
      <IconButton
        aria-controls={open ? 'table-actions-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup='menu'
        aria-label={label}
        disabled={availableActions.length === 0}
        size='small'
        onClick={(event) => setAnchorElement(event.currentTarget)}
        sx={{
          border: '1px solid #cfd8d5',
          borderRadius: 2,
          color: frontendPalette.primaryNavy,
          height: 30,
          p: 0,
          width: 30,
          '&:hover': {
            bgcolor: '#f3f5f4',
            borderColor: frontendPalette.mutedGreenGray,
          },
        }}>
        <MoreVertical size={16} />
      </IconButton>
      <Menu
        anchorEl={anchorElement}
        id='table-actions-menu'
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              border: '1px solid #dfe5e1',
              borderRadius: 2,
              minWidth: 210,
            },
          },
        }}>
        {availableActions.map((action) => (
          <MenuItem
            component={action.href ? 'a' : 'button'}
            disabled={action.disabled}
            href={action.href}
            key={action.label}
            onClick={() => selectAction(action)}
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: 1,
              justifyContent: 'flex-start',
              textAlign: 'left',
              width: '100%',
            }}>
            {action.icon ? (
              <ListItemIcon sx={{ color: frontendPalette.primaryNavy }}>
                {action.icon}
              </ListItemIcon>
            ) : null}
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
