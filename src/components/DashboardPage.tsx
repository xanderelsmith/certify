import React, { useState } from 'react';
import { Participant, CertificateTemplateConfig } from '../types';
import { downloadCertificatePdf, previewCertificatePdf, generateCertificatePdfBytes } from '../utils/pdfGenerator';
import { exportParticipantsToCSV, parseCSVToParticipants } from '../utils/csvHelper';
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
  RefreshCw
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);

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
    </div>
  );
};
