import { CreditCard, Power, PowerOff } from 'lucide-react'
import type { PaymentMethod } from '../../api'
import { PageHeader, PagePanel, ResponsiveTable } from '../../components/layout'
import { StatusChip, TableActionsMenu } from '../../components/ui'
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
      header: 'Ações',
      render: (paymentMethod: PaymentMethod) => (
        <div className='flex justify-end'>
          <TableActionsMenu
            actions={[
              {
                icon: paymentMethod.active ? (
                  <PowerOff size={14} />
                ) : (
                  <Power size={14} />
                ),
                label: paymentMethod.active ? 'Inativar' : 'Ativar',
                onSelect: () => onChangeStatus(paymentMethod),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <PagePanel wide>
      <PageHeader
        description='PIX, débito, crédito, boleto e pagamentos pendentes podem ser ativados ou inativados conforme a operação da filial.'
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
