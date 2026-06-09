import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import { Banknote, CreditCard, FileText, Plus, Power, PowerOff } from "lucide-react";
import type { FormEvent } from "react";
import type {
  AuthUser,
  CashRegisterSession,
  Client,
  FiscalDocument,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
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
        <table className="responsive-card-table">
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
                <td data-label="Forma de pagamento">{paymentMethod.name}</td>
                <td data-label="Codigo">{paymentMethod.code}</td>
                <td data-label="Status">
                  <StatusChip
                    label={paymentMethod.active ? "Ativa" : "Inativa"}
                    tone={paymentMethod.active ? "success" : "neutral"}
                  />
                </td>
                <td data-label="Acoes">
                  <div className="table-actions">
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
                  </div>
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
  clients,
  fiscalDocuments,
  pickupReservations,
  products,
  sales,
  shippingOrders,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
  onCancelFiscalDocument,
  onSyncFiscalDocument,
}: {
  clients: Client[];
  fiscalDocuments: FiscalDocument[];
  pickupReservations: PickupReservation[];
  products: Product[];
  sales: Sale[];
  shippingOrders: ShippingOrder[];
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void;
  onIssueSaleFiscalDocument: (sale: Sale) => void;
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void;
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => void;
  onSyncFiscalDocument: (fiscalDocument: FiscalDocument) => void;
}) {
  const fiscalRequests = fiscalRequestFactories.flatMap((factory) =>
    factory({
      clients,
      fiscalDocuments,
      pickupReservations,
      products,
      sales,
      shippingOrders,
    }),
  );

  return (
    <section className="layout-grid stock-entry-layout">
      <div className="panel wide">
        <div className="panel-header compact">
          <div>
            <h2>Fila de emissao</h2>
            <span>
              Centralize a emissao fiscal de balcao, envio e retirada.
            </span>
          </div>
          <FileText size={18} />
        </div>
        <div className="table-shell">
          <table className="responsive-card-table">
            <thead>
              <tr>
                <th>Origem</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Status fiscal</th>
                <th>Prontidao</th>
                <th>Operador</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {fiscalRequests.map((request) => (
                <tr key={`${request.sourceType}-${request.sourceId}`}>
                  <td data-label="Origem">
                    <strong>{request.sourceLabel}</strong>
                    <span className="table-note">{request.sourceId}</span>
                  </td>
                  <td data-label="Cliente">{request.clientName}</td>
                  <td data-label="Total">
                    {formatCurrency(request.totalAmount)}
                  </td>
                  <td data-label="Status fiscal">
                    {request.document ? (
                      <FiscalDocumentStatus document={request.document} />
                    ) : (
                      <StatusChip label={request.pendingLabel} tone="warning" />
                    )}
                  </td>
                  <td data-label="Prontidao">
                    <FiscalReadinessStatus request={request} />
                  </td>
                  <td data-label="Operador">{request.operatorName}</td>
                  <td data-label="Acoes">
                    <div className="table-actions">
                      <FiscalRequestAction
                        request={request}
                        onIssuePickupReservationFiscalDocument={
                          onIssuePickupReservationFiscalDocument
                        }
                        onIssueSaleFiscalDocument={onIssueSaleFiscalDocument}
                        onIssueShippingOrderFiscalDocument={
                          onIssueShippingOrderFiscalDocument
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {fiscalRequests.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhuma venda disponivel para emissao.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel wide">
        <div className="panel-header compact">
          <div>
            <h2>Notas emitidas</h2>
            <span>
              Acompanhe o retorno do provedor fiscal e os documentos gerados.
            </span>
          </div>
          <FileText size={18} />
        </div>
        <div className="table-shell">
          <table className="responsive-card-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Ambiente</th>
                <th>Emissao</th>
                <th>Referencias</th>
                <th>Arquivos</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {fiscalDocuments.map((document) => (
                <tr key={document.id}>
                  <td data-label="Documento">
                    <strong>{document.documentType}</strong>
                    <span className="table-note">
                      {document.number ? `#${document.number}` : "Sem numero"}
                      {document.series ? ` serie ${document.series}` : ""}
                    </span>
                  </td>
                  <td data-label="Origem">
                    <strong>
                      {fiscalDocumentSourceLabel(document.sourceType)}
                    </strong>
                    <span className="table-note">{document.sourceId}</span>
                  </td>
                  <td data-label="Status">
                    <StatusChip
                      label={fiscalDocumentStatusLabel(document.status)}
                      tone={fiscalDocumentStatusTone(document.status)}
                    />
                    {document.rejectionReason ? (
                      <span className="table-note">
                        {document.rejectionReason}
                      </span>
                    ) : null}
                  </td>
                  <td data-label="Ambiente">
                    <strong>{document.provider}</strong>
                    <span className="table-note">
                      {fiscalDocumentEnvironmentLabel(document.environment)}
                    </span>
                  </td>
                  <td data-label="Emissao">
                    <strong>
                      {formatDateTime(document.issuedAt ?? document.createdAt)}
                    </strong>
                    <span className="table-note">
                      {document.issuedByUserName}
                    </span>
                  </td>
                  <td data-label="Referencias">
                    <strong>
                      {document.providerReference ?? "Sem referencia"}
                    </strong>
                    <span className="table-note">
                      {document.accessKey ?? "Sem chave de acesso"}
                    </span>
                  </td>
                  <td data-label="Arquivos">
                    <FiscalDocumentLinks document={document} />
                  </td>
                  <td data-label="Acoes">
                    <FiscalDocumentActions
                      document={document}
                      onCancelFiscalDocument={onCancelFiscalDocument}
                      onSyncFiscalDocument={onSyncFiscalDocument}
                    />
                  </td>
                </tr>
              ))}
              {fiscalDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8}>Nenhuma nota fiscal emitida.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

type FiscalRequest = {
  sourceType: FiscalDocument["sourceType"];
  sourceId: string;
  sourceLabel: string;
  pendingLabel: string;
  clientName: string;
  totalAmount: string;
  operatorName: string;
  readinessIssues: string[];
  sale?: Sale;
  shippingOrder?: ShippingOrder;
  pickupReservation?: PickupReservation;
  document?: FiscalDocument;
};

type FiscalRequestFactoryInput = {
  clients: Client[];
  fiscalDocuments: FiscalDocument[];
  pickupReservations: PickupReservation[];
  products: Product[];
  sales: Sale[];
  shippingOrders: ShippingOrder[];
};

function FiscalRequestAction({
  request,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
}: {
  request: FiscalRequest;
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void;
  onIssueSaleFiscalDocument: (sale: Sale) => void;
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void;
}) {
  const action = fiscalRequestAction(request, {
    onIssuePickupReservationFiscalDocument,
    onIssueSaleFiscalDocument,
    onIssueShippingOrderFiscalDocument,
  });

  return action && request.readinessIssues.length === 0 ? (
    <TableActionButton type="button" onClick={action}>
      Emitir NF-e
    </TableActionButton>
  ) : (
    <span className="table-note">
      {fiscalRequestActionLabel(request, Boolean(action))}
    </span>
  );
}

function FiscalReadinessStatus({ request }: { request: FiscalRequest }) {
  return request.readinessIssues.length === 0 ? (
    <StatusChip label="Pronta" tone="success" />
  ) : (
    <>
      <StatusChip label={`${request.readinessIssues.length} pendencia(s)`} tone="warning" />
      <span className="table-note">
        {request.readinessIssues.slice(0, 3).join(" ")}
      </span>
    </>
  );
}

function fiscalRequestActionLabel(request: FiscalRequest, hasAction: boolean) {
  const labels: Record<string, string> = {
    documented: "Documento registrado",
    future: "Emissao futura",
    pending: "Corrija pendencias",
  };
  const labelKey = request.document
    ? "documented"
    : hasAction && request.readinessIssues.length > 0
      ? "pending"
      : "future";

  return labels[labelKey];
}

type FiscalRequestActionHandlers = {
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void;
  onIssueSaleFiscalDocument: (sale: Sale) => void;
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void;
};

function fiscalRequestAction(
  request: FiscalRequest,
  handlers: FiscalRequestActionHandlers,
) {
  const actions: Partial<
    Record<FiscalDocument["sourceType"], (() => void) | undefined>
  > = {
    PICKUP_RESERVATION:
      request.pickupReservation && !request.document
        ? () =>
            handlers.onIssuePickupReservationFiscalDocument(
              request.pickupReservation as PickupReservation,
            )
        : undefined,
    SALE:
      request.sale && !request.document
        ? () => handlers.onIssueSaleFiscalDocument(request.sale as Sale)
        : undefined,
    SHIPPING_ORDER:
      request.shippingOrder && !request.document
        ? () =>
            handlers.onIssueShippingOrderFiscalDocument(
              request.shippingOrder as ShippingOrder,
            )
        : undefined,
  };

  return actions[request.sourceType];
}

const fiscalRequestFactories: Array<
  (input: FiscalRequestFactoryInput) => FiscalRequest[]
> = [
  ({ clients, fiscalDocuments, products, sales }) =>
    sales.map((sale) => ({
      sourceType: "SALE",
      sourceId: sale.id,
      sourceLabel: "Balcao",
      pendingLabel: "Pendente",
      clientName: sale.clientName ?? "Nao identificado",
      totalAmount: sale.totalAmount,
      operatorName: sale.createdByUserName,
      readinessIssues: fiscalReadinessIssues({
        client: findClient(clients, sale.clientId),
        items: sale.items,
        products,
      }),
      sale,
      document: findFiscalDocument(fiscalDocuments, "SALE", sale.id),
    })),
  ({ clients, fiscalDocuments, products, shippingOrders }) =>
    shippingOrders
      .filter((order) => order.status === "COMPLETED")
      .map((order) => ({
        sourceType: "SHIPPING_ORDER",
        sourceId: order.id,
        sourceLabel: "Envio",
        pendingLabel: "Pendente",
        clientName: order.clientName,
        totalAmount: order.totalAmount,
        operatorName: order.completedByUserName ?? order.createdByUserName,
        readinessIssues: fiscalReadinessIssues({
          client: findClient(clients, order.clientId),
          items: order.items,
          products,
        }),
        shippingOrder: order,
        document: findFiscalDocument(fiscalDocuments, "SHIPPING_ORDER", order.id),
      })),
  ({ clients, fiscalDocuments, pickupReservations, products }) =>
    pickupReservations
      .filter((reservation) => reservation.status === "COMPLETED")
      .map((reservation) => ({
        sourceType: "PICKUP_RESERVATION",
        sourceId: reservation.id,
        sourceLabel: "Retirada",
        pendingLabel: "Pendente",
        clientName: reservation.clientName,
        totalAmount: reservation.totalAmount,
        operatorName:
          reservation.completedByUserName ?? reservation.createdByUserName,
        readinessIssues: fiscalReadinessIssues({
          client: findClient(clients, reservation.clientId),
          items: reservation.items,
          products,
        }),
        pickupReservation: reservation,
        document: findFiscalDocument(
          fiscalDocuments,
          "PICKUP_RESERVATION",
          reservation.id,
        ),
      })),
];

type FiscalReadinessInput = {
  client?: Client;
  items: Array<{ productId: string; productName: string }>;
  products: Product[];
};

function fiscalReadinessIssues({
  client,
  items,
  products,
}: FiscalReadinessInput) {
  return [
    ...clientReadinessIssues(client),
    ...items.flatMap((item) =>
      productReadinessIssues(findProduct(products, item.productId), item),
    ),
  ];
}

function clientReadinessIssues(client?: Client) {
  const documentRequired = client?.personType !== "ES";
  const fieldChecks: Array<[unknown, string]> = [
    [client, "Cliente deve estar cadastrado."],
    [client?.name, "Nome do cliente pendente."],
    [
      documentRequired ? client?.document : true,
      "CPF/CNPJ do cliente pendente.",
    ],
    [client?.addressStreet, "Logradouro do cliente pendente."],
    [client?.addressNumber, "Numero do cliente pendente."],
    [client?.addressDistrict, "Bairro do cliente pendente."],
    [client?.addressCity, "Cidade do cliente pendente."],
    [client?.addressState, "UF do cliente pendente."],
    [client?.addressZipCode, "CEP do cliente pendente."],
  ];

  return missingMessages(fieldChecks);
}

function productReadinessIssues(
  product: Product | undefined,
  item: { productName: string },
) {
  const label = item.productName;
  const fieldChecks: Array<[unknown, string]> = [
    [product, `Produto ${label} deve estar cadastrado.`],
    [product?.ncm, `NCM pendente em ${label}.`],
    [product?.cfop, `CFOP pendente em ${label}.`],
    [product?.origin, `Origem fiscal pendente em ${label}.`],
    [product?.icmsCst, `CST ICMS pendente em ${label}.`],
    [product?.pisCst, `CST PIS pendente em ${label}.`],
    [product?.cofinsCst, `CST COFINS pendente em ${label}.`],
  ];

  return missingMessages(fieldChecks);
}

function missingMessages(fieldChecks: Array<[unknown, string]>) {
  return fieldChecks
    .filter(([value]) => !value)
    .map(([_value, message]) => message);
}

function findClient(clients: Client[], clientId: string | null) {
  return clients.find((client) => client.id === clientId);
}

function findProduct(products: Product[], productId: string) {
  return products.find((product) => product.id === productId);
}

function findFiscalDocument(
  fiscalDocuments: FiscalDocument[],
  sourceType: FiscalDocument["sourceType"],
  sourceId: string,
) {
  return fiscalDocuments.find(
    (document) =>
      document.sourceType === sourceType && document.sourceId === sourceId,
  );
}

function FiscalDocumentStatus({ document }: { document: FiscalDocument }) {
  return (
    <>
      <StatusChip
        label={fiscalDocumentStatusLabel(document.status)}
        tone={fiscalDocumentStatusTone(document.status)}
      />
      <span className="table-note">
        {document.documentType} {document.number ? `#${document.number}` : ""}
      </span>
    </>
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

function FiscalDocumentActions({
  document,
  onCancelFiscalDocument,
  onSyncFiscalDocument,
}: {
  document: FiscalDocument;
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => void;
  onSyncFiscalDocument: (fiscalDocument: FiscalDocument) => void;
}) {
  return (
    <div className="shipping-order-actions">
      <TableActionButton
        type="button"
        onClick={() => onSyncFiscalDocument(document)}
      >
        Atualizar
      </TableActionButton>

      {document.status === "AUTHORIZED" ? (
        <form
          className="cancel-order-form"
          onSubmit={(event) => onCancelFiscalDocument(event, document)}
        >
          <TextField
            name="fiscalCancellationReason"
            label="Motivo do cancelamento"
            size="small"
            required
          />
          <TableActionButton type="submit">Cancelar NF-e</TableActionButton>
        </form>
      ) : null}
    </div>
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
