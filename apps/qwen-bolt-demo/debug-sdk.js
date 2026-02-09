
const { query } = require('@qwen-code/sdk');

async function testConnection() {
  console.log('Testing SDK connection...');
  try {
    const q = query({
      prompt: 'Hello',
      options: {
        debug: true,
        authType: 'openai', // Explicitly testing the default mode
        // Only use 1 turn to fail fast
        model: 'qwen-plus',
        maxSessionTurns: 1,
        logLevel: 'debug',
      }
    });

    console.log('Session created. Waiting for response...');

    for await (const msg of q) {
      console.log('Received message type:', msg.type);
      if (msg.type === 'assistant') {
        console.log('Response:', msg.message.content);
      }
    }
  } catch (error) {
    console.error('SDK Error Details:');
    console.error(error);
  }
}

testConnection();
