import CollisionBox from './collision-box.js'
import { FPS, IS_HIDPI, IS_MOBILE } from './config.js'
import { assets, spriteDefinition } from './constants.js'
import { getRandomNum } from './utils.js'

const WIDTH = 400
const HEIGHT = 250
const SCALE = 0.2

export default class Coin {
 constructor(canvasCtx, spritePos, dimensions, speed) {
    this.canvasCtx = canvasCtx
    this.spritePos = spritePos
    this.dimensions = dimensions
    this.xPos = dimensions.WIDTH
    this.yPos = [100, 75, 50]
    this.yPosMobile = [100, 50]
    this.size = 1
    // NOTE: for collision checking
    this.typeConfig = {
        width: WIDTH,
        height: HEIGHT
    }
    this.width = WIDTH
    this.height = HEIGHT
    this.remove = false
    this.speed = speed
    this.collected = false

    // Animation
    this.frameRate = 1000 / 3
    this.numFrames = 3
    this.currentFrame = 0
    this.timer = 0

    this.collisionBoxes = [
      new CollisionBox(23, 10, 30, 30)
    ]

    this.coinGap = getRandomNum(
      Coin.config.MIN_GAP,
      Coin.config.MAX_GAP,
    )

    this.init()
  }

  init() {
    // Check if obstacle can be positioned at various heights.
    if (Array.isArray(this.yPos)) {
      var yPosConfig = IS_MOBILE
        ? this.yPosMobile
        : this.yPos
      this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)]
    } else {
      this.yPos = this.yPos
    }

    this.draw()
  }

  getCollistionBoxes() {
    return this.collisionBoxes
  }

  update(deltaTime, speed) {
    this.timer += deltaTime

    this.xPos -= Math.floor(((speed * FPS) / 1000) * deltaTime)
    if (this.xPos + this.width < 0) this.remove = true

    // Animation
    if (this.numFrames) {
      this.timer += deltaTime
      if (this.timer >= this.frameRate) {
        this.currentFrame = this.currentFrame == this.numFrames - 1
            ? 0
            : this.currentFrame + 1
        this.timer = 0
      }
    }
    this.draw()
  }

  draw() {
    let sourceWidth = this.width
    let sourceHeight = this.height

    if (IS_HIDPI) {
      sourceWidth *= 2
      sourceHeight *= 2
    }

    let sourceX = this.spritePos.x
    let sourceY = this.spritePos.y

    // Animation frames.
    if (this.currentFrame > 0) {
      sourceX += sourceWidth * this.currentFrame
    }

    this.canvasCtx.drawImage(
        assets.coinSprite,
        sourceX, this.spritePos.y, sourceWidth, sourceHeight,
        this.xPos, this.yPos, this.width * SCALE, this.height * SCALE
    )

    // --- DEBUG: Draw collision boxes ---
    this.canvasCtx.save()
    this.canvasCtx.strokeStyle = 'red'
    this.canvasCtx.lineWidth = 2
    for (let box of this.collisionBoxes) {
      this.canvasCtx.strokeRect(
        this.xPos + box.x,
        this.yPos + box.y,
        box.width,
        box.height
      )
    }
    this.canvasCtx.restore()

    this.canvasCtx.restore()
  }

checkCollision(player) {
  return (
    this.xPos < player.xPos + player.width &&
    this.xPos + this.width > player.xPos &&
    this.yPos < player.yPos + player.height + 50 && // fudge factor
    this.yPos + this.height > player.yPos - 50
  )
}
}

Coin.config = {
    MIN_GAP: 250,
    MAX_GAP: 1000,
}