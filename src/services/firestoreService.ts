import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  FirestoreError
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, NewsArticle, DisputeTicket } from '../types';

const MEMBERS_PATH = 'members';
const NEWS_PATH = 'news';
const DISPUTES_PATH = 'disputes';

export async function seedInitialFirestoreData(
  initialMembers: Member[],
  initialNews: NewsArticle[],
  initialDisputes: DisputeTicket[]
) {
  try {
    // Check members
    const membersSnap = await getDocs(collection(db, MEMBERS_PATH));
    if (membersSnap.empty) {
      for (const m of initialMembers) {
        await setDoc(doc(db, MEMBERS_PATH, m.id), m);
      }
    }

    // Check news
    const newsSnap = await getDocs(collection(db, NEWS_PATH));
    if (newsSnap.empty) {
      for (const n of initialNews) {
        await setDoc(doc(db, NEWS_PATH, n.id), n);
      }
    }

    // Check disputes
    const disputesSnap = await getDocs(collection(db, DISPUTES_PATH));
    if (disputesSnap.empty) {
      for (const d of initialDisputes) {
        await setDoc(doc(db, DISPUTES_PATH, d.id), d);
      }
    }
  } catch (error) {
    console.warn('Initial seeding note:', error);
  }
}

export function subscribeToMembers(
  onUpdate: (members: Member[]) => void,
  fallbackMembers: Member[]
) {
  try {
    return onSnapshot(
      collection(db, MEMBERS_PATH),
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (!snapshot.empty) {
          const list: Member[] = [];
          snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
            list.push(docSnap.data() as Member);
          });
          onUpdate(list);
        } else {
          onUpdate(fallbackMembers);
        }
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
  fallbackDisputes: DisputeTicket[]
) {
  try {
    return onSnapshot(
      collection(db, DISPUTES_PATH),
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (!snapshot.empty) {
          const list: DisputeTicket[] = [];
          snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
            list.push(docSnap.data() as DisputeTicket);
          });
          onUpdate(list);
        } else {
          onUpdate(fallbackDisputes);
        }
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

export async function addMemberToFirestore(member: Member) {
  try {
    await setDoc(doc(db, MEMBERS_PATH, member.id), member);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEMBERS_PATH}/${member.id}`);
  }
}

export async function addNewsToFirestore(article: NewsArticle) {
  try {
    await setDoc(doc(db, NEWS_PATH, article.id), article);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${NEWS_PATH}/${article.id}`);
  }
}

export async function addDisputeToFirestore(dispute: DisputeTicket) {
  try {
    await setDoc(doc(db, DISPUTES_PATH, dispute.id), dispute);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DISPUTES_PATH}/${dispute.id}`);
  }
}

export async function updateDisputeInFirestore(id: string, updates: Partial<DisputeTicket>) {
  try {
    await updateDoc(doc(db, DISPUTES_PATH, id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${DISPUTES_PATH}/${id}`);
  }
}
