import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  assertPassengerExists,
  deleteActivePassengerIdentityDocument,
  getDocumentImageFile,
  parsePassengerIdentityMetadata,
  PassengerIdentityDocumentError,
  readActivePassengerIdentityDocument,
  replacePassengerIdentityDocument,
} from "@/lib/passenger-identity-documents";

type RouteContext = {
  params: Promise<{
    passengerId: string;
  }>;
};

function errorResponse(error: unknown) {
  if (error instanceof PassengerIdentityDocumentError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  throw error;
}

function responseBody(buffer: Buffer): ArrayBuffer {
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);
  return body;
}

async function requirePassengerDocumentAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.OPS) {
    return null;
  }

  return currentUser;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requirePassengerDocumentAdmin();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const { passengerId } = await context.params;
    await assertPassengerExists(passengerId);
    const document = await readActivePassengerIdentityDocument(passengerId, currentUser.id);

    return new Response(responseBody(document.body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="passenger-id-${passengerId}.jpg"`,
        "Content-Type": document.contentType,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const currentUser = await requirePassengerDocumentAdmin();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const { passengerId } = await context.params;
    await assertPassengerExists(passengerId);
    const formData = await request.formData();

    await replacePassengerIdentityDocument({
      actorId: currentUser.id,
      file: getDocumentImageFile(formData),
      metadata: parsePassengerIdentityMetadata(formData),
      passengerId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requirePassengerDocumentAdmin();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const { passengerId } = await context.params;
    await assertPassengerExists(passengerId);
    await deleteActivePassengerIdentityDocument(passengerId, currentUser.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
