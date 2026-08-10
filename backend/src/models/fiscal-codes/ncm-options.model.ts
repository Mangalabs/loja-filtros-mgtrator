export type NcmOption = {
  code: string;
  label: string;
  productCount: number;
  sampleProducts: string[];
};

const inventoryNcmRows = [
  ["84212300", "FILTRO DE COMBUSTIVEL ORIGINAL 54315408/54315443"],
  ["85129000", "COMPRESSOR DO AR CONDICIONADO ROYCE"],
  ["85365090", "INTERRUPTOR PRINCIPAL DNI (CHAVE GERAL) 17418494"],
  ["40103200", "CORREIA ALTERNADOR/ BOMBA AGUA GATES"],
  ["40103200", "CORREIA DO A/C GATES"],
  ["90299090", "TACOMETRO"],
  ["84833029", "BRONZE DE BIELA STD MD6E"],
  ["84198999", "RESFRIADOR DE OLEO DO MOTOR D6E 23191319/22592869"],
  ["85364900", "SENSOR DE ROTACAO 20482772"],
  ["84148021", "TURBO COMPRESSOR CARREGADEIRA VOLVO 22067473"],
  ["85122011", "FAROL DIANTEIRO LADO ESQUERDO"],
  ["85122011", "FAROL DIANTEIRO LADO DIREITO"],
  ["84213990", "FILTRO SECADOR GREEN"],
  ["84314929", "TANQUE EXPANSAO COM TAMPA IMPORTADO"],
  ["84818092", "VALVULA HIDRAULICA C/ VEDACAO"],
  ["85371090", "PAINEL COMANDO A/C 17532110/17532105"],
  ["70091000", "ESPELHO RETROVISOR ENCAIXE ORIGINAL"],
  ["85122011", "LANTERNA TRASEIRA"],
  ["73181500", "PARAFUSO DO INJETOR VOLVO"],
  ["84212300", "VALVULA COMBINADA DO SEPARADOR DE OLEO E AGUA"],
  ["90328924", "CHAVE DE PARTIDA (CILINDRO FECHADURA)"],
  ["40169300", "JOGO DE VEDACAO DO CILINDRO DE DIRECAO SDLG"],
  ["84812090", "VALVULA SELETORA TRANSMISSAO IMP DIR"],
  ["84198999", "RESFRIADOR DE OLEO (CARCACA)"],
  ["84798932", "ACUMULADOR DE NITROGENIO FREIO 0,5 11173688"],
  ["84835010", "POLIA DA CORREIA DENTADA"],
  ["84149020", "SUPORTE DO VENTILADOR"],
  ["40169300", "KIT CILINDRO LANCA 14589122 ORIGINAL"],
  ["87089990", "TAMPA DO ABASTECEDOR DE OLEO TRANSMISSAO ORIGINAL"],
  ["01012900", "VALVULA DE CONTROLE PRINCIPAL"],
  ["84189900", "CONDENSADOR TYSM 14591537"],
  ["84818092", "VALVULA SOLENOIDE EGR"],
  ["87082919", "AMORTECEDOR"],
  ["84314929", "TANQUE EXPANSAO DUAS TAMPAS IMP"],
  ["84213990", "FILTRO RESPIRO TANQUE HIDRAULICO RHINO"],
  ["84212300", "FILTRO DO A/C PRIMARIO GENUINE PARTS 11703979"],
  ["84212990", "FILTRO SISTEMA HIDRAULICO GENUINE PARTS 14750657"],
  ["85114000", "MOTOR DE PARTIDA COMPLETO"],
  ["84219999", "FILTRO DE AR INTERNO SECUNDARIO RHINO"],
  ["84212300", "ELEMENTO FILTRANTE GENUINE PARTS 14532686"],
  ["84219999", "PENEIRA TANQUE HIDRAULICO GENUINE PARTS14531866"],
  ["90261029", "SENSOR DE NIVEL DE AGUA 8140024/21399626 IMP"],
  ["84314923", "TANQUE DE EXTENSAO"],
  ["90299090", "TACOMETRO ORIGINAL"],
  ["84219999", "ELEMENTO DE FILTRAGEM ORIGINAL"],
  ["84814000", "KIT DE SERVICO"],
  ["84219999", "ELEMENTO DE FILTRAGEM GENUINE PARTS"],
  ["84212300", "FILTRO SEPARADOR DE AGUA RHINO"],
  ["84099999", "SUPORTE DO ROLAMENTO COMPLETO"],
  ["84212300", "FILTRO SEPARADOR DE AGUA ORIGINAL"],
] as const;

const sampleLimit = 3;

export function listNcmOptions(search?: string): NcmOption[] {
  const normalizedSearch = normalizeSearch(search);

  return buildNcmOptions()
    .filter((option) => matchesSearch(option, normalizedSearch))
    .sort((first, second) => first.code.localeCompare(second.code));
}

function buildNcmOptions() {
  const grouped = inventoryNcmRows.reduce<Record<string, string[]>>(
    (accumulator, [code, productName]) => ({
      ...accumulator,
      [code]: [...(accumulator[code] ?? []), productName],
    }),
    {},
  );

  return Object.entries(grouped).map(([code, productNames]) => ({
    code,
    label: labelFromProductNames(productNames),
    productCount: productNames.length,
    sampleProducts: productNames.slice(0, sampleLimit),
  }));
}

function labelFromProductNames(productNames: string[]) {
  const firstProduct = productNames[0] ?? "Produtos do inventario";

  return productNames.length > 1
    ? `${firstProduct} e relacionados`
    : firstProduct;
}

function matchesSearch(option: NcmOption, search: string) {
  if (!search) {
    return true;
  }

  return [option.code, option.label, ...option.sampleProducts]
    .map((value) => normalizeSearch(value))
    .some((value) => value.includes(search));
}

function normalizeSearch(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
