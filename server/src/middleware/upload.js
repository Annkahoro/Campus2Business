import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const MB = 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PDF_TYPES = ['application/pdf'];

const filterFor = (allowed) => (_req, file, cb) =>
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(ApiError.badRequest('INVALID_FILE_TYPE', `Allowed types: ${allowed.join(', ')}`));

/** Memory storage: files go straight from the buffer to Cloudinary. Field name is always `file`. */
const make = (allowed, maxBytes) =>
  multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 }, fileFilter: filterFor(allowed) }).single(
    'file',
  );

export const uploadAvatar = make(IMAGE_TYPES, 2 * MB);
export const uploadImage = make(IMAGE_TYPES, 5 * MB); // programme covers, org logos
export const uploadPdf = make(PDF_TYPES, 5 * MB); // CVs

/** Use after an upload middleware: 400 if no file was sent. */
export const requireFile = (req, _res, next) =>
  req.file ? next() : next(ApiError.badRequest('FILE_REQUIRED', 'No file uploaded (field name must be "file")'));
