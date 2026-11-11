import React from 'react';
import { 
  ArrowRight, 
  Smartphone, 
  Users, 
  Building, 
  Package, 
  Landmark, 
  Network 
} from 'lucide-react';
import { MEMBERSHIP_CATEGORIES_DATA } from '../data/mockData';

interface MembershipCategoriesProps {
  onSelectCategory: (category: typeof MEMBERSHIP_CATEGORIES_DATA[0]) => void;
  onViewAll: () => void;
}

export const MembershipCategories: React.FC<MembershipCategoriesProps> = ({
  onSelectCategory,
  onViewAll,
}) => {
  // Mapping of category icons
  const getIcon = (id: string) => {
    switch (id) {
      case 'pos-agents':
        return Smartphone;
      case 'super-agents':
        return Users;
      case 'fintech-companies':
        return Network;
      case 'distributors':
        return Package;
      case 'corporate-members':
        return Landmark;
      default:
        return Building;
    }
  };

  return (
    <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 border-t border-[#E5E7EB]">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[#176B37] rounded-full inline-block" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#252525] tracking-tight">
            Our Membership Categories
          </h2>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs sm:text-sm font-semibold text-[#176B37] hover:text-[#14532D] flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>View All Categories</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 6 Category Cards matching reference screenshot: #EAF3ED background, subtle border, #176B37 icons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {MEMBERSHIP_CATEGORIES_DATA.map((cat) => {
          const Icon = getIcon(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              className="bg-[#EAF3ED] hover:bg-[#176B37] text-[#252525] hover:text-white p-3.5 sm:p-4 rounded-xl border border-[#176B37]/15 hover:border-[#176B37] transition-all duration-200 cursor-pointer flex items-center gap-3 group text-left shadow-2xs hover:shadow-md"
            >
              {/* Icon Container */}
              <div className="w-9 h-9 rounded-lg bg-white/80 group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-5 h-5 text-[#176B37] group-hover:text-white transition-colors" />
              </div>

              {/* Label */}
              <span className="text-xs sm:text-[13px] font-bold tracking-tight line-clamp-1">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
