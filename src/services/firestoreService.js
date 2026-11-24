import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
const MEMBERS_PATH = "members";
const NEWS_PATH = "news";
const DISPUTES_PATH = "disputes";
const SOCIAL_MESSAGES_PATH = "social_messages";
const MEETINGS_PATH = "meetings";
const LEGACY_TEST_MEMBER_IDS = /* @__PURE__ */ new Set([
  "mem-1",
  "mem-2",
  "mem-3",
  "mem-4",
  "mem-5",
  "mem-6",
  "mem-7",
  "mem-8",
  "mem-9",
  "mem-10",
  "mem-11",
  "mem-12",
  "mem-13",
  "mem-14"
]);
const LEGACY_TEST_DISPUTE_IDS = /* @__PURE__ */ new Set(["disp-1", "disp-2", "disp-3"]);
const LEGACY_TEST_SOCIAL_IDS = /* @__PURE__ */ new Set(["msg-1", "msg-2", "msg-3", "msg-4", "msg-5"]);
const LEGACY_TEST_MEETING_IDS = /* @__PURE__ */ new Set(["mtg-1", "mtg-2", "mtg-3"]);
function stripUndefined(obj) {
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== void 0) {
      clean[k] = v;
    }
  }
  return clean;
}
async function seedInitialFirestoreData(_initialMembers, initialNews, _initialDisputes, _initialSocialMessages = [], _initialMeetings = []) {
  try {
    const newsSnap = await getDocs(collection(db, NEWS_PATH));
    if (newsSnap.empty) {
      for (const n of initialNews) {
        await setDoc(doc(db, NEWS_PATH, n.id), stripUndefined(n));
      }
    }
  } catch (error) {
    console.warn("Initial seeding note:", error);
  }
}
async function purgeLegacyTestDocsAsAdmin() {
  const targets = [
    [MEMBERS_PATH, LEGACY_TEST_MEMBER_IDS],
    [DISPUTES_PATH, LEGACY_TEST_DISPUTE_IDS],
    [SOCIAL_MESSAGES_PATH, LEGACY_TEST_SOCIAL_IDS],
    [MEETINGS_PATH, LEGACY_TEST_MEETING_IDS]
  ];
  for (const [colPath, idSet] of targets) {
    for (const docId of idSet) {
      try {
        await deleteDoc(doc(db, colPath, docId));
      } catch {
      }
    }
  }
}
function subscribeToMembers(onUpdate, _fallbackMembers = []) {
  try {
    return onSnapshot(
      collection(db, MEMBERS_PATH),
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          if (!LEGACY_TEST_MEMBER_IDS.has(docSnap.id)) {
            list.push(docSnap.data());
          }
        });
        onUpdate(list);
      },
      (error) => {
        if (error.code === "permission-denied") {
          handleFirestoreError(error, OperationType.GET, MEMBERS_PATH);
        } else {
          console.warn("Members listener warning:", error.code, error.message);
        }
      }
    );
  } catch (error) {
    console.warn("Members subscription setup warning:", error);
    return () => {
    };
  }
}
function subscribeToNews(onUpdate, fallbackNews) {
  try {
    return onSnapshot(
      collection(db, NEWS_PATH),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data());
          });
          onUpdate(list);
        } else {
          onUpdate(fallbackNews);
        }
      },
      (error) => {
        if (error.code === "permission-denied") {
          handleFirestoreError(error, OperationType.GET, NEWS_PATH);
        } else {
          console.warn("News listener warning:", error.code, error.message);
          onUpdate(fallbackNews);
        }
      }
    );
  } catch (error) {
    console.warn("News subscription setup warning:", error);
    return () => {
    };
  }
}
function subscribeToDisputes(onUpdate, _fallbackDisputes = []) {
  try {
    return onSnapshot(
      collection(db, DISPUTES_PATH),
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          if (!LEGACY_TEST_DISPUTE_IDS.has(docSnap.id)) {
            list.push(docSnap.data());
          }
        });
        onUpdate(list);
      },
      (error) => {
        if (error.code === "permission-denied") {
          handleFirestoreError(error, OperationType.GET, DISPUTES_PATH);
        } else {
          console.warn("Disputes listener warning:", error.code, error.message);
        }
      }
    );
  } catch (error) {
    console.warn("Disputes subscription setup warning:", error);
    return () => {
    };
  }
}
function subscribeToSocialMessages(onUpdate, _fallbackMessages = []) {
  try {
    return onSnapshot(
      collection(db, SOCIAL_MESSAGES_PATH),
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!LEGACY_TEST_SOCIAL_IDS.has(docSnap.id) && data?.permanentlyDeleted !== true) {
            list.push(data);
          }
        });
        list.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
        onUpdate(list);
      },
      (error) => {
        if (error.code === "permission-denied") {
          handleFirestoreError(error, OperationType.GET, SOCIAL_MESSAGES_PATH);
        } else {
          console.warn("Social messages listener warning:", error.code, error.message);
        }
      }
    );
  } catch (error) {
    console.warn("Social messages subscription setup warning:", error);
    return () => {
    };
  }
}
function subscribeToMeetings(onUpdate, _fallbackMeetings = []) {
  try {
    return onSnapshot(
      collection(db, MEETINGS_PATH),
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          if (!LEGACY_TEST_MEETING_IDS.has(docSnap.id)) {
            list.push(docSnap.data());
          }
        });
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        onUpdate(list);
      },
      (error) => {
        if (error.code === "permission-denied") {
          handleFirestoreError(error, OperationType.GET, MEETINGS_PATH);
        } else {
          console.warn("Meetings listener warning:", error.code, error.message);
        }
      }
    );
  } catch (error) {
    console.warn("Meetings subscription setup warning:", error);
    return () => {
    };
  }
}
async function addMemberToFirestore(member) {
  try {
    await setDoc(
      doc(db, MEMBERS_PATH, member.id),
      stripUndefined(member),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEMBERS_PATH}/${member.id}`);
  }
}
async function updateMemberInFirestore(id, updates) {
  try {
    await updateDoc(doc(db, MEMBERS_PATH, id), stripUndefined(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MEMBERS_PATH}/${id}`);
  }
}
async function addNewsToFirestore(article) {
  try {
    await setDoc(doc(db, NEWS_PATH, article.id), stripUndefined(article));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${NEWS_PATH}/${article.id}`);
  }
}
async function addDisputeToFirestore(dispute) {
  try {
    await setDoc(doc(db, DISPUTES_PATH, dispute.id), stripUndefined(dispute));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DISPUTES_PATH}/${dispute.id}`);
  }
}
async function updateDisputeInFirestore(id, updates) {
  try {
    await updateDoc(doc(db, DISPUTES_PATH, id), stripUndefined(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${DISPUTES_PATH}/${id}`);
  }
}
async function addSocialMessageToFirestore(message) {
  try {
    await setDoc(
      doc(db, SOCIAL_MESSAGES_PATH, message.id),
      stripUndefined(message)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SOCIAL_MESSAGES_PATH}/${message.id}`);
  }
}
async function updateSocialMessageInFirestore(id, updates) {
  try {
    await updateDoc(
      doc(db, SOCIAL_MESSAGES_PATH, id),
      stripUndefined(updates)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SOCIAL_MESSAGES_PATH}/${id}`);
  }
}
async function deleteSocialMessagePermanentlyInFirestore(id, deletedByName) {
  try {
    await deleteDoc(doc(db, SOCIAL_MESSAGES_PATH, id));
    return;
  } catch (deleteError) {
    const code = deleteError?.code;
    if (code === "permission-denied" || code === "unauthenticated") {
      try {
        await updateDoc(doc(db, SOCIAL_MESSAGES_PATH, id), {
          text: "",
          mentions: [],
          attachmentName: "",
          attachmentType: "",
          attachmentSize: "",
          attachmentData: "",
          attachmentStoragePath: "",
          replyToId: "",
          replyToSender: "",
          replyToText: "",
          likes: [],
          reactions: {},
          deletedByAuthor: true,
          removedByAdmin: true,
          removedByAdminName: deletedByName,
          permanentlyDeleted: true
        });
        return;
      } catch (updateErr) {
        handleFirestoreError(updateErr, OperationType.DELETE, `${SOCIAL_MESSAGES_PATH}/${id}`);
      }
    }
    handleFirestoreError(deleteError, OperationType.DELETE, `${SOCIAL_MESSAGES_PATH}/${id}`);
  }
}
async function addMeetingToFirestore(meeting) {
  try {
    await setDoc(
      doc(db, MEETINGS_PATH, meeting.id),
      stripUndefined(meeting)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEETINGS_PATH}/${meeting.id}`);
  }
}
async function updateMeetingInFirestore(id, updates) {
  try {
    await updateDoc(
      doc(db, MEETINGS_PATH, id),
      stripUndefined(updates)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MEETINGS_PATH}/${id}`);
  }
}
export {
  LEGACY_TEST_MEMBER_IDS,
  addDisputeToFirestore,
  addMeetingToFirestore,
  addMemberToFirestore,
  addNewsToFirestore,
  addSocialMessageToFirestore,
  deleteSocialMessagePermanentlyInFirestore,
  purgeLegacyTestDocsAsAdmin,
  seedInitialFirestoreData,
  subscribeToDisputes,
  subscribeToMeetings,
  subscribeToMembers,
  subscribeToNews,
  subscribeToSocialMessages,
  updateDisputeInFirestore,
  updateMeetingInFirestore,
  updateMemberInFirestore,
  updateSocialMessageInFirestore
};
