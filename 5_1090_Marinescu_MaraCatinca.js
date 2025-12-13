const startBtn = document.getElementById("startBtn");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const explosionSound = new Audio("media/explosion.wav");
const gameOverSound = new Audio("media/game_over.wav");



function resizeCanvas(){
    const aspect = 16/9;
    let width = window.innerWidth;
    let height = window.innerHeight;

    if(width / height > aspect){
        width = height * aspect;
    } else {
        height = width / aspect;
    }

    canvas.width = width;
    canvas.height = height;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let playerName = ""; 

startBtn.addEventListener("click", () => {
    playerName = prompt("Introdu numele tău:") || "Anonim";
    startBtn.style.display = "none";
    canvas.style.display = "block";
    startGame();
});

function startGame() {
    setInterval(update, 16);
}

class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 8;
        this.size = 20;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = i * 2 * Math.PI / 3 - Math.PI / 2;
            const x = this.size * Math.cos(angle);
            const y = this.size * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    rotate(direction){
        if(direction === "left") this.angle -= 0.1;
        if(direction === "right") this.angle += 0.1;
    }

    move(direction){
        switch(direction){
            case "up": this.y -= this.speed; break;
            case "down": this.y += this.speed; break;
            case "left": this.x -= this.speed; break;
            case "right": this.x += this.speed; break;
        }
        this.wrapAround();
    }

    wrapAround(){
        if(this.x < 0) this.x = canvas.width;
        if(this.x > canvas.width) this.x = 0;
        if(this.y < 0) this.y = canvas.height;
        if(this.y > canvas.height) this.y = 0;
    }
}

class Asteroid {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.level = Math.floor(Math.random()*4)+1;
        const speed = 3-0.5*(this.level-1);
        this.speedX = (Math.random()*2-1)*speed;
        this.speedY = (Math.random()*2-1)*speed;
    }

    draw(){
        const r = 10 + this.level*5;
        let color;
        switch(this.level){
            case 1: color="rgb(255,200,220)"; break;
            case 2: color="rgb(255,170,200)"; break;
            case 3: color="rgb(180,255,210)"; break;
            case 4: color="rgb(255,200,140)"; break;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, 2*Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.level, this.x, this.y);
    }

    move(){
        this.x += this.speedX;
        this.y += this.speedY;
        if(this.x < 0) this.x = canvas.width;
        if(this.x > canvas.width) this.x = 0;
        if(this.y < 0) this.y = canvas.height;
        if(this.y > canvas.height) this.y = 0;
    }
}

class Rocket {
    constructor(x, y, angle){
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 15;
        this.size = 5;
        this.dead = false;
    }

    move(){
        this.x += Math.cos(this.angle)*this.speed;
        this.y += Math.sin(this.angle)*this.speed;
        if(this.x<0 || this.x>canvas.width || this.y<0 || this.y>canvas.height) this.dead = true;
    }

    draw(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, 2*Math.PI);
        ctx.fillStyle = "white";
        ctx.fill();
    }
}

const ship = new Ship(canvas.width/2, canvas.height/2);
let lives = 3;
let score = 0;
const pointsPerLife = 20;
let invincibleTimer = 0;
const invincibleDuration = 60;
const keys = {};
let canShoot = true;
let asteroids = [];
let rockets = [];


function getHighScores() {
    const data = localStorage.getItem("highScores");
    return data ? JSON.parse(data) : [];
}

function saveHighScores(scores) {
    localStorage.setItem("highScores", JSON.stringify(scores));
}


function savePlayerScore(score) {
    const scores = getHighScores();
    scores.push({ name: playerName, score });
    scores.sort((a, b) => b.score - a.score);
    saveHighScores(scores.slice(0, 5));
}


function drawHighScores() {
    const scores = getHighScores();
    ctx.fillStyle = "yellow";
    ctx.font = "18px Arial";
    ctx.textAlign = "right";
    ctx.fillText("Top 5:", canvas.width - 10, 30);
    for (let i = 0; i < scores.length; i++) {
        ctx.fillText(`${scores[i].name}: ${scores[i].score}`, canvas.width - 10, 60 + i * 30);
    }
}



function initAsteroids(){
    asteroids = [];
    for(let i=0;i<5;i++){
        asteroids.push(new Asteroid(Math.random()*canvas.width, Math.random()*canvas.height));
    }
}
initAsteroids();


document.addEventListener("keydown", e=>{
    const key = e.key.toLowerCase();
    keys[key] = true;
    if(key==="x" && canShoot) { shootRocket(); canShoot=false; }
});
document.addEventListener("keyup", e=>{
    const key = e.key.toLowerCase();
    keys[key] = false;
    if(key==="x") canShoot=true;
});


canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    if(x < canvas.width/3) keys["arrowleft"] = true;
    else if(x > 2*canvas.width/3) keys["arrowright"] = true;

    if(y < canvas.height/2) keys["arrowup"] = true;
    else keys["arrowdown"] = true;

    if(x > canvas.width*0.7 && y > canvas.height*0.7) {
        if(canShoot) { shootRocket(); canShoot=false; }
    }
});

canvas.addEventListener("touchend", e => {
    e.preventDefault();
    keys["arrowleft"] = false;
    keys["arrowright"] = false;
    keys["arrowup"] = false;
    keys["arrowdown"] = false;
    canShoot = true;
});

canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    keys["arrowleft"] = keys["arrowright"] = keys["arrowup"] = keys["arrowdown"] = false;

    if(x < canvas.width/3) keys["arrowleft"] = true;
    else if(x > 2*canvas.width/3) keys["arrowright"] = true;

    if(y < canvas.height/2) keys["arrowup"] = true;
    else keys["arrowdown"] = true;

    if(x > canvas.width*0.7 && y > canvas.height*0.7) {
        if(canShoot) { shootRocket(); canShoot=false; }
    }
});



function shootRocket(){
    if(rockets.length>=3) return;
    const r = ship.size/2;
    const x = ship.x - r*Math.cos(ship.angle);
    const y = ship.y - r*Math.sin(ship.angle);
    rockets.push(new Rocket(x, y, ship.angle - Math.PI/2));
}


function resetGame(){
    lives = 3;
    score = 0;
    ship.x = canvas.width/2;
    ship.y = canvas.height/2;
    rockets = [];
    for(let key in keys) keys[key] = false;
    invincibleTimer = invincibleDuration;
    initAsteroids();
}


function drawHUD(){
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Vieți: ${lives}`, 10, 30);
    ctx.fillText(`Puncte: ${score}`, 10, 60);
}

function update() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
if(keys["z"]) ship.rotate("left");
if(keys["c"]) ship.rotate("right");
if(keys["arrowup"]) ship.move("up");
if(keys["arrowdown"]) ship.move("down");
if(keys["arrowleft"]) ship.move("left");
if(keys["arrowright"]) ship.move("right");

ship.draw();

for (let i = 0; i < asteroids.length; i++) {
    for (let j = i + 1; j < asteroids.length; j++) {
        const a1 = asteroids[i], a2 = asteroids[j];
        const dx = a1.x - a2.x, dy = a1.y - a2.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const r1 = 10 + a1.level*5, r2 = 10 + a2.level*5;
        if (dist < r1 + r2) {
            const tempX = a1.speedX, tempY = a1.speedY;
            a1.speedX = a2.speedX; a1.speedY = a2.speedY;
            a2.speedX = tempX; a2.speedY = tempY;
            const overlap = (r1 + r2 - dist) / 2;
            a1.x += dx/dist * overlap; a1.y += dy/dist * overlap;
            a2.x -= dx/dist * overlap; a2.y -= dy/dist * overlap;
        }
    }
}

for (let ast of asteroids) {
    ast.move();
    ast.draw();
}

if (invincibleTimer > 0) invincibleTimer--;

if (invincibleTimer === 0) {
    for (let ast of asteroids) {
        const dx = ship.x - ast.x, dy = ship.y - ast.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const r = 10 + ast.level*5;
        if (dist < r + ship.size) {
            lives--;
            if (lives <= 0) {
                gameOverSound.currentTime = 0; 
                gameOverSound.play();  
                alert("Game Over!");
                savePlayerScore(score);
                resetGame();
                return;
            } else {
                ship.x = canvas.width/2;
                ship.y = canvas.height/2;
                invincibleTimer = invincibleDuration;
            }
            break;
        }
    }
}


for (let rocket of rockets) rocket.move();
for (let rocket of rockets) rocket.draw();


for (let rocket of rockets) {
    for (let ast of asteroids) {
        const dx = rocket.x - ast.x, dy = rocket.y - ast.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const r = 10 + ast.level*5;
        if (dist < r + rocket.size) {
            rocket.dead = true;
            ast.level--;
            if (ast.level <= 0) {
                score += 5;
                const maxLives = 5;
                if (score % pointsPerLife === 0 && lives < maxLives) lives++;

                explosionSound.currentTime = 0;
                explosionSound.play();
            }
        }
    }
}


rockets = rockets.filter(r => !r.dead);
asteroids = asteroids.filter(a => a.level > 0);


const targetAsteroids = 5;
while (asteroids.length < targetAsteroids) {
    asteroids.push(new Asteroid(Math.random()*canvas.width, Math.random()*canvas.height));
}


drawHUD();
drawHighScores();
}


