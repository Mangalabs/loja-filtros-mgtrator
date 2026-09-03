import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import { Pencil, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { Client, PaymentMethod, Product, Sale } from '../../api'
import { ProductSearchField } from '../../components/ProductSearchField'
import {
  ActionGroup,
  FormCard,
  FormGrid,
  FormRow,
  InlineNote,
  PageHeader,
} from '../../components/layout'
import { PrimaryButton, SecondaryButton, TableActionButton } from '../../components/ui'
import { formatCurrency } from '../../utils/format'
import {
  PaymentSplitFields,
  type SaleDraftInput,
  type SalePaymentDraft,
} from './SalesPages'
import { salePaymentsAllowBilling } from './saleBilling'

type SaleEditItemDraft = {
  productId: string
  quantity: string
  unitPrice: string
}

export function SaleEditPage({
  clients,
  paymentMethods,
  products,
  sale,
  onCancel,
  onSubmit,
}: {
  clients: Client[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  sale: Sale
  onCancel: () => void
  onSubmit: (sale: Sale, input: SaleDraftInput) => Promise<boolean>
}) {
  const [clientId, setClientId] = useState(sale.clientId ?? '')
  const [billingIssueDate, setBillingIssueDate] = useState(
    sale.billingIssueDate?.slice(0, 10) ?? '',
  )
  const [billingDueDate, setBillingDueDate] = useState(
    sale.billingDueDate?.slice(0, 10) ?? '',
  )
  const [discountAmount, setDiscountAmount] = useState(sale.discountAmount)
  const [payments, setPayments] = useState<SalePaymentDraft[]>(
    sale.payments.length
      ? sale.payments.map((payment) => ({
          amount: payment.amount,
          paymentMethodId: payment.paymentMethodId,
        }))
      : [{ amount: sale.totalAmount, paymentMethodId: '' }],
  )
  const [items, setItems] = useState<SaleEditItemDraft[]>(
    sale.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  )
  const activeClients = clients.filter((client) => client.active)
  const selectedClient =
    activeClients.find((client) => client.id === clientId) ?? null
  const selectableProducts = products.filter(
    (product) =>
      product.active || items.some((item) => item.productId === product.id),
  )
  const saleSubtotal = items.reduce((sum, item) => {
    const product = products.find(
      (currentProduct) => currentProduct.id === item.productId,
    )
    const unitPrice = Number(product?.salePrice ?? item.unitPrice ?? 0)

    return sum + Number(item.quantity || 0) * unitPrice
  }, 0)
  const saleDiscount = moneyInputValue(discountAmount)
  const saleTotal = Math.max(saleSubtotal - saleDiscount, 0)
  const discountExceedsSubtotal = saleDiscount > saleSubtotal
  const hasEmptyItem = items.some((item) => !item.productId)
  const saleAllowsBilling = salePaymentsAllowBilling(paymentMethods, payments)

  useEffect(() => {
    setClientId(sale.clientId ?? '')
    setBillingIssueDate(sale.billingIssueDate?.slice(0, 10) ?? '')
    setBillingDueDate(sale.billingDueDate?.slice(0, 10) ?? '')
    setDiscountAmount(sale.discountAmount)
    setPayments(
      sale.payments.length
        ? sale.payments.map((payment) => ({
            amount: payment.amount,
            paymentMethodId: payment.paymentMethodId,
          }))
        : [{ amount: sale.totalAmount, paymentMethodId: '' }],
    )
    setItems(
      sale.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    )
  }, [sale])

  useEffect(() => {
    if (saleAllowsBilling) {
      return
    }

    setBillingIssueDate('')
    setBillingDueDate('')
  }, [saleAllowsBilling])

  function updateItem(index: number, changes: Partial<SaleEditItemDraft>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    )
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter((_item, itemIndex) => itemIndex !== index),
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit(sale, {
      clientId: clientId || null,
      billingIssueDate: saleAllowsBilling ? billingIssueDate || null : null,
      billingDueDate: saleAllowsBilling ? billingDueDate || null : null,
      discountAmount: saleDiscount,
      paymentMethodId: payments[0]?.paymentMethodId,
      payments: salePaymentPayloads(payments, saleTotal),
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    })

    if (saved) {
      onCancel()
    }
  }

  return (
    <FormGrid className='max-w-5xl gap-5 sm:gap-6' onSubmit={submit}>
      <PageHeader
        description='Ajuste cliente, itens, pagamentos e datas antes de concluir novamente.'
        icon={<Pencil size={18} />}
        title={`Editar venda Nº ${sale.saleNumber}`}
      />
      {sale.status !== 'OPEN' ? (
        <Alert severity='warning' variant='outlined'>
          Reabra a venda antes de editar itens, cliente ou valores.
        </Alert>
      ) : null}
      <Autocomplete
        getOptionLabel={(client) =>
          `${client.name}${client.phone ? ` - ${client.phone}` : ''}`
        }
        isOptionEqualToValue={(option, value) => option.id === value.id}
        noOptionsText='Nenhum cliente encontrado'
        options={activeClients}
        value={selectedClient}
        onChange={(_event, client) => setClientId(client?.id ?? '')}
        renderInput={(params) => (
          <TextField {...params} label='Cliente' size='medium' />
        )}
      />
      <div className='grid gap-4'>
        {items.map((item, index) => (
          <FormCard key={index}>
            <div className='flex items-center justify-between gap-3'>
              <strong>Item {index + 1}</strong>
              {items.length > 1 ? (
                <TableActionButton
                  type='button'
                  onClick={() => removeItem(index)}>
                  Remover
                </TableActionButton>
              ) : null}
            </div>
            <ProductSearchField
              label='Produto'
              name={`saleEditItems.${index}.productId`}
              products={selectableProducts}
              required
              stockLabel='current'
              value={item.productId}
              onChange={(productId) => {
                const product = products.find(
                  (currentProduct) => currentProduct.id === productId,
                )

                updateItem(index, {
                  productId,
                  unitPrice: product?.salePrice ?? item.unitPrice,
                })
              }}
            />
            <TextField
              label='Quantidade'
              required
              size='medium'
              slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
              type='number'
              value={item.quantity}
              onChange={(event) =>
                updateItem(index, { quantity: event.target.value })
              }
            />
          </FormCard>
        ))}
      </div>
      <ActionGroup align='start'>
        <SecondaryButton
          type='button'
          onClick={() =>
            setItems((currentItems) => [
              ...currentItems,
              { productId: '', quantity: '', unitPrice: '' },
            ])
          }>
          Adicionar item
        </SecondaryButton>
      </ActionGroup>
      <PaymentSplitFields
        fieldPrefix='saleEdit'
        paymentMethods={paymentMethods}
        payments={payments}
        totalAmount={saleTotal}
        onChange={setPayments}
      />
      {saleAllowsBilling ? (
        <FormRow>
          <TextField
            label='Data da fatura'
            size='medium'
            type='date'
            value={billingIssueDate}
            onChange={(event) => setBillingIssueDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label='Vencimento do boleto/fatura'
            size='medium'
            type='date'
            value={billingDueDate}
            onChange={(event) => setBillingDueDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </FormRow>
      ) : null}
      <FormRow>
        <TextField
          error={discountExceedsSubtotal}
          helperText={
            discountExceedsSubtotal
              ? 'Desconto maior que o subtotal.'
              : 'Informe o desconto em reais, se houver.'
          }
          label='Desconto'
          size='medium'
          type='number'
          value={discountAmount}
          onChange={(event) => setDiscountAmount(event.target.value)}
          slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
        />
        <TextField
          disabled
          label='Total final'
          size='medium'
          value={formatCurrency(saleTotal)}
        />
      </FormRow>
      <ActionGroup>
        {hasEmptyItem ? <InlineNote>Selecione o produto de todos os itens.</InlineNote> : null}
        <SecondaryButton type='button' onClick={onCancel}>
          Cancelar
        </SecondaryButton>
        <PrimaryButton
          disabled={
            sale.status !== 'OPEN' || discountExceedsSubtotal || hasEmptyItem
          }
          icon={<Plus size={17} />}
          type='submit'>
          Salvar correção
        </PrimaryButton>
      </ActionGroup>
    </FormGrid>
  )
}

function salePaymentPayloads(
  payments: SalePaymentDraft[],
  totalAmount: number,
) {
  const filledPayments = payments.filter((payment) => payment.paymentMethodId)
  const usesSinglePaymentTotal =
    filledPayments.length === 1 && !filledPayments[0].amount

  return filledPayments.map((payment) => ({
    paymentMethodId: payment.paymentMethodId,
    amount: usesSinglePaymentTotal
      ? Number(totalAmount.toFixed(2))
      : moneyInputValue(payment.amount),
  }))
}

function moneyInputValue(value: string) {
  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}
