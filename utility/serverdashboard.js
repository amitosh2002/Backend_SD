// const os = require('os');
import os from 'node:os';

export const generateDashboard = ({ title = "Backend Console", accentColor = "#6366f1", customMessage = "" }) => {
  // Core Analytics
  const uptime = process.uptime();
  const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
  const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
  const usedMem = (totalMem - freeMem).toFixed(2);
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(0);

  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <meta http-equiv="refresh" content="10"> <title>${title}</title>
    </head>
    <body class="bg-slate-900 text-slate-100 font-sans p-4 md:p-12">
        <div class="max-w-5xl mx-auto">
            <div class="flex justify-between items-end border-b border-slate-800 pb-6 mb-8">
                <div>
                    <h1 class="text-3xl font-bold" style="color: ${accentColor}">${title}</h1>
                    <p class="text-slate-400 mt-1">${customMessage || 'System Analytics & Health Monitor'}</p>
                </div>
                <div class="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                    LIVE
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <span class="text-slate-500 text-xs font-bold uppercase tracking-wider">Server Uptime</span>
                    <div class="text-2xl font-mono mt-2">${hours}h ${minutes}m</div>
                </div>

                <div class="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 text-xs font-bold uppercase tracking-wider">RAM Usage</span>
                        <span class="text-xs font-mono text-slate-400">${memUsagePercent}%</span>
                    </div>
                    <div class="text-2xl font-mono mt-2">${usedMem} <span class="text-sm text-slate-500">/ ${totalMem} GB</span></div>
                    <div class="w-full bg-slate-900 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div class="h-full rounded-full" style="width: ${memUsagePercent}%; background-color: ${accentColor}"></div>
                    </div>
                </div>

                <div class="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <span class="text-slate-500 text-xs font-bold uppercase tracking-wider">CPU Load (Avg)</span>
                    <div class="text-2xl font-mono mt-2">${os.loadavg()[0].toFixed(2)}</div>
                </div>
            </div>

            <div class="mt-8 bg-slate-800/30 rounded-2xl p-6 border border-slate-800/50">
                <h3 class="text-slate-400 text-sm font-bold mb-4">Environment Info</h3>
                <div class="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div class="text-slate-500">Node Version: <span class="text-slate-200">${process.version}</span></div>
                    <div class="text-slate-500">Platform: <span class="text-slate-200">${os.platform()} (${os.arch()})</span></div>
                    <div class="text-slate-500">CPU: <span class="text-slate-200">${os.cpus()[0].model}</span></div>
                    <div class="text-slate-500">Host: <span class="text-slate-200">${os.hostname()}</span></div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};
;