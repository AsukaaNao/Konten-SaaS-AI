import React, { useState, useEffect } from 'react';
import { Page, User, EditorMode, AppProject } from '../types/index';
import { Header } from './Header';
import { Icons, Button, Card, CardContent, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../constants';
import { getProjectsForUser, deleteProject } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast'; // Import the useToast hook

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
  onStartEditor: (mode: EditorMode, project?: AppProject) => void;
  onEditProject: (project: AppProject) => void;
}

const ProjectCardSkeleton: React.FC = () => (
    <div className="aspect-square bg-gray-200 rounded-xl animate-pulse"></div>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout, onNavigate, onStartEditor, onEditProject }) => {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<AppProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (appUser) {
      setIsLoading(true);
      getProjectsForUser(appUser.uid)
        .then(userProjects => {
          const sorted = userProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProjects(sorted);
        })
        .catch(error => {
          console.error(error);
          addToast("Gagal memuat proyek.", "error");
        })
        .finally(() => setIsLoading(false));
    }
  }, [appUser, addToast]);

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
      addToast("Proyek berhasil dihapus.", "success");
      setProjectToDelete(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
      addToast("Gagal menghapus proyek. Coba lagi.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const creationOptions = [
    {
        icon: <Icons.sparkles className="h-16 w-16 text-[#9BBBCC] mb-4" />,
        title: "Buat Desain dari Ide",
        description: "Cukup tulis idemu, dan AI akan membuatkan desain visual.",
        buttonText: "Mulai dari Ide",
        mode: 'idea' as EditorMode
    },
    {
        icon: <Icons.add className="h-16 w-16 text-[#9BBBCC] mb-4" />,
        title: "Buat Konten dari Foto",
        description: "Upload foto produkmu dan biarkan AI menyulapnya jadi konten.",
        buttonText: "Mulai dari Foto",
        mode: 'photo' as EditorMode
    }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} onNavigate={onNavigate} />
      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800">Selamat Datang, {user.displayName}!</h2>
            <p className="mt-2 text-lg text-gray-600">Siap bikin konten keren hari ini?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {creationOptions.map(option => (
                 <Card key={option.mode} className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="flex flex-col items-center justify-center text-center p-8 h-full">
                        {option.icon}
                        <h3 className="text-xl font-bold text-gray-800">{option.title}</h3>
                        <p className="text-gray-500 mt-2 mb-6 min-h-[40px]">{option.description}</p>
                        <Button onClick={() => onStartEditor(option.mode)} className="w-full mt-auto">{option.buttonText}</Button>
                    </CardContent>
                </Card>
            ))}
        </div>

        <div>
            <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold text-gray-800">Proyek Terbaru</h3>
                 <Button onClick={() => onStartEditor('idea')} variant="secondary">
                    <Icons.add className="w-4 h-4 mr-2"/>
                    Buat Proyek Baru
                </Button>
            </div>
             {isLoading ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {Array.from({ length: 4 }).map((_, index) => <ProjectCardSkeleton key={index} />)}
                </div>
             ) : projects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {projects.map(project => (
                        <div key={project.id} onClick={() => onEditProject(project)} className="group relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-shadow duration-300">
                             <img src={project.mediaUrl} alt={project.caption} className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-300" />
                             
                             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                <p className="text-white text-sm font-semibold line-clamp-2">{project.caption}</p>
                                <div className="flex items-center text-xs text-white/80 mt-1">
                                    <Icons.edit className="w-3 h-3 mr-1.5" />
                                    <span>Klik untuk edit</span>
                                </div>
                             </div>

                             <button
                                onClick={(e) => openDeleteModal(project, e)}
                                className="absolute top-2 right-2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-red-600 hover:bg-red-100 scale-0 group-hover:scale-100 transition-all duration-200"
                                aria-label="Delete project"
                            >
                                <Icons.trash className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
             ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-gray-100">
                    <Icons.folder className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                    <h4 className="text-lg font-semibold text-gray-700">Belum Ada Proyek</h4>
                    <p className="text-gray-500 mt-1">Mulai buat proyek pertamamu sekarang!</p>
                </div>
             )}
        </div>
      </main>

      <Modal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)}>
        <ModalHeader>
          <ModalTitle>Hapus Proyek Ini?</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus proyek ini? Tindakan ini tidak dapat dibatalkan.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setProjectToDelete(null)} disabled={isDeleting}>Batal</Button>
          <Button variant="danger" onClick={handleDeleteProject} disabled={isDeleting}>
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
