(() => {
  'use strict';

  const SCREEN_WIDTH = 1080;
  const SCREEN_HEIGHT = 2048;
  const KEYBOARD_STEP = 1;
  const KEYBOARD_FAST_STEP = 10;
  const WAVE_HEIGHT = 48;
  const WAVE_DURATION = 260;
  const WAVE_LETTER_DELAY = 90;
  const STORAGE_KEY = 'spice-cream-word-layout-v2';

  const ASSETS = [
    { key: 'letter-s', src: 's.png' },
    { key: 'letter-p', src: 'p.png' },
    { key: 'letter-i', src: 'i.png' },
    { key: 'letter-c', src: 'c.png' },
    { key: 'letter-e', src: 'e.png' },
    { key: 'letter-r', src: 'r.png' },
    { key: 'letter-a', src: 'a.png' },
    { key: 'letter-m', src: 'm.png' },
    { key: 'spark-1', src: 'spark1.png' },
    { key: 'spark-2', src: 'spark2.png' },
    { key: 'spark-3', src: 'spark3.png' }
  ];

  const SPARK_TEXTURES = ['spark-1', 'spark-2', 'spark-3'];

  const LETTERS = [
    { id: 'spice-s', word: 'SPICE', letter: 'S', texture: 'letter-s', x: 402, y: 986 },
    { id: 'spice-p', word: 'SPICE', letter: 'P', texture: 'letter-p', x: 484, y: 981 },
    { id: 'spice-i', word: 'SPICE', letter: 'I', texture: 'letter-i', x: 550, y: 977 },
    { id: 'spice-c', word: 'SPICE', letter: 'C', texture: 'letter-c', x: 613, y: 972 },
    { id: 'spice-e', word: 'SPICE', letter: 'E', texture: 'letter-e', x: 694, y: 966 },
    { id: 'cream-c', word: 'CREAM', letter: 'C', texture: 'letter-c', x: 374, y: 1081 },
    { id: 'cream-r', word: 'CREAM', letter: 'R', texture: 'letter-r', x: 457, y: 1074 },
    { id: 'cream-e', word: 'CREAM', letter: 'E', texture: 'letter-e', x: 537, y: 1068 },
    { id: 'cream-a', word: 'CREAM', letter: 'A', texture: 'letter-a', x: 619, y: 1062 },
    { id: 'cream-m', word: 'CREAM', letter: 'M', texture: 'letter-m', x: 702, y: 1057 }
  ];

  const message = document.getElementById('message');
  const copyButton = document.getElementById('copy-positions');
  const resetButton = document.getElementById('reset-positions');
  const editorStatus = document.getElementById('editor-status');
  const loadedImages = new Map();

  let scene = null;
  let statusTimer = null;

  function showMessage(text) {
    message.textContent = text;
    message.style.display = 'grid';
  }

  function showEditorStatus(text) {
    editorStatus.textContent = text;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      editorStatus.textContent = 'Клик → слово';
    }, 1600);
  }

  function loadImage(asset) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.addEventListener('load', () => {
        loadedImages.set(asset.key, image);
        resolve();
      }, { once: true });

      image.addEventListener('error', () => {
        reject(new Error(`Не удалось загрузить ${asset.src}`));
      }, { once: true });

      image.src = asset.src;
    });
  }

  function readSavedPositions() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function getLetterPositions() {
    if (!scene) {
      return [];
    }

    return LETTERS.map((definition) => {
      const sprite = scene.letterSprites.get(definition.id);

      return {
        id: definition.id,
        letter: definition.letter,
        x: Math.round(sprite.x),
        y: Math.round(sprite.y)
      };
    });
  }

  function saveLetterPositions() {
    const positions = Object.fromEntries(
      getLetterPositions().map(({ id, x, y }) => [id, { x, y }])
    );

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    showEditorStatus('Сохранено');
  }

  async function copyLetterPositions() {
    if (scene?.isWavePlaying) {
      showEditorStatus('Дождись конца волны');
      return;
    }

    const text = JSON.stringify(getLetterPositions(), null, 2);

    try {
      await navigator.clipboard.writeText(text);
      showEditorStatus('Скопировано');
    } catch (error) {
      window.prompt('Скопируй эти координаты и пришли их мне:', text);
    }
  }

  function resetWordPositions() {
    if (!scene || scene.isWavePlaying) {
      showEditorStatus('Дождись конца волны');
      return;
    }

    if (!window.confirm('Вернуть оба слова в зафиксированные позиции?')) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);

    LETTERS.forEach((definition) => {
      scene.letterSprites.get(definition.id).setPosition(definition.x, definition.y);
    });

    scene.updateSelectionFrame();
    scene.updateWaveButtonPosition();
    showEditorStatus('Сброшено');
  }

  function getLetterDepth(definition) {
    return definition.word === 'SPICE' ? 10 : 20;
  }

  class TransitionScene extends Phaser.Scene {
    constructor() {
      super('TransitionScene');
    }

    create() {
      scene = this;
      window.transitionScene = this;
      this.letterSprites = new Map();
      this.selectedWord = null;
      this.selectionFrame = null;
      this.dragState = null;
      this.isWavePlaying = false;
      this.cameras.main.setBackgroundColor('#24152f');

      ASSETS.forEach((asset) => {
        this.textures.addImage(asset.key, loadedImages.get(asset.key));
      });

      const savedPositions = readSavedPositions();

      LETTERS.forEach((definition) => {
        const saved = savedPositions[definition.id];
        const sprite = this.add.image(
          saved?.x ?? definition.x,
          saved?.y ?? definition.y,
          definition.texture
        );

        sprite
          .setDepth(getLetterDepth(definition))
          .setName(definition.id)
          .setData('definition', definition)
          .setData('word', definition.word)
          .setInteractive({ useHandCursor: true });

        this.input.setDraggable(sprite);
        this.letterSprites.set(definition.id, sprite);

        sprite.on('pointerdown', () => {
          if (!this.isWavePlaying) {
            this.selectWord(definition.word);
          }
        });
      });

      this.input.on('dragstart', (pointer, sprite) => {
        if (this.isWavePlaying) {
          return;
        }

        const word = sprite.getData('word');
        const wordSprites = this.getWordSprites(word);
        this.selectWord(word);
        this.dragState = {
          word,
          draggedStartX: sprite.x,
          draggedStartY: sprite.y,
          positions: wordSprites.map((wordSprite) => ({
            sprite: wordSprite,
            x: wordSprite.x,
            y: wordSprite.y
          }))
        };

        wordSprites.forEach((wordSprite) => wordSprite.setAlpha(0.82));
      });

      this.input.on('drag', (pointer, sprite, dragX, dragY) => {
        if (!this.dragState) {
          return;
        }

        const requestedX = dragX - this.dragState.draggedStartX;
        const requestedY = dragY - this.dragState.draggedStartY;
        const delta = this.clampWordDelta(
          this.dragState.positions,
          requestedX,
          requestedY
        );

        this.dragState.positions.forEach((position) => {
          position.sprite.setPosition(
            position.x + delta.x,
            position.y + delta.y
          );
        });
        this.updateSelectionFrame();
      });

      this.input.on('dragend', () => {
        if (!this.dragState) {
          return;
        }

        this.dragState.positions.forEach((position) => {
          position.sprite
            .setPosition(
              Math.round(position.sprite.x),
              Math.round(position.sprite.y)
            )
            .setAlpha(1);
        });
        this.dragState = null;
        this.updateSelectionFrame();
        this.updateWaveButtonPosition();
        saveLetterPositions();
      });

      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN
      ]);

      this.input.keyboard.on('keydown', (event) => {
        this.moveSelectedWord(event);
      });

      this.createWaveButton();
      this.scheduleSparkle();
    }

    getWordSprites(word) {
      return LETTERS
        .filter((definition) => definition.word === word)
        .map((definition) => this.letterSprites.get(definition.id));
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

    clampWordDelta(positions, deltaX, deltaY) {
      const left = Math.min(
        ...positions.map((position) => position.x - position.sprite.displayWidth / 2)
      );
      const right = Math.max(
        ...positions.map((position) => position.x + position.sprite.displayWidth / 2)
      );
      const top = Math.min(
        ...positions.map((position) => position.y - position.sprite.displayHeight / 2)
      );
      const bottom = Math.max(
        ...positions.map((position) => position.y + position.sprite.displayHeight / 2)
      );

      return {
        x: Phaser.Math.Clamp(deltaX, -left, SCREEN_WIDTH - right),
        y: Phaser.Math.Clamp(deltaY, -top, SCREEN_HEIGHT - bottom)
      };
    }

    selectWord(word) {
      this.selectedWord = word;

      if (this.selectionFrame) {
        this.selectionFrame.destroy();
      }

      const bounds = this.getWordBounds(word);
      this.selectionFrame = this.add.rectangle(
        (bounds.left + bounds.right) / 2,
        (bounds.top + bounds.bottom) / 2,
        bounds.right - bounds.left + 18,
        bounds.bottom - bounds.top + 18,
        0xffe36e,
        0.08
      );

      this.selectionFrame
        .setStrokeStyle(5, 0xffe36e, 1)
        .setDepth(99);

      showEditorStatus(word);
    }

    updateSelectionFrame() {
      if (!this.selectionFrame || !this.selectedWord) {
        return;
      }

      const bounds = this.getWordBounds(this.selectedWord);
      this.selectionFrame.setPosition(
        (bounds.left + bounds.right) / 2,
        (bounds.top + bounds.bottom) / 2
      );
    }

    moveSelectedWord(event) {
      if (!this.selectedWord || this.isWavePlaying) {
        return;
      }

      const directions = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }
      };
      const direction = directions[event.key];

      if (!direction) {
        return;
      }

      event.preventDefault();

      const step = event.shiftKey ? KEYBOARD_FAST_STEP : KEYBOARD_STEP;
      const sprites = this.getWordSprites(this.selectedWord);
      const positions = sprites.map((sprite) => ({
        sprite,
        x: sprite.x,
        y: sprite.y
      }));
      const delta = this.clampWordDelta(
        positions,
        direction.x * step,
        direction.y * step
      );

      sprites.forEach((sprite) => {
        sprite.setPosition(sprite.x + delta.x, sprite.y + delta.y);
      });

      this.updateSelectionFrame();
      this.updateWaveButtonPosition();
      saveLetterPositions();
      showEditorStatus(this.selectedWord);
    }

    createWaveButton() {
      this.waveButton = this.add.text(0, 0, 'waaaaveee', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        backgroundColor: '#d83d88',
        stroke: '#761347',
        strokeThickness: 4,
        padding: {
          x: 28,
          y: 14
        }
      });

      this.waveButton
        .setOrigin(0.5)
        .setDepth(70)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (!this.isWavePlaying) {
            this.waveButton.setScale(1.04);
          }
        })
        .on('pointerout', () => this.waveButton.setScale(1))
        .on('pointerdown', () => this.playLogoWave());

      this.updateWaveButtonPosition();
    }

    updateWaveButtonPosition() {
      if (!this.waveButton) {
        return;
      }

      const bounds = this.getLogoBounds();
      this.waveButton.setPosition(
        (bounds.left + bounds.right) / 2,
        bounds.bottom + 100
      );
    }

    spawnSparkle() {
      const bounds = this.getLogoBounds();
      const x = Phaser.Math.FloatBetween(bounds.left - 12, bounds.right + 12);
      const y = Phaser.Math.FloatBetween(bounds.top - 12, bounds.bottom + 12);
      const sparkle = this.add.image(
        x,
        y,
        Phaser.Utils.Array.GetRandom(SPARK_TEXTURES)
      );
      const targetScale = Phaser.Math.FloatBetween(1.15, 2.2);

      sparkle
        .setDepth(50)
        .setAlpha(0)
        .setScale(0)
        .setAngle(Phaser.Math.Between(0, 359))
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: sparkle,
        alpha: 1,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: Phaser.Math.Between(70, 115),
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: sparkle,
            alpha: 0,
            scaleX: targetScale * 1.22,
            scaleY: targetScale * 1.22,
            duration: Phaser.Math.Between(120, 190),
            ease: 'Quad.easeIn',
            onComplete: () => sparkle.destroy()
          });
        }
      });
    }

    scheduleSparkle() {
      this.time.delayedCall(Phaser.Math.Between(150, 380), () => {
        this.spawnSparkle();
        this.scheduleSparkle();
      });
    }

    queueWordWave(word, startDelay) {
      const sprites = this.getWordSprites(word);

      sprites.forEach((sprite, index) => {
        const baseY = sprite.y;
        this.tweens.add({
          targets: sprite,
          y: baseY - WAVE_HEIGHT,
          duration: WAVE_DURATION,
          delay: startDelay + index * WAVE_LETTER_DELAY,
          ease: 'Sine.easeInOut',
          yoyo: true,
          onComplete: () => {
            sprite.y = baseY;
          }
        });
      });

      return startDelay
        + (sprites.length - 1) * WAVE_LETTER_DELAY
        + WAVE_DURATION * 2;
    }

    playLogoWave() {
      if (this.isWavePlaying) {
        return;
      }

      this.isWavePlaying = true;
      this.waveButton
        .disableInteractive()
        .setAlpha(0.55)
        .setScale(1);
      this.selectionFrame?.setVisible(false);
      showEditorStatus('Волна SPICE → CREAM');

      const spiceEnd = this.queueWordWave('SPICE', 0);
      const creamEnd = this.queueWordWave('CREAM', spiceEnd);

      this.time.delayedCall(creamEnd + 30, () => {
        this.isWavePlaying = false;
        this.waveButton
          .setInteractive({ useHandCursor: true })
          .setAlpha(1);
        this.selectionFrame?.setVisible(true);
        this.updateSelectionFrame();
        showEditorStatus('Волна завершена');
      });
    }
  }

  function startGame() {
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: '#24152f',
      scene: TransitionScene,
      input: {
        activePointers: 3
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });
  }

  copyButton.addEventListener('click', copyLetterPositions);
  resetButton.addEventListener('click', resetWordPositions);

  window.spiceCreamEditor = {
    getPositions: getLetterPositions,
    resetPositions: resetWordPositions,
    playWave: () => scene?.playLogoWave()
  };

  if (!window.Phaser) {
    showMessage(
      'Не удалось загрузить Phaser. Проверьте подключение к интернету и обновите страницу.'
    );
    return;
  }

  Promise.all(ASSETS.map(loadImage))
    .then(startGame)
    .catch((error) => showMessage(error.message));
})();
