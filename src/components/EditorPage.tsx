import React, { useState, useEffect } from 'react';
import { Page, EditorMode, AppProject } from '../types/index';
import { Header } from './Header';
import { Button, Card, CardContent, Icons, Input, ButtonLoader, AIThinkingIndicator } from '../constants';
import { aiService } from '../services/geminiService';
import { createProject } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
// --- Animation Import ---
import { motion, AnimatePresence, Variants } from 'framer-motion';

const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } }
};

const staggerContainer: Variants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

const hoverEffect = {
    scale: 1.05,
    transition: { type: "spring", stiffness: 400, damping: 10 }
} as const;

const tapEffect = {
    scale: 0.95
} as const;

// --- Helper Step Component ---
const Step: React.FC<{ title: string; number: number; children: React.ReactNode; isActive: boolean; }> = ({ title, number, children, isActive }) => (
    <motion.div 
        className={`transition-opacity duration-500 ${!isActive ? 'opacity-40' : 'opacity-100'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isActive ? 1 : 0.4, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${isActive ? 'bg-[#5890AD] text-white' : 'bg-gray-200 text-gray-600'}`}>
                {number}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="pl-12">
            {children}
        </div>
    </motion.div>
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
    const [isCropping, setIsCropping] = useState(false); 

    const [generatedImages, setGeneratedImages] = useState<string[]>(editingProject?.mediaUrl ? [editingProject.mediaUrl] : []);
    const [originalImage, setOriginalImage] = useState<string | null>(editingProject?.mediaUrl || null); 
    const [selectedImage, setSelectedImage] = useState<string | null>(editingProject?.mediaUrl || null); 

    const [generatedCaptions, setGeneratedCaptions] = useState<string[]>(editingProject?.caption ? [editingProject.caption] : []);
    const [selectedCaption, setSelectedCaption] = useState<string>(editingProject?.caption || '');
    const [generatedHashtags, setGeneratedHashtags] = useState<string>(editingProject?.hashtags || '');
    const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(editingProject?.voiceoverUrl || null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Fotorealistik');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    const isBusy = isLoadingVisual || isGeneratingCopy || isGeneratingVoiceover || isSaving || isCropping;

    const canGenerateVisual = (mode === 'idea' && prompt) || (mode === 'photo' && uploadedFile);

    const aspectRatioClasses: Record<AspectRatio, string> = {
        '1:1': 'aspect-square',
        '4:5': 'aspect-[4/5]',
        '9:16': 'aspect-[9/16]'
    };

    useEffect(() => {
        if (editingProject?.mediaUrl) {
            setGeneratedImages([editingProject.mediaUrl]);
            setOriginalImage(editingProject.mediaUrl);
            setSelectedImage(editingProject.mediaUrl);
            setSelectedCaption(editingProject.caption || '');
            setGeneratedHashtags(editingProject.hashtags || '');
            setVoiceoverUrl(editingProject.voiceoverUrl || null);
            setCurrentStep(2);
        }
    }, [editingProject]);
    
    // --- Generate "master" 1:1 image ---
    const handleGenerateVisual = async () => {
        setIsLoadingVisual(true);
        setGeneratedImages([]);
        setSelectedImage(null);
        setOriginalImage(null);
        try {
            const masterAspectRatio = '1:1';
            let result = null;

            if (mode === 'idea' && prompt) {
                result = await aiService.generateImagesFromIdea(prompt, style, masterAspectRatio);
            } else if (mode === 'photo' && uploadedFile) {
                const singleImageResult = await aiService.enhanceImage(uploadedFile, masterAspectRatio);
                result = singleImageResult ? { imageUrls: [singleImageResult.imageUrl] } : null;
            }

            if (result?.imageUrls?.length) {
                const firstImage = result.imageUrls[0];
                setGeneratedImages(result.imageUrls);
                setOriginalImage(firstImage); 
                setSelectedImage(firstImage); 
                setAspectRatio('1:1'); 
                setCurrentStep(2);
                addToast("Visual berhasil dibuat! Pilih yang terbaik.", "success");
            }
        } catch (error) {
            console.error("Error generating visual:", error);
            const message = error instanceof Error ? error.message : "Gagal membuat visual. Coba lagi.";
            addToast(message, "error");
        } finally {
            setIsLoadingVisual(false);
        }
    };

    async function recomposeImageOnCanvas(
        imageUrl: string, 
        aspectRatio: '1:1' | '4:5' | '9:16'
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const originalImage = new Image();
            originalImage.crossOrigin = 'anonymous';
            originalImage.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context.'));

                const originalWidth = originalImage.width;
                const originalHeight = originalImage.height;
                let newWidth = originalWidth;
                let newHeight = originalHeight;

                const ratioParts = aspectRatio.split(':').map(Number);
                const targetRatio = ratioParts[0] / ratioParts[1];

                if (targetRatio > originalWidth / originalHeight) {
                    newWidth = originalHeight * targetRatio;
                } else {
                    newHeight = originalWidth / targetRatio;
                }

                canvas.width = newWidth;
                canvas.height = newHeight;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 1;
                tempCanvas.height = 1;
                const tempCtx = tempCanvas.getContext('2d');
                if(tempCtx) {
                    tempCtx.drawImage(originalImage, 0, 0, 1, 1);
                    const pixelData = tempCtx.getImageData(0, 0, 1, 1).data;
                    const bgColor = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, newWidth, newHeight);
                }

                const offsetX = (newWidth - originalWidth) / 2;
                const offsetY = (newHeight - originalHeight) / 2;
                ctx.drawImage(originalImage, offsetX, offsetY);

                resolve(canvas.toDataURL('image/png'));
            };
            originalImage.onerror = () => reject(new Error('Failed to load image for canvas manipulation.'));
            originalImage.src = imageUrl;
        });
    }

    const handleAspectRatioChange = async (newAspectRatio: AspectRatio) => {
        if (!originalImage || aspectRatio === newAspectRatio) return;

        setAspectRatio(newAspectRatio);

        if (newAspectRatio === '1:1') {
            setSelectedImage(originalImage);
            return;
        }

        setIsCropping(true);
        try {
            let outpaintType: 'photographic' | 'design' = 'photographic';
            if (mode === 'idea') {
                outpaintType = 'design';
            }
            console.log(`[Resize Logic] Mode: "${mode}" | Using method: "${outpaintType}"`);

            let finalImageUrl: string;

            if (outpaintType === 'design') {
                const canvasImageUrl = await recomposeImageOnCanvas(originalImage, newAspectRatio);
                const enhancedResult = await aiService.enhanceCanvasBackground(canvasImageUrl);
                finalImageUrl = enhancedResult.imageUrl;
            } else { // 'photographic'
                const result = await aiService.outpaintImage(originalImage, newAspectRatio, 'photographic');
                finalImageUrl = result.imageUrl;
            }

            setSelectedImage(finalImageUrl);
            addToast("Gambar berhasil disesuaikan!", "success");

        } catch (error) {
            console.error("Error adjusting image aspect ratio:", error);
            addToast("Gagal menyesuaikan gambar.", "error");
            setAspectRatio('1:1');
            setSelectedImage(originalImage);
        } finally {
            setIsCropping(false);
        }
    };

    const handleImageSelection = (imageUrl: string) => {
        setOriginalImage(imageUrl);
        setSelectedImage(imageUrl);
        setAspectRatio('1:1'); 
    };

    const handleGenerateCopy = async () => {
        if (!selectedImage) return;
        setIsGeneratingCopy(true);
        try {
            const result = await aiService.generateCopyAndHashtags(selectedImage);
            setGeneratedCaptions(result.captions);
            setSelectedCaption(result.captions[0] || '');
            setGeneratedHashtags(result.hashtags);
            setVoiceoverUrl(null);
            addToast("Caption & hashtag berhasil dibuat!", "success");
        } catch (error) {
            console.error("Error generating copy:", error);
            const message = error instanceof Error ? error.message : "Gagal membuat caption. Coba lagi.";
            addToast(message, "error");
        } finally {
            setIsGeneratingCopy(false);
        }
    };

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
        if (!selectedImage) return;
        const link = document.createElement('a');
        link.href = selectedImage;
        link.download = `konten-ai-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleNext = async () => {
        if (!appUser || !selectedImage || !selectedCaption) {
            addToast("Harap buat visual dan pilih caption terlebih dahulu.", "info");
            return;
        }
        setIsSaving(true);
        try {
            const imageFileToUpload = await urlToFile(selectedImage, `image-project-${Date.now()}.png`);

            const projectId = await createProject(appUser.uid, {
                file: imageFileToUpload,
                projectType: 'image',
                caption: selectedCaption,
                hashtags: generatedHashtags,
            });

            onProceedToSchedule({
                id: projectId,
                mediaUrl: selectedImage,
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
    };

    const handleReset = () => {
        if (window.confirm("Apakah Anda yakin ingin memulai lagi? Semua kemajuan akan hilang.")) {
            setCurrentStep(1);
            setGeneratedImages([]);
            setSelectedImage(null);
            setOriginalImage(null); 
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

                {/* --- Left Panel (Controls) --- */}
                <motion.div className="flex flex-col gap-8" initial="hidden" animate="show" variants={fadeInUp}>
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
                                <p className="text-xs text-gray-500">AI akan membuat fotomu menjadi 1:1 dan siap di-crop.</p>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-4">Visual akan dibuat dalam format 1:1 (persegi) terlebih dahulu, lalu bisa Anda potong (crop) sesuai kebutuhan.</p>
                        <div className="flex items-center gap-2 mt-4">
                            <Button onClick={handleGenerateVisual} disabled={isBusy || !canGenerateVisual} className="w-full md:w-auto">
                                {isLoadingVisual ? <ButtonLoader /> : 'Buat Visual'}
                            </Button>
                            {selectedImage && (<Button onClick={handleReset} disabled={isBusy} variant="secondary" className="w-full md:w-auto"> Mulai Lagi </Button>)}
                        </div>
                    </Step>

                    <Step title="Tulis Pesan & Voiceover" number={2} isActive={currentStep === 2}>
                        <div className="space-y-4">
                            <Button onClick={handleGenerateCopy} disabled={isBusy || !selectedImage} className="w-full md:w-auto">
                                {isGeneratingCopy ? <ButtonLoader /> : 'Buat Caption & Hashtag Baru'}
                            </Button>
                            <AnimatePresence mode="wait">
                            {isGeneratingCopy ? (
                                <motion.div key="loader" variants={fadeInUp} initial="hidden" animate="show" exit="exit" className="py-8">
                                    <AIThinkingIndicator generatingWhat="copy" />
                                </motion.div>
                            ) : (
                                <motion.div key="content" variants={fadeInUp}>
                                    {selectedCaption && (
                                        <div className="space-y-2 pt-4">
                                            <label className="font-semibold text-gray-700">Edit Caption Terpilih:</label>
                                            <textarea disabled={isBusy} className="w-full p-3 border rounded-md bg-white text-sm text-gray-900 disabled:opacity-50" rows={5} value={selectedCaption} onChange={e => setSelectedCaption(e.target.value)} />
                                        </div>
                                    )}
                                    {generatedCaptions.length > 0 && (
                                        <motion.div className="space-y-2 pt-4" variants={staggerContainer} initial="hidden" animate="show">
                                            <h4 className="font-semibold text-gray-700">Pilihan Caption (Klik untuk memilih):</h4>
                                            {generatedCaptions.map((cap, i) => (
                                                <motion.div
                                                    key={i}
                                                    variants={fadeInUp}
                                                    whileHover={!isBusy ? hoverEffect : {}}
                                                    whileTap={!isBusy ? tapEffect : {}}
                                                    className={`text-sm p-3 rounded-md transition-colors ${isBusy ? 'pointer-events-none opacity-50' : 'cursor-pointer'} ${selectedCaption === cap ? 'bg-[#5890AD] text-white' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'}`}
                                                    onClick={() => !isBusy && setSelectedCaption(cap)}
                                                >
                                                    {cap}
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                    <AnimatePresence>
                                    {selectedCaption && (
                                        <motion.div variants={fadeInUp} initial="hidden" animate="show" exit="exit" className="pt-4 space-y-2 border-t mt-4">
                                            <h4 className="font-semibold text-gray-700">Voiceover</h4>
                                            <Button onClick={handleGenerateVoiceover} disabled={isBusy} variant="secondary" className="w-full md:w-auto">
                                                {isGeneratingVoiceover ? <ButtonLoader /> : 'Buat Voiceover Audio'}
                                            </Button>
                                            <AnimatePresence>
                                                {voiceoverUrl && <motion.audio variants={fadeInUp} initial="hidden" animate="show" exit="exit" controls src={voiceoverUrl} className="w-full mt-2" />}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                    {generatedHashtags && (
                                        <motion.div variants={fadeInUp} className="space-y-2 pt-4">
                                            <h4 className="font-semibold text-gray-700">Hashtag:</h4>
                                            <div className="text-sm p-3 bg-white text-gray-800 border border-gray-200 rounded-md font-mono">{generatedHashtags}</div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    </Step>

                    <div className="flex-shrink-0 pt-6 border-t border-gray-200 mt-auto">
                        <Button onClick={handleNext} className="w-full" disabled={isBusy || !selectedImage || !selectedCaption}>
                            {isSaving ? 'Menyimpan...' : 'Lanjut: Jadwalkan Post'}
                        </Button>
                    </div>
                </motion.div>

                {/* --- PREVIEW PANEL --- */}
                <motion.div 
                    className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-8 flex flex-col items-center justify-start"
                    initial="hidden" animate="show" variants={fadeInUp} transition={{ delay: 0.2 }}
                >
                    <div className="w-full max-w-lg aspect-square flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                        <AnimatePresence mode="wait">
                            {isLoadingVisual ? (
                                <motion.div key="loader" variants={fadeInUp} initial="hidden" animate="show" exit="exit">
                                    <AIThinkingIndicator generatingWhat="visual" />
                                </motion.div>
                            ) : selectedImage ? (
                                <motion.div 
                                    key="image"
                                    variants={fadeInUp} initial="hidden" animate="show" exit="exit"
                                    className={`relative transition-all duration-300 max-w-full max-h-full ${aspectRatioClasses[aspectRatio]}`}
                                >
                                    <img src={selectedImage} alt="Selected ad visual" className="object-cover w-full h-full rounded-md block shadow-lg" />
                                    <AnimatePresence>
                                    {isCropping && (
                                        <motion.div 
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md z-10"
                                        >
                                            <ButtonLoader />
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div key="placeholder" variants={fadeInUp} initial="hidden" animate="show" exit="exit" className="text-gray-500 text-center p-4">
                                    Preview visual kontenmu akan muncul di sini.
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <AnimatePresence>
                    {!isLoadingVisual && generatedImages.length > 0 && (
                        <motion.div 
                            className="w-full max-w-lg mt-4 space-y-4"
                            variants={fadeInUp} initial="hidden" animate="show" exit="exit"
                        >
                            {generatedImages.length > 1 && (
                                <motion.div variants={staggerContainer}>
                                    <div className="text-sm font-medium text-gray-700 mb-2 text-center">Pilih Visual Favoritmu</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {generatedImages.map((img, index) => (
                                            <motion.button 
                                                key={index} 
                                                onClick={() => handleImageSelection(img)} 
                                                className="relative aspect-square"
                                                variants={fadeInUp}
                                                whileHover={hoverEffect}
                                                whileTap={tapEffect}
                                            >
                                                <img src={img} alt={`option ${index + 1}`} className="object-cover w-full h-full rounded-md" />
                                                <div className={`absolute inset-0 rounded-md transition-all ${originalImage === img ? 'ring-4 ring-offset-2 ring-[#5890AD]' : 'ring-1 ring-gray-200'}`}></div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            <div>
                                <div className="text-sm font-medium text-gray-700 mb-2 text-center">Potong (Crop) untuk Media Sosial</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['1:1', '4:5', '9:16'] as AspectRatio[]).map(ar => (
                                        <Button
                                            key={ar}
                                            disabled={isBusy}
                                            variant={aspectRatio === ar ? 'primary' : 'secondary'}
                                            onClick={() => handleAspectRatioChange(ar)}
                                            className="text-xs"
                                        >
                                            {ar === '1:1' && 'Square (1:1)'}
                                            {ar === '4:5' && 'Portrait (4:5)'}
                                            {ar === '9:16' && 'Story (9:16)'}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-4">
                                <Button variant="secondary" onClick={handleGenerateVisual} disabled={isBusy || !canGenerateVisual} className="w-full text-xs">
                                    Buat Ulang Visual
                                </Button>
                                <Button variant="secondary" onClick={handleDownloadImage} disabled={isBusy} className="w-full text-xs">
                                    Download Image
                                </Button>
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </motion.div>
            </main>
        </div>
    );
};