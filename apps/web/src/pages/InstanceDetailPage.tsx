import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../components/auth';
import { Tabs, type TabItem } from '../components/Tabs';
import ConsoleView from '../components/ConsoleView';
import RconConsole from '../components/RconConsole';
import FileManager from '../components/FileManager';
import BattleyeConfigEditor from '../components/BattleyeConfigEditor';
import LogsViewer from '../components/LogsViewer';
import SteamCmdPanel from '../components/SteamCmdPanel';
import SchedulerEditor from '../components/SchedulerEditor';

type ProcessState = {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  exitCode: number | null;
  lastExitAt: string | null;
};

type RconState = {
  connected: boolean;
  lastError?: string;
  host?: string;
  port?: number;
};

type InstanceConfig = {
  id: string;
  name: string;
  type: string;
  paths: { root: string; profiles: string; battleyeDir: string; serverConfigFile: string };
  network: { host: string; gamePort: number; rconPort: number };
  process: { exe: string; workingDir: string; args: string[]; gracefulStopCommand?: string };
  steamcmd: { enabled: boolean; steamcmdExe: string; dayzServerAppId: number; dayzWorkshopAppId: number };
  watchdog: { enabled: boolean; restartOnCrash: boolean; restartDelaySeconds: number };
};

export default function InstanceDetailPage(): JSX.Element {
  const { id } = useParams();
  const instanceId = id ?? '';
  const { apiFetch } = useAuth();

  const [cfg, setCfg] = React.useState<InstanceConfig | null>(null);
  const [proc, setProc] = React.useState<ProcessState | null>(null);
  const [rcon, setRcon] = React.useState<RconState | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const tabs: TabItem[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'console', label: 'Console' },
    { key: 'rcon', label: 'RCON' },
    { key: 'files', label: 'Files' },
    { key: 'battleye', label: 'BattlEye' },
    { key: 'logs', label: 'Logs' },
    { key: 'steamcmd', label: 'SteamCMD' },
    { key: 'scheduler', label: 'Scheduler' }
  ];

  const [activeTab, setActiveTab] = React.useState<string>('overview');

  const load = React.useCallback(async () => {
    if (!instanceId) return;
    setLoading(true);
    setError(null);
    try {
      const r1 = await apiFetch(`/api/instances/${instanceId}`);
      if (!r1.ok) throw new Error(await r1.text());
      const d1 = (await r1.json()) as { instance: InstanceConfig };
      setCfg(d1.instance);

      const r2 = await apiFetch(`/api/instances/${instanceId}/status`);
      if (!r2.ok) throw new Error(await r2.text());
      const d2 = (await r2.json()) as { process: ProcessState; rcon: RconState };
      setProc(d2.process);
      setRcon(d2.rcon);
    } catch (err: any) {
      setError(err?.message ?? 'Failed');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, instanceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const startServer = async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/process/start`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Start failed');
    }
  };

  const stopServer = async (force: boolean) => {
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/process/stop`, {
        method: 'POST',
        body: JSON.stringify({ force })
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Stop failed');
    }
  };

  const restartServer = async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/process/restart`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Restart failed');
    }
  };

  if (!instanceId) {
    return (
      <div className="container">
        <div className="card">Missing instanceId</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            <Link to="/instances">Instances</Link> / {instanceId}
          </div>
          <h2 style={{ margin: '6px 0 0 0' }}>{cfg?.name ?? instanceId}</h2>
        </div>

        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Process</div>
            <div className={proc?.running ? 'badge ok' : 'badge warn'}>{proc?.running ? 'RUNNING' : 'STOPPED'}</div>
          </div>

          <button className="btn primary" onClick={() => void startServer()} disabled={proc?.running}>
            Start
          </button>
          <button className="btn" onClick={() => void restartServer()} disabled={!proc?.running}>
            Restart
          </button>
          <button className="btn" onClick={() => void stopServer(false)} disabled={!proc?.running}>
            Stop
          </button>
          <button className="btn" onClick={() => void stopServer(true)} disabled={!proc?.running}>
            Force Stop
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginTop: 12, background: '#3a1a1a', borderColor: '#6a2a2a' }}>
          <span className="mono">{error}</span>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <div className="badge">Host: {cfg?.network.host}</div>
            <div className="badge">Game: {cfg?.network.gamePort}</div>
            <div className="badge">RCON: {cfg?.network.rconPort}</div>
            <div className={rcon?.connected ? 'badge ok' : 'badge warn'}>RCON: {rcon?.connected ? 'CONNECTED' : 'DISCONNECTED'}</div>
          </div>
          <button className="btn" onClick={() => void load()} disabled={loading}>
            Refresh status
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Tabs items={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      <div style={{ marginTop: 12 }}>
        {activeTab === 'overview' ? (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Overview</h3>
            {cfg ? (
              <div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <div className="badge">Root: {cfg.paths.root}</div>
                  <div className="badge">Profiles: {cfg.paths.profiles}</div>
                  <div className="badge">BattlEye: {cfg.paths.battleyeDir}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>Start command args</div>
                  <pre className="mono" style={{ whiteSpace: 'pre-wrap' }}>{cfg.process.args.join(' ')}</pre>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>Process state</div>
                  <pre className="mono">{JSON.stringify(proc, null, 2)}</pre>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>RCON state</div>
                  <pre className="mono">{JSON.stringify(rcon, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </div>
        ) : null}

        {activeTab === 'console' ? <ConsoleView instanceId={instanceId} /> : null}
        {activeTab === 'rcon' ? <RconConsole instanceId={instanceId} /> : null}
        {activeTab === 'files' ? <FileManager instanceId={instanceId} /> : null}
        {activeTab === 'battleye' ? <BattleyeConfigEditor instanceId={instanceId} /> : null}
        {activeTab === 'logs' ? <LogsViewer instanceId={instanceId} /> : null}
        {activeTab === 'steamcmd' ? <SteamCmdPanel instanceId={instanceId} /> : null}
        {activeTab === 'scheduler' ? <SchedulerEditor instanceId={instanceId} /> : null}
      </div>
    </div>
  );
}
