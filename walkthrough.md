# Walkthrough - Suporte a Pagamento Misto/Dividido (v1.0.5)

O aplicativo **MercadoPDV** foi atualizado com sucesso para a versão **1.0.5**, trazendo uma das funcionalidades mais solicitadas por operadores de caixa: o suporte completo a **Pagamento Misto / Dividido (Split Payment)**. Agora, os clientes podem pagar por uma única compra utilizando múltiplos métodos de pagamento combinados (ex: parte em PIX, parte em Dinheiro, parte no Débito, e o restante anotado no Fiado).

---

## 🚀 Novidades da Versão 1.0.5

### 1. 🔀 Pagamento Misto / Dividido (Frente de Caixa)
* **Novo Modo de Checkout:** Adicionada a opção **"Misto / Dividido"** no modal de pagamento (`F4`).
* **Painel Dinâmico de Rateio:** Ao selecionar o modo Misto, um painel intuitivo e moderno se abre exibindo entradas numéricas independentes para cada método de pagamento suportado:
  * 💵 **Dinheiro**
  * 📱 **PIX QR Code**
  * 💳 **Cartão de Débito**
  * 💳 **Cartão de Crédito**
  * 🤝 **Fiado (A Prazo)** (com seleção dinâmica de cliente e validação de limite)
* **Cálculos e Troco em Tempo Real:** O operador visualiza o total da compra, a soma já preenchida dos pagamentos, o **"Valor Restante"** e o **"Troco"** dinâmico (calculado exclusivamente sobre o excesso pago em Dinheiro).
* **Validações de Finalização Robustas:**
  * O botão de finalização só é ativado quando o valor total preenchido é igual ou superior ao total da compra.
  * Validação proporcional do limite de crédito do cliente caso o método "Fiado" seja selecionado na divisão de pagamentos.
  * Bloqueio físico de troco se a soma sem dinheiro for superior ao total (o troco é garantido apenas se houver pagamento físico em espécie).

### 2. 🛡️ Padrão "Virtual Split Payment" no Banco de Dados
Para contornar as restrições rígidas do banco de dados SQLite (como a restrição `CHECK` na coluna `forma_pagamento` que aceita apenas valores fixos individuais) sem quebrar a retrocompatibilidade com relatórios, implementamos uma arquitetura virtual inteligente:
* **Agrupamento por `split_grupo_id`:** Vendas mistas são registradas no banco como múltiplos registros individuais contendo o mesmo identificador exclusivo `split_grupo_id`.
* **Consolidação Automática:** Métodos como `getVendas` e `getVendaDetalhes` foram atualizados para consolidar essas linhas agrupadas, retornando-as como uma única transação unificada do tipo `"misto"`.
* **Segurança do Caixa:** A movimentação de estoque e a contabilidade do fechamento de caixa continuam 100% corretas, já que o dinheiro da gaveta e os faturamentos eletrônicos são mapeados individualmente aos seus respectivos métodos.
* **Resiliência do Dashboard:** As queries de indicadores (`getDashboardStats`) agora utilizam `COUNT(DISTINCT COALESCE(split_grupo_id, id))` para garantir que a venda conte apenas uma vez, mantendo os gráficos de volume de vendas perfeitamente íntegros.

### 3. 🧾 Impressão de Cupom Térmico Detalhado
Ao concluir uma venda dividida, o cupom não fiscal térmico impresso lista a discriminação exata de cada método de pagamento utilizado, com o abatimento correto de descontos e indicação clara de troco em dinheiro (se houver). 

### 4. 📊 Auditoria Completa nos Relatórios
* **Visualização Unificada:** A tabela de auditoria de vendas lista as transações mistas sob o tipo `"MISTO / DIVIDIDO"`.
* **Detalhamento no Modal:** Ao abrir os detalhes de uma venda mista, o sistema exibe um card com os valores específicos pagos in cada modalidade.
* **Segunda Via Segura:** O operador pode reimprimir a segunda via do cupom a qualquer momento, mantendo a discriminação detalhada dos pagamentos originais.

---

## 🛠️ Paridade de Ambientes & Publicação

Durante o ciclo de finalização da versão **1.0.5**, realizamos uma auditoria de integridade para garantir 100% de paridade entre os dois diretórios de workspace do usuário.

### 🔄 Correções Efetuadas para Paridade Total:
1. **`database.js` (Estoque KG):** Corrigido o mirror para usar `newCatStock = quantidade;` ao invés de `parseInt(quantidade)` no fluxo de ajuste de categoria, prevenindo o truncamento de estoques com peso decimal (KG).
2. **`database.js` (Histórico de Estoque):** Alinhado o nome da propriedade para usar `data_movimentacao: dataVenda` no fluxo de fallback JSON, garantindo uniformidade com as queries SQLite.
3. **`PDV.jsx` (Traduções e Textos):** Padronizada a grafia em português de `"sessão ativa"` (estava `"sessão activa"`) e corrigida a tradução de `"produto"` (estava `"product"`) nas mensagens da tela inicial do caixa.
4. **`PDV.jsx` (Identação do Autocomplete):** Corrigida a identação na renderização do dropdown de busca do caixa para remover espaços extras e garantir paridade caractere por caractere.
5. **`Relatorios.jsx` (Cupom Fechamento):** Corrigida a interpolação da data de abertura no comprovante impresso de fechamento, alterando de `{new Date(...)}` para `${new Date(...)}` dentro do template literal.

### 📦 Entrega e Builds:
* **Renderer Build:** Compilado e gerado os bundles estáticos de frontend com `npm run build:renderer`.
* **Electron Installer:** Empacotado a build final em formato de instalador executável:
  * Path: `release/MercadoPDV Setup 1.0.5.exe` (tamanho: 81.16 MB)
* **Sincronização Remota:** Todos os arquivos foram adicionados e comitados com sucesso, e empurrados diretamente para o repositório GitHub oficial (`main -> main`).

---

## 🏗️ Guia de Teste Operacional (Fluxo Misto)

1. **Inicie o Caixa:** Abra o PDV e realize a abertura de turno padrão.
2. **Adicione Itens:** Passe alguns itens no scanner ou busque-os pelo autocomplete.
3. **Abra o Modal de Pagamento:** Pressione `F4`.
4. **Selecione Misto:** Pressione a opção **"Misto / Dividido"**.
5. **Preencha os Campos:** 
   * Se a compra deu R$ 50,00, preencha R$ 20,00 em PIX, R$ 20,00 no Cartão de Débito, e R$ 15,00 em Dinheiro.
   * Observe que o sistema calcula R$ 5,00 de troco em dinheiro (já que a soma deu R$ 55,00 e o excesso de R$ 5,00 foi pago em espécie).
6. **Finalize a Venda:** Pressione `F12` ou clique em **Finalizar Venda**. O cupom térmico impresso sairá com a divisão correta de pagamentos.
7. **Verifique os Relatórios:** Acesse o menu **Relatórios** na barra lateral e comprove que a venda está listada de forma unificada e seus detalhes de pagamento estão descritos com total precisão.
