import React from 'react';
import { SocialSpaceWorkspace, SocialSpaceTab } from './SocialSpaceWorkspace';
import { Member, AdminUser, SocialMessage, OnlineMeeting } from '../types';

interface SocialSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SocialSpaceTab;
  loggedInMember: Member | null;
  adminUser?: AdminUser | null;
  members: Member[];
  messages: SocialMessage[];
  meetings: OnlineMeeting[];
  onSendMessage: (msg: SocialMessage) => void;
  onUpdateMessage: (id: string, updates: Partial<SocialMessage>) => void;
  onCreateMeeting: (meeting: OnlineMeeting) => void;
  onUpdateMeeting: (id: string, updates: Partial<OnlineMeeting>) => void;
}

export const SocialSpaceModal: React.FC<SocialSpaceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'chat',
  loggedInMember,
  adminUser,
  members,
  messages,
  meetings,
  onSendMessage,
  onUpdateMessage,
  onCreateMeeting,
  onUpdateMeeting,
}) => {
  if (!isOpen) return null;

  const currentUser = loggedInMember
    ? {
        id: loggedInMember.id,
        name: loggedInMember.fullName,
        role: loggedInMember.category === 'Super Agents' ? 'Super Agent' : 'POS Agent',
        badge: loggedInMember.membershipId,
        avatar: loggedInMember.photoUrl,
      }
    : adminUser
    ? {
        id: adminUser.id,
        name: adminUser.fullName,
        role: adminUser.role,
        badge: adminUser.badgeNumber,
        avatar: adminUser.avatarUrl,
      }
    : {
        id: members[0]?.id || 'guest-visitor',
        name: members[0]?.fullName || 'AMMON Community Guest',
        role: 'Operator',
        badge: members[0]?.membershipId || 'PUBLIC-GUEST',
        avatar: members[0]?.photoUrl,
      };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[92vh] flex flex-col"
      >
        <SocialSpaceWorkspace
          currentUser={currentUser}
          members={members}
          messages={messages}
          meetings={meetings}
          onSendMessage={onSendMessage}
          onUpdateMessage={onUpdateMessage}
          onCreateMeeting={onCreateMeeting}
          onUpdateMeeting={onUpdateMeeting}
          initialTab={initialTab}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
