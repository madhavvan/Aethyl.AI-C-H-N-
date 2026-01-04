import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { getNeuralUplink, VOICE_MODEL_NAME } from "../constants";
import { arrayBufferToBase64, base64ToUint8Array, decodeAudioData, float32ToInt16 } from "../utils/audioUtils";

interface LiveServiceConfig {
  onAudioData: (amplitude: number) => void;
  onClose: () => void;
}

export class LiveService {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private stream: MediaStream | null = null;
  private config: LiveServiceConfig;

  constructor(config: LiveServiceConfig) {
    this.config = config;
  }

  async connect() {
    try {
      const ai = getNeuralUplink();
      
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.sessionPromise = ai.live.connect({
        model: VOICE_MODEL_NAME,
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: this.handleClose.bind(this),
          onerror: (e) => console.error("Live API Error:", e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are HYPERION_OMNI's voice interface. Be concise, helpful, and conversational.",
        },
      });

    } catch (error) {
      console.error("Failed to connect to Live API", error);
      this.config.onClose();
    }
  }

  private handleOpen() {
    console.log("Live Session Opened");
    if (!this.inputAudioContext || !this.stream) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate amplitude for visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
      const avg = sum / inputData.length;
      this.config.onAudioData(avg);

      // Convert to PCM and send
      const pcmData = float32ToInt16(inputData);
      const base64Data = arrayBufferToBase64(pcmData.buffer);

      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
        });
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      const audioBytes = base64ToUint8Array(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext);
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      
      source.addEventListener('ended', () => {
        this.sources.delete(source);
      });

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }

    if (message.serverContent?.interrupted) {
      this.stopAllAudio();
      this.nextStartTime = 0;
    }
  }

  private stopAllAudio() {
    this.sources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.sources.clear();
  }

  private handleClose() {
    console.log("Live Session Closed");
    this.disconnect();
    this.config.onClose();
  }

  disconnect() {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close());
    }
    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    
    this.processor = null;
    this.inputSource = null;
    this.stream = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
  }
}