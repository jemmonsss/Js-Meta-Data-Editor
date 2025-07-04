const upload = document.getElementById("upload");
const preview = document.getElementById("preview");
const form = document.getElementById("metadata-form");
const jsonView = document.getElementById("json-view");
const saveBtn = document.getElementById("save");
const downloadLink = document.getElementById("download");
const replaceBtn = document.getElementById("replace");
const randomBtn = document.getElementById("random");

let originalImage = null;
let currentExif = null;

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    originalImage = dataUrl;
    preview.src = dataUrl;

    try {
      const exif = piexif.load(dataUrl);
      currentExif = exif;
      renderEditableForm(exif);
      renderJSONView(exif);
    } catch (err) {
      console.warn("No EXIF found.");
      form.innerHTML = "<p>No metadata found.</p>";
      jsonView.textContent = "{}";
    }
  };
  reader.readAsDataURL(file);
}

function renderEditableForm(exif) {
  form.innerHTML = "";
  const sections = Object.keys(exif);
  sections.forEach(section => {
    const entries = exif[section];
    form.innerHTML += `<h3>${section}</h3>`;
    for (let tag in entries) {
      const name = piexif.TAGS[section]?.[tag]?.name || `Tag ${tag}`;
      const value = entries[tag];
      form.innerHTML += `
        <div class="meta-entry">
          <label>${name} (${section}:${tag})</label>
          <input data-section="${section}" data-tag="${tag}" value="${value}" />
        </div>`;
    }
  });
}

function renderJSONView(exif) {
  jsonView.textContent = JSON.stringify(exif, null, 2);
}

function updateExif() {
  const inputs = form.querySelectorAll("input[data-section]");
  inputs.forEach(input => {
    const section = input.dataset.section;
    const tag = input.dataset.tag;
    let value = input.value;

    // Attempt number parse, otherwise keep as string
    currentExif[section][tag] = isNaN(value) ? value : parseFloat(value);
  });

  const exifStr = piexif.dump(currentExif);
  const inserted = piexif.insert(exifStr, originalImage);
  downloadLink.href = inserted;
  downloadLink.style.display = "inline";
  renderJSONView(currentExif);
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
