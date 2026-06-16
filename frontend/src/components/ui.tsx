import Button, { type ButtonProps } from '@mui/material/Button'
import Chip from '@mui/material/Chip'
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
