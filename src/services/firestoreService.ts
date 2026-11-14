import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, NewsArticle, DisputeTicket, SocialMessage, OnlineMeeting } from '../types';

const MEMBERS_PATH = 'members';
const NEWS_PATH = 'news';
const DISPUTES_PATH = 'disputes';
const SOCIAL_MESSAGES_PATH = 'social_messages';
const MEETINGS_PATH = 'meetings';

export const LEGACY_TEST_MEMBER_IDS = new Set([
  'mem-1',
  'mem-2',
  'mem-3',
  'mem-4',
  'mem-5',
  'mem-6',
  'mem-7',
  'mem-8',
  'mem-9',
  'mem-10',
  'mem-11',
  'mem-12',
  'mem-13',
  'mem-14',
]);

const LEGACY_TEST_DISPUTE_IDS = new Set(['disp-1', 'disp-2', 'disp-3']);
const LEGACY_TEST_SOCIAL_IDS = new Set(['msg-1', 'msg-2', 'msg-3', 'msg-4', 'msg-5']);
const LEGACY_TEST_MEETING_IDS = new Set(['mtg-1', 'mtg-2', 'mtg-3']);

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

export async function seedInitialFirestoreData(
  _initialMembers: Member[],
  initialNews: NewsArticle[],
  _initialDisputes: DisputeTicket[],
  _initialSocialMessages: SocialMessage[] = [],
  _initialMeetings: OnlineMeeting[] = []
) {
  try {
    // Only ensure public news circulars exist if news collection is empty.
    // Production members, disputes, social messages, and meetings always start at zero.
    const newsSnap = await getDocs(collection(db, NEWS_PATH));
    if (newsSnap.empty) {
      for (const n of initialNews) {
        await setDoc(doc(db, NEWS_PATH, n.id), stripUndefined(n as unknown as Record<string, unknown>));
      }
    }
  } catch (error) {
    console.warn('Initial seeding note:', error);
  }
}

export async function purgeLegacyTestDocsAsAdmin(): Promise<void> {
  const targets: [string, Set<string>][] = [
    [MEMBERS_PATH, LEGACY_TEST_MEMBER_IDS],
    [DISPUTES_PATH, LEGACY_TEST_DISPUTE_IDS],
    [SOCIAL_MESSAGES_PATH, LEGACY_TEST_SOCIAL_IDS],
    [MEETINGS_PATH, LEGACY_TEST_MEETING_IDS],
  ];

  for (const [colPath, idSet] of targets) {
    for (const docId of idSet) {
      try {
        await deleteDoc(doc(db, colPath, docId));
      } catch {
        // Ignore if doc already absent or caller lacks Firestore admin claims
      }
    }
  }
}

export function subscribeToMembers(
  onUpdate: (members: Member[]) => void,
  _fallbackMembers: Member[] = []
) {
  try {
    return onSnapshot(
      collection(db, MEMBERS_PATH),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: Member[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          if (!LEGACY_TEST_MEMBER_IDS.has(docSnap.id)) {
            list.push(docSnap.data() as Member);
          }
        });
        onUpdate(list);
      },
      (error: FirestoreError) => {
        console.error('Members listener error:', error);
        handleFirestoreError(error, OperationType.GET, MEMBERS_PATH);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MEMBERS_PATH);
    return () => {};
  }
}

export function subscribeToNews(
  onUpdate: (news: NewsArticle[]) => void,
  fallbackNews: NewsArticle[]
) {
  try {
    return onSnapshot(
      collection(db, NEWS_PATH),
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (!snapshot.empty) {
          const list: NewsArticle[] = [];
          snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
            list.push(docSnap.data() as NewsArticle);
          });
          onUpdate(list);
        } else {
          onUpdate(fallbackNews);
        }
      },
      (error: FirestoreError) => {
        console.error('News listener error:', error);
        handleFirestoreError(error, OperationType.GET, NEWS_PATH);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, NEWS_PATH);
    return () => {};
  }
}

export function subscribeToDisputes(
  onUpdate: (disputes: DisputeTicket[]) => void,
  _fallbackDisputes: DisputeTicket[] = []
) {
  try {
    return onSnapshot(
      collection(db, DISPUTES_PATH),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: DisputeTicket[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          if (!LEGACY_TEST_DISPUTE_IDS.has(docSnap.id)) {
            list.push(docSnap.data() as DisputeTicket);
          }
        });
        onUpdate(list);
      },
      (error: FirestoreError) => {
        console.error('Disputes listener error:', error);
        handleFirestoreError(error, OperationType.GET, DISPUTES_PATH);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, DISPUTES_PATH);
    return () => {};
  }
}

export function subscribeToSocialMessages(
  onUpdate: (messages: SocialMessage[]) => void,
  _fallbackMessages: SocialMessage[] = []
) {
  try {
    return onSnapshot(
      collection(db, SOCIAL_MESSAGES_PATH),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: SocialMessage[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          if (!LEGACY_TEST_SOCIAL_IDS.has(docSnap.id)) {
            list.push(docSnap.data() as SocialMessage);
          }
        });
        list.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
        onUpdate(list);
      },
      (error: FirestoreError) => {
        console.error('Social messages listener error:', error);
        handleFirestoreError(error, OperationType.GET, SOCIAL_MESSAGES_PATH);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, SOCIAL_MESSAGES_PATH);
    return () => {};
  }
}

export function subscribeToMeetings(
  onUpdate: (meetings: OnlineMeeting[]) => void,
  _fallbackMeetings: OnlineMeeting[] = []
) {
  try {
    return onSnapshot(
      collection(db, MEETINGS_PATH),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: OnlineMeeting[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          if (!LEGACY_TEST_MEETING_IDS.has(docSnap.id)) {
            list.push(docSnap.data() as OnlineMeeting);
          }
        });
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        onUpdate(list);
      },
      (error: FirestoreError) => {
        console.error('Meetings listener error:', error);
        handleFirestoreError(error, OperationType.GET, MEETINGS_PATH);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MEETINGS_PATH);
    return () => {};
  }
}

export async function addMemberToFirestore(member: Member) {
  try {
    await setDoc(doc(db, MEMBERS_PATH, member.id), stripUndefined(member as unknown as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEMBERS_PATH}/${member.id}`);
  }
}

export async function updateMemberInFirestore(id: string, updates: Partial<Member>) {
  try {
    await updateDoc(doc(db, MEMBERS_PATH, id), stripUndefined(updates as unknown as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MEMBERS_PATH}/${id}`);
  }
}

export async function addNewsToFirestore(article: NewsArticle) {
  try {
    await setDoc(doc(db, NEWS_PATH, article.id), stripUndefined(article as unknown as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${NEWS_PATH}/${article.id}`);
  }
}

export async function addDisputeToFirestore(dispute: DisputeTicket) {
  try {
    await setDoc(doc(db, DISPUTES_PATH, dispute.id), stripUndefined(dispute as unknown as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DISPUTES_PATH}/${dispute.id}`);
  }
}

export async function updateDisputeInFirestore(id: string, updates: Partial<DisputeTicket>) {
  try {
    await updateDoc(doc(db, DISPUTES_PATH, id), stripUndefined(updates as unknown as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${DISPUTES_PATH}/${id}`);
  }
}

export async function addSocialMessageToFirestore(message: SocialMessage) {
  try {
    await setDoc(
      doc(db, SOCIAL_MESSAGES_PATH, message.id),
      stripUndefined(message as unknown as Record<string, unknown>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SOCIAL_MESSAGES_PATH}/${message.id}`);
  }
}

export async function updateSocialMessageInFirestore(id: string, updates: Partial<SocialMessage>) {
  try {
    await updateDoc(
      doc(db, SOCIAL_MESSAGES_PATH, id),
      stripUndefined(updates as unknown as Record<string, unknown>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SOCIAL_MESSAGES_PATH}/${id}`);
  }
}

export async function addMeetingToFirestore(meeting: OnlineMeeting) {
  try {
    await setDoc(
      doc(db, MEETINGS_PATH, meeting.id),
      stripUndefined(meeting as unknown as Record<string, unknown>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEETINGS_PATH}/${meeting.id}`);
  }
}

export async function updateMeetingInFirestore(id: string, updates: Partial<OnlineMeeting>) {
  try {
    await updateDoc(
      doc(db, MEETINGS_PATH, id),
      stripUndefined(updates as unknown as Record<string, unknown>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MEETINGS_PATH}/${id}`);
  }
}
