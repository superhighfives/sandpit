import dat from 'dat.gui/build/dat.gui'
import queryfetch from 'queryfetch'
import debounce from 'debounce'
import seedrandom from 'seedrandom'

import logger from './utils/logger'
import is from './utils/is'

/**
 * A playground for creative coding
 */
class Sandpit {
  static get CANVAS () { return '2d' }
  static get WEBGL () { return '3d' }

  /**
   * @param {(string|object)} container - The container for the canvas to be added to
   * @param {string} type - Defines whether the context is 2d or 3d
   */
  constructor (container, type) {
    console.log('⛱ Welcome to Sandpit')
    this._setupContext(container, type)
  }

  /**
   * Set up the canvas
   * @private
   */
  _setupContext (container, type) {
    // Check that the correct container type has been passed
    if (typeof container !== 'string' && typeof container !== 'object') {
      throw new Error('Please provide a string or object reference to the container, like ".container", or ')
    }
    // Check that the type is set
    if (typeof type !== 'string' || (type !== Sandpit.CANVAS && type !== Sandpit.WEBGL)) {
      throw new Error('Please provide a context type - either `Sandpit.CANVAS` or `Sandpit.WEBGL`')
    }

    // Either find the container, or just use the object
    let _container
    if (typeof container === 'string') {
      _container = document.querySelector(container)
    } else if (typeof container === 'object') {
      _container = container
    }

    // Check the container is a dom element
    if (is.element(_container)) {
      this._canvas = document.createElement('canvas')
      this._canvas.width = window.innerWidth
      this._canvas.height = window.innerHeight
      _container.appendChild(this._canvas)
      // Grab the context
      this._context = this._canvas.getContext(type)
      this._type = type
    } else {
      throw new Error('The container is not a HTMLElement')
    }
  }

  /**
   * Sets up the settings gui via dat.gui
   * @param {object} settings - An object of key value pairs
   * for the setting name and default value
   * @param {boolean} queryable - Whether or not to store settings
   * in the query string for easy sharing
   * @private
   */
  _setupGui (settings, queryable) {
    // Sort the original settings in defaults
    this.defaults = settings
    this.settings = {}
    this.gui = new dat.GUI()

    // If queryable is true, set up the query string management
    // for storing settings
    if (queryable) {
      this._queryable = true
      if (window.location.search) {
        let params = queryfetch.parse(window.location.search)
        Object.keys(params).forEach((key) => {
          // If a setting matches the param, use the param
          if (settings[key]) {
            let param = params[key]
            // Convert string to boolean if 'true' or 'false'
            if (param === 'true') param = true
            if (param === 'false') param = false
            if (typeof settings[key].value !== 'object') {
              settings[key].value = param
            } else {
              // If the param is an object, store the
              // name in a selected property
              settings[key].selected = param
            }
          }
        })
      }
    }

    // Create settings folder and add each item to it
    const group = this.gui.addFolder('Settings')
    Object.keys(settings).forEach(name => {
      let options = false
      let value = settings[name].value

      // If it's an object, supply the array or object,
      // and grab the right value
      if (typeof value === 'object') {
        options = value
        // If a selected option is available via the query
        // string, use that
        if (settings[name].selected) {
          this.settings[name] = settings[name].selected
        } else {
          // If not, grab the first item in the object or array
          this.settings[name] = is.array(value)
            ? value[0]
            : value[Object.keys(value)[0]]
        }
      } else {
        // If it's not an object, pass the setting on
        this.settings[name] = settings[name].value
      }

      // If it's a colour, use a different method
      let guiField = settings[name].color
        ? group.addColor(this.settings, name)
        : group.add(this.settings, name, options)

      // Check for min, max and step, and add to the gui field
      if (settings[name].min !== undefined) guiField = guiField.min(settings[name].min)
      if (settings[name].max !== undefined) guiField = guiField.max(settings[name].max)
      if (settings[name].step !== undefined) guiField = guiField.step(settings[name].step)

      // Handle the change event
      guiField.onChange(debounce((value) => {
        this._change(name, value)
      }), 300)
    })
    // Open the settings drawer
    group.open()

    // If queryable is enabled, serialize the final settings
    // and push them to the query string
    if (queryable) {
      const query = queryfetch.serialize(this.settings)
      window.history.pushState({}, null, '/?' + query)
      // Adds a reset button to the gui interface
      this.gui.add({reset: () => {
        window.history.pushState({}, null, '/')
        window.location.reload()
      }}, 'reset')
    }
  }

  /**
   * Handles a changed setting
   * @param {string} name - Setting name
   * @param {*} value - The new setting value
   * @private
   */
  _change (name, value) {
    logger.info(`Update fired on ${name}: ${value}`)
    if (this._queryable) {
      const query = queryfetch.serialize(this.settings)
      window.history.pushState({}, null, '/?' + query)
    }
    // If there is a change hook, use it
    if (this.change) {
      this.change(name, value)
    }
  }

  /**
   * Sets up the primary animation loop
   * @private
   */
  _setupLoop () {
    this._time = 0
    this._loop()
  }

  /**
   * The primary animation loop
   * @private
   */
  _loop () {
    // Clear the canvas if autoclear is set
    if (this._autoClear) {
      if (this._type === Sandpit.CANVAS) {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
      } else if (this._type === Sandpit.WEGBL) {
        // TODO: Implement auto clear for WebGL instances
      }
    }
    // Loop!
    if (this.loop) this.loop()
    // Increment time
    this._time++
    this._animationFrame = window.requestAnimationFrame(this._loop.bind(this))
  }

  /**
   * Sets up event management
   * @private
   */
  _setupEvents () {
    this._events = {}
    this._setupResize()
    this._setupInput()

    // Loop through and add event listeners
    Object.keys(this._events).forEach(event => {
      // TODO: Use context instead of document
      document.addEventListener(event, this._events[event].bind(this), false)
    })
  }

  /**
   * Sets up the resize event, optionally using a user defined option
   * @private
   */
  _setupResize () {
    // TODO: Fix context here: this_events['trigger'] = {event: event, context: context}?
    if (this.resize) {
      this._resizeEvent = this.resize
    } else {
      this._resizeEvent = () => {
        this._canvas.width = window.innerWidth
        this._canvas.height = window.innerHeight
      }
    }
    this._events['resize'] = this._resizeEvent
  }

  /**
   * Hooks up the mouse events
   * @private
   */
  _setupMouse () {
    this._events['mousemove'] = this._handleMouseMove
    this._events['mousedown'] = this._handleMouseDown
    this._events['mouseenter'] = this._handleMouseEnter
    this._events['mouseleave'] = this._handleMouseLeave
    this._events['mouseup'] = this._handleMouseUp
  }

  /**
   * Hooks up the touch events
   * @private
   */
  _setupTouches () {
    this._events['touchmove'] = this._handleTouchMove
    this._events['touchstart'] = this._handleTouchStart
    this._events['touchend'] = this._handleTouchEnd
  }

  /**
   * Hooks up the accelerometer events
   * @private
   */
  _setupAccelerometer () {
    if (this.accelerometer) {
      if (window.DeviceOrientationEvent) {
        this._events['deviceorientation'] = this._handleAccelerometer
      } else {
        logger.warn('Accelerometer is not supported by this device')
      }
    }
  }

  /**
   * Defines the input object and sets up the mouse, accelerometer and touches
   * @param {event} event
   * @private
   */
  _setupInput () {
    this.input = {}
    this._setupMouse()
    this._setupTouches()
    this._setupAccelerometer()
  }

  /**
   * Handles the mousemove event
   * @param {event} event
   * @private
   */
  _handleMouseMove (event) {
    this.input.x = event.pageX
    this.input.y = event.pageY
    if (this.move) this.move(event)
  }

  /**
   * Handles the mousedown event
   * @param {event} event
   * @private
   */
  _handleMouseDown (event) {
    this.input.x = event.pageX
    this.input.y = event.pageY
    if (this.touch) this.touch(event)
  }

  /**
   * Handles the mouseup event
   * @param {event} event
   * @private
   */
  _handleMouseUp (event) {
    delete this.input.x
    delete this.input.y
    if (this.release) this.release(event)
  }

  /**
   * Handles the mouseenter event
   * @param {event} event
   * @private
   */
  _handleMouseEnter (event) {
    this.input.x = event.pageX
    this.input.y = event.pageY
    if (this.release) this.release(event)
  }

  /**
   * Handles the mouseleave event
   * @param {event} event
   * @private
   */
  _handleMouseLeave (event) {
    delete this.input.x
    delete this.input.y
    if (this.release) this.release(event)
  }

  /**
   * Handles the touchmove event
   * @param {event} event
   * @private
   */
  _handleTouchMove (event) {
    this.input.x = event.pageX
    this.input.y = event.pageY
    if (this.move) this.move(event)
  }

  /**
   * Handles the touchstart event
   * @param {event} event
   * @private
   */
  _handleTouchStart (event) {
    this.input.x = event.pageX
    this.input.y = event.pageY
    if (this.touch) this.touch(event)
  }

  /**
   * Handles the touchend event
   * @param {event} event
   * @private
   */
  _handleTouchEnd (event) {
    delete this.input.x
    delete this.input.y
    if (this.release) this.release(event)
  }

  /**
   * Handles the accelerometer event
   * @param {event} event
   * @private
   */
  _handleAccelerometer (event) {
    // TODO: Manage the accelerometer event
    if (this.accelerometer) this.accelerometer(event)
  }

  /**
   * Creates the settings GUI
   * @param {object} settings - An object containing key value pairs for each setting
   * @param {boolean} queryable - Enables query string storage of settings
   * @return {object} Context
   */
  settings (settings, queryable) {
    this._setupGui(settings, queryable)
  }

  /**
   * Defines whether or not to return debugger messages from Sandpit
   * @param {boolean} boolean
   * @return {object} Context
   */
  debug (boolean) {
    logger.active = boolean
  }

  /**
   * Sets whether the canvas autoclears after each render
   * @param {boolean} boolean
   */
  autoClear (boolean) {
    this._autoClear = boolean
  }

  clear () {
    if (this._type === Sandpit.CANVAS) {
      this._context.clearRect(0, 0, this.width(), this.height())
    } else if (this._type === Sandpit.WEGBL) {
      // TODO: Implement clear for WebGL instances
    }
  }

  /**
   * Returns the canvas context
   * @return {object} Context
   */
  context () {
    return this._context
  }

  /**
   * Returns the canvas object
   * @return {canvas} Canvas
   */
  canvas () {
    return this._canvas
  }

  /**
   * Returns the frame increment
   * @returns {number} Canvas width
   */
  time () {
    return this._time
  }

  /**
   * Returns the canvas width
   * @returns {number} Canvas width
   */
  width () {
    return this._canvas.width
  }

  /**
   * Returns the canvas height
   * @returns {number} Canvas height
   */
  height () {
    return this._canvas.height
  }

  /**
   * Fills the canvas with the provided colour
   * @param {string} color - The color to fill with, in string format
   * (for example, '#000', 'rgba(0, 0, 0, 0.5)')
   */
  fill (color) {
    if (this._type === Sandpit.CANVAS) {
      this._context.fillStyle = color
      this._context.fillRect(0, 0, this.width(), this.height())
    } else if (this._type === Sandpit.WEGBL) {
      // TODO: Implement fill background for WebGL instances
    }
  }

  /**
   * Returns a random number generator based on a seed
   * @param {string} seed - The seed with which to create the random number
   * @returns {function} A function that returns a random number
   */
  random (seed) {
    return seedrandom(seed)
  }

  /**
   * Sets up resizing and input events and starts the loop
   */
  start () {
    // Sets up the events
    this._setupEvents()
    // Loop!
    if (!this.loop) logger.warn('Looks like you need to define a loop')
    this._setupLoop()
  }

  /**
   * Stops the loop and removes event listeners
   */
  stop () {
    // Stop the animation frame loop
    window.cancelAnimationFrame(this._animationFrame)
    // Remove all event listeners
    Object.keys(this._events).forEach(event => {
      document.removeEventListener(event, this._events[event])
    })
  }
}

export default Sandpit