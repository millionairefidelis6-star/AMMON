import {
  Mail,
  Phone,
  Globe
} from "lucide-react";
import { AmmonLogo } from "./AmmonLogo";
const Footer = ({
  onOpenRegister,
  onOpenVerify,
  onOpenDispute,
  onOpenAcademy
}) => {
  return <footer className="w-full bg-white border-t border-[#E5E7EB] pt-12 pb-8 text-xs text-[#252525]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {
    /* Main Footer Grid */
  }
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-[#E5E7EB]">
          
          {
    /* Col 1: Brand & Charter (3 Cols) */
  }
          <div className="lg:col-span-3 space-y-4">
            <AmmonLogo />
            <p className="text-xs text-gray-600 leading-relaxed max-w-sm">
              The Association of Mobile Money Operators of Nigeria (AMMON) is the apex umbrella body representing 
              POS agents, mobile money operators, and fintech stakeholders dedicated to driving 
              grassroots financial inclusion.
            </p>

            <div className="pt-2 text-[11px] text-gray-500 space-y-1">
              <p>CAC Registration: <strong className="font-mono text-gray-700">RC 80540</strong></p>
              <p>Recognised by: <strong className="text-[#176B37]">Central Bank of Nigeria (CBN)</strong></p>
            </div>
          </div>

          {
    /* Col 2: Institutional Services (2 Cols) */
  }
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#176B37]">
              Member Services
            </h4>
            <ul className="space-y-2 text-gray-600">
              <li>
                <button onClick={onOpenRegister} className="hover:text-[#176B37] hover:underline cursor-pointer">
                  Join Association
                </button>
              </li>
              <li>
                <button onClick={onOpenVerify} className="hover:text-[#176B37] hover:underline cursor-pointer">
                  Verify Credentials
                </button>
              </li>
              <li>
                <button onClick={onOpenAcademy} className="hover:text-[#176B37] hover:underline cursor-pointer">
                  AMMON Academy
                </button>
              </li>
              <li>
                <button onClick={onOpenDispute} className="hover:text-[#176B37] hover:underline cursor-pointer text-amber-700 font-semibold">
                  Report Harassment
                </button>
              </li>
              <li>
                <a href="#categories" className="hover:text-[#176B37] hover:underline">
                  Membership Tiers
                </a>
              </li>
            </ul>
          </div>

          {
    /* Col 3: National & Zonal Secretariats (4 Cols) */
  }
          <div className="lg:col-span-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#176B37]">
              National &amp; Zonal Secretariats
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-gray-600">
              <div className="sm:col-span-2">
                <p className="font-bold text-gray-800">AMMON National HQ</p>
                <p className="text-[11px] text-gray-500">
                  46 Dala Hills Street, Brains &amp; Hammers Estate, Galadimawa, Abuja.
                </p>
                <p className="text-[11px] font-mono font-semibold text-[#176B37]">07045900900</p>
              </div>
              <div>
                <p className="font-bold text-gray-800">South-South Zonal Office</p>
                <p className="text-[11px] text-gray-500">
                  Milfid HQ, Adjacent Finchley Supermarket, Akenfa, Yenagoa, Bayelsa State.
                </p>
                <p className="text-[11px] font-mono font-semibold text-[#176B37]">08027990125</p>
              </div>
              <div>
                <p className="font-bold text-gray-800">South-East Zonal Office</p>
                <p className="text-[11px] text-gray-500">
                  Block C, Lot 1, Umahi International Market, Abakaliki, Ebonyi State.
                </p>
                <p className="text-[11px] font-mono font-semibold text-[#176B37]">08068869864</p>
              </div>
              <div>
                <p className="font-bold text-gray-800">South-West Zonal Office</p>
                <p className="text-[11px] text-gray-500">
                  United Plaza, 101 Shasha Road, Jesus Power Bus Stop, Shasha/Akowonjo, Lagos State.
                </p>
              </div>
              <div>
                <p className="font-bold text-gray-800">North-West Zonal Office</p>
                <p className="text-[11px] text-gray-500">
                  No. 10 Tudun Wada Low Cost, Gusau, Zamfara State.
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  <span className="font-semibold text-gray-700">Kano Address:</span> No. LW13 Amana Plaza, Beside Shoprite, Zoo Road, Kano Regular.
                </p>
              </div>
            </div>
          </div>

          {
    /* Col 4: Contact & Hotlines (3 Cols) */
  }
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#176B37]">
              Support & Emergency
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-[#176B37] shrink-0" />
                <span className="font-mono font-semibold">07045900900</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-[#176B37] shrink-0" />
                <a href="mailto:ammonngr@gmail.com" className="hover:text-[#176B37] hover:underline">
                  ammonngr@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Globe className="w-4 h-4 text-[#176B37] shrink-0" />
                <a href="https://www.ammon.com.ng" target="_blank" rel="noopener noreferrer" className="hover:text-[#176B37] hover:underline">
                  www.ammon.com.ng
                </a>
              </div>
            </div>

            {
    /* Emergency Police Exemption note */
  }
            <div className="p-3 rounded-xl bg-[#EAF3ED] border border-[#176B37]/20 text-[11px] text-[#14532D]">
              <span className="font-bold block">Operator Legal Protection:</span>
              Court Order FHC/L/CS/2023/1844 exempts all verified AMMON kiosks from unlawful local council ticketing.
            </div>
          </div>

        </div>

        {
    /* Corporate Partners Strip */
  }
        <div id="partners" className="py-6 border-b border-[#E5E7EB]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-center mb-3">
            Institutional Ecosystem & Financial Partners
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-gray-500">
            <span className="hover:text-[#176B37] transition-colors">Central Bank of Nigeria (CBN)</span>
            <span className="text-gray-300">·</span>
            <span className="hover:text-[#176B37] transition-colors">NIBSS</span>
            <span className="text-gray-300">·</span>
            <span className="hover:text-[#176B37] transition-colors">Paystack</span>
            <span className="text-gray-300">·</span>
            <span className="hover:text-[#176B37] transition-colors">Interswitch</span>
            <span className="text-gray-300">·</span>
            <span className="hover:text-[#176B37] transition-colors">SANEF</span>
            <span className="text-gray-300">·</span>
            <span className="hover:text-[#176B37] transition-colors">Moniepoint</span>
            <span className="text-gray-300">·</span>
            <span className="hover:text-[#176B37] transition-colors">OPay</span>
          </div>
        </div>

        {
    /* Copyright & Attribution */
  }
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
          <div>
            © {(/* @__PURE__ */ new Date()).getFullYear()} Association of Mobile Money Operators of Nigeria (AMMON). All Rights Reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a href="#" className="hover:text-[#176B37]">Constitution</a>
            <span>·</span>
            <a href="#" className="hover:text-[#176B37]">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-[#176B37]">CBN Guidelines</a>
            <span>·</span>
            <span className="text-red-600 font-bold">Powered by RapidSeek Technology Ltd.</span>
          </div>
        </div>

      </div>
    </footer>;
};
export {
  Footer
};
