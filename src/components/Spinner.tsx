import React, { useState, useMemo, useEffect } from 'react';
import { Page, User, AppProject } from '../types/index';
import { Header } from './Header';
import { Card, CardContent, Button, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, CardHeader, CardTitle, CardFooter, Icons } from '../constants';
import { useAuth } from '../context/AuthContext';
import { scheduleNewPost, getScheduledPostsForUser, updateInstagramConnection, deleteProject } from '../services/firebase';

// --- Schedule Page ---
interface SchedulePageProps {
    onLogout: () => void;
    onNavigate: (page: Page) => void;
    project: Partial<AppProject>;
    onBackToEditor: () => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({ onLogout, onNavigate, project, onBackToEditor }) => {
    const { appUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [date, setDate] = useState(() => project.postAt ? project.postAt.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(() => project.postAt ? project.postAt.split('T')[1].substring(0, 5) : '10:00');

    const handleCopyText = () => {
        const fullText = `${project.caption || ''}\n\n${project.hashtags || ''}`;
        navigator.clipboard.writeText(fullText).then(() => {
            alert("Caption and hashtags copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert("Failed to copy text.");
        });
    };
    const handleDownloadMedia = async () => {
        if (!project.mediaUrl) return;

        try {
            const response = await fetch(project.mediaUrl);
            const blob = await response.blob();

            const isVideo = project.projectType?.includes('video');
            const fileExtension = isVideo ? 'mp4' : 'png';
            const fileName = `konten-${project.id || Date.now()}.${fileExtension}`;

            // Create an object URL and trigger download
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };


    if (!appUser) return null;

    const handleScheduleClick = () => {
        if (appUser.isInstagramConnected) {
            confirmAndSave();
        } else {
            setIsModalOpen(true);
        }
    };

    const confirmAndSave = async () => {
        if (!project.id) {
            alert("Error: Project ID is missing.");
            return;
        }
        setIsLoading(true);
        try {
            const postAt = new Date(`${date}T${time}`);
            await scheduleNewPost(appUser.uid, project.id, 'instagram', postAt);
            alert("Post Scheduled!");
            onNavigate('calendar');
        } catch (error) {
            console.error("Failed to schedule post:", error);
            alert("Failed to schedule post. Please try again.");
        }
        setIsLoading(false);
    }

    const handleConnectInstagram = async () => {
        setIsConnecting(true);
        try {
            await updateInstagramConnection(appUser.uid, true);
            appUser.isInstagramConnected = true; // Update state locally for immediate feedback
            setIsConnecting(false);
            setIsModalOpen(false);
            await confirmAndSave();
        } catch (error) {
            console.error("Failed to connect Instagram:", error);
            alert("Failed to connect Instagram.");
            setIsConnecting(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!project.id || !project.mediaUrl || !appUser) {
            alert("Error: Missing project data for deletion.");
            return;
        }
        setIsDeleting(true);
        try {
            await deleteProject(appUser.uid, project.id, project.mediaUrl);
            alert("Project deleted successfully.");
            setIsDeleteModalOpen(false);
            onNavigate('dashboard');
        } catch (error) {
            console.error("Failed to delete project:", error);
            alert("Failed to delete project. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={appUser} onLogout={onLogout} onBack={() => onNavigate('dashboard')} onNavigate={onNavigate} />
            <main className="container mx-auto p-4 md:p-8 max-w-4xl">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6">Jadwalkan Postingan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Preview */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-700 mb-2">Preview</h3>
                        <Card>
                            <div className="relative">
                                {project.projectType === 'video' || project.projectType === 'image_to_video' ? (
                                    <video src={project.mediaUrl} controls className="w-full aspect-square object-cover rounded-t-lg bg-black" />
                                ) : (
                                    <img src={project.mediaUrl} alt="Ad preview" className="w-full aspect-square object-cover rounded-t-lg" />
                                )}
                                <Icons.download className="h-9 w-9" />
                                <Button
                                    variant="secondary"
                                    onClick={handleDownloadMedia}
                                    className="absolute top-3 right-3 h-9 w-9 p-0 rounded-full shadow-md"
                                    aria-label="Download Media"
                                >
                                    <a href=""><Icons.download className="h-5 w-5" /></a>
                                </Button>
                            </div>

                            <CardContent>
                                <p className="text-sm font-semibold text-gray-800">{appUser.displayName}</p>
                                <p className="text-sm mt-2 text-gray-800">{project.caption}</p>
                                <p className="text-sm text-[#5890AD] mt-2">{project.hashtags}</p>

                                <div className="flex justify-end mt-1">
                                    <Button
                                        variant="ghost"
                                        onClick={handleCopyText}
                                        className="h-9 w-9 p-0 rounded-full"
                                        aria-label="Copy Text"
                                    >
                                        <a href=""><Icons.clipboard className="h-5 w-5" /></a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Options */}
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Opsi Penjadwalan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Button variant="secondary" onClick={onBackToEditor} className="w-full">Edit Content</Button>
                                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(true)} className="w-full text-red-600 hover:bg-red-50">
                                        Delete Project
                                    </Button>
                                </div>
                                <hr />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Platform</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-gray-900">
                                            <input type="checkbox" defaultChecked className="h-4 w-4 text-[#5890AD] border-gray-300 rounded focus:ring-[#5890AD]" />
                                            Instagram
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal</label>
                                    <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5890AD] focus:ring-[#5890AD] sm:text-sm p-2 bg-white text-gray-900" />
                                </div>
                                <div>
                                    <label htmlFor="time" className="block text-sm font-medium text-gray-700">Waktu</label>
                                    <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5890AD] focus:ring-[#5890AD] sm:text-sm p-2 bg-white text-gray-900" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleScheduleClick} className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Scheduling...' : 'Confirm Schedule'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <ModalHeader>
                    <ModalTitle>Instagram Connection</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            ⚠️ <strong>Instagram Connect</strong> belum tersedia saat ini.
                            Fitur ini masih dalam tahap pengembangan dan belum bisa digunakan untuk
                            penjadwalan atau posting otomatis.
                        </p>
                    </div>

                    <p className="text-sm text-gray-600">
                        Anda tetap dapat menyalin caption dan mengunduh media secara manual untuk diunggah
                        ke Instagram.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="secondary"
                        onClick={() => setIsModalOpen(false)}
                        disabled={isConnecting}
                    >
                        Tutup
                    </Button>
                    <Button
                        disabled
                        className="opacity-60 cursor-not-allowed"
                    >
                        Connect with Instagram
                    </Button>
                </ModalFooter>
            </Modal>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
                <ModalHeader>
                    <ModalTitle>Delete Project</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to delete this project? All associated media files and scheduled posts will be permanently removed. This action cannot be undone.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteProject} disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Delete Project'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};


// --- Calendar Page ---
interface CalendarPageProps {
    onLogout: () => void;
    onNavigate: (page: Page) => void;
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


export const CalendarPage: React.FC<CalendarPageProps> = ({ onLogout, onNavigate, onEditSchedule }) => {
    const { appUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduledProjects, setScheduledProjects] = useState<AppProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (appUser) {
            setIsLoading(true);
            getScheduledPostsForUser(appUser.uid)
                .then(setScheduledProjects)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [appUser]);

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
        <div className="min-h-screen bg-gray-50">
            <Header user={appUser} onLogout={onLogout} onBack={() => onNavigate('dashboard')} onNavigate={onNavigate} />
            <main className="container mx-auto p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-extrabold text-gray-800">Jadwal Konten</h2>
                    <div className="font-semibold text-xl">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                </div>
                <Card>
                    <CardContent>
                        {isLoading ? <CalendarSkeleton /> : (
                            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                                {daysOfWeek.map(day => (
                                    <div key={day} className="text-center font-semibold text-sm py-2 bg-gray-50">{day}</div>
                                ))}
                                {calendarGrid.map((cell, index) => (
                                    <div key={index} className={`relative min-h-[120px] p-2 bg-white`}>
                                        {cell && <span className="text-xs text-gray-700">{cell.day}</span>}
                                        {cell?.posts.map(post => (
                                            <button key={post.id} onClick={() => onEditSchedule(post)} className="w-full mt-1 p-1.5 rounded-md bg-[#EBF1F4] border border-[#DDE7EC] cursor-pointer hover:bg-[#DDE7EC] text-left">
                                                <p className="text-xs font-semibold text-[#2C4654] truncate">{post.caption}</p>
                                                {post.postAt && <p className="text-[10px] text-[#5890AD]">{new Date(post.postAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};


// --- Settings Page ---
interface SettingsPageProps {
    user: User;
    onLogout: () => void;
    onNavigate: (page: Page) => void;
    onToggleConnection: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    user,
    onLogout,
    onNavigate,
    onToggleConnection,
}) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                user={user}
                onLogout={onLogout}
                onBack={() => onNavigate('dashboard')}
                onNavigate={onNavigate}
            />
            <main className="container mx-auto p-4 md:p-8 max-w-2xl">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-8">Settings</h2>

                <div className="space-y-8">
                    {/* User Profile */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profil Pengguna</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500">
                                    Nama
                                </label>
                                <p className="text-gray-900">{user.displayName}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">
                                    Email
                                </label>
                                <p className="text-gray-900">{user.email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Instagram Connection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Akun Terhubung</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ <strong>Instagram Connect</strong> saat ini{" "}
                                    <strong>belum berfungsi</strong>. Fitur ini sedang dalam tahap
                                    pengembangan dan belum dapat digunakan untuk posting otomatis.
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">Instagram</p>
                                    <p
                                        className={`text-sm ${user.isInstagramConnected
                                                ? "text-green-600"
                                                : "text-gray-500"
                                            }`}
                                    >
                                        {user.isInstagramConnected ? "Connected" : "Not Connected"}
                                    </p>
                                </div>
                                <Button
                                    variant={user.isInstagramConnected ? "danger" : "primary"}
                                    onClick={onToggleConnection}
                                    disabled
                                    className="opacity-60 cursor-not-allowed"
                                >
                                    {user.isInstagramConnected ? "Disconnect" : "Connect"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

