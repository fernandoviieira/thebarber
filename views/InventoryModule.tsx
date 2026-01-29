import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, Plus, Search, AlertTriangle, Edit3, Trash2, 
  Loader2, X, Percent
} from 'lucide-react';

const InventoryModule = ({ barbershopId }: { barbershopId: string | null }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '', 
    category: '', 
    current_stock: 0, 
    min_stock: 5, 
    price_cost: '', 
    price_sell: '',
    commission_rate: 0 
  });

  useEffect(() => {
    if (barbershopId) fetchInventory();
  }, [barbershopId]);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('name', { ascending: true });

    if (!error && data) setProducts(data);
    setLoading(false);
  };

  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setNewProduct({
      name: product.name,
      category: product.category || '',
      current_stock: product.current_stock,
      min_stock: product.min_stock,
      price_cost: product.price_cost.toString(),
      price_sell: product.price_sell.toString(),
      commission_rate: product.commission_rate || 0
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      ...newProduct,
      barbershop_id: barbershopId,
      price_cost: Number(newProduct.price_cost),
      price_sell: Number(newProduct.price_sell),
      commission_rate: Number(newProduct.commission_rate)
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update(productData)
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('inventory')
        .insert([productData]);
      error = insertError;
    }

    if (!error) {
      closeModal();
      fetchInventory();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewProduct({ name: '', category: '', current_stock: 0, min_stock: 5, price_cost: '', price_sell: '', commission_rate: 0 });
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Deseja excluir este produto?")) {
      await supabase.from('inventory').delete().eq('id', id);
      fetchInventory();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-amber-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-end border-b border-white/5 pb-8">
        <div className="space-y-3">
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
            Almoxarifado <span className="text-amber-500">& Estoque</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Gestão de insumos e produtos para revenda</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-lg"
        >
          <Plus size={18} strokeWidth={4} /> Novo Produto
        </button>
      </header>

      {/* SEARCH E RESUMO */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar produto pelo nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-bold outline-none focus:border-amber-500/50 transition-all shadow-xl"
          />
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 flex items-center justify-center gap-4">
           <AlertTriangle className="text-amber-500" size={24} />
           <div className="text-left">
              <p className="text-2xl font-black text-white leading-none">
                {products.filter(p => p.current_stock <= p.min_stock).length}
              </p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Abaixo do Mínimo</p>
           </div>
        </div>
      </div>

      {/* TABELA DE PRODUTOS */}
      <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Venda</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Comissão</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-500 shadow-inner">
                      <Package size={20} />
                    </div>
                    <span className="text-white font-bold">{product.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[10px] font-black bg-white/5 px-3 py-1 rounded-full uppercase text-slate-400 border border-white/5">
                    {product.category || 'Geral'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black tabular-nums ${product.current_stock <= product.min_stock ? 'text-red-500' : 'text-white'}`}>
                      {product.current_stock}
                    </span>
                    {product.current_stock <= product.min_stock && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                  </div>
                </td>
                <td className="px-8 py-6 text-amber-400 font-black italic tabular-nums">
                  R$ {Number(product.price_sell).toFixed(2)}
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-1 text-slate-300 font-bold">
                      <Percent size={12} className="text-amber-500" />
                      {product.commission_rate || 0}%
                   </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditClick(product)} className="p-2 bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"><Edit3 size={16} /></button>
                    <button onClick={() => deleteProduct(product.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL NOVO/EDITAR PRODUTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-8">
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                {editingId ? 'Editar' : 'Entrada de'} <span className="text-amber-500">Material</span>
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-white"><X size={32} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nome do Item</label>
                  <input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500" placeholder="Ex: Pomada Efeito Seco" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Categoria</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500 appearance-none">
                    <option value="">Selecione...</option>
                    <option value="Cabelo">Cabelo</option>
                    <option value="Barba">Barba</option>
                    <option value="Finalização">Finalização</option>
                    <option value="Uso Interno">Uso Interno (Insumo)</option>
                  </select>
                </div>
              </div>

              {/* LINHA DE ESTOQUE */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Qtd. Atual</label>
                  <input type="number" required value={newProduct.current_stock} onChange={e => setNewProduct({...newProduct, current_stock: Number(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Estoque Mínimo (Alerta)</label>
                  <input type="number" required value={newProduct.min_stock} onChange={e => setNewProduct({...newProduct, min_stock: Number(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500" />
                </div>
              </div>

              {/* LINHA DE PREÇOS E COMISSÃO */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Custo (R$)</label>
                  <input type="number" step="0.01" required value={newProduct.price_cost} onChange={e => setNewProduct({...newProduct, price_cost: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Venda (R$)</label>
                  <input type="number" step="0.01" required value={newProduct.price_sell} onChange={e => setNewProduct({...newProduct, price_sell: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Comissão (%)</label>
                  <input type="number" required value={newProduct.commission_rate} onChange={e => setNewProduct({...newProduct, commission_rate: Number(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-amber-500 font-bold outline-none focus:border-amber-500" placeholder="0" />
                </div>
              </div>

              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black py-7 rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] transition-all shadow-xl active:scale-95">
                {editingId ? 'Salvar Alterações' : 'Salvar no Inventário'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;