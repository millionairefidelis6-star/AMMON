const AmmonLogo = ({ className = "", variant = "full" }) => {
  const isWhite = variant === "white";
  const primaryColor = isWhite ? "#FFFFFF" : "#176B37";
  const subtextColor = isWhite ? "#EAF3ED" : "#4B5563";
  if (variant === "compact") {
    return <div className={`relative flex items-center justify-center select-none w-full h-full ${className}`}>
        <img
      src="/assets/images/ammon_logo.jpg"
      alt="AMMON Logo"
      className="max-w-full max-h-full object-contain rounded-sm"
      referrerPolicy="no-referrer"
    />
      </div>;
  }
  if (variant === "white") {
    return <div className={`flex items-center gap-3 select-none ${className}`}>
        <div className="relative shrink-0 flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 bg-white rounded-xl p-1 shadow-xs border border-white/20">
          <img
      src="/assets/images/ammon_logo.jpg"
      alt="AMMON Logo"
      className="w-full h-full object-contain"
      referrerPolicy="no-referrer"
    />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight text-xl leading-none text-white font-sans">
            AMMON
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold leading-tight tracking-normal text-emerald-100 whitespace-nowrap mt-1">
            Association of Mobile Money Operators of Nigeria
          </span>
          <span className="text-[9px] font-mono font-medium text-emerald-200 mt-0.5">
            RC 80540 • Central Bank of Nigeria Recognized
          </span>
        </div>
      </div>;
  }
  return <div className={`flex items-center gap-1.5 sm:gap-3 select-none min-w-0 ${className}`}>
      {
    /* Official AMMON Emblem Image */
  }
      <div className="relative shrink-0 flex items-center justify-center h-8 w-8 sm:h-11 sm:w-11 bg-white rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-[#E5E7EB] shadow-xs">
        <img
    src="/assets/images/ammon_logo.jpg"
    alt="AMMON Official Logo"
    className="w-full h-full object-contain"
    referrerPolicy="no-referrer"
  />
      </div>

      {
    /* Typography */
  }
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
    className="font-extrabold tracking-tight text-base sm:text-xl md:text-2xl leading-none font-sans"
    style={{ color: primaryColor }}
  >
            AMMON
          </span>
          <span className="hidden sm:inline-block text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#EAF3ED] text-[#176B37] border border-[#176B37]/20 shrink-0">
            RC 80540
          </span>
        </div>
        <span className="sm:hidden text-[8px] font-bold font-mono text-[#176B37] leading-none mt-0.5">
          RC 80540
        </span>
        <span
    className="text-[10px] lg:text-[11px] font-semibold leading-tight tracking-normal mt-0.5 hidden md:block truncate max-w-[230px] lg:max-w-none"
    style={{ color: subtextColor }}
  >
          Association of Mobile Money Operators of Nigeria
        </span>
      </div>
    </div>;
};
export {
  AmmonLogo
};
