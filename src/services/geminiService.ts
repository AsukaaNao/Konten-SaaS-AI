import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { User, Scene } from "../types/index";

// --- Fungsi Bantuan (Helper Functions) ---

// Mengubah objek File menjadi string base64 untuk API
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

// Mengubah URL gambar yang diambil menjadi string base64 untuk API
const urlToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    return { base64, mimeType: blob.type };
};

// Membuat file WAV dari data audio PCM mentah
const createWavFile = (pcmData: Int16Array, sampleRate: number): string => {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const waveSize = 36 + dataSize;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, waveSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    
    const blob = new Blob([view], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

// Mendekode string Base64 menjadi Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Meng-encode Uint8Array menjadi string Base64 untuk blob audio
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Membuat blob audio senyap untuk memicu voiceover
const createSilentAudioBlob = (): { data: string; mimeType: string } => {
    const silentAudio = new Float32Array(1600);
    const l = silentAudio.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = silentAudio[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
};


class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // FIX: Gunakan NEXT_PUBLIC_ untuk variabel lingkungan sisi klien di Next.js
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  // --- Sisa fungsi Anda ---

  async generateImageFromIdea(prompt: string, style: string): Promise<{ imageUrl: string }> {
    const response = await this.ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
prompt: `
Create a professional, high-quality visual design for: "${prompt}".
Preferred style: ${style || "modern and eye-catching"}.
Target audience: Indonesia.

If the design type or description implies that text is required (e.g., posters, flyers, announcements, infographics, event promotions), include clean and legible text that enhances the message.

If the design type focuses on visuals (e.g., photography, artwork, background images, mood boards, product shots), avoid adding any text.

Ensure the final image looks polished, marketing-ready, and contextually appropriate for Indonesian audiences.
`,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
      },
    });

    const base64Image = response?.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Image) {
        throw new Error("API did not return a valid image.");
    }

    return { imageUrl: `data:image/png;base64,${base64Image}` };
  }

  async enhanceImage(file: File): Promise<{ imageUrl: string }> {
    const base64Data = await fileToBase64(file);
    
    const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: 'Enhance this product photo for a social media ad. Make the product stand out, improve the lighting, and give it a professional, clean background suitable for marketing. Do not add text or other objects.' }
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart || !imagePart.inlineData) {
        throw new Error("API did not return an enhanced image.");
    }
    
    const base64Image = imagePart.inlineData.data;
    return { imageUrl: `data:image/png;base64,${base64Image}` };
  }

  async cropImage(imageUrl: string, aspectRatio: string): Promise<{ imageUrl: string }> {
    const { base64, mimeType } = await urlToBase64(imageUrl);
    
    const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType: mimeType } },
                { text: `Crop this image to a ${aspectRatio} aspect ratio. The primary subject should be centered as much as possible. Do not add, remove, or change any other elements in the image.` }
            ],
        },
        config: {
            // Only expect an image in return for this task
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart || !imagePart.inlineData) {
        throw new Error("API did not return a cropped image.");
    }
    
    const base64Image = imagePart.inlineData.data;
    // Return a full data URL, preserving the original mime type
    return { imageUrl: `data:${mimeType};base64,${base64Image}` };
  }

  async generateCopyAndHashtags(imageUrl: string): Promise<{ captions: string[], hashtags: string }> {
    const { base64, mimeType } = await urlToBase64(imageUrl);
    
    const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType: mimeType } },
                { text: "Based on this image, generate marketing copy. The target audience is in Indonesia." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    captions: {
                        type: Type.ARRAY,
                        description: '3 distinct, engaging marketing captions in Bahasa Indonesia. Each caption must be unique.',
                        items: { type: Type.STRING },
                    },
                    hashtags: {
                        type: Type.STRING,
                        description: 'A single string of relevant hashtags in Bahasa Indonesia, separated by spaces (e.g., #produkkuliner #diskonjakarta #makananviral).',
                    },
                },
                required: ["captions", "hashtags"],
            },
        },
    });

    const text = response?.text;
    if (!text) {
        throw new Error("API did not return valid JSON text for copy.");
    }
    return JSON.parse(text);
  }
  
  generateVoiceover(caption: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const audioChunks: Uint8Array[] = [];
        
        try {
            const sessionPromise = this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Live session opened for voiceover.');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        // FIX: Safely access potentially undefined properties
                        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            audioChunks.push(decode(audioData));
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        reject(new Error('Live connection failed.'));
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Live session closed for voiceover.');
                        if (audioChunks.length === 0) {
                            reject(new Error("No audio data received."));
                            return;
                        }
                        
                        const totalLength = audioChunks.reduce((acc, val) => acc + val.length, 0);
                        const combined = new Uint8Array(totalLength);
                        let offset = 0;
                        for(const chunk of audioChunks) {
                            combined.set(chunk, offset);
                            offset += chunk.length;
                        }
                        
                        const pcmData = new Int16Array(combined.buffer);
                        const wavUrl = createWavFile(pcmData, 24000); // Gemini Live outputs at 24kHz
                        resolve(wavUrl);
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: `You are a voiceover AI. Your task is to read the following text aloud with a clear and friendly voice. After you have finished reading the entire text, you must immediately end the session. Do not say anything else or wait for a response. The text is: "${caption}"`,
                },
            });

            sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: createSilentAudioBlob() });
            });

        } catch (error) {
            reject(error);
        }
    });
  }

  async generateStoryboard(prompt: string, goal: string): Promise<Scene[]> {
    const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an expert video scriptwriter for social media ads. Create a scene-by-scene storyboard for a short video ad (around 15-20 seconds). Product/Service: "${prompt}". Video Goal: "${goal}". The output must be a JSON array of scenes. Each scene needs a short duration (2-4 seconds).`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        scene: { type: Type.INTEGER, description: "Scene number, starting from 1." },
                        visual: { type: Type.STRING, description: "A concise description of the visual action for the scene." },
                        text: { type: Type.STRING, description: "On-screen text for the scene. Keep it very short." },
                        duration: { type: Type.INTEGER, description: "Duration of the scene in seconds (e.g., 3)." },
                    }
                }
            }
        }
    });
    const text = response?.text;
    if (!text) {
        throw new Error("API did not return valid JSON text for copy.");
    }
    return JSON.parse(text);
  }
  
  async generateVideoFromStoryboard(
      storyboard: Scene[],
      media: File[],
      onStatusUpdate: (status: string) => void
  ): Promise<string> {
      onStatusUpdate("Constructing video prompt...");
      
      const storyboardPrompt = storyboard.map(s => 
          `Scene ${s.scene} (${s.duration}s): ${s.visual}. On-screen text: "${s.text}".`
      ).join('\n');
      
      const fullPrompt = `Create a dynamic, professional short-form video ad based on this storyboard:\n${storyboardPrompt}\n The style should be modern, clean, and eye-catching for social media. Use quick cuts and smooth transitions.`;
      
      let inputImage: { imageBytes: string, mimeType: string } | undefined = undefined;
      const imageFile = media.find(f => f.type.startsWith('image/'));
      if (imageFile) {
          onStatusUpdate("Preparing reference image...");
          const base64Image = await fileToBase64(imageFile);
          inputImage = { imageBytes: base64Image, mimeType: imageFile.type };
      }
      
      onStatusUpdate("Sending request to AI video generator... (this may take several minutes)");
      let operation = await this.ai.models.generateVideos({
          model: 'veo-2.0-generate-001',
          prompt: fullPrompt,
          image: inputImage,
          config: {
              numberOfVideos: 1,
          }
      });
      
      let pollCount = 0;
      while (!operation.done) {
          pollCount++;
          onStatusUpdate(`Assembling video... Please wait. [Check ${pollCount}]`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await this.ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
          throw new Error("Video generation failed to return a valid URL.");
      }
      
      onStatusUpdate("Fetching generated video...");
      
      const response = await fetch(downloadLink);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to download video file. Status: ${response.status}. Body: ${errorBody}`);
      }
      if (!response.body) {
        throw new Error("Could not retrieve video data from the download link (empty body).");
      }
      
      const videoBlob = await response.blob();
      return URL.createObjectURL(videoBlob);
  }

  async generateVideoFromImages(
    images: File[],
    style: 'Zoom & Pan Lembut (Ken Burns)' | 'Slide Cepat & Enerjik' | 'Transisi Halus (Fade)',
    headline: string,
    music: string,
    onStatusUpdate: (status: string) => void
): Promise<string> {
    onStatusUpdate("Preparing images and prompt...");
    if (images.length === 0) {
        throw new Error("At least one image is required.");
    }

    const firstImage = images[0];
    const base64Image = await fileToBase64(firstImage);
    const inputImage = { imageBytes: base64Image, mimeType: firstImage.type };

    const styleDescription = {
        'Zoom & Pan Lembut (Ken Burns)': 'Apply a gentle, cinematic zoom and pan effect (Ken Burns style) to each image.',
        'Slide Cepat & Enerjik': 'Use energetic, fast-paced slide transitions between images.',
        'Transisi Halus (Fade)': 'Use elegant, smooth cross-fade transitions between images.'
    }[style];

    const imageDescriptions = images.length > 1 
        ? `The video must feature a sequence of all the provided images, shown one after another in order.` 
        : 'The video should focus on the single provided image.';

    const fullPrompt = `Create a professional 15-second video advertisement for social media.
    - Headline Text: "${headline}" should be overlaid stylishly on the video.
    - Visuals: This is an image-to-video task. ${imageDescriptions} The primary reference image is provided. The video should transition through the static images, bringing them to life.
    - Animation Style: ${styleDescription}
    - Music Mood: The background music should be ${music} and instrumental.
    - Overall Feel: The ad must be clean, modern, and highly engaging.`;
    
    onStatusUpdate("Sending request to AI video generator... (this may take several minutes)");
    
    let operation = await this.ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: fullPrompt,
        image: inputImage,
        config: {
            numberOfVideos: 1,
        }
    });
    
    let pollCount = 0;
    while (!operation.done) {
        pollCount++;
        onStatusUpdate(`Assembling video... Please wait. [Check ${pollCount}]`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await this.ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed to return a valid URL.");
    }
    
    onStatusUpdate("Fetching generated video...");
    
    const response = await fetch(downloadLink);

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to download video file. Status: ${response.status}. Body: ${errorBody}`);
    }
    if (!response.body) {
        throw new Error("Could not retrieve video data from the download link (empty body).");
    }
    
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  }
}

export const aiService = new GeminiService();

