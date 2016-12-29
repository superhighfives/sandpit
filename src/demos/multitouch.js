/*
 * Credit for this playground goes to Sketch.js, which is
 * wild and you should totally check it out:
 * https://github.com/soulwire/sketch.js
 */

import Sandpit, { math } from '../Sandpit'

const playground = () => {
  const existingCanvas = document.createElement('canvas')
  const root = document.querySelector('#root')
  root.appendChild(existingCanvas)

  const sandpit = new Sandpit(existingCanvas, Sandpit.CANVAS)
  sandpit.settings({
    demo: {value: 'multitouch', editable: false, sticky: true},
    maxSize: {value: 40, min: 5, max: 50, step: 1},
    energy: {value: 0.9, min: 0.0, max: 0.9, step: 0.1},
    force: {value: 5, min: 2, max: 30, step: 1},
    decay: {value: 0.96, min: 0.90, max: 0.99, step: 0.01},
    blend: {value: ['multiply', 'lighter', 'overlay']}
  })
  sandpit.autoClear(true)
  const random = sandpit.random()
  const ctx = sandpit.context()

  function Particle () {
    this.init = (x, y, radius) => {
      this.alive = true

      this.radius = radius || 10
      this.wander = 0.15
      this.theta = random() * math.TWO_PI
      this.drag = 0.92
      this.color = '#fff'

      this.x = x || 0.0
      this.y = y || 0.0

      this.vx = 0.0
      this.vy = 0.0
    }

    this.move = () => {
      this.x += this.vx
      this.y += this.vy

      this.vx *= this.drag
      this.vy *= this.drag

      this.theta += math.randomBetween(-0.5, 0.5) * this.wander
      this.vx += Math.sin(this.theta) * 0.1
      this.vy += Math.cos(this.theta) * 0.1

      this.radius *= sandpit.settings.decay
      this.alive = this.radius > 0.5
    }

    this.draw = () => {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius, 0, math.TWO_PI)
      ctx.fillStyle = this.color
      ctx.fill()
    }
  }

  const MAX_PARTICLES = 280
  const COLOURS = ['#69D2E7', '#A7DBD8', '#E0E4CC', '#F38630', '#FA6900', '#FF4E50', '#F9D423']

  let particles = []
  let pool = []

  const spawn = (x, y) => {
    if (particles.length >= MAX_PARTICLES) {
      pool.push(particles.shift())
    }

    let particle = pool.length ? pool.pop() : new Particle()
    particle.init(x, y, math.randomBetween(2, sandpit.settings.maxSize))

    particle.wander = math.randomBetween(0.5, 2.0)
    particle.color = math.randomFrom(COLOURS)
    particle.drag = math.randomBetween(sandpit.settings.energy, 0.99)

    let theta = random() * math.TWO_PI
    let force = math.randomBetween(2, sandpit.settings.force)

    particle.vx = Math.sin(theta) * force
    particle.vy = Math.cos(theta) * force

    particles.push(particle)
  }

  sandpit.setup = () => {
    for (let i = 0; i < 20; i++) {
      let x = (sandpit.width() / 2) + math.randomBetween(-100, 100)
      let y = (sandpit.height() / 2) + math.randomBetween(-100, 100)
      spawn(x, y)
    }
  }

  sandpit.loop = () => {
    ctx.globalCompositeOperation = sandpit.settings.blend
    for (let i = particles.length - 1; i >= 0; i--) {
      let particle = particles[i]
      if (particle.alive) {
        particle.move()
        particle.draw()
      } else {
        pool.push(particles.splice(i, 1)[0])
      }
    }
  }

  sandpit.move = () => {
    for (let i = 0; i < sandpit.input.touches.length; i++) {
      let touch = sandpit.input.touches[i]
      let max = math.randomBetween(1, 4)
      for (let j = 0; j < max; j++) {
        spawn(touch.x, touch.y)
      }
    }
  }

  sandpit.start()

  // Keep the demo in the query string when resetting
  sandpit.reset = () => {
    // Keep the demo
    window.history.pushState({}, null, `/?demo=${sandpit.settings.demo}`)
    // Reload the page
    window.location.reload()
  }

  // Give a hook back to the sandpit
  playground.prototype.sandpit = sandpit
}

export default playground