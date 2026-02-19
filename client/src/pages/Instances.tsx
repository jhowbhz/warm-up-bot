import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useStatusStream } from '../hooks/useStatusStream';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import InstanceCard from '../components/InstanceCard';
import QrCodeModal from '../components/QrCodeModal';
import SearchableSelect from '../components/SearchableSelect';

interface Server {
  server_search: string;
  servername: string;
  type: string;
  health_score: number;
  limit_used: number;
  health?: { score: number };
  [key: string]: any;
}

export default function Instances() {
  const api = useApi();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [currentQrCode, setCurrentQrCode] = useState('');
  const [connectingInstanceId, setConnectingInstanceId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [error, setError] = useState('');
  const [newInstance, setNewInstance] = useState({
    phone: '',
    name: '',
    serverSearch: '',
    serverType: '' as string,
  });

  const handleStatusUpdate = useCallback((updates: Array<{ id: number; status: string }>) => {
    setInstances(prev =>
      prev.map(inst => {
        const update = updates.find(u => u.id === inst.id);
        return update ? { ...inst, status: update.status } : inst;
      }),
    );
  }, []);

  useStatusStream(handleStatusUpdate);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const response = await api.getInstances();
      setInstances(response.data);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServers = async () => {
    setLoadingServers(true);
    try {
      const [serversRes, credentialsRes] = await Promise.all([
        api.listServers(),
        api.getCurrentCredentials(),
      ]);

      const configuredType = credentialsRes.data?.apibrasil?.apiType || '';
      const rawList = Array.isArray(serversRes.data) ? serversRes.data : [];

      const serverList = rawList.filter((s: Server) => {
        if (configuredType) return s.type === configuredType;
        return s.type === 'whatsapp' || s.type === 'baileys';
      });

      serverList.sort((a: Server, b: Server) => (b.health?.score ?? 0) - (a.health?.score ?? 0));
      setServers(serverList);

      if (serverList.length > 0 && !newInstance.serverSearch) {
        setNewInstance(prev => ({ ...prev, serverSearch: serverList[0].server_search, serverType: serverList[0].type }));
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao carregar servidores. Verifique as credenciais da APIBrasil.');
    } finally {
      setLoadingServers(false);
    }
  };

  const handleShowNewForm = () => {
    setShowNewForm(!showNewForm);
    setError('');
    if (!showNewForm && servers.length === 0) {
      loadServers();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await api.createInstance(newInstance);
      setNewInstance({ phone: '', name: '', serverSearch: '', serverType: '' });
      setShowNewForm(false);
      loadInstances();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (id: number) => {
    setConnecting(id);
    setError('');

    try {
      const response = await api.connectInstance(id);
      const qrData = response.data.qrCode;

      if (typeof qrData === 'object' && qrData?.qrcode) {
        setCurrentQrCode(qrData.qrcode);
      } else if (typeof qrData === 'string') {
        setCurrentQrCode(qrData);
      } else {
        setCurrentQrCode(JSON.stringify(qrData));
      }

      setConnectingInstanceId(id);
      setShowQrModal(true);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao conectar instância');
    } finally {
      setConnecting(null);
    }
  };

  const handleCheckStatus = async (id: number): Promise<{ isConnected: boolean }> => {
    try {
      const response = await api.getInstanceStatus(id);
      return { isConnected: !!response.data?.isConnected };
    } catch {
      return { isConnected: false };
    }
  };

  const handleConnected = () => {
    setShowQrModal(false);
    setConnectingInstanceId(null);
    setCurrentQrCode('');
    loadInstances();
  };

  const handleRefreshQr = async () => {
    if (!connectingInstanceId) return;
    try {
      const response = await api.connectInstance(connectingInstanceId);
      const qrData = response.data.qrCode;

      if (typeof qrData === 'object' && qrData?.qrcode) {
        setCurrentQrCode(qrData.qrcode);
      } else if (typeof qrData === 'string') {
        setCurrentQrCode(qrData);
      } else {
        setCurrentQrCode(JSON.stringify(qrData));
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao atualizar QR Code');
    }
  };

  const handleStartWarming = async (id: number) => {
    try {
      await api.startWarming(id);
      loadInstances();
    } catch (error) {
      console.error('Erro ao iniciar aquecimento:', error);
    }
  };

  const handlePauseWarming = async (id: number) => {
    try {
      await api.pauseWarming(id);
      loadInstances();
    } catch (error) {
      console.error('Erro ao pausar aquecimento:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja deletar esta instância?')) {
      try {
        await api.deleteInstance(id);
        loadInstances();
      } catch (error) {
        console.error('Erro ao deletar instância:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Instâncias WhatsApp</h1>
        <div className="flex gap-2">
          <button
            onClick={loadInstances}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleShowNewForm}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Plus size={20} />
            Nova Instância
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {showNewForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Nova Instância</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ao criar, o dispositivo será registrado automaticamente na APIBrasil.
          </p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  placeholder="5531999999999"
                  value={newInstance.phone}
                  onChange={(e) => setNewInstance({ ...newInstance, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Meu WhatsApp"
                  value={newInstance.name}
                  onChange={(e) => setNewInstance({ ...newInstance, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={creating}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servidor APIBrasil
              </label>
              {loadingServers ? (
                <div className="flex items-center gap-2 text-gray-500 py-2">
                  <Loader2 size={18} className="animate-spin" />
                  Carregando servidores...
                </div>
              ) : servers.length > 0 ? (
                <SearchableSelect
                  options={servers.map((server) => ({
                    value: server.server_search,
                    label: `[${server.type.toUpperCase()}] ${server.servername} - Score: ${server.health?.score ?? '?'}% - Uso: ${server.limit_used ?? 0}`,
                  }))}
                  value={newInstance.serverSearch}
                  onChange={(val) => {
                    const selected = servers.find(s => s.server_search === val);
                    setNewInstance({
                      ...newInstance,
                      serverSearch: val,
                      serverType: selected?.type || 'whatsapp',
                    });
                  }}
                  placeholder="Selecione um servidor..."
                  disabled={creating}
                />
              ) : (
                <div className="text-sm text-amber-600 py-2">
                  Nenhum servidor disponível.{' '}
                  <button
                    type="button"
                    onClick={loadServers}
                    className="text-green-600 hover:underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={creating || !newInstance.serverSearch}
              className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Criando na APIBrasil...
                </>
              ) : (
                'Criar Instância'
              )}
            </button>
          </form>
        </div>
      )}

      {instances.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma instância cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance) => (
            <div key={instance.id}>
              <InstanceCard
                instance={instance}
                onStartWarming={handleStartWarming}
                onPauseWarming={handlePauseWarming}
                onDelete={handleDelete}
              />
              {instance.status === 'disconnected' && (
                <button
                  onClick={() => handleConnect(instance.id)}
                  disabled={connecting === instance.id}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                >
                  {connecting === instance.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    'Conectar'
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => {
          setShowQrModal(false);
          setConnectingInstanceId(null);
          setCurrentQrCode('');
          loadInstances();
        }}
        qrCode={currentQrCode}
        instanceId={connectingInstanceId}
        checkStatus={handleCheckStatus}
        onConnected={handleConnected}
        onRefresh={handleRefreshQr}
      />
    </div>
  );
}
