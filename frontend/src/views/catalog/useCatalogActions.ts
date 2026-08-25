import type { FormEvent } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiResult,
  type Client,
  type ClientCompanyLookup,
  type Product,
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
  showEditProduct: () => void;
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
      await refreshCatalogFlow();
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
      await refreshCatalogFlow();
    });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const personType = String(form.get("clientPersonType") ?? "PF");
    const stateRegistrationIndicator =
      personType === "PJ"
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
    });
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/products", productFormBody(form));
      formElement.reset();
      showProducts();
      await refreshCatalogFlow();
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
      showProducts();
      await refreshCatalogFlow();
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
    lookupClientCompany,
    saveClient,
    saveCommercialSettings,
    updateProduct,
  };
}
