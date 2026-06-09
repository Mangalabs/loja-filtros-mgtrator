import Button, { type ButtonProps } from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import type { ReactNode } from 'react'

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
    <Button color='success' variant='contained' startIcon={icon} {...props}>
      {children}
    </Button>
  )
}

export function SecondaryButton({ children, icon, ...props }: AppButtonProps) {
  return (
    <Button color='inherit' variant='outlined' startIcon={icon} {...props}>
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
