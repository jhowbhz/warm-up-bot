import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { MessageSquare, Send, Users, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
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
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Instâncias</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.instances?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquare className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {stats?.instances?.connected || 0} conectadas
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aquecendo</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.instances?.warming || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Em processo</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enviadas Hoje</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.today?.messagesSent || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Send className="text-purple-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Mensagens</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recebidas Hoje</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.today?.messagesReceived || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Users className="text-yellow-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Respostas</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Atividade dos Últimos 7 Dias
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={[]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sent" stroke="#10b981" name="Enviadas" />
            <Line type="monotone" dataKey="received" stroke="#6366f1" name="Recebidas" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
