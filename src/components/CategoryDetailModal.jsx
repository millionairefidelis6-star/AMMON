import { X, CheckCircle2, ArrowRight } from "lucide-react";
const CategoryDetailModal = ({
  category,
  isOpen,
  onClose,
  onApply
}) => {
  if (!isOpen || !category) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
    className="bg-white rounded-3xl max-w-lg w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    onClick={(e) => e.stopPropagation()}
  >
        {
    /* Header */
  }
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
              {category.code}
            </span>
            <h3 className="font-bold text-lg leading-tight">{category.name}</h3>
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
          <p className="text-gray-700 leading-relaxed text-xs sm:text-sm">
            {category.description}
          </p>

          <div className="p-4 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/20 flex items-center justify-between">
            <span className="font-semibold text-gray-700">Official Annual Dues</span>
            <span className="font-mono font-black text-lg text-[#176B37]">
              {category.annualDues}
            </span>
          </div>

          {
    /* Benefits */
  }
          <div>
            <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider mb-2">
              Membership Privileges & Protection
            </h4>
            <div className="space-y-2">
              {category.benefits.map((b, i) => <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0 mt-0.5" />
                  <span className="text-gray-700 leading-snug">{b}</span>
                </div>)}
            </div>
          </div>

          {
    /* Requirements */
  }
          <div>
            <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider mb-2">
              Accreditation Requirements
            </h4>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
              {category.requirements.map((r, i) => <div key={i} className="flex items-center gap-2 text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B37]" />
                  <span>{r}</span>
                </div>)}
            </div>
          </div>

          <div className="pt-2">
            <button
    onClick={() => {
      onClose();
      onApply();
    }}
    className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
  >
              <span>Apply for {category.name} Membership</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>;
};
export {
  CategoryDetailModal
};
