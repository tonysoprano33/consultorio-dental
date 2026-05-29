import { useState, useEffect, type CSSProperties } from 'react';
import { createClient } from '../../lib/supabase';
import { Upload, X, Image as ImageIcon, ExternalLink, Loader2, Download, Trash2, Maximize2, Columns } from 'lucide-react';
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
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<number[]>([]);

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

  const toggleCompareSelect = (index: number) => {
    if (compareSelection.includes(index)) {
      setCompareSelection(prev => prev.filter(i => i !== index));
    } else {
      if (compareSelection.length < 2) {
        setCompareSelection(prev => [...prev, index]);
      } else {
        setCompareSelection([compareSelection[1], index]);
      }
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }} 
            style={{ ...compareBtn, background: compareMode ? 'var(--lavender)' : 'white', color: compareMode ? 'var(--lavender-dark)' : 'var(--muted)' }}
          >
            <Columns size={16} />
            {compareMode ? 'Cancelar comparación' : 'Comparar fotos'}
          </button>
          
          <label style={uploadLabel}>
            {uploading ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} /> : <Upload size={16} />}
            {uploading ? 'Subiendo...' : 'Subir Imagen / RX'}
            <input type="file" hidden onChange={handleUpload} disabled={uploading} accept="image/*" />
          </label>
        </div>
      </div>

      {compareMode && (
        <div style={compareAlert}>
          <p style={compareAlertText}>
            {compareSelection.length === 0 ? 'Selecciona dos imágenes para comparar' : 
             compareSelection.length === 1 ? 'Selecciona una imagen más' : 
             '¡Listo! Comparando fotos seleccionadas'}
          </p>
        </div>
      )}

      {loading ? (
        <p style={emptyText}>Cargando galería...</p>
      ) : files.length === 0 ? (
        <div style={emptyState}>
          <ImageIcon size={32} color="var(--cfg-border)" />
          <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 13 }}>No hay imágenes cargadas</p>
        </div>
      ) : (
        <div style={grid}>
          {files.map((file, i) => {
            const isSelectedForCompare = compareSelection.includes(i);
            return (
              <div 
                key={i} 
                style={{ ...fileCard, borderColor: isSelectedForCompare ? 'var(--lavender-dark)' : 'var(--cfg-border)', borderWidth: isSelectedForCompare ? 2 : 1 }} 
                onClick={() => compareMode ? toggleCompareSelect(i) : setSelectedPhoto(i)}
              >
                <div style={imgWrap}>
                  <img src={file.url} alt={file.name} style={img} />
                  {isSelectedForCompare && (
                    <div style={compareCheck}>
                      {compareSelection.indexOf(i) + 1}
                    </div>
                  )}
                  {!compareMode && (
                    <div style={overlay}>
                      <Maximize2 size={24} color="white" />
                    </div>
                  )}
                </div>
                <p style={fileName}>{file.name}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Side by side comparison */}
      {compareMode && compareSelection.length === 2 && (
        <div style={compareViewOverlay}>
          <div style={compareViewContainer}>
            <div style={compareHeader}>
              <h3 style={compareTitle}>Comparativa de Progreso</h3>
              <button style={compareClose} onClick={() => setCompareSelection([])}><X size={20} /></button>
            </div>
            <div style={compareGrid}>
              <div style={compareColumn}>
                <div style={compareImgWrap}><img src={files[compareSelection[0]].url} style={compareImg} /></div>
                <p style={compareCaption}>{files[compareSelection[0]].name}</p>
              </div>
              <div style={compareColumn}>
                <div style={compareImgWrap}><img src={files[compareSelection[1]].url} style={compareImg} /></div>
                <p style={compareCaption}>{files[compareSelection[1]].name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPhoto !== null && !compareMode && (
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
  marginBottom: '1rem',
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

const compareBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 10,
  fontSize: 12,
  cursor: 'pointer',
  border: '1.5px solid var(--cfg-border)',
  fontWeight: 500,
  transition: 'all 0.2s',
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
  cursor: 'pointer',
  transition: 'transform 0.2s',
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

const fileName: CSSProperties = {
  padding: '6px 10px',
  fontSize: 11,
  color: 'var(--ink)',
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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

const compareCheck: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: 'var(--lavender-dark)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
};

const compareAlert: CSSProperties = {
  background: 'var(--lavender)',
  padding: '0.75rem',
  borderRadius: 12,
  marginBottom: '1rem',
  textAlign: 'center',
};

const compareAlertText: CSSProperties = {
  fontSize: 12,
  color: 'var(--lavender-dark)',
  fontWeight: 600,
  margin: 0,
};

const compareViewOverlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: '2rem',
};

const compareViewContainer: CSSProperties = {
  width: '100%',
  maxWidth: 1000,
  background: 'white',
  borderRadius: 24,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const compareHeader: CSSProperties = {
  padding: '1.25rem 2rem',
  borderBottom: '1px solid var(--cfg-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const compareTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--ink)',
  margin: 0,
};

const compareClose: CSSProperties = {
  background: 'var(--cream)',
  border: 'none',
  borderRadius: '50%',
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const compareGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1px',
  background: 'var(--cfg-border)',
};

const compareColumn: CSSProperties = {
  background: 'white',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const compareImgWrap: CSSProperties = {
  width: '100%',
  aspectRatio: '4/3',
  background: 'var(--cream-faint)',
  borderRadius: 12,
  overflow: 'hidden',
};

const compareImg: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};

const compareCaption: CSSProperties = {
  fontSize: 13,
  color: 'var(--muted)',
  textAlign: 'center',
  margin: 0,
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

