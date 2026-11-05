import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Uploads a buffer to Cloudinary under `${CLOUDINARY_FOLDER}/${subfolder}`.
 * Returns { url, publicId }.
 */
export function uploadBuffer(buffer, { subfolder, resourceType = 'image', transformation, publicId } = {}) {
  if (!isCloudinaryConfigured) {
    return Promise.reject(ApiError.internal('UPLOAD_ERROR', 'Cloudinary is not configured'));
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${subfolder}`,
        resource_type: resourceType,
        public_id: publicId,
        transformation,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(ApiError.internal('UPLOAD_ERROR', error.message));
        return resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Uploads an image, resized to at most `maxWidth` px wide and served in an optimal format. */
export const uploadImage = (buffer, subfolder, maxWidth = 1600) =>
  uploadBuffer(buffer, {
    subfolder,
    transformation: [{ width: maxWidth, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
  });

/** Best-effort delete; never throws (a stale asset must not break the request). */
export async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId || !isCloudinaryConfigured) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn(`⚠️  Could not delete Cloudinary asset ${publicId}:`, err.message);
  }
}
