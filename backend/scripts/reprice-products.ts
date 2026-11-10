import { setDefaultResultOrder } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";
import { parseArgs } from "node:util";

setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);

type ApiResult<T> = {
  code: number;
  status: "success";
  data: T;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  branchId?: string | null;
  branchName?: string | null;
  branches?: Branch[];
  permissions?: string[];
};

type Branch = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  internalCode: string | null;
  costPrice: string;
  accessoryExpenses: string;
  salePrice: string;
  profitMarginPercentage: string | null;
  currentStock: string;
  active: boolean;
};

type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type RepricingChange = {
  product: Product;
  calculationBase: string;
  expectedSalePrice: string;
};

type RepricingPlan = {
  changes: RepricingChange[];
  alreadyCorrect: Product[];
  skippedAboveTargetMargin: Array<{
    product: Product;
    effectiveMarginPercentage: number | null;
  }>;
  skippedWithoutStock: Product[];
  skippedWithoutCost: Product[];
  invalidPrices: Array<{
    product: Product;
    expectedSalePrice: number;
  }>;
};

type ScriptOptions = {
  allowRemote: boolean;
  apiBaseUrl: string;
  apply: boolean;
  branchId?: string;
  branchName?: string;
  confirmedBranch?: string;
  confirmation?: string;
  delayMs: number;
  margin: number;
};

const applyConfirmation = "ATUALIZAR_PRECOS";
const maximumProductPrice = 9_999_999_999.99;
const options = readOptions(process.argv.slice(2));

if (process.argv.includes("--help")) {
  showHelp();
  process.exit(0);
}

const email = process.env.REPRICE_EMAIL?.trim();
const password = process.env.REPRICE_PASSWORD;

if (!email || !password) {
  throw new Error(
    "Defina REPRICE_EMAIL e REPRICE_PASSWORD no ambiente. As credenciais nao devem ser informadas como argumentos.",
  );
}

if (
  options.apply &&
  !isLocalApi(options.apiBaseUrl) &&
  !options.allowRemote
) {
  throw new Error(
    "Para aplicar em uma API remota, informe tambem --allow-remote.",
  );
}

if (options.apply && options.confirmation !== applyConfirmation) {
  throw new Error(
    `Para aplicar as alteracoes, informe --confirm=${applyConfirmation}.`,
  );
}

const api = createApiClient(options.apiBaseUrl);

try {
  const user = await api.login(email, password);

  if (
    user.role !== "ADMIN" &&
    !user.permissions?.includes("MANAGE_COMMERCIAL_SETTINGS")
  ) {
    throw new Error(
      "O usuario autenticado nao possui permissao para gerenciar configuracoes comerciais.",
    );
  }

  const branch = await resolveBranch(
    api,
    user,
    options.branchId,
    options.branchName,
  );

  if (
    options.apply &&
    normalizeBranchName(options.confirmedBranch) !==
      normalizeBranchName(branch.name)
  ) {
    throw new Error(
      `Para aplicar, informe tambem --confirm-branch="${branch.name}".`,
    );
  }

  const products = await listAllActiveProducts(api, branch.id);
  const plan = buildRepricingPlan(products, options.margin);
  const priceDirections = summarizePriceDirections(plan.changes);

  printPreview(branch, products.length, options, plan, priceDirections);

  if (!options.apply) {
    console.log(
      `\nPrevia concluida. Para aplicar, repita o comando com --apply --confirm=${applyConfirmation}.`,
    );
    process.exitCode = 0;
  } else if (plan.invalidPrices.length > 0) {
    throw new Error(
      "A operacao foi cancelada porque um ou mais precos ultrapassam o limite aceito pelo cadastro.",
    );
  } else if (priceDirections.decreases.length > 0) {
    throw new Error(
      `A operacao foi cancelada porque reduziria o preco de ${priceDirections.decreases.length} produto(s), contrariando a regra de nunca reduzir precos.`,
    );
  } else {
    const result = await applyRepricing(api, branch, options, plan);

    console.log("\nAtualizacao concluida:");
    console.log(JSON.stringify(result, null, 2));
  }
} finally {
  await api.logout();
}

function readOptions(args: string[]): ScriptOptions {
  const parsed = parseArgs({
    args,
    allowPositionals: false,
    options: {
      "allow-remote": { type: "boolean", default: false },
      apply: { type: "boolean", default: false },
      "base-url": { type: "string", default: "http://127.0.0.1:3333" },
      "branch-id": { type: "string" },
      "branch-name": { type: "string" },
      confirm: { type: "string" },
      "confirm-branch": { type: "string" },
      "delay-ms": { type: "string", default: "100" },
      help: { type: "boolean", default: false },
      margin: { type: "string", default: "100" },
    },
    strict: true,
  });
  const margin = Number(parsed.values.margin);
  const delayMs = Number(parsed.values["delay-ms"]);
  const apiBaseUrl = normalizeApiBaseUrl(parsed.values["base-url"] as string);

  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error("A margem deve ser um numero maior ou igual a zero.");
  }

  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 10_000) {
    throw new Error("--delay-ms deve ser um inteiro entre 0 e 10000.");
  }

  if (parsed.values["branch-id"] && parsed.values["branch-name"]) {
    throw new Error("Informe apenas --branch-id ou --branch-name.");
  }

  return {
    allowRemote: parsed.values["allow-remote"] ?? false,
    apiBaseUrl,
    apply: parsed.values.apply ?? false,
    branchId: parsed.values["branch-id"]?.trim() || undefined,
    branchName: parsed.values["branch-name"]?.trim() || undefined,
    confirmedBranch: parsed.values["confirm-branch"]?.trim() || undefined,
    confirmation: parsed.values.confirm,
    delayMs,
    margin,
  };
}

function normalizeApiBaseUrl(value: string) {
  const url = new URL(value);

  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("A URL da API deve usar HTTP ou HTTPS.");
  }

  return url.toString().replace(/\/$/, "");
}

function isLocalApi(apiBaseUrl: string) {
  const host = new URL(apiBaseUrl).hostname;

  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function createApiClient(apiBaseUrl: string) {
  let authCookie: string | undefined;

  async function request<T>(
    path: string,
    input: {
      body?: unknown;
      branchId?: string;
      method?: "GET" | "POST" | "PUT";
    } = {},
  ): Promise<T> {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: input.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(input.body === undefined
          ? {}
          : { "content-type": "application/json" }),
        ...(authCookie ? { cookie: authCookie } : {}),
        ...(input.branchId
          ? { "x-active-branch-id": input.branchId }
          : {}),
        "user-agent": "loja-filtros-product-repricing/1.0",
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
    });
    const payload = (await response.json()) as
      | T
      | { message?: string; errors?: unknown };

    if (!response.ok) {
      const message =
        "message" in payload && typeof payload.message === "string"
          ? payload.message
          : `A API respondeu com status ${response.status}.`;

      throw new Error(`${input.method ?? "GET"} ${path}: ${message}`);
    }

    const setCookie = response.headers.get("set-cookie");

    if (setCookie) {
      authCookie = setCookie.split(";", 1)[0];
    }

    return payload as T;
  }

  return {
    async get<T>(path: string, branchId?: string) {
      return request<T>(path, { branchId });
    },
    async login(email: string, password: string) {
      const result = await request<ApiResult<AuthUser>>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      return result.data;
    },
    async logout() {
      if (!authCookie) {
        return;
      }

      try {
        await request<ApiResult<null>>("/auth/logout", {
          method: "POST",
          body: {},
        });
      } catch {
        // A sessao expira no servidor mesmo se o encerramento explicito falhar.
      } finally {
        authCookie = undefined;
      }
    },
    async put<T>(path: string, body: unknown, branchId: string) {
      return request<T>(path, { body, branchId, method: "PUT" });
    },
  };
}

async function resolveBranch(
  api: ReturnType<typeof createApiClient>,
  user: AuthUser,
  requestedBranchId?: string,
  requestedBranchName?: string,
) {
  const branches =
    user.role === "ADMIN"
      ? (await api.get<ApiResult<Branch[]>>("/branches")).data
      : user.branches ?? [];
  const availableBranches = uniqueBranches([
    ...branches,
    ...(user.branchId
      ? [{ id: user.branchId, name: user.branchName ?? "Filial principal" }]
      : []),
  ]);

  if (requestedBranchId) {
    const branch = availableBranches.find(
      (candidate) => candidate.id === requestedBranchId,
    );

    if (!branch) {
      throw new Error(
        `A filial ${requestedBranchId} nao esta disponivel para o usuario autenticado.`,
      );
    }

    return branch;
  }

  if (requestedBranchName) {
    const normalizedRequestedName = normalizeBranchName(requestedBranchName);
    const matchingBranches = availableBranches.filter(
      (branch) => normalizeBranchName(branch.name) === normalizedRequestedName,
    );

    if (matchingBranches.length !== 1) {
      throw new Error(
        `A filial "${requestedBranchName}" nao foi encontrada de forma unica para o usuario autenticado.`,
      );
    }

    return matchingBranches[0];
  }

  if (availableBranches.length === 1) {
    return availableBranches[0];
  }

  const choices = availableBranches
    .map((branch) => `${branch.name}: ${branch.id}`)
    .join("\n");

  throw new Error(
    `Informe --branch-id para escolher a filial. Opcoes disponiveis:\n${choices}`,
  );
}

function uniqueBranches(branches: Branch[]) {
  return [...new Map(branches.map((branch) => [branch.id, branch])).values()];
}

function normalizeBranchName(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function listAllActiveProducts(
  api: ReturnType<typeof createApiClient>,
  branchId: string,
) {
  const products: Product[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      active: "true",
      includeMeta: "true",
      limit: "100",
      page: String(page),
    });
    const result = await api.get<ApiResult<ProductPage>>(
      `/products?${query.toString()}`,
      branchId,
    );

    products.push(...result.data.items);
    totalPages = result.data.totalPages;
    page += 1;
  } while (page <= totalPages);

  return products;
}

function buildRepricingPlan(products: Product[], margin: number): RepricingPlan {
  const plan: RepricingPlan = {
    changes: [],
    alreadyCorrect: [],
    skippedAboveTargetMargin: [],
    skippedWithoutStock: [],
    skippedWithoutCost: [],
    invalidPrices: [],
  };

  for (const product of products) {
    const currentStock = Number(product.currentStock);

    if (!Number.isFinite(currentStock) || currentStock <= 0) {
      plan.skippedWithoutStock.push(product);
      continue;
    }

    const calculationBaseCents =
      moneyToCents(product.costPrice) +
      moneyToCents(product.accessoryExpenses);

    if (calculationBaseCents <= 0) {
      plan.skippedWithoutCost.push(product);
      continue;
    }

    const expectedSalePriceCents = Math.round(
      calculationBaseCents * (1 + margin / 100),
    );
    const expectedSalePrice = expectedSalePriceCents / 100;
    const currentSalePriceCents = moneyToCents(product.salePrice);
    const storedMargin = nullableNumber(product.profitMarginPercentage);
    const effectiveMarginPercentage =
      currentSalePriceCents > 0
        ? ((currentSalePriceCents - calculationBaseCents) /
            calculationBaseCents) *
          100
        : null;

    if (
      currentSalePriceCents > expectedSalePriceCents ||
      (storedMargin !== null && storedMargin > margin)
    ) {
      plan.skippedAboveTargetMargin.push({
        product,
        effectiveMarginPercentage,
      });
      continue;
    }

    if (
      !Number.isSafeInteger(expectedSalePriceCents) ||
      expectedSalePrice > maximumProductPrice
    ) {
      plan.invalidPrices.push({ product, expectedSalePrice });
      continue;
    }

    if (
      currentSalePriceCents === expectedSalePriceCents &&
      numberEquals(product.profitMarginPercentage, margin)
    ) {
      plan.alreadyCorrect.push(product);
      continue;
    }

    plan.changes.push({
      product,
      calculationBase: centsToMoney(calculationBaseCents),
      expectedSalePrice: centsToMoney(expectedSalePriceCents),
    });
  }

  return plan;
}

async function applyRepricing(
  api: ReturnType<typeof createApiClient>,
  branch: Branch,
  options: ScriptOptions,
  plan: RepricingPlan,
) {
  let updated = 0;
  let becameCorrectBeforeUpdate = 0;
  let becameAboveTargetBeforeUpdate = 0;
  let becameWithoutStockBeforeUpdate = 0;

  for (const [index, change] of plan.changes.entries()) {
    const current = (
      await api.get<ApiResult<Product>>(
        `/products/${encodeURIComponent(change.product.id)}`,
        branch.id,
      )
    ).data;
    const currentPlan = buildRepricingPlan([current], options.margin);

    if (!current.active) {
      throw new Error(
        `${productLabel(current)} foi desativado durante a execucao. Nenhuma outra alteracao sera enviada.`,
      );
    }

    if (currentPlan.skippedWithoutStock.length > 0) {
      becameWithoutStockBeforeUpdate += 1;
      continue;
    }

    if (currentPlan.invalidPrices.length > 0) {
      throw new Error(
        `O novo preco de ${productLabel(current)} ultrapassa o limite do cadastro. Nenhuma outra alteracao sera enviada.`,
      );
    }

    if (currentPlan.skippedWithoutCost.length > 0) {
      throw new Error(
        `O custo de ${productLabel(current)} foi removido durante a execucao. Nenhuma outra alteracao sera enviada.`,
      );
    }

    if (currentPlan.skippedAboveTargetMargin.length > 0) {
      becameAboveTargetBeforeUpdate += 1;
      continue;
    }

    const currentChange = currentPlan.changes[0];

    if (!currentChange) {
      becameCorrectBeforeUpdate += 1;
      continue;
    }

    const result = await api.put<ApiResult<Product>>(
      `/products/${encodeURIComponent(current.id)}`,
      {
        profitMarginPercentage: options.margin,
        salePrice: Number(currentChange.expectedSalePrice),
      },
      branch.id,
    );

    if (
      moneyToCents(result.data.salePrice) !==
        moneyToCents(currentChange.expectedSalePrice) ||
      !numberEquals(result.data.profitMarginPercentage, options.margin)
    ) {
      throw new Error(
        `A API nao confirmou os valores esperados para ${productLabel(current)}.`,
      );
    }

    updated += 1;

    if ((index + 1) % 25 === 0 || index + 1 === plan.changes.length) {
      console.log(
        `Progresso: ${index + 1}/${plan.changes.length} produtos verificados; ${updated} atualizados.`,
      );
    }

    if (options.delayMs > 0) {
      await wait(options.delayMs);
    }
  }

  return {
    mode: "apply",
    branch: branch.name,
    margin: `${options.margin}%`,
    updated,
    alreadyCorrect: plan.alreadyCorrect.length + becameCorrectBeforeUpdate,
    skippedAboveTargetMargin:
      plan.skippedAboveTargetMargin.length + becameAboveTargetBeforeUpdate,
    skippedWithoutStock:
      plan.skippedWithoutStock.length + becameWithoutStockBeforeUpdate,
    skippedWithoutCost: plan.skippedWithoutCost.length,
  };
}

function printPreview(
  branch: Branch,
  productsCount: number,
  options: ScriptOptions,
  plan: RepricingPlan,
  priceDirections: ReturnType<typeof summarizePriceDirections>,
) {
  console.log("Atualizacao de precos do estoque");
  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        api: options.apiBaseUrl,
        branch: branch.name,
        branchId: branch.id,
        margin: `${options.margin}%`,
        totals: {
          activeProducts: productsCount,
          changes: plan.changes.length,
          priceIncreases: priceDirections.increases.length,
          priceDecreases: priceDirections.decreases.length,
          priceUnchangedWithMarginCorrection:
            priceDirections.unchanged.length,
          alreadyCorrect: plan.alreadyCorrect.length,
          skippedAboveTargetMargin: plan.skippedAboveTargetMargin.length,
          skippedWithoutStock: plan.skippedWithoutStock.length,
          skippedWithoutCost: plan.skippedWithoutCost.length,
          invalidPrices: plan.invalidPrices.length,
        },
        sample: plan.changes.slice(0, 20).map((change) => ({
          product: productLabel(change.product),
          calculationBase: change.calculationBase,
          previousMargin: change.product.profitMarginPercentage,
          previousSalePrice: change.product.salePrice,
          expectedMargin: options.margin.toFixed(2),
          expectedSalePrice: change.expectedSalePrice,
        })),
        skippedWithoutCostSample: plan.skippedWithoutCost
          .slice(0, 20)
          .map(productLabel),
        skippedWithoutStockSample: plan.skippedWithoutStock
          .slice(0, 20)
          .map((product) => ({
            product: productLabel(product),
            currentStock: product.currentStock,
          })),
        skippedAboveTargetMarginSample: plan.skippedAboveTargetMargin
          .toSorted(
            (left, right) =>
              (right.effectiveMarginPercentage ?? 0) -
              (left.effectiveMarginPercentage ?? 0),
          )
          .slice(0, 20)
          .map((item) => ({
            product: productLabel(item.product),
            currentSalePrice: item.product.salePrice,
            storedMargin: item.product.profitMarginPercentage,
            effectiveMargin:
              item.effectiveMarginPercentage === null
                ? null
                : `${item.effectiveMarginPercentage.toFixed(2)}%`,
          })),
        largestPriceIncreases: priceDirections.increases
          .toSorted((left, right) => right.percentage - left.percentage)
          .slice(0, 20)
          .map(priceDirectionPreview),
      },
      null,
      2,
    ),
  );
}

function summarizePriceDirections(changes: RepricingChange[]) {
  const directions = changes.map((change) => {
    const previousCents = moneyToCents(change.product.salePrice);
    const expectedCents = moneyToCents(change.expectedSalePrice);
    const differenceCents = expectedCents - previousCents;

    return {
      change,
      differenceCents,
      percentage:
        previousCents > 0
          ? (differenceCents / previousCents) * 100
          : Number.POSITIVE_INFINITY,
    };
  });

  return {
    increases: directions.filter((direction) => direction.differenceCents > 0),
    decreases: directions.filter((direction) => direction.differenceCents < 0),
    unchanged: directions.filter((direction) => direction.differenceCents === 0),
  };
}

function priceDirectionPreview(
  direction: ReturnType<typeof summarizePriceDirections>["increases"][number],
) {
  return {
    product: productLabel(direction.change.product),
    previousSalePrice: direction.change.product.salePrice,
    expectedSalePrice: direction.change.expectedSalePrice,
    difference: centsToMoney(direction.differenceCents),
    percentage:
      Number.isFinite(direction.percentage)
        ? `${direction.percentage.toFixed(2)}%`
        : null,
  };
}

function moneyToCents(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? Math.round(numberValue * 100) : 0;
}

function centsToMoney(value: number) {
  return (value / 100).toFixed(2);
}

function numberEquals(value: string | null, expected: number) {
  if (value === null) {
    return false;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue === expected;
}

function nullableNumber(value: string | null) {
  if (value === null || value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function productLabel(product: Product) {
  return product.internalCode
    ? `${product.internalCode} - ${product.name}`
    : product.name;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function showHelp() {
  console.log(`
Atualiza os precos dos produtos ativos usando custo + despesas acessorias.

Uso:
  REPRICE_EMAIL=usuario REPRICE_PASSWORD=senha npm run products:reprice -- [opcoes]

Opcoes:
  --base-url=URL       API utilizada (padrao: http://127.0.0.1:3333)
  --branch-id=UUID     Filial; obrigatorio quando o usuario acessa mais de uma
  --branch-name=NOME   Alternativa ao UUID para selecionar uma filial pelo nome
  --margin=NUMERO      Margem aplicada (padrao: 100)
  --delay-ms=NUMERO    Intervalo entre atualizacoes (padrao: 100)
  --apply              Aplica as alteracoes; sem esta opcao gera apenas previa
  --confirm=${applyConfirmation}
                       Confirmacao obrigatoria para aplicar
  --confirm-branch=NOME
                       Confirma a unidade exata que recebera a atualizacao
  --allow-remote       Confirmacao adicional para aplicar em API nao local
  --help               Mostra esta ajuda

As credenciais sao lidas apenas das variaveis REPRICE_EMAIL e
REPRICE_PASSWORD e nunca sao exibidas pelo script.
Produtos cuja margem registrada ou preco atual ja estejam acima da meta sao
ignorados. O script nunca reduz precos.
Produtos com estoque atual igual ou menor que zero tambem sao ignorados.
`);
}
