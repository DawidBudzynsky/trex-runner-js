import {
  assets,
  config,
  classes,
  defaultDimensions,
  events,
  keycodes,
  sounds,
  spriteDefinition,
  loadTimeData,
  spriteDefFolder
} from './constants.js'

import { FPS, IS_HIDPI, IS_IOS, IS_MOBILE, DEFAULT_WIDTH } from './config.js'

import {
  updateCanvasScaling,
  decodeBase64ToArrayBuffer,
  createCanvas,
  getTimeStamp,
  checkForCollision,
  vibrate,
} from './utils.js'

import DistanceMeter from './distance-meter.js'
import Horizon from './horizon.js'
import GameOverPanel from './game-panel.js'
import Trex from './trex.js'
import CoinCounter from './coin-counter.js'

export default class Runner {
  /**
   * constructor
   *
   * @param {*} outerContainerId
   * @param {*} opt_config
   */
  constructor(outerContainerId, opt_config) {
    // Singleton
    if (Runner._instance) {
      throw new Error("Singleton classes can't be instantiated more than once.")
    }
    Runner._instance = this

    this.animations = {
      waitForLakeReveal: false,
      moveTrexToRight: false,
      trexEndJump: null, 
      trexWinJump: null, 
    }

    this.outerContainerEl = document.querySelector(outerContainerId)
    this.furiaworldBanner = document.getElementById('furiaworld-banner')
    this.containerEl = null
    this.snackbarEl = null
    this.detailsButton = this.outerContainerEl.querySelector('#details-button')

    this.config = opt_config || config

    this.dimensions = defaultDimensions

    this.canvas = null

    this.gameWonPanel = null

    this.canvasCtx = null

    this.tRex = null
    this.disableControls = false

    this.distanceMeter = null
    this.distanceRan = 0
    this.highestScore = 0

    this.coinCounter = null
    this.coinCount = 0
    this.coinsHighScore = 0


    this.time = 0
    this.runningTime = 0
    this.msPerFrame = 1000 / FPS
    this.currentSpeed = this.config.SPEED

    this.obstacles = []

    this.activated = false // Whether the easter egg has been activated.
    this.playing = false // Whether the game is currently in play state.
    this.crashed = false

    this.won = false
    this.stopSpawningObstacles = false

    this.paused = false
    this.inverted = false
    this.invertTimer = 0
    this.resizeTimerId_ = null

    this.playCount = 0

    this.secretBuffer = ''
    this.secretCode = 'motherlode'

    // Sound FX.
    this.audioBuffer = null
    this.soundFx = {}

    // Global web audio context for playing sounds.
    this.audioContext = null

    // Images.
    this.images = {}
    this.imagesLoaded = 0

    if (this.isDisabled()) {
      this.setupDisabledRunner()
    } else {
      this.loadImages()
    }
  } // end of constructor

  // ========== static properties ==============
  static staticProperty = 'someValue'
  static staticMethod() {
    return 'static method has been called.'
  }
  static {
    console.log('Class static initialization block called')
  }

  static imageSprite = null

  // =========== member functions ==================

  /**
   * Whether the easter egg has been disabled. CrOS enterprise enrolled devices.
   * @return {boolean}
   */
  isDisabled() {
    // return loadTimeData && loadTimeData.valueExists('disabledEasterEgg');
    return false
  }

  /**
   * For disabled instances, set up a snackbar with the disabled message.
   */
  setupDisabledRunner() {
    this.containerEl = document.createElement('div')
    this.containerEl.className = classes.SNACKBAR
    this.containerEl.textContent = loadTimeData.getValue('disabledEasterEgg')
    this.outerContainerEl.appendChild(this.containerEl)

    // Show notification when the activation key is pressed.
    document.addEventListener(
      events.KEYDOWN,
      function (e) {
        if (keycodes.JUMP[e.keyCode]) {
          this.containerEl.classList.add(classes.SNACKBAR_SHOW)
          document.querySelector('.icon').classList.add('icon-disabled')
        }
      }.bind(this),
    )
  }

  /**
   * Setting individual settings for debugging.
   * @param {string} setting
   * @param {*} value
   */
  updateConfigSetting(setting, value) {
    if (setting in this.config && value != undefined) {
      this.config[setting] = value

      switch (setting) {
        case 'GRAVITY':
        case 'MIN_JUMP_HEIGHT':
        case 'SPEED_DROP_COEFFICIENT':
          this.tRex.config[setting] = value
          break
        case 'INITIAL_JUMP_VELOCITY':
          this.tRex.setJumpVelocity(value)
          break
        case 'SPEED':
          this.setSpeed(value)
          break
      }
    }
  }

  /**
   *
   * Cache the appropriate image sprite from the page and get the sprite sheet
   * definition.
   */
  loadImages() {
    if (IS_HIDPI) {
      assets.imageSprite = document.getElementById('offline-resources-2x')
      assets.additionalImageSprite = document.getElementById('texture')

      assets.lakeImageSprite = document.getElementById('lake-texture')
      assets.lakeP = document.getElementById('lake-p-texture')
      assets.grass = document.getElementById('grass')
      assets.background = document.getElementById('background')
      assets.horizon = document.getElementById('horizon')

      // sprites for each
      assets.deadSharkSprite = document.getElementById('deadSharkSprite')
      assets.birdSprite = document.getElementById('birdSprite')
      assets.coinSprite = document.getElementById('coinSprite')
      assets.sharkSprite = document.getElementById('sharkSprite')
      assets.carSprite = document.getElementById('carSprite')

      this.spriteDef = spriteDefinition.HDPI
    } else {
      assets.imageSprite = document.getElementById('offline-resources-1x')
      this.spriteDef = spriteDefinition.LDPI
    }

    if (assets.imageSprite.complete &&
        assets.additionalImageSprite.complete &&
        assets.lakeImageSprite.complete &&
        assets.lakeP.complete &&
        assets.deadSharkSprite.complete &&
        assets.birdSprite.complete &&
        assets.coinSprite.complete &&
        assets.sharkSprite.complete &&
        assets.background.complete &&
        assets.grass.complete &&
        assets.horizon.complete &&
        assets.carSprite.complete
      ) {

      this.init()
    } else {
      // If the images are not yet loaded, add a listener.
      assets.imageSprite.addEventListener(events.LOAD, this.init.bind(this))
      assets.additionalImageSprite.addEventListener(events.LOAD, this.init.bind(this))
    }
  }

  /**
   * Load and decode base 64 encoded sounds.
   */
  loadSounds() {
    if (!IS_IOS) {
      this.audioContext = new AudioContext()

      var resourceTemplate = document.getElementById(
        this.config.RESOURCE_TEMPLATE_ID,
      ).content

      for (var sound in sounds) {
        var soundSrc = resourceTemplate.getElementById(sounds[sound]).src
        soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1)
        var buffer = decodeBase64ToArrayBuffer(soundSrc)

        // Async, so no guarantee of order in array.
        this.audioContext.decodeAudioData(
          buffer,
          function (index, audioData) {
            this.soundFx[index] = audioData
          }.bind(this, sound),
        )
      }
    }
  }

  /**
   * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
   * @param {number} opt_speed
   */
  setSpeed(opt_speed) {
    var speed = opt_speed || this.currentSpeed

    // Reduce the speed on smaller mobile screens.
    if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
      var mobileSpeed =
        ((speed * this.dimensions.WIDTH) / DEFAULT_WIDTH) *
        this.config.MOBILE_SPEED_COEFFICIENT
      this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed
    } else if (opt_speed) {
      this.currentSpeed = opt_speed
    }
  }

  /**
   * Game initialiser.
   */
  init() {
    // Hide the static icon.
    document.querySelector('.' + classes.ICON).style.visibility = 'hidden'

    this.adjustDimensions()
    this.setSpeed()

    this.containerEl = document.createElement('div')
    this.containerEl.className = classes.CONTAINER

    // Player canvas container.
    this.canvas = createCanvas(
      this.containerEl,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
      classes.PLAYER,
    )

    this.canvasCtx = this.canvas.getContext('2d')
    this.canvasCtx.fillStyle = '#f7f7f7'
    this.canvasCtx.fill()
    updateCanvasScaling(this.canvas)

    // Horizon contains clouds, obstacles and the ground.
    this.horizon = new Horizon(
      this.canvas,
      this.spriteDef,
      this.dimensions,
      this.config.GAP_COEFFICIENT,
    )

    // Distance meter
    this.distanceMeter = new DistanceMeter(
      this.canvas,
      this.spriteDef.TEXT_SPRITE,
      this.dimensions.WIDTH,
    )

    // Coin counter
    this.coinCounter = new CoinCounter(
      this.canvas,
      this.coinCount,
      this.spriteDef.TEXT_SPRITE,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
    )
    console.log(this.coinCounter)

    // Draw t-rex
    this.tRex = new Trex(this.canvas, spriteDefFolder.HDPI.SHARK)
    // this.tRex.introJumpAnimation(
    //   () => {
    //     // Per frame: clear + redraw entire frame
    //     this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    //     this.horizon.update(0, 0, true)  // <-- redraw background
    //     // this.horizon.draw()
    //     this.tRex.draw(0, 0)
    //   },
    //   () => {
    //     // Optional: start game loop or show UI
    //     console.log("Intro jump complete")
    //   }
    // )

    this.outerContainerEl.appendChild(this.containerEl)

    if (IS_MOBILE) {
      this.createTouchController()
    }

    this.startListening()
    this.update()

    window.addEventListener(events.RESIZE, this.debounceResize.bind(this))
  }

  /**
   * Create the touch controller. A div that covers whole screen.
   */
  createTouchController() {
    this.touchController = document.createElement('div')
    this.touchController.className = classes.TOUCH_CONTROLLER
    this.outerContainerEl.appendChild(this.touchController)
  }

  /**
   * Debounce the resize event.
   */
  debounceResize() {
    if (!this.resizeTimerId_) {
      this.resizeTimerId_ = setInterval(this.adjustDimensions.bind(this), 250)
    }
  }

  /**
   * Adjust game space dimensions on resize.
   */
  adjustDimensions() {
    clearInterval(this.resizeTimerId_)
    this.resizeTimerId_ = null

    var boxStyles = window.getComputedStyle(this.outerContainerEl)
    var padding = Number(
      boxStyles.paddingLeft.substr(0, boxStyles.paddingLeft.length - 2),
    )

    this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2
    this.dimensions.WIDTH = Math.min(DEFAULT_WIDTH, this.dimensions.WIDTH) //Arcade Mode
    if (this.activated) {
      this.setArcadeModeContainerScale()
    }

    // Redraw the elements back onto the canvas.
    if (this.canvas) {
      this.canvas.width = this.dimensions.WIDTH
      this.canvas.height = this.dimensions.HEIGHT

      updateCanvasScaling(this.canvas)

      this.distanceMeter.calcXPos(this.dimensions.WIDTH)
      this.coinCounter.calcXPos(this.dimensions.WIDTH)

      this.clearCanvas()
      this.horizon.update(0, 0, true)
      this.tRex.update(0)

      // Outer container and distance meter.
      if (this.playing || this.crashed || this.paused) {
        this.containerEl.style.width = this.dimensions.WIDTH + 'px'
        this.containerEl.style.height = this.dimensions.HEIGHT + 'px'
        this.distanceMeter.update(0, Math.ceil(this.distanceRan))
        this.coinCounter.update(0, this.coinCount)
        this.stop()
      } else {
        this.tRex.draw(0, 0)
      }

      // Game over panel.
      if (this.crashed && this.gameOverPanel) {
        this.gameOverPanel.updateDimensions(this.dimensions.WIDTH)
        this.gameOverPanel.draw()
      }
    }
  }

  /**
   * Play the game intro.
   * Canvas container width expands out to the full width.
   */
  playIntro() {
    if (!this.activated && !this.crashed) {
      this.playingIntro = true
      this.tRex.playingIntro = true

      // CSS animation definition.
      var keyframes =
        '@-webkit-keyframes intro { ' +
        'from { width:' +
        Trex.config.WIDTH +
        'px }' +
        'to { width: ' +
        this.dimensions.WIDTH +
        'px }' +
        '}'

      // create a style sheet to put the keyframe rule in
      // and then place the style sheet in the html head
      var sheet = document.createElement('style')
      sheet.innerHTML = keyframes
      document.head.appendChild(sheet)


      this.disableControls = true,
      this.startTrexEndJumpAnimation(() => {
        console.log("End animation finished")
      })

      this.containerEl.addEventListener(
        events.ANIM_END,
        this.startGame.bind(this)
      )

      this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both'
      this.containerEl.style.width = this.dimensions.WIDTH + 'px'

    if (this.furiaworldBanner) {
      // Reset to initial state
      this.furiaworldBanner.style.transform = 'translateY(-30px)' // Start slightly above
      this.furiaworldBanner.style.transition = 'all 2.5s ease'

      setTimeout(() => {
        this.furiaworldBanner.style.width = this.dimensions.WIDTH + 'px'
        this.furiaworldBanner.style.transform = 'translateY(0)' // Slide down to normal position
      }, 100)
    }

      this.playing = true
      this.activated = true
    } else if (this.crashed) {
      this.restart()
    }
  }

  /**
   * Update the game status to started.
   */
  startGame() {
    this.disableControls = false
    this.setArcadeMode()
    this.runningTime = 0
    this.playingIntro = false
    this.tRex.playingIntro = false
    this.containerEl.style.webkitAnimation = ''
    if (this.furiaworldBanner) {
      this.furiaworldBanner.style.webkitAnimation = ''
      this.furiaworldBanner.style.opacity = '1'
    }
    this.playCount++
    // Handle tabbing off the page. Pause the current game.
    document.addEventListener(
      events.VISIBILITY,
      this.onVisibilityChange.bind(this),
    )

    window.addEventListener(events.BLUR, this.onVisibilityChange.bind(this))

    window.addEventListener(events.FOCUS, this.onVisibilityChange.bind(this))
  }

  clearCanvas() {
    this.canvasCtx.clearRect(
      0,
      0,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
    )
  }

  /**
   * Update the game frame and schedules the next one.
   */
  update() {
    this.updatePending = false
    console.log('Active animation frames:', this.rafCount)

    var now = getTimeStamp()
    var deltaTime = now - (this.time || now)
    this.time = now

    if (this.playing) {
      this.clearCanvas()

      if (this.tRex.jumping) {
        this.tRex.updateJump(deltaTime)
      }

      this.runningTime += deltaTime
      var hasObstacles = this.runningTime > this.config.CLEAR_TIME

      if (this.stopSpawningObstacles) {
        hasObstacles = false
      }

      // First jump triggers the intro.
      if (this.tRex.jumpCount == 1 && !this.playingIntro) {
        this.playIntro()
      }

      // The horizon doesn't move until the intro is over.
      if (this.playingIntro) {
        this.horizon.update(0, this.currentSpeed, hasObstacles)
      } else {
        deltaTime = !this.activated ? 0 : deltaTime
        this.horizon.update(
          deltaTime,
          this.currentSpeed,
          hasObstacles,
          this.inverted,
        )
      }


      if (hasObstacles && this.horizon.obstacles.length > 0) {
        for (let i = 0; i < this.horizon.obstacles.length; i++) {
          const obs = this.horizon.obstacles[i]
          if (checkForCollision(obs, this.tRex)) {
              collision = true
              break
          }
        }
      }

      // --- COIN COLLISION LOGIC ---
      if (this.horizon.coins && this.horizon.coins.length > 0) {
        for (let i = 0; i < this.horizon.coins.length; i++) {
          const coin = this.horizon.coins[i]
          if (!coin.collected && checkForCollision(coin, this.tRex)) {
            coin.collected = true
            coin.remove = true
            this.coinCount = (this.coinCount || 0) + 1
            console.log(this.coinCount)
          }
        }
      }

      this.updateAnimations()

      // Check for collisions.
      var collision =
        hasObstacles && checkForCollision(this.horizon.obstacles[0], this.tRex)

      if (!collision) {
        this.distanceRan += (this.currentSpeed * deltaTime) / this.msPerFrame

        if (this.currentSpeed < this.config.MAX_SPEED) {
          this.currentSpeed += this.config.ACCELERATION
        }
      } else {
        this.gameOver()
      }

      if (this.coinCount >= 2 && !this.won) {
        console.log("you won!")
        this.startCalmDownSequence()
      }

      var playAchievementSound = this.distanceMeter.update(
        deltaTime,
        Math.ceil(this.distanceRan),
      )
      this.coinCounter.update(deltaTime, this.coinCount)

      if (playAchievementSound) {
        this.playSound(this.soundFx.SCORE)
      }

      // Night mode.
      if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
        this.invertTimer = 0
        this.invertTrigger = false
        this.invert()
      } else if (this.invertTimer) {
        this.invertTimer += deltaTime
      } else {
        var actualDistance = this.distanceMeter.getActualDistance(
          Math.ceil(this.distanceRan),
        )

        if (actualDistance > 0) {
          this.invertTrigger = !(actualDistance % this.config.INVERT_DISTANCE)

          if (this.invertTrigger && this.invertTimer === 0) {
            this.invertTimer += deltaTime
            this.invert()
          }
        }
      }
    }

    if (
      this.playing ||
      (!this.activated && this.tRex.blinkCount < config.MAX_BLINK_COUNT)
    ) {
      this.tRex.update(deltaTime)
      this.scheduleNextUpdate()
    }
  }

  updateAnimations() {
    if (this.animations.waitForLakeReveal) {
      if (!this.horizon.horizonLine.lakePFullyVisible) {
        // still waiting, do nothing
      } else {
        this.animations.waitForLakeReveal = false
        this.freezeHorizon()
      }
    }

    // moveTrexToRight
    if (this.animations.moveTrexToRight) {
      const targetX = this.dimensions.WIDTH - 300
      if (this.tRex.xPos < targetX) {
        this.tRex.xPos += 2
      } else {
        this.tRex.xPos = targetX
        this.animations.moveTrexToRight = false
        this.onTrexAtLake()
      }
    }

    // trexEndJump animation
    if (this.animations.trexEndJump) {
      const anim = this.animations.trexEndJump
      if (anim.currentFrame <= anim.totalFrames) {
        const progress = anim.currentFrame / anim.totalFrames
        this.tRex.xPos = anim.startX + (anim.endX - anim.startX) * progress
        const jumpHeight = 150 * Math.sin(Math.PI * progress)
        this.tRex.yPos = anim.startY - jumpHeight

        if (progress < 0.3) {
          this.tRex.rotation = anim.position
        } else {
          const rotationProgress = (progress - 0.3) * 2
          this.tRex.rotation = anim.position * (1 - rotationProgress)
        }

        anim.currentFrame++
      } else {
        this.tRex.yPos = anim.groundY
        this.tRex.rotation = 0
        this.tRex.status = Trex.status.RUNNING
        this.disableControls = false
        if (anim.callback) anim.callback()
        this.animations.trexEndJump = null
      }
    }

    // trexWinJump animation
    if (this.animations.trexWinJump) {
      const anim = this.animations.trexWinJump
      const progress = anim.currentFrame / anim.totalFrames
      const arcProgress = Math.sin(Math.PI * progress)

      this.tRex.xPos = anim.startX + (anim.endX - anim.startX) * progress
      this.tRex.yPos = anim.startY - anim.peakHeight * arcProgress

      if (progress < 0.5) {
        this.tRex.rotation = 0
      } else {
        const rotationProgress = (progress - 0.5) * 2
        this.tRex.rotation = 90 * rotationProgress
      }

      anim.currentFrame++

      if (anim.currentFrame > anim.totalFrames) {
        this.tRex.rotation = 90
        this.tRex.status = Trex.status.IN_LAKE
        this.tRex.yPos = anim.startY
        this.tRex.visible = false

        this.animations.trexWinJump = null
        this.gameOver()
      }
    }
  }

  /**
   * Event handler.
   */
  handleEvent(e) {
    return function (evtType, events) {
      switch (evtType) {
        case events.KEYDOWN:
        case events.TOUCHSTART:
        case events.MOUSEDOWN:
          this.onKeyDown(e)
          break
        case events.KEYUP:
        case events.TOUCHEND:
        case events.MOUSEUP:
          this.onKeyUp(e)
          break
      }
    }.bind(this)(e.type, events)
  }

  /**
   * Bind relevant key / mouse / touch listeners.
   */
  startListening() {
    // Keys.
    document.addEventListener(events.KEYDOWN, this)
    document.addEventListener(events.KEYUP, this)
    if (IS_MOBILE) {
      // Mobile only touch devices.
      this.touchController.addEventListener(events.TOUCHSTART, this)
      this.touchController.addEventListener(events.TOUCHEND, this)
      this.containerEl.addEventListener(events.TOUCHSTART, this)
    } else {
      // Mouse.
      document.addEventListener(events.MOUSEDOWN, this)
      document.addEventListener(events.MOUSEUP, this)
    }
  }

  /**
   * Remove all listeners.
   */
  stopListening() {
    document.removeEventListener(events.KEYDOWN, this)
    document.removeEventListener(events.KEYUP, this)

    if (IS_MOBILE) {
      this.touchController.removeEventListener(events.TOUCHSTART, this)
      this.touchController.removeEventListener(events.TOUCHEND, this)
      this.containerEl.removeEventListener(events.TOUCHSTART, this)
    } else {
      document.removeEventListener(events.MOUSEDOWN, this)
      document.removeEventListener(events.MOUSEUP, this)
    }
  }

  /**
   * Process keydown.
   * @param {Event} e
   */
  onKeyDown(e) {
    if (this.disableControls) return

    if (
      this.playing &&
      !this.crashed &&
      e.key &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      this.secretBuffer += e.key.toLowerCase()
      if (this.secretBuffer.length > this.secretCode.length) {
        this.secretBuffer = this.secretBuffer.slice(-this.secretCode.length)
      }
      if (this.secretBuffer === this.secretCode) {
        this.coinCount += 100
        this.coinCounter.update(0, this.coinCount)
        console.log('Secret unlocked! +100 coins')
        this.secretBuffer = ''
      }
    }

    // Prevent native page scrolling whilst tapping on mobile.
    if (IS_MOBILE && this.playing) {
      e.preventDefault()
    }
    if (e.target != this.detailsButton) {
      if (
        !this.crashed &&
        (keycodes.JUMP[e.keyCode] || e.type == events.TOUCHSTART)
      ) {
        if (!this.playing) {
          this.loadSounds()
          this.playing = true
          this.update()
          // if (window.errorPageController) {
          //   errorPageController.trackEasterEgg()
          // }
        }
        //  Play sound effect and jump on starting the game for the first time.
        if (!this.tRex.jumping) {
          this.playSound(this.soundFx.BUTTON_PRESS)
          this.tRex.startJump(this.currentSpeed)
        }
      }

      if (
        this.crashed &&
        e.type == events.TOUCHSTART &&
        e.currentTarget == this.containerEl
      ) {
        this.restart()
      }
    }

    // if (this.playing && !this.crashed && keycodes.DUCK[e.keyCode]) {
    //   e.preventDefault()
    //   if (this.tRex.jumping) {
    //     // Speed drop, activated only when jump key is not pressed.
    //     this.tRex.setSpeedDrop()
    //   } else if (!this.tRex.jumping && !this.tRex.ducking) {
    //     // Duck.
    //     this.tRex.setDuck(true)
    //   }
    // }
  }

  /**
   * Process key up.
   * @param {Event} e
   */
  onKeyUp(e) {
    var keyCode = String(e.keyCode)
    var isjumpKey =
      keycodes.JUMP[keyCode] ||
      e.type == events.TOUCHEND ||
      e.type == events.MOUSEDOWN

    if (this.isRunning() && isjumpKey) {
      this.tRex.endJump()
    } else if (this.crashed) {
      // Check that enough time has elapsed before allowing jump key to restart.
      var deltaTime = getTimeStamp() - this.time

      if (
        keycodes.RESTART[keyCode] ||
        this.isLeftClickOnCanvas(e) ||
        (deltaTime >= this.config.GAMEOVER_CLEAR_TIME && keycodes.JUMP[keyCode])
      ) {
        this.restart()
      }
    } else if (this.paused && isjumpKey) {
      // Reset the jump state
      this.tRex.reset()
      this.play()
    }
  }

  /**
   * Returns whether the event was a left click on canvas.
   * On Windows right click is registered as a click.
   * @param {Event} e
   * @return {boolean}
   */
  isLeftClickOnCanvas(e) {
    return (
      e.button != null &&
      e.button < 2 &&
      e.type == events.MOUSEUP &&
      e.target == this.canvas
    )
  }

  /**
   * RequestAnimationFrame wrapper.
   */
  scheduleNextUpdate() {
    if (!this.updatePending) {
      this.rafCount++
      this.updatePending = true
      this.raqId = requestAnimationFrame(this.update.bind(this))
    }
  }

  /**
   * Whether the game is running.
   * @return {boolean}
   */
  isRunning() {
    return !!this.raqId
  }

  /**
   * Game over state.
   */
  gameOver() {
    this.playSound(this.soundFx.HIT)
    vibrate(200)

    this.stop()
    this.crashed = true
    this.distanceMeter.acheivement = false

    this.tRex.update(100, Trex.status.CRASHED)

    // Game over panel.
    if (!this.gameOverPanel) {
      this.gameOverPanel = new GameOverPanel(
        this.canvas,
        this.spriteDef.TEXT_SPRITE,
        this.spriteDef.RESTART,
        this.dimensions,
      )
    } else {
      this.gameOverPanel.draw()
    }

    // Update the high score.
    if (this.distanceRan > this.highestScore) {
      this.highestScore = Math.ceil(this.distanceRan)
      this.distanceMeter.setHighScore(this.highestScore)
    }

    // Update the high score coins
    if (this.coinCount > this.coinsHighScore) {
      this.coinsHighScore = this.coinCount
      this.coinCounter.setHighScore(this.coinsHighScore)
    }


    // Reset the time clock.
    this.time = getTimeStamp()
  }

  stop() {
    this.playing = false
    this.paused = true
    cancelAnimationFrame(this.raqId)
    this.raqId = 0
  }

  play() {
    if (!this.crashed) {
      this.playing = true
      this.paused = false
      this.tRex.update(0, Trex.status.RUNNING)
      this.time = getTimeStamp()
      this.update()
    }
  }

  restart() {
    if (!this.raqId) {
      this.playCount++
      this.runningTime = 0
      this.playing = true
      this.crashed = false
      this.won = false
      this.distanceRan = 0
      this.coinCount = 0
      this.setSpeed(this.config.SPEED)
      this.time = getTimeStamp()
      this.containerEl.classList.remove(classes.CRASHED)
      this.clearCanvas()
      this.distanceMeter.reset(this.highestScore)
      this.coinCounter.reset(this.coinsHighScore)
      this.horizon.reset()
      this.tRex.reset()
      this.playSound(this.soundFx.BUTTON_PRESS)
      this.invert(true)
      this.update() // ← Start main loop after animation
      // this.update()
    }
  }

  /**
   * Hides offline messaging for a fullscreen game only experience.
   */
  setArcadeMode() {
    document.body.classList.add(classes.ARCADE_MODE)
    this.setArcadeModeContainerScale()
  }

  /**
   * Sets the scaling for arcade mode.
   */
  setArcadeModeContainerScale() {
    const windowHeight = window.innerHeight
    const scaleHeight = windowHeight / this.dimensions.HEIGHT
    const scaleWidth = window.innerWidth / this.dimensions.WIDTH
    const scale = Math.max(1, Math.min(scaleHeight, scaleWidth))
    const scaledCanvasHeight = this.dimensions.HEIGHT * scale
    // Positions the game container at 10% of the available vertical window
    // height minus the game container height.
    const translateY =
      Math.ceil(
        Math.max(
          0,
          (windowHeight -
            scaledCanvasHeight -
            config.ARCADE_MODE_INITIAL_TOP_POSITION) *
            config.ARCADE_MODE_TOP_POSITION_PERCENT,
        ),
      ) * window.devicePixelRatio

    const cssScale = scale
    this.containerEl.style.transform =
      'scale(' + cssScale + ') translateY(' + translateY + 'px)'

    // --- Furiaworld banner scaling ---
    if (this.furiaworldBanner) {
      this.furiaworldBanner.style.transform =
        'scale(' + cssScale + ') translateY(' + translateY + 'px)'
    }
  }

  /**
   * Pause the game if the tab is not in focus.
   */
  onVisibilityChange(e) {
    if (
      document.hidden ||
      document.webkitHidden ||
      e.type == 'blur' ||
      document.visibilityState != 'visible'
    ) {
      this.stop()
    } else if (!this.crashed) {
      this.tRex.reset()
      this.play()
    }
  }

  /**
   * Play a sound.
   * @param {SoundBuffer} soundBuffer
   */
  playSound(soundBuffer) {
    if (soundBuffer) {
      var sourceNode = this.audioContext.createBufferSource()
      sourceNode.buffer = soundBuffer
      sourceNode.connect(this.audioContext.destination)
      sourceNode.start(0)
    }
  }

  /**
   * Inverts the current page / canvas colors.
   * @param {boolean} Whether to reset colors.
   */
  invert(reset) {
    if (reset) {
      document.body.classList.toggle(classes.INVERTED, false)
      this.invertTimer = 0
      this.inverted = false
    } else {
      this.inverted = document.body.classList.toggle(
        classes.INVERTED,
        this.invertTrigger,
      )
    }
  }

startCalmDownSequence() {
  this.won = true
  this.stopSpawningObstacles = true
  this.horizon.horizonLine.shouldRenderLakeP = true
  if (this.tRex.status === Trex.status.JUMPING) {
    this.tRex.endJump()
  }
  this.animations.waitForLakeReveal = true
}

freezeHorizon() {
  config.freezeMovement = true
  this.disableControls = true
  this.animations.moveTrexToRight = true
}

startTrexEndJumpAnimation(callback) {
  this.disableControls = true
  this.tRex.status = Trex.status.INTRO_JUMP
  this.tRex.visible = true

  const groundY = this.tRex.groundYPos
  const startY = groundY + 30
  const startX = this.tRex.xPos
  const endX = this.dimensions.WIDTH / 15
  const totalFrames = 90
  const position = -45

  this.animations.trexEndJump = {
    callback,
    currentFrame: 0,
    totalFrames,
    startX,
    endX,
    startY,
    groundY,
    position,
  }
}

onTrexAtLake() {
  this.tRex.status = Trex.status.WIN_JUMP
  this.tRex.visible = true
  const startX = this.tRex.xPos
  const startY = this.tRex.yPos
  const endX = startX + 160
  const peakHeight = 110
  const totalFrames = 90
  this.animations.trexWinJump = {
    currentFrame: 0,
    totalFrames,
    startX,
    startY,
    endX,
    peakHeight,
  }
}
}

window['Runner'] = Runner
