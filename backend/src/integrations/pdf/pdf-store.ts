import { env } from '../../config/env.js'
import type { QuotePdfStore } from './templates/quote-pdf-template.js'
import { pdfAssetDataUri } from './pdf-assets.js'

const legacyStoreNames: Record<string, string> = {
  'Filtros MG': 'MG Trator Peças',
}

export function pdfStoreWithLogo(): QuotePdfStore {
  return {
    ...env.quotePdfStore,
    name: legacyStoreNames[env.quotePdfStore.name] ?? env.quotePdfStore.name,
    logoDataUri: pdfAssetDataUri(
      'logo_mgtratorpecas_png_azul.png',
      'image/png',
    ),
  }
}
