import React from 'react';
import { 
  Users, 
  CreditCard, 
  ShieldCheck, 
  BookOpen, 
  Calendar, 
  Headphones 
} from 'lucide-react';

interface QuickActionBarProps {
  onOpenRegister: () => void;
  onOpenCardModal: () => void;
  onOpenPaymentModal: () => void;
  onOpenAcademy: () => void;
  onOpenEvents: () => void;
  onOpenSupport: () => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  onOpenRegister,
  onOpenCardModal,
  onOpenPaymentModal,
  onOpenAcademy,
  onOpenEvents,
  onOpenSupport,
}) => {
  const quickActions = [
    {
      id: 'register',
      title: 'Membership',
      subtitle: 'Registration',
      icon: Users,
      onClick: onOpenRegister,
    },
    {
      id: 'card',
      title: 'Digital',
      subtitle: 'Membership Card',
      icon: CreditCard,
      onClick: onOpenCardModal,
    },
    {
      id: 'payments',
      title: 'Secure Payments',
      subtitle: 'with Paystack',
      icon: ShieldCheck,
      onClick: onOpenPaymentModal,
    },
    {
      id: 'academy',
      title: 'AMMON',
      subtitle: 'Academy',
      icon: BookOpen,
      onClick: onOpenAcademy,
    },
    {
      id: 'events',
      title: 'Events &',
      subtitle: 'Conferences',
      icon: Calendar,
      onClick: onOpenEvents,
    },
    {
      id: 'support',
      title: 'Complaints &',
      subtitle: 'Support',
      icon: Headphones,
      onClick: onOpenSupport,
    },
  ];

  return (
    <section className="relative z-20 -mt-6 sm:-mt-8 max-w-7xl mx-auto px-4 sm:px-8">
      <div className="bg-white rounded-2xl shadow-lg border border-[#E5E7EB] py-4 px-3 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`flex items-center gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-[#EAF3ED]/60 transition-all duration-150 group cursor-pointer text-left ${
                  index !== 0 ? 'sm:pl-4' : ''
                }`}
              >
                {/* Circular Icon in Approved Primary Green #176B37 */}
                <div className="w-11 h-11 rounded-full bg-[#176B37] text-white flex items-center justify-center shrink-0 group-hover:bg-[#14532D] group-hover:scale-105 transition-all duration-200 shadow-xs">
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Text Label */}
                <div className="flex flex-col">
                  <span className="text-xs sm:text-[13px] font-bold text-[#252525] group-hover:text-[#176B37] transition-colors leading-tight">
                    {action.title}
                  </span>
                  <span className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">
                    {action.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
