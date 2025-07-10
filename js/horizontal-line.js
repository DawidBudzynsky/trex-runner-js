import { assets, config } from './constants.js'
import { IS_HIDPI, FPS, IS_MOBILE, IS_IOS } from './config.js'
import { drawImageScaled } from './utils.js'

export default class HorizonLine {
  /**
   * Horizon Line.
   * Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
   * @param {HTMLCanvasElement} canvas
   * @param {Object} spritePos Horizon position in sprite.
   * @constructor
   */
  constructor(canvas, spritePos) {
    this.spritePos = spritePos
    this.canvas = canvas
    this.canvasCtx = canvas.getContext('2d')
    this.sourceDimensions = {}
    this.dimensions = HorizonLine.dimensions
    this.shouldRenderLake = true
    this.lakeXPos = -40
    this.sourceXPos = [
      this.spritePos.x,
      this.spritePos.x + this.dimensions.WIDTH,
    ]
    this.xPos = []
    this.yPos = 0
    this.bumpThreshold = 0.5

    this.setSourceDimensions()


    this.shouldRenderLakeP = false

    this.lakePXPos = this.canvas.width - 300
    this.lakePFullyVisible = false

    this.draw()
  }

  startLakePReveal() {
    this.shouldRenderLakeP = true
    this.lakePFullyVisible = false
  }

  /**
   * Set the source dimensions of the horizon line.
   */
  setSourceDimensions() {
    for (var dimension in HorizonLine.dimensions) {
      if (IS_HIDPI) {
        if (dimension != 'YPOS') {
          this.sourceDimensions[dimension] =
            HorizonLine.dimensions[dimension] * 2
        }
      } else {
        this.sourceDimensions[dimension] = HorizonLine.dimensions[dimension]
      }
      this.dimensions[dimension] = HorizonLine.dimensions[dimension]
    }

    this.xPos = [0, HorizonLine.dimensions.WIDTH]
    this.yPos = HorizonLine.dimensions.YPOS
  }

  /**
   * Return the crop x position of a type.
   */
  getRandomType() {
    return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0
  }

  /**
   * Draw the horizon line.
   */
  draw() {

    this.canvasCtx.drawImage(
      assets.background,
      0, 0,
      600,
      100,
    )

    // Only draw lake if it's still visible
    if (this.shouldRenderLake && this.lakeXPos !== null) {
      this.canvasCtx.drawImage(
        assets.lakeImageSprite,
        this.lakeXPos,
        0,
        4136 * 0.1,
        1600 * 0.1
      )
    }

    const offsetX = (IS_MOBILE || IS_IOS) ? -200 : 0;
    if (this.shouldRenderLakeP) {
      this.canvasCtx.drawImage(
        assets.lakeP, 
        this.lakePXPos + offsetX,
        0,
        4136 * 0.1,
        1600 * 0.1 
      )
    }

    // Draw grass.png on top of the horizon line
    // Set the desired grass height (e.g., 12px to match the horizon line)
    const grassHeight = this.dimensions.HEIGHT + 60
    const grassY = this.yPos - 30

    drawImageScaled(
      this.canvasCtx,
      assets.grass,
      this.xPos[0], grassY,
      this.dimensions.WIDTH, grassHeight
    )

    drawImageScaled(
      this.canvasCtx,
      assets.grass,
      this.xPos[1], grassY,
      this.dimensions.WIDTH, grassHeight
    )
  }

  /**
   * Update the x position of an indivdual piece of the line.
   * @param {number} pos Line position.
   * @param {number} increment
   */
  updateXPos(pos, increment) {
    var line1 = pos
    var line2 = pos == 0 ? 1 : 0

    this.xPos[line1] -= increment
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH

    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
      this.xPos[line1] += this.dimensions.WIDTH * 2
      this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH
      this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x
    }
  }

  /**
   * Update the horizon line.
   * @param {number} deltaTime
   * @param {number} speed
   */
  update(deltaTime, speed) {
    var increment = Math.floor(speed * (FPS / 1000) * deltaTime)

    if (!config.freezeMovement) {
      if (this.xPos[0] <= 0) {
        this.updateXPos(0, increment)
      } else {
        this.updateXPos(1, increment)
      }
    }

    // RIGHT lake (appears after win)
    if (this.shouldRenderLakeP) {
      const targetX = this.dimensions.WIDTH / 2.5

      if (this.lakePXPos > targetX) {
        this.lakePXPos -= increment
        console.log(this.canvas.width)
        console.log(this.lakePXPos, targetX)
        if (this.lakePXPos <= targetX) {
          this.lakePXPos = targetX
          this.lakePFullyVisible = true
        }
      } else {
        this.lakePFullyVisible = true
      }
    }

    // Update lake position
    this.lakeXPos -= increment
    if (this.lakeXPos + (4136 * 0.1) < 0) {
      this.shouldRenderLake = false
      this.lakeXPos = null  // Flag to skip drawing
    }

    this.draw()
  }

  /**
   * Reset horizon to the starting position.
   */
  reset() {
    this.xPos[0] = 0
    this.xPos[1] = HorizonLine.dimensions.WIDTH
    this.lakeXPos = -40
    this.lakePXPos = this.dimensions.WIDTH + 100
    this.lakePFullyVisible = false
    this.shouldRenderLakeP = false
    this.shouldRenderLake = true
  }
}

/**
 * Horizon line dimensions.
 * @enum {number}
 */
HorizonLine.dimensions = {
  WIDTH: 600,
  HEIGHT: 12,
  YPOS: 127,
}
