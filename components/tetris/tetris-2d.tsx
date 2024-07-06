"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// Define types
type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Board = Cell[][];
type Piece = {
    shape: number[][];
    position: { x: number; y: number };
    color: number;
};

// Define constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_SPEED = 500;
const SPEED_INCREMENT = 50;
const LEVEL_THRESHOLD = 1000;

// Define tetromino shapes and colors
const SHAPES = [
    { shape: [[1, 1, 1, 1]], color: 1 },
    { shape: [[1, 1], [1, 1]], color: 2 },
    { shape: [[1, 1, 1], [0, 1, 0]], color: 3 },
    { shape: [[1, 1, 1], [1, 0, 0]], color: 4 },
    { shape: [[1, 1, 1], [0, 0, 1]], color: 5 },
    { shape: [[1, 1, 0], [0, 1, 1]], color: 6 },
    { shape: [[0, 1, 1], [1, 1, 0]], color: 7 },
];

const COLORS = [
    'bg-white',
    'bg-cyan-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-orange-500',
    'bg-green-500',
    'bg-red-500',
];

const Tetris: React.FC = () => {
    const [board, setBoard] = useState<Board>(() =>
        Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))
    );
    const [piece, setPiece] = useState<Piece | null>(null);
    const [nextPiece, setNextPiece] = useState<Piece | null>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [speed, setSpeed] = useState(INITIAL_SPEED);

    const createNewPiece = useCallback(() => {
        const { shape, color } = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        return {
            shape,
            color,
            position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2), y: 0 },
        };
    }, []);

    const isValidMove = useCallback((piece: Piece, board: Board): boolean => {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.position.x + x;
                    const newY = piece.position.y + y;
                    if (
                        newX < 0 || newX >= BOARD_WIDTH ||
                        newY >= BOARD_HEIGHT ||
                        (newY >= 0 && board[newY][newX])
                    ) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, []);

    const mergePieceToBoard = useCallback((piece: Piece, board: Board): Board => {
        const newBoard = board.map(row => [...row]);
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    // @ts-ignore
                    newBoard[piece.position.y + y][piece.position.x + x] = piece.color;
                }
            });
        });
        return newBoard;
    }, []);

    const clearLines = useCallback((board: Board): { newBoard: Board; linesCleared: number } => {
        let linesCleared = 0;
        const newBoard = board.filter(row => {
            if (row.every(cell => cell !== 0)) {
                linesCleared++;
                return false;
            }
            return true;
        });

        while (newBoard.length < BOARD_HEIGHT) {
            newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        }

        return { newBoard, linesCleared };
    }, []);

    const moveDown = useCallback(() => {
        if (!piece) return;
        const newPiece = {
            ...piece,
            position: { ...piece.position, y: piece.position.y + 1 },
        };
        if (isValidMove(newPiece, board)) {
            setPiece(newPiece);
        } else {
            const newBoard = mergePieceToBoard(piece, board);
            const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
            setBoard(clearedBoard);

            const linesClearedScore = linesCleared * linesCleared * 100;
            const newScore = score + linesClearedScore + 10;
            setScore(newScore);

            if (newScore >= level * LEVEL_THRESHOLD) {
                setLevel(prevLevel => prevLevel + 1);
                setSpeed(prevSpeed => Math.max(prevSpeed - SPEED_INCREMENT, 100));
            }

            if (nextPiece) {
                setPiece(nextPiece);
                setNextPiece(createNewPiece());
            } else {
                const newPiece = createNewPiece();
                if (!isValidMove(newPiece, clearedBoard)) {
                    setGameOver(true);
                } else {
                    setPiece(newPiece);
                    setNextPiece(createNewPiece());
                }
            }
        }
    }, [piece, board, nextPiece, isValidMove, mergePieceToBoard, clearLines, createNewPiece, score, level]);

    const moveSideways = useCallback((direction: 'left' | 'right') => {
        if (!piece) return;
        const newPiece = {
            ...piece,
            position: {
                ...piece.position,
                x: piece.position.x + (direction === 'left' ? -1 : 1),
            },
        };
        if (isValidMove(newPiece, board)) {
            setPiece(newPiece);
        }
    }, [piece, board, isValidMove]);

    const rotate = useCallback(() => {
        if (!piece) return;
        const newShape = piece.shape[0].map((_, index) =>
            piece.shape.map(row => row[index]).reverse()
        );
        const newPiece = { ...piece, shape: newShape };
        if (isValidMove(newPiece, board)) {
            setPiece(newPiece);
        }
    }, [piece, board, isValidMove]);

    useEffect(() => {
        if (!piece && !gameOver) {
            const newPiece = createNewPiece();
            setPiece(newPiece);
            setNextPiece(createNewPiece());
        }
    }, [piece, gameOver, createNewPiece]);

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (gameOver) return;
            switch (event.key) {
                case 'ArrowLeft':
                    moveSideways('left');
                    break;
                case 'ArrowRight':
                    moveSideways('right');
                    break;
                case 'ArrowDown':
                    moveDown();
                    break;
                case 'ArrowUp':
                    rotate();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [gameOver, moveSideways, moveDown, rotate]);

    useEffect(() => {
        if (gameOver) return;
        const gameLoop = setInterval(moveDown, speed);
        return () => {
            clearInterval(gameLoop);
        };
    }, [gameOver, moveDown, speed]);

    const renderCell = (cell: Cell, key: string) => (
        <motion.div
            key={key}
            className={`w-6 h-6 border border-gray-300 ${COLORS[cell]}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
    );

    const renderBoard = () => (
        <div className="border-4 border-gray-800 p-2 bg-gray-100">
            {board.map((row, y) => (
                <div key={y} className="flex">
                    {row.map((cell, x) => {
                        const isActivePiece = piece && y >= piece.position.y && y < piece.position.y + piece.shape.length &&
                            x >= piece.position.x && x < piece.position.x + piece.shape[0].length &&
                            piece.shape[y - piece.position.y][x - piece.position.x];
                        // @ts-ignore
                        return renderCell(isActivePiece ? piece.color : cell, `${y}-${x}`);
                    })}
                </div>
            ))}
        </div>
    );

    const renderNextPiece = () => (
        <div className="border-2 border-gray-800 p-2 bg-gray-100">
            {nextPiece && nextPiece.shape.map((row, y) => (
                <div key={y} className="flex">
                    {row.map((cell, x) => renderCell(cell ? nextPiece.color : 0, `next-${y}-${x}`))}
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">Tetris</h1>
            <div className="flex">
                {renderBoard()}
                <div className="ml-4 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2 text-gray-700">Next Piece</h2>
                        {renderNextPiece()}
                    </div>
                    <div className="text-xl text-gray-700">
                        <p className="mb-2">Score: {score}</p>
                        <p className="mb-2">Level: {level}</p>
                    </div>
                </div>
            </div>
            {gameOver && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 bg-red-500 text-white rounded-lg shadow-lg"
                >
                    <p className="text-2xl font-bold">Game Over!</p>
                    <p className="text-xl">Final Score: {score}</p>
                </motion.div>
            )}
        </div>
    );
};

export default Tetris;