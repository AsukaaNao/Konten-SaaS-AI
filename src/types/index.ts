// types/index.ts
import { Timestamp } from "firebase/firestore";
import { UserProfile } from './data';

// UI-specific types that were in the old types.ts
export type Page = 'login' | 'dashboard' | 'editor' | 'videoEditor' | 'imageToVideoEditor' | 'schedule' | 'calendar' | 'settings';
export type EditorMode = 'photo' | 'idea' | 'video' | 'image_to_video';

export interface Scene {
    scene: number;
    visual: string;
    text: string;
    duration: number;
}

// The user type used in the app state.
// It's derived from UserProfile but simplified for client-side use.
export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isInstagramConnected: boolean;
}

// A composite project type for managing state within the React application.
// This combines fields from Project, ProjectAsset, and ScheduledPost from types/data.ts
// for easier handling in components, using ISO strings for dates to be localStorage-friendly.
export interface AppProject {
    // From Project
    id: string;
    userId: string;
    projectType: "image" | "video" | "image_to_video";
    // Combined status from Project and ScheduledPost
    status: 'draft' | 'completed' | 'scheduled' | 'posted' | 'failed';
    createdAt: string; // ISO string for localStorage
    updatedAt: string; // ISO string for localStorage

    // From ProjectAsset
    mediaUrl: string;
    caption: string;
    hashtags: string;
    finalPrompt?: string;

    // From ScheduledPost
    postId?: string;
    platform?: 'instagram' | 'facebook';
    postAt?: string; // ISO string for localStorage
    postedAt?: string; // ISO string for localStorage

    // Extra fields that were part of the old Project type
    storyboard?: Scene[];
    voiceoverUrl?: string;
}
