import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SENHA_DEMO = "Demo@123";

const emailsDemo = [
  "admin@psicoconnect.demo",
  "psicologo.pedro@psicoconnect.demo",
  "psicologa.kay@psicoconnect.demo",
  "paciente.ana@psicoconnect.demo",
  "paciente.ruy@psicoconnect.demo",
  "paciente.lucas@psicoconnect.demo",
  "paciente.marina@psicoconnect.demo",
];

function dataRelativa(dias, hora = 9, minuto = 0) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  data.setHours(hora, minuto, 0, 0);
  return data;
}

function somarHoras(data, horas = 1) {
  const novaData = new Date(data);
  novaData.setHours(novaData.getHours() + horas);
  return novaData;
}

async function limparDadosDemo() {
  const usuarios = await prisma.user.findMany({
    where: {
      email: {
        in: emailsDemo,
      },
    },
    include: {
      patient: true,
      psychologist: true,
    },
  });

  const userIds = usuarios.map((usuario) => usuario.id);
  const patientIds = usuarios
    .map((usuario) => usuario.patient?.id)
    .filter(Boolean);

  const psychologistIds = usuarios
    .map((usuario) => usuario.psychologist?.id)
    .filter(Boolean);

  const filtroPacienteOuPsicologo = {
    OR: [
      patientIds.length ? { patientId: { in: patientIds } } : null,
      psychologistIds.length
        ? { psychologistId: { in: psychologistIds } }
        : null,
    ].filter(Boolean),
  };

  if (filtroPacienteOuPsicologo.OR.length) {
    await prisma.patientSummary.deleteMany({
      where: filtroPacienteOuPsicologo,
    });

    await prisma.patientMessage.deleteMany({
      where: filtroPacienteOuPsicologo,
    });

    await prisma.patientMaterial.deleteMany({
      where: filtroPacienteOuPsicologo,
    });

    await prisma.therapeuticTask.deleteMany({
      where: filtroPacienteOuPsicologo,
    });

    await prisma.sessionNote.deleteMany({
      where: filtroPacienteOuPsicologo,
    });

    await prisma.appointment.deleteMany({
      where: filtroPacienteOuPsicologo,
    });

    await prisma.psychologistPatient.deleteMany({
      where: filtroPacienteOuPsicologo,
    });
  }

  if (patientIds.length) {
    await prisma.preSessionCheckin.deleteMany({
      where: {
        patientId: {
          in: patientIds,
        },
      },
    });
  }

  if (userIds.length) {
    await prisma.patient.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await prisma.psychologist.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });
  }

  await prisma.verificationToken.deleteMany({
    where: {
      email: {
        in: emailsDemo,
      },
    },
  });

  await prisma.passwordResetToken.deleteMany({
    where: {
      email: {
        in: emailsDemo,
      },
    },
  });

  if (userIds.length) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });
  }
}

async function criarUsuario({
  name,
  email,
  role,
  passwordHash,
  phone,
  city,
  state,
  bio,
}) {
  return prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash,
      emailVerified: new Date(),
      phone,
      city,
      state,
      bio,
    },
  });
}

async function criarConsulta({
  title,
  description,
  location,
  dateTime,
  status = "SCHEDULED",
  patientId,
  psychologistId,
  paymentStatus = "PENDING",
  paymentAmount = 180,
  paymentNote = null,
  paidAt = null,
  cancellationReason = null,
  cancelledAt = null,
}) {
  return prisma.appointment.create({
    data: {
      title,
      description,
      location,
      dateTime,
      endDateTime: somarHoras(dateTime, 1),
      status,
      patientId,
      psychologistId,

      googleEventId: null,
      googleEventLink: null,

      paymentStatus,
      paymentAmount,
      paymentNote,
      paidAt,
      cancellationReason,
      cancelledAt,
    },
  });
}

async function popularPaciente({ patient, psychologist, foco, dataProxima }) {
  await prisma.psychologistPatient.create({
    data: {
      patientId: patient.id,
      psychologistId: psychologist.id,
      active: true,
    },
  });

  const consultaFutura = await criarConsulta({
    title: `Consulta de acompanhamento - ${foco}`,
    description:
      "Atendimento de acompanhamento psicológico com foco em revisão da semana, demandas atuais e planejamento terapêutico.",
    location: "Atendimento online",
    dateTime: dataProxima,
    patientId: patient.id,
    psychologistId: psychologist.id,
    paymentStatus: "PENDING",
    paymentAmount: 180,
    paymentNote: "Pagamento previsto até o dia da consulta.",
  });

  const consultaPassada = await criarConsulta({
    title: "Sessão inicial",
    description:
      "Primeira sessão para compreensão da demanda, histórico breve e definição de objetivos iniciais.",
    location: "Consultório",
    dateTime: dataRelativa(-7, 10, 0),
    patientId: patient.id,
    psychologistId: psychologist.id,
    paymentStatus: "PAID",
    paymentAmount: 180,
    paidAt: dataRelativa(-7, 18, 0),
    paymentNote: "Pagamento confirmado.",
  });

  await criarConsulta({
    title: "Consulta remarcada",
    description: "Consulta cancelada para demonstração do histórico.",
    location: "Atendimento online",
    dateTime: dataRelativa(8, 16, 0),
    status: "CANCELLED",
    patientId: patient.id,
    psychologistId: psychologist.id,
    paymentStatus: "EXEMPT",
    paymentAmount: null,
    paymentNote: "Cancelamento sem cobrança.",
    cancellationReason:
      "Paciente solicitou remarcação por conflito de horário.",
    cancelledAt: dataRelativa(-1, 14, 20),
  });

  await prisma.preSessionCheckin.create({
    data: {
      appointmentId: consultaFutura.id,
      patientId: patient.id,
      moodLevel: 6,
      anxietyLevel: foco.toLowerCase().includes("ansiedade") ? 8 : 5,
      sleepLevel: 6,
      mainConcern:
        "Dificuldade em manter estabilidade emocional e organizar as demandas da semana.",
      importantEvents:
        "Semana com aumento de tarefas pessoais e necessidade de reorganizar horários.",
      topicsToDiscuss:
        "Estratégias práticas para lidar com pensamentos automáticos e planejamento semanal.",
    },
  });

  await prisma.sessionNote.createMany({
    data: [
      {
        title: "Registro da sessão inicial",
        content:
          "Paciente apresentou a demanda principal e relatou dificuldades recentes. Foram definidos objetivos iniciais e combinada uma tarefa simples para monitoramento durante a semana.",
        patientId: patient.id,
        psychologistId: psychologist.id,
        appointmentId: consultaPassada.id,
      },
      {
        title: "Observações sobre evolução",
        content:
          "Paciente demonstrou boa adesão ao processo e trouxe exemplos concretos de situações vivenciadas. Foi trabalhada a identificação de pensamentos automáticos e possíveis respostas alternativas.",
        patientId: patient.id,
        psychologistId: psychologist.id,
      },
      {
        title: "Planejamento terapêutico",
        content:
          "Foi sugerido manter registro breve de situações relevantes, emoções predominantes e estratégias utilizadas. Próxima sessão deve retomar os padrões observados e ajustar o plano de ação.",
        patientId: patient.id,
        psychologistId: psychologist.id,
      },
    ],
  });

  await prisma.therapeuticTask.createMany({
    data: [
      {
        title: "Registro de pensamentos automáticos",
        description:
          "Anotar situações que geraram desconforto, emoção sentida, pensamento principal e uma resposta alternativa possível.",
        dueDate: dataRelativa(6, 23, 59),
        status: "PENDING",
        patientId: patient.id,
        psychologistId: psychologist.id,
        appointmentId: consultaFutura.id,
      },
      {
        title: "Rotina de autocuidado",
        description:
          "Escolher duas atividades simples de autocuidado e registrar quando conseguiu realizá-las.",
        dueDate: dataRelativa(-1, 23, 59),
        status: "COMPLETED",
        completedAt: dataRelativa(-1, 20, 30),
        patientId: patient.id,
        psychologistId: psychologist.id,
        appointmentId: consultaPassada.id,
      },
    ],
  });

  await prisma.patientMaterial.createMany({
    data: [
      {
        title: `Psicoeducação sobre ${foco}`,
        description:
          "Material introdutório para ajudar o paciente a compreender melhor a demanda trabalhada em sessão.",
        category: "Psicoeducação",
        url: "",
        content:
          "Observe os sinais físicos, pensamentos e comportamentos que aparecem nos momentos de maior desconforto. O objetivo não é eliminar emoções, mas compreendê-las e desenvolver respostas mais funcionais.",
        viewedAt: null,
        patientId: patient.id,
        psychologistId: psychologist.id,
      },
      {
        title: "Exercício de respiração e pausa",
        description:
          "Orientação breve para momentos de tensão, ansiedade ou sobrecarga.",
        category: "Estratégias práticas",
        url: "",
        content:
          "Faça uma pausa breve, inspire lentamente pelo nariz, solte o ar pela boca e observe o ambiente ao redor. Repita por alguns ciclos, sem pressa.",
        viewedAt: dataRelativa(-2, 10, 10),
        patientId: patient.id,
        psychologistId: psychologist.id,
      },
    ],
  });

  await prisma.patientMessage.createMany({
    data: [
      {
        content:
          "Olá! Lembre-se de trazer para a próxima sessão os registros que conseguir fazer durante a semana. Não precisa ficar perfeito, o importante é observar os padrões.",
        senderRole: "PSYCHOLOGIST",
        patientId: patient.id,
        psychologistId: psychologist.id,
        readByPatientAt: dataRelativa(-1, 9, 45),
      },
      {
        content:
          "Certo, vou tentar preencher pelo menos em dois momentos da semana e levo para conversarmos.",
        senderRole: "PATIENT",
        patientId: patient.id,
        psychologistId: psychologist.id,
        readByPsychologistAt: dataRelativa(-1, 12, 15),
      },
    ],
  });

  await prisma.patientSummary.create({
    data: {
      title: "Resumo inicial para prontuário",
      content:
        "Paciente em acompanhamento psicológico, com demanda relacionada à organização emocional e desenvolvimento de estratégias de enfrentamento. Nas sessões iniciais, foram explorados relatos recentes, padrões de pensamento e objetivos terapêuticos. Foram combinadas tarefas de observação e registro para subsidiar as próximas intervenções. O conteúdo deve ser revisado pelo profissional antes de qualquer uso formal.",
      patientId: patient.id,
      psychologistId: psychologist.id,
      sourceNotesCount: 3,
      generatedAt: new Date(),
    },
  });
}

async function main() {
  console.log("Limpando dados demo antigos...");
  await limparDadosDemo();

  const passwordHash = await bcrypt.hash(SENHA_DEMO, 10);

  console.log("Criando usuários...");

  await criarUsuario({
    name: "Administrador Demo",
    email: "admin@psicoconnect.demo",
    role: "ADMIN",
    passwordHash,
    phone: "83999990000",
    city: "João Pessoa",
    state: "PB",
    bio: "Conta administrativa para demonstração do PsicoConnect.",
  });

  const userPsicologoPedro = await criarUsuario({
    name: "Dr. Pedro Almeida",
    email: "psicologo.pedro@psicoconnect.demo",
    role: "PSYCHOLOGIST",
    passwordHash,
    phone: "83999991111",
    city: "João Pessoa",
    state: "PB",
    bio: "Psicólogo demo com foco em TCC, ansiedade, rotina e organização emocional.",
  });

  const userPsicologaKay = await criarUsuario({
    name: "Dra. Kay Vieira",
    email: "psicologa.kay@psicoconnect.demo",
    role: "PSYCHOLOGIST",
    passwordHash,
    phone: "83999992222",
    city: "João Pessoa",
    state: "PB",
    bio: "Psicóloga demo com atuação em avaliação psicológica, orientação familiar e neuropsicologia.",
  });

  const psicologoPedro = await prisma.psychologist.create({
    data: {
      userId: userPsicologoPedro.id,
      crp: "CRP 13/12345",
      crpRegion: "13",
      crpState: "PB",
      crpNumber: "12345",
      crpVerificationStatus: "APPROVED",
      crpVerifiedAt: new Date(),
      professionalTitle: "Psicólogo Clínico",
      approach: "Terapia Cognitivo-Comportamental",
      specialties: "Ansiedade, rotina, procrastinação e organização emocional",
      education: "Graduação em Psicologia e formação complementar em TCC",
      targetAudience: "Jovens adultos e adultos",
      instagramUrl: "psicologopedro.demo",
    },
  });

  const psicologaKay = await prisma.psychologist.create({
    data: {
      userId: userPsicologaKay.id,
      crp: "CRP 13/54321",
      crpRegion: "13",
      crpState: "PB",
      crpNumber: "54321",
      crpVerificationStatus: "APPROVED",
      crpVerifiedAt: new Date(),
      professionalTitle: "Psicóloga e Neuropsicóloga",
      approach: "Avaliação psicológica e orientação clínica",
      specialties:
        "Neuropsicologia, aprendizagem, desenvolvimento e orientação familiar",
      education: "Especialização em Neuropsicologia e Avaliação Psicológica",
      targetAudience: "Crianças, adolescentes, adultos e famílias",
      instagramUrl: "psicologakay.demo",
    },
  });

  const userAna = await criarUsuario({
    name: "Ana Beatriz Lima",
    email: "paciente.ana@psicoconnect.demo",
    role: "PATIENT",
    passwordHash,
    phone: "83999993333",
    city: "João Pessoa",
    state: "PB",
    bio: "Paciente demo em acompanhamento para ansiedade e organização da rotina.",
  });

  const userRuy = await criarUsuario({
    name: "Ruy Gerôncio Neto",
    email: "paciente.ruy@psicoconnect.demo",
    role: "PATIENT",
    passwordHash,
    phone: "83999994444",
    city: "Cabedelo",
    state: "PB",
    bio: "Paciente demo em acompanhamento para rotina de estudos e procrastinação.",
  });

  const userLucas = await criarUsuario({
    name: "Lucas Martins Costa",
    email: "paciente.lucas@psicoconnect.demo",
    role: "PATIENT",
    passwordHash,
    phone: "83999995555",
    city: "João Pessoa",
    state: "PB",
    bio: "Paciente demo em acompanhamento para atenção e aprendizagem.",
  });

  const userMarina = await criarUsuario({
    name: "Marina Souza Andrade",
    email: "paciente.marina@psicoconnect.demo",
    role: "PATIENT",
    passwordHash,
    phone: "83999996666",
    city: "Bayeux",
    state: "PB",
    bio: "Paciente demo em acompanhamento para orientação familiar e demandas emocionais.",
  });

  const pacienteAna = await prisma.patient.create({
    data: {
      userId: userAna.id,
      socialName: "Ana Beatriz",
      birthDate: new Date("2001-04-12T12:00:00.000Z"),
      contactPreference: "WhatsApp",
      emergencyContactName: "Carla Lima",
      emergencyContactPhone: "83999997777",
      patientNotes:
        "Prefere receber lembretes por WhatsApp e costuma responder melhor no período da tarde.",
    },
  });

  const pacienteRuy = await prisma.patient.create({
    data: {
      userId: userRuy.id,
      socialName: "Ruy",
      birthDate: new Date("2000-09-23T12:00:00.000Z"),
      contactPreference: "E-mail e WhatsApp",
      emergencyContactName: "Roberta Gerôncio",
      emergencyContactPhone: "83999998888",
      patientNotes:
        "Relata dificuldade em manter rotina constante de estudos e organização semanal.",
    },
  });

  const pacienteLucas = await prisma.patient.create({
    data: {
      userId: userLucas.id,
      socialName: "Lucas",
      birthDate: new Date("2011-02-18T12:00:00.000Z"),
      contactPreference: "Responsável via WhatsApp",
      emergencyContactName: "Patrícia Martins",
      emergencyContactPhone: "83999990011",
      patientNotes:
        "Acompanhamento com participação familiar. Responsável prefere orientações objetivas.",
    },
  });

  const pacienteMarina = await prisma.patient.create({
    data: {
      userId: userMarina.id,
      socialName: "Marina",
      birthDate: new Date("1998-11-05T12:00:00.000Z"),
      contactPreference: "WhatsApp",
      emergencyContactName: "Eduardo Souza",
      emergencyContactPhone: "83999990022",
      patientNotes:
        "Busca compreender padrões emocionais e melhorar comunicação familiar.",
    },
  });

  console.log("Criando vínculos e dados da plataforma...");

  await popularPaciente({
    patient: pacienteAna,
    psychologist: psicologoPedro,
    foco: "ansiedade",
    dataProxima: dataRelativa(3, 10, 0),
  });

  await popularPaciente({
    patient: pacienteRuy,
    psychologist: psicologoPedro,
    foco: "procrastinação e rotina de estudos",
    dataProxima: dataRelativa(4, 14, 30),
  });

  await popularPaciente({
    patient: pacienteLucas,
    psychologist: psicologaKay,
    foco: "atenção e aprendizagem",
    dataProxima: dataRelativa(2, 9, 0),
  });

  await popularPaciente({
    patient: pacienteMarina,
    psychologist: psicologaKay,
    foco: "orientação familiar e regulação emocional",
    dataProxima: dataRelativa(6, 15, 0),
  });

  console.log("\nDados demo criados com sucesso!\n");

  console.table([
    {
      tipo: "Admin",
      email: "admin@psicoconnect.demo",
      senha: SENHA_DEMO,
    },
    {
      tipo: "Psicólogo",
      email: "psicologo.pedro@psicoconnect.demo",
      senha: SENHA_DEMO,
    },
    {
      tipo: "Psicóloga",
      email: "psicologa.kay@psicoconnect.demo",
      senha: SENHA_DEMO,
    },
    {
      tipo: "Paciente",
      email: "paciente.ana@psicoconnect.demo",
      senha: SENHA_DEMO,
    },
    {
      tipo: "Paciente",
      email: "paciente.ruy@psicoconnect.demo",
      senha: SENHA_DEMO,
    },
    {
      tipo: "Paciente",
      email: "paciente.lucas@psicoconnect.demo",
      senha: SENHA_DEMO,
    },
    {
      tipo: "Paciente",
      email: "paciente.marina@psicoconnect.demo",
      senha: SENHA_DEMO,
    },
  ]);

  console.log("\nVínculos criados:");
  console.log("- Dr. Pedro Almeida: Ana Beatriz Lima e Ruy Gerôncio Neto");
  console.log("- Dra. Kay Vieira: Lucas Martins Costa e Marina Souza Andrade");
}

main()
  .catch((error) => {
    console.error("Erro ao criar dados demo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
