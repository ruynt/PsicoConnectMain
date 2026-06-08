import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

export const runtime = "nodejs";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSizeInMb = 5;
const maxFileSizeInBytes = maxFileSizeInMb * 1024 * 1024;

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

function uploadToCloudinary(buffer: Buffer, userId: string) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "psiconnect/profile-images",
        public_id: `user-${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
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
    configureCloudinary();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhuma imagem foi enviada." },
        { status: 400 },
      );
    }

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Envie uma imagem nos formatos JPG, PNG ou WEBP." },
        { status: 400 },
      );
    }

    if (file.size > maxFileSizeInBytes) {
      return NextResponse.json(
        { error: `A imagem deve ter no máximo ${maxFileSizeInMb} MB.` },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const userId = String(token.id);

    const result = await uploadToCloudinary(buffer, userId);
    const profileImageUrl = result.secure_url;

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profileImageUrl,
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
