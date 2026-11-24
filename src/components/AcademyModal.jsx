import { useState } from "react";
import { X, BookOpen, Award, Clock } from "lucide-react";
import { downloadAcademyCertificate } from "../utils/documentGenerators";
const AcademyModal = ({ isOpen, onClose, member }) => {
  const [completedModules, setCompletedModules] = useState([1]);
  if (!isOpen) return null;
  const courses = [
    {
      id: 1,
      title: "POS Fraud Detection & Fake Bank Alert Prevention",
      duration: "45 mins",
      level: "Mandatory",
      description: "Comprehensive guide to identifying forged SMS alerts, card-skimming tactics, and ATM card-swapping schemes.",
      instructor: "CBN Consumer Protection Faculty"
    },
    {
      id: 2,
      title: "Counterfeit Currency Spotting & UV Light Authentication",
      duration: "30 mins",
      level: "Essential",
      description: "Tactile and optical security checks on the redesigned Naira banknotes (₦200, ₦500, ₦1000).",
      instructor: "Nigeria Police Anti-Fraud Unit"
    },
    {
      id: 3,
      title: "POS Terminal Hardware Maintenance & Network Troubleshooting",
      duration: "50 mins",
      level: "Technical",
      description: "Resolving SIM card connection drops, battery optimization, and avoiding terminal tampering flags.",
      instructor: "Hardware Vendor OEM Group"
    },
    {
      id: 4,
      title: "Bookkeeping, Daily Cash Reconciliation & Tax Compliance",
      duration: "60 mins",
      level: "Business Growth",
      description: "Managing float liquidity, tracking aggregator charges, and filing formal council tax exemption documentation.",
      instructor: "Chartered Institute of Bankers Nigeria (CIBN)"
    }
  ];
  const toggleCourse = (id) => {
    if (completedModules.includes(id)) {
      setCompletedModules(completedModules.filter((m) => m !== id));
    } else {
      setCompletedModules([...completedModules, id]);
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
    className="bg-white rounded-3xl max-w-2xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    onClick={(e) => e.stopPropagation()}
  >
        {
    /* Header */
  }
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base">AMMON Academy</h3>
              <p className="text-xs text-emerald-100">
                National Agent Banking Certification & Safety School
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

        {
    /* Content */
  }
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {
    /* Top Banner */
  }
          <div className="p-4 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/20 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-[#14532D]">Your Certification Progress</span>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {completedModules.length} of {courses.length} Modules Completed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-[#176B37]" />
              <span className="text-xs font-bold text-[#176B37]">
                {Math.round(completedModules.length / courses.length * 100)}%
              </span>
            </div>
          </div>

          {
    /* Courses List */
  }
          <div className="space-y-3">
            {courses.map((course) => {
    const isDone = completedModules.includes(course.id);
    return <div
      key={course.id}
      className={`p-4 rounded-2xl border transition-all ${isDone ? "border-[#176B37]/40 bg-[#EAF3ED]/30" : "border-[#E5E7EB] bg-white hover:border-gray-300"}`}
    >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#176B37] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {course.level}
                        </span>
                        <span className="text-gray-400 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.duration}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#252525]">
                        {course.title}
                      </h4>
                      <p className="text-gray-600 text-[11px] leading-relaxed">
                        {course.description}
                      </p>
                      <p className="text-[10px] text-gray-400 pt-1">
                        Faculty: {course.instructor}
                      </p>
                    </div>

                    <button
      onClick={() => toggleCourse(course.id)}
      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${isDone ? "bg-[#176B37] text-white hover:bg-[#14532D]" : "border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED]"}`}
    >
                      {isDone ? "Completed ✓" : "Start Course →"}
                    </button>
                  </div>
                </div>;
  })}
          </div>

          <div className="pt-2 border-t border-[#E5E7EB] text-center">
            {member ? <button
    onClick={() => downloadAcademyCertificate(member)}
    className="py-2.5 px-6 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs"
  >
                <Award className="w-4 h-4" />
                <span>Download Official Operator Certificate (PDF)</span>
              </button> : <p className="text-[11px] text-gray-500">
                Complete free member registration or sign in to download your personalized AMMON Academy certificate.
              </p>}
          </div>
        </div>
      </div>
    </div>;
};
export {
  AcademyModal
};
