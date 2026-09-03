# Notas de atualizacao para usuarios

Pacote planejado para deploy em 01/09/2026.

## Principais melhorias

- A tela de **Pedidos com envio** ficou mais organizada: a lista agora ocupa melhor a area principal, e o acesso aos orcamentos fica no proprio cabecalho da listagem.
- A tela de **Orcamentos** foi reorganizada para funcionar melhor em telas menores, sem deixar o formulario de criacao espremido ao lado da lista.
- O formulario de **Orcamento** agora tem pesquisa de cliente, facilitando encontrar o cliente pelo nome ou telefone.
- O **Historico de vendas** ficou mais simples: a coluna `Origem` foi removida da tabela principal.
- As colunas de numero ficaram mais claras nas telas, como **No da venda**, **No do orcamento** e **No da NF-e**.
- As formas de pagamento agora incluem **Dinheiro**.
- O cadastro e a edicao de produto agora mostram **Estoque atual**, com o mesmo saldo fisico exibido na lista de produtos.
- Ao alterar o estoque atual pelo cadastro do produto, o sistema registra a correcao no historico de estoque.

## Cuidados no uso

- Antes de salvar um produto, confira se o campo **Estoque atual** representa o saldo fisico real da loja.
- Se algum produto estiver com estoque negativo por causa de testes ou ajustes anteriores, corrija o saldo pela edicao do produto.
- Ao usar **Dinheiro** como forma de pagamento, confira o fechamento de caixa normalmente.
- Em orcamentos, confirme se o cliente pesquisado e selecionado esta correto antes de salvar ou gerar PDF.

## Em caso de duvida

Registre no canal de suporte interno:

- tela onde ocorreu;
- usuario logado;
- filial ativa;
- horario aproximado;
- mensagem de erro, se existir;
- numero da venda, orcamento ou nota fiscal;
- codigo ou nome do produto, se o problema envolver estoque.
