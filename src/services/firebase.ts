import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  DocumentData,
  collectionGroup,
  deleteDoc,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { UserProfile, Project, ProjectAsset, ScheduledPost } from '../types/data';
import { AppProject } from "../types/index";
import { uploadFileAndGetURL } from './cloudinaryService';

// --- Firebase Initialization ---
// IMPORTANT: In a real project, these values should be in a .env file.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "content-saas-d6ed1.firebaseapp.com",
  databaseURL: "https://content-saas-d6ed1-default-rtdb.firebaseio.com",
  projectId: "content-saas-d6ed1",
  storageBucket: "content-saas-d6ed1.firebasestorage.app",
  messagingSenderId: "773011678155",
  appId: "1:773011678155:web:1ae1c88d0fd7fb80468c4e",
  measurementId: "G-2FMGNJQ92V"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, onAuthStateChanged };
export type { FirebaseUser };

// --- Authentication Functions ---

export const registerUser = async (email: string, password: string, displayName: string): Promise<FirebaseUser> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userRef = doc(db, 'users', user.uid);
  const newUserProfile: UserProfile = {
    uid: user.uid,
    email: user.email!,
    displayName: displayName,
    createdAt: Timestamp.now(),
    isInstagramConnected: false,
  };
  await setDoc(userRef, newUserProfile);

  return user;
};

export const loginUser = async (email: string, password: string): Promise<FirebaseUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = (): Promise<void> => {
  return signOut(auth);
};

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  // After successful sign-in, check if a user profile exists in Firestore.
  // If not, create one to ensure all users (email or Google) have a profile.
  const userRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    const newUserProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName,
      createdAt: Timestamp.now(),
      isInstagramConnected: false,
    };
    await setDoc(userRef, newUserProfile);
  }

  return user;
};


// --- User Profile Functions ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
  } else {
    console.error('No such user profile!');
    return null;
  }
};


// --- Helper to convert Timestamps to ISO strings ---
const convertTimestampsToISO = (data: DocumentData): any => {
    const newData: { [key:string]: any } = {};
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            newData[key] = data[key].toDate().toISOString();
        } else {
            newData[key] = data[key];
        }
    }
    return newData;
};


// --- Project & Content Functions ---

export const createProject = async (
  userId: string,
  projectData: {
    projectType: Project['projectType'];
    caption: string;
    hashtags: string;
    file: File; // Menerima objek File dari frontend
  }
): Promise<string> => {
  // Langkah 1: Panggil cloudinaryService untuk mengunggah file dan mendapatkan URL
  const mediaUrl = await uploadFileAndGetURL(projectData.file);

  // Langkah 2: Setelah URL didapat, simpan data ke Firestore
  const projectsCollectionRef = collection(db, 'projects');
  const projectDocData = {
    userId,
    projectType: projectData.projectType,
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const projectRef = await addDoc(projectsCollectionRef, projectDocData);
  
  const assetRef = doc(db, 'projects', projectRef.id, 'assets', 'final_output');
  const newAsset: Omit<ProjectAsset, 'id'> = {
    mediaUrl: mediaUrl, // Gunakan URL dari Cloudinary
    caption: projectData.caption,
    hashtags: projectData.hashtags,
  };
  await setDoc(assetRef, newAsset);
  return projectRef.id;
};

export const deleteProject = async (userId: string, projectId: string, mediaUrl: string): Promise<void> => {
  // 1. Verify ownership before deleting anything
  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists() || projectSnap.data().userId !== userId) {
      throw new Error("Permission denied or project not found.");
  }

  // 2. Media file deletion from Cloudinary (SKIPPED)
  // NOTE: Securely deleting files from Cloudinary requires a backend signature to prevent abuse.
  // This function only deletes the database records. The file will be orphaned in Cloudinary.
  // For a production app, you would implement a secure backend endpoint for file deletion.
  console.warn(`Database records for project ${projectId} are being deleted. The associated file at ${mediaUrl} will be orphaned in Cloudinary.`);

  // 3. Delete scheduled posts linked to the project
  const postsRef = collection(db, 'scheduled_posts');
  const qPosts = query(postsRef, where('projectId', '==', projectId));
  const postsSnapshot = await getDocs(qPosts);
  const deletePostPromises = postsSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePostPromises);
  
  // 4. Delete assets in sub-collection
  const assetsRef = collection(db, 'projects', projectId, 'assets');
  const assetsSnapshot = await getDocs(assetsRef);
  const deleteAssetPromises = assetsSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deleteAssetPromises);

  // 5. Delete the main project document
  await deleteDoc(projectRef);
};

// Modified to fetch assets and return the composite AppProject type
export const getProjectsForUser = async (userId: string): Promise<AppProject[]> => {
  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  const projects: AppProject[] = [];
  for (const doc of querySnapshot.docs) {
    const projectData = doc.data();
    
    const assetColRef = collection(db, 'projects', doc.id, 'assets');
    const assetSnapshot = await getDocs(assetColRef);
    const assetData = !assetSnapshot.empty ? assetSnapshot.docs[0].data() : {};

    projects.push({
      ...convertTimestampsToISO(projectData),
      ...convertTimestampsToISO(assetData),
      id: doc.id,
    } as AppProject);
  }

  return projects;
};

// --- Scheduling Functions ---

export const scheduleNewPost = async (
  userId: string,
  projectId: string,
  platform: ScheduledPost['platform'],
  postAt: Date
): Promise<string> => {
  const newScheduledPost = {
    userId,
    projectId,
    platform,
    postAt: Timestamp.fromDate(postAt),
    status: 'scheduled',
  };

  const docRef = await addDoc(collection(db, 'scheduled_posts'), newScheduledPost);
  return docRef.id;
};

// Modified to fetch related project/asset data and return the composite AppProject type
export const getScheduledPostsForUser = async (userId: string): Promise<AppProject[]> => {
    const postsRef = collection(db, 'scheduled_posts');
    const q = query(postsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const posts: AppProject[] = [];
    for (const postDoc of querySnapshot.docs) {
        const scheduledPostData = postDoc.data() as ScheduledPost;
        
        const projectRef = doc(db, 'projects', scheduledPostData.projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
            const projectData = projectSnap.data();
            const assetColRef = collection(db, 'projects', projectSnap.id, 'assets');
            const assetSnapshot = await getDocs(assetColRef);
            const assetData = !assetSnapshot.empty ? assetSnapshot.docs[0].data() : {};

            const combinedData = {
                ...convertTimestampsToISO(projectData),
                ...convertTimestampsToISO(assetData),
                ...convertTimestampsToISO(scheduledPostData),
                id: projectSnap.id, // Project ID is the primary ID
                postId: postDoc.id, // Keep scheduled post ID as well
            };
            posts.push(combinedData as AppProject);
        }
    }
    return posts;
};

export const updateInstagramConnection = async (userId: string, connected: boolean): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { isInstagramConnected: connected }, { merge: true });
};