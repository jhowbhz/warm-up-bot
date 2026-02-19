import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import {
  Bot as BotIcon,
  Plus,
  Trash2,
  Edit3,
  Power,
  PowerOff,
  MessageSquare,
  Send,
  X,
  Loader2,
  Sparkles,
  Smartphone,
  Thermometer,
  Hash,
  Clock,
  AlertCircle,
  User,
  Users,
} from 'lucide-react';

interface BotData {
  id: number;
  name: string;
  instanceId: number | null;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  active: boolean;
  replyDelay: number;
  contextMessages: number;
  replyGroups: boolean;
  createdAt: string;
  instance?: { id: number; name: string; phone: string; status: string };
}

interface InstanceOption {
  id: number;
  name: string;
  phone: string;
  status: string;
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (recomendado)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const DEFAULT_PROMPTS = [
  {
    name: 'Atendimento SAC',
    prompt: `Você é um assistente de atendimento ao cliente educado e profissional.

REGRAS:
- Seja cordial e empático
- Responda de forma clara e objetiva
- Se não souber a resposta, diga que vai verificar com o setor responsável
- Use linguagem formal mas acessível
- Sempre pergunte se pode ajudar com mais alguma coisa ao final`,
  },
  {
    name: 'Vendas',
    prompt: `Você é um consultor de vendas amigável e persuasivo.

REGRAS:
- Seja entusiasmado mas não forçado
- Destaque benefícios dos produtos/serviços
- Responda dúvidas de forma completa
- Sempre tente conduzir para o fechamento
- Use gatilhos mentais como escassez e urgência com moderação`,
  },
  {
    name: 'Suporte Técnico',
    prompt: `Você é um especialista em suporte técnico.

REGRAS:
- Faça perguntas para entender o problema
- Dê instruções passo a passo
- Use linguagem simples (evite jargão técnico)
- Confirme se o problema foi resolvido
- Se necessário, oriente o cliente a procurar suporte presencial`,
  },
  {
    name: 'Agendamento',
    prompt: `Você é um assistente de agendamento.

REGRAS:
- Pergunte a data e horário de preferência
- Confirme nome completo e contato
- Informe sobre disponibilidade
- Envie confirmação dos dados do agendamento
- Lembre sobre política de cancelamento se houver`,
  },
];

export default function Bots() {
  const api = useApi();
  const [bots, setBots] = useState<BotData[]>([]);
  const [instances, setInstances] = useState<InstanceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BotData | null>(null);
  const [testingBot, setTestingBot] = useState<BotData | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    instanceId: '',
    systemPrompt: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
    replyDelay: 3,
    contextMessages: 10,
    replyGroups: false,
  });

  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testMessages]);

  async function loadData() {
    setLoading(true);
    try {
      const [botsRes, instancesRes] = await Promise.all([
        api.getBots(),
        api.getInstances(),
      ]);
      setBots(botsRes.data);
      setInstances(instancesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      instanceId: '',
      systemPrompt: '',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      replyDelay: 3,
      contextMessages: 10,
      replyGroups: false,
    });
    setShowForm(true);
  }

  function openEdit(bot: BotData) {
    setEditing(bot);
    setForm({
      name: bot.name,
      instanceId: bot.instanceId?.toString() || '',
      systemPrompt: bot.systemPrompt,
      model: bot.model,
      temperature: bot.temperature,
      maxTokens: bot.maxTokens,
      replyDelay: bot.replyDelay,
      contextMessages: bot.contextMessages,
      replyGroups: bot.replyGroups ?? false,
    });
    setShowForm(true);
  }

  function applyTemplate(prompt: string) {
    setForm((p) => ({ ...p, systemPrompt: prompt }));
  }

  async function handleSave() {
    if (!form.name || !form.systemPrompt) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        instanceId: form.instanceId ? Number(form.instanceId) : null,
      };

      if (editing) {
        await api.updateBot(editing.id, payload);
      } else {
        await api.createBot(payload);
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar bot');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(bot: BotData) {
    try {
      await api.toggleBot(bot.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(bot: BotData) {
    if (!confirm(`Excluir o bot "${bot.name}"?`)) return;
    try {
      await api.deleteBot(bot.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  function openTest(bot: BotData) {
    setTestingBot(bot);
    setTestMessages([]);
    setTestInput('');
  }

  async function sendTestMessage() {
    if (!testInput.trim() || !testingBot) return;

    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setTestLoading(true);

    try {
      const res = await api.testBot(testingBot.id, userMsg);
      setTestMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.reply },
      ]);
    } catch (err: any) {
      setTestMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[Erro] ${err.response?.data?.error || err.message}` },
      ]);
    } finally {
      setTestLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-green-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <BotIcon size={22} className="text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bots de Atendimento</h1>
            <p className="text-sm text-gray-500">
              Crie bots inteligentes com GPT para responder mensagens automaticamente
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Novo Bot
        </button>
      </div>

      {/* Bot List */}
      {bots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
            <BotIcon size={28} className="text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum bot criado</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Crie seu primeiro bot de atendimento para responder mensagens automaticamente via WhatsApp.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Criar Bot
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        bot.active
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <BotIcon size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{bot.name}</h3>
                      <p className="text-xs text-gray-500">{bot.model}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      bot.active
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {bot.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                  {bot.systemPrompt.substring(0, 120)}...
                </p>

                {bot.instance ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <Smartphone size={13} />
                    <span>
                      {bot.instance.name || bot.instance.phone}
                      <span
                        className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                          bot.instance.status === 'connected' ? 'bg-green-400' : 'bg-gray-300'
                        }`}
                      />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-600 mb-4">
                    <AlertCircle size={13} />
                    <span>Sem instância vinculada</span>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg py-2">
                    <Thermometer size={12} className="mx-auto text-gray-400 mb-0.5" />
                    <span className="text-xs text-gray-600 font-medium">{bot.temperature}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-2">
                    <Hash size={12} className="mx-auto text-gray-400 mb-0.5" />
                    <span className="text-xs text-gray-600 font-medium">{bot.maxTokens}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-2">
                    <Clock size={12} className="mx-auto text-gray-400 mb-0.5" />
                    <span className="text-xs text-gray-600 font-medium">{bot.replyDelay}s</span>
                  </div>
                  <div className={`rounded-lg py-2 ${bot.replyGroups ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <Users size={12} className={`mx-auto mb-0.5 ${bot.replyGroups ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${bot.replyGroups ? 'text-blue-600' : 'text-gray-600'}`}>
                      {bot.replyGroups ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 px-3 py-2.5 flex items-center gap-1">
                <button
                  onClick={() => handleToggle(bot)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    bot.active
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {bot.active ? <PowerOff size={13} /> : <Power size={13} />}
                  {bot.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => openTest(bot)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <MessageSquare size={13} />
                  Testar
                </button>
                <button
                  onClick={() => openEdit(bot)}
                  className="flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(bot)}
                  className="flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BotIcon size={16} className="text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? 'Editar Bot' : 'Novo Bot'}
                </h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Bot</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Bot SAC, Bot Vendas..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Instância */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Instância WhatsApp
                </label>
                <select
                  value={form.instanceId}
                  onChange={(e) => setForm((p) => ({ ...p, instanceId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
                >
                  <option value="">Selecione uma instância (opcional)</option>
                  {instances.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name || inst.phone} — {inst.status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  O bot só responde mensagens na instância vinculada
                </p>
              </div>

              {/* Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Templates de Prompt
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_PROMPTS.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => applyTemplate(t.prompt)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                    >
                      <Sparkles size={11} className="inline mr-1" />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prompt do Sistema
                </label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
                  placeholder="Defina a personalidade e regras do bot..."
                  rows={8}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-y font-mono leading-relaxed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.systemPrompt.length} caracteres
                </p>
              </div>

              {/* Model + Temperature */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Modelo GPT
                  </label>
                  <select
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Temperatura: {form.temperature}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={form.temperature}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, temperature: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-purple-500 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Preciso</span>
                    <span>Criativo</span>
                  </div>
                </div>
              </div>

              {/* Max Tokens + Delay + Context */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={4000}
                    value={form.maxTokens}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, maxTokens: parseInt(e.target.value) || 500 }))
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Delay (seg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={form.replyDelay}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, replyDelay: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contexto (msgs)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.contextMessages}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        contextMessages: parseInt(e.target.value) || 10,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Responder Grupos */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users size={18} className={form.replyGroups ? 'text-blue-500' : 'text-gray-400'} />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Responder grupos</span>
                    <p className="text-xs text-gray-500">Quando desativado, o bot ignora mensagens de grupos</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, replyGroups: !p.replyGroups }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    form.replyGroups ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      form.replyGroups ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.systemPrompt}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Salvar Alterações' : 'Criar Bot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Chat Modal */}
      {testingBot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ height: '600px' }}>
            {/* Header */}
            <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                  <BotIcon size={16} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{testingBot.name}</h3>
                  <p className="text-xs text-gray-500">Teste do bot • {testingBot.model}</p>
                </div>
              </div>
              <button
                onClick={() => setTestingBot(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {testMessages.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    Envie uma mensagem para testar o bot
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    O bot usará o prompt do sistema configurado
                  </p>
                </div>
              )}
              {testMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-end gap-2 max-w-[80%]">
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <BotIcon size={12} className="text-purple-600" />
                      </div>
                    )}
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User size={12} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                      <BotIcon size={12} className="text-purple-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendTestMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  disabled={testLoading}
                />
                <button
                  onClick={sendTestMessage}
                  disabled={testLoading || !testInput.trim()}
                  className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
