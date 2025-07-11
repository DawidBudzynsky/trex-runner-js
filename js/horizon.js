import Cloud from './cloud.js'
import HorizonLine from './horizontal-line.js'
import NightMode from './night-mode.js'
import { drawImageScaled, getRandomNum } from './utils.js'
import Obstacle from './obstacle.js'
import { config, assets, spriteDefFolder } from './constants.js'
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from './config.js'
import Coin from './coin.js'
import { spriteDefinition } from './constants.js'

export default class Horizon {
  /**
   * Horizon background class.
   * @param {HTMLCanvasElement} canvas
   * @param {Object} spritePos Sprite positioning.
   * @param {Object} dimensions Canvas dimensions.
   * @param {number} gapCoefficient
   * @constructor
   */
  constructor(canvas, spritePos, dimensions, gapCoefficient) {
    this.canvas = canvas
    this.canvasCtx = this.canvas.getContext('2d')
    this.config = Horizon.config
    this.dimensions = dimensions
    this.gapCoefficient = gapCoefficient
    this.obstacles = []
    this.obstacleHistory = []
    this.horizonOffsets = [0, 0]
    this.cloudFrequency = this.config.CLOUD_FREQUENCY
    this.coinFrequency = this.config.COIN_FREQUENCY
    this.spritePos = spritePos
    this.nightMode = null

    // Cloud
    this.clouds = []
    this.cloudSpeed = this.config.BG_CLOUD_SPEED

    // Horizon
    this.horizonLine = null
    this.init()

    // Coins
    this.coins = []
  }

  /**
   * Initialise the horizon. Just add the line and a cloud. No obstacles.
   * Also fill the background with a blue sky color.
   */
  init() {

    this.addCloud()
    this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON)
    this.nightMode = new NightMode(
      this.canvas,
      this.spritePos.MOON,
      this.dimensions.WIDTH,
    )
  }

addCoin(currentSpeed) {
  const coinSpritePos = spriteDefFolder.HDPI.COIN
  this.coins.push(
    new Coin(
      this.canvasCtx,
      coinSpritePos,
      this.dimensions,
      currentSpeed
    )
  )
}

  /**
   * @param {number} deltaTime
   * @param {number} currentSpeed
   * @param {boolean} updateObstacles Used as an override to prevent
   *     the obstacles from being updated / added. This happens in the
   *     ease in section.
   * @param {boolean} showNightMode Night mode activated.
   */

  update(deltaTime, currentSpeed, updateObstacles, showNightMode) {
    const offSet = 2
    // Make the background taller so the sun appears lower
    const backgroundHeight = this.dimensions.HEIGHT - this.config.HORIZON_HEIGHT 
    const horizonY = this.dimensions.HEIGHT - this.config.HORIZON_HEIGHT

    // // Draw the background first (bottom layer)
    // drawImageScaled(
    //   this.canvasCtx,
    //   assets.background,
    //   0, 0,
    //   this.dimensions.WIDTH,
    //   backgroundHeight
    // )

    // // Draw horizon.png on top of the background, just above the grass
    // drawImageScaled(
    //   this.canvasCtx,
    //   assets.horizon,
    //   0, horizonY,
    //   this.dimensions.WIDTH,
    //   this.config.HORIZON_HEIGHT + offSet
    // )

    this.runningTime += deltaTime

    this.horizonLine.update(deltaTime, currentSpeed)

    this.nightMode.update(showNightMode)

    this.updateClouds(deltaTime, currentSpeed)

    if (updateObstacles) {
      this.updateObstacles(deltaTime, currentSpeed)
    }

    this.updateCoins(deltaTime, currentSpeed)
}

  /**
   * Update the cloud positions.
   * @param {number} deltaTime
   * @param {number} currentSpeed
   */
  updateClouds(deltaTime, speed) {
    var cloudSpeed = (this.cloudSpeed / 1000) * deltaTime * speed
    var numClouds = this.clouds.length

    if (numClouds) {
      for (var i = numClouds - 1; i >= 0; i--) {
        this.clouds[i].update(cloudSpeed)
      }

      var lastCloud = this.clouds[numClouds - 1]

      // Check for adding a new cloud.
      if (
        numClouds < this.config.MAX_CLOUDS &&
        this.dimensions.WIDTH - lastCloud.xPos > lastCloud.cloudGap &&
        this.cloudFrequency > Math.random()
      ) {
        this.addCloud()
      }

      // Remove expired clouds.
      this.clouds = this.clouds.filter(function (obj) {
        return !obj.remove
      })
    } else {
      this.addCloud()
    }
  }

  /**
   * Update the obstacle positions.
   * @param {number} deltaTime
   * @param {number} currentSpeed
   */
  updateObstacles(deltaTime, currentSpeed) {
    // Obstacles, move to Horizon layer.
    var updatedObstacles = this.obstacles.slice(0)

    for (var i = 0; i < this.obstacles.length; i++) {
      var obstacle = this.obstacles[i]
      obstacle.update(deltaTime, currentSpeed)

      // Clean up existing obstacles.
      if (obstacle.remove) {
        updatedObstacles.shift()
      }
    }
    this.obstacles = updatedObstacles

    if (this.obstacles.length > 0) {
      var lastObstacle = this.obstacles[this.obstacles.length - 1]

      if (
        lastObstacle &&
        !lastObstacle.followingObstacleCreated &&
        lastObstacle.isVisible() &&
        lastObstacle.xPos + lastObstacle.width + lastObstacle.gap <
          this.dimensions.WIDTH
      ) {
        this.addNewObstacle(currentSpeed)
        lastObstacle.followingObstacleCreated = true
      }
    } else {
      // Create new obstacles.
      this.addNewObstacle(currentSpeed)
    }
  }

  removeFirstObstacle() {
    this.obstacles.shift()
  }

  /**
   * Add a new obstacle.
   * @param {number} currentSpeed
   */
  addNewObstacle(currentSpeed) {
    var obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1)
    var obstacleType = Obstacle.types[obstacleTypeIndex]

    // !!!!!!!!!!!!!!!!!!!!!! NOTE: not making duplicates rn!!!!!!!!!!!!!!!!!!!!
    // Check for multiples of the same type of obstacle.
    // Also check obstacle is available at current speed.
    // if (
    //   this.duplicateObstacleCheck(obstacleType.type) ||
    //   currentSpeed < obstacleType.minSpeed
    // ) {
    //   this.addNewObstacle(currentSpeed)
    // } else {
    // var obstacleSpritePos = this.spritePos[obstacleType.type]

    this.obstacles.push(
      new Obstacle(
        this.canvasCtx,
        obstacleType,
        this.dimensions,
        this.gapCoefficient,
        currentSpeed,
        obstacleType.width,
      ),
    )

    this.obstacleHistory.unshift(obstacleType.type)

    if (this.obstacleHistory.length > 1) {
      this.obstacleHistory.splice(config.MAX_OBSTACLE_DUPLICATION)
    }
    // }
  }

  /**
   * Returns whether the previous two obstacles are the same as the next one.
   * Maximum duplication is set in config value MAX_OBSTACLE_DUPLICATION.
   * @return {boolean}
   */
  duplicateObstacleCheck(nextObstacleType) {
    var duplicateCount = 0

    for (var i = 0; i < this.obstacleHistory.length; i++) {
      duplicateCount =
        this.obstacleHistory[i] == nextObstacleType ? duplicateCount + 1 : 0
    }
    return duplicateCount >= config.MAX_OBSTACLE_DUPLICATION
  }

  /**
   * Reset the horizon layer.
   * Remove existing obstacles and reposition the horizon line.
   */
  reset() {
    this.obstacles = []
    this.coins = []
    this.horizonLine.reset()
    this.nightMode.reset()
  }

  /**
   * Update the canvas width and scaling.
   * @param {number} width Canvas width.
   * @param {number} height Canvas height.
   */
  resize(width, height) {
    this.canvas.width = width
    this.canvas.height = height
  }

  /**
   * Add a new cloud to the horizon.
   */
  addCloud() {
    this.clouds.push(
      new Cloud(this.canvas, this.spritePos.CLOUD, this.dimensions.WIDTH),
    )
  }

  updateCoins(deltaTime, speed) {
    var updatedCoins = this.coins.slice(0)
    var numCoins = this.coins.length

    if (numCoins) {
      for (var i = numCoins - 1; i >=0; i--) {
        var coin = this.coins[i]
        coin.update(deltaTime, speed)

        if (coin.remove) {
          updatedCoins.shift()
        }
      }

      this.coins = updatedCoins
      
      var lastCoin = this.coins[numCoins - 1]

      if (
        numCoins < this.config.MAX_COINS &&
        lastCoin &&
        this.dimensions.WIDTH - lastCoin.xPos > lastCoin.coinGap &&
        this.coinFrequency > Math.random()
      ) {
        this.addCoin()
      }

    this.coins = this.coins.filter(c => !c.remove && !c.collected)
    } else {
      this.addCoin()
    }
  }    

  showLakeP() {
    this.horizonLine.startLakePReveal()
  }
}

/**
 * Horizon config.
 * @enum {number}
 */
Horizon.config = {
  BG_CLOUD_SPEED: 0.2,
  BUMPY_THRESHOLD: 0.3,
  CLOUD_FREQUENCY: 0.5,
  COIN_FREQUENCY: 0.7,
  HORIZON_HEIGHT: 50,
  MAX_CLOUDS: 6,
  MAX_COINS: 2,
}
