# Padrao de Renderizacao Condicional no Frontend

## Objetivo

Evitar que fluxos importantes sejam espalhados em blocos `if/else` dentro dos componentes principais. Para estados de UI com caminhos bem definidos, preferimos:

- lookup tables;
- pequenas strategies;
- componentes de gate ou renderer.

Esse padrao deixa o fluxo mais explicito, facilita testes futuros e reduz risco em areas sensiveis como autenticacao.

## Exemplo Aplicado: Autenticacao

O `App.tsx` nao decide mais diretamente com `if` qual tela renderizar. Ele entrega o estado atual para `AuthGate`.

O `AuthGate` usa duas partes:

- `authStateStrategies`: lista ordenada que resolve o estado atual da autenticacao.
- `authStateRenderers`: mapa entre estado e componente renderizado.

Estados atuais:

- `loading`: sessao ainda esta sendo validada;
- `authenticated`: usuario autenticado, renderiza o shell do sistema;
- `anonymous`: sem usuario, renderiza login ou primeiro acesso.

## Regra de Uso

Use esse padrao quando:

- houver tres ou mais estados de tela;
- a regra de escolha for importante para seguranca ou negocio;
- o componente principal estiver virando uma sequencia de condicionais;
- novos estados puderem ser adicionados no futuro.

Evite esse padrao quando:

- a condicao for pontual e local;
- uma expressao simples for mais legivel que uma estrutura de strategies;
- a abstracao esconder uma regra que deveria estar perto da tela.

## Aplicacao Gradual

Esse padrao deve ser aplicado aos poucos, durante manutencoes naturais. Prioridades futuras:

- renderizacao de status de pedidos e reservas;
- acoes por status em vendas/envios;
- estados de pagamento;
- fluxos fiscais;
- permissoes de usuario.
