(() => {
  'use strict';

  const SCREEN_WIDTH = 1080;
  const SCREEN_HEIGHT = 2048;
  const KEYBOARD_STEP = 1;
  const KEYBOARD_FAST_STEP = 10;
  const BASE_WAVE_HEIGHT = 48;
  const BASE_WAVE_DURATION = 260;
  const BASE_WAVE_LETTER_DELAY = 90;
  const STORAGE_KEY = 'spice-cream-word-layout-v2';
  const WAVE_SETTINGS_STORAGE_KEY = 'spice-cream-wave-settings-v1';
  const DEFAULT_WAVE_SETTINGS = {
    speed: 1,
    offset: 880,
    height: BASE_WAVE_HEIGHT,
    loop: false
  };
  const SPARKLE_SETTINGS_STORAGE_KEY = 'spice-cream-sparkle-settings-v1';
  const DEFAULT_SPARKLE_SETTINGS = {
    count: 1,
    scale: 1,
    rotationSpeed: 15,
    pause: 0
  };

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
  const waveSpeedInput = document.getElementById('wave-speed');
  const waveOffsetInput = document.getElementById('wave-offset');
  const waveHeightInput = document.getElementById('wave-height');
  const waveLoopInput = document.getElementById('wave-loop');
  const waveSpeedValue = document.getElementById('wave-speed-value');
  const waveOffsetValue = document.getElementById('wave-offset-value');
  const waveHeightValue = document.getElementById('wave-height-value');
  const sparkleCountInput = document.getElementById('sparkle-count');
  const sparkleScaleInput = document.getElementById('sparkle-scale');
  const sparkleRotationSpeedInput = document.getElementById('sparkle-rotation-speed');
  const sparklePauseInput = document.getElementById('sparkle-pause');
  const sparkleCountValue = document.getElementById('sparkle-count-value');
  const sparkleScaleValue = document.getElementById('sparkle-scale-value');
  const sparkleRotationSpeedValue = document.getElementById('sparkle-rotation-speed-value');
  const sparklePauseValue = document.getElementById('sparkle-pause-value');
  const loadedImages = new Map();

  let scene = null;
  let statusTimer = null;
  let waveSettings = readWaveSettings();
  let sparkleSettings = readSparkleSettings();

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

  function readWaveSettings() {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(WAVE_SETTINGS_STORAGE_KEY)
      ) || {};
      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      return {
        speed: clamp(
          Number(saved.speed) || DEFAULT_WAVE_SETTINGS.speed,
          0.5,
          2
        ),
        offset: clamp(
          Number.isFinite(Number(saved.offset))
            ? Number(saved.offset)
            : DEFAULT_WAVE_SETTINGS.offset,
          0,
          1400
        ),
        height: clamp(
          Number.isFinite(Number(saved.height))
            ? Number(saved.height)
            : DEFAULT_WAVE_SETTINGS.height,
          0,
          120
        ),
        loop: saved.loop === true
      };
    } catch (error) {
      return { ...DEFAULT_WAVE_SETTINGS };
    }
  }

  function saveWaveSettings() {
    window.localStorage.setItem(
      WAVE_SETTINGS_STORAGE_KEY,
      JSON.stringify(waveSettings)
    );
  }

  function syncWaveControls() {
    waveSpeedInput.value = waveSettings.speed;
    waveOffsetInput.value = waveSettings.offset;
    waveHeightInput.value = waveSettings.height;
    waveLoopInput.checked = waveSettings.loop;
    waveSpeedValue.textContent = `${waveSettings.speed.toFixed(2)}×`;
    waveOffsetValue.textContent = `${Math.round(waveSettings.offset)} мс`;
    waveHeightValue.textContent = `${Math.round(waveSettings.height)} px`;
  }

  function updateWaveSettingsFromControls() {
    waveSettings = {
      speed: Number(waveSpeedInput.value),
      offset: Number(waveOffsetInput.value),
      height: Number(waveHeightInput.value),
      loop: waveLoopInput.checked
    };
    syncWaveControls();
    saveWaveSettings();
  }

  function readSparkleSettings() {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(SPARKLE_SETTINGS_STORAGE_KEY)
      ) || {};
      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      return {
        count: Math.round(clamp(
          Number.isFinite(Number(saved.count))
            ? Number(saved.count)
            : DEFAULT_SPARKLE_SETTINGS.count,
          0,
          6
        )),
        scale: clamp(
          Number(saved.scale) || DEFAULT_SPARKLE_SETTINGS.scale,
          0.5,
          2
        ),
        rotationSpeed: clamp(
          Number.isFinite(Number(saved.rotationSpeed))
            ? Number(saved.rotationSpeed)
            : DEFAULT_SPARKLE_SETTINGS.rotationSpeed,
          0,
          90
        ),
        pause: clamp(
          Number.isFinite(Number(saved.pause))
            ? Number(saved.pause)
            : DEFAULT_SPARKLE_SETTINGS.pause,
          0,
          1500
        )
      };
    } catch (error) {
      return { ...DEFAULT_SPARKLE_SETTINGS };
    }
  }

  function saveSparkleSettings() {
    window.localStorage.setItem(
      SPARKLE_SETTINGS_STORAGE_KEY,
      JSON.stringify(sparkleSettings)
    );
  }

  function syncSparkleControls() {
    sparkleCountInput.value = sparkleSettings.count;
    sparkleScaleInput.value = sparkleSettings.scale;
    sparkleRotationSpeedInput.value = sparkleSettings.rotationSpeed;
    sparklePauseInput.value = sparkleSettings.pause;
    sparkleCountValue.textContent = String(sparkleSettings.count);
    sparkleScaleValue.textContent = `${sparkleSettings.scale.toFixed(2)}×`;
    sparkleRotationSpeedValue.textContent = `${Math.round(sparkleSettings.rotationSpeed)}°/с`;
    sparklePauseValue.textContent = `${Math.round(sparkleSettings.pause)} мс`;
  }

  function updateSparkleSettingsFromControls() {
    sparkleSettings = {
      count: Number(sparkleCountInput.value),
      scale: Number(sparkleScaleInput.value),
      rotationSpeed: Number(sparkleRotationSpeedInput.value),
      pause: Number(sparklePauseInput.value)
    };
    syncSparkleControls();
    saveSparkleSettings();
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
      this.sparkleChannels = new Set();
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
      this.syncSparkleChannels();

      if (waveSettings.loop) {
        this.time.delayedCall(250, () => this.playLogoWave());
      }
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

    spawnSparkle(onComplete) {
      const bounds = this.getLogoBounds();
      const x = Phaser.Math.FloatBetween(bounds.left - 12, bounds.right + 12);
      const y = Phaser.Math.FloatBetween(bounds.top - 12, bounds.bottom + 12);
      const sparkle = this.add.image(
        x,
        y,
        Phaser.Utils.Array.GetRandom(SPARK_TEXTURES)
      );
      const settings = { ...sparkleSettings };
      const targetScale = Phaser.Math.FloatBetween(1.15, 2.2)
        * settings.scale;
      const startAngle = Phaser.Math.Between(0, 359);
      const growDuration = Phaser.Math.Between(260, 480);
      const shrinkDuration = Phaser.Math.Between(240, 420);
      const totalDuration = growDuration + settings.pause + shrinkDuration;
      const totalRotation = settings.rotationSpeed * totalDuration / 1000;

      sparkle
        .setDepth(50)
        .setAlpha(1)
        .setScale(0.02)
        .setAngle(startAngle)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: sparkle,
        angle: startAngle + totalRotation,
        duration: totalDuration,
        ease: 'Linear'
      });

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
                sparkle.destroy();
                onComplete?.();
              }
            });
          };

          if (settings.pause === 0) {
            shrinkSparkle();
            return;
          }

          this.time.delayedCall(settings.pause, shrinkSparkle);
        }
      });
    }

    scheduleSparkleChannel(channelIndex, delay) {
      this.time.delayedCall(delay, () => {
        if (channelIndex >= sparkleSettings.count) {
          this.sparkleChannels.delete(channelIndex);
          return;
        }

        this.spawnSparkle(() => {
          if (channelIndex >= sparkleSettings.count) {
            this.sparkleChannels.delete(channelIndex);
            return;
          }

          this.scheduleSparkleChannel(
            channelIndex,
            Phaser.Math.Between(180, 520)
          );
        });
      });
    }

    syncSparkleChannels() {
      for (let index = 0; index < sparkleSettings.count; index += 1) {
        if (this.sparkleChannels.has(index)) {
          continue;
        }

        this.sparkleChannels.add(index);
        this.scheduleSparkleChannel(index, Phaser.Math.Between(120, 850));
      }
    }

    queueWordWave(word, startDelay, settings) {
      const sprites = this.getWordSprites(word);
      const duration = BASE_WAVE_DURATION / settings.speed;
      const letterDelay = BASE_WAVE_LETTER_DELAY / settings.speed;

      sprites.forEach((sprite, index) => {
        const baseY = sprite.y;
        this.tweens.add({
          targets: sprite,
          y: baseY - settings.height,
          duration,
          delay: startDelay + index * letterDelay,
          ease: 'Sine.easeInOut',
          yoyo: true,
          onComplete: () => {
            sprite.y = baseY;
          }
        });
      });

      return startDelay
        + (sprites.length - 1) * letterDelay
        + duration * 2;
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

      const settings = { ...waveSettings };
      const spiceEnd = this.queueWordWave('SPICE', 0, settings);
      const creamEnd = this.queueWordWave(
        'CREAM',
        settings.offset,
        settings
      );
      const waveEnd = Math.max(spiceEnd, creamEnd);

      this.time.delayedCall(waveEnd + 30, () => {
        this.isWavePlaying = false;

        if (waveSettings.loop) {
          showEditorStatus('Постоянная волна');
          this.time.delayedCall(80, () => {
            if (waveSettings.loop) {
              this.playLogoWave();
              return;
            }

            this.restoreWaveButton();
          });
          return;
        }

        this.restoreWaveButton();
      });
    }

    restoreWaveButton() {
      if (this.isWavePlaying) {
        return;
      }

      this.waveButton
        .setInteractive({ useHandCursor: true })
        .setAlpha(1);
      this.selectionFrame?.setVisible(true);
      this.updateSelectionFrame();
      showEditorStatus('Волна завершена');
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
  [waveSpeedInput, waveOffsetInput, waveHeightInput].forEach((input) => {
    input.addEventListener('input', updateWaveSettingsFromControls);
  });
  waveLoopInput.addEventListener('change', () => {
    updateWaveSettingsFromControls();

    if (waveSettings.loop && scene && !scene.isWavePlaying) {
      scene.playLogoWave();
    } else if (!waveSettings.loop && scene && !scene.isWavePlaying) {
      scene.restoreWaveButton();
    }
  });
  syncWaveControls();
  [
    sparkleCountInput,
    sparkleScaleInput,
    sparkleRotationSpeedInput,
    sparklePauseInput
  ].forEach((input) => {
    input.addEventListener('input', () => {
      updateSparkleSettingsFromControls();
      scene?.syncSparkleChannels();
    });
  });
  syncSparkleControls();

  window.spiceCreamEditor = {
    getPositions: getLetterPositions,
    resetPositions: resetWordPositions,
    playWave: () => scene?.playLogoWave(),
    getWaveSettings: () => ({ ...waveSettings }),
    getSparkleSettings: () => ({ ...sparkleSettings })
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
