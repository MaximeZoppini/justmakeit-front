'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useCollaboration } from './useCollaboration';
import { drawWaveform } from '../utils/waveform';
import { Library, Track, BackingLoop, CollaborationMessage } from '../types';

interface SequencerProperties {
  initialLibrary: Library;
  projectId?: string;
}

const INSTRUMENT_NAMES = ['Kick', 'Snare', 'Hi-Hat', 'Clap'];
const STEPS = 16;

export default function Sequencer({
  initialLibrary,
  projectId = 'default-room',
}: SequencerProperties) {
  const [totalSteps, setTotalSteps] = useState(STEPS);
  const [tracks, setTracks] = useState<Track[]>(() => {
    return INSTRUMENT_NAMES.map((name, index) => {
      const samples = initialLibrary[name] || [];
      return {
        id: index,
        name,
        url: samples.length > 0 ? samples[0].url : undefined,
        isMuted: false,
        isCustom: false,
      };
    });
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [isDragging, setIsDragging] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [backingLoop, setBackingLoop] = useState<BackingLoop | null>(null);

  const [grid, setGrid] = useState<boolean[][]>(() =>
    INSTRUMENT_NAMES.map(() => Array.from({ length: STEPS }).fill(false))
  );

  const gridReference = useRef(grid);
  const playersReference = useRef<(Tone.Player | null)[]>([]);
  const backingPlayerReference = useRef<Tone.Player | null>(null);
  const canvasReference = useRef<HTMLCanvasElement>(null);
  const loopReference = useRef<Tone.Sequence | null>(null);
  const backingStartTimeReference = useRef<number>(0);

  useEffect(() => {
    gridReference.current = grid;
  }, [grid]);

  useEffect(() => {
    if (Tone.Transport?.bpm) {
      Tone.Transport.bpm.value = bpm;
    }
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = totalSteps === 16 ? '1m' : '2m';
  }, [bpm, totalSteps]);

  const handleIncomingUpdate = useCallback((message: CollaborationMessage) => {
    if (message.type === 'NOTE_TOGGLED') {
      const { trackIndex, stepIndex, active } = message.payload;
      setGrid((previous) => {
        const newGrid = [...previous];
        newGrid[trackIndex] = [...newGrid[trackIndex]];
        newGrid[trackIndex][stepIndex] = active;
        return newGrid;
      });
    }
    if (message.type === 'BPM_CHANGED') {
      setBpm(message.payload.bpm);
    }
  }, []);

  const { sendMessage, isConnected, myIdentity } = useCollaboration(
    projectId,
    handleIncomingUpdate
  );

  const broadcastBpm = (newBpm: number) => {
    setBpm(newBpm);
    sendMessage('BPM_CHANGED', { bpm: newBpm });
  };

  useEffect(() => {
    if (playersReference.current.length !== tracks.length) {
      for (const p of playersReference.current) p?.dispose();
      playersReference.current = tracks.map((track) => {
        if (track.url) {
          return new Tone.Player({
            url: track.url,
            mute: track.isMuted,
            onload: () => {},
            onerror: (e: Error) => {
              console.error(`Error loading track ${track.name}:`, e);
            },
          }).toDestination();
        }
        return null;
      });
    }
  }, [tracks.length]);

  useEffect(() => {
    if (loopReference.current) loopReference.current.dispose();

    loopReference.current = new Tone.Sequence(
      (time, step) => {
        setCurrentStep(step);

        const currentGrid = gridReference.current;
        for (const [trackIndex, trackSteps] of currentGrid.entries()) {
          if (trackSteps && trackSteps[step]) {
            const player = playersReference.current[trackIndex];
            if (player && player.loaded) {
              player.start(time, 0);
            }
          }
        }
      },
      Array.from({ length: totalSteps }, (_, index) => index),
      '16n'
    );

    loopReference.current.start(0);

    return () => {
      loopReference.current?.dispose();
    };
  }, [totalSteps, tracks.length]);

  useEffect(() => {
    return () => {
      for (const p of playersReference.current) p?.dispose();
    };
  }, []);

  useEffect(() => {
    if (backingLoop?.url) {
      const player = new Tone.Player({
        url: backingLoop.url,
        loop: true,
        mute: backingLoop.isMuted,
        onload: () => {
          drawWaveform(canvasReference.current, player.buffer);
          if (isPlaying) player.start();
        },
      }).toDestination();

      backingPlayerReference.current = player;
    }

    return () => {
      backingPlayerReference.current?.dispose();
      backingPlayerReference.current = null;
    };
  }, [backingLoop?.url]);

  useEffect(() => {
    if (
      backingPlayerReference.current &&
      backingPlayerReference.current.loaded
    ) {
      if (isPlaying) {
        backingStartTimeReference.current = Tone.now();
        backingPlayerReference.current.start();
      } else {
        backingPlayerReference.current.stop();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    for (const [index, track] of tracks.entries()) {
      if (playersReference.current[index]) {
        playersReference.current[index]!.mute = track.isMuted;
      }
    }
  }, [tracks]);

  useEffect(() => {
    if (backingPlayerReference.current && backingLoop) {
      backingPlayerReference.current.mute = backingLoop.isMuted;
    }
  }, [backingLoop?.isMuted]);

  useEffect(() => {
    let animationId: number = 0;

    const animate = () => {
      if (
        isPlaying &&
        backingPlayerReference.current &&
        backingPlayerReference.current.loaded
      ) {
        const buffer = backingPlayerReference.current.buffer;
        const duration = buffer.duration;
        if (duration > 0) {
          // Progress based on real elapsed time since start to avoid Transport looping cuts
          const elapsedTime = Tone.now() - backingStartTimeReference.current;
          const progress = (elapsedTime % duration) / duration;
          drawWaveform(canvasReference.current, buffer, progress);
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animate();
    } else {
      cancelAnimationFrame(animationId);
      if (backingPlayerReference.current?.loaded) {
        drawWaveform(
          canvasReference.current,
          backingPlayerReference.current.buffer,
          0
        );
      }
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  const togglePlay = async () => {
    if (isPlaying) {
      Tone.Transport.stop();
      setCurrentStep(0);
    } else {
      await Tone.start();
      if (Tone.context.state !== 'running') await Tone.context.resume();
      Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSampleChange = (index: number, newUrl: string) => {
    setTracks((previous) => {
      const newTracks = [...previous];
      newTracks[index] = { ...newTracks[index], url: newUrl };
      return newTracks;
    });

    if (playersReference.current[index]) {
      playersReference.current[index]?.load(newUrl);
    } else {
      playersReference.current[index] = new Tone.Player({
        url: newUrl,
        onload: () => {},
        onerror: (e: Error) =>
          console.error(`Error loading custom track ${index}:`, e),
      }).toDestination();
    }
  };

  const sendFileToBackend = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        'http://127.0.0.1:8080/api/audio/analyze-bpm',
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json();
      setBackendMessage(data.serverMessage);
      if (data.bpm) setDetectedBpm(data.bpm);

      setTimeout(() => setBackendMessage(null), 5000);
    } catch (error) {
      console.error('BPM analysis error', error);
      setBackendMessage('Backend connection error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendFileToBackend(file);
  };

  const applyDetectedBpm = () => {
    if (detectedBpm) {
      broadcastBpm(detectedBpm);
      setDetectedBpm(null);
    }
  };

  const getAudioFiles = (e: React.DragEvent) => {
    return [...e.dataTransfer.files].filter(
      (f) => f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3)$/i)
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const audioFiles = getAudioFiles(e);
    if (audioFiles.length === 0) return;

    sendFileToBackend(audioFiles[0]);

    const newTracks = audioFiles.map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
      isMuted: false,
      isCustom: true,
    }));

    setTracks((previous) => [...previous, ...newTracks]);
    setGrid((previous) => [
      ...previous,
      ...newTracks.map(() => new Array(totalSteps).fill(false)),
    ]);
  };

  const handleLoopDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const audioFile = getAudioFiles(e)[0];

    if (audioFile) {
      sendFileToBackend(audioFile);
      setBackingLoop({
        name: audioFile.name,
        url: URL.createObjectURL(audioFile),
        isMuted: false,
      });
    }
  };

  const changeGridSize = (newSize: number) => {
    if (totalSteps === newSize) return;
    setTotalSteps(newSize);
    setGrid((previous) =>
      previous.map((row) =>
        newSize === 32 ? [...row, ...row] : row.slice(0, STEPS)
      )
    );
  };

  const handleClearAll = () => {
    setGrid(tracks.map(() => new Array(totalSteps).fill(false)));
  };

  const updateTrackGrid = (
    trackIndex: number,
    pageIndex: number,
    modifier: (stepIndex: number, value: boolean) => boolean
  ) => {
    const start = pageIndex * STEPS;
    const end = start + STEPS;
    setGrid((previous) =>
      previous.map((row, rIndex) =>
        rIndex === trackIndex
          ? row.map((value, stepIndex) =>
              stepIndex >= start && stepIndex < end
                ? modifier(stepIndex, value)
                : value
            )
          : row
      )
    );
  };

  const fillTrack = (trackIndex: number, interval: number, pageIndex = 0) => {
    updateTrackGrid(
      trackIndex,
      pageIndex,
      (stepIndex) => stepIndex % interval === 0
    );
  };

  const clearTrack = (trackIndex: number, pageIndex = 0) => {
    updateTrackGrid(trackIndex, pageIndex, () => false);
  };

  const toggleMute = (index: number) => {
    setTracks((previous) => {
      const newTracks = [...previous];
      newTracks[index].isMuted = !newTracks[index].isMuted;
      return newTracks;
    });
  };

  const handleRemoveTrack = (index: number) => {
    setTracks((previous) => previous.filter((_, index_) => index_ !== index));
    setGrid((previous) => previous.filter((_, index_) => index_ !== index));
  };

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    const newState = !grid[trackIndex][stepIndex];
    const newGrid = grid.map((row, rIndex) =>
      rIndex === trackIndex
        ? row.map((s, sIndex) => (sIndex === stepIndex ? newState : s))
        : row
    );

    setGrid(newGrid);
    sendMessage('NOTE_TOGGLED', { trackIndex, stepIndex, active: newState });
  };

  const copyInviteLink = () => {
    const url = `${globalThis.location.origin}/project/${projectId}`;
    navigator.clipboard.writeText(url);
    alert("Lien d'invitation copié !");
  };

  return (
    <div
      data-testid="sequencer-canvas"
      className={`w-full max-w-6xl mx-auto mt-10 p-6 bg-gray-900 text-white rounded-xl shadow-2xl transition-all ${isDragging ? 'border-2 border-purple-500 bg-gray-800' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-purple-400">JustMakeIt !</h2>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              {isConnected ? `${myIdentity} • CONNECTÉ` : 'HORS LIGNE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">BPM:</span>
              <input
                type="number"
                value={bpm}
                onChange={(e) => broadcastBpm(Number(e.target.value))}
                className="w-12 bg-gray-800 text-white text-xs rounded px-1 border border-gray-700 focus:border-purple-500 outline-none text-center"
              />
            </div>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => broadcastBpm(Number(e.target.value))}
              className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex gap-1">
              {[90, 110, 120, 140].map((p) => (
                <button
                  key={p}
                  onClick={() => broadcastBpm(p)}
                  className={`text-[10px] px-1.5 rounded border border-gray-700 transition-colors ${bpm === p ? 'bg-purple-900 text-purple-200 border-purple-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyInviteLink}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm font-semibold border border-gray-700"
            >
              Inviter 🔗
            </button>
            <input
              type="file"
              accept=".wav"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload-main"
            />
            <label
              htmlFor="audio-upload-main"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-sm font-semibold cursor-pointer"
            >
              Analyser WAV
            </label>
          </div>

          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-900/30 hover:bg-red-800/50 text-red-200 rounded-full text-sm font-semibold transition-all border border-red-900/50"
          >
            Clear All
          </button>

          <button
            onClick={() => changeGridSize(totalSteps === 16 ? 32 : 16)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm font-semibold transition-all border border-gray-700"
          >
            {totalSteps === 16 ? 'Expand to 32' : 'Back to 16'}
          </button>
          <button
            onClick={togglePlay}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${
              isPlaying
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isPlaying ? 'STOP' : 'PLAY'}
          </button>
        </div>
      </div>

      {backendMessage && (
        <div className="mb-4 p-2 bg-green-900/50 border border-green-500 text-green-200 rounded text-center text-xs animate-pulse">
          {backendMessage}
        </div>
      )}

      {detectedBpm && (
        <button
          onClick={applyDetectedBpm}
          className="w-full mb-6 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold animate-pulse shadow-lg shadow-blue-500/20"
        >
          BPM détecté : {detectedBpm} • Cliquer pour synchroniser tout le monde
        </button>
      )}

      <div
        className={`mb-6 p-4 rounded-lg border-2 border-dashed transition-colors ${backingLoop ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleLoopDrop}
      >
        {backingLoop ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-purple-300 font-semibold text-sm">
                  Loop:
                </span>
                <span className="text-gray-300 text-sm font-mono">
                  {backingLoop.name}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setBackingLoop((previous) =>
                      previous
                        ? { ...previous, isMuted: !previous.isMuted }
                        : null
                    )
                  }
                  className={`text-xs px-2 py-1 rounded border ${backingLoop.isMuted ? 'bg-red-900 border-red-700 text-red-200' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                >
                  {backingLoop.isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={() => setBackingLoop(null)}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-red-900 text-gray-500 hover:text-red-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <canvas
              ref={canvasReference}
              width={1000}
              height={120}
              className="w-full h-24 bg-gray-900/50 rounded border border-gray-700/50"
            />
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-2">
            🎵 Drag & Drop a Melody Loop here (WAV/MP3)
          </div>
        )}
      </div>

      {Array.from({ length: totalSteps / STEPS }).map((_, pageIndex) => (
        <div key={pageIndex} className={pageIndex > 0 ? 'mt-8 relative' : ''}>
          {pageIndex > 0 && (
            <div className="absolute -top-6 left-0 text-xs text-gray-500 font-mono">
              Steps 17-32
            </div>
          )}
          <div className="flex flex-col gap-4">
            {tracks.map((track, rowIndex) => (
              <div
                key={`${track.name}-${rowIndex}`}
                className="flex items-center gap-4"
              >
                <div className="w-32 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 w-full justify-end">
                    <span
                      className="font-mono text-sm text-gray-400 truncate"
                      title={track.name}
                    >
                      {track.name}
                    </span>
                    <button
                      onClick={() => toggleMute(rowIndex)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${track.isMuted ? 'bg-red-900 border-red-700 text-red-200' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                      title="Mute"
                    >
                      M
                    </button>
                    {track.isCustom && (
                      <button
                        onClick={() => handleRemoveTrack(rowIndex)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 hover:bg-red-900 text-gray-500 hover:text-red-200 transition-colors"
                        title="Delete Track"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {!track.isCustom && initialLibrary[track.name] ? (
                    <select
                      className="bg-gray-800 text-white text-[10px] rounded px-1 py-0.5 border border-gray-700 focus:border-purple-500 outline-none w-full"
                      value={track.url || ''}
                      onChange={(e) =>
                        handleSampleChange(rowIndex, e.target.value)
                      }
                    >
                      {initialLibrary[track.name]?.map((sample) => (
                        <option key={sample.url} value={sample.url}>
                          {sample.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="h-6 w-full"></div>
                  )}

                  <div className="flex gap-1 mt-1 w-full justify-end">
                    <button
                      onClick={() => fillTrack(rowIndex, 4, pageIndex)}
                      className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
                      title="Fill every 4th"
                    >
                      1/4
                    </button>
                    <button
                      onClick={() => fillTrack(rowIndex, 2, pageIndex)}
                      className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
                      title="Fill every 2nd"
                    >
                      1/2
                    </button>
                    <button
                      onClick={() => clearTrack(rowIndex, pageIndex)}
                      className="text-[10px] bg-red-900 hover:bg-red-800 text-red-100 px-2 py-1 rounded transition-colors"
                      title="Clear track"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-16 gap-1">
                  {grid[rowIndex]
                    .slice(pageIndex * 16, (pageIndex + 1) * 16)
                    .map((isActive, localStepIndex) => {
                      const stepIndex = pageIndex * 16 + localStepIndex;
                      const isQuarter = Math.floor(stepIndex / 4) % 2 === 0;
                      let bgClass = 'hover:bg-gray-600 ';
                      if (isActive) {
                        bgClass =
                          'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
                      } else if (isQuarter) {
                        bgClass += 'bg-gray-800';
                      } else {
                        bgClass += 'bg-red-950';
                      }

                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(rowIndex, stepIndex)}
                          className={`
                          h-14 w-full rounded-sm transition-colors duration-100
                          ${bgClass}
                          ${currentStep === stepIndex && isPlaying ? 'border-2 border-white' : ''}
                        `}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
