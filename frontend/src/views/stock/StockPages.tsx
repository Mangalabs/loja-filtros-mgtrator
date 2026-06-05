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
        <select name="entryProductId" defaultValue="" required>
          <option value="" disabled>
            Produto
          </option>
          {products
            .filter((product) => product.active)
            .map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - estoque {formatQuantity(product.currentStock)}
              </option>
            ))}
        </select>
        <select name="entrySupplierId" defaultValue="" required>
          <option value="" disabled>
            Fornecedor
          </option>
          {suppliers
            .filter((supplier) => supplier.active)
            .map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
        </select>
        <div className="two-columns">
          <input
            name="entryQuantity"
            type="number"
            min="0.001"
            step="0.001"
            placeholder="Quantidade"
            required
          />
          <input
            name="entryUnitCost"
            type="number"
            min="0"
            step="0.01"
            placeholder="Custo unitario"
            required
          />
        </div>
        <textarea
          name="entryNotes"
          maxLength={500}
          placeholder="Observacao (opcional)"
          rows={3}
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
          <table>
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
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{entry.productName}</td>
                  <td>{entry.supplierName}</td>
                  <td>{entry.createdByUserName ?? "-"}</td>
                  <td>{formatQuantity(entry.quantity)}</td>
                  <td>{formatCurrency(entry.unitCost)}</td>
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
        <select name="adjustmentProductId" defaultValue="" required>
          <option value="" disabled>
            Produto
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} - fisico {formatQuantity(product.currentStock)} -
              reservado {formatQuantity(product.reservedStock)}
              {product.active ? "" : " (inativo)"}
            </option>
          ))}
        </select>
        <input
          name="adjustmentQuantity"
          type="number"
          step="0.001"
          placeholder="Variacao de estoque (+ ou -)"
          required
        />
        <p className="field-help">
          Use valor positivo para acrescentar ou negativo para retirar itens.
        </p>
        <textarea
          name="adjustmentReason"
          maxLength={500}
          placeholder="Motivo do ajuste"
          rows={3}
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
          <table>
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
                  <td>{formatDateTime(adjustment.createdAt)}</td>
                  <td>{adjustment.productName}</td>
                  <td>{adjustment.createdByUserName ?? "-"}</td>
                  <td>{formatSignedQuantity(adjustment.quantity)}</td>
                  <td>{adjustment.reason}</td>
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
        <table>
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
                <td>{product.name}</td>
                <td>{product.brandName ?? "-"}</td>
                <td>{product.location ?? "-"}</td>
                <td className="stock-warning">
                  {formatQuantity(product.availableStock)}
                </td>
                <td>{formatQuantity(product.minimumStock)}</td>
                <td>
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
          <span>Entradas e ajustes que modificaram o estoque atual.</span>
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
};
