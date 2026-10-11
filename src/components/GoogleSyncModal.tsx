import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  FileSpreadsheet,
  Zap,
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { GoogleSyncSettings, fetchGoogleSheetResponses } from '../utils/googleFormScraper';
import { Participant } from '../types';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncSettings: GoogleSyncSettings;
  onSaveSyncSettings: (settings: GoogleSyncSettings) => void;
  onSyncCompleted: (participants: Participant[]) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  syncSettings,
  onSaveSyncSettings,
  onSyncCompleted,
}) => {
  const [sheetUrl, setSheetUrl] = useState(syncSettings.sheetUrl);
  const [autoSync, setAutoSync] = useState(syncSettings.autoSync);
  const [syncInterval, setSyncInterval] = useState(syncSettings.syncIntervalSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const handleFetchNow = async () => {
    if (!sheetUrl.trim()) {
      setStatusMessage({ text: 'Please enter your Google Sheet link or ID.', isError: true });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const fetched = await fetchGoogleSheetResponses(sheetUrl);
      if (fetched.length === 0) {
        setStatusMessage({ text: 'Connected successfully, but no response rows were found in the sheet.', isError: false });
      } else {
        onSyncCompleted(fetched);
        setStatusMessage({ text: `Successfully fetched and loaded ${fetched.length} participant responses!`, isError: false });
      }

      onSaveSyncSettings({
        sheetUrl,
        autoSync,
        syncIntervalSeconds: syncInterval
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `Error fetching sheet: ${err.message || 'Make sure the sheet has link sharing set to "Anyone with the link can view"'}.`,
        isError: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    onSaveSyncSettings({
      sheetUrl,
      autoSync,
      syncIntervalSeconds: syncInterval
    });
    onClose();
  };

  const scriptCode = `function onFormSubmit(e) {
  var itemResponses = e.response.getItemResponses();
  var data = {};
  for (var i = 0; i < itemResponses.length; i++) {
    data[itemResponses[i].getItem().getTitle()] = itemResponses[i].getResponse();
  }
  // Send instant webhook to your portal
  try {
    UrlFetchApp.fetch('http://localhost:3000/api/webhook', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    });
  } catch (err) {}
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <RefreshCw className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Google Form Live Response Sync</h3>
              <p className="text-xs text-emerald-100">Automatically pull participant submissions into your certificate dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Method 1: Google Sheet Live Fetch */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Method 1: Live Sync via Linked Google Sheet</span>
              </h4>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                RECOMMENDED
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              When participants submit your Google Form, Google automatically adds each response to its linked spreadsheet.
              Just paste that Google Sheet link here to fetch all responses anytime!
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Google Sheet URL or Sheet ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={handleFetchNow}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Fetching...' : 'Fetch Now'}</span>
                </button>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  statusMessage.isError
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Auto-Sync Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
                <p className="font-bold text-slate-800">Background Auto-Sync</p>
                <p className="text-slate-500 text-[11px]">Continuously check for new form submissions while you have the portal open</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  disabled={!autoSync}
                  className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-xs text-slate-700"
                >
                  <option value={10}>Every 10s</option>
                  <option value={15}>Every 15s</option>
                  <option value={30}>Every 30s</option>
                  <option value={60}>Every 1 min</option>
                </select>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Method 2: Instant Google Apps Script Webhook */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Method 2: Instant Push Webhook (Optional)</span>
              </h4>
              <button
                onClick={copyScript}
                className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold text-[11px] hover:bg-slate-50"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
              </button>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Want the site to receive submissions <strong>in real time the exact second</strong> a participant clicks Submit on Google Forms?
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px]">
              <li>In your Google Form, click the 3 dots (⋮) → <strong>Script editor</strong>.</li>
              <li>Paste the script below and click Save.</li>
              <li>Under <strong>Triggers</strong> (alarm clock icon), add a trigger: <em>Event source: From form</em> → <em>Event type: On form submit</em>.</li>
            </ol>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
              {scriptCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
