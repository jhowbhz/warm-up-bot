interface PhaseProgressProps {
  currentDay: number;
  maxDays?: number;
}

export default function PhaseProgress({ currentDay, maxDays = 8 }: PhaseProgressProps) {
  const progress = (currentDay / maxDays) * 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Progresso do Aquecimento</h3>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Dia {currentDay} de {maxDays}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-8 gap-1">
        {Array.from({ length: maxDays }, (_, i) => (
          <div
            key={i}
            className={`h-2 rounded ${
              i < currentDay ? 'bg-green-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
