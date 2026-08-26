import type { Client, Product } from '../../api'

export type FiscalReadinessItem = {
  productId: string
  productName: string
  productNcm?: string | null
  productOrigin?: string | null
}

export type FiscalReadinessClient = {
  name?: string | null
  personType?: Client['personType'] | null
  document?: string | null
  stateRegistration?: string | null
  stateRegistrationIndicator?: Client['stateRegistrationIndicator']
  addressStreet?: string | null
  addressNumber?: string | null
  addressDistrict?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressZipCode?: string | null
}

type FiscalReadinessInput = {
  client?: FiscalReadinessClient
  items: FiscalReadinessItem[]
  products: Product[]
}

export function fiscalReadinessIssues({
  client,
  items,
  products,
}: FiscalReadinessInput) {
  return [
    ...clientReadinessIssues(client),
    ...items.flatMap((item) =>
      productReadinessIssues(findProduct(products, item.productId), item),
    ),
  ]
}

export function findClient(clients: Client[], clientId: string | null) {
  return clients.find((client) => client.id === clientId)
}

function clientReadinessIssues(client?: FiscalReadinessClient) {
  const personType = client?.personType ?? 'PF'
  const documentRequired = personType !== 'ES'
  const fieldChecks: Array<[unknown, string]> = [
    [client, 'Cliente deve estar cadastrado.'],
    [client?.name, 'Nome do cliente pendente.'],
    [
      documentRequired ? client?.document : true,
      'CPF/CNPJ do cliente pendente.',
    ],
    [client?.addressStreet, 'Logradouro do cliente pendente.'],
    [client?.addressNumber, 'Numero do cliente pendente.'],
    [client?.addressDistrict, 'Bairro do cliente pendente.'],
    [client?.addressCity, 'Cidade do cliente pendente.'],
    [client?.addressState, 'UF do cliente pendente.'],
    [client?.addressZipCode, 'CEP do cliente pendente.'],
    [
      client?.stateRegistrationIndicator === '1'
        ? client?.stateRegistration
        : true,
      'Inscricao estadual do cliente pendente.',
    ],
  ]

  return [
    ...missingMessages(fieldChecks),
    ...clientFiscalFormatIssues(client),
  ]
}

function productReadinessIssues(
  product: Product | undefined,
  item: FiscalReadinessItem,
) {
  const label = item.productName
  const fieldChecks: Array<[unknown, string]> = [
    [item.productId, `Produto ${label} deve estar cadastrado.`],
    [item.productNcm ?? product?.ncm, `NCM pendente em ${label}.`],
    [item.productOrigin ?? product?.origin, `Origem fiscal pendente em ${label}.`],
  ]

  return [
    ...missingMessages(fieldChecks),
    ...productFiscalFormatIssues(product, item, label),
  ]
}

function missingMessages(fieldChecks: Array<[unknown, string]>) {
  return fieldChecks
    .filter(([value]) => !value)
    .map(([_value, message]) => message)
}

function clientFiscalFormatIssues(client?: FiscalReadinessClient) {
  if (!client) {
    return []
  }

  const documentPatternsByPersonType: Record<Client['personType'], RegExp | null> =
    {
      ES: null,
      PF: /^\d{11}$/,
      PJ: /^\d{14}$/,
    }
  const fieldChecks: Array<[unknown, RegExp | null, string]> = [
    [
      fiscalDigits(client?.document),
      documentPatternsByPersonType[client.personType ?? 'PF'],
      'CPF/CNPJ do cliente deve conter 11 ou 14 digitos.',
    ],
    [
      client?.addressState,
      /^[A-Z]{2}$/i,
      'UF do cliente deve conter 2 letras.',
    ],
    [
      fiscalDigits(client?.addressZipCode),
      /^\d{8}$/,
      'CEP do cliente deve conter 8 digitos.',
    ],
  ]

  return invalidMessages(fieldChecks)
}

function productFiscalFormatIssues(
  product: Product | undefined,
  item: FiscalReadinessItem,
  label: string,
) {
  const ncm = item.productNcm ?? product?.ncm
  const origin = item.productOrigin ?? product?.origin

  if (!ncm && !origin) {
    return []
  }

  const fieldChecks: Array<[unknown, RegExp, string]> = [
    [ncm, /^\d{8}$/, `NCM de ${label} deve conter 8 digitos.`],
    [
      origin,
      /^[0-8]$/,
      `Origem fiscal de ${label} deve estar entre 0 e 8.`,
    ],
  ]

  return invalidMessages(fieldChecks)
}

function invalidMessages(
  fieldChecks: Array<[unknown, RegExp | null, string]>,
) {
  return fieldChecks
    .filter(([value, pattern]) =>
      Boolean(value) && pattern ? !pattern.test(String(value)) : false,
    )
    .map(([_value, _pattern, message]) => message)
}

function fiscalDigits(value?: string | null) {
  const normalized = value?.replace(/\D/g, '')
  return normalized || null
}

function findProduct(products: Product[], productId: string) {
  return products.find((product) => product.id === productId)
}
