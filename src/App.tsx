/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, Settings, HelpCircle, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

// Types for the game state
type TileData = {
  id: string;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerged?: boolean;
};

type GameState = 'playing' | 'won' | 'lost';

const GRID_SIZE = 4;

export default function App() {
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  
  // Refs for touch handling
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Initialize game
  const initGame = useCallback(() => {
    const initialTiles: TileData[] = [];
    
    // Add two random tiles
    const addTile = (currentTiles: TileData[]) => {
      const emptyPositions = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!currentTiles.some(t => t.row === r && t.col === c)) {
            emptyPositions.push({ r, c });
          }
        }
      }
      
      if (emptyPositions.length > 0) {
        const { r, c } = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        const newTile = { id: Date.now().toString(36) + '-' + Math.random().toString(36).substring(2), value, row: r, col: c, isNew: true };
        currentTiles.push(newTile);
      }
    };

    addTile(initialTiles);
    addTile(initialTiles);
    
    setTiles(initialTiles);
    setScore(0);
    setGameState('playing');
  }, []);

  // Load best score
  useEffect(() => {
    const saved = localStorage.getItem('2048-best-score');
    if (saved) setBestScore(parseInt(saved, 10));
    initGame();
  }, [initGame]);

  // Update best score
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048-best-score', score.toString());
    }
  }, [score, bestScore]);

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setTiles(prevTiles => {
      // Use prevTiles perfectly synchronised
      const newTiles: TileData[] = [...prevTiles.map(t => ({ ...t, isNew: false, isMerged: false }))];
      let moved = false;
      let scoreIncrease = 0;

      const isReverse = direction === 'down' || direction === 'right';
      const isVertical = direction === 'up' || direction === 'down';

      // Sort tiles to process them in the correct order based on direction
      newTiles.sort((a, b) => {
        if (isVertical) {
          return isReverse ? b.row - a.row : a.row - b.row;
        } else {
          return isReverse ? b.col - a.col : a.col - b.col;
        }
      });

      const mergedIds = new Set<string>();
      const deletedIds = new Set<string>();

      for (let i = 0; i < newTiles.length; i++) {
        const tile = newTiles[i];
        let currentRow = tile.row;
        let currentCol = tile.col;

        while (true) {
          let nextRow = currentRow;
          let nextCol = currentCol;

          if (direction === 'up') nextRow--;
          else if (direction === 'down') nextRow++;
          else if (direction === 'left') nextCol--;
          else if (direction === 'right') nextCol++;

          // Check boundaries
          if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) break;

          const targetTileIndex = newTiles.findIndex(t => 
            t.row === nextRow && t.col === nextCol && !deletedIds.has(t.id) && !mergedIds.has(t.id)
          );

          if (targetTileIndex === -1) {
            // Move to empty space
            const obstructingTile = newTiles.find(t => 
              t.row === nextRow && t.col === nextCol && !deletedIds.has(t.id)
            );
            if (obstructingTile) break; // Someone else is there (maybe already merged)
            
            currentRow = nextRow;
            currentCol = nextCol;
            moved = true;
          } else {
            // Check if can merge
            const targetTile = newTiles[targetTileIndex];
            if (targetTile.value === tile.value) {
              // Merge
              tile.value *= 2;
              currentRow = nextRow;
              currentCol = nextCol;
              tile.isMerged = true;
              scoreIncrease += tile.value;
              
              deletedIds.add(targetTile.id);
              mergedIds.add(tile.id);
              moved = true;
            }
            break;
          }
        }

        tile.row = currentRow;
        tile.col = currentCol;
      }

      if (moved) {
        const finalTiles = newTiles.filter(t => !deletedIds.has(t.id));

        // Add a new random tile
        const emptyPositions = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (!finalTiles.some(t => t.row === r && t.col === c)) {
              emptyPositions.push({ r, c });
            }
          }
        }
        
        if (emptyPositions.length > 0) {
          const { r, c } = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
          const value = Math.random() < 0.9 ? 2 : 4;
          finalTiles.push({ id: Date.now().toString(36) + '-' + Math.random().toString(36).substring(2), value, row: r, col: c, isNew: true });
        }

        // Check for loss asynchronously to avoid side effects during render setup
        if (finalTiles.length === GRID_SIZE * GRID_SIZE) {
          let canMove = false;
          for (const t of finalTiles) {
            const neighbors = [
              finalTiles.find(n => n.row === t.row - 1 && n.col === t.col),
              finalTiles.find(n => n.row === t.row + 1 && n.col === t.col),
              finalTiles.find(n => n.row === t.row && n.col === t.col - 1),
              finalTiles.find(n => n.row === t.row && n.col === t.col + 1),
            ];
            if (neighbors.some(n => n && n.value === t.value)) {
              canMove = true;
              break;
            }
          }
          if (!canMove) {
            setTimeout(() => setGameState('lost'), 0);
          }
        }

        // Score updates
        if (scoreIncrease > 0) {
          setScore(prev => prev + scoreIncrease);
          if (finalTiles.some(t => t.value === 2048)) {
            setTimeout(() => setGameState(prev => prev === 'playing' ? 'won' : prev), 0);
          }
        }

        return finalTiles;
      }

      return prevTiles;
    });
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case 'ArrowUp': move('up'); break;
        case 'ArrowDown': move('down'); break;
        case 'ArrowLeft': move('left'); break;
        case 'ArrowRight': move('right'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
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

  const getTileColor = (value: number) => {
    const colors: Record<number, string> = {
      2: 'bg-white/10 text-white border-white/5',
      4: 'bg-white/15 text-white border-white/5',
      8: 'bg-[#f2b179]/30 text-white border-[#f2b179]/50',
      16: 'bg-[#f59563]/40 text-white border-[#f59563]/60',
      32: 'bg-[#f67c5f]/50 text-white border-[#f67c5f]/70',
      64: 'bg-[#f65e3b]/60 text-white border-[#f65e3b]/80',
      128: 'bg-[#edcf72]/40 text-white border-[#edcf72]/50 shadow-[0_0_20px_rgba(237,207,114,0.3)]',
      256: 'bg-[#edcc61]/45 text-white border-[#edcc61]/55 shadow-[0_0_25px_rgba(237,204,97,0.35)]',
      512: 'bg-[#edc850]/50 text-white border-[#edc850]/60 shadow-[0_0_30px_rgba(237,200,80,0.4)]',
      1024: 'bg-[#edc53f]/60 text-white border-[#edc53f]/70 shadow-[0_0_30px_rgba(237,197,63,0.4)]',
      2048: 'bg-[#edc22e]/70 text-white border-[#edc22e]/80 shadow-[0_0_40px_rgba(237,194,46,0.5)]'
    };
    return colors[value] || 'bg-[#edc22e]/80 text-white border-[#edc22e]/90 shadow-[0_0_50px_rgba(237,194,46,0.6)]';
  };

  const getFontSize = (value: number) => {
    if (value < 100) return 'text-3xl sm:text-4xl';
    if (value < 1000) return 'text-2xl sm:text-3xl';
    return 'text-lg sm:text-xl';
  };

  return (
    <div className="min-h-screen font-sans selection:bg-white/20 selection:text-white flex flex-col items-center justify-center p-6 overflow-x-hidden">
      {/* Background radial elements are handled in index.css */}

      <div className="w-full max-w-4xl z-10 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 items-start">
        {/* Sidebar */}
        <aside className="flex flex-col gap-6 order-2 lg:order-1">
          <div className="flex flex-col">
            <h1 className="text-[82px] font-black tracking-[-4px] leading-tight mb-2 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              2048
            </h1>
            <p className="text-white/70 font-medium text-base leading-relaxed">
              Join the numbers and get to the <b className="text-white">2048 tile!</b> A minimalist puzzle for the focused mind.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-4 flex flex-col items-center">
              <span className="text-[11px] uppercase tracking-widest text-white/60 font-bold mb-1">Score</span>
              <span className="text-2xl font-bold">{score}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-4 flex flex-col items-center">
              <span className="text-[11px] uppercase tracking-widest text-white/60 font-bold mb-1">Best</span>
              <span className="text-2xl font-bold">{bestScore}</span>
            </div>
          </div>

          <button 
            onClick={initGame}
            className="w-full py-4 bg-white/15 hover:bg-white/20 border border-white/30 rounded-xl font-semibold text-lg transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 group"
          >
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            Reset Board
          </button>

          <div className="mt-4 text-white/50 text-[13px] leading-relaxed">
            <b className="text-white">HOW TO PLAY:</b> Use your <b className="text-white">arrow keys</b>, swipe the board, or tap the <b className="text-white">virtual arrows</b> to move the tiles. When two tiles with the same number touch, they <b className="text-white">merge into one!</b>
          </div>
        </aside>

        {/* Board Container */}
        <div className="order-1 lg:order-2">
          <div 
            className="relative aspect-square w-full sm:w-[460px] mx-auto bg-white/5 backdrop-blur-xl border border-white/15 rounded-[24px] p-5 select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Grid Background */}
            <div className="grid grid-cols-4 grid-rows-4 gap-4 h-full w-full">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-xl shadow-inner" />
              ))}
            </div>

            {/* Tiles Layer */}
            <div className="absolute inset-5 pointer-events-none">
              <AnimatePresence>
                {tiles.map((tile) => (
                  <motion.div
                    key={tile.id}
                    layoutId={`tile-${tile.id}`}
                    initial={tile.isNew ? { scale: 0, opacity: 0 } : false}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      left: `${tile.col * 25}%`,
                      top: `${tile.row * 25}%`
                    }}
                    exit={{ opacity: 0, scale: 0.8, zIndex: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.8,
                      delay: tile.isNew ? 0.15 : 0
                    }}
                    style={{
                      position: 'absolute',
                      width: '25%',
                      height: '25%',
                      padding: '8px',
                      zIndex: tile.isMerged ? 10 : 1
                    }}
                  >
                    <motion.div
                      animate={tile.isMerged ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.15 }}
                      className={`
                        w-full h-full rounded-xl flex items-center justify-center font-extrabold border
                        ${getTileColor(tile.value)}
                        ${getFontSize(tile.value)}
                        transition-colors duration-200
                      `}
                    >
                      {tile.value}
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Overlays */}
            <AnimatePresence>
              {gameState !== 'playing' && (
                <motion.div
                  initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                  animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1a1a2e]/70 rounded-[24px]"
                >
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-5xl font-black mb-8 text-center"
                  >
                    {gameState === 'won' ? (
                      <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">VICTORY!</span>
                    ) : (
                      <span className="text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">GAME OVER</span>
                    )}
                  </motion.h2>
                  <button
                    onClick={initGame}
                    className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 transition-all px-10 py-4 rounded-xl font-bold text-xl shadow-2xl active:scale-95"
                  >
                    Play Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 w-full sm:w-[460px] mx-auto">
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              <div />
              <button
                onClick={() => move('up')}
                aria-label="Move up"
                className="h-14 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all active:scale-95"
              >
                <ArrowUp size={24} />
              </button>
              <div />

              <button
                onClick={() => move('left')}
                aria-label="Move left"
                className="h-14 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                onClick={() => move('down')}
                aria-label="Move down"
                className="h-14 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all active:scale-95"
              >
                <ArrowDown size={24} />
              </button>
              <button
                onClick={() => move('right')}
                aria-label="Move right"
                className="h-14 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all active:scale-95"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

