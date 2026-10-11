import React, { useState } from 'react';
import {
  OLD_DISTRICTS,
  PROGRAMME_LOCATIONS,
  DISTRICT_TO_LOCATIONS,
  GENDERS,
  DESIGNATIONS,
  SCHOOL_TYPES
} from '../data/formOptions';
import { Participant, CertificateTemplateConfig, GoogleFormConfig } from '../types';
import { downloadCertificatePdf } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Download,
  Send,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface FormPageProps {
  onAddParticipant: (participant: Participant) => void;
  templateConfig: CertificateTemplateConfig;
  googleFormConfig: GoogleFormConfig;
  onNavigateToDashboard: () => void;
}

export const FormPage: React.FC<FormPageProps> = ({
  onAddParticipant,
  templateConfig,
  googleFormConfig,
  onNavigateToDashboard,
}) => {
  // Form State
  const [oldDistrict, setOldDistrict] = useState<string>('');
  const [programmeLocation, setProgrammeLocation] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [schoolType, setSchoolType] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);
  const [isDownloadingCert, setIsDownloadingCert] = useState<boolean>(false);

  // Filtered programme locations
  const availableLocations = oldDistrict && DISTRICT_TO_LOCATIONS[oldDistrict]
    ? DISTRICT_TO_LOCATIONS[oldDistrict]
    : PROGRAMME_LOCATIONS;

  const handleDistrictChange = (district: string) => {
    setOldDistrict(district);
    const validLocations = DISTRICT_TO_LOCATIONS[district];
    if (validLocations && validLocations.length > 0) {
      setProgrammeLocation(validLocations[0]);
    } else {
      setProgrammeLocation('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldDistrict || !programmeLocation || !fullName.trim() || !gender || !designation || !schoolName.trim() || !schoolType) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    setIsSubmitting(true);

    const certSerial = Math.floor(1000 + Math.random() * 9000);
    const newParticipant: Participant = {
      id: `PART-${Date.now().toString().slice(-6)}`,
      fullName: fullName.trim(),
      oldDistrict,
      programmeLocation,
      gender,
      designation,
      phone: phone.trim(),
      email: email.trim(),
      schoolName: schoolName.trim(),
      schoolAddress: schoolAddress.trim(),
      schoolType,
      registrationDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      certId: `EDUS25-${certSerial}`
    };

    // If Google Form hook is active, submit payload in background
    if (googleFormConfig.enabled && googleFormConfig.formActionUrl) {
      try {
        const formData = new FormData();
        const map = googleFormConfig.fieldMappings;
        if (map.oldDistrict) formData.append(map.oldDistrict, newParticipant.oldDistrict);
        if (map.programmeLocation) formData.append(map.programmeLocation, newParticipant.programmeLocation);
        if (map.fullName) formData.append(map.fullName, newParticipant.fullName);
        if (map.gender) formData.append(map.gender, newParticipant.gender);
        if (map.designation) formData.append(map.designation, newParticipant.designation);
        if (map.phone) formData.append(map.phone, newParticipant.phone);
        if (map.email) formData.append(map.email, newParticipant.email);
        if (map.schoolName) formData.append(map.schoolName, newParticipant.schoolName);
        if (map.schoolAddress) formData.append(map.schoolAddress, newParticipant.schoolAddress);
        if (map.schoolType) formData.append(map.schoolType, newParticipant.schoolType);

        // Send via fetch no-cors
        fetch(googleFormConfig.formActionUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: formData
        }).catch(err => console.log('Google form sync notice:', err));
      } catch (err) {
        console.warn('Google Form submit attempt:', err);
      }
    }

    // Save participant locally
    onAddParticipant(newParticipant);
    setRegisteredParticipant(newParticipant);
    setIsSubmitting(false);

    // Trigger confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (_) {}
  };

  const handleDownloadSingleCert = async () => {
    if (!registeredParticipant) return;
    setIsDownloadingCert(true);
    try {
      await downloadCertificatePdf(registeredParticipant, templateConfig);
    } catch (err) {
      console.error(err);
      alert('Could not download certificate. Please check Certificate Designer settings.');
    } finally {
      setIsDownloadingCert(false);
    }
  };

  const handleResetForm = () => {
    setRegisteredParticipant(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setSchoolName('');
    setSchoolAddress('');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Banner / Title Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-700/60 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 text-emerald-200 border border-emerald-500/30">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>SEPTEMBER 2025 PROGRAMMES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            EDUCATORS FORUM PROGRAMMES
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-1 font-medium">
            REGISTRATION FORM FOR PARTICIPANTS & CERTIFICATE ISSUANCE
          </p>
        </div>
        {/* Background decorative element */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Success Modal / Card after registration */}
      {registeredParticipant ? (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10" />
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Registration Successful!</span>
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">
            {registeredParticipant.fullName}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {registeredParticipant.designation} • {registeredParticipant.schoolName}
          </p>
          <div className="inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl mt-4 font-mono text-xs text-slate-700">
            Certificate ID: <strong className="text-emerald-700">{registeredParticipant.certId}</strong>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleDownloadSingleCert}
              disabled={isDownloadingCert}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>{isDownloadingCert ? 'Generating PDF...' : 'Download Certificate of Attendance'}</span>
            </button>

            <button
              onClick={onNavigateToDashboard}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <span>View in Results Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto text-sm text-slate-600 hover:text-slate-900 px-4 py-3"
            >
              + Register Another Participant
            </button>
          </div>
        </div>
      ) : (
        /* Form Card */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <User className="w-5 h-5 text-emerald-600" />
              <span>Participant Information</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Please provide accurate details for your certificate of attendance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old District */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Old District <span className="text-red-500">*</span>
              </label>
              <select
                value={oldDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- Select Old District --</option>
                {OLD_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            {/* Programme Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Programme Location <span className="text-red-500">*</span>
              </label>
              <select
                value={programmeLocation}
                onChange={(e) => setProgrammeLocation(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- Select Programme Location --</option>
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Participant's Full Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Participant's Full Name (Surname first in capital letter) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. ADEBAYO, Olumide Emmanuel"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              />
              <p className="text-[11px] text-slate-500 mt-1">This name will appear on the Certificate of Attendance exactly as typed.</p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 mt-2">
                {GENDERS.map((g) => (
                  <label key={g} className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={(e) => setGender(e.target.value)}
                      required
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Designation <span className="text-red-500">*</span>
              </label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- Select Designation --</option>
                {DESIGNATIONS.map((desig) => (
                  <option key={desig} value={desig}>{desig}</option>
                ))}
              </select>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number (Preferably WhatsApp Line)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08023456789"
                  className="w-full pl-9 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. educator@example.com"
                  className="w-full pl-9 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* School Details Section */}
          <div className="border-t border-slate-100 pt-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4">
              <Building className="w-5 h-5 text-emerald-600" />
              <span>School Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name of Your School */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Name of Your School <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Community Senior Grammar School"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* School Type */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  School Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                  {SCHOOL_TYPES.map((type) => (
                    <label
                      key={type}
                      className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        schoolType === type
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-medium'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="schoolType"
                        value={type}
                        checked={schoolType === type}
                        onChange={(e) => setSchoolType(e.target.value)}
                        required
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Address of Your School */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Address of Your School
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="e.g. 12 Educational Zone, Ikorodu, Lagos State"
                    className="w-full pl-9 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              * Required fields for certification
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Registration...' : 'Submit & Generate Certificate'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
