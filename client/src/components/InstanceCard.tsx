import { Smartphone, Play, Pause, Trash2 } from 'lucide-react';

interface InstanceCardProps {
  instance: any;
  onStartWarming: (id: number) => void;
  onPauseWarming: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function InstanceCard({
  instance,
  onStartWarming,
  onPauseWarming,
  onDelete,
}: InstanceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'banned':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'manual':
        return 'Manual';
      case 'auto_warming':
        return 'Aquecendo';
      case 'sending':
        return 'Envios';
      default:
        return phase;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-full">
            <Smartphone className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {instance.name || instance.phone}
            </h3>
            <p className="text-sm text-gray-500">{instance.phone}</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)}`} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span className="font-medium">{instance.status}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Fase:</span>
          <span className="font-medium">{getPhaseLabel(instance.currentPhase)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Dia:</span>
          <span className="font-medium">{instance.currentDay}/8</span>
        </div>
      </div>

      <div className="flex gap-2">
        {instance.currentPhase === 'auto_warming' ? (
          <button
            onClick={() => onPauseWarming(instance.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Pause size={16} />
            Pausar
          </button>
        ) : (
          <button
            onClick={() => onStartWarming(instance.id)}
            disabled={instance.status !== 'connected'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            Iniciar
          </button>
        )}
        <button
          onClick={() => onDelete(instance.id)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
