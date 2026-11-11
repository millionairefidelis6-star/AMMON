import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  Phone, 
  FileText, 
  CheckCircle2,
  Upload,
  Paperclip
} from 'lucide-react';
import { DisputeTicket } from '../types';
import { NIGERIAN_STATES } from '../data/mockData';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitDispute: (ticket: DisputeTicket) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  onSubmitDispute,
}) => {
  const [agentName, setAgentName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [issueType, setIssueType] = useState<DisputeTicket['issueType']>('Illegal LGA Levy');
  const [state, setState] = useState('Lagos');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ticketNum, setTicketNum] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<{ name: string; size: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newNum = `AMMON-DISP-2025-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket: DisputeTicket = {
      id: `disp-${Date.now()}`,
      ticketNumber: newNum,
      agentId: 'AMMON-MEMBER',
      agentName: agentName || 'Anonymous Operator',
      businessName: businessName || 'Agent Kiosk',
      phone: phone || '+234 800 000 0000',
      issueType,
      state,
      status: 'Open',
      dateReported: 'Nov 11, 2025',
      description,
    };

    onSubmitDispute(ticket);
    setTicketNum(newNum);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#14532D] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base">Complaints & Legal Aid Desk</h3>
              <p className="text-xs text-emerald-200">
                Rapid Response Taskforce for POS Operators
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {submitted ? (
            <div className="bg-[#EAF3ED] p-6 rounded-2xl border border-[#176B37]/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#176B37] text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-sm font-extrabold text-[#14532D]">
                Dispute Lodged with AMMON Legal Taskforce
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Your complaint has been assigned Case Reference: <strong className="font-mono text-[#176B37]">{ticketNum}</strong>. 
                Our State Chapter Legal Coordinator has been alerted to provide immediate intervention and court injunction backing.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-[#176B37] hover:bg-[#14532D] text-white font-semibold rounded-xl cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 leading-relaxed">
                <strong>Emergency Helpline:</strong> If you are currently facing physical harassment or extortion, 
                call our 24/7 hotline directly at <span className="font-mono font-bold">+234 (0) 800 266 6664</span>.
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nature of Dispute / Incident *
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="Illegal LGA Levy">Illegal Local Council / Municipal Ticket Levy</option>
                  <option value="Police / Taskforce Harassment">Police / Unlawful Security Taskforce Harassment</option>
                  <option value="Frozen Terminal Wallet">Aggregator / Bank Unlawfully Froze Terminal Wallet</option>
                  <option value="Chargeback Fraud">Customer Initiated Fraudulent Reverse Chargeback</option>
                  <option value="Unresolved Bank Dispute">Prolonged Failed Transaction Unreversed by Bank</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. Kolawole Eze"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Kiosk / Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Kolawole POS Hub"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Incident State Chapter *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Incident Description & Location Details *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe location, LGA revenue ticket demand, amount demanded, badge numbers, or bank terminal details..."
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              {/* Evidence Upload from Device */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Upload Photo / Incident Evidence (from Device)
                </label>
                {!evidenceFile ? (
                  <label className="border-2 border-dashed border-gray-300 hover:border-[#176B37] rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-white transition-colors group">
                    <Upload className="w-4 h-4 text-gray-400 group-hover:text-[#176B37]" />
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-[#176B37]">
                      Attach photo of LGA ticket, receipt, or seizure memo
                    </span>
                    <span className="text-[10px] text-gray-400">PDF, JPG, PNG up to 10MB</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEvidenceFile({
                            name: file.name,
                            size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`
                          });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-[#176B37]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-[#176B37] shrink-0" />
                      <span className="text-xs font-medium text-gray-800 truncate">{evidenceFile.name} ({evidenceFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEvidenceFile(null)}
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Submit Report to AMMON Legal Ombudsman</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
