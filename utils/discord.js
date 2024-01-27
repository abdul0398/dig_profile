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
  if(discords.length === 0 || discords[0] === "") return;
try {
  for(dsLink of discords){
    await sendWebhookMessage(dsLink,"Jome Journey", leadStr);
  };
} catch (error) {
  console.log(error.message);
}
  
}
module.exports = {sendWebhookMessage, bulkDiscordSender};