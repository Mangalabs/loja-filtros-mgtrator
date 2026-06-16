import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { Settings2 } from 'lucide-react'
import type { FiscalSettings } from '../../api'
import { FormCard, FormGrid, FormRow, PageHeader } from '../../components/layout'
import { PrimaryButton, StatusChip } from '../../components/ui'

type FiscalSettingsInput = Pick<
  FiscalSettings,
  'allowProduction' | 'companyCnpj' | 'environment' | 'provider'
>

export function FiscalSettingsPage({
  settings,
  onSubmit,
}: {
  settings: FiscalSettings | null
  onSubmit: (input: FiscalSettingsInput) => void
}) {
  return (
    <FormGrid
      className='max-w-4xl'
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)

        onSubmit({
          allowProduction: form.get('allowProduction') === 'on',
          companyCnpj: String(form.get('companyCnpj') ?? '').trim() || null,
          environment: String(
            form.get('environment') ?? 'HOMOLOGATION',
          ) as FiscalSettings['environment'],
          provider: String(
            form.get('provider') ?? 'MOCK',
          ) as FiscalSettings['provider'],
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
          defaultValue={settings?.provider ?? 'MOCK'}
          label='Provedor fiscal'
          name='provider'
          select
          required>
          <MenuItem value='MOCK'>Mock interno</MenuItem>
          <MenuItem value='FOCUS'>Focus NFe</MenuItem>
        </TextField>
        <TextField
          defaultValue={settings?.environment ?? 'HOMOLOGATION'}
          label='Ambiente'
          name='environment'
          select
          required>
          <MenuItem value='HOMOLOGATION'>Homologacao</MenuItem>
          <MenuItem value='PRODUCTION'>Producao</MenuItem>
        </TextField>
      </FormRow>

      <TextField
        defaultValue={settings?.companyCnpj ?? ''}
        helperText='Informe 14 digitos para usar Focus NFe. O token da Focus continua no .env.'
        label='CNPJ emitente'
        name='companyCnpj'
      />

      <FormCard>
        <FormControlLabel
          control={
            <Switch
              defaultChecked={settings?.allowProduction ?? false}
              name='allowProduction'
            />
          }
          label='Permitir emissao em producao'
        />
        <Alert severity='warning'>
          Producao gera documentos com validade fiscal. Mantenha desligado ate
          concluir o checklist fiscal.
        </Alert>
      </FormCard>

      <div className='flex justify-end'>
        <PrimaryButton type='submit'>Salvar configuracao fiscal</PrimaryButton>
      </div>
    </FormGrid>
  )
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
