import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

// Tự động cấu hình Cloudinary từ biến môi trường
if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Kiểm tra xem Cloudinary đã được cấu hình đầy đủ chưa
 */
export function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

/**
 * Tải file (Buffer) lên Cloudinary qua luồng Stream (phù hợp tuyệt đối với Vercel Serverless)
 * @param {Buffer} buffer - Buffer file từ Multer MemoryStorage
 * @param {string} originalname - Tên file gốc
 * @param {string} folder - Thư mục lưu trữ trên Cloudinary (mặc định: tudonghoabaocao/evidence)
 * @returns {Promise<{ url: string, filename: string, originalName: string, size: number }>}
 */
export async function uploadBufferToCloudinary(buffer, originalname, folder = 'tudonghoabaocao/evidence') {
  // Nếu có cấu hình Cloudinary, đẩy trực tiếp lên Cloudinary
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const ext = path.extname(originalname || '');
      const baseName = path.basename(originalname || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniquePublicId = `${Date.now()}_${baseName}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: uniquePublicId,
          resource_type: 'auto', // Tự động nhận diện image, pdf, docx, excel...
          use_filename: true,
          unique_filename: true
        },
        (error, result) => {
          if (error) {
            console.error('Lỗi upload Cloudinary:', error);
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            filename: result.public_id,
            originalName: originalname,
            size: result.bytes || buffer.length
          });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  // Dự phòng khi chạy local chưa có Cloudinary: Ghi tạm vào thư mục uploads/ cục bộ
  console.warn('⚠️ Cloudinary chưa được cấu hình. Sử dụng lưu trữ cục bộ uploads/ làm dự phòng.');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeName = (originalname || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safeName}`;
  const targetPath = path.join(uploadsDir, uniqueName);

  fs.writeFileSync(targetPath, buffer);

  return {
    url: `/uploads/${uniqueName}`,
    filename: uniqueName,
    originalName: originalname,
    size: buffer.length
  };
}
