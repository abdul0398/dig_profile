addEventListener();
setdropdown();
checkForblacklist();
async function submitForm() {
    if (!validateForm()) {
        return;
    }
    const submitButton = document.getElementById("submitBtn");
    submitButton.disabled = true;

    // Show the loading indicator
    showLoadingOverlay();
    await sendDataAndGetOTP();
    hideLoadingOverlay();
    submitButton.disabled = false;
    showModal();
}
function showLoadingOverlay() {
    const overlay = document.querySelector('.overlay');
    overlay.style.display = 'block';
}
function hideLoadingOverlay() {
    const overlay = document.querySelector('.overlay');
    overlay.style.display = 'none';
}
function showModal() {
    const modalBackdrop = document.querySelector(".modal-overlay");
    const error = document.getElementById("otp_error");
    error.style.display = "none";

    modalBackdrop.style.display = "block";
    otpPopup.classList.remove("hidden");
    otpPopup.classList.add("otpPopup")
}
function hideModal() {
    const modalBackdrop = document.querySelector(".modal-overlay");
    const otpPopup = document.getElementById("otpPopup");

    modalBackdrop.style.display = "none";
    otpPopup.classList.add("hidden");
    otpPopup.classList.remove("otpPopup");
}

function validateForm() {
    if (!validateSelect()) {
        return false;
    }
    let valid = true;
    const firstname = document.getElementById("firstname");
    const ph_number = document.getElementById("ph_number");
    const email = document.getElementById("email");

    document.getElementById("firstname_error").textContent = "";
    document.getElementById("ph_number_error").textContent = "";
    document.getElementById("email_error").textContent = "";

    if (firstname.value.trim() === "") {
        document.getElementById("firstname_error").textContent = "First Name is required.";
        valid = false;
    }

    if (!/^\d{8}$/.test(ph_number.value)) {
        document.getElementById("ph_number_error").textContent = "Phone Number must be 8 digits.";
        valid = false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.value)) {
        document.getElementById("email_error").textContent = "Email Address is not valid.";
        valid = false;
    }

    return valid;
}

function validateSelect() {
    const location_select = document.getElementById("select-country");
    const project_select = document.getElementById("select-project");
    document.getElementById("select-country-selectized-error").innerText = ""
    if (location_select.value == "" && project_select.value == "") {
        document.getElementById("select-country-selectized-error").innerText = "Please Select an Option"
        return false
    }
    const formDivs = document.querySelectorAll('.radio_div');

    for (const formDiv of formDivs) {
        const radioInputs = formDiv.querySelectorAll('input[type="radio"]');
        let radioSelected = false;

        radioInputs.forEach(function (radioInput) {
            if (radioInput.checked) {
                radioSelected = true;
            }
        });

        if (! radioSelected) {
            Swal.fire({
                title: 'Missing Fields',
                text: "Opps! there's missing fields.",
                icon: 'question',
                confirmButtonText: 'Okay',
                confirmButtonColor: '#E25656'
              })
            event.preventDefault(); // Prevent form submission
            return false;
        }
    }
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    let checkboxSelected = false;

    checkboxes.forEach(function (checkbox) {
        if (checkbox.checked) {
            checkboxSelected = true;
        }
    });

    if (! checkboxSelected) {
        Swal.fire({
            title: 'Missing Fields',
            text: "Opps! there's missing fields.",
            icon: 'question',
            confirmButtonText: 'Okay',
            confirmButtonColor: '#E25656'
          })
        event.preventDefault(); // Prevent form submission
        return false;
    }
    return true;
};


function addEventListener() {
    const location_select = document.getElementById("select-country");
    const project_select = document.getElementById("select-project");
    const project_inlocation = document.getElementById("select-project-inlocation");
    const projectButton = document.getElementsByClassName("project_radio")[0];
    const locationButton = document.getElementsByClassName("location_radio")[0];
    const projectDropdown = document.getElementById("projectDropdown");
    const locationDropdown = document.getElementById("locationDropdown");

    projectButton.addEventListener("change", function (event) {
        event.preventDefault();
        projectDropdown.style.display = "block";
        locationDropdown.style.display = "none";
        projectButton.style.backgroundColor = "#FFFFFF";
        projectButton.style.color = "#E25656";
        locationButton.style.color = "white";
        locationButton.style.backgroundColor = "";
    });

    locationButton.addEventListener("change", function (event) {
        event.preventDefault();
        locationDropdown.style.display = "block";
        projectDropdown.style.display = "none";
        locationButton.style.backgroundColor = "#FFFFFF";
        locationButton.style.color = "#E25656";
        projectButton.style.color = "white";
        projectButton.style.backgroundColor = "";
    });
    location_select.addEventListener("change", async () => {
        const data = await fetchData();
        const selected_value = location_select.value;
        project_inlocation.innerHTML = "";
        const filtered_data = data.filter(elem => {
            if(elem.location == selected_value){
                project_inlocation.innerHTML += `<option value="${
                    elem.project
                }" >${
                    elem.project
                }</option>`
            }
        })
    })
}

async function fetchData(params) {
    const res = await fetch("/getlocation_projects");
    const data = await res.json();
    return data
}

async function setdropdown(event) {
    const data = await fetchData();
    const locationDropdown = document.getElementById('select-country');
    const projectDropdown = document.getElementById('select-project');
    jQuery(function($) {
        // Initialize Selectize on the first dropdown
        $('select').selectize();
        var firstSelectize = $('#select-country').selectize()[0].selectize;
        var secondDropdown = $('#select-project-inlocation')[0].selectize;

        
        
        firstSelectize.on('change', function() {
            const projects = [];
            const value = document.getElementById('select-country').value;
            data.forEach((obj) => {
                if(value == obj.location){
                    projects.push({value: obj.project, text: obj.project});
                }
            })
            secondDropdown.clear();
            secondDropdown.clearOptions();
            secondDropdown.addOption(projects);
            secondDropdown.refreshOptions();
        });
    });




    data.sort((a, b) => a.location.localeCompare(b.location));
    let location = [];
    const set = new Set();
    for (let i = 0; i < data.length; i++) {
        set.add(data[i].location);
    }
    location = [... set];
    data.forEach((obj) => {
        projectDropdown.innerHTML += `<option value="${
            obj.project
        }" >${
            obj.project
        }</option>`
    });
    location.forEach((elem) => {
        locationDropdown.innerHTML += `<option value="${
            elem
        }" >${
            elem
        }</option>`
    })
    // });
}
function getFormData() {
    const formDivs = document.querySelectorAll('.form_div');
    const selectedData = {};
    formDivs.forEach(function (formDiv, index) {
        const questionText = formDiv.querySelector('.main_label').textContent.trim();
        const radioInputs = formDiv.querySelectorAll('input[type="radio"]:checked');

        radioInputs.forEach(function (radioInput) {
            if(radioInput.name != "x"){
                const questionName = radioInput.name;
                const optionValue = radioInput.value;
                selectedData[questionName] = optionValue;
            }
        });
    });
    const form_div = document.querySelector(".form_div");
    const inputs = form_div.querySelectorAll("input");
    let formData = {};

    // Extract checkbox values
    let checkboxValues = [];
    let checkboxOptions = document.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < checkboxOptions.length; i++) {
        if (checkboxOptions[i].checked) {
            checkboxValues.push(checkboxOptions[i].value);
        }
    }
    formData["Choose the details you wish to receive:"] = checkboxValues;

    // Extract text input values
    formData["Name"] = document.getElementById("firstname").value;
    formData["Phone"] = document.getElementById("ph_number").value;

    // Extract select values
    const projectRadio = document.getElementById("radio-project");
    const locationRadio = document.getElementById("radio-location");
        if (projectRadio.checked) {
            formData["project"] = document.getElementById("select-project").value;
        }else if (locationRadio.checked) {
            formData["project"] = document.getElementById("select-project-inlocation").value;
        }
    // formData["location"] = document.getElementById("select-country").value;

    // Extract email value
    formData["Email"] = document.getElementById("email").value;
    formData = {
        ... formData,
        ... selectedData
    };

    // Log the entire object
    return formData;

}

async function sendDataAndGetOTP() {
    const id = document.getElementById("client_id").innerText;
    const uuid = localStorage.getItem("rvstring");
    const form_data = getFormData();
    const ip = await fetchIp();
    const form_id = document.getElementById("form_id").innerText;
    form_data.form_id = form_id;
    form_data.ip = ip;
    form_data.uuid = uuid;
    form_data.clientId = id;
    try {
        const res = await fetch("/api/getOTP", {
            method: "POST",
            body: JSON.stringify(form_data),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
        const data = await res.json();
        const phone = document.getElementById("ph_number").value;
        const otpPopup = document.getElementById("otpPopup");
        otpPopup.querySelector("span").innerText = `Please enter the OTP to get your request data`;
        if (! uuid) {
            localStorage.setItem('rvstring', data.newuuid);
        }
        document.getElementById("lead_id").innerText = data.id;
    } catch (error) {
        console.log(error.message);
        window.location.replace("/error");
    }
}
async function fetchIp() {
    const res = await fetch("https://api.ipify.org/?format=json");
    const data = await res.json()
    return data.ip;
}

async function verifyOTP() {
    const OTP = document.getElementById("otp").value;
    const error = document.getElementById("otp_error");
    error.innerText = "";
    if(OTP.length != 6){
        error.innerText = "Inavlid OTP";
        error.style.display = "inline";
        return;
    }
    const Phone = document.getElementById("ph_number").value;
    const clientId = document.getElementById("client_id").innerText;
    const form_id = document.getElementById("form_id").innerText;
    const leadId = document.getElementById("lead_id").innerText;
    const btn = document.getElementById("verifyOTP");
    btn.classList.add("disabled-button");
    const projectRadio = document.getElementById("radio-project");
    const locationRadio = document.getElementById("radio-location");
    let query = "";
    if (projectRadio.checked) {
        query = document.getElementById("select-project").value;
    }else if (locationRadio.checked) {
        query = document.getElementById("select-project-inlocation").value;
    }

    showLoadingOverlay();
    try {
        const res = await fetch("/api/verifyOTP", {
            method: "POST",
            body: JSON.stringify(
                {OTP, Phone, clientId, leadId}
            ),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
        const status = await res.json();
        if (res.status == 401) {
            const error = document.getElementById("otp_error");
            error.innerText = "Inavlid OTP";
            error.style.display = "inline";
            btn.classList.remove("disabled-button");
            hideLoadingOverlay();
            return;
        } else if (res.status == 200) {
            const newTab = window.open(`/lastPage/${clientId}/${form_id}?project=${query}`, "_blank");
            newTab.focus();
            window.close();
        } else {
            window.location.replace("/error");
        }
    } catch (error) {
        console.log(error.message);
    }
}

async function checkForblacklist() {
    const uuid = localStorage.getItem("rvstring");
    const ip = await fetchIp();
    const res = await fetch('/api/check/validation', {
        method: "POST",
        body: JSON.stringify(
            {uuid: uuid, ip: ip}
        ),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });
    const data = await res.json();
    if (data) {
        window.location.replace('/error');
    }
}
