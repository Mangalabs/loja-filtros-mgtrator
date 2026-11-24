import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import TextField from '@mui/material/TextField'
import { Ban, ExternalLink, FileText, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type {
  Client,
  FiscalService,
  FiscalSettings,
  ServiceFiscalDocument,
  ServiceFiscalDocumentDraft,
  ServiceFiscalDocumentInput,
} from '../../api'
import {
  FormCard,
  FormGrid,
  FormRow,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import { PrimaryButton, SecondaryButton, StatusChip } from '../../components/ui'
import { DraftSharingControl } from '../../components/DraftSharingControl'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { issRateInputProps, positiveMoneyInputProps } from '../../utils/numericInput'

type DraftForm = {
  serviceId: string
  competenceDate: string
  serviceDescription: string
  serviceAmount: string
  issRate: string
  issRetained: '' | 'yes' | 'no'
  consumerFinal: '' | 'yes' | 'no'
  additionalInformation: string
  clientId: string
  municipalityIbgeCode: string
}

export function ServiceFiscalDocumentPage({
  clients,
  documents,
  drafts,
  services,
  settings,
  onDelete,
  onCancel,
  onIssue,
  onPreview,
  onSave,
  onShare,
  onSync,
}: {
  clients: Client[]
  documents: ServiceFiscalDocument[]
  drafts: ServiceFiscalDocumentDraft[]
  services: FiscalService[]
  settings: FiscalSettings | null
  onCancel: (
    document: ServiceFiscalDocument,
    justification: string,
  ) => Promise<boolean> | boolean
  onDelete: (draft: ServiceFiscalDocumentDraft) => Promise<unknown> | unknown
  onIssue: (
    input: ServiceFiscalDocumentInput,
  ) => Promise<ServiceFiscalDocument | null> | ServiceFiscalDocument | null
  onPreview: (input: ServiceFiscalDocumentInput) => Promise<unknown> | unknown
  onSave: (
    input: ServiceFiscalDocumentInput,
    draft?: ServiceFiscalDocumentDraft,
  ) => Promise<ServiceFiscalDocumentDraft | null> | ServiceFiscalDocumentDraft | null
  onShare: (
    draft: ServiceFiscalDocumentDraft,
    sharedWithUserId: string | null,
  ) => Promise<boolean | void>
  onSync: (
    document: ServiceFiscalDocument,
  ) => Promise<ServiceFiscalDocument> | ServiceFiscalDocument
}) {
  const activeServices = useMemo(
    () => services.filter((service) => service.active),
    [services],
  )
  const activeClients = useMemo(
    () => clients.filter((client) => client.active),
    [clients],
  )
  const [selectedDraft, setSelectedDraft] = useState<ServiceFiscalDocumentDraft>()
  const [form, setForm] = useState<DraftForm>(() => emptyForm(settings))
  const [submitting, setSubmitting] = useState(false)
  const [pendingAction, setPendingAction] = useState<'issue' | 'preview' | 'save'>()
  const [issuedDocument, setIssuedDocument] = useState<ServiceFiscalDocument>()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [historySyncingId, setHistorySyncingId] = useState<string>()
  const [historySyncError, setHistorySyncError] = useState('')
  const [cancellationTarget, setCancellationTarget] =
    useState<ServiceFiscalDocument>()
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const submittingRef = useRef(false)
  const onSyncRef = useRef(onSync)
  const selectedService = services.find((service) => service.id === form.serviceId)
  const selectedClient = clients.find((client) => client.id === form.clientId)
  const readinessIssues = serviceFiscalReadinessIssues(
    settings,
    selectedService,
    selectedClient,
    form.municipalityIbgeCode,
    form.issRetained,
  )
  const productionEnvironment = settings?.environment === 'PRODUCTION'
  const { pagination: documentPagination, visibleItems: visibleDocuments } =
    usePaginatedRows(documents)

  useEffect(() => {
    onSyncRef.current = onSync
  }, [onSync])

  useEffect(() => {
    if (!issuedDocument || issuedDocument.status !== 'PROCESSING') {
      return
    }

    const timeout = window.setTimeout(async () => {
      setSyncing(true)

      try {
        const updated = await onSyncRef.current(issuedDocument)
        setIssuedDocument(updated)
        setSyncError('')
      } catch (error) {
        setSyncError(
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o retorno da NFS-e.',
        )
      } finally {
        setSyncing(false)
      }
    }, syncError ? 10_000 : 5_000)

    return () => window.clearTimeout(timeout)
  }, [issuedDocument, syncError])

  useEffect(() => {
    const processingDocument = documents.find(
      (document) =>
        document.status === 'PROCESSING' &&
        document.id !== issuedDocument?.id,
    )

    if (!processingDocument) {
      return
    }

    let disposed = false
    let timeout: number | undefined
    const schedule = (delay: number) => {
      timeout = window.setTimeout(async () => {
        try {
          await onSyncRef.current(processingDocument)
        } catch {
          // Uma falha temporária não interrompe as próximas tentativas.
        } finally {
          if (!disposed) {
            schedule(10_000)
          }
        }
      }, delay)
    }

    schedule(6_000)

    return () => {
      disposed = true
      if (timeout !== undefined) {
        window.clearTimeout(timeout)
      }
    }
  }, [documents, issuedDocument?.id])

  useEffect(() => {
    if (!selectedDraft) {
      setForm((current) => ({
        ...current,
        issRate: current.serviceId
          ? current.issRate
          : String(settings?.defaultIssRate ?? '2'),
      }))
    }
  }, [settings, selectedDraft])

  useEffect(() => {
    if (
      selectedDraft &&
      !drafts.some((draft) => draft.id === selectedDraft.id)
    ) {
      setSelectedDraft(undefined)
    }
  }, [drafts, selectedDraft])

  function loadDraft(draft: ServiceFiscalDocumentDraft | null) {
    setSelectedDraft(draft ?? undefined)

    if (draft) {
      setForm(formFromDraft(draft))
    }
  }

  function selectService(service: FiscalService | null) {
    setForm((current) => ({
      ...current,
      serviceId: service?.id ?? '',
      serviceDescription: service?.description ?? '',
      issRate: service?.issRate ?? String(settings?.defaultIssRate ?? '2'),
    }))
  }

  function selectClient(client: Client | null) {
    setForm((current) => ({
      ...current,
      clientId: client?.id ?? '',
      municipalityIbgeCode: '',
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      submittingRef.current ||
      !selectedClient ||
      !selectedService ||
      !form.issRetained ||
      !form.consumerFinal
    ) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const action =
      submitter instanceof HTMLButtonElement && submitter.value === 'preview'
        ? 'preview'
        : submitter instanceof HTMLButtonElement && submitter.value === 'issue'
          ? 'issue'
          : 'save'
    setPendingAction(action)

    try {
      const input = serviceFiscalDocumentInput(form, selectedClient)

      if (action === 'preview') {
        await onPreview(input)
      } else if (action === 'issue') {
        const issued = await onIssue(input)

        if (issued) {
          setIssuedDocument(issued)
        }
      } else {
        const savedDraft = await onSave(input, selectedDraft)

        if (savedDraft) {
          setSelectedDraft(savedDraft)
        }
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
      setPendingAction(undefined)
    }
  }

  async function syncIssuedDocument() {
    if (!issuedDocument || syncing) {
      return
    }

    setSyncing(true)

    try {
      const updated = await onSyncRef.current(issuedDocument)
      setIssuedDocument(updated)
      setSyncError('')
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar o retorno da NFS-e.',
      )
    } finally {
      setSyncing(false)
    }
  }

  async function syncHistoryDocument(document: ServiceFiscalDocument) {
    if (historySyncingId) {
      return
    }

    setHistorySyncingId(document.id)

    try {
      await onSyncRef.current(document)
      setHistorySyncError('')
    } catch (error) {
      setHistorySyncError(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar o retorno da NFS-e.',
      )
    } finally {
      setHistorySyncingId(undefined)
    }
  }

  async function cancelAuthorizedDocument() {
    if (
      !cancellationTarget ||
      cancellationReason.trim().length < 15 ||
      cancelling
    ) {
      return
    }

    setCancelling(true)

    try {
      const cancelled = await onCancel(
        cancellationTarget,
        cancellationReason.trim(),
      )

      if (cancelled) {
        setCancellationTarget(undefined)
        setCancellationReason('')
      }
    } finally {
      setCancelling(false)
    }
  }

  return (
    <section className='grid max-w-5xl gap-6'>
      <FormGrid onSubmit={submit}>
        <PageHeader
          description={`Prepare os dados da nota de serviço, confira a prévia e envie para ${productionEnvironment ? 'produção' : 'homologação'}.`}
          icon={<FileText size={18} />}
          title='Preparar NFS-e'
        />

        <Alert
          id='service-fiscal-transmission-notice'
          severity={productionEnvironment ? 'error' : 'warning'}>
          {productionEnvironment
            ? 'Ambiente de produção: a NFS-e emitida terá valor fiscal. Antes de emitir, confirme no painel da Focus que “Ambiente da NFS-e Nacional” está habilitado e “NFS-e” municipal está desabilitado para esta empresa.'
            : 'Ambiente de homologação: os documentos enviados são testes e não possuem valor fiscal.'}
        </Alert>

        {issuedDocument ? (
          <div className='grid gap-2'>
            <Alert
              severity={
                issuedDocument.status === 'REJECTED'
                  ? 'error'
                  : issuedDocument.status === 'PROCESSING'
                    ? 'info'
                    : 'success'
              }>
              {serviceFiscalIssueFeedback(issuedDocument)}
            </Alert>
            {issuedDocument.status === 'PROCESSING' ? (
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <span className='text-sm text-[#5f665f]'>
                  O retorno é atualizado automaticamente a cada poucos segundos.
                </span>
                <SecondaryButton
                  disabled={syncing}
                  icon={<RefreshCw size={16} />}
                  loading={syncing}
                  type='button'
                  onClick={() => void syncIssuedDocument()}>
                  {syncing ? 'Atualizando...' : 'Atualizar retorno'}
                </SecondaryButton>
              </div>
            ) : null}
            {syncError ? <Alert severity='warning'>{syncError}</Alert> : null}
          </div>
        ) : null}

        <FormCard>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h3 className='m-0 text-base font-bold text-[#2c281e]'>Rascunhos</h3>
              <p className='mb-0 mt-1 text-sm text-[#5f665f]'>
                Salve o formulário atual ou carregue uma preparação anterior.
              </p>
            </div>
            {selectedDraft ? <StatusChip label='Rascunho salvo' tone='neutral' /> : null}
          </div>
          <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]'>
            <Autocomplete
              getOptionLabel={(draft) =>
                `${draft.title} · ${draft.createdByUserName}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText='Nenhum rascunho salvo'
              options={drafts}
              value={selectedDraft ?? null}
              onChange={(_event, draft) => loadDraft(draft)}
              renderInput={(params) => (
                <TextField {...params} label='Carregar rascunho' />
              )}
            />
            <SecondaryButton
              disabled={submitting}
              icon={<Save size={17} />}
              loading={pendingAction === 'save'}
              type='submit'
              value='save'>
              {pendingAction === 'save'
                ? 'Salvando...'
                : selectedDraft
                  ? 'Atualizar rascunho'
                  : 'Salvar rascunho'}
            </SecondaryButton>
            <div className='flex flex-wrap items-end gap-2'>
              {selectedDraft ? (
                <DraftSharingControl
                  draft={selectedDraft}
                  scope='fiscal'
                  onShare={(sharedWithUserId) =>
                    onShare(selectedDraft, sharedWithUserId)
                  }
                />
              ) : null}
            </div>
            <div className='flex flex-wrap items-end gap-2'>
              {selectedDraft ? (
                <SecondaryButton
                  icon={<Trash2 size={17} />}
                  type='button'
                  onClick={() => void onDelete(selectedDraft)}>
                  Excluir rascunho
                </SecondaryButton>
              ) : null}
            </div>
          </div>
        </FormCard>

        <FormCard>
          <h3 className='m-0 text-base font-bold text-[#2c281e]'>Serviço</h3>
          <FormRow>
            <Autocomplete
              getOptionLabel={(option) => `${option.name} · ${option.nationalTaxCode}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              options={activeServices}
              value={selectedService ?? null}
              onChange={(_event, value) => selectService(value)}
              renderInput={(params) => (
                <TextField {...params} label='Serviço fiscal' required />
              )}
            />
            <TextField
              slotProps={{ inputLabel: { shrink: true } }}
              label='Competência'
              required
              type='date'
              value={form.competenceDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  competenceDate: event.target.value,
                }))
              }
            />
          </FormRow>
          <TextField
            label='Descrição do serviço prestado'
            multiline
            minRows={3}
            required
            value={form.serviceDescription}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                serviceDescription: event.target.value,
              }))
            }
          />
          <FormRow columns={3}>
            <TextField
              slotProps={{ htmlInput: positiveMoneyInputProps }}
              label='Valor do serviço'
              required
              type='number'
              value={form.serviceAmount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  serviceAmount: event.target.value,
                }))
              }
            />
            <TextField
              slotProps={{ htmlInput: issRateInputProps }}
              label='Alíquota do ISS (%)'
              required
              type='number'
              value={form.issRate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  issRate: event.target.value,
                }))
              }
            />
            <FormControl required>
              <FormLabel id='iss-retained-label'>ISS retido pelo tomador?</FormLabel>
              <RadioGroup
                aria-labelledby='iss-retained-label'
                row
                value={form.issRetained}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    issRetained: event.target.value as 'yes' | 'no',
                  }))
                }>
                <FormControlLabel control={<Radio />} label='Sim' value='yes' />
                <FormControlLabel control={<Radio />} label='Não' value='no' />
              </RadioGroup>
            </FormControl>
          </FormRow>
          <FormControl required>
            <FormLabel id='consumer-final-label'>É operação para consumo pessoal?</FormLabel>
            <RadioGroup
              aria-labelledby='consumer-final-label'
              row
              value={form.consumerFinal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  consumerFinal: event.target.value as 'yes' | 'no',
                }))
              }>
              <FormControlLabel control={<Radio />} label='Sim' value='yes' />
              <FormControlLabel control={<Radio />} label='Não' value='no' />
            </RadioGroup>
            <span className='text-xs text-[#5f665f]'>
              Marque Sim somente quando o serviço for destinado ao uso ou consumo pessoal.
            </span>
          </FormControl>
          <Alert severity='warning'>
            A alíquota inicia em 2%, mas deve ser conferida em cada período. Se a contabilidade ou a prefeitura informar mudança, atualize o cadastro do serviço antes da emissão.
          </Alert>
        </FormCard>

        <FormCard>
          <h3 className='m-0 text-base font-bold text-[#2c281e]'>Tomador do serviço</h3>
          <Autocomplete
            getOptionLabel={(option) =>
              option.document ? `${option.name} · ${option.document}` : option.name
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            options={activeClients}
            value={selectedClient ?? null}
            onChange={(_event, value) => selectClient(value)}
            renderInput={(params) => (
              <TextField {...params} label='Cliente cadastrado' required />
            )}
          />
          {selectedClient ? (
            <Alert severity={clientAddressComplete(selectedClient) ? 'success' : 'warning'}>
              {clientAddressComplete(selectedClient)
                ? `${selectedClient.addressStreet}, ${selectedClient.addressNumber} · ${selectedClient.addressCity}/${selectedClient.addressState}`
                : 'O cadastro selecionado está sem parte do endereço exigido para a NFS-e. Complete o cliente antes de salvar.'}
            </Alert>
          ) : null}
          <TextField
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 7 } }}
            label='Código IBGE do município do tomador'
            required
            value={form.municipalityIbgeCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                municipalityIbgeCode: event.target.value.replace(/\D/g, '').slice(0, 7),
              }))
            }
            helperText='Informe os 7 dígitos do município do endereço do cliente.'
          />
        </FormCard>

        <FormCard>
          <h3 className='m-0 text-base font-bold text-[#2c281e]'>Observações</h3>
          <TextField
            label='Informações adicionais'
            multiline
            minRows={2}
            value={form.additionalInformation}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                additionalInformation: event.target.value,
              }))
            }
          />
        </FormCard>

        <FormCard>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='m-0 text-base font-bold text-[#2c281e]'>Prontidão fiscal</h3>
            <StatusChip
              label={readinessIssues.length === 0 ? 'Dados fiscais completos' : 'Configuração pendente'}
              tone={readinessIssues.length === 0 ? 'success' : 'warning'}
            />
          </div>
          {readinessIssues.length > 0 ? (
            <Alert severity='warning'>
              Antes de habilitar a emissão: {readinessIssues.join(' ')}
            </Alert>
          ) : (
            <Alert severity='success'>
              A configuração básica está preenchida. Confira a prévia antes de enviar para {productionEnvironment ? 'produção' : 'homologação'}.
            </Alert>
          )}
          <p className='m-0 text-sm text-[#5f665f]'>
            PIS, COFINS, CSLL, IRRF e INSS permanecem sem retenção conforme a orientação informada para as duas unidades.
          </p>
        </FormCard>

        <div className='flex flex-wrap justify-end gap-2'>
          <SecondaryButton
            disabled={
              submitting ||
              !selectedClient ||
              !selectedService ||
              !selectedService.active ||
              !form.issRetained ||
              !form.consumerFinal ||
              !clientAddressComplete(selectedClient)
            }
            type='submit'
            value='preview'>
            {pendingAction === 'preview'
              ? 'Gerando prévia...'
              : 'Pré-visualizar NFS-e'}
          </SecondaryButton>
          <PrimaryButton
            aria-describedby='service-fiscal-transmission-notice'
            disabled={
              submitting ||
              !form.consumerFinal ||
              readinessIssues.length > 0 ||
              !settings
            }
            loading={pendingAction === 'issue'}
            type='submit'
            value='issue'>
            {pendingAction === 'issue'
              ? 'Enviando...'
              : `Emitir NFS-e em ${productionEnvironment ? 'produção' : 'homologação'}`}
          </PrimaryButton>
        </div>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          description='Acompanhe processamento, rejeições, documentos autorizados e cancelamentos.'
          title='Histórico de NFS-e'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'NFS-e',
              render: (document: ServiceFiscalDocument) => (
                <div className='grid gap-1'>
                  <strong>{document.nfseNumber ?? `DPS ${document.dpsNumber}`}</strong>
                  <span className='text-xs text-[#5f665f]'>
                    {document.environment === 'PRODUCTION' ? 'Produção' : 'Homologação'}
                  </span>
                </div>
              ),
            },
            {
              header: 'Serviço',
              render: (document: ServiceFiscalDocument) => document.fiscalServiceName,
            },
            {
              header: 'Situação',
              render: (document: ServiceFiscalDocument) => (
                <StatusChip
                  label={serviceFiscalStatusLabel(document.status)}
                  tone={serviceFiscalStatusTone(document.status)}
                />
              ),
            },
            {
              header: 'Emissão',
              render: (document: ServiceFiscalDocument) =>
                new Date(document.issuedAt).toLocaleString('pt-BR'),
            },
            {
              align: 'right' as const,
              header: 'Ações',
              render: (document: ServiceFiscalDocument) => (
                <div className='flex flex-wrap justify-end gap-2'>
                  {['PROCESSING', 'AUTHORIZED'].includes(document.status) ? (
                    <SecondaryButton
                      disabled={Boolean(historySyncingId)}
                      icon={<RefreshCw size={15} />}
                      loading={historySyncingId === document.id}
                      type='button'
                      onClick={() => void syncHistoryDocument(document)}>
                      {historySyncingId === document.id
                        ? 'Atualizando...'
                        : 'Atualizar retorno'}
                    </SecondaryButton>
                  ) : null}
                  {document.pdfUrl ? (
                    <SecondaryButton
                      icon={<ExternalLink size={15} />}
                      type='button'
                      onClick={() => openServiceFiscalDocument(document.pdfUrl)}>
                      DANFSe
                    </SecondaryButton>
                  ) : null}
                  {document.xmlUrl ? (
                    <SecondaryButton
                      icon={<ExternalLink size={15} />}
                      type='button'
                      onClick={() => openServiceFiscalDocument(document.xmlUrl)}>
                      XML
                    </SecondaryButton>
                  ) : null}
                  {document.status === 'AUTHORIZED' ? (
                    <SecondaryButton
                      icon={<Ban size={15} />}
                      type='button'
                      onClick={() => {
                        setCancellationTarget(document)
                        setCancellationReason('')
                      }}>
                      Cancelar
                    </SecondaryButton>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyMessage='Nenhuma NFS-e emitida nesta filial.'
          getRowId={(document) => document.id}
          items={visibleDocuments}
          pagination={documentPagination}
        />
        {historySyncError ? (
          <Alert severity='warning'>{historySyncError}</Alert>
        ) : null}
        {cancellationTarget ? (
          <FormCard>
            <strong>Cancelar NFS-e {cancellationTarget.nfseNumber ?? cancellationTarget.dpsNumber}</strong>
            <TextField
              error={cancellationReason.length > 0 && cancellationReason.trim().length < 15}
              helperText='Informe entre 15 e 255 caracteres. O cancelamento é definitivo.'
              label='Justificativa do cancelamento'
              minRows={2}
              multiline
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value.slice(0, 255))}
            />
            <div className='flex flex-wrap justify-end gap-2'>
              <SecondaryButton
                disabled={cancelling}
                type='button'
                onClick={() => {
                  setCancellationTarget(undefined)
                  setCancellationReason('')
                }}>
                Voltar
              </SecondaryButton>
              <PrimaryButton
                disabled={cancellationReason.trim().length < 15}
                loading={cancelling}
                type='button'
                onClick={() => void cancelAuthorizedDocument()}>
                Confirmar cancelamento
              </PrimaryButton>
            </div>
          </FormCard>
        ) : null}
      </PagePanel>
    </section>
  )
}

function serviceFiscalIssueFeedback(document: ServiceFiscalDocument) {
  const environment =
    document.environment === 'PRODUCTION' ? 'produção' : 'homologação'

  if (document.status === 'REJECTED') {
    return `A Focus rejeitou a emissão em ${environment}: ${document.rejectionReason ?? 'consulte o retorno da emissão.'}`
  }

  if (document.status === 'AUTHORIZED') {
    return `NFS-e de ${environment} autorizada. Referência: ${document.providerReference}.`
  }

  return `NFS-e enviada à Focus em ${environment} e em processamento. Referência: ${document.providerReference}${document.protocol ? ` · Protocolo: ${document.protocol}` : ''}.`
}

function emptyForm(settings: FiscalSettings | null): DraftForm {
  return {
    serviceId: '',
    competenceDate: localDate(),
    serviceDescription: '',
    serviceAmount: '',
    issRate: String(settings?.defaultIssRate ?? '2'),
    issRetained: '',
    consumerFinal: '',
    additionalInformation: '',
    clientId: '',
    municipalityIbgeCode: '',
  }
}

function formFromDraft(draft: ServiceFiscalDocumentDraft): DraftForm {
  return {
    serviceId: draft.payload.serviceId,
    competenceDate: draft.payload.competenceDate,
    serviceDescription: draft.payload.serviceDescription,
    serviceAmount: String(draft.payload.serviceAmount),
    issRate: String(draft.payload.issRate),
    issRetained: draft.payload.issRetained ? 'yes' : 'no',
    consumerFinal: draft.payload.consumerFinal ? 'yes' : 'no',
    additionalInformation: draft.payload.additionalInformation ?? '',
    clientId: draft.payload.taker.clientId ?? '',
    municipalityIbgeCode: draft.payload.taker.municipalityIbgeCode,
  }
}

function serviceFiscalDocumentInput(
  form: DraftForm,
  client: Client,
): ServiceFiscalDocumentInput {
  return {
    serviceId: form.serviceId,
    competenceDate: form.competenceDate,
    serviceDescription: form.serviceDescription.trim(),
    serviceAmount: Number(form.serviceAmount),
    issRate: Number(form.issRate),
    issRetained: form.issRetained === 'yes',
    consumerFinal: form.consumerFinal === 'yes',
    additionalInformation: form.additionalInformation.trim() || null,
    taker: {
      clientId: client.id,
      personType: client.personType,
      name: client.name,
      document: client.document,
      email: client.email,
      phone: client.phone,
      addressStreet: client.addressStreet ?? '',
      addressNumber: client.addressNumber ?? '',
      addressComplement: client.addressComplement,
      addressDistrict: client.addressDistrict ?? '',
      addressCity: client.addressCity ?? '',
      addressState: client.addressState ?? '',
      addressZipCode: client.addressZipCode ?? '',
      municipalityIbgeCode: form.municipalityIbgeCode,
    },
  }
}

function clientAddressComplete(client: Client) {
  return Boolean(
    client.addressStreet?.trim() &&
      client.addressNumber?.trim() &&
      client.addressDistrict?.trim() &&
      client.addressCity?.trim() &&
      client.addressState?.trim() &&
      client.addressZipCode?.trim(),
  )
}

function serviceFiscalReadinessIssues(
  settings: FiscalSettings | null,
  service?: FiscalService,
  client?: Client,
  clientMunicipalityIbgeCode?: string,
  issRetained?: DraftForm['issRetained'],
) {
  const issues: string[] = []

  if (!/^\d{14}$/.test(settings?.companyCnpj?.replace(/\D/g, '') ?? '')) {
    issues.push('Complete o CNPJ fiscal da filial.')
  }

  if (settings?.environment === 'PRODUCTION' && !settings.allowProduction) {
    issues.push('Autorize explicitamente a emissão em produção nas configurações fiscais.')
  }

  if (
    !settings?.serviceMunicipalityName ||
    !settings.serviceMunicipalityState ||
    !settings.serviceMunicipalityIbgeCode
  ) {
    issues.push('Complete o município de incidência da filial.')
  }

  if (!settings?.simpleNationalNominalTaxRate) {
    issues.push(
      'Informe a alíquota nominal total do Simples Nacional nas configurações fiscais.',
    )
  }

  if (
    settings?.defaultRetainPis ||
    settings?.defaultRetainCofins ||
    settings?.defaultRetainCsll ||
    settings?.defaultRetainIr ||
    settings?.defaultRetainInss
  ) {
    issues.push('Este fluxo está disponível somente sem retenções federais.')
  }

  if (!service) {
    issues.push('Selecione o serviço fiscal.')
  } else if (!service.nbsCode) {
    issues.push('Informe o NBS correto no cadastro do serviço.')
  }
  if (!client) {
    issues.push('Selecione o tomador do serviço.')
  } else {
    const documentDigits = client.document?.replace(/\D/g, '') ?? ''

    if (client.personType === 'ES') {
      issues.push('A emissão para tomador do exterior ainda não está disponível.')
    } else if (
      (client.personType === 'PF' && documentDigits.length !== 11) ||
      (client.personType === 'PJ' && documentDigits.length !== 14)
    ) {
      issues.push('Complete o CPF ou CNPJ válido do tomador.')
    }

    if (!clientAddressComplete(client)) {
      issues.push('Complete o endereço do tomador.')
    }
  }

  if (!/^\d{7}$/.test(clientMunicipalityIbgeCode ?? '')) {
    issues.push('Informe o código IBGE do município do tomador.')
  }

  if (!issRetained) {
    issues.push('Confirme se o ISS será retido pelo tomador.')
  }

  return issues
}

function openServiceFiscalDocument(url: string | null) {
  if (!url) {
    return
  }

  let resolved: URL

  try {
    resolved = new URL(url, window.location.origin)
  } catch {
    return
  }

  if (!['http:', 'https:'].includes(resolved.protocol)) {
    return
  }

  window.open(resolved.toString(), '_blank', 'noopener,noreferrer')
}

function serviceFiscalStatusLabel(status: ServiceFiscalDocument['status']) {
  return {
    PROCESSING: 'Processando',
    AUTHORIZED: 'Autorizada',
    REJECTED: 'Rejeitada',
    CANCELLED: 'Cancelada',
  }[status]
}

function serviceFiscalStatusTone(status: ServiceFiscalDocument['status']) {
  if (status === 'AUTHORIZED') return 'success' as const
  if (status === 'REJECTED') return 'error' as const
  if (status === 'CANCELLED') return 'neutral' as const
  return 'warning' as const
}

function localDate() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10)
}
