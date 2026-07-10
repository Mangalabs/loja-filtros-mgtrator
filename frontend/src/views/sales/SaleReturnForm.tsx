import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import type { FormEvent } from 'react'
import type { PaymentMethod, Sale } from '../../api'
import { InlineNote } from '../../components/layout'
import { TableActionButton } from '../../components/ui'
import { formatQuantity } from '../../utils/format'

export type SaleReturnHandler = (
  event: FormEvent<HTMLFormElement>,
  sale: Sale,
) => Promise<boolean> | void

export function SaleReturnForm({
  onCancel,
  paymentMethods,
  sale,
  onReturnItem,
}: {
  onCancel?: () => void
  paymentMethods: PaymentMethod[]
  sale: Sale
  onReturnItem: SaleReturnHandler
}) {
  const returnableItems = sale.items.filter(
    (item) => Number(item.returnableQuantity) > 0,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    const saved = await onReturnItem(event, sale)

    saved && onCancel?.()
  }

  return returnableItems.length > 0 ? (
    <form className='grid w-full max-w-72 gap-2' onSubmit={submit}>
      <TextField
        label='Item para devolver'
        name='saleReturnItemId'
        defaultValue={returnableItems[0]?.id ?? ''}
        select
        size='small'
        required>
        {returnableItems.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {saleReturnItemLabel(item)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label='Qtd.'
        name='saleReturnQuantity'
        defaultValue='1'
        type='number'
        size='small'
        required
        slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
      />
      <TextField label='Motivo' name='saleReturnReason' size='small' required />
      <TextField
        label='Valor estornado'
        name='saleReturnRefundAmount'
        defaultValue={saleReturnRefundAmount(returnableItems[0])}
        type='number'
        size='small'
        helperText='Ajuste se o valor devolvido for diferente.'
        slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
      />
      <TextField
        label='Forma do estorno'
        name='saleReturnRefundPaymentMethodId'
        defaultValue=''
        select
        size='small'
        helperText='Vazio usa a forma original da venda.'>
        <MenuItem value=''>Usar pagamento original</MenuItem>
        {paymentMethods
          .filter((method) => method.active)
          .map((method) => (
            <MenuItem key={method.id} value={method.id}>
              {method.name}
            </MenuItem>
          ))}
      </TextField>
      <TextField
        label='Data do estorno'
        name='saleReturnRefundedAt'
        type='date'
        size='small'
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label='Referencia do estorno'
        name='saleReturnRefundReference'
        size='small'
        helperText='NSU, comprovante ou observacao curta.'
      />
      <div className='flex flex-wrap gap-2'>
        <TableActionButton type='submit'>Devolver item</TableActionButton>
        {onCancel ? (
          <TableActionButton type='button' onClick={onCancel}>
            Cancelar
          </TableActionButton>
        ) : null}
      </div>
    </form>
  ) : (
    <InlineNote>Itens ja devolvidos</InlineNote>
  )
}

function saleReturnItemLabel(item: Sale['items'][number]) {
  return `${item.productName} - disponivel ${formatQuantity(item.returnableQuantity)}`
}

function saleReturnRefundAmount(item: Sale['items'][number] | undefined) {
  if (!item) {
    return '0.00'
  }

  const unitAmount = Number(item.totalAmount) / Number(item.quantity)
  return Number.isFinite(unitAmount) ? unitAmount.toFixed(2) : '0.00'
}
