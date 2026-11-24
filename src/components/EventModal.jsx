import { useState } from "react";
import { X, MapPin, Users, Clock, CheckCircle2, Ticket } from "lucide-react";
const EventModal = ({
  event,
  isOpen,
  onClose
}) => {
  const [registered, setRegistered] = useState(false);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");
  if (!isOpen || !event) return null;
  const handleRegister = (e) => {
    e.preventDefault();
    setRegistered(true);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
    className="bg-white rounded-3xl max-w-lg w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    onClick={(e) => e.stopPropagation()}
  >
        {
    /* Header */
  }
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base leading-tight">Event Registration</h3>
              <p className="text-xs text-emerald-100">{event.category}</p>
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
    /* Date & Title Banner */
  }
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/20">
            <div className="w-16 h-16 rounded-xl bg-[#176B37] text-white flex flex-col items-center justify-center shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider">{event.month}</span>
              <span className="text-2xl font-black">{event.day}</span>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[#252525] leading-snug">
                {event.title}
              </h4>
              <div className="flex flex-col gap-1 text-[11px] text-gray-600 mt-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#176B37]" />
                  {event.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#176B37]" />
                  {event.location}, {event.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#176B37]" />
                  {event.attendeesCount} Registered Attendees
                </span>
              </div>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed text-xs sm:text-sm">
            {event.description}
          </p>

          {
    /* Registration Form / Success */
  }
          {registered ? <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#176B37] text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-sm text-[#14532D]">
                Registration Confirmed!
              </h5>
              <p className="text-gray-600 text-xs">
                Your delegate pass for <strong>{attendeeName || "Delegate"}</strong> has been reserved. 
                An SMS confirmation has been dispatched.
              </p>
            </div> : <form onSubmit={handleRegister} className="space-y-3 pt-2 border-t border-[#E5E7EB]">
              <h5 className="font-bold text-xs uppercase text-gray-700 tracking-wider">
                Reserve Delegate Seat (Free for Active AMMON Members)
              </h5>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Delegate Full Name *
                </label>
                <input
    type="text"
    required
    value={attendeeName}
    onChange={(e) => setAttendeeName(e.target.value)}
    placeholder="e.g. Alhassan Ibrahim"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Mobile Number (for SMS Pass) *
                </label>
                <input
    type="tel"
    required
    value={attendeePhone}
    onChange={(e) => setAttendeePhone(e.target.value)}
    placeholder="+234 800 000 0000"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>

              <button
    type="submit"
    className="w-full py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
  >
                Confirm Free Attendance Pass
              </button>
            </form>}

        </div>
      </div>
    </div>;
};
export {
  EventModal
};
