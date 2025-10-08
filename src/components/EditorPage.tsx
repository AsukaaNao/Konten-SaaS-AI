import React, { useState, useEffect } from 'react';
import { Page, User, EditorMode, AppProject } from '../types/index';
import { Header } from './Header';
import { Button, Card, CardContent, Icons, Input, ButtonLoader, AIThinkingIndicator} from '../constants';
import { aiService } from '../services/geminiService';
import { createProject } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast'; 

// --- Helper Step Component ---
const Step: React.FC<{ title: string; number: number; children: React.ReactNode; isActive: boolean; }> = ({ title, number, children, isActive }) => (
    <div className={`transition-opacity duration-500 ${!isActive ? 'opacity-40' : 'opacity-100'}`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${isActive ? 'bg-[#5890AD] text-white' : 'bg-gray-200 text-gray-600'}`}>
                {number}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="pl-12">
            {children}
        </div>
    </div>
);

// --- urlToFile Function ---
async function urlToFile(url: string, filename: string, mimeType?: string): Promise<File> {
    const res = await fetch(url);
    const blob = await res.blob();
    const type = mimeType || blob.type || 'image/png';
    return new File([blob], filename, { type });
}

// --- Editor Page Component ---
interface EditorPageProps {
  onLogout: () => void;
  onNavigate: (page: Page) => void;
  mode: EditorMode;
  onProceedToSchedule: (project: Partial<AppProject>) => void;
  editingProject: Partial<AppProject> | null;
}

type AspectRatio = '1:1' | '4:5' | '9:16';

export const EditorPage: React.FC<EditorPageProps> = ({ onLogout, onNavigate, mode, onProceedToSchedule, editingProject }) => {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(editingProject?.mediaUrl || null);
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>(editingProject?.caption ? [editingProject.caption] : []);
  const [selectedCaption, setSelectedCaption] = useState<string>(editingProject?.caption || '');
  const [generatedHashtags, setGeneratedHashtags] = useState<string>(editingProject?.hashtags || '');
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(editingProject?.voiceoverUrl || null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Fotorealistik');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const isBusy = isLoadingVisual || isGeneratingCopy || isGeneratingVoiceover || isSaving;
  
  const canGenerateVisual = (mode === 'idea' && prompt) || (mode === 'photo' && uploadedFile);

  const aspectRatioClasses: Record<AspectRatio, string> = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]'
  };

  useEffect(() => {
    if (editingProject?.mediaUrl) {
      setGeneratedImage(editingProject.mediaUrl);
      setSelectedCaption(editingProject.caption || '');
      setGeneratedHashtags(editingProject.hashtags || '');
      setVoiceoverUrl(editingProject.voiceoverUrl || null);
      setCurrentStep(2);
    }
  }, [editingProject]);


  const handleGenerateVisual = async () => {
    setIsLoadingVisual(true);
    setGeneratedImage(null);
    try {
        let result = null;
        if (mode === 'idea' && prompt) {
            result = await aiService.generateImageFromIdea(prompt, style);
        } else if (mode === 'photo' && uploadedFile) {
            result = await aiService.enhanceImage(uploadedFile);
        }
        if(result) {
            setGeneratedImage(result.imageUrl);
            setCurrentStep(2);
            addToast("Visual berhasil dibuat!", "success");
        }
    } catch (error) {
        console.error("Error generating visual:", error);
        const message = error instanceof Error ? error.message : "Gagal membuat visual. Coba lagi.";
        addToast(message, "error");
    } finally {
        setIsLoadingVisual(false);
    }
  };

  const handleGenerateCopy = async () => {
    if (!generatedImage) return;
    setIsGeneratingCopy(true);
    try {
        const result = await aiService.generateCopyAndHashtags(generatedImage);
        setGeneratedCaptions(result.captions);
        setSelectedCaption(result.captions[0] || '');
        setGeneratedHashtags(result.hashtags);
        setVoiceoverUrl(null);
        addToast("Caption & hashtag berhasil dibuat!", "success");
    } catch(error) {
        console.error("Error generating copy:", error);
        const message = error instanceof Error ? error.message : "Gagal membuat caption. Coba lagi.";
        addToast(message, "error");
    } finally {
        setIsGeneratingCopy(false);
    }
  }
  
  const handleGenerateVoiceover = async () => {
    if (!selectedCaption) return;
    setIsGeneratingVoiceover(true);
    setVoiceoverUrl(null);
    try {
        const url = await aiService.generateVoiceover(selectedCaption);
        setVoiceoverUrl(url);
        addToast("Voiceover berhasil dibuat!", "success");
    } catch (error) {
        console.error("Failed to generate voiceover:", error);
        const message = error instanceof Error ? error.message : "Gagal membuat voiceover. Coba lagi.";
        addToast(message, "error");
    } finally {
        setIsGeneratingVoiceover(false);
    }
  };
  
  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `konten-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNext = async () => {
    if (!appUser || !generatedImage || !selectedCaption) {
        addToast("Harap buat visual dan pilih caption terlebih dahulu.", "info");
        return;
    }
    setIsSaving(true);
    try {
        const cropResult = await aiService.cropImage(generatedImage, aspectRatio);
        const imageFileToUpload = await urlToFile(cropResult.imageUrl, `image-project-${Date.now()}.png`);

        const projectId = await createProject(appUser.uid, {
            file: imageFileToUpload,
            projectType: 'image',
            caption: selectedCaption,
            hashtags: generatedHashtags,
        });
        
        onProceedToSchedule({
            id: projectId,
            mediaUrl: cropResult.imageUrl,
            projectType: 'image',
            caption: selectedCaption,
            hashtags: generatedHashtags,
            voiceoverUrl: voiceoverUrl || undefined,
        });

    } catch (error) {
        console.error("Failed to save and proceed:", error);
        const message = error instanceof Error ? error.message : "Gagal menyimpan proyek. Coba lagi.";
        addToast(message, "error");
    } finally {
        setIsSaving(false);
    }
  }
  
  const handleReset = () => {
    if (window.confirm("Apakah Anda yakin ingin memulai lagi? Semua kemajuan akan hilang.")) {
        setCurrentStep(1);
        setGeneratedImage(null);
        setGeneratedCaptions([]);
        setSelectedCaption('');
        setGeneratedHashtags('');
        setVoiceoverUrl(null);
        setAspectRatio('1:1');
        setPrompt('');
        setUploadedFile(null);
        addToast("Editor telah direset.", "info");
    }
  };

  if (!appUser) return null;

  return (
    <div className="flex flex-col max-h-screen">
      <Header user={appUser} onLogout={onLogout} onBack={() => onNavigate('dashboard')} onNavigate={onNavigate} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8 overflow-y-auto">
        
        <div className="flex flex-col gap-8">
            <Step title="Buat Visual Konten" number={1} isActive={currentStep === 1}>
                {mode === 'idea' ? (
                    <div className="space-y-4">
                        <label className="font-medium text-gray-700">Jelaskan idemu</label>
                        <textarea disabled={isBusy} className="w-full p-2 border rounded-md bg-white text-gray-900 disabled:opacity-50" rows={4} placeholder="Contoh: Poster diskon 20% untuk kopi susu..." value={prompt} onChange={e => setPrompt(e.target.value)} />
                        <label className="font-medium text-gray-700">Pilih Gaya</label>
                        <select disabled={isBusy} className="w-full p-2 border rounded-md bg-white text-gray-900 disabled:opacity-50" value={style} onChange={e => setStyle(e.target.value)}>
                            <option>Fotorealistik</option>
                            <option>Minimalis</option>
                            <option>Ilustrasi Kartun</option>
                            <option>Cat Air</option>
                        </select>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label className="font-medium text-gray-700">Upload Foto Produk</label>
                        <Input disabled={isBusy} type="file" accept="image/*" onChange={e => e.target.files && setUploadedFile(e.target.files[0])} />
                        <p className="text-xs text-gray-500">AI akan menyempurnakan fotomu, memperbaiki cahaya, dan menghapus background.</p>
                    </div>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <Button onClick={handleGenerateVisual} disabled={isBusy || !canGenerateVisual} className="w-full md:w-auto">
                      {isLoadingVisual ? <ButtonLoader /> : 'Buat Visual'}
                  </Button>
                  {generatedImage && (
                    <Button onClick={handleReset} disabled={isBusy} variant="secondary" className="w-full md:w-auto">
                      Mulai Lagi
                    </Button>
                  )}
                </div>
            </Step>

            <Step title="Tulis Pesan & Voiceover" number={2} isActive={currentStep === 2}>
                <div className="space-y-4">
                    <Button onClick={handleGenerateCopy} disabled={isBusy || !generatedImage} className="w-full md:w-auto">
                        {isGeneratingCopy ? <ButtonLoader /> : 'Buat Caption & Hashtag Baru'}
                    </Button>
                    
                    {isGeneratingCopy ? ( <div className="py-8"><AIThinkingIndicator generatingWhat="copy" /></div> ) : (
                        <>
                            {selectedCaption && (
                                 <div className="space-y-2 pt-4">
                                     <label className="font-semibold text-gray-700">Edit Caption Terpilih:</label>
                                     <textarea disabled={isBusy} className="w-full p-3 border rounded-md bg-white text-sm text-gray-900 disabled:opacity-50" rows={5} value={selectedCaption} onChange={e => setSelectedCaption(e.target.value)} />
                                 </div>
                            )}
                            
                            {generatedCaptions.length > 0 && (
                                 <div className="space-y-2 pt-4">
                                     <h4 className="font-semibold text-gray-700">Pilihan Caption (Klik untuk memilih):</h4>
                                     {generatedCaptions.map((cap, i) => (
                                         <div 
                                             key={i} 
                                             className={`text-sm p-3 rounded-md transition-colors ${
                                                 isBusy 
                                                 ? 'pointer-events-none opacity-50' 
                                                 : 'cursor-pointer'
                                             } ${
                                                 selectedCaption === cap 
                                                 ? 'bg-[#5890AD] text-white' 
                                                 : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'
                                             }`} 
                                             onClick={() => !isBusy && setSelectedCaption(cap)}
                                         >
                                             {cap}
                                         </div>
                                     ))}
                                 </div>
                            )}

                            {selectedCaption && (
                                 <div className="pt-4 space-y-2 border-t mt-4">
                                     <h4 className="font-semibold text-gray-700">Voiceover</h4>
                                     <Button onClick={handleGenerateVoiceover} disabled={isBusy} variant="secondary" className="w-full md:w-auto">
                                         {isGeneratingVoiceover ? <ButtonLoader /> : 'Buat Voiceover Audio'}
                                     </Button>
                                     {voiceoverUrl && <audio controls src={voiceoverUrl} className="w-full mt-2" />}
                                 </div>
                            )}

                            {generatedHashtags && (
                                 <div className="space-y-2 pt-4">
                                     <h4 className="font-semibold text-gray-700">Hashtag:</h4>
                                     <div className="text-sm p-3 bg-white text-gray-800 border border-gray-200 rounded-md font-mono">{generatedHashtags}</div>
                                 </div>
                            )}
                        </>
                    )}
                </div>
            </Step>

            <div className="flex-shrink-0 pt-6 border-t border-gray-200 mt-auto">
                <Button onClick={handleNext} className="w-full" disabled={isBusy || !generatedImage || !selectedCaption}>
                    {isSaving ? 'Menyimpan...' : 'Lanjut: Jadwalkan Post'}
                </Button>
            </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-8 flex flex-col items-center justify-start">
            <div className="w-full max-w-lg aspect-square flex items-center justify-center">
                {isLoadingVisual ? (
                    <AIThinkingIndicator generatingWhat="visual" />
                ) : generatedImage ? (
                    <div className={`relative transition-all duration-300 max-w-full max-h-full ${aspectRatioClasses[aspectRatio]}`}>
                        <img src={generatedImage} alt="Generated ad" className="object-cover w-full h-full rounded-md block" />
                    </div>
                ) : (
                    <div className="text-gray-500 text-center p-4">
                        Preview visual kontenmu akan muncul di sini.
                    </div>
                )}
            </div>
            
            {!isLoadingVisual && generatedImage && (
                <div className="w-full max-w-lg mt-4 space-y-4">
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 text-center">Crop for Social Media</div>
                        <div className="grid grid-cols-3 gap-2">
                            {(['1:1', '4:5', '9:16'] as AspectRatio[]).map(ar => (
                                <Button
                                    key={ar}
                                    disabled={isBusy}
                                    variant={aspectRatio === ar ? 'primary' : 'secondary'}
                                    onClick={() => setAspectRatio(ar)}
                                    className="text-xs"
                                >
                                    {ar === '1:1' && 'Square (1:1)'}
                                    {ar === '4:5' && 'Portrait (4:5)'}
                                    {ar === '9:16' && 'Story (9:16)'}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={handleGenerateVisual} disabled={isBusy || !canGenerateVisual} className="w-full text-xs">
                          Buat Ulang Visual
                      </Button>
                        <Button variant="secondary" onClick={handleDownloadImage} disabled={isBusy} className="w-full text-xs">
                            Download Image
                        </Button>
                  </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};