import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { Pencil, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
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
  discountMode: SaleDiscountMode
  discountPercentage: string
  discountAmount: string
}

type SaleDiscountMode = 'PERCENTAGE' | 'AMOUNT'

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
  const [discountMode, setDiscountMode] = useState<SaleDiscountMode>('AMOUNT')
  const [discountPercentage, setDiscountPercentage] = useState('')
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
      discountMode: 'AMOUNT' as SaleDiscountMode,
      discountPercentage: '',
      discountAmount: item.discountAmount,
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
    const unitPrice = Number(item.unitPrice || 0)
    const itemGrossAmount = Number(item.quantity || 0) * unitPrice
    const itemDiscountAmount = saleItemDiscountAmount(item)

    return sum + Math.max(itemGrossAmount - itemDiscountAmount, 0)
  }, 0)
  const saleDiscount = saleDiscountAmount(
    saleSubtotal,
    discountMode,
    discountPercentage,
    discountAmount,
  )
  const saleTotal = Math.max(saleSubtotal - saleDiscount, 0)
  const previousSaleTotalRef = useRef(saleTotal)
  const discountExceedsSubtotal = saleDiscount > saleSubtotal
  const hasEmptyItem = items.some((item) => !item.productId)
  const hasInvalidUnitPrice = items.some(
    (item) => moneyInputValue(item.unitPrice) <= 0,
  )
  const hasInvalidItemDiscount = items.some(
    (item) =>
      saleItemDiscountAmount(item) >
      Number(item.quantity || 0) * moneyInputValue(item.unitPrice),
  )
  const saleAllowsBilling = salePaymentsAllowBilling(paymentMethods, payments)

  useEffect(() => {
    setClientId(sale.clientId ?? '')
    setBillingIssueDate(sale.billingIssueDate?.slice(0, 10) ?? '')
    setBillingDueDate(sale.billingDueDate?.slice(0, 10) ?? '')
    setDiscountMode('AMOUNT')
    setDiscountPercentage('')
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
        discountMode: 'AMOUNT' as SaleDiscountMode,
        discountPercentage: '',
        discountAmount: item.discountAmount,
      })),
    )
    previousSaleTotalRef.current = Number(sale.totalAmount)
  }, [sale])

  useEffect(() => {
    if (saleAllowsBilling) {
      return
    }

    setBillingIssueDate('')
    setBillingDueDate('')
  }, [saleAllowsBilling])

  useEffect(() => {
    const previousSaleTotal = previousSaleTotalRef.current
    previousSaleTotalRef.current = saleTotal

    if (Math.abs(previousSaleTotal - saleTotal) < 0.01) {
      return
    }

    setPayments((currentPayments) => {
      if (currentPayments.length !== 1) {
        return currentPayments
      }

      const [payment] = currentPayments

      if (!payment.paymentMethodId) {
        return currentPayments
      }

      const paymentAmount = moneyInputValue(payment.amount)
      const followsPreviousTotal =
        !payment.amount || Math.abs(paymentAmount - previousSaleTotal) < 0.01

      if (!followsPreviousTotal) {
        return currentPayments
      }

      return [
        {
          ...payment,
          amount: saleTotal > 0 ? saleTotal.toFixed(2) : '',
        },
      ]
    })
  }, [saleTotal])

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
        unitPrice: moneyInputValue(item.unitPrice),
        discountAmount: saleItemDiscountAmount(item),
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
            <TextField
              label='Valor unitário'
              required
              size='medium'
              slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
              type='number'
              value={item.unitPrice}
              onChange={(event) =>
                updateItem(index, { unitPrice: event.target.value })
              }
            />
            <TextField
              error={
                saleItemDiscountAmount(item) >
                Number(item.quantity || 0) * moneyInputValue(item.unitPrice)
              }
              helperText={`Valor: ${formatCurrency(saleItemDiscountAmount(item))}`}
              label={
                item.discountMode === 'PERCENTAGE'
                  ? 'Desconto do item (%)'
                  : 'Desconto do item (R$)'
              }
              size='medium'
              slotProps={{
                htmlInput:
                  item.discountMode === 'PERCENTAGE'
                    ? { min: '0', max: '100', step: '0.01' }
                    : { min: '0', step: '0.01' },
              }}
              type='number'
              value={
                item.discountMode === 'PERCENTAGE'
                  ? item.discountPercentage
                  : item.discountAmount
              }
              onChange={(event) => {
                if (item.discountMode === 'PERCENTAGE') {
                  updateItem(index, { discountPercentage: event.target.value })
                } else {
                  updateItem(index, { discountAmount: event.target.value })
                }
              }}
            />
            <ToggleButtonGroup
              exclusive
              size='small'
              value={item.discountMode}
              onChange={(_event, value: SaleDiscountMode | null) => {
                if (!value) {
                  return
                }

                const itemSubtotal =
                  Number(item.quantity || 0) * moneyInputValue(item.unitPrice)
                const currentDiscount = saleItemDiscountAmount(item)

                updateItem(
                  index,
                  saleItemDiscountModeInput(value, itemSubtotal, currentDiscount),
                )
              }}>
              <ToggleButton value='PERCENTAGE'>%</ToggleButton>
              <ToggleButton value='AMOUNT'>R$</ToggleButton>
            </ToggleButtonGroup>
          </FormCard>
        ))}
      </div>
      <ActionGroup align='start'>
        <SecondaryButton
          type='button'
          onClick={() =>
            setItems((currentItems) => [
              ...currentItems,
              {
                productId: '',
                quantity: '',
                unitPrice: '',
                discountMode: 'AMOUNT',
                discountPercentage: '',
                discountAmount: '0',
              },
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
        <div className='grid gap-2'>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={discountMode}
            onChange={(_event, value: SaleDiscountMode | null) => {
              if (!value) {
                return
              }

              if (value === 'PERCENTAGE' && discountMode === 'AMOUNT') {
                setDiscountPercentage(
                  saleSubtotal > 0 && saleDiscount > 0
                    ? Number(((saleDiscount / saleSubtotal) * 100).toFixed(2)).toString()
                    : '',
                )
              }

              if (value === 'AMOUNT' && discountMode === 'PERCENTAGE') {
                setDiscountAmount(saleDiscount > 0 ? saleDiscount.toFixed(2) : '')
              }

              setDiscountMode(value)
            }}>
            <ToggleButton value='PERCENTAGE'>%</ToggleButton>
            <ToggleButton value='AMOUNT'>R$</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            error={discountExceedsSubtotal}
            helperText={
              discountExceedsSubtotal
                ? 'Desconto maior que o subtotal.'
                : discountMode === 'PERCENTAGE'
                  ? 'Informe o desconto percentual, se houver.'
                  : 'Informe o desconto em reais, se houver.'
            }
            label={
              discountMode === 'PERCENTAGE'
                ? 'Desconto (%)'
                : 'Desconto (R$)'
            }
            size='medium'
            type='number'
            value={
              discountMode === 'PERCENTAGE'
                ? discountPercentage
                : discountAmount
            }
            onChange={(event) => {
              if (discountMode === 'PERCENTAGE') {
                setDiscountPercentage(event.target.value)
              } else {
                setDiscountAmount(event.target.value)
              }
            }}
            slotProps={{
              htmlInput:
                discountMode === 'PERCENTAGE'
                  ? { min: '0', max: '100', step: '0.01' }
                  : { min: '0', step: '0.01' },
            }}
          />
        </div>
        <TextField
          disabled
          label='Total final'
          size='medium'
          value={formatCurrency(saleTotal)}
        />
      </FormRow>
      <InlineNote>
        Desconto aplicado: {formatCurrency(saleDiscount)}
      </InlineNote>
      <ActionGroup>
        {hasEmptyItem ? <InlineNote>Selecione o produto de todos os itens.</InlineNote> : null}
        {hasInvalidUnitPrice ? (
          <InlineNote>Informe o valor unitário de todos os itens.</InlineNote>
        ) : null}
        {hasInvalidItemDiscount ? (
          <InlineNote>O desconto de um item não pode ser maior que seu subtotal.</InlineNote>
        ) : null}
        <SecondaryButton type='button' onClick={onCancel}>
          Cancelar
        </SecondaryButton>
        <PrimaryButton
          disabled={
            sale.status !== 'OPEN' ||
            discountExceedsSubtotal ||
            hasEmptyItem ||
            hasInvalidUnitPrice ||
            hasInvalidItemDiscount
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

function saleDiscountAmount(
  baseAmount: number,
  mode: SaleDiscountMode,
  percentage: string,
  amount: string,
) {
  if (mode === 'AMOUNT') {
    return moneyInputValue(amount)
  }

  return percentageAmount(baseAmount, Number(percentage || 0))
}

function saleItemDiscountAmount(item: SaleEditItemDraft) {
  const baseAmount = Number(item.quantity || 0) * moneyInputValue(item.unitPrice)

  if (item.discountMode === 'PERCENTAGE') {
    return percentageAmount(baseAmount, Number(item.discountPercentage || 0))
  }

  return moneyInputValue(item.discountAmount)
}

function saleItemDiscountModeInput(
  mode: SaleDiscountMode,
  baseAmount: number,
  currentDiscount: number,
): Pick<
  SaleEditItemDraft,
  'discountMode' | 'discountPercentage' | 'discountAmount'
> {
  if (mode === 'PERCENTAGE') {
    return {
      discountMode: mode,
      discountPercentage:
        baseAmount > 0 && currentDiscount > 0
          ? Number(((currentDiscount / baseAmount) * 100).toFixed(2)).toString()
          : '',
      discountAmount: '',
    }
  }

  return {
    discountMode: mode,
    discountPercentage: '',
    discountAmount: currentDiscount > 0 ? currentDiscount.toFixed(2) : '0',
  }
}

function percentageAmount(baseAmount: number, percentage: number) {
  return Number(((baseAmount * percentage) / 100).toFixed(2))
}

function moneyInputValue(value: string) {
  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}
