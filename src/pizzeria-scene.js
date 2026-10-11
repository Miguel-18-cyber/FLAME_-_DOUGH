import Phaser from 'phaser';

export default class PizzeriaScene extends Phaser.Scene {
  constructor() {
    super('pizzeria');
    this.expansionCount = 0;
    this.getState = null;
  }

  setStateProvider(provider) { this.getState = provider; }

  preload() {
    this.load.svg('unity-pizzeria', '/pizzeria-unity.svg?v=unity-v3', { width: 960, height: 420 });
  }

  create() {
    this.graphics = this.add.graphics();
    this.roomImage = this.add.image(0, 0, 'unity-pizzeria').setOrigin(0.5);
    this.expansionGraphics = this.add.graphics().setDepth(1);
    this.emoji = this.add.text(0, 0, '🍕', { fontSize: '30px', shadow: { color: '#3d1f14', blur: 8, fill: true } }).setOrigin(.5);
    this.scale.on('resize', () => this.refresh(this.getState?.() || {}));
    this.refresh(this.getState?.() || {});
    this.tweens.add({ targets: this.emoji, y: this.emoji.y - 7, angle: 5, duration: 850, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
  }

  drawRoom() {
    if (!this.graphics || !this.roomImage) return;
    const w = this.scale.width;
    const h = this.scale.height;
    this.graphics.clear().fillStyle(0xe8c69c, 1).fillRoundedRect(0, 0, w, h, 12);
    this.roomImage.setPosition(w / 2, h / 2).setDisplaySize(w, h);
    const g = this.expansionGraphics;
    g.clear();
    // Las ampliaciones se reflejan como detalles del local sin cubrir el modelo de Unity.
    if (this.expansionCount > 0) {
      g.fillStyle(0x4c2c20, .78).fillRoundedRect(w * .75, h * .08, w * .21, h * .105, 8);
      g.fillStyle(0xffd283, 1).fillCircle(w * .78, h * .132, 5 + Math.min(this.expansionCount, 3));
      for (let i = 0; i < Math.min(this.expansionCount, 6); i++) {
        g.fillStyle(0xffe6b7, .9).fillRoundedRect(w * (.805 + i * .022), h * .119, w * .014, h * .026, 2);
      }
    }
    if (this.expansionCount > 2) {
      g.fillStyle(0x426648, .9).fillCircle(w * .1, h * .84, 6).fillCircle(w * .12, h * .86, 5).fillCircle(w * .08, h * .87, 4);
    }
  }

  refresh(currentState) {
    if (!this.graphics) return;
    this.expansionCount = currentState.expansions || 0;
    this.drawRoom();
    const w = this.scale.width;
    const h = this.scale.height;
    this.emoji.setPosition(w*.50, h*.64).setText(currentState.paused ? '⏸' : '🍕');
    if (this.customerGroup) this.customerGroup.destroy(true);
    this.customerGroup = this.add.container();
    const faceColors = [0xffcf68, 0xffbd58, 0xffd87d, 0xffc45e, 0xffd06d];
    const count = Math.min(5, currentState.customers || 0);
    for (let i = 0; i < count; i++) {
      const x = w*(.30 + i*.10);
      const y = h*(.79 - (i%2)*.04);
      const shadow=this.add.graphics().fillStyle(0x402a23,.25).fillEllipse(x,y+13,24,8).setDepth(1);
      this.customerGroup.add(shadow);
      const face = this.add.graphics().setDepth(2);
      face.fillStyle(faceColors[i],1).fillCircle(x,y,11);
      face.lineStyle(1.5,0x9a552d,.8).strokeCircle(x,y,11);
      face.fillStyle(0x493126,1).fillCircle(x-3.5,y-2,1.15).fillCircle(x+3.5,y-2,1.15);
      face.lineStyle(1.5,0x7b3e2c,.95).lineBetween(x-3,y+4,x+3,y+4);
      this.customerGroup.add(face);
    }
  }
}

