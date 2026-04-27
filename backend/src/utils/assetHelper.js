const fs = require('fs');
const path = require('path');

const MAX_UPLOAD_BYTES = Number(process.env.ADMIN_UPLOAD_MAX_BYTES || 1024 * 1024);
const ALLOWED_UPLOAD_FOLDERS = new Set(['images', 'posters', 'backdrops', 'avatars', 'banners']);

function resolveUploadDirectory() {
  const configuredPath = process.env.ADMIN_UPLOAD_DIR;
  if (configuredPath) return configuredPath;

  const productionPath = '/var/www/html/portal/uploads';
  if (fs.existsSync('/var/www/html/portal') || process.platform !== 'win32') {
    return productionPath;
  }

  return path.resolve(__dirname, '../../../frontend/public/uploads');
}

function sanitizeUploadFolder(folder) {
  const safe = String(folder || 'images').replace(/[^a-z0-9_-]/gi, '');
  return ALLOWED_UPLOAD_FOLDERS.has(safe) ? safe : 'images';
}

function saveDataUrlAsset(dataUrl, folder = 'images') {
  folder = sanitizeUploadFolder(folder);
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image payload.');

  const mimeType = match[1].toLowerCase();
  const extensionMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  const extension = extensionMap[mimeType];
  if (!extension) throw new Error('Unsupported image type.');

  const base64Payload = String(match[2] || '');
  const payloadBytes = Buffer.byteLength(base64Payload, 'base64');
  if (!Number.isFinite(payloadBytes) || payloadBytes <= 0) throw new Error('Invalid image payload.');
  if (payloadBytes > MAX_UPLOAD_BYTES) throw new Error(`Image is too large. Max size is ${MAX_UPLOAD_BYTES} bytes.`);

  const uploadRoot = resolveUploadDirectory();
  const targetDir = path.join(uploadRoot, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
  const absolutePath = path.join(targetDir, filename);
  fs.writeFileSync(absolutePath, Buffer.from(base64Payload, 'base64'));

  return `/portal/uploads/${folder}/${filename}`;
}

function saveBufferAsset(file, folder = 'images') {
  folder = sanitizeUploadFolder(folder);
  const mimeType = String(file?.mimetype || '').toLowerCase();
  const extensionMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  const extension = extensionMap[mimeType];
  if (!extension) throw new Error('Unsupported image type.');

  const size = Number(file?.size || 0);
  if (!Number.isFinite(size) || size <= 0) throw new Error('Invalid image payload.');
  if (size > MAX_UPLOAD_BYTES) throw new Error(`Image is too large. Max size is ${MAX_UPLOAD_BYTES} bytes.`);

  const uploadRoot = resolveUploadDirectory();
  const targetDir = path.join(uploadRoot, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
  const absolutePath = path.join(targetDir, filename);
  fs.writeFileSync(absolutePath, file.buffer);

  return `/portal/uploads/${folder}/${filename}`;
}

module.exports = {
  saveDataUrlAsset,
  saveBufferAsset,
  MAX_UPLOAD_BYTES,
};
