import React, { useState, useRef } from 'react';
import { CertificateTemplateConfig, Participant } from '../types';
import { previewCertificatePdf, downloadCertificatePdf } from '../utils/pdfGenerator';
import {
  Upload,
  Save,
  Eye,
  RotateCcw,
  Move,
  Type,
  Check,
  FileCheck,
  Sliders,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

interface CertificateDesignerPageProps {
  config: CertificateTemplateConfig;
  onSaveConfig: (config: CertificateTemplateConfig) => void;
  sampleParticipant: Participant;
}

export const CertificateDesignerPage: React.FC<CertificateDesignerPageProps> = ({
  config,
  onSaveConfig,
  sampleParticipant,
}) => {
  const [currentConfig, setCurrentConfig] = useState<CertificateTemplateConfig>(config);
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingPdf, setIsTestingPdf] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [pdfBgUrl, setPdfBgUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Render actual PDF template into image background using PDF.js
  React.useEffect(() => {
    let isCancelled = false;

    const renderPdfToBackground = async () => {
      setIsLoadingPdf(true);
      try {
        const pdfjs = (window as any).pdfjsLib;
        const source = currentConfig.customPdfDataUrl || currentConfig.pdfTemplateUrl;

        if (pdfjs) {
          const loadingTask = pdfjs.getDocument(source);
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for crystal-sharp text

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport }).promise;

          if (!isCancelled) {
            setPdfBgUrl(canvas.toDataURL('image/png'));
            setIsLoadingPdf(false);
          }
        } else {
          // Retry if PDF.js CDN is still executing
          setTimeout(() => {
            if (!isCancelled) renderPdfToBackground();
          }, 300);
        }
      } catch (err) {
        console.warn('PDF.js render notice:', err);
        if (!isCancelled) setIsLoadingPdf(false);
      }
    };

    renderPdfToBackground();

    return () => {
      isCancelled = true;
    };
  }, [currentConfig.pdfTemplateUrl, currentConfig.customPdfDataUrl]);

  // File Upload Handlers
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCurrentConfig(prev => ({
          ...prev,
          customPdfDataUrl: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Dragging logic for Name
  const handleDragName = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const mouseX = moveEvent.clientX - rect.left;
      const mouseY = moveEvent.clientY - rect.top;

      let pctX = Math.round((mouseX / rect.width) * 100);
      let pctY = Math.round((mouseY / rect.height) * 100);

      pctX = Math.max(0, Math.min(100, pctX));
      pctY = Math.max(0, Math.min(100, pctY));

      setCurrentConfig(prev => ({
        ...prev,
        nameField: { ...prev.nameField, x: pctX, y: pctY }
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSave = () => {
    // Ensure signatures are disabled since they are baked into template
    const cleanConfig: CertificateTemplateConfig = {
      ...currentConfig,
      signature1: { ...currentConfig.signature1, enabled: false },
      signature2: { ...currentConfig.signature2, enabled: false },
    };
    setCurrentConfig(cleanConfig);
    onSaveConfig(cleanConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleLiveTestPdf = async () => {
    setIsTestingPdf(true);
    try {
      const url = await previewCertificatePdf(sampleParticipant, currentConfig);
      setPreviewPdfUrl(url);
    } catch (err) {
      console.error(err);
      alert('Error rendering test PDF. Please ensure the template file is accessible.');
    } finally {
      setIsTestingPdf(false);
    }
  };

  const handleDownloadTestPdf = async () => {
    try {
      await downloadCertificatePdf(sampleParticipant, currentConfig);
    } catch (err) {
      alert('Failed to download test PDF.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Certificate Visual Layout Designer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Drag the participant name box directly to the exact line on your certificate template.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLiveTestPdf}
            disabled={isTestingPdf}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>{isTestingPdf ? 'Generating Preview...' : 'Live Test Preview'}</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Position Saved!' : 'Save & Lock Position'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Visual Drag Canvas on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* Left Side Controls (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Template Source Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2 mb-3">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Certificate Template (from Desktop)</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    Certificate of attendance.pdf
                  </p>
                  <p className="text-[11px] text-slate-500">Signatures included on template</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  LOADED
                </span>
              </div>

              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center space-x-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload Alternate PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentConfig(prev => ({
                      ...prev,
                      customPdfDataUrl: undefined,
                      pdfTemplateUrl: `/certificate_template.pdf?t=${Date.now()}`
                    }));
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
                  title="Reload certificate from Desktop"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reload PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Participant Name Styling & Position Editor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Type className="w-4 h-4 text-emerald-600" />
                <span>Participant Name Settings</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Customize font size, family, color, and alignment</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Font Size */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">Font Size ({currentConfig.nameField.fontSize}pt)</label>
                </div>
                <input
                  type="range"
                  min="14"
                  max="48"
                  value={currentConfig.nameField.fontSize}
                  onChange={(e) =>
                    setCurrentConfig(prev => ({
                      ...prev,
                      nameField: { ...prev.nameField, fontSize: Number(e.target.value) }
                    }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Font Family & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Font Family</label>
                  <select
                    value={currentConfig.nameField.fontFamily}
                    onChange={(e) =>
                      setCurrentConfig(prev => ({
                        ...prev,
                        nameField: { ...prev.nameField, fontFamily: e.target.value as any }
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white text-xs"
                  >
                    <option value="Helvetica-Bold">Helvetica Bold</option>
                    <option value="Helvetica">Helvetica Regular</option>
                    <option value="Times-Bold">Times Bold</option>
                    <option value="Times-Roman">Times Roman</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Text Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={currentConfig.nameField.color}
                      onChange={(e) =>
                        setCurrentConfig(prev => ({
                          ...prev,
                          nameField: { ...prev.nameField, color: e.target.value }
                        }))
                      }
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-slate-700">{currentConfig.nameField.color}</span>
                  </div>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Text Alignment</label>
                <div className="flex gap-2">
                  {(['left', 'center', 'right'] as const).map(align => (
                    <button
                      key={align}
                      type="button"
                      onClick={() =>
                        setCurrentConfig(prev => ({
                          ...prev,
                          nameField: { ...prev.nameField, align }
                        }))
                      }
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize flex items-center justify-center space-x-1 ${
                        currentConfig.nameField.align === align
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                      <span>{align}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Uppercase toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-medium text-slate-700">Display in UPPERCASE</span>
                <input
                  type="checkbox"
                  checked={currentConfig.nameField.isUppercase}
                  onChange={(e) =>
                    setCurrentConfig(prev => ({
                      ...prev,
                      nameField: { ...prev.nameField, isUppercase: e.target.checked }
                    }))
                  }
                  className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Position Coordinate Sliders */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-700">Horizontal Position (X)</span>
                    <span className="font-mono font-bold text-slate-800">{currentConfig.nameField.x}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={currentConfig.nameField.x}
                    onChange={(e) =>
                      setCurrentConfig(prev => ({
                        ...prev,
                        nameField: { ...prev.nameField, x: Number(e.target.value) }
                      }))
                    }
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-700">Vertical Position (Y)</span>
                    <span className="font-mono font-bold text-slate-800">{currentConfig.nameField.y}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={currentConfig.nameField.y}
                    onChange={(e) =>
                      setCurrentConfig(prev => ({
                        ...prev,
                        nameField: { ...prev.nameField, y: Number(e.target.value) }
                      }))
                    }
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Visual Drag Canvas (7 columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-800 text-white p-3 rounded-xl flex items-center justify-between text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Move className="w-4 h-4 text-emerald-400" />
              <span>Click and drag the Name box directly onto the name line on your certificate</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">842 × 595 pt</span>
          </div>

          {/* Certificate Canvas Area */}
          <div
            ref={canvasRef}
            className="relative w-full aspect-[842/595] bg-white border border-slate-300 rounded-xl shadow-xl overflow-hidden select-none"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Real PDF Certificate Background */}
            {pdfBgUrl ? (
              <img
                src={pdfBgUrl}
                alt="Certificate Template"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500 text-xs">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="font-semibold text-slate-700">Rendering Certificate PDF Template...</span>
                <span className="text-[11px] text-slate-400 mt-1">Certificate of attendance.pdf</span>
              </div>
            )}

            {/* Draggable Participant Name Element */}
            <div
              onMouseDown={handleDragName}
              style={{
                position: 'absolute',
                left: `${currentConfig.nameField.x}%`,
                top: `${currentConfig.nameField.y}%`,
                transform: currentConfig.nameField.align === 'center'
                  ? 'translate(-50%, -50%)'
                  : currentConfig.nameField.align === 'right'
                  ? 'translate(-100%, -50%)'
                  : 'translate(0, -50%)',
                fontSize: `${Math.max(12, currentConfig.nameField.fontSize * 0.75)}px`,
                color: currentConfig.nameField.color,
                fontWeight: currentConfig.nameField.fontFamily.includes('Bold') ? 'bold' : 'normal',
                cursor: 'grab',
              }}
              className="px-3 py-1 rounded-lg border-2 border-emerald-500 bg-white/80 backdrop-blur-2xs shadow-md ring-2 ring-emerald-300/60 hover:bg-white transition-colors"
            >
              <div className="flex items-center space-x-1.5 pointer-events-none">
                <Move className="w-3.5 h-3.5 text-emerald-600 opacity-70" />
                <span className="font-serif tracking-wide select-none">
                  {currentConfig.nameField.isUppercase
                    ? sampleParticipant.fullName.toUpperCase()
                    : sampleParticipant.fullName}
                </span>
              </div>
            </div>
          </div>

          {/* Quick instructions & Test Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
            <span>Tip: Drag the green name box to align with your certificate line, then click "Save & Lock Position".</span>
            <button
              onClick={handleDownloadTestPdf}
              className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center"
            >
              Download Sample PDF <ExternalLink className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal if generated */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm">Generated Certificate Preview ({sampleParticipant.fullName})</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadTestPdf}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe src={previewPdfUrl} className="flex-1 w-full h-full border-none" title="Certificate Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateDesignerPage;
