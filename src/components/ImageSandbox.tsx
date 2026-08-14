import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileImage, 
  Upload, 
  Settings, 
  Cpu, 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Compass, 
  Layers, 
  Sparkles,
  Zap,
  CheckCircle,
  HelpCircle,
  Table,
  X,
  Sliders,
  Play,
  Trash2,
  AlertCircle,
  TrendingDown,
  Grid,
  SlidersHorizontal,
  Download,
  ZoomIn,
  ZoomOut,
  Camera,
  History,
  Contrast,
  Pin
} from 'lucide-react';
import { IMAGE_PRESETS, BYPASS_METHODS } from '../data';
import { GlossaryTerm } from './GlossaryTerm';
import { BypassMethodId, DetectionResult } from '../types';
import { 
  injectSynthIDWatermark, 
  extractWatermarkPattern, 
  applyNotchFilter, 
  applyLatentJitter, 
  applyVaeQuantization, 
  applyNeuralDenoise, 
  scanSynthIDWatermark,
  applyJPEGCompressionSimulation,
  applyMedianFilter,
  applyGaussianBlurSimulation,
  applyCropAndScaleSimulation,
  applySaltAndPepperNoiseSimulation,
  applyGammaCorrection,
  applyBrightnessShift,
  applyShearRotation
} from '../utils/imageFilters';

export default function ImageSandbox() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(IMAGE_PRESETS[0].id);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isWatermarked, setIsWatermarked] = useState<boolean>(true);
  const [watermarkStrength, setWatermarkStrength] = useState<number>(3.5);
  const [activeBypass, setActiveBypass] = useState<BypassMethodId>('none');
  const [bypassIntensity, setBypassIntensity] = useState<number>(15);
  const [viewMode, setViewMode] = useState<'sideBySide' | 'pattern' | 'fft'>('sideBySide');

  // Comparison slider states
  const [comparisonType, setComparisonType] = useState<'grid' | 'slider'>('slider');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [detection, setDetection] = useState<DetectionResult>({
    confidence: 100,
    status: 'Strongly Detected',
    scannedPixels: 65536
  });
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // States for interactive FFT peak hover tooltips
  const [fftPeak, setFftPeak] = useState<{
    x: number;
    y: number;
    relX: number;
    relY: number;
    radius: number;
    intensity: number;
  } | null>(null);
  const [fftMousePos, setFftMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringPeak, setIsHoveringPeak] = useState<boolean>(false);
  const [referencePeak, setReferencePeak] = useState<{
    x: number;
    y: number;
    relX: number;
    relY: number;
    radius: number;
    intensity: number;
  } | null>(null);
  const fftPeakRef = useRef<{
    x: number;
    y: number;
    relX: number;
    relY: number;
    radius: number;
    intensity: number;
  } | null>(null);

  // Frequency spectrum High-Contrast mode state
  const [fftHighContrast, setFftHighContrast] = useState<boolean>(false);
  const [fftZoom, setFftZoom] = useState<number>(1.0);
  const [fftOverlayOpacity, setFftOverlayOpacity] = useState<number>(0.6);
  const [activeLegendHighlight, setActiveLegendHighlight] = useState<'peak' | 'zone' | 'drift' | null>(null);
  const [showFftLegend, setShowFftLegend] = useState<boolean>(true);
  const [peakPersistence, setPeakPersistence] = useState<boolean>(false);
  const [fftRotation, setFftRotation] = useState<number>(0);
  const [fftHighPass, setFftHighPass] = useState<boolean>(false);
  const [fftIntensityMap, setFftIntensityMap] = useState<'off' | 'viridis' | 'inferno' | 'magma' | 'plasma'>('off');
  const [cropPercent, setCropPercent] = useState<number>(0);
  const [jpegQuality, setJpegQuality] = useState<number>(100);
  const [medianSize, setMedianSize] = useState<number>(1);
  const [blurRadius, setBlurRadius] = useState<number>(0);
  const [brightnessOffset, setBrightnessOffset] = useState<number>(0);
  const [saltPepperFrac, setSaltPepperFrac] = useState<number>(0);
  const [gammaVal, setGammaVal] = useState<number>(1.0);
  const [shearAngle, setShearAngle] = useState<number>(0);

  // Quality improvement + visualization features
  const [gridOverlayLog, setGridOverlayLog] = useState<boolean>(false);
  const [helpOverlayActive, setHelpOverlayActive] = useState<boolean>(false);
  const [watermarkChannel, setWatermarkChannel] = useState<'all' | 'blue-green' | 'blue-only'>('all');
  const peakTrailRef = useRef<{
    x: number;
    y: number;
    alpha: number;
    relX: number;
    relY: number;
    radius: number;
  }[]>([]);

  const unzoomedPeakRef = useRef<{ x: number; y: number }>({ x: 80, y: 80 });
  const lastAnimatedPeakRef = useRef<{ x: number; y: number } | null>(null);
  const peakEmergenceStartTimeRef = useRef<number>(0);

  // Smooth parameter morph state tracking
  const activeBypassRef = useRef<BypassMethodId>('none');
  const prevBypassIdRef = useRef<BypassMethodId>('none');
  const morphProgressRef = useRef<number>(1.0);
  const lerpedIntensityRef = useRef<number | undefined>(undefined);
  const lerpedStrengthRef = useRef<number | undefined>(undefined);

  // Periodic sampling of peak frequency coordinates for academic drift tracking (10-second window, 500ms sample interval)
  const [driftHistory, setDriftHistory] = useState<{ timestamp: string; radius: number; fX: number; fY: number }[]>([]);

  // States for interactive Batch Bypass Summary panel/overlay
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<{
    id: string;
    name: string;
    thumbnail: string;
    beforeConfidence: number;
    afterConfidence: number;
    status: string;
    isProcessing: boolean;
  }[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Load default batch images
  const initializeDefaultBatch = () => {
    const list = IMAGE_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      thumbnail: p.url,
      beforeConfidence: 100,
      afterConfidence: 100,
      status: 'Awaiting Run',
      isProcessing: false
    }));
    setBatchItems(list);
  };

  useEffect(() => {
    initializeDefaultBatch();
  }, []);

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    const newItems: typeof batchItems = [];

    let loadedCount = 0;
    fileList.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        newItems.push({
          id: Math.random().toString(),
          name: file.name,
          thumbnail: reader.result as string,
          beforeConfidence: 100,
          afterConfidence: 100,
          status: 'Ready to Run',
          isProcessing: false
        });

        loadedCount++;
        if (loadedCount === fileList.length) {
          // Keep custom uploads
          setBatchItems(prev => [
            ...prev.filter(x => !IMAGE_PRESETS.some(p => p.id === x.id)),
            ...newItems
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const runBatchAnalysis = async () => {
    if (isBatchRunning) return;
    setIsBatchRunning(true);

    const updatedItems = batchItems.map(item => ({
      ...item,
      isProcessing: true,
      status: 'Analyzing...'
    }));
    setBatchItems(updatedItems);

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      
      const result: { beforeConfidence: number; afterConfidence: number; status: string } = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.src = item.thumbnail;
        
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 256;
          tempCanvas.height = 256;
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) {
            resolve({ beforeConfidence: 100, afterConfidence: 100, status: 'Error' });
            return;
          }
          
          tempCtx.drawImage(img, 0, 0, 256, 256);
          const originalData = tempCtx.getImageData(0, 0, 256, 256);
          
          // Inject watermark
          const watermarkedData = tempCtx.createImageData(256, 256);
          injectSynthIDWatermark(originalData, watermarkedData, watermarkStrength);
          
          // Scan before bypass
          const beforeScore = scanSynthIDWatermark(watermarkedData, true);
          
          // Apply active bypass
          const bypassedData = tempCtx.createImageData(256, 256);
          bypassedData.data.set(watermarkedData.data);
          
          if (activeBypass === 'notch_filter') {
            const bandCenter = 40;
            const widthModifier = Math.max(2, Math.round(bypassIntensity * 0.4));
            applyNotchFilter(watermarkedData, bypassedData, bandCenter, widthModifier);
          } else if (activeBypass === 'latent_jitter') {
            applyLatentJitter(watermarkedData, bypassedData, bypassIntensity);
          } else if (activeBypass === 'vae_quantize') {
            const factor = Math.max(2, Math.round(bypassIntensity / 5.5));
            applyVaeQuantization(watermarkedData, bypassedData, factor, 24 - Math.max(4, Math.round(bypassIntensity * 0.3)));
          } else if (activeBypass === 'clean' || activeBypass === 'neural_denoise') {
            const rSigma = Math.max(5.0, bypassIntensity * 1.5);
            applyNeuralDenoise(watermarkedData, bypassedData, 2.0, rSigma);
          }
          
          // Scan post bypass
          const afterScore = scanSynthIDWatermark(bypassedData, true);
          
          let scoreStatus = 'Strongly Detected';
          if (afterScore <= 20) {
            scoreStatus = 'Bypassed / Undetectable';
          } else if (afterScore < 60) {
            scoreStatus = 'Weak / Suspect';
          }
          
          resolve({
            beforeConfidence: beforeScore,
            afterConfidence: afterScore,
            status: scoreStatus
          });
        };

        img.onerror = () => {
          // Robust fallback mock calculation matching selected intensity metrics in case unsplash/cors fails
          const beforeScore = 100;
          let afterScore = 100;
          if (activeBypass === 'notch_filter') {
            afterScore = Math.round(5 + (40 - bypassIntensity) * 0.8);
          } else if (activeBypass === 'latent_jitter') {
            afterScore = Math.round(3 + (35 - bypassIntensity) * 0.4);
          } else if (activeBypass === 'vae_quantize') {
            afterScore = Math.round(15 + (45 - bypassIntensity) * 1.1);
          } else if (activeBypass === 'neural_denoise') {
            afterScore = Math.round(10 + (40 - bypassIntensity) * 0.9);
          }
          afterScore = Math.min(beforeScore, Math.max(0, afterScore));
          
          let scoreStatus = 'Strongly Detected';
          if (afterScore <= 20) {
            scoreStatus = 'Bypassed / Undetectable';
          } else if (afterScore < 60) {
            scoreStatus = 'Weak / Suspect';
          }
          
          resolve({
            beforeConfidence: beforeScore,
            afterConfidence: afterScore,
            status: scoreStatus
          });
        };
      });

      setBatchItems(prev => prev.map((it, idx) => idx === i ? {
        ...it,
        beforeConfidence: result.beforeConfidence,
        afterConfidence: result.afterConfidence,
        status: result.status,
        isProcessing: false
      } : it));
    }

    setIsBatchRunning(false);
  };

  // Canvas References
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement>(null);
  const fftHistogramRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image whenever preset or custom upload changes
  useEffect(() => {
    let active = true;
    const canvas = sourceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    
    // Choose selected URL
    const preset = IMAGE_PRESETS.find(p => p.id === selectedPresetId);
    const srcUrl = customImage || preset?.url || IMAGE_PRESETS[0].url;

    img.src = srcUrl;
    img.onload = () => {
      if (!active) return;
      
      // Standardize canvas size to 256x256 for optimal real-time pixel processing without bottlenecking
      canvas.width = 256;
      canvas.height = 256;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Let's run processing
      runProcessingPipeline();
    };

    return () => {
      active = false;
    };
  }, [selectedPresetId, customImage]);

  // Re-run the processing pipeline whenever settings, filters, active comparison, or active views adjust
  useEffect(() => {
    runProcessingPipeline();
  }, [isWatermarked, watermarkStrength, activeBypass, bypassIntensity, viewMode, comparisonType, fftHighContrast, fftZoom, peakPersistence, fftOverlayOpacity, activeLegendHighlight, fftRotation, fftHighPass, fftIntensityMap, cropPercent, jpegQuality, medianSize, blurRadius, brightnessOffset, saltPepperFrac, gammaVal, shearAngle, watermarkChannel, referencePeak]);

  // Real-time animation loop for drawing/pulsing FFT peak crosshairs or concentric signature rings
  useEffect(() => {
    if (viewMode !== 'fft') return;

    let animId: number;
    const loop = () => {
      // Initialize lerp refs if they are undefined
      if (lerpedIntensityRef.current === undefined) {
        lerpedIntensityRef.current = bypassIntensity;
      }
      if (lerpedStrengthRef.current === undefined) {
        lerpedStrengthRef.current = watermarkStrength;
      }
      
      // Smoothly interpolate parameters
      lerpedIntensityRef.current += (bypassIntensity - lerpedIntensityRef.current) * 0.12;
      lerpedStrengthRef.current += (watermarkStrength - lerpedStrengthRef.current) * 0.12;

      // Update morph status if active bypass ID changes
      if (activeBypassRef.current !== activeBypass) {
        prevBypassIdRef.current = activeBypassRef.current;
        activeBypassRef.current = activeBypass;
        morphProgressRef.current = 0.0;
      }

      if (morphProgressRef.current < 1.0) {
        morphProgressRef.current = Math.min(1.0, morphProgressRef.current + 0.04);
      }

      const fCanvas = fftCanvasRef.current;
      if (fCanvas) {
        const fftCtx = fCanvas.getContext('2d');
        if (fftCtx) {
          const peak = drawSimulatedFFTSpectrum(
            fftCtx,
            isWatermarked,
            lerpedStrengthRef.current,
            activeBypass,
            lerpedIntensityRef.current,
            fftZoom,
            fftRotation,
            fftHighPass
          );
          fftPeakRef.current = peak;
        }
      }

      // Render actual Radially Averaged Power Spectrum histogram canvas beside it
      const fHistCanvas = fftHistogramRef.current;
      if (fHistCanvas) {
        const currentLerpedStrength = lerpedStrengthRef.current !== undefined ? lerpedStrengthRef.current : watermarkStrength;
        const currentLerpedIntensity = lerpedIntensityRef.current !== undefined ? lerpedIntensityRef.current : bypassIntensity;
        drawFFTHistogram(fHistCanvas, isWatermarked, currentLerpedStrength, activeBypass, currentLerpedIntensity);
      }

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [viewMode, isWatermarked, watermarkStrength, activeBypass, bypassIntensity, fftHighContrast, fftZoom, peakPersistence, fftOverlayOpacity, activeLegendHighlight, fftRotation, fftHighPass, fftIntensityMap, cropPercent, jpegQuality, medianSize, blurRadius, brightnessOffset, saltPepperFrac, gammaVal, shearAngle, watermarkChannel, referencePeak]);

  // Periodic sampling of peak frequency coordinates for academic drift tracking (10-second window, 500ms sample interval)
  useEffect(() => {
    if (viewMode !== 'fft') {
      setDriftHistory([]);
      return;
    }

    const timer = setInterval(() => {
      const currentPeak = fftPeakRef.current;
      const date = new Date();
      const formattedTime = `${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(Math.floor(date.getMilliseconds() / 100))}`;

      setDriftHistory(prev => {
        const next = [
          ...prev,
          {
            timestamp: formattedTime,
            radius: currentPeak ? Math.round(currentPeak.radius / fftZoom) : 0,
            fX: currentPeak ? Math.round(currentPeak.relX / fftZoom) : 0,
            fY: currentPeak ? Math.round(currentPeak.relY / fftZoom) : 0,
          }
        ];
        if (next.length > 20) {
          next.shift();
        }
        return next;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [viewMode, fftZoom]);

  const updateSliderVal = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pct);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingSlider(true);
    updateSliderVal(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSlider) return;
    updateSliderVal(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingSlider(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const runProcessingPipeline = () => {
    const srcCanvas = sourceCanvasRef.current;
    if (!srcCanvas) return;

    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) return;

    setIsProcessing(true);

    const width = srcCanvas.width;
    const height = srcCanvas.height;

    const originalData = srcCtx.getImageData(0, 0, width, height);
    
    // Step 1: Create a watermarked ImageData working copy
    const watermarkedData = srcCtx.createImageData(width, height);
    if (isWatermarked) {
      injectSynthIDWatermark(originalData, watermarkedData, watermarkStrength);
      if (watermarkChannel === 'blue-only' || watermarkChannel === 'blue-green') {
        const dest = watermarkedData.data;
        const orig = originalData.data;
        const len = dest.length;
        for (let i = 0; i < len; i += 4) {
          if (watermarkChannel === 'blue-only') {
            dest[i] = orig[i];     // Clear Red watermark
            dest[i + 1] = orig[i + 1]; // Clear Green watermark
          } else if (watermarkChannel === 'blue-green') {
            dest[i] = orig[i];     // Clear Red watermark
          }
        }
      }
    } else {
      // Just copy original pixels
      watermarkedData.data.set(originalData.data);
    }

    // Step 2: Apply chosen bypass perturbation on the watermarked image
    const finalProcessedData = srcCtx.createImageData(width, height);
    finalProcessedData.data.set(watermarkedData.data);

    if (isWatermarked) {
      if (activeBypass === 'notch_filter') {
        const bandCenter = 40;
        const widthModifier = Math.max(2, Math.round(bypassIntensity * 0.4));
        applyNotchFilter(watermarkedData, finalProcessedData, bandCenter, widthModifier);
      } else if (activeBypass === 'latent_jitter') {
        applyLatentJitter(watermarkedData, finalProcessedData, bypassIntensity);
      } else if (activeBypass === 'vae_quantize') {
        const factor = Math.max(2, Math.round(bypassIntensity / 5.5)); // scales 2x to 9x
        applyVaeQuantization(watermarkedData, finalProcessedData, factor, 24 - Math.max(4, Math.round(bypassIntensity * 0.3)));
      } else if (activeBypass === 'clean' || activeBypass === 'neural_denoise') {
        const rSigma = Math.max(5.0, bypassIntensity * 1.5);
        applyNeuralDenoise(watermarkedData, finalProcessedData, 2.0, rSigma);
      }
    }

    // Direct Adversarial Distortions Cascade (Features 1-8 Stack)
    const distortionTempData = srcCtx.createImageData(width, height);
    distortionTempData.data.set(finalProcessedData.data);

    if (cropPercent > 0) {
      const croppedTemp = srcCtx.createImageData(width, height);
      applyCropAndScaleSimulation(distortionTempData, croppedTemp, cropPercent);
      distortionTempData.data.set(croppedTemp.data);
    }
    if (jpegQuality < 100) {
      const jpegTemp = srcCtx.createImageData(width, height);
      applyJPEGCompressionSimulation(distortionTempData, jpegTemp, jpegQuality);
      distortionTempData.data.set(jpegTemp.data);
    }
    if (medianSize > 1) {
      const medianTemp = srcCtx.createImageData(width, height);
      applyMedianFilter(distortionTempData, medianTemp, medianSize);
      distortionTempData.data.set(medianTemp.data);
    }
    if (blurRadius > 0) {
      const blurTemp = srcCtx.createImageData(width, height);
      applyGaussianBlurSimulation(distortionTempData, blurTemp, blurRadius);
      distortionTempData.data.set(blurTemp.data);
    }
    if (brightnessOffset !== 0) {
      const brightnessTemp = srcCtx.createImageData(width, height);
      applyBrightnessShift(distortionTempData, brightnessTemp, brightnessOffset);
      distortionTempData.data.set(brightnessTemp.data);
    }
    if (saltPepperFrac > 0) {
      const saltTemp = srcCtx.createImageData(width, height);
      applySaltAndPepperNoiseSimulation(distortionTempData, saltTemp, saltPepperFrac);
      distortionTempData.data.set(saltTemp.data);
    }
    if (Math.abs(gammaVal - 1.0) > 0.01) {
      const gammaTemp = srcCtx.createImageData(width, height);
      applyGammaCorrection(distortionTempData, gammaTemp, gammaVal);
      distortionTempData.data.set(gammaTemp.data);
    }
    if (shearAngle !== 0) {
      const shearTemp = srcCtx.createImageData(width, height);
      applyShearRotation(distortionTempData, shearTemp, shearAngle);
      distortionTempData.data.set(shearTemp.data);
    }

    finalProcessedData.data.set(distortionTempData.data);

    // Write top processed canvas
    const procCanvas = processedCanvasRef.current;
    if (procCanvas) {
      const procCtx = procCanvas.getContext('2d');
      if (procCtx) {
        procCanvas.width = width;
        procCanvas.height = height;
        procCtx.putImageData(finalProcessedData, 0, 0);
      }
    }

    // Draw stego extract pattern if container is mounted
    const patCanvas = patternCanvasRef.current;
    if (patCanvas) {
      const patCtx = patCanvas.getContext('2d');
      if (patCtx) {
        patCanvas.width = width;
        patCanvas.height = height;
        const subData = patCtx.createImageData(width, height);
        extractWatermarkPattern(originalData, finalProcessedData, subData, 30);
        patCtx.putImageData(subData, 0, 0);
      }
    }

    // Draw spectrum simulation if container is mounted
    const fCanvas = fftCanvasRef.current;
    if (fCanvas) {
      const fftCtx = fCanvas.getContext('2d');
      if (fftCtx) {
        fCanvas.width = 160;
        fCanvas.height = 160;
        const peak = drawSimulatedFFTSpectrum(
          fftCtx,
          isWatermarked,
          watermarkStrength,
          activeBypass,
          bypassIntensity,
          fftZoom,
          fftRotation,
          fftHighPass
        );
        setFftPeak(peak);
        fftPeakRef.current = peak;
      }
    }

    // Step 5: Scan output to compute the detection score with stacked distortion attenuations
    let rawScore = scanSynthIDWatermark(finalProcessedData, isWatermarked);
    if (isWatermarked) {
      rawScore *= (1 - cropPercent / 120);
      if (jpegQuality < 100) {
        rawScore *= (jpegQuality / 100);
      }
      if (medianSize === 2 || medianSize === 3) rawScore *= 0.45;
      else if (medianSize === 5) rawScore *= 0.15;
      if (blurRadius > 0) {
        rawScore *= Math.exp(-blurRadius * 0.42);
      }
      if (brightnessOffset !== 0) {
        rawScore *= (1 - Math.min(0.5, Math.abs(brightnessOffset) / 100));
      }
      if (saltPepperFrac > 0) {
        rawScore *= (1 - Math.min(0.8, saltPepperFrac * 0.15));
      }
      if (Math.abs(gammaVal - 1.0) > 0.05) {
        rawScore *= (1 - Math.min(0.6, Math.abs(gammaVal - 1.0) * 0.4));
      }
      if (shearAngle !== 0) {
        rawScore *= Math.max(0.05, 1 - Math.abs(shearAngle) / 15);
      }
      if (watermarkChannel === 'blue-only') {
        rawScore *= 0.65;
      } else if (watermarkChannel === 'blue-green') {
        rawScore *= 0.85;
      }
    }
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    
    let statusText: 'Strongly Detected' | 'Weak / Suspect' | 'Bypassed / Undetectable' = 'Strongly Detected';
    if (score <= 20) {
      statusText = 'Bypassed / Undetectable';
    } else if (score < 60) {
      statusText = 'Weak / Suspect';
    }

    setDetection({
      confidence: score,
      status: statusText,
      scannedPixels: width * height
    });

    setIsProcessing(false);
  };

  const handleFftMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const peak = fftPeakRef.current;
    if (!peak || !fftCanvasRef.current) return;
    const rect = fftCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check distance between mouse position (x, y) and peak position (peak.x, peak.y)
    const dx = x - peak.x;
    const dy = y - peak.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 12) {
      setIsHoveringPeak(true);
      setFftPeak(peak);
      setFftMousePos({ x, y });
    } else {
      setIsHoveringPeak(false);
      setFftMousePos(null);
    }
  };

  const handleFftMouseLeave = () => {
    setIsHoveringPeak(false);
    setFftMousePos(null);
  };

  const captureFftSnapshot = () => {
    const fCanvas = fftCanvasRef.current;
    if (!fCanvas) return;
    try {
      const dataUrl = fCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `fft_spectral_snapshot_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to capture FFT canvas snapshot:", err);
    }
  };

  const exportFftPeakData = (format: 'json' | 'csv') => {
    const peak = fftPeak || fftPeakRef.current;
    if (!peak) return;

    const exportObj = {
      timestamp: new Date().toISOString(),
      watermarked: isWatermarked,
      watermarkStrength,
      activeBypass,
      bypassIntensity,
      peakCoordinates: {
        x: peak.x,
        y: peak.y,
        fX: peak.relX,
        fY: peak.relY
      },
      radiusR: peak.radius,
      amplitude: Math.round(peak.intensity),
      status: Math.abs(peak.radius - 42) <= 1.5 && isWatermarked && activeBypass === 'none'
        ? 'Synthetic Carrier Match'
        : 'Peak Noise',
      zoomFactor: fftZoom
    };

    let fileContent = '';
    let fileName = `fft_spectral_peak_${Date.now()}`;
    let mimeType = '';

    if (format === 'json') {
      fileContent = JSON.stringify(exportObj, null, 2);
      fileName += '.json';
      mimeType = 'application/json';
    } else {
      // CSV format
      const headers = ['Timestamp', 'Watermarked', 'Strength', 'BypassMode', 'BypassIntensity', 'PeakX', 'PeakY', 'FreqFx', 'FreqFy', 'RadiusR', 'AmplitudePct', 'Status', 'Zoom'];
      const row = [
        exportObj.timestamp,
        exportObj.watermarked,
        exportObj.watermarkStrength,
        exportObj.activeBypass,
        exportObj.bypassIntensity,
        exportObj.peakCoordinates.x,
        exportObj.peakCoordinates.y,
        exportObj.peakCoordinates.fX,
        exportObj.peakCoordinates.fY,
        exportObj.radiusR,
        exportObj.amplitude,
        `"${exportObj.status}"`,
        exportObj.zoomFactor
      ];
      fileContent = [headers.join(','), row.join(',')].join('\n');
      fileName += '.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportBatchDriftDataJSON = () => {
    const peak = fftPeak || fftPeakRef.current;
    
    const exportObj = {
      timestamp: new Date().toISOString(),
      watermarked: isWatermarked,
      watermarkStrength,
      activeBypass,
      bypassIntensity,
      zoomFactor: fftZoom,
      currentPeak: peak ? {
        x: peak.x,
        y: peak.y,
        fX: peak.relX,
        fY: peak.relY,
        radiusR: peak.radius,
        amplitude: Math.round(peak.intensity)
      } : null,
      historyDrift: driftHistory
    };

    const fileContent = JSON.stringify(exportObj, null, 2);
    const fileName = `academic_spectral_drift_batch_${Date.now()}.json`;
    const mimeType = 'application/json';

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Draw a beautiful, academically-robust Radially Averaged Power Spectrum (RAPS)
   * frequency domain histogram alongside the FFT magnitude spectrum.
   */
  const drawFFTHistogram = (
    canvas: HTMLCanvasElement,
    watermarked: boolean,
    strength: number,
    bypassId: BypassMethodId,
    intensity: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw/clear canvas
    const w = canvas.width = 160;
    const h = canvas.height = 96;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Coordinate mapping bounds
    const paddingLeft = 14;
    const paddingRight = 4;
    const paddingTop = 6;
    const paddingBottom = 12;
    
    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    
    // Horizontal grids
    for (let i = 1; i <= 3; i++) {
      const y = paddingTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();
    }
    // Vertical grids
    for (let i = 1; i <= 4; i++) {
      const x = paddingLeft + (chartW / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, h - paddingBottom);
      ctx.stroke();
    }

    // Accumulate curves
    // Max R = 80.
    const steps = 60;
    const originalPoints: { r: number; power: number }[] = [];
    const perturbedPoints: { r: number; power: number }[] = [];

    // Breathing factor for some live micro-jitter
    const liveWave = 1.0 + 0.02 * Math.sin(Date.now() / 250);

    for (let i = 0; i <= steps; i++) {
      const r = (i / steps) * 75; // R from 0 to 75px
      
      // 1. Natural power spectrum exponential decay: high intensity at low R
      let basePower = 70 * Math.exp(-r / 12) + 12 * Math.exp(-r / 35);
      basePower += (Math.sin(r * 0.4) + Math.cos(r * 0.7)) * 0.6; // high-frequency micro-undulations

      // 2. Watermark spike at R = 42px
      let watermarkSpike = 0;
      if (watermarked) {
        const distToCarrier = Math.abs(r - 42);
        // Gaussian peak for watermark ring carrier
        watermarkSpike = strength * 4.5 * Math.exp(-(distToCarrier * distToCarrier) / 12);
      }

      const origPower = (basePower + watermarkSpike) * liveWave;
      originalPoints.push({ r, power: origPower });

      // 3. For perturbed: apply modifications based on activeBypass and intensity
      let pertPower = basePower;
      let pertSpike = watermarkSpike;

      // Obtain current transition progress
      const progress = morphProgressRef.current;
      const prevBypass = prevBypassIdRef.current;

      const getSpikeForBypass = (bId: BypassMethodId, bIntensity: number) => {
        if (bId === 'notch_filter') {
          const notchWidth = Math.max(4, bIntensity * 0.35);
          const distToCarrier = Math.abs(r - 42);
          const notchFactor = Math.max(0, Math.min(1, Math.pow(distToCarrier / notchWidth, 2)));
          return watermarkSpike * notchFactor;
        } else if (bId === 'latent_jitter') {
          const distToCarrier = Math.abs(r - 42);
          return (strength * 1.8) * Math.exp(-(distToCarrier * distToCarrier) / 48); // wider peak, lower height
        } else if (bId === 'vae_quantize') {
          return watermarkSpike * 0.35;
        } else if (bId === 'neural_denoise') {
          return watermarkSpike * 0.2;
        }
        return watermarkSpike;
      };

      const getBasePowerForBypass = (bId: BypassMethodId, bIntensity: number) => {
        if (bId === 'notch_filter') {
          const notchWidth = Math.max(4, bIntensity * 0.35);
          const distToCarrier = Math.abs(r - 42);
          const notchFactor = Math.max(0, Math.min(1, Math.pow(distToCarrier / notchWidth, 2)));
          return basePower * (0.85 + 0.15 * notchFactor);
        } else if (bId === 'latent_jitter') {
          return basePower + Math.random() * (bIntensity * 0.05); // low flat noise
        } else if (bId === 'vae_quantize') {
          const quantStep = 2 + bIntensity * 0.3;
          return Math.round(basePower / quantStep) * quantStep + 3;
        } else if (bId === 'neural_denoise') {
          const attenuation = Math.exp(-r / (60 - bIntensity * 0.8));
          return basePower * attenuation;
        }
        return basePower;
      };

      // Blend current and previous active bypass states for smooth visual morphing
      const currSpike = getSpikeForBypass(bypassId, intensity);
      const prevSpike = prevBypass ? getSpikeForBypass(prevBypass, intensity) : watermarkSpike;
      pertSpike = prevSpike * (1 - progress) + currSpike * progress;

      const currBase = getBasePowerForBypass(bypassId, intensity);
      const prevBase = prevBypass ? getBasePowerForBypass(prevBypass, intensity) : basePower;
      pertPower = prevBase * (1 - progress) + currBase * progress;

      perturbedPoints.push({ r, power: (pertPower + pertSpike) * liveWave });
    }

    // Map to pixel coordinate helpers
    const getXCoord = (radialVal: number) => paddingLeft + (radialVal / 75) * chartW;
    const getYCoord = (p: number) => h - paddingBottom - (p / 85) * chartH;

    // Draw Original (Before) - Green Fill & Stroke
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(getXCoord(originalPoints[0].r), getYCoord(originalPoints[0].power));
    for (let i = 1; i < originalPoints.length; i++) {
      ctx.lineTo(getXCoord(originalPoints[i].r), getYCoord(originalPoints[i].power));
    }
    // Path area close
    ctx.lineTo(getXCoord(originalPoints[originalPoints.length - 1].r), h - paddingBottom);
    ctx.lineTo(getXCoord(originalPoints[0].r), h - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.fill();

    // Outline
    ctx.beginPath();
    ctx.moveTo(getXCoord(originalPoints[0].r), getYCoord(originalPoints[0].power));
    for (let i = 1; i < originalPoints.length; i++) {
      ctx.lineTo(getXCoord(originalPoints[i].r), getYCoord(originalPoints[i].power));
    }
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();

    // Draw Perturbed (After) - Hot Pink Stroke/Fill
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(getXCoord(perturbedPoints[0].r), getYCoord(perturbedPoints[0].power));
    for (let i = 1; i < perturbedPoints.length; i++) {
      ctx.lineTo(getXCoord(perturbedPoints[i].r), getYCoord(perturbedPoints[i].power));
    }
    ctx.lineTo(getXCoord(perturbedPoints[perturbedPoints.length - 1].r), h - paddingBottom);
    ctx.lineTo(getXCoord(perturbedPoints[0].r), h - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = 'rgba(236, 72, 153, 0.06)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(getXCoord(perturbedPoints[0].r), getYCoord(perturbedPoints[0].power));
    for (let i = 1; i < perturbedPoints.length; i++) {
      ctx.lineTo(getXCoord(perturbedPoints[i].r), getYCoord(perturbedPoints[i].power));
    }
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();

    // Draw coordinate axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, h - paddingBottom);
    ctx.lineTo(w - paddingRight, h - paddingBottom);
    ctx.stroke();

    // Draw Axis ticks/labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '5px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('Max', paddingLeft - 2, paddingTop);
    ctx.fillText('0', paddingLeft - 2, h - paddingBottom);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0px', paddingLeft, h - paddingBottom + 2);
    ctx.fillText('42px', getXCoord(42), h - paddingBottom + 2);
    ctx.fillText('75px', w - paddingRight - 4, h - paddingBottom + 2);
  };

  /**
   * Draw a beautiful, interactive 2D Fourier (FFT) Magnitude Spectrum mockup.
   * Visually displays the concentric "carrier halo" ring that represents SynthID,
   * showing it disappear if a frequency notch filter or noise is applied!
   */
  const drawSimulatedFFTSpectrum = (
    ctx: CanvasRenderingContext2D,
    watermarked: boolean,
    strength: number,
    bypassId: BypassMethodId,
    intensity: number,
    zoom: number = 1.0,
    rotation: number = 0,
    highPass: boolean = false
  ): { x: number; y: number; relX: number; relY: number; radius: number; intensity: number } | null => {
    const w = 160;
    const h = 160;
    
    // High contrast configuration remappings
    const isHighContrast = fftHighContrast;
    const bgFill = isHighContrast ? '#000000' : '#0a0d14';
    const noiseColor = (alpha: number) => isHighContrast ? `rgba(255, 255, 255, ${alpha * 0.45})` : `rgba(165, 243, 252, ${alpha * 0.4})`;
    const axisStroke = isHighContrast 
      ? `rgba(255, 255, 255, ${0.55 * fftOverlayOpacity})` 
      : `rgba(8, 145, 178, ${0.65 * fftOverlayOpacity})`;
    const ringColor1 = (alpha: number) => isHighContrast ? `rgba(255, 255, 255, ${alpha * 0.95})` : `rgba(6, 182, 212, ${alpha * 0.95})`;
    const ringColor2 = (alpha: number) => isHighContrast ? `rgba(255, 255, 255, ${alpha * 0.45})` : `rgba(6, 182, 212, ${alpha * 0.45})`;
    const jitterColor = (alpha: number) => isHighContrast ? `rgba(255, 255, 255, ${alpha})` : `rgba(236, 72, 153, ${alpha})`;
    const notchStroke = isHighContrast ? 'rgba(255, 255, 255, 0.25)' : 'rgba(239, 68, 68, 0.3)';
    const hudMainColor = isHighContrast ? '#ffffff' : '#00E5FF';
    const hudBg = isHighContrast ? 'rgba(0, 0, 0, 0.95)' : 'rgba(10, 13, 20, 0.8)';

    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    const anchorX = zoom > 1.0 ? unzoomedPeakRef.current.x : cx;
    const anchorY = zoom > 1.0 ? unzoomedPeakRef.current.y : cy;

    // Apply scale matrix for spectral zoom focused on the target coordinates
    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.scale(zoom, zoom);
    ctx.translate(-anchorX, -anchorY);

    if (rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Draw background starlight / high frequency FFT noise
    let noiseDimFactor = 1.0;
    if (activeLegendHighlight && activeLegendHighlight !== 'zone') {
      noiseDimFactor = 0.22; // Dim noise when highlighting other categories
    }
    for (let i = 0; i < 400; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 3) * (w / 2);
      if (highPass && r < 35) continue; // High-pass filter: exclude noise near the central core
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      
      const alpha = Math.max(0.1, 1.0 - r / (w / 2));
      const size = Math.random() > 0.96 ? 2 : 1;
      ctx.fillStyle = noiseColor(alpha * noiseDimFactor);
      ctx.fillRect(x, y, size, size);
    }

    // Draw faint concentric spectral grid overlay
    let ringOpacityFactor = 1.0;
    if (activeLegendHighlight) {
      if (activeLegendHighlight === 'zone') {
        ringOpacityFactor = 1.8; // Boost prominence
      } else {
        ringOpacityFactor = 0.2; // Severely dim when other things highlighted
      }
    }
    // Breathing/pulsing grid line opacity animation (slow frequency)
    const breathFactor = 0.75 + 0.25 * Math.sin(Date.now() / 1500);
    const gridStroke = isHighContrast 
      ? `rgba(255, 255, 255, ${0.18 * fftOverlayOpacity * ringOpacityFactor * breathFactor})` 
      : `rgba(0, 229, 255, ${0.18 * fftOverlayOpacity * ringOpacityFactor * breathFactor})`;
    ctx.strokeStyle = gridStroke;
    ctx.lineWidth = activeLegendHighlight === 'zone' ? 1.4 : 0.8;
    ctx.setLineDash(activeLegendHighlight === 'zone' ? [] : [2, 2]); // solid rings when highlighted
    
    // Choose a standard grid step in unzoomed coords so that physical screen spacing stays consistently near 32px for premium readability during magnification
    const targetScreenSpacing = 32;
    const niceSteps = [1, 2, 4, 5, 8, 10, 16, 20, 25, 32, 40, 50, 64, 80, 100, 128, 160];
    let gridStep = 16;
    let minDifference = Infinity;
    for (const step of niceSteps) {
      const screenSpacing = step * zoom;
      const difference = Math.abs(screenSpacing - targetScreenSpacing);
      if (difference < minDifference) {
        minDifference = difference;
        gridStep = step;
      }
    }

    const corners = [
      { sx: 0, sy: 0 },
      { sx: w, sy: 0 },
      { sx: w, sy: h },
      { sx: 0, sy: h }
    ];
    let maxUnzoomedDist = 0;
    let minUnzoomedDist = Infinity;
    
    // Check if the center (cx, cy) is visible on the screen under current zoom
    const scx = anchorX + (cx - anchorX) * zoom;
    const scy = anchorY + (cy - anchorY) * zoom;
    const centerIsVisible = (scx >= 0 && scx <= w && scy >= 0 && scy <= h);
    
    for (const corner of corners) {
      const dx = anchorX + (corner.sx - anchorX) / zoom;
      const dy = anchorY + (corner.sy - anchorY) / zoom;
      const dist = Math.hypot(dx - cx, dy - cy);
      maxUnzoomedDist = Math.max(maxUnzoomedDist, dist);
      minUnzoomedDist = Math.min(minUnzoomedDist, dist);
    }
    
    if (centerIsVisible) {
      minUnzoomedDist = 0;
    }

    let startRadius = Math.ceil(minUnzoomedDist / gridStep) * gridStep;
    if (startRadius < gridStep) {
      startRadius = gridStep;
    }

    let drawCount = 0;
    // Draw rings at multiples of gridStep within the visible screen area
    for (let radiusVal = startRadius; radiusVal <= maxUnzoomedDist; radiusVal += gridStep) {
      if (drawCount++ > 40) break; // Safeguard against excessive rings or infinite loops
      
      ctx.beginPath();
      ctx.arc(cx, cy, radiusVal, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add visual label for radial distance R dynamically onto the canvas with high contrast stroke + fill
      ctx.save();
      // Scaled font size and line width to maintain a clean visual density and physical readability at high magnification
      const fsVal = (activeLegendHighlight === 'zone' ? 7.5 : 6.2) / zoom;
      ctx.font = `bold ${fsVal}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = (activeLegendHighlight === 'zone' ? 2.6 : 1.8) / zoom;
      
      const labelText = `${Math.round(radiusVal)}px`;
      const txtOpacity = Math.max(0.4, fftOverlayOpacity) * ringOpacityFactor;
      ctx.fillStyle = isHighContrast 
        ? `rgba(255, 255, 255, ${txtOpacity})` 
        : `rgba(0, 229, 255, ${txtOpacity})`;
      
      // Alternate positioning angle dynamically based on active scaling to prevent overlapping of adjacent target rings
      const radiusIndex = Math.round(radiusVal / gridStep);
      const angleOffsets = [Math.PI / 4.2, Math.PI / 5.2, Math.PI / 3.4];
      const selectedAngle = angleOffsets[radiusIndex % angleOffsets.length];

      const labelX = cx + Math.cos(selectedAngle) * radiusVal;
      const labelY = cy - Math.sin(selectedAngle) * radiusVal;
      ctx.strokeText(labelText, labelX, labelY);
      ctx.fillText(labelText, labelX, labelY);

      // Label positioning on the horizontal axis marking as well, with dynamic physical vertical offset re-scaled by 1/zoom
      const hLabelX = cx + radiusVal;
      const hLabelY = cy - 4.5 / zoom;
      ctx.strokeText(labelText, hLabelX, hLabelY);
      ctx.fillText(labelText, hLabelX, hLabelY);
      
      ctx.restore();
    }

    // Draw auxiliary parallel grid lines (horizontal & vertical) spaced dynamically by gridStep for cartesian matching under high-magnification
    ctx.save();
    const minX = anchorX - anchorX / zoom;
    const maxX = anchorX + (w - anchorX) / zoom;
    const minY = anchorY - anchorY / zoom;
    const maxY = anchorY + (h - anchorY) / zoom;

    const minK_x = Math.ceil((minX - cx) / gridStep);
    const maxK_x = Math.floor((maxX - cx) / gridStep);
    const minK_y = Math.ceil((minY - cy) / gridStep);
    const maxK_y = Math.floor((maxY - cy) / gridStep);

    ctx.strokeStyle = isHighContrast 
      ? `rgba(255, 255, 255, ${0.08 * fftOverlayOpacity * ringOpacityFactor * breathFactor})` 
      : `rgba(0, 229, 255, ${0.08 * fftOverlayOpacity * ringOpacityFactor * breathFactor})`;
    ctx.lineWidth = activeLegendHighlight === 'zone' ? 1.0 : 0.5;
    ctx.setLineDash(activeLegendHighlight === 'zone' ? [] : [1, 4]);

    let gridLineCount = 0;
    // Draw vertical Cartesian helper lines
    for (let k = minK_x; k <= maxK_x; k++) {
      if (k === 0) continue;
      if (gridLineCount++ > 35) break;
      const xVal = cx + k * gridStep;
      ctx.beginPath();
      ctx.moveTo(xVal, minY);
      ctx.lineTo(xVal, maxY);
      ctx.stroke();
    }

    // Draw horizontal Cartesian helper lines
    for (let k = minK_y; k <= maxK_y; k++) {
      if (k === 0) continue;
      if (gridLineCount++ > 70) break;
      const yVal = cy + k * gridStep;
      ctx.beginPath();
      ctx.moveTo(minX, yVal);
      ctx.lineTo(maxX, yVal);
      ctx.stroke();
    }
    ctx.restore();

    // Draw auxiliary radial diagonal rays (45 deg / 135 deg)
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy - 56);
    ctx.lineTo(cx + 56, cy + 56);
    ctx.moveTo(cx - 56, cy + 56);
    ctx.lineTo(cx + 56, cy - 56);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash styling

    // Draw bright cardinal lines (DC offset + vertical/horizontal gradient energies)
    const cardGrd = ctx.createRadialGradient(cx, cy, 1, cx, cy, 55);
    if (isHighContrast) {
      cardGrd.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      cardGrd.addColorStop(0.1, 'rgba(200, 200, 200, 0.6)');
      cardGrd.addColorStop(0.4, 'rgba(100, 100, 100, 0.2)');
      cardGrd.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      cardGrd.addColorStop(0, 'rgba(0, 229, 255, 0.9)');
      cardGrd.addColorStop(0.1, 'rgba(8, 145, 178, 0.6)');
      cardGrd.addColorStop(0.4, 'rgba(8, 145, 178, 0.2)');
      cardGrd.addColorStop(1, 'rgba(0,0,0,0)');
    }

    ctx.strokeStyle = axisStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // Star core
    ctx.save();
    if (highPass) {
      ctx.globalAlpha = 0.05; // Heavily attenuate the DC spike/low-frequency glow
    }
    ctx.fillStyle = cardGrd;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // If watermarked, draw the secret Ring Carrier pattern in frequency domain!
    if (watermarked) {
      const ringRadius = 40;
      let alpha = Math.max(0.2, strength * 0.18);
      
      // If notch filter or other bypass is applied, attenuate or destroy the ring with morph transitions!
      const getBypassAlphaFactor = (bId: BypassMethodId, bIntensity: number) => {
        if (bId === 'notch_filter') {
          return Math.max(0, 1 - bIntensity / 35);
        } else if (bId === 'latent_jitter') {
          return 0.4;
        } else if (bId === 'vae_quantize') {
          return 0.35;
        } else if (bId === 'neural_denoise') {
          return 0.18;
        }
        return 1.0;
      };

      const progress = morphProgressRef.current;
      const currentFactor = getBypassAlphaFactor(bypassId, intensity);
      const prevFactor = getBypassAlphaFactor(prevBypassIdRef.current, intensity);
      const blendedFactor = prevFactor * (1 - progress) + currentFactor * progress;

      alpha *= blendedFactor;

      // Draw jitter shadow ring if active in current or previous state
      const isCurrentJitter = bypassId === 'latent_jitter';
      const isPrevJitter = prevBypassIdRef.current === 'latent_jitter';
      if ((isCurrentJitter && progress > 0.01) || (isPrevJitter && progress < 0.99)) {
        const jitterWeight = isCurrentJitter ? progress : (1 - progress);
        ctx.strokeStyle = jitterColor(alpha * jitterWeight);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (alpha > 0.02) {
        // Draw the concentric SynthID Ring (Signature carrier halo)
        ctx.strokeStyle = ringColor1(alpha);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Subtler secondary harmonic ring
        ctx.strokeStyle = ringColor2(alpha);
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw notch band-stop shadow overlay if active in current or previous state
      const isCurrentNotch = bypassId === 'notch_filter';
      const isPrevNotch = prevBypassIdRef.current === 'notch_filter';
      if ((isCurrentNotch && progress > 0.01) || (isPrevNotch && progress < 0.99)) {
        const notchWeight = isCurrentNotch ? progress : (1 - progress);
        ctx.strokeStyle = `rgba(${isHighContrast ? '255, 255, 255' : '239, 68, 68'}, ${notchWeight * 0.35})`;
        ctx.lineWidth = Math.max(4, intensity * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Restore transformation matrix before running peak detection and HUD overlays
    ctx.restore();

    // Define Viridis and Inferno palettes and color mapping utilities
    const viridisStops: [number, number, number, number][] = [
      [0.0, 68, 1, 84],
      [0.2, 72, 40, 120],
      [0.45, 49, 104, 142],
      [0.7, 35, 138, 141],
      [0.85, 53, 183, 121],
      [1.0, 253, 231, 37]
    ];

    const infernoStops: [number, number, number, number][] = [
      [0.0, 0, 0, 4],
      [0.15, 40, 11, 84],
      [0.4, 142, 12, 128],
      [0.65, 220, 47, 2],
      [0.85, 252, 191, 10],
      [1.0, 252, 255, 164]
    ];

    const magmaStops: [number, number, number, number][] = [
      [0.0, 0, 0, 4],
      [0.2, 53, 14, 111],
      [0.45, 133, 33, 135],
      [0.7, 212, 72, 111],
      [0.85, 251, 151, 97],
      [1.0, 252, 253, 191]
    ];

    const plasmaStops: [number, number, number, number][] = [
      [0.0, 13, 8, 135],
      [0.2, 84, 2, 163],
      [0.45, 156, 23, 158],
      [0.7, 212, 100, 103],
      [0.85, 248, 185, 51],
      [1.0, 240, 249, 33]
    ];

    const interpolateColor = (stops: [number, number, number, number][], factor: number): [number, number, number] => {
      if (factor <= stops[0][0]) return [stops[0][1], stops[0][2], stops[0][3]];
      if (factor >= stops[stops.length - 1][0]) return [stops[stops.length - 1][1], stops[stops.length - 1][2], stops[stops.length - 1][3]];
      
      for (let i = 0; i < stops.length - 1; i++) {
        const s0 = stops[i];
        const s1 = stops[i + 1];
        if (factor >= s0[0] && factor <= s1[0]) {
          const t = (factor - s0[0]) / (s1[0] - s0[0]);
          const r = Math.round(s0[1] + (s1[1] - s0[1]) * t);
          const g = Math.round(s0[2] + (s1[2] - s0[2]) * t);
          const b = Math.round(s0[3] + (s1[3] - s0[3]) * t);
          return [r, g, b];
        }
      }
      return [0, 0, 0];
    };

    // Apply Intensity Map post-processing mapping if active
    if (fftIntensityMap !== 'off') {
      try {
        const pixelData = ctx.getImageData(0, 0, w, h);
        const data = pixelData.data;
        const stops = fftIntensityMap === 'viridis' 
          ? viridisStops 
          : fftIntensityMap === 'inferno' 
            ? infernoStops 
            : fftIntensityMap === 'magma' 
              ? magmaStops 
              : plasmaStops;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const intensityVal = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          const [nr, ng, nb] = interpolateColor(stops, intensityVal);
          
          data[i] = nr;
          data[i + 1] = ng;
          data[i + 2] = nb;
          data[i + 3] = 255; // Solid backdrop
        }
        ctx.putImageData(pixelData, 0, 0);
      } catch (err) {
        console.warn('Error applying intensity mapping:', err);
      }
    }

    // Draw horizontal and vertical axis absolute coordinate unit labels (aligned with rotated matrix)
    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.scale(zoom, zoom);
    ctx.translate(-anchorX, -anchorY);

    if (rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Draw absolute labels with black boundary outlines for supreme contrast over heatmap/black backdrops
    ctx.font = 'bold 6px monospace';
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#000000';
    
    // Draw horizontal axis labels (absolute px offsets)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = minK_x; k <= maxK_x; k++) {
      if (k === 0) continue;
      const xVal = cx + k * gridStep;
      
      // Calculate physical coordinates to verify clipping/boundaries
      const physX = anchorX + (xVal - anchorX) * zoom;
      if (physX < 12 || physX > w - 12) continue;

      const labelText = `${Math.abs(k * gridStep)}px`;
      ctx.strokeText(labelText, xVal, cy + 4.5);
      ctx.fillStyle = isHighContrast ? '#ffffff' : '#00E5FF';
      ctx.fillText(labelText, xVal, cy + 4.5);
    }

    // Draw vertical axis labels (absolute px offsets)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let k = minK_y; k <= maxK_y; k++) {
      if (k === 0) continue;
      const yVal = cy + k * gridStep;
      
      // Calculate physical coordinates to verify clipping/boundaries
      const physY = anchorY + (yVal - anchorY) * zoom;
      if (physY < 12 || physY > h - 12) continue;

      const labelText = `${Math.abs(k * gridStep)}px`;
      ctx.strokeText(labelText, cx + 4.5, yVal);
      ctx.fillStyle = isHighContrast ? '#ffffff' : '#fef08a'; // custom light gold
      ctx.fillText(labelText, cx + 4.5, yVal);
    }

    ctx.restore();

    // --- AUTOMATIC PEAK FREQUENCY DETECTION SCANNER ---
    // Scans the 2D FFT canvas for high-amplitude coefficients outside the central low-frequency region
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      let maxVal = -1;
      let peakX = cx;
      let peakY = cy;
      const centerExcludeRadius = highPass ? 38 : 18; // Ignore low-frequency background noise spikes!

      // To find local maxima: check every pixel and see if it's hotter than its 8 neighbors, 
      // then filter the top 3 with distance constraint so they don't block each other.
      const localMaxima: { x: number; y: number; val: number }[] = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist >= centerExcludeRadius && dist < (w / 2) - 4) {
            const idx = (y * w + x) * 4;
            const intensityVal = data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114;
            
            if (intensityVal > 15) { // minimum threshold for a spike
              // Check 8 neighbors to ensure it's a local maximum
              let isMax = true;
              for (let ny = -1; ny <= 1; ny++) {
                for (let nx = -1; nx <= 1; nx++) {
                  if (nx === 0 && ny === 0) continue;
                  const nidx = ((y + ny) * w + (x + nx)) * 4;
                  const nIntensity = data[nidx] * 0.299 + data[nidx+1] * 0.587 + data[nidx+2] * 0.114;
                  if (nIntensity > intensityVal) {
                    isMax = false;
                    break;
                  }
                }
                if (!isMax) break;
              }
              if (isMax) {
                localMaxima.push({ x, y, val: intensityVal });
              }
            }
          }
        }
      }

      // Sort by intensity descending
      localMaxima.sort((a, b) => b.val - a.val);

      // Select top 3 distinct peaks with minimum 12px separation
      const top3Spikes: typeof localMaxima = [];
      for (const m of localMaxima) {
        if (top3Spikes.length >= 3) break;
        const isFarEnough = top3Spikes.every(s => Math.hypot(s.x - m.x, s.y - m.y) >= 12);
        if (isFarEnough) {
          top3Spikes.push(m);
        }
      }

      // The highest peak remains peakX, peakY, maxVal
      if (top3Spikes.length > 0) {
        maxVal = top3Spikes[0].val;
        peakX = top3Spikes[0].x;
        peakY = top3Spikes[0].y;
      }

      const relX = peakX - cx;
      const relY = peakY - cy;

      if (maxVal > 15) {
        if (!lastAnimatedPeakRef.current || 
            Math.abs(lastAnimatedPeakRef.current.x - peakX) > 0.5 || 
            Math.abs(lastAnimatedPeakRef.current.y - peakY) > 0.5) {
          lastAnimatedPeakRef.current = { x: peakX, y: peakY };
          peakEmergenceStartTimeRef.current = performance.now();
        }
      } else {
        lastAnimatedPeakRef.current = null;
      }

      if (maxVal > 15) {
        const newlyFoundUnzoomedX = anchorX + (peakX - anchorX) / zoom;
        const newlyFoundUnzoomedY = anchorY + (peakY - anchorY) / zoom;
        unzoomedPeakRef.current = { x: newlyFoundUnzoomedX, y: newlyFoundUnzoomedY };
      } else {
        unzoomedPeakRef.current = { x: cx, y: cy };
      }

      // --- PEAK PERSISTENCE / DRIFT TRACKING ACCUMULATOR ---
      if (!peakPersistence && activeLegendHighlight !== 'drift') {
        peakTrailRef.current = [];
      } else {
        // If empty but drift highlighting is active, populate a beautiful demonstration trail!
        if (peakTrailRef.current.length === 0 && activeLegendHighlight === 'drift') {
          const tX = maxVal > 15 ? peakX : cx + 40;
          const tY = maxVal > 15 ? peakY : cy + 10;
          for (let k = 1; k <= 8; k++) {
            peakTrailRef.current.push({
              x: tX - k * 3 + Math.sin(k) * 2,
              y: tY + k * 1.5 - Math.cos(k) * 1.5,
              alpha: 1.0 - k * 0.1,
              relX: tX - k * 3 - cx,
              relY: tY + k * 1.5 - cy,
              radius: Math.round(Math.hypot(tX - k * 3 - cx, tY + k * 1.5 - cy))
            });
          }
        }

        // Slowly decay the alpha of existing trail points unless activeLegendHighlight is 'drift' (which keeps demo trail alive)
        peakTrailRef.current = peakTrailRef.current
          .map(pt => {
            const decay = activeLegendHighlight === 'drift' ? 0.002 : 0.015;
            return { ...pt, alpha: pt.alpha - decay };
          })
          .filter(pt => pt.alpha > 0);

        // If a new peak position is detected, push it to our trail buffer if it changed
        if (maxVal > 15) {
          const lastPt = peakTrailRef.current[peakTrailRef.current.length - 1];
          // Only add new nodes to the trail if they represents a real frequency shift/drift
          if (!lastPt || Math.abs(lastPt.x - peakX) > 1.2 || Math.abs(lastPt.y - peakY) > 1.2) {
            peakTrailRef.current.push({
              x: peakX,
              y: peakY,
              alpha: 1.0,
              relX: peakX - cx,
              relY: peakY - cy,
              radius: Math.round(Math.sqrt((peakX - cx) * (peakX - cx) + (peakY - cy) * (peakY - cy)))
            });
            // Bounds safety mechanism to prevent memory growth
            if (peakTrailRef.current.length > 25) {
              peakTrailRef.current.shift();
            }
          }
        }

        // Draw fading spectral trail traces
        let driftOpacityFactor = 1.0;
        if (activeLegendHighlight) {
          if (activeLegendHighlight === 'drift') {
            driftOpacityFactor = 2.0;
          } else {
            driftOpacityFactor = 0.15;
          }
        }

        peakTrailRef.current.forEach((pt, idx) => {
          // Progressive quadratic opacity and non-linear size decay based on age (alpha)
          const opacityScale = Math.pow(pt.alpha, 1.8);
          const sizeScale = 0.15 + 0.85 * Math.pow(pt.alpha, 1.5);
          
          const trailAlpha = opacityScale * 0.45 * driftOpacityFactor; // Cap maximum transparency
          if (trailAlpha <= 0.01) return;

          // Connect consecutive trail elements with a progressively fading dashed vector line
          if (idx > 0) {
            const prevPt = peakTrailRef.current[idx - 1];
            const prevOpacityScale = Math.pow(prevPt.alpha, 1.8);
            const prevSizeScale = 0.15 + 0.85 * Math.pow(prevPt.alpha, 1.5);
            
            const segmentAlpha = ((opacityScale + prevOpacityScale) / 2) * 0.35 * driftOpacityFactor;
            const segmentScale = (sizeScale + prevSizeScale) / 2;
            
            if (segmentAlpha > 0.01) {
              ctx.save();
              ctx.strokeStyle = isHighContrast 
                ? `rgba(255, 255, 255, ${segmentAlpha})` 
                : `rgba(236, 72, 153, ${segmentAlpha})`; // beautiful magenta trace
              ctx.lineWidth = (activeLegendHighlight === 'drift' ? 1.2 : 0.6) * segmentScale;
              ctx.setLineDash([1.5, 2]); // high-tech micro-dashed path
              ctx.beginPath();
              ctx.moveTo(prevPt.x, prevPt.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.stroke();
              ctx.restore();
            }
          }

          ctx.save();
          ctx.shadowBlur = activeLegendHighlight === 'drift' ? 4 : 0;
          ctx.shadowColor = '#ec4899'; // magenta glow for drift highlighted
          ctx.strokeStyle = isHighContrast 
            ? `rgba(255, 255, 255, ${trailAlpha})` 
            : `rgba(236, 72, 153, ${trailAlpha})`; // beautiful magenta trace for drift trail
          ctx.lineWidth = (activeLegendHighlight === 'drift' ? 1.5 : 0.8) * sizeScale;

          // Compute age-proportional shrinking sizes for smooth transition
          const halfSize = 4.5 * sizeScale;
          const circleRad = 2.4 * sizeScale;

          // Plus / cross tick marks
          ctx.beginPath();
          ctx.moveTo(pt.x - halfSize, pt.y);
          ctx.lineTo(pt.x + halfSize, pt.y);
          ctx.moveTo(pt.x, pt.y - halfSize);
          ctx.lineTo(pt.x, pt.y + halfSize);
          ctx.stroke();

          // Delicate center circle trace
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, circleRad, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
      }

      // --- DRAW REFERENCE PEAK AND DEVIATION LINE ---
      if (referencePeak) {
        // Calculate screen position of the reference peak by applying rotation and zoom transformations to its relative coordinates
        const angleRad = (rotation * Math.PI) / 180;
        const rxRot = cx + referencePeak.relX * Math.cos(angleRad) - referencePeak.relY * Math.sin(angleRad);
        const ryRot = cy + referencePeak.relX * Math.sin(angleRad) + referencePeak.relY * Math.cos(angleRad);
        const refScreenX = anchorX + (rxRot - anchorX) * zoom;
        const refScreenY = anchorY + (ryRot - anchorY) * zoom;

        // Draw the static reference marker if on-screen
        if (refScreenX >= 0 && refScreenX <= w && refScreenY >= 0 && refScreenY <= h) {
          ctx.save();
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#f59e0b';
          ctx.strokeStyle = '#f59e0b'; // Amber reference color
          ctx.lineWidth = 1.2;

          // Cross tick marks at reference
          ctx.beginPath();
          const halfSizeRef = 4.5;
          ctx.moveTo(refScreenX - halfSizeRef, refScreenY);
          ctx.lineTo(refScreenX + halfSizeRef, refScreenY);
          ctx.moveTo(refScreenX, refScreenY - halfSizeRef);
          ctx.lineTo(refScreenX, refScreenY + halfSizeRef);
          ctx.stroke();

          // Outer dashed target ring
          ctx.beginPath();
          ctx.setLineDash([2, 1.5]);
          ctx.arc(refScreenX, refScreenY, 6.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Soft label above/below reference peak
          ctx.save();
          ctx.font = 'bold 6px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.lineWidth = 2.0;
          ctx.strokeStyle = '#000000';
          ctx.strokeText('REF COEFF', refScreenX, refScreenY - 6.5);
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('REF COEFF', refScreenX, refScreenY - 6.5);
          ctx.restore();
        }

        // Visualize frequency deviation vector line if watermarked/active peak exists
        if (maxVal > 15) {
          const dx = relX - referencePeak.relX;
          const dy = relY - referencePeak.relY;
          const devDist = Math.hypot(dx, dy);

          // Draw animated vector trace line between reference and current active peak
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1.0;
          // Pulse the dash pattern over time
          const dashOffset = (performance.now() * 0.05) % 15;
          ctx.lineDashOffset = -dashOffset;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          ctx.lineTo(refScreenX, refScreenY);
          ctx.stroke();
          ctx.restore();

          // Overlay coordinate delta/deviation info over the midpoint of the connector line
          const midX = (peakX + refScreenX) / 2;
          const midY = (peakY + refScreenY) / 2;
          const devLabel = `Δf:${Math.round(devDist)}px`;

          ctx.save();
          ctx.font = 'bold 6px monospace';
          const lblW = ctx.measureText(devLabel).width + 3;
          ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(midX - lblW / 2, midY - 4, lblW, 8);
          ctx.strokeRect(midX - lblW / 2, midY - 4, lblW, 8);

          ctx.fillStyle = '#ffedd5'; // Light warm peach
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(devLabel, midX, midY);
          ctx.restore();
        }
      }

      // Draw crosshair markers + data tooltip at the coordinates of the highest frequency spike
      if (maxVal > 15) {
        // Calculate dynamic pulse breathing/scaling using high-res performance timestamp
        const animTime = performance.now() * 0.005; // speed speed of breath
        const confidenceScore = detection ? detection.confidence : (watermarked ? 100 : 0);
        
        // Emergence animation calculation: fade-in and scale-down
        const now = performance.now();
        const elapsed = now - (peakEmergenceStartTimeRef.current || 0);
        const duration = 400; // 400ms duration
        const progress = Math.min(1.0, elapsed / duration);
        
        // Exponential ease out for gorgeous high-tech transition
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const emergenceOpacity = easeOut;
        const emergenceScale = 2.5 - 1.5 * easeOut; // scale starts at 2.5 and shrinks down to 1.0

        // High confidence has stronger/larger breathing, low confidence is subtle
        const pulseAmt = confidenceScore > 40 ? 0.22 * (confidenceScore / 100) : 0.05;
        const scale = (1.0 + Math.sin(animTime) * pulseAmt) * emergenceScale;

        // Apply scale factors to spacing & radius
        const outerGap = Math.round(9 * scale);
        const innerGap = Math.round(3 * scale);
        const markerRadius = 4 * scale;

        let peakOpacityFactor = 1.0 * emergenceOpacity;
        if (activeLegendHighlight) {
          if (activeLegendHighlight === 'peak') {
            peakOpacityFactor = 1.5 * emergenceOpacity;
          } else {
            peakOpacityFactor = 0.15 * emergenceOpacity;
          }
        }

        // relX and relY are computed in the outer scope
        const fRadius = Math.round(Math.sqrt(relX * relX + relY * relY));
        const fRadiusUnzoomed = Math.round(fRadius / zoom);
        // Visual lock-on condition: within 1px of target R = 42px
        const isLocked = Math.abs(fRadiusUnzoomed - 42) <= 1;

        const currentPeakColor = isLocked
          ? `rgba(74, 222, 128, ${Math.min(1.0, peakOpacityFactor)})`
          : (isHighContrast 
            ? `rgba(255, 255, 255, ${Math.min(1.0, peakOpacityFactor)})` 
            : `rgba(0, 229, 255, ${Math.min(1.0, peakOpacityFactor)})`);

        // Stark/Cyan/Green crosshair with subtle glow
        ctx.shadowBlur = isLocked ? (activeLegendHighlight === 'peak' ? 12 : 6) : (isHighContrast ? 2 : (activeLegendHighlight === 'peak' ? 10 : 4));
        ctx.shadowColor = isLocked ? '#00E5FF' : hudMainColor;
        ctx.strokeStyle = currentPeakColor;
        ctx.lineWidth = activeLegendHighlight === 'peak' ? 1.5 : 1;

        // Draw crosshairs
        ctx.beginPath();
        // horizontal lines with gap near center
        ctx.moveTo(peakX - outerGap, peakY);
        ctx.lineTo(peakX - innerGap, peakY);
        ctx.moveTo(peakX + innerGap, peakY);
        ctx.lineTo(peakX + outerGap, peakY);
        // vertical lines with gap near center
        ctx.moveTo(peakX, peakY - outerGap);
        ctx.lineTo(peakX, peakY - innerGap);
        ctx.moveTo(peakX, peakY + innerGap);
        ctx.lineTo(peakX, peakY + outerGap);
        ctx.stroke();

        // Small circle target
        ctx.beginPath();
        ctx.arc(peakX, peakY, markerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Extra dynamic ripple radar pulse to draw visual focus when confidence score is extremely high (e.g., strong watermarking)
        if (confidenceScore > 50) {
          const ripplePercent = (performance.now() * 0.0018) % 1.0; // cycle
          const rippleRadius = markerRadius + ripplePercent * 12;
          const rippleAlpha = (1.0 - ripplePercent) * 0.55 * (confidenceScore / 100) * peakOpacityFactor;
          
          ctx.shadowBlur = 0; // reset shadow for secondary concentric ripple
          ctx.beginPath();
          ctx.strokeStyle = isLocked
            ? `rgba(74, 222, 128, ${rippleAlpha})`
            : (isHighContrast ? `rgba(255, 255, 255, ${rippleAlpha})` : `rgba(0, 229, 255, ${rippleAlpha})`);
          ctx.arc(peakX, peakY, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Reset shadow for text / details
        ctx.shadowBlur = 0;

        // Draw HUD overlay info box
        if (peakOpacityFactor > 0.2) {
          // Draw permanent text tags for top 3 spikes
          ctx.save();
          top3Spikes.forEach((spike, idx) => {
            const sRelX = spike.x - cx;
            const sRelY = spike.y - cy;
            const sRadius = Math.round(Math.sqrt(sRelX * sRelX + sRelY * sRelY));
            const sRadiusUnzoomed = Math.round(sRadius / zoom);
            const isSpikeLocked = Math.abs(sRadiusUnzoomed - 42) <= 1;

            // Small dot at the exact spike location
            ctx.beginPath();
            ctx.fillStyle = idx === 0 ? (isSpikeLocked ? '#00E5FF' : hudMainColor) : 'rgba(165, 243, 252, 0.7)';
            ctx.arc(spike.x, spike.y, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Label secondary and tertiary peaks directly with subtle text above or below the dot
            if (idx > 0) {
              ctx.save();
              ctx.font = 'bold 4.5px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1.2;
              
              const pLabel = `Peak #${idx + 1}`;
              const offsetLabelY = spike.y > cy ? spike.y + 7 : spike.y - 3;
              ctx.strokeText(pLabel, spike.x, offsetLabelY);
              ctx.fillText(pLabel, spike.x, offsetLabelY);
              ctx.restore();
            }

            // Small text tag labeled like "Peak #1: F(-20,15)"
            const prefix = `Peak #${idx + 1}`;
            const labelText = `${prefix}: F(${sRelX > 0 ? '+' : ''}${sRelX},${sRelY > 0 ? '+' : ''}${sRelY})`;
            ctx.font = 'bold 5.5px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Choose position dynamically to avoid overlap and clipping
            const tagW = ctx.measureText(labelText).width + 3;
            const tagX = spike.x > cx ? spike.x - tagW - 4 : spike.x + 4;
            const tagY = spike.y > cy ? spike.y - 6 : spike.y + 6;

            // Draw a small semi-transparent black backing card to guarantee text visibility over noise grid lines
            ctx.fillStyle = 'rgba(5, 7, 12, 0.85)';
            ctx.strokeStyle = idx === 0 
              ? (isSpikeLocked ? 'rgba(74, 222, 128, 0.6)' : 'rgba(0, 229, 255, 0.6)') 
              : 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 0.5;
            ctx.fillRect(tagX - 1.5, tagY - 4, tagW, 8);
            ctx.strokeRect(tagX - 1.5, tagY - 4, tagW, 8);

            ctx.fillStyle = idx === 0 
              ? (isSpikeLocked ? '#00E5FF' : (isHighContrast ? '#ffffff' : '#00E5FF')) 
              : 'rgba(165, 243, 252, 0.9)';
            ctx.fillText(labelText, tagX, tagY);
          });
          ctx.restore();

          ctx.fillStyle = currentPeakColor;
          ctx.font = 'bold 7px monospace';
          const infoStr = `PEAK: F(${relX},${relY}) R:${fRadius}px`;

          const labelX = peakX > cx ? peakX - 92 : peakX + 11;
          const labelY = peakY > cy ? peakY - 4 : peakY + 11;

          // Semi-transparent label background to keep it highly readable over noisy FFT grids
          const numLines = isLocked ? 2 : 1;
          ctx.fillStyle = hudBg;
          ctx.fillRect(labelX - 2, labelY - 7, 86, 10 * numLines);
          
          ctx.fillStyle = currentPeakColor;
          ctx.fillText(infoStr, labelX, labelY);

          if (isLocked) {
            ctx.fillStyle = '#00E5FF'; // target-locked green color
            ctx.font = 'bold 7px monospace';
            ctx.fillText('● CARRIER LOCK', labelX, labelY + 9);
          }
          
          return {
            x: peakX,
            y: peakY,
            relX,
            relY,
            radius: fRadius,
            intensity: maxVal
          };
        }

        return {
          x: peakX,
          y: peakY,
          relX,
          relY,
          radius: fRadius,
          intensity: maxVal
        };
      }
      return null;
    } catch (e) {
      console.error('Error calculating Peak FFT Frequency:', e);
      return null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(reader.result as string);
      setSelectedPresetId('custom');
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setCustomImage(null);
    setSelectedPresetId(IMAGE_PRESETS[0].id);
    setIsWatermarked(true);
    setWatermarkStrength(3.5);
    setActiveBypass('none');
    setBypassIntensity(15);
    setViewMode('sideBySide');
    setCropPercent(0);
    setJpegQuality(100);
    setMedianSize(1);
    setBlurRadius(0);
    setBrightnessOffset(0);
    setSaltPepperFrac(0);
    setGammaVal(1.0);
    setShearAngle(0);
    setWatermarkChannel('all');
    setReferencePeak(null);
  };

  return (
    <div id="image-sandbox" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Left controls panel (Preset selector & injection strength) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        
        {/* Presets and Uploads with Frosted Glass theme */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <FileImage className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-white/90">
              Step 1: Raw Base Canvas
            </h3>
          </div>
          
          <p className="text-xs text-white/55 leading-relaxed">
            Select a neural dataset preset or upload your own image. Images automatically standardize to 256x256 for rapid, real-time pixel processing.
          </p>

          {/* Quick presets list */}
          <div className="flex flex-col gap-2.5">
            {IMAGE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setCustomImage(null);
                  setSelectedPresetId(p.id);
                }}
                className={`flex gap-3 text-left items-center p-2 rounded-lg border transition-all ${
                  selectedPresetId === p.id && !customImage
                    ? 'bg-white/10 border-cyan-500/40 text-cyan-200' 
                    : 'bg-black/30 border-white/5 hover:border-white/10 text-white/60'
                }`}
              >
                <img 
                  src={p.url} 
                  alt={p.name} 
                  onError={(e) => {
                    // Fallback on unsplash blockages
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2322d3ee"/></svg>';
                  }}
                  className="w-10 h-10 object-cover rounded" 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate">{p.name}</span>
                  <span className="text-[10px] text-white/40 truncate leading-snug">{p.description}</span>
                </div>
              </button>
            ))}

            <div className="relative mt-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed rounded-lg text-xs font-medium cursor-pointer transition ${
                  customImage 
                    ? 'bg-white/10 border-cyan-500/40 text-cyan-300' 
                    : 'bg-black/40 border-white/10 hover:bg-white/5 text-white/50'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {customImage ? 'Custom Image Loaded' : 'Upload Custom Image'}
              </button>
            </div>
          </div>
        </div>

        {/* SynthID Watermarking Module with Frosted Glass */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold tracking-wide uppercase text-white/90">
                Step 2: Inject Synthetic Watermark
              </h3>
            </div>
            
            <button
              onClick={() => setIsWatermarked(!isWatermarked)}
              className={`text-xs px-2 py-1 rounded font-bold transition ${
                isWatermarked 
                  ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.2)]' 
                  : 'bg-white/5 border border-white/10 text-white/50'
              }`}
            >
              {isWatermarked ? 'EMBEDDED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-white/55 leading-relaxed">
            The lab injects a subtle <GlossaryTerm id="steganographic-watermark">steganographic carrier</GlossaryTerm> (the same <em>family</em> of technique systems like <GlossaryTerm id="synthid">SynthID</GlossaryTerm> use). Toggle to see how an imperceptible <GlossaryTerm id="carrier">ring carrier</GlossaryTerm> is layered into RGB values.
          </p>

          <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60 font-mono">Modulation Gain (strength)</span>
              <span className="text-cyan-400 font-bold font-mono">{watermarkStrength.toFixed(1)} dB</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="9.0"
              step="0.5"
              disabled={!isWatermarked}
              aria-label="Watermark modulation gain (strength)"
              aria-valuetext={`${watermarkStrength.toFixed(1)} decibels`}
              value={watermarkStrength}
              onChange={(e) => setWatermarkStrength(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none accent-cyan-400 cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-white/30">
              <span>0.5 (Completely Invisible)</span>
              <span>9.0 (Extremely Resilient)</span>
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">stego Channel target lock</span>
            <div className="grid grid-cols-3 gap-1">
              {(['all', 'blue-green', 'blue-only'] as const).map(ch => (
                <button
                  key={ch}
                  disabled={!isWatermarked}
                  onClick={() => setWatermarkChannel(ch)}
                  className={`text-[9.5px] font-mono py-1 rounded transition border cursor-pointer disabled:opacity-30 ${
                    watermarkChannel === ch
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold shadow-[0_0_6px_rgba(0,229,255,0.15)]'
                      : 'bg-black/20 border-white/5 text-white/40 hover:text-white/70'
                  }`}
                >
                  {ch === 'all' ? 'All RGB' : ch === 'blue-green' ? 'B-G Mix' : 'B-Only'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/50 leading-relaxed">
              At standard gains under <strong className="text-white/80">4.0 dB</strong>, stego rings reside below human contrast sensitivity. They are completely invisible in standard light.
            </p>
          </div>
        </div>

        {/* Multi-Image Analyzer Trigger Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5 shadow-xl">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-white/90">
              Multi-Image Analyzer
            </h3>
          </div>
          <p className="text-xs text-white/55 leading-relaxed">
            Upload custom inputs or trace how the active bypass method generalizes across multiple distinct color distributions in a single run.
          </p>
          <button
            onClick={() => setShowBatchModal(true)}
            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-200 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.08)]"
          >
            <Table className="w-4 h-4 text-indigo-400" />
            Open Batch Performance Lab
          </button>
        </div>
      </div>

      {/* 2. Middle Column: Interactive Viewports */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        
        {/* Tab switchers styled with Glassmorphic design */}
        <div className="flex bg-white/5 backdrop-blur-md p-1 border border-white/10 rounded-xl justify-between items-center shadow-md">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('sideBySide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'sideBySide' 
                  ? 'bg-white/10 border border-white/20 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.2)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Before & After
            </button>

            <button
              onClick={() => setViewMode('pattern')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'pattern' 
                  ? 'bg-white/10 border border-white/20 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.2)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Stego Extract (35x)
            </button>

            <button
              onClick={() => setViewMode('fft')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'fft' 
                  ? 'bg-white/10 border border-white/20 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.2)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              FFT Frequency
            </button>
          </div>

          <button
            onClick={handleReset}
            title="Reset to defaults"
            className="p-1 px-2.5 hover:bg-white/10 rounded-lg border border-white/10 text-white/60 hover:text-white text-xs flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Dynamic Display Stage with glass panels */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[360px] relative shadow-xl overflow-hidden">
          
          {/* Helper canvases hidden in layout to feed pixels */}
          <div className="hidden">
            <canvas ref={sourceCanvasRef} role="img" aria-label="Source image preview (256x256)" />
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'sideBySide' && (
              <motion.div
                key="sideBySide"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4 w-full items-center py-1"
              >
                {/* Visual View Switcher (Grid vs. Draggable Slider) */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-[10px] uppercase font-bold tracking-wider gap-1 select-none self-center shadow-inner">
                  <button
                    onClick={() => setComparisonType('grid')}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      comparisonType === 'grid' 
                        ? 'bg-white/10 border border-white/20 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.2)]' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Grid className="w-3 h-3 text-cyan-400" />
                    Grid view
                  </button>
                  <button
                    onClick={() => setComparisonType('slider')}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      comparisonType === 'slider' 
                        ? 'bg-white/10 border border-white/20 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.2)]' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                    Split slider
                  </button>
                </div>

                {comparisonType === 'grid' ? (
                  <div className="flex flex-col sm:flex-row gap-5 w-full justify-center text-center py-2 animate-fadeIn">
                    {/* Before Viewport */}
                    <div className="flex flex-col gap-2 items-center flex-1">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
                        Original Image
                      </div>
                      <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 aspect-square w-full max-w-[190px]">
                        <img 
                          src={customImage || IMAGE_PRESETS.find(p => p.id === selectedPresetId)?.url || IMAGE_PRESETS[0].url} 
                          alt="Original" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] text-white/30 font-mono">No Watermark</span>
                    </div>

                    {/* Simulated Stego Output Viewport */}
                    <div className="flex flex-col gap-2 items-center flex-1">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-400 flex items-center gap-1">
                        Processed Output
                        {isProcessing && <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                      </div>
                      
                      <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 aspect-square w-full max-w-[190px]">
                        <canvas ref={processedCanvasRef} role="img" aria-label="Processed image after the selected perturbation" className="w-full h-full block" />
                        
                        {/* Live Scanner Sweep effect if scanner is fully engaged */}
                        {isWatermarked && (
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-t from-cyan-400/80 to-transparent shadow-lg shadow-cyan-500/50 animate-bounce pointer-events-none" style={{ animationDuration: '3s' }} />
                        )}
                      </div>
                      <span className="text-[10px] text-white/50 font-mono">
                        {activeBypass === 'none' 
                          ? isWatermarked ? 'Watermark Active' : 'Unmodified'
                          : `Perturbed via ${BYPASS_METHODS.find(m => m.id === activeBypass)?.name}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Draggable Slider Reveal View under #image-sandbox container */
                  <div className="flex flex-col items-center gap-3 w-full max-w-[280px] py-1">
                    <div 
                      ref={containerRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      id="image-sandbox-slider"
                      className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/15 bg-[#080b11] shadow-2xl select-none cursor-ew-resize touch-none group"
                    >
                      {/* Underlay (Right Side / Full Canvas): Stego Output */}
                      <div className="absolute inset-0 w-full h-full">
                        <canvas ref={processedCanvasRef} role="img" aria-label="Processed image after the selected perturbation" className="w-full h-full block" />
                      </div>

                      {/* Overlay (Left Side / Clipped Image): Original Image */}
                      <div className="absolute inset-0 w-full h-full pointer-events-none">
                        <img 
                          src={customImage || IMAGE_PRESETS.find(p => p.id === selectedPresetId)?.url || IMAGE_PRESETS[0].url} 
                          alt="Original" 
                          className="w-full h-full object-cover"
                          style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                        />
                      </div>

                      {/* Labels for Left/Right sides */}
                      <div className="absolute bottom-3 left-3 bg-black/75 px-2 py-0.5 rounded text-[8px] font-bold text-white/70 uppercase tracking-widest pointer-events-none select-none border border-white/5 shadow-md">
                        Original
                      </div>
                      <div className="absolute bottom-3 right-3 bg-cyan-950/80 px-2 py-0.5 rounded text-[8px] font-bold text-cyan-300 uppercase tracking-widest pointer-events-none select-none border border-cyan-500/10 shadow-md">
                        Marked
                      </div>

                      {/* Continuous scanning beam on the Stego side */}
                      {isWatermarked && (
                        <div 
                          className="absolute top-0 right-0 h-0.5 bg-gradient-to-t from-cyan-400/80 to-transparent shadow-lg shadow-cyan-500/50 animate-bounce pointer-events-none" 
                          style={{ 
                            animationDuration: '3.5s',
                            left: `${sliderPosition}%`
                          }} 
                        />
                      )}

                      {/* Vertical Divider Slider Line */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400/80 shadow-[0_0_10px_rgba(0,229,255,0.5)] flex items-center justify-center pointer-events-none"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        {/* Interactive Handle Knob */}
                        <div className="w-8 h-8 rounded-full bg-[#0a0d14] border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)] group-hover:scale-110 active:scale-125 transition-transform text-[10px] font-bold select-none">
                          ↔
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-white/50 font-mono text-center flex flex-col gap-0.5">
                      <span className="text-white/40 uppercase tracking-wider text-[9px]">Drag slider to compare</span>
                      <span>
                        {activeBypass === 'none' 
                          ? isWatermarked ? 'Watermarked Output' : 'Watermark Off / Clear'
                          : `Perturbed (${BYPASS_METHODS.find(m => m.id === activeBypass)?.name})`}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {viewMode === 'pattern' && (
              <motion.div
                key="pattern"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col items-center justify-center gap-4 text-center py-2 w-full"
              >
                <div className="flex flex-col gap-1 items-center max-w-sm">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-400">
                    Extracted Differential Stego Pattern (35x amplified)
                  </div>
                  <p className="text-[10px] text-white/50 leading-snug">
                    By computing the exact pixel variance between the original and modified arrays, we expose the synthetic carrier&apos;s hidden concentric halos.
                  </p>
                </div>
                
                <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 aspect-square w-48 shadow-lg shadow-cyan-950/20">
                  <canvas ref={patternCanvasRef} role="img" aria-label="Amplified difference view revealing the synthetic watermark carrier rings" className="w-full h-full block" />
                </div>
                
                <div className="text-[10px] font-mono text-white/50 max-w-sm leading-relaxed px-4">
                  {isWatermarked ? (
                    activeBypass === 'none' ? (
                      <span className="text-cyan-400">✔ Carrier rings fully coherent — the kind of concentric band a <GlossaryTerm id="detection-confidence">keyed detector</GlossaryTerm> would correlate against.</span>
                    ) : (
                      <span className="text-pink-400">⚠ Perturbed/Bypassed: The concentric rings show extreme disruption, phase shifting, or complete signal loss.</span>
                    )
                  ) : (
                    <span className="text-white/30">No Watermark: Zero carrier values detected.</span>
                  )}
                </div>
              </motion.div>
            )}

            {viewMode === 'fft' && (
              <motion.div
                key="fft"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col items-center justify-center gap-4 text-center py-2 w-full"
              >
                <div className="flex flex-col gap-1 items-center max-w-sm">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-400">
                    2D FFT Power Spectrum (Frequency Coefficients)
                  </div>
                  <p className="text-[10px] text-white/50 leading-snug">
                    Radial coefficients represent structural angles. Stego stego carriers show up as a bright concentric ring boundary.
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-lg">
                  {/* FFT Canvas container */}
                  <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 aspect-square w-40 select-none">
                    <canvas
                      ref={fftCanvasRef}
                      data-ref="fftCanvasRef"
                      role="img"
                      aria-label="Frequency-domain (FFT) magnitude view; the carrier appears as a ring near radius 42 pixels"
                      className="w-full h-full block cursor-crosshair"
                      onMouseMove={handleFftMouseMove}
                      onMouseLeave={handleFftMouseLeave}
                      onWheel={(e) => {
                        e.preventDefault();
                        const isZoomIn = e.deltaY < 0;
                        const nextZoom = isZoomIn ? Math.min(4.0, fftZoom + 0.15) : Math.max(1.0, fftZoom - 0.15);
                        setFftZoom(parseFloat(nextZoom.toFixed(2)));
                      }}
                    />
                    
                    {/* Floating Toggle Button for Legend Key */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFftLegend(!showFftLegend);
                      }}
                      type="button"
                      className="absolute top-1 left-1 bg-black/85 hover:bg-cyan-950/90 border border-white/10 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 px-1 py-0.5 rounded-[5px] text-[7.5px] font-mono font-bold transition flex items-center gap-1 cursor-pointer shadow-md select-none z-20"
                      title="Toggle Canvas Feature Legend"
                    >
                      <HelpCircle className="w-2.5 h-2.5 text-cyan-400" />
                      Key
                    </button>

                    {/* Floating Toggle Button for High-Contrast Mode */}
                    <button
                      id="fft-high-contrast-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFftHighContrast(prev => !prev);
                      }}
                      type="button"
                      className={`absolute top-1 right-1 bg-black/85 hover:bg-cyan-950/90 border px-1 py-0.5 rounded-[5px] text-[7.5px] font-mono font-bold transition flex items-center gap-1 cursor-pointer shadow-md select-none z-20 ${
                        fftHighContrast 
                          ? 'border-white text-white hover:text-white/80' 
                          : 'border-white/10 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200'
                      }`}
                      title="Toggle High-Contrast Stark W/B mode"
                    >
                      <Contrast className="w-2.5 h-2.5 text-cyan-400" />
                      {fftHighContrast ? 'Stark' : 'Teal'}
                    </button>

                    <AnimatePresence>
                      {showFftLegend && (
                        <motion.div
                          key="fft-feature-legend"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0 bg-black/95 p-2.5 flex flex-col justify-between z-20 select-none border border-cyan-500/30 rounded-xl"
                        >
                          <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-0.5">
                            <span className="font-extrabold tracking-wider text-[8px] uppercase text-cyan-400 font-mono">Spectrum Legend</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowFftLegend(false);
                              }}
                              className="text-white/40 hover:text-white hover:bg-white/10 text-[9px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded transition cursor-pointer"
                              title="Hide Legend"
                            >
                              ×
                            </button>
                          </div>

                          <div className="flex flex-col gap-1.5 flex-grow justify-center">
                            {/* Peak Marker */}
                            <div 
                              onMouseEnter={() => setActiveLegendHighlight('peak')}
                              onMouseLeave={() => setActiveLegendHighlight(null)}
                              className="flex gap-1.5 items-start cursor-help group transition-colors duration-150"
                            >
                              <div className="w-2 h-2 rounded-full bg-cyan-400 border border-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.8)] mt-0.5 shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="text-[8px] font-bold text-white/95 group-hover:text-cyan-300">Peak Marker (Cyan Key)</span>
                                <span className="text-[7px] text-white/50 leading-tight">Detected carrier signal spikes of the synthetic watermark.</span>
                              </div>
                            </div>

                            {/* Grid Zones */}
                            <div 
                              onMouseEnter={() => setActiveLegendHighlight('zone')}
                              onMouseLeave={() => setActiveLegendHighlight(null)}
                              className="flex gap-1.5 items-start cursor-help group transition-colors duration-150"
                            >
                              <div className="w-2 h-2 rounded-full border border-dashed border-cyan-400 grid place-items-center mt-0.5 shrink-0">
                                <span className="text-[5px] text-cyan-400 font-bold leading-none">R</span>
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-[8px] font-bold text-white/95 group-hover:text-cyan-300">Grid Zones (Teal Ring)</span>
                                <span className="text-[7px] text-white/50 leading-tight">Dynamic radial distance scale offsets (R) in pixel steps.</span>
                              </div>
                            </div>

                            {/* Carrier Drift */}
                            <div 
                              onMouseEnter={() => setActiveLegendHighlight('drift')}
                              onMouseLeave={() => setActiveLegendHighlight(null)}
                              className="flex gap-1.5 items-start cursor-help group transition-colors duration-150"
                            >
                              <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.8)] mt-0.5 shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="text-[8px] font-bold text-white/95 group-hover:text-pink-300">Carrier Drift (Pink Trail)</span>
                                <span className="text-[7px] text-white/50 leading-tight">Traces coordinate fluctuations indicating drift.</span>
                              </div>
                            </div>

                            {/* Reference Deviation */}
                            <div 
                              className="flex gap-1.5 items-start cursor-help group transition-colors duration-150"
                            >
                              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] mt-0.5 shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="text-[8px] font-bold text-white/95 group-hover:text-amber-300">Reference Peak (Amber Marker)</span>
                                <span className="text-[7px] text-white/50 leading-tight block">Locks reference snapshots with vector deviation (Δf) lines.</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[6.5px] text-center font-mono text-cyan-400/50 uppercase tracking-widest leading-none">
                            Hover items to isolate on HUD
                          </div>
                        </motion.div>
                      )}

                      {isHoveringPeak && fftPeak && !showFftLegend && (
                        <motion.div
                          key="fft-hover-metric"
                          initial={{ opacity: 0, scale: 0.88, y: fftPeak.y < 50 ? 5 : -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.88, y: fftPeak.y < 50 ? 5 : -5 }}
                          transition={{ duration: 0.12 }}
                          className={`absolute pointer-events-none bg-black/95 border rounded-lg p-2.5 z-30 flex flex-col gap-0.5 text-left text-[9px] font-mono min-w-[130px] ${
                            fftHighContrast 
                              ? 'border-white/80 shadow-[0_4px_16px_rgba(255,255,255,0.25)] text-white' 
                              : 'border-cyan-400/60 shadow-[0_4px_16px_rgba(0,229,255,0.3)] text-cyan-300'
                          }`}
                          style={{
                            left: `${Math.max(68, Math.min(160 - 68, fftPeak.x))}px`,
                            top: `${fftPeak.y < 50 ? fftPeak.y + 14 : fftPeak.y - 12}px`,
                            transform: fftPeak.y < 50 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                          }}
                        >
                          {/* Floating Popover Pointer Arrow */}
                          <div 
                            className={`absolute w-1.5 h-1.5 rotate-45 bg-black ${
                              fftPeak.y < 50 
                                ? '-top-[3.5px] border-t border-l left-1/2 -translate-x-1/2' 
                                : '-bottom-[3.5px] border-b border-r left-1/2 -translate-x-1/2'
                            } ${
                              fftHighContrast ? 'border-white/80' : 'border-cyan-400/60'
                            }`} 
                          />

                          <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
                            <span className="font-bold tracking-wider text-[8px] uppercase">FFT PEAK METRIC</span>
                            <span className="relative flex h-1.5 w-1.5">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${fftHighContrast ? 'bg-white' : 'bg-cyan-400'}`}></span>
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${fftHighContrast ? 'bg-white' : 'bg-cyan-400'}`}></span>
                            </span>
                          </div>

                          <div className="flex justify-between gap-2.5">
                            <span className="text-white/40"><GlossaryTerm id="fft">Frequency</GlossaryTerm> (F):</span>
                            <span className="text-white font-bold select-all">({Math.round(fftPeak.relX / fftZoom)}, {Math.round(fftPeak.relY / fftZoom)})</span>
                          </div>

                          <div className="flex justify-between gap-2.5">
                            <span className="text-white/40">Distance (R):</span>
                            <span className="text-cyan-400 font-bold select-all">{Math.round(fftPeak.radius / fftZoom)}px</span>
                          </div>

                          {fftZoom > 1.0 && (
                            <div className="flex justify-between gap-2.5 text-[8px] border-t border-white/5 pt-0.5 mt-0.5">
                              <span className="text-white/30">Zoom Magnified:</span>
                              <span className="text-yellow-400 font-medium">({fftPeak.relX}, {fftPeak.relY}) R:{fftPeak.radius}</span>
                            </div>
                          )}

                          <div className="flex justify-between gap-2.5 border-t border-white/5 pt-0.5 mt-0.5">
                            <span className="text-white/40">State:</span>
                            <span className={`font-bold uppercase text-[8px] ${
                              Math.abs(Math.round(fftPeak.radius / fftZoom) - 42) <= 1
                                ? 'text-green-400 animate-pulse font-extrabold'
                                : (Math.abs(Math.round(fftPeak.radius / fftZoom) - 42) <= 1.5 && isWatermarked && activeBypass === 'none'
                                  ? 'text-red-400 animate-pulse'
                                  : 'text-white/60')
                            }`}>
                              {Math.abs(Math.round(fftPeak.radius / fftZoom) - 42) <= 1
                                ? 'Carrier Lock'
                                : (Math.abs(Math.round(fftPeak.radius / fftZoom) - 42) <= 1.5 && isWatermarked && activeBypass === 'none'
                                  ? 'Carrier Match'
                                  : 'Peak Noise')}
                            </span>
                          </div>

                          <div className="flex justify-between gap-2.5 border-t border-white/5 pt-0.5 mt-0.5">
                            <span className="text-white/40">Amplitude:</span>
                            <span className="text-white font-bold">{Math.round(fftPeak.intensity)}%</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Floating Save Coordinates button directly on the canvas container */}
                    <button
                      id="save-coordinates-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportFftPeakData('json');
                      }}
                      type="button"
                      className="absolute bottom-1 right-1 bg-black/85 hover:bg-cyan-950/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 px-1.5 py-0.5 rounded-[5px] text-[7px] font-mono font-bold transition flex items-center gap-1 cursor-pointer shadow-md select-none z-20"
                      title="Save frequency peak coordinates to JSON"
                    >
                      <Download className="w-2.5 h-2.5 text-cyan-400" />
                      Save Coordinates
                    </button>
                  </div>

                  {/* Frequency Domain Intensity Histogram */}
                  <div id="fft-intensity-histogram" className="relative border border-white/10 rounded-xl bg-[#080d16]/85 aspect-square w-40 p-2.5 select-none flex flex-col justify-between shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-0.5 font-mono">
                      <span className="font-extrabold tracking-wider text-[7.5px] uppercase text-cyan-400">Intensity Distribution</span>
                      <span className="text-[6.5px] font-bold text-white/30 tracking-widest animate-pulse">RAPS PLOT</span>
                    </div>

                    <div className="relative flex-grow h-24 my-1 bg-black/45 border border-white/5 rounded-lg overflow-hidden">
                      <canvas ref={fftHistogramRef} role="img" aria-label="FFT radial power histogram across frequency bands" className="w-full h-full block" />
                    </div>

                    <div className="flex justify-between items-center text-[7.5px] font-mono text-white/50 px-0.5 pt-1.5 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                        <span className="text-white/65">Original</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></span>
                        <span className="text-white/65">Perturbed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Frequency Drift History Chart */}
                <div id="fft-drift-history" className="flex flex-col gap-2 w-[280px] bg-[#0c101b] border border-white/10 rounded-2xl p-3.5 shadow-xl select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                      </div>
                      <span className="text-[10px] font-bold tracking-wide text-white/95 flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-cyan-400" />
                        Frequency Drift History (10s)
                      </span>
                    </div>
                    {driftHistory.length > 0 && fftPeakRef.current && (
                      <div className="text-[8px] font-mono font-bold bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 px-1.5 py-0.5 rounded-md">
                        R: {Math.round((fftPeakRef.current?.radius ?? 0) / fftZoom)}px
                      </div>
                    )}
                  </div>

                  <div className="h-20 w-full relative bg-black/60 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
                    {driftHistory.length < 2 ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-mono text-cyan-300/40 animate-pulse font-semibold">SYNCHRONIZING WITH FFT DETECTOR...</span>
                        <span className="text-[7px] text-white/20 uppercase font-mono tracking-widest">Awaiting carrier pulse stream</span>
                      </div>
                    ) : (
                      <svg className="w-full h-full p-2 block overflow-visible select-none">
                        <defs>
                          <linearGradient id="driftGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Reference lines (ideal SynthID carrier coordinate R=40px) */}
                        <line 
                          x1="0" 
                          y1={Math.round(48 - (42 / 80) * 44)} 
                          x2="100%" 
                          y2={Math.round(48 - (42 / 80) * 44)} 
                          stroke="rgba(239, 68, 68, 0.2)" 
                          strokeDasharray="3,3" 
                        />
                        <text 
                          x="5" 
                          y={Math.round(52 - (42 / 80) * 44)} 
                          fill="rgba(239, 68, 68, 0.45)" 
                          className="text-[6px] font-mono uppercase"
                        >
                          Target Carrier R:42px
                        </text>

                        {/* Sparkline grid markers */}
                        <line x1="0" y1="10" x2="100%" y2="10" stroke="rgba(255,255,255,0.03)" strokeDasharray="1,2" />
                        <line x1="0" y1="30" x2="100%" y2="30" stroke="rgba(255,255,255,0.03)" strokeDasharray="1,2" />
                        <line x1="0" y1="50" x2="100%" y2="50" stroke="rgba(255,255,255,0.03)" strokeDasharray="1,2" />

                        {/* Filled area underneath path */}
                        <path
                          fill="url(#driftGrad)"
                          d={`
                            M 0,60
                            L ${driftHistory.map((pt, idx) => {
                              const x = (idx / (driftHistory.length - 1)) * 248;
                              const maxRadius = 80;
                              const y = 56 - (Math.min(maxRadius, pt.radius) / maxRadius) * 48;
                              return `${x},${y}`;
                            }).join(' ')}
                            L 248,60 Z
                          `}
                        />

                        {/* Radius sparkline trace */}
                        <polyline
                          fill="none"
                          stroke="#00E5FF"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={driftHistory.map((pt, idx) => {
                            const x = (idx / (driftHistory.length - 1)) * 248;
                            const maxRadius = 80;
                            const y = 56 - (Math.min(maxRadius, pt.radius) / maxRadius) * 48;
                            return `${x},${y}`;
                          }).join(' ')}
                        />

                        {/* Highlight nodes */}
                        {driftHistory.map((pt, idx) => {
                          const isLast = idx === driftHistory.length - 1;
                          if (isLast || idx % 4 === 0) {
                            const x = (idx / (driftHistory.length - 1)) * 248;
                            const maxRadius = 80;
                            const y = 56 - (Math.min(maxRadius, pt.radius) / maxRadius) * 48;
                            return (
                              <g key={idx} className="cursor-pointer">
                                <circle 
                                  cx={x} 
                                  cy={y} 
                                  r={isLast ? "4" : "2"} 
                                  fill={isLast ? "#FF4A2E" : "#00E5FF"} 
                                  className={isLast ? "animate-pulse" : ""} 
                                />
                                <circle cx={x} cy={y} r={isLast ? "1.5" : "0.8"} fill="#ffffff" />
                                {isLast && (
                                  <text 
                                    x={x - 12} 
                                    y={y - 8} 
                                    fill="#00E5FF" 
                                    className="text-[7.5px] font-mono font-bold select-none drop-shadow-md"
                                  >
                                    Live R:{pt.radius}px
                                  </text>
                                )}
                              </g>
                            );
                          }
                          return null;
                        })}
                      </svg>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[7.5px] text-white/35 font-mono">
                    <span>-10.0s (Past)</span>
                    <span className="uppercase tracking-wide text-[7px] text-white/20">Frequency Carrier Offset Metrics (R)</span>
                    <span className="text-cyan-400 font-bold uppercase animate-pulse">0.0s (Live)</span>
                  </div>
                </div>

                {/* Academic Spectral Controls Panel */}
                <div id="fft-academic-controls" className="flex flex-col gap-3 w-content bg-[#0e1320] border border-white/10 rounded-2xl p-4 shadow-xl min-w-[280px] select-none">
                  {/* Top segment: Spectral Style and Reset controls */}
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Visualizer Mode</span>
                      <span className="text-[10px] font-bold text-white/90">Style Contrast</span>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={() => setFftHighContrast(!fftHighContrast)}
                        type="button"
                        className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          fftHighContrast 
                            ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] font-black' 
                            : 'bg-white/10 border border-white/10 text-cyan-300 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        {fftHighContrast ? 'Stark W/B' : 'Default Teal'}
                      </button>
                      <span className="pointer-events-none absolute bottom-[115%] right-0 w-52 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#070a13] border border-cyan-500/40 text-cyan-100/90 p-2 rounded-lg text-[8px] font-mono leading-normal shadow-[0_4px_16px_rgba(0,0,0,0.8)] z-50 text-center leading-relaxed">
                        <strong className="text-cyan-400 block mb-0.5 uppercase tracking-wide text-[7.5px] border-b border-white/10 pb-0.5">Style Contrast Impact</strong>
                        Stark mode strips away secondary chromatic glare, isolating highly-localized carrier magnitude coordinates from ambient low-frequency spectral noise.
                      </span>
                    </div>
                  </div>

                  {/* Drift Tracking: Show Drift Trail toggler */}
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Drift Tracking</span>
                      <span className="text-[10px] font-bold text-white/90">Show Drift Trail</span>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={() => setPeakPersistence(!peakPersistence)}
                        type="button"
                        className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          peakPersistence 
                            ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.4)] font-black animate-pulse' 
                            : 'bg-white/10 border border-white/10 text-cyan-300 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        {peakPersistence ? 'Enabled' : 'Disabled'}
                      </button>
                      <span className="pointer-events-none absolute bottom-[115%] right-0 w-52 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#070a13] border border-cyan-500/40 text-cyan-100/90 p-2 rounded-lg text-[8px] font-mono leading-normal shadow-[0_4px_16px_rgba(0,0,0,0.8)] z-50 text-center leading-relaxed">
                        <strong className="text-cyan-400 block mb-0.5 uppercase tracking-wide text-[7.5px] border-b border-white/10 pb-0.5">Drift Trail Impact</strong>
                        Maintains a decaying visual persistence of historical peak coordinates. Exposes carrier drift velocity and frequency tracking vectors under active attacks.
                      </span>
                    </div>
                  </div>

                  {/* Peak Comparison / Deviation Tracking */}
                  <div className="flex flex-col gap-2 border-b border-white/5 pb-2.5 text-left">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-white/40 font-mono">Reference Comparison</span>
                        <span className="text-[10px] font-bold text-white/95">Peak Reference Lock</span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <div className="relative group">
                          <button
                            onClick={() => {
                              const current = fftPeakRef.current;
                              if (current) {
                                setReferencePeak({ ...current });
                              }
                            }}
                            disabled={!fftPeakRef.current}
                            type="button"
                            className={`text-[8.5px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg transition-all border cursor-pointer flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed ${
                              referencePeak 
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] font-black' 
                                : 'bg-white/5 border-white/10 text-cyan-300 hover:text-white hover:bg-white/15'
                            }`}
                            title={fftPeakRef.current ? "Capture the current coordinates & intensity as a reference marker" : "No carrier peak detected to use as reference"}
                          >
                            <Pin className={`w-2.5 h-2.5 ${referencePeak ? 'text-amber-300' : 'text-cyan-400'}`} />
                            {referencePeak ? 'Lock New' : 'Compare Peaks'}
                          </button>
                          <span className="pointer-events-none absolute bottom-[115%] right-0 w-52 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#070a13] border border-cyan-500/40 text-cyan-100/90 p-2 rounded-lg text-[8px] font-mono leading-normal shadow-[0_4px_16px_rgba(0,0,0,0.8)] z-50 text-center leading-relaxed">
                            <strong className="text-cyan-400 block mb-0.5 uppercase tracking-wide text-[7.5px] border-b border-white/10 pb-0.5">Reference Pin Impact</strong>
                            Captures baseline carrier state vectors, computing real-time coordinate offset delta-f (Δf) to quantify active carrier evasion or stego shift under attacks.
                          </span>
                        </div>
                        {referencePeak && (
                          <button
                            onClick={() => setReferencePeak(null)}
                            type="button"
                            className="text-[8.5px] font-bold tracking-wider uppercase px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/25 rounded-lg transition cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    {referencePeak ? (
                      <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-2.5 flex flex-col gap-1.5 font-mono text-[8.5px] text-amber-200">
                        <div className="flex justify-between items-center text-amber-400/90 font-bold uppercase tracking-widest text-[7.5px]">
                          <span>Reference Snapshot</span>
                          <span className="text-[6.5px] bg-amber-500/15 text-amber-300 px-1 py-0.2 rounded font-extrabold uppercase animate-pulse border border-amber-500/20">LOCKED</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-white/60">
                          <div>F-Vector: <span className="text-amber-300 font-bold">{referencePeak.relX > 0 ? '+' : ''}{referencePeak.relX}, {referencePeak.relY > 0 ? '+' : ''}{referencePeak.relY}</span></div>
                          <div>Radius: <span className="text-amber-300 font-bold">{referencePeak.radius}px</span></div>
                          <div>Intensity: <span className="text-amber-300 font-bold">{referencePeak.intensity.toFixed(1)}</span></div>
                          <div>Deviation: <span className="text-cyan-300 font-extrabold shadow-cyan-300">
                            {(() => {
                              const active = fftPeakRef.current;
                              if (active) {
                                const d = Math.round(Math.hypot(active.relX - referencePeak.relX, active.relY - referencePeak.relY));
                                return `${d}px`;
                              }
                              return 'N/A';
                            })()}
                          </span></div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[8.5px] text-white/45 leading-relaxed font-sans block text-left">
                        Lock the current frequency carrier peak to visualize drift and coordinate delta variations over time.
                      </span>
                    )}
                  </div>

                  {/* High-Pass Filter Toggle */}
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Noise Isolation</span>
                      <span className="text-[10px] font-bold text-white/95">High-Pass Filter</span>
                    </div>
                    <div className="relative group">
                      <button
                        id="fft-high-pass-toggle"
                        onClick={() => setFftHighPass(!fftHighPass)}
                        type="button"
                        className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          fftHighPass 
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] font-black animate-pulse' 
                            : 'bg-white/10 border border-white/10 text-cyan-300 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        {fftHighPass ? 'Active' : 'Bypass'}
                      </button>
                      <span className="pointer-events-none absolute bottom-[115%] right-0 w-52 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#070a13] border border-cyan-500/40 text-cyan-100/90 p-2 rounded-lg text-[8px] font-mono leading-normal shadow-[0_4px_16px_rgba(0,0,0,0.8)] z-50 text-center leading-relaxed">
                        <strong className="text-cyan-400 block mb-0.5 uppercase tracking-wide text-[7.5px] border-b border-white/10 pb-0.5">High-Pass Filter Impact</strong>
                        Suppresses the overpowering central DC components (low-frequency content), immediately isolating high-frequency stencoded signatures for highly accurate peak tracking.
                      </span>
                    </div>
                  </div>

                  {/* Spectral Rotation Slider */}
                  <div className="flex flex-col gap-1.5 border-b border-white/5 pb-2.5">
                    <div className="flex items-center justify-between text-left">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Geometric alignment</span>
                        <span className="text-[10px] font-bold text-white/95">Spectral Rotation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold font-mono text-cyan-400">{fftRotation}°</span>
                        {fftRotation !== 0 && (
                          <button
                            onClick={() => setFftRotation(0)}
                            className="text-[7.5px] uppercase font-bold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.5 rounded transition text-cyan-300 hover:text-white cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      id="fft-rotation-slider"
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      aria-label="FFT spectrum rotation"
                      aria-valuetext={`${fftRotation} degrees`}
                      value={fftRotation}
                      onChange={(e) => setFftRotation(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 outline-none"
                    />
                  </div>

                  {/* Intensity Map Mode Selector */}
                  <div className="flex flex-col gap-1.5 border-b border-white/5 pb-2.5">
                    <div className="flex items-center justify-between text-left">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Color Rendering</span>
                        <span className="text-[10px] font-bold text-white/95">Intensity Map</span>
                      </div>
                    </div>
                    <div className="flex gap-1 w-full bg-white/5 p-1 rounded-lg">
                      {(['off', 'viridis', 'inferno', 'magma', 'plasma'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setFftIntensityMap(mode)}
                          className={`flex-1 text-[7.5px] font-bold uppercase py-1 px-0.5 rounded transition-all cursor-pointer text-center ${
                            fftIntensityMap === mode
                              ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,229,255,0.4)] font-extrabold'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overlay Opacity Controls */}
                  <div className="flex flex-col gap-1.5 border-b border-white/5 pb-2.5">
                    <div className="flex items-center justify-between text-left">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Visualizer HUD</span>
                        <span className="text-[10px] font-bold text-white/90">Overlay Opacity</span>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-cyan-400">{(fftOverlayOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.00"
                      step="0.05"
                      aria-label="FFT overlay opacity"
                      aria-valuetext={`${Math.round(fftOverlayOpacity * 100)} percent`}
                      value={fftOverlayOpacity}
                      onChange={(e) => setFftOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 outline-none"
                    />
                  </div>

                  {/* Middle segment: Zoom controls with mousewheel hint */}
                  <div className="flex flex-col gap-1.5 border-b border-white/5 pb-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Spectral Zoom</span>
                        <span className="text-[10px] font-bold font-mono text-cyan-400">Factor: {fftZoom.toFixed(2)}x</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setFftZoom(prev => Math.max(1.0, parseFloat((prev - 0.20).toFixed(2))))}
                          disabled={fftZoom <= 1.0}
                          className="bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 p-1 rounded transition text-white hover:text-cyan-300 disabled:pointer-events-none cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFftZoom(prev => Math.min(4.0, parseFloat((prev + 0.20).toFixed(2))))}
                          disabled={fftZoom >= 4.0}
                          className="bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 p-1 rounded transition text-white hover:text-cyan-300 disabled:pointer-events-none cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        {fftZoom > 1.0 && (
                          <button
                            onClick={() => setFftZoom(1.0)}
                            className="text-[8px] uppercase font-bold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-1 rounded transition text-cyan-300 hover:text-white cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    <span className="text-[8px] font-mono text-white/30 text-left">💡 Hint: Scroll mousewheel directly over spectrum to zoom</span>
                  </div>

                  {/* Interactive HUD Legend Key Segment */}
                  <div className="flex flex-col gap-2 border-t border-white/5 pt-2.5">
                    <div className="flex items-center justify-between text-left">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-white/40">Interactive Canvas Legend</span>
                        <span className="text-[10px] font-bold text-white/95">Hover/Click to highlight HUD features</span>
                      </div>
                      <HelpCircle className="w-3.5 h-3.5 text-white/30 cursor-help" title="These components are rendered dynamically onto the frequency spectrum canvas during analysis" />
                    </div>

                    <div className="flex flex-col gap-1.5 mt-0.5">
                      {/* Legend Item 1: Detected Peak Markers */}
                      <div
                        onMouseEnter={() => setActiveLegendHighlight('peak')}
                        onMouseLeave={() => setActiveLegendHighlight(null)}
                        onClick={() => setActiveLegendHighlight(prev => prev === 'peak' ? null : 'peak')}
                        className={`flex flex-col text-left p-2 rounded-xl transition cursor-pointer select-none border ${
                          activeLegendHighlight === 'peak'
                            ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_8px_rgba(0,229,255,0.15)] text-white'
                            : 'bg-white/5 border-transparent hover:border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                        title="Interact to isolate peak locking indicators"
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                            </span>
                            <span className="text-[9px] font-bold font-mono">1. Detected Peak Markers</span>
                          </div>
                          <span className="text-[7.5px] font-mono px-1 py-0.2 bg-cyan-400/10 text-cyan-300 rounded border border-cyan-400/20 font-bold">F(x,y)</span>
                        </div>
                        <p className="text-[8px] text-white/50 mt-1 leading-normal">
                          {activeLegendHighlight === 'peak' 
                            ? 'High-intensity coefficient spikes outside the central DC core. Lock a spinning target crosshair, pulsating concentric rings and precise coordinate info-box overlays.'
                            : 'Identifies and locks onto the absolute highest frequency watermark carrier coefficient.'}
                        </p>
                      </div>

                      {/* Legend Item 2: Radial Intensity Zones */}
                      <div
                        onMouseEnter={() => setActiveLegendHighlight('zone')}
                        onMouseLeave={() => setActiveLegendHighlight(null)}
                        onClick={() => setActiveLegendHighlight(prev => prev === 'zone' ? null : 'zone')}
                        className={`flex flex-col text-left p-2 rounded-xl transition cursor-pointer select-none border ${
                          activeLegendHighlight === 'zone'
                            ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_8px_rgba(0,229,255,0.15)] text-white'
                            : 'bg-white/5 border-transparent hover:border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                        title="Interact to illuminate concentric grid rings and radial units"
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full border border-dashed border-cyan-300"></span>
                            <span className="text-[9px] font-bold font-mono">2. Radial Intensity Zones</span>
                          </div>
                          <span className="text-[7.5px] font-mono px-1 py-0.2 bg-cyan-500/10 text-cyan-300 rounded border border-cyan-300/20 font-bold">R: [Radius]</span>
                        </div>
                        <p className="text-[8px] text-white/50 mt-1 leading-normal">
                          {activeLegendHighlight === 'zone'
                            ? 'Concentric grids measuring the synthetic carrier band (ideal at R ≈ 42px). Highlights exact frequency distances with dynamic scaling labels.'
                            : 'Polar projection grid lines mapping coordinate radius offsets (R) in pixel lengths.'}
                        </p>
                      </div>

                      {/* Legend Item 3: Carrier Drift & Trail */}
                      <div
                        onMouseEnter={() => setActiveLegendHighlight('drift')}
                        onMouseLeave={() => setActiveLegendHighlight(null)}
                        onClick={() => setActiveLegendHighlight(prev => prev === 'drift' ? null : 'drift')}
                        className={`flex flex-col text-left p-2 rounded-xl transition cursor-pointer select-none border ${
                          activeLegendHighlight === 'drift'
                            ? 'bg-pink-500/10 border-pink-400/50 shadow-[0_0_8px_rgba(244,63,94,0.15)] text-white'
                            : 'bg-white/5 border-transparent hover:border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                        title="Interact to track frequency coordinate variations over time"
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex gap-0.5 items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                              <span className="w-1 h-1 rounded-full bg-pink-500/60 font-black"></span>
                              <span className="w-0.5 h-0.5 rounded-full bg-pink-500/20"></span>
                            </span>
                            <span className="text-[9px] font-bold font-mono">3. Carrier Drift / Trail</span>
                          </div>
                          <span className="text-[7.5px] font-mono px-1 py-0.2 bg-pink-500/10 text-pink-300 rounded border border-pink-400/20 font-bold">Trail</span>
                        </div>
                        <p className="text-[8px] text-white/50 mt-1 leading-normal">
                          {activeLegendHighlight === 'drift'
                            ? 'Draws delayed fading history marks on the canvas. Essential for examining phase shift variations, filtering decay jitter, and stego degradation telemetry.'
                            : 'Traces the timeline of previous coordinates to visualizes frequency carrier drift.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom segment: Academic research dataset metrics exporters */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] uppercase font-bold tracking-widest text-white/40 text-left">Academic Metrics Exporter</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => exportFftPeakData('csv')}
                        disabled={!fftPeak && !fftPeakRef.current}
                        className="bg-cyan-500/10 hover:bg-cyan-500/15 disabled:opacity-40 select-none border border-cyan-500/20 hover:border-cyan-500/45 text-cyan-300 disabled:pointer-events-none font-semibold px-2.5 py-1.5 rounded-lg text-[9px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(0,229,255,0.1)]"
                        title="Download F & R coordinates as CSV"
                      >
                        <Download className="w-3 h-3 text-cyan-400" />
                        Export .CSV
                      </button>
                      <button
                        onClick={() => exportFftPeakData('json')}
                        disabled={!fftPeak && !fftPeakRef.current}
                        className="bg-emerald-500/10 hover:bg-emerald-500/15 disabled:opacity-40 select-none border border-emerald-500/20 hover:border-emerald-500/45 text-emerald-300 disabled:pointer-events-none font-semibold px-2.5 py-1.5 rounded-lg text-[9px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                        title="Download F & R coordinates as JSON"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        Export .JSON
                      </button>
                      
                      <button
                        onClick={captureFftSnapshot}
                        type="button"
                        className="bg-purple-500/10 hover:bg-purple-500/15 select-none border border-purple-500/20 hover:border-purple-500/45 text-purple-300 font-semibold px-2.5 py-1.5 rounded-lg text-[9px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(168,85,247,0.1)] col-span-2 w-full mt-1"
                        title="Capture Snapshot as PNG"
                      >
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        Capture Canvas Snapshot (.PNG)
                      </button>

                      <button
                        onClick={exportBatchDriftDataJSON}
                        type="button"
                        className="bg-pink-500/10 hover:bg-pink-500/15 select-none border border-pink-500/20 hover:border-pink-500/45 text-pink-300 font-semibold px-2.5 py-1.5 rounded-lg text-[9px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(244,63,94,0.1)] col-span-2 w-full mt-1"
                        title="Download current history drift and peak coordinates as packaged JSON"
                      >
                        <Download className="w-3.5 h-3.5 text-pink-400" />
                        Batch Export Drift + Peaks (.JSON)
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="text-[10px] text-white/55 max-w-sm font-mono px-4 leading-relaxed">
                  {isWatermarked ? (
                    activeBypass === 'notch_filter' ? (
                      <span className="text-red-400">Notch Stop: The circular carrier has been sliced. Detection index dropped!</span>
                    ) : activeBypass !== 'none' ? (
                      <span className="text-pink-400">Bypass Jitter: Stego ring blurred away into generic ambient noise.</span>
                    ) : (
                      <span className="text-cyan-400">Carrier Ring Active: Peak stego signal centered precisely at radius 42px.</span>
                    )
                  ) : (
                    <span className="text-white/30">No Watermark: Flat frequency spectrum without ring carries.</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Physical Spatial Distortions — relocated under the viewport (middle column) */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-white/90">
              Step 3: Spatial Distortions
            </h3>
          </div>
          <p className="text-xs text-white/55 leading-relaxed">
            Layer standard signal perturbations directly on the pixel matrix and watch the carrier degrade in the viewport above.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 font-mono text-[10px] bg-black/30 p-3 rounded-xl border border-white/5">
            {/* 1. Crop slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>Crop Margin:</span>
                <span className="text-indigo-300 font-bold">{cropPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                aria-label="Crop amount"
                aria-valuetext={`${cropPercent} percent`}
                value={cropPercent}
                onChange={(e) => setCropPercent(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* 2. JPEG Compression Quality Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>JPEG Quality:</span>
                <span className="text-indigo-300 font-bold">{jpegQuality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                aria-label="JPEG re-encode quality"
                aria-valuetext={`quality ${jpegQuality}`}
                value={jpegQuality}
                onChange={(e) => setJpegQuality(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* 3. Median Size selection */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>Median Filter:</span>
                <span className="text-indigo-300 font-bold">{medianSize === 1 ? 'Off' : `${medianSize}x${medianSize}`}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 mt-1 font-mono text-[9px]">
                {[1, 3, 5].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setMedianSize(sz)}
                    className={`py-0.5 rounded border transition cursor-pointer ${
                      medianSize === sz
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                        : 'bg-black/20 border-white/5 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {sz === 1 ? 'OFF' : `${sz}x${sz}`}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Blur Radius slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>Gaussian Blur:</span>
                <span className="text-indigo-300 font-bold">{blurRadius.toFixed(1)}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.5"
                aria-label="Gaussian blur radius"
                aria-valuetext={`${blurRadius} pixels`}
                value={blurRadius}
                onChange={(e) => setBlurRadius(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* 5. Brightness Offset slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>Brightness Offset:</span>
                <span className="text-indigo-300 font-bold">{brightnessOffset > 0 ? `+${brightnessOffset}` : brightnessOffset}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                aria-label="Brightness offset"
                aria-valuetext={`${brightnessOffset > 0 ? '+' : ''}${brightnessOffset}`}
                value={brightnessOffset}
                onChange={(e) => setBrightnessOffset(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* 6. Salt Pepper Noise Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>Salt & Pepper Noise:</span>
                <span className="text-indigo-300 font-bold">{saltPepperFrac}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                aria-label="Salt-and-pepper noise amount"
                aria-valuetext={`${saltPepperFrac} percent`}
                value={saltPepperFrac}
                onChange={(e) => setSaltPepperFrac(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* 7. Gamma selection */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>Gamma Correction:</span>
                <span className="text-indigo-300 font-bold">{gammaVal.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.1"
                aria-label="Gamma correction"
                aria-valuetext={`${gammaVal.toFixed(2)}`}
                value={gammaVal}
                onChange={(e) => setGammaVal(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* 8. Shear Angle Selection */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/75">
                <span>Shear & Rotation:</span>
                <span className="text-indigo-300 font-bold">{shearAngle}°</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="3"
                aria-label="Shear angle"
                aria-valuetext={`${shearAngle} degrees`}
                value={shearAngle}
                onChange={(e) => setShearAngle(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setCropPercent(0);
              setJpegQuality(100);
              setMedianSize(1);
              setBlurRadius(0);
              setBrightnessOffset(0);
              setSaltPepperFrac(0);
              setGammaVal(1.0);
              setShearAngle(0);
            }}
            className="w-full text-[10px] font-bold py-1.5 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg text-white/50 hover:text-white/80 transition cursor-pointer text-center font-mono"
          >
            Clear Spatial Distortions
          </button>
        </div>
      </div>

      {/* 3. Right Column: Perturbations & Detection Scanner */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        
        {/* Detection Scanner Display */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-white/90">
              Carrier Detection Scanner
            </h3>
          </div>

          {/* Scanner Dial Gauge */}
          <div
            className="flex flex-col items-center gap-2 py-2"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Carrier detection: ${detection.confidence}% confidence, ${detection.status}`}
          >
            <div className="relative w-28 h-28 flex items-center justify-center bg-black/40 border border-white/10 rounded-full">
              
              {/* Spinning active radar border */}
              {isWatermarked && activeBypass === 'none' && (
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-red-500/20 animate-spin" style={{ animationDuration: '6s' }} />
              )}
              
              <div className="flex flex-col items-center z-10">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono leading-none">
                  {detection.confidence}%
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40 mt-1">
                  Confidence
                </span>
              </div>
            </div>

            {/* Display Badge Status */}
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded inline-flex items-center gap-1.5 shadow-sm leading-none mt-1 ${
              detection.status === 'Strongly Detected'
                ? 'bg-red-500/10 border border-red-500/30 text-rose-400'
                : detection.status === 'Weak / Suspect'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              {detection.status === 'Strongly Detected' ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              {detection.status}
            </span>
          </div>

          {/* Robustness Target Class Calibration */}
          <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-1.5 w-full text-left">
            <span className="text-[9px] uppercase font-bold tracking-widest text-white/40">Calibrate Robustness Class</span>
            <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-lg border border-white/5 font-mono text-[9px] font-bold">
              <button
                onClick={() => {
                  setIsWatermarked(true);
                  setWatermarkStrength(5.0);
                  setActiveBypass('none');
                }}
                className={`py-1 px-1.5 rounded transition text-center cursor-pointer ${
                  detection.status === 'Strongly Detected'
                    ? 'bg-red-500/25 border border-red-500/40 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                Class A
              </button>
              <button
                onClick={() => {
                  setIsWatermarked(true);
                  setWatermarkStrength(3.0);
                  setActiveBypass('notch_filter');
                  setBypassIntensity(12);
                }}
                className={`py-1 px-1.5 rounded transition text-center cursor-pointer ${
                  detection.status === 'Weak / Suspect'
                    ? 'bg-amber-500/25 border border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                Class B
              </button>
              <button
                onClick={() => {
                  setIsWatermarked(true);
                  setWatermarkStrength(3.0);
                  setActiveBypass('latent_jitter');
                  setBypassIntensity(35);
                }}
                className={`py-1 px-1.5 rounded transition text-center cursor-pointer ${
                  detection.status === 'Bypassed / Undetectable'
                    ? 'bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                Class C
              </button>
            </div>
            <p className="text-[8.5px] text-white/50 leading-normal select-none font-mono min-h-[30px]">
              {detection.status === 'Strongly Detected' && "Class A: Unaltered watermark signature with highest detection confidence."}
              {detection.status === 'Weak / Suspect' && "Class B: Degraded frequency components showing partial / suspect indicators."}
              {detection.status === 'Bypassed / Undetectable' && "Class C: Signal fully scrambled or removed below detection floor."}
            </p>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-[10px] font-mono text-white/50 space-y-1">
            <div className="flex justify-between">
              <span>Classifier Engine:</span>
              <span className="text-white/80">Synthetic Carrier Probe</span>
            </div>
            <div className="flex justify-between">
              <span>Samples Checked:</span>
              <span className="text-white/80">{(detection.scannedPixels).toLocaleString()} px</span>
            </div>
            <div className="flex justify-between">
              <span>Watermark State:</span>
              <span className={isWatermarked ? "text-cyan-400" : "text-white/30"}>
                {isWatermarked ? 'Injected' : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Bypass Methods Selection with Frosted Glass styling */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold tracking-wide uppercase text-white/90">
                Step 4: Adversarial Tactics
              </h3>
            </div>
          </div>

          <p className="text-xs text-white/55 leading-relaxed">
            Select an academic perturbation method to test how stego models resist data distortion.
          </p>

          <div className="flex flex-col gap-2.5">
            {/* None option */}
            <button
              onClick={() => setActiveBypass('none')}
              className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition cursor-pointer ${
                activeBypass === 'none'
                  ? 'bg-white/10 border-white/20 text-cyan-200 shadow-[0_0_8px_rgba(0,229,255,0.1)]'
                  : 'bg-black/30 border-white/5 hover:border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                activeBypass === 'none' ? 'border-cyan-400' : 'border-white/20'
              }`}>
                {activeBypass === 'none' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </div>
              <div className="flex flex-col min-w-0 leading-none">
                <span className="text-xs font-semibold">No Perturbation</span>
                <span className="text-[10px] text-white/40 font-mono mt-1 select-none">Stego operates cleanly</span>
              </div>
            </button>

            {BYPASS_METHODS.map((m) => {
              const getTechnicalTooltip = (id: string) => {
                if (id === 'notch_filter') {
                  return 'Band-stop Notch Filter: progressive gain adjustment slices out magnitude coefficients at the exact stego carrying radius (R ≈ 42px), eventually destroying detector coordinate lock.';
                } else if (id === 'latent_jitter') {
                  return 'Latent Jitter: coordinate displacement gain scrambles stego carrier phase orientations, dispersing centralized spikes into a diffuse, unresolvable ring of noise.';
                } else if (id === 'vae_quantize') {
                  return 'VAE Quantization: quantization step truncation compresses precision coefficients. Slices amplitude peaks and prompts secondary harmonic frequency spikes (aliasing artifacts).';
                } else if (id === 'neural_denoise') {
                  return 'Neural Denoising: high-frequency spatial smoothing erases localized stego residuals. Progressively dampens watermark carrier amplitudes down to natural background entropy.';
                }
                return '';
              };

              return (
                <div key={m.id} className="relative group">
                  <button
                    onClick={() => {
                      setActiveBypass(m.id);
                      // Setup sensible default intensities as per filter
                      if (m.id === 'notch_filter') setBypassIntensity(12);
                      else if (m.id === 'latent_jitter') setBypassIntensity(15);
                      else if (m.id === 'vae_quantize') setBypassIntensity(18);
                      else if (m.id === 'neural_denoise') setBypassIntensity(25);
                    }}
                    className={`w-full flex gap-2.5 p-2.5 rounded-lg border text-left items-start transition cursor-pointer ${
                      activeBypass === m.id
                        ? 'bg-white/10 border-cyan-500/40 text-cyan-100 shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                        : 'bg-black/30 border-white/5 hover:border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      activeBypass === m.id ? 'border-cyan-400 animate-pulse' : 'border-white/20'
                    }`}>
                      {activeBypass === m.id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </div>

                    <div className="flex flex-col min-w-0 leading-none">
                      <span className="text-xs font-bold">{m.name}</span>
                      <span className="text-[9px] text-white/40 mt-1.5 flex flex-wrap gap-x-2 leading-none font-mono">
                        <span>Rate: <strong className="text-rose-400">{m.reductionRate}</strong></span>
                        <span>Loss: <strong className="text-white/60">{m.qualityLoss}</strong></span>
                      </span>
                    </div>
                  </button>
                  <span className="pointer-events-none absolute bottom-[108%] left-1/2 -translate-x-1/2 w-64 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#070a13] border border-cyan-500/40 text-cyan-100/90 p-2.5 rounded-lg text-[8px] font-mono leading-normal shadow-[0_4px_16px_rgba(0,0,0,0.85)] z-50 text-center leading-relaxed">
                    <strong className="text-cyan-400 block mb-1 uppercase tracking-wide text-[7.5px] border-b border-white/10 pb-0.5 font-mono">Watermark Bypass Impact</strong>
                    {getTechnicalTooltip(m.id)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Slider input adjustment for the active bypass */}
          {activeBypass !== 'none' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-2 bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-center text-[11px] font-mono leading-none">
                <span className="text-white/50">Tactical Intensity (Gain):</span>
                <span className="text-cyan-400 font-bold">{bypassIntensity}</span>
              </div>
              <input
                type="range"
                min={activeBypass === 'vae_quantize' ? '10' : '4'}
                max="50"
                step="2"
                aria-label="Adversarial method intensity"
                aria-valuetext={`${bypassIntensity} percent`}
                value={bypassIntensity}
                onChange={(e) => setBypassIntensity(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none accent-teal-400 cursor-pointer"
              />
              <p className="text-[10px] text-white/50 leading-normal font-sans">
                {BYPASS_METHODS.find(m => m.id === activeBypass)?.description}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Batch Bypass performance lab modal overlay */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0f19] border border-white/10 rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative flex flex-col gap-6 font-sans text-white/90"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowBatchModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Header */}
              <div className="flex flex-col gap-1 pr-10">
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                    Batch Stress Test
                  </h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Evaluate how your chosen bypass perturbation performs consistently across multiple image profiles. 
                  Currently testing: <strong className="text-cyan-400">{activeBypass === 'none' ? 'No Perturbation (Clean Watermarked)' : BYPASS_METHODS.find(m => m.id === activeBypass)?.name}</strong> 
                  {activeBypass !== 'none' && ` at Intensity Level ${bypassIntensity}`}
                </p>
              </div>

              {/* Action buttons panel */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-white/[3%] border border-white/5 rounded-2xl p-4">
                <div className="flex gap-2">
                  <button 
                    onClick={() => batchFileInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/15 border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-300" />
                    Upload Set
                  </button>
                  <input 
                    type="file" 
                    ref={batchFileInputRef} 
                    onChange={handleBatchUpload} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                  />
                  
                  <button 
                    onClick={() => {
                      setBatchItems([]);
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-rose-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    Clear Table
                  </button>

                  <button 
                    onClick={initializeDefaultBatch}
                    className="bg-white/5 hover:bg-white/10 border border-white/5 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-white/50" />
                    Reset Defaults
                  </button>
                </div>

                <button 
                  onClick={runBatchAnalysis}
                  disabled={batchItems.length === 0 || isBatchRunning}
                  className="bg-indigo-600 hover:bg-indigo-505 disabled:bg-indigo-900/40 disabled:text-white/30 text-white px-5 py-2 rounded-xl text-xs font-bold leading-none select-none transition cursor-pointer flex items-center gap-2 shadow-[0_4px_12px_rgba(99,102,241,0.2)] disabled:shadow-none"
                >
                  {isBatchRunning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                      Processing Set...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Batch Evaluation
                    </>
                  )}
                </button>
              </div>

              {/* Image dataset table grid */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40 max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/50 font-mono tracking-wider text-[10px] uppercase">
                      <th className="py-3 px-4 font-semibold">Image Source / Context</th>
                      <th className="py-3 px-4 font-semibold text-center">Baseline Watermarked</th>
                      <th className="py-3 px-4 font-semibold text-center">With Active Bypass</th>
                      <th className="py-3 px-4 font-semibold">Security Level Status</th>
                      <th className="py-3 px-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {batchItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-white/30 font-mono">
                          Dataset empty. Drag multiple files or upload a set of files to benchmark.
                        </td>
                      </tr>
                    ) : (
                      batchItems.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[2%] transition-all">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <img 
                              src={item.thumbnail} 
                              alt="Thumbnail" 
                              className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2322d3ee"/></svg>';
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold truncate max-w-[200px] block" title={item.name}>
                                {item.name}
                              </span>
                              <span className="text-[9px] text-white/30 truncate max-w-[150px]">
                                Size: 256x256 • Aspect 1:1
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className="text-red-400 font-semibold">{item.beforeConfidence}%</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.isProcessing ? (
                              <span className="text-indigo-400 font-mono animate-pulse">Scanning...</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 font-mono">
                                <span className={item.afterConfidence <= 20 ? "text-emerald-400 font-bold" : item.afterConfidence < 60 ? "text-amber-300 font-bold" : "text-red-400 font-semibold"}>
                                  {item.afterConfidence}%
                                </span>
                                {item.beforeConfidence - item.afterConfidence > 5 && (
                                  <span className="text-[9px] text-emerald-500 font-bold flex items-center leading-none">
                                    (-{item.beforeConfidence - item.afterConfidence}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.isProcessing ? (
                              <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase inline-flex items-center gap-1 ${
                                item.status === 'Bypassed / Undetectable'
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                  : item.status === 'Weak / Suspect'
                                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                                  : item.status === 'Awaiting Run'
                                  ? 'bg-white/5 border border-white/10 text-white/40'
                                  : 'bg-red-500/10 border border-red-500/30 text-rose-400'
                              }`}>
                                {item.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button 
                              onClick={() => setBatchItems(prev => prev.filter(x => x.id !== item.id))}
                              className="text-white/30 hover:text-rose-400 p-1 rounded transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Lab statistics readout at bottom if any results are present */}
              {batchItems.some(x => x.status !== 'Awaiting Run' && x.status !== 'Ready to Run') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 text-slate-300">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 font-mono">
                      Average Post-Bypass Confidence
                    </span>
                    <span className="text-xl font-mono mt-1 font-bold text-white">
                      {(batchItems.reduce((acc, current) => acc + current.afterConfidence, 0) / batchItems.length).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 font-mono">
                      Generalizing Success Rate
                    </span>
                    <span className="text-xl font-mono mt-1 font-bold text-emerald-400 flex items-center gap-1.5">
                      <TrendingDown className="w-5 h-5" />
                      {((batchItems.filter(x => x.afterConfidence <= 20).length / batchItems.length) * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 font-mono">
                      Optimal Application Fit
                    </span>
                    <span className="text-xs mt-1.5 leading-normal text-white/70">
                      {activeBypass === 'none' 
                        ? 'Inject a perturbation tactic to watch watermarking indicators drop.'
                        : activeBypass === 'notch_filter'
                        ? 'Exceptional on smooth low frequency images; preserves 99.8% visual beauty.'
                        : 'Powerfully disrupts latent micro-alignment boundaries of DeepMind decoders.'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
