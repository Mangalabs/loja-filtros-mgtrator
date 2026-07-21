# Plano de emissao fiscal com Focus NFe

## Decisao

Usaremos a Focus NFe como API terceira para emissao fiscal. A integracao real deve ficar isolada em `backend/src/integrations/fiscal`, chamada exclusivamente pelos controllers.

O backend nao deve acoplar models, vendas, estoque ou orcamentos diretamente a Focus.

Para o planejamento de TEF, vinculacao de pagamentos no Ceara, NFC-e, Rede e
ECONF, consultar `docs/tef-vinculacao-pagamento-ceara.md`.

## Referencias da Focus

- Documentacao oficial: https://focusnfe.com.br/doc/
- A Focus documenta emissao de NF-e via `POST /v2/nfe?ref=...`.
- A consulta de status usa `GET /v2/nfe/{referencia}`.
- O cancelamento usa `DELETE /v2/nfe/{referencia}` com justificativa.
- A referencia `ref` deve ser unica no sistema para identificar a emissao.
- A Focus trabalha com ambientes de homologacao e producao.
- NFC-e deve usar endpoints proprios e nao esta habilitada neste fluxo.

## Fase 1: provider mock

Objetivo: criar base fiscal interna antes da chamada real para a Focus.

Implementacoes:

- tabela `fiscal_documents`;
- listagem de documentos fiscais;
- detalhe de documento fiscal;
- emissao mock a partir de venda concluida;
- sincronizacao mock de status;
- cancelamento mock;
- provider mock isolado em `integrations/fiscal`;
- configuracao por ambiente.

## Fase 2: provider Focus

Objetivo: trocar o provider mock pelo provider real sem alterar controllers e models.

Arquivos implementados:

```text
backend/src/integrations/fiscal/fiscal-provider.ts
backend/src/integrations/fiscal/fiscal-provider-factory.ts
backend/src/integrations/fiscal/providers/focus-fiscal-provider.ts
backend/src/integrations/fiscal/providers/mock-fiscal-provider.ts
```

Variaveis:

```text
FISCAL_PROVIDER=focus
FISCAL_ENVIRONMENT=homologation
FOCUS_NFE_BASE_URL=
FOCUS_NFE_HOMOLOGATION_BASE_URL=
FOCUS_NFE_PRODUCTION_BASE_URL=
FOCUS_NFE_TOKEN=
FOCUS_NFE_HOMOLOGATION_TOKEN=
FOCUS_NFE_PRODUCTION_TOKEN=
FOCUS_NFE_COMPANY_CNPJ=
```

Observacoes:

- `FISCAL_ENVIRONMENT=homologation` usa `https://homologacao.focusnfe.com.br` quando `FOCUS_NFE_BASE_URL` estiver vazio.
- `FISCAL_ENVIRONMENT=production` usa `https://api.focusnfe.com.br` quando `FOCUS_NFE_PRODUCTION_BASE_URL` estiver vazio.
- `FOCUS_NFE_BASE_URL` e legado e so deve ser usado para homologacao. Para producao, use `FOCUS_NFE_PRODUCTION_BASE_URL` apenas se precisar sobrescrever a URL oficial.
- `FOCUS_NFE_HOMOLOGATION_TOKEN` e `FOCUS_NFE_PRODUCTION_TOKEN` permitem manter os dois tokens configurados sem trocar manualmente.
- `FOCUS_NFE_TOKEN` continua como fallback para ambientes locais simples ou compatibilidade com configuracoes antigas.
- Serie e proximo numero da NF-e continuam controlados pelo painel da Focus. O sistema apenas armazena `numero` e `serie` retornados pela API.
- Com envio sincrono habilitado na Focus, a resposta tende a trazer o status final da emissao imediatamente. Se vier `PROCESSING`, a tela central de notas continua usando a acao de sincronizar.

Implementacoes:

- emissao de NF-e via provider Focus;
- consulta/sincronizacao de status;
- cancelamento de NF-e;
- normalizacao de links de DANFE/XML;
- reemissao de NF-e rejeitada pela mesma origem, substituindo o registro rejeitado;
- bloqueio temporario de NFC-e nas rotas de emissao.

## Dados necessarios para homologacao

Antes da emissao real, precisamos completar dados fiscais:

- dados do emitente: cadastrar o perfil completo da filial ativa, incluindo razao social, nome fantasia, CNPJ, inscricao estadual, endereco, telefone e email;
- configuracao Focus: configurar token/base URL por ambiente e manter o CNPJ fiscal sincronizado com a filial ativa;
- dados do cliente: documento e endereco completo;
- produtos: CFOP, CST/CSOSN, PIS, COFINS, ICMS, modalidade fiscal de unidade;
- venda: cliente vinculado, forma de pagamento e itens com dados fiscais completos.

## Emissao por filial

A emissao de NF-e deve sempre usar a filial ativa como origem fiscal da operacao.

Regras atuais:

- cada filial possui seus proprios dados comerciais e fiscais;
- o CNPJ enviado para a Focus deve ser o CNPJ da filial ativa;
- a tela de configuracao fiscal deve refletir o CNPJ da filial ativa;
- o PDF de orcamento e o comprovante comercial usam os dados da filial ativa;
- fabricantes continuam globais, pois nao pertencem a uma filial especifica;
- produtos, estoque, vendas, reservas, pedidos e orcamentos devem respeitar a filial ativa.

Checklist por filial:

1. Selecionar a filial no cabecalho do sistema.
2. Conferir se a filial possui CNPJ, inscricao estadual e endereco completos.
3. Conferir `Financeiro > Configuracao fiscal`.
4. Criar venda com cliente e produto fiscalmente completos.
5. Emitir NF-e.
6. Sincronizar ate obter status final.
7. Baixar XML e DANFE.
8. Confirmar que CNPJ, razao social e endereco do emitente pertencem a filial ativa.
9. Repetir o fluxo para cada filial antes de liberar uso real.

## Testes sem trial ativo da Focus

Quando o trial ou plano da Focus nao estiver ativo, ainda e possivel testar parte importante da integracao sem chamar a API real.

O backend possui teste automatizado com `fetch` mockado para garantir que:

- a emissao passa pelo provider Focus;
- o payload enviado para a Focus contem o `cnpj_emitente` da filial ativa;
- a resposta simulada e persistida como documento fiscal autorizado;
- o fluxo nao depende de chamada externa real durante o teste.

Esse teste nao substitui a validacao fiscal real, porque nao autoriza nota na SEFAZ. Ele serve para reduzir risco de regressao no nosso sistema enquanto o token/plano Focus nao estiver disponivel.

## Checklist de validacao manual

1. Usar `FISCAL_PROVIDER=mock`.
2. Abrir caixa.
3. Cadastrar cliente com documento e endereco fiscal completo.
4. Cadastrar produto com NCM, CFOP, origem, CST ICMS, CST PIS e CST COFINS.
5. Ajustar estoque do produto.
6. Criar venda de balcao.
7. Acessar `Financeiro > Notas fiscais`.
8. Emitir NF-e da venda.
9. Conferir status `Autorizada`, referencia, DANFE e XML.
10. Sincronizar a nota.
11. Cancelar a nota com justificativa.
12. Sincronizar novamente e confirmar que permanece `Cancelada`.
13. Simular ou provocar uma rejeicao em homologacao e confirmar que a fila permite `Reemitir NF-e` apos corrigir os dados.
14. Repetir o mesmo fluxo com pedido para envio concluido.
15. Repetir o mesmo fluxo com reserva para retirada concluida.
16. Trocar para `FISCAL_PROVIDER=focus` somente em homologacao.
17. Repetir emissao, sincronizacao, reemissao apos rejeicao e cancelamento com dados reais de teste.

## Validacao Focus em homologacao

Validado em homologacao Focus:

- emissao com retorno inicial em processamento;
- sincronizacao para retorno autorizado;
- persistencia de numero, serie, chave, XML e DANFE;
- cancelamento confirmado pela Focus;
- rejeicao controlada por CPF invalido;
- leitura de `mensagem_sefaz` como motivo de rejeicao.

Fluxos autorizados:

- venda de balcao;
- pedido para envio concluido;
- reserva para retirada concluida.

Pendencias antes de producao:

- executar checklist manual final com dados reais da empresa antes de qualquer emissao fiscal valida;
- repetir o checklist manual para cada filial com CNPJ proprio;
- confirmar no XML/DANFE autorizado que os dados do emitente pertencem a filial correta;
- tratar novos campos fiscais que surgirem a partir de rejeicoes reais da SEFAZ/Focus.

Travas ja implementadas:

- configuracao fiscal central em `Financeiro > Configuracao fiscal`;
- bloqueio de emissao em producao quando `allowProduction` estiver desligado;
- confirmacao textual obrigatoria `EMITIR EM PRODUCAO` na UI/API para salvar producao liberada.
- checklist visual obrigatorio antes de salvar producao liberada.
- reemissao apos rejeicao coberta em teste para mock e Focus.

## Cuidados arquiteturais

- Models persistem documentos fiscais e payloads internos.
- Controllers validam a origem, montam payload e chamam provider.
- Views expõem endpoints.
- Integrations chamam Focus ou mock.
- Nenhuma chamada externa deve ser feita por model.
