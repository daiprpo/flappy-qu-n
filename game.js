// Khởi tạo canvas và ngữ cảnh
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Khởi tạo hình ảnh
const birdImg = new Image();
birdImg.src = 'bird.png';
const baseImg = new Image();
baseImg.src = 'base.png';
const bgImg = new Image();
bgImg.src = 'background.png';

// Khởi tạo âm thanh với Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let flapSound, hitSound, scoreSound;

// Hàm tải âm thanh
function loadAudio(url) {
    return fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => audioContext.decodeAudioData(buffer))
        .catch(() => null); // Bỏ qua lỗi âm thanh
}

// Hàm phát âm thanh
function playSound(buffer) {
    if (!buffer) return; // Nếu âm thanh chưa tải, không phát
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

// Tải các tài nguyên hình ảnh tối thiểu
function loadEssentialAssets() {
    return Promise.all([
        new Promise(resolve => birdImg.onload = resolve),
        new Promise(resolve => baseImg.onload = resolve),
        new Promise(resolve => bgImg.onload = resolve)
    ]);
}

// Tải âm thanh trong nền
function loadAudioAssets() {
    loadAudio('flap.mp3').then(buffer => flapSound = buffer);
    loadAudio('hit.mp3').then(buffer => hitSound = buffer);
    loadAudio('score.mp3').then(buffer => scoreSound = buffer);
}

// Lớp Bird (Chim)
class Bird {
    constructor() {
        this.x = 200;           // Vị trí ban đầu ngang
        this.y = 400;           // Vị trí ban đầu dọc
        this.width = 60;        // Chiều rộng
        this.height = 60;       // Chiều cao
        this.velocity = 0;      // Vận tốc
        this.gravity = 0.45;     // Trọng lực
        this.lift = -13;        // Lực nâng khi vỗ cánh
    }

    flap() {
        this.velocity = this.lift;  // Đặt vận tốc khi vỗ cánh
        playSound(flapSound);       // Phát âm thanh vỗ cánh
    }

    update() {
        this.velocity += this.gravity;  // Áp dụng trọng lực
        this.y += this.velocity;        // Cập nhật vị trí
    }

    draw() {
        ctx.drawImage(birdImg, this.x, this.y, this.width, this.height); // Vẽ chim
    }
}

// Lớp Pipe (Ống)
class Pipe {
    constructor() {
        this.x = canvas.width;                  // Vị trí bắt đầu từ cạnh phải
        this.width = 100;                        // Chiều rộng ống
        this.gap = 300;                         // Khoảng cách giữa ống trên và dưới
        this.topHeight = Math.random() * (canvas.height - this.gap - 200) + 100; // Chiều cao ống trên
        this.bottomY = this.topHeight + this.gap; // Vị trí ống dưới
        this.speed = 4;                         // Tốc độ di chuyển
        this.scored = false;                    // Trạng thái ghi điểm
    }

    update() {
        this.x -= this.speed;   // Di chuyển ống sang trái
    }

    draw() {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, 0, this.width, this.topHeight);              // Vẽ ống trên
        ctx.fillRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY); // Vẽ ống dưới
    }

    offscreen() {
        return this.x + this.width < 0; // Kiểm tra ống ra khỏi màn hình
    }
}

// Lớp Game (Trò chơi)
class Game {
    constructor() {
        this.bird = new Bird();             // Khởi tạo chim
        this.pipes = [];                    // Danh sách ống
        this.score = 0;                     // Điểm số hiện tại
        this.highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0; // Điểm cao nhất
        this.gameOver = false;              // Trạng thái game
        this.pipeInterval = 1800;           // Khoảng cách giữa các ống (2 giây)
        this.lastPipeTime = Date.now();     // Thời điểm tạo ống cuối
    }

    start() {
        this.addPipe();     // Thêm ống đầu tiên
        this.setupInput();  // Thiết lập điều khiển
        this.loop();        // Bắt đầu vòng lặp
    }

    setupInput() {
        // Sự kiện chuột
        canvas.addEventListener('click', () => {
            if (!this.gameOver) {
                this.bird.flap();
            } else {
                this.reset();
            }
        });
        // Sự kiện cảm ứng (điện thoại)
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
        this.pipes.push(new Pipe());    // Thêm ống mới
    }

    update() {
        if (this.gameOver) return;

        this.bird.update();             // Cập nhật vị trí chim

        this.pipes.forEach(pipe => pipe.update()); // Cập nhật vị trí ống
        this.pipes = this.pipes.filter(pipe => !pipe.offscreen()); // Xóa ống ra khỏi màn hình

        const now = Date.now();
        if (now - this.lastPipeTime > this.pipeInterval) {
            this.addPipe();
            this.lastPipeTime = now;
        }

        this.checkCollisions();  // Kiểm tra va chạm
        this.updateScore();     // Cập nhật điểm số
    }

    draw() {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);    // Vẽ nền
        this.pipes.forEach(pipe => pipe.draw());                    // Vẽ ống
        this.bird.draw();                                           // Vẽ chim
        ctx.drawImage(baseImg, 0, canvas.height - 1000, canvas.width, 1000); // Vẽ mặt đất

        // Hiển thị điểm số
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.fillText(`Score: ${this.score}`, 20, 60);
        ctx.fillText(`High Score: ${this.highScore}`, 20, 120);

        // Hiển thị Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'red';
            ctx.font = '96px Arial';
            ctx.fillText('Game Over', canvas.width / 2 - 240, canvas.height / 2);
        }
    }

    checkCollisions() {
        // Va chạm với mặt đất hoặc trần
        if (this.bird.y + this.bird.height > canvas.height - 100 || this.bird.y < 0) {
            this.endGame();
            return;
        }

        // Va chạm với ống
        for (const pipe of this.pipes) {
            if (
                this.bird.x + this.bird.width > pipe.x &&
                this.bird.x < pipe.x + pipe.width &&
                (this.bird.y < pipe.topHeight || this.bird.y + this.bird.height > pipe.bottomY)
            ) {
                this.endGame();
                break;
            }
        }
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
        this.addPipe();
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// Khởi động game khi tài nguyên hình ảnh sẵn sàng
loadEssentialAssets().then(() => {
    const game = new Game();
    game.start();
    loadAudioAssets(); // Tải âm thanh trong nền
}).catch(error => {
    console.error('Lỗi khi tải hình ảnh:', error);
});
