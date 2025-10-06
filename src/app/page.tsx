"use client";

import React, { useState, useCallback } from 'react';
import { EditorMode, AppProject, Page } from '../types/index';
import { useAuth } from '../context/AuthContext';
import { logoutUser as firebaseLogout, updateInstagramConnection } from '../services/firebase';

// Components
import { LoginPage } from '../components/LoginPage'; 
import { DashboardPage } from '../components/DashboardPage';
import { EditorPage } from '../components/EditorPage'; 
import { VideoEditorPage } from '../components/VideoEditorPage';
import { ImageToVideoEditorPage } from '../components/ImageToVideoEditorPage';
import { SchedulePage, CalendarPage, SettingsPage } from '../components/Spinner';
import { Icons } from '../constants';
import Footer from '../components/Footer'; // ✅ Import Footer

export default function Home() {
  const { appUser, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [editorMode, setEditorMode] = useState<EditorMode>('photo');
  const [editingProject, setEditingProject] = useState<Partial<AppProject> | null>(null);

  const handleLogout = useCallback(async () => {
    await firebaseLogout();
    setEditingProject(null);
    setCurrentPage('dashboard');
  }, []);

  const navigateTo = useCallback((page: Page) => {
    if (page === 'dashboard') setEditingProject(null);
    setCurrentPage(page);
  }, []);
  
  const startEditor = useCallback((mode: EditorMode, project?: AppProject) => {
    setEditorMode(mode);
    setEditingProject(project || {});
    const pageMap: Record<EditorMode, Page> = {
      photo: 'editor',
      idea: 'editor',
      video: 'videoEditor',
      image_to_video: 'imageToVideoEditor',
    };
    setCurrentPage(pageMap[mode]);
  }, []);

  const handleProceedToSchedule = useCallback((projectData: Partial<AppProject>) => {
    setEditingProject(current => ({ ...current, ...projectData }));
    setCurrentPage('schedule');
  }, []);

  const handleEditSchedule = useCallback((projectToEdit: AppProject) => {
    setEditingProject(projectToEdit);
    setCurrentPage('schedule');
  }, []);

  const handleToggleInstagramConnection = useCallback(async () => {
    if (!appUser) return;
    const newStatus = !appUser.isInstagramConnected;
    await updateInstagramConnection(appUser.uid, newStatus);
    appUser.isInstagramConnected = newStatus;
  }, [appUser]);
  
  const handleBackToEditor = useCallback(() => {
    const pageMap: Record<EditorMode, Page> = {
      photo: 'editor',
      idea: 'editor',
      video: 'videoEditor',
      image_to_video: 'imageToVideoEditor',
    };
    setCurrentPage(pageMap[editorMode]);
  }, [editorMode]);

  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Icons.logo className="h-16 w-16 text-indigo-600 animate-pulse" />
        </div>
      );
    }

    if (!appUser) return <LoginPage />;

    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            user={appUser}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onStartEditor={startEditor}
            onEditProject={handleEditSchedule}
          />
        );
      case 'editor':
        return (
          <EditorPage
            onLogout={handleLogout}
            onNavigate={navigateTo}
            mode={editorMode}
            onProceedToSchedule={handleProceedToSchedule}
            editingProject={editingProject}
          />
        );
      case 'videoEditor':
        return (
          <VideoEditorPage
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onProceedToSchedule={handleProceedToSchedule}
            editingProject={editingProject}
          />
        );
      case 'imageToVideoEditor':
        return (
          <ImageToVideoEditorPage
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onProceedToSchedule={handleProceedToSchedule}
            editingProject={editingProject}
          />
        );
      case 'schedule':
        if (!editingProject) {
          navigateTo('dashboard');
          return null;
        }
        return (
          <SchedulePage
            project={editingProject}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onBackToEditor={handleBackToEditor}
          />
        );
      case 'calendar':
        return (
          <CalendarPage
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onEditSchedule={handleEditSchedule}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            user={appUser}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onToggleConnection={handleToggleInstagramConnection}
          />
        );
      default:
        return (
          <DashboardPage
            user={appUser}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onStartEditor={startEditor}
            onEditProject={handleEditSchedule}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 relative">
      <main className="flex-grow pb-16">{/* ✅ add padding-bottom to avoid overlap */}
        {renderPage()}
      </main>
      <Footer /> {/* ✅ Fixed footer added */}
    </div>
  );
}
