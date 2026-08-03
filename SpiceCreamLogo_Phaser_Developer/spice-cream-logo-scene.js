(() => {
  'use strict';

  if (!globalThis.Phaser) {
    throw new Error('SpiceCreamLogoScene requires Phaser 3.');
  }

  const SCREEN_WIDTH = 1080;
  const SCREEN_HEIGHT = 2048;
  const BACKGROUND_COLOR = '#24152f';
  const WAVE_INTERVAL = 4000;

  const WAVE_SETTINGS = {
    height: 34,
    duration: 260,
    letterDelay: 90,
    creamOffset: 420
  };

  const SPARKLE_SETTINGS = {
    count: 2,
    scale: 0.75,
    rotationSpeed: 15,
    pause: 0
  };

  const ASSETS = [
    { key: 'spice-cream-letter-s', src: 's.png' },
    { key: 'spice-cream-letter-p', src: 'p.png' },
    { key: 'spice-cream-letter-i', src: 'i.png' },
    { key: 'spice-cream-letter-c', src: 'c.png' },
    { key: 'spice-cream-letter-e', src: 'e.png' },
    { key: 'spice-cream-letter-r', src: 'r.png' },
    { key: 'spice-cream-letter-a', src: 'a.png' },
    { key: 'spice-cream-letter-m', src: 'm.png' },
    { key: 'spice-cream-spark-1', src: 'spark1.png' },
    { key: 'spice-cream-spark-2', src: 'spark2.png' },
    { key: 'spice-cream-spark-3', src: 'spark3.png' }
  ];

  const SPARK_TEXTURES = [
    'spice-cream-spark-1',
    'spice-cream-spark-2',
    'spice-cream-spark-3'
  ];

  const LETTERS = [
    { word: 'SPICE', texture: 'spice-cream-letter-s', x: 402, y: 986 },
    { word: 'SPICE', texture: 'spice-cream-letter-p', x: 484, y: 981 },
    { word: 'SPICE', texture: 'spice-cream-letter-i', x: 550, y: 977 },
    { word: 'SPICE', texture: 'spice-cream-letter-c', x: 613, y: 972 },
    { word: 'SPICE', texture: 'spice-cream-letter-e', x: 694, y: 966 },
    { word: 'CREAM', texture: 'spice-cream-letter-c', x: 374, y: 1081 },
    { word: 'CREAM', texture: 'spice-cream-letter-r', x: 457, y: 1074 },
    { word: 'CREAM', texture: 'spice-cream-letter-e', x: 537, y: 1068 },
    { word: 'CREAM', texture: 'spice-cream-letter-a', x: 619, y: 1062 },
    { word: 'CREAM', texture: 'spice-cream-letter-m', x: 702, y: 1057 }
  ];

  class SpiceCreamLogoScene extends Phaser.Scene {
    constructor() {
      super({ key: 'SpiceCreamLogoScene' });
      this.assetBasePath = 'assets';
    }

    init(data = {}) {
      this.assetBasePath = data.assetBasePath ?? 'assets';
    }

    preload() {
      const basePath = String(this.assetBasePath).replace(/\/+$/, '');

      ASSETS.forEach((asset) => {
        const assetUrl = basePath ? `${basePath}/${asset.src}` : asset.src;
        this.load.image(asset.key, assetUrl);
      });
    }

    create() {
      this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
      this.letterSprites = new Map();
      this.sparkleChannels = new Set();
      this.activeSparkles = new Set();
      this.sparkleRotationAngle = 0;
      this.isWavePlaying = false;

      LETTERS.forEach((definition, index) => {
        const sprite = this.add.image(
          definition.x,
          definition.y,
          definition.texture
        );

        sprite.setDepth(definition.word === 'SPICE' ? 10 : 20);

        if (!this.letterSprites.has(definition.word)) {
          this.letterSprites.set(definition.word, []);
        }

        this.letterSprites.get(definition.word).push(sprite);
        sprite.setName(`spice-cream-letter-${index}`);
      });

      this.syncSparkleChannels();
      this.playLogoWave();
      this.time.addEvent({
        delay: WAVE_INTERVAL,
        loop: true,
        callback: () => this.playLogoWave()
      });

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.activeSparkles.clear();
        this.sparkleChannels.clear();
      });
    }

    update(time, delta) {
      const rotationDelta = SPARKLE_SETTINGS.rotationSpeed * delta / 1000;
      this.sparkleRotationAngle = Phaser.Math.Wrap(
        this.sparkleRotationAngle + rotationDelta,
        -180,
        180
      );

      this.activeSparkles.forEach((sparkle) => {
        sparkle.setAngle(this.sparkleRotationAngle);
      });
    }

    getWordSprites(word) {
      return this.letterSprites.get(word) ?? [];
    }

    getWordBounds(word) {
      const sprites = this.getWordSprites(word);

      return {
        left: Math.min(...sprites.map((sprite) => sprite.x - sprite.displayWidth / 2)),
        right: Math.max(...sprites.map((sprite) => sprite.x + sprite.displayWidth / 2)),
        top: Math.min(...sprites.map((sprite) => sprite.y - sprite.displayHeight / 2)),
        bottom: Math.max(...sprites.map((sprite) => sprite.y + sprite.displayHeight / 2))
      };
    }

    getLogoBounds() {
      const spiceBounds = this.getWordBounds('SPICE');
      const creamBounds = this.getWordBounds('CREAM');

      return {
        left: Math.min(spiceBounds.left, creamBounds.left),
        right: Math.max(spiceBounds.right, creamBounds.right),
        top: Math.min(spiceBounds.top, creamBounds.top),
        bottom: Math.max(spiceBounds.bottom, creamBounds.bottom)
      };
    }

    spawnSparkle(onComplete) {
      const bounds = this.getLogoBounds();
      const sparkle = this.add.image(
        Phaser.Math.FloatBetween(bounds.left - 12, bounds.right + 12),
        Phaser.Math.FloatBetween(bounds.top - 12, bounds.bottom + 12),
        Phaser.Utils.Array.GetRandom(SPARK_TEXTURES)
      );
      const targetScale = Phaser.Math.FloatBetween(1.15, 2.2)
        * SPARKLE_SETTINGS.scale;
      const growDuration = Phaser.Math.Between(260, 480);
      const shrinkDuration = Phaser.Math.Between(240, 420);

      sparkle
        .setDepth(50)
        .setAlpha(1)
        .setScale(0.02)
        .setAngle(this.sparkleRotationAngle)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.activeSparkles.add(sparkle);
      this.tweens.add({
        targets: sparkle,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: growDuration,
        ease: 'Sine.easeOut',
        onComplete: () => {
          const shrinkSparkle = () => {
            this.tweens.add({
              targets: sparkle,
              scaleX: 0,
              scaleY: 0,
              duration: shrinkDuration,
              ease: 'Sine.easeIn',
              onComplete: () => {
                this.activeSparkles.delete(sparkle);
                sparkle.destroy();
                onComplete?.();
              }
            });
          };

          if (SPARKLE_SETTINGS.pause === 0) {
            shrinkSparkle();
          } else {
            this.time.delayedCall(SPARKLE_SETTINGS.pause, shrinkSparkle);
          }
        }
      });
    }

    scheduleSparkleChannel(channelIndex, delay) {
      this.time.delayedCall(delay, () => {
        this.spawnSparkle(() => {
          this.scheduleSparkleChannel(
            channelIndex,
            Phaser.Math.Between(180, 520)
          );
        });
      });
    }

    syncSparkleChannels() {
      for (let index = 0; index < SPARKLE_SETTINGS.count; index += 1) {
        if (this.sparkleChannels.has(index)) {
          continue;
        }

        this.sparkleChannels.add(index);
        this.scheduleSparkleChannel(index, Phaser.Math.Between(120, 850));
      }
    }

    queueWordWave(word, startDelay) {
      const sprites = this.getWordSprites(word);

      sprites.forEach((sprite, index) => {
        const baseY = sprite.y;

        this.tweens.add({
          targets: sprite,
          y: baseY - WAVE_SETTINGS.height,
          duration: WAVE_SETTINGS.duration,
          delay: startDelay + index * WAVE_SETTINGS.letterDelay,
          ease: 'Sine.easeInOut',
          yoyo: true,
          onComplete: () => {
            sprite.y = baseY;
          }
        });
      });

      return startDelay
        + (sprites.length - 1) * WAVE_SETTINGS.letterDelay
        + WAVE_SETTINGS.duration * 2;
    }

    playLogoWave() {
      if (this.isWavePlaying) {
        return;
      }

      this.isWavePlaying = true;
      const spiceEnd = this.queueWordWave('SPICE', 0);
      const creamEnd = this.queueWordWave('CREAM', WAVE_SETTINGS.creamOffset);
      const waveEnd = Math.max(spiceEnd, creamEnd);

      this.time.delayedCall(waveEnd + 30, () => {
        this.isWavePlaying = false;
      });
    }
  }

  globalThis.SpiceCreamLogoScene = SpiceCreamLogoScene;
})();
