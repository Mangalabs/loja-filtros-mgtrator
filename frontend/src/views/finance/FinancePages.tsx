import Link from "@mui/material/Link";
import { Banknote, CreditCard, FileText, Plus, Power, PowerOff } from "lucide-react";
import type { FormEvent } from "react";
import type {
  AuthUser,
  CashRegisterSession,
  FiscalDocument,
  PaymentMethod,
} from "../../api";
import {
  PrimaryButton,
  StatusChip,
  TableActionButton,
  type StatusTone,
} from "../../components/ui";
import { formatCurrency, formatDateTime } from "../../utils/format";

export function PaymentMethodsPage({
  paymentMethods,
  onChangeStatus,
}: {
  paymentMethods: PaymentMethod[];
  onChangeStatus: (paymentMethod: PaymentMethod) => void;
}) {
  return (
    <div className="panel wide">
      <div className="panel-header compact">
        <div>
          <h2>Formas configuradas</h2>
          <span>
            Credito sera incluido somente depois que suas regras forem
            definidas.
          </span>
        </div>
        <CreditCard size={18} />
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Forma de pagamento</th>
              <th>Codigo</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((paymentMethod) => (
              <tr key={paymentMethod.id}>
                <td>{paymentMethod.name}</td>
                <td>{paymentMethod.code}</td>
                <td>
                  <StatusChip
                    label={paymentMethod.active ? "Ativa" : "Inativa"}
                    tone={paymentMethod.active ? "success" : "neutral"}
                  />
                </td>
                <td>
                  <TableActionButton
                    icon={
                      paymentMethod.active ? (
                        <PowerOff size={14} />
                      ) : (
                        <Power size={14} />
                      )
                    }
                    type="button"
                    onClick={() => onChangeStatus(paymentMethod)}
                  >
                    {paymentMethod.active ? "Inativar" : "Ativar"}
                  </TableActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FiscalDocumentsPage({
  fiscalDocuments,
}: {
  fiscalDocuments: FiscalDocument[];
}) {
  return (
    <div className="panel wide">
      <div className="panel-header compact">
        <div>
          <h2>Notas emitidas</h2>
          <span>
            Acompanhe o retorno do provedor fiscal e os documentos vinculados
            as vendas.
          </span>
        </div>
        <FileText size={18} />
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Ambiente</th>
              <th>Emissao</th>
              <th>Referencias</th>
              <th>Arquivos</th>
            </tr>
          </thead>
          <tbody>
            {fiscalDocuments.map((document) => (
              <tr key={document.id}>
                <td>
                  <strong>{document.documentType}</strong>
                  <span className="table-note">
                    {document.number ? `#${document.number}` : "Sem numero"}
                    {document.series ? ` serie ${document.series}` : ""}
                  </span>
                </td>
                <td>
                  <strong>{fiscalDocumentSourceLabel(document.sourceType)}</strong>
                  <span className="table-note">{document.sourceId}</span>
                </td>
                <td>
                  <StatusChip
                    label={fiscalDocumentStatusLabel(document.status)}
                    tone={fiscalDocumentStatusTone(document.status)}
                  />
                  {document.rejectionReason ? (
                    <span className="table-note">{document.rejectionReason}</span>
                  ) : null}
                </td>
                <td>
                  <strong>{document.provider}</strong>
                  <span className="table-note">
                    {fiscalDocumentEnvironmentLabel(document.environment)}
                  </span>
                </td>
                <td>
                  <strong>{formatDateTime(document.issuedAt ?? document.createdAt)}</strong>
                  <span className="table-note">{document.issuedByUserName}</span>
                </td>
                <td>
                  <strong>{document.providerReference ?? "Sem referencia"}</strong>
                  <span className="table-note">
                    {document.accessKey ?? "Sem chave de acesso"}
                  </span>
                </td>
                <td>
                  <FiscalDocumentLinks document={document} />
                </td>
              </tr>
            ))}
            {fiscalDocuments.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhuma nota fiscal emitida.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FiscalDocumentLinks({ document }: { document: FiscalDocument }) {
  const links = [
    { label: "DANFE", url: document.pdfUrl },
    { label: "XML", url: document.xmlUrl },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));

  return links.length > 0 ? (
    <div className="table-actions">
      {links.map((link) => (
        <Link href={link.url} key={link.label} target="_blank" rel="noreferrer">
          {link.label}
        </Link>
      ))}
    </div>
  ) : (
    <span className="empty-text">Sem arquivos</span>
  );
}

function fiscalDocumentSourceLabel(sourceType: FiscalDocument["sourceType"]) {
  return fiscalDocumentSourceLabels[sourceType];
}

function fiscalDocumentEnvironmentLabel(
  environment: FiscalDocument["environment"],
) {
  return fiscalDocumentEnvironmentLabels[environment];
}

function fiscalDocumentStatusLabel(status: FiscalDocument["status"]) {
  return fiscalDocumentStatusPresentations[status].label;
}

function fiscalDocumentStatusTone(status: FiscalDocument["status"]): StatusTone {
  return fiscalDocumentStatusPresentations[status].tone;
}

const fiscalDocumentSourceLabels: Record<FiscalDocument["sourceType"], string> =
  {
    PICKUP_RESERVATION: "Reserva",
    SALE: "Venda",
    SHIPPING_ORDER: "Envio",
  };

const fiscalDocumentEnvironmentLabels: Record<
  FiscalDocument["environment"],
  string
> = {
  HOMOLOGATION: "Homologacao",
  PRODUCTION: "Producao",
};

const fiscalDocumentStatusPresentations: Record<
  FiscalDocument["status"],
  { label: string; tone: StatusTone }
> = {
  AUTHORIZED: { label: "Autorizada", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
  PENDING: { label: "Pendente", tone: "warning" },
  PROCESSING: { label: "Processando", tone: "warning" },
  REJECTED: { label: "Rejeitada", tone: "neutral" },
};

export function CashRegisterPage({
  session,
  user,
  onOpen,
  onClose,
}: {
  session: CashRegisterSession | null;
  user: AuthUser;
  onOpen: (event: FormEvent<HTMLFormElement>) => void;
  onClose: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (session) {
    return (
      <section className="layout-grid stock-entry-layout">
        <div className="panel">
          <div className="panel-header compact">
            <div>
              <h2>Caixa aberto</h2>
              <span>Confira os recebimentos antes de fechar o caixa.</span>
            </div>
            <StatusChip label="Aberto" tone="success" />
          </div>
          <div className="cash-register-details">
            <div>
              <span>Aberto por</span>
              <strong>{session.openedByUserName}</strong>
            </div>
            <div>
              <span>Data de abertura</span>
              <strong>{formatDateTime(session.openedAt)}</strong>
            </div>
            <div>
              <span>Saldo inicial</span>
              <strong>{formatCurrency(session.openingBalance)}</strong>
            </div>
            <div>
              <span>Vendas</span>
              <strong>{formatCurrency(session.salesTotal)}</strong>
            </div>
            <div>
              <span>Esperado</span>
              <strong>{formatCurrency(session.expectedClosingBalance)}</strong>
            </div>
          </div>
        </div>

        <form className="panel form-panel" onSubmit={onClose}>
          <div className="panel-header compact">
            <div>
              <h2>Fechamento</h2>
              <span>Informe o total conferido no caixa.</span>
            </div>
            <Banknote size={18} />
          </div>
          <div className="entity-list">
            {session.paymentSummary.map((payment) => (
              <div className="entity-row" key={payment.paymentMethodId}>
                <strong>{payment.paymentMethodName}</strong>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
            {session.paymentSummary.length === 0 ? (
              <span className="empty-text">Nenhuma venda registrada.</span>
            ) : null}
          </div>
          <label className="field-label">
            Saldo esperado
            <input
              value={formatCurrency(session.expectedClosingBalance)}
              disabled
            />
          </label>
          <label className="field-label">
            Valor conferido
            <input
              name="closingBalance"
              type="number"
              min="0"
              step="0.01"
              defaultValue={session.expectedClosingBalance}
              required
            />
          </label>
          <PrimaryButton icon={<Plus size={17} />} type="submit">
            Fechar caixa
          </PrimaryButton>
        </form>
      </section>
    );
  }

  return (
    <form className="panel form-panel single-column" onSubmit={onOpen}>
      <div className="panel-header compact">
        <div>
          <h2>Abrir caixa</h2>
          <span>A abertura ficara registrada no usuario autenticado.</span>
        </div>
        <Banknote size={18} />
      </div>
      <label className="field-label">
        Responsavel
        <input value={user.name} disabled />
      </label>
      <label className="field-label">
        Saldo inicial
        <input
          name="openingBalance"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0.00"
          required
        />
      </label>
      <PrimaryButton icon={<Plus size={17} />} type="submit">
        Abrir caixa
      </PrimaryButton>
    </form>
  );
}
