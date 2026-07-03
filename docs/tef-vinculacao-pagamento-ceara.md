# TEF e vinculacao de pagamentos fiscais no Ceara

## 1. Objetivo

Este documento consolida o contexto legal, operacional e tecnico para adequar o
`loja-filtros` a vinculacao automatica entre pagamentos eletronicos e documentos
fiscais exigida pela Secretaria da Fazenda do Ceara.

O levantamento cobre:

- NF-e, modelo 55;
- NFC-e, modelo 65;
- cartao de credito e debito;
- PIX dinamico, PIX estatico e PIX automatico;
- boleto e pagamento posterior;
- integracao com Rede Itau;
- envio fiscal pela Focus NFe;
- contingencia por ECONF;
- requisitos de dados, seguranca, testes e implantacao.

Este documento e um levantamento tecnico. O enquadramento definitivo da empresa
e a interpretacao tributaria devem ser confirmados pela contabilidade e, quando
necessario, pela SEFAZ-CE.

Data da ultima revisao: 03/07/2026.

## 2. Resumo executivo

A obrigacao do Ceara nao determina o uso de uma tecnologia comercial especifica
chamada TEF. Ela exige que o sistema de pagamento esteja integrado ao sistema
emissor e que os dados da transacao sejam vinculados automaticamente a NF-e ou
NFC-e.

Uma solucao pode usar:

- TEF IP com PinPad;
- SmartPOS;
- equipamento com aplicativo integrado;
- API de pagamento;
- outro conjunto de equipamentos e tecnologias que assegure a comunicacao
  automatica.

A Focus:

- recebe os dados fiscais do pagamento;
- monta o XML;
- transmite o documento fiscal;
- consulta, cancela e disponibiliza XML/DANFE;
- oferece endpoints para ECONF.

A Focus nao:

- inicia uma transacao no PinPad;
- captura cartao;
- autoriza pagamento junto a adquirente;
- substitui um integrador TEF;
- descobre automaticamente os dados da transacao realizada em POS externo.

Para cartao presencial, o sistema ainda precisa integrar com Rede ou com um
parceiro TEF homologado pela Rede.

## 3. Contexto das unidades

### 3.1 Araguaina

- Utiliza maquininha da Rede Itau.
- Estado: Tocantins.
- O modelo, contrato, numero logico e capacidade de integracao ainda precisam ser
  levantados.
- A existencia de uma maquininha POS nao significa que exista TEF.

### 3.2 Sao Luis

- Utiliza maquininha da Rede Itau.
- Estado: Maranhao.
- O modelo, contrato, numero logico e capacidade de integracao ainda precisam ser
  levantados.
- A existencia de uma maquininha POS nao significa que exista TEF.

### 3.3 Unidade no Ceara

- Nao utiliza maquininha atualmente.
- A solucao pode ser escolhida desde o inicio para trabalhar integrada.
- Se a unidade aceitar cartao, deve ser contratada uma solucao compativel com o
  PDV e com a exigencia estadual.
- Nao e recomendavel contratar apenas um POS autonomo sem confirmar previamente
  a integracao.

### 3.4 Direcao recomendada

Avaliar a padronizacao com a Rede nas tres unidades, mas contratar para o Ceara
uma modalidade explicitamente integrada:

- TEF IP;
- PinPad;
- numero logico;
- integrador homologado;
- ambiente de homologacao;
- suporte a cancelamento;
- retorno completo dos dados fiscais da transacao.

## 4. Base legal do Ceara

### 4.1 Decreto n. 36.633/2025

Alterou o Decreto n. 35.061/2022 e estabeleceu a vinculacao dos meios de
pagamento aos documentos fiscais eletronicos por interligacao tecnologica com o
programa emissor.

### 4.2 Instrucao Normativa n. 87/2025

Regulamentou:

- operacoes abrangidas;
- dados obrigatorios;
- preenchimento do Grupo YA;
- integracao automatica;
- excecoes;
- uso de ECONF;
- cronograma por grupos.

### 4.3 Instrucao Normativa n. 142/2025

Entre outras alteracoes:

- reforcou o preenchimento automatico;
- disciplinou pagamento posterior;
- estabeleceu o codigo `91 - Pagamento Posterior`;
- tratou o uso de ECONF em operacoes com pagamento posterior;
- atualizou o cronograma original.

### 4.4 Instrucao Normativa n. 66/2026

Publicada em junho de 2026, alterou pontos relevantes:

- o inicio do Grupo 3 passou para 03/11/2026;
- operacoes cujo destinatario seja contribuinte do ICMS passaram a constar entre
  as excecoes.

Portanto, a data antiga de 01/07/2026 nao deve ser usada como prazo atual do
Grupo 3.

### 4.5 Cronograma conhecido

- Grupo 1: desde 05/01/2026, conforme CNAEs e faixa de receita da norma.
- Grupo 2: desde 02/03/2026, conforme CNAEs e faixa de receita da norma.
- Grupo 3: a partir de 03/11/2026.

O Grupo 3 inclui estabelecimentos que vendem ou revendem mercadorias novas ou
usadas diretamente a consumidor final, independentemente da CNAE, conforme o
anexo atualizado.

### 4.6 Verificacao obrigatoria com a contabilidade

Antes de definir o prazo real da unidade, levantar:

- CNPJ do estabelecimento do Ceara;
- CNAE principal;
- CNAEs secundarios;
- receita bruta de 2024;
- receita bruta de 2025;
- data de inicio das atividades;
- enquadramento nos Grupos 1, 2 ou 3;
- condicao de MEI, quando aplicavel;
- perfil dos clientes: contribuinte ou nao contribuinte do ICMS.

Nao assumir que a filial esta dispensada ate novembro sem verificar os Grupos 1
e 2.

## 5. Operacoes abrangidas

Em regra, a vinculacao alcanca venda ou revenda paga por:

- cartao de credito;
- cartao de debito;
- PIX dinamico;
- PIX automatico;
- outros instrumentos eletronicos que gerem autorizacao individualizada.

A norma se aplica a:

- NF-e;
- NFC-e;
- operacao presencial;
- site ou plataforma propria;
- teleatendimento, observadas as regras de presenca e intermediacao.

## 6. Excecoes relevantes

O levantamento consolidado da IN 87/2025 registra excecoes para:

- Nota Fiscal Facil;
- entrega e pagamento em domicilio;
- operacao nao presencial intermediada por plataforma de terceiros;
- MEI;
- PIX estatico ou transferencia;
- meio sem codigo de autorizacao individualizado;
- operacao cujo destinatario seja contribuinte do ICMS.

Mesmo em uma excecao:

- o documento fiscal continua obrigatorio quando aplicavel;
- o meio de pagamento ainda deve ser informado corretamente no XML;
- os indicadores de presenca e intermediacao devem refletir a operacao real;
- nao se deve marcar uma operacao como excecao apenas para evitar a integracao.

## 7. Informacoes exigidas no comprovante

O comprovante fisico ou digital da transacao deve conter, no minimo:

- CNPJ do estabelecimento beneficiario;
- nome empresarial do estabelecimento beneficiario;
- codigo de autorizacao ou identificacao do pedido;
- data da transacao;
- hora da transacao;
- valor da operacao;
- identificador do terminal, quando aplicavel.

Esses dados devem vir da solucao de pagamento. Digitacao manual nao deve ser o
fluxo normal.

## 8. Grupo YA da NF-e e NFC-e

### 8.1 Campos centrais da norma

| Informacao | Tag XML | Campo Focus | Regra |
| --- | --- | --- | --- |
| Meio de pagamento | `tPag` | `forma_pagamento` | Codigo fiscal correto |
| Valor pago | `vPag` | `valor_pagamento` | Valor vinculado a transacao |
| Tipo de integracao | `tpIntegra` | `tipo_integracao` | `1` para pagamento integrado |
| CNPJ da instituicao de pagamento | `CNPJ` | `cnpj_credenciadora` | Adquirente, subadquirente ou intermediador |
| Autorizacao | `cAut` | `numero_autorizacao` | Mesmo identificador do comprovante |
| Terminal | `idTermPag` | `id_terminal_pagamento` | Quando aplicavel |

### 8.2 Campos adicionais suportados pela Focus

| Informacao | Tag XML | Campo Focus |
| --- | --- | --- |
| Data do pagamento | `dPag` | `data_pagamento` |
| CNPJ transacional | `CNPJPag` | `cnpj_transacional` |
| UF transacional | `UFPag` | `uf_transacional` |
| Bandeira | `tBand` | `bandeira_operadora` |
| CNPJ do beneficiario | `CNPJReceb` | `cnpj_beneficiario` |

O nome empresarial do beneficiario deve ser preservado internamente e constar no
comprovante quando exigido, mesmo quando o leiaute fiscal utilizar apenas o CNPJ
correspondente.

### 8.3 Codigos de pagamento relevantes

| Codigo | Uso |
| --- | --- |
| `01` | Dinheiro |
| `03` | Cartao de credito |
| `04` | Cartao de debito |
| `15` | Boleto bancario |
| `17` | PIX dinamico |
| `20` | PIX estatico |
| `22` | Pagamento eletronico nao informado por falha de hardware |
| `23` | PIX automatico |
| `24` | TEF Book Transfer |
| `90` | Sem pagamento |
| `91` | Pagamento posterior |
| `99` | Outros |

O codigo `24` nao deve ser usado genericamente para qualquer transacao TEF. O
cartao integrado continua sendo informado como `03` ou `04`, conforme o caso.

### 8.4 PIX

#### PIX dinamico

- `tPag = 17`;
- integracao automatica;
- `cAut` deve receber o `endToEndId`;
- valor e transacao devem estar vinculados a venda;
- guardar payload e identificadores retornados pelo provedor.

#### PIX estatico ou transferencia

- `tPag = 20`;
- consta entre as excecoes da vinculacao automatica no Ceara;
- continua sendo necessario registrar corretamente o pagamento;
- nao tratar PIX dinamico como estatico para evitar integracao.

#### PIX automatico

- `tPag = 23`;
- deve ser avaliado conforme o produto contratado e a operacao real.

### 8.5 Cartoes

Para cartao integrado:

- credito usa `tPag = 03`;
- debito usa `tPag = 04`;
- `tpIntegra = 1`;
- informar CNPJ da credenciadora;
- informar autorizacao;
- informar terminal quando aplicavel;
- informar bandeira quando retornada.

### 8.6 NSU, autorizacao e TID

Nao assumir que estes campos sao equivalentes:

- NSU identifica a transacao dentro de determinado contexto da rede;
- codigo de autorizacao representa a autorizacao da operacao;
- TID pode identificar a transacao no provedor;
- `cAut` deve receber o identificador indicado pelo comprovante e pelo contrato
  de integracao para essa finalidade.

O sistema deve armazenar separadamente:

- NSU;
- codigo de autorizacao;
- TID ou transaction ID;
- identificador interno/idempotency key.

### 8.7 Pagamento em outra filial

Quando o pagamento ocorrer em estabelecimento diferente daquele que entrega a
mercadoria e emite o documento:

- informar `CNPJPag`;
- os estabelecimentos devem possuir a mesma raiz de CNPJ;
- ambos devem estar no Ceara para a hipotese descrita pela norma;
- armazenar qual filial capturou o pagamento;
- nao usar apenas o CNPJ do emitente por conveniencia.

## 9. NF-e e NFC-e

### 9.1 NF-e

O sistema atual possui integracao de NF-e modelo 55 com:

- emissao Focus;
- sincronizacao;
- cancelamento;
- XML;
- DANFE;
- reemissao apos rejeicao;
- homologacao validada.

A regra de vinculacao do Ceara tambem alcanca NF-e.

### 9.2 NFC-e

NFC-e modelo 65 ainda nao esta implementada.

Requisitos esperados:

- credenciamento na SEFAZ-CE;
- inscricao estadual regular;
- certificado/configuracao fiscal valida;
- CSC;
- identificador do CSC;
- serie e numeracao proprias;
- endpoint Focus `/v2/nfce`;
- QR Code;
- DANFC-e;
- consulta e cancelamento proprios;
- contingencia offline;
- `formas_pagamento`;
- indicadores de presenca corretos.

NFC-e nao deve reutilizar cegamente o fluxo de NF-e. O contrato comum pode ser
compartilhado, mas cada documento deve possuir estrategia propria.

## 10. ECONF e contingencia

### 10.1 Quando considerar ECONF

A norma do Ceara menciona ECONF quando:

- ha falha ou indisponibilidade na integracao;
- o pagamento ocorre em momento diferente da entrega;
- o pagamento e posterior e deve ser conciliado;
- e necessario vincular posteriormente dados financeiros ao documento.

### 10.2 Suporte da Focus

A Focus documenta:

- registro de ECONF para NF-e;
- consulta de ECONF;
- cancelamento de ECONF;
- registro, consulta e cancelamento para NFC-e.

### 10.3 Regra do sistema

ECONF deve ser contingencia auditada, nao atalho para substituir a integracao
normal.

O sistema deve registrar:

- motivo da contingencia;
- usuario;
- filial;
- data e hora;
- transacao;
- documento fiscal;
- payload enviado;
- resposta;
- protocolo;
- status;
- eventual cancelamento.

## 11. Papel da Rede Itau

A Rede possui:

- portal para desenvolvedores;
- area de TEF;
- sandbox para APIs;
- processo de credenciamento e certificacao;
- numero logico para terminais;
- produtos de QR Code;
- APIs de gestao e conciliacao.

O portal publico indica que a area TEF e voltada a parceiros e software houses.
A implementacao pode exigir:

- cadastro como parceiro;
- certificacao;
- contrato;
- integrador TEF homologado;
- agente local;
- PinPad;
- numero logico por terminal.

A API e.Rede de comercio eletronico nao deve ser tratada automaticamente como
substituta de cartao presencial.

## 12. Questionario para a Rede ou integrador

Solicitar resposta formal para:

1. A solucao suporta TEF IP para PDV proprio?
2. Qual integrador TEF homologado e recomendado?
3. Existe SDK ou agente local?
4. Ha suporte oficial a Linux?
5. Ha suporte a aplicacao React executada no navegador?
6. Como o navegador conversa com o agente local?
7. O agente usa HTTP local, WebSocket, biblioteca nativa ou arquivo?
8. Quais modelos de PinPad sao homologados?
9. Como obter e ativar o numero logico?
10. Existe sandbox ou simulador sem equipamento?
11. Quais etapas de certificacao sao obrigatorias?
12. Quais custos de adesao, terminal, mensalidade e transacao?
13. O retorno de aprovacao contem:
    - NSU;
    - codigo de autorizacao;
    - TID;
    - bandeira;
    - CNPJ da Rede;
    - terminal;
    - beneficiario;
    - data e hora;
    - valor?
14. Como funciona cancelamento total?
15. Como funciona cancelamento parcial?
16. Como consultar uma transacao apos queda de conexao?
17. Existe chave de idempotencia?
18. Existem webhooks?
19. Como validar autenticidade e repeticao de webhook?
20. O produto oferece PIX dinamico?
21. O retorno PIX contem `endToEndId`?
22. O comprovante contem todos os dados exigidos pela SEFAZ-CE?
23. Como tratar pagamento aprovado quando o PDV perde a resposta?
24. Como conciliar movimento e fechamento de caixa?

## 13. Restricao da arquitetura web

O frontend roda no navegador e pode ser publicado na Vercel. O backend roda em
servidor remoto.

Um PinPad conectado ao computador da loja nao pode ser acessado diretamente pelo
backend remoto.

Fluxo provavel:

```text
React no navegador
  -> agente TEF local
  -> PinPad
  -> Rede/adquirente
  -> resultado ao agente
  -> frontend/backend loja-filtros
  -> Focus
  -> SEFAZ
```

O agente local deve:

- aceitar apenas origem autorizada;
- autenticar cada chamada;
- usar canal local protegido;
- nao expor porta indiscriminadamente;
- ter versao controlada;
- recuperar transacao pendente;
- impedir duplicidade;
- funcionar no sistema operacional da loja.

Se a solucao for SmartPOS ou API com webhook, o fluxo pode mudar. A arquitetura
final depende do produto contratado.

## 14. Estado atual do sistema

### 14.1 Formas de pagamento

Existem:

- PIX;
- cartao de debito;
- boleto.

O cadastro atual possui apenas:

- codigo;
- nome;
- status.

Ainda nao possui:

- codigo `tPag`;
- indicador de integracao;
- provedor;
- configuracao por filial;
- regras fiscais;
- suporte a credito configurado.

### 14.2 Venda

A venda atual:

- escolhe uma unica forma;
- grava o valor;
- e concluida imediatamente;
- baixa estoque dentro do fluxo de criacao;
- nao possui estado intermediario de pagamento;
- nao possui tentativa de pagamento;
- nao possui autorizacao, NSU, TID, terminal ou adquirente.

### 14.3 Fiscal

O contrato fiscal atual recebe apenas o nome da forma de pagamento.

O payload Focus atual nao envia `formas_pagamento`.

A configuracao fiscal ainda e central, apesar de o projeto ter iniciado a base
de filiais e funcionarios.

### 14.4 Consequencia

Nao basta adicionar campos ao JSON da Focus. Primeiro e necessario capturar,
persistir e auditar uma transacao real e vincula-la a filial e a venda.

## 15. Arquitetura de destino

### 15.1 Camadas

```text
view
  -> controller de checkout/pagamento
    -> models de pagamento/venda
    -> payment provider
    -> controller fiscal
      -> fiscal provider Focus
```

Regras:

- models nao chamam Rede;
- models nao chamam Focus;
- controllers orquestram;
- integracoes externas ficam isoladas;
- provider de pagamento usa Strategy/Adapter;
- provider fiscal permanece separado do provider de pagamento;
- nao criar dependencia ciclica entre venda, pagamento e fiscal.

### 15.2 Estrutura sugerida

```text
backend/src/
  integrations/
    payments/
      payment-provider.ts
      payment-provider-factory.ts
      providers/
        rede-tef-payment-provider.ts
        mock-payment-provider.ts

  controllers/
    payments/
    checkouts/

  models/
    payment-transactions/
    payment-events/
```

O nome exato pode seguir o padrao vigente quando a implementacao comecar.

### 15.3 Contrato interno de pagamento

O restante do sistema deve conhecer um contrato neutro, por exemplo:

- referencia interna;
- filial;
- provedor;
- meio;
- valor;
- status;
- autorizacao;
- NSU;
- TID;
- bandeira;
- adquirente;
- terminal;
- beneficiario;
- data/hora;
- payload auditavel.

Nomes especificos da Rede devem ficar no adaptador.

## 16. Modelo de dados proposto

### 16.1 Filiais

Evoluir `branches` com dados ou relacionamentos para:

- CNPJ;
- nome empresarial;
- nome fantasia;
- inscricao estadual;
- UF;
- endereco fiscal;
- configuracao Focus;
- serie fiscal;
- CSC/ID CSC, quando NFC-e;
- ambiente;
- permissao explicita de producao;
- cadastro/afiliacao Rede.

Segredos nao devem ser armazenados em texto aberto em tabela sem estrategia de
protecao.

### 16.2 Formas de pagamento

Adicionar configuracoes como:

- `fiscal_payment_code`;
- `electronic`;
- `requires_integration`;
- `allows_manual_contingency`;
- `provider`;
- `active`.

### 16.3 Transacoes de pagamento

Campos conceituais:

- `id`;
- `branch_id`;
- `sale_id` ou referencia ao checkout;
- `payment_method_id`;
- `provider`;
- `provider_transaction_id`;
- `idempotency_key`;
- `status`;
- `amount`;
- `occurred_at`;
- `authorization_code`;
- `nsu`;
- `tid`;
- `end_to_end_id`;
- `acquirer_cnpj`;
- `beneficiary_cnpj`;
- `beneficiary_name`;
- `terminal_id`;
- `card_brand`;
- `transactional_cnpj`;
- `transactional_state`;
- `failure_code`;
- `failure_message`;
- `raw_response`;
- `created_by_user_id`;
- timestamps.

Status sugeridos:

- `PENDING`;
- `PROCESSING`;
- `AUTHORIZED`;
- `DECLINED`;
- `FAILED`;
- `CANCEL_PENDING`;
- `CANCELLED`;
- `UNKNOWN`.

`UNKNOWN` e importante para queda de conexao apos o envio. Nunca repetir uma
cobranca sem consultar a transacao anterior.

### 16.4 Eventos e auditoria

Manter historico imutavel de:

- inicio;
- aprovacao;
- negacao;
- falha;
- consulta;
- cancelamento;
- webhook;
- conciliacao;
- ECONF.

## 17. Fluxos de negocio

### 17.1 Cartao presencial integrado

1. Operador monta a venda.
2. Sistema cria checkout e tentativa com idempotencia.
3. PDV envia valor ao agente TEF.
4. Cliente realiza pagamento no PinPad.
5. Rede autoriza ou rejeita.
6. Sistema persiste resposta completa.
7. Apenas apos autorizacao a venda e concluida.
8. Estoque e caixa sao atualizados.
9. Documento fiscal recebe `formas_pagamento`.
10. Focus transmite NF-e/NFC-e.
11. Resultado fiscal e apresentado ao operador.

### 17.2 PIX dinamico

1. Sistema solicita cobranca com referencia unica.
2. Exibe QR Code.
3. Aguarda confirmacao assinada ou consulta ativa.
4. Confere valor, beneficiario e referencia.
5. Persiste `endToEndId`.
6. Conclui venda.
7. Emite documento com `tPag = 17` e `cAut = endToEndId`.

### 17.3 PIX estatico

1. Operador registra o recebimento conforme regra operacional aprovada.
2. Usa `tPag = 20`.
3. Marca a modalidade real como estatica.
4. Mantem evidencia e auditoria necessarias.

Este fluxo nao deve ser usado para mascarar PIX dinamico.

### 17.4 Boleto

Definir se:

- boleto e pago no ato;
- boleto representa venda a prazo;
- emissao fiscal ocorre antes do pagamento;
- o meio e conhecido no momento da emissao.

Conforme o caso, pode envolver:

- `tPag = 15`;
- `tPag = 91`;
- ECONF posterior;
- integracao bancaria futura.

### 17.5 Falha apos pagamento

Se o pagamento puder ter sido autorizado:

1. marcar tentativa como `UNKNOWN`;
2. bloquear nova tentativa automatica;
3. consultar Rede usando referencia, NSU ou TID;
4. reconciliar resultado;
5. concluir ou liberar nova tentativa apenas apos resposta segura;
6. registrar ECONF se exigido.

### 17.6 Cancelamento

Definir maquina de estados para:

- cancelamento de pagamento;
- cancelamento fiscal;
- devolucao de estoque;
- movimento de caixa;
- auditoria.

Nao assumir que cancelar a NF-e cancela o cartao ou vice-versa.

## 18. Seguranca

### 18.1 Dados proibidos

O sistema nao deve armazenar:

- numero completo do cartao;
- CVV;
- senha do cartao;
- trilha magnetica;
- dados sensiveis desnecessarios.

### 18.2 Requisitos

- usar TLS;
- manter credenciais fora do repositorio;
- separar homologacao e producao;
- validar assinatura de webhook;
- prevenir replay;
- usar idempotencia;
- mascarar logs;
- auditar usuario e filial;
- aplicar menor privilegio;
- limitar acesso aos payloads brutos;
- definir retencao de dados;
- revisar requisitos PCI DSS com o fornecedor.

### 18.3 Agente local

- nao aceitar chamadas de qualquer site;
- validar origem;
- autenticar sessao;
- restringir bind local;
- atualizar com seguranca;
- registrar versao;
- nao permitir comandos arbitrarios;
- nao expor credenciais da Rede ao navegador.

## 19. Testes obrigatorios

### 19.1 Pagamento

- debito aprovado;
- credito aprovado;
- transacao negada;
- senha cancelada pelo cliente;
- timeout;
- queda antes do envio;
- queda depois do envio;
- resposta duplicada;
- clique duplo;
- consulta de transacao desconhecida;
- cancelamento aprovado;
- cancelamento negado;
- terminal incorreto;
- valor divergente.

### 19.2 PIX

- QR Code gerado;
- expiracao;
- pagamento aprovado;
- valor divergente;
- webhook duplicado;
- assinatura invalida;
- `endToEndId` ausente;
- devolucao.

### 19.3 Fiscal

- NF-e com debito;
- NF-e com credito;
- NF-e com PIX dinamico;
- NF-e com PIX estatico;
- NF-e com boleto;
- NF-e com pagamento posterior;
- NFC-e com os mesmos cenarios quando implementada;
- destinatario contribuinte do ICMS;
- operacao fora do estabelecimento;
- pagamento em outra filial;
- rejeicao por campo de pagamento;
- ECONF;
- cancelamento fiscal depois de estorno;
- estorno depois de cancelamento fiscal.

### 19.4 Filiais

- venda e pagamento usam a filial do usuario/caixa;
- CNPJ do beneficiario corresponde a filial;
- configuracao Focus correta;
- numero logico correto;
- terminal nao pode ser usado por filial errada;
- dados de uma filial nao vazam para outra.

## 20. Implantacao

Seguir a politica do projeto:

1. fechar contrato e documentacao do provedor;
2. implementar mock;
3. validar testes automatizados;
4. homologar Rede/integrador;
5. homologar Focus;
6. aplicar migrations antes do backend;
7. validar migrations;
8. publicar backend;
9. publicar agente local, se houver;
10. publicar frontend;
11. testar por filial;
12. liberar operacao assistida;
13. monitorar;
14. ter procedimento de rollback.

Push e deploy devem ocorrer apenas na janela operacional definida.

## 21. Ordem recomendada de implementacao

### Fase 0 - Confirmacao externa

- confirmar enquadramento e prazo da unidade no Ceara;
- escolher Rede/integrador;
- obter documentacao tecnica;
- confirmar sistema operacional suportado;
- obter sandbox;
- confirmar campos retornados;
- confirmar processo de certificacao.

### Fase 1 - Filial fiscal

- vincular vendas a filial;
- tornar configuracao fiscal especifica por filial;
- registrar UF, CNPJ, IE e dados do estabelecimento;
- impedir emissao com configuracao de outra filial.

### Fase 2 - Dominio de pagamentos

- evoluir formas de pagamento;
- criar checkout/tentativa;
- criar transacoes e eventos;
- implementar idempotencia;
- criar provider mock;
- separar venda pendente de venda concluida.

### Fase 3 - Rede

- criar contrato `PaymentProvider`;
- implementar adaptador do integrador escolhido;
- integrar agente local ou API;
- suportar consulta e cancelamento;
- proteger credenciais e webhooks.

### Fase 4 - Focus

- adicionar `formas_pagamento` a NF-e;
- validar todos os campos em homologacao;
- implementar ECONF;
- registrar protocolos;
- testar rejeicoes.

### Fase 5 - NFC-e

- configurar CSC;
- implementar provider NFC-e;
- implementar QR Code e DANFC-e;
- implementar contingencia;
- testar autorizacao e cancelamento.

### Fase 6 - Operacao

- treinar usuarios;
- criar manual;
- definir contingencia;
- definir reconciliacao diaria;
- monitorar pagamentos sem documento e documentos sem pagamento;
- conferir fechamento de caixa por adquirente.

## 22. Bloqueios antes de codificar a integracao real

Ainda faltam:

- CNPJ e enquadramento fiscal da unidade no Ceara;
- data efetiva de obrigatoriedade da unidade;
- produto contratado na Rede;
- integrador homologado;
- documentacao/SDK;
- sistema operacional suportado;
- modelo do PinPad;
- retorno real da transacao;
- credenciais de sandbox;
- definicao NF-e, NFC-e ou ambas;
- tratamento operacional de boleto;
- decisao sobre credito;
- estrategia de contingencia.

Podemos implementar filial fiscal e provider mock antes desses dados. Nao devemos
implementar um adaptador Rede baseado em suposicoes.

## 23. Criterios de aceite

A funcionalidade somente estara pronta quando:

- pagamento for iniciado pelo PDV;
- valor nao puder ser alterado no terminal;
- resultado for persistido de forma idempotente;
- venda concluir apenas com resultado seguro;
- estoque e caixa permanecerem consistentes;
- dados fiscais forem gerados automaticamente;
- XML autorizado contiver os campos esperados;
- comprovante contiver os dados exigidos;
- cancelamento e estorno forem auditados;
- falha de comunicacao nao gerar cobranca duplicada;
- ECONF puder ser registrado quando aplicavel;
- cada filial usar sua propria configuracao;
- homologacao real for aprovada;
- documentacao e treinamento estiverem concluidos.

## 24. Fontes

### Legislacao

- Decreto n. 36.633/2025:
  https://sefazlegis.sefaz.ce.gov.br/api/openFile?id=a573ebfe-6908-43cc-9269-75f4cecdc3a3
- IN n. 87/2025 consolidada:
  https://sefazlegis.sefaz.ce.gov.br/api/openFile?id=fb3405db-006a-48dd-ba9d-a051c99b8d52
- IN n. 66/2026:
  https://www.ce.gov.br/sefaz/wp-content/uploads/sites/46/2020/08/Instrucao-Normativa-no-66-de-2026.pdf

### Focus

- Emissao de NF-e:
  https://doc.focusnfe.com.br/reference/emitir_nfe
- Emissao de NFC-e:
  https://doc.focusnfe.com.br/reference/emitir_nfce
- Campos NF-e/NFC-e e `formas_pagamento`:
  https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html
- Registro de ECONF para NF-e:
  https://doc.focusnfe.com.br/reference/emitir_evento_econf
- Registro de ECONF para NFC-e:
  https://doc.focusnfe.com.br/reference/registrar_econf_nfce

### Rede

- Portal do Desenvolvedor:
  https://developer.userede.com.br/
- API de QR Code:
  https://developer.userede.com.br/qr-code
- Autenticacao:
  https://developer.userede.com.br/autenticacao
- Geracao de numero logico:
  https://developer.userede.com.br/geracao-numero-logico

## 25. Historico de decisoes

- Focus permanece como provider fiscal.
- Rede e a adquirente ja usada em Araguaina e Sao Luis.
- A unidade do Ceara ainda nao possui maquininha.
- Preferencia inicial: avaliar Rede tambem no Ceara.
- Nao contratar POS autonomo antes de confirmar integracao.
- TEF e pagamento ficam isolados da integracao fiscal.
- ECONF sera contingencia, nao substituto do fluxo integrado.
- Implementacao real depende da resposta tecnica da Rede/integrador.
