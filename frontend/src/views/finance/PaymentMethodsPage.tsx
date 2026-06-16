import { CreditCard, Power, PowerOff } from 'lucide-react'
import type { PaymentMethod } from '../../api'
import {
  ActionGroup,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import { StatusChip, TableActionButton } from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'

export function PaymentMethodsPage({
  paymentMethods,
  onChangeStatus,
}: {
  paymentMethods: PaymentMethod[]
  onChangeStatus: (paymentMethod: PaymentMethod) => void
}) {
  const { pagination, visibleItems } =
    usePaginatedRows<PaymentMethod>(paymentMethods)
  const columns = [
    {
      header: 'Forma de pagamento',
      render: (paymentMethod: PaymentMethod) => paymentMethod.name,
    },
    {
      header: 'Codigo',
      render: (paymentMethod: PaymentMethod) => paymentMethod.code,
    },
    {
      header: 'Status',
      render: (paymentMethod: PaymentMethod) => (
        <StatusChip
          label={paymentMethod.active ? 'Ativa' : 'Inativa'}
          tone={paymentMethod.active ? 'success' : 'neutral'}
        />
      ),
    },
    {
      header: 'Acoes',
      render: (paymentMethod: PaymentMethod) => (
        <ActionGroup>
          <TableActionButton
            icon={
              paymentMethod.active ? (
                <PowerOff size={14} />
              ) : (
                <Power size={14} />
              )
            }
            type='button'
            onClick={() => onChangeStatus(paymentMethod)}>
            {paymentMethod.active ? 'Inativar' : 'Ativar'}
          </TableActionButton>
        </ActionGroup>
      ),
    },
  ]

  return (
    <PagePanel wide>
      <PageHeader
        description='Credito sera incluido somente depois que suas regras forem definidas.'
        icon={<CreditCard size={18} />}
        title='Formas configuradas'
      />
      <ResponsiveTable
        columns={columns}
        emptyMessage='Nenhuma forma de pagamento cadastrada.'
        getRowId={(paymentMethod) => paymentMethod.id}
        items={visibleItems}
        pagination={pagination}
      />
    </PagePanel>
  )
}
