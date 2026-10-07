# MANUAL DO SISTEMA

# Masterbit Suport

| | |
|---|---|
| **Sistema** | Masterbit Suport (gestão de atendimentos de suporte técnico) |
| **Versão do manual** | 1.0 |
| **Data de atualização** | 04/10/2026 |
| **Organização responsável** | Masterbit |

> **Como ler este manual.** Os capítulos 1 a 17, 19 a 22 servem a todos os usuários. O **capítulo 18 é só para o administrador** (perfil Owner). Onde aparece **[IMAGEM DA TELA: ...]**, a imagem real ainda deve ser inserida. Onde aparece **"Informação não identificada na análise do sistema."**, o dado não pôde ser confirmado e consta no final, na lista de informações a confirmar.

---

## Sumário

1. Apresentação
2. Visão geral do sistema
3. Acesso ao sistema
4. Perfis de usuário
5. Conhecendo a interface
6. Dashboard
7. Módulos do sistema
8. Procedimentos passo a passo
9. Cadastros
10. Consultas e pesquisas
11. Relatórios
12. Processos importantes
13. Status e situações
14. Notificações e mensagens
15. Problemas comuns e soluções
16. Perguntas frequentes (FAQ)
17. Boas práticas e limitações atuais
18. Administração do sistema
19. Integrações
20. Automações
21. Glossário
22. Suporte
23. Controle de versão do manual
- Informações que precisam ser confirmadas
- Resumo do manual

---

# 1. APRESENTAÇÃO

## O que é

O **Masterbit Suport** é um sistema para **registrar e acompanhar atendimentos de suporte técnico**. Cada atendimento prestado a um cliente fica guardado com o que foi feito, quanto tempo levou, o que ficou pendente e como o problema foi resolvido.

## Para que serve

- Saber, a qualquer momento, **o que está aberto, o que está aguardando alguém e o que ficou pendente**.
- **Programar retornos e visitas** na agenda.
- **Consultar o histórico**: "como resolvi isso da última vez?".
- Acompanhar **projetos de consultoria** tópico por tópico.
- Medir **volume de atendimentos e horas** por período e por cliente.

## Qual problema resolve

Evita que um atendimento seja esquecido e que uma solução já encontrada se perca. A solução fica escrita e pode ser pesquisada depois.

## Quem deve utilizar

Profissionais de suporte técnico e pequenas equipes que atendem vários clientes. O sistema tem três perfis de acesso (capítulo 4). O cliente final **não** acessa o sistema.

## Principais benefícios

- Histórico completo e imutável de cada atendimento.
- Soluções que viram memória pesquisável.
- Controle de pendências, retornos e horas.
- Controle de quem pode ver e alterar o quê.

---

# 2. VISÃO GERAL DO SISTEMA

O sistema se organiza em torno do **atendimento**: ele nasce de um **cliente**, recebe **registros** (o histórico), gera **pendências** e **retornos** e termina com uma **solução**.

```
Sistema
├── Acesso: Login · Recuperar senha · Nova senha · Sair
├── Dashboard
├── Operação
│   ├── Atendimentos (lista · novo · detalhe)
│   ├── Pendências
│   ├── Agenda
│   └── Consultoria Citel
├── Base
│   └── Clientes (filiais · contatos · sistemas instalados)
├── Análise
│   ├── Consultas
│   ├── Casos parecidos
│   └── Relatórios
└── Sistema
    └── Configurações (Sistemas · Categorias · Conta · Equipe* · Auditoria*)
                                              * somente Owner
```

**Como as áreas se relacionam**

- **Clientes** alimentam os **Atendimentos** (todo atendimento pertence a um cliente).
- Dentro do atendimento você registra notas, anexa arquivos, cria **Pendências** e **Agendas** ligadas a ele.
- Ao **resolver** o atendimento, a solução passa a aparecer em **Consultas** e **Casos parecidos**.
- **Relatórios** e **Dashboard** resumem os atendimentos.
- **Configurações** definem os cadastros de apoio (sistemas e categorias) usados nos atendimentos.

---

# 3. ACESSO AO SISTEMA

## 3.1 Endereço de acesso

**Informação não identificada na análise do sistema.** O endereço de produção não consta no projeto. Peça ao administrador.

## 3.2 Login

1. Abra o endereço do sistema.
2. Informe o **E-mail** e a **Senha**.
3. Clique em **Entrar**.

Você é levado ao **Dashboard**. Se tentou abrir uma página antes de entrar, o sistema volta a ela depois do login.

**[IMAGEM DA TELA: Login]**

## 3.3 Primeiro acesso

Não existe tela de cadastro: **o acesso é criado pelo administrador**. Ele informa seu e-mail e uma **senha temporária**. Ao entrar pela primeira vez, troque a senha em **Configurações → Conta → Senha** (procedimento 8.25).

Se o seu acesso foi criado por outro caminho, ele pode aparecer como **inativo** até o administrador ativá-lo. Nesse caso o login informa: "Esta conta está desativada ou aguardando liberação."

## 3.4 Esqueci minha senha

Veja o procedimento 8.2. Resumo: em **Entrar** clique em **Esqueci minha senha**, informe o e-mail, abra o link recebido **no mesmo navegador** e crie a nova senha.

## 3.5 Encerrar a sessão

Clique em **Sair**, no canto superior direito, ao lado do seu e-mail. Em telas menores o botão mostra só o ícone de saída, sem o texto.

---

# 4. PERFIS DE USUÁRIO

O sistema tem três perfis.

### Owner (Administrador)

**Quem utiliza:** o responsável pelo sistema.

**Permissões:** tudo o que o Técnico faz, mais criar usuários, alterar papéis, ativar e desativar usuários e consultar a Auditoria.

**Restrições:** não pode alterar o próprio papel nem desativar a própria conta. A organização sempre precisa ter ao menos um Owner ativo.

### Técnico

**Quem utiliza:** quem presta o atendimento no dia a dia.

**Permissões:** criar e alterar atendimentos, clientes, pendências, agenda, consultoria e cadastros de apoio; anexar arquivos; consultar tudo.

**Restrições:** não vê as abas **Equipe** e **Auditoria** e não gerencia usuários.

### Visualizador

**Quem utiliza:** quem só precisa consultar.

**Permissões:** ver todas as telas de consulta, filtrar, pesquisar, abrir anexos e exportar CSV. Pode mudar o próprio tema, nome, telefone e senha.

**Restrições:** não vê botões de criar, editar, excluir, anexar, mudar status ou resolver. Se digitar o endereço de uma tela de cadastro, volta para a listagem. No topo aparece o selo **Somente consulta**.

### Tabela de permissões

| Funcionalidade | Owner | Técnico | Visualizador |
|---|---|---|---|
| Ver Dashboard, atendimentos, clientes, pendências, agenda, consultoria | Sim | Sim | Sim |
| Consultas, Casos parecidos, Relatórios e exportar CSV | Sim | Sim | Sim |
| Abrir, registrar, mudar status, atribuir e resolver atendimento | Sim | Sim | Não |
| Anexar e remover arquivos | Sim | Sim | Não |
| Cadastrar e editar clientes, filiais, contatos, sistemas do cliente | Sim | Sim | Não |
| Importar contatos de planilha | Sim | Sim | Não |
| Pendências e Agenda (criar e alterar) | Sim | Sim | Não |
| Consultoria (status, progresso, comentários, anexos, novo tópico) | Sim | Sim | Não |
| Cadastros de apoio (sistemas, categorias, subcategorias) | Sim | Sim | Não |
| Conta própria (tema, perfil, senha) | Sim | Sim | Sim |
| Equipe (criar usuário, papel, ativar e desativar) | **Sim** | Não | Não |
| Auditoria | **Sim** | Não | Não |

Usuário **desativado** não consegue entrar nem ver dado algum.

---

# 5. CONHECENDO A INTERFACE

**[IMAGEM DA TELA: Visão geral com menu lateral e barra superior]**

## Menu lateral

Fica à esquerda, com o logo no topo, e agrupa as áreas em quatro blocos:

- **Operação:** Dashboard, Atendimentos, Pendências, Agenda, Consultoria Citel.
- **Base:** Clientes.
- **Análise:** Consultas, Casos parecidos, Relatórios.
- **Sistema:** Configurações.

No celular o menu vira uma **gaveta** que se abre pelo botão no canto superior esquerdo.

## Barra superior

- **Novo atendimento:** atalho para abrir um atendimento (aparece só para Owner e Técnico). Para o Visualizador aparece o selo **Somente consulta**.
- **Seu e-mail:** a conta com que você está logado (em telas pequenas fica oculto).
- **Sair:** encerra a sessão.

## Elementos que se repetem

| Elemento | Para que serve |
|---|---|
| **Selos coloridos (badges)** | Mostram status e prioridade. A cor segue o significado (por exemplo, vermelho para urgente) |
| **Filtros** | Reduzem a lista. Atualizam o resultado ao serem alterados, sem botão de confirmar |
| **Tabelas** | Listam registros; clicar no título abre o detalhe |
| **Cartões** | Blocos com título que agrupam informações de uma tela |
| **Campos com asterisco vermelho (\*)** | Obrigatórios |
| **Mensagem em vermelho abaixo do campo** | Explica o que precisa ser corrigido |
| **Avisos rápidos** | Mensagem curta no canto da tela, por exemplo ao salvar um contato |
| **Estados vazios** | Quando não há dados, a tela diz "Nenhum..." e, quando faz sentido, oferece o botão para criar |

## Tema

Em **Configurações → Conta → Aparência** escolha **Claro**, **Escuro** ou **Automático** (segue o computador). A escolha fica gravada no navegador.

---

# 6. DASHBOARD

**Como acessar:** **Menu lateral → Dashboard** (é a primeira tela após o login).

**[IMAGEM DA TELA: Dashboard]**

## Indicadores (cartões do topo)

Cada cartão é clicável e leva à lista de atendimentos já filtrada.

| Indicador | Significado |
|---|---|
| **Abertos** | Atendimentos com status Aberto |
| **Em andamento** | Atendimentos em andamento |
| **Aguardando** | Atendimentos aguardando cliente ou terceiro (somados) |
| **Resolvidos no mês** | Resolvidos neste mês, com o total de horas trabalhadas no mês |

## Blocos de acompanhamento

- **Pendências:** as pendências ainda ativas (até 6), com prazo mais próximo primeiro. Pendência vencida recebe destaque. O link **Ver todas as pendências** abre a lista completa.
- **Agenda:** os compromissos pendentes dos **próximos 30 dias** (até 6). Compromisso de hoje cuja hora já passou aparece com o selo **Atrasado**. O link **Ver a agenda completa** abre a Agenda.
- **Aguardando retorno:** atendimentos esperando cliente ou terceiro, os **mais antigos primeiro**, para você cobrar quem está atrasado.
- **Últimos atendimentos:** atendimentos **ainda em aberto**, do movimentado mais recentemente para o mais antigo. Resolvidos e cancelados não aparecem aqui.

Se o sistema ainda não tem nenhum atendimento, o Dashboard mostra "Nenhum atendimento ainda" (com o botão **Novo atendimento** para quem pode criar).

---

# 7. MÓDULOS DO SISTEMA

## 7.1 Atendimentos

### Objetivo
Registrar cada atendimento de suporte e seu histórico, do pedido do cliente até a solução.

### Quem pode utilizar
Ver: todos. Criar, registrar, mudar status, atribuir e resolver: Owner e Técnico.

### Como acessar
**Menu lateral → Atendimentos.** Para criar: **Atendimentos → Novo atendimento** (ou o atalho **Novo atendimento** na barra superior).

### Tela principal (lista)
**[IMAGEM DA TELA: Lista de atendimentos]**

- **Busca:** campo "Buscar por número, assunto, cliente ou histórico…".
- **Filtros:** Status, Prioridade, Categoria, Cliente e Responsável.
- **Colunas:** Nº, Assunto, Cliente, Status, Prioridade, Tempo, Atualizado.
- **Padrão:** ao abrir pelo menu, a lista vem filtrada em **Em aberto**. Para ver tudo, escolha **Todos os status**.
- A lista é dividida em páginas de 25 atendimentos (**Anterior** / **Próxima**).

### Tela de detalhe
**[IMAGEM DA TELA: Detalhe do atendimento]**

- **Cabeçalho:** número, status, prioridade, assunto (com lápis para editar), cliente, filial e contato, tempo total, botões **Agendar** e **Resolver atendimento**.
- **Caixa de registro:** onde você escreve o que foi feito.
- **Histórico:** linha do tempo com todos os registros, do mais antigo ao mais novo.
- **Solução:** aparece depois de resolvido, com causa raiz e data de fechamento.
- **Lateral:** **Situação** (mudar status), **Classificação** (categoria, subcategoria, sistema, canal, tipo, responsável, data de abertura), **Anexos** e **Pendências**.

### Funcionalidades disponíveis
Abrir, registrar notas com tempo e anexo, mudar status, atribuir responsável, editar assunto, anexar arquivos, agendar retorno, criar pendência, resolver.

---

## 7.2 Clientes

### Objetivo
Manter o cadastro das empresas atendidas, com suas filiais, contatos e sistemas instalados.

### Quem pode utilizar
Ver: todos. Cadastrar e alterar: Owner e Técnico.

### Como acessar
**Menu lateral → Clientes.** Para cadastrar: **Clientes → Novo cliente**.

### Tela principal (lista)
**[IMAGEM DA TELA: Lista de clientes]**

Colunas: Cliente, CPF/CNPJ, Cidade, Contrato, Status. Há busca e filtro de status.

### Ficha do cliente
**[IMAGEM DA TELA: Ficha do cliente]**

Indicadores no topo (atendimentos abertos, total de atendimentos, filiais e sistemas) e quatro abas:

- **Visão geral:** dados do cadastro.
- **Filiais:** unidades do cliente.
- **Contatos:** pessoas da empresa (com **Importar planilha**).
- **Sistemas:** sistemas instalados no cliente.

O botão **Editar** abre a edição do cadastro, onde também está **Excluir cliente**.

---

## 7.3 Pendências

### Objetivo
Registrar o que ficou em aberto, de quem depende e para quando.

### Quem pode utilizar
Ver: todos. Criar e alterar: Owner e Técnico.

### Como acessar
**Menu lateral → Pendências.** Para criar: **Pendências → Nova pendência** (ou **Nova** dentro de um atendimento).

### Tela principal
**[IMAGEM DA TELA: Lista de pendências]**

Filtros de **Status**, **Responsável** (Comigo, Com cliente, Com terceiro) e **Prioridade**. Cada pendência é um cartão com os botões **Iniciar**, **Concluir** e **Cancelar**. Por padrão aparecem as **ativas** (abertas e em andamento).

---

## 7.4 Agenda

### Objetivo
Programar e acompanhar retornos, visitas, reuniões, tarefas e lembretes.

### Quem pode utilizar
Ver: todos. Criar e alterar: Owner e Técnico.

### Como acessar
**Menu lateral → Agenda.** Para criar: **Agenda → Novo evento** (ou **Agendar**, dentro de um atendimento).

### Tela principal
**[IMAGEM DA TELA: Agenda]**

Três visões: **Próximos** (próximos 30 dias, do mais cedo para o mais tarde), **Este mês** e **Todos** (do mais recente para o mais antigo). Há um **minicalendário** lateral que filtra por dia. Os eventos aparecem agrupados por dia, com o selo de status.

No detalhe do evento: **Marcar como realizado**, **Remarcar** e **Cancelar evento**.

---

## 7.5 Consultoria Citel

### Objetivo
Acompanhar o projeto de consultoria tópico por tópico: status, progresso, comentários e anexos.

### Quem pode utilizar
Ver: todos. Alterar: Owner e Técnico.

### Como acessar
**Menu lateral → Consultoria Citel.**

### Tela principal
**[IMAGEM DA TELA: Consultoria Citel]**

- **Progresso geral** do projeto, com o texto "X de Y tópicos concluídos". O cálculo é a média dos tópicos, **sem contar os cancelados**.
- Lista de tópicos com código, título, resumo, selo de status e barra de progresso.
- **Novo tópico** (Owner e Técnico) para acrescentar tópicos.

### Detalhe do tópico
**[IMAGEM DA TELA: Detalhe do tópico]**

Status, controle de progresso de 0 a 100%, caixa de comentário, lista de **Comentários**, cartão **Escopo** (descrição) e **Anexos**. O Visualizador vê o status e o progresso apenas como informação.

---

## 7.6 Consultas

### Objetivo
Pesquisar no histórico de atendimentos combinando texto e filtros.

### Quem pode utilizar
Todos.

### Como acessar
**Menu lateral → Consultas.**

### Tela principal
**[IMAGEM DA TELA: Consultas]**

Detalhada no capítulo 10.

---

## 7.7 Casos parecidos

### Objetivo
Encontrar atendimentos **já resolvidos** semelhantes a um problema atual, para reaproveitar a solução.

### Quem pode utilizar
Todos (o atalho para criar atendimento só aparece para Owner e Técnico).

### Como acessar
**Menu lateral → Casos parecidos.**

### Tela principal
**[IMAGEM DA TELA: Casos parecidos]**

Campo de busca e botão **Buscar casos parecidos**. Detalhada no capítulo 10.

---

## 7.8 Relatórios

### Objetivo
Mostrar volume e tempo de suporte em um período.

### Quem pode utilizar
Todos.

### Como acessar
**Menu lateral → Relatórios.** Detalhado no capítulo 11.

---

## 7.9 Configurações

### Objetivo
Manter os cadastros de apoio, as preferências pessoais e, para o Owner, a equipe e a auditoria.

### Quem pode utilizar
Todos veem as abas **Sistemas**, **Categorias** e **Conta** (alterar sistemas e categorias: Owner e Técnico). **Equipe** e **Auditoria**: somente Owner.

### Como acessar
**Menu lateral → Configurações**, depois escolha a aba.

---

# 8. PROCEDIMENTOS PASSO A PASSO

## 8.1 Como entrar no sistema

**Objetivo:** acessar o sistema com sua conta.

1. **Passo 1:** abra o endereço do sistema.
2. **Passo 2:** preencha **E-mail** e **Senha**.
3. **Passo 3:** clique em **Entrar**.

**Resultado esperado:** o Dashboard é aberto.

**Atenção:** a mensagem "E-mail ou senha inválidos" é a mesma para e-mail inexistente e senha errada, de propósito. Conta desativada recebe um aviso próprio.

## 8.2 Como recuperar a senha

**Objetivo:** criar uma nova senha quando você a esqueceu.

1. **Passo 1:** na tela de login, clique em **Esqueci minha senha**.
2. **Passo 2:** informe o e-mail da sua conta e clique em **Enviar link**.
3. **Passo 3:** a tela confirma: "Se este e-mail estiver cadastrado, enviamos um link para criar uma nova senha." Abra o e-mail (confira o spam).
4. **Passo 4:** clique no link **no mesmo navegador** em que fez o pedido.
5. **Passo 5:** digite a **Nova senha** e repita em **Repita a nova senha** (mínimo de 8 caracteres).
6. **Passo 6:** clique em **Salvar nova senha**.

**Resultado esperado:** você entra no sistema com a nova senha. As outras sessões abertas da sua conta são encerradas.

**Atenção:** o link expira e só funciona uma vez. Se aparecer "Esse link não é mais válido…", peça um novo. Pedidos em excesso podem dar "Muitos pedidos em pouco tempo": aguarde alguns minutos.

## 8.3 Como sair do sistema

1. Clique em **Sair**, na barra superior.

**Resultado esperado:** a sessão é encerrada e a tela de login é exibida.

## 8.4 Como cadastrar um cliente

**Objetivo:** incluir uma empresa na base.

1. Acesse **Clientes → Novo cliente**.
2. Preencha a **Razão social** (obrigatória) e, se quiser, os demais campos (veja a tabela no capítulo 9).
3. Escolha **Tipo** (Pessoa jurídica ou Pessoa física), **Status** e **Tipo de contrato**.
4. Clique em **Cadastrar cliente**.

**Resultado esperado:** o cliente é criado e pode receber atendimentos.

**Atenção:** CPF/CNPJ deve ter 11 ou 14 dígitos e não pode repetir outro cliente. Só clientes com status **Ativo** aparecem para escolha ao abrir atendimento.

## 8.5 Como adicionar uma filial

1. Abra a ficha do cliente em **Clientes** e escolha a aba **Filiais**.
2. No cartão **Adicionar a filiais**, preencha o **Nome** (obrigatório) e o que mais precisar.
3. Marque **É a matriz**, se for o caso.
4. Clique em **Adicionar filial**.

**Resultado esperado:** a filial aparece na lista.

**Atenção:** só pode haver **uma matriz** por cliente e o **Código** não pode repetir dentro do mesmo cliente. O sistema não oferece edição de filial depois de criada.

## 8.6 Como adicionar um contato

1. Abra a ficha do cliente e escolha a aba **Contatos**.
2. No cartão **Adicionar contato**, preencha o **Nome** (obrigatório) e os demais campos.
3. Marque **Contato principal** se for o caso.
4. Clique em **Adicionar contato**.

**Resultado esperado:** o contato aparece na lista e um aviso "Contato adicionado." é exibido.

**Atenção:** só pode haver **um** contato principal por cliente; ao marcar outro, o anterior deixa de ser principal.

## 8.7 Como editar, excluir ou reativar um contato

**Editar**
1. Na aba **Contatos**, na linha do contato, clique em **Editar**.
2. A tela rola até o formulário, que vem preenchido. A linha mostra **Editando…**.
3. Altere o que precisar e clique em **Salvar alterações** (ou **Cancelar**).

**Excluir**
1. Na linha do contato, clique no ícone de lixeira.
2. Confirme a pergunta exibida.

**Reativar**
1. Contatos inativos aparecem com o selo **Inativo**. Clique em **Reativar** na linha.

**Atenção:** "Excluir" **não apaga**: o contato é inativado e continua nos atendimentos antigos. Inativos ficam no fim da lista.

## 8.8 Como importar contatos de uma planilha

**Objetivo:** cadastrar vários contatos de uma vez.

1. Na aba **Contatos**, clique em **Importar planilha**.
2. **1. Escolha a planilha:** selecione um arquivo **.xlsx**, **.xls** ou **.csv** (a primeira aba, com os dados a partir da primeira linha; até 2.000 linhas).
3. **2. Confira as colunas:** o sistema sugere qual coluna corresponde a cada campo (Nome, Cargo, Setor, E-mail, Telefone, WhatsApp, Filial / unidade, Observações). Ajuste, ou escolha **— não importar —**. Marque as opções que desejar (criar filiais que ainda não existem; ignorar duplicados).
4. Clique em **Importar N contatos**.
5. **3. Confira o resultado:** o sistema informa quantos contatos foram cadastrados, quantas linhas foram ignoradas e quais foram recusadas, com o motivo.

**Resultado esperado:** os contatos são criados no cliente. Use **Ver contatos** para conferir ou **Importar outra planilha**.

**Atenção:** a coluna **Nome** é obrigatória. Duplicados são identificados pelo e-mail (ou pelo nome, se não houver e-mail).

## 8.9 Como vincular um sistema ao cliente

1. Abra a aba **Sistemas** da ficha do cliente.
2. Em **Adicionar a sistemas instalados**, escolha o **Sistema** (obrigatório), a **Filial**, o **Ambiente** (Produção, Homologação ou Teste), a **Versão instalada**, a **Implantação**, as **Licenças** e **Observações**.
3. Clique em **Vincular sistema**.

**Resultado esperado:** o sistema aparece na lista do cliente.

**Atenção:** o sistema precisa existir antes em **Configurações → Sistemas**. A mesma combinação de sistema e filial não pode repetir. Para desvincular, use **Remover**, que **apaga o vínculo de verdade** (não há como recuperar).

## 8.10 Como abrir um atendimento

**Objetivo:** registrar um novo chamado.

1. Clique em **Novo atendimento** (barra superior ou lista de Atendimentos).
2. Escolha o **Cliente** (obrigatório).
3. Escreva o **Assunto** (obrigatório, mínimo de 3 letras). Ele é gravado em **letras maiúsculas**.
4. Se quiser, escolha **Canal**, **Categoria** e **Subcategoria**.
5. Em **Detalhes**, preencha o que for útil: **Filial**, **Quem falou**, **Sistema**, **Tipo**, **Prioridade** e **Descrição**.
6. Clique em **Abrir atendimento**.

**Resultado esperado:** o atendimento é criado com um número (por exemplo, AT-2026-00020) e a tela de detalhe é aberta, com o registro "Atendimento aberto" no histórico.

**Atenção:** a **Subcategoria** só fica disponível depois de escolher a **Categoria**. As opções de **Filial**, **Quem falou** e **Sistema** dependem do cliente escolhido.

## 8.11 Como registrar o que foi feito

**Objetivo:** guardar cada ação ou combinado no histórico do atendimento.

1. Abra o atendimento.
2. Na caixa "O que foi feito ou combinado…", escreva o registro.
3. Escolha o **tipo**: Nota, Ligação, E-mail, WhatsApp, Acesso remoto ou Visita.
4. Informe os **minutos** gastos (opcional).
5. Clique em **Registrar**.

**Resultado esperado:** o registro entra no **Histórico**, com autor, data e hora. Os minutos somam no **tempo total** do atendimento.

**Atenção:** o texto é obrigatório. Registros **não podem ser editados nem apagados**: se errar, registre uma correção. O **primeiro registro** muda o status de **Aberto** para **Em andamento**.

## 8.12 Como anexar uma imagem ou arquivo

**Junto do registro (recomendado)**
1. Na caixa de registro, clique em **Anexar**, **arraste** o arquivo para a caixa ou **cole um print com Ctrl+V**.
2. O arquivo aparece como miniatura abaixo do texto; use o **x** para retirá-lo.
3. Escreva o texto e clique em **Registrar**.

**Resultado esperado:** o arquivo fica **dentro do mesmo registro** do histórico.

**Pelo cartão Anexos**
1. Na lateral, no cartão **Anexos**, clique em **Anexar arquivo**, arraste o arquivo ou cole um print.

**Resultado esperado:** o arquivo entra na lista de anexos e o histórico ganha o registro "Anexou [nome do arquivo]".

**Atenção:**
- Limite de **10 MB por arquivo**.
- Tipos aceitos: png, jpg, jpeg, gif, webp, pdf, txt, log, csv, json, xml, zip, doc, docx, xls, xlsx.
- O sistema confere se o conteúdo corresponde à extensão.
- Para remover um anexo do cartão Anexos, use o ícone de lixeira e confirme. O arquivo some da lista e a remoção é registrada no histórico.

## 8.13 Como mudar o status de um atendimento

**Objetivo:** indicar em que ponto o atendimento está.

1. No cartão **Situação**, escolha o **Status**.
2. Se for **Aguardando cliente** ou **Aguardando terceiro**, preencha **Aguardando o quê** (por exemplo, "cliente enviar o XML da nota").
3. Se quiser, escreva uma **Observação** (vira um registro no histórico).
4. Clique em **Aplicar status**.

**Resultado esperado:** o novo status aparece no cabeçalho e uma linha "Status: X → Y" entra no histórico. Quando aguardando, uma faixa "Aguardando: ..." aparece no topo.

**Atenção:** "Resolvido" não está na lista: para resolver use **Resolver atendimento** (8.14). Depois de **Resolvido** ou **Cancelado**, o cartão **Situação** deixa de aparecer: **a interface não oferece reabertura**.

## 8.14 Como resolver um atendimento

**Objetivo:** encerrar o atendimento deixando a solução registrada.

1. No cabeçalho, clique em **Resolver atendimento**.
2. Escreva a **Solução** (obrigatória, ao menos 5 letras): o que resolveu.
3. Se quiser, preencha a **Causa raiz** (por que aconteceu), o **Tempo do fechamento (minutos)** e marque **Atendimento faturável**.
4. Clique em **Confirmar resolução**.

**Resultado esperado:** o status vira **Resolvido**, a data de fechamento é preenchida e a solução aparece no atendimento. Se informou tempo, ele é somado e um registro "Fechamento: ..." entra no histórico.

**Atenção:** a solução é o que você vai reler depois em **Consultas** e **Casos parecidos**; escreva com clareza. Sem solução, o sistema recusa: "Registre como o problema foi resolvido" ou "Registre a solução antes de resolver o atendimento".

## 8.15 Como editar o assunto do atendimento

1. No detalhe, clique no **lápis** ao lado do assunto.
2. Altere o texto (mínimo de 3 letras). Ele continua em maiúsculas.
3. Confirme com **Enter** ou com o ícone de confirmação. Para desistir, **Esc** ou o ícone de cancelar.

**Resultado esperado:** o novo assunto é exibido.

## 8.16 Como atribuir um responsável

1. Na lateral, em **Classificação**, localize **Responsável**.
2. Escolha o usuário e clique em **Atribuir**.

**Resultado esperado:** o responsável é trocado.

**Atenção:** o campo só aparece quando existe mais de um usuário elegível e o atendimento não está encerrado. Só recebem atendimentos usuários **ativos** com perfil Owner ou Técnico; senão aparece "Este usuário não pode receber atendimentos".

## 8.17 Como criar uma pendência

1. Em **Pendências → Nova pendência**, ou no atendimento, em **Pendências → Nova**.
2. Informe o **Cliente** (se não veio de um atendimento) e o **Título** (obrigatório, mínimo de 3 letras).
3. Preencha **Detalhes**, escolha o **Responsável** (Eu, Cliente ou Terceiro) e, se for Terceiro, o **Nome do terceiro**.
4. Escolha a **Prioridade** e, se quiser, o **Prazo**.
5. Clique em **Registrar pendência**.

**Resultado esperado:** a pendência aparece na lista e no Dashboard.

**Atenção:** a pendência precisa estar ligada a um cliente ou a um atendimento. Responsável **Terceiro** exige o nome.

## 8.18 Como iniciar, concluir ou cancelar uma pendência

- **Iniciar:** em uma pendência **Aberta**, clique em **Iniciar** (passa para Em andamento).
- **Concluir:** clique em **Concluir**, escreva **Como foi resolvida?** (obrigatório) e clique em **Confirmar**.
- **Cancelar:** clique em **Cancelar**.

**Resultado esperado:** a pendência muda de situação e sai da lista de ativas.

**Atenção:** **Cancelar não pede confirmação.**

## 8.19 Como agendar um evento (retorno, visita...)

1. Em **Agenda → Novo evento**, ou no atendimento, em **Agendar**.
2. Escreva o **Título** (obrigatório) e escolha o **Tipo** (Retorno, Visita, Reunião, Tarefa, Lembrete ou Manutenção preventiva).
3. Informe **Início** (obrigatório) e, se quiser, **Término**; ou marque **Dia inteiro**.
4. Se quiser, preencha **Local**, **Lembrete antes** e **Descrição**, e escolha o **Cliente** ou o vínculo.
5. Clique em **Agendar**.

**Resultado esperado:** o evento aparece na Agenda e no Dashboard.

**Atenção:** o término não pode ser antes do início. O **lembrete é apenas um dado do evento: o sistema não envia aviso** (capítulo 20).

## 8.20 Como realizar, remarcar ou cancelar um evento

- **Marcar como realizado:** abra o evento, clique em **Marcar como realizado**, escreva **O que aconteceu** (opcional) e clique em **Confirmar realização**. Se o evento está ligado a um atendimento, marque **Registrar como interação no atendimento vinculado** para gravar o resumo no histórico dele.
- **Remarcar:** clique em **Remarcar**, informe a **Nova data / hora**, o **Término** e o **Motivo (opcional)** e clique em **Remarcar evento**. O evento antigo fica como **Remarcado** e é criado um novo.
- **Cancelar evento:** clique em **Cancelar evento**. **Não pede confirmação.**

**Atenção:** essas ações só aparecem enquanto o evento está **Agendado** ou **Confirmado**.

## 8.21 Como acompanhar um tópico da Consultoria

1. Em **Consultoria Citel**, clique no tópico.
2. Mude o **status** no seletor. Ao escolher **Concluído**, o progresso vai automaticamente para **100%**.
3. Ajuste o **Progresso** arrastando o controle; ele grava ao soltar.
4. Escreva em **Comentar** e clique em **Comentar** para registrar uma observação.
5. Anexe arquivos ou prints no cartão **Anexos** (mesmas regras do 8.12).

**Para criar um novo tópico:** na lista, clique em **Novo tópico**, preencha **Código** (opcional), **Título** (obrigatório) e **Descrição**, e clique em **Criar tópico**.

**Atenção:** comentários **não podem ser editados nem apagados**.

## 8.22 Como pesquisar no histórico (Consultas)

Veja o capítulo 10.

## 8.23 Como buscar casos parecidos

1. Acesse **Casos parecidos**.
2. Digite os tópicos ou palavras do problema (códigos de erro ajudam).
3. Clique em **Buscar casos parecidos**.

**Resultado esperado:** até 5 atendimentos **resolvidos** parecidos, com a solução e a causa raiz. Se nada servir, use o atalho **Abrir novo atendimento com estes termos** (Owner e Técnico), que abre o formulário com o assunto preenchido.

## 8.24 Como gerar um relatório

Veja o capítulo 11.

## 8.25 Como alterar tema, perfil e senha

Em **Configurações → Conta**:

- **Aparência:** escolha Claro, Escuro ou Automático.
- **Perfil:** altere **Nome** e **Telefone** e clique em **Salvar perfil**.
- **Senha:** informe **Nova senha** (mínimo de 8 caracteres) e **Confirmar senha** e clique em **Alterar senha**.

---

# 9. CADASTROS

## Cadastro de Clientes

### Para que serve
Guardar os dados das empresas atendidas. Todo atendimento pertence a um cliente.

### Como acessar
**Clientes → Novo cliente** (cadastrar) ou **Clientes → [cliente] → Editar** (alterar).

### Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| Razão social | **Sim** | Nome da empresa (mínimo de 2 letras) |
| Nome fantasia | Não | Nome comercial |
| Código interno | Não | Seu código de controle; não pode repetir |
| Tipo | Sim (tem padrão) | Pessoa jurídica ou Pessoa física |
| CPF/CNPJ | Não | Só os dígitos (11 ou 14); a formatação é automática; não pode repetir |
| Status | Sim (tem padrão) | Ativo, Prospect ou Inativo |
| Segmento | Não | Ramo de atividade |
| E-mail, Telefone, Site | Não | Contato (o e-mail precisa ser válido) |
| CEP, Logradouro, Número, Complemento, Bairro, Cidade, UF | Não | Endereço (UF com 2 letras) |
| Tipo de contrato | Sim (tem padrão) | Avulso, Mensal ou Pacote de horas |
| Horas contratadas | Não | Quantidade de horas do contrato |
| Observações | Não | Anotações livres |

### Como editar
**Clientes → [cliente] → Editar**, altere e clique em **Salvar alterações**.

### Como consultar
Em **Clientes**, use a busca e o filtro de status; abra a ficha para ver filiais, contatos e sistemas.

### Como excluir
**Clientes → [cliente] → Editar → Excluir cliente** e confirme. **O cliente não é apagado:** passa a **Inativo**, sai das listas e buscas ativas e não aparece mais para novos atendimentos. O histórico é mantido. Para reverter, volte a **Editar** e mude o **Status** para **Ativo**.

### Regras e restrições
Documento e código não podem repetir. O botão **Excluir cliente** só aparece para clientes que ainda não estão inativos.

---

## Cadastro de Filiais

### Para que serve
Registrar unidades do cliente.

### Como acessar
Ficha do cliente → aba **Filiais**.

### Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| Nome | **Sim** | Nome da filial |
| Código | Não | Não pode repetir dentro do cliente |
| Telefone, Cidade, UF, Responsável | Não | Dados da unidade |
| É a matriz | Não | Marca a filial principal |

### Como editar / excluir
**Não identificado na interface analisada:** não há opção de editar nem excluir filial.

### Regras
Só uma matriz por cliente.

---

## Cadastro de Contatos

### Para que serve
Registrar as pessoas da empresa cliente. Podem ser escolhidas em **Quem falou** ao abrir um atendimento.

### Como acessar
Ficha do cliente → aba **Contatos**.

### Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| Nome | **Sim** | Nome da pessoa (mínimo de 2 letras) |
| Cargo, Setor | Não | Função e departamento |
| E-mail | Não | Precisa ser válido |
| Telefone, WhatsApp | Não | Contatos |
| Filial | Não | Escolha uma filial ou "Sem filial específica" |
| Contato principal | Não | Só um por cliente |

### Como editar, excluir, reativar
Veja 8.7. Também é possível **importar em lote** (8.8).

---

## Cadastro de Sistemas instalados (no cliente)

### Para que serve
Registrar quais sistemas cada cliente usa, em qual filial e ambiente.

### Como acessar
Ficha do cliente → aba **Sistemas**.

### Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| Sistema | **Sim** | Vem do cadastro de sistemas em Configurações |
| Filial | Não | "Matriz / sem filial" ou uma filial |
| Ambiente | Sim (tem padrão) | Produção, Homologação ou Teste |
| Versão instalada | Não | Versão em uso |
| Implantação | Não | Data de implantação |
| Licenças | Não | Quantidade (maior que zero) |
| Observações | Não | Anotações |

### Como editar
**Não identificado na interface analisada:** não há edição. Para corrigir, remova e vincule novamente.

### Como excluir
Botão **Remover** na linha. **Apaga o vínculo definitivamente.**

---

## Cadastro de Sistemas (catálogo)

### Para que serve
Lista dos softwares que você atende. Alimenta os atendimentos e os sistemas dos clientes.

### Como acessar
**Configurações → Sistemas.**

### Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| Nome | **Sim** | Não pode repetir |
| Fabricante | Não | Fabricante do software |
| Tipo | Sim | ERP, Fiscal, Sistema próprio, Infraestrutura ou Outro |
| Versão atual | Não | Versão corrente |

### Como cadastrar
Preencha o cartão **Adicionar sistema** e clique em **Adicionar sistema**.

### Como editar / excluir
**Não identificado na interface analisada.** A lista mostra o selo **Inativo** para sistemas inativos, mas a tela não oferece ação para alterar ou desativar.

---

## Cadastro de Categorias e Subcategorias

### Para que serve
Classificar atendimentos (ex.: Fiscal, Financeiro, Sistema). Um conjunto inicial de **7 categorias e 28 subcategorias** vem pronto.

### Como acessar
**Configurações → Categorias.**

### Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| Categoria: Nome | **Sim** | Não pode repetir |
| Categoria: Cor | **Sim** | Formato #RRGGBB; aparece no selo do atendimento |
| Categoria: Ordem | Sim | Posição na lista |
| Subcategoria: Categoria | **Sim** | A que ela pertence |
| Subcategoria: Nome | **Sim** | Não pode repetir dentro da categoria |
| Subcategoria: SLA (horas) | Não | Maior que zero. Informação de cadastro; **o sistema não calcula nem avisa atrasos** com base nele |
| Subcategoria: Ordem | Sim | Posição na lista |

### Como cadastrar
Use **Adicionar categoria** e **Adicionar subcategoria**.

### Como editar / excluir
**Não identificado na interface analisada.**

---

## Cadastro de Atendimento

Veja os procedimentos 8.10 a 8.16. Resumo dos campos:

| Campo | Obrigatório | Descrição |
|---|---|---|
| Cliente | **Sim** | Empresa atendida (só clientes ativos) |
| Assunto | **Sim** | Mínimo de 3 letras; gravado em maiúsculas |
| Canal | Sim (padrão Telefone) | Telefone, WhatsApp, E-mail, Presencial, Acesso remoto, Chat ou Interno |
| Categoria / Subcategoria | Não | Classificação |
| Filial / Quem falou / Sistema | Não | Dependem do cliente |
| Tipo | Sim (padrão Dúvida) | Dúvida, Erro, Treinamento, Implantação, Melhoria, Manutenção ou Consultoria |
| Prioridade | Sim (padrão Média) | Baixa, Média, Alta ou Urgente |
| Descrição | Não | O que o cliente relatou |

**Como editar:** só o **assunto** (8.15), o **status** (8.13) e o **responsável** (8.16). A descrição não é editável na interface.

**Como excluir:** **não existe exclusão**. Para encerrar sem resolver, use o status **Cancelado**.

---

## Cadastro de Pendências, Eventos e Tópicos

| Cadastro | Campos principais (obrigatórios em negrito) |
|---|---|
| **Pendência** | **Título**; Cliente ou atendimento de origem (um dos dois é obrigatório); Detalhes; Responsável (Eu, Cliente, Terceiro); Nome do terceiro (obrigatório se Terceiro); Prioridade; Prazo |
| **Evento da agenda** | **Título**; **Início**; Término; Tipo; Dia inteiro; Local; Lembrete antes; Cliente; Descrição |
| **Tópico da Consultoria** | **Título**; Código; Descrição |

**Editar/excluir pendência ou evento:** não há edição de dados. Pendência: iniciar, concluir ou cancelar. Evento: marcar como realizado, remarcar (cria novo) ou cancelar.

---

# 10. CONSULTAS E PESQUISAS

## 10.1 Lista de Atendimentos (busca rápida)

**Como acessar:** **Atendimentos**.

- **Busca:** digite no campo. Com **3 ou mais letras**, o sistema procura também na **descrição**, na **solução** e no **texto dos registros do histórico**, além de número, assunto e cliente. Com menos de 3 letras, procura só em número, assunto e cliente.
- **Filtros:** Status, Prioridade, Categoria, Cliente e Responsável. O resultado atualiza sozinho ao alterar.
- **Padrão:** abre em **Em aberto** (aberto, em andamento, aguardando e agendado). **Todos os status** mostra tudo; **Aguardando (cliente ou terceiro)** reúne os dois tipos de espera.
- **Ordenação:** do atendimento atualizado mais recentemente para o mais antigo.
- **Paginação:** 25 por página.
- **Detalhes:** clique no assunto.

## 10.2 Consultas

**Como acessar:** **Consultas.**

- **Busca:** "Buscar em títulos, descrições e soluções…". Com 3 ou mais letras faz busca por texto completo; com menos, procura só no assunto, número e cliente. **A busca desta tela não olha o texto dos registros do histórico**; para isso use a busca da lista de Atendimentos.
- **Filtros:** Status, Prioridade, Tipo, Cliente, Categoria, Sistema, Data inicial e Data final (pela data de criação). O botão **Limpar filtros** zera tudo.
- **Resultado:** tabela com Número, Assunto, Cliente, Status, Tipo, Tempo e datas de abertura e fechamento. 50 por página (**Anterior** / **Próxima**).
- **Buscas salvas:** com filtros aplicados, digite um nome em "Nome desta busca…" e clique em **Salvar** (ou **Salvar esta busca**). Dá para guardar **até 10**, e **ficam só no navegador** que você usa. Para apagar, use o ícone de remover da busca.
- **Exportar:** botão **Exportar CSV (N)** baixa os resultados da tela em um arquivo CSV.

## 10.3 Casos parecidos

**Como acessar:** **Casos parecidos.**

- Pesquisa **somente atendimentos resolvidos**, e mostra no máximo **5** resultados, com solução e causa raiz.
- Palavras comuns e termos curtos são ignorados; **números com 3 ou mais dígitos** (como o código de um erro) são aproveitados.
- Se o texto for muito curto: "Descreva o problema com um pouco mais de detalhe para buscar casos parecidos."

## 10.4 Dicas para achar rápido

- Para um problema novo, tente **Casos parecidos** primeiro.
- Para achar um atendimento em andamento, use a busca da lista de **Atendimentos**; ela alcança o histórico.
- Para um recorte (cliente, período, sistema), use **Consultas** com filtros e salve a busca.

---

# 11. RELATÓRIOS

## Relatório de volume e tempo de suporte

**Objetivo:** mostrar o volume de atendimentos e o tempo trabalhado em um período.

**Como acessar:** **Relatórios.**

**Filtros disponíveis:** período por botões (**Este mês**, **Mês passado**, **Últimos 3 meses**, **Últimos 6 meses**, **Este ano**) ou por **Data inicial** e **Data final**. O resultado atualiza ao escolher.

**Como gerar:** escolha o período.

**Resultado:** indicadores, distribuições e evolução:

| Bloco | O que mostra |
|---|---|
| **Total no período**, **Em aberto**, **Resolvidos**, **Cancelados** | Quantidade de atendimentos **abertos no período**, por situação. O cartão **Resolvidos** mostra também a **porcentagem** de resolução |
| **Tempo total** | Soma das horas dos atendimentos do período; abaixo aparece a **Média** de tempo dos atendimentos resolvidos |
| **Por Status**, **Por Prioridade**, **Por Tipo**, **Por Canal**, **Por Categoria** | Quantidade e tempo em cada grupo |
| **Top Clientes** | Os 10 clientes com mais atendimentos |
| **Evolução mensal** | Por mês: **Criados**, **Resolvidos** e **Taxa** |

**Exportação:** botão **Exportar CSV (N)**, em formato CSV.

**Atenção:** os relatórios consideram os atendimentos pela **data de abertura**. Com mais de mil atendimentos no período, os números podem sair incompletos sem aviso; nesse caso, use períodos menores.

---

# 12. PROCESSOS IMPORTANTES

## 12.1 Ciclo de vida de um atendimento

```
Cadastrar cliente → Abrir atendimento → Registrar o que foi feito
        → (se depender de alguém) Aguardando cliente / terceiro
        → (se precisar voltar) Criar pendência e/ou Agendar retorno
        → Resolver (com solução)
        → Solução fica pesquisável em Consultas e Casos parecidos
```

Detalhes:
1. **Abrir:** o atendimento nasce **Aberto**, com número automático e o registro "Atendimento aberto".
2. **Trabalhar:** o primeiro registro muda o status para **Em andamento**; cada registro soma tempo.
3. **Esperar:** ao depender de alguém, mude para **Aguardando cliente** ou **Aguardando terceiro** informando o que se espera. O Dashboard passa a listá-lo em **Aguardando retorno**.
4. **Acompanhar:** use **Pendências** para o que ficou em aberto e **Agenda** para o retorno.
5. **Resolver:** a solução é obrigatória. O atendimento sai das listas "em aberto".
6. **Reaproveitar:** a solução alimenta as buscas.

## 12.2 Ciclo de uma pendência

**Aberta → Em andamento → Concluída** (com resultado) ou **Cancelada** a qualquer momento.

## 12.3 Ciclo de um evento da agenda

**Agendado → Realizado** (com resultado), **Remarcado** (gera um novo evento Agendado) ou **Cancelado**.

## 12.4 Ciclo de um tópico de consultoria

**Pendente → Em andamento → Concluído** (progresso 100%) ou **Cancelado** (fora do cálculo do progresso geral).

## 12.5 Ciclo de acesso de um usuário (administrador)

**Criar usuário** (já ativo) → trabalha → **Desativar** quando sair → **Ativar** se voltar. Usuário criado fora do sistema chega **inativo** até ser ativado.

---

# 13. STATUS E SITUAÇÕES

## Status do atendimento

| Status | Significado | Próxima ação |
|---|---|---|
| **Aberto** | Atendimento recém-criado, ainda sem registros de trabalho | Registrar o que foi feito (passa a Em andamento) |
| **Em andamento** | Está sendo trabalhado | Registrar, esperar alguém ou resolver |
| **Aguardando cliente** | Depende de uma resposta ou ação do cliente | Cobrar o cliente; voltar para Em andamento quando responder |
| **Aguardando terceiro** | Depende de fornecedor ou parceiro | Cobrar o terceiro |
| **Agendado** | Retorno marcado para depois (definido manualmente) | Atender na data |
| **Resolvido** | Concluído, com solução registrada | Nenhuma (a interface não permite reabrir) |
| **Cancelado** | Encerrado sem solução | Nenhuma |

Os status **Aberto**, **Em andamento**, **Aguardando cliente**, **Aguardando terceiro** e **Agendado** são considerados **"em aberto"**. O status **Agendado** não é aplicado automaticamente ao criar um evento na agenda: precisa ser escolhido em **Situação**.

## Prioridade

| Prioridade | Uso |
|---|---|
| Baixa | Sem urgência |
| Média | Padrão |
| Alta | Atenção antes dos demais |
| Urgente | Mais crítico (selo vermelho) |

## Status da pendência

| Status | Significado | Próxima ação |
|---|---|---|
| **Aberta** | Registrada, não iniciada | **Iniciar** ou **Concluir** |
| **Em andamento** | Em tratamento | **Concluir** |
| **Concluída** | Resolvida (com resultado) | Nenhuma |
| **Cancelada** | Não será feita | Nenhuma |

## Status do evento da agenda

| Status | Significado | Próxima ação |
|---|---|---|
| **Agendado** | Marcado e pendente | Marcar como realizado, remarcar ou cancelar |
| **Confirmado** | Existe no sistema, mas **a interface analisada não oferece ação para atribuí-lo** | — |
| **Realizado** | Aconteceu | Nenhuma |
| **Remarcado** | Substituído por outro evento | Acompanhar o novo |
| **Cancelado** | Não acontecerá | Nenhuma |

## Status do tópico da consultoria

| Status | Significado | Próxima ação |
|---|---|---|
| **Pendente** | Ainda não iniciado | Iniciar o trabalho |
| **Em andamento** | Em execução | Atualizar o progresso e comentar |
| **Concluído** | Finalizado (progresso 100%) | Nenhuma |
| **Cancelado** | Não será feito | Nenhuma |

## Status do cliente e do contrato

- **Cliente:** Ativo, Prospect, Inativo.
- **Contrato:** Avulso, Mensal, Pacote de horas.

---

# 14. NOTIFICAÇÕES E MENSAGENS

O sistema **não envia notificações** por e-mail, celular ou push (exceto o e-mail de recuperação de senha). As mensagens abaixo aparecem na própria tela.

## Mensagens de confirmação e informação

| Mensagem | Significado | O que fazer |
|---|---|---|
| "Contato adicionado." / "Contato atualizado." (aviso no canto) | O contato foi salvo | Nada |
| "Salvo." | Perfil salvo em Configurações → Conta | Nada |
| "Se este e-mail estiver cadastrado, enviamos um link…" | Pedido de recuperação aceito (a mensagem é igual existindo ou não a conta) | Conferir o e-mail e o spam |
| Selo **Copiada** | A senha temporária foi copiada | Colar onde for repassar |
| "Nenhum atendimento ainda", "Nenhum cliente cadastrado", "Nenhum sistema cadastrado..." | Não há dados | Cadastrar o primeiro registro, se for o caso |
| "Nada agendado para os próximos dias." | Sem compromissos nos próximos 30 dias | — |
| "Não encontrado" / "Página não encontrada" | O registro ou o endereço não existe, ou você não tem acesso | Voltar ao início |
| "Algo deu errado" + **Código do erro** | Erro inesperado | Tentar de novo; se persistir, informar o código (capítulo 22) |

## Mensagens de aviso na tela de atendimento

| Mensagem | Significado |
|---|---|
| Faixa "**Aguardando:** ..." | O atendimento está esperando cliente ou terceiro e diz o quê e desde quando |
| "Somente consulta" (selo) | Seu perfil só permite consultar |

As mensagens de erro de preenchimento estão no capítulo 15.

---

# 15. PROBLEMAS COMUNS E SOLUÇÕES

### Não consigo entrar ("E-mail ou senha inválidos")

**Possível causa:** e-mail ou senha digitados errado; conta inexistente.

**Como resolver:**
1. Confira o e-mail e a senha (atenção a letras maiúsculas e espaços).
2. Use **Esqueci minha senha** (8.2).
3. Se ainda não funcionar, procure o administrador.

**Quando procurar o administrador:** se a recuperação não chegar ou a conta puder estar desativada.

### "Esta conta está desativada ou aguardando liberação"

**Possível causa:** seu acesso foi desativado ou ainda não foi ativado.

**Como resolver:** peça ao administrador para ativar sua conta.

### O link de recuperação não funciona ("Esse link não é mais válido…")

**Possível causa:** o link expirou, já foi usado ou foi aberto em outro navegador ou aparelho.

**Como resolver:**
1. Peça um novo link em **Esqueci minha senha**.
2. Abra o e-mail e clique no link **no mesmo navegador** do pedido.

### "Muitos pedidos em pouco tempo"

**Possível causa:** limite de e-mails de recuperação enviados.

**Como resolver:** aguarde alguns minutos e peça de novo.

### Não aparece o botão para criar ou editar

**Possível causa:** seu perfil é **Visualizador** (aparece o selo **Somente consulta**).

**Como resolver:** peça ao administrador para alterar seu perfil, se necessário.

### Não consigo resolver o atendimento ("Registre como o problema foi resolvido")

**Possível causa:** a **Solução** está vazia ou tem menos de 5 letras.

**Como resolver:** escreva como o problema foi resolvido e clique em **Confirmar resolução**.

### Não consigo colocar "Aguardando" ("Diga o que está sendo aguardado")

**Possível causa:** o campo **Aguardando o quê** está vazio.

**Como resolver:** preencha com o que se espera e de quem.

### Não consigo reabrir um atendimento resolvido

**Possível causa:** a interface não oferece reabertura.

**Como resolver:** abra um novo atendimento e cite o número do anterior no assunto ou na descrição. Informe o administrador se a reabertura for necessária.

### "Já existe um cliente com este CPF/CNPJ" (ou código)

**Possível causa:** o cliente já está cadastrado (talvez como **Inativo**).

**Como resolver:** procure em **Clientes** (inclusive inativos) e, se necessário, reative mudando o **Status** para **Ativo**.

### "Este cliente já tem uma filial marcada como matriz" / "…um contato principal"

**Possível causa:** só pode existir uma matriz e um contato principal por cliente.

**Como resolver:** para contato, basta marcar o novo (o anterior deixa de ser principal). Para filial, o sistema não permite editar a existente; procure o administrador.

### O arquivo não sobe ("Tipo de arquivo não permitido", "O arquivo passa de 10 MB", "O conteúdo do arquivo não corresponde à extensão", "O arquivo está vazio")

**Possível causa:** tipo fora da lista, tamanho acima de 10 MB, extensão trocada ou arquivo vazio.

**Como resolver:** use um dos tipos aceitos (8.12), reduza ou compacte o arquivo e não renomeie a extensão manualmente.

### Preenchi tudo e a pendência foi recusada

**Possível causa:** falta cliente ou atendimento de origem, ou o responsável é **Terceiro** sem nome.

**Como resolver:** informe o cliente (ou crie a pendência pelo atendimento) e o nome do terceiro.

### Evento da agenda recusado ("O término não pode ser antes do início")

**Possível causa:** término anterior ao início.

**Como resolver:** corrija as datas.

### "Sem permissão para esta operação"

**Possível causa:** seu perfil não permite a ação.

**Como resolver:** peça ao administrador.

### A busca não acha o atendimento

**Possível causa:** o texto está no histórico e você usou a tela **Consultas**, que não pesquisa o histórico; ou o termo tem menos de 3 letras; ou há filtros aplicados.

**Como resolver:**
1. Use a busca da lista de **Atendimentos**, que alcança o histórico.
2. Use 3 letras ou mais.
3. Confira os filtros e use **Todos os status** (a lista de Atendimentos abre em **Em aberto**).

### Minhas buscas salvas sumiram

**Possível causa:** elas ficam gravadas no navegador; trocar de navegador ou computador, ou limpar os dados do navegador, apaga.

**Como resolver:** salve de novo (até 10).

### Apareceu "Algo deu errado"

**Possível causa:** erro inesperado.

**Como resolver:**
1. Clique em **Tentar de novo**.
2. Se persistir, clique em **Ir para o início** e refaça a ação.
3. Anote o **Código do erro** exibido.

**Quando procurar o administrador:** sempre que o erro se repetir (capítulo 22).

---

# 16. PERGUNTAS FREQUENTES (FAQ)

### Como faço para abrir um atendimento?
Clique em **Novo atendimento**, escolha o cliente, escreva o assunto e clique em **Abrir atendimento** (8.10).

### Por que o assunto fica em letras maiúsculas?
É uma regra do sistema: o assunto é sempre gravado em maiúsculas, ao criar e ao editar.

### Por que a lista de Atendimentos só mostra alguns?
Ao abrir pelo menu, ela vem filtrada em **Em aberto**. Escolha **Todos os status** para ver tudo.

### Como anexo um print?
Copie a imagem e use **Ctrl+V** na tela do atendimento, ou na caixa de registro para o print ficar dentro do registro (8.12).

### Posso editar ou apagar um registro do histórico?
Não. O histórico é permanente. Se errar, registre uma correção.

### Posso excluir um atendimento?
Não existe exclusão. Para encerrar sem solução, use o status **Cancelado**.

### Posso reabrir um atendimento resolvido?
A interface não oferece essa ação.

### O que acontece quando "excluo" um cliente?
Ele fica **Inativo**: sai das listas e deixa de aparecer para novos atendimentos, mas o histórico é mantido. Reative mudando o **Status** para **Ativo**.

### Quem pode criar usuários?
Somente o **Owner**, em **Configurações → Equipe**.

### Por que não vejo as abas Equipe e Auditoria?
Elas são exclusivas do **Owner**.

### Por que meu usuário novo não consegue entrar?
Usuários criados fora da tela **Equipe** ficam **inativos** até o Owner clicar em **Ativar**.

### O sistema me avisa quando um compromisso está chegando?
Não. O campo de lembrete é gravado, mas o sistema não envia aviso. No Dashboard, compromissos de hoje com a hora vencida mostram o selo **Atrasado**.

### O SLA da subcategoria gera alertas?
Não. É apenas um dado de cadastro.

### Qual a diferença entre Consultas e a busca de Atendimentos?
A busca da lista de **Atendimentos** alcança também o texto dos registros do histórico. **Consultas** oferece mais filtros (tipo, sistema, datas), busca salva e exportação, mas não pesquisa o histórico.

### O que são "Casos parecidos"?
Uma busca nos atendimentos **resolvidos** para reaproveitar soluções.

### Meus relatórios mostram menos atendimentos do que esperava. Por quê?
O relatório considera os atendimentos pela **data de abertura** no período escolhido. Com mais de mil atendimentos, os números podem sair incompletos; use períodos menores.

### Como mudo minha senha?
**Configurações → Conta → Senha** (8.25), ou **Esqueci minha senha** se não souber a atual.

### O cliente consegue acessar o sistema?
Não. O sistema é de uso interno.

---

# 17. BOAS PRÁTICAS E LIMITAÇÕES ATUAIS

## Boas práticas

- **Registre enquanto atende.** Notas curtas e frequentes valem mais do que um resumo no fim.
- **Escreva a solução pensando em quem vai lê-la depois.** Ela alimenta Consultas e Casos parecidos.
- **Informe sempre o que se aguarda** ao colocar um atendimento em espera: é isso que permite cobrar.
- **Informe os minutos** nos registros; eles alimentam o tempo total e os relatórios.
- **Use pendências e agenda** para tudo que depende de você voltar a falar com alguém.
- **Confira os dados antes de salvar.** Registros do histórico e comentários não podem ser editados.
- **Cancelar pendência e cancelar evento não pedem confirmação.** Confirme antes de clicar.
- **Não compartilhe sua senha** e encerre a sessão em computadores de uso comum (**Sair**).
- **Troque a senha temporária** no primeiro acesso.
- **Mantenha cadastros atualizados:** contatos corretos facilitam o campo "Quem falou".

## Limitações atuais do sistema

- Não é possível **reabrir** atendimento resolvido ou cancelado, nem **excluir** atendimento.
- **Filiais, sistemas instalados, sistemas do catálogo, categorias e subcategorias** não podem ser editados pela interface (sistemas instalados podem ser removidos e recriados).
- **Remover** um sistema do cliente é definitivo.
- O **lembrete** da agenda não gera aviso, e o **SLA** não gera alerta.
- O sistema **não recebe** chamados por e-mail, WhatsApp ou portal: o registro é feito por quem opera o sistema.
- Buscas salvas ficam no navegador.
- O **número** do atendimento (AT-AAAA-NNNNN) segue uma sequência contínua e não reinicia a cada ano.

---

# 18. ADMINISTRAÇÃO DO SISTEMA

> **Capítulo exclusivo do perfil Owner (Administrador).** As funções abaixo ficam em **Configurações**, nas abas **Equipe** e **Auditoria**, que só o Owner vê.

## 18.1 Equipe

**Como acessar:** **Configurações → Equipe.**

**[IMAGEM DA TELA: Equipe]**

A tela lista os usuários com **Usuário** (nome e e-mail), **Papel**, **Desde** (data de entrada) e **Gerenciar**. Sua própria linha mostra **Você**, sem controles.

### Como criar um usuário

**Objetivo:** dar acesso a uma pessoa nova.

1. Em **Configurações → Equipe**, localize o cartão **Novo usuário**.
2. Preencha **Nome** e **E-mail** e escolha o **Papel**: **Técnico** ou **Visualizador**.
3. Clique em **Criar usuário**.
4. O sistema mostra o e-mail criado e uma **senha temporária**. Clique em **Copiar** e repasse à pessoa por um canal seguro (a senha **aparece uma única vez**, não é enviada por e-mail e some ao sair da página).
5. Peça que a pessoa troque a senha em **Configurações → Conta → Senha** no primeiro acesso.

**Resultado esperado:** o usuário aparece na lista, já **ativo**, e pode entrar.

**Atenção:**
- O papel **Owner** não é escolhido na criação: crie como Técnico e promova depois, na lista.
- Se o e-mail já existe: "Já existe um usuário com este e-mail."
- Se o cartão **Novo usuário** não aparece e há um aviso de que criar usuário pelo sistema não está disponível ou de que a chave de administrador não é uma chave secreta, a configuração do servidor precisa ser ajustada pela equipe técnica. O aviso descreve o que falta.
- Usuários criados **fora** desta tela chegam como **Técnico inativo**.

### Como alterar o papel

1. Na linha do usuário, em **Gerenciar**, escolha o novo **Papel**. A alteração é salva **assim que você escolhe**.

**Atenção:** você não pode alterar o próprio papel. A organização precisa manter **ao menos um Owner ativo**.

### Como ativar ou desativar um usuário

1. Na linha do usuário, clique em **Desativar** (ou **Ativar**, se estiver inativo).

**Resultado esperado:** o usuário desativado **não consegue entrar** nem ver dados. Se estava logado, é desconectado ao navegar. Ao ativar, o acesso volta.

**Atenção:** você não pode desativar a própria conta. O histórico do usuário é mantido. Usuários não são excluídos.

## 18.2 Papéis e permissões

Os três papéis e suas permissões estão no capítulo 4. Em resumo:

| Papel | Escreve | Gerencia equipe e vê auditoria |
|---|---|---|
| Owner | Sim | Sim |
| Técnico | Sim | Não |
| Visualizador | Não | Não |

## 18.3 Auditoria

**Como acessar:** **Configurações → Auditoria.**

**[IMAGEM DA TELA: Auditoria]**

Mostra o registro de quem mudou o quê, em colunas **Quando**, **Quem**, **O quê** e **Campos alterados**, com filtro por tipo de registro e 50 itens por página.

**Registros auditados:** Clientes, Atendimentos, Pendências, Usuários, Sistemas do cliente e Tópicos de consultoria.

**Atenção:** o histórico dos atendimentos (as notas) não é duplicado na auditoria, porque já é permanente por si só. Contatos, filiais, agenda, categorias e anexos **não** entram na auditoria.

## 18.4 Cadastros de apoio

Sistemas, categorias e subcategorias são mantidos em **Configurações → Sistemas** e **Categorias** (capítulo 9). Também podem ser alterados por Técnicos.

## 18.5 Cuidados do administrador

- Confirme se há usuários desconhecidos na lista **Equipe** e deixe-os **inativos**.
- Desative quem deixou a equipe, em vez de compartilhar senhas.
- Mantenha ao menos dois Owners ativos se a operação não puder parar.
- Orientações técnicas (endereço do sistema, e-mail de recuperação, banco de dados) estão **fora do escopo deste manual**: consulte a equipe técnica.

---

# 19. INTEGRAÇÕES

Do ponto de vista do usuário, o sistema se apoia em **um único provedor externo**, que cuida de três coisas:

| O que | Para que serve | Quando acontece | O que o usuário precisa fazer |
|---|---|---|---|
| **Login e sessão** | Verifica e-mail e senha e mantém você logado | Em todo acesso | Nada além de entrar |
| **E-mail de recuperação de senha** | Envia o link para criar nova senha | Quando você pede em **Esqueci minha senha** | Abrir o link no mesmo navegador |
| **Armazenamento de anexos** | Guarda com segurança os arquivos e prints | Ao anexar e ao abrir um anexo | Nada. Os links de visualização expiram em 1 hora; recarregue a página para renovar |

**Não identificado no sistema:** integração com WhatsApp, e-mail de entrada de chamados, ERP, sistemas de pagamento, inteligência artificial ou outros sistemas. Os campos "WhatsApp" e "E-mail" servem apenas para **classificar** o canal de um atendimento.

---

# 20. AUTOMAÇÕES

**O que o sistema faz sozinho, sem você precisar agir:**

| Quando | O que acontece automaticamente |
|---|---|
| Você abre um atendimento | Gera o **número** (AT-AAAA-NNNNN) e cria o registro "Atendimento aberto" no histórico |
| Você muda o status | Grava no histórico "Status: X → Y", com autor e data |
| Você registra a primeira nota de trabalho | Muda o status de **Aberto** para **Em andamento** |
| Você registra minutos | Soma o tempo no total do atendimento |
| Você resolve ou cancela | Preenche a **data de fechamento**; se voltar a outro status, limpa a data |
| Você marca um tópico como **Concluído** | Leva o progresso a **100%** |
| Você remarca um evento | Cria um evento novo com a nova data e marca o antigo como **Remarcado** |
| Você marca um evento como realizado e pede para registrar | Grava o resumo no histórico do atendimento vinculado |
| Você marca um contato como principal | Tira a marca do contato principal anterior |
| O primeiro usuário do sistema é criado | Cria a organização, torna esse usuário **Owner** e carrega o catálogo inicial (7 categorias e 28 subcategorias) |
| Um usuário novo é criado fora da tela **Equipe** | Ele nasce **Técnico inativo**, até o Owner ativar |
| Há qualquer alteração em clientes, atendimentos, pendências, usuários, sistemas do cliente ou tópicos | Registra na **Auditoria** quem, quando e o quê |
| Você recarrega ou abre uma tela | Calcula o **Dashboard** e os contadores na hora |

**O sistema NÃO faz automaticamente:** enviar lembretes ou notificações, alertar atrasos de SLA, enviar relatórios por e-mail, fazer backup visível ao usuário ou importar chamados de outros canais.

---

# 21. GLOSSÁRIO

**Anexo:** arquivo ou print guardado em um atendimento ou tópico de consultoria.

**Atendimento:** registro de um chamado de suporte, do pedido à solução. Tem número próprio (AT-AAAA-NNNNN).

**Aguardando (cliente ou terceiro):** situação em que o atendimento depende de uma resposta ou ação de outra parte.

**Auditoria:** registro de quem alterou o quê e quando. Só o Owner consulta.

**Canal:** meio pelo qual o cliente falou (telefone, WhatsApp, e-mail, presencial, acesso remoto, chat ou interno). Serve para classificar.

**Casos parecidos:** busca que procura atendimentos resolvidos semelhantes a um problema.

**Categoria / Subcategoria:** classificação do atendimento (por exemplo, Fiscal → SPED).

**Causa raiz:** o motivo de o problema ter acontecido.

**Cliente:** empresa atendida.

**Consultoria / Tópico:** projeto de consultoria dividido em tópicos, cada um com status, progresso, comentários e anexos.

**Contato principal:** a pessoa de referência de um cliente; só há uma por cliente.

**Dashboard:** tela inicial com indicadores e listas de acompanhamento.

**Evento (agenda):** compromisso com data e hora, como retorno, visita, reunião, tarefa, lembrete ou manutenção preventiva.

**Faturável:** marca que indica que o atendimento pode ser cobrado do cliente. É uma marcação; o sistema não emite cobrança.

**Filial / Matriz:** unidade de um cliente / unidade principal.

**Histórico (linha do tempo):** sequência permanente de registros de um atendimento.

**Inativo:** situação de cliente, contato ou usuário que não está mais em uso, sem ser apagado.

**Owner (Administrador):** perfil com acesso total, inclusive Equipe e Auditoria.

**Pendência:** algo que ficou em aberto, com responsável e prazo opcional.

**Prioridade:** grau de urgência: Baixa, Média, Alta ou Urgente.

**Progresso:** percentual (0 a 100%) de andamento de um tópico de consultoria.

**Registro / Nota:** cada anotação feita no histórico do atendimento.

**SLA:** prazo de atendimento, em horas, que pode ser informado na subcategoria. Hoje é apenas informativo.

**Sistema:** software que você atende (ERP, fiscal, próprio, infraestrutura ou outro). **Sistema instalado** é o vínculo de um sistema com um cliente.

**Solução:** descrição de como o problema foi resolvido; obrigatória para resolver.

**Status:** situação atual de um atendimento, pendência, evento ou tópico.

**Técnico:** perfil que opera o sistema no dia a dia.

**Tipo (do atendimento):** natureza do chamado: Dúvida, Erro, Treinamento, Implantação, Melhoria, Manutenção ou Consultoria.

**Visualizador:** perfil que só consulta.

---

# 22. SUPORTE

## Canais de suporte

**Informação não identificada na análise do sistema.** O projeto não define e-mail, telefone ou página de suporte. Em caso de dúvida ou problema, procure o **administrador do sistema (Owner)** da sua organização.

## Quando procurar suporte

- O mesmo erro se repete depois de tentar de novo.
- Aparece "Algo deu errado" com um código.
- Você não consegue entrar mesmo após recuperar a senha.
- Falta uma permissão de que você precisa para o seu trabalho.
- Você precisa de algo que o sistema não oferece (por exemplo, reabrir um atendimento).

## Que informações fornecer

1. **O que você estava tentando fazer** (por exemplo, "resolver o atendimento AT-2026-00020").
2. **O que aconteceu** e a **mensagem exata** exibida.
3. **O Código do erro**, quando houver.
4. **Quando** aconteceu (data e hora aproximada).
5. **Seu perfil** (Owner, Técnico ou Visualizador) e o **e-mail** da sua conta.
6. **Em que tela** estava (o endereço da barra do navegador ajuda).
7. **O navegador** e se é computador ou celular.

## Como descrever o problema

Conte em ordem: onde estava, o que clicou, o que esperava e o que viu. Diga se já aconteceu antes e se acontece sempre ou só às vezes.

## Evidências que ajudam

- **Print da tela inteira**, incluindo a mensagem de erro e o código.
- O **número do atendimento**, cliente ou tópico envolvido.
- Se for possível, um segundo print do passo anterior ao erro.

**Atenção:** **nunca envie sua senha** em uma solicitação de suporte.

---

# 23. CONTROLE DE VERSÃO DO MANUAL

| Versão | Data | Descrição |
|---|---|---|
| 1.0 | 04/10/2026 | Primeira versão |

---

# INFORMAÇÕES QUE PRECISAM SER CONFIRMADAS

| Situação | Item |
|---|---|
| 🔴 Necessário confirmar | **Endereço de produção do sistema** (capítulo 3.1) |
| 🔴 Necessário confirmar | **Canal oficial de suporte** (e-mail, telefone ou outro) (capítulo 22) |
| 🔴 Necessário confirmar | Se o **cadastro público de usuários está desligado** no serviço de login (configuração do serviço, não do código). O sistema se protege (usuário novo nasce inativo), mas a confirmação é externa |
| 🔴 Necessário confirmar | Se as **atualizações do banco de dados foram aplicadas** em produção (progresso da Consultoria e bloqueio de usuários inativos dependem delas) |
| 🔴 Necessário confirmar | **Política de backup e retenção** de dados (**Informação não identificada na análise do sistema.**) |
| 🟡 Recomendável confirmar | **Remetente, aparência e idioma do e-mail de recuperação de senha** (dependem da configuração do serviço de login) |
| 🟡 Recomendável confirmar | Se haverá **mais de um projeto de consultoria** (hoje a tela mostra um único projeto) |
| 🟡 Recomendável confirmar | Se **Agendado** (atendimento) e **Confirmado** (evento) deveriam ter ação própria na interface; hoje não têm automação/ação |
| 🟡 Recomendável confirmar | Se a **reabertura** de atendimento e a **edição** de filiais, sistemas e categorias serão oferecidas |
| 🟡 Recomendável confirmar | **Imagens reais das telas** para substituir os marcadores [IMAGEM DA TELA] |
| 🟡 Recomendável confirmar | **Nome da organização** para a capa (consta "Masterbit" na identidade visual) |
| 🟢 Confirmado pelo projeto | Perfis Owner, Técnico e Visualizador e suas permissões (capítulo 4) |
| 🟢 Confirmado pelo projeto | Campos, regras de validação e mensagens dos cadastros (capítulos 8, 9 e 15) |
| 🟢 Confirmado pelo projeto | Status de atendimento, pendência, evento e tópico (capítulo 13) |
| 🟢 Confirmado pelo projeto | Automações do atendimento e da auditoria (capítulo 20) |
| 🟢 Confirmado pelo projeto | Ausência de notificações, integrações de canais e alertas de SLA (capítulos 14, 19 e 20) |
| 🟢 Confirmado pelo projeto | Fluxo de recuperação de senha e regras de acesso (capítulo 3 e 8.2) |

---

# RESUMO DO MANUAL

**O que o sistema faz:** o Masterbit Suport registra e acompanha atendimentos de suporte técnico, guarda a solução de cada um como memória pesquisável, controla pendências, retornos e horas, e acompanha projetos de consultoria por tópico.

**Quem utiliza:** profissionais e pequenas equipes de suporte. Há três perfis: **Owner** (administrador), **Técnico** (opera) e **Visualizador** (só consulta). O cliente final não acessa.

**Principais módulos:** Dashboard, Atendimentos, Pendências, Agenda, Consultoria Citel, Clientes, Consultas, Casos parecidos, Relatórios e Configurações (incluindo Equipe e Auditoria para o Owner).

**Principais processos:** abrir atendimento → registrar o que foi feito → aguardar/agendar/criar pendência quando preciso → resolver com solução → reaproveitar a solução em buscas; e, para o administrador, criar e gerir usuários.

**Principais benefícios:** nada se perde (histórico permanente), nada se esquece (pendências, agenda e "aguardando retorno" visíveis no Dashboard), o conhecimento se acumula (Consultas e Casos parecidos) e o acesso é controlado por perfil.
