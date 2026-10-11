import React, { useState } from 'react';
import { X, ExternalLink, Check, Copy, AlertCircle, Link2, Sparkles, HelpCircle } from 'lucide-react';
import { GoogleFormConfig } from '../types';

interface GoogleFormHookModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleFormConfig;
  onSaveConfig: (config: GoogleFormConfig) => void;
}

export const GoogleFormHookModal: React.FC<GoogleFormHookModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [currentConfig, setCurrentConfig] = useState<GoogleFormConfig>(config);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-parse prefilled URL to extract entry IDs
  const handleParsePrefilledUrl = () => {
    if (!prefilledUrl.trim()) {
      setParseStatus('Please paste your pre-filled link first.');
      return;
    }

    try {
      const url = new URL(prefilledUrl);
      const params = new URLSearchParams(url.search);
      
      // Look for form response URL
      const pathParts = url.pathname.split('/');
      const formIdIndex = pathParts.indexOf('d');
      let extractedFormId = currentConfig.formId;
      if (formIdIndex !== -1 && pathParts[formIdIndex + 1]) {
        extractedFormId = pathParts[formIdIndex + 1];
      }

      // Convert viewform or prefill to formResponse
      const actionUrl = url.origin + url.pathname.replace(/\/viewform.*|\/prefill.*/, '/formResponse');

      const extractedEntries: Record<string, string> = {};
      params.forEach((value, key) => {
        if (key.startsWith('entry.')) {
          extractedEntries[key] = value;
        }
      });

      const entryKeys = Object.keys(extractedEntries);
      if (entryKeys.length === 0) {
        setParseStatus('No "entry.XXXX" parameters found in the URL. Make sure you used "Get pre-filled link".');
        return;
      }

      // Automatically map detected entries sequentially or preserve existing
      const mappings = { ...currentConfig.fieldMappings };
      const fieldOrder: (keyof typeof mappings)[] = [
        'oldDistrict',
        'programmeLocation',
        'fullName',
        'gender',
        'designation',
        'phone',
        'email',
        'schoolName',
        'schoolAddress',
        'schoolType'
      ];

      entryKeys.forEach((entryKey, index) => {
        if (index < fieldOrder.length) {
          mappings[fieldOrder[index]] = entryKey;
        }
      });

      setCurrentConfig({
        ...currentConfig,
        formId: extractedFormId,
        formActionUrl: actionUrl,
        enabled: true,
        fieldMappings: mappings
      });

      setParseStatus(`Successfully identified ${entryKeys.length} Google Form entry fields!`);
    } catch (e) {
      setParseStatus('Invalid URL format. Please paste a full Google Form URL.');
    }
  };

  const handleSave = () => {
    onSaveConfig(currentConfig);
    onClose();
  };

  const copyEditLink = () => {
    navigator.clipboard.writeText('https://docs.google.com/forms/d/1Yk2IJgES1-h-ItqcoDrtNHCjuVDOpsRzaAjhSU-MbDw/edit');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Link2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Google Form Integration Hook</h3>
              <p className="text-xs text-emerald-100">Connect to your Educators Forum September 2025 Google Form</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Guide Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-950">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-emerald-900 mb-1">How to obtain your Google Form Entry IDs</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-emerald-800">
                  <li>
                    Open your Google Form in edit mode:{' '}
                    <a
                      href="https://docs.google.com/forms/d/1Yk2IJgES1-h-ItqcoDrtNHCjuVDOpsRzaAjhSU-MbDw/edit"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline inline-flex items-center hover:text-emerald-950"
                    >
                      Open Form in New Tab <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </li>
                  <li>Click the <strong>three dots (⋮)</strong> at top right and choose <strong>"Get pre-filled link"</strong>.</li>
                  <li>Type dummy responses into all fields (e.g. "District", "Location", "Full Name", etc.).</li>
                  <li>Click <strong>"Get link"</strong> at the bottom, then <strong>"Copy link"</strong>.</li>
                  <li>Paste that link in the box below and click <strong>"Auto-Extract IDs"</strong>!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Quick Copy Link Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Google Form ID</p>
              <p className="text-sm font-mono font-bold text-slate-800">{currentConfig.formId}</p>
            </div>
            <button
              onClick={copyEditLink}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Form URL'}</span>
            </button>
          </div>

          {/* Auto Extraction Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Paste Pre-Filled Google Form URL:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123=..."
                value={prefilledUrl}
                onChange={(e) => setPrefilledUrl(e.target.value)}
                className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleParsePrefilledUrl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                Auto-Extract IDs
              </button>
            </div>
            {parseStatus && (
              <p className={`text-xs mt-1 ${parseStatus.includes('Successfully') ? 'text-emerald-700 font-semibold' : 'text-amber-700'}`}>
                {parseStatus}
              </p>
            )}
          </div>

          {/* Integration Status Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-800">Direct Submit Hook to Google Form</p>
              <p className="text-xs text-slate-500">
                When enabled, participant registrations submitted on this site will also be forwarded directly to Google Form responses.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentConfig.enabled}
                onChange={(e) => setCurrentConfig({ ...currentConfig, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Form Action URL */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Google Form Response POST Endpoint:</label>
            <input
              type="text"
              value={currentConfig.formActionUrl}
              onChange={(e) => setCurrentConfig({ ...currentConfig, formActionUrl: e.target.value })}
              className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Field Mappings Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Google Form Entry Field IDs</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">Auto-mapped or edit manually</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(currentConfig.fieldMappings).map(([fieldName, entryId]) => (
                <div key={fieldName} className="flex items-center border border-slate-200 rounded-lg p-2 bg-slate-50">
                  <span className="w-36 font-medium text-slate-700 capitalize">
                    {fieldName.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <input
                    type="text"
                    value={entryId}
                    onChange={(e) =>
                      setCurrentConfig({
                        ...currentConfig,
                        fieldMappings: {
                          ...currentConfig.fieldMappings,
                          [fieldName]: e.target.value
                        }
                      })
                    }
                    placeholder="entry.123456789"
                    className="flex-1 font-mono text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Save Hook Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
