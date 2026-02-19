import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('esquenta_chip_token');
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthRoute = err.config?.url?.includes('/auth/');
    const isTunnelRoute = err.config?.url?.includes('/tunnel');
    const isSseRoute = err.config?.url?.includes('/sse');

    if (err.response?.status === 401 && !isAuthRoute && !isTunnelRoute && !isSseRoute) {
      localStorage.removeItem('esquenta_chip_token');
      localStorage.removeItem('esquenta_chip_user');
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(err);
  },
);

export const useApi = () => {
  // Instances
  const getInstances = () => api.get('/instances');
  const getInstance = (id: number) => api.get(`/instances/${id}`);
  const createInstance = (data: any) => api.post('/instances', data);
  const updateInstance = (id: number, data: any) => api.put(`/instances/${id}`, data);
  const deleteInstance = (id: number) => api.delete(`/instances/${id}`);
  const connectInstance = (id: number) => api.post(`/instances/${id}/connect`);
  const getInstanceStatus = (id: number) => api.get(`/instances/${id}/status`);
  const startWarming = (id: number) => api.post(`/instances/${id}/start-warming`);
  const pauseWarming = (id: number) => api.post(`/instances/${id}/pause-warming`);
  const listServers = () => api.get('/instances/servers/list');

  // Contacts
  const getContacts = () => api.get('/contacts');
  const getContact = (id: number) => api.get(`/contacts/${id}`);
  const createContact = (data: any) => api.post('/contacts', data);
  const updateContact = (id: number, data: any) => api.put(`/contacts/${id}`, data);
  const deleteContact = (id: number) => api.delete(`/contacts/${id}`);

  // Metrics
  const getInstanceMetrics = (instanceId: number, days = 7) => 
    api.get(`/metrics/instance/${instanceId}`, { params: { days } });
  const getTodayMetrics = () => api.get('/metrics/today');
  const getStats = () => api.get('/metrics/stats');

  // Settings
  const getSettings = () => api.get('/settings');
  const getCurrentCredentials = () => api.get('/settings/credentials/current');
  const getSetting = (key: string) => api.get(`/settings/${key}`);
  const setSetting = (data: any) => api.post('/settings', data);
  const setApibrasilCredentials = (data: any) => api.post('/settings/apibrasil', data);
  const setOpenaiCredentials = (data: any) => api.post('/settings/openai', data);
  const testApibrasilConnection = () => api.post('/settings/apibrasil/test');
  const detectApibrasilType = (secretKey: string) => api.post('/settings/apibrasil/detect-type', { secretKey });
  const testOpenaiConnection = () => api.post('/settings/openai/test');
  const getShowAttendantName = () => api.get('/settings/attendance/show-name');
  const setShowAttendantName = (showAttendantName: boolean) => api.post('/settings/attendance/show-name', { showAttendantName });
  const getCustomWebhookUrl = () => api.get('/settings/webhook/custom-url');
  const setCustomWebhookUrl = (url: string) => api.post('/settings/webhook/custom-url', { url });
  const clearCustomWebhookUrl = () => api.delete('/settings/webhook/custom-url');
  const getAttendanceMessageTemplates = () => api.get('/settings/attendance/messages');
  const setWelcomeMessage = (message: string) => api.post('/settings/attendance/welcome-message', { message });
  const setClosingMessage = (message: string) => api.post('/settings/attendance/closing-message', { message });

  // Tunnel
  const getTunnelStatus = () => api.get('/tunnel');
  const restartTunnel = () => api.post('/tunnel/restart');
  const updateTunnelWebhooks = () => api.post('/tunnel/update-webhooks');
  const getWebhookLogs = () => api.get('/tunnel/logs');
  const clearWebhookLogs = () => api.delete('/tunnel/logs');

  // Bots
  const getBots = () => api.get('/bots');
  const getBot = (id: number) => api.get(`/bots/${id}`);
  const createBot = (data: any) => api.post('/bots', data);
  const updateBot = (id: number, data: any) => api.put(`/bots/${id}`, data);
  const deleteBot = (id: number) => api.delete(`/bots/${id}`);
  const toggleBot = (id: number) => api.patch(`/bots/${id}/toggle`);
  const testBot = (id: number, message: string) => api.post(`/bots/${id}/test`, { message });

  // Attendances
  const getAttendances = (status?: string) => api.get('/attendances', { params: status ? { status } : {} });
  const getAttendance = (id: number) => api.get(`/attendances/${id}`);
  const updateAttendanceStatus = (id: number, status: string, closedBy?: string, attendantName?: string) => 
    api.patch(`/attendances/${id}/status`, { status, closedBy, attendantName });
  const deleteAttendance = (id: number) => api.delete(`/attendances/${id}`);
  const getAttendanceMessages = (id: number) => api.get(`/attendances/${id}/messages`);
  const sendAttendanceMessage = (id: number, content: string) => 
    api.post(`/attendances/${id}/messages`, { content });

  // Attendants
  const getAttendants = (active?: boolean) => api.get('/attendants', { params: active !== undefined ? { active } : {} });
  const getAttendant = (id: number) => api.get(`/attendants/${id}`);
  const createAttendant = (data: any) => api.post('/attendants', data);
  const updateAttendant = (id: number, data: any) => api.put(`/attendants/${id}`, data);
  const deleteAttendant = (id: number) => api.delete(`/attendants/${id}`);

  return {
    getInstances,
    getInstance,
    createInstance,
    updateInstance,
    deleteInstance,
    connectInstance,
    getInstanceStatus,
    startWarming,
    pauseWarming,
    listServers,
    getContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    getInstanceMetrics,
    getTodayMetrics,
    getStats,
    getSettings,
    getCurrentCredentials,
    getSetting,
    setSetting,
    setApibrasilCredentials,
    setOpenaiCredentials,
    testApibrasilConnection,
    detectApibrasilType,
    testOpenaiConnection,
    getShowAttendantName,
    setShowAttendantName,
    getCustomWebhookUrl,
    setCustomWebhookUrl,
    clearCustomWebhookUrl,
    getAttendanceMessageTemplates,
    setWelcomeMessage,
    setClosingMessage,
    getTunnelStatus,
    restartTunnel,
    updateTunnelWebhooks,
    getWebhookLogs,
    clearWebhookLogs,
    getBots,
    getBot,
    createBot,
    updateBot,
    deleteBot,
    toggleBot,
    testBot,
    getAttendances,
    getAttendance,
    updateAttendanceStatus,
    deleteAttendance,
    getAttendanceMessages,
    sendAttendanceMessage,
    getAttendants,
    getAttendant,
    createAttendant,
    updateAttendant,
    deleteAttendant,
  };
};
