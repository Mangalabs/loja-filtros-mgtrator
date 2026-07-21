import { env } from '../../config/env.js'
import type { QuotePdfStore } from './templates/quote-pdf-template.js'
import { pdfAssetDataUri } from './pdf-assets.js'

export type PdfStoreProfile = {
  legalName?: string | null
  tradeName?: string | null
  document?: string | null
  stateRegistration?: string | null
  addressStreet?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  addressDistrict?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressZipCode?: string | null
  phone?: string | null
  email?: string | null
}

const legacyStoreNames: Record<string, string> = {
  'Filtros MG': 'MG Trator Peças',
}

export function pdfStoreWithLogo(
  profile?: PdfStoreProfile | null,
): QuotePdfStore {
  return {
    ...env.quotePdfStore,
    name: storeDisplayName(
      profile?.tradeName ??
      profile?.legalName ??
      env.quotePdfStore.name,
    ),
    address: branchAddress(profile) ?? env.quotePdfStore.address,
    city: branchCity(profile) ?? env.quotePdfStore.city,
    document: branchDocument(profile) ?? env.quotePdfStore.document,
    phone: profile?.phone ?? env.quotePdfStore.phone,
    email: profile?.email ?? env.quotePdfStore.email,
    logoDataUri: pdfAssetDataUri(
      'logo_mgtratorpecas_png_azul.png',
      'image/png',
    ),
  }
}

function storeDisplayName(name: string) {
  return legacyStoreNames[name] ?? name
}

function branchAddress(profile?: PdfStoreProfile | null) {
  const address = [
    profile?.addressStreet,
    profile?.addressNumber,
    profile?.addressComplement,
    profile?.addressDistrict,
    profile?.addressZipCode,
  ]
    .filter(Boolean)
    .join(', ')

  return address || null
}

function branchCity(profile?: PdfStoreProfile | null) {
  const city = [profile?.addressCity, profile?.addressState]
    .filter(Boolean)
    .join('/')

  return city || null
}

function branchDocument(profile?: PdfStoreProfile | null) {
  const document = profile?.document ? `CNPJ: ${profile.document}` : null
  const stateRegistration = profile?.stateRegistration
    ? `IE: ${profile.stateRegistration}`
    : null
  const display = [document, stateRegistration].filter(Boolean).join(' | ')

  return display || null
}
