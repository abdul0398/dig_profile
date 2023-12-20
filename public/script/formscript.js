let currentTab = 0;
const projectName = document.getElementById("project_name").innerText;
const clientName = document.getElementById("client_name").innerText;
const clientCode = document.getElementById("client_code").innerText;
checkForblacklist();
function showTab(n) {
    let x = document.getElementsByClassName("tab");
    x[n].style.display = "block";
    if (n == (x.length - 1)) {
        document.getElementById("nextBtn").innerHTML = "Submit";
    } else if(n == 1){
        // document.getElementById("nextBtn").innerHTML = `Next<span style="color:#226DDA">.</span>`;
        document.getElementById("nextBtn").innerHTML = "Next Step";
    }
}
async function nextbtn(n) {
    if (currentTab == 1) {
        clearErrorMessages();
        if (validatorinput2()) {
            const button = document.getElementById('nextBtn');
            disableButton(button);
            const data = await formSubmit();
            await postData(data);
            enableButton(button);
        } else {
            return;
        }
    } else if (currentTab == 2) {
        return window.location.assign(`/thankyou/${clientCode}/${projectName}`);
    }
    let x = document.getElementsByClassName("tab");
    if (currentTab == 0 && (!validatorRadio() || !validatorinput1())) {
        alert("Please enter valid information to proceed")
        return;
    }

    x[currentTab].style.display = "none";
    currentTab = currentTab + n;

    if (currentTab >= x.length) {
        document.getElementById("regForm").submit();
        return false;
    }
    showTab(currentTab);
}

// ##### Validator functions #####
function validatorRadio() {
    const questions = document.querySelectorAll('.radio-div');
    const reqlength = questions.length
    if(reqlength > 0){
        let neededlength = 0;
        questions.forEach(question => {
            const radioButtons = question.querySelectorAll('input[type="radio"]');
            radioButtons.forEach(radioButton => {
                if (radioButton.checked) {
                    neededlength++;
                }
            })
        })
        return neededlength == reqlength;
    }else{
        return true;
    }
}

function validatorinput2() {
    let isValid = true;
    const input_div = document.querySelector('.input-div');
    const inputs = input_div.querySelectorAll('input');
    for (const input of inputs) {
        if (input.name == 'phone' && input.value.length != 8) {
            displayErrorMessage(input);
            isValid = false;
        } else if (! input.checkValidity()) {
            displayErrorMessage(input);
            isValid = false;
        }
    }
    return isValid;

}
function validatorinput1() {
    let isValid = true;
    const input_div = document.querySelector('.input-div1');
    if(input_div){
        const inputs = input_div.querySelectorAll('input');
        for (const input of inputs) {
            if (input.value.length == 0) {
                isValid = false;
            }
        }
        return isValid;
    }else{
        return isValid;
    }

}


//############ Form submit function #################
async function formSubmit() {
    const form = document.getElementById('regForm');
    const formData = {};
    for (const input of form.elements) {
        if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'radio') {
            formData[input.name] = input.value;
        }
    }
    formData["questions"] = radio();
    formData["ip"] = await fetchIp()
//##### Data of form ########3
   return formData;
}

//###### Errror message function #########
function displayErrorMessage(input) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    if (input.name == 'phone') {
        errorMessage.textContent = "Please enter valid information to proceed";
        input.parentNode.innerHTML += `<div class="error-message_exclamation"
        style="display: flex; justify-content: center; align-items: center;">
        <i class="fa-solid fa-circle-exclamation fa-lg"
          style="color: #ff0000;"></i>
      </div>`
        document.getElementById("phone_div").appendChild(errorMessage); 
    } else {
        errorMessage.textContent = "Please enter valid information to proceed"
        input.parentNode.parentNode.appendChild(errorMessage)
        input.parentNode.innerHTML += `<div class="error-message_exclamation" style="display: flex; justify-content: center; align-items: center;">
        <i class="fa-solid fa-circle-exclamation fa-lg" style="color: #ff0000;"></i>
      </div>`
    }
}
function clearErrorMessages() {
    const errorMessages = document.querySelectorAll('.error-message');
    const errorMessagesEx = document.querySelectorAll('.error-message_exclamation');
    errorMessagesEx.forEach((elem)=>{
        elem.remove();
    })
    errorMessages.forEach(function (errorMessage) {
        errorMessage.remove();
    });
}


//############## getting the data of radio data ################
function radio() {
    let radioGroups = document.querySelectorAll('.radio-div');
    const radioobj = {};
    radioGroups.forEach(function (group) {
        let groupName = group.querySelector('input[type="radio"]').name;
        let selectedValue = getSelectedRadioValue(groupName);
        if (selectedValue !== null) {
          radioobj[groupName] = selectedValue;
        }
    });
    input_ques(radioobj);
    return radioobj;
  }

  //##############Get the data of input question if any #############

  function input_ques(questions) {
    const divs = document.querySelectorAll('.input_option_div');
    divs.forEach((div) => {
      const heading = div.querySelector('.heading').textContent;
      const inputValue = div.querySelector('.input_option').value;
      questions[heading] = inputValue;
    });
  }

  
  function getSelectedRadioValue(radioGroupName) {
      let radioButtons = document.getElementsByName(radioGroupName);
      for (let i = 0; i < radioButtons.length; i++) {
          if (radioButtons[i].checked) {
              return radioButtons[i].value;
          }
      }
      return null;
  }


  // ########### Fetching the api #############
async function fetchIp(){
    const res = await fetch("https://api.ipify.org/?format=json");
    const data = await res.json()
   return data.ip;
  }

async function postData(data){
    const uuid = localStorage.getItem("rvstring");
    const res = await fetch("/api/storeleads", {
        method:"POST",
        body:JSON.stringify({
            data,
            projectName:projectName,
            clientName:clientName,
            uuid:uuid
        }),
        headers:{
            "Content-type": "application/json; charset=UTF-8"
        }
    })
    const result = await res.json();    
    //###### Stroring the string to block the from filling the form ######
    if(!uuid){
        localStorage.setItem('rvstring',result);
    }
}


function disableButton(button) {
    button.disabled = true;
    button.innerText = "Processing...";
}


function enableButton(button) {
    button.disabled = false;
    button.innerText = "Submit";
}


async function checkForblacklist(){
    const uuid = localStorage.getItem("rvstring");
    const ip = await fetchIp();
    const res = await fetch('/api/check/validation', {
        method:"POST",
        body:JSON.stringify({
            uuid:uuid,
            ip:ip
        }),
        headers:{
            "Content-type": "application/json; charset=UTF-8"
        }
    });
        const data = await res.json();
        if(data){
            window.location.replace('/error');
        }
        showTab(currentTab);
}
