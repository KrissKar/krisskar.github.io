addEventListener('scroll', () => {
    document.querySelector('.title-bg').classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

const canvas = document.getElementById('mage');
const ctx = canvas.getContext('2d');

function sizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
sizeCanvas();
addEventListener('resize', sizeCanvas);


class Wizard {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 48; this.h = 52;
        this.vx = 0; this.vy = 0;
        this.hp = 6;

        this.state = 'pause';
        this.phaseStart = 0;
        this.phaseLength = 2000;
        this.attacked = false;
        this.hasCast = false;
        this.lastFlip;
        this.flashRadius = 0;
        this.hasTransitioned = false;
    }

    setState(state, now) {
        this.state = state;
        this.phaseStart = now;
        if (state === 'roam') {
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle);
            this.vy = Math.sin(angle);
            this.phaseLength = 2000;
            console.log('Roam State');
        } else if (state === 'pause') {
            this.vx = 0; this.vy = 0;
            this.phaseLength = 3000;
            console.log('Pause State');
        } else if (state === 'attack'){
            this.vx = 0; this.vy = 0;
            this.phaseLength = 3000;
            this.hasCast = true;
            console.log('Attack State');
        } else if (state === 'hurt') {
            this.lastFlip = now;
            this.phaseLength = 3000;
            console.log('Wizard Hurt!!!');
        } else if (state === 'transition'){
            this.vx = 0; this.vy = 0;
            this.lastFlip = now;
            this.flashRadius = 0;
            this.phaseLength = 2000;
            console.log('Transition!');
        }
    }

    update(now) {
        if (this.attacked && this.state !== 'transition') {
            this.setState('hurt', now);
            this.attacked = false;
        }
        switch (this.state) {
            case 'roam':
                checkWallCol();
                if (now - this.phaseStart >= this.phaseLength) this.setState('pause', now);
                break;
            case 'pause':
                if (now - this.phaseStart >= this.phaseLength) this.setState('roam', now);
                break;

            case 'hurt':
                if (now - this.lastFlip >= 500){
                    document.body.classList.toggle('pixel');
                    this.lastFlip = now;
                }
                if (now - this.phaseStart >= this.phaseLength && this.hp >= 0) {
                    this.hp -= 1;
                    console.log('HP left: '+ this.hp);
                    document.body.classList.remove('pixel');
                    this.setState('attack', now);
                }
                if (this.hp == 0 && this.state !== 'transition') this.setState('transition', now);
                break;
            case 'attack':
                if (this.hasCast && now - this.phaseStart >= 1200) {
                    this.hasCast = false;
                    fireballs.push(new Fireball(this.x + this.w / 2, this.y, now));
                    centerOf(fireballs);
                };
                if (now - this.phaseStart >= this.phaseLength) this.setState('roam', now);
                break;
            case 'transition':
                if (now - this.lastFlip >= 500){
                    document.body.classList.toggle('pixel');
                    this.lastFlip = now;
                }
                document.body.classList.add('pixel');
                if (now - this.phaseStart >= 4000) this.flashRadius += 15;
                if (this.flashRadius >= Math.hypot(canvas.width, canvas.height) && this.hasTransitioned == false){
                    this.hasTransitioned = true;
                    window.location.href = 'Game/game.html';
                }
                break;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }

    isHit(mx, my) {
        return mx >= this.x && mx <= this.x + this.w 
            && my >= this.y && my <= this.y + this.h;
    }

}

function checkWallCol () {
    if (wizard.x <= 0){
        wizard.vx = 1;
    } else if (wizard.x + wizard.w >= canvas.width) {
        wizard.vx = -1;
    }
    if (wizard.y <= 0){
        wizard.vy = 1;
    } else if (wizard.y + wizard.h >= canvas.height) {
        wizard.vy = -1;
    }
    wizard.x += wizard.vx;
    wizard.y += wizard.vy;
}


class Fireball {
    constructor(x,y, now){
        this.x = x; this.y = y;
        this.w = 20; this.h = 20;
        this.vx = 0; this.vy = 0;
        this.speed = 2;
        this.alive = true;
        this.state = 'idle';
        this.phaseStart = now;
        this.phaseLength = 500;
        this.setState('charge', now);
    }

    setState(state, now){
        this.state = state;
        this.phaseStart = now;
        if (state === 'charge'){
            this.vx = 0; this.vy = 0;
            this.phaseLength = 1000;
            console.log('Fireball Charge');
        } else if (state === 'homing'){
            console.log('Fireball homing');
        } else if (state === 'explode') {
            this.vx = 0; this.vy = 0;
            this.phaseLength = 1000;
            console.log('Fireball exploded');
        }
    }

    update(now, targetX, targetY) {
        switch (this.state) {
            case 'charge':
                if (now - this.phaseStart >= this.phaseLength) this.setState('homing', now);
                break;
            case 'homing':
                let angle = Math.atan2(targetY - this.y - this.h/2, targetX - this.x - this.h/2);
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;
                this.x += this.vx;
                this.y += this.vy;
                if (checkCol(this, { x: mouseX, y: mouseY, w:1, h:1})) {
                    this.setState('explode', now);
                };
                break;
            case 'explode':
                if (now - this.phaseStart >= this.phaseLength) this.alive = false;
                break;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }

}

function centerOf(obj) {
    obj.x -= obj.w / 2;
    obj.y -= obj.h / 2;
}

function checkCol(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const wizard = new Wizard(180, 300);
centerOf(wizard);
let fireballs = [];

let mouseX = 0;
let mouseY = 0;

function loop(now) {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    wizard.update(now);
    wizard.draw(ctx);
    for (const fb of fireballs) {
        fb.update(now, mouseX, mouseY);
        fb.draw(ctx)
    }
    fireballs = fireballs.filter(fb => fb.alive);

    if (wizard.state === 'transition') {
        ctx.beginPath();
        ctx.arc(wizard.x + wizard.w / 2, wizard.y + wizard.h /2, wizard.flashRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.addEventListener('click', (e) => {
  if (wizard.isHit(e.clientX, e.clientY)) wizard.attacked = true;
});

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
});