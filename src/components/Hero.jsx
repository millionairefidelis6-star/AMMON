import { useState } from "react";
import { ArrowRight, User, ChevronLeft, ChevronRight, CheckCircle2, Shield, Award } from "lucide-react";
const Hero = ({ onOpenRegister, onOpenLogin, enrolledCount }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      id: 1,
      badge: "Together for a Digital Nigeria",
      image: "/assets/images/ammon_hero_pos_agent_1794380620175.jpg",
      alt: "Nigerian female POS agent wearing AMMON green uniform with POS terminal",
      caption: "Official national digital accreditation for POS & Mobile Money operators"
    },
    {
      id: 2,
      badge: "CBN Regulatory Alignment",
      image: "/assets/images/cbn_headquarters_abuja_1794380622253.jpg",
      alt: "Central Bank of Nigeria Headquarters",
      caption: "Protecting operators against illegal taxes & arbitrary fees"
    },
    {
      id: 3,
      badge: "Financial Inclusion for All",
      image: "/assets/images/lagos_lekki_bridge_skyline_1794380622729.jpg",
      alt: "Lagos commercial landscape and Lekki Link Bridge",
      caption: "Connecting 774 Local Government Areas to modern banking"
    }
  ];
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };
  return <section className="relative w-full bg-[#FFFFFF] overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 border-b border-[#E5E7EB]">
      {
    /* Subtle background ambient light */
  }
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#EAF3ED]/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#EAF3ED]/40 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {
    /* Left Column: Institutional Typography & Action Callouts */
  }
          <div className="lg:col-span-6 flex flex-col justify-center space-y-5 sm:space-y-6 min-w-0">
            
            {
    /* Main Headline */
  }
            <div className="space-y-1">
              <h1 className="text-[26px] sm:text-4xl md:text-5xl lg:text-[46px] font-black tracking-tight text-[#252525] uppercase leading-[1.08] break-words">
                <span>ONE ASSOCIATION.</span>
                <br />
                <span>ONE VOICE.</span>
                <br />
                <span className="text-[#176B37]">A STRONGER AGENT</span>
                <br />
                <span className="text-[#176B37]">BANKING INDUSTRY.</span>
              </h1>
            </div>

            {
    /* Subtitle Description */
  }
            <p className="text-sm sm:text-lg text-[#252525]/80 font-normal leading-relaxed max-w-xl">
              Connecting, empowering and representing Nigeria&apos;s mobile money operators, 
              POS agents and fintech ecosystem across all 774 local government areas.
            </p>

            {
    /* CTA Buttons */
  }
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
              <button
    onClick={onOpenRegister}
    className="inline-flex items-center gap-2 bg-[#176B37] hover:bg-[#14532D] text-white font-semibold text-sm sm:text-base px-5 sm:px-7 py-3 sm:py-3.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group"
  >
                <span>Become a Member</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
    onClick={onOpenLogin}
    className="inline-flex items-center gap-2 bg-white hover:bg-[#EAF3ED] text-[#176B37] border-2 border-[#176B37] font-semibold text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-200 cursor-pointer shadow-xs"
  >
                <User className="w-4 h-4 text-[#176B37]" />
                <span>Member Login</span>
              </button>
            </div>

            {
    /* Institutional Trust Badges */
  }
            <div className="pt-4 border-t border-[#E5E7EB] flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#252525]/70">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0" />
                <span className="font-semibold text-[#14532D] tabular-nums">
                  {enrolledCount.toLocaleString()} Enrolled {enrolledCount === 1 ? "Member" : "Members"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#176B37] shrink-0" />
                <span className="font-medium">CBN Regulatory Recognised</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#176B37] shrink-0" />
                <span className="font-medium">36 States & FCT Chapters</span>
              </div>
            </div>

          </div>

          {
    /* Right Column: Hero Visual Asset & Floating Nigeria Badge */
  }
          <div className="lg:col-span-6 relative min-w-0">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#E5E7EB] aspect-4/3 sm:aspect-16/10 bg-slate-100">
              {
    /* Active Image */
  }
              <img
    src={slides[currentSlide].image}
    alt={slides[currentSlide].alt}
    className="w-full h-full object-cover object-center transition-all duration-500 ease-out"
    referrerPolicy="no-referrer"
    onError={(e) => {
      e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
    }}
  />

              {
    /* Gradient scrim for text legibility */
  }
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {
    /* Floating "Together for a Digital Nigeria" Brand Badge with Nigeria silhouette */
  }
              <div className="absolute top-3 right-3 sm:top-6 sm:right-6 max-w-[calc(100%-1.5rem)] bg-[#176B37] text-white p-2.5 sm:p-4 rounded-xl shadow-lg border border-white/20 flex items-center gap-2.5 sm:gap-3 backdrop-blur-xs">
                {
    /* Nigeria Map Icon / Shield */
  }
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-sm font-bold tracking-tight leading-tight truncate">
                    Together for a Digital Nigeria
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-emerald-100 font-medium truncate">
                    National Agent Banking Charter
                  </div>
                </div>
              </div>

              {
    /* Bottom Caption & Carousel Navigation */
  }
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-center justify-between z-10">
                <div className="text-white text-xs sm:text-sm font-medium drop-shadow-sm max-w-[65%] truncate">
                  {slides[currentSlide].caption}
                </div>

                {
    /* Slider Controls */
  }
                <div className="flex items-center gap-2">
                  {
    /* Dots */
  }
                  <div className="flex items-center gap-1.5 mr-2">
                    {slides.map((_, idx) => <button
    key={idx}
    onClick={() => setCurrentSlide(idx)}
    aria-label={`Go to slide ${idx + 1}`}
    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${currentSlide === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
  />)}
                  </div>

                  {
    /* Arrow controls */
  }
                  <div className="flex items-center gap-1">
                    <button
    onClick={prevSlide}
    aria-label="Previous slide"
    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
  >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
    onClick={nextSlide}
    aria-label="Next slide"
    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
  >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>;
};
export {
  Hero
};
