import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FiscalSettings } from '../../api'
import { FormCard, FormGrid, FormRow, PageHeader } from '../../components/layout'
import { PrimaryButton, StatusChip } from '../../components/ui'

type FiscalSettingsInput = Pick<
  FiscalSettings,
  | 'allowProduction'
  | 'companyCnpj'
  | 'defaultCofinsCst'
  | 'defaultIcmsCst'
  | 'defaultNatureOperation'
  | 'defaultPisCst'
  | 'defaultSaleCfop'
  | 'environment'
  | 'provider'
> & {
  productionConfirmation?: string | null
}

const productionConfirmationPhrase = 'EMITIR EM PRODUCAO'

const productionChecklistItems = [
  {
    id: 'homologation',
    label: 'Emissao, sincronizacao, reemissao e cancelamento foram testados em homologacao.',
  },
  {
    id: 'focusPanel',
    label: 'Token, serie, proximo numero e certificado foram conferidos no painel Focus.',
  },
  {
    id: 'fiscalData',
    label: 'Dados fiscais da loja, clientes e produtos foram revisados antes da producao.',
  },
]

const providerOptions: Array<{
  label: string
  value: FiscalSettings['provider']
}> = [
  { label: 'Mock interno', value: 'MOCK' },
  { label: 'Focus NFe', value: 'FOCUS' },
]

const environmentOptions: Array<{
  label: string
  value: FiscalSettings['environment']
}> = [
  { label: 'Homologacao', value: 'HOMOLOGATION' },
  { label: 'Producao', value: 'PRODUCTION' },
]

export function FiscalSettingsPage({
  settings,
  onSubmit,
}: {
  settings: FiscalSettings | null
  onSubmit: (input: FiscalSettingsInput) => void
}) {
  const [draft, setDraft] = useState<FiscalSettingsInput>(
    fiscalSettingsInput(settings),
  )
  const [productionChecklist, setProductionChecklist] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    setDraft(fiscalSettingsInput(settings))
    setProductionChecklist({})
  }, [settings])

  const companyCnpjDigits = fiscalDigits(draft.companyCnpj)
  const companyCnpjRequired = draft.provider === 'FOCUS'
  const companyCnpjError = companyCnpjRequired && companyCnpjDigits.length !== 14
  const companyCnpjHelperText = companyCnpjError
    ? 'CNPJ da loja deve conter 14 digitos para usar Focus NFe.'
    : 'Informe 14 digitos para usar Focus NFe. O token geral ou especifico por CNPJ continua no .env.'
  const productionEnvironment = draft.environment === 'PRODUCTION'
  const productionConfirmationError =
    productionEnvironment && !draft.allowProduction
  const productionPhraseRequired =
    productionEnvironment && draft.allowProduction
  const productionPhraseError =
    productionPhraseRequired &&
    draft.productionConfirmation !== productionConfirmationPhrase
  const productionChecklistComplete = productionChecklistItems.every(
    (item) => productionChecklist[item.id],
  )
  const productionChecklistBlocked =
    productionPhraseRequired && !productionChecklistComplete
  const submitBlocked =
    companyCnpjError ||
    productionConfirmationError ||
    productionPhraseError ||
    productionChecklistBlocked

  return (
    <FormGrid
      className='max-w-4xl'
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          ...draft,
          companyCnpj: draft.companyCnpj?.trim() || null,
          productionConfirmation:
            draft.productionConfirmation?.trim() || null,
        })
      }}>
      <PageHeader
        description='Defina o provedor fiscal, ambiente e CNPJ usados na emissao de NF-e.'
        icon={<Settings2 size={18} />}
        title='Configuração fiscal da loja'
      />

      <FiscalSettingsStatus settings={settings} />

      <FormRow>
        <TextField
          label='Provedor fiscal'
          name='provider'
          select
          required
          value={draft.provider}
          onChange={(event) =>
            setDraft((currentDraft) => ({
              ...currentDraft,
              provider: event.target.value as FiscalSettings['provider'],
            }))
          }>
          {providerOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label='Ambiente'
          name='environment'
          select
          required
          value={draft.environment}
          onChange={(event) =>
            setDraft((currentDraft) => ({
              ...currentDraft,
              allowProduction:
                event.target.value === 'PRODUCTION'
                  ? currentDraft.allowProduction
                  : false,
              environment: event.target.value as FiscalSettings['environment'],
              productionConfirmation:
                event.target.value === 'PRODUCTION'
                  ? currentDraft.productionConfirmation
                  : null,
            }))
          }>
          {environmentOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </FormRow>

      <TextField
        error={companyCnpjError}
        helperText={companyCnpjHelperText}
        label='CNPJ emitente'
        name='companyCnpj'
        value={draft.companyCnpj ?? ''}
        onChange={(event) =>
          setDraft((currentDraft) => ({
            ...currentDraft,
            companyCnpj: event.target.value,
          }))
        }
      />

      <FormCard>
        <div className='grid gap-1'>
          <strong className='text-[#2c281e]'>Padrões de emissão NF-e</strong>
          <span className='text-sm text-[#5f665f]'>
            Usados na nota quando a venda estiver pronta para emissão. NCM,
            CEST e origem continuam no cadastro do produto.
          </span>
        </div>
        <TextField
          helperText='Exemplo: Venda de mercadoria.'
          label='Natureza da operação'
          value={draft.defaultNatureOperation ?? ''}
          onChange={(event) =>
            setDraft((currentDraft) => ({
              ...currentDraft,
              defaultNatureOperation: event.target.value,
            }))
          }
        />
        <FormRow>
          <TextField
            helperText='Exemplo: 5102 ou 5405.'
            label='CFOP padrão de venda'
            value={draft.defaultSaleCfop ?? ''}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                defaultSaleCfop: event.target.value,
              }))
            }
          />
          <TextField
            helperText='Exemplo: 102 para Simples Nacional.'
            label='CST/CSOSN ICMS padrão'
            value={draft.defaultIcmsCst ?? ''}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                defaultIcmsCst: event.target.value,
              }))
            }
          />
        </FormRow>
        <FormRow>
          <TextField
            helperText='Exemplo: 49.'
            label='CST PIS padrão'
            value={draft.defaultPisCst ?? ''}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                defaultPisCst: event.target.value,
              }))
            }
          />
          <TextField
            helperText='Exemplo: 49.'
            label='CST COFINS padrão'
            value={draft.defaultCofinsCst ?? ''}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                defaultCofinsCst: event.target.value,
              }))
            }
          />
        </FormRow>
      </FormCard>

      <FormCard>
        <FormControlLabel
          control={
            <Switch
              checked={draft.allowProduction}
              disabled={!productionEnvironment}
              name='allowProduction'
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  allowProduction: event.target.checked,
                  productionConfirmation: event.target.checked
                    ? currentDraft.productionConfirmation
                    : null,
                }))
              }
            />
          }
          label='Permitir emissao em producao'
        />
        <Alert severity='warning'>
          Producao gera documentos com validade fiscal. Mantenha desligado ate
          concluir o checklist fiscal.
        </Alert>
        {productionConfirmationError ? (
          <Alert severity='error'>
            Para salvar o ambiente de producao, ative a confirmacao explicita.
          </Alert>
        ) : null}
        {productionPhraseRequired ? (
          <FiscalProductionChecklist
            checklist={productionChecklist}
            phrase={draft.productionConfirmation}
            phraseError={productionPhraseError}
            onChecklistChange={(id, checked) =>
              setProductionChecklist((currentChecklist) => ({
                ...currentChecklist,
                [id]: checked,
              }))
            }
            onPhraseChange={(value) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                productionConfirmation: value,
              }))
            }
          />
        ) : null}
      </FormCard>

      <div className='flex justify-end'>
        <PrimaryButton disabled={submitBlocked} type='submit'>
          Salvar configuracao fiscal
        </PrimaryButton>
      </div>
    </FormGrid>
  )
}

function FiscalProductionChecklist({
  checklist,
  phrase,
  phraseError,
  onChecklistChange,
  onPhraseChange,
}: {
  checklist: Record<string, boolean>
  phrase?: string | null
  phraseError: boolean
  onChecklistChange: (id: string, checked: boolean) => void
  onPhraseChange: (value: string) => void
}) {
  return (
    <div className='grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4'>
      <Alert severity='warning'>
        Checklist final antes de liberar NF-e em producao.
      </Alert>
      <FormGroup className='grid gap-2'>
        {productionChecklistItems.map((item) => (
          <FormControlLabel
            key={item.id}
            control={
              <Checkbox
                checked={Boolean(checklist[item.id])}
                onChange={(event) =>
                  onChecklistChange(item.id, event.target.checked)
                }
              />
            }
            label={item.label}
          />
        ))}
      </FormGroup>
      <TextField
        error={phraseError}
        helperText={`Digite exatamente ${productionConfirmationPhrase} para liberar producao.`}
        label='Confirmacao de producao'
        name='productionConfirmation'
        value={phrase ?? ''}
        onChange={(event) => onPhraseChange(event.target.value)}
      />
    </div>
  )
}

function fiscalSettingsInput(
  settings: FiscalSettings | null,
): FiscalSettingsInput {
  return {
    allowProduction: settings?.allowProduction ?? false,
    companyCnpj: settings?.companyCnpj ?? null,
    defaultCofinsCst: settings?.defaultCofinsCst ?? '49',
    defaultIcmsCst: settings?.defaultIcmsCst ?? '102',
    defaultNatureOperation:
      settings?.defaultNatureOperation ?? 'Venda de mercadoria',
    defaultPisCst: settings?.defaultPisCst ?? '49',
    defaultSaleCfop: settings?.defaultSaleCfop ?? '5102',
    environment: settings?.environment ?? 'HOMOLOGATION',
    provider: settings?.provider ?? 'MOCK',
    productionConfirmation: null,
  }
}

function fiscalDigits(value?: string | null) {
  return value?.replace(/\D/g, '') ?? ''
}

function FiscalSettingsStatus({
  settings,
}: {
  settings: FiscalSettings | null
}) {
  return (
    <div className='flex flex-wrap gap-2'>
      <StatusChip label={settings?.provider ?? 'MOCK'} tone='neutral' />
      <StatusChip
        label={
          settings?.environment === 'PRODUCTION' ? 'Producao' : 'Homologacao'
        }
        tone={settings?.environment === 'PRODUCTION' ? 'warning' : 'success'}
      />
      <StatusChip
        label={
          settings?.allowProduction
            ? 'Producao liberada'
            : 'Producao bloqueada'
        }
        tone={settings?.allowProduction ? 'warning' : 'success'}
      />
    </div>
  )
}
