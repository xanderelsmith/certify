import React, { useState, useEffect } from 'react';
import { X, Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { EmailConfig, getStoredEmailConfig, saveStoredEmailConfig } from '../utils/emailHelper';

interface EmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<EmailConfig>({
    serviceId: '',
    templateId: '',
    publicKey: '',
    fromEmail: '',
    fromName: 'Educators Forum',
  });
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredEmailConfig();
      if (stored) setConfig(stored);
      setStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen]);

  const handleChange = (field: keyof EmailConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setStatus('idle');
  };

  const handleSave = () => {
    saveStoredEmailConfig(config);
    setStatus('success');
    setStatusMessage('Settings saved successfully!');
    setTimeout(() => onClose(), 1500);
  };

  const handleTest = async () => {
    if (!config.serviceId || !config.templateId || !config.publicKey || !config.fromEmail) {
      setStatus('error');
      setStatusMessage('Please fill all fields before testing.');
      return;
    }

    setStatus('testing');
    setStatusMessage('Sending test email...');

    try {
      const emailjs = (await import('@emailjs/browser')).default;
      emailjs.init(config.publicKey);

      await emailjs.send(config.serviceId, config.templateId, {
        to_email: config.fromEmail,
        to_name: 'Test User',
        from_email: config.fromEmail,
        from_name: config.fromName,
        subject: 'Test Email - Educators Forum Certificate System',
        message: 'This is a test email from the Educators Forum certificate system.\n\nIf you received this, your EmailJS configuration is working correctly!',
        attachment: '',
        attachment_name: '',
      });

      setStatus('success');
      setStatusMessage('Test email sent successfully! Check your inbox.');
    } catch (error: any) {
      setStatus('error');
      setStatusMessage(`Test failed: ${error.text || error.message || 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Email Settings (EmailJS)</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <p className="font-semibold mb-1">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Create account at <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="underline">emailjs.com</a></li>
              <li>Add <strong>Gmail</strong> as Email Service → get <strong>Service ID</strong></li>
              <li>Create Email Template → get <strong>Template ID</strong></li>
              <li>Get <strong>Public Key</strong> from Account → API Keys</li>
              <li>Template variables: <code className="bg-amber-100 px-1 rounded">{"{{to_email}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{to_name}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{from_email}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{from_name}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{subject}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{message}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{attachment}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{attachment_name}}"}</code></li>
            </ol>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service ID</label>
              <input
                type="text"
                value={config.serviceId}
                onChange={e => handleChange('serviceId', e.target.value)}
                placeholder="service_xxxxxxx"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Template ID</label>
              <input
                type="text"
                value={config.templateId}
                onChange={e => handleChange('templateId', e.target.value)}
                placeholder="template_xxxxxxx"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Public Key</label>
              <input
                type="text"
                value={config.publicKey}
                onChange={e => handleChange('publicKey', e.target.value)}
                placeholder="xxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Email</label>
              <input
                type="email"
                value={config.fromEmail}
                onChange={e => handleChange('fromEmail', e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Name</label>
              <input
                type="text"
                value={config.fromName}
                onChange={e => handleChange('fromName', e.target.value)}
                placeholder="Educators Forum"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {status !== 'idle' && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${
              status === 'success' ? 'bg-emerald-50 text-emerald-700' :
              status === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {status === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              {status === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {status === 'testing' && <TestTube className="w-4 h-4 flex-shrink-0 animate-spin" />}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleTest}
            disabled={status === 'testing'}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-1.5"
          >
            <TestTube className="w-4 h-4" />
            <span>Test Email</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save & Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};