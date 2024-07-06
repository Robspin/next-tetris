"use client"
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// Define types
type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Board = Cell[][];
type Piece = {
    shape: number[][];
    position: { x: number; y: number };
    color: string;
};

// Define constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 1;
const INITIAL_SPEED = 500;
const SPEED_INCREMENT = 50;
const LEVEL_THRESHOLD = 1000;

// Define tetromino shapes and colors
const SHAPES = [
    { shape: [[1, 1, 1, 1]], color: '#00FFFF' },
    { shape: [[1, 1], [1, 1]], color: '#FFFF00' },
    { shape: [[1, 1, 1], [0, 1, 0]], color: '#800080' },
    { shape: [[1, 1, 1], [1, 0, 0]], color: '#0000FF' },
    { shape: [[1, 1, 1], [0, 0, 1]], color: '#FFA500' },
    { shape: [[1, 1, 0], [0, 1, 1]], color: '#00FF00' },
    { shape: [[0, 1, 1], [1, 1, 0]], color: '#FF0000' },
];

const Tetris3D: React.FC = () => {
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
                    newBoard[piece.position.y + y][piece.position.x + x] =
                        SHAPES.findIndex(s => s.color === piece.color) + 1;
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
                if (!isValidMove(nextPiece, clearedBoard)) {
                    setGameOver(true);
                } else {
                    setPiece(nextPiece);
                    setNextPiece(createNewPiece());
                }
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

    const hardDrop = useCallback(() => {
        if (!piece) return;
        let newY = piece.position.y;
        while (isValidMove({ ...piece, position: { ...piece.position, y: newY + 1 } }, board)) {
            newY++;
        }
        setPiece({ ...piece, position: { ...piece.position, y: newY } });
        moveDown();
    }, [piece, board, isValidMove, moveDown]);

    useEffect(() => {
        if (!piece && !gameOver) {
            const newPiece = createNewPiece();
            if (!isValidMove(newPiece, board)) {
                setGameOver(true);
            } else {
                setPiece(newPiece);
                setNextPiece(createNewPiece());
            }
        }
    }, [piece, gameOver, createNewPiece, isValidMove, board]);

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
                case ' ':
                    hardDrop();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [gameOver, moveSideways, moveDown, rotate, hardDrop]);

    useEffect(() => {
        if (gameOver) return;
        const gameLoop = setInterval(moveDown, speed);
        return () => {
            clearInterval(gameLoop);
        };
    }, [gameOver, moveDown, speed]);

    return (
        <div className="w-full h-screen bg-white">
            <Canvas camera={{ position: [0, 0, 30], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <OrbitControls enableRotate={true} enableZoom={false} />
                <GameBoard board={board} piece={piece} />
                <NextPieceDisplay piece={nextPiece} />
                <ScoreDisplay score={score} level={level} />
            </Canvas>
            {gameOver && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-4xl">Game Over!</div>
                </div>
            )}
        </div>
    );
};

const GameBoard: React.FC<{ board: Board; piece: Piece | null }> = ({ board, piece }) => {
    return (
        <group position={[-BOARD_WIDTH / 2 * CELL_SIZE, -BOARD_HEIGHT / 2 * CELL_SIZE, 0]}>
            {board.map((row, y) =>
                row.map((cell, x) => {
                    if (cell !== 0) {
                        return (
                            <mesh key={`${x}-${y}`} position={[x * CELL_SIZE, (BOARD_HEIGHT - y - 1) * CELL_SIZE, 0]}>
                                <boxGeometry args={[CELL_SIZE, CELL_SIZE, CELL_SIZE / 4]} />
                                <meshStandardMaterial color={SHAPES[cell - 1].color} />
                            </mesh>
                        );
                    }
                    return null;
                })
            )}
            {piece && (
                <group position={[piece.position.x * CELL_SIZE, (BOARD_HEIGHT - piece.position.y - 1) * CELL_SIZE, 0]}>
                    {piece.shape.map((row, y) =>
                        row.map((cell, x) => {
                            if (cell !== 0) {
                                return (
                                    <mesh key={`piece-${x}-${y}`} position={[x * CELL_SIZE, -y * CELL_SIZE, 0]}>
                                        <boxGeometry args={[CELL_SIZE, CELL_SIZE, CELL_SIZE / 4]} />
                                        <meshStandardMaterial color={piece.color} />
                                    </mesh>
                                );
                            }
                            return null;
                        })
                    )}
                </group>
            )}
            <gridHelper args={[BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT]} position={[BOARD_WIDTH * CELL_SIZE / 2, BOARD_HEIGHT * CELL_SIZE / 2, -CELL_SIZE / 8]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
    );
};

const NextPieceDisplay: React.FC<{ piece: Piece | null }> = ({ piece }) => {
    if (!piece) return null;
    return (
        <group position={[BOARD_WIDTH / 2 * CELL_SIZE + 3, BOARD_HEIGHT / 2 * CELL_SIZE - 3, 0]}>
            <Text position={[0, 2, 0]} fontSize={1} color="white">
                Next Piece
            </Text>
            {piece.shape.map((row, y) =>
                row.map((cell, x) => {
                    if (cell !== 0) {
                        return (
                            <mesh key={`next-${x}-${y}`} position={[x * CELL_SIZE, -y * CELL_SIZE, 0]}>
                                <boxGeometry args={[CELL_SIZE, CELL_SIZE, CELL_SIZE / 4]} />
                                <meshStandardMaterial color={piece.color} />
                            </mesh>
                        );
                    }
                    return null;
                })
            )}
        </group>
    );
};

const ScoreDisplay: React.FC<{ score: number; level: number }> = ({ score, level }) => {
    return (
        <group position={[-BOARD_WIDTH / 2 * CELL_SIZE, BOARD_HEIGHT / 2 * CELL_SIZE + 2, 0]}>
            <Text position={[0, 0, 0]} fontSize={1} color="white">
                Score: {score}
            </Text>
            <Text position={[0, -1.5, 0]} fontSize={1} color="white">
                Level: {level}
            </Text>
        </group>
    );
};

export default Tetris3D;