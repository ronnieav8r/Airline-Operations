import { NextResponse } from "next/server";

import { requireCrewPortalUser } from "@/lib/auth/crew-portal";
import {
  assertPassengerOnCrewFlight,
  deleteActivePassengerIdentityDocument,
  getDocumentImageFile,
  parsePassengerIdentityMetadata,
  PassengerIdentityDocumentError,
  readActivePassengerIdentityDocument,
  replacePassengerIdentityDocument,
} from "@/lib/passenger-identity-documents";

type RouteContext = {
  params: Promise<{
    flightLegId: string;
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requireCrewPortalUser();
    const { flightLegId, passengerId } = await context.params;
    await assertPassengerOnCrewFlight(currentUser.id, flightLegId, passengerId);
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
    const currentUser = await requireCrewPortalUser();
    const { flightLegId, passengerId } = await context.params;
    await assertPassengerOnCrewFlight(currentUser.id, flightLegId, passengerId);

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
    const currentUser = await requireCrewPortalUser();
    const { flightLegId, passengerId } = await context.params;
    await assertPassengerOnCrewFlight(currentUser.id, flightLegId, passengerId);
    await deleteActivePassengerIdentityDocument(passengerId, currentUser.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
