import Phaser from 'phaser';

function polygon(graphics, color, points) {
  graphics.fillStyle(color, 1);
  graphics.fillPoints(points, true);
}

export default class PizzeriaScene extends Phaser.Scene {
  constructor() {
    super('pizzeria');
    this.expansionCount = 0;
    this.getState = null;
  }

  setStateProvider(provider) { this.getState = provider; }

  create() {
    this.graphics = this.add.graphics();
    this.emoji = this.add.text(0, 0, '🍕', { fontSize: '43px', shadow: { color: '#3d1f14', blur: 12, fill: true } }).setOrigin(.5);
    this.scale.on('resize', () => this.refresh(this.getState?.() || {}));
    this.refresh(this.getState?.() || {});
    this.tweens.add({ targets: this.emoji, y: this.emoji.y - 7, angle: 5, duration: 850, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
  }

  drawRoom() {
    const g = this.graphics;
    if (!g) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const p = (x, y) => ({ x: w * x, y: h * y });
    g.clear();
    g.fillStyle(0xe8c69c, 1).fillRoundedRect(0, 0, w, h, 12);

    // Paredes y piso en perspectiva isométrica.
    polygon(g, 0xb96843, [p(.10,.12), p(.50,.25), p(.50,.64), p(.10,.47)]);
    polygon(g, 0x914a35, [p(.50,.25), p(.90,.12), p(.90,.47), p(.50,.64)]);
    polygon(g, 0x87513a, [p(.10,.47), p(.50,.64), p(.90,.47), p(.50,.95)]);
    polygon(g, 0x70402f, [p(.10,.47), p(.50,.64), p(.50,.71), p(.10,.54)]);
    polygon(g, 0x60372d, [p(.50,.64), p(.90,.47), p(.90,.54), p(.50,.71)]);

    // Baldosas y juntas del suelo.
    g.lineStyle(1, 0xc38a5a, .38);
    for (let t = .2; t < .9; t += .14) {
      g.lineBetween(w*.5, h*.64, w*t, h*(.95 - Math.abs(.5-t)*.6));
      g.lineBetween(w*(.1 + (t-.1)*.08), h*(.47 + (t-.1)*.035), w*(.9 - (.9-t)*.08), h*(.47 + (.9-t)*.035));
    }

    // Ventanal, cuadros y repisas del fondo.
    polygon(g, 0x633a2f, [p(.16,.20), p(.33,.255), p(.33,.40), p(.16,.345)]);
    polygon(g, 0x9fd0cf, [p(.175,.215), p(.315,.26), p(.315,.37), p(.175,.325)]);
    g.lineStyle(3, 0xf5d8ad, 1).lineBetween(w*.245,h*.237,w*.245,h*.347).lineBetween(w*.177,h*.27,w*.314,h*.312);
    polygon(g, 0x693b2d, [p(.61,.27), p(.82,.20), p(.82,.235), p(.61,.305)]);
    polygon(g, 0xe9b66d, [p(.63,.25), p(.68,.235), p(.68,.275), p(.63,.29)]);
    polygon(g, 0xf2d594, [p(.70,.225), p(.75,.21), p(.75,.25), p(.70,.265)]);
    polygon(g, 0xc66845, [p(.77,.21), p(.80,.20), p(.80,.24), p(.77,.25)]);

    // Horno de ladrillo, con profundidad y cámara encendida.
    g.fillStyle(0x5d342b,.35).fillEllipse(w*.70,h*.48,w*.28,h*.12);
    polygon(g, 0x773d2e, [p(.59,.31), p(.75,.25), p(.84,.285), p(.68,.35)]);
    polygon(g, 0x9c5135, [p(.59,.31), p(.68,.35), p(.68,.55), p(.59,.51)]);
    polygon(g, 0x713a2e, [p(.68,.35), p(.84,.285), p(.84,.49), p(.68,.55)]);
    g.fillStyle(0x3d2824,1).fillEllipse(w*.735,h*.41,w*.12,h*.12);
    g.fillStyle(0xf1a24a,1).fillEllipse(w*.735,h*.415,w*.078,h*.075);
    g.fillStyle(0xffd486,1).fillEllipse(w*.735,h*.42,w*.042,h*.036);
    g.fillStyle(0xf2d5aa,1).fillCircle(w*.685,h*.29,3).fillCircle(w*.716,h*.278,3).fillCircle(w*.746,h*.266,3);

    // Mostrador frontal con encimera de mármol.
    g.fillStyle(0x4a2c27,.25).fillEllipse(w*.47,h*.70,w*.38,h*.16);
    polygon(g, 0x8e4b34, [p(.28,.48), p(.48,.41), p(.68,.48), p(.48,.56)]);
    polygon(g, 0xb36542, [p(.28,.48), p(.48,.56), p(.48,.73), p(.28,.65)]);
    polygon(g, 0x78402f, [p(.48,.56), p(.68,.48), p(.68,.65), p(.48,.73)]);
    polygon(g, 0xf1dfc2, [p(.25,.46), p(.48,.38), p(.71,.47), p(.48,.56)]);
    g.lineStyle(2, 0xc9946a, .8).lineBetween(w*.34,h*.46,w*.50,h*.52).lineBetween(w*.53,h*.49,w*.63,h*.45);
    g.fillStyle(0x56342a,1).fillRoundedRect(w*.45,h*.59,w*.08,h*.08,4);
    g.fillStyle(0xeca247,1).fillCircle(w*.49,h*.63,3);

    // Mesas, bancos y macetas con sombras suaves.
    for (const [x,y] of [[.24,.69],[.77,.70]]) {
      g.fillStyle(0x442d25,.26).fillEllipse(w*x,h*(y+.045),w*.15,h*.055);
      g.fillStyle(0x74412f,1).fillRect(w*(x-.009),h*(y-.005),w*.018,h*.12);
      g.fillStyle(0xd79a58,1).fillEllipse(w*x,h*y,w*.17,h*.082);
      g.lineStyle(2,0xf0c17e,.9).strokeEllipse(w*x,h*y,w*.17,h*.082);
      g.fillStyle(0x49734d,1).fillCircle(w*(x-.035),h*(y-.012),4).fillCircle(w*(x-.02),h*(y-.025),5);
      g.fillStyle(0xc66641,1).fillCircle(w*(x+.032),h*(y+.008),4);
    }
    if (this.expansionCount > 0) {
      polygon(g, 0xdeb274, [p(.77,.19), p(.87,.155), p(.87,.24), p(.77,.275)]);
      polygon(g, 0x80503a, [p(.77,.275), p(.87,.24), p(.87,.28), p(.77,.315)]);
    }
    if (this.expansionCount > 2) {
      g.fillStyle(0x426648,1).fillCircle(w*.17,h*.50,8).fillCircle(w*.20,h*.515,7).fillCircle(w*.15,h*.525,6);
    }
  }

  refresh(currentState) {
    if (!this.graphics) return;
    this.expansionCount = currentState.expansions || 0;
    this.drawRoom();
    const w = this.scale.width;
    const h = this.scale.height;
    this.emoji.setPosition(w*.50, h*.32).setText(currentState.paused ? '⏸️' : '🍕');
    if (this.customerGroup) this.customerGroup.destroy(true);
    this.customerGroup = this.add.container();
    const faces = ['😊','😋','🙂','🤩','😄'];
    const count = Math.min(5, currentState.customers || 0);
    for (let i = 0; i < count; i++) {
      const x = w*(.30 + i*.10);
      const y = h*(.79 - (i%2)*.04);
      const shadow=this.add.graphics().fillStyle(0x402a23,.25).fillEllipse(x,y+13,24,8).setDepth(1);
      this.customerGroup.add(shadow);
      const face = this.add.text(x,y,faces[i],{fontSize:'24px'}).setOrigin(.5).setDepth(2);
      this.customerGroup.add(face);
    }
  }
}

