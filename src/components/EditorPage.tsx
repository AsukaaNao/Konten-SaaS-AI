"use client";

import React, { useState, useEffect } from "react";
import { Page, EditorMode, AppProject } from "@/types/index";
import { Header } from "@/components/Header";
import {
  Icons,
  Button,
  Card,
  CardContent,
  Spinner,
  AIThinkingIndicator,
  ButtonLoader,
} from "@/constants";
import { aiService } from "@/services/geminiService";
import { createProject, updateInstagramConnection } from "@/services/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

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

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<string[]>(
    editingProject?.mediaUrl ? [editingProject.mediaUrl] : []
  );
  const [originalImage, setOriginalImage] = useState<string | null>(
    editingProject?.mediaUrl || null
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(
    editingProject?.mediaUrl || null
  );

  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>(
    editingProject?.caption ? [editingProject.caption] : []
  );
  const [selectedCaption, setSelectedCaption] = useState<string>(
    editingProject?.caption || ""
  );
  const [generatedHashtags, setGeneratedHashtags] = useState<string>(
    editingProject?.hashtags || ""
  );
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(
    editingProject?.voiceoverUrl || null
  );

  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16">("1:1");
  const [prompt, setPrompt] = useState(editingProject?.caption || "");
  const [style, setStyle] = useState("Fotorealistik");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const isBusy =
    isLoadingVisual || isGeneratingCopy || isGeneratingVoiceover || isSaving || isCropping;

  const canGenerateVisual = (mode === "idea" && prompt) || (mode === "photo" && uploadedFile);

  useEffect(() => {
    // Handles editing a saved project with media
    if (editingProject?.mediaUrl) {
      setGeneratedImages([editingProject.mediaUrl]);
      setOriginalImage(editingProject.mediaUrl);
      setSelectedImage(editingProject.mediaUrl);
      setSelectedCaption(editingProject.caption || "");
      setPrompt(editingProject.caption || ""); // Also set prompt for context
      setGeneratedHashtags(editingProject.hashtags || "");
      setVoiceoverUrl(editingProject.voiceoverUrl || null);
      setCurrentStep(2);
    } 
    // Handles pre-filling prompt from dashboard quick-start
    else if (editingProject?.caption) {
      setPrompt(editingProject.caption);
    }
  }, [editingProject]);


  async function urlToFile(url: string, filename: string, mimeType?: string): Promise<File> {
    const res = await fetch(url);
    const blob = await res.blob();
    const type = mimeType || blob.type || "image/png";
    return new File([blob], filename, { type });
  }

  // generate visual with guest limit
  const handleGenerateVisual = async () => {
    if (mode === "idea" && !prompt.trim()) {
      addToast("Masukkan ide atau deskripsi terlebih dahulu.", "info");
      return;
    }
    if (mode === "photo" && !uploadedFile) {
      addToast("Silakan upload foto produk terlebih dahulu.", "info");
      return;
    }

    // guest check
    if (!appUser) {
      if (guestGenerations >= maxGuestGenerations) {
        addToast("Batas percobaan gratis telah tercapai. Silakan login untuk melanjutkan.", "warning");
        return;
      }
    //   addToast(`Percobaan ke-${guestGenerations + 1} dari ${maxGuestGenerations}`, "info");
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
        setCurrentStep(2);
        addToast("Visual berhasil dibuat! Pilih yang terbaik.", "success");

        // notify parent about guest generation
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

  // outpaint / recompose helper (kept from original)
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

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 1;
        tempCanvas.height = 1;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(originalImage, 0, 0, 1, 1);
          const pixelData = tempCtx.getImageData(0, 0, 1, 1).data;
          const bgColor = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${
            pixelData[3] / 255
          })`;
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, newWidth, newHeight);
        }

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
      let outpaintType: "photographic" | "design" = "photographic";
      if (mode === "idea") {
        outpaintType = "design";
      }

      let finalImageUrl: string;

      if (outpaintType === "design") {
        const canvasImageUrl = await recomposeImageOnCanvas(originalImage, newAspectRatio);
        const enhancedResult = await aiService.enhanceCanvasBackground(canvasImageUrl);
        finalImageUrl = enhancedResult.imageUrl;
      } else {
        const result = await aiService.outpaintImage(originalImage, newAspectRatio, "photographic");
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
        // If editing update logic should be implemented (omitted here for brevity).
        // Save new project if no edit id
        if (!editingProject) {
          projectId = await createProject(appUser.uid, {
            file: imageFileToUpload,
            projectType: "image",
            caption: selectedCaption,
            hashtags: generatedHashtags,
          });
        } else {
          // Optionally implement updateProject here if you have it
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
      setCurrentStep(1);
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
      addToast("Editor telah direset.", "info");
    }
  };

  if (!appUser) {
    // still render full UI for guests (we don't return null)
  }

  return (
    <div className="flex flex-col max-h-screen">
      <Header user={appUser ?? undefined} onLogout={onLogout} onBack={() => onNavigate("dashboard")} onNavigate={onNavigate} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8 overflow-y-auto">
        {/* Left: Controls */}
        <div className="flex flex-col gap-8">
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingProject ? "Edit Proyek" : mode === "photo" ? "Buat Konten dari Foto" : "Buat Desain dari Ide"}
              </h2>
            </div>

            {mode === "idea" ? (
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
                <input disabled={isBusy} type="file" accept="image/*" onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])} />
                <p className="text-xs text-gray-900">AI akan membuat fotomu menjadi 1:1 dan siap di-crop.</p>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4">Visual akan dibuat dalam format 1:1 (persegi) terlebih dahulu, lalu bisa Anda potong (crop) sesuai kebutuhan.</p>

            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleGenerateVisual} disabled={isBusy || !canGenerateVisual} className="w-full md:w-auto">
                {isLoadingVisual ? <ButtonLoader /> : editingProject ? "Perbarui Visual" : "Buat Visual"}
              </Button>
              {selectedImage && (<Button onClick={handleReset} disabled={isBusy} variant="secondary" className="w-full md:w-auto"> Mulai Lagi </Button>)}
            </div>
          </div>

          {/* Step 2: Copy & Voiceover */}
          <div>
            <div className="space-y-4">
              <Button onClick={handleGenerateCopy} disabled={isBusy || !selectedImage} className="w-full md:w-auto">
                {isGeneratingCopy ? <ButtonLoader /> : 'Buat Caption & Hashtag Baru'}
              </Button>

              {isGeneratingCopy ? (
                <div className="py-8"><AIThinkingIndicator generatingWhat="copy" /></div>
              ) : (
                <div>
                  {selectedCaption && (
                    <div className="space-y-2 pt-4">
                      <label className="font-semibold text-gray-700">Edit Caption Terpilih:</label>
                      <textarea disabled={isBusy} className="w-full p-3 border rounded-md bg-white text-sm" rows={5} value={selectedCaption} onChange={(e) => setSelectedCaption(e.target.value)} />
                    </div>
                  )}

                  {generatedCaptions.length > 0 && (
                    <div className="space-y-2 pt-4">
                      <h4 className="font-semibold text-gray-700">Pilihan Caption (Klik untuk memilih):</h4>
                      {generatedCaptions.map((cap, i) => (
                        <div key={i} onClick={() => !isBusy && setSelectedCaption(cap)} className={`text-sm p-3 rounded-md transition-colors ${isBusy ? 'pointer-events-none opacity-50' : 'cursor-pointer'} ${selectedCaption === cap ? 'bg-[#5890AD] text-white' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'}`}>
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
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 pt-6 border-t border-gray-200 mt-auto">
            <Button onClick={handleNext} className="w-full" disabled={isSaving || !selectedImage || !selectedCaption}>
              {isSaving ? 'Menyimpan...' : editingProject ? 'Perbarui & Lanjutkan' : 'Lanjut: Jadwalkan Post'}
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

