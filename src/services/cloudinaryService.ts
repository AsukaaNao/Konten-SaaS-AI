/**
 * Mengonversi file menjadi string base64 dan memanggil endpoint API 
 * untuk mengunggahnya dengan aman ke Cloudinary.
 * Dilengkapi dengan logging detail untuk debugging.
 * @param file - Objek File yang akan diunggah.
 * @returns Promise yang resolve dengan URL aman dari Cloudinary.
 */
export const uploadFileAndGetURL = async (file: File): Promise<string> => {
  console.log('[DEBUG] uploadFileAndGetURL dipanggil dengan file:', 'tipe:', file.type);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file); // Mengonversi file menjadi string base64

    reader.onload = async () => {
      try {
        const base64File = reader.result as string;
        
        if (!base64File) {
          throw new Error('Gagal membaca file menjadi base64.');
        }

        console.log('[DEBUG] File berhasil dibaca. Mengirim ke backend...');
        
        // Memanggil endpoint API lokal Anda
        const response = await fetch('/api/uploadToCloudinary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file: base64File }),
        });

        console.log('[DEBUG] Menerima respons dari backend dengan status:', response.status);

        // Mengambil body respons sebagai JSON
        const data = await response.json();

        if (!response.ok) {
          // Jika backend mengirim pesan error, kita akan menampilkannya
          const errorMessage = data.error || `Gagal mengunggah dengan status: ${response.status}`;
          throw new Error(errorMessage);
        }

        console.log('[DEBUG] Unggahan berhasil! URL Cloudinary:', data.url);
        
        // Jika berhasil, resolve dengan URL dari Cloudinary
        resolve(data.url);

      } catch (error) {
        // Log error yang lebih spesifik
        console.error("[DEBUG] Terjadi error saat memanggil fungsi unggah:", error);
        reject(error); // Melemparkan error agar bisa ditangkap oleh komponen pemanggil
      }
    };

    reader.onerror = (error) => {
      console.error("[DEBUG] FileReader gagal:", error);
      reject(error);
    };
  });
};

