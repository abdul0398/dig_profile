const axios = require('axios');

async function sendWebhookMessage(hookURL, projectName, msg) {
  try {
    const response = await axios.post(hookURL, {
      content: msg,
      username:projectName
    });
    return response
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function bulkDiscordSender(discords, leadStr){
  discords.forEach(async dsLink => {
    await sendWebhookMessage(dsLink,"Jome Journey", leadStr);
  });
  
}
module.exports = {sendWebhookMessage, bulkDiscordSender};