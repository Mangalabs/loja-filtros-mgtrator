import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  apiGet,
  type ApiResult,
  type DraftShareCandidate,
} from '../api'
import { useAuth } from '../auth/AuthContext'
import { PrimaryButton, SecondaryButton, StatusChip } from './ui'

export type ShareableDraft = {
  createdByUserId: string
  createdByUserName: string
  sharedWithUserId: string | null
  sharedWithUserName: string | null
  sharedWithUserEmail: string | null
}

export function DraftSharingControl({
  draft,
  scope,
  onShare,
}: {
  draft: ShareableDraft
  scope: 'general' | 'fiscal'
  onShare: (sharedWithUserId: string | null) => Promise<boolean | void>
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState<DraftShareCandidate[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    draft.sharedWithUserId,
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentSharedUserId, setCurrentSharedUserId] = useState(
    draft.sharedWithUserId,
  )
  const [currentSharedUserName, setCurrentSharedUserName] = useState(
    draft.sharedWithUserName,
  )
  const isOwner = user?.id === draft.createdByUserId
  const availableCandidates = useMemo(
    () =>
      scope === 'fiscal'
        ? candidates.filter((candidate) => candidate.canManageFiscalDocuments)
        : candidates,
    [candidates, scope],
  )
  const selectedCandidate =
    availableCandidates.find((candidate) => candidate.id === selectedUserId) ??
    null

  useEffect(() => {
    setCurrentSharedUserId(draft.sharedWithUserId)
    setCurrentSharedUserName(draft.sharedWithUserName)
  }, [draft.sharedWithUserId, draft.sharedWithUserName])

  if (!isOwner) {
    return (
      <StatusChip
        label={`Compartilhado por ${draft.createdByUserName}`}
        tone='neutral'
      />
    )
  }

  async function openDialog() {
    setOpen(true)
    setSelectedUserId(currentSharedUserId)
    setError('')

    if (candidates.length > 0) {
      return
    }

    setLoading(true)
    try {
      const result = await apiGet<ApiResult<DraftShareCandidate[]>>(
        '/users/draft-share-candidates',
      )
      setCandidates(result.data)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar os usuários.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function saveSharing(sharedWithUserId: string | null) {
    setSaving(true)
    setError('')
    try {
      const saved = await onShare(sharedWithUserId)
      if (saved !== false) {
        setCurrentSharedUserId(sharedWithUserId)
        setCurrentSharedUserName(
          sharedWithUserId === null ? null : selectedCandidate?.name ?? null,
        )
        setOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SecondaryButton
        icon={<Share2 size={17} />}
        type='button'
        onClick={() => void openDialog()}>
        {currentSharedUserName
          ? `Compartilhado com ${currentSharedUserName}`
          : 'Compartilhar rascunho'}
      </SecondaryButton>
      <Dialog
        fullWidth
        maxWidth='sm'
        open={open}
        onClose={() => !saving && setOpen(false)}>
        <DialogTitle>Compartilhar rascunho</DialogTitle>
        <DialogContent className='grid gap-4' dividers>
          <p className='m-0 text-sm text-[#5f665f]'>
            O usuário selecionado poderá abrir, atualizar e concluir este
            rascunho na filial ativa.
          </p>
          {error ? <Alert severity='error'>{error}</Alert> : null}
          <Autocomplete
            disabled={loading || saving}
            getOptionLabel={(candidate) =>
              `${candidate.name} · ${candidate.email}`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={loading}
            loadingText='Carregando usuários…'
            noOptionsText='Nenhum usuário disponível'
            options={availableCandidates}
            value={selectedCandidate}
            onChange={(_event, candidate) =>
              setSelectedUserId(candidate?.id ?? null)
            }
            renderInput={(params) => (
              <TextField {...params} label='Compartilhar com' />
            )}
          />
        </DialogContent>
        <DialogActions>
          {currentSharedUserId ? (
            <SecondaryButton
              disabled={saving}
              type='button'
              onClick={() => void saveSharing(null)}>
              Remover compartilhamento
            </SecondaryButton>
          ) : null}
          <SecondaryButton
            disabled={saving}
            type='button'
            onClick={() => setOpen(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton
            disabled={
              loading || saving || selectedUserId === currentSharedUserId
            }
            type='button'
            onClick={() => void saveSharing(selectedUserId)}>
            Salvar
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
