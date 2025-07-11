import { assets, config, defaultDimensions } from './constants.js'
import CollisionBox from './collision-box.js'
import { IS_HIDPI, FPS } from './config.js'
import { drawHitboxes, getTimeStamp } from './utils.js'

export const SCALE = 0.20
export default class Trex {
  /**
   * T-rex game character.
   * @param {HTMLCanvas} canvas
   * @param {Object} spritePos Positioning within image sprite.
   * @constructor
   */
  constructor(canvas, spritePos) {
    this.canvas = canvas
    this.canvasCtx = canvas.getContext('2d')
    this.spritePos = spritePos
    this.xPos = 0
    this.yPos = 0
    // Position when on the ground.
    this.groundYPos = 0
    this.currentFrame = 0
    this.currentAnimFrames = []
    this.blinkDelay = 0
    this.blinkCount = 0
    this.animStartTime = 0
    this.timer = 0
    this.msPerFrame = 1000 / FPS
    this.config = Trex.config
    // Current status.
    this.status = Trex.status.WAITING
    this.visible = false

    this.jumping = false
    // this.ducking = false
    this.jumpVelocity = 0
    this.reachedMinHeight = false
    this.speedDrop = false
    this.jumpCount = 0
    this.jumpspotX = 0

    this.collisionBoxes = {
      // DUCKING: [new CollisionBox(1, 18, 55, 25)],
      RUNNING: [
        new CollisionBox(42, 9, 5, 16),
        new CollisionBox(25, 20, 40, 10),
        new CollisionBox(30, 30, 30, 6),
        new CollisionBox(17, 15, 6, 20),
      ],
    }

    this.init()
  }

  /**
   * T-rex player initaliser.
   * Sets the t-rex to blink at random intervals.
   */
  init() {
    this.groundYPos =
      defaultDimensions.HEIGHT - (this.config.HEIGHT * SCALE) - config.BOTTOM_PAD
    this.yPos = this.groundYPos
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT

    this.draw(0, 0)
    this.update(0, Trex.status.WAITING)
  }

  /**
   * Setter for the jump velocity.
   * The approriate drop velocity is also set.
   */
  setJumpVelocity(setting) {
    this.config.INIITAL_JUMP_VELOCITY = -setting
    this.config.DROP_VELOCITY = -setting / 2
  }

  /**
   * Set the animation status.
   * @param {!number} deltaTime
   * @param {Trex.status} status Optional status to switch to.
   */
  update(deltaTime, opt_status) {
    this.timer += deltaTime

    // Update the status.
    if (opt_status) {
      this.status = opt_status
      this.currentFrame = 0
      this.msPerFrame = Trex.animFrames[opt_status].msPerFrame
      this.currentAnimFrames = Trex.animFrames[opt_status].frames

      if (opt_status == Trex.status.WAITING) {
        this.animStartTime = getTimeStamp()
        this.setBlinkDelay()
      }
    }

    // Game intro animation, T-rex moves in from the left.
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
      this.xPos += Math.round(
        (this.config.START_X_POS / this.config.INTRO_DURATION) * deltaTime,
      )
    }

    if (this.status == Trex.status.WAITING) {
      this.blink(getTimeStamp())
    } else {
      this.draw(this.currentAnimFrames[this.currentFrame], 0)
    }

    // Update the frame position.
    if (this.timer >= this.msPerFrame) {
      this.currentFrame =
        this.currentFrame == this.currentAnimFrames.length - 1
          ? 0
          : this.currentFrame + 1
      this.timer = 0
    }

    // Speed drop becomes duck if the down key is still being pressed.
    if (this.speedDrop && this.yPos == this.groundYPos) {
      this.speedDrop = false
      // this.setDuck(true)
    }
  }

  /**
   * Draw the t-rex to a particular position.
   * @param {number} x
   * @param {number} y
   */
draw(x, y) {
  if (!this.visible) return

  let sourceX = x
  let sourceY = y
  let sourceWidth =
    this.ducking && this.status !== Trex.status.CRASHED
      ? this.config.WIDTH_DUCK
      : this.config.WIDTH
  let sourceHeight = this.config.HEIGHT

  if (IS_HIDPI) {
    sourceX *= 2
    sourceY *= 2
    sourceWidth *= 2
    sourceHeight *= 2
  }

  sourceX += this.spritePos.x
  sourceY += this.spritePos.y

  const ctx = this.canvasCtx
  const destWidth = this.config.WIDTH * SCALE
  const destHeight = this.config.HEIGHT * SCALE

  // Rotation setup
  const hasRotation = this.rotation && this.rotation !== 0
  if (hasRotation) {
    const centerX = this.xPos + destWidth / 2
    const centerY = this.yPos + destHeight / 2

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((this.rotation * Math.PI) / 180)
    ctx.translate(-centerX, -centerY)
  }

  if (this.status === Trex.status.CRASHED) {
    ctx.drawImage(
      assets.deadSharkSprite,
      this.currentAnimFrames[this.currentFrame] + this.spritePos.x,
      this.spritePos.y,
      sourceWidth,
      sourceHeight,
      this.xPos,
      this.yPos,
      destWidth,
      destHeight
    )
  } else {
    ctx.drawImage(
      assets.sharkSprite,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      this.xPos,
      this.yPos,
      destWidth,
      destHeight
    )
  }

  if (hasRotation) {
    ctx.restore()
  }

  drawHitboxes(ctx, this.collisionBoxes.RUNNING, this.xPos, this.yPos)
}


  /**
   * Sets a random time for the blink to happen.
   */
  setBlinkDelay() {
    this.blinkDelay = Math.ceil(Math.random() * Trex.BLINK_TIMING)
  }

  /**
   * Make t-rex blink at random intervals.
   * @param {number} time Current time in milliseconds.
   */
  blink(time) {
    var deltaTime = time - this.animStartTime

    if (deltaTime >= this.blinkDelay) {
      this.draw(this.currentAnimFrames[this.currentFrame], 0)

      if (this.currentFrame == 1) {
        // Set new random delay to blink.
        this.setBlinkDelay()
        this.animStartTime = time
        this.blinkCount++
      }
    }
  }

  /**
   * Initialise a jump.
   * @param {number} speed
   */
  startJump(speed) {
    if (!this.jumping) {
      this.update(0, Trex.status.JUMPING)
      // Tweak the jump velocity based on the speed.
      this.jumpVelocity = this.config.INIITAL_JUMP_VELOCITY - speed / 10
      this.jumping = true
      this.reachedMinHeight = false
      this.speedDrop = false
    }
  }

  /**
   * Jump is complete, falling down.
   */
  endJump() {
    if (
      this.reachedMinHeight &&
      this.jumpVelocity < this.config.DROP_VELOCITY
    ) {
      this.jumpVelocity = this.config.DROP_VELOCITY
    }
  }

  /**
   * Update frame for a jump.
   * @param {number} deltaTime
   * @param {number} speed
   */
  updateJump(deltaTime, speed) {
    var msPerFrame = Trex.animFrames[this.status].msPerFrame
    var framesElapsed = deltaTime / msPerFrame

    // Speed drop makes Trex fall faster.
    if (this.speedDrop) {
      this.yPos += Math.round(
        this.jumpVelocity * this.config.SPEED_DROP_COEFFICIENT * framesElapsed,
      )
    } else {
      this.yPos += Math.round(this.jumpVelocity * framesElapsed)
    }

    this.jumpVelocity += this.config.GRAVITY * framesElapsed

    // Minimum height has been reached.
    if (this.yPos < this.minJumpHeight || this.speedDrop) {
      this.reachedMinHeight = true
    }

    // Reached max height
    if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
      this.endJump()
    }

    // Back down at ground level. Jump completed.
    if (this.yPos > this.groundYPos) {
      this.reset()
      this.jumpCount++
    }

    this.update(deltaTime)
  }

  /**
   * Set the speed drop. Immediately cancels the current jump.
   */
  setSpeedDrop() {
    this.speedDrop = true
    this.jumpVelocity = 1
  }

  // /**
  //  * @param {boolean} isDucking.
  //  */
  // setDuck(isDucking) {
  //   if (isDucking && this.status != Trex.status.DUCKING) {
  //     this.update(0, Trex.status.DUCKING)
  //     this.ducking = true
  //   } else if (this.status == Trex.status.DUCKING) {
  //     this.update(0, Trex.status.RUNNING)
  //     this.ducking = false
  //   }
  // }

  /**
   * Reset the t-rex to running at start of game.
   */
  reset() {
    this.yPos = this.groundYPos
    this.jumpVelocity = 0
    this.jumping = false
    // this.ducking = false
    this.update(0, Trex.status.RUNNING)
    this.midair = false
    this.speedDrop = false
    this.jumpCount = 0

    this.rotation = 0
  }

  /**
   * Get collistion boxes by ducking
   * @returns boxes
   */
  getCollistionBoxes() {
    // const boxesDict = this.collisionBoxes
    // return this.ducking ? boxesDict.DUCKING : boxesDict.RUNNING
    return this.collisionBoxes.RUNNING
  }
  // end of Trex
}

/**
 * T-rex player config.
 * @enum {number}
 */
Trex.config = {
  DROP_VELOCITY: -5,
  GRAVITY: 0.6,
  HEIGHT: 250,
  HEIGHT_DUCK: 25,
  INIITAL_JUMP_VELOCITY: -10,
  INTRO_DURATION: 1500,
  MAX_JUMP_HEIGHT: 30,
  MIN_JUMP_HEIGHT: 30,
  SPEED_DROP_COEFFICIENT: 3,
  SPRITE_WIDTH: 262,
  START_X_POS: 50,
  WIDTH: 400,
  WIDTH_DUCK: 59,
}

/**
 * Used in collision detection.
 * @type {Array<CollisionBox>}
 */

/**
 * Animation states.
 * @enum {string}
 */
Trex.status = {
  CRASHED: 'CRASHED',
  // DUCKING: 'DUCKING',
  JUMPING: 'JUMPING',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING',
  INTRO_JUMP: 'INTRO_JUMP',
  WIN_JUMP: "WIN_JUMP",
  IN_LAEK: "IN_LAKE",
}

/**
 * Blinking coefficient.
 * @const
 */
Trex.BLINK_TIMING = 7000

/**
 * Animation config for different states.
 * @enum {Object}
 */
Trex.animFrames = {
  WAITING: {
    frames: [44, 0],
    msPerFrame: 1000 / 3,
  },
  RUNNING: {
    frames: [0, 400, 800],
    msPerFrame: 1000 / 12,
  },
  CRASHED: {
    frames: [0, 400, 800],
    msPerFrame: 1000 / 60,
  },
  JUMPING: {
    frames: [0],
    msPerFrame: 1000 / 60,
  },
  // DUCKING: {
  //   frames: [264, 323],
  //   msPerFrame: 1000 / 8,
  // },
}
