import { useState, useEffect, useCallback, useRef, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw } from 'lucide-react';

type Grid = number[][];

const GRID_SIZE = 4;
const WIN_LEVEL = 8;

const WEATHER_MAP: Record<number, { emoji: string; color: string; label: string }> = {
  1: { emoji: '☁️', color: 'bg-white', label: '小云朵' },
  2: { emoji: '☁️☁️', color: 'bg-blue-50', label: '大云朵' },
  3: { emoji: '🌧️', color: 'bg-blue-100', label: '小雨' },
  4: { emoji: '🌧️🌧️', color: 'bg-blue-200', label: '大雨' },
  5: { emoji: '⛈️', color: 'bg-indigo-100', label: '雷雨' },
  6: { emoji: '🌪️', color: 'bg-slate-200', label: '暴风雨' },
  7: { emoji: '🌀', color: 'bg-cyan-100', label: '台风' },
  8: { emoji: '🌈', color: 'bg-gradient-to-r from-red-200 via-yellow-200 to-blue-200', label: '彩虹' },
};

export default function App() {
  const [grid, setGrid] = useState<Grid>(Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [winAlerted, setWinAlerted] = useState(false);

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Initialize game
  const initGame = useCallback(() => {
    let newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setWinAlerted(false);
  }, []);

  useEffect(() => {
    const savedBest = localStorage.getItem('weather-2048-best');
    if (savedBest) setBestScore(parseInt(savedBest));
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('weather-2048-best', score.toString());
    }
  }, [score, bestScore]);

  const addRandomTile = (currentGrid: Grid): Grid => {
    const emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return currentGrid;
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = currentGrid.map(row => [...row]);
    newGrid[r][c] = 1; // Always level 1
    return newGrid;
  };

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    setGrid(prevGrid => {
      let currentGrid = prevGrid.map(row => [...row]);
      let moved = false;
      let newScore = score;
      let wonThisTurn = false;

      const rotateGrid = (g: Grid) => {
        const newG = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            newG[c][GRID_SIZE - 1 - r] = g[r][c];
          }
        }
        return newG;
      };

      // Normalize to "left" movement
      let rotations = 0;
      if (direction === 'up') rotations = 1;
      else if (direction === 'right') rotations = 2;
      else if (direction === 'down') rotations = 3;

      for (let i = 0; i < rotations; i++) currentGrid = rotateGrid(currentGrid);

      // Slide and Merge
      for (let r = 0; r < GRID_SIZE; r++) {
        let row = currentGrid[r].filter(val => val !== 0);
        for (let i = 0; i < row.length - 1; i++) {
          if (row[i] === row[i + 1] && row[i] < WIN_LEVEL) {
            const nextLevel = row[i] + 1;
            row[i] = nextLevel;
            row.splice(i + 1, 1);
            newScore += Math.pow(nextLevel, 2) * 10;
            moved = true;
            if (nextLevel === WIN_LEVEL) wonThisTurn = true;
          }
        }
        while (row.length < GRID_SIZE) row.push(0);
        if (JSON.stringify(currentGrid[r]) !== JSON.stringify(row)) moved = true;
        currentGrid[r] = row;
      }

      // Rotate back
      for (let i = 0; i < (4 - rotations) % 4; i++) currentGrid = rotateGrid(currentGrid);

      if (moved) {
        const gridWithNewTile = addRandomTile(currentGrid);
        setScore(newScore);
        if (wonThisTurn && !winAlerted) {
          setHasWon(true);
          setWinAlerted(true);
          setTimeout(() => alert('你合成彩虹了！恭喜！'), 100);
        }
        
        // Check Game Over
        if (isGameOver(gridWithNewTile)) {
          setGameOver(true);
        }
        
        return gridWithNewTile;
      }
      return prevGrid;
    });
  }, [gameOver, score, winAlerted]);

  const isGameOver = (g: Grid): boolean => {
    // Check for empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (g[r][c] === 0) return false;
      }
    }
    // Check for adjacent merges
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = g[r][c];
        if (val === WIN_LEVEL) continue;
        if (r < GRID_SIZE - 1 && val === g[r + 1][c]) return false;
        if (c < GRID_SIZE - 1 && val === g[r][c + 1]) return false;
      }
    }
    return true;
  };

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('up'); break;
        case 'ArrowDown': move('down'); break;
        case 'ArrowLeft': move('left'); break;
        case 'ArrowRight': move('right'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 30) {
      if (absDx > absDy) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    }
    touchStart.current = null;
  };

  return (
    <div 
      className="flex flex-col items-center gap-6 p-4 max-w-md w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-blue-800 tracking-tight">天气叠叠乐</h1>
          <p className="text-blue-600 font-medium">合成你的彩虹 🌈</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-blue-500/20 backdrop-blur-sm p-2 rounded-xl text-center min-w-[80px]">
            <div className="text-[10px] uppercase font-bold text-blue-700">当前得分</div>
            <div className="text-xl font-bold text-blue-900">{score}</div>
          </div>
          <div className="bg-blue-600/20 backdrop-blur-sm p-2 rounded-xl text-center min-w-[80px]">
            <div className="text-[10px] uppercase font-bold text-blue-800 flex items-center justify-center gap-1">
              <Trophy size={10} /> 最高分
            </div>
            <div className="text-xl font-bold text-blue-900">{bestScore}</div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative bg-blue-400/30 p-3 rounded-2xl shadow-xl backdrop-blur-md border border-white/20">
        <div className="game-grid w-72 h-72 sm:w-80 sm:h-80">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className="bg-blue-200/40 rounded-lg w-full h-full flex items-center justify-center"
              >
                <AnimatePresence mode="popLayout">
                  {cell !== 0 && (
                    <motion.div
                      key={`tile-${r}-${c}-${cell}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className={`w-full h-full rounded-lg flex flex-col items-center justify-center shadow-sm border border-white/40 ${WEATHER_MAP[cell].color}`}
                    >
                      <span className="text-2xl sm:text-3xl">{WEATHER_MAP[cell].emoji}</span>
                      <span className="text-[8px] font-bold text-blue-800/60 uppercase mt-1">
                        {WEATHER_MAP[cell].label}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-blue-900/60 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-white z-10"
            >
              <h2 className="text-3xl font-bold mb-2">游戏结束</h2>
              <p className="mb-6 text-blue-100">最终得分: {score}</p>
              <button
                onClick={initGame}
                className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <RotateCcw size={18} /> 再试一次
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="w-full flex justify-center">
        <button
          onClick={initGame}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
        >
          <RotateCcw size={20} /> 新游戏
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center text-blue-700/60 text-sm max-w-xs">
        <p>使用方向键或滑动屏幕来移动方块</p>
        <p className="mt-1 italic">合并相同的天气，直到出现彩虹！</p>
      </div>
    </div>
  );
}
