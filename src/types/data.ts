import { Timestamp } from "firebase/firestore";

// Corresponds to the 'users' collection
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: Timestamp;
  isInstagramConnected: boolean;
  instagramHandle?: string; // Optional field
}

// Corresponds to the 'projects' collection
export interface Project {
  id: string; // The document ID
  userId: string;
  projectType: "image" | "video" | "image_to_video";
  status: "draft" | "completed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Corresponds to the 'assets' sub-collection for a project
export interface ProjectAsset {
  mediaUrl: string;
  caption: string;
  hashtags: string;
  finalPrompt?: string; // Optional field
}

// Corresponds to the 'scheduled_posts' collection
export interface ScheduledPost {
  id: string; // The document ID
  userId: string;
  projectId: string;
  platform: "instagram" | "facebook";
  postAt: Timestamp;
  status: "scheduled" | "posted" | "failed";
  postedAt?: Timestamp; // Optional field, set when the post is successful
}
