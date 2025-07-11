import { assets, spriteDefFolder } from './constants.js'
import CollisionBox from './collision-box.js'
import { drawHitboxes, getRandomNum } from './utils.js'
import { IS_HIDPI, IS_MOBILE, FPS } from './config.js'

/**
 * Obstacle.
 * @param {HTMLCanvasCtx} canvasCtx
 * @param {Obstacle.type} type
 * @param {Object} dimensions
 * @param {number} gapCoefficient Mutipler in determining the gap.
 * @param {number} speed
 * @param {number} opt_xOffset
 */
export default class Obstacle {
  constructor(
    canvasCtx,
    type,
    dimensions,
    gapCoefficient,
    speed,
    opt_xOffset,
  ) {
    this.canvasCtx = canvasCtx
    this.typeConfig = type
    this.gapCoefficient = gapCoefficient
    // this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH)
    this.size = 1
    this.dimensions = dimensions
    this.remove = false
    this.xPos = dimensions.WIDTH + (opt_xOffset || 0)
    this.yPos = 0
    this.width = 0
    this.collisionBoxes = []
    this.gap = 0
    this.speedOffset = 0

    // For animated obstacles.
    this.currentFrame = 0
    this.timer = 0

    if (this.typeConfig.assetKey) {
      this.typeConfig.assets = assets[this.typeConfig.assetKey]
    }

    this.init(speed)
  }

  /**
   * Initialise the DOM for the obstacle.
   * @param {number} speed
   */
  init(speed) {
    this.cloneCollisionBoxes()

    // Only allow sizing if we're at the right speed.
    if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
      this.size = 1
    }

    this.width = this.typeConfig.width * this.size

    // Check if obstacle can be positioned at various heights.
    if (Array.isArray(this.typeConfig.yPos)) {
      var yPosConfig = IS_MOBILE
        ? this.typeConfig.yPosMobile
        : this.typeConfig.yPos
      this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)]
    } else {
      this.yPos = this.typeConfig.yPos
    }

    this.draw()

    // Make collision box adjustments,
    // Central box is adjusted to the size as one box.
    //      ____        ______        ________
    //    _|   |-|    _|     |-|    _|       |-|
    //   | |<->| |   | |<--->| |   | |<----->| |
    //   | | 1 | |   | |  2  | |   | |   3   | |
    //   |_|___|_|   |_|_____|_|   |_|_______|_|
    //
    if (this.size > 1) {
      this.collisionBoxes[1].width =
        this.width - this.collisionBoxes[0].width - this.collisionBoxes[2].width
      this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width
    }

    // For obstacles that go at a different speed from the horizon.
    if (this.typeConfig.speedOffset) {
      this.speedOffset =
        Math.random() > 0.5
          ? this.typeConfig.speedOffset
          : -this.typeConfig.speedOffset
    }

    this.gap = this.getGap(this.gapCoefficient, speed)
  }

  /**
   * Draw and crop based on size.
   */
  draw() {
    var sourceWidth = this.typeConfig.width
    var sourceHeight = this.typeConfig.height

    if (IS_HIDPI) {
      sourceWidth = sourceWidth * 2
      sourceHeight = sourceHeight * 2
    }

    // X position in sprite.
    var sourceX =
      sourceWidth * this.size * (0.5 * (this.size - 1)) + this.typeConfig.spriteDef.x

    // Animation frames.
    if (this.currentFrame > 0) {
      sourceX += sourceWidth * this.currentFrame
    }

    this.canvasCtx.drawImage(
      this.typeConfig.assets,
      sourceX, this.typeConfig.spriteDef.y, sourceWidth * this.size, sourceHeight,
      this.xPos, this.yPos, this.typeConfig.width * this.size * this.typeConfig.scale, this.typeConfig.height * this.typeConfig.scale,
    )

    drawHitboxes(this.canvasCtx, this.typeConfig.collisionBoxes, this.xPos, this.yPos)
  }


  /**
   * Obstacle frame update.
   * @param {number} deltaTime
   * @param {number} speed
   */
  update(deltaTime, speed) {
    if (!this.remove) {
      if (this.typeConfig.speedOffset) {
        speed += this.speedOffset
      }
      this.xPos -= Math.floor(((speed * FPS) / 1000) * deltaTime)

      // Update frame
      if (this.typeConfig.numFrames) {
        this.timer += deltaTime
        if (this.timer >= this.typeConfig.frameRate) {
          this.currentFrame =
            this.currentFrame == this.typeConfig.numFrames - 1
              ? 0
              : this.currentFrame + 1
          this.timer = 0
        }
      }
      this.draw()

      if (!this.isVisible()) {
        this.remove = true
      }
    }
  }

  /**
   * Calculate a random gap size.
   * - Minimum gap gets wider as speed increses
   * @param {number} gapCoefficient
   * @param {number} speed
   * @return {number} The gap size.
   */
  getGap(gapCoefficient, speed) {
    var minGap = Math.round(
      this.width * speed + this.typeConfig.minGap * gapCoefficient,
    )
    var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT)
    return getRandomNum(minGap, maxGap)
  }

  /**
   * Check if obstacle is visible.
   * @return {boolean} Whether the obstacle is in the game area.
   */
  isVisible() {
    return this.xPos + this.width > 0
  }

  /**
   * Make a copy of the collision boxes, since these will change based on
   * obstacle type and size.
   */
  cloneCollisionBoxes() {
    var collisionBoxes = this.typeConfig.collisionBoxes

    for (var i = collisionBoxes.length - 1; i >= 0; i--) {
      this.collisionBoxes[i] = new CollisionBox(
        collisionBoxes[i].x,
        collisionBoxes[i].y,
        collisionBoxes[i].width,
        collisionBoxes[i].height,
      )
    }
  }
}

/**
 * Coefficient for calculating the maximum gap.
 * @const
 */
Obstacle.MAX_GAP_COEFFICIENT = 1.5

/**
 * Maximum obstacle grouping count.
 * @const
 */
Obstacle.MAX_OBSTACLE_LENGTH = 3

/**
 * Obstacle definitions.
 * minGap: minimum pixel space betweeen obstacles.
 * multipleSpeed: Speed at which multiples are allowed.
 * speedOffset: speed faster / slower than the horizon.
 * minSpeed: Minimum speed which the obstacle can make an appearance.
 */
Obstacle.types = [
  // {
  //   type: 'CACTUS_SMALL',
  //   width: 17,
  //   height: 35,
  //   yPos: 105,
  //   multipleSpeed: 4,
  //   minGap: 120,
  //   minSpeed: 0,
  //   collisionBoxes: [
  //     new CollisionBox(0, 7, 5, 27),
  //     new CollisionBox(4, 0, 6, 34),
  //     new CollisionBox(10, 4, 7, 14),
  //   ],
  // },
  {
    type: 'CACTUS_LARGE',
    assetKey: 'carSprite',
    spriteDef: spriteDefFolder.HDPI.CAR,
    scale: 0.3,
    width: 400,
    height: 250,
    yPos: 65,
    multipleSpeed: 7,
    minGap: 120,
    minSpeed: 0,
    collisionBoxes: [
      new CollisionBox(25, 45, 55, 23),
      new CollisionBox(25, 25, 50, 7),
      new CollisionBox(45, 10, 10, 38),
    ],
  },
  {
    type: 'PTERODACTYL',
    width: 400,
    assetKey: 'birdSprite',
    spriteDef: spriteDefFolder.HDPI.BIRD,
    scale: 0.2,
    height: 250,
    yPos: [100, 75, 50], 
    yPosMobile: [100, 50], 
    multipleSpeed: 999,
    minSpeed: 8.5,
    minGap: 150,
    collisionBoxes: [
      new CollisionBox(25, 15, 16, 5),
      new CollisionBox(20, 21, 30, 6),
      new CollisionBox(25, 27, 14, 3),
    ],
    numFrames: 2,
    frameRate: 1000 / 6,
    speedOffset: 0.8,
  },
]
