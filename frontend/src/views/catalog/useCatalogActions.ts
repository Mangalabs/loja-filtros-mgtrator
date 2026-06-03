import type { FormEvent } from "react";
import { apiPatch, apiPost, apiPut, type Client, type Product } from "../../api";
import { nullableFormValue, optionalFormValue } from "../../utils/forms";
import { productFormBody } from "./productFormBody";

type CatalogActionsOptions = {
  loadCatalog: () => Promise<void>;
  requestConfirmation: (message: string, title?: string, confirmLabel?: string) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
  selectedClient?: Client;
  selectedProduct?: Product;
  setSelectedClient: (client: Client | undefined) => void;
  setSelectedProduct: (product: Product | undefined) => void;
  showEditProduct: () => void;
  showProducts: () => void;
};

export function useCatalogActions({
  loadCatalog,
  requestConfirmation,
  runAction,
  selectedClient,
  selectedProduct,
  setSelectedClient,
  setSelectedProduct,
  showEditProduct,
  showProducts,
}: CatalogActionsOptions) {
  async function createNamedEntity(
    event: FormEvent<HTMLFormElement>,
    path: string,
    fieldName: string,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get(fieldName) ?? "").trim();

    if (!name) {
      return;
    }

    await runAction(async () => {
      await apiPost(path, { name });
      formElement.reset();
      await loadCatalog();
    });
  }

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/suppliers", {
        name: String(form.get("supplierName") ?? "").trim(),
        document: optionalFormValue(form, "supplierDocument"),
        phone: optionalFormValue(form, "supplierPhone"),
        email: optionalFormValue(form, "supplierEmail"),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      personType: String(form.get("clientPersonType") ?? "PF"),
      name: String(form.get("clientName") ?? "").trim(),
      document: nullableFormValue(form, "clientDocument"),
      phone: nullableFormValue(form, "clientPhone"),
      email: nullableFormValue(form, "clientEmail"),
    };

    await runAction(async () => {
      const save = selectedClient
        ? () => apiPut(`/clients/${selectedClient.id}`, body)
        : () => apiPost("/clients", body);

      await save();
      formElement.reset();
      setSelectedClient(undefined);
      await loadCatalog();
    });
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/products", productFormBody(form));
      formElement.reset();
      await loadCatalog();
      showProducts();
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
      await loadCatalog();
      setSelectedProduct(undefined);
      showProducts();
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
      await apiPatch(`/products/${product.id}/status`, { active: !product.active });
      await loadCatalog();
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
      await apiPatch(`/clients/${client.id}/status`, { active: !client.active });
      await loadCatalog();
    });
  }

  function editProduct(product: Product) {
    setSelectedProduct(product);
    showEditProduct();
  }

  return {
    changeClientStatus,
    changeProductStatus,
    createNamedEntity,
    createProduct,
    createSupplier,
    editProduct,
    saveClient,
    updateProduct,
  };
}
