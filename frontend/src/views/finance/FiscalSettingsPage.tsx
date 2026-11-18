import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { Pencil, Plus, Settings2, Wrench } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { FiscalService, FiscalSettings } from '../../api'
import {
  FormCard,
  FormGrid,
  FormRow,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionsMenu,
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { issRateInputProps } from '../../utils/numericInput'

type FiscalSettingsInput = Pick<
  FiscalSettings,
  | 'allowProduction'
  | 'companyCnpj'
  | 'defaultCofinsCst'
  | 'defaultIcmsCst'
  | 'defaultNatureOperation'
  | 'defaultPisCst'
  | 'defaultSaleCfop'
  | 'municipalRegistration'
  | 'serviceMunicipalityName'
  | 'serviceMunicipalityState'
  | 'serviceMunicipalityIbgeCode'
  | 'serviceTaxRegime'
  | 'defaultIssRate'
  | 'defaultRetainPis'
  | 'defaultRetainCofins'
  | 'defaultRetainCsll'
  | 'defaultRetainIr'
  | 'defaultRetainInss'
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
    label: 'Token e certificado foram conferidos; para NFS-e, o Ambiente Nacional está habilitado e a NFS-e municipal está desabilitada no painel Focus.',
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
  { label: 'Focus NFe (NF-e e NFS-e)', value: 'FOCUS' },
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
  services,
  onSaveService,
  onSubmit,
}: {
  settings: FiscalSettings | null
  services: FiscalService[]
  onSaveService: (
    input: Pick<
      FiscalService,
      | 'active'
      | 'description'
      | 'issRate'
      | 'municipalActivityCode'
      | 'municipalTaxCode'
      | 'name'
      | 'nationalTaxCode'
      | 'nbsCode'
    >,
    service?: FiscalService,
  ) => Promise<unknown> | unknown
  onSubmit: (input: FiscalSettingsInput) => Promise<unknown> | unknown
}) {
  const [draft, setDraft] = useState<FiscalSettingsInput>(
    fiscalSettingsInput(settings),
  )
  const [productionChecklist, setProductionChecklist] = useState<
    Record<string, boolean>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

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
  const serviceMunicipalityIbgeCode =
    draft.serviceMunicipalityIbgeCode?.trim() ?? ''
  const serviceMunicipalityIbgeError =
    serviceMunicipalityIbgeCode.length > 0 &&
    serviceMunicipalityIbgeCode.length !== 7
  const defaultIssRate = Number(draft.defaultIssRate)
  const defaultIssRateError =
    draft.defaultIssRate.trim() === '' ||
    !Number.isFinite(defaultIssRate) ||
    defaultIssRate < 2 ||
    defaultIssRate > 5
  const submitBlocked =
    companyCnpjError ||
    serviceMunicipalityIbgeError ||
    defaultIssRateError ||
    productionConfirmationError ||
    productionPhraseError ||
    productionChecklistBlocked

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submittingRef.current || submitBlocked) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)

    try {
      await onSubmit({
        ...draft,
        companyCnpj: draft.companyCnpj?.trim() || null,
        productionConfirmation: draft.productionConfirmation?.trim() || null,
      })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className='grid max-w-5xl gap-6'>
      <FormGrid onSubmit={submit}>
      <PageHeader
        description='Defina os dados da filial usados na emissão de NF-e e NFS-e.'
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
            helperText='O sistema usa 5.403 dentro do estado e 6.403 em operações interestaduais.'
            label='CFOP padrão de venda'
            select
            value={draft.defaultSaleCfop ?? ''}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                defaultSaleCfop: event.target.value,
              }))
            }
          >
            <MenuItem value='5403'>5.403 / 6.403 - Venda com ST</MenuItem>
          </TextField>
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
        <div className='grid gap-1'>
          <strong className='text-[#2c281e]'>Padrões de emissão NFS-e</strong>
          <span className='text-sm text-[#5f665f]'>
            Configuração da filial para serviços. A retenção do ISS será
            confirmada individualmente em cada emissão.
          </span>
        </div>
        <Alert severity='info'>
          Para empresas do Simples Nacional, a emissão usa o Ambiente Nacional
          da NFS-e e o layout DPS. Em produção, habilite essa opção e desabilite
          a NFS-e municipal no painel da Focus.
        </Alert>
        <FormRow>
          <TextField
            helperText='Cadastro municipal da filial prestadora.'
            label='Inscrição municipal'
            value={draft.municipalRegistration ?? ''}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                municipalRegistration: event.target.value,
              }))
            }
          />
          <TextField
            label='Regime tributário do serviço'
            select
            value={draft.serviceTaxRegime}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                serviceTaxRegime: event.target
                  .value as FiscalSettings['serviceTaxRegime'],
              }))
            }>
            <MenuItem value='SIMPLES_NACIONAL_NORMAL'>
              Simples Nacional normal
            </MenuItem>
          </TextField>
        </FormRow>
        <FormRow columns={3}>
          <TextField
            label='Município de incidência'
            value={draft.serviceMunicipalityName ?? ''}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                serviceMunicipalityName: event.target.value,
              }))
            }
          />
          <TextField
            label='UF'
            value={draft.serviceMunicipalityState ?? ''}
            slotProps={{ htmlInput: { maxLength: 2 } }}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                serviceMunicipalityState: event.target.value.toUpperCase(),
              }))
            }
          />
          <TextField
            error={serviceMunicipalityIbgeError}
            helperText={
              serviceMunicipalityIbgeError
                ? 'Informe exatamente os 7 dígitos do código IBGE.'
                : 'Código de 7 dígitos do IBGE.'
            }
            label='Código IBGE do município'
            value={draft.serviceMunicipalityIbgeCode ?? ''}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 7 } }}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                serviceMunicipalityIbgeCode: event.target.value.replace(
                  /\D/g,
                  '',
                ),
              }))
            }
          />
        </FormRow>
        <TextField
          error={defaultIssRateError}
          helperText={
            defaultIssRateError
              ? 'Informe uma alíquota entre 2% e 5%.'
              : 'Inicia em 2% e deve ser atualizada quando a contabilidade ou a prefeitura comunicar uma mudança.'
          }
          label='Alíquota padrão de ISS (%)'
          type='number'
          value={draft.defaultIssRate}
          slotProps={{ htmlInput: issRateInputProps }}
          onChange={(event) =>
            setDraft((currentDraft) => ({
              ...currentDraft,
              defaultIssRate: event.target.value,
            }))
          }
        />
        <Alert severity='warning'>
          Antes de emitir NFS-e, o sistema apresentará esta alíquota para
          conferência. Se a prefeitura passar a reconhecer uma alíquota maior,
          atualize este campo antes da próxima emissão.
        </Alert>
        <div className='grid gap-2'>
          <strong className='text-sm text-[#2c281e]'>
            Retenções federais padrão
          </strong>
          <span className='text-xs text-[#5f665f]'>
            PIS, COFINS, CSLL, IRRF e INSS foram informados sem retenção. Ative
            somente se a contabilidade orientar uma exceção.
          </span>
          <FormGroup className='grid gap-1 sm:grid-cols-2 lg:grid-cols-3'>
            {([
              ['defaultRetainPis', 'Reter PIS'],
              ['defaultRetainCofins', 'Reter COFINS'],
              ['defaultRetainCsll', 'Reter CSLL'],
              ['defaultRetainIr', 'Reter IRRF'],
              ['defaultRetainInss', 'Reter INSS'],
            ] as const).map(([field, label]) => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    checked={draft[field]}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        [field]: event.target.checked,
                      }))
                    }
                  />
                }
                label={label}
              />
            ))}
          </FormGroup>
        </div>
        <Alert severity='info'>
          “ISS retido pelo tomador” não é fixo nesta configuração: a escolha
          entre Sim e Não fará parte do formulário de cada NFS-e.
        </Alert>
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
        <PrimaryButton
          disabled={submitBlocked || submitting}
          loading={submitting}
          type='submit'>
          {submitting
            ? 'Salvando configuração fiscal…'
            : 'Salvar configuracao fiscal'}
        </PrimaryButton>
      </div>
      </FormGrid>

      <FiscalServicesManager
        defaultIssRate={draft.defaultIssRate}
        services={services}
        onSave={onSaveService}
      />
    </section>
  )
}

function FiscalServicesManager({
  defaultIssRate,
  services,
  onSave,
}: {
  defaultIssRate: string
  services: FiscalService[]
  onSave: (
    input: Pick<
      FiscalService,
      | 'active'
      | 'description'
      | 'issRate'
      | 'municipalActivityCode'
      | 'municipalTaxCode'
      | 'name'
      | 'nationalTaxCode'
      | 'nbsCode'
    >,
    service?: FiscalService,
  ) => Promise<unknown> | unknown
}) {
  const [selectedService, setSelectedService] = useState<FiscalService>()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const { pagination, visibleItems } = usePaginatedRows(services)

  async function submitService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submittingRef.current) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    const formElement = event.currentTarget
    const form = new FormData(formElement)

    try {
      const saved = await onSave(
        {
          active: selectedService
            ? String(form.get('active')) === 'true'
            : true,
          description: String(form.get('description') ?? '').trim() || null,
          issRate: String(form.get('issRate') ?? defaultIssRate),
          municipalActivityCode:
            String(form.get('municipalActivityCode') ?? '').replace(/\D/g, '') ||
            null,
          municipalTaxCode:
            String(form.get('municipalTaxCode') ?? '').trim() || null,
          name: String(form.get('name') ?? '').trim(),
          nationalTaxCode: String(
            form.get('nationalTaxCode') ?? '',
          ).replace(/\D/g, ''),
          nbsCode:
            String(form.get('nbsCode') ?? '').replace(/\D/g, '') || null,
        },
        selectedService,
      )

      if (saved) {
        setSelectedService(undefined)
        formElement.reset()
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className='grid gap-5'>
      <FormGrid
        key={selectedService?.id ?? 'new-service'}
        onSubmit={submitService}>
        <PageHeader
          description='Serviços não movimentam estoque e são usados na preparação da NFS-e.'
          icon={<Wrench size={18} />}
          title={selectedService ? 'Editar serviço' : 'Cadastrar serviço'}
        />
        <TextField
          defaultValue={selectedService?.name ?? ''}
          label='Nome do serviço'
          name='name'
          required
        />
        <FormRow>
          <TextField
            defaultValue={selectedService?.nationalTaxCode ?? '140101'}
            helperText='Manutenção de máquinas, equipamentos e veículos: 14.01.01.'
            label='Código nacional de tributação'
            name='nationalTaxCode'
            required
          />
          <TextField
            defaultValue={selectedService?.issRate ?? defaultIssRate ?? '2.00'}
            label='Alíquota de ISS (%)'
            name='issRate'
            required
            type='number'
            slotProps={{ htmlInput: issRateInputProps }}
          />
        </FormRow>
        <FormRow>
          <TextField
            defaultValue={selectedService?.nbsCode ?? ''}
            helperText='Caminhões: 120013110. Linha amarela: 120018900.'
            label='Código NBS'
            name='nbsCode'
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 9 } }}
          />
          <TextField
            defaultValue={selectedService?.municipalTaxCode ?? ''}
            helperText='Preencha somente quando o município exigir um código próprio.'
            label='Código municipal do serviço'
            name='municipalTaxCode'
          />
        </FormRow>
        <TextField
          defaultValue={selectedService?.municipalActivityCode ?? ''}
          helperText='São Luís: informe o ID de 9 dígitos da atividade vinculada ao serviço. Deixe vazio quando não for exigido.'
          label='ID da atividade municipal'
          name='municipalActivityCode'
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 9 } }}
        />
        <TextField
          defaultValue={selectedService?.description ?? ''}
          helperText='Texto base que poderá ser revisado na emissão da nota.'
          label='Descrição fiscal do serviço'
          minRows={3}
          multiline
          name='description'
        />
        {selectedService ? (
          <TextField
            defaultValue={String(selectedService.active)}
            label='Status'
            name='active'
            select>
            <MenuItem value='true'>Ativo</MenuItem>
            <MenuItem value='false'>Inativo</MenuItem>
          </TextField>
        ) : null}
        <div className='flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
          {selectedService ? (
            <SecondaryButton
              disabled={submitting}
              type='button'
              onClick={() => setSelectedService(undefined)}>
              Cancelar edição
            </SecondaryButton>
          ) : null}
          <PrimaryButton
            icon={<Plus size={17} />}
            loading={submitting}
            type='submit'>
            {submitting
              ? 'Salvando serviço…'
              : selectedService
                ? 'Salvar alterações'
                : 'Cadastrar serviço'}
          </PrimaryButton>
        </div>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className='text-sm text-[#5f665f]'>
              {services.length} serviço(s)
            </span>
          }
          title='Serviços cadastrados na filial'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Serviço',
              render: (service: FiscalService) => (
                <div className='grid gap-1'>
                  <strong>{service.name}</strong>
                  {service.description ? (
                    <span className='text-xs text-[#5f665f]'>
                      {service.description}
                    </span>
                  ) : null}
                </div>
              ),
            },
            {
              header: 'Códigos fiscais',
              render: (service: FiscalService) => (
                <div className='grid gap-1 text-sm'>
                  <span>Nacional: {formatNationalTaxCode(service.nationalTaxCode)}</span>
                  <span>NBS: {service.nbsCode ?? 'Não informado'}</span>
                  {service.municipalActivityCode ? (
                    <span>Atividade: {service.municipalActivityCode}</span>
                  ) : null}
                </div>
              ),
            },
            {
              header: 'ISS',
              render: (service: FiscalService) =>
                `${Number(service.issRate).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%`,
            },
            {
              header: 'Status',
              render: (service: FiscalService) => (
                <StatusChip
                  label={service.active ? 'Ativo' : 'Inativo'}
                  tone={service.active ? 'success' : 'neutral'}
                />
              ),
            },
            {
              align: 'right' as const,
              header: 'Ações',
              render: (service: FiscalService) => (
                <TableActionsMenu
                  actions={[
                    {
                      icon: <Pencil size={14} />,
                      label: 'Editar',
                      onSelect: () => setSelectedService(service),
                    },
                  ]}
                />
              ),
            },
          ]}
          emptyMessage='Nenhum serviço fiscal cadastrado nesta filial.'
          getRowId={(service) => service.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  )
}

function formatNationalTaxCode(value: string) {
  const digits = value.replace(/\D/g, '')

  return digits.length === 6
    ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
    : value
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
      settings?.defaultNatureOperation ??
      'Venda de mercadoria adquirida ou recebida de terceiros (ST)',
    defaultPisCst: settings?.defaultPisCst ?? '49',
    defaultSaleCfop: settings?.defaultSaleCfop ?? '5403',
    municipalRegistration: settings?.municipalRegistration ?? null,
    serviceMunicipalityName: settings?.serviceMunicipalityName ?? null,
    serviceMunicipalityState: settings?.serviceMunicipalityState ?? null,
    serviceMunicipalityIbgeCode:
      settings?.serviceMunicipalityIbgeCode ?? null,
    serviceTaxRegime:
      settings?.serviceTaxRegime ?? 'SIMPLES_NACIONAL_NORMAL',
    defaultIssRate: settings?.defaultIssRate ?? '2.00',
    defaultRetainPis: settings?.defaultRetainPis ?? false,
    defaultRetainCofins: settings?.defaultRetainCofins ?? false,
    defaultRetainCsll: settings?.defaultRetainCsll ?? false,
    defaultRetainIr: settings?.defaultRetainIr ?? false,
    defaultRetainInss: settings?.defaultRetainInss ?? false,
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
  const serviceSettingsReady = Boolean(
    settings?.municipalRegistration &&
      settings.serviceMunicipalityName &&
      settings.serviceMunicipalityState &&
      settings.serviceMunicipalityIbgeCode,
  )

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
      <StatusChip
        label={
          serviceSettingsReady
            ? 'Dados de serviço configurados'
            : 'Dados de serviço pendentes'
        }
        tone={serviceSettingsReady ? 'success' : 'warning'}
      />
    </div>
  )
}
