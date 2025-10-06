import React, { useState, useEffect, useMemo } from 'react';
import { Page, AppProject, Scene } from '../types/index';
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

interface VideoEditorPageProps {
  onLogout: () => void;
  onNavigate: (page: Page) => void;
  onProceedToSchedule: (project: Partial<AppProject>) => void;
  editingProject: Partial<AppProject> | null;
}

export const VideoEditorPage: React.FC<VideoEditorPageProps> = ({ onLogout, onNavigate, onProceedToSchedule, editingProject }) => {
  const { appUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState({ storyboard: false, video: false, voiceover: false, saving: false });
  
  // Step 1: Storyboard
  const [prompt, setPrompt] = useState('');
  const [goal, setGoal] = useState('Product Showcase');
  const [storyboard, setStoryboard] = useState<Scene[] | null>(editingProject?.storyboard || null);
  
  // Step 2: Media
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  
  // Step 3: Assembly
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(editingProject?.mediaUrl || null);
  const [videoStatus, setVideoStatus] = useState('');

  // Step 4: Audio & Finalization
  const [finalCaption, setFinalCaption] = useState(editingProject?.caption || '');
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(editingProject?.voiceoverUrl || null);

  useEffect(() => {
      if (editingProject?.id) {
          if (editingProject.storyboard) setStep(2);
          if (editingProject.mediaUrl) setStep(4);
      }
  }, [editingProject]);

  const handleGenerateStoryboard = async () => {
    setIsLoading(p => ({ ...p, storyboard: true }));
    try {
      const result = await aiService.generateStoryboard(prompt, goal);
      setStoryboard(result);
      setStep(2);
    } catch (error) {
      console.error("Error generating storyboard:", error);
      alert("Failed to generate storyboard. Please try again.");
    }
    setIsLoading(p => ({ ...p, storyboard: false }));
  };

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setMediaFiles(files);
    const previews = files.map(file => URL.createObjectURL(file));
    mediaPreviews.forEach(URL.revokeObjectURL); // Clean up old previews
    setMediaPreviews(previews);
  };
  
  const handleGenerateVideo = async () => {
    if (!storyboard) return;
    setIsLoading(p => ({ ...p, video: true }));
    setVideoStatus("Initializing...");
    try {
      const url = await aiService.generateVideoFromStoryboard(storyboard, mediaFiles, setVideoStatus);
      setGeneratedVideoUrl(url);
      setStep(4);
    } catch (error) {
      console.error("Error generating video:", error);
      alert("Failed to generate video. This is an experimental feature and may fail. Please try again.");
      setVideoStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setIsLoading(p => ({ ...p, video: false }));
  };
  
  const handleGenerateVoiceover = async () => {
    if (!finalCaption) return;
    setIsLoading(p => ({ ...p, voiceover: true }));
    setVoiceoverUrl(null);
    try {
        const url = await aiService.generateVoiceover(finalCaption);
        setVoiceoverUrl(url);
    } catch (error) {
        console.error("Failed to generate voiceover:", error);
        alert("Maaf, gagal membuat voiceover saat ini.");
    }
    setIsLoading(p => ({ ...p, voiceover: false }));
  };

  const handleProceed = async () => {
    if (!appUser || !generatedVideoUrl || !finalCaption) {
      alert("Please ensure video and caption are ready.");
      return;
    }
    setIsLoading(p => ({...p, saving: true}));
    try {
        // **FIX:** Convert the generated blob URL back to a File object
        const videoFileToUpload = await urlToFile(generatedVideoUrl, `video-project-${Date.now()}.mp4`);

        const projectId = await createProject(appUser.uid, {
            file: videoFileToUpload, // Pass the File object
            projectType: 'video',
            caption: finalCaption,
            hashtags: '', // Hashtags aren't generated in this flow
        });

        onProceedToSchedule({
          id: projectId,
          mediaUrl: generatedVideoUrl, // Use blob URL for display
          projectType: 'video',
          caption: finalCaption,
          storyboard: storyboard || undefined,
          voiceoverUrl: voiceoverUrl || undefined,
        });
    } catch (error) {
        console.error("Failed to save project", error);
        alert("Failed to save project. Please try again.");
    }
    setIsLoading(p => ({...p, saving: false}));
  };
  
  const totalDuration = useMemo(() => storyboard?.reduce((acc, s) => acc + s.duration, 0) || 0, [storyboard]);

  if (!appUser) return null;

  return (
    <div className="flex flex-col max-h-screen">
      <Header user={appUser} onLogout={onLogout} onBack={() => onNavigate('dashboard')} onNavigate={onNavigate} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8 overflow-y-auto">
        {/* Left Column: Controls */}
        <div className="flex flex-col gap-6">
          <Step title="The Plan: AI Storyboard" number={1} isActive={step === 1} isCompleted={!!storyboard}>
            <div className="space-y-4">
              <label className="font-medium text-gray-700">Jelaskan produk/jasamu</label>
              <textarea className="w-full p-2 border rounded-md bg-white" rows={3} placeholder="Contoh: Kopi susu Gula Aren dengan biji kopi premium dari Jawa Barat..." value={prompt} onChange={e => setPrompt(e.target.value)} />
              <label className="font-medium text-gray-700">Pilih Tujuan Video</label>
              <select className="w-full p-2 border rounded-md bg-white" value={goal} onChange={e => setGoal(e.target.value)}>
                <option>Product Showcase</option>
                <option>Quick Tutorial</option>
                <option>Unboxing</option>
                <option>Viral Trend</option>
              </select>
              <Button onClick={handleGenerateStoryboard} disabled={isLoading.storyboard || !prompt} className="w-full">
                {isLoading.storyboard ? 'Membuat Storyboard...' : 'Buat Storyboard'}
              </Button>
            </div>
          </Step>

          <Step title="The Media: Upload Aset" number={2} isActive={step === 2} isCompleted={mediaFiles.length > 0}>
            <p className="text-sm text-gray-600 mb-4">Upload foto atau klip video pendek (max 10 file). AI akan menggunakannya sebagai inspirasi visual.</p>
            <Input type="file" multiple accept="image/*,video/*" onChange={handleMediaUpload} />
            {mediaFiles.length > 0 && <Button onClick={() => setStep(3)} className="w-full mt-4">Lanjut</Button>}
          </Step>
          
          <Step title="The Magic: AI Assembly" number={3} isActive={step === 3} isCompleted={!!generatedVideoUrl}>
              <p className="text-sm text-gray-600 mb-4">AI akan menggabungkan storyboard dan aset mediamu menjadi sebuah video. Proses ini mungkin memakan waktu beberapa menit.</p>
              <Button onClick={handleGenerateVideo} disabled={isLoading.video} className="w-full">
                {isLoading.video ? 'Merakit Video...' : 'Buat Video Sekarang'}
              </Button>
          </Step>

          <Step title="The Sound: Audio & Finalisasi" number={4} isActive={step === 4} isCompleted={false}>
            <div className="space-y-4">
              <div>
                <label className="font-medium text-gray-700">Final Caption</label>
                <textarea className="w-full p-2 border rounded-md bg-white" rows={4} placeholder="Tulis caption akhir untuk postinganmu..." value={finalCaption} onChange={e => setFinalCaption(e.target.value)} />
              </div>
               <div>
                <label className="font-medium text-gray-700">AI Voiceover (Opsional)</label>
                <Button onClick={handleGenerateVoiceover} disabled={isLoading.voiceover || !finalCaption} variant="secondary" className="w-full">
                  {isLoading.voiceover ? 'Membuat Voiceover...' : 'Buat Voiceover dari Caption'}
                </Button>
                {voiceoverUrl && <audio controls src={voiceoverUrl} className="w-full mt-2" />}
              </div>
            </div>
          </Step>

          <div className="pt-6 border-t mt-auto">
            <Button onClick={handleProceed} className="w-full" disabled={step < 4 || !generatedVideoUrl || !finalCaption || isLoading.saving}>
              {isLoading.saving ? 'Saving...' : 'Lanjut: Jadwalkan Postingan'}
            </Button>
          </div>
        </div>
        
        {/* Right Column: Preview */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-6 flex flex-col items-center justify-start">
          <div className="w-full max-w-sm">
            {step === 1 && storyboard && (
              <div>
                <h3 className="font-bold text-center mb-2">AI Storyboard (~{totalDuration}s)</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {storyboard.map(s => (
                    <Card key={s.scene} className="bg-gray-50">
                      <CardContent className="p-3">
                        <p className="font-bold text-sm">Scene {s.scene} ({s.duration}s)</p>
                        <p className="text-xs mt-1"><b>Visual:</b> {s.visual}</p>
                        <p className="text-xs mt-1"><b>Teks:</b> "{s.text}"</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && mediaPreviews.length > 0 && (
              <div>
                  <h3 className="font-bold text-center mb-2">Media Uploaded</h3>
                  <div className="grid grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
                      {mediaPreviews.map((src, i) => (
                          <img key={i} src={src} className="w-full aspect-square object-cover rounded" />
                      ))}
                  </div>
              </div>
            )}
             {(step >= 3 || isLoading.video) && (
               <div className="w-full aspect-[9/16] bg-black rounded-md flex flex-col items-center justify-center relative">
                 {generatedVideoUrl ? (
                   <video src={generatedVideoUrl} controls className="w-full h-full rounded-md" />
                 ) : isLoading.video ? (
                   <div className="text-white text-center p-4">
                     <Icons.sparkles className="h-8 w-8 animate-spin mx-auto mb-4" />
                     <p className="font-semibold">AI is working...</p>
                     <p className="text-sm mt-2">{videoStatus}</p>
                   </div>
                 ) : (
                   <div className="text-gray-500 p-4 text-center">Video preview will appear here.</div>
                 )}
               </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};
