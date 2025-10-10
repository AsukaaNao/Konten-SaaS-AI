"use client";

import React, { useState, useCallback, useEffect } from "react";
import { EditorMode, AppProject, Page } from "@/types/index";
import { useAuth } from "@/context/AuthContext";
import {
  logoutUser as firebaseLogout,
  updateInstagramConnection,
} from "@/services/firebase";
import { useToast } from "@/components/Toast";

// Components
import { LoginPage } from "@/components/LoginPage";
import { DashboardPage } from "@/components/DashboardPage";
import { EditorPage } from "@/components/EditorPage";
import {
  SchedulePage,
  CalendarPage,
  SettingsPage,
} from "@/components/Spinner";
import { Icons } from "@/constants";
import Footer from "@/components/Footer";

const MAX_GUEST_GENERATIONS = 5;

export default function Home() {
  const { appUser, loading } = useAuth();
  const { addToast } = useToast();

  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [editorMode, setEditorMode] = useState<EditorMode>("photo");
  const [editingProject, setEditingProject] =
    useState<Partial<AppProject> | null>(null);

  // Initialize guest generations from localStorage
  const [guestGenerations, setGuestGenerations] = useState(() => {
    if (typeof window === 'undefined') {
      return 0;
    }
    try {
      const saved = window.localStorage.getItem('guestGenerations');
      return saved ? JSON.parse(saved) : 0;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return 0;
    }
  });

  // Save guest generations to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('guestGenerations', JSON.stringify(guestGenerations));
      } catch (error) {
        console.error("Error saving to localStorage", error);
      }
    }
  }, [guestGenerations]);


  const handleGuestGeneration = useCallback(() => {
    setGuestGenerations((prev: number) => prev + 1);
  }, []);

  const handleLogout = useCallback(async () => {
    await firebaseLogout();
    setEditingProject(null);
    setCurrentPage("dashboard");
  }, []);

  const navigateTo = useCallback((page: Page) => {
    if (page === "dashboard") setEditingProject(null);
    setCurrentPage(page);
  }, []);

  const startEditor = useCallback(
    (mode: EditorMode, project?: Partial<AppProject>) => {
      if (!appUser && guestGenerations >= MAX_GUEST_GENERATIONS) {
        addToast("Batas percobaan gratis sudah tercapai. Silakan login untuk lanjut.", "warning");
        return;
      }
      
      setEditorMode(mode);
      setEditingProject(project || {});
      setCurrentPage("editor");
    },
    [appUser, guestGenerations, addToast]
  );

  const handleProceedToSchedule = useCallback(
    (projectData: Partial<AppProject>) => {
      if (!appUser) {
        addToast("Please log in to schedule a post.", "warning");
        setCurrentPage("login");
        return;
      }
      setEditingProject((current) => ({ ...current, ...projectData }));
      setCurrentPage("schedule");
    },
    [appUser, addToast]
  );

  const handleEditSchedule = useCallback((projectToEdit: AppProject) => {
    setEditingProject(projectToEdit);
    setCurrentPage("schedule");
  }, []);

  const handleToggleInstagramConnection = useCallback(async () => {
    if (!appUser) {
      addToast("Login to connect your Instagram account.", "warning");
      setCurrentPage("login");
      return;
    }
    const newStatus = !appUser.isInstagramConnected;
    await updateInstagramConnection(appUser.uid, newStatus);
    appUser.isInstagramConnected = newStatus;
  }, [appUser, addToast]);

  const handleBackToEditor = useCallback(() => {
    setCurrentPage("editor");
  }, []);

  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Icons.logo className="h-16 w-16 text-indigo-600 animate-pulse" />
        </div>
      );
    }

    if (!appUser && currentPage === 'login') {
       return <LoginPage onNavigate={navigateTo} />;
    }
    
    if (!appUser && currentPage !== 'dashboard' && currentPage !== 'editor') {
        if (['schedule', 'calendar', 'settings'].includes(currentPage)) {
            setCurrentPage('login');
            return <LoginPage onNavigate={navigateTo} />;
        }
    }


    switch (currentPage) {
      case "dashboard":
        return (
          <DashboardPage
            user={appUser}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onStartEditor={startEditor}
            onEditProject={handleEditSchedule}
            guestGenerations={guestGenerations}
            maxGuestGenerations={MAX_GUEST_GENERATIONS}
          />
        );
      case "editor":
        return (
          <EditorPage
            onLogout={handleLogout}
            onNavigate={navigateTo}
            mode={editorMode}
            onProceedToSchedule={handleProceedToSchedule}
            editingProject={editingProject}
            onGuestGenerate={handleGuestGeneration}
            guestGenerations={guestGenerations}
            maxGuestGenerations={MAX_GUEST_GENERATIONS}
          />
        );
      case "schedule":
        if (!editingProject) {
          navigateTo("dashboard");
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
      case "calendar":
        return (
          <CalendarPage
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onEditSchedule={handleEditSchedule}
          />
        );
      case "settings":
         if (!appUser) {
            setCurrentPage('login');
            return <LoginPage onNavigate={navigateTo} />;
         }
        return (
          <SettingsPage
            user={appUser}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onToggleConnection={handleToggleInstagramConnection}
          />
        );
      case "login":
        return <LoginPage onNavigate={navigateTo} />;
      default:
        return (
          <DashboardPage
            user={appUser}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onStartEditor={startEditor}
            onEditProject={handleEditSchedule}
            guestGenerations={guestGenerations}
            maxGuestGenerations={MAX_GUEST_GENERATIONS}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 relative">
      <main className="flex-grow pb-16">{renderPage()}</main>
      <Footer />
    </div>
  );
}

