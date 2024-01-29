function changeleadtoString(lead) {
  let resultStrings = [];

  // Parse the questions JSON string
  const questionsArray = lead.questions;

  // Check if questionsArray is empty or contains empty objects
  if (!questionsArray.length || (questionsArray.length === 1 && Object.keys(questionsArray[0]).length === 0)) {
      resultStrings.push("");
  } else {
      // Iterate over each object in the questions array
      for (let questionObj of questionsArray) {
          // Iterate over the keys (question titles) in each object
          for (let questionTitle in questionObj) {
              let answer = questionObj[questionTitle];
              resultStrings.push(`●  ${questionTitle} : ${answer}`);
          }
      }
  }

  const result = resultStrings.join('\n');
  const str = `New Lead please Take Note!\n=============================\n\nHello, you have a new lead :\n\n●  Name: ${lead.name}\n●  Contact: https://wa.me/${lead.phone}\n●  Email: ${lead.email}\n●  Message: ${lead.message}${lead.booking ? "\n●  Booking:" + lead.booking : ""}\n${result}`;
  return str;
}

module.exports = { changeleadtoString };
