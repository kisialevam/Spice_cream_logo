# Spice Cream Logo — Phaser 3

Готовая сцена логотипа без редактора, ползунков, кнопок и перетаскивания.

## Что внутри

- `spice-cream-logo-scene.js` — сцена `SpiceCreamLogoScene`.
- `assets/` — изображения букв и трёх видов звёздочек.
- `demo.html` — отдельный пример запуска сцены.

Phaser в архив не включён: сцена рассчитана на Phaser 3, который уже подключён в игре. В демо используется Phaser 3.90.0 с CDN.

## Поведение сцены

- Координатная система: `1080 × 2048`.
- Первая волна запускается сразу после создания сцены.
- Следующие волны стартуют каждые `4000 мс`.
- Параметры волны: высота `34 px`, офсет CREAM `420 мс`.
- Звёздочки: максимум `2`, общий масштаб `0.75×`, синхронное вращение `15°/с`, пауза `0 мс`.

## Подключение в существующую игру

1. Скопировать `spice-cream-logo-scene.js` в папку с игровым кодом.
2. Скопировать папку `assets` в проект.
3. Подключить файл после Phaser:

```html
<script src="phaser.min.js"></script>
<script src="spice-cream-logo-scene.js"></script>
```

4. Добавить и запустить сцену:

```js
game.scene.add(
  'SpiceCreamLogoScene',
  window.SpiceCreamLogoScene,
  false
);

game.scene.start('SpiceCreamLogoScene', {
  assetBasePath: 'assets/spice-cream-logo'
});
```

`assetBasePath` должен указывать на папку, в которой лежат PNG-файлы. Если папка `assets` находится рядом с HTML, параметр можно не передавать.

## Быстрая проверка демо

Открывать `demo.html` лучше через любой локальный HTTP-сервер, а не напрямую как `file://`. Например, из папки комплекта:

```text
python -m http.server 8000
```

После этого открыть `http://localhost:8000/demo.html`.

## Где менять параметры

Основные значения собраны в начале `spice-cream-logo-scene.js`:

- `WAVE_INTERVAL`;
- `WAVE_SETTINGS`;
- `SPARKLE_SETTINGS`;
- `LETTERS`.

Все ключи текстур имеют префикс `spice-cream-`, чтобы снизить риск конфликтов с ассетами основной игры.
