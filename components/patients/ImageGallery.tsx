'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { createClient } from '../../lib/supabase';
import { Upload, X, Image as ImageIcon, ExternalLink, Loader2, Download, Trash2, Maximize2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const supabase = createClient();

interface Props {
  patientId: string;
}

type FileItem = {
  name: string;
  url: string;
  created_at: string;
};

export default function ImageGallery({ patientId }: Props) {
  const [files, setFileItems] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    const { data: patient } = await supabase.from('patients').select('images').eq('id', patientId).single();
    setFileItems(patient?.images || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadFiles();
  }, [patientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Compresión automática
    if (file.type.startsWith('image/')) {
      try {
        const options = {
          maxSizeMB: 5, // Límite de 5MB por seguridad, excelente calidad
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        file = await imageCompression(file, options);
      } catch (err) {
        console.warn('Error al intentar comprimir la imagen:', err);
      }
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}.${fileExt}`;
    
    // 1. Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('patient-files')
      .upload(fileName, file);

    if (uploadError) {
      alert('Error al subir: ' + uploadError.message);
      setUploading(false);
      return;
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage.from('patient-files').getPublicUrl(fileName);

    // 3. Update Patient Metadata
    const newFile = { name: file.name, url: publicUrl, created_at: new Date().toISOString() };
    const updatedFiles = [...files, newFile];
    
    const { error: dbError } = await supabase.from('patients').update({ images: updatedFiles }).eq('id', patientId);
    
    if (dbError) {
      alert('Error en BD: Es posible que falte la columna "images" tipo JSONB en la tabla patients. \nDetalle: ' + dbError.message);
      setUploading(false);
      return;
    }
    
    setFileItems(updatedFiles);
    setUploading(false);
  };

  const deleteFile = async (index: number) => {
    if (!confirm('¿Seguro quieres eliminar esta foto?')) return;
    const updatedFiles = files.filter((_, i) => i !== index);
    const { error } = await supabase.from('patients').update({ images: updatedFiles }).eq('id', patientId);
    if (!error) {
      setFileItems(updatedFiles);
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <label style={uploadLabel}>
          {uploading ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} /> : <Upload size={16} />}
          {uploading ? 'Subiendo...' : 'Subir Imagen / RX'}
          <input type="file" hidden onChange={handleUpload} disabled={uploading} accept="image/*" />
        </label>
      </div>

      {loading ? (
        <p style={emptyText}>Cargando galería...</p>
      ) : files.length === 0 ? (
        <div style={emptyState}>
          <ImageIcon size={32} color="var(--cfg-border)" />
          <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 13 }}>No hay imágenes cargadas</p>
        </div>
      ) : (
        <div style={grid}>
          {files.map((file, i) => (
            <div key={i} style={fileCard} onClick={() => setSelectedPhoto(i)}>
              <div style={imgWrap}>
                <img src={file.url} alt={file.name} style={img} />
                <div style={overlay}>
                  <Maximize2 size={24} color="white" />
                </div>
              </div>
              <p style={fileName}>{file.name}</p>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto !== null && (
        <div style={lightboxOverlay} onClick={() => setSelectedPhoto(null)}>
          <button style={lightboxClose} onClick={() => setSelectedPhoto(null)}>
            <X size={28} color="white" />
          </button>
          
          <div style={lightboxContent} onClick={e => e.stopPropagation()}>
            <img src={files[selectedPhoto].url} style={lightboxImg} />
            
            <div style={lightboxToolbar}>
              <p style={lbName}>{files[selectedPhoto].name}</p>
              
              <div style={{display: 'flex', gap: 12}}>
                <button style={lbBtn} onClick={async () => {
                  try {
                    const response = await fetch(files[selectedPhoto].url);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = files[selectedPhoto].name;
                    a.click();
                  } catch (e) {
                    window.open(files[selectedPhoto].url, '_blank');
                  }
                }}>
                  <Download size={20} color="white" />
                </button>

                <button style={lbBtn} onClick={() => {
                  deleteFile(selectedPhoto);
                  setSelectedPhoto(null);
                }}>
                  <Trash2 size={20} color="#ef4444" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const container: CSSProperties = {
  background: 'white',
  padding: '1rem',
  borderRadius: 20,
  border: '1px solid var(--cfg-border)',
};

const header: CSSProperties = {
  marginBottom: '1.5rem',
  display: 'flex',
  justifyContent: 'flex-end',
};

const uploadLabel: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  background: 'var(--ink)',
  color: 'white',
  borderRadius: 10,
  fontSize: 12,
  cursor: 'pointer',
};

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '1rem',
};

const fileCard: CSSProperties = {
  borderRadius: 12,
  overflow: 'hidden',
  border: '1px solid var(--cfg-border)',
};

const imgWrap: CSSProperties = {
  width: '100%',
  aspectRatio: '1',
  background: 'var(--cream)',
  position: 'relative',
};

const img: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  opacity: 0,
  transition: 'opacity 0.2s',
};

// Note: In real CSS we'd use :hover on imgWrap to show overlay
// For inline styles we might need state or just keep buttons visible or simpler UI

const fileName: CSSProperties = {
  padding: '6px 10px',
  fontSize: 11,
  color: 'var(--ink)',
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const iconBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'white',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const emptyState: CSSProperties = {
  padding: '3rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const emptyText: CSSProperties = {
  textAlign: 'center',
  fontSize: 13,
  color: 'var(--muted)',
  padding: '2rem 0',
};

// Lightbox Styles
const lightboxOverlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem',
};

const lightboxClose: CSSProperties = {
  position: 'absolute',
  top: '1.5rem',
  right: '1.5rem',
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  borderRadius: '50%',
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 10000,
};

const lightboxContent: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 800,
  maxHeight: '90vh',
};

const lightboxImg: CSSProperties = {
  width: '100%',
  height: 'auto',
  maxHeight: '75vh',
  objectFit: 'contain',
};

const lightboxToolbar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem 0',
  marginTop: '0.5rem',
};

const lbName: CSSProperties = {
  color: 'white',
  fontSize: 14,
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flex: 1,
  paddingRight: '1rem',
};

const lbBtn: CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  padding: '10px',
  borderRadius: 12,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
