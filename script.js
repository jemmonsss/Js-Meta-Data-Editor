const upload = document.getElementById("upload");
const preview = document.getElementById("preview");
const form = document.getElementById("metadata-form");
const saveBtn = document.getElementById("save");
const downloadLink = document.getElementById("download");
const replaceBtn = document.getElementById("replace");
const randomBtn = document.getElementById("random");

let currentExif = null;
let originalImage = null;

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    originalImage = dataUrl;
    preview.src = dataUrl;
    try {
      const exif = piexif.load(dataUrl);
      currentExif = exif;
      populateForm(exif);
    } catch (err) {
      console.warn("No EXIF found.");
      form.innerHTML = "<p>No metadata found.</p>";
    }
  };
  reader.readAsDataURL(file);
}

function populateForm(exif) {
  form.innerHTML = "";
  const entries = exif["0th"];
  for (let tag in entries) {
    const fieldName = piexif.TAGS["0th"][tag]["name"];
    const value = entries[tag];
    form.innerHTML += `
      <label>${fieldName}
        <input data-tag="${tag}" value="${value}" />
      </label>`;
  }
}

function updateExif() {
  const entries = currentExif["0th"];
  const inputs = form.querySelectorAll("input[data-tag]");
  inputs.forEach((input) => {
    const tag = input.dataset.tag;
    let value = input.value;
    // Try to parse as int if appropriate
    entries[tag] = isNaN(value) ? value : parseInt(value);
  });

  const exifStr = piexif.dump(currentExif);
  const binary = atob(originalImage.split(",")[1]);
  const binaryArray = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) binaryArray[i] = binary.charCodeAt(i);
  const inserted = piexif.insert(exifStr, originalImage);
  downloadLink.href = inserted;
  downloadLink.style.display = "inline";
}

saveBtn.addEventListener("click", () => {
  if (originalImage && currentExif) {
    updateExif();
  }
});

upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) loadImage(file);
});

replaceBtn.addEventListener("click", () => upload.click());

randomBtn.addEventListener("click", async () => {
  const res = await fetch("https://source.unsplash.com/random/800x600");
  const blob = await res.blob();
  const file = new File([blob], "random.jpg", { type: "image/jpeg" });
  loadImage(file);
});
