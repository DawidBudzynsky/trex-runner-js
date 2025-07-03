import CollisionBox from './collision-box.js'
import { FPS, IS_HIDPI } from './config.js'
import { assets, spriteDefinition } from './constants.js'
import { getRandomNum } from './utils.js'

const WIDTH = 20
const HEIGHT = 20

export default class Coin {
 constructor(canvasCtx, spritePos, dimensions, speed, yPos) {
    this.canvasCtx = canvasCtx
    this.spritePos = spritePos
    this.dimensions = dimensions
    this.xPos = dimensions.WIDTH
    this.yPos = yPos
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
    this.frameRate = 1000 / 6
    this.numFrames = 1
    this.currentFrame = 0
    this.timer = 0

    this.collisionBoxes = [
      new CollisionBox(0, 0, this.width, this.height)
    ]

    this.coinGap = getRandomNum(
      Coin.config.MIN_GAP,
      Coin.config.MAX_GAP,
    )
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
        this.currentFrame = (this.currentFrame + 1) % this.numFrames
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

    let sourceX = this.spritePos.x + sourceWidth * this.currentFrame
    let sourceY = this.spritePos.y

    // this.canvasCtx.drawImage(
    //     assets.imageSprite,
    //     sourceX, sourceY, sourceWidth, sourceHeight,
    //     this.xPos, this.yPos, this.width, this.height
    // )
    this.canvasCtx.drawImage(assets.imageSprite, 0, 0, sourceWidth, sourceHeight, this.xPos, this.yPos, this.width, this.height)

      // --- DEBUG: Draw collision box ---
  this.canvasCtx.save()
  this.canvasCtx.strokeStyle = 'red'
  this.canvasCtx.lineWidth = 2
  // Draw each collision box (in case you add more later)
  this.collisionBoxes.forEach(box => {
    this.canvasCtx.strokeRect(
      this.xPos + box.x,
      this.yPos + box.y,
      box.width,
      box.height
    )
  })

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