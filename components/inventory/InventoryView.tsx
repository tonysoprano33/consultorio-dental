'use client';

import { useEffect, useState } from 'react';
import { Box, Plus, Minus, AlertTriangle, Pencil, Trash2, Save, X } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { InventoryItem } from '../../types';

const supabase = createClient();

export default function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('inventory').select('*').order('name');
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const updateStock = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStock = Math.max(0, item.stock + delta);
    
    setItems(items.map(i => i.id === id ? { ...i, stock: newStock } : i));
    
    const { error } = await supabase.from('inventory').update({ stock: newStock }).eq('id', id);
    if (error) {
      alert('Error al actualizar stock: ' + error.message);
      void loadItems(); // Revert to server state
    }
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name) {
      alert('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    const { error } = editingItem.id 
      ? await supabase.from('inventory').update(editingItem).eq('id', editingItem.id)
      : await supabase.from('inventory').insert([editingItem]);
    
    if (error) {
      alert('Error al guardar: ' + error.message);
      setLoading(false);
    } else {
      setModalOpen(false);
      void loadItems();
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('¿Eliminar este insumo?')) return;
    await supabase.from('inventory').delete().eq('id', id);
    void loadItems();
  };

  return (
    <div style={container}>
      <header style={header}>
        <div>
          <h1 style={title}>Gestión de <em>Insumos</em></h1>
          <p style={subtitle}>Controla el stock de materiales del consultorio.</p>
        </div>
        <button onClick={() => { setEditingItem({ stock: 0, min_stock: 5, unit: 'unidades' }); setModalOpen(true); }} style={btnNew}>
          <Plus size={16} />
          Nuevo Insumo
        </button>
      </header>

      {loading ? (
        <div style={emptyState}>Cargando inventario...</div>
      ) : items.length === 0 ? (
        <div style={emptyState}>No hay insumos registrados. Empieza agregando uno nuevo.</div>
      ) : (
        <div style={grid}>
          {items.map(item => {
            const isLow = item.stock <= item.min_stock;
            return (
              <div key={item.id} style={{ ...card, borderColor: isLow ? 'var(--rose-mid)' : 'var(--cfg-border)' }}>
                <div style={cardHeader}>
                  <h3 style={itemName}>{item.name}</h3>
                  {isLow && <AlertTriangle size={16} color="var(--rose-deep)" title="Stock Bajo" />}
                </div>
                
                <div style={stockSection}>
                  <div style={stockDisplay}>
                    <span style={stockValue}>{item.stock}</span>
                    <span style={stockUnit}>{item.unit}</span>
                  </div>
                  <div style={stockActions}>
                    <button onClick={() => updateStock(item.id, -1)} style={stockBtn}><Minus size={14} /></button>
                    <button onClick={() => updateStock(item.id, 1)} style={stockBtn}><Plus size={14} /></button>
                  </div>
                </div>

                <div style={metaRow}>
                  <span style={minStock}>Min: {item.min_stock}</span>
                  <div style={actions}>
                    <button onClick={() => { setEditingItem(item); setModalOpen(true); }} style={iconBtn}><Pencil size={14} /></button>
                    <button onClick={() => deleteItem(item.id)} style={iconBtn}><Trash2 size={14} color="var(--danger-text)" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={modalTitle}>{editingItem?.id ? 'Editar' : 'Nuevo'} Insumo</h2>
            <form onSubmit={saveItem} style={form}>
              <div style={field}>
                <label style={label}>Nombre del Material</label>
                <input 
                  autoFocus
                  required
                  value={editingItem?.name || ''} 
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  style={input}
                />
              </div>
              <div style={row}>
                <div style={field}>
                  <label style={label}>Stock Actual</label>
                  <input 
                    type="number"
                    value={editingItem?.stock || 0} 
                    onChange={e => setEditingItem({ ...editingItem, stock: parseInt(e.target.value) })}
                    style={input}
                  />
                </div>
                <div style={field}>
                  <label style={label}>Stock Mínimo</label>
                  <input 
                    type="number"
                    value={editingItem?.min_stock || 0} 
                    onChange={e => setEditingItem({ ...editingItem, min_stock: parseInt(e.target.value) })}
                    style={input}
                  />
                </div>
              </div>
              <div style={field}>
                <label style={label}>Unidad (ej: cajas, unidades, tubos)</label>
                <input 
                  value={editingItem?.unit || ''} 
                  onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                  style={input}
                />
              </div>
              <div style={modalActions}>
                <button type="button" onClick={() => setModalOpen(false)} style={btnCancel}><X size={16} /> Cancelar</button>
                <button type="submit" style={btnSave}><Save size={16} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 4rem', fontFamily: 'var(--font-dm-sans), sans-serif' };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', borderBottom: '1px solid var(--cfg-border)', paddingBottom: '1.5rem' };
const title: React.CSSProperties = { fontFamily: 'var(--font-dm-serif), serif', fontSize: 30, color: 'var(--ink)', letterSpacing: '-0.5px' };
const subtitle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', marginTop: 6, fontWeight: 300 };
const btnNew: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 13, cursor: 'pointer' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 };
const card: React.CSSProperties = { background: 'white', border: '1px solid var(--cfg-border)', borderRadius: 20, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 };
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const itemName: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: 'var(--ink)' };
const stockSection: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--cream)', borderRadius: 14, padding: '12px 16px' };
const stockDisplay: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 4 };
const stockValue: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: 'var(--ink)' };
const stockUnit: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontWeight: 400 };
const stockActions: React.CSSProperties = { display: 'flex', gap: 8 };
const stockBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1px solid var(--cfg-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const metaRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 };
const minStock: React.CSSProperties = { fontSize: 11, color: 'var(--faint)', fontWeight: 500, textTransform: 'uppercase' };
const actions: React.CSSProperties = { display: 'flex', gap: 6 };
const iconBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' };
const emptyState: React.CSSProperties = { padding: '4rem 2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 };
const modal: React.CSSProperties = { background: 'white', borderRadius: 24, width: '100%', maxWidth: 400, padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' };
const modalTitle: React.CSSProperties = { fontSize: 20, fontWeight: 600, marginBottom: '1.5rem' };
const form: React.CSSProperties = { display: 'grid', gap: 16 };
const field: React.CSSProperties = { display: 'grid', gap: 6 };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--muted)' };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--cfg-border)', fontSize: 14, outline: 'none' };
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const modalActions: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1rem' };
const btnCancel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1.5px solid var(--cfg-border)', background: 'white', fontSize: 13, cursor: 'pointer' };
const btnSave: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--ink)', color: 'white', fontSize: 13, cursor: 'pointer' };
