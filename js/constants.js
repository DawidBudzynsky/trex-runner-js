import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from './config.js'

/**
 * image element
 * @enum {Object}
 */
export const assets = {
  imageSprite: null,
  additionalImageSprite: null,
  lakeImageSprite: null,
  background: null,
  horizon: null,
  grass: null,
  sharkSprite: null,
  birdSprite: null,
  deadSharkSprite: null,
  carSprite: null,
  coinSprite: null,
}
// assets.background.src = 'assets/default_200_percent/background.png'
// assets.horizon.src = 'assets/default_200_percent/horizon.png'
// assets.grass.src = 'assets/default_200_percent/grass.png'

/**
 * Default game configuration.
 * @enum {number}
 */
export const config = {
  ACCELERATION: 0.001,
  BG_CLOUD_SPEED: 0.2,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  CLOUD_FREQUENCY: 0.5,
  GAMEOVER_CLEAR_TIME: 750,
  GAP_COEFFICIENT: 0.6,
  GRAVITY: 0.6,
  INITIAL_JUMP_VELOCITY: 12,
  INVERT_FADE_DURATION: 12000,
  INVERT_DISTANCE: 700,
  MAX_BLINK_COUNT: 3,
  MAX_CLOUDS: 6,
  MAX_OBSTACLE_LENGTH: 3,
  MAX_OBSTACLE_DUPLICATION: 2,
  MAX_SPEED: 13,
  MIN_JUMP_HEIGHT: 35,
  MOBILE_SPEED_COEFFICIENT: 1.2,
  RESOURCE_TEMPLATE_ID: 'audio-resources',
  SPEED: 6,
  SPEED_DROP_COEFFICIENT: 3,
  ARCADE_MODE_INITIAL_TOP_POSITION: 35,
  ARCADE_MODE_TOP_POSITION_PERCENT: 0.1,
}

/**
 * Default dimensions.
 * @enum {string}
 */
export const defaultDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: DEFAULT_HEIGHT,
}

/**
 * CSS class names.
 * @enum {string}
 */
export const classes = {
  ARCADE_MODE: 'arcade-mode',
  CANVAS: 'runner-canvas',
  CONTAINER: 'runner-container',
  CRASHED: 'crashed',
  ICON: 'icon-offline',
  INVERTED: 'inverted',
  SNACKBAR: 'snackbar',
  SNACKBAR_SHOW: 'snackbar-show',
  TOUCH_CONTROLLER: 'controller',
}

/**
 * Sprite definition layout of the spritesheet.
 * @enum {Object}
 */
export const spriteDefinition = {
  LDPI: {
    CACTUS_LARGE: { x: 332, y: 2 },
    CACTUS_SMALL: { x: 228, y: 2 },
    CLOUD: { x: 86, y: 2 },
    HORIZON: { x: 2, y: 54 },
    MOON: { x: 484, y: 2 },
    PTERODACTYL: { x: 134, y: 2 },
    RESTART: { x: 2, y: 2 },
    TEXT_SPRITE: { x: 655, y: 2 },
    TREX: { x: 848, y: 2 },
    STAR: { x: 645, y: 2 },
    COIN: { x: 332, y: 2},
  },
  HDPI: {
    CACTUS_LARGE: { x: 0, y: 694 },
    CACTUS_SMALL: { x: 446, y: 2 },
    CLOUD: { x: 166, y: 2 },
    HORIZON: { x: 2, y: 104 },
    MOON: { x: 954, y: 2 },
    PTERODACTYL: { x: 260, y: 2 },
    RESTART: { x: 2, y: 2 },
    TEXT_SPRITE: { x: 1294, y: 2 },
    TREX: { x: 502, y: 1133},
    STAR: { x: 1276, y: 2 },
    COIN: { x: 6201, y: 0},
  },
}

export const spriteDefFolder = {
  HDPI: {
    SHARK: { x: 0, y: 0},
    BIRD: { x: 0, y: 0},
    DEAD_SHARK: { x: 0, y: 0},
    CAR: { x: 0, y: 0},
    COIN: { x: 0, y: 0},
  }
}

/**
 * Sound FX. Reference to the ID of the audio tag on interstitial page.
 * @enum {string}
 */
export const sounds = {
  BUTTON_PRESS: 'offline-sound-press',
  HIT: 'offline-sound-hit',
  SCORE: 'offline-sound-reached',
}

/**
 * Key code mapping.
 * @enum {Object}
 */
export const keycodes = {
  JUMP: { 38: 1, 32: 1 }, // Up, spacebar
  DUCK: { 40: 1 }, // Down
  RESTART: { 13: 1 }, // Enter
}

/**
 * Runner event names.
 * @enum {string}
 */
export const events = {
  ANIM_END: 'webkitAnimationEnd',
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  RESIZE: 'resize',
  TOUCHEND: 'touchend',
  TOUCHSTART: 'touchstart',
  VISIBILITY: 'visibilitychange',
  BLUR: 'blur',
  FOCUS: 'focus',
  LOAD: 'load',
}

export const loadTimeData = {
  //
  getValue: function (key) {
    console.log(`>>> get value : ${key}`)
    return 'opps..'
  },
  valueExists: function (key) {
    return false
  },
}
