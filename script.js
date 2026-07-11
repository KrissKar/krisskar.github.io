addEventListener('scroll', () => {
    document.querySelector('.title-bg').classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

const canvas = document.getElementById('mage');
const ctx = canvas.getContext('2d');

function sizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}
sizeCanvas();
addEventListener('resize', sizeCanvas);


const makeImg = (src) => { const img = new Image(); img.src = src; return img; };

const WIZARD_SHEET = makeImg('./Sprites/natalia_sprite-sheet.png');
const WIZARD_ANIMS = {
    idle: { row: 0, frames: 4, fps: 2, loop: true },
    walk: { row: 1, frames: 4, fps: 2, loop: true},
    cast: { row: 2, frames: 2, fps: 2, loop: false},
    hurt: { row: 3, frames: 2, fps: 2, loop: true},
};
const WIZARD_STATE_ANIM = { 
    pause: 'idle', 
    roam: 'walk', 
    attack: 'cast', 
    hurt: 'hurt', 
    transition: 'hurt'
};

const FIREBALL_SHEET = makeImg('./Sprites/fireball_sprite-sheet.png');
const FIREBALL_ANIMS = {
    charge:  { row: 0, frames: 19, fps: 20, loop: false },
    homing:  { row: 1, frames: 9, fps: 15, loop: true  },
    explode: { row: 2, frames: 11, fps: 20, loop: false },
};
const FIREBALL_STATE_ANIM = { 
    charge: 'charge', 
    homing: 'homing', 
    explode: 'explode' };

function currentFrame(entity, now) {
    const anims = entity.anims;
    const anim = anims[entity.stateAnim[entity.state]] || Object.values(anims)[0];
    const elapsed = now - entity.phaseStart;
    const msPerFrame = 1000 / anim.fps;
    const raw = Math.floor(elapsed / msPerFrame);
    const index = anim.loop ? raw % anim.frames : Math.min(raw, anim.frames - 1);
    return { anim, index };
}

function drawSprite(ctx, entity, now) {
    if (entity.vx < 0) entity.facing = -1;
    else if (entity.vx > 0) entity.facing = 1;

    const { anim, index } = currentFrame(entity, now);
    const img = anim.img || entity.sheet;

    if (!img || !img.complete || img.naturalWidth === 0) {
        ctx.fillStyle = entity.fallbackColor || 'magenta';
        ctx.fillRect(entity.x, entity.y, entity.w, entity.h);
        return;
    }

    const fw = entity.frameW, fh = entity.frameH, scale = entity.spriteScale || 1;
    const sx = index * fw;
    const sy = anim.row * fh;
    const drawW = fw * scale, drawH = fh * scale;
    const destX = entity.x + entity.w / 2 - drawW / 2;
    const destY = entity.y + entity.h / 2 - drawH / 2;

    if (entity.facing === -1) {
        ctx.save();
        ctx.translate(destX + drawW, destY);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, fw, fh, 0, 0, drawW, drawH);
        ctx.restore();
    } else {
        ctx.drawImage(img, sx, sy, fw, fh, destX, destY, drawW, drawH);
    }
}


function anchor (parent, lx, ly) {
    return { x: parent.x + lx, y: parent.y + ly};
}

class Wizard {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 60; this.h = 90;
        this.vx = 0; this.vy = 0;
        this.facing = 1;
        this.hp = 6;

        this.state = 'pause';
        this.phaseStart = 0;
        this.phaseLength = 2000;
        this.attacked = false;
        this.hasCast = false;
        this.lastFlip;
        this.flashRadius = 0;
        this.hasTransitioned = false;

        this.frameW = 32; this.frameH = 32; this.spriteScale = 2.5;
        this.sheet = WIZARD_SHEET;
        this.anims = WIZARD_ANIMS;
        this.stateAnim = WIZARD_STATE_ANIM;
        this.fallbackColor = 'blue';
    }

    setState(state, now) {
        this.state = state;
        this.phaseStart = now;
        if (state === 'roam') {
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) / 3;
            this.vy = Math.sin(angle) / 3;
            this.phaseLength = 6000;
            console.log('Roam State');
        } else if (state === 'pause') {
            this.vx = 0; this.vy = 0;
            this.phaseLength = 6000;
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
                    fireballs.push(new Fireball(this, now));
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

    draw(ctx, now) {
        drawSprite(ctx, this, now);
    }

    isHit(mx, my) {
        return mx >= this.x && mx <= this.x + this.w
            && my >= this.y && my <= this.y + this.h;
    }

}

function checkWallCol () {
    if (wizard.x <= 0){
        wizard.vx = 0.6;
    } else if (wizard.x + wizard.w >= canvas.width) {
        wizard.vx = -0.6;
    }
    if (wizard.y <= 0){
        wizard.vy = 0.6;
    } else if (wizard.y + wizard.h >= canvas.height) {
        wizard.vy = -0.6;
    }
    wizard.x += wizard.vx;
    wizard.y += wizard.vy;
}


class Fireball {
    constructor(parent, now){
        this.parent = parent;
        this.localX = 65; this.localY = 25;
        this.w = 20; this.h = 20;
        this.vx = 0; this.vy = 0;
        this.facing = parent.facing;
        this.speed = 2;
        this.alive = true;
        this.state = 'idle';
        this.phaseStart = now;
        this.phaseLength = 500;

        this.frameW = 16; this.frameH = 16; this.spriteScale = 2;
        this.sheet = FIREBALL_SHEET;
        this.anims = FIREBALL_ANIMS;
        this.stateAnim = FIREBALL_STATE_ANIM;
        this.fallbackColor = 'red';

        this.anchorToParent();
        this.setState('charge', now);
    }

    anchorToParent() {
        const p = worldFromLocal(this.parent, this.localX, this.localY);
        this.x = p.x; this.y = p.y;
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
            this.phaseLength = 600;
            console.log('Fireball exploded');
        }
    }

    update(now, targetX, targetY) {
        switch (this.state) {
            case 'charge':
                this.anchorToParent();
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

    draw(ctx, now) {
        drawSprite(ctx, this, now);
    }

}

function centerOf(obj) {
    obj.x -= obj.w / 2;
    obj.y -= obj.h / 2;
}

function worldFromLocal(parent, localX, localY) {
    const lx = parent.facing === 1 ? localX : parent.w - localX;   // mirror the offset when the parent faces left
    return { x: parent.x + lx, y: parent.y + localY };
}

function checkCol(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawHitbox(ctx, obj, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(obj.x + 0.5, obj.y + 0.5, obj.w - 1, obj.h - 1);
}

const wizard = new Wizard(180, 300);
centerOf(wizard);
let fireballs = [];

let mouseX = 0;
let mouseY = 0;
let DEBUG = false;

function loop(now) {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    wizard.update(now);
    wizard.draw(ctx, now);
    for (const fb of fireballs) {
        fb.update(now, mouseX, mouseY);
        fb.draw(ctx, now)
    }
    fireballs = fireballs.filter(fb => fb.alive);

    if (wizard.state === 'transition') {
        ctx.beginPath();
        ctx.arc(wizard.x + wizard.w / 2, wizard.y + wizard.h /2, wizard.flashRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    if (DEBUG) {
        drawHitbox(ctx, wizard, 'lime');
        for (const fb of fireballs) drawHitbox(ctx, fb, 'cyan');
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

window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') DEBUG = !DEBUG;
});
