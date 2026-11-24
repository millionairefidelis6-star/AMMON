import { SocialSpaceWorkspace } from "./SocialSpaceWorkspace";
const SocialSpaceModal = ({
  isOpen,
  onClose,
  initialTab = "chat",
  loggedInMember,
  adminUser,
  members,
  messages,
  meetings,
  onSendMessage,
  onUpdateMessage,
  onPermanentDeleteMessage,
  onCreateMeeting,
  onUpdateMeeting
}) => {
  if (!isOpen) return null;
  const isExecSuperAdmin = Boolean(
    adminUser && (adminUser.level === "super_admin" || adminUser.role === "Super Admin")
  );
  const currentUser = loggedInMember ? {
    id: loggedInMember.id,
    name: loggedInMember.fullName,
    role: loggedInMember.category === "Super Agents" ? "Super Agent" : "POS Agent",
    badge: loggedInMember.membershipId,
    avatar: loggedInMember.photoUrl,
    isAdmin: false,
    isSuperAdmin: false
  } : adminUser ? {
    id: adminUser.id,
    name: adminUser.fullName,
    role: adminUser.role,
    badge: adminUser.badgeNumber,
    avatar: adminUser.avatarUrl,
    isAdmin: true,
    isSuperAdmin: isExecSuperAdmin
  } : {
    id: members[0]?.id || "guest-visitor",
    name: members[0]?.fullName || "AMMON Community Guest",
    role: "Operator",
    badge: members[0]?.membershipId || "PUBLIC-GUEST",
    avatar: members[0]?.photoUrl,
    isAdmin: false,
    isSuperAdmin: false
  };
  return <div
    onClick={onClose}
    className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden"
  >
      <div
    onClick={(e) => e.stopPropagation()}
    className="w-full max-w-6xl h-dvh sm:h-[94dvh] flex flex-col min-h-0 overflow-hidden"
  >
        <SocialSpaceWorkspace
    currentUser={currentUser}
    members={members}
    messages={messages}
    meetings={meetings}
    onSendMessage={onSendMessage}
    onUpdateMessage={onUpdateMessage}
    onPermanentDeleteMessage={isExecSuperAdmin ? onPermanentDeleteMessage : void 0}
    onCreateMeeting={onCreateMeeting}
    onUpdateMeeting={onUpdateMeeting}
    initialTab={initialTab}
    onClose={onClose}
  />
      </div>
    </div>;
};
export {
  SocialSpaceModal
};
