import type { FormEvent } from "react";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiResult,
  type Client,
  type ClientCompanyLookup,
  type NamedEntity,
  type Product,
  type Supplier,
} from "../../api";
import { nullableFormValue, optionalFormValue } from "../../utils/forms";
import { productFormBody } from "./productFormBody";

type CatalogActionsOptions = {
  refreshCatalogFlow: () => Promise<void>;
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
  selectedClient?: Client;
  selectedProduct?: Product;
  setSelectedClient: (client: Client | undefined) => void;
  setSelectedProduct: (product: Product | undefined) => void;
  afterClientSave?: () => Promise<void> | void;
  afterCommercialSettingsSave?: () => Promise<void> | void;
  afterProductSave?: () => Promise<void> | void;
  showEditProduct: () => void;
  showNewProduct: () => void;
  showProducts: () => void;
};

export function useCatalogActions({
  refreshCatalogFlow,
  requestConfirmation,
  runAction,
  selectedClient,
  selectedProduct,
  setSelectedClient,
  setSelectedProduct,
  afterClientSave,
  afterCommercialSettingsSave,
  afterProductSave,
  showEditProduct,
  showNewProduct,
  showProducts,
}: CatalogActionsOptions) {
  async function saveNamedEntity(
    event: FormEvent<HTMLFormElement>,
    path: string,
    fieldName: string,
    entity?: NamedEntity,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get(fieldName) ?? "").trim();

    if (!name) {
      return;
    }

    const saved = await runAction(async () => {
      const body = {
        name,
        ...(entity ? { active: form.get("active") === "true" } : {}),
      };

      if (entity) {
        await apiPut(`${path}/${entity.id}`, body);
      } else {
        await apiPost(path, body);
      }
      formElement.reset();
      await refreshCatalogFlow();
    });

    return saved;
  }

  async function deleteNamedEntity(
    entity: NamedEntity,
    path: string,
    label: string,
  ) {
    const confirmed = await requestConfirmation(
      `Excluir ${label.toLowerCase()} "${entity.name}"? Os produtos vinculados permanecerao cadastrados, mas ficarao sem fabricante.`,
      `Excluir ${label.toLowerCase()}?`,
      "Excluir",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiDelete(`${path}/${entity.id}`);
      await refreshCatalogFlow();
    });
  }

  async function saveSupplier(
    event: FormEvent<HTMLFormElement>,
    supplier?: Supplier,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const saved = await runAction(async () => {
      const body = {
        name: String(form.get("supplierName") ?? "").trim(),
        document: nullableFormValue(form, "supplierDocument"),
        phone: nullableFormValue(form, "supplierPhone"),
        email: nullableFormValue(form, "supplierEmail"),
        ...(supplier
          ? { active: form.get("supplierActive") === "true" }
          : {}),
      };

      if (supplier) {
        await apiPut(`/suppliers/${supplier.id}`, body);
      } else {
        await apiPost("/suppliers", body);
      }

      formElement.reset();
      await refreshCatalogFlow();
    });

    return saved;
  }

  async function deleteSupplier(supplier: Supplier) {
    const confirmed = await requestConfirmation(
      `Excluir o fornecedor "${supplier.name}"? A exclusao sera bloqueada se houver produtos, entradas ou notas de compra vinculadas.`,
      "Excluir fornecedor?",
      "Excluir",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiDelete(`/suppliers/${supplier.id}`);
      await refreshCatalogFlow();
    });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const personType = String(form.get("clientPersonType") ?? "PF");
    const stateRegistrationIndicator =
      personType !== "ES"
        ? nullableFormValue(form, "clientStateRegistrationIndicator")
        : "9";
    const body = {
      personType,
      name: String(form.get("clientName") ?? "").trim(),
      document: nullableFormValue(form, "clientDocument"),
      phone: nullableFormValue(form, "clientPhone"),
      email: nullableFormValue(form, "clientEmail"),
      stateRegistration:
        stateRegistrationIndicator === "1"
          ? nullableFormValue(form, "clientStateRegistration")
          : null,
      stateRegistrationIndicator,
      addressStreet: nullableFormValue(form, "clientAddressStreet"),
      addressNumber: nullableFormValue(form, "clientAddressNumber"),
      addressComplement: nullableFormValue(form, "clientAddressComplement"),
      addressDistrict: nullableFormValue(form, "clientAddressDistrict"),
      addressCity: nullableFormValue(form, "clientAddressCity"),
      addressState: nullableFormValue(form, "clientAddressState"),
      addressZipCode: nullableFormValue(form, "clientAddressZipCode"),
    };

    await runAction(async () => {
      const save = selectedClient
        ? () => apiPut(`/clients/${selectedClient.id}`, body)
        : () => apiPost("/clients", body);

      await save();
      formElement.reset();
      setSelectedClient(undefined);
      await refreshCatalogFlow();
      await afterClientSave?.();
    });
  }

  async function lookupClientCompany(cnpj: string) {
    const result = await apiGet<ApiResult<ClientCompanyLookup>>(
      `/clients/cnpj/${encodeURIComponent(cnpj)}`,
    );

    return result.data;
  }

  async function saveCommercialSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await apiPut("/commercial-settings", {
        defaultProfitMarginPercentage: Number(
          form.get("defaultProfitMarginPercentage") ?? 0,
        ),
        defaultQuoteDueDays: Number(form.get("defaultQuoteDueDays") ?? 0),
        defaultQuoteValidityDays: Number(
          form.get("defaultQuoteValidityDays") ?? 7,
        ),
      });
      await refreshCatalogFlow();
      await afterCommercialSettingsSave?.();
    });
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/products", productFormBody(form));
      formElement.reset();
      setSelectedProduct(undefined);
      await refreshCatalogFlow();
      if (afterProductSave) {
        await afterProductSave();
      } else {
        showProducts();
      }
    });
  }

  async function updateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await apiPut(`/products/${selectedProduct.id}`, productFormBody(form));
      setSelectedProduct(undefined);
      await refreshCatalogFlow();
      if (afterProductSave) {
        await afterProductSave();
      } else {
        showProducts();
      }
    });
  }

  async function changeProductStatus(product: Product) {
    const nextStatus = product.active ? "inativar" : "ativar";
    const confirmed = await requestConfirmation(
      `Confirmar ${nextStatus} o produto "${product.name}"?`,
      "Alterar status do produto?",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/products/${product.id}/status`, {
        active: !product.active,
      });
      await refreshCatalogFlow();
    });
  }

  async function deleteProduct(product: Product) {
    const confirmed = await requestConfirmation(
      `Excluir o produto "${product.name}" da lista? O historico de vendas, orcamentos e movimentacoes sera preservado.`,
      "Excluir produto?",
      "Excluir",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiDelete(`/products/${product.id}`);
      await refreshCatalogFlow();
    });
  }

  async function changeClientStatus(client: Client) {
    const nextStatus = client.active ? "inativar" : "ativar";
    const confirmed = await requestConfirmation(
      `Confirmar ${nextStatus} o cliente "${client.name}"?`,
      "Alterar status do cliente?",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/clients/${client.id}/status`, {
        active: !client.active,
      });
      await refreshCatalogFlow();
    });
  }

  async function deleteClient(client: Client) {
    const confirmed = await requestConfirmation(
      `Excluir definitivamente o cliente "${client.name}"? Esta acao so sera permitida se ele nao tiver vendas, orcamentos, pedidos ou reservas vinculadas.`,
      "Excluir cliente?",
      "Excluir",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiDelete(`/clients/${client.id}`);
      await refreshCatalogFlow();
    });
  }

  function editProduct(product: Product) {
    setSelectedProduct(product);
    showEditProduct();
  }

  function cloneProduct(product: Product) {
    setSelectedProduct(product);
    showNewProduct();
  }

  return {
    changeClientStatus,
    changeProductStatus,
    cloneProduct,
    createProduct,
    deleteClient,
    deleteNamedEntity,
    deleteProduct,
    deleteSupplier,
    editProduct,
    lookupClientCompany,
    saveClient,
    saveCommercialSettings,
    saveNamedEntity,
    saveSupplier,
    updateProduct,
  };
}
