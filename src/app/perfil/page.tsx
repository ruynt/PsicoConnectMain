"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { getErrorMessage } from "@/lib/errorUtils";

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
  paddingBottom: "120px",
  background: "transparent",
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

const softCardStyle: CSSProperties = {
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

function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function buildFormFromProfile(profile: ProfileData): ProfileForm {
  return {
    name: profile.name || "",
    profileImageUrl: profile.profileImageUrl || "",
    phone: formatPhone(profile.phone || ""),
    city: profile.city || "",
    state: sanitizeState(profile.state || ""),
    bio: profile.bio || "",
    professionalTitle: profile.psychologist?.professionalTitle || "",
    approach: profile.psychologist?.approach || "",
    specialties: profile.psychologist?.specialties || "",
    education: profile.psychologist?.education || "",
    targetAudience: profile.psychologist?.targetAudience || "",
    instagramUrl: sanitizeInstagramUsername(profile.psychologist?.instagramUrl || ""),
    socialName: profile.patient?.socialName || "",
    birthDate: profile.patient?.birthDate || "",
    contactPreference: profile.patient?.contactPreference || "",
    emergencyContactName: profile.patient?.emergencyContactName || "",
    emergencyContactPhone: formatPhone(profile.patient?.emergencyContactPhone || ""),
    patientNotes: profile.patient?.patientNotes || "",
  };
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: string;
}) {
  return (
    <div style={softCardStyle}>
      <p
        style={{
          color: "#5272a6",
          fontSize: "12px",
          fontWeight: 900,
          marginBottom: "5px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
        }}
      >
        <i className={icon}></i>
        {label}
      </p>
      <p
        style={{
          color: value ? "#001e5e" : "#94a3b8",
          fontSize: "14px",
          fontWeight: 900,
          lineHeight: 1.45,
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value || "Não informado"}
      </p>
    </div>
  );
}

function ProfilePhoto({
  imageUrl,
  name,
  size = 120,
}: {
  imageUrl: string;
  name: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "32px",
        overflow: "hidden",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size >= 120 ? "40px" : "28px",
        fontWeight: 900,
        border: "4px solid #ffffff",
        boxShadow: "0 18px 38px rgba(15, 23, 42, 0.18)",
        flexShrink: 0,
      }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Foto de perfil"
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editing, setEditing] = useState(false);
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
        setForm(buildFormFromProfile(loadedProfile));
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar perfil."));
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

  function cancelEditing() {
    if (profile) {
      setForm(buildFormFromProfile(profile));
    }

    setEditing(false);
    setError("");
    setSuccess("");
    setImageUploadError("");
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
    } catch (err: unknown) {
      setImageUploadError(getErrorMessage(err, "Erro ao enviar foto de perfil."));
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
      setEditing(false);
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao salvar perfil."));
    } finally {
      setSaving(false);
    }
  }

  const isPsychologist = profile?.role === "PSYCHOLOGIST";
  const isPatient = profile?.role === "PATIENT";
  const whatsappUrl = getWhatsAppUrl(form.phone);
  const instagramUrl = isPsychologist ? getInstagramUrl(form.instagramUrl) : "";
  const location = [form.city, form.state].filter(Boolean).join("/");
  const professionalSubtitle = isPsychologist
    ? form.professionalTitle || "Psicólogo(a)"
    : getRoleLabel(profile?.role || "PATIENT");

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
    <main className="profile-page" style={pageStyle}>
      <section className="profile-hero" style={heroStyle}>
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
            Visualize como suas informações aparecem no PsicoConnect e edite seus
            dados quando precisar.
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

      {!editing ? (
        <section className="profile-view-card" style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div className="profile-view-inner" style={{ padding: "30px" }}>
            <div
              className="profile-summary-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "20px",
                alignItems: "center",
                marginTop: 0,
                marginBottom: "24px",
                flexWrap: "wrap",
              }}
            >
              <div
                className="profile-person-block"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                  minWidth: "280px",
                }}
              >
                <ProfilePhoto imageUrl={form.profileImageUrl} name={form.name} size={132} />

                <div style={{ paddingBottom: "10px", minWidth: 0 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: "999px",
                      padding: "6px 11px",
                      fontSize: "12px",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    <i className="fa-solid fa-id-badge"></i>
                    {getRoleLabel(profile.role)}
                  </span>

                  <h2
                    style={{
                      color: "#001e5e",
                      fontSize: "34px",
                      fontWeight: 900,
                      lineHeight: 1.05,
                      marginBottom: "6px",
                      wordBreak: "break-word",
                    }}
                  >
                    {form.name || "Seu nome"}
                  </h2>

                  <p
                    style={{
                      color: "#5272a6",
                      fontSize: "15px",
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    {professionalSubtitle}
                    {location ? ` · ${location}` : ""}
                  </p>
                </div>
              </div>

              <div
                className="profile-actions-block"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  alignItems: "flex-end",
                  paddingBottom: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  style={{
                    ...secondaryButtonStyle,
                    backgroundColor: "#ffffff",
                    color: "#1d4ed8",
                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  Editar perfil
                </button>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...primaryButtonStyle,
                        background: "linear-gradient(135deg, #059669, #22c55e)",
                        boxShadow: "0 10px 24px rgba(34, 197, 94, 0.20)",
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
                      @{sanitizeInstagramUsername(form.instagramUrl)}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className="profile-content-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: "22px",
                alignItems: "start",
              }}
            >
              <section className="profile-left-column" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={softCardStyle}>
                  <p
                    style={{
                      color: "#5272a6",
                      fontSize: "13px",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    Sobre
                  </p>
                  <p
                    style={{
                      color: form.bio ? "#334155" : "#94a3b8",
                      lineHeight: 1.7,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {form.bio || "Você ainda não escreveu uma apresentação."}
                  </p>
                </div>

                {isPsychologist ? (
                  <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Atuação profissional</h3>
                    <p style={sectionDescriptionStyle}>
                      Essas informações ajudam os pacientes a conhecerem melhor seu
                      perfil profissional.
                    </p>

                    <div
                      className="profile-info-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "14px",
                      }}
                    >
                      <InfoTile
                        label="CRP"
                        value={profile.psychologist?.crp}
                        icon="fa-solid fa-id-card"
                      />
                      <InfoTile
                        label="Abordagem"
                        value={form.approach}
                        icon="fa-solid fa-comments"
                      />
                      <InfoTile
                        label="Público atendido"
                        value={form.targetAudience}
                        icon="fa-solid fa-users"
                      />
                      <InfoTile
                        label="Especialidades"
                        value={form.specialties}
                        icon="fa-solid fa-star"
                      />
                      <div style={{ gridColumn: "1 / -1" }}>
                        <InfoTile
                          label="Formação"
                          value={form.education}
                          icon="fa-solid fa-graduation-cap"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {isPatient ? (
                  <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Informações complementares</h3>
                    <p style={sectionDescriptionStyle}>
                      Dados visíveis para o psicólogo vinculado ao acompanhamento.
                    </p>

                    <div
                      className="profile-info-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "14px",
                      }}
                    >
                      <InfoTile
                        label="Nome social"
                        value={form.socialName}
                        icon="fa-solid fa-user"
                      />
                      <InfoTile
                        label="Nascimento"
                        value={formatDate(form.birthDate)}
                        icon="fa-solid fa-cake-candles"
                      />
                      <InfoTile
                        label="Preferência de contato"
                        value={form.contactPreference}
                        icon="fa-solid fa-message"
                      />
                      <InfoTile
                        label="Contato de emergência"
                        value={form.emergencyContactName}
                        icon="fa-solid fa-triangle-exclamation"
                      />
                      <InfoTile
                        label="Telefone de emergência"
                        value={form.emergencyContactPhone}
                        icon="fa-solid fa-phone"
                      />
                      <div style={{ gridColumn: "1 / -1" }}>
                        <InfoTile
                          label="Observações"
                          value={form.patientNotes}
                          icon="fa-solid fa-notes-medical"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <aside className="profile-right-aside" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={cardStyle}>
                  <h3 style={sectionTitleStyle}>Contato</h3>
                  <p style={sectionDescriptionStyle}>
                    Informações principais para comunicação dentro e fora da plataforma.
                  </p>

                  <div style={{ display: "grid", gap: "12px" }}>
                    <InfoTile label="E-mail" value={profile.email} icon="fa-solid fa-envelope" />
                    <InfoTile label="Telefone" value={form.phone} icon="fa-solid fa-phone" />
                    <InfoTile label="Cidade/UF" value={location} icon="fa-solid fa-location-dot" />
                    {isPsychologist ? (
                      <InfoTile
                        label="Instagram"
                        value={
                          form.instagramUrl
                            ? `@${sanitizeInstagramUsername(form.instagramUrl)}`
                            : ""
                        }
                        icon="fa-brands fa-instagram"
                      />
                    ) : null}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : (
        <form className="profile-edit-form" onSubmit={handleSubmit}>
          <section
            className="profile-edit-header"
            style={{
              ...cardStyle,
              marginBottom: "22px",
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={sectionTitleStyle}>Editar perfil</h2>
              <p style={{ ...sectionDescriptionStyle, marginBottom: 0 }}>
                Altere as informações que ficarão salvas no seu perfil.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" onClick={cancelEditing} style={secondaryButtonStyle}>
                <i className="fa-solid fa-xmark"></i>
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButtonStyle,
                  background: saving
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2563eb, #4f8cff)",
                  cursor: saving ? "not-allowed" : "pointer",
                  minWidth: "160px",
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
                    Salvar
                  </>
                )}
              </button>
            </div>
          </section>

          <div
            className="profile-edit-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "340px minmax(0, 1fr)",
              gap: "24px",
              alignItems: "start",
            }}
          >
            <aside className="profile-edit-aside" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <section style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <ProfilePhoto imageUrl={form.profileImageUrl} name={form.name} size={92} />

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
                    <InfoTile label="CRP" value={profile.psychologist.crp} icon="fa-solid fa-id-card" />
                  ) : null}
                  <InfoTile label="Cidade" value={form.city} icon="fa-solid fa-location-dot" />
                  <InfoTile label="Estado" value={form.state} icon="fa-solid fa-map" />
                  <InfoTile label="Telefone" value={form.phone} icon="fa-solid fa-phone" />
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
            </aside>

            <section className="profile-edit-sections" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
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
                      Informações gerais usadas para identificação e comunicação na plataforma.
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
                  className="profile-form-grid"
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
                    Esses dados ajudam o paciente a conhecer melhor sua atuação profissional.
                    O WhatsApp será gerado automaticamente a partir do telefone informado acima.
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
                        onChange={(event) => updateField("instagramUrl", event.target.value)}
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
                    Dados que podem auxiliar o psicólogo a compreender preferências e
                    necessidades de contato.
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
            </section>
          </div>
        </form>
      )}

      <style>{`
        .profile-page,
        .profile-page * {
          min-width: 0;
        }

        .profile-page a,
        .profile-page button,
        .profile-page label {
          max-width: 100%;
        }

        .profile-page input,
        .profile-page textarea,
        .profile-page select {
          max-width: 100%;
        }

        @media (max-width: 1180px) {
          .profile-page {
            padding: 28px !important;
            padding-bottom: 110px !important;
          }

          .profile-content-grid {
            grid-template-columns: 1fr !important;
          }

          .profile-right-aside {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .profile-edit-grid {
            grid-template-columns: 300px minmax(0, 1fr) !important;
            gap: 20px !important;
          }
        }

        @media (max-width: 900px) {
          .profile-page {
            padding: 20px !important;
            padding-bottom: 105px !important;
          }

          .profile-hero {
            padding: 24px !important;
            border-radius: 24px !important;
            margin-bottom: 20px !important;
          }

          .profile-hero h1 {
            font-size: 34px !important;
            line-height: 1.08 !important;
          }

          .profile-hero p {
            font-size: 16px !important;
            max-width: 640px !important;
          }

          .profile-view-inner {
            padding: 24px !important;
          }

          .profile-summary-header {
            align-items: flex-start !important;
          }

          .profile-actions-block {
            align-items: flex-start !important;
            width: 100% !important;
            padding-bottom: 0 !important;
          }

          .profile-actions-block > button,
          .profile-actions-block a {
            width: auto !important;
          }

          .profile-edit-grid {
            grid-template-columns: 1fr !important;
          }

          .profile-edit-aside {
            order: 2;
          }

          .profile-edit-sections {
            order: 1;
          }
        }

        @media (max-width: 720px) {
          .profile-page {
            padding: 14px !important;
            padding-bottom: 100px !important;
          }

          .profile-hero {
            padding: 18px !important;
            border-radius: 22px !important;
            margin-bottom: 16px !important;
          }

          .profile-hero span {
            padding: 5px 10px !important;
            font-size: 12px !important;
            margin-bottom: 10px !important;
          }

          .profile-hero h1 {
            font-size: 28px !important;
            margin-bottom: 0 !important;
          }

          .profile-hero p {
            display: none !important;
          }

          .profile-view-inner {
            padding: 18px !important;
          }

          .profile-summary-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 18px !important;
          }

          .profile-person-block {
            min-width: 0 !important;
            width: 100% !important;
            align-items: center !important;
          }

          .profile-person-block h2 {
            font-size: 28px !important;
            line-height: 1.12 !important;
          }

          .profile-person-block > div:first-child {
            width: 108px !important;
            height: 108px !important;
            border-radius: 26px !important;
            flex: 0 0 108px !important;
          }

          .profile-actions-block,
          .profile-actions-block > div {
            align-items: stretch !important;
            justify-content: flex-start !important;
            width: 100% !important;
          }

          .profile-actions-block > button,
          .profile-actions-block a {
            width: 100% !important;
            justify-content: center !important;
          }

          .profile-info-grid,
          .profile-form-grid,
          .profile-right-aside {
            grid-template-columns: 1fr !important;
          }

          .profile-edit-header {
            align-items: stretch !important;
          }

          .profile-edit-header > div:last-child {
            width: 100% !important;
          }

          .profile-edit-header button {
            flex: 1 1 150px !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 480px) {
          .profile-page {
            padding: 12px !important;
            padding-bottom: 96px !important;
          }

          .profile-hero {
            padding: 16px !important;
            border-radius: 20px !important;
          }

          .profile-hero h1 {
            font-size: 25px !important;
          }

          .profile-view-inner,
          .profile-page section[style*="padding: 24px"],
          .profile-page section[style*="padding:24px"] {
            padding: 16px !important;
          }

          .profile-person-block {
            flex-direction: column !important;
            text-align: center !important;
          }

          .profile-person-block > div:last-child {
            padding-bottom: 0 !important;
          }

          .profile-person-block h2 {
            font-size: 26px !important;
          }

          .profile-person-block p,
          .profile-person-block span {
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
