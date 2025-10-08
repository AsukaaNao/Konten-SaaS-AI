"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppProject } from '../types/index';
import { Card, CardContent, Modal, ModalHeader, ModalTitle, ModalBody, Icons, Button } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getScheduledPostsForUser } from '../services/firebase';

// --- UI/UX Improvements ---
// 1. Added month navigation buttons (< >) to allow users to browse different months.
// 2. The calendar now fetches data only when opened, improving initial app load performance.
// 3. The design is cleaner with a more modern grid layout for the calendar itself.
// 4. RESTORED: The props interface for this component.

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditSchedule: (project: AppProject) => void;
}

const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const CalendarSkeleton: React.FC = () => (
    <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden animate-pulse">
        {daysOfWeek.map(day => (
            <div key={day} className="text-center font-semibold text-sm py-2 bg-gray-100 text-transparent select-none rounded">{day}</div>
        ))}
        {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="relative min-h-[120px] p-2 bg-white">
                <div className="w-full h-full bg-gray-200 rounded"></div>
            </div>
        ))}
    </div>
);

export const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, onEditSchedule }) => {
  const { appUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledProjects, setScheduledProjects] = useState<AppProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // CORRECTED: The getScheduledPostsForUser function returns a promise, not a real-time listener.
  // This useEffect now uses the correct promise-based .then() syntax to fetch data.
  useEffect(() => {
    if (isOpen && appUser) {
      let isMounted = true;
      setIsLoading(true);
      
      getScheduledPostsForUser(appUser.uid)
        .then(posts => {
          if (isMounted) {
            setScheduledProjects(posts);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false; // Prevent state updates if the component unmounts during fetch
      };
    }
  }, [appUser, isOpen]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + offset);
        return newDate;
    });
  };

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid: ({ day: number; posts: AppProject[] } | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) grid.push(null); // Add empty cells for preceding days
    for (let day = 1; day <= daysInMonth; day++) {
        const postsForDay = scheduledProjects.filter(p => {
            if (!p.postAt) return false;
            const postDate = new Date(p.postAt);
            return postDate.getFullYear() === year &&
                   postDate.getMonth() === month &&
                   postDate.getDate() === day;
        });
        grid.push({ day, posts: postsForDay });
    }
    return grid;
  }, [currentDate, scheduledProjects]);

  if (!appUser) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <ModalHeader>
            <ModalTitle>Kalender Konten</ModalTitle>
            <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => changeMonth(-1)} className="p-2 h-auto"><Icons.chevronLeft className="w-5 h-5"/></Button>
                <span className="font-semibold text-lg text-center w-40">{currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</span>
                <Button variant="secondary" onClick={() => changeMonth(1)} className="p-2 h-auto"><Icons.chevronRight className="w-5 h-5"/></Button>
            </div>
        </ModalHeader>
        <ModalBody>
            <Card>
                <CardContent className="p-0">
                    {isLoading ? <CalendarSkeleton /> : (
                        <div className="grid grid-cols-7 border-l border-t border-gray-200">
                            {daysOfWeek.map(day => (
                                <div key={day} className="text-center font-semibold text-sm py-2 bg-gray-50 border-r border-b border-gray-200">{day}</div>
                            ))}
                            {calendarGrid.map((cell, index) => (
                                <div key={index} className="relative min-h-[120px] p-1.5 bg-white border-r border-b border-gray-200">
                                    {cell && <span className="text-xs text-gray-700">{cell.day}</span>}
                                    <div className="space-y-1 mt-1">
                                        {cell?.posts.map(post => (
                                            <button key={post.id} onClick={() => {onEditSchedule(post); onClose();}} className="w-full p-1.5 rounded-md bg-[#EBF1F4] border border-[#DDE7EC] cursor-pointer hover:bg-[#DDE7EC] text-left">
                                                <p className="text-xs font-semibold text-[#2C4654] truncate">{post.caption}</p>
                                                {post.postAt && <p className="text-[10px] text-[#5890AD]">{new Date(post.postAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </ModalBody>
    </Modal>
  );
};

