import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FormPage } from './components/FormPage';
import { CertificateDesignerPage } from './components/CertificateDesignerPage';
import { DashboardPage } from './components/DashboardPage';
import { GoogleFormHookModal } from './components/GoogleFormHookModal';
import { EditParticipantModal } from './components/EditParticipantModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { EmailSettingsModal } from './components/EmailSettingsModal';
import { Participant, CertificateTemplateConfig, GoogleFormConfig } from './types';
import { EmailConfig } from './utils/emailHelper';
import {
  getStoredParticipants,
  saveStoredParticipants,
  getStoredTemplateConfig,
  saveStoredTemplateConfig,
  getStoredGoogleFormConfig,
  saveStoredGoogleFormConfig,
} from './utils/storage';
import {
  GoogleSyncSettings,
  getStoredSyncSettings,
  saveStoredSyncSettings,
  fetchGoogleSheetResponses,
  pollWebhookEntries
} from './utils/googleFormScraper';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'designer' | 'dashboard'>('dashboard');
  const [participants, setParticipants] = useState<Participant[]>(getStoredParticipants);
  const [templateConfig, setTemplateConfig] = useState<CertificateTemplateConfig>(getStoredTemplateConfig);
  const [googleFormConfig, setGoogleFormConfig] = useState<GoogleFormConfig>(getStoredGoogleFormConfig);
  const [syncSettings, setSyncSettings] = useState<GoogleSyncSettings>(getStoredSyncSettings);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(() => {
    try {
      const stored = localStorage.getItem('certify_email_config');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Sync state changes to storage
  useEffect(() => {
    saveStoredParticipants(participants);
  }, [participants]);

  // Background Auto-sync polling for responses from Google Sheet or Webhook
  useEffect(() => {
    if (!syncSettings.autoSync && !syncSettings.sheetUrl) return;

    const intervalMs = Math.max(5000, (syncSettings.syncIntervalSeconds || 15) * 1000);

    const performSync = async () => {
      try {
        // 1. Poll incoming webhook buffer
        const whEntries = await pollWebhookEntries();
        if (whEntries.length > 0) {
          mergeNewParticipants(whEntries);
        }

        // 2. Poll linked Google Sheet if configured
        if (syncSettings.autoSync && syncSettings.sheetUrl) {
          const sheetEntries = await fetchGoogleSheetResponses(syncSettings.sheetUrl);
          if (sheetEntries.length > 0) {
            mergeNewParticipants(sheetEntries);
          }
        }
      } catch (err) {
        console.warn('Background sync check:', err);
      }
    };

    const timer = setInterval(performSync, intervalMs);
    return () => clearInterval(timer);
  }, [syncSettings]);

  // Merge new responses avoiding duplicate names/emails
  const mergeNewParticipants = (incoming: Participant[]) => {
    setParticipants(prev => {
      const existingKeys = new Set(
        prev.map(p => `${p.fullName.trim().toUpperCase()}_${p.schoolName.trim().toUpperCase()}`)
      );
      const toAdd = incoming.filter(
        p => !existingKeys.has(`${p.fullName.trim().toUpperCase()}_${p.schoolName.trim().toUpperCase()}`)
      );
      if (toAdd.length === 0) return prev;
      return [...toAdd, ...prev];
    });
  };

  const handleAddParticipant = (newParticipant: Participant) => {
    setParticipants(prev => [newParticipant, ...prev]);
  };

  const handleAddBatchParticipants = (newOnes: Participant[]) => {
    mergeNewParticipants(newOnes);
  };

  const handleUpdateParticipant = (updated: Participant) => {
    setParticipants(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const handleClearAllParticipants = () => {
    setParticipants([]);
    saveStoredParticipants([]);
  };

  const handleDeleteParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveTemplateConfig = (newConfig: CertificateTemplateConfig) => {
    setTemplateConfig(newConfig);
    saveStoredTemplateConfig(newConfig);
  };

  const handleSaveGoogleFormConfig = (newConfig: GoogleFormConfig) => {
    setGoogleFormConfig(newConfig);
    saveStoredGoogleFormConfig(newConfig);
  };

  const handleSaveSyncSettings = (newSettings: GoogleSyncSettings) => {
    setSyncSettings(newSettings);
    saveStoredSyncSettings(newSettings);
  };

  // Sample participant for the certificate designer preview
  const sampleParticipant: Participant = participants[0] || {
    id: 'PREVIEW-SAMPLE',
    fullName: "PARTICIPANT'S FULL NAME",
    oldDistrict: 'Old Ikorodu Central',
    programmeLocation: 'Sabo - Old IKD Central',
    gender: 'Male',
    designation: 'Educator',
    phone: '',
    email: '',
    schoolName: 'YOUR SCHOOL NAME',
    schoolAddress: 'LAGOS STATE',
    schoolType: 'Private Secondary',
    registrationDate: 'September 2025',
    certId: 'EDUS25-001'
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openGoogleFormModal={() => setIsGoogleModalOpen(true)}
        participantsCount={participants.length}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {activeTab === 'form' && (
          <FormPage
            onAddParticipant={handleAddParticipant}
            templateConfig={templateConfig}
            googleFormConfig={googleFormConfig}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'designer' && (
          <CertificateDesignerPage
            config={templateConfig}
            onSaveConfig={handleSaveTemplateConfig}
            sampleParticipant={sampleParticipant}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage
            participants={participants}
            onUpdateParticipant={handleUpdateParticipant}
            onDeleteParticipant={handleDeleteParticipant}
            onAddParticipants={handleAddBatchParticipants}
            onClearAllParticipants={handleClearAllParticipants}
            templateConfig={templateConfig}
            onOpenEditModal={(p) => setEditingParticipant(p)}
            onNavigateToForm={() => setActiveTab('form')}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            emailConfig={emailConfig}
            onOpenEmailSettings={() => setIsEmailSettingsOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">EDUCATORS FORUM SEPT 2025 — Lagos State Educational Districts</p>
        <p className="mt-1 text-slate-400">Automated Registration & Certificate Generation Platform</p>
      </footer>

      {/* Google Form Hook Modal */}
      <GoogleFormHookModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        config={googleFormConfig}
        onSaveConfig={handleSaveGoogleFormConfig}
      />

      {/* Google Sync & Scraper Modal */}
      <GoogleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncSettings={syncSettings}
        onSaveSyncSettings={handleSaveSyncSettings}
        onSyncCompleted={handleAddBatchParticipants}
      />

      {/* Edit Participant Modal */}
      <EditParticipantModal
        isOpen={!!editingParticipant}
        participant={editingParticipant}
        onClose={() => setEditingParticipant(null)}
        onSave={handleUpdateParticipant}
      />

      {/* Email Settings Modal */}
      <EmailSettingsModal
        isOpen={isEmailSettingsOpen}
        onClose={() => setIsEmailSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
