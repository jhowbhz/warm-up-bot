import Instance from '../models/Instance';
import apiBrasilService from './apibrasil.service';
import { EventEmitter } from 'events';
import { Op } from 'sequelize';

class StatusMonitorService extends EventEmitter {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private pollIntervalMs = 30_000;

  start(intervalMs?: number) {
    if (this.running) return;
    if (intervalMs) this.pollIntervalMs = intervalMs;

    this.running = true;
    console.log(`[StatusMonitor] Iniciado – polling a cada ${this.pollIntervalMs / 1000}s`);

    this.checkAll();
    this.intervalId = setInterval(() => this.checkAll(), this.pollIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log('[StatusMonitor] Parado');
  }

  private async checkAll() {
    try {
      const instances = await Instance.findAll({
        where: {
          deviceToken: { [Op.ne]: null as any },
          status: { [Op.ne]: 'banned' as any },
        },
      });

      if (instances.length === 0) return;

      const results = await Promise.allSettled(
        instances.map(inst => this.checkOne(inst)),
      );

      const updates: Array<{ id: number; status: string; phone: string }> = [];

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          updates.push(result.value);
        }
      }

      if (updates.length > 0) {
        this.emit('status-update', updates);
      }
    } catch (err: any) {
      console.error('[StatusMonitor] Erro no ciclo de verificação:', err.message);
    }
  }

  private async checkOne(
    instance: Instance,
  ): Promise<{ id: number; status: string; phone: string } | null> {
    try {
      const response = await apiBrasilService.getConnectionState(
        instance.deviceToken!,
        instance.serverType,
      );

      const isConnected = apiBrasilService.parseIsConnected(response, instance.serverType);
      const newStatus = isConnected ? 'connected' : 'disconnected';

      if (newStatus !== instance.status) {
        await instance.update({ status: newStatus });
        console.log(
          `[StatusMonitor] ${instance.name || instance.phone} (${instance.serverType}): ${instance.status} → ${newStatus}`,
        );
        return { id: instance.id, status: newStatus, phone: instance.phone };
      }

      return null;
    } catch (err: any) {
      if (instance.status === 'connected') {
        await instance.update({ status: 'disconnected' });
        console.warn(
          `[StatusMonitor] ${instance.name || instance.phone}: erro na verificação – marcando como disconnected`,
        );
        return { id: instance.id, status: 'disconnected', phone: instance.phone };
      }
      return null;
    }
  }
}

export const statusMonitorService = new StatusMonitorService();
