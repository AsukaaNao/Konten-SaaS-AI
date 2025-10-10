"use client";

import React, { useState, useEffect } from "react";
import { Page, EditorMode, AppProject } from "../types/index";
import { Header } from "./Header";
import {
  Icons,
  Button,
  Card,
  CardContent,
  Spinner,
  AIThinkingIndicator,
  ButtonLoader,
} from "../constants";
import { aiService } from "../services/geminiService";
import { createProject, updateInstagramConnection } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";

interface EditorPageProps {
  onLogout: () => Promise<void>;
  onNavigate: (page: Page) => void;
  mode: EditorMode;
  onProceedToSchedule: (project: Partial<AppProject>) => void;
  editingProject?: Partial<AppProject> | null;
  onGuestGenerate: () => void;
  guestGenerations: number;
  maxGuestGenerations: number;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  onLogout,
  onNavigate,
  mode,
  onProceedToSchedule,
  editingProject,
  onGuestGenerate,
  guestGenerations,
  maxGuestGenerations,
}) => {
  const { appUser } = useAuth();
  const { addToast } = useToast();

  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasGeneratedCaption, setHasGeneratedCaption] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string>("");
  const [generatedHashtags, setGeneratedHashtags] = useState<string>("");
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16">("1:1");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Fotorealistik");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const isBusy =
    isLoadingVisual || isGeneratingCopy || isGeneratingVoiceover || isSaving || isCropping;

  const canGenerateVisual = (mode === "idea" && prompt) || (mode === "photo" && uploadedFile);

  useEffect(() => {
    if (editingProject?.id) {
        setGeneratedImages(editingProject.mediaUrl ? [editingProject.mediaUrl] : []);
        setOriginalImage(editingProject.mediaUrl || null);
        setSelectedImage(editingProject.mediaUrl || null);
        setGeneratedCaptions(editingProject.caption ? [editingProject.caption] : []);
        setSelectedCaption(editingProject.caption || "");
        setPrompt(editingProject.caption || "");
        setGeneratedHashtags(editingProject.hashtags || "");
        setVoiceoverUrl(editingProject.voiceoverUrl || null);
        setHasGeneratedCaption(!!editingProject.caption);
    } 
    else if (editingProject?.caption && !editingProject.id) {
        setPrompt(editingProject.caption);
        setHasGeneratedCaption(false);
    }
    else {
        setPrompt('');
        setSelectedCaption('');
        setGeneratedImages([]);
        setSelectedImage(null);
        setOriginalImage(null);
        setGeneratedCaptions([]);
        setGeneratedHashtags("");
        setVoiceoverUrl(null);
        setUploadedFile(null);
        setHasGeneratedCaption(false);
    }
  }, [editingProject]);


  async function urlToFile(url: string, filename: string, mimeType?: string): Promise<File> {
    const res = await fetch(url);
    const blob = await res.blob();
    const type = mimeType || blob.type || "image/png";
    return new File([blob], filename, { type });
  }

  const handleGenerateVisual = async () => {
    if (mode === "idea" && !prompt.trim()) {
      addToast("Masukkan ide atau deskripsi terlebih dahulu.", "info");
      return;
    }
    if (mode === "photo" && !uploadedFile) {
      addToast("Silakan upload foto produk terlebih dahulu.", "info");
      return;
    }

    if (!appUser) {
      if (guestGenerations >= maxGuestGenerations) {
        addToast("Batas percobaan gratis telah tercapai. Silakan login untuk melanjutkan.", "warning");
        return;
      }
    }

    setIsLoadingVisual(true);
    setGeneratedImages([]);
    setSelectedImage(null);
    setOriginalImage(null);

    try {
      const masterAspectRatio = "1:1";
      let result: any = null;

      if (mode === "idea" && prompt) {
        result = await aiService.generateImagesFromIdea(prompt, style, masterAspectRatio);
      } else if (mode === "photo" && uploadedFile) {
        const singleImageResult = await aiService.enhanceImage(uploadedFile, masterAspectRatio);
        result = singleImageResult ? { imageUrls: [singleImageResult.imageUrl] } : null;
      }

      if (result?.imageUrls?.length) {
        const firstImage = result.imageUrls[0];
        setGeneratedImages(result.imageUrls);
        setOriginalImage(firstImage);
        setSelectedImage(firstImage);
        setAspectRatio("1:1");
        addToast("Visual berhasil dibuat! Pilih yang terbaik.", "success");

        if (!appUser) onGuestGenerate();
      } else {
        throw new Error("No images returned from AI service");
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
    aspectRatio: "1:1" | "4:5" | "9:16"
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const originalImage = new Image();
      originalImage.crossOrigin = "anonymous";
      originalImage.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not get canvas context."));

        const originalWidth = originalImage.width;
        const originalHeight = originalImage.height;
        let newWidth = originalWidth;
        let newHeight = originalHeight;

        const ratioParts = aspectRatio.split(":").map(Number);
        const targetRatio = ratioParts[0] / ratioParts[1];

        if (targetRatio > originalWidth / originalHeight) {
          newWidth = originalHeight * targetRatio;
        } else {
          newHeight = originalWidth / targetRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx.clearRect(0, 0, newWidth, newHeight);

        const offsetX = (newWidth - originalWidth) / 2;
        const offsetY = (newHeight - originalHeight) / 2;
        ctx.drawImage(originalImage, offsetX, offsetY);

        resolve(canvas.toDataURL("image/png"));
      };
      originalImage.onerror = () => reject(new Error("Failed to load image for canvas manipulation."));
      originalImage.src = imageUrl;
    });
  }

  const handleAspectRatioChange = async (newAspectRatio: "1:1" | "4:5" | "9:16") => {
    if (!originalImage || aspectRatio === newAspectRatio) return;

    setAspectRatio(newAspectRatio);

    if (newAspectRatio === "1:1") {
      setSelectedImage(originalImage);
      return;
    }

    setIsCropping(true);
    try {
      const canvasImageUrl = await recomposeImageOnCanvas(originalImage, newAspectRatio);
      let finalImageUrl: string;

      if (mode === "idea") {
        const enhancedResult = await aiService.enhanceCanvasBackground(canvasImageUrl);
        finalImageUrl = enhancedResult.imageUrl;
      } else {
        const result = await aiService.outpaintImage(canvasImageUrl, newAspectRatio, "photographic");
        finalImageUrl = result.imageUrl;
      }

      setSelectedImage(finalImageUrl);
      addToast("Gambar berhasil disesuaikan!", "success");
    } catch (error) {
      console.error("Error adjusting image aspect ratio:", error);
      addToast("Gagal menyesuaikan gambar.", "error");
      setAspectRatio("1:1");
      setSelectedImage(originalImage);
    } finally {
      setIsCropping(false);
    }
  };

  const handleImageSelection = (imageUrl: string) => {
    setOriginalImage(imageUrl);
    setSelectedImage(imageUrl);
    setAspectRatio("1:1");
  };

  const handleGenerateCopy = async () => {
    if (!selectedImage) return;
    setIsGeneratingCopy(true);
    try {
      const result = await aiService.generateCopyAndHashtags(selectedImage);
      setGeneratedCaptions(result.captions || []);
      setSelectedCaption(result.captions?.[0] || "");
      setGeneratedHashtags(result.hashtags || "");
      setVoiceoverUrl(null);
      setHasGeneratedCaption(true);
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
    const link = document.createElement("a");
    link.href = selectedImage;
    link.download = `konten-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNext = async () => {
    if (!selectedImage || !selectedCaption) {
      addToast("Harap buat visual dan pilih caption terlebih dahulu.", "info");
      return;
    }
    setIsSaving(true);
    try {
      const imageFileToUpload = await urlToFile(selectedImage, `image-project-${Date.now()}.png`);
      let projectId: string | undefined = editingProject?.id;

      if (appUser) {
        if (!editingProject?.id) {
          projectId = await createProject(appUser.uid, {
            file: imageFileToUpload,
            projectType: "image",
            caption: selectedCaption,
            hashtags: generatedHashtags,
          });
        } else {
          // TODO: Implement updateProject logic here
        }
      } else {
        addToast("Anda belum login — proyek tidak akan tersimpan di akun.", "warning");
      }

      onProceedToSchedule({
        id: projectId,
        mediaUrl: selectedImage,
        projectType: "image",
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
    if (confirm("Apakah Anda yakin ingin memulai lagi? Semua kemajuan akan hilang.")) {
      setGeneratedImages([]);
      setSelectedImage(null);
      setOriginalImage(null);
      setGeneratedCaptions([]);
      setSelectedCaption("");
      setGeneratedHashtags("");
      setVoiceoverUrl(null);
      setAspectRatio("1:1");
      setPrompt("");
      setUploadedFile(null);
      setHasGeneratedCaption(false);
      addToast("Editor telah direset.", "info");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        if (files[0].type.startsWith('image/')) {
             setUploadedFile(files[0]);
        } else {
            addToast("Please drop an image file.", "warning");
        }
    }
  };

  return (
    <div className="flex flex-col max-h-screen">
      <Header user={appUser ?? undefined} onLogout={onLogout} onBack={() => onNavigate("dashboard")} onNavigate={onNavigate} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8 overflow-y-auto">
        {/* Left: Controls */}
        <div className="flex flex-col gap-8">
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingProject?.id ? "Edit Proyek" : mode === "photo" ? "Buat Konten dari Foto" : "Buat Desain dari Ide"}
                </h2>
              </div>

              {!editingProject?.id ? (
                 <>
                    {mode === 'idea' ? (
                      <div className="space-y-4">
                        <label className="font-medium text-gray-700">Jelaskan idemu</label>
                        <textarea disabled={isBusy} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full p-2 border rounded-md bg-white" placeholder="Contoh: Poster diskon 20% untuk kopi susu..." />
                        <label className="font-medium text-gray-700">Pilih Gaya</label>
                        <select disabled={isBusy} value={style} onChange={(e) => setStyle(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                          <option>Fotorealistik</option>
                          <option>Minimalis</option>
                          <option>Ilustrasi Kartun</option>
                          <option>Cat Air</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-4">
                          <label className="font-medium text-gray-700">Upload Foto Produk</label>
                          <label 
                            htmlFor="file-upload" 
                            className={`flex flex-col items-center justify-center w-full h-40 px-4 transition bg-white border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none ${isDragging ? 'border-blue-500' : 'border-gray-300'}`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                          >
                              <span className="flex items-center space-x-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  <span className="font-medium text-gray-600">
                                      {uploadedFile ? uploadedFile.name : 'Klik untuk upload atau drag & drop'}
                                  </span>
                              </span>
                          </label>
                          <input id="file-upload" name="file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])} />
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-4">Visual akan dibuat dalam format 1:1 (persegi) terlebih dahulu, lalu bisa Anda potong (crop) sesuai kebutuhan.</p>
                    <div className="flex items-center gap-2 mt-4">
                        <Button onClick={handleGenerateVisual} disabled={isBusy || !canGenerateVisual} className="w-full md:w-auto">
                            {isLoadingVisual ? <ButtonLoader /> : "Buat Visual"}
                        </Button>
                         {selectedImage && (<Button onClick={handleReset} disabled={isBusy} variant="secondary" className="w-full md:w-auto"> Mulai Lagi </Button>)}
                    </div>
                 </>
              ) : <div className="p-4 bg-gray-100 rounded-md text-sm text-gray-700">Anda sedang mengedit proyek yang sudah ada. Bagian caption & hashtag ada di bawah.</div>}
            </div>
          
          <div className="space-y-4">
            <Button onClick={handleGenerateCopy} disabled={isBusy || !selectedImage} className="w-full md:w-auto">
              {isGeneratingCopy ? <ButtonLoader /> : 'Buat Ulang Caption & Hashtag'}
            </Button>

            {isGeneratingCopy ? (
              <div className="py-8"><AIThinkingIndicator generatingWhat="copy" /></div>
            ) : (
                <div>
                  <div className="space-y-2 pt-4">
                    <label className="font-semibold text-gray-700">Edit Caption Terpilih:</label>
                    <textarea
                      disabled={isBusy || !selectedImage}
                      className="w-full p-3 border rounded-md bg-white text-sm disabled:bg-gray-100"
                      rows={5}
                      value={selectedCaption}
                      onChange={(e) => setSelectedCaption(e.target.value)}
                    />
                  </div>

                  {generatedCaptions.length > 1 && (
                    <div className="space-y-2 pt-4">
                      <h4 className="font-semibold text-gray-700">Pilihan Caption (Klik untuk memilih):</h4>
                      {generatedCaptions.map((cap, i) => (
                        <div key={i} onClick={() => !isBusy && setSelectedCaption(cap)} className={`text-sm p-3 rounded-md transition-colors ${isBusy ? 'pointer-events-none opacity-50' : 'cursor-pointer'} ${selectedCaption === cap ? 'bg-[#5890AD] text-white' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'}`}>
                          {cap}
                        </div>
                      ))}
                    </div>
                  )}

                  {hasGeneratedCaption && (
                    <>
                      <div className="pt-4 space-y-2 border-t mt-4">
                        <h4 className="font-semibold text-gray-700">Voiceover</h4>
                        <Button onClick={handleGenerateVoiceover} disabled={isBusy || !selectedCaption} variant="secondary" className="w-full md:w-auto">
                          {isGeneratingVoiceover ? <ButtonLoader /> : 'Buat Voiceover Audio'}
                        </Button>
                        {voiceoverUrl && <audio controls src={voiceoverUrl} className="w-full mt-2" />}
                      </div>
                      
                      <div className="space-y-2 pt-4">
                        <label className="font-semibold text-gray-700">Hashtag:</label>
                        <textarea
                          disabled={isBusy || !selectedImage}
                          className="w-full p-3 border rounded-md bg-white text-sm font-mono disabled:bg-gray-100"
                          rows={3}
                          value={generatedHashtags}
                          onChange={(e) => setGeneratedHashtags(e.target.value)}
                          placeholder="#contoh #hashtag"
                        />
                      </div>
                    </>
                  )}
                </div>
            )}
          </div>
         
          <div className="flex-shrink-0 pt-6 border-t border-gray-200 mt-auto">
             <Button onClick={handleNext} className="w-full" disabled={isSaving || !selectedImage || !selectedCaption}>
                 {isSaving ? 'Menyimpan...' : editingProject?.id ? 'Perbarui & Lanjutkan' : 'Lanjut: Jadwalkan Post'}
             </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-8 flex flex-col items-center justify-start">
          <div className="w-full max-w-lg aspect-square flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
            {isLoadingVisual ? (
              <AIThinkingIndicator generatingWhat="visual" />
            ) : selectedImage ? (
              <div className={`relative transition-all duration-300 max-w-full max-h-full`}>
                <img src={selectedImage} alt="Selected ad visual" className="object-cover w-full h-full rounded-md block shadow-lg" />
                {isCropping && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md z-10">
                    <Spinner  />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center p-4">Preview visual kontenmu akan muncul di sini.</div>
            )}
          </div>

          {!isLoadingVisual && generatedImages.length > 0 && (
            <div className="w-full max-w-lg mt-4 space-y-4">
              {generatedImages.length > 1 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2 text-center">Pilih Visual Favoritmu</div>
                  <div className="grid grid-cols-3 gap-2">
                    {generatedImages.map((img, index) => (
                      <button key={index} onClick={() => handleImageSelection(img)} className="relative aspect-square">
                        <img src={img} alt={`option ${index + 1}`} className="object-cover w-full h-full rounded-md" />
                        <div className={`absolute inset-0 rounded-md transition-all ${originalImage === img ? 'ring-4 ring-offset-2 ring-[#5890AD]' : 'ring-1 ring-gray-200'}`}></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2 text-center">Potong (Crop) untuk Media Sosial</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['1:1', '4:5', '9:16'] as const).map((ar) => (
                    <Button key={ar} disabled={isBusy} variant={aspectRatio === ar ? "primary" : "secondary"} onClick={() => handleAspectRatioChange(ar)} className="text-xs">
                      {ar === '1:1' && 'Square (1:1)'}
                      {ar === '4:5' && 'Portrait (4:5)'}
                      {ar === '9:16' && 'Story (9:16)'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <Button variant="secondary" onClick={handleGenerateVisual} disabled={isBusy || (!canGenerateVisual && !editingProject?.id)} className="w-full text-xs">
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

