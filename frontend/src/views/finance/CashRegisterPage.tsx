import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { Banknote, Plus, ReceiptText } from 'lucide-react'
import type { FormEvent } from 'react'
import type { AuthUser, CashRegisterSession } from '../../api'
import {
  ActionGroup,
  EmptyState,
  FormGrid,
  FormRow,
  InfoGrid,
  InfoTile,
  InlineNote,
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
  onCreateMovement,
}: {
  session: CashRegisterSession | null
  user: AuthUser
  onOpen: (event: FormEvent<HTMLFormElement>) => void
  onClose: (event: FormEvent<HTMLFormElement>) => void
  onCreateMovement: (event: FormEvent<HTMLFormElement>) => void
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
              label='Suprimentos'
              value={formatCurrency(session.supplyTotal)}
            />
            <InfoTile
              label='Sangrias'
              value={formatCurrency(session.withdrawalTotal)}
            />
            <InfoTile
              label='Esperado'
              value={formatCurrency(session.expectedClosingBalance)}
            />
          </InfoGrid>

          <div className='mt-5 grid gap-2'>
            <PageHeader
              description='Movimentos manuais registrados neste caixa.'
              icon={<ReceiptText size={18} />}
              title='Movimentacoes'
            />
            {session.movements.map((movement) => (
              <div
                className='flex min-h-12 items-start justify-between gap-3 border-b border-[#e4e9e5] py-2 last:border-b-0'
                key={movement.id}>
                <div>
                  <strong>{cashMovementTypeLabel(movement.type)}</strong>
                  <InlineNote>
                    {movement.reason} | {movement.createdByUserName}
                  </InlineNote>
                </div>
                <span className='text-sm font-semibold text-[#2c281e]'>
                  {cashMovementAmountLabel(movement)}
                </span>
              </div>
            ))}
            {session.movements.length === 0 ? (
              <EmptyState message='Nenhuma movimentacao manual registrada.' />
            ) : null}
          </div>
        </PagePanel>

        <div className='grid gap-4'>
          <FormGrid onSubmit={onCreateMovement}>
            <PageHeader
              description='Registre entradas ou retiradas manuais do caixa.'
              icon={<Plus size={18} />}
              title='Sangria e suprimento'
            />
            <FormRow>
              <TextField
                defaultValue=''
                label='Tipo'
                name='cashMovementType'
                required
                select>
                <MenuItem value='' disabled>
                  Tipo
                </MenuItem>
                <MenuItem value='SUPPLY'>Suprimento</MenuItem>
                <MenuItem value='WITHDRAWAL'>Sangria</MenuItem>
              </TextField>
              <TextField
                label='Valor'
                name='cashMovementAmount'
                required
                type='number'
                slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
              />
            </FormRow>
            <TextField
              label='Motivo'
              name='cashMovementReason'
              required
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <ActionGroup>
              <PrimaryButton icon={<Plus size={17} />} type='submit'>
                Registrar
              </PrimaryButton>
            </ActionGroup>
          </FormGrid>

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
        </div>
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

function cashMovementTypeLabel(type: 'SUPPLY' | 'WITHDRAWAL') {
  const labelByType = {
    SUPPLY: 'Suprimento',
    WITHDRAWAL: 'Sangria',
  }

  return labelByType[type]
}

function cashMovementAmountLabel(
  movement: CashRegisterSession['movements'][number],
) {
  const signByType = {
    SUPPLY: '+',
    WITHDRAWAL: '-',
  }

  return `${signByType[movement.type]} ${formatCurrency(movement.amount)}`
}
