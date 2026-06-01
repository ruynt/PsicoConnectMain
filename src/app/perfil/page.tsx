"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";

type UserRole = "ADMIN" | "PSYCHOLOGIST" | "PATIENT";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImageUrl: string;
  phone: string;
  city: string;
  state: string;
  bio: string;
  patient: {
    socialName: string;
    birthDate: string | null;
    contactPreference: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    patientNotes: string;
  } | null;
  psychologist: {
    crp: string;
    crpState: string;
    crpRegion: string;
    crpNumber: string;
    crpVerificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    professionalTitle: string;
    approach: string;
    specialties: string;
    education: string;
    targetAudience: string;
    instagramUrl: string;
  } | null;
};

type ProfileForm = {
  name: string;
  profileImageUrl: string;
  phone: string;
  city: string;
  state: string;
  bio: string;
  professionalTitle: string;
  approach: string;
  specialties: string;
  education: string;
  targetAudience: string;
  instagramUrl: string;
  socialName: string;
  birthDate: string;
  contactPreference: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  patientNotes: string;
};

const emptyForm: ProfileForm = {
  name: "",
  profileImageUrl: "",
  phone: "",
  city: "",
  state: "",
  bio: "",
  professionalTitle: "",
  approach: "",
  specialties: "",
  education: "",
  targetAudience: "",
  instagramUrl: "",
  socialName: "",
  birthDate: "",
  contactPreference: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  patientNotes: "",
};

const pageStyle: CSSProperties = {
  minHeight: "calc(100vh - 48px)",
  padding: "36px",
  paddingBottom: "72px",
  background: "#f8fbff",
  overflow: "visible",
};

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
  borderRadius: "28px",
  padding: "32px",
  color: "#ffffff",
  marginBottom: "24px",
  boxShadow: "0 20px 50px rgba(37, 99, 235, 0.24)",
  position: "relative",
  overflow: "hidden",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 14px 34px rgba(0, 30, 94, 0.06)",
  border: "1px solid #e6edf7",
};

const mutedCardStyle: CSSProperties = {
  backgroundColor: "#f8fbff",
  borderRadius: "18px",
  padding: "16px",
  border: "1px solid #dbe7ff",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  color: "#001e5e",
  fontSize: "13px",
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #cfe0ff",
  borderRadius: "14px",
  padding: "12px 14px",
  color: "#001e5e",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "#ffffff",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "120px",
  resize: "vertical",
  lineHeight: 1.6,
};

const sectionTitleStyle: CSSProperties = {
  color: "#001e5e",
  fontSize: "22px",
  fontWeight: 900,
  marginBottom: "6px",
};

const sectionDescriptionStyle: CSSProperties = {
  color: "#5272a6",
  fontSize: "14px",
  lineHeight: 1.6,
  marginBottom: "20px",
};

const primaryButtonStyle: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #4f8cff)",
  color: "#ffffff",
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
  gap: "8px",
  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
};

const secondaryButtonStyle: CSSProperties = {
  color: "#1d4ed8",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "14px",
  padding: "11px 14px",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (!parts.length) return "P";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getRoleLabel(role: UserRole) {
  if (role === "PSYCHOLOGIST") return "Psicólogo(a)";
  if (role === "PATIENT") return "Paciente";
  return "Administrador";
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function getBrazilianLocalPhoneDigits(value: string) {
  const digits = onlyDigits(value);

  if (digits.startsWith("55") && digits.length > 11) {
    return digits.slice(2, 13);
  }

  return digits.slice(0, 11);
}

function formatPhone(value: string) {
  const digits = getBrazilianLocalPhoneDigits(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function sanitizeState(value: string) {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

function sanitizeInstagramUsername(value: string) {
  const withoutUrl = value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@+/, "");

  return withoutUrl
    .split(/[/?#\s]/)[0]
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30);
}

function getWhatsAppUrl(phone: string) {
  const localDigits = getBrazilianLocalPhoneDigits(phone);

  if (localDigits.length < 10) return "";

  return `https://wa.me/55${localDigits}`;
}

function getInstagramUrl(username: string) {
  const cleanUsername = sanitizeInstagramUsername(username);

  if (!cleanUsername) return "";

  return `https://instagram.com/${cleanUsername}`;
}

function FieldInfo({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div style={mutedCardStyle}>
      <p
        style={{
          color: "#5272a6",
          fontSize: "12px",
          fontWeight: 900,
          marginBottom: "5px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: value ? "#001e5e" : "#94a3b8",
          fontSize: "14px",
          fontWeight: 900,
          lineHeight: 1.4,
        }}
      >
        {value || "Não informado"}
      </p>
    </div>
  );
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageUploadError, setImageUploadError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Erro ao carregar perfil.");
        }

        const loadedProfile = data.profile as ProfileData;

        setProfile(loadedProfile);
        setForm({
          name: loadedProfile.name || "",
          profileImageUrl: loadedProfile.profileImageUrl || "",
          phone: formatPhone(loadedProfile.phone || ""),
          city: loadedProfile.city || "",
          state: sanitizeState(loadedProfile.state || ""),
          bio: loadedProfile.bio || "",
          professionalTitle: loadedProfile.psychologist?.professionalTitle || "",
          approach: loadedProfile.psychologist?.approach || "",
          specialties: loadedProfile.psychologist?.specialties || "",
          education: loadedProfile.psychologist?.education || "",
          targetAudience: loadedProfile.psychologist?.targetAudience || "",
          instagramUrl: sanitizeInstagramUsername(
            loadedProfile.psychologist?.instagramUrl || "",
          ),
          socialName: loadedProfile.patient?.socialName || "",
          birthDate: loadedProfile.patient?.birthDate || "",
          contactPreference: loadedProfile.patient?.contactPreference || "",
          emergencyContactName: loadedProfile.patient?.emergencyContactName || "",
          emergencyContactPhone: formatPhone(
            loadedProfile.patient?.emergencyContactPhone || "",
          ),
          patientNotes: loadedProfile.patient?.patientNotes || "",
        });
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function updateField(field: keyof ProfileForm, value: string) {
    let sanitizedValue = value;

    if (field === "phone" || field === "emergencyContactPhone") {
      sanitizedValue = formatPhone(value);
    }

    if (field === "state") {
      sanitizedValue = sanitizeState(value);
    }

    if (field === "instagramUrl") {
      sanitizedValue = sanitizeInstagramUsername(value);
    }

    setForm((current) => ({
      ...current,
      [field]: sanitizedValue,
    }));
  }

  async function handleProfileImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxFileSizeInMb = 5;
    const maxFileSizeInBytes = maxFileSizeInMb * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setImageUploadError("Envie uma imagem nos formatos JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > maxFileSizeInBytes) {
      setImageUploadError(`A imagem deve ter no máximo ${maxFileSizeInMb} MB.`);
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      setUploadingImage(true);
      setImageUploadError("");
      setError("");
      setSuccess("");

      const response = await fetch("/api/profile/upload-image", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao enviar foto de perfil.");
      }

      const uploadedImageUrl = data?.profileImageUrl || "";

      if (!uploadedImageUrl) {
        throw new Error("A imagem foi enviada, mas a URL não foi retornada.");
      }

      setForm((current) => ({
        ...current,
        profileImageUrl: uploadedImageUrl,
      }));

      setProfile((current) =>
        current
          ? {
              ...current,
              profileImageUrl: uploadedImageUrl,
            }
          : current,
      );

      setSuccess("Foto de perfil atualizada com sucesso.");
    } catch (err: any) {
      setImageUploadError(err?.message || "Erro ao enviar foto de perfil.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const state = sanitizeState(form.state);
    const phoneDigits = getBrazilianLocalPhoneDigits(form.phone);
    const emergencyPhoneDigits = getBrazilianLocalPhoneDigits(
      form.emergencyContactPhone,
    );
    const instagramUsername = sanitizeInstagramUsername(form.instagramUrl);

    if (state && state.length !== 2) {
      setError("Informe o estado com 2 letras, por exemplo: PB.");
      setSaving(false);
      return;
    }

    if (form.phone && phoneDigits.length < 10) {
      setError("Informe um telefone válido com DDD.");
      setSaving(false);
      return;
    }

    if (form.emergencyContactPhone && emergencyPhoneDigits.length < 10) {
      setError("Informe um telefone de emergência válido com DDD.");
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      phone: phoneDigits,
      state,
      instagramUrl: instagramUsername,
      emergencyContactPhone: emergencyPhoneDigits,
    };

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao salvar perfil.");
      }

      setSuccess(data?.message || "Perfil atualizado com sucesso.");
      setForm((current) => ({
        ...current,
        name: payload.name,
        phone: formatPhone(payload.phone),
        state: payload.state,
        instagramUrl: payload.instagramUrl,
        emergencyContactPhone: formatPhone(payload.emergencyContactPhone),
      }));

      setProfile((current) =>
        current
          ? {
              ...current,
              name: payload.name,
              profileImageUrl: form.profileImageUrl,
              phone: payload.phone,
              city: form.city,
              state: payload.state,
              bio: form.bio,
              psychologist: current.psychologist
                ? {
                    ...current.psychologist,
                    professionalTitle: form.professionalTitle,
                    approach: form.approach,
                    specialties: form.specialties,
                    education: form.education,
                    targetAudience: form.targetAudience,
                    instagramUrl: payload.instagramUrl,
                  }
                : current.psychologist,
              patient: current.patient
                ? {
                    ...current.patient,
                    socialName: form.socialName,
                    birthDate: form.birthDate || null,
                    contactPreference: form.contactPreference,
                    emergencyContactName: form.emergencyContactName,
                    emergencyContactPhone: payload.emergencyContactPhone,
                    patientNotes: form.patientNotes,
                  }
                : current.patient,
            }
          : current,
      );
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  const isPsychologist = profile?.role === "PSYCHOLOGIST";
  const isPatient = profile?.role === "PATIENT";
  const whatsappUrl = getWhatsAppUrl(form.phone);
  const instagramUrl = isPsychologist ? getInstagramUrl(form.instagramUrl) : "";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fbff",
        }}
      >
        <div className="psico-simple-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <main style={pageStyle}>
        <section
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontWeight: 900,
          }}
        >
          {error}
        </section>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div
          style={{
            position: "absolute",
            right: "-70px",
            top: "-90px",
            width: "250px",
            height: "250px",
            borderRadius: "999px",
            backgroundColor: "rgba(255,255,255,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "120px",
            bottom: "-120px",
            width: "230px",
            height: "230px",
            borderRadius: "999px",
            backgroundColor: "rgba(255,255,255,0.10)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.24)",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "13px",
              fontWeight: 900,
              marginBottom: "14px",
              color: "#ffffff",
            }}
          >
            <i className="fa-solid fa-user"></i>
            Perfil
          </span>

          <h1
            style={{
              color: "#ffffff",
              fontSize: "44px",
              fontWeight: 900,
              lineHeight: 1.05,
              marginBottom: "10px",
            }}
          >
            Meu perfil
          </h1>

          <p
            style={{
              color: "#dbeafe",
              fontSize: "18px",
              maxWidth: "880px",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Atualize seus dados de apresentação, contato e informações
            complementares para deixar sua experiência no PsicoConnect mais
            completa.
          </p>
        </div>
      </section>

      {success ? (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: "16px",
            padding: "14px 16px",
            marginBottom: "18px",
            fontWeight: 900,
          }}
        >
          <i className="fa-solid fa-circle-check" style={{ marginRight: "8px" }}></i>
          {success}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            borderRadius: "16px",
            padding: "14px 16px",
            marginBottom: "18px",
            fontWeight: 900,
          }}
        >
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: "8px" }}></i>
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px minmax(0, 1fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <aside style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <section style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    width: "92px",
                    height: "92px",
                    borderRadius: "26px",
                    overflow: "hidden",
                    background: "linear-gradient(135deg, #2563eb, #60a5fa)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "28px",
                    fontWeight: 900,
                    flexShrink: 0,
                    boxShadow: "0 14px 34px rgba(37, 99, 235, 0.22)",
                  }}
                >
                  {form.profileImageUrl ? (
                    <img
                      src={form.profileImageUrl}
                      alt="Foto de perfil"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    getInitials(form.name)
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      color: "#001e5e",
                      fontSize: "22px",
                      fontWeight: 900,
                      marginBottom: "4px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {form.name || "Seu nome"}
                  </h2>
                  <p
                    style={{
                      color: "#5272a6",
                      fontSize: "14px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {profile.email}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 900,
                  marginBottom: "16px",
                }}
              >
                <i className="fa-solid fa-id-badge"></i>
                {getRoleLabel(profile.role)}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="profile-image-upload"
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                    cursor: uploadingImage ? "not-allowed" : "pointer",
                    opacity: uploadingImage ? 0.7 : 1,
                  }}
                >
                  {uploadingImage ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Enviando foto...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-camera"></i>
                      Escolher foto
                    </>
                  )}
                </label>

                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProfileImageUpload}
                  disabled={uploadingImage}
                  style={{ display: "none" }}
                />

                <p
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    fontWeight: 700,
                    marginTop: "8px",
                    marginBottom: 0,
                  }}
                >
                  A imagem será enviada para o Cloudinary e ficará salva no
                  perfil, sem depender da pasta public do projeto.
                </p>

                {imageUploadError ? (
                  <p
                    style={{
                      color: "#b91c1c",
                      fontSize: "12px",
                      lineHeight: 1.45,
                      fontWeight: 800,
                      marginTop: "8px",
                      marginBottom: 0,
                    }}
                  >
                    {imageUploadError}
                  </p>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {profile.psychologist ? (
                  <FieldInfo label="CRP" value={profile.psychologist.crp} />
                ) : null}
                <FieldInfo label="Cidade" value={form.city} />
                <FieldInfo label="Estado" value={form.state} />
                <FieldInfo label="Telefone" value={form.phone} />
              </div>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                    marginTop: "14px",
                    color: "#047857",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  <i className="fa-brands fa-whatsapp"></i>
                  Abrir WhatsApp
                </a>
              ) : null}
            </section>

            <section style={cardStyle}>
              <h3
                style={{
                  color: "#001e5e",
                  fontSize: "18px",
                  fontWeight: 900,
                  marginBottom: "10px",
                }}
              >
                Prévia pública
              </h3>
              <p
                style={{
                  color: "#5272a6",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  marginBottom: "14px",
                }}
              >
                Essas informações ajudam a tornar o contato mais humano e
                organizado dentro da plataforma.
              </p>

              <div
                style={{
                  backgroundColor: "#f8fbff",
                  border: "1px solid #dbe7ff",
                  borderRadius: "18px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    color: "#001e5e",
                    fontSize: "16px",
                    fontWeight: 900,
                    marginBottom: "6px",
                  }}
                >
                  {form.name || "Nome do usuário"}
                </p>
                <p style={{ color: "#5272a6", fontSize: "14px", lineHeight: 1.6 }}>
                  {form.bio ||
                    "Quando você preencher o campo sobre mim, o resumo aparecerá aqui."}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginTop: "14px",
                  }}
                >
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...secondaryButtonStyle,
                        color: "#047857",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      <i className="fa-brands fa-whatsapp"></i>
                      WhatsApp
                    </a>
                  ) : null}

                  {instagramUrl ? (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={secondaryButtonStyle}
                    >
                      <i className="fa-brands fa-instagram"></i>
                      Instagram
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          </aside>

          <section style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <section style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "18px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h2 style={sectionTitleStyle}>Dados básicos</h2>
                  <p style={sectionDescriptionStyle}>
                    Informações gerais usadas para identificação e comunicação na
                    plataforma.
                  </p>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#f8fbff",
                    color: "#1d4ed8",
                    border: "1px solid #dbe7ff",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="fa-solid fa-lock"></i>
                  E-mail não editável
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "16px",
                }}
              >
                <label style={labelStyle}>
                  Nome completo
                  <input
                    style={inputStyle}
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Seu nome completo"
                  />
                </label>

                <label style={labelStyle}>
                  Telefone / WhatsApp
                  <input
                    style={inputStyle}
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="(83) 99999-9999"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </label>

                <label style={labelStyle}>
                  Cidade
                  <input
                    style={inputStyle}
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="João Pessoa"
                  />
                </label>

                <label style={labelStyle}>
                  Estado
                  <input
                    style={inputStyle}
                    value={form.state}
                    onChange={(event) => updateField("state", event.target.value)}
                    placeholder="PB"
                    maxLength={2}
                  />
                </label>

                <label style={labelStyle}>
                  E-mail
                  <input
                    style={{
                      ...inputStyle,
                      backgroundColor: "#f8fbff",
                      color: "#64748b",
                      cursor: "not-allowed",
                    }}
                    value={profile.email}
                    disabled
                  />
                </label>
              </div>

              <label style={{ ...labelStyle, marginTop: "16px" }}>
                Sobre mim
                <textarea
                  style={textareaStyle}
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  placeholder="Escreva uma breve apresentação sobre você."
                />
              </label>
            </section>

            {isPsychologist ? (
              <section style={cardStyle}>
                <h2 style={sectionTitleStyle}>Informações profissionais</h2>
                <p style={sectionDescriptionStyle}>
                  Esses dados ajudam o paciente a conhecer melhor sua atuação
                  profissional. O WhatsApp será gerado automaticamente a partir do
                  telefone informado acima.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "16px",
                  }}
                >
                  <label style={labelStyle}>
                    Título profissional
                    <input
                      style={inputStyle}
                      value={form.professionalTitle}
                      onChange={(event) =>
                        updateField("professionalTitle", event.target.value)
                      }
                      placeholder="Psicóloga Clínica"
                    />
                  </label>

                  <label style={labelStyle}>
                    Abordagem
                    <input
                      style={inputStyle}
                      value={form.approach}
                      onChange={(event) => updateField("approach", event.target.value)}
                      placeholder="Terapia Cognitivo-Comportamental"
                    />
                  </label>

                  <label style={labelStyle}>
                    Público atendido
                    <input
                      style={inputStyle}
                      value={form.targetAudience}
                      onChange={(event) =>
                        updateField("targetAudience", event.target.value)
                      }
                      placeholder="Adolescentes e adultos"
                    />
                  </label>

                  <label style={labelStyle}>
                    Usuário do Instagram
                    <input
                      style={inputStyle}
                      value={form.instagramUrl}
                      onChange={(event) =>
                        updateField("instagramUrl", event.target.value)
                      }
                      placeholder="Usuário"
                    />
                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "12px",
                        lineHeight: 1.4,
                        fontWeight: 700,
                      }}
                    >
                      Informe apenas o usuário. Pode colar com @ ou link que o sistema
                      limpa automaticamente.
                    </span>
                  </label>
                </div>

                <label style={{ ...labelStyle, marginTop: "16px" }}>
                  Especialidades
                  <textarea
                    style={textareaStyle}
                    value={form.specialties}
                    onChange={(event) => updateField("specialties", event.target.value)}
                    placeholder="Ansiedade, depressão, autoestima, orientação parental..."
                  />
                </label>

                <label style={{ ...labelStyle, marginTop: "16px" }}>
                  Formação
                  <textarea
                    style={textareaStyle}
                    value={form.education}
                    onChange={(event) => updateField("education", event.target.value)}
                    placeholder="Descreva sua formação, pós-graduação, cursos e experiências relevantes."
                  />
                </label>
              </section>
            ) : null}

            {isPatient ? (
              <section style={cardStyle}>
                <h2 style={sectionTitleStyle}>Informações complementares</h2>
                <p style={sectionDescriptionStyle}>
                  Dados que podem auxiliar o psicólogo a compreender preferências
                  e necessidades de contato.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "16px",
                  }}
                >
                  <label style={labelStyle}>
                    Nome social
                    <input
                      style={inputStyle}
                      value={form.socialName}
                      onChange={(event) => updateField("socialName", event.target.value)}
                      placeholder="Opcional"
                    />
                  </label>

                  <label style={labelStyle}>
                    Data de nascimento
                    <input
                      type="date"
                      style={inputStyle}
                      value={form.birthDate}
                      onChange={(event) => updateField("birthDate", event.target.value)}
                    />
                  </label>

                  <label style={labelStyle}>
                    Preferência de contato
                    <input
                      style={inputStyle}
                      value={form.contactPreference}
                      onChange={(event) =>
                        updateField("contactPreference", event.target.value)
                      }
                      placeholder="Mensagem pela plataforma, e-mail..."
                    />
                  </label>

                  <label style={labelStyle}>
                    Contato de emergência
                    <input
                      style={inputStyle}
                      value={form.emergencyContactName}
                      onChange={(event) =>
                        updateField("emergencyContactName", event.target.value)
                      }
                      placeholder="Nome do contato"
                    />
                  </label>

                  <label style={labelStyle}>
                    Telefone de emergência
                    <input
                      style={inputStyle}
                      value={form.emergencyContactPhone}
                      onChange={(event) =>
                        updateField("emergencyContactPhone", event.target.value)
                      }
                      placeholder="(83) 99999-9999"
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                  </label>
                </div>

                <label style={{ ...labelStyle, marginTop: "16px" }}>
                  Observações para o psicólogo
                  <textarea
                    style={textareaStyle}
                    value={form.patientNotes}
                    onChange={(event) => updateField("patientNotes", event.target.value)}
                    placeholder="Informações importantes que você deseja compartilhar com o profissional."
                  />
                </label>
              </section>
            ) : null}

            <section
              style={{
                ...cardStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                position: "sticky",
                bottom: "20px",
                zIndex: 5,
              }}
            >
              <div>
                <p
                  style={{
                    color: "#001e5e",
                    fontSize: "16px",
                    fontWeight: 900,
                    marginBottom: "4px",
                  }}
                >
                  Salvar alterações
                </p>
                <p style={{ color: "#5272a6", fontSize: "14px", lineHeight: 1.5 }}>
                  Revise os dados antes de atualizar seu perfil.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButtonStyle,
                  background: saving
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2563eb, #4f8cff)",
                  cursor: saving ? "not-allowed" : "pointer",
                  minWidth: "170px",
                }}
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i>
                    Salvar perfil
                  </>
                )}
              </button>
            </section>
          </section>
        </div>
      </form>
    </main>
  );
}
