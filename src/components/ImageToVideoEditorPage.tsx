import React, { useState, useEffect, SVGProps } from 'react';
import { Page, AppProject } from '../types/index';
import { Header } from './Header';
import { Button, Card, CardContent, Icons, Input } from '../constants';
import { aiService } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { createProject } from '../services/firebase';

// --- Fungsi Bantuan untuk mengubah URL (termasuk blob URL) menjadi objek File ---
async function urlToFile(url: string, filename: string, mimeType?: string): Promise<File> {
    const res = await fetch(url);
    const blob = await res.blob();
    const type = mimeType || blob.type || 'video/mp4';
    return new File([blob], filename, { type });
}

const Step: React.FC<{ title: string; number: number; children: React.ReactNode; isActive: boolean; isCompleted: boolean; }> = ({ title, number, children, isActive, isCompleted }) => (
    <div className={`transition-opacity duration-500 ${!isActive ? 'opacity-40' : 'opacity-100'}`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold transition-colors ${isActive ? 'bg-[#5890AD] text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {isCompleted && !isActive ? '✓' : number}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="pl-12">
            {isActive && children}
        </div>
    </div>
);

// --- Ikon Baru yang Didefinisikan Menggunakan React.createElement ---
const NewImageToVideoIcon = (props: SVGProps<SVGSVGElement>) => {
    return React.createElement('svg', { ...props, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'},
      React.createElement('path', { d: 'M10 22H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-1 1.73' }),
      React.createElement('path', { d: 'm7 14 3-3 4 4' }),
      React.createElement('path', { d: 'm14 10 1-1' }),
      React.createElement('path', { d: 'M16 19h6' }),
      React.createElement('path', { d: 'M19 16v6' })
    );
};

const TrashIcon = (props: SVGProps<SVGSVGElement>) => {
    return React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
      React.createElement('path', { d: "M3 6h18" }),
      React.createElement('path', { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
    );
};


type VideoStyle = 'Zoom & Pan Lembut (Ken Burns)' | 'Slide Cepat & Enerjik' | 'Transisi Halus (Fade)';
type MusicMood = 'Uplifting' | 'Energetic' | 'Calm' | 'Cinematic';

interface ImageToVideoEditorPageProps {
  onLogout: () => void;
  onNavigate: (page: Page) => void;
  onProceedToSchedule: (project: Partial<AppProject>) => void;
  editingProject: Partial<AppProject> | null;
}

export const ImageToVideoEditorPage: React.FC<ImageToVideoEditorPageProps> = ({ onLogout, onNavigate, onProceedToSchedule, editingProject }) => {
  const { appUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Step 1: Images
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Step 2: Style
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>('Zoom & Pan Lembut (Ken Burns)');

  // Step 3: Text & Music
  const [headline, setHeadline] = useState('');
  const [selectedMusic, setSelectedMusic] = useState<MusicMood>('Uplifting');
  
  // Step 4: Generate
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(editingProject?.mediaUrl || null);

  useEffect(() => {
    return () => {
      imagePreviews.forEach(URL.revokeObjectURL);
    };
  }, [imagePreviews]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 10);
    setUploadedImages(current => [...current, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(current => [...current, ...previews]);
    setStep(1);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setUploadedImages(current => current.filter((_, index) => index !== indexToRemove));
    setImagePreviews(current => current.filter((_, index) => index !== indexToRemove));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };
  
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null) return;
    const newImages = [...uploadedImages];
    const draggedItem = newImages.splice(draggedIndex, 1)[0];
    newImages.splice(targetIndex, 0, draggedItem);
    
    setUploadedImages(newImages);
    
    // Re-create previews to match new order
    imagePreviews.forEach(URL.revokeObjectURL);
    const newPreviews = newImages.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
    
    setDraggedIndex(null);
  };

  const handleGenerateVideo = async () => {
    setIsLoading(true);
    setGeneratedVideoUrl(null);
    setStatusMessage("Initializing...");
    try {
      const url = await aiService.generateVideoFromImages(uploadedImages, selectedStyle, headline, selectedMusic, setStatusMessage);
      setGeneratedVideoUrl(url);
      setStep(4);
    } catch (error) {
      console.error("Error generating video:", error);
      alert("Gagal membuat video. Fitur ini masih dalam tahap percobaan dan mungkin gagal. Silakan coba lagi.");
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setIsLoading(false);
  };

  const handleProceed = async () => {
    if (!appUser || !generatedVideoUrl) return;
    setIsSaving(true);
    try {
        const videoFileToUpload = await urlToFile(generatedVideoUrl, `video-project-${Date.now()}.mp4`);

        const projectId = await createProject(appUser.uid, {
            file: videoFileToUpload,
            projectType: 'image_to_video',
            caption: headline,
            hashtags: '',
        });

        onProceedToSchedule({
          id: projectId,
          mediaUrl: generatedVideoUrl,
          projectType: 'image_to_video',
          caption: headline,
        });
    } catch (error) {
        console.error("Failed to save project:", error);
        alert("Failed to save project. Please try again.");
    }
    setIsSaving(false);
  };
  
  if (!appUser) return null;

  return (
    <div className="flex flex-col max-h-screen">
      <Header user={appUser} onLogout={onLogout} onBack={() => onNavigate('dashboard')} onNavigate={onNavigate}/>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8 overflow-y-auto">
        {/* Left Column: Controls */}
        <div className="flex flex-col gap-6">
          <Step title="Pilih & Atur Gambar" number={1} isActive={step === 1} isCompleted={uploadedImages.length > 0}>
             <Input type="file" multiple accept="image/jpeg,image/png" onChange={handleImageUpload} />
             <p className="text-xs text-gray-900 mt-2">Unggah 1-10 gambar. Urutkan dengan drag-and-drop.</p>
             {imagePreviews.length > 0 && <Button onClick={() => setStep(2)} className="w-full mt-4">Lanjut</Button>}
          </Step>

          <Step title="Gaya & Animasi Video" number={2} isActive={step === 2} isCompleted={!!selectedStyle}>
            <div className="grid grid-cols-1 gap-3">
              {(['Zoom & Pan Lembut (Ken Burns)', 'Slide Cepat & Enerjik', 'Transisi Halus (Fade)'] as VideoStyle[]).map(style => (
                <button key={style} onClick={() => setSelectedStyle(style)} className={`p-4 rounded-lg border-2 text-left transition-colors ${selectedStyle === style ? 'border-[#5890AD] bg-[#9BBBCC]' : 'border-gray-200 hover:border-gray-400'}`}>
                  <p className="font-semibold text-gray-900">{style}</p>
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(3)} className="w-full mt-4">Lanjut</Button>
          </Step>

          <Step title="Tambahkan Teks & Musik" number={3} isActive={step === 3} isCompleted={!!headline}>
            <div className="space-y-4">
                <div>
                    <label className="font-medium text-gray-900">Headline / Teks Utama</label>
                    <Input type="text" placeholder="Contoh: Diskon 50% Hari Ini!" value={headline} onChange={e => setHeadline(e.target.value)} className="text-gray-900"/>
                </div>
                <div>
                    <label className="font-medium text-gray-900">Pilih Musik Latar</label>
                    <select className="w-full p-3 border rounded-md bg-white text-gray-900" value={selectedMusic} onChange={e => setSelectedMusic(e.target.value as MusicMood)}>
                        <option>Uplifting</option>
                        <option>Energetic</option>
                        <option>Calm</option>
                        <option>Cinematic</option>
                    </select>
                </div>
                 <Button onClick={handleGenerateVideo} className="w-full mt-2" disabled={isLoading || !headline}>
                    {isLoading ? "Membuat Video..." : "Buat Video"}
                 </Button>
            </div>
          </Step>
          
          <Step title="Pratinjau & Finalisasi" number={4} isActive={step === 4} isCompleted={false}>
            <p className="text-gray-600 text-sm">Video Anda sudah siap! Lihat pratinjau di samping dan lanjutkan untuk menjadwalkan postingan.</p>
          </Step>

           <div className="pt-6 border-t mt-auto">
            <Button onClick={handleProceed} className="w-full" disabled={!generatedVideoUrl || isSaving}>
              {isSaving ? 'Saving...' : 'Lanjut: Jadwalkan Postingan'}
            </Button>
           </div>
        </div>
        
        {/* Right Column: Preview */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-6 flex flex-col items-center justify-start">
            <div className="w-full max-w-sm">
                {step === 1 && uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {uploadedImages.map((image, index) => (
                           <div key={image.name + index} className="relative group">
                             <div
                               className={`aspect-square rounded-md bg-cover bg-center cursor-grab ${draggedIndex === index ? 'opacity-50' : ''}`}
                               style={{ backgroundImage: `url(${imagePreviews[index]})` }}
                               draggable
                               onDragStart={() => handleDragStart(index)}
                               onDragOver={(e) => e.preventDefault()}
                               onDrop={() => handleDrop(index)}
                             ></div>
                             <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full h-5 w-5 flex items-center justify-center p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove image"
                              >
                                <TrashIcon className="h-3 w-3" />
                             </button>
                           </div>
                        ))}
                    </div>
                )}
                {(step >= 2) && (
                  <div className="w-full aspect-[9/16] bg-black rounded-md flex flex-col items-center justify-center relative overflow-hidden">
                      {generatedVideoUrl ? (
                          <video src={generatedVideoUrl} controls className="w-full h-full" />
                      ) : isLoading ? (
                          <div className="text-white text-center p-4">
                              <Icons.sparkles className="h-8 w-8 animate-spin mx-auto mb-4" />
                              <p className="font-semibold">AI sedang bekerja...</p>
                              <p className="text-sm mt-2">{statusMessage}</p>
                          </div>
                      ) : (
                          <div className="text-gray-400 p-4 text-center">
                              <NewImageToVideoIcon className="h-12 w-12 mx-auto mb-4" />
                              <p className="font-semibold">Pratinjau video akan muncul di sini.</p>
                          </div>
                      )}
                  </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

