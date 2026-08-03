(() => {
  'use strict';

  const SCREEN_WIDTH = 1080;
  const SCREEN_HEIGHT = 2048;
  const REFERENCE_OPACITY = 0.5;
  const STORAGE_KEY = 'spice-cream-letter-layout-v1';

  const ASSETS = [
    { key: 'reference-logo', src: 'logo_small.png' },
    { key: 'letter-s', src: 's.png' },
    { key: 'letter-p', src: 'p.png' },
    { key: 'letter-i', src: 'i.png' },
    { key: 'letter-c', src: 'c.png' },
    { key: 'letter-e', src: 'e.png' },
    { key: 'letter-r', src: 'r.png' },
    { key: 'letter-a', src: 'a.png' },
    { key: 'letter-m', src: 'm.png' }
  ];

  const LETTERS = [
    { id: 'spice-s', letter: 'S', texture: 'letter-s', x: 140, y: 300 },
    { id: 'spice-p', letter: 'P', texture: 'letter-p', x: 340, y: 300 },
    { id: 'spice-i', letter: 'I', texture: 'letter-i', x: 540, y: 300 },
    { id: 'spice-c', letter: 'C', texture: 'letter-c', x: 740, y: 300 },
    { id: 'spice-e', letter: 'E', texture: 'letter-e', x: 940, y: 300 },
    { id: 'cream-c', letter: 'C', texture: 'letter-c', x: 140, y: 1748 },
    { id: 'cream-r', letter: 'R', texture: 'letter-r', x: 340, y: 1748 },
    { id: 'cream-e', letter: 'E', texture: 'letter-e', x: 540, y: 1748 },
    { id: 'cream-a', letter: 'A', texture: 'letter-a', x: 740, y: 1748 },
    { id: 'cream-m', letter: 'M', texture: 'letter-m', x: 940, y: 1748 }
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
      editorStatus.textContent = 'Готово';
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
    const text = JSON.stringify(getLetterPositions(), null, 2);

    try {
      await navigator.clipboard.writeText(text);
      showEditorStatus('Скопировано');
    } catch (error) {
      window.prompt('Скопируй эти координаты и пришли их мне:', text);
    }
  }

  function resetLetterPositions() {
    if (!scene || !window.confirm('Сбросить все буквы в начальные позиции?')) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);

    LETTERS.forEach((definition) => {
      scene.letterSprites.get(definition.id).setPosition(definition.x, definition.y);
    });

    showEditorStatus('Сброшено');
  }

  class TransitionScene extends Phaser.Scene {
    constructor() {
      super('TransitionScene');
    }

    create() {
      scene = this;
      window.transitionScene = this;
      this.letterSprites = new Map();
      this.cameras.main.setBackgroundColor('#24152f');

      ASSETS.forEach((asset) => {
        this.textures.addImage(asset.key, loadedImages.get(asset.key));
      });

      const referenceLogo = this.add.image(
        SCREEN_WIDTH / 2,
        SCREEN_HEIGHT / 2,
        'reference-logo'
      );

      const maxLogoWidth = SCREEN_WIDTH * 0.86;
      const referenceScale = Math.min(1, maxLogoWidth / referenceLogo.width);
      referenceLogo
        .setScale(referenceScale)
        .setAlpha(REFERENCE_OPACITY)
        .setDepth(1);

      const savedPositions = readSavedPositions();

      LETTERS.forEach((definition) => {
        const saved = savedPositions[definition.id];
        const sprite = this.add.image(
          saved?.x ?? definition.x,
          saved?.y ?? definition.y,
          definition.texture
        );

        sprite
          .setDepth(10)
          .setName(definition.id)
          .setInteractive({ useHandCursor: true });

        this.input.setDraggable(sprite);
        this.letterSprites.set(definition.id, sprite);
      });

      this.input.on('dragstart', (pointer, sprite) => {
        sprite.setDepth(100).setAlpha(0.82);
      });

      this.input.on('drag', (pointer, sprite, dragX, dragY) => {
        sprite.setPosition(
          Phaser.Math.Clamp(dragX, 0, SCREEN_WIDTH),
          Phaser.Math.Clamp(dragY, 0, SCREEN_HEIGHT)
        );
      });

      this.input.on('dragend', (pointer, sprite) => {
        sprite
          .setPosition(Math.round(sprite.x), Math.round(sprite.y))
          .setDepth(10)
          .setAlpha(1);
        saveLetterPositions();
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
  resetButton.addEventListener('click', resetLetterPositions);

  window.spiceCreamEditor = {
    getPositions: getLetterPositions,
    resetPositions: resetLetterPositions
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
