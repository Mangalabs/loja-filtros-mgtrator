import type { Client, Product } from '../../api'

type FiscalReadinessInput = {
  client?: Client
  items: Array<{ productId: string; productName: string }>
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

function clientReadinessIssues(client?: Client) {
  const documentRequired = client?.personType !== 'ES'
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
  item: { productName: string },
) {
  const label = item.productName
  const fieldChecks: Array<[unknown, string]> = [
    [product, `Produto ${label} deve estar cadastrado.`],
    [product?.ncm, `NCM pendente em ${label}.`],
    [product?.cfop, `CFOP pendente em ${label}.`],
    [product?.origin, `Origem fiscal pendente em ${label}.`],
    [product?.icmsCst, `CST ICMS pendente em ${label}.`],
    [product?.pisCst, `CST PIS pendente em ${label}.`],
    [product?.cofinsCst, `CST COFINS pendente em ${label}.`],
  ]

  return [
    ...missingMessages(fieldChecks),
    ...productFiscalFormatIssues(product, label),
  ]
}

function missingMessages(fieldChecks: Array<[unknown, string]>) {
  return fieldChecks
    .filter(([value]) => !value)
    .map(([_value, message]) => message)
}

function clientFiscalFormatIssues(client?: Client) {
  const documentPatternsByPersonType: Record<Client['personType'], RegExp | null> =
    {
      ES: null,
      PF: /^\d{11}$/,
      PJ: /^\d{14}$/,
    }
  const fieldChecks: Array<[unknown, RegExp | null, string]> = [
    [
      fiscalDigits(client?.document),
      client ? documentPatternsByPersonType[client.personType] : null,
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

function productFiscalFormatIssues(product: Product | undefined, label: string) {
  const fieldChecks: Array<[unknown, RegExp, string]> = [
    [product?.ncm, /^\d{8}$/, `NCM de ${label} deve conter 8 digitos.`],
    [product?.cfop, /^\d{4}$/, `CFOP de ${label} deve conter 4 digitos.`],
    [
      product?.origin,
      /^[0-8]$/,
      `Origem fiscal de ${label} deve estar entre 0 e 8.`,
    ],
    [
      product?.icmsCst,
      /^\d{2,3}$/,
      `CST ICMS de ${label} deve conter 2 ou 3 digitos.`,
    ],
    [
      product?.pisCst,
      /^\d{2}$/,
      `CST PIS de ${label} deve conter 2 digitos.`,
    ],
    [
      product?.cofinsCst,
      /^\d{2}$/,
      `CST COFINS de ${label} deve conter 2 digitos.`,
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
