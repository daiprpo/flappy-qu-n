// Khởi tạo canvas và ngữ cảnh
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Tải tài nguyên hình ảnh
const birdImg = new Image();
birdImg.src = 'bird.png';
const baseImg = new Image();
baseImg.src = 'base.png';
const bgImg = new Image();
bgImg.src = 'background.png';

// Tải âm thanh với Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let flapSound, hitSound, scoreSound;

function loadAudio(url) {
    return fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => audioContext.decodeAudioData(buffer))
        .catch(() => null); // Bỏ qua lỗi âm thanh để không làm chậm game
}

// Hàm phát âm thanh
function playSound(buffer) {
    if (!buffer) return; // Nếu âm thanh chưa tải, bỏ qua
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

// Tải tài nguyên tối thiểu và khởi động game
const loadEssentials = () => {
    return Promise.all([
        new Promise(resolve => birdImg.onload = resolve),
        new Promise(resolve => bgImg.onload = resolve),
        new Promise(resolve => baseImg.onload = resolve)
    ]);
};

// Tải âm thanh không đồng bộ trong nền
const loadAudioInBackground = () => {
    loadAudio('flap.mp3').then(buffer => flapSound = buffer);
    loadAudio('hit.mp3').then(buffer => hitSound = buffer);
    loadAudio('score.mp3').then(buffer => scoreSound = buffer);
};

// Khởi động game ngay khi tài nguyên hình ảnh sẵn sàng
loadEssentials().then(() => {
    const game = new Game();
    game.start();
    loadAudioInBackground(); // Tải âm thanh sau khi game bắt đầu
});

// Lớp Bird (Chim)
class Bird {
    constructor() {
        this.x = 100;
        this.y = 200;
        this.width = 30;
        this.height = 30;
        this.velocity = 0;
        this.gravity = 0.45;
        this.lift = -9;
    }

    flap() {
        this.velocity = this.lift;
        playSound(flapSound);
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
    }

    draw() {
        ctx.drawImage(birdImg, this.x, this.y, this.width, this.height);
    }
}

// Lớp Pipe (Ống)
class Pipe {
    constructor() {
        this.x = canvas.width;
        this.width = 50;
        this.gap = 150;
        this.topHeight = Math.random() * (canvas.height - this.gap - 100) + 50;
        this.bottomY = this.topHeight + this.gap;
        this.speed = 2;
        this.scored = false;
    }

    update() {
        this.x -= this.speed;
    }

    draw() {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        ctx.fillRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY);
    }

    offscreen() {
        return this.x + this.width < 0;
    }
}

// Lớp Game (Trò chơi)
class Game {
    constructor() {
        this.bird = new Bird();
        this.pipes = [];
        this.score = 0;
        this.gameOver = false;
        this.pipeInterval = 2000; // Khoảng cách ống 2 giây
        this.lastPipeTime = Date.now();
        this.highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;
    }

    start() {
        this.loop();
        this.setupInput();
    }

    setupInput() {
        canvas.addEventListener('click', () => {
            if (!this.gameOver) {
                this.bird.flap();
            } else {
                this.reset();
            }
        });
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameOver) {
                this.bird.flap();
            } else {
                this.reset();
            }
        });
    }

    addPipe() {
        this.pipes.push(new Pipe());
    }

    update() {
        if (this.gameOver) return;

        this.bird.update();
        this.pipes.forEach(pipe => pipe.update());
        this.pipes = this.pipes.filter(pipe => !pipe.offscreen());

        const now = Date.now();
        if (now - this.lastPipeTime > this.pipeInterval) {
            this.addPipe();
            this.lastPipeTime = now;
        }

        this.checkCollisions();
        this.updateScore();
    }

    draw() {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        this.pipes.forEach(pipe => pipe.draw());
        this.bird.draw();
        ctx.drawImage(baseImg, 0, canvas.height - 50, canvas.width, 50);

        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${this.score}`, 10, 30);
        ctx.fillText(`High Score: ${this.highScore}`, 10, 60);

        if (this.gameOver) {
            ctx.fillStyle = 'red';
            ctx.font = '48px Arial';
            ctx.fillText('Game Over', canvas.width / 2 - 120, canvas.height / 2);
        }
    }

    checkCollisions() {
        if (this.bird.y + this.bird.height > canvas.height - 50 || this.bird.y < 0) {
            this.endGame();
        }

        this.pipes.forEach(pipe => {
            if (
                this.bird.x + this.bird.width > pipe.x &&
                this.bird.x < pipe.x + pipe.width &&
                (this.bird.y < pipe.topHeight || this.bird.y + this.bird.height > pipe.bottomY)
            ) {
                this.endGame();
            }
        });
    }

    updateScore() {
        this.pipes.forEach(pipe => {
            if (!pipe.scored && this.bird.x > pipe.x + pipe.width) {
                this.score++;
                pipe.scored = true;
                playSound(scoreSound);
            }
        });
    }

    endGame() {
        this.gameOver = true;
        playSound(hitSound);
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }
    }

    reset() {
        this.bird = new Bird();
        this.pipes = [];
        this.score = 0;
        this.gameOver = false;
        this.lastPipeTime = Date.now();
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}