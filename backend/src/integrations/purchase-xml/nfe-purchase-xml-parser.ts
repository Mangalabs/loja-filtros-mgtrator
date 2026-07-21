import { AppError } from "../../shared/errors/app-error.js";
import type {
  PurchaseInvoiceDraftInput,
  PurchaseInvoiceItemInput,
} from "../../models/purchase-invoices/purchase-invoices.model.js";

export function parseNfePurchaseXml(
  xmlContent: string,
): PurchaseInvoiceDraftInput {
  const normalizedXml = xmlContent.trim();

  if (!normalizedXml) {
    throw new AppError("XML da NF-e de compra nao informado.", 422);
  }

  const accessKey =
    xmlText(normalizedXml, "chNFe") ?? infNfeAccessKey(normalizedXml);
  const supplierName = xmlText(normalizedXml, "xNome", "emit");
  const items = xmlBlocks(normalizedXml, "det").map(purchaseItemFromDet);

  if (!accessKey || accessKey.length !== 44) {
    throw new AppError("XML de compra sem chave de acesso valida.", 422);
  }

  if (!supplierName) {
    throw new AppError("XML de compra sem nome do fornecedor.", 422);
  }

  if (items.length === 0) {
    throw new AppError("XML de compra sem itens.", 422);
  }

  return {
    accessKey,
    installments: xmlBlocks(normalizedXml, "dup").map(installmentFromDup),
    issueDate: issueDate(xmlText(normalizedXml, "dhEmi") ?? xmlText(normalizedXml, "dEmi")),
    items,
    number: xmlText(normalizedXml, "nNF"),
    series: xmlText(normalizedXml, "serie"),
    supplierDocument:
      xmlText(normalizedXml, "CNPJ", "emit") ??
      xmlText(normalizedXml, "CPF", "emit"),
    supplierName,
    totalAmount: xmlNumber(xmlText(normalizedXml, "vNF", "ICMSTot")),
    transporterDocument:
      xmlText(normalizedXml, "CNPJ", "transporta") ??
      xmlText(normalizedXml, "CPF", "transporta"),
    transporterName: xmlText(normalizedXml, "xNome", "transporta"),
    xmlContent: normalizedXml,
  };
}

function installmentFromDup(dupXml: string) {
  return {
    dueDate: issueDate(xmlText(dupXml, "dVenc")),
    number: xmlText(dupXml, "nDup"),
    value: xmlNumber(xmlText(dupXml, "vDup")),
  };
}

function purchaseItemFromDet(detXml: string, index: number): PurchaseInvoiceItemInput {
  const description = xmlText(detXml, "xProd", "prod");

  if (!description) {
    throw new AppError(`Item ${index + 1} do XML sem descricao.`, 422);
  }

  return {
    cfop: xmlText(detXml, "CFOP", "prod"),
    description,
    ncm: xmlText(detXml, "NCM", "prod"),
    position: detPosition(detXml) ?? index + 1,
    quantity: xmlNumber(xmlText(detXml, "qCom", "prod")),
    supplierProductCode: xmlText(detXml, "cProd", "prod"),
    totalAmount: xmlNumber(xmlText(detXml, "vProd", "prod")),
    unit: xmlText(detXml, "uCom", "prod"),
    unitCost: xmlNumber(xmlText(detXml, "vUnCom", "prod")),
  };
}

function detPosition(detXml: string) {
  const match = detXml.match(/<det\b[^>]*\bnItem=["'](\d+)["'][^>]*>/i);
  return match?.[1] ? Number(match[1]) : null;
}

function infNfeAccessKey(xml: string) {
  const match = xml.match(/<infNFe\b[^>]*\bId=["']NFe(\d{44})["'][^>]*>/i);
  return match?.[1] ?? null;
}

function issueDate(value: string | null) {
  return value?.slice(0, 10) ?? null;
}

function xmlNumber(value: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function xmlText(xml: string, tag: string, parentTag?: string) {
  const scope = parentTag ? xmlBlock(xml, parentTag) ?? "" : xml;
  const match = scope.match(tagPattern(tag));
  return match?.[1] ? decodeXml(match[1].trim()) : null;
}

function xmlBlock(xml: string, tag: string) {
  return xmlBlocks(xml, tag)[0] ?? null;
}

function xmlBlocks(xml: string, tag: string) {
  const matches = [...xml.matchAll(blockPattern(tag))];
  return matches.map((match) => match[0]);
}

function tagPattern(tag: string) {
  return new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i");
}

function blockPattern(tag: string) {
  return new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>[\\s\\S]*?<\\/(?:\\w+:)?${tag}>`, "gi");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}
