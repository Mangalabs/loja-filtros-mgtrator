# Notas de atualizacao para usuarios

Pacote planejado para deploy em 28/08/2026.

## Principais melhorias

- Formas de pagamento agora incluem **cartao de credito**.
- Vendas podem ser fechadas com **mais de uma forma de pagamento**, como PIX + credito.
- Orcamentos, vendas e comprovantes ficaram mais claros nas datas:
  - data da fatura;
  - primeiro vencimento do boleto/fatura;
  - validade do orcamento.
- Orcamentos e vendas agora exibem um numero simples de identificacao nas listas e documentos.
- Comprovantes comerciais passaram a mostrar dados do cliente, incluindo CPF/CNPJ quando informado.
- Historico de vendas permite ajustar dados comerciais da venda, como datas de fatura e vencimento, quando ainda nao houver NF-e ativa bloqueando a alteracao.
- Tela de notas fiscais facilita a correcao de pendencias, direcionando para cliente, produto ou configuracao fiscal.
- Sistema fiscal passa a respeitar o CNPJ da filial ativa e pode usar token Focus especifico por CNPJ.

## Cuidados no uso

- Antes de emitir NF-e real, confira se a filial ativa esta correta no topo do sistema.
- Confira se cliente e produtos estao completos antes de emitir nota.
- Quando houver pagamento dividido, confirme se a soma dos pagamentos fecha exatamente o total da venda.
- Depois da primeira NF-e real de cada filial, baixe XML/DANFE e confira CNPJ, endereco, cliente, produtos, totais e vencimentos.

## Em caso de duvida

Registre no canal de suporte interno:

- tela onde ocorreu;
- usuario logado;
- filial ativa;
- horario aproximado;
- mensagem de erro, se existir;
- numero da venda, orcamento ou nota fiscal.
