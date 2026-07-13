import type { PurchaseInvoiceDraft } from "../../api";

export function parsePurchaseXmlPreview(xmlContent: string): PurchaseInvoiceDraft {
  const xml = xmlContent.trim();

  if (!xml) {
    throw new Error("XML da NF-e de compra nao informado.");
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parseError = firstElement(document, "parsererror");

  if (parseError) {
    throw new Error("XML da NF-e de compra invalido.");
  }

  const accessKey = text(document, "chNFe") ?? infNfeAccessKey(document);
  const supplierName = scopedText(document, "emit", "xNome");
  const items = elements(document, "det").map(purchaseItemFromElement);

  if (!accessKey || accessKey.length !== 44) {
    throw new Error("XML de compra sem chave de acesso valida.");
  }

  if (!supplierName) {
    throw new Error("XML de compra sem nome do fornecedor.");
  }

  if (items.length === 0) {
    throw new Error("XML de compra sem itens.");
  }

  return {
    accessKey,
    issueDate: issueDate(text(document, "dhEmi") ?? text(document, "dEmi")),
    items,
    number: text(document, "nNF"),
    series: text(document, "serie"),
    supplierDocument:
      scopedText(document, "emit", "CNPJ") ??
      scopedText(document, "emit", "CPF"),
    supplierName,
    totalAmount: numberValue(scopedText(document, "ICMSTot", "vNF")),
    xmlContent: xml,
  };
}

function purchaseItemFromElement(
  element: Element,
  index: number,
): PurchaseInvoiceDraft["items"][number] {
  const description = scopedText(element, "prod", "xProd");

  if (!description) {
    throw new Error(`Item ${index + 1} do XML sem descricao.`);
  }

  return {
    cfop: scopedText(element, "prod", "CFOP"),
    description,
    ncm: scopedText(element, "prod", "NCM"),
    position: index + 1,
    quantity: numberValue(scopedText(element, "prod", "qCom")),
    supplierProductCode: scopedText(element, "prod", "cProd"),
    totalAmount: numberValue(scopedText(element, "prod", "vProd")),
    unit: scopedText(element, "prod", "uCom"),
    unitCost: numberValue(scopedText(element, "prod", "vUnCom")),
  };
}

function issueDate(value: string | null) {
  return value?.slice(0, 10) ?? null;
}

function numberValue(value: string | null) {
  return Number(value ?? 0);
}

function infNfeAccessKey(document: Document) {
  const infNfe = firstElement(document, "infNFe");
  const id = infNfe?.getAttribute("Id") ?? "";

  return id.startsWith("NFe") ? id.slice(3) : null;
}

function scopedText(
  root: Document | Element,
  parentTag: string,
  tag: string,
) {
  const parent = firstElement(root, parentTag);

  return parent ? text(parent, tag) : null;
}

function text(root: Document | Element, tag: string) {
  return firstElement(root, tag)?.textContent?.trim() || null;
}

function firstElement(root: Document | Element, tag: string) {
  return elements(root, tag)[0] ?? null;
}

function elements(root: Document | Element, tag: string) {
  return Array.from(root.getElementsByTagName("*")).filter(
    (element) => element.localName === tag,
  );
}
