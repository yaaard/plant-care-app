import { PLANT_PHOTO_BUCKET } from '@/constants/defaultValues';
import { getSupabaseClient } from '@/lib/supabase';

function guessContentType(uri: string) {
  const normalizedUri = uri.toLowerCase();

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

export function buildPlantPhotoPath(userId: string, plantId: string) {
  return `${userId}/${plantId}/plant-photo`;
}

export function getPlantPhotoPublicUrl(photoPath: string | null | undefined) {
  if (!photoPath) {
    return null;
  }

  const client = getSupabaseClient();
  const { data } = client.storage.from(PLANT_PHOTO_BUCKET).getPublicUrl(photoPath);

  return data.publicUrl;
}

export async function uploadPlantPhoto(input: {
  userId: string;
  plantId: string;
  localUri: string;
  photoPath?: string | null;
}) {
  const client = getSupabaseClient();
  const response = await fetch(input.localUri);

  if (!response.ok) {
    throw new Error(`Не удалось прочитать фото перед загрузкой: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const photoPath = input.photoPath ?? buildPlantPhotoPath(input.userId, input.plantId);

  const { error } = await client.storage.from(PLANT_PHOTO_BUCKET).upload(photoPath, buffer, {
    contentType: guessContentType(input.localUri),
    upsert: true,
  });

  if (error) {
    console.warn('[storage] Не удалось загрузить фото растения в Supabase Storage.', {
      photoPath,
      localUri: input.localUri,
      message: error.message,
    });
    throw error;
  }

  return {
    photoPath,
    photoUrl: getPlantPhotoPublicUrl(photoPath),
  };
}

export async function deletePlantPhoto(photoPath: string | null | undefined) {
  if (!photoPath) {
    return;
  }

  const client = getSupabaseClient();
  const { error } = await client.storage.from(PLANT_PHOTO_BUCKET).remove([photoPath]);

  if (error && !error.message.toLowerCase().includes('not found')) {
    throw error;
  }
}
