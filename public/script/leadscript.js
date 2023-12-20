const clientFilter = document.getElementById('client-filter');
const projectFilter = document.getElementById('project-filter');
const rows = document.querySelectorAll('tbody tr');


function closeForm() {
    var popupForm = document.getElementById("popupForm");
    popupForm.style.opacity = "0"; // Fade out the popup
    setTimeout(function () {
        popupForm.style.display = "none";
    }, 300); // Delay before hiding the popup
}

const downloadButton = document.getElementById('downloadButton');

    downloadButton.addEventListener('click', async () => {
      try {
        const response = await fetch('/download-csv');
        const data = await response.json();
        const headers = Object.keys(data[0]).toString();
        const arr = data.map(item=>{
          return Object.values(item).toString();
        })
        const csv = [headers, ...arr].join('\n');
        const blob = new Blob([csv], {type:"application/csv"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'data.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
      }
    });
