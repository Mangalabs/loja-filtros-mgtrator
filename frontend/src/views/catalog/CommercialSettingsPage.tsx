import TextField from "@mui/material/TextField";
import { Percent, Save } from "lucide-react";
import type { FormEvent } from "react";
import type { CommercialSettings } from "../../api";
import { FormCard, FormGrid, PageHeader } from "../../components/layout";
import { PrimaryButton } from "../../components/ui";

export function CommercialSettingsPage({
  settings,
  onSubmit,
}: {
  settings: CommercialSettings | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
      <FormGrid
        key={settings?.id ?? "commercial-settings"}
        className="max-w-2xl"
        onSubmit={onSubmit}
      >
        <PageHeader
          description="Defina a margem de venda e os prazos sugeridos ao montar orcamentos."
          icon={<Percent size={18} />}
          title="Configuracao comercial"
        />
        <TextField
          defaultValue={settings?.defaultProfitMarginPercentage ?? "0"}
          helperText="Exemplo: com margem 50%, um custo de R$ 50,00 sugere venda de R$ 75,00."
          label="Margem de lucro base (%)"
          name="defaultProfitMarginPercentage"
          required
          type="number"
          slotProps={{ htmlInput: { min: 0, max: 1000, step: "0.01" } }}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={settings?.defaultQuoteDueDays ?? 0}
            helperText="Quantidade de dias somada a data de emissao para sugerir o vencimento."
            label="Vencimento padrao (dias)"
            name="defaultQuoteDueDays"
            required
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 365, step: 1 } }}
          />
          <TextField
            defaultValue={settings?.defaultQuoteValidityDays ?? 7}
            helperText="Quantidade de dias somada a data de emissao para preencher a validade."
            label="Validade padrao (dias)"
            name="defaultQuoteValidityDays"
            required
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 365, step: 1 } }}
          />
        </div>
        <PrimaryButton icon={<Save size={17} />} type="submit">
          Salvar configuracao
        </PrimaryButton>
      </FormGrid>

      <FormCard>
        <PageHeader title="Como essa regra funciona" />
        <p className="m-0 text-sm leading-6 text-[#5f665f]">
          Ao informar o custo em um novo produto, o sistema preenche o campo de
          venda com a margem configurada. O valor continua editavel antes de
          salvar, porque alguns itens podem precisar de precificacao propria.
        </p>
        <p className="m-0 text-sm leading-6 text-[#5f665f]">
          Produtos ja cadastrados mantem o preco atual ao serem editados, para
          evitar alteracoes automaticas em cadastros existentes.
        </p>
        <p className="m-0 text-sm leading-6 text-[#5f665f]">
          O vencimento e a validade padrao do orcamento sao preenchidos
          automaticamente a partir da emissao, mas continuam editaveis no
          momento de montar a proposta.
        </p>
      </FormCard>
    </section>
  );
}
