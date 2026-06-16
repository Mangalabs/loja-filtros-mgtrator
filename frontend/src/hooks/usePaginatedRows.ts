import { useEffect, useMemo, useState } from 'react'

export function usePaginatedRows<T>(items: T[], resetKey?: unknown) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(15)
  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage))
  const visibleItems = useMemo(
    () => items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [items, page, rowsPerPage],
  )

  useEffect(() => {
    setPage(0)
  }, [resetKey, rowsPerPage])

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(pageCount - 1)
    }
  }, [page, pageCount])

  return {
    pagination: {
      count: items.length,
      page,
      rowsPerPage,
      onPageChange: setPage,
      onRowsPerPageChange: setRowsPerPage,
    },
    visibleItems,
  }
}
