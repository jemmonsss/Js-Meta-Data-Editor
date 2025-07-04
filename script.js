const preview = document.getElementById("preview");
const mainUpload = document.getElementById("main-upload");
const metaUpload = document.getElementById("meta-upload");
const form = document.getElementById("metadata-form");
const jsonView = document.getElementById("json-view");
const downloadLink = document.getElementById("download-link");
const scrambleBtn = document.getElementById("scramble");
const saveBtn = document.getElementById("save");

let originalDataURL = null;
let exifData = null;

function loadImage(file, replaceMetaOnly = false) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const base64 = e.target.result;

    if (!replaceMetaOnly) {
      preview.src = base64;
      originalDataURL = base64;
    }

    try {
      const exif = piexif.load(base64);
      if (replaceMetaOnly) {
        exifData = exif;
        renderForm();
        jsonView.textContent = JSON.stringify(exifData, null, 2);
      } else {
        exifData = exif;
        renderForm();
        jsonView.textContent = JSON.stringify(exifData, null, 2);
      }
    } catch (err) {
      alert("No metadata found in the image.");
      exifData = {};
      renderForm();
      jsonView.textContent = "{}";
    }
  };
  reader.readAsDataURL(file);
}

function renderForm() {
  form.innerHTML = "";
  for (let section in exifData) {
    if (!exifData[section]) continue;

    const sectionTitle = document.createElement("h4");
    sectionTitle.textContent = section.toUpperCase();
    form.appendChild(sectionTitle);

    for (let tag in exifData[section]) {
      const name = piexif.TAGS[section]?.[tag]?.name || `Tag ${tag}`;
      const val = exifData[section][tag];

      const wrapper = document.createElement("div");
      wrapper.className = "entry";

      const label = document.createElement("label");
      label.textContent = `${name} (${tag})`;

      const input = document.createElement("input");
      input.dataset.section = section;
      input.dataset.tag = tag;
      input.value = Array.isArray(val) ? val.join(",") : val;

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      form.appendChild(wrapper);
    }
  }
}

function updateExifFromForm() {
  const inputs = form.querySelectorAll("input");
  inputs.forEach(input => {
    const section = input.dataset.section;
    const tag = input.dataset.tag;
    const raw = input.value;

    let val;
    if (raw.includes(",")) {
      val = raw.split(",").map(v => parseFloat(v.trim()));
    } else if (!isNaN(raw)) {
      val = parseFloat(raw);
    } else {
      val = raw;
    }

    exifData[section][tag] = val;
  });
}

function scrambleMetadata() {
  if (!exifData) return;
  const now = new Date();

  const randomCoords = () => [
    Math.random() * 90, // latitude
    Math.random() * 180 // longitude
  ];

  const randomStr = () => Math.random().toString(36).substring(2, 12);

  if (exifData["0th"]) {
    exifData["0th"][piexif.ImageIFD.Make] = randomStr();
    exifData["0th"][piexif.ImageIFD.Model] = randomStr();
    exifData["0th"][piexif.ImageIFD.Software] = "ScrambledTool v1";
  }

  if (exifData["Exif"]) {
    exifData["Exif"][piexif.ExifIFD.DateTimeOriginal] = now.toISOString();
    exifData["Exif"][piexif.ExifIFD.LensMake] = randomStr();
  }

  if (exifData["GPS"]) {
    exifData["GPS"][piexif.GPSIFD.GPSLatitude] = [randomCoords()[0], 0, 0];
    exifData["GPS"][piexif.GPSIFD.GPSLongitude] = [randomCoords()[1], 0, 0];
  }

  renderForm();
  jsonView.textContent = JSON.stringify(exifData, null, 2);
}

function saveImage() {
  updateExifFromForm();
  const exifStr = piexif.dump(exifData);
  const newDataUrl = piexif.insert(exifStr, originalDataURL);
  downloadLink.href = newDataUrl;
  jsonView.textContent = JSON.stringify(exifData, null, 2);
}

mainUpload.addEventListener("change", e => {
  if (e.target.files.length) {
    loadImage(e.target.files[0]);
  }
});

metaUpload.addEventListener("change", e => {
  if (e.target.files.length) {
    loadImage(e.target.files[0], true); // Only replace metadata
  }
});

scrambleBtn.addEventListener("click", scrambleMetadata);
saveBtn.addEventListener("click", saveImage);
