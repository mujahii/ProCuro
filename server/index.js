require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/orders', require('./routes/orders'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/admin', require('./routes/admin'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`ProCuro server running on port ${PORT}`)
})
