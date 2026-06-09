import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import type { FormEvent } from "react";
import type {
  Product,
  StockAdjustment,
  StockEntry,
  StockMovement,
  Supplier,
} from "../../api";
import { PrimaryButton } from "../../components/ui";
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
  formatSignedQuantity,
} from "../../utils/format";
import { productDisplayName } from "../../utils/productDisplay";

export function StockEntriesPage({
  entries,
  products,
  suppliers,
  onSubmit,
}: {
  entries: StockEntry[];
  products: Product[];
  suppliers: Supplier[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <h2>Nova entrada</h2>
          <ArrowDownToLine size={18} />
        </div>
        <TextField
          defaultValue=""
          label="Produto"
          name="entryProductId"
          select
          size="small"
          required
        >
          <MenuItem value="" disabled>
            Produto
          </MenuItem>
          {products
            .filter((product) => product.active)
            .map((product) => (
              <MenuItem key={product.id} value={product.id}>
                {productDisplayName(product)} - estoque{" "}
                {formatQuantity(product.currentStock)}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          defaultValue=""
          label="Fornecedor"
          name="entrySupplierId"
          select
          size="small"
          required
        >
          <MenuItem value="" disabled>
            Fornecedor
          </MenuItem>
          {suppliers
            .filter((supplier) => supplier.active)
            .map((supplier) => (
              <MenuItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </MenuItem>
            ))}
        </TextField>
        <div className="two-columns">
          <TextField
            label="Quantidade"
            name="entryQuantity"
            type="number"
            size="small"
            slotProps={{ htmlInput: { min: "0.001", step: "0.001" } }}
            required
          />
          <TextField
            label="Custo unitario"
            name="entryUnitCost"
            type="number"
            size="small"
            slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
            required
          />
        </div>
        <TextField
          label="Observacao"
          name="entryNotes"
          multiline
          rows={3}
          size="small"
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Registrar entrada
        </PrimaryButton>
      </form>

      <div className="panel wide stock-entry-history">
        <div className="panel-header compact">
          <h2>Entradas registradas</h2>
          <span>{entries.length} registros</span>
        </div>
        <div className="table-shell">
          <table className="responsive-card-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Fornecedor</th>
                <th>Operador</th>
                <th>Qtd.</th>
                <th>Custo un.</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="Data">{formatDateTime(entry.createdAt)}</td>
                  <td data-label="Produto">{entry.productName}</td>
                  <td data-label="Fornecedor">{entry.supplierName}</td>
                  <td data-label="Operador">
                    {entry.createdByUserName ?? "-"}
                  </td>
                  <td data-label="Qtd.">{formatQuantity(entry.quantity)}</td>
                  <td data-label="Custo un.">
                    {formatCurrency(entry.unitCost)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhuma entrada registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function StockAdjustmentsPage({
  adjustments,
  products,
  onSubmit,
}: {
  adjustments: StockAdjustment[];
  products: Product[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <h2>Novo ajuste</h2>
          <SlidersHorizontal size={18} />
        </div>
        <TextField
          defaultValue=""
          label="Produto"
          name="adjustmentProductId"
          select
          size="small"
          required
        >
          <MenuItem value="" disabled>
            Produto
          </MenuItem>
          {products.map((product) => (
            <MenuItem key={product.id} value={product.id}>
              {productDisplayName(product)} - fisico{" "}
              {formatQuantity(product.currentStock)} - reservado{" "}
              {formatQuantity(product.reservedStock)}
              {product.active ? "" : " (inativo)"}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Variacao de estoque (+ ou -)"
          name="adjustmentQuantity"
          type="number"
          size="small"
          slotProps={{ htmlInput: { step: "0.001" } }}
          required
        />
        <p className="field-help">
          Use valor positivo para acrescentar ou negativo para retirar itens.
        </p>
        <TextField
          label="Motivo do ajuste"
          name="adjustmentReason"
          multiline
          rows={3}
          size="small"
          slotProps={{ htmlInput: { maxLength: 500 } }}
          required
        />
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Registrar ajuste
        </PrimaryButton>
      </form>

      <div className="panel wide stock-entry-history">
        <div className="panel-header compact">
          <h2>Ajustes registrados</h2>
          <span>{adjustments.length} registros</span>
        </div>
        <div className="table-shell">
          <table className="responsive-card-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Operador</th>
                <th>Variacao</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td data-label="Data">
                    {formatDateTime(adjustment.createdAt)}
                  </td>
                  <td data-label="Produto">{adjustment.productName}</td>
                  <td data-label="Operador">
                    {adjustment.createdByUserName ?? "-"}
                  </td>
                  <td data-label="Variacao">
                    {formatSignedQuantity(adjustment.quantity)}
                  </td>
                  <td data-label="Motivo">{adjustment.reason}</td>
                </tr>
              ))}
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhum ajuste registrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function LowStockPage({ products }: { products: Product[] }) {
  return (
    <div className="panel wide">
      <div className="panel-header compact">
        <div>
          <h2>Produtos para reposicao</h2>
          <span>
            Produtos ativos com saldo disponivel igual ou menor que o minimo
            definido.
          </span>
        </div>
        <AlertTriangle size={18} />
      </div>
      <div className="table-shell">
        <table className="responsive-card-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Fabricante</th>
              <th>Locacao</th>
              <th>Disponivel</th>
              <th>Minimo</th>
              <th>Faltam p/ minimo</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td data-label="Produto">{productDisplayName(product)}</td>
                <td data-label="Fabricante">{product.brandName ?? "-"}</td>
                <td data-label="Locacao">{product.location ?? "-"}</td>
                <td className="stock-warning" data-label="Disponivel">
                  {formatQuantity(product.availableStock)}
                </td>
                <td data-label="Minimo">
                  {formatQuantity(product.minimumStock)}
                </td>
                <td data-label="Faltam p/ minimo">
                  {formatQuantity(
                    String(
                      Number(product.minimumStock) -
                        Number(product.availableStock),
                    ),
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={6}>Nenhum produto requer reposicao.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StockMovementsPage({
  movements,
}: {
  movements: StockMovement[];
}) {
  return (
    <div className="panel wide">
      <div className="panel-header compact">
        <div>
          <h2>Movimentacoes registradas</h2>
          <span>Entradas, vendas, estornos e ajustes de estoque.</span>
        </div>
        <ArrowLeftRight size={18} />
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Fornecedor</th>
              <th>Operador</th>
              <th>Custo un.</th>
              <th>Observacao</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{formatDateTime(movement.createdAt)}</td>
                <td>{movementTypeLabel(movement.type)}</td>
                <td>{movement.productName}</td>
                <td>{formatSignedQuantity(movement.quantity)}</td>
                <td>{movement.supplierName ?? "-"}</td>
                <td>{movement.createdByUserName ?? "-"}</td>
                <td>
                  {movement.unitCost ? formatCurrency(movement.unitCost) : "-"}
                </td>
                <td>{movement.notes ?? "-"}</td>
              </tr>
            ))}
            {movements.length === 0 ? (
              <tr>
                <td colSpan={8}>Nenhuma movimentacao registrada.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function movementTypeLabel(type: StockMovement["type"]) {
  return movementTypeLabels[type];
}

const movementTypeLabels: Record<StockMovement["type"], string> = {
  ADJUSTMENT: "Ajuste",
  ENTRY: "Entrada",
  SALE: "Venda",
  SALE_CANCEL: "Estorno de venda",
};
