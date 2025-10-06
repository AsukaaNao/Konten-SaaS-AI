import React, { useState, useEffect } from 'react';
import { Page, User, EditorMode, AppProject } from '../types/index';
import { Header } from './Header';
import { Icons, Button, Card, CardContent, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../constants';
import { getProjectsForUser, deleteProject } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
  onStartEditor: (mode: EditorMode, project?: AppProject) => void;
  onEditProject: (project: AppProject) => void;
}

const ProjectCardSkeleton: React.FC = () => (
    <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout, onNavigate, onStartEditor, onEditProject }) => {
  const { appUser } = useAuth(); // Corrected from 'user' to 'appUser' to match context
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<AppProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (appUser) { // Use appUser from context
      setIsLoading(true);
      getProjectsForUser(appUser.uid)
        .then(userProjects => {
          const sorted = userProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProjects(sorted);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [appUser]);

  const openDeleteModal = (project: AppProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !appUser) return;
    setIsDeleting(true);
    try {
      await deleteProject(appUser.uid, projectToDelete.id, projectToDelete.mediaUrl);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null); // Close modal on success
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} onNavigate={onNavigate} />
      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800">Welcome, {user.displayName}!</h2>
            <p className="mt-2 text-lg text-gray-600">Siap bikin konten keren hari ini?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            <Card className="hover:shadow-xl transition-shadow duration-300">
                <CardContent className="flex flex-col items-center justify-center text-center p-8 h-full">
                     <Icons.video className="h-16 w-16 text-[#9BBBCC] mb-4" />
                    <h3 className="text-xl font-bold text-gray-800">Buat Iklan Video AI</h3>
                    <p className="text-gray-500 mt-2 mb-6">Hasilkan iklan video pendek dari storyboard yang dibuat AI.</p>
                    <Button onClick={() => onStartEditor('video')} className="w-full mt-auto">Mulai Buat Video</Button>
                </CardContent>
            </Card>
            <Card className="hover:shadow-xl transition-shadow duration-300">
                <CardContent className="flex flex-col items-center justify-center text-center p-8 h-full">
                     <Icons.imageToVideo className="h-16 w-16 text-[#9BBBCC] mb-4" />
                    <h3 className="text-xl font-bold text-gray-800">Buat Video dari Foto</h3>
                    <p className="text-gray-500 mt-2 mb-6">Ubah fotomu menjadi video iklan yang dinamis dan menarik.</p>
                    <Button onClick={() => onStartEditor('image_to_video')} className="w-full mt-auto">Mulai Sekarang</Button>
                </CardContent>
            </Card>
            <Card className="hover:shadow-xl transition-shadow duration-300">
                <CardContent className="flex flex-col items-center justify-center text-center p-8 h-full">
                     <Icons.add className="h-16 w-16 text-[#9BBBCC] mb-4" />
                    <h3 className="text-xl font-bold text-gray-800">Buat Konten dari Foto Produk</h3>
                    <p className="text-gray-500 mt-2 mb-6">Upload foto produkmu dan biarkan AI menyulapnya jadi konten.</p>
                    <Button onClick={() => onStartEditor('photo')} className="w-full mt-auto">Mulai Sekarang</Button>
                </CardContent>
            </Card>
            <Card className="hover:shadow-xl transition-shadow duration-300">
                 <CardContent className="flex flex-col items-center justify-center text-center p-8 h-full">
                     <Icons.sparkles className="h-16 w-16 text-[#9BBBCC] mb-4" />
                    <h3 className="text-xl font-bold text-gray-800">Buat Desain dari Ide</h3>
                    <p className="text-gray-500 mt-2 mb-6">Cukup tulis idemu, dan AI akan membuatkan desain visual.</p>
                    <Button onClick={() => onStartEditor('idea')} className="w-full mt-auto">Mulai Sekarang</Button>
                </CardContent>
            </Card>
        </div>

        <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Proyek Terbaru</h3>
             {isLoading ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {Array.from({ length: 4 }).map((_, index) => <ProjectCardSkeleton key={index} />)}
                </div>
             ) : projects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {projects.map(project => (
                        <Card key={project.id} className="group overflow-hidden relative">
                             <button
                                onClick={(e) => openDeleteModal(project, e)}
                                className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 rounded-full text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete project"
                            >
                                <Icons.trash className="w-5 h-5" />
                            </button>
                            <div className="cursor-pointer" onClick={() => onEditProject(project)}>
                                <div className="relative aspect-square">
                                    <img src={project.mediaUrl} alt={project.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    {(project.projectType === 'video' || project.projectType === 'image_to_video') && (
                                        <div className="absolute top-2 left-2 bg-black bg-opacity-50 p-1 rounded-full">
                                            <Icons.video className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <p className="text-white text-xs font-medium">{project.caption}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
             ) : (
                <p className="text-gray-500">No projects yet. Start creating one!</p>
             )}
        </div>
      </main>
      <Modal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)}>
        <ModalHeader>
          <ModalTitle>Delete Project</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this project? All associated media files and scheduled posts will be permanently removed. This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setProjectToDelete(null)} disabled={isDeleting}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteProject} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
