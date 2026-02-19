import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, CheckCircle, Loader2, Wifi } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  instanceId: number | null;
  onRefresh?: () => void;
  onConnected?: () => void;
  checkStatus?: (id: number) => Promise<{ isConnected: boolean }>;
}

function isBase64Image(str: string): boolean {
  return str.startsWith('data:image') || str.startsWith('/9j/') || str.startsWith('iVBOR');
}

function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

export default function QrCodeModal({
  isOpen,
  onClose,
  qrCode,
  instanceId,
  onRefresh,
  onConnected,
  checkStatus,
}: QrCodeModalProps) {
  const [connectionState, setConnectionState] = useState<'waiting' | 'checking' | 'connected'>('waiting');
  const [statusMessage, setStatusMessage] = useState('Aguardando leitura do QR Code...');
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen || !instanceId || !checkStatus) {
      return;
    }

    setConnectionState('waiting');
    setStatusMessage('Aguardando leitura do QR Code...');
    setPollCount(0);

    const startPolling = () => {
      intervalRef.current = setInterval(async () => {
        try {
          setConnectionState('checking');
          const result = await checkStatus(instanceId);

          setPollCount(prev => prev + 1);

          if (result.isConnected) {
            setConnectionState('connected');
            setStatusMessage('Conectado com sucesso!');

            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            setTimeout(() => {
              onConnected?.();
            }, 2000);

            return;
          }

          setConnectionState('waiting');
          setStatusMessage('Aguardando leitura do QR Code...');
        } catch {
          setConnectionState('waiting');
        }
      }, 5000);
    };

    const initialDelay = setTimeout(startPolling, 3000);

    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, instanceId]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setConnectionState('waiting');
    setPollCount(0);
    onClose();
  };

  const renderQrCode = () => {
    if (connectionState === 'connected') {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] w-[300px]">
          <CheckCircle size={80} className="text-green-500 mb-4" />
          <p className="text-xl font-bold text-green-600">Conectado!</p>
        </div>
      );
    }

    if (!qrCode) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        </div>
      );
    }

    if (isBase64Image(qrCode)) {
      const src = qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`;
      return <img src={src} alt="QR Code" className="w-[300px] h-[300px]" />;
    }

    if (isUrl(qrCode)) {
      return <img src={qrCode} alt="QR Code" className="w-[300px] h-[300px]" />;
    }

    return <QRCodeSVG value={qrCode} size={300} />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Conectar WhatsApp</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg shadow-inner">
            {renderQrCode()}
          </div>

          {connectionState !== 'connected' && (
            <p className="mt-4 text-center text-gray-600">
              Escaneie este QR Code no WhatsApp:
              <br />
              <span className="text-sm">
                Dispositivos Conectados &rarr; Conectar Dispositivo
              </span>
            </p>
          )}

          <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
            connectionState === 'connected'
              ? 'bg-green-50 text-green-700'
              : connectionState === 'checking'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-gray-50 text-gray-600'
          }`}>
            {connectionState === 'connected' ? (
              <CheckCircle size={16} />
            ) : connectionState === 'checking' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wifi size={16} />
            )}
            <span>{statusMessage}</span>
            {connectionState !== 'connected' && pollCount > 0 && (
              <span className="text-xs text-gray-400">({pollCount})</span>
            )}
          </div>

          {onRefresh && connectionState !== 'connected' && (
            <button
              onClick={onRefresh}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Atualizar QR Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
