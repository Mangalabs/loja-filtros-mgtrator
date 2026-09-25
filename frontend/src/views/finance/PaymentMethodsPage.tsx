import { CreditCard, Power, PowerOff } from 'lucide-react'
import { useRef, useState } from 'react'
import type { PaymentMethod } from '../../api'
import { PageHeader, PagePanel, ResponsiveTable } from '../../components/layout'
import { StatusChip, TableActionsMenu } from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'

export function PaymentMethodsPage({
  paymentMethods,
  onChangeStatus,
}: {
  paymentMethods: PaymentMethod[]
  onChangeStatus: (paymentMethod: PaymentMethod) => Promise<unknown> | unknown
}) {
  const [pendingPaymentMethodId, setPendingPaymentMethodId] = useState<string>()
  const pendingStatusRef = useRef(false)
  const { pagination, visibleItems } =
    usePaginatedRows<PaymentMethod>(paymentMethods)

  async function changeStatus(paymentMethod: PaymentMethod) {
    if (pendingStatusRef.current) {
      return
    }

    pendingStatusRef.current = true
    setPendingPaymentMethodId(paymentMethod.id)

    try {
      await onChangeStatus(paymentMethod)
    } finally {
      pendingStatusRef.current = false
      setPendingPaymentMethodId(undefined)
    }
  }

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
                disabled: Boolean(pendingPaymentMethodId),
                icon: paymentMethod.active ? (
                  <PowerOff size={14} />
                ) : (
                  <Power size={14} />
                ),
                label:
                  pendingPaymentMethodId === paymentMethod.id
                    ? paymentMethod.active
                      ? 'Inativando…'
                      : 'Ativando…'
                    : paymentMethod.active
                      ? 'Inativar'
                      : 'Ativar',
                onSelect: () => void changeStatus(paymentMethod),
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
