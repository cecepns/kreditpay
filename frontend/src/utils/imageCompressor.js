/**
 * Utility untuk kompresi gambar di sisi client (browser) sebelum diunggah ke server.
 * Mengurangi ukuran file foto kamera HP (biasanya 5MB-10MB) menjadi ~200KB-400KB
 * tanpa mengurangi keterbacaan data KTP atau dokumen penting.
 */
export async function compressImage(file, maxWidth = 1600, quality = 0.8) {
  if (!file || !(file instanceof Blob) || !file.type.startsWith("image/")) {
    return file;
  }

  // Jika ukuran sudah di bawah 300KB, tidak perlu kompresi ulang
  if (file.size <= 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file);
              } else {
                const newName = (file.name || "photo").replace(/\.[^.]+$/, ".jpg");
                const compressedFile = new File([blob], newName, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            "image/jpeg",
            quality
          );
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

