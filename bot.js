// Load polyfills first to fix compatibility issues
require('./polyfills');

require('dotenv').config();
const venom = require('venom-bot');
const axios = require('axios');
const express = require('express');

const app = express();
app.use(express.json());
let client;

// --- Function to Process a Message ---
async function processMessage(client, message, isSimulatedSelf = false) {
  console.log("Processing message:", message);
  if (isSimulatedSelf) {
    console.log("This is a simulated self message (from Express endpoint).");
  } else {
    console.log("This message was received via venom-bot onMessage event.");
  }

  // Ensure message body exists and is not empty
  if (message.body && message.body.trim() !== '') {
    try {
      // Forward the message to your n8n webhook endpoint.
      // (Make sure n8n is running and the WEBHOOK_URL environment variable is set)
      const response = await axios.post(process.env.WEBHOOK_URL, {
        body: message.body,
        from: message.from,
      });
      if (response.data && response.data.reply) {
        console.log('Reply from AI:', response.data.reply);
        // Send the reply back to WhatsApp using venom-bot
        await client.sendText(message.from, response.data.reply);
        console.log('Message sent successfuly')
      } else {
        console.log('No reply field in response data:', response.data);
      }
    } catch (error) {
      console.error('Error processing message or sending reply:', error);
    }
  } else {
    console.log("Received an empty message; skipping processing.");
  }
}

// --- Venom-bot Initialization ---
venom
  .create({
    session: 'ai-agent-session', // session name for the venom instance
    headless: 'new',
    puppeteerOptions: {
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  })
  .then((venomClient) => {
    client = venomClient;
    console.log("Venom-bot client initialized.");
    startVenomClient(client);
  })
  .catch((err) => {
    console.error("Error initializing venom:", err);
  });

// Listen for messages via venom-bot (these are messages from others)
function startVenomClient(client) {
  client.onMessage(async (message) => {
    // Log the entire message object for debugging purposes
    console.log("Received message event:", message);

    // Check if this message is from your own account (self message)
    // Note: WhatsApp normally does not send back messages from your own account.
    if (message.fromMe) {
      console.log("Self message detected via onMessage event (this usually should not happen).");
    } else {
      await processMessage(client, message, false);
    }
  });
}

// --- Express Endpoint for Simulating Self Messages ---
// Use this endpoint to simulate incoming self messages via HTTP POST.
// Example: POST to http://localhost:3000/simulate-self with JSON body: 
//          { "body": "Hello from self", "from": "your-group-id" }
app.post('/simulate-self', async (req, res) => {
  const simulatedMessage = req.body;
  if (!simulatedMessage || !simulatedMessage.body || !simulatedMessage.from) {
    return res.status(400).send({ error: "Please provide 'body' and 'from' in the request." });
  }
  console.log("Simulated self message received via Express endpoint:", simulatedMessage);

  // Process this as if it were an incoming message.
  await processMessage(client, simulatedMessage, true);
  res.send({ status: "Simulated self message processed." });
});

// --- Start the Express Server ---
const PORT = process.env.PORT || 4868;
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
