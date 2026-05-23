# Walkthrough - Suporte a Venda Fiada, Controle de Crédito e Modo Açougue (v1.0.4)

O aplicativo **MercadoPDV** foi atualizado com sucesso para a versão **1.0.4**, trazendo o suporte a **Venda Fiada (Venda a Prazo/Pendente)**, cadastro e controle financeiro de clientes, e histórico de extratos ledger, além de consolidar o **Modo Açougue Avançado** com controle de peso bruto por categoria.

---

## 🚀 Novidades da Versão 1.0.4

### 1. 🤝 Venda Fiada no Checkout (Frente de Caixa)
*   **5ª Forma de Pagamento:** Adicionada a opção **"Venda Fiada / Prazo"** no modal de pagamento (`F4`).
*   **Seleção Rápida de Clientes:** Exibe um dropdown dinâmico com a lista de clientes cadastrados, mostrando instantaneamente o saldo devedor atual, o limite de crédito total e o limite disponível.
*   **Bloqueio Inteligente de Limite:** Caso o valor da venda ultrapasse o limite de crédito disponível do cliente, o sistema exibe alertas visuais de aviso e **bloqueia fisicamente a conclusão da venda** (botão de finalização inativo com feedback de alerta), garantindo segurança total contra inadimplência excessiva.
*   **Cupom Não Fiscal Customizado:** Ao finalizar uma venda fiada, o cupom impresso pelo Electron anexa automaticamente o **Nome do Cliente** e a **Dívida Acumulada** do cliente atualizada, oferecendo total transparência.

### 2. 📊 Tela de Gerenciamento de Clientes & Contas a Receber (`Clientes.jsx`)
Foi construída uma nova e avançada tela administrativa retaguarda com estilo **Glassmorphic** de alta qualidade:
*   **Cards de Métricas Superiores:**
    *   **Contas a Receber (R$):** Soma em tempo real de toda a dívida ativa de fiados na rua.
    *   **Clientes Ativos:** Quantidade de clientes cadastrados no banco de dados.
    *   **Utilização do Crédito (%):** Porcentagem que indica o consumo dos limites de crédito concedidos.
*   **Tabela de Controle Detalhado:** Grade responsiva exibindo Nome, Telefone, CPF, Limite de Crédito, Saldo Devedor, Limite Disponível e ações de Extrato/Edição.
*   **Cadastro/Edição de Clientes:** Modal intuitivo para cadastrar ou atualizar dados e limites máximos de fiado (definir `0` para conceder limite ilimitado).
*   **Extrato estilo Ledger Bancário:** Histórico completo unificado mostrando compras a prazo (débitos) e pagamentos (créditos) com data, hora, forma e operador.
*   **Recebimento de Fiado:** Lançamento de pagamentos diretamente pelo extrato (PIX, Dinheiro, Débito ou Crédito) com abate transacional instantâneo do saldo devedor.
*   **Impressão de Extrato e Recibo:** Emissão de cupom impresso para o cliente comprovando o pagamento de fiado efetuado.

### 3. 🥩 Modo Açougue Avançado (Melhorado v1.0.4)
*   **Controle e Criação Direta:** Agora você pode ativar o **Modelo Açougue (Estoque por Peso Bruto)** e definir o Peso Bruto Inicial (KG) e Preço de Custo (R$/KG) **no próprio momento de criar a categoria** (sem necessidade de criar primeiro e editar depois).
*   **Facilidade no Cadastro de Cortes:** Ao cadastrar ou editar um produto e vinculá-lo a uma categoria do tipo açougue, o campo **Estoque Inicial fica automaticamente desativado e travado em 0**, com um aviso explicativo: *não necessita de estoque individual*. O lojista preenche apenas o Custo e a Venda do corte! O sistema também trava automaticamente o Tipo de Produto como `KG` para máxima consistência.
*   **Entrada e Perda Centralizada:** O lojista lança as entradas da carcaça/lote inteiro diretamente na categoria (ex: entrada de `60,000 kg` de *Corte Traseiro*). As vendas e descartes (perdas) lançadas no sistema abatem transacionalmente desse estoque centralizado.
*   **Estoque Dinâmico Compartilhado:** Cortes vinculados (ex: *Picanha*, *Alcatra*) mostram o peso da carcaça de forma dinâmica com badge explicativo `Lote (Compartilhado)`.
*   **Relatório de Rendimento de Lote:** Exibe o Total Recebido, Peso Comercializado, Descartes/Aparas registradas como perdas, Faturamento bruto gerado e a porcentagem exata de **Aproveitamento Real (%)** da carcaça.
*   **Destaque Visual:** O botão de salvar no modal de configuração de categoria foi renomeado para **"Atualizar Categoria"** e destacado com gradiente de destaque premium (`purple to brand-accent`).

---

## 🛠️ Como Utilizar Operacionalmente a Venda Fiada

1.  **Cadastrando um Cliente:**
    *   Vá na barra lateral retaguarda e clique em **"Clientes & Fiado"**.
    *   Clique em **"+ Novo Cliente"**. Preencha Nome, Telefone, CPF e defina o Limite de Crédito (ex: `R$ 200,00`). Salve.
2.  **Efetuando a Venda Fiada no Caixa:**
    *   Adicione os itens ao carrinho no PDV.
    *   Pressione **F4** para abrir o pagamento.
    *   Selecione **"Venda Fiada / Prazo"**.
    *   No dropdown, selecione o cliente (ex: *Felipe Gondim*). O sistema exibirá o saldo devedor e o limite disponível dele.
    *   Se estiver dentro do limite, pressione **F12** ou clique em **Finalizar**. O cupom impresso mostrará o fiado e o saldo devedor acumulado.
3.  **Recebendo Pagamento de Fiado:**
    *   Vá na tela de **Clientes & Fiado** e clique em **"Visualizar Extrato"** no cliente desejado.
    *   Observe a compra do PDV lançada na lista de transações.
    *   No topo do extrato, insira o valor pago pelo cliente (ex: `R$ 50,00`), selecione a forma de recebimento (ex: *PIX*) e clique em **"Lançar Recebimento"**.
    *   O saldo devedor cairá instantaneamente de `R$ 200` para `R$ 150`, o extrato será atualizado e você poderá clicar em **"Imprimir Recibo"** para emitir o comprovante impresso do cliente.

---

## 🛠️ Correção e Resiliência (Hotfix de Banco de Dados)

Durante a migração do banco de dados na versão **1.0.4**, identificamos um comportamento sutil do SQLite: ao renomear a tabela `vendas` para `vendas_old` com chaves estrangeiras ativas, a tabela filha `itens_venda` teve sua definição de chave estrangeira automaticamente atualizada pelo SQLite para referenciar `vendas_old`. Ao dropar a tabela `vendas_old`, a referência da chave estrangeira foi corrompida, resultando no erro `SqliteError: no such table: main.vendas_old` no momento de fechar vendas no caixa.

### 🩹 Como foi resolvido:
1. **Desativação Temporária de Chaves Estrangeiras:** O código de auto-migração em `database.js` foi corrigido para desativar temporariamente as restrições (`PRAGMA foreign_keys = OFF;`) durante a alteração das tabelas, impedindo que o SQLite reescreva as chaves estrangeiras.
2. **Mecanismo de Autocura (Self-Healing):** Implementamos uma rotina resiliente de autocura que verifica se a tabela `itens_venda` está corrompida (referenciando `vendas_old`) e reconstrói a tabela dinamicamente com a chave estrangeira apontando corretamente para `vendas(id)`.
3. **Cura de Bancos Existentes:** Rodamos scripts de correção em todos os bancos de dados ativos no sistema (`AppData\Local\Programs`, `AppData\Roaming`, e pasta de desenvolvimento), restabelecendo o perfeito funcionamento de forma automática e transparente para o cliente.

---

## 📦 Detalhes de Instalação e Distribuição (v1.0.4 - Hotfix)

*   **Instalador de Produção Compilado:**
    *   [MercadoPDV Setup 1.0.4.exe](file:///C:/Users/Felipe%20Gondim/MecadoPDV/release/MercadoPDV%20Setup%201.0.4.exe)
*   **Paridade Total de Ambientes:**
    *   Workspace Principal: `C:\Users\Felipe Gondim\MecadoPDV` - **100% Compilado, Testado e Comitado**
    *   Workspace Secundário: `C:\Users\Felipe Gondim\Documents\MecadoPDV` - **100% Sincronizado e Idêntico**
*   **Distribuição Automática:** As alterações foram commitadas e empurradas via `git push` para o repositório GitHub (`main`). O instalador atualizado já está no repositório pronto para distribuição de forma limpa.
