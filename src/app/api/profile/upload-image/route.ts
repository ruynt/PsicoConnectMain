import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { logAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const maxFileSizeInMb = 5;
const maxFileSizeInBytes = maxFileSizeInMb * 1024 * 1024;

type AllowedMimeType = (typeof allowedMimeTypes)[number];

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary não configurado. Confira CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

function isAllowedMimeType(value: string): value is AllowedMimeType {
  return allowedMimeTypes.includes(value as AllowedMimeType);
}

function detectImageMimeType(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 12) {
    return null;
  }

  const isJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  if (isJpeg) {
    return "image/jpeg";
  }

  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (isPng) {
    return "image/png";
  }

  const riffHeader = buffer.subarray(0, 4).toString("ascii");
  const webpHeader = buffer.subarray(8, 12).toString("ascii");

  if (riffHeader === "RIFF" && webpHeader === "WEBP") {
    return "image/webp";
  }

  return null;
}

function uploadToCloudinary(buffer: Buffer, userId: string) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "psiconnect/profile-images",
        public_id: `user-${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Erro ao enviar imagem para o Cloudinary."));
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const userId = String(token.id);

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhuma imagem foi enviada." },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "A imagem enviada está vazia." },
        { status: 400 },
      );
    }

    if (file.size > maxFileSizeInBytes) {
      return NextResponse.json(
        { error: `A imagem deve ter no máximo ${maxFileSizeInMb} MB.` },
        { status: 400 },
      );
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { error: "Envie uma imagem nos formatos JPG, PNG ou WEBP." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const detectedMimeType = detectImageMimeType(buffer);

    if (!detectedMimeType || detectedMimeType !== file.type) {
      return NextResponse.json(
        {
          error:
            "O arquivo enviado não parece ser uma imagem válida nos formatos JPG, PNG ou WEBP.",
        },
        { status: 400 },
      );
    }

    configureCloudinary();

    const result = await uploadToCloudinary(buffer, user.id);
    const profileImageUrl = result.secure_url;

    if (!profileImageUrl) {
      return NextResponse.json(
        { error: "Não foi possível obter a URL da imagem enviada." },
        { status: 500 },
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        profileImageUrl,
      },
    });

    await logAuditEvent({
      action: "PROFILE_IMAGE_UPLOADED",
      entityType: "User",
      entityId: user.id,
      actorUserId: user.id,
      actorRole: token.role,
      targetUserId: user.id,
      request: req,
      metadata: {
        fileType: file.type,
        fileSize: file.size,
        cloudinaryPublicId: result.public_id,
      },
    });

    return NextResponse.json({
      message: "Foto de perfil atualizada com sucesso.",
      profileImageUrl,
    });
  } catch (error: unknown) {
    console.error("Erro ao enviar foto de perfil:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao enviar foto de perfil."),
      },
      { status: 500 },
    );
  }
}