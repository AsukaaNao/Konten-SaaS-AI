import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Konfigurasi Cloudinary menggunakan environment variables
// Pastikan variabel ini ada di file .env.local Anda
cloudinary.config({ 
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY, 
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

// Handler untuk metode POST
export async function POST(request: Request) {
  try {
    const { file } = await request.json(); // Mengambil file dari body request

    if (!file) {
      return NextResponse.json({ error: 'File tidak disediakan' }, { status: 400 });
    }

    // Unggah file ke Cloudinary
    const result = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
      folder: "iklan_kilat_ai_uploads"
    });

    // Kirim URL yang aman kembali ke frontend
    return NextResponse.json({ url: result.secure_url });

  } catch (error) {
    console.error("Gagal mengunggah ke Cloudinary:", error);
    return NextResponse.json({ error: 'Gagal mengunggah gambar di server' }, { status: 500 });
  }
}
