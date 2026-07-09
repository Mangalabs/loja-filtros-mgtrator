import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import type { FormEvent } from 'react'
import type { Sale } from '../../api'
import { InlineNote } from '../../components/layout'
import { TableActionButton } from '../../components/ui'
import { formatQuantity } from '../../utils/format'

export type SaleReturnHandler = (
  event: FormEvent<HTMLFormElement>,
  sale: Sale,
) => Promise<boolean> | void

export function SaleReturnForm({
  sale,
  onReturnItem,
}: {
  sale: Sale
  onReturnItem: SaleReturnHandler
}) {
  const returnableItems = sale.items.filter(
    (item) => Number(item.returnableQuantity) > 0,
  )

  return returnableItems.length > 0 ? (
    <form
      className='grid w-full max-w-64 gap-2'
      onSubmit={(event) => onReturnItem(event, sale)}>
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
      <TableActionButton type='submit'>Devolver item</TableActionButton>
    </form>
  ) : (
    <InlineNote>Itens ja devolvidos</InlineNote>
  )
}

function saleReturnItemLabel(item: Sale['items'][number]) {
  return `${item.productName} - disponivel ${formatQuantity(item.returnableQuantity)}`
}
