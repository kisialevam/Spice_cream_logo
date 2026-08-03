(() => {
  'use strict';

  const SCREEN_WIDTH = 1080;
  const SCREEN_HEIGHT = 2048;
  const REFERENCE_OPACITY = 0.5;
  const KEYBOARD_STEP = 1;
  const KEYBOARD_FAST_STEP = 10;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.25;
  const WHEEL_ZOOM_STEP = 0.15;
  const STORAGE_KEY = 'spice-cream-letter-layout-v1';

  const ASSETS = [
    { key: 'reference-logo', src: 'logo_big.png' },
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
    { id: 'spice-s', letter: 'S', texture: 'letter-s', x: 402, y: 986 },
    { id: 'spice-p', letter: 'P', texture: 'letter-p', x: 484, y: 981 },
    { id: 'spice-i', letter: 'I', texture: 'letter-i', x: 550, y: 977 },
    { id: 'spice-c', letter: 'C', texture: 'letter-c', x: 613, y: 972 },
    { id: 'spice-e', letter: 'E', texture: 'letter-e', x: 694, y: 966 },
    { id: 'cream-c', letter: 'C', texture: 'letter-c', x: 374, y: 1081 },
    { id: 'cream-r', letter: 'R', texture: 'letter-r', x: 457, y: 1074 },
    { id: 'cream-e', letter: 'E', texture: 'letter-e', x: 537, y: 1068 },
    { id: 'cream-a', letter: 'A', texture: 'letter-a', x: 619, y: 1062 },
    { id: 'cream-m', letter: 'M', texture: 'letter-m', x: 702, y: 1057 }
  ];

  const message = document.getElementById('message');
  const copyButton = document.getElementById('copy-positions');
  const resetButton = document.getElementById('reset-positions');
  const editorStatus = document.getElementById('editor-status');
  const zoomOutButton = document.getElementById('zoom-out');
  const zoomResetButton = document.getElementById('zoom-reset');
  const zoomInButton = document.getElementById('zoom-in');
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
      editorStatus.textContent = 'Клик → стрелки';
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

    scene.updateSelectionFrame();
    showEditorStatus('Сброшено');
  }

  function getLetterDepth(definition) {
    return definition.id.startsWith('spice-') ? 10 : 20;
  }

  function changeZoom(delta) {
    if (scene) {
      scene.setEditorZoom(scene.cameras.main.zoom + delta);
    }
  }

  class TransitionScene extends Phaser.Scene {
    constructor() {
      super('TransitionScene');
    }

    create() {
      scene = this;
      window.transitionScene = this;
      this.letterSprites = new Map();
      this.selectedLetter = null;
      this.selectionFrame = null;
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
          .setDepth(getLetterDepth(definition))
          .setName(definition.id)
          .setData('definition', definition)
          .setInteractive({ useHandCursor: true });

        this.input.setDraggable(sprite);
        this.letterSprites.set(definition.id, sprite);

        sprite.on('pointerdown', () => {
          this.selectLetter(sprite);
        });
      });

      this.input.on('dragstart', (pointer, sprite) => {
        this.selectLetter(sprite);
        sprite.setAlpha(0.82);
      });

      this.input.on('drag', (pointer, sprite, dragX, dragY) => {
        sprite.setPosition(
          Phaser.Math.Clamp(dragX, 0, SCREEN_WIDTH),
          Phaser.Math.Clamp(dragY, 0, SCREEN_HEIGHT)
        );
        this.updateSelectionFrame();
      });

      this.input.on('dragend', (pointer, sprite) => {
        sprite
          .setPosition(Math.round(sprite.x), Math.round(sprite.y))
          .setAlpha(1);
        this.updateSelectionFrame();
        saveLetterPositions();
      });

      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN
      ]);

      this.input.keyboard.on('keydown', (event) => {
        this.moveSelectedLetter(event);
      });

      this.input.on('wheel', (
        pointer,
        gameObjects,
        deltaX,
        deltaY,
        deltaZ,
        event
      ) => {
        const direction = deltaY > 0 ? -1 : 1;
        this.setEditorZoom(
          this.cameras.main.zoom + direction * WHEEL_ZOOM_STEP
        );
        event?.preventDefault();
      });
    }

    selectLetter(sprite) {
      this.selectedLetter = sprite;

      if (this.selectionFrame) {
        this.selectionFrame.destroy();
      }

      this.selectionFrame = this.add.rectangle(
        sprite.x,
        sprite.y,
        sprite.displayWidth + 18,
        sprite.displayHeight + 18,
        0xffe36e,
        0.08
      );

      this.selectionFrame
        .setStrokeStyle(5, 0xffe36e, 1)
        .setDepth(99);

      const definition = sprite.getData('definition');
      const word = definition.id.startsWith('spice-') ? 'SPICE' : 'CREAM';
      showEditorStatus(`${word} · ${definition.letter}`);
    }

    setEditorZoom(value) {
      const zoom = Phaser.Math.Clamp(value, MIN_ZOOM, MAX_ZOOM);

      this.cameras.main
        .setZoom(zoom)
        .centerOn(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);

      zoomResetButton.textContent = `${Math.round(zoom * 100)}%`;
      showEditorStatus(`Масштаб ${Math.round(zoom * 100)}%`);
    }

    updateSelectionFrame() {
      if (!this.selectionFrame || !this.selectedLetter) {
        return;
      }

      this.selectionFrame.setPosition(
        this.selectedLetter.x,
        this.selectedLetter.y
      );
    }

    moveSelectedLetter(event) {
      if (!this.selectedLetter) {
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
      const sprite = this.selectedLetter;
      sprite.setPosition(
        Phaser.Math.Clamp(sprite.x + direction.x * step, 0, SCREEN_WIDTH),
        Phaser.Math.Clamp(sprite.y + direction.y * step, 0, SCREEN_HEIGHT)
      );

      this.updateSelectionFrame();
      saveLetterPositions();

      const definition = sprite.getData('definition');
      showEditorStatus(
        `${definition.letter}: ${Math.round(sprite.x)}, ${Math.round(sprite.y)}`
      );
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
  zoomOutButton.addEventListener('click', () => changeZoom(-ZOOM_STEP));
  zoomInButton.addEventListener('click', () => changeZoom(ZOOM_STEP));
  zoomResetButton.addEventListener('click', () => {
    if (scene) {
      scene.setEditorZoom(1);
    }
  });

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
