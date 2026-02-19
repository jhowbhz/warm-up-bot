import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Plus, Trash2, Edit2, Save, X, Users, Phone, Bot, UserCheck, Search } from 'lucide-react';

interface Contact {
  id: number;
  phone: string;
  name: string | null;
  isBot: boolean;
  category: 'friend' | 'family' | 'work' | 'random';
  active: boolean;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  { value: 'friend', label: 'Amigo', color: 'bg-blue-100 text-blue-800' },
  { value: 'family', label: 'Família', color: 'bg-purple-100 text-purple-800' },
  { value: 'work', label: 'Trabalho', color: 'bg-green-100 text-green-800' },
  { value: 'random', label: 'Aleatório', color: 'bg-gray-100 text-gray-800' },
];

export default function Contacts() {
  const api = useApi();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState({
    phone: '',
    name: '',
    category: 'friend' as string,
    isBot: false,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await api.getContacts();
      setContacts(response.data);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingContact(null);
    setForm({ phone: '', name: '', category: 'friend', isBot: false, active: true });
    setShowModal(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      phone: contact.phone,
      name: contact.name || '',
      category: contact.category,
      isBot: contact.isBot,
      active: contact.active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setForm({ phone: '', name: '', category: 'friend', isBot: false, active: true });
  };

  const handleSave = async () => {
    if (!form.phone.trim()) {
      alert('Telefone é obrigatório');
      return;
    }

    try {
      setSaving(true);
      if (editingContact) {
        await api.updateContact(editingContact.id, form);
      } else {
        await api.createContact(form);
      }
      closeModal();
      await loadContacts();
    } catch (error: any) {
      alert('Erro ao salvar: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;
    try {
      await api.deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (error: any) {
      alert('Erro ao excluir: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleActive = async (contact: Contact) => {
    try {
      await api.updateContact(contact.id, { active: !contact.active });
      setContacts(prev =>
        prev.map(c => (c.id === contact.id ? { ...c, active: !c.active } : c))
      );
    } catch (error: any) {
      alert('Erro ao atualizar: ' + (error.response?.data?.error || error.message));
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORY_OPTIONS.find(c => c.value === category);
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cat?.color || 'bg-gray-100 text-gray-800'}`}>
        {cat?.label || category}
      </span>
    );
  };

  // Filtrar contatos
  const filtered = contacts.filter(c => {
    const matchSearch =
      !search ||
      c.phone.includes(search) ||
      (c.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || c.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const activeCount = contacts.filter(c => c.active).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-xl">
            <Users size={24} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contatos de Aquecimento</h1>
            <p className="text-sm text-gray-500">
              {contacts.length} contatos cadastrados • {activeCount} ativos
            </p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Novo Contato
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              filterCategory === 'all' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterCategory === cat.value ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Carregando contatos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {contacts.length === 0 ? 'Nenhum contato cadastrado' : 'Nenhum contato encontrado'}
          </h3>
          <p className="text-gray-500 mb-4">
            {contacts.length === 0
              ? 'Adicione contatos para usar no aquecimento de chips'
              : 'Tente alterar os filtros de busca'}
          </p>
          {contacts.length === 0 && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus size={18} />
              Adicionar Contato
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Ativo</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((contact) => (
                <tr key={contact.id} className={`hover:bg-gray-50 transition-colors ${!contact.active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        contact.isBot ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        {contact.isBot ? (
                          <Bot size={14} className="text-purple-600" />
                        ) : (
                          <UserCheck size={14} className="text-blue-600" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {contact.name || 'Sem nome'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400" />
                      <span className="text-sm text-gray-600 font-mono">{contact.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCategoryBadge(contact.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      contact.isBot ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      {contact.isBot ? '🤖 Bot' : '👤 Humano'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleToggleActive(contact)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        contact.active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          contact.active ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingContact ? 'Editar Contato' : 'Novo Contato'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="5531999999999"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Código do país + DDD + número (sem espaços)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do contato"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm bg-white"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isBot}
                    onChange={(e) => setForm({ ...form, isBot: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">É um bot</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Contato ativo</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
