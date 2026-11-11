import React from 'react';
import { 
  MapPin, 
  Mail, 
  Phone, 
  ShieldCheck, 
  ArrowRight, 
  Lock,
  Globe,
  ExternalLink
} from 'lucide-react';
import { AmmonLogo } from './AmmonLogo';

interface FooterProps {
  onOpenRegister: () => void;
  onOpenVerify: () => void;
  onOpenDispute: () => void;
  onOpenAcademy: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenRegister,
  onOpenVerify,
  onOpenDispute,
  onOpenAcademy,
}) => {
  return (
    <footer className="w-full bg-white border-t border-[#E5E7EB] pt-12 pb-8 text-xs text-[#252525]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-[#E5E7EB]">
          
          {/* Col 1: Brand & Charter (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <AmmonLogo />
            <p className="text-xs text-gray-600 leading-relaxed max-w-sm">
              The Association of Mobile Money Operators of Nigeria (AMMON) is the apex umbrella body representing 
              over 140,000 POS agents, mobile money operators, and fintech stakeholders dedicated to driving 
              grassroot financial inclusion.
            </p>

            <div className="pt-2 text-[11px] text-gray-500 space-y-1">
              <p>CAC Registration: <strong className="font-mono text-gray-700">CAC/IT/NO/129481</strong></p>
              <p>Recognised by: <strong className="text-[#176B37]">Central Bank of Nigeria (CBN)</strong></p>
            </div>
          </div>

          {/* Col 2: Institutional Services (2 Cols) */}
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

          {/* Col 3: Key State Chapters (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#176B37]">
              Regional Secretariats
            </h4>
            <div className="space-y-2 text-gray-600">
              <div>
                <p className="font-bold text-gray-800">National Headquarters (Lagos)</p>
                <p className="text-[11px] text-gray-500">Plot 14, Commercial Avenue, Yaba, Lagos State</p>
              </div>
              <div>
                <p className="font-bold text-gray-800">Abuja Liaison Directorate (FCT)</p>
                <p className="text-[11px] text-gray-500">Suite 302, Central Business District, Abuja</p>
              </div>
              <div>
                <p className="font-bold text-gray-800">Northern Regional Office</p>
                <p className="text-[11px] text-gray-500">Post Office Road, Nassarawa, Kano</p>
              </div>
            </div>
          </div>

          {/* Col 4: Contact & Hotlines (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#176B37]">
              Support & Emergency
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-[#176B37] shrink-0" />
                <span className="font-mono font-semibold">+234 (0) 800 266 6664</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-[#176B37] shrink-0" />
                <span>info@ammon.ng</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Globe className="w-4 h-4 text-[#176B37] shrink-0" />
                <span>www.ammon.ng</span>
              </div>
            </div>

            {/* Emergency Police Exemption note */}
            <div className="p-3 rounded-xl bg-[#EAF3ED] border border-[#176B37]/20 text-[11px] text-[#14532D]">
              <span className="font-bold block">Operator Legal Protection:</span>
              Court Order FHC/L/CS/2023/1844 exempts all verified AMMON kiosks from unlawful local council ticketing.
            </div>
          </div>

        </div>

        {/* Corporate Partners Strip */}
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

        {/* Copyright & Disclaimer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
          <div>
            © {new Date().getFullYear()} Association of Mobile Money Operators of Nigeria (AMMON). All Rights Reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#176B37]">Constitution</a>
            <span>·</span>
            <a href="#" className="hover:text-[#176B37]">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-[#176B37]">CBN Guidelines</a>
            <span>·</span>
            <span className="text-[#176B37] font-semibold">Approved Brand Colour: #176B37</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
