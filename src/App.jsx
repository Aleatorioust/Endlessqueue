import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play, Pause, SkipForward, Repeat, Repeat1,
    Volume2, Plus, GripVertical, Trash2, ArrowUp,
    ArrowDown, Settings, Radio, FolderPlus,
    MonitorPlay, ListPlus, ListEnd, Info
} from 'lucide-react';

// --- UTILITÁRIOS ---
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function App() {
    // --- ESTADO GLOBAL ---
    const [tracks, setTracks] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [crossfade, setCrossfade] = useState(3); // segundos
    const [dropMode, setDropMode] = useState('end'); // 'end' | 'next'
    const [loopMode, setLoopMode] = useState('all'); // 'all' | 'one'
    const [isDragging, setIsDragging] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // --- ESTADO DO PLAYER (MÚSICA ATUAL) ---
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    // --- ENGINE DE ÁUDIO (DUAL PLAYER PARA CROSSFADE) ---
    const audio1Ref = useRef(new Audio());
    const audio2Ref = useRef(new Audio());
    const activePlayerRef = useRef(1); // 1 ou 2
    const isCrossfadingRef = useRef(false);

    // Inicializa o áudio
    useEffect(() => {
        [audio1Ref.current, audio2Ref.current].forEach(audio => {
            audio.volume = volume;
        });
    }, []); // Apenas na montagem

    // --- CONTROLES DE REPRODUÇÃO ---
    // (Movidos para cima para evitar o ReferenceError de inicialização)
    const togglePlayPause = () => {
        if (tracks.length === 0) return;

        const activeAudio = activePlayerRef.current === 1 ? audio1Ref.current : audio2Ref.current;

        if (isPlaying) {
            activeAudio.pause();
        } else {
            if (!activeAudio.src && tracks.length > 0) {
                const startIdx = currentIndex >= 0 ? currentIndex : 0;
                activeAudio.src = tracks[startIdx].url;
                setCurrentIndex(startIdx);
            }
            activeAudio.play().catch(e => console.error("Erro autoplay", e));
        }
        setIsPlaying(!isPlaying);
    };

    const handleSkip = useCallback(() => {
        if (tracks.length === 0) return;

        let nextIndex = currentIndex + 1;
        if (nextIndex >= tracks.length) {
            if (loopMode === 'all') nextIndex = 0;
            else if (loopMode === 'one') nextIndex = currentIndex;
            else return;
        }

        const activeAudio = activePlayerRef.current === 1 ? audio1Ref.current : audio2Ref.current;
        const nextAudio = activePlayerRef.current === 1 ? audio2Ref.current : audio1Ref.current;

        activeAudio.pause();
        activeAudio.currentTime = 0;
        isCrossfadingRef.current = false;

        nextAudio.src = tracks[nextIndex].url;
        nextAudio.volume = volume;

        if (isPlaying) {
            nextAudio.play().catch(e => console.error("Erro skip", e));
        }

        activePlayerRef.current = activePlayerRef.current === 1 ? 2 : 1;
        setCurrentIndex(nextIndex);
    }, [currentIndex, tracks, loopMode, isPlaying, volume]);

    const playSpecificTrack = (index) => {
        if (index === currentIndex) return togglePlayPause();

        const activeAudio = activePlayerRef.current === 1 ? audio1Ref.current : audio2Ref.current;
        const nextAudio = activePlayerRef.current === 1 ? audio2Ref.current : audio1Ref.current;

        activeAudio.pause();
        activeAudio.currentTime = 0;
        isCrossfadingRef.current = false;

        nextAudio.src = tracks[index].url;
        nextAudio.volume = volume;

        setIsPlaying(true);
        nextAudio.play().catch(e => console.error("Erro play track", e));

        activePlayerRef.current = activePlayerRef.current === 1 ? 2 : 1;
        setCurrentIndex(index);
    };

    // --- LÓGICA DE CROSSFADE E ATUALIZAÇÃO DE TEMPO ---
    useEffect(() => {
        const audio1 = audio1Ref.current;
        const audio2 = audio2Ref.current;

        const handleTimeUpdate = (e) => {
            // Ignora eventos do player que não é o ativo no momento
            if (
                (activePlayerRef.current === 1 && e.target !== audio1) ||
                (activePlayerRef.current === 2 && e.target !== audio2)
            ) {
                return;
            }

            const activeAudio = e.target;
            const nextAudio = activePlayerRef.current === 1 ? audio2 : audio1;

            setProgress(activeAudio.currentTime);
            setDuration(activeAudio.duration || 0);

            // Lógica de Crossfade
            if (activeAudio.duration && crossfade > 0) {
                const timeLeft = activeAudio.duration - activeAudio.currentTime;

                if (timeLeft <= crossfade && !isCrossfadingRef.current) {
                    let nextIndex = currentIndex + 1;

                    if (nextIndex >= tracks.length) {
                        if (loopMode === 'all' && tracks.length > 0) {
                            nextIndex = 0; // Volta pro início
                        } else if (loopMode === 'one') {
                            nextIndex = currentIndex; // Repete a mesma
                        } else {
                            return; // Fim da fila real
                        }
                    }

                    const nextTrack = tracks[nextIndex];
                    if (nextTrack) {
                        isCrossfadingRef.current = true;
                        nextAudio.src = nextTrack.url;
                        nextAudio.volume = 0; // Começa mudo
                        nextAudio.play().catch(e => console.error("Erro autoplay crossfade", e));

                        setCurrentIndex(nextIndex);
                    }
                }

                if (isCrossfadingRef.current) {
                    const ratio = Math.max(0, Math.min(1, timeLeft / crossfade));
                    activeAudio.volume = ratio * volume;
                    nextAudio.volume = (1 - ratio) * volume;
                }
            }
        };

        const handleEnded = (e) => {
            // Ignora eventos do player que não é o ativo no momento
            if (
                (activePlayerRef.current === 1 && e.target !== audio1) ||
                (activePlayerRef.current === 2 && e.target !== audio2)
            ) {
                return;
            }

            const activeAudio = e.target;
            const nextAudio = activePlayerRef.current === 1 ? audio2 : audio1;

            // CORREÇÃO ANTI-SONO: Se a aba dormiu e perdeu o evento de crossfade, 
            // ou se o crossfade está definido para 0, força o pulo da música.
            if (!isCrossfadingRef.current) {
                handleSkip();
            } else {
                // Fluxo normal do fim do crossfade
                isCrossfadingRef.current = false;
                activeAudio.pause();
                activeAudio.currentTime = 0;
                activePlayerRef.current = activePlayerRef.current === 1 ? 2 : 1;
                nextAudio.volume = volume;
            }
        };

        // Agora ouvimos AMBOS os players ao mesmo tempo
        audio1.addEventListener('timeupdate', handleTimeUpdate);
        audio1.addEventListener('ended', handleEnded);
        audio2.addEventListener('timeupdate', handleTimeUpdate);
        audio2.addEventListener('ended', handleEnded);

        return () => {
            audio1.removeEventListener('timeupdate', handleTimeUpdate);
            audio1.removeEventListener('ended', handleEnded);
            audio2.removeEventListener('timeupdate', handleTimeUpdate);
            audio2.removeEventListener('ended', handleEnded);
        };
    }, [currentIndex, tracks, crossfade, volume, loopMode, handleSkip]);

    useEffect(() => {
        if (!isCrossfadingRef.current) {
            const activeAudio = activePlayerRef.current === 1 ? audio1Ref.current : audio2Ref.current;
            activeAudio.volume = volume;
        }
    }, [volume]);

    // --- MEDIA SESSION API (CONTROLES DO SISTEMA E ANTI-THROTTLING) ---
    useEffect(() => {
        if ('mediaSession' in navigator && tracks.length > 0 && currentIndex >= 0) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: tracks[currentIndex].name,
                artist: 'EndlessQueue Radio',
                artwork: [{ src: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=512&h=512&fit=crop&q=80', sizes: '512x512', type: 'image/jpeg' }]
            });

            // Permite usar as teclas multimédia do teclado (Play/Pause/Next)
            navigator.mediaSession.setActionHandler('play', togglePlayPause);
            navigator.mediaSession.setActionHandler('pause', togglePlayPause);
            navigator.mediaSession.setActionHandler('nexttrack', handleSkip);
        }
    }, [currentIndex, tracks, handleSkip]);

    // --- DRAG AND DROP & FILE HANDLING ---
    const handleFiles = (files) => {
        const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
        if (audioFiles.length === 0) return;

        const newTracks = audioFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: URL.createObjectURL(file),
            file
        }));

        setTracks(prev => {
            const updatedTracks = [...prev];
            if (dropMode === 'next' && currentIndex >= 0) {
                updatedTracks.splice(currentIndex + 1, 0, ...newTracks);
            } else {
                updatedTracks.push(...newTracks);
            }

            if (prev.length === 0) {
                setTimeout(() => setIsPlaying(false), 50);
            }
            return updatedTracks;
        });
    };

    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const onFileInput = (e) => {
        if (e.target.files) handleFiles(e.target.files);
    };

    // --- HOTKEYS ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        handleSkip();
                        break;
                    case 'n':
                        e.preventDefault();
                        setDropMode('next');
                        break;
                    case 'e':
                        e.preventDefault();
                        setDropMode('end');
                        break;
                    default:
                        break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSkip]);

    // --- GERENCIAMENTO DE FILA ---
    const moveTrack = (index, direction) => {
        if (direction === -1 && index === 0) return;
        if (direction === 1 && index === tracks.length - 1) return;

        setTracks(prev => {
            const newTracks = [...prev];
            const temp = newTracks[index];
            newTracks[index] = newTracks[index + direction];
            newTracks[index + direction] = temp;
            return newTracks;
        });

        if (currentIndex === index) {
            setCurrentIndex(index + direction);
        } else if (currentIndex === index + direction) {
            setCurrentIndex(index);
        }
    };

    const removeTrack = (index) => {
        if (index === currentIndex) {
            handleSkip();
            setTimeout(() => {
                setTracks(prev => prev.filter((_, i) => i !== index));
                setCurrentIndex(prev => prev > index ? prev - 1 : prev);
            }, 100);
        } else {
            setTracks(prev => prev.filter((_, i) => i !== index));
            if (currentIndex > index) {
                setCurrentIndex(currentIndex - 1);
            }
        }
    };

    const currentTrack = tracks[currentIndex];

    return (
        <div
            className={`min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col transition-colors duration-300 ${isDragging ? 'bg-slate-900 border-4 border-dashed border-emerald-500' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 pointer-events-none">
                    <div className="flex flex-col items-center text-emerald-400">
                        <Plus size={64} className="animate-bounce" />
                        <h2 className="text-3xl font-bold mt-4 tracking-wider">SOLTE PARA ADICIONAR</h2>
                        <p className="text-emerald-500/70 mt-2">No modo atual: {dropMode === 'end' ? 'Adicionar ao Final' : 'Tocar em Seguida'}</p>
                    </div>
                </div>
            )}

            <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Radio className="text-emerald-500" size={28} />
                        {isPlaying && <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>}
                    </div>
                    <h1 className="font-black text-xl tracking-tight text-white">ENDLESS<span className="text-emerald-500">QUEUE</span></h1>

                    <div className="hidden md:flex ml-4 px-3 py-1 bg-slate-800 rounded-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></span>
                        {isPlaying ? 'Live Broadcasting' : 'Standby Engine'}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {showSettings && (
                <div className="bg-slate-900 border-b border-slate-800 p-4 shadow-xl flex flex-wrap gap-8 items-start text-sm animate-in slide-in-from-top-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Transição (Crossfade)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min="0" max="10" step="1"
                                value={crossfade} onChange={(e) => setCrossfade(Number(e.target.value))}
                                className="w-32 accent-emerald-500"
                            />
                            <span className="w-8 font-mono text-emerald-400">{crossfade}s</span>
                        </div>
                        <p className="text-xs text-slate-500 w-48">Funde as músicas suavemente para evitar silêncio.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Modo Anti-Silêncio</label>
                        <div className="flex bg-slate-950 p-1 rounded-lg">
                            <button
                                onClick={() => setLoopMode('all')}
                                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors ${loopMode === 'all' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Repeat size={16} /> Loop Fila
                            </button>
                            <button
                                onClick={() => setLoopMode('one')}
                                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors ${loopMode === 'one' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Repeat1 size={16} /> Repetir Atual
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Atalhos de Teclado</label>
                        <div className="text-slate-500 font-mono text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                            <span>CTRL + S: <span className="text-slate-300">Pular faixa</span></span>
                            <span>CTRL + N: <span className="text-slate-300">Modo Próxima</span></span>
                            <span>CTRL + E: <span className="text-slate-300">Modo Final</span></span>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">

                <div className="w-full md:w-2/5 lg:w-1/3 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2 text-emerald-500 font-semibold tracking-widest text-sm">
                            <MonitorPlay size={18} />
                            <span>TOCANDO AGORA</span>
                        </div>

                        <div className="aspect-square bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden group">
                            {isPlaying ? (
                                <div className="flex items-end gap-1.5 h-32">
                                    {[...Array(9)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-3 bg-emerald-500 rounded-t-sm opacity-80"
                                            style={{
                                                animation: `pulse-audio ${0.5 + Math.random()}s infinite alternate ease-in-out`,
                                                height: `${Math.random() * 100}%`
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Radio size={64} className="text-slate-800" />
                            )}
                            <style dangerouslySetInnerHTML={{
                                __html: `
                @keyframes pulse-audio { 0% { height: 10%; } 100% { height: 100%; } }
              `}} />
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white truncate px-2" title={currentTrack?.name || 'Nenhuma faixa'}>
                                {currentTrack?.name || 'Aguardando Áudio...'}
                            </h2>
                            <p className="text-slate-400 mt-1">
                                {tracks.length > 0 ? `Faixa ${currentIndex + 1} de ${tracks.length}` : 'Adicione músicas à fila'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-100 ease-linear"
                                    style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs font-mono text-slate-500">
                                <span>{formatTime(progress)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 mt-2">
                            <button
                                onClick={() => setLoopMode(loopMode === 'all' ? 'one' : 'all')}
                                className={`p-3 rounded-full transition-colors ${loopMode === 'one' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                                title="Alternar Modo de Repetição"
                            >
                                {loopMode === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
                            </button>

                            <button
                                onClick={togglePlayPause}
                                className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center transition-transform transform active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                            </button>

                            <button
                                onClick={handleSkip}
                                className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                                title="Pular faixa (CTRL + S)"
                            >
                                <SkipForward size={28} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mt-4 text-slate-400 px-6">
                            <Volume2 size={18} />
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full accent-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-slate-950">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-lg text-slate-200">FILA DE REPRODUÇÃO</h3>
                            <div className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400 font-mono">
                                {tracks.length} itens
                            </div>
                        </div>

                        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs font-semibold">
                            <button
                                onClick={() => setDropMode('next')}
                                className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${dropMode === 'next' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                                title="CTRL + N"
                            >
                                <ListPlus size={14} /> Tocar Seguida
                            </button>
                            <button
                                onClick={() => setDropMode('end')}
                                className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${dropMode === 'end' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                                title="CTRL + E"
                            >
                                <ListEnd size={14} /> Add ao Final
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {tracks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                                <FolderPlus size={64} className="text-slate-800" />
                                <div className="text-center">
                                    <p className="text-lg text-slate-400 font-semibold mb-1">A fila está vazia</p>
                                    <p className="text-sm">Arraste e solte arquivos de áudio em qualquer lugar</p>
                                </div>

                                <label className="mt-4 px-6 py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg cursor-pointer transition-colors flex items-center gap-2 font-semibold">
                                    <Plus size={20} /> Adicionar Arquivos
                                    <input type="file" multiple accept="audio/*" onChange={onFileInput} className="hidden" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {tracks.map((track, index) => {
                                    const isActive = index === currentIndex;
                                    const isPast = index < currentIndex;

                                    return (
                                        <div
                                            key={track.id}
                                            className={`group flex items-center justify-between p-3 rounded-xl transition-all ${isActive
                                                    ? 'bg-slate-800 border-l-4 border-emerald-500 shadow-md'
                                                    : isPast
                                                        ? 'opacity-50 hover:opacity-100 hover:bg-slate-900 border-l-4 border-transparent'
                                                        : 'hover:bg-slate-900 border-l-4 border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="w-8 flex items-center justify-center text-slate-600 font-mono text-sm">
                                                    {isActive ? (
                                                        <Radio size={16} className="text-emerald-500 animate-pulse" />
                                                    ) : (
                                                        <span>{index + 1}</span>
                                                    )}
                                                </div>

                                                <div
                                                    className="flex flex-col cursor-pointer truncate"
                                                    onClick={() => playSpecificTrack(index)}
                                                >
                                                    <span className={`truncate font-medium ${isActive ? 'text-emerald-400' : 'text-slate-300 group-hover:text-white'}`}>
                                                        {track.name}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveTrack(index, -1)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded" title="Mover para cima">
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button onClick={() => moveTrack(index, 1)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded" title="Mover para baixo">
                                                    <ArrowDown size={16} />
                                                </button>
                                                <button onClick={() => removeTrack(index)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded ml-2" title="Remover faixa">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {tracks.length > 0 && (
                            <div className="p-4 mt-4 border-t border-slate-800 border-dashed text-center">
                                <label className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors py-2 px-4 rounded-full border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/10">
                                    <Plus size={16} /> Procurar mais arquivos
                                    <input type="file" multiple accept="audio/*" onChange={onFileInput} className="hidden" />
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="bg-slate-950 border-t border-slate-900 p-2 text-center text-xs text-slate-600 flex justify-center items-center gap-2">
                <Info size={12} />
                O áudio continuará tocando e realizando crossfades independentemente da janela estar minimizada. Arraste arquivos sobre a janela a qualquer momento.
            </footer>
        </div>
    );
}