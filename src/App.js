import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Star, 
  Search, 
  Music, 
  PlayCircle, 
  MessageCircle, 
  Sparkles,
  TrendingUp,
  Send,
  Brain,
  Home,
  Library,
  Compass,
  Settings,
  User,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Maximize2
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Audio Player Context
const AudioPlayerContext = React.createContext();

const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};

const AudioPlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  
  // Initialize audio element and context
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.crossOrigin = 'anonymous';
      
      // Audio event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration);
      });
      
      audioRef.current.addEventListener('ended', handleSongEnd);
      audioRef.current.addEventListener('error', handleAudioError);
      
      // Add play event listener to ensure audio context is resumed
      audioRef.current.addEventListener('play', () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      });
    }
    
    // Initialize audio context on first user interaction
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Remove the event listener after first interaction
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('touchstart', initAudioContext);
    };
    
    document.addEventListener('click', initAudioContext);
    document.addEventListener('touchstart', initAudioContext);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('touchstart', initAudioContext);
    };
  }, []);
  
  // Update audio properties when they change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Generate actual playable audio for demo purposes
  const generateAudioUrl = useCallback((song) => {
    return new Promise((resolve) => {
      try {
        // Use existing audio context or create new one
        const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
        if (!audioContextRef.current) {
          audioContextRef.current = audioContext;
        }
        const sampleRate = audioContext.sampleRate;
        const duration = song.duration_ms / 1000; // Use actual song duration
        const frames = sampleRate * duration;
        const arrayBuffer = audioContext.createBuffer(2, frames, sampleRate);
        
        // Generate unique audio based on song properties
        const songHash = song.name.length + song.artist.length + song.artist.charCodeAt(0);
        const baseFreq = 200 + (songHash % 300); // Base frequency between 200-500 Hz
        
        // Create different patterns based on genre
        const genre = song.genres[0] || 'pop';
        let pattern = 'melody';
        
        if (genre.includes('electronic') || genre.includes('dance')) {
          pattern = 'beat';
        } else if (genre.includes('rock') || genre.includes('metal')) {
          pattern = 'power';
        } else if (genre.includes('jazz') || genre.includes('blues')) {
          pattern = 'smooth';
        } else if (genre.includes('classical')) {
          pattern = 'orchestra';
        }
        
        for (let channel = 0; channel < arrayBuffer.numberOfChannels; channel++) {
          const nowBuffering = arrayBuffer.getChannelData(channel);
          
          for (let i = 0; i < frames; i++) {
            const time = i / sampleRate;
            let sample = 0;
            
            switch (pattern) {
              case 'beat':
                // Electronic beat pattern
                sample = Math.sin(2 * Math.PI * baseFreq * time) * 0.3;
                sample += Math.sin(2 * Math.PI * (baseFreq * 2) * time) * 0.1;
                sample *= (Math.sin(time * 8) > 0 ? 1 : 0.1); // Beat effect
                break;
                
              case 'power':
                // Rock power chord simulation
                sample = Math.sin(2 * Math.PI * baseFreq * time) * 0.4;
                sample += Math.sin(2 * Math.PI * (baseFreq * 1.5) * time) * 0.2;
                sample += Math.sin(2 * Math.PI * (baseFreq * 2) * time) * 0.1;
                sample *= Math.exp(-((time % 2) * 2)); // Decay effect
                break;
                
              case 'smooth':
                // Smooth jazz-like tones
                sample = Math.sin(2 * Math.PI * baseFreq * time) * 0.3;
                sample += Math.sin(2 * Math.PI * (baseFreq * 1.25) * time) * 0.15;
                sample *= (1 + Math.sin(time * 0.5) * 0.2); // Vibrato
                break;
                
              case 'orchestra':
                // Classical orchestral simulation
                sample = Math.sin(2 * Math.PI * baseFreq * time) * 0.2;
                sample += Math.sin(2 * Math.PI * (baseFreq * 1.33) * time) * 0.15;
                sample += Math.sin(2 * Math.PI * (baseFreq * 1.5) * time) * 0.1;
                sample += Math.sin(2 * Math.PI * (baseFreq * 2) * time) * 0.05;
                break;
                
              default: // melody
                // Pop melody simulation
                const note = Math.floor((time * 2) % 8);
                const noteFreq = baseFreq * Math.pow(2, note / 12);
                sample = Math.sin(2 * Math.PI * noteFreq * time) * 0.3;
                sample += Math.sin(2 * Math.PI * noteFreq * 2 * time) * 0.1;
                break;
            }
            
            // Apply envelope (fade in/out)
            const envelope = Math.min(time * 4, 1) * Math.min((duration - time) * 4, 1);
            sample *= envelope;
            
            // Add some stereo panning
            if (channel === 0) {
              sample *= 0.8; // Left channel
            } else {
              sample *= 1.2; // Right channel
            }
            
            nowBuffering[i] = Math.max(-1, Math.min(1, sample)); // Clamp to [-1, 1]
          }
        }
        
        // Convert to WAV blob
        const wavBuffer = audioBufferToWav(arrayBuffer);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        resolve(url);
        
      } catch (error) {
        console.error('Audio generation error:', error);
        // Fallback: create a simple beep
        resolve(createSimpleBeep(song));
      }
    });
  }, []);
  
  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = useCallback((buffer) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }, []);
  
  // Fallback simple beep generator
  const createSimpleBeep = useCallback((song) => {
    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioContextRef.current) {
        audioContextRef.current = audioContext;
      }
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Create unique frequency based on song
      const songHash = song.name.length + song.artist.length;
      const frequency = 220 + (songHash % 440);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.5);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      
      return 'beep'; // Special identifier for beep mode
    } catch (error) {
      console.error('Beep generation error:', error);
      return 'beep';
    }
  }, []);
  
  const handleSongEnd = useCallback(() => {
    if (isRepeat) {
      playSong(currentSong);
    } else {
      playNext();
    }
  }, [isRepeat, currentSong]);
  
  const handleAudioError = useCallback((error) => {
    console.error('Audio playback error:', error);
    toast.error('Failed to play audio');
    setIsPlaying(false);
  }, []);
  
  const playSong = useCallback(async (song, songQueue = [], index = 0) => {
    if (!song) return;
    
    try {
      setCurrentSong(song);
      setQueue(songQueue.length > 0 ? songQueue : [song]);
      setCurrentIndex(index);
      setIsPlaying(false); // Set to false initially
      
      let audioUrl = song.preview_url;
      
      // If Spotify doesn't have preview, try iTunes API
      if (!audioUrl) {
        console.log(`🔍 Searching iTunes for: ${song.name} by ${song.artist}`);
        toast.info(`Searching for preview of "${song.name}"...`);
        
        try {
          // Search iTunes for the song
          const searchTerm = encodeURIComponent(`${song.name} ${song.artist}`);
          const itunesUrl = `https://itunes.apple.com/search?term=${searchTerm}&media=music&entity=song&limit=1`;
          console.log(`📡 iTunes API URL: ${itunesUrl}`);
          
          const response = await axios.get(itunesUrl);
          console.log(`✅ iTunes API response:`, response.data);
          
          if (response.data.results && response.data.results.length > 0) {
            const itunesTrack = response.data.results[0];
            const itunesPreviewUrl = itunesTrack.previewUrl;
            
            console.log(`🎵 Found iTunes preview URL: ${itunesPreviewUrl}`);
            
            if (itunesPreviewUrl) {
              // Use backend proxy to avoid CORS issues
              audioUrl = `${API}/audio/proxy?url=${encodeURIComponent(itunesPreviewUrl)}`;
              console.log(`🔄 Using proxy URL: ${audioUrl}`);
              toast.success(`Found preview from iTunes!`);
            }
          } else {
            console.log(`❌ No iTunes results found`);
          }
          
          if (!audioUrl) {
            toast.error(`No preview available for "${song.name}". Try opening in Spotify to listen.`, {
              duration: 4000
            });
            setIsPlaying(false);
            return;
          }
        } catch (itunesError) {
          console.error('❌ iTunes search error:', itunesError);
          toast.error(`Preview not available for "${song.name}".`);
          setIsPlaying(false);
          return;
        }
      } else {
        console.log(`✅ Using Spotify preview URL: ${audioUrl}`);
      }
      
      if (audioRef.current && audioUrl) {
        console.log(`🎧 Attempting to load audio from: ${audioUrl}`);
        
        // Stop any current playback
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        // Set crossOrigin to anonymous to handle CORS
        audioRef.current.crossOrigin = "anonymous";
        audioRef.current.src = audioUrl;
        
        // Add error listener before loading
        audioRef.current.onerror = (e) => {
          console.error('❌ Audio load error:', e);
          console.error('❌ Audio element error details:', {
            error: audioRef.current.error,
            networkState: audioRef.current.networkState,
            readyState: audioRef.current.readyState
          });
          toast.error(`Failed to load audio preview. The track may not be available for streaming.`);
          setIsPlaying(false);
        };
        
        // Wait for audio to load
        await new Promise((resolve, reject) => {
          const handleLoad = () => {
            audioRef.current.removeEventListener('canplay', handleLoad);
            audioRef.current.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = (error) => {
            audioRef.current.removeEventListener('canplay', handleLoad);
            audioRef.current.removeEventListener('error', handleError);
            reject(error);
          };
          
          audioRef.current.addEventListener('canplay', handleLoad);
          audioRef.current.addEventListener('error', handleError);
          
          audioRef.current.load();
        });
        
        try {
          // Play the audio
          await audioRef.current.play();
          setIsPlaying(true);
          setDuration(audioRef.current.duration || song.duration_ms / 1000);
          
          // Start progress tracking
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          intervalRef.current = setInterval(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }, 500); // Update more frequently for smoother progress
          
          toast.success(`🎵 Now playing: ${song.name} by ${song.artist}`);
        } catch (playError) {
          console.error('Play error:', playError);
          // Try without crossOrigin if it fails
          audioRef.current.crossOrigin = null;
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          
          try {
            await audioRef.current.play();
            setIsPlaying(true);
            setDuration(audioRef.current.duration || song.duration_ms / 1000);
            
            // Start progress tracking
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            intervalRef.current = setInterval(() => {
              if (audioRef.current && !audioRef.current.paused) {
                setCurrentTime(audioRef.current.currentTime);
              }
            }, 500);
            
            toast.success(`🎵 Now playing: ${song.name} by ${song.artist}`);
          } catch (retryError) {
            throw retryError;
          }
        }
      }
      
    } catch (error) {
      console.error('Play error:', error);
      toast.error(`Failed to play "${song.name}". ${error.message || 'Unknown error'}`);
      setIsPlaying(false);
    }
  }, [handleSongEnd]);
  
  const pauseSong = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);
  
  const resumeSong = useCallback(async () => {
    if (currentSong) {
      try {
        // Try to resume actual audio
        if (audioRef.current && audioRef.current.src) {
          await audioRef.current.play();
          setIsPlaying(true);
          
          // Resume progress tracking
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          intervalRef.current = setInterval(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }, 500);
          
          toast.success('▶️ Resumed playback');
        } else {
          // Fallback: simulate resume
          setIsPlaying(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          intervalRef.current = setInterval(() => {
            setCurrentTime(prev => {
              const newTime = prev + 1;
              if (newTime >= duration) {
                handleSongEnd();
                return 0;
              }
              return newTime;
            });
          }, 1000);
          
          toast.success('▶️ Resumed playback (Demo mode)');
        }
      } catch (error) {
        console.error('Resume error:', error);
        // Always fallback to simulation
        setIsPlaying(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            const newTime = prev + 1;
            if (newTime >= duration) {
              handleSongEnd();
              return 0;
            }
            return newTime;
          });
        }, 1000);
        
        toast.success('▶️ Resumed playback (Demo mode)');
      }
    }
  }, [currentSong, duration, handleSongEnd]);
  
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseSong();
    } else if (currentSong) {
      resumeSong();
    }
  }, [isPlaying, currentSong, pauseSong, resumeSong]);
  
  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }
    
    const nextSong = queue[nextIndex];
    if (nextSong) {
      playSong(nextSong, queue, nextIndex);
    }
  }, [queue, currentIndex, isShuffled, playSong]);
  
  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    
    let prevIndex;
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentIndex - 1 < 0 ? queue.length - 1 : currentIndex - 1;
    }
    
    const prevSong = queue[prevIndex];
    if (prevSong) {
      playSong(prevSong, queue, prevIndex);
    }
  }, [queue, currentIndex, isShuffled, playSong]);
  
  const seekTo = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }, []);
  
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  
  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => !prev);
    toast.success(`Shuffle ${!isShuffled ? 'enabled' : 'disabled'}`);
  }, [isShuffled]);
  
  const toggleRepeat = useCallback(() => {
    setIsRepeat(prev => !prev);
    toast.success(`Repeat ${!isRepeat ? 'enabled' : 'disabled'}`);
  }, [isRepeat]);
  
  const addToQueue = useCallback((songs) => {
    const songsArray = Array.isArray(songs) ? songs : [songs];
    setQueue(prev => [...prev, ...songsArray]);
    toast.success(`Added ${songsArray.length} song(s) to queue`);
  }, []);
  
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    toast.success('Queue cleared');
  }, []);
  
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  const value = {
    // State
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    isRepeat,
    queue,
    currentIndex,
    isPlayerMinimized,
    
    // Actions
    playSong,
    pauseSong,
    resumeSong,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    addToQueue,
    clearQueue,
    setIsPlayerMinimized,
    
    // Utilities
    formatTime
  };
  
  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

// useContext already imported above

// API functions
const api = {
  // Users
  createUser: (userData) => axios.post(`${API}/users`, userData),
  getUser: (userId) => axios.get(`${API}/users/${userId}`),
  getUsers: () => axios.get(`${API}/users`),
  
  // Songs
  searchSongs: (searchData) => axios.post(`${API}/songs/search`, searchData),
  getSongs: () => axios.get(`${API}/songs`),
  getSong: (songId) => axios.get(`${API}/songs/${songId}`),
  
  // Playlists
  getPlaylists: (query = '') => axios.get(`${API}/playlists?query=${encodeURIComponent(query)}`),
  getPlaylist: (playlistId) => axios.get(`${API}/playlists/${playlistId}`),
  getPlaylistsByGenre: (genre) => axios.get(`${API}/playlists/genre/${encodeURIComponent(genre)}`),
  
  // Ratings
  createRating: (ratingData) => axios.post(`${API}/ratings`, ratingData),
  getUserRatings: (userId) => axios.get(`${API}/ratings/user/${userId}`),
  
  // Favorites
  createFavorite: (favoriteData) => axios.post(`${API}/favorites`, favoriteData),
  removeFavorite: (userId, songId) => axios.delete(`${API}/favorites/${userId}/${songId}`),
  getUserFavorites: (userId) => axios.get(`${API}/favorites/user/${userId}`),
  
  // Recommendations
  getRecommendations: (userId, limit = 10) => axios.get(`${API}/recommendations/${userId}?limit=${limit}`),
  
  // Chat
  explainRecommendation: (messageData) => axios.post(`${API}/chat/explain`, messageData),
  
  // Init data
  initializeData: () => axios.post(`${API}/init-data`),
  
  // Spotify Configuration
  configureSpotify: (credentials) => axios.post(`${API}/spotify/configure`, credentials),
  getSpotifyStatus: () => axios.get(`${API}/spotify/status`),
  
  // Enhanced Discovery
  getTrendingMusic: () => axios.get(`${API}/discover/trending`),
  getNewReleases: () => axios.get(`${API}/discover/new-releases`),
};

// Components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
  </div>
);

const AudioPlayer = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    isRepeat,
    queue,
    isPlayerMinimized,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setIsPlayerMinimized,
    formatTime
  } = useAudioPlayer();
  
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  if (!currentSong) return null;
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seekTo(newTime);
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };
  
  if (isPlayerMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="bg-white/95 backdrop-blur-sm border-slate-200 shadow-xl">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0">
                {currentSong.image_url ? (
                  <img src={currentSong.image_url} alt={currentSong.name} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-6 h-6 text-white m-3" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{currentSong.name}</p>
                <p className="text-xs text-slate-600 truncate">{currentSong.artist}</p>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={togglePlayPause}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                data-testid="mini-player-play-pause"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPlayerMinimized(false)}
                className="text-slate-600 hover:text-slate-700"
                data-testid="expand-player-btn"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-2xl"
      data-testid="audio-player"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center space-x-4">
          {/* Song Info */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0">
              {currentSong.image_url ? (
                <img src={currentSong.image_url} alt={currentSong.name} className="w-full h-full object-cover" />
              ) : (
                <Music className="w-8 h-8 text-white m-4" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{currentSong.name}</h3>
              <p className="text-sm text-slate-600 truncate">{currentSong.artist}</p>
              <div className="flex items-center space-x-2 mt-1">
                {currentSong.genres?.slice(0, 2).map((genre, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-2 flex-1 max-w-md">
            <div className="flex items-center space-x-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleShuffle}
                className={`${isShuffled ? 'text-emerald-600' : 'text-slate-600'} hover:text-emerald-700`}
                data-testid="shuffle-btn"
              >
                <Shuffle className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={playPrevious}
                disabled={queue.length <= 1}
                className="text-slate-600 hover:text-slate-900 disabled:opacity-50"
                data-testid="previous-btn"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                size="lg"
                onClick={togglePlayPause}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-12 h-12 p-0"
                data-testid="main-play-pause-btn"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={playNext}
                disabled={queue.length <= 1}
                className="text-slate-600 hover:text-slate-900 disabled:opacity-50"
                data-testid="next-btn"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleRepeat}
                className={`${isRepeat ? 'text-emerald-600' : 'text-slate-600'} hover:text-emerald-700`}
                data-testid="repeat-btn"
              >
                <Repeat className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Progress Bar */}
            <div className="flex items-center space-x-2 w-full">
              <span className="text-xs text-slate-500 w-10">{formatTime(currentTime)}</span>
              <div 
                className="flex-1 h-2 bg-slate-200 rounded-full cursor-pointer group"
                onClick={handleProgressClick}
                data-testid="progress-bar"
              >
                <div 
                  className="h-full bg-emerald-500 rounded-full relative group-hover:bg-emerald-600 transition-colors"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              <span className="text-xs text-slate-500 w-10">{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Volume & Extra Controls */}
          <div className="flex items-center space-x-2 flex-1 justify-end">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="text-slate-600 hover:text-slate-900"
                data-testid="volume-btn"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <AnimatePresence>
                {showVolumeSlider && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-slate-200 p-3"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                      data-testid="volume-slider"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="text-xs text-slate-500">
              {queue.length > 1 && `${queue.length} in queue`}
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPlayerMinimized(true)}
              className="text-slate-600 hover:text-slate-700"
              data-testid="minimize-player-btn"
            >
              <Music className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Navigation = ({ currentUser, onOpenChat }) => {
  const location = useLocation();
  
  const navigationItems = [
    { path: '/', icon: Home, label: 'Home', testId: 'nav-home' },
    { path: '/discover', icon: Compass, label: 'Discover', testId: 'nav-discover' },
    { path: '/playlists', icon: Music, label: 'Playlists', testId: 'nav-playlists' },
    { path: '/my-music', icon: Library, label: 'My Music', testId: 'nav-my-music' },
    { path: '/settings', icon: Settings, label: 'Settings', testId: 'nav-settings' },
  ];
  
  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">SoundScout</h1>
          </Link>
          
          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={item.testId}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          
          {/* User Profile */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOpenChat}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hidden sm:flex"
              data-testid="nav-ask-ai-btn"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask AI
            </Button>
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 rounded-full">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-emerald-700 font-medium hidden sm:block">
                {currentUser?.name || 'User'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-slate-200">
          <div className="flex items-center justify-around py-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`mobile-${item.testId}`}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

const SongCard = ({ song, onRate, onToggleFavorite, currentUser, userRatings = [], userFavorites = [], showActions = true, playlist = null }) => {
  const [isRating, setIsRating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  const { playSong, currentSong, isPlaying } = useAudioPlayer();
  
  const currentRating = userRatings.find(r => r.song_id === song.spotify_id || r.song_id === song.id);
  const isFavorite = userFavorites.some(f => f.song_id === song.spotify_id || f.song_id === song.id);
  const isCurrentSong = currentSong?.spotify_id === song.spotify_id;
  
  const handleRate = async (rating) => {
    if (!currentUser || isRating) return;
    setIsRating(true);
    try {
      await onRate(song.spotify_id || song.id, rating);
      toast.success(`Rated "${song.name}" ${rating} stars!`);
    } catch (error) {
      toast.error('Failed to rate song');
    } finally {
      setIsRating(false);
    }
  };
  
  const handleToggleFavorite = async () => {
    if (!currentUser || isToggling) return;
    setIsToggling(true);
    try {
      await onToggleFavorite(song.spotify_id || song.id);
      toast.success(
        isFavorite 
          ? `Removed "${song.name}" from favorites` 
          : `Added "${song.name}" to favorites`
      );
    } catch (error) {
      toast.error('Failed to update favorites');
    } finally {
      setIsToggling(false);
    }
  };
  
  const handlePlaySong = () => {
    if (playlist && playlist.songs) {
      // Play song with entire playlist as queue
      const songIndex = playlist.songs.findIndex(s => s.spotify_id === song.spotify_id);
      playSong(song, playlist.songs, songIndex);
    } else {
      // Play single song
      playSong(song);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-slate-50 to-white border-slate-200 hover:border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Album Art */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0">
              {song.image_url ? (
                <img 
                  src={song.image_url} 
                  alt={song.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300" />
              
              {/* Play Button Overlay */}
              <button
                onClick={handlePlaySong}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110"
                data-testid={`play-song-${song.spotify_id}`}
                title="Play preview"
              >
                {isCurrentSong && isPlaying ? (
                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                    <Pause className="w-4 h-4 text-emerald-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-emerald-600 ml-0.5" />
                  </div>
                )}
              </button>
              
              {/* Currently Playing Indicator */}
              {isCurrentSong && (
                <div className="absolute top-1 right-1">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
              )}
              
            </div>
            
            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate mb-1 group-hover:text-emerald-700 transition-colors">
                {song.name}
              </h3>
              <p className="text-sm text-slate-600 truncate mb-2">
                {song.artist}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {song.genres?.slice(0, 2).map((genre, index) => (
                  <Badge key={index} variant="secondary" className="text-xs capitalize bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                    {genre}
                  </Badge>
                ))}
              </div>
              
              {showActions && currentUser && (
                <div className="flex items-center justify-between">
                  {/* Star Rating */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate(star)}
                        disabled={isRating}
                        className="p-1 hover:scale-110 transition-transform disabled:opacity-50"
                        data-testid={`rate-song-${star}-stars`}
                      >
                        <Star 
                          className={`w-4 h-4 ${
                            currentRating && star <= currentRating.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300 hover:text-yellow-400'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  
                  {/* Favorite Button */}
                  <button
                    onClick={handleToggleFavorite}
                    disabled={isToggling}
                    className="p-2 hover:scale-110 transition-transform disabled:opacity-50"
                    data-testid="toggle-favorite-btn"
                  >
                    <Heart 
                      className={`w-5 h-5 ${
                        isFavorite
                          ? 'fill-red-500 text-red-500'
                          : 'text-slate-400 hover:text-red-500'
                      } transition-colors`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const RecommendationCard = ({ recommendation, onRate, onToggleFavorite, currentUser, userRatings = [], userFavorites = [], onExplain }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200 hover:border-emerald-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">AI Recommended</span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
              {Math.round(recommendation.score * 100)}% match
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SongCard 
            song={recommendation.song_details}
            onRate={onRate}
            onToggleFavorite={onToggleFavorite}
            currentUser={currentUser}
            userRatings={userRatings}
            userFavorites={userFavorites}
          />
          
          <div className="mt-4 p-3 bg-white/50 rounded-lg border border-emerald-100">
            <p className="text-sm text-slate-700 mb-3">
              <span className="font-medium">Why this song:</span> {recommendation.reason}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onExplain(recommendation)}
              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
              data-testid="explain-recommendation-btn"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Explain why this matches my taste
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ChatInterface = ({ isOpen, onClose, currentUser, chatHistory, onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  
  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-cyan-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Music AI Assistant</h2>
              <p className="text-sm text-slate-600">Ask me about your music recommendations</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </Button>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
          {chatHistory.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Start a conversation!</p>
              <p className="text-sm text-slate-400">Ask me why a song was recommended or about your music taste.</p>
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{chat.message}</p>
                  </div>
                </div>
                
                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{chat.response}</p>
                    <div className="flex items-center mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${
                              i < Math.round(chat.confidence * 5) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-slate-300'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500 ml-2">Confidence</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex space-x-3">
            <Textarea
              placeholder="Ask me why a song was recommended or about your music taste..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
              data-testid="chat-input"
            />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6"
              data-testid="send-message-btn"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Pages
const HomePage = ({ currentUser, setCurrentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Queries
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery(
    ['recommendations', currentUser?.id],
    () => currentUser ? api.getRecommendations(currentUser.id, 8).then(res => res.data) : null,
    {
      enabled: !!currentUser,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
  
  const { data: userRatings = [] } = useQuery(
    ['userRatings', currentUser?.id],
    () => currentUser ? api.getUserRatings(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  const { data: userFavorites = [] } = useQuery(
    ['userFavorites', currentUser?.id],
    () => currentUser ? api.getUserFavorites(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  // Mutations
  const rateMutation = useMutation(
    ({ songId, rating }) => api.createRating({ user_id: currentUser.id, song_id: songId, rating }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userRatings', currentUser.id]);
        queryClient.invalidateQueries(['recommendations', currentUser.id]);
      }
    }
  );
  
  const favoriteMutation = useMutation(
    async (songId) => {
      const isFavorite = userFavorites.some(f => f.song_id === songId);
      if (isFavorite) {
        await api.removeFavorite(currentUser.id, songId);
      } else {
        await api.createFavorite({ user_id: currentUser.id, song_id: songId });
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userFavorites', currentUser.id]);
        queryClient.invalidateQueries(['recommendations', currentUser.id]);
      }
    }
  );
  
  // Chat functionality moved to global level
  
  // Handlers
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await api.searchSongs({ query: searchQuery, limit: 20 });
      setSearchResults(response.data.songs);
    } catch (error) {
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleDiscoverMusic = async () => {
    setIsSearching(true);
    try {
      // Search for popular genres to discover music
      const popularGenres = ['pop', 'rock', 'electronic', 'hip-hop'];
      const randomGenre = popularGenres[Math.floor(Math.random() * popularGenres.length)];
      
      const response = await api.searchSongs({ query: randomGenre, limit: 20 });
      setSearchResults(response.data.songs);
      setSearchQuery(randomGenre); // Set the search query to show what was searched
      toast.success(`Discovering ${randomGenre} music for you!`);
    } catch (error) {
      toast.error('Failed to discover music');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleRate = (songId, rating) => {
    return rateMutation.mutateAsync({ songId, rating });
  };
  
  const handleToggleFavorite = (songId) => {
    return favoriteMutation.mutateAsync(songId);
  };
  
  // handleExplainRecommendation moved to global level
  
  // handleSendChatMessage moved to global level
  
  // Auto-create default user if none exists
  useEffect(() => {
    if (!currentUser) {
      const defaultUser = {
        id: 'default-user',
        name: 'Music Lover',
        email: 'user@soundscout.com',
        favorite_genres: ['pop', 'rock', 'electronic'],
        created_at: new Date().toISOString()
      };
      setCurrentUser(defaultUser);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">SoundScout</h2>
          <p className="text-slate-600">Loading your music experience...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search for songs, artists, or genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
              data-testid="search-input"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="search-btn"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>
        {/* Search Results */}
        {searchResults.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
              <Search className="w-6 h-6 mr-3 text-emerald-600" />
              Search Results
              <Badge className="ml-3 bg-emerald-100 text-emerald-800">
                {searchResults.length} songs
              </Badge>
            </h2>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {searchResults.map((song, index) => (
                <SongCard
                  key={`${song.spotify_id}-${index}`}
                  song={song}
                  onRate={handleRate}
                  onToggleFavorite={handleToggleFavorite}
                  currentUser={currentUser}
                  userRatings={userRatings}
                  userFavorites={userFavorites}
                />
              ))}
            </motion.div>
          </section>
        )}
        
        {/* AI Recommendations */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
            <Sparkles className="w-6 h-6 mr-3 text-emerald-600" />
            AI Recommendations
            <Badge className="ml-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
              Personalized for you
            </Badge>
          </h2>
          
          {recommendationsLoading ? (
            <LoadingSpinner />
          ) : recommendations?.recommendations?.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.15 }}
            >
              {recommendations.recommendations.map((rec, index) => (
                <RecommendationCard
                  key={`${rec.song_id}-${index}`}
                  recommendation={rec}
                  onRate={handleRate}
                  onToggleFavorite={handleToggleFavorite}
                  currentUser={currentUser}
                  userRatings={userRatings}
                  userFavorites={userFavorites}
                  onExplain={() => {/* Chat functionality moved to global level */}}
                />
              ))}
            </motion.div>
          ) : (
            <Card className="p-12 text-center bg-gradient-to-br from-slate-50 to-white border-slate-200">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No recommendations yet</h3>
              <p className="text-slate-600 mb-4">Rate some songs or add them to favorites to get personalized recommendations!</p>
              <Button 
                onClick={handleDiscoverMusic}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                data-testid="discover-music-btn"
              >
                <Search className="w-4 h-4 mr-2" />
                Discover Music
              </Button>
            </Card>
          )}
        </section>
      </main>
      
      {/* Chat Interface moved to global level */}
    </div>
  );
};

const PlaylistCard = ({ playlist, onSelectPlaylist }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      onClick={() => onSelectPlaylist(playlist)}
      className="w-full text-left"
      data-testid={`playlist-${playlist.id}`}
    >
      <Card className="group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-emerald-300">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Playlist Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0 flex items-center justify-center">
              {playlist.image_url ? (
                <img 
                  src={playlist.image_url} 
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <Music className="w-8 h-8 text-white" />
              )}
            </div>
            
            {/* Playlist Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate mb-1 group-hover:text-emerald-700 transition-colors">
                {playlist.name}
              </h3>
              <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                {playlist.description}
              </p>
              <div className="flex items-center text-xs text-slate-500">
                <Music className="w-3 h-3 mr-1" />
                {playlist.songs?.length || 0} songs
              </div>
            </div>
            
            {/* Play Button */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white transition-colors">
                <PlayCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
};

const PlaylistsPage = ({ currentUser }) => {
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Fetch all playlists
  const { data: playlistsData, isLoading: playlistsLoading } = useQuery(
    ['playlists', searchQuery],
    () => api.getPlaylists(searchQuery).then(res => res.data),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
  
  // Fetch user data for interactions
  const { data: userRatings = [] } = useQuery(
    ['userRatings', currentUser?.id],
    () => currentUser ? api.getUserRatings(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  const { data: userFavorites = [] } = useQuery(
    ['userFavorites', currentUser?.id],
    () => currentUser ? api.getUserFavorites(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  // Mutations for song interactions
  const rateMutation = useMutation(
    ({ songId, rating }) => api.createRating({ user_id: currentUser.id, song_id: songId, rating }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userRatings', currentUser.id]);
      }
    }
  );
  
  const favoriteMutation = useMutation(
    async (songId) => {
      const isFavorite = userFavorites.some(f => f.song_id === songId);
      if (isFavorite) {
        await api.removeFavorite(currentUser.id, songId);
      } else {
        await api.createFavorite({ user_id: currentUser.id, song_id: songId });
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userFavorites', currentUser.id]);
      }
    }
  );
  
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // This will trigger a refetch with the new search query
      await queryClient.invalidateQueries(['playlists', searchQuery]);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleSelectPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
  };
  
  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null);
  };
  
  const handleRate = (songId, rating) => {
    return rateMutation.mutateAsync({ songId, rating });
  };
  
  const handleToggleFavorite = (songId) => {
    return favoriteMutation.mutateAsync(songId);
  };
  
  // Playlist categories for better organization
  const playlistCategories = {
    "Popular": ["Top 50 Global", "Pop Hits", "New Releases", "Party Hits"],
    "Indian Music": ["Bollywood Hits", "South Indian Hits", "Punjabi Hits", "Indian Classical", "Regional India"],
    "By Genre": ["Rock Classics", "Hip-Hop Central", "Electronic Vibes", "Jazz & Blues", "R&B Soul", "Country Roads", "Classical Masterpieces", "Reggae Vibes", "Latin Heat", "Alternative Rock"],
    "By Mood": ["Workout Mix", "Chill Vibes", "Love Songs", "Focus & Study"],
    "Collections": ["Road Trip", "Throwback Hits"]
  };
  
  if (selectedPlaylist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Playlist Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button 
              variant="outline" 
              onClick={handleBackToPlaylists}
              className="mb-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              data-testid="back-to-playlists-btn"
            >
              ← Back to Playlists
            </Button>
            
            <div className="flex items-start space-x-6">
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0 flex items-center justify-center">
                {selectedPlaylist.image_url ? (
                  <img 
                    src={selectedPlaylist.image_url} 
                    alt={selectedPlaylist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-16 h-16 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  {selectedPlaylist.name}
                </h1>
                <p className="text-lg text-slate-600 mb-4">
                  {selectedPlaylist.description}
                </p>
                <div className="flex items-center space-x-6 text-sm text-slate-500">
                  <span className="flex items-center">
                    <Music className="w-4 h-4 mr-1" />
                    {selectedPlaylist.songs?.length || 0} songs
                  </span>
                  <span className="flex items-center">
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Ready to play
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Playlist Songs */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Songs</h2>
            
            {selectedPlaylist.songs && selectedPlaylist.songs.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {selectedPlaylist.songs.map((song, index) => (
                  <SongCard
                    key={`${song.spotify_id}-${index}`}
                    song={song}
                    onRate={handleRate}
                    onToggleFavorite={handleToggleFavorite}
                    currentUser={currentUser}
                    userRatings={userRatings}
                    userFavorites={userFavorites}
                    playlist={selectedPlaylist}
                  />
                ))}
              </motion.div>
            ) : (
              <Card className="p-12 text-center bg-gradient-to-br from-slate-50 to-white border-slate-200">
                <Music className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No songs in this playlist</h3>
                <p className="text-slate-600">This playlist is currently empty.</p>
              </Card>
            )}
          </section>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Music Playlists
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover curated playlists for every mood, genre, and occasion
          </p>
        </motion.div>
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
              data-testid="playlist-search-input"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="playlist-search-btn"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>
        
        {playlistsLoading ? (
          <LoadingSpinner />
        ) : playlistsData?.playlists?.length > 0 ? (
          <div className="space-y-12">
            {searchQuery ? (
              // Show search results
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                  <Search className="w-6 h-6 mr-3 text-emerald-600" />
                  Search Results
                  <Badge className="ml-3 bg-emerald-100 text-emerald-800">
                    {playlistsData.playlists.length} playlists
                  </Badge>
                </h2>
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ staggerChildren: 0.1 }}
                >
                  {playlistsData.playlists.map((playlist, index) => (
                    <PlaylistCard
                      key={`${playlist.id}-${index}`}
                      playlist={playlist}
                      onSelectPlaylist={handleSelectPlaylist}
                    />
                  ))}
                </motion.div>
              </section>
            ) : (
              // Show categorized playlists
              Object.entries(playlistCategories).map(([category, playlistNames]) => {
                const categoryPlaylists = playlistsData.playlists.filter(playlist => 
                  playlistNames.includes(playlist.name)
                );
                
                if (categoryPlaylists.length === 0) return null;
                
                return (
                  <section key={category}>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                      <Sparkles className="w-6 h-6 mr-3 text-emerald-600" />
                      {category}
                      <Badge className="ml-3 bg-emerald-100 text-emerald-800">
                        {categoryPlaylists.length} playlists
                      </Badge>
                    </h2>
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ staggerChildren: 0.1 }}
                    >
                      {categoryPlaylists.map((playlist, index) => (
                        <PlaylistCard
                          key={`${playlist.id}-${index}`}
                          playlist={playlist}
                          onSelectPlaylist={handleSelectPlaylist}
                        />
                      ))}
                    </motion.div>
                  </section>
                );
              })
            )}
          </div>
        ) : (
          <Card className="p-12 text-center bg-gradient-to-br from-slate-50 to-white border-slate-200">
            <Music className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No playlists found</h3>
            <p className="text-slate-600 mb-4">Try searching for different terms or browse our curated collections.</p>
            <Button 
              onClick={() => {setSearchQuery(''); handleSearch();}}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Music className="w-4 h-4 mr-2" />
              Browse All Playlists
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

// Additional Pages
const DiscoverPage = ({ currentUser, setShowChat }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredSongs, setDiscoveredSongs] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  
  const queryClient = useQueryClient();
  
  const { data: userRatings = [] } = useQuery(
    ['userRatings', currentUser?.id],
    () => currentUser ? api.getUserRatings(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  const { data: userFavorites = [] } = useQuery(
    ['userFavorites', currentUser?.id],
    () => currentUser ? api.getUserFavorites(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  const rateMutation = useMutation(
    ({ songId, rating }) => api.createRating({ user_id: currentUser.id, song_id: songId, rating }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userRatings', currentUser.id]);
      }
    }
  );
  
  const favoriteMutation = useMutation(
    async (songId) => {
      const isFavorite = userFavorites.some(f => f.song_id === songId);
      if (isFavorite) {
        await api.removeFavorite(currentUser.id, songId);
      } else {
        await api.createFavorite({ user_id: currentUser.id, song_id: songId });
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userFavorites', currentUser.id]);
      }
    }
  );
  
  const genres = [
    { name: 'Pop', color: 'from-pink-400 to-rose-500', icon: '🎵' },
    { name: 'Bollywood', color: 'from-orange-400 to-red-500', icon: '🎬' },
    { name: 'Punjabi', color: 'from-green-400 to-emerald-500', icon: '🪘' },
    { name: 'Rock', color: 'from-red-500 to-orange-600', icon: '🎸' },
    { name: 'Tamil', color: 'from-blue-400 to-cyan-500', icon: '🎭' },
    { name: 'Electronic', color: 'from-purple-500 to-blue-600', icon: '🎧' },
    { name: 'Hip-Hop', color: 'from-yellow-400 to-orange-500', icon: '🎤' },
    { name: 'Jazz', color: 'from-blue-500 to-indigo-600', icon: '🎺' },
    { name: 'Classical', color: 'from-indigo-500 to-purple-600', icon: '🎻' },
    { name: 'Telugu', color: 'from-teal-400 to-green-500', icon: '🎪' },
    { name: 'K-Pop', color: 'from-pink-500 to-purple-500', icon: '💜' },
    { name: 'Latin', color: 'from-rose-400 to-pink-500', icon: '💃' },
  ];
  
  const discoverByGenre = async (genre) => {
    setIsLoading(true);
    setSelectedGenre(genre);
    try {
      const response = await api.searchSongs({ query: genre.toLowerCase(), limit: 20 });
      setDiscoveredSongs(response.data.songs);
      toast.success(`Discovered ${genre} music for you!`);
    } catch (error) {
      toast.error('Failed to discover music');
      setDiscoveredSongs([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRate = (songId, rating) => {
    return rateMutation.mutateAsync({ songId, rating });
  };
  
  const handleToggleFavorite = (songId) => {
    return favoriteMutation.mutateAsync(songId);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Discover New Music
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Explore different genres and find your next favorite song
          </p>
        </motion.div>
        
        {/* Genre Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
            <Compass className="w-6 h-6 mr-3 text-emerald-600" />
            Browse by Genre
          </h2>
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {genres.map((genre, index) => (
              <motion.button
                key={genre.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => discoverByGenre(genre.name)}
                disabled={isLoading}
                className={`relative overflow-hidden rounded-2xl p-6 text-white font-semibold text-lg shadow-lg hover:scale-105 transition-all duration-300 bg-gradient-to-br ${genre.color} ${
                  selectedGenre === genre.name ? 'ring-4 ring-white ring-opacity-50' : ''
                }`}
                data-testid={`genre-${genre.name.toLowerCase()}-btn`}
              >
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 flex flex-col items-center space-y-2">
                  <span className="text-3xl">{genre.icon}</span>
                  <span>{genre.name}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </section>
        
        {/* Discovered Songs */}
        {discoveredSongs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
              <Sparkles className="w-6 h-6 mr-3 text-emerald-600" />
              {selectedGenre} Music
              <Badge className="ml-3 bg-emerald-100 text-emerald-800">
                {discoveredSongs.length} songs
              </Badge>
            </h2>
            
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {discoveredSongs.map((song, index) => (
                  <SongCard
                    key={`${song.spotify_id}-${index}`}
                    song={song}
                    onRate={handleRate}
                    onToggleFavorite={handleToggleFavorite}
                    currentUser={currentUser}
                    userRatings={userRatings}
                    userFavorites={userFavorites}
                  />
                ))}
              </motion.div>
            )}
          </section>
        )}
        
        {discoveredSongs.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Compass className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-900 mb-2">Ready to explore?</h3>
            <p className="text-slate-600">Choose a genre above to discover amazing music!</p>
          </div>
        )}
      </main>
    </div>
  );
};

const MyMusicPage = ({ currentUser, setShowChat }) => {
  const { data: userRatings = [] } = useQuery(
    ['userRatings', currentUser?.id],
    () => currentUser ? api.getUserRatings(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  const { data: userFavorites = [] } = useQuery(
    ['userFavorites', currentUser?.id],
    () => currentUser ? api.getUserFavorites(currentUser.id).then(res => res.data) : [],
    { enabled: !!currentUser }
  );
  
  const { data: allSongs = [] } = useQuery('songs', () => api.getSongs().then(res => res.data));
  
  const queryClient = useQueryClient();
  
  const rateMutation = useMutation(
    ({ songId, rating }) => api.createRating({ user_id: currentUser.id, song_id: songId, rating }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userRatings', currentUser.id]);
      }
    }
  );
  
  const favoriteMutation = useMutation(
    async (songId) => {
      const isFavorite = userFavorites.some(f => f.song_id === songId);
      if (isFavorite) {
        await api.removeFavorite(currentUser.id, songId);
      } else {
        await api.createFavorite({ user_id: currentUser.id, song_id: songId });
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userFavorites', currentUser.id]);
      }
    }
  );
  
  const handleRate = (songId, rating) => {
    return rateMutation.mutateAsync({ songId, rating });
  };
  
  const handleToggleFavorite = (songId) => {
    return favoriteMutation.mutateAsync(songId);
  };
  
  // Get favorite songs with details
  const favoriteSongs = userFavorites.map(fav => 
    allSongs.find(song => song.id === fav.song_id || song.spotify_id === fav.song_id)
  ).filter(Boolean);
  
  // Get highly rated songs (4-5 stars)
  const highlyRatedSongs = userRatings
    .filter(rating => rating.rating >= 4)
    .map(rating => ({
      ...allSongs.find(song => song.id === rating.song_id || song.spotify_id === rating.song_id),
      userRating: rating.rating
    }))
    .filter(song => song.name);
  
  const avgRating = userRatings.length > 0 
    ? (userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length).toFixed(1)
    : 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Your Music Library
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Your favorite songs and music you've rated
          </p>
        </motion.div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardContent className="p-6 text-center">
              <Heart className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-slate-900">{userFavorites.length}</div>
              <div className="text-sm text-slate-600">Favorite Songs</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardContent className="p-6 text-center">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-slate-900">{userRatings.length}</div>
              <div className="text-sm text-slate-600">Songs Rated</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-slate-900">{avgRating}</div>
              <div className="text-sm text-slate-600">Average Rating</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Favorite Songs */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
            <Heart className="w-6 h-6 mr-3 text-red-500" />
            Your Favorites
            <Badge className="ml-3 bg-red-100 text-red-800">
              {favoriteSongs.length} songs
            </Badge>
          </h2>
          
          {favoriteSongs.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {favoriteSongs.map((song, index) => (
                <SongCard
                  key={`favorite-${song.spotify_id}-${index}`}
                  song={song}
                  onRate={handleRate}
                  onToggleFavorite={handleToggleFavorite}
                  currentUser={currentUser}
                  userRatings={userRatings}
                  userFavorites={userFavorites}
                />
              ))}
            </motion.div>
          ) : (
            <Card className="p-12 text-center bg-gradient-to-br from-slate-50 to-white border-slate-200">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No favorites yet</h3>
              <p className="text-slate-600 mb-4">Start hearting songs you love!</p>
              <Link to="/discover">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Compass className="w-4 h-4 mr-2" />
                  Discover Music
                </Button>
              </Link>
            </Card>
          )}
        </section>
        
        {/* Highly Rated Songs */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
            <Star className="w-6 h-6 mr-3 text-yellow-500" />
            Your Top Rated
            <Badge className="ml-3 bg-yellow-100 text-yellow-800">
              4+ stars
            </Badge>
          </h2>
          
          {highlyRatedSongs.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {highlyRatedSongs.map((song, index) => (
                <SongCard
                  key={`rated-${song.spotify_id}-${index}`}
                  song={song}
                  onRate={handleRate}
                  onToggleFavorite={handleToggleFavorite}
                  currentUser={currentUser}
                  userRatings={userRatings}
                  userFavorites={userFavorites}
                />
              ))}
            </motion.div>
          ) : (
            <Card className="p-12 text-center bg-gradient-to-br from-slate-50 to-white border-slate-200">
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No high ratings yet</h3>
              <p className="text-slate-600 mb-4">Rate some songs to see your top picks here!</p>
              <Link to="/">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </Link>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

// Spotify Credentials Card Component
const SpotifyCredentialsCard = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: ''
  });
  const [showSecret, setShowSecret] = useState(false);
  const [spotifyStatus, setSpotifyStatus] = useState('checking');
  
  useEffect(() => {
    checkSpotifyStatus();
  }, []);
  
  const checkSpotifyStatus = async () => {
    try {
      const response = await axios.get(`${API}/spotify/status`);
      setSpotifyStatus(response.data.status);
    } catch (error) {
      setSpotifyStatus('error');
    }
  };
  
  const handleSave = async () => {
    if (!credentials.clientId || !credentials.clientSecret) {
      toast.error('Please provide both Client ID and Client Secret');
      return;
    }
    
    setIsSaving(true);
    try {
      await axios.post(`${API}/spotify/configure`, {
        client_id: credentials.clientId.trim(),
        client_secret: credentials.clientSecret.trim()
      });
      
      toast.success('Spotify credentials configured successfully!');
      await checkSpotifyStatus();
      setIsEditing(false);
      setCredentials({ clientId: '', clientSecret: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to configure Spotify credentials');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setCredentials({ clientId: '', clientSecret: '' });
    setIsEditing(false);
  };
  
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Music className="w-5 h-5 mr-2 text-emerald-600" />
          Spotify API Integration
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge className={`${
            spotifyStatus === 'connected' ? 'bg-green-100 text-green-800' :
            spotifyStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {spotifyStatus === 'connected' ? '✓ Connected' :
             spotifyStatus === 'checking' ? 'Checking...' :
             '✕ Not Connected'}
          </Badge>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Configure
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <>
            <p className="text-sm text-slate-600">
              Connect your Spotify Developer credentials to enable real music data, album artwork, and 30-second audio previews.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-900 font-medium mb-2">How to get credentials:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Visit <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Spotify Developer Dashboard</a></li>
                <li>Create a new app or select an existing one</li>
                <li>Copy your Client ID and Client Secret</li>
                <li>Paste them here and save</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Spotify Client ID
              </label>
              <Input
                type="text"
                value={credentials.clientId}
                onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="Enter your Spotify Client ID"
                className="bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Spotify Client Secret
              </label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={credentials.clientSecret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="Enter your Spotify Client Secret"
                  className="bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isSaving ? 'Saving...' : 'Save Credentials'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SettingsPage = ({ currentUser, setCurrentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || 'Music Lover',
    email: currentUser?.email || 'user@soundscout.com',
    bio: currentUser?.bio || 'Music enthusiast discovering new sounds every day.',
    favorite_genres: currentUser?.favorite_genres || ['pop', 'rock', 'electronic'],
    avatar_color: currentUser?.avatar_color || 'emerald'
  });
  const [newGenre, setNewGenre] = useState('');
  
  const queryClient = useQueryClient();
  
  const { data: userStats } = useQuery(
    ['userStats', currentUser?.id],
    async () => {
      const [ratings, favorites] = await Promise.all([
        api.getUserRatings(currentUser.id).then(res => res.data),
        api.getUserFavorites(currentUser.id).then(res => res.data)
      ]);
      
      const avgRating = ratings.length > 0 
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : 0;
      
      const topGenres = profileData.favorite_genres.slice(0, 3);
      
      return {
        totalRatings: ratings.length,
        totalFavorites: favorites.length,
        averageRating: avgRating,
        topGenres,
        joinedDate: currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Today'
      };
    },
    { enabled: !!currentUser }
  );
  
  const avatarColors = [
    { name: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' }
  ];
  
  const selectedAvatarColor = avatarColors.find(color => color.name === profileData.avatar_color) || avatarColors[0];
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update the current user data (in a real app, this would make an API call)
      const updatedUser = {
        ...currentUser,
        ...profileData,
        updated_at: new Date().toISOString()
      };
      
      setCurrentUser(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setProfileData({
      name: currentUser?.name || 'Music Lover',
      email: currentUser?.email || 'user@soundscout.com',
      bio: currentUser?.bio || 'Music enthusiast discovering new sounds every day.',
      favorite_genres: currentUser?.favorite_genres || ['pop', 'rock', 'electronic'],
      avatar_color: currentUser?.avatar_color || 'emerald'
    });
    setIsEditing(false);
  };
  
  const handleAddGenre = () => {
    if (newGenre.trim() && !profileData.favorite_genres.includes(newGenre.trim().toLowerCase())) {
      setProfileData(prev => ({
        ...prev,
        favorite_genres: [...prev.favorite_genres, newGenre.trim().toLowerCase()]
      }));
      setNewGenre('');
    }
  };
  
  const handleRemoveGenre = (genre) => {
    setProfileData(prev => ({
      ...prev,
      favorite_genres: prev.favorite_genres.filter(g => g !== genre)
    }));
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Profile Settings
          </h1>
          <p className="text-lg text-slate-600">
            Customize your music experience and preferences
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-emerald-600" />
                  Profile Information
                </CardTitle>
                <Button 
                  variant={isEditing ? "destructive" : "outline"}
                  size="sm"
                  onClick={isEditing ? handleCancel : () => setIsEditing(true)}
                  data-testid={isEditing ? "cancel-edit-btn" : "edit-profile-btn"}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className={`w-20 h-20 border-4 ${selectedAvatarColor.border}`}>
                      <AvatarFallback className={`${selectedAvatarColor.bg} ${selectedAvatarColor.text} text-2xl font-bold`}>
                        {profileData.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <div className="absolute -bottom-2 -right-2">
                        <Button 
                          size="sm" 
                          className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white p-0"
                          data-testid="change-avatar-btn"
                        >
                          ✏️
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                      {isEditing ? (
                        <Input
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
                          data-testid="edit-name-input"
                        />
                      ) : (
                        <p className="text-lg font-semibold text-slate-900">{profileData.name}</p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
                          data-testid="edit-email-input"
                        />
                      ) : (
                        <p className="text-slate-600">{profileData.email}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                  {isEditing ? (
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about your music taste..."
                      className="bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
                      rows={3}
                      data-testid="edit-bio-input"
                    />
                  ) : (
                    <p className="text-slate-600 italic">{profileData.bio}</p>
                  )}
                </div>
                
                {/* Avatar Color Selection */}
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Avatar Color</label>
                    <div className="flex space-x-3">
                      {avatarColors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setProfileData(prev => ({ ...prev, avatar_color: color.name }))}
                          className={`w-10 h-10 rounded-full border-2 ${color.bg} ${
                            profileData.avatar_color === color.name ? 'border-slate-400 ring-2 ring-slate-300' : 'border-slate-200'
                          } transition-all hover:scale-110`}
                          data-testid={`avatar-color-${color.name}`}
                        >
                          <span className={`${color.text} font-bold`}>
                            {profileData.name.charAt(0).toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Save/Cancel buttons */}
                {isEditing && (
                  <div className="flex space-x-3 pt-4 border-t border-slate-200">
                    <Button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      data-testid="save-profile-btn"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleCancel}
                      data-testid="cancel-profile-btn"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Music Preferences */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Music className="w-5 h-5 mr-2 text-emerald-600" />
                  Music Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Favorite Genres</label>
                  
                  {isEditing && (
                    <div className="flex space-x-2 mb-4">
                      <Input
                        type="text"
                        value={newGenre}
                        onChange={(e) => setNewGenre(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGenre())}
                        placeholder="Add a genre (e.g., jazz, blues, country)"
                        className="flex-1 bg-white/50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
                        data-testid="add-genre-input"
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddGenre}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        data-testid="add-genre-btn"
                      >
                        Add
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {profileData.favorite_genres.map((genre, index) => (
                      <Badge 
                        key={index} 
                        className={`${
                          isEditing 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-800 cursor-pointer'
                            : 'bg-emerald-100 text-emerald-800'
                        } capitalize`}
                        onClick={isEditing ? () => handleRemoveGenre(genre) : undefined}
                        data-testid={`genre-${genre}-badge`}
                      >
                        {genre} {isEditing && '✕'}
                      </Badge>
                    ))}
                  </div>
                  
                  {isEditing && (
                    <p className="text-sm text-slate-500 mt-2">
                      Click on a genre to remove it from your preferences
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Spotify API Credentials */}
            <SpotifyCredentialsCard />
            
            {/* Audio Preview Information */}
            <Card className="bg-blue-50/80 backdrop-blur-sm border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Audio Playback</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      <strong>How it works:</strong> Spotify deprecated preview URLs in November 2024. SoundScout automatically searches iTunes for 30-second MP3 previews when you play a song.
                    </p>
                    <p className="text-sm text-blue-700">
                      Most songs will have playable previews! If a preview isn't found, you can open the song directly in Spotify to listen to the full track.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Stats & Information Sidebar */}
          <div className="space-y-6">
            {/* User Stats */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-lg">
                  <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">{userStats?.totalFavorites || 0}</div>
                  <div className="text-sm text-slate-600">Favorites</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">{userStats?.totalRatings || 0}</div>
                  <div className="text-sm text-slate-600">Songs Rated</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">{userStats?.averageRating || 0}</div>
                  <div className="text-sm text-slate-600">Avg Rating</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-lg">
                  <User className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-slate-900">Member Since</div>
                  <div className="text-sm text-slate-600">{userStats?.joinedDate || 'Today'}</div>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-emerald-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/my-music">
                  <Button className="w-full justify-start bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Library className="w-4 h-4 mr-2" />
                    View My Music
                  </Button>
                </Link>
                
                <Link to="/discover">
                  <Button variant="outline" className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <Compass className="w-4 h-4 mr-2" />
                    Discover New Music
                  </Button>
                </Link>
                
                <Link to="/">
                  <Button variant="outline" className="w-full justify-start">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* App Info */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">SoundScout v1.0</h3>
                <p className="text-sm text-slate-600 mb-4">
                  AI-powered music discovery platform with personalized recommendations
                </p>
                <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
                  <span className="flex items-center">
                    <Brain className="w-3 h-3 mr-1" />
                    Gemini AI
                  </span>
                  <span className="flex items-center">
                    <Heart className="w-3 h-3 mr-1" />
                    Made with love
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component with Navigation
const AppWithNavigation = ({ currentUser, setCurrentUser }) => {
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const explainMutation = useMutation(
    (messageData) => api.explainRecommendation(messageData),
    {
      onSuccess: (response, variables) => {
        setChatHistory(prev => [...prev, {
          message: variables.message,
          response: response.data.response,
          confidence: response.data.confidence
        }]);
      },
      onError: () => {
        toast.error('Failed to get explanation');
      },
      onSettled: () => {
        setIsChatLoading(false);
      }
    }
  );
  
  const handleSendChatMessage = (message) => {
    const context = {
      favorite_genres: currentUser?.favorite_genres || [],
      user_preferences: 'General music taste inquiry'
    };
    
    setIsChatLoading(true);
    explainMutation.mutate({ message, context });
  };
  
  return (
    <div className="App font-sans">
      <Navigation currentUser={currentUser} onOpenChat={() => setShowChat(true)} />
      <Routes>
        <Route 
          path="/" 
          element={<HomePage currentUser={currentUser} setCurrentUser={setCurrentUser} />} 
        />
        <Route 
          path="/discover" 
          element={<DiscoverPage currentUser={currentUser} setShowChat={setShowChat} />} 
        />
        <Route 
          path="/playlists" 
          element={<PlaylistsPage currentUser={currentUser} />} 
        />
        <Route 
          path="/my-music" 
          element={<MyMusicPage currentUser={currentUser} setShowChat={setShowChat} />} 
        />
        <Route 
          path="/settings" 
          element={<SettingsPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} 
        />
      </Routes>
      
      {/* Global Chat Interface */}
      <AnimatePresence>
        <ChatInterface
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          currentUser={currentUser}
          chatHistory={chatHistory}
          onSendMessage={handleSendChatMessage}
          isLoading={isChatLoading}
        />
      </AnimatePresence>
    </div>
  );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Auto-create default user if none exists
  useEffect(() => {
    if (!currentUser) {
      const defaultUser = {
        id: 'default-user',
        name: 'Music Lover',
        email: 'user@soundscout.com',
        favorite_genres: ['pop', 'rock', 'electronic'],
        created_at: new Date().toISOString()
      };
      setCurrentUser(defaultUser);
    }
  }, [currentUser]);
  
  // Initialize sample data on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await api.initializeData();
        console.log('Sample data initialized');
      } catch (error) {
        console.error('Failed to initialize sample data:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeApp();
  }, []);
  
  if (!isInitialized || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">SoundScout</h2>
          <p className="text-slate-600">Loading your music experience...</p>
        </div>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AudioPlayerProvider>
          <AppWithNavigation currentUser={currentUser} setCurrentUser={setCurrentUser} />
          <AudioPlayer />
        </AudioPlayerProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;