const DEFAULTS = {
  displayMode: "both",
  placement: "button",
  gdpSizing: false,
  tierMode: "builtin",
  customTiersText: "",
  customTiers: { map: {}, defaultScale: 1 },
};
const GROUPS = { mode: "displayMode", placement: "placement", tiermode: "tierMode" };

function flashStatus(text) {
  const status = document.getElementById("status");
  status.textContent = text;
  setTimeout(() => (status.textContent = ""), 2000);
}

function toggleEditor() {
  const custom = document.querySelector('input[name="tiermode"][value="custom"]');
  document.getElementById("customEditor").style.display = custom.checked
    ? "block"
    : "none";
}

chrome.storage.sync.get(DEFAULTS, (settings) => {
  for (const [group, key] of Object.entries(GROUPS)) {
    const input =
      document.querySelector(`input[name="${group}"][value="${settings[key]}"]`) ||
      document.querySelector(`input[name="${group}"][value="${DEFAULTS[key]}"]`);
    input.checked = true;
  }
  document.getElementById("gdpSizing").checked = Boolean(settings.gdpSizing);
  document.getElementById("customTiers").value = settings.customTiersText;
  document.getElementById("defaultScale").value =
    settings.customTiers.defaultScale ?? 1;
  toggleEditor();
});

for (const [group, key] of Object.entries(GROUPS)) {
  for (const input of document.querySelectorAll(`input[name="${group}"]`)) {
    input.addEventListener("change", () => {
      chrome.storage.sync.set({ [key]: input.value }, () =>
        flashStatus("Saved — applies to open tabs immediately")
      );
      if (group === "tiermode") toggleEditor();
    });
  }
}

document.getElementById("gdpSizing").addEventListener("change", (event) => {
  chrome.storage.sync.set({ gdpSizing: event.target.checked }, () =>
    flashStatus("Saved — applies to open tabs immediately")
  );
});

// Parse "scale: country, country, ..." lines into { ISO -> scale }.
// Countries accepted as ISO codes ("US") or names ("Germany", "Ivory Coast").
function parseCustomTiers(text) {
  const map = {};
  const errors = [];
  for (const [index, rawLine] of text.split("\n").entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      errors.push(`line ${index + 1}: expected "size: countries"`);
      continue;
    }
    const scale = parseFloat(line.slice(0, colon));
    if (!Number.isFinite(scale) || scale < 0.3 || scale > 3) {
      errors.push(`line ${index + 1}: size must be a number 0.3–3`);
      continue;
    }
    for (const raw of line.slice(colon + 1).split(",")) {
      const entry = raw.trim();
      if (!entry) continue;
      let code = null;
      if (/^[A-Za-z]{2}$/.test(entry)) {
        code = entry.toUpperCase();
      } else {
        const resolved = tcbCountryFromLocation(entry);
        if (resolved) code = resolved.code;
      }
      if (!code) {
        errors.push(`line ${index + 1}: unknown country "${entry}"`);
        continue;
      }
      map[code] = scale;
    }
  }
  return { map, errors };
}

document.getElementById("saveCustom").addEventListener("click", () => {
  const text = document.getElementById("customTiers").value;
  const defaultScale = parseFloat(document.getElementById("defaultScale").value);
  const errorBox = document.getElementById("customError");
  const { map, errors } = parseCustomTiers(text);
  if (!Number.isFinite(defaultScale) || defaultScale < 0.3 || defaultScale > 3) {
    errors.push("default size must be a number 0.3–3");
  }
  if (errors.length > 0) {
    errorBox.textContent = errors.join(" · ");
    return;
  }
  errorBox.textContent = "";
  chrome.storage.sync.set(
    {
      customTiersText: text,
      customTiers: { map, defaultScale },
      tierMode: "custom",
    },
    () =>
      flashStatus(
        `Saved ${Object.keys(map).length} countries — applies immediately`
      )
  );
});
