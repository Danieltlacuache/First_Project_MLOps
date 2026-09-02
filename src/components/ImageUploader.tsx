'use client';

import { useState } from 'react';

export default function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.type === 'image/jpeg' || selected.type === 'image/png')) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    } else {
      alert('Por favor, selecciona un archivo JPG o PNG.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file); // Asegúrate de que el endpoint de tu compañero espere la key 'file'

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Imagen guardada en MinIO y MariaDB');
        setFile(null);
        setPreview(null);
      } else {
        alert('Error al subir la imagen');
      }
    } catch (error) {
      alert('Fallo de red');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg max-w-md mx-auto text-center">
      <input 
        type="file" 
        accept="image/jpeg, image/png" 
        onChange={handleFileChange} 
        className="mb-4"
      />
      
      {preview && (
        <div className="mb-4">
          <img src={preview} alt="Vista previa" className="max-h-64 mx-auto rounded shadow-sm" />
        </div>
      )}

      <button 
        onClick={handleUpload} 
        disabled={!file || isUploading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
      >
        {isUploading ? 'Subiendo...' : 'Subir Imagen'}
      </button>
    </div>
  );
}