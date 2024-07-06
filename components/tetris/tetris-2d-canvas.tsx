"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';

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
const CELL_SIZE = 30;
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

const Tetris: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [board, setBoard] = useState<Board>(() =>
        Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))
    );
    const [piece, setPiece] = useState<Piece | null>(null);
    const [nextPiece, setNextPiece] = useState<Piece | null>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [storedPiece, setStoredPiece] = useState<Piece | null>(null);
    const [canStore, setCanStore] = useState(true);
    const [highScore, setHighScore] = useState(() => {
        if (typeof window !== 'undefined') {
            return parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
        }
        return 0;
    });

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
                    newBoard[piece.position.y + y][piece.position.x + x] = SHAPES.findIndex(s => s.color === piece.color) + 1;
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

    const getDropPosition = useCallback((piece: Piece, board: Board): { x: number; y: number } => {
        let dropY = piece.position.y;
        while (isValidMove({ ...piece, position: { ...piece.position, y: dropY + 1 } }, board)) {
            dropY++;
        }
        return { x: piece.position.x, y: dropY };
    }, [isValidMove]);

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

            if (newScore > highScore) {
                setHighScore(newScore);
                localStorage.setItem('tetrisHighScore', newScore.toString());
            }

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
                    setCanStore(true);
                }
            } else {
                const newPiece = createNewPiece();
                if (!isValidMove(newPiece, clearedBoard)) {
                    setGameOver(true);
                } else {
                    setPiece(newPiece);
                    setNextPiece(createNewPiece());
                    setCanStore(true);
                }
            }
        }
    }, [piece, board, nextPiece, isValidMove, mergePieceToBoard, clearLines, createNewPiece, score, level, highScore]);

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
        } else {
            // Try wall kicks
            const kicks = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: -1 },
                { x: 1, y: -1 },
                { x: -1, y: -1 }
            ];
            for (const kick of kicks) {
                const kickedPiece = {
                    ...newPiece,
                    position: {
                        x: newPiece.position.x + kick.x,
                        y: newPiece.position.y + kick.y
                    }
                };
                if (isValidMove(kickedPiece, board)) {
                    setPiece(kickedPiece);
                    return;
                }
            }
        }
    }, [piece, board, isValidMove]);

    const hardDrop = useCallback(() => {
        if (!piece) return;
        const dropPosition = getDropPosition(piece, board);
        const newPiece = { ...piece, position: dropPosition };
        setPiece(newPiece);
        // Immediately process the dropped piece
        const newBoard = mergePieceToBoard(newPiece, board);
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
        setBoard(clearedBoard);

        const linesClearedScore = linesCleared * linesCleared * 100;
        const newScore = score + linesClearedScore + 10 + (dropPosition.y - piece.position.y); // Add bonus for hard drop
        setScore(newScore);

        if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('tetrisHighScore', newScore.toString());
        }

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
                setCanStore(true);
            }
        } else {
            const newPiece = createNewPiece();
            if (!isValidMove(newPiece, clearedBoard)) {
                setGameOver(true);
            } else {
                setPiece(newPiece);
                setNextPiece(createNewPiece());
                setCanStore(true);
            }
        }
    }, [piece, board, getDropPosition, mergePieceToBoard, clearLines, score, highScore, level, nextPiece, isValidMove, createNewPiece]);

    const storePiece = useCallback(() => {
        if (!canStore || !piece) return;

        if (storedPiece) {
            const restoredPiece = {
                ...storedPiece,
                position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(storedPiece.shape[0].length / 2), y: 0 }
            };
            if (isValidMove(restoredPiece, board)) {
                setStoredPiece(piece);
                setPiece(restoredPiece);
            }
        } else {
            setStoredPiece(piece);
            if (nextPiece) {
                setPiece(nextPiece);
                setNextPiece(createNewPiece());
            } else {
                setPiece(createNewPiece());
            }
        }
        setCanStore(false);
    }, [canStore, piece, storedPiece, board, nextPiece, isValidMove, createNewPiece]);

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
                    hardDrop();
                    break;
                case 'z':
                    rotate();
                    break;
                case 'x':
                    storePiece();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [gameOver, moveSideways, moveDown, hardDrop, rotate, storePiece]);

    useEffect(() => {
        if (gameOver) return;
        const gameLoop = setInterval(moveDown, speed);
        return () => {
            clearInterval(gameLoop);
        };
    }, [gameOver, moveDown, speed]);

    const drawBoard = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);

        board.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    ctx.fillStyle = SHAPES[cell - 1].color;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            });
        });

        if (piece) {
            ctx.fillStyle = piece.color;
            piece.shape.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell !== 0) {
                        ctx.fillRect((piece.position.x + x) * CELL_SIZE, (piece.position.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                        ctx.strokeStyle = '#000';
                        ctx.strokeRect((piece.position.x + x) * CELL_SIZE, (piece.position.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                });
            });

            // Draw drop preview
            const dropPosition = getDropPosition(piece, board);
            ctx.fillStyle = `${piece.color}40`;  // 40 is for 25% opacity
            piece.shape.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell !== 0) {
                        ctx.fillRect((dropPosition.x + x) * CELL_SIZE, (dropPosition.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                        ctx.strokeStyle = '#00000040';
                        ctx.strokeRect((dropPosition.x + x) * CELL_SIZE, (dropPosition.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                });
            });
        }
    }, [board, piece, getDropPosition]);

    const drawNextPiece = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!nextPiece) return;

        const nextPieceSize = 4 * CELL_SIZE;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(BOARD_WIDTH * CELL_SIZE + 10, 0, nextPieceSize, nextPieceSize);

        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.fillText('Next:', BOARD_WIDTH * CELL_SIZE + 10, 20);

        ctx.fillStyle = nextPiece.color;
        nextPiece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    ctx.fillRect(
                        BOARD_WIDTH * CELL_SIZE + 10 + x * CELL_SIZE,
                        30 + y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    );
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(
                        BOARD_WIDTH * CELL_SIZE + 10 + x * CELL_SIZE,
                        30 + y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    );
                }
            });
        });
    }, [nextPiece]);

    const drawStoredPiece = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!storedPiece) return;

        const storedPieceSize = 4 * CELL_SIZE;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(BOARD_WIDTH * CELL_SIZE + 10, 150, storedPieceSize, storedPieceSize);

        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.fillText('Stored:', BOARD_WIDTH * CELL_SIZE + 10, 170);

        ctx.fillStyle = storedPiece.color;
        storedPiece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    ctx.fillRect(
                        BOARD_WIDTH * CELL_SIZE + 10 + x * CELL_SIZE,
                        180 + y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    );
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(
                        BOARD_WIDTH * CELL_SIZE + 10 + x * CELL_SIZE,
                        180 + y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    );
                }
            });
        });
    }, [storedPiece]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the game board
        drawBoard(ctx);

        // Draw the next piece
        drawNextPiece(ctx);

        // Draw the stored piece
        drawStoredPiece(ctx);

        // Draw score, level, and high score
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, BOARD_WIDTH * CELL_SIZE + 10, 300);
        ctx.fillText(`Level: ${level}`, BOARD_WIDTH * CELL_SIZE + 10, 330);
        ctx.fillText(`High Score: ${highScore}`, BOARD_WIDTH * CELL_SIZE + 10, 360);

        // Draw game over message
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '40px Arial';
            ctx.fillText('Game Over!', 50, BOARD_HEIGHT * CELL_SIZE / 2);
            ctx.fillText(`Final Score: ${score}`, 50, BOARD_HEIGHT * CELL_SIZE / 2 + 50);
        }
    }, [board, piece, nextPiece, storedPiece, score, level, highScore, gameOver, drawBoard, drawNextPiece, drawStoredPiece]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">Tetris</h1>
            <canvas
                ref={canvasRef}
                width={(BOARD_WIDTH + 6) * CELL_SIZE}
                height={BOARD_HEIGHT * CELL_SIZE}
                className="border-4 border-gray-800"
            />
            <p className="mt-4 text-gray-700">Use arrow keys to move, 'z' to rotate, up arrow to hard drop, 'x' to store/swap piece</p>
        </div>
    );
};

export default Tetris;