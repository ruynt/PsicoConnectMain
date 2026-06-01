"use client";

import { useEffect, useMemo, useState } from "react";

type Psychologist = {
  id: string;
  linkId: string;

  name: string;
  email: string;
  profileImageUrl: string;
  phone: string;
  city: string;
  state: string;
  bio: string;

  crp: string;
  crpState: string;
  crpRegion: string;
  crpNumber: string;

  professionalTitle: string;
  approach: string;
  specialties: string;
  education: string;
  targetAudience: string;
  instagramUrl: string;

  linkedAt: string;
};

export default function MeusPsicologosPage() {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [expandedPsychologistIds, setExpandedPsychologistIds] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPsychologists() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/patient/psychologists", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Erro ao carregar psicólogos vinculados.",
        );
      }

      setPsychologists(data.psychologists || []);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar psicólogos vinculados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPsychologists();
  }, []);

  function togglePsychologistDetails(psychologistId: string) {
    setExpandedPsychologistIds((currentIds) => {
      if (currentIds.includes(psychologistId)) {
        return currentIds.filter((id) => id !== psychologistId);
      }

      return [...currentIds, psychologistId];
    });
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function onlyNumbers(value: string) {
    return value.replace(/\D/g, "");
  }

  function getWhatsappUrl(phone: string) {
    const digits = onlyNumbers(phone);

    if (!digits) return "";

    const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;

    return `https://wa.me/${withCountryCode}`;
  }

  function formatPhone(phone: string) {
    const digits = onlyNumbers(phone);

    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return phone || "Não informado";
  }

  function formatDate(dateString: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(new Date(dateString));
  }

  function getInstagramUser(value: string) {
    if (!value) return "";

    return value
      .replace("https://www.instagram.com/", "")
      .replace("https://instagram.com/", "")
      .replace("www.instagram.com/", "")
      .replace("instagram.com/", "")
      .replace("@", "")
      .replaceAll("/", "")
      .trim();
  }

  function getInstagramUrl(value: string) {
    const user = getInstagramUser(value);

    if (!user) return "";

    return `https://instagram.com/${user}`;
  }

  const totalPsychologists = useMemo(() => {
    return psychologists.length;
  }, [psychologists]);

  const pageStyle = {
    padding: "36px",
    paddingBottom: "72px",
    minHeight: "calc(100vh - 48px)",
    background:
      "radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 32%), #f8fafc",
    borderRadius: "32px",
    overflow: "visible",
  };

  const cardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
  };

  const primaryButtonStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
  } as const;

  const secondaryButtonStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  if (loading) {
    return (
      <div
        style={{
          ...pageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="psico-simple-loader" aria-label="Carregando">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <section
        style={{
          background:
            "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
          borderRadius: "28px",
          padding: "30px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 20px 50px rgba(37, 99, 235, 0.24)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-80px",
            top: "-90px",
            width: "240px",
            height: "240px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.16)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "90px",
            bottom: "-110px",
            width: "220px",
            height: "220px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.10)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "860px",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.16)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "13px",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: "14px",
            }}
          >
            <i className="fa-solid fa-user-doctor"></i>
            Psicólogos vinculados
          </span>

          <h1
            style={{
              fontSize: "44px",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.05,
              marginBottom: "10px",
            }}
          >
            Meus psicólogos
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "#dbeafe",
              maxWidth: "780px",
              margin: 0,
            }}
          >
            Veja os profissionais vinculados ao seu acompanhamento, seus dados
            profissionais e formas de contato disponíveis.
          </p>

          <p
            style={{
              marginTop: "14px",
              marginBottom: 0,
              color: "#dbeafe",
              fontSize: "14px",
              fontWeight: 800,
            }}
          >
            {totalPsychologists === 1
              ? "1 profissional vinculado"
              : `${totalPsychologists} profissionais vinculados`}
          </p>
        </div>
      </section>

      {error && (
        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            marginBottom: "24px",
          }}
        >
          <p style={{ color: "#b91c1c", fontWeight: 800, margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {psychologists.length === 0 ? (
        <section style={cardStyle}>
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "20px",
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              marginBottom: "14px",
            }}
          >
            <i className="fa-solid fa-user-doctor"></i>
          </div>

          <h2
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            Nenhum psicólogo vinculado
          </h2>

          <p style={{ color: "#64748b", margin: 0, lineHeight: 1.6 }}>
            Quando um profissional vincular você ao acompanhamento, ele aparecerá
            nesta página.
          </p>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "20px",
          }}
        >
          {psychologists.map((psychologist) => {
            const whatsappUrl = getWhatsappUrl(psychologist.phone);
            const instagramUser = getInstagramUser(psychologist.instagramUrl);
            const instagramUrl = getInstagramUrl(psychologist.instagramUrl);
            const isExpanded = expandedPsychologistIds.includes(
              psychologist.id,
            );

            const location =
              psychologist.city || psychologist.state
                ? `${psychologist.city || ""}${
                    psychologist.city && psychologist.state ? "/" : ""
                  }${psychologist.state || ""}`
                : "Não informado";

            return (
              <article
                key={psychologist.id}
                style={{
                  ...cardStyle,
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(37, 99, 235, 0.09), rgba(96, 165, 250, 0.13))",
                    padding: "22px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    {psychologist.profileImageUrl ? (
                      <img
                        src={psychologist.profileImageUrl}
                        alt={`Foto de ${psychologist.name}`}
                        style={{
                          width: "78px",
                          height: "78px",
                          borderRadius: "24px",
                          objectFit: "cover",
                          border: "3px solid #ffffff",
                          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "78px",
                          height: "78px",
                          borderRadius: "24px",
                          background:
                            "linear-gradient(135deg, #2563eb, #60a5fa)",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "26px",
                          fontWeight: 900,
                          border: "3px solid #ffffff",
                          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(psychologist.name)}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "13px",
                          fontWeight: 900,
                          marginBottom: "4px",
                        }}
                      >
                        {psychologist.professionalTitle || "Psicólogo(a)"}
                      </p>

                      <h2
                        style={{
                          color: "#0f172a",
                          fontSize: "25px",
                          fontWeight: 900,
                          marginBottom: "8px",
                          wordBreak: "break-word",
                        }}
                      >
                        {psychologist.name}
                      </h2>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "#ecfdf5",
                            color: "#047857",
                            border: "1px solid #a7f3d0",
                            borderRadius: "999px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 900,
                          }}
                        >
                          <i className="fa-solid fa-circle-check"></i>
                          Vinculado
                        </span>

                        {psychologist.crp && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: "999px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              fontWeight: 900,
                            }}
                          >
                            CRP {psychologist.crp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "18px",
                      alignItems: "center",
                    }}
                  >
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...primaryButtonStyle,
                          background:
                            "linear-gradient(135deg, #059669, #22c55e)",
                          boxShadow: "0 10px 24px rgba(34, 197, 94, 0.18)",
                          padding: "10px 14px",
                        }}
                      >
                        <i
                          className="fa-brands fa-whatsapp"
                          style={{ marginRight: "8px" }}
                        ></i>
                        WhatsApp
                      </a>
                    ) : (
                      <span
                        style={{
                          backgroundColor: "#ffffff",
                          color: "#64748b",
                          border: "1px solid #e2e8f0",
                          borderRadius: "14px",
                          padding: "10px 14px",
                          fontWeight: 800,
                          fontSize: "14px",
                        }}
                      >
                        WhatsApp não informado
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => togglePsychologistDetails(psychologist.id)}
                      style={{
                        ...secondaryButtonStyle,
                        padding: "10px 14px",
                      }}
                    >
                      <i
                        className={
                          isExpanded
                            ? "fa-solid fa-chevron-up"
                            : "fa-solid fa-chevron-down"
                        }
                        style={{ marginRight: "8px" }}
                      ></i>
                      {isExpanded ? "Ocultar informações" : "Ver informações"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      padding: "22px",
                      borderTop: "1px solid #dbeafe",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <InfoBox
                        label="Localização"
                        value={location}
                        icon="fa-solid fa-location-dot"
                      />

                      <InfoBox
                        label="Telefone"
                        value={formatPhone(psychologist.phone)}
                        icon="fa-solid fa-phone"
                      />

                      <InfoBox
                        label="E-mail"
                        value={psychologist.email}
                        icon="fa-solid fa-envelope"
                      />

                      <InfoBox
                        label="Vinculado em"
                        value={formatDate(psychologist.linkedAt)}
                        icon="fa-solid fa-calendar-check"
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <InfoBox
                        label="Abordagem"
                        value={psychologist.approach || "Não informado"}
                        icon="fa-solid fa-comments"
                      />

                      <InfoBox
                        label="Especialidades"
                        value={psychologist.specialties || "Não informado"}
                        icon="fa-solid fa-star"
                      />

                      <InfoBox
                        label="Público-alvo"
                        value={psychologist.targetAudience || "Não informado"}
                        icon="fa-solid fa-users"
                      />

                      <InfoBox
                        label="Formação"
                        value={psychologist.education || "Não informado"}
                        icon="fa-solid fa-graduation-cap"
                      />
                    </div>

                    {psychologist.bio && (
                      <div
                        style={{
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "16px",
                          padding: "14px",
                          marginBottom: "16px",
                        }}
                      >
                        <p
                          style={{
                            color: "#334155",
                            fontSize: "13px",
                            fontWeight: 900,
                            marginBottom: "6px",
                          }}
                        >
                          Sobre
                        </p>

                        <p
                          style={{
                            color: "#475569",
                            lineHeight: 1.6,
                            margin: 0,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {psychologist.bio}
                        </p>
                      </div>
                    )}

                    {instagramUrl && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={secondaryButtonStyle}
                      >
                        <i
                          className="fa-brands fa-instagram"
                          style={{ marginRight: "8px" }}
                        ></i>
                        @{instagramUser}
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "13px 14px",
        minWidth: 0,
      }}
    >
      <p
        style={{
          color: "#64748b",
          fontSize: "12px",
          fontWeight: 900,
          marginBottom: "5px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <i className={icon}></i>
        {label}
      </p>

      <p
        style={{
          color: "#0f172a",
          fontSize: "14px",
          fontWeight: 900,
          margin: 0,
          wordBreak: "break-word",
          lineHeight: 1.45,
        }}
      >
        {value}
      </p>
    </div>
  );
}
