import 'dotenv/config'
import express from 'express'

const app = express()
app.use(express.json())

app.post('/api/realtime-token', async (_req, res) => {
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-4o-realtime-preview-2024-12-17', voice: 'alloy' }),
  })
  const data = await response.json()
  res.json(data)
})

app.listen(3001, () => console.log('Token server running on :3001'))
