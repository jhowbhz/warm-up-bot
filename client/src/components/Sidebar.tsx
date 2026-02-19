import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import {
  LayoutDashboard,
  Smartphone,
  Calendar,
  Users,
  Bot,
  Headphones,
  Settings as SettingsIcon,
  Flame,
  ChevronRight,
  Signal,
  Globe,
  LogOut,
  User,
  Copy,
  Check,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/instances', label: 'Instâncias', icon: Smartphone },
  { path: '/schedule', label: 'Cronograma', icon: Calendar },
  { path: '/contacts', label: 'Contatos', icon: Users },
  { path: '/bots', label: 'Bots', icon: Bot },
  { path: '/attendances', label: 'Atendimentos', icon: Headphones },
  { path: '/settings', label: 'Configurações', icon: SettingsIcon },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const api = useApi();
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getTunnelStatus()
      .then((res) => { if (res.data?.url) setTunnelUrl(res.data.url); })
      .catch(() => {});

    const es = new EventSource('/api/sse/stream');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'tunnel-connected') setTunnelUrl(data.url);
      } catch {}
    };
    return () => es.close();
  }, []);

  function copyTunnelUrl() {
    if (!tunnelUrl) return;
    navigator.clipboard.writeText(tunnelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <aside className="w-[260px] bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
          <Flame size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold tracking-tight leading-none">
            Warm-up Bot
          </h1>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
            WhatsApp Continue
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 h-px bg-gray-800" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-green-500/15 text-green-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight size={14} className="text-green-400/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Tunnel */}
      <div className="mx-3 mb-2 px-3 py-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={14} className={tunnelUrl ? 'text-green-400' : 'text-gray-500'} />
          <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
            Tunnel
          </span>
          <div className={`ml-auto w-1.5 h-1.5 rounded-full ${tunnelUrl ? 'bg-green-400 shadow-sm shadow-green-400/50 animate-pulse' : 'bg-gray-600'}`} />
        </div>
        {tunnelUrl ? (
          <button
            onClick={copyTunnelUrl}
            className="w-full flex items-center gap-1.5 text-left group"
            title={tunnelUrl}
          >
            <span className="text-[11px] text-gray-400 truncate flex-1 group-hover:text-gray-300 transition-colors">
              {tunnelUrl.replace('https://', '')}
            </span>
            {copied ? (
              <Check size={12} className="text-green-400 shrink-0" />
            ) : (
              <Copy size={12} className="text-gray-600 group-hover:text-gray-400 shrink-0 transition-colors" />
            )}
          </button>
        ) : (
          <span className="text-[11px] text-gray-500">Iniciando...</span>
        )}
      </div>

      {/* User / Logout */}
      <div className="mx-3 mb-4 px-3 py-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
            <User size={14} className="text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-gray-300 font-medium truncate">
              {user?.email || '—'}
            </p>
            <p className="text-[11px] text-gray-500">APIBrasil</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
