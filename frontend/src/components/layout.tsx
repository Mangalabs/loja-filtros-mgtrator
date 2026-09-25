import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import { Inbox } from 'lucide-react'
import { forwardRef, type FormEvent, type ReactNode } from 'react'

type PagePanelProps = {
  children: ReactNode
  className?: string
  wide?: boolean
}

type PageHeaderProps = {
  actions?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  title: ReactNode
}

type FormGridProps = {
  children: ReactNode
  className?: string
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

type FormRowProps = {
  children: ReactNode
  className?: string
  columns?: 2 | 3
}

type FormCardProps = {
  children: ReactNode
  className?: string
}

type TableShellProps = {
  children: ReactNode
  className?: string
}

type InlineNoteProps = {
  children: ReactNode
  className?: string
}

type ActionGroupProps = {
  align?: 'start' | 'end'
  children: ReactNode
  className?: string
}

type InfoTileProps = {
  label: ReactNode
  value: ReactNode
}

type EmptyStateProps = {
  message: ReactNode
}

export type ResponsiveTableColumn<T> = {
  align?: 'left' | 'right' | 'center'
  header: ReactNode
  mobileLabel?: string
  render: (item: T) => ReactNode
}

type ResponsiveTableProps<T> = {
  columns: Array<ResponsiveTableColumn<T>>
  emptyMessage: ReactNode
  getRowId: (item: T) => string
  items: T[]
  loading?: boolean
  loadingLabel?: string
  onRowClick?: (item: T) => void
  pagination?: ResponsiveTablePagination
}

type ResponsiveTablePagination = {
  count: number
  page: number
  rowsPerPage: number
  rowsPerPageOptions?: number[]
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
}

export function PagePanel({ children, className, wide }: PagePanelProps) {
  return (
    <Paper
      className={classNames(
        'min-w-0 rounded-xl border border-[#dfe5e1] bg-white p-4 sm:p-5',
        wide ? 'min-h-[430px]' : undefined,
        className,
      )}
      elevation={0}>
      {children}
    </Paper>
  )
}

export const FormGrid = forwardRef<HTMLFormElement, FormGridProps>(
  function FormGrid({ children, className, onSubmit }, ref) {
  return (
    <form
      ref={ref}
      className={classNames(
        'grid content-start gap-5 rounded-xl border border-[#dfe5e1] bg-white p-4 sm:gap-6 sm:p-5',
        className,
      )}
      onSubmit={onSubmit}>
      {children}
    </form>
  )
  },
)

export function FormRow({
  children,
  className,
  columns = 2,
}: FormRowProps) {
  return (
    <div
      className={classNames(
        'grid gap-4',
        columns === 3 ? 'lg:grid-cols-3' : 'sm:grid-cols-2',
        className,
      )}>
      {children}
    </div>
  )
}

export function FormCard({ children, className }: FormCardProps) {
  return (
    <div
      className={classNames(
        'grid gap-4 rounded-xl border border-[#dfe5e1] bg-[#fbfcfb] p-4',
        className,
      )}>
      {children}
    </div>
  )
}

export function PageHeader({
  actions,
  description,
  icon,
  title,
}: PageHeaderProps) {
  return (
    <div className='mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4'>
      <div className='min-w-0'>
        <h2 className='m-0 text-xl font-bold text-[#2c281e]'>{title}</h2>
        {description ? (
          <span className='mt-1 block text-sm text-[#5f665f]'>
            {description}
          </span>
        ) : null}
      </div>
      {actions ?? icon ? (
        <div className='flex w-full flex-wrap items-center gap-2 text-[#203466] sm:w-auto sm:shrink-0 sm:justify-end'>
          {actions}
          {icon}
        </div>
      ) : null}
    </div>
  )
}

export function TableShell({ children, className }: TableShellProps) {
  return (
    <div
      className={classNames(
        'mt-4 w-full overflow-auto rounded-xl border border-[#e4e9e5]',
        className,
      )}>
      {children}
    </div>
  )
}

export function ResponsiveTable<T>({
  columns,
  emptyMessage,
  getRowId,
  items,
  loading = false,
  loadingLabel = 'Carregando dados',
  onRowClick,
  pagination,
}: ResponsiveTableProps<T>) {
  return (
    <>
      <TableShell className={loading ? 'pointer-events-none' : undefined}>
        <Table
          aria-busy={loading}
          aria-label={loading ? loadingLabel : undefined}
          size='small'
          sx={{
            minWidth: 760,
            '& th': {
              color: '#5f665f',
              fontWeight: 800,
            },
            '& td, & th': {
              borderColor: '#e4e9e5',
              py: 1.5,
            },
            '@media (max-width: 980px)': {
              minWidth: 0,
              '& thead': {
                display: 'none',
              },
              '&, & tbody, & tr, & td': {
                display: 'block',
                width: '100%',
              },
              '& tr': {
                borderBottom: '1px solid #e4e9e5',
                py: 1,
              },
              '& tr:last-child': {
                borderBottom: 0,
              },
              '& td': {
                alignItems: 'flex-start',
                borderBottom: 0,
                display: 'flex',
                gap: 1.75,
                justifyContent: 'space-between',
                px: 1.25,
              },
              '& td[data-label]::before': {
                color: '#5f665f',
                content: 'attr(data-label)',
                flex: '0 0 96px',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
              },
            },
          }}>
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <TableCell align={column.align} key={index}>
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }, (_, rowIndex) => (
                  <TableRow key={`loading-row-${rowIndex}`}>
                    {columns.map((_column, columnIndex) => (
                      <TableCell key={`loading-cell-${columnIndex}`}>
                        <Skeleton
                          aria-hidden='true'
                          height={24}
                          variant='rounded'
                          width={columnIndex === 0 ? '72%' : '88%'}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : items.map((item) => (
                  <TableRow
                    hover
                    key={getRowId(item)}
                    onClick={(event) => {
                      if (
                        eventTargetHandlesOwnInteraction(
                          event.target,
                          event.currentTarget,
                        )
                      ) {
                        return
                      }

                      onRowClick?.(item)
                    }}
                    onKeyDown={(event) => {
                      if (!onRowClick) {
                        return
                      }

                      if (
                        eventTargetHandlesOwnInteraction(
                          event.target,
                          event.currentTarget,
                        )
                      ) {
                        return
                      }

                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick(item)
                      }
                    }}
                    role={onRowClick ? 'button' : undefined}
                    sx={{
                      cursor: onRowClick ? 'pointer' : undefined,
                      transition: onRowClick
                        ? 'background-color 140ms ease'
                        : undefined,
                      '&:focus-visible': onRowClick
                        ? {
                            backgroundColor: '#f3f5f4',
                            outline: '2px solid #203466',
                            outlineOffset: -2,
                          }
                        : undefined,
                    }}
                    tabIndex={onRowClick ? 0 : undefined}>
                    {columns.map((column, index) => (
                      <TableCell
                        align={column.align}
                        data-label={responsiveTableColumnLabel(column)}
                        key={index}>
                        {column.render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState message={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableShell>
      {pagination ? (
        <TablePagination
          aria-busy={loading}
          component='div'
          count={pagination.count}
          labelDisplayedRows={({ count, from, to }) =>
            `${from}-${to} de ${count === -1 ? `mais de ${to}` : count}`
          }
          labelRowsPerPage='Linhas por pagina'
          page={pagination.page}
          rowsPerPage={pagination.rowsPerPage}
          rowsPerPageOptions={pagination.rowsPerPageOptions ?? [10, 15, 25, 50]}
          sx={loading ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
          onPageChange={(_event, page) => pagination.onPageChange(page)}
          onRowsPerPageChange={(event) =>
            pagination.onRowsPerPageChange(Number(event.target.value))
          }
        />
      ) : null}
    </>
  )
}

export function InlineNote({ children, className }: InlineNoteProps) {
  return (
    <span className={classNames('block text-sm text-[#5f665f]', className)}>
      {children}
    </span>
  )
}

export function ActionGroup({
  align = 'end',
  children,
  className,
}: ActionGroupProps) {
  return (
    <div
      className={classNames(
        'flex flex-wrap gap-2',
        align === 'end' ? 'justify-end' : 'justify-start',
        className,
      )}>
      {children}
    </div>
  )
}

export function ActionStack({
  children,
  className,
}: Omit<ActionGroupProps, 'align'>) {
  return (
    <div className={classNames('grid min-w-0 gap-2', className)}>
      {children}
    </div>
  )
}

export function InfoGrid({ children }: { children: ReactNode }) {
  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>{children}</div>
  )
}

export function InfoTile({ label, value }: InfoTileProps) {
  return (
    <div className='grid gap-2 rounded-xl border border-[#e4e9e5] bg-[#fbfcfb] p-4'>
      <span className='text-sm text-[#5f665f]'>{label}</span>
      <strong className='text-[#2c281e]'>{value}</strong>
    </div>
  )
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className='flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#dfe5e1] bg-[#fbfcfb] px-4 py-5 text-center text-sm text-[#5f665f]'>
      <Inbox aria-hidden='true' className='text-[#8a9f9d]' size={22} />
      <span>{message}</span>
    </div>
  )
}

function classNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function responsiveTableColumnLabel<T>(column: ResponsiveTableColumn<T>) {
  return (
    column.mobileLabel ??
    (typeof column.header === 'string' ? column.header : undefined)
  )
}

function eventTargetHandlesOwnInteraction(
  target: EventTarget | null,
  row: EventTarget,
) {
  if (!(target instanceof Element)) {
    return false
  }

  const interactiveElement = target.closest(
    'a, button, input, select, textarea, [role="button"], [role="menuitem"]',
  )

  return Boolean(interactiveElement && interactiveElement !== row)
}
