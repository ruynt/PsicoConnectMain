export type LegalBlock = {
  id: string;
  title: string;
  summary: string;
  content: {
    heading: string;
    paragraphs?: string[];
    items?: string[];
  }[];
};

export const LEGAL_VERSION = "2026-06";

export const legalBlocks: LegalBlock[] = [
  {
    id: "termos",
    title: "Termos de Uso",
    summary:
      "Regras gerais de acesso, responsabilidades dos usuários e limites da plataforma PsicoConnect.",
    content: [
      {
        heading: "1. Apresentação",
        paragraphs: [
          "O PsicoConnect é uma plataforma web destinada ao apoio da prática psicológica, oferecendo recursos digitais para organização de agenda, gestão de pacientes, consultas, mensagens, tarefas terapêuticas, materiais psicoeducativos, perfil profissional, integração com calendário externo, gestão operacional e uso de inteligência artificial.",
          "Ao criar uma conta ou utilizar a plataforma, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso, com a Política de Privacidade e com as demais condições aplicáveis ao funcionamento do sistema.",
        ],
      },
      {
        heading: "2. Finalidade da plataforma",
        paragraphs: [
          "O PsicoConnect tem como finalidade oferecer infraestrutura tecnológica para apoiar a comunicação, organização e gestão de atividades relacionadas à prática psicológica.",
          "A plataforma não presta serviços psicológicos diretamente, não realiza diagnóstico, não conduz psicoterapia, não substitui avaliação profissional e não se responsabiliza por decisões clínicas tomadas por psicólogos, pacientes ou terceiros.",
        ],
      },
      {
        heading: "3. Perfis e acessos autorizados",
        items: [
          "Psicólogo: profissional que utiliza a plataforma para organizar sua prática, acompanhar pacientes vinculados, gerenciar agenda, enviar mensagens, materiais, tarefas e utilizar recursos de apoio.",
          "Paciente: usuário que utiliza a plataforma para acompanhar consultas, acessar materiais, visualizar tarefas, trocar mensagens, consultar psicólogos vinculados e utilizar funcionalidades disponíveis.",
          "Pessoas autorizadas pela operação da plataforma: acessos restritos utilizados apenas quando necessário para fins técnicos, operacionais, de segurança, suporte, análise de cadastros profissionais ou cumprimento de obrigações legais.",
        ],
      },
      {
        heading: "4. Cadastro e segurança da conta",
        paragraphs: [
          "O usuário compromete-se a fornecer informações verdadeiras, completas e atualizadas durante o cadastro e durante o uso da plataforma.",
          "O usuário é responsável pela confidencialidade de sua senha e por todas as atividades realizadas em sua conta.",
        ],
        items: [
          "Não é permitido compartilhar credenciais de acesso com terceiros.",
          "Não é permitido utilizar dados falsos ou de terceiros sem autorização.",
          "A plataforma poderá solicitar verificação de e-mail, validação profissional ou análise operacional antes da liberação de determinadas funcionalidades.",
        ],
      },
      {
        heading: "5. Responsabilidades do psicólogo",
        paragraphs: [
          "O psicólogo permanece integralmente responsável por sua atuação técnica, ética e profissional, incluindo avaliação da adequação do uso de tecnologias digitais, sigilo profissional, condução dos atendimentos, tomada de decisões clínicas e cumprimento das normas aplicáveis à profissão.",
        ],
        items: [
          "Avaliar se o uso da plataforma é adequado ao caso concreto.",
          "Preservar o sigilo profissional e a confidencialidade das informações.",
          "Revisar criticamente qualquer conteúdo produzido com apoio de inteligência artificial.",
          "Não utilizar o PsicoBot como substituto de avaliação, diagnóstico, psicoterapia, laudo, parecer ou decisão clínica.",
          "Obter autorizações ou consentimentos necessários de pacientes ou responsáveis legais, quando aplicável.",
        ],
      },
      {
        heading: "6. Responsabilidades do paciente",
        paragraphs: [
          "O paciente deve utilizar a plataforma de maneira adequada, fornecendo informações verdadeiras e respeitando os limites dos recursos disponibilizados.",
        ],
        items: [
          "Manter seus dados atualizados.",
          "Utilizar mensagens e funcionalidades de forma respeitosa.",
          "Não compartilhar informações de terceiros sem autorização.",
          "Compreender que a plataforma não substitui atendimento emergencial, serviços de urgência ou acompanhamento profissional quando necessário.",
        ],
      },
      {
        heading: "7. Condutas proibidas",
        items: [
          "Tentar acessar contas, dados ou áreas restritas sem autorização.",
          "Inserir conteúdo ofensivo, discriminatório, ilícito, ameaçador ou que viole direitos de terceiros.",
          "Utilizar a plataforma para fraude, spam, assédio, engenharia social ou qualquer atividade ilegal.",
          "Explorar vulnerabilidades, interferir no funcionamento da plataforma ou tentar contornar mecanismos de segurança.",
          "Utilizar a inteligência artificial para gerar conteúdo enganoso, discriminatório, antiético, ilícito ou incompatível com a prática psicológica.",
        ],
      },
      {
        heading: "8. Disponibilidade e alterações",
        paragraphs: [
          "A plataforma poderá passar por atualizações, manutenções, interrupções temporárias, modificações de funcionalidades ou ajustes técnicos, com ou sem aviso prévio.",
          "O PsicoConnect não garante funcionamento contínuo, ininterrupto ou livre de falhas, especialmente quando houver dependência de serviços externos.",
        ],
      },
      {
        heading: "9. Limitação de responsabilidade",
        paragraphs: [
          "O PsicoConnect atua como ferramenta tecnológica de apoio e não se responsabiliza por decisões clínicas, terapêuticas, profissionais, administrativas ou pessoais tomadas pelos usuários.",
          "A plataforma não se responsabiliza por uso inadequado, fornecimento de informações falsas, falhas externas, indisponibilidade de serviços de terceiros, uso indevido de credenciais ou interpretação equivocada de informações exibidas no sistema.",
        ],
      },
      {
        heading: "10. Alterações dos Termos",
        paragraphs: [
          "Estes Termos poderão ser atualizados periodicamente para refletir mudanças legais, técnicas, operacionais ou comerciais. A continuidade do uso da plataforma após alterações indicará concordância com a versão atualizada.",
        ],
      },
    ],
  },
  {
    id: "privacidade",
    title: "Política de Privacidade",
    summary:
      "Como o PsicoConnect coleta, utiliza, armazena, protege e compartilha dados pessoais.",
    content: [
      {
        heading: "1. Introdução",
        paragraphs: [
          "Esta Política de Privacidade descreve como o PsicoConnect realiza o tratamento de dados pessoais de seus usuários, incluindo psicólogos, pacientes e pessoas autorizadas pela operação da plataforma.",
          "A plataforma reconhece a importância da privacidade, da proteção de dados pessoais, do sigilo profissional e da segurança das informações, especialmente por envolver dados relacionados à saúde mental e ao acompanhamento psicológico.",
        ],
      },
      {
        heading: "2. Dados coletados",
        items: [
          "Dados cadastrais: nome, e-mail, senha criptografada, telefone, WhatsApp, cidade, estado e foto de perfil, quando fornecida.",
          "Dados profissionais: CRP, informações de perfil, bio profissional e dados necessários para análise do cadastro profissional.",
          "Dados de uso: registros de acesso, autenticação, sessão, data e horário de uso, navegador, dispositivo e endereço IP.",
          "Dados de acompanhamento: consultas, mensagens, tarefas terapêuticas, materiais psicoeducativos, vínculos entre psicólogos e pacientes e registros inseridos na plataforma.",
        ],
      },
      {
        heading: "3. Dados pessoais sensíveis",
        paragraphs: [
          "Devido à natureza da plataforma, o PsicoConnect poderá tratar dados pessoais sensíveis, incluindo informações relacionadas à saúde mental, acompanhamento psicológico, demandas emocionais, registros clínicos, mensagens, tarefas terapêuticas e demais informações vinculadas à relação entre psicólogo e paciente.",
          "O tratamento desses dados ocorrerá apenas quando necessário para funcionamento da plataforma, mediante base legal adequada e, quando aplicável, consentimento do titular ou de seu responsável legal.",
        ],
      },
      {
        heading: "4. Finalidades do tratamento",
        items: [
          "Criar e gerenciar contas de usuário.",
          "Autenticar acessos e proteger a plataforma.",
          "Permitir o funcionamento das funcionalidades do sistema.",
          "Viabilizar comunicação entre psicólogos e pacientes.",
          "Organizar consultas, agenda, tarefas, materiais e vínculos.",
          "Validar cadastros profissionais.",
          "Enviar e-mails transacionais, como verificação de conta e recuperação de senha.",
          "Melhorar segurança, estabilidade e experiência de uso.",
          "Cumprir obrigações legais, regulatórias ou solicitações de autoridades competentes.",
          "Registrar consentimentos e versões de documentos aceitos.",
        ],
      },
      {
        heading: "5. Uso de dados do Google Calendar",
        paragraphs: [
          "O PsicoConnect pode solicitar acesso ao Google Calendar somente quando o psicólogo optar por conectar voluntariamente sua agenda Google à plataforma.",
          "Essa integração é usada para permitir a organização da agenda profissional, a criação de eventos de consulta e a sincronização de informações de calendário relacionadas às consultas cadastradas pelo próprio psicólogo.",
          "Os dados obtidos por meio da integração com Google Calendar não são vendidos, não são usados para publicidade, não são compartilhados com terceiros para finalidades externas ao funcionamento da plataforma e não são utilizados para treinamento de modelos de inteligência artificial.",
          "O usuário pode desconectar a integração com Google Calendar a qualquer momento pela área de agenda da plataforma ou revogar o acesso diretamente nas configurações da própria conta Google.",
        ],
        items: [
          "Escopo utilizado: acesso a eventos do calendário necessário para criar e gerenciar eventos de consulta autorizados pelo usuário.",
          "Finalidade: sincronização e organização de consultas na agenda do psicólogo.",
          "Compartilhamento: não há venda, publicidade ou compartilhamento externo dos dados do Google Calendar.",
          "Controle do usuário: a conexão pode ser removida pelo usuário quando desejar.",
        ],
      },
      {
        heading: "6. Compartilhamento de dados",
        paragraphs: [
          "O PsicoConnect não vende dados pessoais de usuários.",
          "Dados poderão ser compartilhados apenas quando necessário para funcionamento da plataforma, cumprimento de obrigações legais, segurança ou prestação dos serviços contratados.",
        ],
        items: [
          "Serviços de hospedagem, banco de dados e infraestrutura.",
          "Serviços de envio de e-mail.",
          "Serviços de armazenamento de imagens, quando utilizados para foto de perfil.",
          "Serviços de calendário externo, quando houver integração autorizada pelo usuário.",
          "Ferramentas de autenticação, segurança e inteligência artificial, quando necessárias ao funcionamento da funcionalidade solicitada.",
          "Autoridades públicas, administrativas ou judiciais, quando houver obrigação legal.",
        ],
      },
      {
        heading: "7. Cookies",
        paragraphs: [
          "A plataforma poderá utilizar cookies essenciais para autenticação, manutenção de sessão, segurança e funcionamento básico do sistema.",
          "A desativação de cookies essenciais pode impedir o uso adequado de determinadas funcionalidades.",
        ],
      },
      {
        heading: "8. Segurança da informação",
        paragraphs: [
          "O PsicoConnect adota medidas técnicas e administrativas razoáveis para proteger dados pessoais contra acessos não autorizados, perda, alteração, comunicação indevida ou tratamento inadequado.",
        ],
        items: [
          "Controle de acesso por perfil.",
          "Autenticação por e-mail e senha.",
          "Criptografia de senha.",
          "Separação de permissões entre os diferentes perfis de acesso.",
          "Registro de consentimentos.",
          "Boas práticas de desenvolvimento seguro.",
        ],
      },
      {
        heading: "9. Direitos do titular",
        paragraphs: [
          "O titular dos dados poderá solicitar, nos termos da legislação aplicável, confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento, quando aplicável.",
        ],
      },
      {
        heading: "10. Retenção e exclusão",
        paragraphs: [
          "Os dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades descritas nesta Política, atender obrigações legais, preservar direitos, manter registros de segurança ou viabilizar a prestação dos serviços.",
          "A exclusão de dados poderá ser solicitada pelo usuário, observadas hipóteses em que a retenção seja permitida ou exigida por lei, por obrigação profissional, segurança ou exercício regular de direitos.",
        ],
      },
      {
        heading: "11. Crianças e adolescentes",
        paragraphs: [
          "Quando a plataforma envolver dados de crianças ou adolescentes, deverão ser observados cuidados adicionais de privacidade, segurança, consentimento de responsáveis legais quando aplicável e melhor interesse do menor.",
        ],
      },
      {
        heading: "12. Alterações desta Política",
        paragraphs: [
          "Esta Política poderá ser atualizada periodicamente para refletir mudanças legais, técnicas, operacionais ou comerciais.",
        ],
      },
    ],
  },
  {
    id: "exclusao-dados",
    title: "Exclusão de Dados",
    summary:
      "Como o usuário pode solicitar exclusão de conta, dados pessoais e desconexão do Google Calendar.",
    content: [
      {
        heading: "1. Solicitação de exclusão",
        paragraphs: [
          "O usuário poderá solicitar a exclusão de sua conta e de seus dados pessoais pelos canais oficiais de suporte do PsicoConnect.",
          "A solicitação será analisada considerando a identidade do solicitante, o tipo de conta, os vínculos existentes e eventuais obrigações legais, profissionais, técnicas ou de segurança que possam justificar a retenção de determinadas informações por período necessário.",
        ],
      },
      {
        heading: "2. Dados que podem ser excluídos",
        items: [
          "Dados cadastrais, como nome, telefone, cidade, estado, bio e foto de perfil.",
          "Dados de uso vinculados à conta, quando não houver obrigação de retenção.",
          "Vínculos, registros e conteúdos inseridos na plataforma, observadas as responsabilidades profissionais e legais aplicáveis.",
          "Tokens ou registros técnicos de integrações externas, como Google Calendar, quando aplicável.",
        ],
      },
      {
        heading: "3. Desconexão do Google Calendar",
        paragraphs: [
          "O psicólogo pode desconectar a integração com Google Calendar pela área de agenda da plataforma.",
          "Após a desconexão, o PsicoConnect deixa de utilizar novos acessos ao calendário do usuário, sem prejuízo de registros já necessários para histórico, segurança ou cumprimento de obrigações aplicáveis.",
          "O usuário também pode revogar o acesso do PsicoConnect diretamente nas configurações de segurança e privacidade da própria conta Google.",
        ],
      },
      {
        heading: "4. Retenção necessária",
        paragraphs: [
          "Alguns dados poderão ser mantidos quando a retenção for necessária para cumprimento de obrigação legal ou regulatória, exercício regular de direitos, segurança, prevenção a fraude, auditoria, registro de consentimentos ou responsabilidades profissionais relacionadas ao acompanhamento psicológico.",
        ],
      },
      {
        heading: "5. Canal de contato",
        paragraphs: [
          "Para solicitar exclusão, correção, revogação de consentimento ou esclarecimentos sobre dados pessoais, o usuário deve entrar em contato pelo canal de suporte informado na plataforma ou pelo e-mail oficial cadastrado na Google Auth Platform.",
        ],
      },
    ],
  },
  {
    id: "ia",
    title: "Uso da Inteligência Artificial",
    summary:
      "Limites, responsabilidades e cuidados relacionados ao uso do PsicoBot.",
    content: [
      {
        heading: "1. O que é o PsicoBot",
        paragraphs: [
          "O PsicoBot é um recurso de inteligência artificial integrado ao PsicoConnect, destinado a oferecer apoio informacional, organizacional e educativo aos usuários da plataforma.",
          "Suas respostas são geradas automaticamente a partir das informações fornecidas pelo usuário e dos recursos disponíveis no sistema.",
        ],
      },
      {
        heading: "2. Finalidades permitidas",
        items: [
          "Auxiliar na organização de informações.",
          "Apoiar a elaboração inicial de materiais psicoeducativos, quando revisados por profissional habilitado.",
          "Sugerir ideias de tarefas, orientações ou estruturas de conteúdo.",
          "Explicar funcionalidades da plataforma.",
          "Fornecer informações gerais e educativas, sem caráter diagnóstico ou terapêutico autônomo.",
        ],
      },
      {
        heading: "3. Limites da IA",
        paragraphs: [
          "O PsicoBot não é psicólogo, não possui registro profissional, não realiza atendimento psicológico e não substitui a atuação de um profissional habilitado.",
        ],
        items: [
          "Não realiza diagnóstico psicológico, psiquiátrico ou neuropsicológico.",
          "Não emite laudos, pareceres, relatórios psicológicos ou documentos técnicos definitivos.",
          "Não conduz psicoterapia.",
          "Não substitui avaliação clínica ou tomada de decisão profissional.",
          "Não deve ser utilizado como ferramenta autônoma para avaliação de risco, emergência ou crise.",
        ],
      },
      {
        heading: "4. Supervisão humana",
        paragraphs: [
          "Todo conteúdo gerado pelo PsicoBot deve ser revisado criticamente por um profissional habilitado antes de ser utilizado em contexto profissional.",
          "O uso da IA não reduz a responsabilidade ética, técnica e profissional do psicólogo sobre suas decisões, comunicações, documentos, orientações ou intervenções.",
        ],
      },
      {
        heading: "5. Possíveis erros",
        paragraphs: [
          "Sistemas de inteligência artificial podem gerar respostas incorretas, incompletas, desatualizadas, inadequadas ao caso concreto ou aparentemente convincentes, mas tecnicamente equivocadas.",
          "O usuário deve interpretar as respostas com cautela e buscar validação profissional sempre que o assunto envolver saúde mental, condutas clínicas ou decisões relevantes.",
        ],
      },
      {
        heading: "6. Uso responsável de dados",
        paragraphs: [
          "O usuário deve evitar inserir dados pessoais ou sensíveis desnecessários no PsicoBot.",
          "Quando o uso envolver informações de pacientes, o psicólogo deverá observar sigilo, necessidade, proporcionalidade, segurança e responsabilidade profissional.",
        ],
      },
      {
        heading: "7. Emergências",
        paragraphs: [
          "O PsicoBot não substitui serviços de emergência, rede de apoio, atendimento médico, psicológico ou psiquiátrico. Em situações de risco à vida, crise intensa, violência ou urgência, o usuário deve procurar imediatamente ajuda profissional ou serviços de emergência.",
        ],
      },
    ],
  },
  {
    id: "dados-sensiveis",
    title: "Consentimento para Dados Sensíveis",
    summary:
      "Autorização para tratamento de dados relacionados à saúde mental e acompanhamento psicológico.",
    content: [
      {
        heading: "1. Dados sensíveis tratados",
        paragraphs: [
          "O PsicoConnect poderá tratar dados pessoais sensíveis quando forem inseridos ou utilizados no contexto das funcionalidades da plataforma.",
        ],
        items: [
          "Informações relacionadas à saúde mental.",
          "Dados sobre acompanhamento psicológico.",
          "Registros de consultas.",
          "Mensagens trocadas entre psicólogo e paciente.",
          "Tarefas terapêuticas.",
          "Materiais psicoeducativos.",
          "Observações ou registros inseridos por profissionais.",
          "Informações emocionais, comportamentais ou clínicas compartilhadas pelo usuário.",
        ],
      },
      {
        heading: "2. Finalidade do consentimento",
        paragraphs: [
          "O consentimento é solicitado para permitir que o PsicoConnect trate dados sensíveis necessários ao funcionamento da plataforma, incluindo organização de atendimentos, comunicação entre usuários, acompanhamento de consultas, disponibilização de tarefas e materiais e manutenção do histórico de interações.",
        ],
      },
      {
        heading: "3. Limitação de finalidade",
        paragraphs: [
          "Os dados sensíveis não deverão ser utilizados para finalidades incompatíveis com o funcionamento da plataforma, com a relação entre psicólogo e paciente ou com a legislação aplicável.",
          "O PsicoConnect não vende dados pessoais ou sensíveis de usuários.",
        ],
      },
      {
        heading: "4. Acesso aos dados",
        paragraphs: [
          "Dados sensíveis poderão ser acessados apenas por usuários autorizados conforme seu perfil e vínculo na plataforma, como o próprio paciente, o psicólogo responsável e, quando estritamente necessário, pessoas autorizadas pela operação da plataforma para fins técnicos, operacionais, de segurança ou legais.",
        ],
      },
      {
        heading: "5. Revogação do consentimento",
        paragraphs: [
          "O usuário poderá solicitar a revogação do consentimento para tratamento de dados sensíveis pelos canais oficiais da plataforma.",
          "A revogação poderá limitar ou impedir o uso de determinadas funcionalidades, especialmente aquelas que dependam desses dados para funcionamento.",
          "A revogação não afetará tratamentos realizados anteriormente de forma legítima nem impedirá retenções necessárias para cumprimento de obrigação legal, exercício regular de direitos, segurança ou demais hipóteses permitidas pela legislação.",
        ],
      },
      {
        heading: "6. Declaração de consentimento",
        paragraphs: [
          "Ao marcar a opção correspondente no cadastro ou na plataforma, o usuário declara que leu este documento, compreendeu as finalidades do tratamento de dados sensíveis e autoriza o PsicoConnect a tratar esses dados nos limites necessários para funcionamento da plataforma.",
        ],
      },
    ],
  },
];