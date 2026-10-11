import React, { useState } from 'react';
import { Participant, CertificateTemplateConfig } from '../types';
import { downloadCertificatePdf, previewCertificatePdf, generateCertificatePdfBytes } from '../utils/pdfGenerator';
import { exportParticipantsToCSV, parseCSVToParticipants } from '../utils/csvHelper';
import { sendCertificateEmail, sendBulkCertificateEmails, EmailConfig } from '../utils/emailHelper';
import JSZip from 'jszip';
import {
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  FileSpreadsheet,
  Upload,
  Archive,
  Users,
  Award,
  Building,
  School,
  CheckCircle2,
  Plus,
  RefreshCw,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { OLD_DISTRICTS, DESIGNATIONS } from '../data/formOptions';

interface DashboardPageProps {
  participants: Participant[];
  onUpdateParticipant: (updated: Participant) => void;
  onDeleteParticipant: (id: string) => void;
  onAddParticipants: (newOnes: Participant[]) => void;
  onClearAllParticipants: () => void;
  templateConfig: CertificateTemplateConfig;
  onOpenEditModal: (participant: Participant) => void;
  onNavigateToForm: () => void;
  onOpenSyncModal: () => void;
  emailConfig: EmailConfig | null;
  onOpenEmailSettings: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  participants,
  onUpdateParticipant,
  onDeleteParticipant,
  onAddParticipants,
  onClearAllParticipants,
  templateConfig,
  onOpenEditModal,
  onNavigateToForm,
  onOpenSyncModal,
  emailConfig,
  onOpenEmailSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 });
  const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  // Filtered List
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.certId && p.certId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDistrict = selectedDistrict === 'all' || p.oldDistrict === selectedDistrict;
    const matchesDesignation = selectedDesignation === 'all' || p.designation === selectedDesignation;

    return matchesSearch && matchesDistrict && matchesDesignation;
  });

  // Handle single download
  const handleDownloadCert = async (participant: Participant) => {
    setDownloadingId(participant.id);
    try {
      await downloadCertificatePdf(participant, templateConfig);
    } catch (e) {
      alert('Error generating certificate for ' + participant.fullName);
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle preview
  const handlePreviewCert = async (participant: Participant) => {
    try {
      const url = await previewCertificatePdf(participant, templateConfig);
      setPreviewUrl(url);
      setPreviewParticipant(participant);
    } catch (e) {
      alert('Error previewing certificate.');
    }
  };

  // Bulk ZIP Download
  const handleDownloadAllZip = async () => {
    if (filteredParticipants.length === 0) {
      alert('No participants to download.');
      return;
    }

    setIsZipping(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder('Educators_Forum_Certificates_Sept_2025');

      for (let i = 0; i < filteredParticipants.length; i++) {
        const participant = filteredParticipants[i];
        const pdfBytes = await generateCertificatePdfBytes(participant, templateConfig);
        const cleanName = participant.fullName.replace(/[^a-zA-Z0-9_-]/g, '_');
        folder?.file(`Certificate_${cleanName}.pdf`, pdfBytes);
        setZipProgress(Math.round(((i + 1) / filteredParticipants.length) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Educators_Forum_Certificates_Batch_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error packaging ZIP certificates.');
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  // Send single certificate email
  const handleSendEmail = async (participant: Participant) => {
    if (!emailConfig) {
      onOpenEmailSettings();
      return;
    }
    if (!participant.email) {
      alert(`${participant.fullName} has no email address.`);
      return;
    }

    setSendingEmailId(participant.id);
    try {
      const result = await sendCertificateEmail(participant, templateConfig, emailConfig);
      if (result.success) {
        alert(`Certificate sent to ${participant.email}`);
      } else {
        alert(`Failed to send: ${result.error}`);
      }
    } catch (e) {
      alert('Error sending email.');
    } finally {
      setSendingEmailId(null);
    }
  };

  // Send all certificates emails
  const handleSendAllEmails = async () => {
    if (!emailConfig) {
      onOpenEmailSettings();
      return;
    }

    const participantsWithEmail = filteredParticipants.filter(p => p.email);
    if (participantsWithEmail.length === 0) {
      alert('No participants with email addresses found.');
      return;
    }

    if (!confirm(`Send certificates to ${participantsWithEmail.length} participant(s)?`)) {
      return;
    }

    setIsSendingBulk(true);
    setBulkProgress({ sent: 0, total: participantsWithEmail.length });
    setBulkResult(null);

    try {
      const result = await sendBulkCertificateEmails(
        participantsWithEmail,
        templateConfig,
        emailConfig,
        (sent, total) => setBulkProgress({ sent, total })
      );
      setBulkResult(result);
      alert(`Done! Sent: ${result.sent}, Failed: ${result.failed}`);
    } catch (e) {
      alert('Error sending bulk emails.');
    } finally {
      setIsSendingBulk(false);
      setBulkProgress({ sent: 0, total: 0 });
    }
  };

  // CSV Import
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const imported = parseCSVToParticipants(text);
        if (imported.length > 0) {
          onAddParticipants(imported);
          alert(`Successfully imported ${imported.length} participants!`);
        } else {
          alert('Could not parse participants from file. Please ensure it has comma-separated columns.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Participants Results & Certificate Issuance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage registrations, edit records, and generate personalized certificates on demand.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenSyncModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Google Responses</span>
          </button>

          <button
            onClick={onOpenEmailSettings}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Email Settings</span>
          </button>

          <button
            onClick={onNavigateToForm}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>

          <label className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
          </label>

          <button
            onClick={() => exportParticipantsToCSV(participants)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleDownloadAllZip}
            disabled={isZipping || filteredParticipants.length === 0}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors disabled:opacity-60"
          >
            <Archive className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isZipping ? `Archiving (${zipProgress}%)...` : 'Download All (ZIP)'}</span>
          </button>

          <button
            onClick={handleSendAllEmails}
            disabled={isSendingBulk || filteredParticipants.filter(p => p.email).length === 0}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingBulk ? `Sending (${bulkProgress.sent}/${bulkProgress.total})...` : 'Send All Emails'}</span>
          </button>

          {participants.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all participant records from the table?')) {
                  onClearAllParticipants();
                }
              }}
              title="Clear all records"
              className="flex items-center space-x-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Table</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Registered</p>
            <p className="text-xl font-bold text-slate-900">{participants.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Certificates Ready</p>
            <p className="text-xl font-bold text-slate-900">{participants.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <School className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Districts Active</p>
            <p className="text-xl font-bold text-slate-900">
              {new Set(participants.map(p => p.oldDistrict)).size}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Schools Represented</p>
            <p className="text-xl font-bold text-slate-900">
              {new Set(participants.map(p => p.schoolName)).size}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by participant name, school, WhatsApp phone, certificate ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700"
          >
            <option value="all">All Districts</option>
            {OLD_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700"
          >
            <option value="all">All Designations</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Participant Name</th>
                <th className="py-3 px-4">Designation & School</th>
                <th className="py-3 px-4">District / Location</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Certificate ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No matching participants found.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="font-bold text-slate-900 text-xs">
                        {participant.fullName}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {participant.gender} • {participant.registrationDate?.slice(0, 10)}
                      </span>
                    </td>

                    {/* Designation & School */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] inline-block mb-1">
                        {participant.designation}
                      </span>
                      <div className="text-slate-700 font-medium">{participant.schoolName}</div>
                      <div className="text-[10px] text-slate-400">{participant.schoolType}</div>
                    </td>

                    {/* District & Location */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{participant.oldDistrict}</div>
                      <div className="text-[11px] text-slate-500">{participant.programmeLocation}</div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-mono">{participant.phone || '—'}</div>
                      <div className="text-[10px] text-slate-400">{participant.email || '—'}</div>
                    </td>

                    {/* Cert ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-[11px]">
                      {participant.certId || 'EDUS2025'}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Send Email */}
                        <button
                          onClick={() => handleSendEmail(participant)}
                          disabled={sendingEmailId === participant.id || !participant.email}
                          title={participant.email ? 'Send Certificate via Email' : 'No email address'}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{sendingEmailId === participant.id ? '...' : 'Email'}</span>
                        </button>

                        {/* Download Certificate */}
                        <button
                          onClick={() => handleDownloadCert(participant)}
                          disabled={downloadingId === participant.id}
                          title="Download Certificate PDF"
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] shadow-2xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingId === participant.id ? '...' : 'Certificate'}</span>
                        </button>

                        {/* Preview */}
                        <button
                          onClick={() => handlePreviewCert(participant)}
                          title="Preview Certificate"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Entry */}
                        <button
                          onClick={() => onOpenEditModal(participant)}
                          title="Edit Entry"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${participant.fullName}?`)) {
                              onDeleteParticipant(participant.id);
                            }
                          }}
                          title="Delete Participant"
                          className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Certificate Preview Modal */}
      {previewUrl && previewParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Certificate Preview: {previewParticipant.fullName}</h3>
                <p className="text-xs text-slate-400">{previewParticipant.designation} • {previewParticipant.schoolName}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadCert(previewParticipant)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full h-full border-none" title="Certificate Preview" />
          </div>
        </div>
      )}

      {/* Bulk Email Progress Modal */}
      {isSendingBulk && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Sending Certificates</h3>
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span className="font-mono">{bulkProgress.sent} / {bulkProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.sent / bulkProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-slate-500 text-center">Please wait, sending emails...</p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Result Modal */}
      {bulkResult && !isSendingBulk && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Email Results</h3>
              <button
                onClick={() => setBulkResult(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sent Successfully</span>
                <span className="font-bold text-emerald-600">{bulkResult.sent}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Failed</span>
                <span className="font-bold text-red-600">{bulkResult.failed}</span>
              </div>
            </div>
            {bulkResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto text-xs text-red-600 bg-red-50 p-3 rounded-lg space-y-1">
                {bulkResult.errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
            <button
              onClick={() => setBulkResult(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
