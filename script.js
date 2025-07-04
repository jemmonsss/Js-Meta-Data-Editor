const upload = document.getElementById("upload");
const preview = document.getElementById("preview");
const form = document.getElementById("form");
const jsonView = document.getElementById("json");
const downloadLink = document.getElementById("download");
const randomBtn = document.getElementById("random");
const saveBtn = document.getElementById("save");

let originalImage = null;
let exifData = null;

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    originalImage = e.target.result;
    preview.src = originalImage;

    try {
      exifData = piexif.load(originalImage);
      renderForm(exifData);
      jsonView.textContent = JSON.stringify(exifData, null, 2);
    } catch {
      form.innerHTML = "<p>No EXIF metadata found.</p>";
      jsonView.textContent = "{}";
    }
  };
  reader.readAsDataURL(file);
}

function renderForm(exif) {
  form.innerHTML = "";
  for (let section in exif) {
    const tags = exif[section];
    if (!tags || typeof tags !== "object") continue;

    const sectionTitle = document.createElement("h4");
    sectionTitle.textContent = section;
    form.appendChild(sectionTitle);

    for (let tag in tags) {
      const label = piexif.TAGS[section]?.[tag]?.name || `Tag ${tag}`;
      const value = tags[tag];

      const div = document.createElement("div");
      div.className = "entry";

      const lbl = document.createElement("label");
      lbl.textContent = `${label} (${section}:${tag})`;

      const input = document.createElement("input");
      input.value = Array.isArray(value) ? value.join(",") : value;
      input.dataset.section = section;
      input.dataset.tag = tag;

      div.appendChild(lbl);
      div.appendChild(input);
      form.appendChild(div);
    }
  }
}

function updateExif() {
  const inputs = form.querySelectorAll("input[data-section]");
  inputs.forEach(input => {
    const section = input.dataset.section;
    const tag = input.dataset.tag;
    const rawValue = input.value;

    let value;
    if (rawValue.includes(",")) {
      value = rawValue.split(",").map(v => parseFloat(v.trim()));
    } else if (!isNaN(rawValue)) {
      value = parseFloat(rawValue);
    } else {
      value = rawValue;
    }

    exifData[section][tag] = value;
  });

  const newExifStr = piexif.dump(exifData);
  const updatedImage = piexif.insert(newExifStr, originalImage);

  downloadLink.href = updatedImage;
  jsonView.textContent = JSON.stringify(exifData, null, 2);
  downloadLink.style.display = "inline-block";
}

upload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) loadImage(file);
});

randomBtn.addEventListener("click", async () => {
  const res = await fetch("https://source.unsplash.com/random/800x600");
  const blob = await res.blob();
  const file = new File([blob], "random.jpg", { type: "image/jpeg" });
  loadImage(file);
});

saveBtn.addEventListener("click", updateExif);
