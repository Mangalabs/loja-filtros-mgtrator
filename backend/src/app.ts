import express from 'express'
import { corsMiddleware } from './shared/http/cors.js'
import { errorHandler } from './shared/http/error-handler.js'
import { notFoundHandler } from './shared/http/not-found-handler.js'
import { registerRoutes } from './views/routes.js'

export function createApp() {
  const app = express()

  app.use(corsMiddleware)
  app.use(express.json())
  registerRoutes(app)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
