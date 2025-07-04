const preview = document.getElementById("preview");
const mainUpload = document.getElementById("main-upload");
const metaUpload = document.getElementById("meta-upload");
const form = document.getElementById("metadata-form");
const jsonView = document.getElementById("json-view");
const scrambleBtn = document.getElementById("scramble");
const saveBtn = document.getElementById("save");

let originalDataURL = null;
let exifData = null;
let mapInitialized = false;
let mapInstance = null;
let mapMarker = null;

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
      exifData = exif;
    } catch (err) {
      alert("No metadata found in the image.");
      exifData = {};
    }

    renderForm();
    updateMapFromExif(exifData);
    jsonView.textContent = JSON.stringify(exifData, null, 2);
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
    Math.floor(Math.random() * 90), 0, 0
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
    exifData["GPS"][piexif.GPSIFD.GPSLatitude] = randomCoords();
    exifData["GPS"][piexif.GPSIFD.GPSLongitude] = randomCoords();
    exifData["GPS"][piexif.GPSIFD.GPSLatitudeRef] = "N";
    exifData["GPS"][piexif.GPSIFD.GPSLongitudeRef] = "E";
  }

  renderForm();
  updateMapFromExif(exifData);
  jsonView.textContent = JSON.stringify(exifData, null, 2);
}

function saveImage() {
  updateExifFromForm();
  const exifStr = piexif.dump(exifData);
  const newDataUrl = piexif.insert(exifStr, originalDataURL);
  const link = document.createElement('a');
  link.href = newDataUrl;
  link.download = 'updated.jpg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function updateMapFromExif(exif) {
  const lat = exif?.GPS?.[piexif.GPSIFD.GPSLatitude];
  const lon = exif?.GPS?.[piexif.GPSIFD.GPSLongitude];
  const latRef = exif?.GPS?.[piexif.GPSIFD.GPSLatitudeRef];
  const lonRef = exif?.GPS?.[piexif.GPSIFD.GPSLongitudeRef];

  if (!lat || !lon) return;

  const toDecimal = ([deg, min, sec], ref) => {
    let val = deg + min / 60 + sec / 3600;
    if (ref === "S" || ref === "W") val *= -1;
    return val;
  };

  const toExifFormat = (decimal) => {
    const deg = Math.floor(Math.abs(decimal));
    const minFloat = (Math.abs(decimal) - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.round((minFloat - min) * 60 * 100) / 100;
    return [deg, min, sec];
  };

  const latitude = toDecimal(lat, latRef);
  const longitude = toDecimal(lon, lonRef);

  if (!mapInitialized) {
    mapInstance = L.map('map').setView([latitude, longitude], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);
    mapInitialized = true;
  }

  if (mapMarker) mapInstance.removeLayer(mapMarker);
  mapMarker = L.marker([latitude, longitude], { draggable: true }).addTo(mapInstance)
    .bindPopup("📍 Drag me to set new GPS")
    .openPopup();

  mapMarker.on('dragend', () => {
    const { lat, lng } = mapMarker.getLatLng();
    const latExif = toExifFormat(lat);
    const lonExif = toExifFormat(lng);

    exifData["GPS"] = {
      ...exifData["GPS"],
      [piexif.GPSIFD.GPSLatitude]: latExif,
      [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? "N" : "S",
      [piexif.GPSIFD.GPSLongitude]: lonExif,
      [piexif.GPSIFD.GPSLongitudeRef]: lng >= 0 ? "E" : "W",
    };

    renderForm();
    jsonView.textContent = JSON.stringify(exifData, null, 2);
  });

  mapInstance.setView([latitude, longitude], 10);
}

mainUpload.addEventListener("change", e => {
  if (e.target.files.length) {
    loadImage(e.target.files[0]);
  }
});

metaUpload.addEventListener("change", e => {
  if (e.target.files.length) {
    loadImage(e.target.files[0], true); // Replace metadata only
  }
});

scrambleBtn.addEventListener("click", scrambleMetadata);
saveBtn.addEventListener("click", saveImage);
