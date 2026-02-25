import { useEffect, useState, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { Headphones, Phone, Clock, CheckCircle2, Trash2, MessageSquare, User, Send, X } from 'lucide-react';

interface AttendanceMessage {
  id: number;
  attendanceId: number;
  direction: 'received' | 'sent';
  content: string;
  senderName: string | null;
  sentAt: string;
}

interface AttendanceData {
  id: number;
  protocol: string;
  instanceId: number;
  botId: number | null;
  phone: string;
  contactName: string | null;
  title: string;
  subject: string;
  context: string | null;
  status: 'waiting' | 'in_progress' | 'closed';
  attendantName: string | null;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  updatedAt: string;
  instance?: { id: number; name: string; phone: string };
  bot?: { id: number; name: string };
}

export default function Attendances() {
  const api = useApi();
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedChat, setSelectedChat] = useState<AttendanceData | null>(null);
  const [messages, setMessages] = useState<AttendanceMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttendantModal, setShowAttendantModal] = useState(false);
  const [attendantName, setAttendantName] = useState('');
  const [selectedAttendantId, setSelectedAttendantId] = useState<number | null>(null);
  const [attendants, setAttendants] = useState<any[]>([]);
  const [pendingAttendanceId, setPendingAttendanceId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadAttendances();
    loadAttendants();
  }, [filterStatus]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      // Poll de mensagens a cada 3 segundos
      pollIntervalRef.current = setInterval(() => {
        loadMessages(selectedChat.id);
      }, 3000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAttendances = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const res = await api.getAttendances(status);
      setAttendances(res.data);
      console.log(`📋 ${res.data.length} atendimentos carregados`);
    } catch (error) {
      console.error('Erro ao carregar atendimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendants = async () => {
    try {
      const res = await api.getAttendants(true); // Somente atendentes ativos
      setAttendants(res.data);
    } catch (error) {
      console.error('Erro ao carregar atendentes:', error);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      if (newStatus === 'in_progress') {
        // Abrir modal para pedir nome do atendente
        setPendingAttendanceId(id);
        setShowAttendantModal(true);
      } else {
        await api.updateAttendanceStatus(id, newStatus, newStatus === 'closed' ? 'Atendente' : undefined);
        await loadAttendances();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const confirmAttendant = async () => {
    if ((!attendantName.trim() && !selectedAttendantId) || !pendingAttendanceId) return;
    try {
      const finalAttendantName = selectedAttendantId 
        ? attendants.find(a => a.id === selectedAttendantId)?.name 
        : attendantName.trim();
      
      await api.updateAttendanceStatus(pendingAttendanceId, 'in_progress', undefined, finalAttendantName);
      setShowAttendantModal(false);
      setAttendantName('');
      setSelectedAttendantId(null);
      setPendingAttendanceId(null);
      await loadAttendances();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    console.log(`🗑️ Tentando deletar atendimento #${id}`);
    
    if (!confirm('Tem certeza que deseja excluir este atendimento?')) {
      console.log('❌ Exclusão cancelada pelo usuário');
      return;
    }
    
    try {
      console.log(`⏳ Deletando atendimento #${id}...`);
      
      // Deletar do backend PRIMEIRO
      const response = await api.deleteAttendance(id);
      console.log('✅ Backend respondeu:', response.data);
      
      // Fechar chat se estiver aberto
      if (selectedChat?.id === id) {
        console.log('🚪 Fechando chat do atendimento deletado');
        setSelectedChat(null);
      }
      
      // Atualizar lista removendo o item deletado
      console.log('🔄 Atualizando lista de atendimentos...');
      setAttendances(prevAttendances => {
        const updated = prevAttendances.filter(a => a.id !== id);
        console.log(`📊 Lista atualizada: ${prevAttendances.length} → ${updated.length} atendimentos`);
        return updated;
      });
      
      console.log(`✅ Atendimento #${id} excluído com sucesso!`);
    } catch (error: any) {
      console.error('❌ Erro ao excluir atendimento:', error);
      console.error('Detalhes:', error.response?.data);
      alert('Erro ao excluir atendimento: ' + (error.response?.data?.error || error.message));
    }
  };

  const loadMessages = async (attendanceId: number) => {
    try {
      const res = await api.getAttendanceMessages(attendanceId);
      setMessages(res.data);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || sending) return;
    
    const messageContent = newMessage.trim();
    const tempId = -Date.now(); // ID temporário negativo para não conflitar
    
    // Criar mensagem temporária para exibir imediatamente
    const tempMessage: AttendanceMessage = {
      id: tempId,
      attendanceId: selectedChat.id,
      direction: 'sent',
      content: messageContent,
      senderName: selectedChat.attendantName || 'Você',
      sentAt: new Date().toISOString(),
    };
    
    // Adicionar mensagem imediatamente ao chat (UI otimista)
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    
    // Enviar em background
    try {
      setSending(true);
      const response = await api.sendAttendanceMessage(selectedChat.id, messageContent);
      
      // Substituir a mensagem temporária pela mensagem real do servidor
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? response.data : msg
      ));
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Remover a mensagem temporária em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      // Restaurar o texto no input
      setNewMessage(messageContent);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const openChat = (attendance: AttendanceData) => {
    setSelectedChat(attendance);
  };

  const closeChat = () => {
    setSelectedChat(null);
    setMessages([]);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      waiting: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Aguardando' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', icon: User, label: 'Em atendimento' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle2, label: 'Fechado' },
    };
    const badge = badges[status] || badges.waiting;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const waitingCount = attendances.filter(a => a.status === 'waiting').length;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Headphones size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Atendimentos Humanos</h1>
              <p className="text-xs text-gray-500">Gerencie solicitações de atendimento manual</p>
            </div>
          </div>
          {waitingCount > 0 && (
            <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
              <span className="text-red-700 font-semibold text-sm">{waitingCount} aguardando</span>
            </div>
          )}
        </div>
      </div>

      {/* Layout Principal: Sidebar + Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Esquerda - Lista de Atendimentos */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Filtros */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {['all', 'waiting', 'in_progress', 'closed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' && 'Todos'}
                  {status === 'waiting' && 'Aguardando'}
                  {status === 'in_progress' && 'Em atendimento'}
                  {status === 'closed' && 'Fechados'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Atendimentos */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-500">Carregando...</p>
              </div>
            ) : attendances.length === 0 ? (
              <div className="p-6 text-center">
                <Headphones size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Nenhum atendimento encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendances.map((attendance) => {
                  try {
                    if (attendance.context) JSON.parse(attendance.context);
                  } catch {}

                  const isSelected = selectedChat?.id === attendance.id;

                  return (
                    <div
                      key={attendance.id}
                      onClick={() => openChat(attendance)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-2 border-blue-500 shadow-md' 
                          : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Phone size={14} className="text-gray-400 flex-shrink-0" />
                            <h3 className="font-semibold text-sm text-gray-900 truncate">
                              {attendance.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">{attendance.phone}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {attendance.protocol}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-2">
                        {getStatusBadge(attendance.status)}
                      </div>

                      {/* Assunto */}
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{attendance.subject}</p>

                      {/* Info */}
                      <div className="text-[10px] text-gray-400">
                        {attendance.attendantName && (
                          <span className="font-medium">👤 {attendance.attendantName} • </span>
                        )}
                        <span>{new Date(attendance.createdAt).toLocaleString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                      </div>

                      {/* Ações rápidas */}
                      <div className="flex items-center gap-1 mt-3">
                        {attendance.status === 'waiting' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(attendance.id, 'in_progress');
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                          >
                            <User size={12} />
                            Iniciar
                          </button>
                        )}
                        {attendance.status === 'in_progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(attendance.id, 'closed');
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors"
                          >
                            <CheckCircle2 size={12} />
                            Fechar
                          </button>
                        )}
                        {attendance.status === 'closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(attendance.id, 'waiting');
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded hover:bg-yellow-600 transition-colors"
                          >
                            <Clock size={12} />
                            Reabrir
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(attendance.id, e)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Área do Chat - Direita */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Header do Chat */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Phone size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{selectedChat.title}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {selectedChat.protocol}
                        </span>
                        {getStatusBadge(selectedChat.status)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {selectedChat.phone}
                        {selectedChat.attendantName && (
                          <span className="ml-2 text-blue-600">• Atendente: {selectedChat.attendantName}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeChat}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Nenhuma mensagem ainda</p>
                    <p className="text-sm text-gray-400 mt-1">As mensagens aparecerão aqui</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-3 ${
                          msg.direction === 'sent'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                        }`}
                      >
                        {msg.direction === 'sent' && msg.senderName && (
                          <p className="text-xs font-semibold mb-1 opacity-90">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <span
                          className={`text-[10px] mt-1 block ${
                            msg.direction === 'sent' ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {new Date(msg.sentAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de Envio */}
              <div className="bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send size={18} />
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum chat selecionado</h3>
                <p className="text-gray-500">Selecione um atendimento na lista à esquerda para iniciar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nome do Atendente */}
      {showAttendantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Iniciar Atendimento</h3>
            
            {attendants.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-4">Selecione um atendente cadastrado ou digite manualmente:</p>
                <select
                  value={selectedAttendantId || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setSelectedAttendantId(id);
                    if (id) setAttendantName('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                >
                  <option value="">Selecione um atendente</option>
                  {attendants.map((att) => (
                    <option key={att.id} value={att.id}>
                      {att.name} - {att.sector}
                    </option>
                  ))}
                </select>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">ou digite manualmente</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600 mb-4">Digite seu nome para iniciar o atendimento:</p>
            )}

            <input
              type="text"
              value={attendantName}
              onChange={(e) => {
                setAttendantName(e.target.value);
                if (e.target.value) setSelectedAttendantId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAttendant();
                if (e.key === 'Escape') {
                  setShowAttendantModal(false);
                  setAttendantName('');
                  setSelectedAttendantId(null);
                  setPendingAttendanceId(null);
                }
              }}
              placeholder="Nome do atendente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              disabled={!!selectedAttendantId}
              autoFocus={attendants.length === 0}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowAttendantModal(false);
                  setAttendantName('');
                  setSelectedAttendantId(null);
                  setPendingAttendanceId(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAttendant}
                disabled={!attendantName.trim() && !selectedAttendantId}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
