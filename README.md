# ⚡ SkillNapse APP

> **Interface Web Moderna, Reativa e Hiper-Personalizada para Gestão de Estudos e Aprendizado com Inteligência Artificial**  
> Criado por **Murilo Henrique (Hokyozu)**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_%2F_6.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Lucide Icons](https://img.shields.io/badge/Lucide-Icons-F56565?style=for-the-badge&logo=lucide&logoColor=white)](https://lucide.dev/)
[![Mobile Ready](https://img.shields.io/badge/Mobile-Fully_Responsive-48BB78?style=for-the-badge&logo=android&logoColor=white)](#-experiência-mobile-first-e-responsividade)

---

## 📌 Sumário

1. [Visão Geral](#-visão-geral)
2. [Módulos e Funcionalidades](#-módulos-e-funcionalidades)
3. [Experiência Mobile-First e Responsividade](#-experiência-mobile-first-e-responsividade)
4. [Arquitetura Frontend](#-arquitetura-frontend)
5. [Stack Tecnológica](#-stack-tecnológica)
6. [Instalação e Execução](#-instalação-e-execução)
7. [Variáveis de Ambiente (.env)](#-variáveis-de-ambiente-env)
8. [Estrutura de Diretórios](#-estrutura-de-diretórios)
9. [Comunicação com a API e Resiliência](#-comunicação-com-a-api-e-resiliência)
10. [Licença e Autoria](#-licença-e-autoria)

---

## 🎯 Visão Geral

O **SkillNapse APP** é a interface do estudante para o ecossistema SkillNapse. Construída como uma *Single Page Application (SPA)* ultra-responsiva, a plataforma combina um design sofisticado (com suporte a Dark e Light Mode) com ferramentas integradas de alta performance para estudos, vestibulares e concursos públicos.

A aplicação se conecta diretamente à [SkillNapse API](https://github.com/Hosz/SkillNapse-API), oferecendo uma experiência contínua e sem atritos para mapear matérias, executar ciclos de foco com Pomodoro, resolver simulados calibrados por IA, praticar flashcards espaçados e receber correções cirúrgicas de redações dissertativas.

---

## 🚀 Módulos e Funcionalidades

### 🌳 1. Árvore de Conhecimento (*Study Tree*)
- Visualização hierárquica por disciplinas, tópicos e subtópicos recursivos com suporte a títulos longos sem corte.
- Cálculo e exibição visual de **peso de edital** e **nível de proficiência** (Iniciante, Básico, Intermediário, Avançado e Mestre).
- Menu de ações rápidas (`...`):
  - *Estudar com Pomodoro*
  - *Quadro de Rascunho (Canvas)*
  - *Praticar Simulado do Tópico*
  - *Flashcards do Tópico (SM-2)*
  - *Adicionar Subtópicos, Edição e Exclusão*.

### 🗂️ 2. Workpad Multiuso (Fichário Lateral & Gaveta Mobile)
Painel retrátil contextual que acompanha o tópico de estudo ativo:
- **Pomodoro Tab**: Temporizador manual de alta precisão com ciclos de foco e descanso, contabilização rigorosa de horas líquidas e sincronização automática com a gamificação diária.
- **Canvas Tab (Lousa Livre)**: Quadro de rascunho vetorial livre com suporte completo a **Pointer Events** para escrita e desenho com toque ou canetas stylus em smartphones e tablets.
- **Questões Tab**: Gerador e solucionador de questões de múltipla escolha focadas diretamente no tópico selecionado.
- **Flashcards Tab**: Acesso imediato aos cards vinculados para revisão sem sair do contexto do tópico.

### 📝 3. Simulados Adaptativos
- Realização de exames completos com cronômetro regressivo, navegação fluida entre questões e layout responsivo de 2 linhas otimizado para telas móveis.
- Geração instantânea de questões por IA calibradas para atacar as lacunas reais de aprendizagem do aluno.
- Relatório analítico pós-simulado com notas percentuais, gabarito detalhado e justificativa pedagógica para cada alternativa.

### 🃏 4. Flashcards com Repetição Espaçada (SRS / SM-2)
- Prática ativa baseada no algoritmo **SuperMemo SM-2**: classificação de facilidade da resposta (Errei, Difícil, Bom, Fácil) que ajusta dinamicamente a próxima data de revisão.
- Geração automática de baralhos completos a partir de tópicos com suporte a criação manual e exportação.

### ✍️ 5. Laboratório de Redação Inteligente
- Criação e escolha de temas dissertativos (oficiais ou temas manuais personalizados).
- Editor de texto integrado com contadores em tempo real de palavras, caracteres e linhas úteis.
- **Auditoria Textual Avançada por IA**: Correção analítica detalhada com notas de 0 a 1000 baseadas nas 5 competências oficiais (C1 a C5), apontando desvios gramaticais, conectivos interparágrafos, repertório sociocultural e detalhamento da proposta de intervenção.
- Histórico completo com possibilidade de revisão e exclusão de submissões antigas.

### 📅 6. Cronograma Híbrido (*Schedule View*)
- Grade semanal dinâmica com *timeblocking* granular (blocos de 30, 45, 60 ou 90 minutos).
- Suporte a *daily overrides* (imprevistos no dia a dia não corrompem a matriz semanal).
- Botão **"Estudar Agora"** que transporta o estudante diretamente para o tópico na árvore com o Pomodoro ativado.

### 📄 7. Leitor e Extrator de Editais (*Edital Parser*)
- Upload e leitura de editais em PDF.
- A IA extrai e decompõe os cargos e conteúdos programáticos em disciplinas e tópicos prontos para serem importados como um novo plano de estudos.

### 📊 8. Desempenho & Diagnóstico de Lacunas
- Matriz de proficiência por matéria com histórico percentual de acertos.
- **Área de Ação Imediata**: Diagnóstico inteligente de lacunas prioritárias que filtra e destaca apenas matérias e tópicos que já possuem histórico real de estudo e tentativas.

### 🔥 9. Gamificação & Hábitos
- Contador de ofensiva (*streaks*) de dias consecutivos de estudo.
- Meta diária de horas líquidas com barra de progresso em tempo real.
- Notificações de incentivo e perfil configurável do estudante.

---

## 📱 Experiência Mobile-First e Responsividade

O SkillNapse APP foi refinado para oferecer uma experiência de nível nativo em dispositivos móveis:
- **Seleção Não-Intrusiva**: Tocar em um tópico apenas o seleciona na árvore, permitindo leitura limpa e revelando uma **Pílula Flutuante** inferior com acesso rápido ao fichário.
- **Cabeçalho Adaptativo de Simulado**: Elementos distribuídos em 2 linhas (botão sair `[X]`, título com tooltip, temporizador `Clock` e botão de finalização) sem corte visual.
- **Sublinha Compacta de Badges**: Em telas menores (`< 640px`), o peso e a proficiência são alocados abaixo do título do tópico, reservando 100% da largura horizontal para a leitura do conteúdo.
- **Lousa Livre com Pointer Events**: Uso de `touch-none` e captura de ponteiro para prevenir que o scroll da página cancele os traços do usuário em telas touch.

---

## 🏗 Arquitetura Frontend

A base de código é estruturada em torno de convenções modernas de React e TypeScript:

```
src/
├── components/          # Componentes visuais organizados por módulos de negócio
│   ├── analytics/       # Telas de métricas, proficiência e lacunas
│   ├── auth/            # Telas de Login, Registro e recuperação
│   ├── common/          # Modais de confirmação, avisos de cotas e alertas reutilizáveis
│   ├── edital/          # Leitor de editais e upload de PDF
│   ├── essay/           # Laboratório de redação e temas
│   ├── flashcards/      # Sessão de estudo SRS e baralhos
│   ├── layout/          # Barra lateral (Sidebar), menu mobile e cabeçalhos
│   ├── profile/         # Modal de perfil e preferências do estudante
│   ├── schedule/        # Cronograma semanal e blocos de horário
│   ├── simulado/        # Visão e execução de simulados
│   ├── study-tree/      # Árvore de conhecimento (Planos, Matérias, Tópicos)
│   └── workpad/         # Fichário lateral retrátil (Pomodoro, Canvas, Questões, Cards)
│
├── context/             # React Contexts (ThemeContext dark/light, ToastContext)
├── services/            # Camada de comunicação com a API REST (Axios/Fetch abstraído)
├── types/               # Tipos e interfaces TypeScript compartilhados
├── App.tsx              # Ponto de entrada, roteamento interno e estado global
└── main.tsx             # Bootstrap da aplicação
```

---

## 🛠 Stack Tecnológica

- **Framework**: [React 19](https://react.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Linting & Qualidade**: ESLint com regras para React Hooks e TypeScript

---

## 💻 Instalação e Execução

### Pré-requisitos
- **Node.js 18+** (recomendado Node.js 20 LTS ou superior)
- Gerenciador de pacotes **npm**, **pnpm** ou **yarn**
- Instância da [SkillNapse-API](https://github.com/Hosz/SkillNapse-API) em execução (padrão em `http://localhost:8080`)

### 1. Clonar o Repositório
```bash
git clone https://github.com/Hosz/SkillNapse-APP.git
cd SkillNapse-APP
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto (caso a API não esteja na porta padrão `8080`):
```env
VITE_SERVER_ORIGIN=http://localhost:8080
```

### 4. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no seu navegador: **`http://localhost:5173`** (ou na porta indicada pelo Vite).

### 5. Compilar para Produção (Build)
```bash
npm run build
```
Os artefatos otimizados e minificados serão gerados no diretório `dist/`.

---

## ⚙️ Variáveis de Ambiente (.env)

| Variável | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `VITE_SERVER_ORIGIN` | `http://localhost:8080` | URL base do backend SkillNapse API |

---

## 🌐 Comunicação com a API e Resiliência

A camada de serviços (`src/services/api.ts`) implementa padrões avançados para garantir uma experiência sólida:
- **Renovação Transparente de Token (Refresh Token)**: Ao receber um status `401 Unauthorized`, a camada tenta renovar o token de acesso automaticamente via endpoint `/auth/refresh` sem desconectar o usuário.
- **Tratamento de Limites de IA (Rate Limit & 429)**: Dispara eventos globais interceptados pelo modal `AiQuotaExceededModal`, informando o estudante com elegância caso as cotas diárias de IA sejam atingidas.
- **Cancelamento com AbortController**: Integração com a API de cancelamento da SkillNapse-API, permitindo abortar requisições de geração de simulados ou correções de redação caso o usuário cancele a operação.

---

## 👨‍💻 Licença e Autoria

Desenvolvido com excelência por **Murilo Henrique Marques Bento Santos (Hokyozu)**.

Distribuído sob a licença open-source **MIT**. Consulte o arquivo de licença para mais informações.
