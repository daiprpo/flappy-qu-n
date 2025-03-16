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
        .then(buffer => audioContext.decodeAudioData(buffer));
}

// Hàm phát âm thanh
function playSound(buffer) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

// Chờ tất cả tài nguyên tải xong trước khi chạy game
Promise.all([
    new Promise(resolve => birdImg.onload = resolve),
    new Promise(resolve => baseImg.onload = resolve),
    new Promise(resolve => bgImg.onload = resolve),
    loadAudio('flap.mp3').then(buffer => flapSound = buffer),
    loadAudio('hit.mp3').then(buffer => hitSound = buffer),
    loadAudio('score.mp3').then(buffer => scoreSound = buffer)
]).then(() => {
    const game = new Game();
    game.start();
}).catch(error => {
    console.error('Lỗi khi tải tài nguyên:', error);
});

// Lớp Bird (Chim)
class Bird {
    constructor() {
        this.x = 100;           // Vị trí ngang
        this.y = 200;           // Vị trí dọc
        this.width = 30;        // Chiều rộng
        this.height = 30;       // Chiều cao
        this.velocity = 0;      // Vận tốc
        this.gravity = 0.45;     // Trọng lực
        this.lift = -9;        // Lực nâng khi vỗ cánh
    }

    flap() {
        this.velocity = this.lift;  // Thay đổi vận tốc khi vỗ cánh
        playSound(flapSound);       // Phát âm thanh vỗ cánh
    }

    update() {
        this.velocity += this.gravity;  // Tăng vận tốc theo trọng lực
        this.y += this.velocity;        // Cập nhật vị trí
    }

    draw() {
        ctx.drawImage(birdImg, this.x, this.y, this.width, this.height); // Vẽ chim
    }
}

// Lớp Pipe (Ống)
class Pipe {
    constructor() {
        this.x = canvas.width;                  // Bắt đầu từ cạnh phải
        this.width = 50;                        // Chiều rộng ống
        this.gap = 150;                         // Khoảng cách giữa hai ống
        this.topHeight = Math.random() * (canvas.height - this.gap - 100) + 50; // Chiều cao ống trên
        this.bottomY = this.topHeight + this.gap; // Vị trí bắt đầu ống dưới
        this.speed = 2;                         // Tốc độ di chuyển
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
        this.bird = new Bird();             // Tạo đối tượng chim
        this.pipes = [];                    // Mảng chứa các ống
        this.score = 0;                     // Điểm số hiện tại
        this.gameOver = false;              // Trạng thái trò chơi
        this.pipeInterval = 1800;           // Khoảng cách thời gian giữa các ống (2 giây)
        this.lastPipeTime = Date.now();     // Thời điểm tạo ống cuối cùng
        this.highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0; // Điểm cao nhất
    }

    start() {
        this.loop();        // Bắt đầu vòng lặp game
        this.setupInput();  // Thiết lập điều khiển
    }

    setupInput() {
        // Điều khiển bằng chuột
        canvas.addEventListener('click', () => {
            if (!this.gameOver) {
                this.bird.flap();
            } else {
                this.reset();
            }
        });
        // Điều khiển bằng cảm ứng trên điện thoại
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
        if (this.gameOver) return;      // Dừng cập nhật nếu game over

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
        this.pipes.forEach(pipe => pipe.draw());                    // Vẽ các ống
        this.bird.draw();                                           // Vẽ chim
        ctx.drawImage(baseImg, 0, canvas.height - 50, canvas.width, 50); // Vẽ mặt đất

        // Hiển thị điểm số
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${this.score}`, 10, 30);
        ctx.fillText(`High Score: ${this.highScore}`, 10, 60);

        // Hiển thị thông báo game over
        if (this.gameOver) {
            ctx.fillStyle = 'red';
            ctx.font = '48px Arial';
            ctx.fillText('Game Over', canvas.width / 2 - 120, canvas.height / 2);
        }
    }

    checkCollisions() {
        // Va chạm với mặt đất hoặc trần
        if (this.bird.y + this.bird.height > canvas.height - 50 || this.bird.y < 0) {
            this.endGame();
        }

        // Va chạm với ống
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
                this.score++;           // Tăng điểm
                pipe.scored = true;     // Đánh dấu đã ghi điểm
                playSound(scoreSound);  // Phát âm thanh ghi điểm
            }
        });
    }

    endGame() {
        this.gameOver = true;           // Kết thúc trò chơi
        playSound(hitSound);            // Phát âm thanh va chạm
        if (this.score > this.highScore) {
            this.highScore = this.score; // Cập nhật điểm cao nhất
            localStorage.setItem('highScore', this.highScore); // Lưu vào localStorage
        }
    }

    reset() {
        this.bird = new Bird();         // Tạo lại chim
        this.pipes = [];                // Xóa các ống
        this.score = 0;                 // Đặt lại điểm số
        this.gameOver = false;          // Khôi phục trạng thái
        this.lastPipeTime = Date.now(); // Đặt lại thời gian tạo ống
    }

    loop() {
        this.update();  // Cập nhật logic
        this.draw();    // Vẽ lại màn hình
        requestAnimationFrame(() => this.loop()); // Lặp lại
    }
}
