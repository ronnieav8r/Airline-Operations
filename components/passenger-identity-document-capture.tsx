"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const ID_DOCUMENT_TYPES = [
  ["", "Not set"],
  ["PASSPORT", "PASSPORT"],
  ["DRIVERS_LICENSE", "DRIVERS LICENSE"],
  ["STATE_ID", "STATE ID"],
  ["MILITARY_ID", "MILITARY ID"],
  ["OTHER", "OTHER"],
] as const;

type PassengerIdentityDocumentCaptureProps = {
  deleteUrl: string;
  hasDocument: boolean;
  initialMetadata: {
    idDocumentExpiresAt: string;
    idDocumentNumber: string;
    idDocumentType: string;
    idIssuingCountry: string;
    idIssuingState: string;
  };
  passengerName: string;
  uploadUrl: string;
  viewUrl: string;
};

function fieldClassName() {
  return "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500";
}

function stopCameraStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be read."));
    };
    image.src = url;
  });
}

async function compressImage(file: File, rotation: number, cropToCard: boolean): Promise<File> {
  const image = await loadImage(file);
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const cardRatio = 1.586;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (cropToCard) {
    const currentRatio = sourceWidth / sourceHeight;

    if (currentRatio > cardRatio) {
      sourceWidth = Math.round(sourceHeight * cardRatio);
      sourceX = Math.round((image.naturalWidth - sourceWidth) / 2);
    } else {
      sourceHeight = Math.round(sourceWidth / cardRatio);
      sourceY = Math.round((image.naturalHeight - sourceHeight) / 2);
    }
  }

  const rotated = normalizedRotation === 90 || normalizedRotation === 270;
  const targetSourceWidth = rotated ? sourceHeight : sourceWidth;
  const targetSourceHeight = rotated ? sourceWidth : sourceHeight;
  const scale = Math.min(1, 1600 / Math.max(targetSourceWidth, targetSourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(targetSourceWidth * scale));
  canvas.height = Math.max(1, Math.round(targetSourceHeight * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not prepare the ID photo.");
  }

  context.imageSmoothingQuality = "high";
  context.save();

  if (normalizedRotation === 90) {
    context.translate(canvas.width, 0);
    context.rotate(Math.PI / 2);
  } else if (normalizedRotation === 180) {
    context.translate(canvas.width, canvas.height);
    context.rotate(Math.PI);
  } else if (normalizedRotation === 270) {
    context.translate(0, canvas.height);
    context.rotate((3 * Math.PI) / 2);
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    Math.round(sourceWidth * scale),
    Math.round(sourceHeight * scale),
  );
  context.restore();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.84);
  });

  if (!blob) {
    throw new Error("This browser could not compress the ID photo.");
  }

  return new File([blob], "passenger-id-photo.jpg", { type: "image/jpeg" });
}

export function PassengerIdentityDocumentCapture({
  deleteUrl,
  hasDocument,
  initialMetadata,
  passengerName,
  uploadUrl,
  viewUrl,
}: PassengerIdentityDocumentCaptureProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [rotation, setRotation] = useState(0);
  const [cropToCard, setCropToCard] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(() => Date.now());

  const currentViewUrl = useMemo(() => `${viewUrl}?v=${version}`, [version, viewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }

    return () => stopCameraStream(cameraStream);
  }, [cameraStream]);

  function setSelectedFile(selectedFile: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selectedFile);
    setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null);
    setRotation(0);
  }

  async function handleOpenCamera() {
    setError(null);
    setMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not expose direct camera access. Use the photo picker instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });
      setCameraStream(stream);
    } catch {
      setError("Camera access was not available. Use the photo picker instead.");
    }
  }

  async function handleCaptureCameraPhoto() {
    setError(null);
    setMessage(null);

    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera image is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setError("This browser could not capture the camera image.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      setError("This browser could not capture the camera image.");
      return;
    }

    setSelectedFile(new File([blob], "camera-id-photo.jpg", { type: "image/jpeg" }));
    stopCameraStream(cameraStream);
    setCameraStream(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError("Choose or take an ID photo first.");
      return;
    }

    setIsBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      const compressed = await compressImage(file, rotation, cropToCard);
      form.set("documentImage", compressed);
      const response = await fetch(uploadUrl, {
        body: form,
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "ID photo could not be saved.");
      }

      setSelectedFile(null);
      setRotation(0);
      setVersion(Date.now());
      setMessage("ID photo saved.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ID photo could not be saved.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove the ID photo for ${passengerName}?`)) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsBusy(true);

    try {
      const response = await fetch(deleteUrl, { method: "DELETE" });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "ID photo could not be removed.");
      }

      setMessage("ID photo removed.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ID photo could not be removed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-950">ID photo</p>
          <p className="text-xs text-zinc-500">{hasDocument ? "Photo on file" : "No photo on file"}</p>
        </div>
        {hasDocument ? (
          <a
            className="cursor-pointer rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            href={currentViewUrl}
            target="_blank"
          >
            View
          </a>
        ) : null}
      </div>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Choose photo</span>
        <input
          accept="image/*"
          capture="environment"
          className={`${fieldClassName()} cursor-pointer`}
          disabled={isBusy}
          onChange={(event) => {
            setError(null);
            setMessage(null);
            setSelectedFile(event.target.files?.[0] ?? null);
          }}
          type="file"
        />
      </label>

      <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2">
        {cameraStream ? (
          <>
            <video
              autoPlay
              className="max-h-60 w-full rounded-md bg-black object-contain"
              muted
              playsInline
              ref={videoRef}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="cursor-pointer rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                disabled={isBusy}
                onClick={handleCaptureCameraPhoto}
                type="button"
              >
                Capture photo
              </button>
              <button
                className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                disabled={isBusy}
                onClick={() => {
                  stopCameraStream(cameraStream);
                  setCameraStream(null);
                }}
                type="button"
              >
                Close camera
              </button>
            </div>
          </>
        ) : (
          <button
            className="w-fit cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={handleOpenCamera}
            type="button"
          >
            Use camera
          </button>
        )}
      </div>

      {previewUrl ? (
        <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2">
          {/* Blob previews are local camera images; Next Image cannot optimize them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`Selected ID for ${passengerName}`}
            className="max-h-60 w-full rounded-md object-contain"
            src={previewUrl}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              disabled={isBusy}
              onClick={() => setRotation((current) => current + 90)}
              type="button"
            >
              Rotate
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700">
              <input
                checked={cropToCard}
                disabled={isBusy}
                onChange={(event) => setCropToCard(event.target.checked)}
                type="checkbox"
              />
              Center ID-card crop
            </label>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">ID type</span>
          <select className={fieldClassName()} defaultValue={initialMetadata.idDocumentType} name="idDocumentType">
            {ID_DOCUMENT_TYPES.map(([value, label]) => (
              <option key={value || "empty"} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">ID number</span>
          <input className={fieldClassName()} defaultValue={initialMetadata.idDocumentNumber} name="idDocumentNumber" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Issuing country</span>
          <input
            className={fieldClassName()}
            defaultValue={initialMetadata.idIssuingCountry}
            name="idIssuingCountry"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Issuing state</span>
          <input className={fieldClassName()} defaultValue={initialMetadata.idIssuingState} name="idIssuingState" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-zinc-600">ID expiration</span>
          <input
            className={fieldClassName()}
            defaultValue={initialMetadata.idDocumentExpiresAt}
            name="idDocumentExpiresAt"
            type="date"
          />
        </label>
      </div>

      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs font-medium text-rose-700">{error}</p> : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="cursor-pointer rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy}
          type="submit"
        >
          {hasDocument ? "Replace ID photo" : "Save ID photo"}
        </button>
        {hasDocument ? (
          <button
            className="cursor-pointer rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={handleDelete}
            type="button"
          >
            Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}
