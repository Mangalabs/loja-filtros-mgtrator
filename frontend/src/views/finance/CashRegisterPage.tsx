import TextField from '@mui/material/TextField'
import { Banknote, Plus } from 'lucide-react'
import type { FormEvent } from 'react'
import type { AuthUser, CashRegisterSession } from '../../api'
import {
  EmptyState,
  FormGrid,
  InfoGrid,
  InfoTile,
  PageHeader,
  PagePanel,
} from '../../components/layout'
import { PrimaryButton, StatusChip } from '../../components/ui'
import { formatCurrency, formatDateTime } from '../../utils/format'

export function CashRegisterPage({
  session,
  user,
  onOpen,
  onClose,
}: {
  session: CashRegisterSession | null
  user: AuthUser
  onOpen: (event: FormEvent<HTMLFormElement>) => void
  onClose: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (session) {
    return (
      <section className='grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]'>
        <PagePanel>
          <PageHeader
            actions={<StatusChip label='Aberto' tone='success' />}
            description='Confira os recebimentos antes de fechar o caixa.'
            title='Caixa aberto'
          />
          <InfoGrid>
            <InfoTile label='Aberto por' value={session.openedByUserName} />
            <InfoTile
              label='Data de abertura'
              value={formatDateTime(session.openedAt)}
            />
            <InfoTile
              label='Saldo inicial'
              value={formatCurrency(session.openingBalance)}
            />
            <InfoTile label='Vendas' value={formatCurrency(session.salesTotal)} />
            <InfoTile
              label='Esperado'
              value={formatCurrency(session.expectedClosingBalance)}
            />
          </InfoGrid>
        </PagePanel>

        <FormGrid onSubmit={onClose}>
          <PageHeader
            description='Informe o total conferido no caixa.'
            icon={<Banknote size={18} />}
            title='Fechamento'
          />
          <div className='grid gap-2'>
            {session.paymentSummary.map((payment) => (
              <div
                className='flex min-h-11 items-center justify-between gap-3 border-b border-[#e4e9e5] py-2 last:border-b-0'
                key={payment.paymentMethodId}>
                <strong>{payment.paymentMethodName}</strong>
                <span className='text-sm text-[#5f665f]'>
                  {formatCurrency(payment.amount)}
                </span>
              </div>
            ))}
            {session.paymentSummary.length === 0 ? (
              <EmptyState message='Nenhuma venda registrada.' />
            ) : null}
          </div>
          <TextField
            disabled
            label='Saldo esperado'
            value={formatCurrency(session.expectedClosingBalance)}
          />
          <TextField
            defaultValue={session.expectedClosingBalance}
            label='Valor conferido'
            name='closingBalance'
            required
            type='number'
            slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
          />
          <PrimaryButton icon={<Plus size={17} />} type='submit'>
            Fechar caixa
          </PrimaryButton>
        </FormGrid>
      </section>
    )
  }

  return (
    <FormGrid className='max-w-xl' onSubmit={onOpen}>
      <PageHeader
        description='A abertura ficara registrada no usuario autenticado.'
        icon={<Banknote size={18} />}
        title='Abrir caixa'
      />
      <TextField disabled label='Responsavel' value={user.name} />
      <TextField
        defaultValue='0.00'
        label='Saldo inicial'
        name='openingBalance'
        required
        type='number'
        slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
      />
      <PrimaryButton icon={<Plus size={17} />} type='submit'>
        Abrir caixa
      </PrimaryButton>
    </FormGrid>
  )
}
