import { useEffect, useState, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import {
  Save,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  Wifi,
  Globe,
  RefreshCw,
  Copy,
  Check,
  Link,
  ExternalLink,
  Sparkles,
  Settings as SettingsIcon,
  Activity,
  MessageSquare,
  Radio,
  QrCode,
  Trash2,
  Users,
  Plus,
  Edit2,
  Shield,
} from 'lucide-react';

type TabId = 'apibrasil' | 'ia' | 'cloudflare' | 'atendentes' | 'mensagens' | 'seguranca';

const TABS: { id: TabId; label: string; icon: typeof Database; color: string }[] = [
  { id: 'apibrasil', label: 'APIBrasil', icon: Database, color: 'green' },
  { id: 'ia', label: 'Inteligência Artificial', icon: Sparkles, color: 'purple' },
  { id: 'cloudflare', label: 'Cloudflare Tunnel', icon: Globe, color: 'orange' },
  { id: 'atendentes', label: 'Atendentes', icon: Users, color: 'indigo' },
  { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, color: 'pink' },
];

export default function Settings() {
  const api = useApi();
  const [activeTab, setActiveTab] = useState<TabId>('apibrasil');
  const [loadingApibrasil, setLoadingApibrasil] = useState(false);
  const [loadingOpenai, setLoadingOpenai] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [testStatusApibrasil, setTestStatusApibrasil] = useState<{ success: boolean; message: string } | null>(null);
  const [testStatusOpenai, setTestStatusOpenai] = useState<{ success: boolean; message: string } | null>(null);

  const [apibrasilConfig, setApibrasilConfig] = useState({
    email: '',
    password: '',
    secretKey: '',
    apiType: '' as string,
    apiName: '' as string,
  });
  const [detectingType, setDetectingType] = useState(false);
  const detectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [openaiConfig, setOpenaiConfig] = useState({
    apiKey: '',
    model: 'gpt-4o-mini',
  });

  const [tunnel, setTunnel] = useState<{
    url: string | null;
    active: boolean;
    webhookMessage: string | null;
    webhookStatus: string | null;
    webhookConnect: string | null;
    webhookQrcode: string | null;
  }>({ url: null, active: false, webhookMessage: null, webhookStatus: null, webhookConnect: null, webhookQrcode: null });
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [tunnelAction, setTunnelAction] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [webhookStats, setWebhookStats] = useState<{ total: number; last5min: number; byType: Record<string, number> }>({ total: 0, last5min: 0, byType: {} });
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // URL customizada de webhook
  const [customWebhookUrl, setCustomWebhookUrl] = useState('');
  const [editingCustomUrl, setEditingCustomUrl] = useState(false);
  const [savingCustomUrl, setSavingCustomUrl] = useState(false);

  // Atendentes
  const [attendants, setAttendants] = useState<any[]>([]);
  const [loadingAttendants, setLoadingAttendants] = useState(false);
  const [showAttendantModal, setShowAttendantModal] = useState(false);
  const [editingAttendant, setEditingAttendant] = useState<any | null>(null);
  const [attendantForm, setAttendantForm] = useState({
    name: '',
    sector: '',
    email: '',
    active: true,
  });
  const [showAttendantName, setShowAttendantName] = useState(true);

  // Mensagens de atendimento
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [closingMessage, setClosingMessage] = useState('');
  const [savingMessages, setSavingMessages] = useState(false);

  useEffect(() => {
    loadCurrentCredentials();
    loadTunnelStatus();
    loadWebhookLogs();
    loadAttendants();
    loadShowAttendantName();
    loadCustomWebhookUrl();
    loadAttendanceMessages();

    const es = new EventSource('/api/sse/stream');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'tunnel-connected') loadTunnelStatus();
        if (data.type === 'webhook-log') {
          setWebhookLogs(prev => [data.entry, ...prev].slice(0, 100));
          setWebhookStats(prev => ({
            total: prev.total + 1,
            last5min: prev.last5min + 1,
            byType: { ...prev.byType, [data.entry.type]: (prev.byType[data.entry.type] || 0) + 1 },
          }));
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  const loadCurrentCredentials = async () => {
    try {
      const response = await api.getCurrentCredentials();
      const data = response.data;
      if (data.apibrasil) {
        setApibrasilConfig(prev => ({
          ...prev,
          email: data.apibrasil.email || '',
          password: data.apibrasil.password || '',
          secretKey: data.apibrasil.secretKey || '',
          apiType: data.apibrasil.apiType || '',
        }));
      }
      if (data.openai) {
        setOpenaiConfig({
          apiKey: data.openai.apiKey || '',
          model: data.openai.model || 'gpt-4o-mini',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
    } finally {
      setLoadingPage(false);
    }
  };

  const loadTunnelStatus = async () => {
    try {
      const res = await api.getTunnelStatus();
      setTunnel(res.data);
    } catch {}
  };

  const loadWebhookLogs = async () => {
    try {
      const res = await api.getWebhookLogs();
      setWebhookLogs(res.data.logs || []);
      setWebhookStats(res.data.stats || { total: 0, last5min: 0, byType: {} });
    } catch {}
  };

  const loadAttendants = async () => {
    try {
      setLoadingAttendants(true);
      const res = await api.getAttendants();
      setAttendants(res.data || []);
    } catch (error) {
      console.error('Erro ao carregar atendentes:', error);
    } finally {
      setLoadingAttendants(false);
    }
  };

  const loadShowAttendantName = async () => {
    try {
      const res = await api.getShowAttendantName();
      setShowAttendantName(res.data.showAttendantName);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const loadCustomWebhookUrl = async () => {
    try {
      const res = await api.getCustomWebhookUrl();
      setCustomWebhookUrl(res.data.customUrl || '');
    } catch (error) {
      console.error('Erro ao carregar URL customizada:', error);
    }
  };

  const handleSaveCustomUrl = async () => {
    try {
      if (!customWebhookUrl.trim()) {
        alert('Digite uma URL válida');
        return;
      }

      setSavingCustomUrl(true);
      await api.setCustomWebhookUrl(customWebhookUrl.trim());
      await loadTunnelStatus(); // Recarregar status do tunnel
      setEditingCustomUrl(false);
      alert('URL customizada salva! Os webhooks agora usarão esta URL.');
    } catch (error: any) {
      alert('Erro ao salvar URL: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingCustomUrl(false);
    }
  };

  const handleClearCustomUrl = async () => {
    if (!confirm('Remover URL customizada? O sistema voltará a usar o Cloudflare Tunnel.')) {
      return;
    }

    try {
      setSavingCustomUrl(true);
      await api.clearCustomWebhookUrl();
      setCustomWebhookUrl('');
      setEditingCustomUrl(false);
      await loadTunnelStatus(); // Recarregar status do tunnel
      alert('URL customizada removida. Voltando a usar Cloudflare Tunnel.');
    } catch (error: any) {
      alert('Erro ao remover URL: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingCustomUrl(false);
    }
  };

  const handleToggleShowAttendantName = async (checked: boolean) => {
    try {
      setShowAttendantName(checked);
      await api.setShowAttendantName(checked);
    } catch (error: any) {
      console.error('Erro ao atualizar configuração:', error);
      setShowAttendantName(!checked); // Reverter em caso de erro
      alert('Erro ao atualizar configuração: ' + (error.response?.data?.error || error.message));
    }
  };

  const loadAttendanceMessages = async () => {
    try {
      const res = await api.getAttendanceMessageTemplates();
      setWelcomeMessage(res.data.welcomeMessage || '');
      setClosingMessage(res.data.closingMessage || '');
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSaveWelcomeMessage = async () => {
    try {
      setSavingMessages(true);
      await api.setWelcomeMessage(welcomeMessage);
      alert('Mensagem de boas-vindas salva com sucesso!');
    } catch (error: any) {
      alert('Erro ao salvar mensagem: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingMessages(false);
    }
  };

  const handleSaveClosingMessage = async () => {
    try {
      setSavingMessages(true);
      await api.setClosingMessage(closingMessage);
      alert('Mensagem de encerramento salva com sucesso!');
    } catch (error: any) {
      alert('Erro ao salvar mensagem: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingMessages(false);
    }
  };

  const handleSaveAttendant = async () => {
    try {
      if (!attendantForm.name || !attendantForm.sector) {
        alert('Nome e setor são obrigatórios');
        return;
      }

      setLoadingAttendants(true);

      if (editingAttendant) {
        await api.updateAttendant(editingAttendant.id, attendantForm);
      } else {
        await api.createAttendant(attendantForm);
      }

      await loadAttendants();
      setShowAttendantModal(false);
      setEditingAttendant(null);
      setAttendantForm({ name: '', sector: '', email: '', active: true });
    } catch (error: any) {
      alert('Erro ao salvar atendente: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingAttendants(false);
    }
  };

  const handleEditAttendant = (attendant: any) => {
    setEditingAttendant(attendant);
    setAttendantForm({
      name: attendant.name,
      sector: attendant.sector,
      email: attendant.email || '',
      active: attendant.active,
    });
    setShowAttendantModal(true);
  };

  const handleDeleteAttendant = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este atendente?')) return;

    try {
      setLoadingAttendants(true);
      await api.deleteAttendant(id);
      await loadAttendants();
    } catch (error: any) {
      alert('Erro ao excluir atendente: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingAttendants(false);
    }
  };

  const openNewAttendantModal = () => {
    setEditingAttendant(null);
    setAttendantForm({ name: '', sector: '', email: '', active: true });
    setShowAttendantModal(true);
  };

  const handleClearLogs = async () => {
    try {
      await api.clearWebhookLogs();
      setWebhookLogs([]);
      setWebhookStats({ total: 0, last5min: 0, byType: {} });
    } catch {}
  };

  const handleRestartTunnel = async () => {
    setTunnelLoading(true);
    setTunnelAction(null);
    try {
      const res = await api.restartTunnel();
      setTunnelAction(res.data.message);
      await loadTunnelStatus();
    } catch (err: any) {
      setTunnelAction(err.response?.data?.error || 'Erro ao reiniciar tunnel');
    } finally {
      setTunnelLoading(false);
    }
  };

  const handleUpdateWebhooks = async () => {
    setTunnelLoading(true);
    setTunnelAction(null);
    try {
      const res = await api.updateTunnelWebhooks();
      setTunnelAction(res.data.message);
    } catch (err: any) {
      setTunnelAction(err.response?.data?.error || 'Erro ao atualizar webhooks');
    } finally {
      setTunnelLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSecretKeyChange = (value: string) => {
    setApibrasilConfig(prev => ({ ...prev, secretKey: value, apiType: '', apiName: '' }));
    if (detectTimeoutRef.current) clearTimeout(detectTimeoutRef.current);
    if (value.length >= 30) {
      detectTimeoutRef.current = setTimeout(() => detectApiType(value), 800);
    }
  };

  const detectApiType = async (secretKey: string) => {
    setDetectingType(true);
    try {
      const response = await api.detectApibrasilType(secretKey);
      setApibrasilConfig(prev => ({
        ...prev,
        apiType: response.data.detectedType || '',
        apiName: response.data.apiName || '',
      }));
    } catch {
      setApibrasilConfig(prev => ({ ...prev, apiType: '', apiName: '' }));
    } finally {
      setDetectingType(false);
    }
  };

  const handleSaveApibrasil = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingApibrasil(true);
    setTestStatusApibrasil(null);
    try {
      const response = await api.setApibrasilCredentials(apibrasilConfig);
      setTestStatusApibrasil({ success: true, message: response.data.message || 'Configurações salvas com sucesso!' });
    } catch (error: any) {
      setTestStatusApibrasil({ success: false, message: error.response?.data?.error || 'Erro ao salvar configurações' });
    } finally {
      setLoadingApibrasil(false);
    }
  };

  const handleSaveOpenai = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingOpenai(true);
    setTestStatusOpenai(null);
    try {
      const response = await api.setOpenaiCredentials(openaiConfig);
      setTestStatusOpenai({ success: true, message: response.data.message || 'Configurações salvas com sucesso!' });
    } catch (error: any) {
      setTestStatusOpenai({ success: false, message: error.response?.data?.error || 'Erro ao salvar configurações' });
    } finally {
      setLoadingOpenai(false);
    }
  };

  const handleTestApibrasil = async () => {
    setLoadingApibrasil(true);
    setTestStatusApibrasil(null);
    try {
      const response = await api.testApibrasilConnection();
      setTestStatusApibrasil({ success: response.data.success, message: response.data.message });
    } catch (error: any) {
      setTestStatusApibrasil({ success: false, message: error.response?.data?.error || 'Erro ao testar conexão' });
    } finally {
      setLoadingApibrasil(false);
    }
  };

  const handleTestOpenai = async () => {
    setLoadingOpenai(true);
    setTestStatusOpenai(null);
    try {
      const response = await api.testOpenaiConnection();
      setTestStatusOpenai({ success: response.data.success, message: response.data.message });
    } catch (error: any) {
      setTestStatusOpenai({ success: false, message: error.response?.data?.error || 'Erro ao testar conexão' });
    } finally {
      setLoadingOpenai(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <SettingsIcon size={22} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Gerencie credenciais, integrações e serviços</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const colorMap: Record<string, string> = {
              green: isActive ? 'border-green-500 text-green-600' : '',
              purple: isActive ? 'border-purple-500 text-purple-600' : '',
              orange: isActive ? 'border-orange-500 text-orange-600' : '',
              blue: isActive ? 'border-blue-500 text-blue-600' : '',
            };
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? colorMap[tab.color]
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === 'cloudflare' && (
                  <span className={`w-2 h-2 rounded-full ${tunnel.active ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* ─── APIBrasil ─── */}
        {activeTab === 'apibrasil' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-green-100 rounded-lg">
                <Database className="text-green-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">APIBrasil</h2>
                <p className="text-sm text-gray-500">Credenciais de acesso ao gateway WhatsApp</p>
              </div>
            </div>

            <form onSubmit={handleSaveApibrasil} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={apibrasilConfig.email}
                    onChange={(e) => setApibrasilConfig({ ...apibrasilConfig, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                  <input
                    type="password"
                    value={apibrasilConfig.password}
                    onChange={(e) => setApibrasilConfig({ ...apibrasilConfig, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SecretKey</label>
                <div className="relative">
                  <input
                    type="password"
                    value={apibrasilConfig.secretKey}
                    onChange={(e) => handleSecretKeyChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none pr-10"
                    placeholder="f87eb607-a8cc-43ea-b439-..."
                  />
                  {detectingType && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Encontrada no painel da APIBrasil</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de API</label>
                {apibrasilConfig.apiType ? (
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 flex-1 ${
                      apibrasilConfig.apiType === 'whatsapp'
                        ? 'border-green-500 bg-green-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}>
                      <Wifi size={16} className={apibrasilConfig.apiType === 'whatsapp' ? 'text-green-600' : 'text-blue-600'} />
                      <div>
                        <span className={`font-semibold text-sm ${
                          apibrasilConfig.apiType === 'whatsapp' ? 'text-green-700' : 'text-blue-700'
                        }`}>
                          {apibrasilConfig.apiType === 'whatsapp' ? 'WhatsApp (WPP)' : 'Baileys (Evolution API)'}
                        </span>
                        {apibrasilConfig.apiName && (
                          <p className={`text-xs ${apibrasilConfig.apiType === 'whatsapp' ? 'text-green-600' : 'text-blue-600'}`}>
                            {apibrasilConfig.apiName}
                          </p>
                        )}
                      </div>
                      <CheckCircle size={16} className={`ml-auto ${apibrasilConfig.apiType === 'whatsapp' ? 'text-green-500' : 'text-blue-500'}`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setApibrasilConfig(prev => ({
                        ...prev,
                        apiType: prev.apiType === 'whatsapp' ? 'baileys' : 'whatsapp',
                        apiName: '',
                      }))}
                      className="px-3 py-2.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setApibrasilConfig(prev => ({ ...prev, apiType: 'whatsapp' }))}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all border-gray-200 hover:border-green-300 text-gray-600 hover:bg-green-50"
                    >
                      <Wifi size={16} />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setApibrasilConfig(prev => ({ ...prev, apiType: 'baileys' }))}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all border-gray-200 hover:border-blue-300 text-gray-600 hover:bg-blue-50"
                    >
                      <Wifi size={16} />
                      <span className="text-sm font-medium">Baileys</span>
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {detectingType
                    ? 'Detectando tipo automaticamente...'
                    : apibrasilConfig.apiType
                      ? 'Detectado automaticamente pela SecretKey'
                      : 'Preencha a SecretKey para detecção automática ou selecione manualmente'}
                </p>
              </div>

              {testStatusApibrasil && (
                <div className={`flex items-center gap-2 p-3.5 rounded-lg ${
                  testStatusApibrasil.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {testStatusApibrasil.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  <span className="text-sm">{testStatusApibrasil.message}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loadingApibrasil}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Save size={16} />
                  {loadingApibrasil ? 'Salvando...' : 'Salvar Credenciais'}
                </button>
                <button
                  type="button"
                  onClick={handleTestApibrasil}
                  disabled={loadingApibrasil}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {loadingApibrasil ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>
            </form>

            <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-800">
                Não tem conta? Cadastre-se em{' '}
                <a href="https://apibrasil.com.br" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  apibrasil.com.br
                </a>
              </p>
            </div>
          </div>
        )}

        {/* ─── IA / OpenAI ─── */}
        {activeTab === 'ia' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-purple-100 rounded-lg">
                <Sparkles className="text-purple-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Inteligência Artificial</h2>
                <p className="text-sm text-gray-500">Configuração do OpenAI para bots e geração de diálogos</p>
              </div>
            </div>

            <form onSubmit={handleSaveOpenai} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={openaiConfig.apiKey}
                  onChange={(e) => setOpenaiConfig({ ...openaiConfig, apiKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  placeholder="sk-proj-..."
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Chave de API do OpenAI</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Modelo Padrão</label>
                <select
                  value={openaiConfig.model}
                  onChange={(e) => setOpenaiConfig({ ...openaiConfig, model: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Rápido e econômico)</option>
                  <option value="gpt-4o">GPT-4o (Melhor qualidade)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais barato)</option>
                </select>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Onde é utilizado</h4>
                <ul className="text-xs text-purple-700 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Bots de atendimento automático
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Geração de conversas de aquecimento
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Respostas automáticas a mensagens recebidas
                  </li>
                </ul>
              </div>

              {testStatusOpenai && (
                <div className={`flex items-center gap-2 p-3.5 rounded-lg ${
                  testStatusOpenai.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {testStatusOpenai.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  <span className="text-sm">{testStatusOpenai.message}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loadingOpenai}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Save size={16} />
                  {loadingOpenai ? 'Salvando...' : 'Salvar Configuração'}
                </button>
                <button
                  type="button"
                  onClick={handleTestOpenai}
                  disabled={loadingOpenai}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {loadingOpenai ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>
            </form>

            <div className="mt-5 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-800">
                Obtenha sua API Key em{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  platform.openai.com/api-keys
                </a>
                {' '}&mdash; O modelo GPT-4o Mini é recomendado por ter melhor custo-benefício.
              </p>
            </div>
          </div>
        )}

        {/* ─── Cloudflare Tunnel ─── */}
        {activeTab === 'cloudflare' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${tunnel.active ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <Globe className={tunnel.active ? 'text-orange-600' : 'text-gray-400'} size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Cloudflare Tunnel</h2>
                  <p className="text-sm text-gray-500">URL pública para receber webhooks</p>
                </div>
              </div>
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                tunnel.active
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${tunnel.active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {tunnel.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {/* ─── URL Customizada ─── */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link size={16} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-900">URL Customizada (Opcional)</h3>
                </div>
                {customWebhookUrl && !editingCustomUrl && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    Em uso
                  </span>
                )}
              </div>
              
              <p className="text-xs text-blue-700 mb-3">
                Configure uma URL customizada para sobrescrever o Cloudflare Tunnel. Útil se você usa ngrok, localtunnel ou outro serviço.
              </p>

              {editingCustomUrl ? (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={customWebhookUrl}
                    onChange={(e) => setCustomWebhookUrl(e.target.value)}
                    placeholder="https://seu-dominio.com"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCustomUrl}
                      disabled={savingCustomUrl}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save size={14} />
                      {savingCustomUrl ? 'Salvando...' : 'Salvar URL'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCustomUrl(false);
                        loadCustomWebhookUrl(); // Recarregar valor original
                      }}
                      disabled={savingCustomUrl}
                      className="px-3 py-2 border border-blue-300 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {customWebhookUrl ? (
                    <>
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg">
                        <Globe size={14} className="text-blue-600 shrink-0" />
                        <span className="text-sm text-gray-800 font-mono truncate">{customWebhookUrl}</span>
                      </div>
                      <button
                        onClick={() => setEditingCustomUrl(true)}
                        className="p-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={handleClearCustomUrl}
                        disabled={savingCustomUrl}
                        className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingCustomUrl(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={14} />
                      Adicionar URL Customizada
                    </button>
                  )}
                </div>
              )}
            </div>

            {tunnel.active && tunnel.url ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">URL Pública</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <Globe size={16} className="text-orange-500 shrink-0" />
                      <span className="text-sm text-gray-800 font-mono truncate">{tunnel.url}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(tunnel.url!, 'url')}
                      className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Copiar"
                    >
                      {copiedField === 'url' ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                    <a
                      href={tunnel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Abrir"
                    >
                      <ExternalLink size={16} className="text-gray-400" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URLs dos Webhooks</label>
                  <div className="space-y-2">
                    {[
                      { label: 'Mensagens', url: tunnel.webhookMessage, key: 'message', color: 'text-green-600 bg-green-50' },
                      { label: 'Status', url: tunnel.webhookStatus, key: 'status', color: 'text-blue-600 bg-blue-50' },
                      { label: 'Conexão', url: tunnel.webhookConnect, key: 'connect', color: 'text-purple-600 bg-purple-50' },
                      { label: 'QR Code', url: tunnel.webhookQrcode, key: 'qrcode', color: 'text-amber-600 bg-amber-50' },
                    ].map((wh) => (
                      <div key={wh.key} className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium w-24 text-center ${wh.color}`}>
                          {wh.label}
                        </span>
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <Link size={13} className="text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-600 font-mono truncate">{wh.url}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(wh.url!, `wh-${wh.key}`)}
                          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                          title="Copiar"
                        >
                          {copiedField === `wh-${wh.key}` ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Configurados automaticamente nos devices da APIBrasil
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleRestartTunnel}
                    disabled={tunnelLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {tunnelLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Reiniciar Tunnel
                  </button>
                  <button
                    onClick={handleUpdateWebhooks}
                    disabled={tunnelLoading}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {tunnelLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Atualizar Webhooks
                  </button>
                </div>

                {tunnelAction && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
                    <CheckCircle size={16} />
                    <span className="text-sm">{tunnelAction}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Globe size={24} className="text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-700 mb-1">Tunnel não está ativo</h3>
                <p className="text-sm text-gray-500 mb-4">
                  O Cloudflare Tunnel inicia automaticamente com o servidor.
                </p>
                <button
                  onClick={handleRestartTunnel}
                  disabled={tunnelLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {tunnelLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Iniciar Tunnel
                </button>
                {tunnelAction && (
                  <div className="mt-3 inline-flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <XCircle size={16} />
                    {tunnelAction}
                  </div>
                )}
              </div>
            )}

            {/* ─── Webhook Logs ─── */}
            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-orange-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Log de Webhooks Recebidos</h3>
                  {webhookStats.total > 0 && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      {webhookStats.total} total
                    </span>
                  )}
                  {webhookStats.last5min > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {webhookStats.last5min} nos últimos 5min
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadWebhookLogs}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Atualizar logs"
                  >
                    <RefreshCw size={14} className="text-gray-400" />
                  </button>
                  {webhookLogs.length > 0 && (
                    <button
                      onClick={handleClearLogs}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                      title="Limpar logs"
                    >
                      <Trash2 size={14} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contadores por tipo */}
              {webhookStats.total > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {([
                    { type: 'message', label: 'Mensagens', icon: MessageSquare, bg: 'bg-green-50 border-green-200', iconCls: 'text-green-600', numCls: 'text-green-700' },
                    { type: 'status', label: 'Status', icon: Activity, bg: 'bg-blue-50 border-blue-200', iconCls: 'text-blue-600', numCls: 'text-blue-700' },
                    { type: 'connect', label: 'Conexão', icon: Radio, bg: 'bg-purple-50 border-purple-200', iconCls: 'text-purple-600', numCls: 'text-purple-700' },
                    { type: 'qrcode', label: 'QR Code', icon: QrCode, bg: 'bg-amber-50 border-amber-200', iconCls: 'text-amber-600', numCls: 'text-amber-700' },
                  ] as const).map(item => (
                    <div key={item.type} className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${item.bg}`}>
                      <item.icon size={14} className={item.iconCls} />
                      <span className={`text-xs font-medium ${item.numCls}`}>{webhookStats.byType[item.type] || 0}</span>
                      <span className="text-xs text-gray-500">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Lista de logs */}
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="max-h-72 overflow-y-auto p-3 space-y-1 font-mono text-xs" id="webhook-logs-container">
                  {webhookLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity size={20} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhum webhook recebido ainda</p>
                      <p className="text-gray-600 text-[10px] mt-1">Os webhooks aparecerão aqui em tempo real</p>
                    </div>
                  ) : (
                    webhookLogs.map((log) => {
                      const typeConfig: Record<string, { color: string; label: string }> = {
                        message: { color: 'text-green-400', label: 'MSG' },
                        status: { color: 'text-blue-400', label: 'STS' },
                        connect: { color: 'text-purple-400', label: 'CON' },
                        qrcode: { color: 'text-amber-400', label: 'QRC' },
                      };
                      const cfg = typeConfig[log.type] || { color: 'text-gray-400', label: 'UNK' };
                      const time = new Date(log.timestamp).toLocaleTimeString('pt-BR');

                      return (
                        <div
                          key={log.id}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors ${
                            !log.success ? 'bg-red-900/20' : ''
                          }`}
                        >
                          <span className="text-gray-500 shrink-0">{time}</span>
                          <span className={`${cfg.color} font-bold shrink-0 w-8`}>{cfg.label}</span>
                          {log.from && <span className="text-cyan-400 shrink-0">{log.from}</span>}
                          <span className="text-gray-300 truncate flex-1">{log.preview || '—'}</span>
                          {!log.success && <span className="text-red-400 shrink-0">ERRO</span>}
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-800">
                O Cloudflare Tunnel cria uma URL pública temporária (gratuita, sem conta necessária) para que a APIBrasil
                possa enviar webhooks para o seu servidor local. A URL muda a cada reinicialização e os webhooks dos devices
                são atualizados automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* ─── Segurança ─── */}
        {activeTab === 'seguranca' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Shield className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Segurança</h2>
                <p className="text-sm text-gray-500">Informações sobre proteção de dados</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: '🔒',
                  title: 'Criptografia AES-256',
                  desc: 'Todas as credenciais (senhas, API keys, tokens) são criptografadas com AES-256-CBC antes de serem armazenadas no banco de dados.',
                },
                {
                  icon: '🔑',
                  title: 'Bearer Token Automático',
                  desc: 'O Bearer Token da APIBrasil é gerado automaticamente no login e criptografado. Não é necessário gerenciá-lo manualmente.',
                },
                {
                  icon: '🛡️',
                  title: 'JWT Authentication',
                  desc: 'O sistema utiliza JSON Web Tokens com expiração de 7 dias para autenticação. Tokens inválidos são rejeitados automaticamente.',
                },
                {
                  icon: '💾',
                  title: 'Armazenamento Seguro',
                  desc: 'Os dados ficam protegidos no banco MySQL com criptografia em repouso. A chave de criptografia é definida no arquivo .env do servidor.',
                },
                {
                  icon: '🌐',
                  title: 'Tunnel Seguro',
                  desc: 'O Cloudflare Tunnel usa HTTPS por padrão, garantindo que os webhooks trafeguem de forma segura entre a APIBrasil e seu servidor local.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Dica</h4>
              <p className="text-xs text-blue-700">
                Teste as credenciais da APIBrasil e da OpenAI antes de criar instâncias ou bots. Isso garante que tudo
                está configurado corretamente.
              </p>
            </div>
          </div>
        )}

        {/* Aba: Atendentes */}
        {activeTab === 'atendentes' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Atendentes</h3>
                <p className="text-sm text-gray-500 mt-1">Gerencie os atendentes e seus setores</p>
              </div>
              <button
                onClick={openNewAttendantModal}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <Plus size={18} />
                Novo Atendente
              </button>
            </div>

            {/* Configuração: Mostrar nome do atendente */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    💬 Exibir nome do atendente nas mensagens
                  </h4>
                  <p className="text-xs text-gray-600">
                    Quando ativado, as mensagens enviadas pelo atendente incluirão o nome no formato: *Nome:* Mensagem
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={showAttendantName}
                    onChange={(e) => handleToggleShowAttendantName(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {loadingAttendants && attendants.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
              </div>
            ) : attendants.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <Users size={48} className="text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum atendente cadastrado</h3>
                <p className="text-sm text-gray-500 mb-4">Cadastre atendentes para atribuir atendimentos</p>
                <button
                  onClick={openNewAttendantModal}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Cadastrar Primeiro Atendente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attendants.map((attendant) => (
                  <div
                    key={attendant.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Users size={20} className="text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{attendant.name}</h4>
                          <p className="text-sm text-gray-500">{attendant.sector}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {attendant.active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>

                    {attendant.email && (
                      <p className="text-sm text-gray-600 mb-3 truncate" title={attendant.email}>
                        ✉️ {attendant.email}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleEditAttendant(attendant)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteAttendant(attendant.id)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Mensagens de Atendimento ─── */}
        {activeTab === 'mensagens' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-pink-100 rounded-lg">
                <MessageSquare className="text-pink-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Mensagens de Atendimento</h2>
                <p className="text-sm text-gray-500">Configure mensagens automáticas com variáveis dinâmicas</p>
              </div>
            </div>

            {/* Info sobre variáveis */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Variáveis Disponíveis</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">{'{atendente}'}</code>
                  <span className="text-blue-700">Nome do atendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">{'{protocolo}'}</code>
                  <span className="text-blue-700">Número do protocolo</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">{'{telefone}'}</code>
                  <span className="text-blue-700">Telefone do cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">{'{data}'}</code>
                  <span className="text-blue-700">Data atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">{'{hora}'}</code>
                  <span className="text-blue-700">Hora atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">{'{assunto}'}</code>
                  <span className="text-blue-700">Assunto do atendimento</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Mensagem de Boas-vindas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Boas-vindas (ao iniciar atendimento)
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none font-mono"
                  placeholder="Digite a mensagem de boas-vindas..."
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Enviada automaticamente quando um atendente aceita o chamado
                  </p>
                  <button
                    onClick={handleSaveWelcomeMessage}
                    disabled={savingMessages}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={14} />
                    {savingMessages ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>

              {/* Mensagem de Encerramento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Encerramento (ao fechar atendimento)
                </label>
                <textarea
                  value={closingMessage}
                  onChange={(e) => setClosingMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none font-mono"
                  placeholder="Digite a mensagem de encerramento..."
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Enviada automaticamente quando o atendimento é finalizado
                  </p>
                  <button
                    onClick={handleSaveClosingMessage}
                    disabled={savingMessages}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={14} />
                    {savingMessages ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">💡 Exemplo de uso</h3>
                <div className="space-y-2 text-xs text-gray-700">
                  <p>
                    <strong>Template:</strong> <code className="bg-white px-1 py-0.5 rounded">Olá! Seu atendimento foi aceito por {'{atendente}'}. Protocolo: {'{protocolo}'}</code>
                  </p>
                  <p>
                    <strong>Resultado:</strong> <code className="bg-white px-1 py-0.5 rounded">Olá! Seu atendimento foi aceito por José Silva. Protocolo: A10-2626218-323808</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Atendente */}
      {showAttendantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAttendant ? 'Editar Atendente' : 'Novo Atendente'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={attendantForm.name}
                  onChange={(e) => setAttendantForm({ ...attendantForm, name: e.target.value })}
                  placeholder="Nome completo do atendente"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={attendantForm.sector}
                  onChange={(e) => setAttendantForm({ ...attendantForm, sector: e.target.value })}
                  placeholder="Ex: Suporte, Vendas, Financeiro"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={attendantForm.email}
                  onChange={(e) => setAttendantForm({ ...attendantForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attendantActive"
                  checked={attendantForm.active}
                  onChange={(e) => setAttendantForm({ ...attendantForm, active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="attendantActive" className="text-sm font-medium text-gray-700">
                  Atendente ativo
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAttendantModal(false);
                  setEditingAttendant(null);
                  setAttendantForm({ name: '', sector: '', email: '', active: true });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAttendant}
                disabled={loadingAttendants}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAttendants ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
