import TextField from '@mui/material/TextField'
import { useRef, useState, type FormEvent } from 'react'
import type { Sale } from '../../api'
import { TableActionButton } from '../../components/ui'

export type SaleCancellationHandler = (
  event: FormEvent<HTMLFormElement>,
  sale: Sale,
) => Promise<boolean | void> | boolean | void

export function SaleCancellationForm({
  sale,
  onCancel,
  onCancelSale,
}: {
  sale: Sale
  onCancel: () => void
  onCancelSale: SaleCancellationHandler
}) {
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submittingRef.current) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)

    try {
      const cancelled = await onCancelSale(event, sale)

      if (cancelled) {
        onCancel()
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <form className='grid w-full max-w-72 gap-2' onSubmit={submit}>
      <TextField
        helperText='A venda permanecerá no histórico como cancelada e o estoque será devolvido.'
        label='Motivo do cancelamento'
        multiline
        name='saleCancellationReason'
        required
        rows={3}
        size='small'
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
      <div className='flex flex-wrap gap-2'>
        <TableActionButton loading={submitting} type='submit'>
          {submitting ? 'Cancelando venda…' : 'Confirmar cancelamento'}
        </TableActionButton>
        <TableActionButton
          disabled={submitting}
          type='button'
          onClick={onCancel}>
          Voltar
        </TableActionButton>
      </div>
    </form>
  )
}
