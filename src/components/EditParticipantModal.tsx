import React, { useState, useEffect } from 'react';
import { Participant } from '../types';
import {
  OLD_DISTRICTS,
  PROGRAMME_LOCATIONS,
  DISTRICT_TO_LOCATIONS,
  GENDERS,
  DESIGNATIONS,
  SCHOOL_TYPES
} from '../data/formOptions';
import { X, Save, Edit } from 'lucide-react';

interface EditParticipantModalProps {
  participant: Participant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Participant) => void;
}

export const EditParticipantModal: React.FC<EditParticipantModalProps> = ({
  participant,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Participant | null>(participant);

  useEffect(() => {
    setFormData(participant);
  }, [participant]);

  if (!isOpen || !formData) return null;

  const handleDistrictChange = (district: string) => {
    const validLocs = DISTRICT_TO_LOCATIONS[district];
    setFormData({
      ...formData,
      oldDistrict: district,
      programmeLocation: validLocs && validLocs.length > 0 ? validLocs[0] : formData.programmeLocation
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const availableLocations = formData.oldDistrict && DISTRICT_TO_LOCATIONS[formData.oldDistrict]
    ? DISTRICT_TO_LOCATIONS[formData.oldDistrict]
    : PROGRAMME_LOCATIONS;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Edit Participant Registration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Old District</label>
              <select
                value={formData.oldDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              >
                {OLD_DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Programme Location</label>
              <select
                value={formData.programmeLocation}
                onChange={(e) => setFormData({ ...formData, programmeLocation: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              >
                {availableLocations.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              >
                {GENDERS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Designation</label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              >
                {DESIGNATIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">School Name</label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">School Type</label>
              <select
                value={formData.schoolType}
                onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              >
                {SCHOOL_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Certificate ID</label>
              <input
                type="text"
                value={formData.certId || ''}
                onChange={(e) => setFormData({ ...formData, certId: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">School Address</label>
              <textarea
                rows={2}
                value={formData.schoolAddress}
                onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Update Participant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
