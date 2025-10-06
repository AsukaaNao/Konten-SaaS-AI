"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppProject } from '../types/index';
import { Card, CardContent, Modal, ModalHeader, ModalTitle, ModalBody } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getScheduledPostsForUser } from '../services/firebase';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditSchedule: (project: AppProject) => void;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  useEffect(() => {
    // Fetch data only when the modal is open and the user exists
    if (isOpen && appUser) {
        setIsLoading(true);
        getScheduledPostsForUser(appUser.uid)
            .then(setScheduledProjects)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }
  }, [appUser, isOpen]); // Re-fetch when the modal opens

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid: ({ day: number; posts: AppProject[] } | null)[] = [];
    let dayOfMonth = 1;
    for (let i = 0; i < 42; i++) {
        if (i < firstDayOfMonth || dayOfMonth > daysInMonth) {
            grid.push(null);
        } else {
            const postsForDay = scheduledProjects.filter(p => {
                if (!p.postAt) return false;
                const postDate = new Date(p.postAt);
                return postDate.getFullYear() === year &&
                       postDate.getMonth() === month &&
                       postDate.getDate() === dayOfMonth;
            });
            grid.push({ day: dayOfMonth, posts: postsForDay });
            dayOfMonth++;
        }
    }
    return grid;
  }, [currentDate, scheduledProjects]);

  if (!appUser) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <ModalHeader>
            <ModalTitle>Content Calendar</ModalTitle>
            <div className="font-semibold text-xl text-gray-700">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
        </ModalHeader>
        <ModalBody>
            <Card>
                <CardContent className="p-0">
                    {isLoading ? <CalendarSkeleton /> : (
                        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            {daysOfWeek.map(day => (
                                <div key={day} className="text-center font-semibold text-sm py-2 bg-gray-50">{day}</div>
                            ))}
                            {calendarGrid.map((cell, index) => (
                                <div key={index} className={`relative min-h-[120px] p-2 bg-white`}>
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
