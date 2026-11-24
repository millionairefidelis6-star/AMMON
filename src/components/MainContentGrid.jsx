import {
  ArrowRight,
  Calendar,
  MapPin,
  Users
} from "lucide-react";
const MainContentGrid = ({
  news,
  events,
  onSelectArticle,
  onSelectEvent,
  onOpenRegister,
  onOpenAboutModal,
  onViewAllNews,
  onViewAllEvents
}) => {
  const featuredArticle = news.find((n) => n.featured) || news[0];
  const sideArticles = news.filter((n) => n.id !== featuredArticle?.id).slice(0, 3);
  return <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {
    /* Column 1: Welcome to AMMON (3 Cols) */
  }
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            {
    /* Header with AMMON Green vertical accent bar */
  }
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-6 bg-[#176B37] rounded-full inline-block" />
              <h2 className="text-lg sm:text-xl font-bold text-[#252525] tracking-tight">
                Welcome to AMMON
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-[#252525]/80 leading-relaxed mb-4">
              The Association of Mobile Money Operators of Nigeria (AMMON) is the unified voice of POS agents, 
              mobile money operators and fintech stakeholders across the country.
            </p>

            <button
    onClick={onOpenAboutModal}
    className="inline-flex items-center gap-2 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-semibold px-4 py-2 rounded-full transition-all duration-150 cursor-pointer shadow-xs mb-5"
  >
              <span>Learn More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {
    /* Lagos Lekki Bridge Scenic Image */
  }
          <div className="rounded-xl overflow-hidden border border-[#E5E7EB] aspect-16/10 relative group">
            <img
    src="/assets/images/lagos_lekki_bridge_skyline_1794380622729.jpg"
    alt="Lagos Lekki-Ikoyi Link Bridge Commercial Skyline"
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
    referrerPolicy="no-referrer"
    onError={(e) => {
      e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
    }}
  />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-2.5">
              <span className="text-[11px] text-white font-medium drop-shadow-xs">
                Lagos Commercial Hub & Headquarters
              </span>
            </div>
          </div>
        </div>

        {
    /* Column 2: Latest News & Announcements (5 Cols) */
  }
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs flex flex-col h-full">
          {
    /* Header */
  }
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#176B37] rounded-full inline-block" />
              <h2 className="text-lg sm:text-xl font-bold text-[#252525] tracking-tight">
                Latest News & Announcements
              </h2>
            </div>
            <button
    onClick={onViewAllNews}
    className="text-xs font-semibold text-[#176B37] hover:text-[#14532D] flex items-center gap-1 hover:underline cursor-pointer"
  >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {
    /* Featured Breaking News Card */
  }
          {featuredArticle && <div
    onClick={() => onSelectArticle(featuredArticle)}
    className="group cursor-pointer rounded-xl overflow-hidden border border-[#E5E7EB] hover:border-[#176B37]/40 transition-all duration-200 mb-4 bg-gray-50/50"
  >
              <div className="relative aspect-16/9 overflow-hidden bg-slate-100">
                <img
    src={featuredArticle.image}
    alt={featuredArticle.title}
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
    referrerPolicy="no-referrer"
    onError={(e) => {
      e.currentTarget.src = "/assets/images/cbn_headquarters_abuja_1794380622253.jpg";
    }}
  />
                <span className="absolute top-2.5 left-2.5 bg-[#176B37] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                  Breaking News
                </span>
              </div>
              <div className="p-3.5">
                <h3 className="text-sm sm:text-base font-bold text-[#252525] group-hover:text-[#176B37] transition-colors leading-snug line-clamp-2">
                  {featuredArticle.title}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                  {featuredArticle.excerpt}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#176B37]" />
                  <span>{featuredArticle.date}</span>
                  <span>·</span>
                  <span>{featuredArticle.readTime}</span>
                </div>
              </div>
            </div>}

          {
    /* Secondary News List Items */
  }
          <div className="space-y-2.5 mt-auto">
            {sideArticles.map((article) => <div
    key={article.id}
    onClick={() => onSelectArticle(article)}
    className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#EAF3ED]/50 transition-colors cursor-pointer group border border-transparent hover:border-[#E5E7EB]"
  >
                <img
    src={article.image}
    alt={article.title}
    className="w-16 h-14 rounded-lg object-cover shrink-0 border border-gray-200"
    referrerPolicy="no-referrer"
    onError={(e) => {
      e.currentTarget.src = "/assets/images/ammon_stakeholders_forum_1794380623181.jpg";
    }}
  />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#252525] group-hover:text-[#176B37] transition-colors line-clamp-2 leading-tight">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                    <Calendar className="w-3 h-3 text-[#176B37]" />
                    <span>{article.date}</span>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {
    /* Column 3: Upcoming Events (4 Cols) */
  }
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            {
    /* Header */
  }
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#176B37] rounded-full inline-block" />
                <h2 className="text-lg sm:text-xl font-bold text-[#252525] tracking-tight">
                  Upcoming Events
                </h2>
              </div>
              <button
    onClick={onViewAllEvents}
    className="text-xs font-semibold text-[#176B37] hover:text-[#14532D] flex items-center gap-1 hover:underline cursor-pointer"
  >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {
    /* Event Items */
  }
            <div className="space-y-3 mb-6">
              {events.slice(0, 2).map((evt) => <div
    key={evt.id}
    onClick={() => onSelectEvent(evt)}
    className="flex items-start gap-3.5 p-3 rounded-xl border border-[#E5E7EB] hover:border-[#176B37]/50 hover:bg-[#EAF3ED]/30 transition-all duration-150 cursor-pointer group"
  >
                  {
    /* Green Date Box */
  }
                  <div className="w-14 h-14 rounded-xl bg-[#EAF3ED] border border-[#176B37]/20 flex flex-col items-center justify-center shrink-0 text-[#176B37] group-hover:bg-[#176B37] group-hover:text-white transition-colors duration-200">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none">
                      {evt.month}
                    </span>
                    <span className="text-xl font-black leading-tight">
                      {evt.day}
                    </span>
                  </div>

                  {
    /* Details */
  }
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-[13px] font-bold text-[#252525] group-hover:text-[#176B37] transition-colors leading-snug line-clamp-2">
                      {evt.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 text-[#176B37] shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>

          {
    /* Join AMMON Community Solid Primary Green CTA Box */
  }
          <div
    onClick={onOpenRegister}
    className="bg-[#176B37] hover:bg-[#14532D] text-white p-4 sm:p-5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer group flex items-center justify-between gap-3"
  >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold leading-tight">
                  Join the AMMON Community
                </h4>
                <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
                  and be part of a greater network
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white text-[#176B37] flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4 text-[#176B37]" />
            </div>
          </div>

        </div>

      </div>
    </section>;
};
export {
  MainContentGrid
};
