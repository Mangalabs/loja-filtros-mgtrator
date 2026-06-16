import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
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
  'allowProduction' | 'companyCnpj' | 'environment' | 'provider'
>

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

  useEffect(() => {
    setDraft(fiscalSettingsInput(settings))
  }, [settings])

  const companyCnpjDigits = fiscalDigits(draft.companyCnpj)
  const companyCnpjRequired = draft.provider === 'FOCUS'
  const companyCnpjError = companyCnpjRequired && companyCnpjDigits.length !== 14
  const companyCnpjHelperText = companyCnpjError
    ? 'CNPJ da loja deve conter 14 digitos para usar Focus NFe.'
    : 'Informe 14 digitos para usar Focus NFe. O token da Focus continua no .env.'
  const productionEnvironment = draft.environment === 'PRODUCTION'
  const productionConfirmationError =
    productionEnvironment && !draft.allowProduction
  const submitBlocked = companyCnpjError || productionConfirmationError

  return (
    <FormGrid
      className='max-w-4xl'
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          ...draft,
          companyCnpj: draft.companyCnpj?.trim() || null,
        })
      }}>
      <PageHeader
        description='Defina o provedor fiscal, ambiente e CNPJ usados na emissao de NF-e.'
        icon={<Settings2 size={18} />}
        title='Configuracao fiscal da loja'
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
      </FormCard>

      <div className='flex justify-end'>
        <PrimaryButton disabled={submitBlocked} type='submit'>
          Salvar configuracao fiscal
        </PrimaryButton>
      </div>
    </FormGrid>
  )
}

function fiscalSettingsInput(
  settings: FiscalSettings | null,
): FiscalSettingsInput {
  return {
    allowProduction: settings?.allowProduction ?? false,
    companyCnpj: settings?.companyCnpj ?? null,
    environment: settings?.environment ?? 'HOMOLOGATION',
    provider: settings?.provider ?? 'MOCK',
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
