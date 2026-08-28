# Manual inicial de uso

Este manual descreve o uso inicial do sistema da filial de filtros. Ele cobre as telas que ja existem no sistema: produtos, fabricantes, clientes, fornecedores, entrada manual de mercadoria, ajuste manual de estoque, historico de estoque, consulta de reposicao, formas de pagamento, abertura de caixa, venda direta e pedidos com envio.

As rotinas de venda, saida por venda, permissoes detalhadas, relatorios e emissao fiscal ainda fazem parte das proximas fases do projeto.

## Acesso ao sistema

No primeiro acesso, enquanto ainda nao existir usuario, a tela inicial solicita a criacao do administrador. Informe nome, email e uma senha de pelo menos 12 caracteres.

Depois da configuracao inicial, o sistema exibe somente a tela de login. A sessao e mantida em cookie protegido e expira apos 8 horas; o navegador nao armazena a senha nem expoe o token para a interface.

Com a sessao iniciada, o nome do usuario aparece no cabecalho. Use **Sair** ao encerrar o uso do computador.

## Visao geral da tela

Ao abrir o sistema, o usuario encontra uma barra lateral com as areas principais:

- **Produtos**: consulta do catalogo e cadastro de novo produto.
- **Estoque**: registro de entrada manual de mercadoria recebida, ajuste de saldo, historico e consulta de reposicao.
- **Cadastros**: cadastro de fabricantes e clientes.
- **Fornecedores**: cadastro dos fornecedores da loja.
- **Caixa**: abertura da sessao operacional antes das futuras vendas.
- **Vendas**: registro inicial de vendas diretas, orcamentos e pedidos com envio.

No topo da area principal existe um botao de atualizar. Use esse botao quando quiser recarregar os dados do backend, principalmente depois de alguma alteracao feita por outro usuario ou em outro computador.

Abaixo do cabecalho aparecem indicadores com a quantidade atual de produtos, fabricantes e fornecedores cadastrados.

Quando um registro e salvo corretamente, o sistema mostra uma mensagem de sucesso. Quando ocorre algum problema, como campo obrigatorio vazio ou registro duplicado, o sistema mostra uma mensagem de erro.

## Ordem recomendada de cadastro

Para evitar retrabalho, a ordem mais simples para iniciar o uso e:

1. Cadastrar os fabricantes.
2. Cadastrar os fornecedores.
3. Cadastrar os produtos.
4. Cadastrar clientes identificados quando necessario para reservas ou futura emissao fiscal.

Essa ordem facilita o cadastro de produto, porque o fabricante ja estara disponivel para selecao.

## Produtos

### Lista de produtos

A tela **Produtos > Lista de produtos** mostra os produtos cadastrados no catalogo da filial.

Campos exibidos na tabela:

- **Produto**: nome principal do produto.
- **Codigo**: codigo interno usado pela loja.
- **Fabricante**: fabricante vinculado ao produto.
- **Un.**: unidade de venda do produto.
- **Locacao**: local fisico onde o produto fica armazenado.
- **Estoque**: quantidade atual disponivel do produto na filial.
- **Venda**: preco de venda cadastrado.
- **Status**: indica se o produto esta ativo ou inativo para operacao.
- **Acoes**: permite editar o cadastro ou ativar/inativar o produto.

### Busca de produtos

O campo **Buscar por nome, codigo, fabricante ou locacao** filtra a lista apresentada na tela.

Ele pode ser usado para localizar um produto pelo nome, codigo interno, codigo de barras, fabricante ou locacao.

Exemplos de busca:

- `tecfil`
- `filtro oleo`
- `FAP4040`
- `789`
- `prateleira 2`

### Novo produto

A tela **Produtos > Novo produto** e usada para cadastrar itens no catalogo.

Campos do cadastro:

- **Nome do produto**: nome completo usado para identificar o produto. Deve ser claro o suficiente para o vendedor reconhecer o item no balcao. Exemplo: `Filtro de oleo Tecfil PSL55`.
- **Codigo interno**: codigo usado pela loja para controle proprio. Pode se repetir entre produtos de fabricantes ou fornecedores diferentes, conforme a realidade atual do negocio.
- **Codigo de barras**: codigo EAN/GTIN ou outro codigo de leitura do produto. Quando informado, nao deve se repetir em outro produto.
- **Fabricante**: fabricante do produto. Antes de selecionar, o fabricante precisa estar cadastrado em **Cadastros > Fabricantes**.
- **Locacao**: local fisico onde o produto fica na loja ou no estoque. Exemplo: `Corredor A - Prateleira 2`, `Balcao`, `Estoque superior`.
- **Unidade**: unidade de venda do produto. As opcoes iniciais sao `UN`, `KIT` e `CJ`.
- **UN - Unidade**: use para produtos vendidos individualmente.
- **KIT - Kit**: use quando o item cadastrado e vendido como kit.
- **CJ - Conjunto**: use quando o item cadastrado representa um conjunto.
- **Custo**: valor de custo do produto. Esse valor sera importante para relatorios de margem e lucro em fases futuras.
- **Venda**: preco de venda do produto.
- **Estoque min.**: quantidade minima desejada em estoque. Esse campo sera usado depois para alertas e relatorios de reposicao.
- **NCM**: codigo fiscal da mercadoria. Sera usado na emissao de nota fiscal.
- **CEST**: codigo fiscal relacionado a substituicao tributaria, quando aplicavel. Tambem sera usado na emissao fiscal.

Depois de preencher os campos, clique em **Cadastrar produto**.

Se o cadastro for concluido, o sistema salva o produto, atualiza a lista e retorna para a tela de produtos.

Todo produto novo inicia com estoque `0`. O saldo nao e informado no cadastro do produto; ele sera atualizado pelas rotinas de entrada e ajuste de mercadoria.

### Editar produto

Na lista de produtos, clique em **Editar** para abrir o cadastro ja preenchido com os dados atuais do produto.

Altere somente o que for necessario e clique em **Salvar alteracoes**. Campos opcionais, como codigo de barras, locacao, fabricante, NCM e CEST, podem ser removidos deixando o campo vazio.

### Ativar ou inativar produto

Na lista de produtos, use **Inativar** quando um item nao deve mais ser usado na operacao cotidiana. O produto permanece cadastrado para preservar seu historico.

Produtos inativos aparecem com o status **Inativo** e podem ser recuperados usando a acao **Ativar**.

## Fabricantes

A tela **Cadastros > Fabricantes** serve para cadastrar e consultar os fabricantes usados nos produtos.

Campo do cadastro:

- **Nome**: nome do fabricante. Exemplo: `Tecfil`, `Mann Filter`, `Wega`.

Regras iniciais:

- O nome do fabricante e obrigatorio.
- Nao e permitido cadastrar dois fabricantes com exatamente o mesmo nome.
- Fabricantes cadastrados aparecem como opcoes no cadastro de produto.

Use fabricantes para representar quem fabrica ou assina comercialmente o filtro, nao o fornecedor que vendeu o produto para a loja.

## Grupos de produtos

Grupos de produtos foram retirados do fluxo principal neste momento, conforme feedback de uso.

O backend ainda mantem suporte a grupos para reconsideracao futura, mas o usuario da loja nao precisa preencher esse campo no cadastro atual.

Se futuramente a loja precisar de relatorios por tipo de filtro, como `Filtro de oleo`, `Filtro de ar` ou `Filtro de cabine`, podemos reativar grupos na interface.

## Fornecedores

A tela **Fornecedores > Cadastro** serve para cadastrar empresas ou pessoas que fornecem mercadoria para a loja.

Campos do cadastro:

- **Nome**: nome do fornecedor. Pode ser razao social, nome fantasia ou nome da pessoa. E obrigatorio.
- **CPF/CNPJ**: documento do fornecedor. Use CPF para pessoa fisica ou CNPJ para empresa.
- **Telefone**: numero de contato do fornecedor.
- **Email**: email comercial ou financeiro do fornecedor.

Depois de preencher os campos, clique em **Cadastrar fornecedor**.

Fornecedores cadastrados aparecem na tabela da mesma tela com nome, documento, telefone e email.

O fornecedor e vinculado ao produto quando uma entrada de mercadoria e registrada. O sistema preserva o ultimo custo recebido desse fornecedor para o produto.

## Clientes

A tela **Cadastros > Clientes** registra compradores identificados para uso futuro em reservas e documentos fiscais.

Campos do cadastro:

- **Tipo de pessoa**: selecione `Pessoa fisica`, `Pessoa juridica` ou `Estrangeiro`.
- **Nome**: nome do cliente ou razao social. E obrigatorio.
- **CPF/CNPJ**: documento do cliente, quando informado.
- **Telefone** e **Email**: contatos opcionais.

E possivel editar os dados cadastrados ou inativar um cliente que nao deve aparecer em fluxos operacionais futuros. Endereco, inscricoes e validacao fiscal do documento serao definidos junto da emissao fiscal.

## Entrada manual de mercadoria

A tela **Estoque > Entrada manual** registra o recebimento de produtos adquiridos para a filial.

Antes da entrada, cadastre o produto e o fornecedor correspondente. Na entrada, informe:

- **Produto**: produto recebido; a opcao apresenta o saldo atual.
- **Fornecedor**: fornecedor da mercadoria recebida.
- **Quantidade**: quantidade efetivamente recebida, maior que zero.
- **Custo unitario**: custo da unidade recebida.
- **Observacao**: informacao opcional sobre o recebimento.

Ao clicar em **Registrar entrada**, o sistema:

1. registra a entrada no historico;
2. acrescenta a quantidade ao estoque atual do produto;
3. atualiza o custo atual do produto com o custo informado na entrada;
4. registra o ultimo custo recebido do fornecedor para aquele produto.

A tabela **Entradas registradas** mostra data, produto, fornecedor, quantidade e custo unitario das entradas ja confirmadas.

## Ajuste manual de estoque

A tela **Estoque > Ajuste manual** deve ser usada para corrigir diferencas identificadas em contagem ou ocorrencias como avaria e perda, sem representar uma compra.

Informe:

- **Produto**: produto cujo saldo sera corrigido.
- **Variacao de estoque**: quantidade a alterar; use valor positivo para acrescentar itens e negativo para retirar itens.
- **Motivo do ajuste**: justificativa obrigatoria para manter a correcao auditavel.

O sistema nao permite registrar um ajuste que deixe o estoque negativo. Ajustes registrados ficam visiveis no historico com produto, data, variacao e motivo.

## Historico de estoque

A tela **Estoque > Historico** reune as movimentacoes que alteraram o saldo da filial:

- **Entrada**: exibe fornecedor, quantidade recebida, custo unitario e observacao da compra, quando informada.
- **Ajuste**: exibe a variacao positiva ou negativa e o motivo registrado.
- **Venda**: exibe a saida efetiva registrada na venda de balcao.

Essa consulta permite conferir a origem do saldo fisico atual sem criar novos lancamentos. Reservas para separacao reduzem apenas o saldo disponivel e nao aparecem como movimento fisico ate que a venda seja concluida.

## Reposicao

A tela **Estoque > Reposicao** mostra produtos ativos cujo estoque atual esta igual ou abaixo do estoque minimo cadastrado.

Somente produtos com **Estoque min.** maior que `0` geram alerta. Portanto, produtos sem minimo definido nao aparecem nesta lista ate que essa informacao seja cadastrada.

A lista mostra saldo atual, minimo e a quantidade necessaria para atingir o minimo. Depois de uma entrada ou ajuste positivo elevar o saldo acima do minimo, o produto deixa de aparecer na consulta.

## Formas de pagamento

A tela **Financeiro > Formas de pagamento** prepara as opcoes que serao usadas ao registrar vendas. Nesta etapa, o sistema disponibiliza:

- PIX;
- Cartao de debito;
- Cartao de credito;
- Boleto.

Use **Inativar** quando uma forma nao puder ser usada temporariamente e **Ativar** para torna-la disponivel novamente.

Vendas e fechamentos podem usar mais de uma forma de pagamento quando o cliente dividir o valor, por exemplo uma parte em PIX e outra no cartao de credito. Nesses casos, confira se a soma dos pagamentos corresponde ao total da venda antes de concluir.

## Abertura de caixa

A tela **Caixa > Abertura** inicia a sessao operacional da filial. Informe o **Saldo inicial**, que representa o valor existente no caixa no momento da abertura.

A abertura registra automaticamente:

- o usuario autenticado responsavel;
- a data e horario;
- o saldo inicial informado.

Somente um caixa pode permanecer aberto ao mesmo tempo.

Quando houver um caixa aberto, a mesma tela mostra o total de vendas liquidas e o resumo por forma de pagamento. Devolucoes de itens ja reduzem esses valores esperados. Para encerrar o periodo, confira os valores recebidos, informe o **Valor conferido** e clique em **Fechar caixa**.

O sistema calcula o saldo esperado somando o saldo inicial, as vendas liquidas registradas no caixa e os suprimentos, descontando sangrias. Se o valor conferido for diferente, a diferenca fica registrada no fechamento. Depois de fechado, novas vendas exigem a abertura de outro caixa.

Sangria, suprimento e detalhamento de conferencia por forma de pagamento serao entregues em etapas posteriores.

## Venda direta

A tela **Vendas > Venda direta** registra uma venda imediata com baixa de estoque. Antes de vender, abra o caixa em **Caixa > Abertura**.

Cada venda aceita:

- um ou mais produtos;
- quantidade por produto;
- uma ou mais formas de pagamento ativas;
- um cliente ativo opcional, ou cliente nao identificado.
- desconto direto no valor total da venda, quando necessario.

O valor unitario e obtido do preco de venda cadastrado no produto. Ao confirmar, o sistema registra a venda e os pagamentos, reduz o saldo dos produtos e inclui a saida no **Historico de estoque** como tipo **Venda**.

Quando algum item nao tiver saldo disponivel, o sistema exibe uma confirmacao extra antes de concluir. Essa confirmacao permite seguir com a venda mesmo sem estoque suficiente, mantendo claro que a operacao foi feita por decisao do usuario.

Vendas concluidas podem receber devolucao por item pela propria lista de vendas ou pelo **Historico de vendas**. Informe o item, a quantidade e o motivo. O sistema devolve a quantidade ao estoque e registra a movimentacao no **Historico de estoque** como **Devolucao de venda**. Quando houver NF-e pendente, processando ou autorizada, cancele a NF-e antes de registrar a devolucao.

## Pedido com envio

A tela **Vendas > Pedidos com envio** atende inicialmente o pedido recebido por telefone ou WhatsApp. Cadastre o cliente com seu telefone antes de iniciar o orcamento.

O fluxo recomendado comeca em **Orcamentos**. O orcamento aceita cliente, forma de pagamento, datas de fatura/vencimento, varios produtos, quantidade por item, desconto percentual por item e desconto percentual geral. O valor e calculado pelo preco de venda cadastrado no produto, podendo ser ajustado pelos descontos informados.

Enquanto o orcamento esta em rascunho, ele pode ser editado. Depois que for convertido em pedido para envio, o orcamento deixa de ser alteravel para preservar o historico da negociacao.

Ao registrar o orcamento, o sistema ainda nao baixa nem reserva estoque, pois o cliente pode nao aprovar a compra. O PDF do orcamento pode ser baixado pela propria tela.

Quando o cliente aprovar, clique em **Aprovar e reservar**. Nesse momento, o sistema:

1. verifica se a quantidade esta disponivel;
2. reserva a quantidade para esse pedido;
3. mostra o status **Aprovado - separar** para orientar a separacao fisica.

Quando algum item nao tiver saldo disponivel, o sistema exibe uma confirmacao extra. Se o usuario confirmar, o pedido pode ser aprovado ou concluido mesmo sem estoque suficiente.

O estoque passa a apresentar saldo **Fisico**, **Reservado** e **Disponivel**. Venda de balcao e ajuste de saida nao podem consumir uma quantidade ja reservada.

Depois de localizar e separar a peca no estoque, clique em **Confirmar separacao**. O pedido passa ao status **Separado para envio**, mantendo a reserva ate o cancelamento ou a conclusao da venda.

Se o cliente desistir, informe o motivo e use **Cancelar**. Um orcamento cancelado deixa de poder ser aprovado; se a peca ja estava reservada, o cancelamento devolve automaticamente a quantidade ao saldo disponivel.

Quando a peca separada for sair para envio, abra o caixa, confira a forma ou as formas de pagamento combinadas com o cliente e clique em **Concluir venda e saida**. O sistema converte o pedido em venda, registra os pagamentos, baixa o estoque fisico e libera o saldo reservado.

Endereco/frete detalhado, integracao bancaria do boleto e acompanhamento de entrega serao implementados em etapas posteriores. A emissao fiscal ja possui tela central em **Financeiro > Notas fiscais**, onde vendas diretas, pedidos com envio e reservas para retirada podem entrar na fila de emissao.

## Historico de vendas

A tela **Vendas > Historico de vendas** centraliza vendas concluidas diretas, com envio e retirada. Use os filtros para buscar por cliente, operador, origem ou status da NF-e.

Nessa tela e possivel:

- baixar o comprovante comercial da venda;
- baixar DANFE e XML quando a NF-e ja possuir arquivos;
- registrar devolucao por item quando nao houver NF-e ativa bloqueando a operacao.

O comprovante comercial e apenas um resumo interno da venda concluida e nao substitui documento fiscal.

## Mensagens e erros comuns

### Registro salvo com sucesso

Significa que o cadastro foi aceito e gravado no banco.

### Dados invalidos

Significa que algum campo nao passou na validacao. Exemplos:

- nome obrigatorio vazio;
- email em formato invalido;
- numero negativo em campos de preco ou estoque minimo;
- identificador invalido em fabricante.

### Ja existe um fabricante com esse nome

O sistema encontrou outro fabricante cadastrado com o mesmo nome. Verifique a lista de fabricantes antes de tentar cadastrar novamente.

### Ja existe um produto com esse codigo de barras

O codigo de barras informado ja esta vinculado a outro produto. Verifique se o produto ja existe no catalogo antes de cadastrar um novo.

### Fabricante nao encontrado

Pode ocorrer quando o produto e enviado com um fabricante que nao existe mais no banco. Atualize a tela e tente novamente.

## Boas praticas de cadastro

- Use nomes claros e padronizados para produtos.
- Cadastre o fabricante antes do produto.
- Use o codigo interno conforme o padrao ja utilizado pela loja.
- Informe codigo de barras sempre que existir, pois isso ajuda no atendimento de balcao e evita duplicidade.
- Informe a locacao sempre que souber onde o produto fica, pois isso ajuda no atendimento e na reposicao.
- Preencha NCM e CEST quando a informacao estiver disponivel, pensando na futura emissao fiscal.

## Funcionalidades previstas para proximas fases

As seguintes rotinas ainda serao documentadas quando forem implementadas:

- saida manual de mercadoria;
- reserva de produto para retirada;
- emissao de nota fiscal;
- permissoes detalhadas de usuarios;
- relatorios gerenciais;
- margem, custo medio e lucro.
