import React, { useState, useEffect } from 'react';
import { Page, User, EditorMode, AppProject } from '../types/index';
import { Header } from './Header';
import { Button, Card, CardContent, Icons, Input } from '../constants';
import { aiService } from '../services/geminiService';
import { createProject } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editor content state
  const [generatedImage, setGeneratedImage] = useState<string | null>(editingProject?.mediaUrl || null);
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>(editingProject?.caption ? [editingProject.caption] : []);
  const [selectedCaption, setSelectedCaption] = useState<string>(editingProject?.caption || '');
  const [generatedHashtags, setGeneratedHashtags] = useState<string>(editingProject?.hashtags || '');
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(editingProject?.voiceoverUrl || null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  // Step 1 Input State
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Fotorealistik');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
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
        }
    } catch (error) {
        console.error("Error generating visual:", error);
        alert("Maaf, gagal membuat visual. Silakan coba lagi.");
    }
    setIsLoadingVisual(false);
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
    } catch(error) {
        console.error("Error generating copy:", error);
        alert("Maaf, gagal membuat caption. Silakan coba lagi.");
    }
    setIsGeneratingCopy(false);
  }
  
  const handleGenerateVoiceover = async () => {
    if (!selectedCaption) return;
    setIsGeneratingVoiceover(true);
    setVoiceoverUrl(null);
    try {
        const url = await aiService.generateVoiceover(selectedCaption);
        setVoiceoverUrl(url);
    } catch (error) {
        console.error("Failed to generate voiceover:", error);
        alert("Maaf, gagal membuat voiceover saat ini.");
    }
    setIsGeneratingVoiceover(false);
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
        alert("Please generate a visual and select a caption first.");
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
        alert("Sorry, there was an error saving your project. Please try again.");
    }
    setIsSaving(false);
  }

  if (!appUser) return null;

  return (
    <div className="flex flex-col max-h-screen">
      <Header user={appUser} onLogout={onLogout} onBack={() => onNavigate('dashboard')} onNavigate={onNavigate} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8 overflow-y-auto">
        
        {/* Left Column: Controls */}
        <div className="flex flex-col gap-8">
            {/* Step 1: Visual Generation */}
            <Step title="Buat Visual Konten" number={1} isActive={currentStep === 1}>
                {mode === 'idea' ? (
                    <div className="space-y-4">
                        <label className="font-medium text-gray-700">Jelaskan idemu</label>
                        <textarea className="w-full p-2 border rounded-md bg-white text-gray-900" rows={4} placeholder="Contoh: Poster diskon 20% untuk kopi susu..." value={prompt} onChange={e => setPrompt(e.target.value)} />
                        <label className="font-medium text-gray-700">Pilih Gaya</label>
                        <select className="w-full p-2 border rounded-md bg-white text-gray-900" value={style} onChange={e => setStyle(e.target.value)}>
                            <option>Fotorealistik</option>
                            <option>Minimalis</option>
                            <option>Ilustrasi Kartun</option>
                            <option>Cat Air</option>
                        </select>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label className="font-medium text-gray-700">Upload Foto Produk</label>
                        <Input type="file" accept="image/*" onChange={e => e.target.files && setUploadedFile(e.target.files[0])} />
                        <p className="text-xs text-gray-500">AI akan menyempurnakan fotomu, memperbaiki cahaya, dan menghapus background.</p>
                    </div>
                )}
                <Button onClick={handleGenerateVisual} disabled={isLoadingVisual || !canGenerateVisual} className="w-full md:w-auto mt-4">
                    {isLoadingVisual ? 'Membuat Visual...' : 'Buat Visual'}
                </Button>
            </Step>

            {/* Step 2: Content Generation */}
            <Step title="Tulis Pesan & Voiceover" number={2} isActive={currentStep === 2}>
                <div className="space-y-4">
                    <Button onClick={handleGenerateCopy} disabled={isGeneratingCopy || !generatedImage} className="w-full md:w-auto">
                        {isGeneratingCopy ? 'Membuat Ulang...' : 'Buat Caption & Hashtag Baru'}
                    </Button>
                    
                    {selectedCaption && !isGeneratingCopy && (
                         <div className="space-y-2 pt-4">
                            <label className="font-semibold text-gray-700">Edit Caption Terpilih:</label>
                            <textarea className="w-full p-3 border rounded-md bg-white text-sm text-gray-900" rows={5} value={selectedCaption} onChange={e => setSelectedCaption(e.target.value)} />
                        </div>
                    )}
                    
                    {generatedCaptions.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <h4 className="font-semibold text-gray-700">Pilihan Caption (Klik untuk memilih):</h4>
                            {generatedCaptions.map((cap, i) => (
                                <div key={i} className={`text-sm p-3 rounded-md cursor-pointer ${selectedCaption === cap ? 'bg-[#9BBBCC] ring-2 ring-[#5890AD]' : 'bg-gray-100 hover:bg-gray-200'}`} onClick={() => setSelectedCaption(cap)}>
                                    {cap}
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedCaption && (
                        <div className="pt-4 space-y-2 border-t mt-4">
                            <h4 className="font-semibold text-gray-700">Voiceover</h4>
                            <Button onClick={handleGenerateVoiceover} disabled={isGeneratingVoiceover} variant="secondary" className="w-full md:w-auto">
                                {isGeneratingVoiceover ? 'Membuat Voiceover...' : 'Buat Voiceover Audio'}
                            </Button>
                            {voiceoverUrl && <audio controls src={voiceoverUrl} className="w-full mt-2" />}
                        </div>
                    )}
                    {generatedHashtags && (
                        <div className="space-y-2 pt-4">
                            <h4 className="font-semibold text-gray-700">Hashtag:</h4>
                            <div className="text-sm p-3 bg-gray-100 rounded-md font-mono">{generatedHashtags}</div>
                        </div>
                    )}
                </div>
            </Step>
            {/* Action Footer */}
            <div className="flex-shrink-0 pt-6 border-t border-gray-200 mt-auto">
                <Button onClick={handleNext} className="w-full" disabled={!generatedImage || !selectedCaption || isSaving}>
                    {isSaving ? 'Saving Project...' : 'Next: Schedule Post'}
                </Button>
            </div>
        </div>

        {/* Right Column: Preview */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-8 flex flex-col items-center justify-start">
            <div className="w-full max-w-lg aspect-square bg-gray-100 rounded-md flex items-center justify-center relative overflow-hidden">
                 {(isLoadingVisual) && (
                    <div className="flex flex-col items-center text-gray-500">
                        <Icons.sparkles className="h-8 w-8 animate-spin mb-2" />
                        <span>Generating...</span>
                    </div>
                 )}
                 {!isLoadingVisual && !generatedImage && (
                    <div className="text-gray-500 text-center p-4">
                        Preview visual kontenmu akan muncul di sini.
                    </div>
                 )}
                 {generatedImage && (
                    <div className={`relative transition-all duration-300 max-w-full max-h-full ${aspectRatioClasses[aspectRatio]}`}>
                        <img src={generatedImage} alt="Generated ad" className="object-cover w-full h-full rounded-md block" />
                    </div>
                 )}
            </div>
            {generatedImage && (
                <div className="w-full max-w-lg mt-4 space-y-4">
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 text-center">Crop for Social Media</div>
                        <div className="grid grid-cols-3 gap-2">
                            {(['1:1', '4:5', '9:16'] as AspectRatio[]).map(ar => (
                                <Button
                                    key={ar}
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
                     <div>
                        <Button variant="secondary" onClick={handleDownloadImage} className="w-full text-xs">
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

