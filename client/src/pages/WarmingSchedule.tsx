import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import PhaseProgress from '../components/PhaseProgress';

const SCHEDULE = [
  { day: 1, conversations: 10, interval: 60 },
  { day: 2, conversations: 20, interval: 30 },
  { day: 3, conversations: 30, interval: 20 },
  { day: 4, conversations: 40, interval: 15 },
  { day: 5, conversations: 50, interval: 10 },
  { day: 6, conversations: 60, interval: 8 },
  { day: 7, conversations: 70, interval: 7 },
  { day: 8, conversations: 80, interval: 6 },
];

export default function WarmingSchedule() {
  const api = useApi();
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const response = await api.getInstances();
      setInstances(response.data);
      if (response.data.length > 0) {
        setSelectedInstance(response.data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Cronograma de Aquecimento</h1>

      {instances.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma instância cadastrada.</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Instância
            </label>
            <select
              value={selectedInstance?.id}
              onChange={(e) => {
                const instance = instances.find(i => i.id === Number(e.target.value));
                setSelectedInstance(instance);
              }}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name || instance.phone}
                </option>
              ))}
            </select>
          </div>

          {selectedInstance && (
            <div className="mb-8">
              <PhaseProgress currentDay={selectedInstance.currentDay} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Cronograma (Baseado no PDF - Dias 1-8)
              </h2>
            </div>
            <div className="divide-y">
              {SCHEDULE.map((day) => {
                const isCurrentDay = selectedInstance?.currentDay === day.day;
                const isCompleted = selectedInstance?.currentDay > day.day;

                return (
                  <div
                    key={day.day}
                    className={`px-6 py-4 flex items-center justify-between ${
                      isCurrentDay
                        ? 'bg-green-50 border-l-4 border-green-500'
                        : isCompleted
                        ? 'bg-gray-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrentDay
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {day.day}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Dia {day.day}</p>
                        <p className="text-sm text-gray-600">
                          {day.conversations} conversas • Intervalo: {day.interval}min
                        </p>
                      </div>
                    </div>
                    {isCurrentDay && (
                      <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                        Em andamento
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-full">
                        Concluído
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
