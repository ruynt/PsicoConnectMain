# PsicoConnect

Aplicação web desenvolvida como Trabalho de Conclusão de Curso em Ciência da Computação, com o objetivo de apoiar a prática psicológica por meio da centralização de funcionalidades administrativas, comunicacionais e organizacionais em uma plataforma integrada.

O PsicoConnect reúne recursos para psicólogos, pacientes e administradores, incluindo cadastro, autenticação, validação profissional, agenda, consultas, integração com Google Calendar, mensagens internas, tarefas terapêuticas, materiais psicoeducacionais, check-in pré-sessão, controle de pagamentos e assistente virtual com inteligência artificial.

> O PsicoConnect é uma ferramenta de apoio à prática profissional. A aplicação e seus recursos de inteligência artificial não realizam diagnóstico, não indicam tratamento individualizado e não substituem a atuação de um psicólogo.

## Funcionalidades principais

### Paciente

* Cadastro e autenticação.
* Confirmação de e-mail.
* Visualização de consultas agendadas.
* Confirmação de presença.
* Solicitação de cancelamento de consulta.
* Visualização de psicólogos vinculados.
* Mensagens internas com o psicólogo.
* Acesso a materiais psicoeducacionais.
* Acompanhamento de tarefas terapêuticas.
* Check-in pré-sessão.
* Edição de perfil e foto.

### Psicólogo

* Cadastro com dados profissionais e CRP.
* Tela de aguardando verificação profissional.
* Reenvio de dados de CRP quando rejeitado.
* Dashboard profissional.
* Gestão de pacientes vinculados.
* Visualização de perfil do paciente.
* Mensagens internas.
* Envio de materiais psicoeducacionais.
* Criação e acompanhamento de tarefas terapêuticas.
* Registro de notas de sessão.
* Visualização de check-ins pré-sessão.
* Agenda de consultas.
* Integração opcional com Google Calendar.
* Criação, confirmação, cancelamento e lembretes de consultas.
* Controle básico de pagamentos.
* Uso do PsicoBot como apoio informativo e organizacional.

### Administrador

* Gerenciamento de usuários.
* Análise de cadastros profissionais.
* Aprovação ou rejeição de CRP.
* Envio automático de e-mails de aprovação/rejeição.
* Exclusão controlada de usuários e dependências relacionadas.

## Tecnologias utilizadas

* Next.js
* React
* TypeScript
* Prisma
* PostgreSQL
* NextAuth
* Resend
* Google Calendar API
* Cloudinary
* Upstash Redis
* OpenAI / Backend RAG do PsicoBot
* Vercel

## Arquitetura geral

O projeto foi desenvolvido como uma aplicação web full stack utilizando o App Router do Next.js. As rotas de API do próprio Next.js são responsáveis pela comunicação entre interface, banco de dados e serviços externos.

A persistência dos dados é realizada em PostgreSQL com Prisma ORM. A autenticação utiliza NextAuth com login por credenciais. O sistema diferencia usuários por papéis:

* `PATIENT`
* `PSYCHOLOGIST`
* `ADMIN`

Cada perfil possui regras próprias de acesso, navegação e permissões.

## Segurança e privacidade

O PsicoConnect implementa medidas de segurança voltadas à proteção dos dados dos usuários, especialmente por lidar com informações relacionadas à prática psicológica.

Medidas implementadas:

* Hash de senhas.
* Verificação de e-mail.
* Tokens de redefinição de senha.
* Controle de sessão com NextAuth.
* Separação de permissões por perfil.
* Proteção de rotas por middleware.
* Validação de vínculo entre psicólogo e paciente.
* Paciente acessa apenas os próprios dados.
* Psicólogo acessa apenas pacientes vinculados.
* Administrador acessa apenas rotas administrativas.
* Rate limiting em rotas sensíveis.
* Proteção contra abuso em login, cadastro, recuperação de senha, upload e IA.
* Validação reforçada de upload de imagem.
* Aceitação apenas de JPG, PNG e WEBP.
* Verificação da assinatura real do arquivo enviado.
* Limitação de tamanho de upload.
* Controle de acesso nas APIs.
* Cron de lembretes protegido por segredo.
* Páginas públicas de Termos de Uso, Política de Privacidade e Exclusão de Dados.

## Integração com Google Calendar

O PsicoConnect permite que psicólogos conectem voluntariamente sua agenda Google à plataforma. A integração é utilizada para apoiar a organização de consultas e eventos relacionados aos atendimentos.

A integração utiliza OAuth e o escopo:

```txt
https://www.googleapis.com/auth/calendar.events
```

Esse escopo foi escolhido por ser mais restrito do que o acesso amplo ao calendário inteiro. A integração pode ser desconectada pelo usuário.

## Inteligência Artificial

O PsicoBot é o assistente virtual da plataforma. Ele foi desenvolvido para oferecer apoio informativo, organizacional e psicoeducacional.

O assistente pode auxiliar em:

* Dúvidas sobre uso da plataforma.
* Organização de informações.
* Apoio textual.
* Informações psicoeducacionais gerais.
* Geração de resumos a partir de dados previamente registrados pelo psicólogo.

Limitações da IA:

* Não realiza diagnóstico.
* Não substitui atendimento psicológico.
* Não indica tratamento individualizado.
* Não toma decisões clínicas.
* Não deve ser usado como única fonte para condutas profissionais.

## Páginas legais

O projeto possui páginas públicas voltadas à transparência e conformidade:

```txt
/politica-de-privacidade
/termos-de-uso
/exclusao-de-dados
/legal
```

Essas páginas informam o usuário sobre tratamento de dados pessoais, dados sensíveis, uso de IA, integração com Google Calendar e solicitação de exclusão de dados.

## Variáveis de ambiente

Crie um arquivo `.env` com base nas variáveis necessárias do projeto.

Exemplo:

```env
DATABASE_URL=

NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_BASE_URL=
APP_URL=

RESEND_API_KEY=
EMAIL_FROM=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

PSICOBOT_RAG_API_URL=

CRON_SECRET=
```

Nunca envie o arquivo `.env` para o GitHub.

## Instalação local

Clone o repositório:

```bash
git clone <url-do-repositorio>
cd <nome-do-projeto>
```

Instale as dependências:

```bash
npm install
```

Configure o banco de dados:

```bash
npx prisma generate
npx prisma migrate dev
```

Execute o projeto:

```bash
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

## Scripts disponíveis

```bash
npm run dev
```

Executa o projeto em ambiente de desenvolvimento.

```bash
npm run build
```

Gera a versão de produção.

```bash
npm run start
```

Executa a versão de produção.

```bash
npm run lint
```

Executa a análise de lint.

## Deploy

O projeto principal foi preparado para deploy na Vercel.

Antes do deploy, configure as variáveis de ambiente no painel da Vercel:

```txt
Project Settings → Environment Variables
```

Após alterar variáveis, realize um novo deploy.

## Estrutura resumida

```txt
src/
  app/
    api/
    (public)/
    dashboard/
    agenda/
    pacientes/
    perfil/
  components/
  lib/
prisma/
public/
middleware.ts
```

## Autores

Pedro Henrique Leal Vieira
Ruy Gerôncio da Silva Neto

Orientador: Maelso Bruno Pacheco Nunes Pereira

## Licença

Este projeto foi desenvolvido para fins acadêmicos como Trabalho de Conclusão de Curso.
