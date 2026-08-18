const THRESHOLD = 18;
const CLP = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const PESOS = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const SIMULATIONS_KEY = "estimadorMcSimulaciones";
const MIN_TYPOLOGY_COST_UF_VIV = 100;
const LOCAL_COMERCIAL_LABEL = "Local comercial";
const LOCAL_COMERCIAL_MIN_UF = 850;
const LOCAL_COMERCIAL_MAX_UF = 1100;
const LOCAL_COMERCIAL_MEDIAN_UF = (LOCAL_COMERCIAL_MIN_UF + LOCAL_COMERCIAL_MAX_UF) / 2;
const BASE_CORE_HISTORICAL_FACTOR = 1.025;

const projectNumericFields = [
  "ID_Proyecto",
  "AÃ±o",
  "Año",
  "Casas",
  "Departamentos",
  "Total_Viv",
  "Costo_Construccion_UF",
  "Urbanizacion_UF",
  "Gastos_Generales_UF",
  "Costo_Total_UF",
  "Gastos_Financieros_UF",
  "Instalacion_Faenas_UF",
  "Honorarios_UF",
  "Derechos_Permisos_UF",
  "Gastos_Legales_UF",
  "Maquinaria_Equipos_UF",
  "Valor_Terreno_UF",
  "Terreno_m2",
  "Presupuesto_Financiado",
  "Margen_UF",
  "Margen_Porc",
  "Margen_UF_VIV",
  "Ingresos_Total_UF_Estimado",
  "Costo_Construccion_UF_por_viv",
  "Urbanizacion_UF_por_viv",
  "Gastos_Generales_UF_por_viv",
  "Costo_Total_UF_por_viv",
  "Gastos_Financieros_UF_por_viv",
  "Instalacion_Faenas_UF_por_viv",
  "Honorarios_UF_por_viv",
  "Derechos_Permisos_UF_por_viv",
  "Gastos_Legales_UF_por_viv",
  "Maquinaria_Equipos_UF_por_viv",
  "Valor_Terreno_UF_por_viv",
  "Margen_UF_por_viv",
  "Ingresos_Total_UF_Estimado_por_viv",
  "Terreno_m2_por_viv",
  "Valor_Terreno_UF_m2",
];

const statKeys = [
  "Costo_Construccion_UF_por_viv",
  "Urbanizacion_UF_por_viv",
  "Gastos_Generales_UF_por_viv",
  "Costo_Total_UF_por_viv",
  "Gastos_Financieros_UF_por_viv",
  "Instalacion_Faenas_UF_por_viv",
  "Honorarios_UF_por_viv",
  "Derechos_Permisos_UF_por_viv",
  "Gastos_Legales_UF_por_viv",
  "Maquinaria_Equipos_UF_por_viv",
  "Valor_Terreno_UF_por_viv",
  "Margen_UF_por_viv",
  "Ingresos_Total_UF_Estimado_por_viv",
  "Terreno_m2_por_viv",
  "Valor_Terreno_UF_m2",
];

const baseFields = [
  "projectName",
  "projectComments",
  "region",
  "comuna",
  "tipoProyecto",
  "tipoViv",
  "ufActualClp",
  "totalViv",
  "casas",
  "departamentos",
  "terrenoM2",
  "valorTerrenoUf",
  "valorTerrenoUfM2",
  "cuentaTUf",
  "presupuestoFinanciadoUf",
  "ivaConstruccionUf",
  "creditoEspecialUf",
  "utilidadConstructoraPct",
  "ivaDebitoFiscalUf",
  "credito65Uf",
  "costoConstruccionUf",
  "instalacionFaenasUf",
  "urbanizacionUf",
  "gastosGeneralesUf",
  "gastosFinancierosUf",
  "ajusteHistoricoPct",
  "imprevistoUf",
  "imprevistoPct",
  "maquinariaEquiposUf",
  "gastosLegalesUf",
  "honorariosUf",
  "derechosPermisosUf",
  "eventualidadesUf",
  "activacionesUf",
  "descargaCuentaUUf",
];

let db;
let baseDb;
let lastLandEdited = null;
let syncingLandFields = false;
let originalDocumentTitle = document.title;

const $ = (id) => document.getElementById(id);

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTypologyLabel(value) {
  return slug(value) === "sin asignar" ? LOCAL_COMERCIAL_LABEL : value;
}

function num(value) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inputNum(id) {
  const input = $(id);
  if (input?.dataset.auto === "true") return null;
  return num(input?.value);
}

function uf(value) {
  if (!Number.isFinite(value)) return "--";
  return `${CLP.format(Math.round(value))} UF`;
}

function pct(value) {
  if (!Number.isFinite(value)) return "--";
  return `${PCT.format(value)}%`;
}

function fillSelect(id, values, includeBlank = false) {
  const select = $(id);
  select.innerHTML = "";
  if (includeBlank) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sin definir";
    select.appendChild(option);
  }
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function visibleProjectTypes() {
  return db.options.tiposProyecto.filter((type) => slug(type) !== "inmb");
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function numberFromImport(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim().replace(/\s+/g, "");
  const normalized = text.includes(",") && !text.includes(".") ? text.replace(",", ".") : text.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalHeader(value) {
  return slug(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function getImportedValue(row, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  }
  const lookup = Object.fromEntries(Object.keys(row).map((key) => [canonicalHeader(key), row[key]]));
  for (const name of names) {
    const value = lookup[canonicalHeader(name)];
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizeImportedProject(row, index = 0) {
  const project = {
    ...row,
    ID_Proyecto: numberFromImport(getImportedValue(row, ["ID_Proyecto", "id_proyecto", "id"])) ?? `importado-${Date.now()}-${index}`,
    Proyecto: getImportedValue(row, ["Proyecto", "nombre_proyecto", "Nombre Proyecto", "projectName"]) || `Proyecto importado ${index + 1}`,
    Region: getImportedValue(row, ["Region", "Región"]) || "",
    Comuna: getImportedValue(row, ["Comuna"]) || "",
    Tipo_Proyecto: getImportedValue(row, ["Tipo_Proyecto", "Tipo Proyecto", "tipo"]) || "",
    Tipo_Viv: getImportedValue(row, ["Tipo_Viv", "Tipo Vivienda", "tipo_vivienda"]) || "",
  };

  projectNumericFields.forEach((field) => {
    const imported = numberFromImport(getImportedValue(row, [field]));
    if (Number.isFinite(imported)) project[field === "Año" ? "AÃ±o" : field] = imported;
  });

  const optionalCostAliases = [
    ["Instalacion_Faenas_UF", ["Instalacion_Faenas_UF", "Instalacion de faenas UF", "Instalaciones de Faenas UF", "IIFF_UF"]],
    ["Honorarios_UF", ["Honorarios_UF", "Honorarios UF"]],
    ["Derechos_Permisos_UF", ["Derechos_Permisos_UF", "Derechos y permisos UF", "Derechos_Permisos"]],
    ["Gastos_Legales_UF", ["Gastos_Legales_UF", "Gastos legales UF", "Gastos de ventas UF"]],
    ["Maquinaria_Equipos_UF", ["Maquinaria_Equipos_UF", "Maquinaria/equipos/implementos UF", "Maquinaria UF"]],
  ];
  optionalCostAliases.forEach(([field, aliases]) => {
    const imported = numberFromImport(getImportedValue(row, aliases));
    if (Number.isFinite(imported)) project[field] = imported;
  });

  const totalViv = Number(project.Total_Viv || 0);
  const safePerViv = (total, current) => (Number.isFinite(Number(current)) ? Number(current) : totalViv ? Number(total || 0) / totalViv : 0);
  project.Costo_Construccion_UF_por_viv = safePerViv(project.Costo_Construccion_UF, project.Costo_Construccion_UF_por_viv);
  project.Urbanizacion_UF_por_viv = safePerViv(project.Urbanizacion_UF, project.Urbanizacion_UF_por_viv);
  project.Gastos_Generales_UF_por_viv = safePerViv(project.Gastos_Generales_UF, project.Gastos_Generales_UF_por_viv);
  project.Costo_Total_UF_por_viv = safePerViv(project.Costo_Total_UF, project.Costo_Total_UF_por_viv);
  project.Gastos_Financieros_UF_por_viv = safePerViv(project.Gastos_Financieros_UF, project.Gastos_Financieros_UF_por_viv);
  project.Instalacion_Faenas_UF_por_viv = safePerViv(project.Instalacion_Faenas_UF, project.Instalacion_Faenas_UF_por_viv);
  project.Honorarios_UF_por_viv = safePerViv(project.Honorarios_UF, project.Honorarios_UF_por_viv);
  project.Derechos_Permisos_UF_por_viv = safePerViv(project.Derechos_Permisos_UF, project.Derechos_Permisos_UF_por_viv);
  project.Gastos_Legales_UF_por_viv = safePerViv(project.Gastos_Legales_UF, project.Gastos_Legales_UF_por_viv);
  project.Maquinaria_Equipos_UF_por_viv = safePerViv(project.Maquinaria_Equipos_UF, project.Maquinaria_Equipos_UF_por_viv);
  project.Valor_Terreno_UF_por_viv = safePerViv(project.Valor_Terreno_UF, project.Valor_Terreno_UF_por_viv);
  project.Margen_UF_por_viv = safePerViv(project.Margen_UF, project.Margen_UF_por_viv);
  project.Ingresos_Total_UF_Estimado_por_viv = safePerViv(project.Ingresos_Total_UF_Estimado, project.Ingresos_Total_UF_Estimado_por_viv);
  project.Terreno_m2_por_viv = safePerViv(project.Terreno_m2, project.Terreno_m2_por_viv);
  project.Valor_Terreno_UF_m2 =
    Number.isFinite(Number(project.Valor_Terreno_UF_m2)) && Number(project.Valor_Terreno_UF_m2) > 0
      ? Number(project.Valor_Terreno_UF_m2)
      : Number(project.Terreno_m2) > 0
        ? Number(project.Valor_Terreno_UF || 0) / Number(project.Terreno_m2)
        : 0;

  project._region_key = slug(project.Region);
  project._comuna_key = slug(project.Comuna);
  project._tipo_proyecto_key = slug(project.Tipo_Proyecto);
  project._tipo_viv_key = slug(project.Tipo_Viv);
  project._imported = true;
  return project;
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function parseHistoricalProjects(text, filename = "") {
  const trimmed = text.trim();
  const parsed = filename.toLowerCase().endsWith(".csv") ? parseCsv(text) : JSON.parse(trimmed);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.projects) ? parsed.projects : [];
  return rows.map(normalizeImportedProject).filter((project) => project.Proyecto && project.Tipo_Proyecto);
}

function rebuildDbOptions() {
  db.options = {
    ...db.options,
    regions: [...new Set(db.projects.map((project) => project.Region).filter(Boolean))].sort(),
    comunas: [...new Set(db.projects.map((project) => project.Comuna).filter(Boolean))].sort(),
    tiposProyecto: [...new Set(db.projects.map((project) => project.Tipo_Proyecto).filter(Boolean))].sort(),
    tiposViv: [...new Set(db.projects.map((project) => project.Tipo_Viv).filter(Boolean))].sort(),
  };
  db.stats = db.stats || {};
  db.stats.global = Object.fromEntries(statKeys.map((key) => [key, { median: median(db.projects.map((project) => Number(project[key]))) || 0 }]));
}

function mergeImportedProjects(projects) {
  const byKey = new Map(db.projects.map((project) => [String(project.ID_Proyecto ?? `${project.Proyecto}-${project.Comuna}-${project.Tipo_Proyecto}`), project]));
  projects.forEach((project) => {
    byKey.set(String(project.ID_Proyecto ?? `${project.Proyecto}-${project.Comuna}-${project.Tipo_Proyecto}`), project);
  });
  db.projects = [...byKey.values()];
  rebuildDbOptions();
}

function regionComunas(region) {
  const regionKey = slug(region);
  return [
    ...new Set(
      db.projects
        .filter((p) => (p._region_key || slug(p.Region)) === regionKey)
        .map((p) => p.Comuna)
        .filter(Boolean),
    ),
  ].sort();
}

function syncComunas() {
  const current = $("comuna").value;
  const comunas = regionComunas($("region").value);
  fillSelect("comuna", comunas, true);
  $("comuna").value = comunas.includes(current) ? current : comunas.length === 1 ? comunas[0] : "";
}

function syncHousingFields() {
  const tipo = slug($("tipoViv").value);
  const isMixed = tipo === "mixto";
  $("total-viv-field").classList.toggle("hidden", isMixed);
  $("casas-field").classList.toggle("hidden", !isMixed);
  $("departamentos-field").classList.toggle("hidden", !isMixed);
}

function isDS49() {
  return slug($("tipoProyecto").value) === "ds49";
}

function isDS19() {
  return slug($("tipoProyecto").value) === "ds19";
}

function isINMB() {
  return slug($("tipoProyecto").value) === "inmb";
}

function syncProjectTypeFields() {
  const ds49 = isDS49();
  const ds19 = isDS19();
  const inmb = isINMB();
  $("presupuesto-financiado-field").classList.toggle("hidden", !ds49);
  $("iva-construccion-field").classList.toggle("hidden", !(ds49 || ds19 || inmb));
  $("credito-especial-field").classList.toggle("hidden", !ds19);
  $("utilidad-constructora-field").classList.toggle("hidden", !inmb);
  $("iva-debito-field").classList.toggle("hidden", !inmb);
  $("credito-65-field").classList.toggle("hidden", !inmb);
  $("typology-section").classList.toggle("hidden", ds49);
}

function syncLandFields(changedField) {
  if (syncingLandFields) return;
  syncingLandFields = true;
  const previousLandEdited = lastLandEdited;
  if (changedField !== "terrenoM2") lastLandEdited = changedField;

  const terrenoM2 = num($("terrenoM2").value);
  const landUf = num($("valorTerrenoUf").value);
  const landUfM2 = num($("valorTerrenoUfM2").value);

  if (Number.isFinite(terrenoM2) && terrenoM2 > 0) {
    if (changedField === "valorTerrenoUfM2" && Number.isFinite(landUfM2)) {
      $("valorTerrenoUf").value = Math.round(landUfM2 * terrenoM2);
    }

    if (changedField === "valorTerrenoUf" && Number.isFinite(landUf)) {
      $("valorTerrenoUfM2").value = (landUf / terrenoM2).toFixed(4);
    }

    if (changedField === "terrenoM2") {
      if (previousLandEdited === "valorTerrenoUfM2" && Number.isFinite(landUfM2)) {
        $("valorTerrenoUf").value = Math.round(landUfM2 * terrenoM2);
      } else if (Number.isFinite(landUf)) {
        $("valorTerrenoUfM2").value = (landUf / terrenoM2).toFixed(4);
      }
    }
  }

  syncingLandFields = false;
}

function setUfStatus(message, tone = "") {
  const status = $("uf-status");
  status.textContent = message;
  status.className = tone;
}

function setAutoAmount(id, value) {
  const input = $(id);
  if (!input) return;
  if (document.activeElement === input && input.dataset.auto !== "true") return;
  if (input.value === "" || input.dataset.auto === "true") {
    input.value = Number.isFinite(value) ? String(Math.round(value)) : "";
    input.dataset.auto = "true";
  }
}

async function updateUfFromApi({ silent = false } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  if (!silent) setUfStatus("Actualizando UF...");

  try {
    const { value, date } = await fetchUfValue(controller.signal);
    $("ufActualClp").value = value.toFixed(2);
    localStorage.setItem("estimadorMcUfActualClp", String(value));
    setUfStatus(`UF actualizada${date ? ` al ${date.toLocaleDateString("es-CL")}` : ""}: ${PESOS.format(value)}`, "ok");
    recalculate();
  } catch (error) {
    if (!silent) setUfStatus("No se pudo actualizar. Ingresa la UF manualmente.", "warn");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchUfValue(signal) {
  const estimatorProxy = "https://estimador-mc-inmobiliario.chelotrc.chatgpt.site/api/uf";
  const mindicadorDaily = "https://mindicador.cl/api";
  const mindicadorUf = "https://mindicador.cl/api/uf";
  const sources = [
    "data/uf-cache.json",
    estimatorProxy,
    mindicadorDaily,
    mindicadorUf,
    `https://api.allorigins.win/get?url=${encodeURIComponent(mindicadorDaily)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(mindicadorUf)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(mindicadorDaily)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(mindicadorUf)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(mindicadorDaily)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(mindicadorUf)}`,
  ];

  let lastError;
  for (const source of sources) {
    try {
      const response = await fetch(source, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Respuesta no disponible");
      const data = await response.json();
      const parsed = parseUfPayload(data);
      if (Number.isFinite(parsed.value)) return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("UF no encontrada");
}

function parseUfPayload(data) {
  if (typeof data?.contents === "string") {
    try {
      return parseUfPayload(JSON.parse(data.contents));
    } catch (error) {
      return { value: null, date: null };
    }
  }

  const proxyValue = Number(data?.value);
  if (Number.isFinite(proxyValue)) {
    return {
      value: proxyValue,
      date: data?.date ? new Date(data.date) : null,
    };
  }

  const directValue = Number(data?.uf?.valor);
  if (Number.isFinite(directValue)) {
    return {
      value: directValue,
      date: data?.uf?.fecha ? new Date(data.uf.fecha) : data?.fecha ? new Date(data.fecha) : null,
    };
  }

  const serieValue = Number(data?.serie?.[0]?.valor);
  if (Number.isFinite(serieValue)) {
    return {
      value: serieValue,
      date: data?.serie?.[0]?.fecha ? new Date(data.serie[0].fecha) : null,
    };
  }

  return { value: null, date: null };
}

function typologyOptions(selected = "") {
  const normalizedSelected = normalizeTypologyLabel(selected);
  const tipologias = [...new Set([...(db.options.tipologias || []).map(normalizeTypologyLabel), LOCAL_COMERCIAL_LABEL])].sort();
  const options = [`<option value="">Sin definir</option>`]
    .concat(
      tipologias.map(
        (tipologia) => `<option value="${tipologia}" ${tipologia === normalizedSelected ? "selected" : ""}>${tipologia}</option>`,
      ),
    )
    .join("");
  return options;
}

function addTypologyRow(data = {}) {
  const row = document.createElement("div");
  row.className = "typology-row";
  row.innerHTML = `
    <select class="typology-name">${typologyOptions(data.tipologia || "")}</select>
    <input class="typology-qty" type="number" min="0" step="1" value="${data.cantidad ?? ""}" placeholder="0" />
    <input class="typology-price" type="number" min="0" step="1" value="${data.precio ?? ""}" placeholder="Historico" />
    <button class="icon-button" type="button" title="Eliminar tipologia">×</button>
  `;
  row.querySelector(".icon-button").addEventListener("click", () => {
    row.remove();
    ensureOneTypologyRow();
    recalculate();
  });
  row.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", recalculate);
    control.addEventListener("change", recalculate);
  });
  $("typology-rows").appendChild(row);
}

function ensureOneTypologyRow() {
  if (!$("typology-rows").children.length) addTypologyRow({ cantidad: effectiveTotalViv(), precio: "" });
}

function readTypologies() {
  return [...document.querySelectorAll(".typology-row")]
    .map((row) => {
      const tipologia = normalizeTypologyLabel(row.querySelector(".typology-name").value);
      return {
        tipologia,
        tipologiaKey: slug(tipologia),
        cantidad: num(row.querySelector(".typology-qty").value) || 0,
        precio: num(row.querySelector(".typology-price").value),
      };
    })
    .filter((row) => row.cantidad > 0 || row.tipologia || Number.isFinite(row.precio));
}

function effectiveTotalViv() {
  if (slug($("tipoViv").value) === "mixto") {
    return Math.max(1, (num($("casas").value) || 0) + (num($("departamentos").value) || 0));
  }
  return Math.max(1, num($("totalViv").value) || 1);
}

function scoreProject(project, input) {
  let score = 0;
  if (project._tipo_proyecto_key === input.tipoProyectoKey) score += 48;
  if (input.comunaKey && project._comuna_key === input.comunaKey) score += 30;
  if (project._region_key === input.regionKey) score += 20;
  if (project._tipo_viv_key === input.tipoVivKey) score += 16;

  const viv = Number(project.Total_Viv || 0);
  if (viv && input.totalViv) {
    const distance = Math.abs(viv - input.totalViv) / Math.max(viv, input.totalViv);
    score += Math.max(0, 20 * (1 - distance));
  }

  return score;
}

function getPeers(input) {
  const withDistance = db.projects.map((project) => {
    const viv = Number(project.Total_Viv || 0);
    const distance = viv && input.totalViv ? Math.abs(viv - input.totalViv) / Math.max(viv, input.totalViv) : 1;
    return { project, score: scoreProject(project, input), distance };
  });
  const sameProjectType = withDistance.filter(({ project }) => project._tipo_proyecto_key === input.tipoProyectoKey);
  const candidatePool = sameProjectType.length ? sameProjectType : withDistance;

  const unique = [];
  const seen = new Set();
  const add = (items) => {
    items.forEach((item) => {
      const id = item.project.ID_Proyecto ?? item.project.Proyecto;
      if (!seen.has(id) && unique.length < 12) {
        seen.add(id);
        unique.push(item);
      }
    });
  };

  const bySizeThenScore = (a, b) => a.distance - b.distance || b.score - a.score;
  const byScoreThenSize = (a, b) => b.score - a.score || a.distance - b.distance;

  const sameCommuneType = candidatePool
    .filter(({ project }) => input.comunaKey && project._comuna_key === input.comunaKey && project._tipo_proyecto_key === input.tipoProyectoKey)
    .sort(bySizeThenScore);
  add(sameCommuneType);

  const sameRegionType = candidatePool
    .filter(({ project }) => project._region_key === input.regionKey && project._tipo_proyecto_key === input.tipoProyectoKey)
    .sort(bySizeThenScore);
  add(sameRegionType);

  const sameTypeBySize = candidatePool
    .filter(({ project }) => project._tipo_proyecto_key === input.tipoProyectoKey)
    .sort(bySizeThenScore);
  add(sameTypeBySize);

  const sameHousingRegion = candidatePool
    .filter(({ project }) => project._region_key === input.regionKey && project._tipo_viv_key === input.tipoVivKey)
    .sort(bySizeThenScore);
  add(sameHousingRegion);

  const scored = candidatePool.filter((item) => item.score > 20).sort(byScoreThenSize);
  add(scored);

  return unique;
}

function historicalBaseSummary(input, peers) {
  const sameType = peers.filter(({ project }) => project._tipo_proyecto_key === input.tipoProyectoKey);
  const sameCommune = sameType.filter(({ project }) => input.comunaKey && project._comuna_key === input.comunaKey);
  const sameRegion = sameType.filter(({ project }) => project._region_key === input.regionKey);
  const sizeClose = sameType.filter(({ distance }) => distance <= 0.25);

  if (sameCommune.length) {
    return `Base historica fuerte: misma comuna, ${sameCommune.length} proyectos del mismo tipo.`;
  }
  if (sameRegion.length) {
    return `Base historica media: misma region, ${sameRegion.length} proyectos del mismo tipo.`;
  }
  if (sizeClose.length) {
    return `Base historica referencial: mismo tipo y viviendas similares, ${sizeClose.length} proyectos.`;
  }
  if (sameType.length) {
    return `Base historica limitada: mismo tipo de proyecto, fuera de region.`;
  }
  return "Base historica limitada: se uso historico general como respaldo.";
}

function peerMedian(peers, key) {
  const peerValue = median(peers.map(({ project }) => Number(project[key])));
  if (Number.isFinite(peerValue)) return { value: peerValue, source: "similares" };
  const fallback = db.stats.global[key]?.median;
  return { value: Number(fallback || 0), source: "historico global" };
}

function peerCostMedian(peers, key) {
  const values = peers.map(({ project }) => Number(project[key])).filter((value) => Number.isFinite(value) && value > 0);
  const peerValue = median(values);
  if (Number.isFinite(peerValue)) return { value: peerValue, source: `similares (${values.length})`, count: values.length };

  const fallbackValues = db.projects.map((project) => Number(project[key])).filter((value) => Number.isFinite(value) && value > 0);
  const fallback = median(fallbackValues);
  return { value: Number(fallback || 0), source: `historico global (${fallbackValues.length})`, count: 0 };
}

function peerOptionalCost(peers, key, perVivKey, totalViv, historicalFactor = 1) {
  const perViv = median(peers.map(({ project }) => Number(project[perVivKey])).filter((value) => value > 0));
  if (Number.isFinite(perViv)) {
    return { value: perViv * totalViv * historicalFactor, source: adjustedSource("similares", historicalFactor) };
  }
  const total = median(peers.map(({ project }) => Number(project[key])).filter((value) => value > 0));
  if (Number.isFinite(total)) {
    return { value: total * historicalFactor, source: adjustedSource("similares", historicalFactor) };
  }
  const globalPerViv = Number(db.stats.global?.[perVivKey]?.median || 0);
  if (globalPerViv > 0) {
    return { value: globalPerViv * totalViv * historicalFactor, source: adjustedSource("historico global", historicalFactor) };
  }
  return { value: 0, source: "no ingresado" };
}

function peerFieldMedian(peers, key, filter = () => true) {
  const peerValue = median(peers.filter(({ project }) => filter(project)).map(({ project }) => Number(project[key])));
  if (Number.isFinite(peerValue)) return { value: peerValue, source: "similares" };
  const globalValue = median(db.projects.filter(filter).map((project) => Number(project[key])));
  return { value: Number(globalValue || 0), source: "historico global" };
}

function residualCostPerViv(peers) {
  const residuals = peers
    .map(({ project }) => {
      const total = Number(project.Costo_Total_UF_por_viv);
      const parts = [
        project.Costo_Construccion_UF_por_viv,
        project.Urbanizacion_UF_por_viv,
        project.Gastos_Generales_UF_por_viv,
        project.Gastos_Financieros_UF_por_viv,
        project.Valor_Terreno_UF_por_viv,
      ].map(Number);
      if (!Number.isFinite(total) || parts.some((value) => !Number.isFinite(value))) return null;
      return Math.max(0, total - parts.reduce((sum, value) => sum + value, 0));
    })
    .filter((value) => Number.isFinite(value));
  return median(residuals) ?? 0;
}

function typologyCostPerViv(row) {
  const cost = db.typologyStats[row.tipologiaKey]?.medianCostoUfViv;
  return Number.isFinite(cost) && cost >= MIN_TYPOLOGY_COST_UF_VIV ? cost : null;
}

function peerTypologyCostPerViv(row, peers) {
  if (!row.tipologiaKey || !Array.isArray(db.typologies)) return null;
  const peerIds = new Set(peers.map(({ project }) => String(project.ID_Proyecto ?? project.Proyecto)));
  const costs = db.typologies
    .filter((item) => peerIds.has(String(item.ID_Proyecto)) && slug(normalizeTypologyLabel(item.Tipologia)) === row.tipologiaKey)
    .map((item) => Number(item.Costo_UF_Viv))
    .filter((value) => Number.isFinite(value) && value >= MIN_TYPOLOGY_COST_UF_VIV);

  const cost = median(costs);
  return Number.isFinite(cost) ? { value: cost, source: `tipologias similares (${costs.length})` } : null;
}

function typologyCostInfo(row, peers) {
  const peerCost = peerTypologyCostPerViv(row, peers);
  if (peerCost) return peerCost;

  const generalCost = typologyCostPerViv(row);
  return Number.isFinite(generalCost) ? { value: generalCost, source: "tipologia historica general" } : null;
}

function peerWeightedTypologyCostPerViv(peers, filter = () => true) {
  if (!Array.isArray(db.typologies)) return null;
  const peerProjects = peers.filter(({ project }) => filter(project));
  const peerIds = new Set(peerProjects.map(({ project }) => String(project.ID_Proyecto ?? project.Proyecto)));
  const byProject = new Map();

  db.typologies
    .filter((item) => peerIds.has(String(item.ID_Proyecto)))
    .forEach((item) => {
      const cantidad = Number(item.Cantidad);
      const cost = Number(item.Costo_UF_Viv);
      if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(cost) || cost < MIN_TYPOLOGY_COST_UF_VIV) return;
      const id = String(item.ID_Proyecto);
      const current = byProject.get(id) || { quantity: 0, cost: 0 };
      current.quantity += cantidad;
      current.cost += cantidad * cost;
      byProject.set(id, current);
    });

  const costs = [...byProject.values()]
    .filter((item) => item.quantity > 0)
    .map((item) => item.cost / item.quantity);
  const cost = median(costs);
  return Number.isFinite(cost) ? { value: cost, source: `viviendas DS49 similares (${costs.length})` } : null;
}

function readInput() {
  const data = Object.fromEntries(baseFields.map((field) => [field, $(field).value]));
  const totalViv = effectiveTotalViv();
  return {
    ...data,
    regionKey: slug(data.region),
    comunaKey: slug(data.comuna),
    tipoProyectoKey: slug(data.tipoProyecto),
    tipoVivKey: slug(data.tipoViv),
    totalViv,
    casas: num(data.casas) || 0,
    departamentos: num(data.departamentos) || 0,
    ufActualClp: num(data.ufActualClp),
    terrenoM2: Math.max(1, num(data.terrenoM2) || 1),
    valorTerrenoUf: num(data.valorTerrenoUf),
    valorTerrenoUfM2: num(data.valorTerrenoUfM2),
    cuentaTUf: num(data.cuentaTUf),
    presupuestoFinanciadoUf: num(data.presupuestoFinanciadoUf),
    ivaConstruccionUf: inputNum("ivaConstruccionUf"),
    creditoEspecialUf: num(data.creditoEspecialUf),
    utilidadConstructoraPct: num(data.utilidadConstructoraPct),
    ivaDebitoFiscalUf: inputNum("ivaDebitoFiscalUf"),
    credito65Uf: num(data.credito65Uf),
    costoConstruccionUf: num(data.costoConstruccionUf),
    instalacionFaenasUf: num(data.instalacionFaenasUf),
    urbanizacionUf: num(data.urbanizacionUf),
    gastosGeneralesUf: num(data.gastosGeneralesUf),
    gastosFinancierosUf: num(data.gastosFinancierosUf),
    ajusteHistoricoPct: num(data.ajusteHistoricoPct),
    imprevistoUf: inputNum("imprevistoUf"),
    imprevistoPct: num(data.imprevistoPct),
    maquinariaEquiposUf: num(data.maquinariaEquiposUf),
    gastosLegalesUf: num(data.gastosLegalesUf),
    honorariosUf: num(data.honorariosUf),
    derechosPermisosUf: num(data.derechosPermisosUf),
    eventualidadesUf: num(data.eventualidadesUf),
    activacionesUf: num(data.activacionesUf),
    descargaCuentaUUf: num(data.descargaCuentaUUf),
    typologies: readTypologies(),
  };
}

function assumption(label, value, source) {
  return { label, value, source };
}

function calculateRevenue(input, peers, revenueMedian) {
  if (input.tipoProyectoKey === "ds49") {
    const peerBudgets = peers
      .filter(({ project }) => project._tipo_proyecto_key === "ds49")
      .map(({ project }) => Number(project.Presupuesto_Financiado) / Number(project.Total_Viv))
      .filter((value) => Number.isFinite(value) && value > 0);
    const globalBudgets = db.projects
      .filter((project) => project._tipo_proyecto_key === "ds49")
      .map((project) => Number(project.Presupuesto_Financiado) / Number(project.Total_Viv))
      .filter((value) => Number.isFinite(value) && value > 0);
    const historicalBudgetPerViv = median(peerBudgets) ?? median(globalBudgets) ?? 0;
    const budgetPerViv = input.presupuestoFinanciadoUf ?? historicalBudgetPerViv;
    const total = budgetPerViv * input.totalViv;
    return {
      rows: [],
      total,
      quantity: input.totalViv,
      budgetPerViv,
      source: Number.isFinite(input.presupuestoFinanciadoUf)
        ? "presupuesto UF/viv ingresado"
        : peerBudgets.length
          ? `presupuesto UF/viv historico (${peerBudgets.length})`
          : "presupuesto UF/viv historico global",
    };
  }

  const rows = input.typologies.length ? input.typologies : [{ cantidad: input.totalViv, precio: null, tipologia: "" }];
  const byTypology = rows.map((row) => {
    const localComercial = row.tipologiaKey === slug(LOCAL_COMERCIAL_LABEL);
    const price = row.precio ?? (localComercial ? LOCAL_COMERCIAL_MEDIAN_UF : revenueMedian.value);
    const source = Number.isFinite(row.precio)
      ? "ingresado"
      : localComercial
        ? `rango historico ${LOCAL_COMERCIAL_MIN_UF}-${LOCAL_COMERCIAL_MAX_UF} UF`
        : revenueMedian.source;
    return { ...row, price, revenue: price * row.cantidad, source };
  });
  return {
    rows: byTypology,
    total: byTypology.reduce((sum, row) => sum + row.revenue, 0),
    quantity: byTypology.reduce((sum, row) => sum + row.cantidad, 0),
  };
}

function adjustedSource(source, factor) {
  return factor === 1 ? source : `${source} + ajuste historico ${((factor - 1) * 100).toFixed(1)}%`;
}

function calculateConstruction(input, peers, constructionMedian, historicalFactor = 1, sourceFactor = historicalFactor) {
  if (Number.isFinite(input.costoConstruccionUf)) {
    return { value: input.costoConstruccionUf, source: "ingresado" };
  }

  if (input.tipoProyectoKey === "ds49" && !input.typologies.some((row) => row.cantidad > 0)) {
    const peerCost = peerWeightedTypologyCostPerViv(peers, (project) => project._tipo_proyecto_key === "ds49");
    if (peerCost) {
      return {
        value: peerCost.value * input.totalViv * historicalFactor,
        source: adjustedSource(peerCost.source, sourceFactor),
      };
    }
  }

  const rowsWithCost = input.typologies
    .map((row) => {
      const cost = typologyCostInfo(row, peers);
      return cost && row.cantidad > 0 ? { value: cost.value * row.cantidad, source: cost.source } : null;
    })
    .filter(Boolean);

  if (rowsWithCost.length && rowsWithCost.length === input.typologies.filter((row) => row.cantidad > 0).length) {
    const source = rowsWithCost.some((row) => row.source.startsWith("tipologias similares"))
      ? "tipologias de proyectos similares"
      : "tipologias historicas generales";
    return {
      value: rowsWithCost.reduce((sum, row) => sum + row.value, 0) * historicalFactor,
      source: adjustedSource(source, sourceFactor),
    };
  }

  return {
    value: constructionMedian.value * input.totalViv * historicalFactor,
    source: adjustedSource(constructionMedian.source, sourceFactor),
  };
}

function calculate() {
  const input = readInput();
  const inmb = input.tipoProyectoKey === "inmb";
  const peers = getPeers(input);
  const peerSet = peers.length ? peers : db.projects.map((project) => ({ project, score: 0 })).slice(0, 12);

  const revenueMedian = peerMedian(peerSet, "Ingresos_Total_UF_Estimado_por_viv");
  const constructionMedian = peerCostMedian(peerSet, "Costo_Construccion_UF_por_viv");
  const urbanMedian = peerCostMedian(peerSet, "Urbanizacion_UF_por_viv");
  const ggMedian = peerCostMedian(peerSet, "Gastos_Generales_UF_por_viv");
  const financeMedian = peerCostMedian(peerSet, "Gastos_Financieros_UF_por_viv");
  const landUfM2Median = peerCostMedian(peerSet, "Valor_Terreno_UF_m2");
  const historicalFactor = 1 + Math.max(0, Number.isFinite(input.ajusteHistoricoPct) ? input.ajusteHistoricoPct : 1.5) / 100;
  const coreHistoricalFactor = BASE_CORE_HISTORICAL_FACTOR * historicalFactor;

  const revenue = calculateRevenue(input, peerSet, revenueMedian);
  const construction = calculateConstruction(input, peerSet, constructionMedian, coreHistoricalFactor, historicalFactor);
  const siteSetupHistorical = peerOptionalCost(peerSet, "Instalacion_Faenas_UF", "Instalacion_Faenas_UF_por_viv", input.totalViv, historicalFactor);
  const siteSetup = {
    value: input.instalacionFaenasUf ?? siteSetupHistorical.value,
    source: Number.isFinite(input.instalacionFaenasUf) ? "ingresado" : siteSetupHistorical.source,
  };
  const urban = {
    value: input.urbanizacionUf ?? urbanMedian.value * input.totalViv * coreHistoricalFactor,
    source: Number.isFinite(input.urbanizacionUf) ? "ingresado" : adjustedSource(urbanMedian.source, historicalFactor),
  };
  const activations = {
    value: input.activacionesUf ?? 0,
    source: Number.isFinite(input.activacionesUf) ? "ingresado" : "no ingresado",
  };
  const urbanNet = {
    value: Math.max(0, urban.value - activations.value),
    source: activations.value > 0 ? `${urban.source}, neto de activaciones` : urban.source,
  };
  const gg = {
    value: input.gastosGeneralesUf ?? ggMedian.value * input.totalViv * coreHistoricalFactor,
    source: Number.isFinite(input.gastosGeneralesUf) ? "ingresado" : adjustedSource(ggMedian.source, historicalFactor),
  };
  const finance = {
    value: input.gastosFinancierosUf ?? financeMedian.value * input.totalViv * coreHistoricalFactor,
    source: Number.isFinite(input.gastosFinancierosUf) ? "ingresado" : adjustedSource(financeMedian.source, historicalFactor),
  };
  const machinery = {
    value: input.maquinariaEquiposUf ?? 0,
    source: Number.isFinite(input.maquinariaEquiposUf) ? "ingresado" : "no ingresado",
  };
  const legal = {
    value: input.gastosLegalesUf ?? 0,
    source: Number.isFinite(input.gastosLegalesUf) ? "ingresado" : "no ingresado",
  };
  const fees = {
    value: input.honorariosUf ?? 0,
    source: Number.isFinite(input.honorariosUf) ? "ingresado" : "no ingresado",
  };
  const permits = {
    value: input.derechosPermisosUf ?? 0,
    source: Number.isFinite(input.derechosPermisosUf) ? "ingresado" : "no ingresado",
  };
  const contingencies = {
    value: input.eventualidadesUf ?? 0,
    source: Number.isFinite(input.eventualidadesUf) ? "ingresado" : "no ingresado",
  };
  const cuentaU = {
    value: input.descargaCuentaUUf ?? 0,
    source: Number.isFinite(input.descargaCuentaUUf) ? "ingresado" : "no ingresado",
  };
  const imprevistoPct = Number.isFinite(input.imprevistoPct) ? input.imprevistoPct / 100 : 0.02;
  const imprevistoBase =
    construction.value + siteSetup.value + urbanNet.value + gg.value + machinery.value + cuentaU.value;
  const imprevisto = {
    value: input.imprevistoUf ?? imprevistoBase * imprevistoPct,
    source: Number.isFinite(input.imprevistoUf) ? "ingresado" : `${(imprevistoPct * 100).toFixed(1)}% automatico`,
    automaticValue: imprevistoBase * imprevistoPct,
  };
  const utilidadConstructoraPct = inmb ? (Number.isFinite(input.utilidadConstructoraPct) ? input.utilidadConstructoraPct / 100 : 0.1) : 0;
  const utilidadConstructoraBase =
    construction.value +
    siteSetup.value +
    urbanNet.value +
    gg.value +
    machinery.value +
    cuentaU.value;
  const utilidadConstructora = {
    value: utilidadConstructoraBase * utilidadConstructoraPct,
    source: inmb ? `${(utilidadConstructoraPct * 100).toFixed(1)}% sobre costos construccion/urbanizacion` : "no aplica",
  };
  const credito65 = {
    value: inmb ? input.credito65Uf ?? 0 : 0,
    source: inmb ? (Number.isFinite(input.credito65Uf) ? "ingresado" : "no ingresado") : "no aplica",
  };
  const ivaBase = inmb
    ? utilidadConstructoraBase
    : construction.value +
      siteSetup.value +
      fees.value +
      permits.value +
      urbanNet.value +
      gg.value +
      machinery.value +
      imprevisto.value +
      cuentaU.value;
  const autoConstructionVat = ivaBase * 0.19;
  const constructionVat = {
    value: input.ivaConstruccionUf ?? autoConstructionVat,
    source: Number.isFinite(input.ivaConstruccionUf) ? "ingresado" : "19% automatico",
    automaticValue: autoConstructionVat,
  };
  const specialCredit = {
    value: input.creditoEspecialUf ?? 0,
    source: Number.isFinite(input.creditoEspecialUf) ? "ingresado" : "no ingresado",
  };
  const landByUfM2 =
    Number.isFinite(input.valorTerrenoUfM2) && input.valorTerrenoUfM2 > 0
      ? input.valorTerrenoUfM2 * input.terrenoM2
      : null;
  const landBaseUf = input.valorTerrenoUf ?? landByUfM2 ?? input.terrenoM2 * landUfM2Median.value;
  const cuentaT = {
    value: input.cuentaTUf ?? 0,
    source: Number.isFinite(input.cuentaTUf) ? "ingresado" : "no ingresado",
  };
  const landUf = landBaseUf + cuentaT.value;
  const landBaseSource = Number.isFinite(input.valorTerrenoUf)
    ? lastLandEdited === "valorTerrenoUfM2"
      ? "calculado desde UF/m2"
      : "ingresado UF"
    : Number.isFinite(landByUfM2)
      ? "UF/m2 ingresado"
      : "UF/m2 historico";
  const landSource = cuentaT.value > 0 ? `${landBaseSource} + Cuenta T` : landBaseSource;

  const autoIvaDebito = Math.max(0, ((revenue.total - landUf) / 1.19) * 0.19);
  const ivaDebito = {
    value: inmb ? input.ivaDebitoFiscalUf ?? autoIvaDebito : 0,
    source: inmb
      ? Number.isFinite(input.ivaDebitoFiscalUf)
        ? "ingresado"
        : "(ingresos venta - terreno) / 1,19 * 19%"
      : "no aplica",
    automaticValue: inmb ? autoIvaDebito : 0,
  };

  const ingresosAjustados = inmb ? revenue.total - ivaDebito.value : revenue.total + specialCredit.value;
  const constructionVatCost = inmb ? 0 : constructionVat.value;
  const costoTotal =
    construction.value +
    siteSetup.value +
    urbanNet.value +
    gg.value +
    finance.value +
    constructionVatCost +
    imprevisto.value +
    machinery.value +
    legal.value +
    fees.value +
    permits.value +
    contingencies.value +
    cuentaU.value +
    landUf +
    (inmb ? utilidadConstructora.value + credito65.value : 0);
  const utilidadProyecto = inmb ? ingresosAjustados - costoTotal : revenue.total - costoTotal;
  const margen = inmb ? utilidadProyecto + utilidadConstructora.value : utilidadProyecto + specialCredit.value;
  const mc = ingresosAjustados ? (margen / ingresosAjustados) * 100 : 0;
  const maxLand = Math.max(0, ingresosAjustados * (1 - THRESHOLD / 100) - (costoTotal - landUf));

  const manualInputs = [
    input.valorTerrenoUf,
    input.valorTerrenoUfM2,
    input.cuentaTUf,
    input.presupuestoFinanciadoUf,
    input.ivaConstruccionUf,
    input.creditoEspecialUf,
    input.utilidadConstructoraPct,
    input.ivaDebitoFiscalUf,
    input.credito65Uf,
    input.costoConstruccionUf,
    input.instalacionFaenasUf,
    input.urbanizacionUf,
    input.gastosGeneralesUf,
    input.gastosFinancierosUf,
    input.ajusteHistoricoPct,
    input.imprevistoUf,
    input.maquinariaEquiposUf,
    input.gastosLegalesUf,
    input.honorariosUf,
    input.derechosPermisosUf,
    input.eventualidadesUf,
    input.activacionesUf,
    input.descargaCuentaUUf,
    ...input.typologies.map((row) => row.precio),
  ].filter((value) => Number.isFinite(value)).length;
  const historicalSummary = historicalBaseSummary(input, peerSet);
  const confidence = Math.min(100, Math.round(35 + Math.min(peers.length, 8) * 5 + manualInputs * 3));

  return {
    input,
    peers,
    revenueRows: revenue.rows,
    typologyQuantity: revenue.quantity,
    ingresos: ingresosAjustados,
    ingresosBase: revenue.total,
    presupuestoFinanciadoUfViv: revenue.budgetPerViv,
    costoTotal,
    utilidadProyecto,
    margen,
    mc,
    maxLand,
    landUf,
    landBaseUf,
    cuentaTUf: cuentaT.value,
    gapToThresholdUf: ingresosAjustados * (THRESHOLD / 100) - margen,
    confidence,
    historicalSummary,
    autoImprevistoUf: imprevisto.automaticValue,
    autoIvaConstruccionUf: constructionVat.automaticValue,
    autoIvaDebitoFiscalUf: ivaDebito.automaticValue,
    autoUtilidadConstructoraUf: utilidadConstructora.value,
    estimateNotes: {
      costoConstruccion: construction,
      urbanizacion: urban,
      instalacionFaenas: siteSetup,
      gastosGenerales: gg,
      gastosFinancieros: finance,
    },
    sensitivityBase: {
      construction: construction.value,
      urbanization: urbanNet.value,
      land: landUf,
      revenue: ingresosAjustados,
      margin: margen,
    },
    printCosts: [
      ["Costo construcción", construction.value],
      ["Instalación faena", siteSetup.value],
      ["Urbanización neta", urbanNet.value],
      ["Gastos generales", gg.value],
      ["Gastos financieros", finance.value],
      ["Honorarios", fees.value],
      ["Derechos y permisos", permits.value],
      ["Terreno", landUf],
      ["Imprevistos", imprevisto.value],
      ["IVA costo construcción", constructionVat.value],
      ["Ingresos venta", revenue.total],
      ["IVA debito fiscal", inmb ? ivaDebito.value : null],
      ["Ingresos netos", inmb ? ingresosAjustados : null],
      ["Utilidad constructora", inmb ? utilidadConstructora.value : null],
      ["Credito 65%", inmb ? credito65.value : null],
      ["Utilidad inmobiliaria", inmb ? utilidadProyecto : null],
      ["Crédito especial", specialCredit.value],
      ["Utilidad antes crédito", utilidadProyecto],
      ["Presupuesto financiado", input.tipoProyectoKey === "ds49" ? revenue.total : null],
    ],
    printCostsOrdered: [
      ["Costo de construccion", construction.value],
      ["Urbanizacion", urbanNet.value],
      ["Instalacion de faena", siteSetup.value],
      ["Gastos generales", gg.value],
      ["Gastos financieros", finance.value],
      ["Honorarios", fees.value],
      ["Derecho y permiso", permits.value],
      ["Gastos legales", legal.value],
      ["Maquinaria/equipos/implementos", machinery.value],
      ["Eventualidades", contingencies.value],
      ["Descarga Cuenta U", cuentaU.value],
      ["Terreno base", landBaseUf],
      ["Cuenta T", cuentaT.value],
      ["Imprevistos", imprevisto.value],
      ["IVA costo construccion", constructionVat.value],
      ["Credito especial", specialCredit.value],
    ],
    printIncomeRows:
      input.tipoProyectoKey === "ds49"
        ? [{ tipologia: "Presupuesto financiado", cantidad: input.totalViv, price: revenue.total / input.totalViv, revenue: revenue.total }]
        : revenue.rows,
    assumptions: [
      assumption("Construccion UF", construction.value, construction.source),
      assumption("Urbanizacion UF neta", urbanNet.value, urbanNet.source),
      assumption("Instalacion faenas UF", siteSetup.value, siteSetup.source),
      assumption("GG UF", gg.value, gg.source),
      assumption("GF UF", finance.value, finance.source),
      assumption("Descarga Cuenta U UF", cuentaU.value, cuentaU.source),
      assumption("Honorarios UF", fees.value, fees.source),
      assumption("Derechos y permisos UF", permits.value, permits.source),
      assumption("Gastos legales UF", legal.value, legal.source),
      assumption("Eventualidades UF", contingencies.value, contingencies.source),
      assumption("Activaciones UF", activations.value, activations.source),
      assumption("Cuenta T UF", cuentaT.value, cuentaT.source),
      assumption("Terreno UF", landUf, landSource),
      assumption("Imprevisto UF", imprevisto.value, imprevisto.source),
    ],
  };
}

function buildSensitivityRows(result) {
  const base = result.sensitivityBase || {};
  const currentMc = result.mc;
  const estimateMc = ({ costDelta = 0, revenueDelta = 0 }) => {
    const revenue = Math.max(1, (base.revenue || 0) + revenueDelta);
    const margin = (base.margin || 0) + revenueDelta - costDelta;
    return (margin / revenue) * 100;
  };

  if (currentMc < THRESHOLD) {
    const gap = Math.max(0, result.gapToThresholdUf || 0);
    const revenueNeeded = gap / (1 - THRESHOLD / 100);
    const mixedCostReduction = gap / 2;
    const mixedRevenueIncrease = mixedCostReduction / (1 - THRESHOLD / 100);
    const landReduction = Math.min(gap, base.land || gap);
    const rows = [
      {
        label: "Reducir costos",
        change: `-${uf(gap)}`,
        mc: estimateMc({ costDelta: -gap }),
      },
      {
        label: "Aumentar ingresos",
        change: `+${uf(revenueNeeded)}`,
        mc: estimateMc({ revenueDelta: revenueNeeded }),
      },
      {
        label: "Terreno",
        change: `-${uf(landReduction)}`,
        mc: estimateMc({ costDelta: -landReduction }),
      },
      {
        label: "Construccion/urbanizacion",
        change: `-${uf(gap)}`,
        mc: estimateMc({ costDelta: -gap }),
      },
      {
        label: "Ajuste mixto",
        change: `Costos -${uf(mixedCostReduction)} + ingresos +${uf(mixedRevenueIncrease)}`,
        mc: estimateMc({ costDelta: -mixedCostReduction, revenueDelta: mixedRevenueIncrease }),
      },
    ];
    return rows.map((row) => ({ ...row, delta: row.mc - currentMc }));
  }

  const rows = [
    {
      label: "Construccion",
      change: "+2%",
      mc: estimateMc({ costDelta: (base.construction || 0) * 0.02 }),
    },
    {
      label: "Urbanizacion",
      change: "+2%",
      mc: estimateMc({ costDelta: (base.urbanization || 0) * 0.02 }),
    },
    {
      label: "Terreno",
      change: "+5%",
      mc: estimateMc({ costDelta: (base.land || 0) * 0.05 }),
    },
    {
      label: "Venta / ingreso",
      change: "-2%",
      mc: estimateMc({ revenueDelta: -(base.revenue || 0) * 0.02 }),
    },
    {
      label: "Conservador",
      change: "Costos + venta -",
      mc: estimateMc({
        costDelta: (base.construction || 0) * 0.02 + (base.urbanization || 0) * 0.02 + (base.land || 0) * 0.05,
        revenueDelta: -(base.revenue || 0) * 0.02,
      }),
    },
  ];

  return rows.map((row) => ({ ...row, delta: row.mc - currentMc }));
}

function renderTypologyBalance(result) {
  const note = $("typology-balance");
  const diff = result.input.totalViv - result.typologyQuantity;
  note.className = "balance-note";
  if (diff === 0) {
    note.classList.add("ok");
    note.textContent = `Distribucion completa: ${CLP.format(result.typologyQuantity)} de ${CLP.format(result.input.totalViv)} viviendas.`;
    return;
  }
  note.classList.add("warn");
  note.textContent =
    diff > 0
      ? `Faltan ${CLP.format(diff)} viviendas por distribuir en tipologias.`
      : `Hay ${CLP.format(Math.abs(diff))} viviendas sobre el total definido.`;
}

function setEstimateNote(id, item) {
  const note = $(id);
  if (!note || !item) return;
  const isManual = item.source === "ingresado";
  note.textContent = `${isManual ? "Manual" : "Usara historico"}: ${uf(item.value)}`;
  note.classList.toggle("manual", isManual);
}

function renderEstimateNotes(result) {
  const notes = result.estimateNotes || {};
  setEstimateNote("costo-construccion-estimate-note", notes.costoConstruccion);
  setEstimateNote("urbanizacion-estimate-note", notes.urbanizacion);
  setEstimateNote("instalacion-faenas-estimate-note", notes.instalacionFaenas);
  setEstimateNote("gastos-generales-estimate-note", notes.gastosGenerales);
  setEstimateNote("gastos-financieros-estimate-note", notes.gastosFinancieros);
}

function render(result) {
  const status = result.mc >= THRESHOLD ? "Rentable" : result.mc >= 15 ? "Riesgoso" : "No rentable";
  const tone = result.mc >= THRESHOLD ? "ok" : result.mc >= 15 ? "warn" : "bad";
  const resultBand = $("result-band");
  resultBand.className = `result-band ${tone === "ok" ? "" : tone}`;

  renderTypologyBalance(result);
  renderEstimateNotes(result);
  $("mc-value").textContent = pct(result.mc);
  $("status-pill").textContent = status;
  $("ingresos-value").textContent = uf(result.ingresos);
  $("costo-value").textContent = uf(result.costoTotal);
  $("terreno-max-value").textContent = uf(result.maxLand);
  setAutoAmount("imprevistoUf", result.autoImprevistoUf);
  setAutoAmount("ivaConstruccionUf", result.autoIvaConstruccionUf);
  setAutoAmount("ivaDebitoFiscalUf", result.autoIvaDebitoFiscalUf);
  $("imprevisto-calculado-note").textContent = `Automatico: ${uf(result.autoImprevistoUf)}`;
  $("iva-calculado-note").textContent = `Automatico: ${uf(result.autoIvaConstruccionUf)}`;
  $("iva-debito-calculado-note").textContent = `Automatico: ${uf(result.autoIvaDebitoFiscalUf)}`;
  $("utilidad-constructora-calculado-note").textContent = `Automatico: ${uf(result.autoUtilidadConstructoraUf)}`;
  $("presupuesto-financiado-note").textContent =
    result.input.tipoProyectoKey === "ds49"
      ? `Total financiado: ${uf(result.ingresosBase)}${Number.isFinite(result.presupuestoFinanciadoUfViv) ? ` (${uf(result.presupuestoFinanciadoUfViv)}/viv)` : ""}`
      : "Total financiado: --";

  const gap = result.maxLand - result.landUf;
  const diagnosis = $("diagnosis");
  diagnosis.className = `diagnosis ${tone === "ok" ? "" : tone}`;
  diagnosis.textContent =
    result.mc >= THRESHOLD
      ? `El proyecto supera el umbral. Mantiene una holgura estimada de ${uf(Math.abs(result.gapToThresholdUf))} frente al minimo recomendado; esa holgura puede absorber variaciones en terreno, construccion, urbanizacion u otros costos.`
      : `Faltan ${pct(THRESHOLD - result.mc)} para llegar al umbral. La brecha estimada es ${uf(result.gapToThresholdUf)}: el proyecto podria alcanzar el minimo recomendado reduciendo costos totales en ese monto, aumentando ingresos equivalentes, o combinando ajustes en terreno, construccion, urbanizacion y otras partidas.`;

  $("sensitivity-label").textContent = result.mc >= THRESHOLD ? "Que pasa si suben costos" : "Ajustes para llegar a 18%";
  $("sensitivity-table").innerHTML = buildSensitivityRows(result)
    .map((row) => {
      const deltaTone = row.delta >= 0 ? "up" : "down";
      const sign = row.delta > 0 ? "+" : "";
      return `
        <tr>
          <td>${row.label}</td>
          <td>${row.change}</td>
          <td>${pct(row.mc)}</td>
          <td class="${deltaTone}">${sign}${pct(row.delta)}</td>
        </tr>
      `;
    })
    .join("");

  $("print-status").textContent = status;
  $("print-project-name").textContent = result.input.projectName?.trim() || "Proyecto sin nombre";
  $("print-project-type").textContent = result.input.tipoProyecto || "--";
  $("print-mc").textContent = pct(result.mc);
  $("print-ingresos").textContent = uf(result.ingresos);
  $("print-costo").textContent = uf(result.costoTotal);
  $("print-margen").textContent = uf(result.margen);
  $("print-terreno-max").textContent = uf(result.maxLand);
  $("print-diagnosis").textContent = diagnosis.textContent;
  const totalVivForPrint = Math.max(1, Number(result.input.totalViv) || 1);
  const printCostRows = (result.printCostsOrdered || result.printCosts)
    .filter(([, value]) => Number.isFinite(value))
    .map(([label, value]) => `<tr><td>${label}</td><td>${uf(value)}</td><td>${uf(value / totalVivForPrint)}</td></tr>`)
    .join("");
  $("print-cost-body").innerHTML =
    printCostRows +
    `
      <tr class="print-total-row">
        <td>Costo total UF</td>
        <td>${uf(result.costoTotal)}</td>
        <td>${uf(result.costoTotal / totalVivForPrint)}</td>
      </tr>
    `;
  const printIncomeRows = (result.printIncomeRows || []).filter(
    (row) => Number.isFinite(row.cantidad) && Number.isFinite(row.price) && Number.isFinite(row.revenue),
  );
  const printIncomeTotal = printIncomeRows.reduce((sum, row) => sum + row.revenue, 0);
  $("print-income-body").innerHTML =
    printIncomeRows
      .map(
        (row) => `
          <tr>
            <td>${row.tipologia || "Sin definir"}</td>
            <td>${CLP.format(row.cantidad)}</td>
            <td>${uf(row.price)}</td>
            <td>${uf(row.revenue)}</td>
          </tr>
        `,
      )
      .join("") +
    `
      <tr class="print-total-row">
        <td>Total</td>
        <td></td>
        <td></td>
        <td>${uf(printIncomeTotal)}</td>
      </tr>
    `;
  const comments = result.input.projectComments?.trim() || "";
  $("print-comments").textContent = comments;
  $("print-comments-section").classList.toggle("hidden", !comments);

  $("confidence-label").textContent = `Confianza ${result.confidence}%`;
  $("confidence-detail").textContent = result.historicalSummary;
  $("assumptions").innerHTML = result.assumptions
    .filter((item) => item.source !== "no aplica")
    .map(
      (item) => `
        <div class="assumption-item">
          <span>${item.label}</span>
          <strong>${uf(item.value)}</strong>
          <small>${item.source}</small>
        </div>
      `,
    )
    .join("");

  $("peer-count").textContent = `${result.peers.length} usados`;
  $("peers-table").innerHTML = result.peers
    .slice(0, 7)
    .map(
      ({ project }) => `
        <tr>
          <td>${project.Proyecto}</td>
          <td>${project.Tipo_Proyecto} / ${project.Tipo_Viv}</td>
          <td>${CLP.format(project.Total_Viv)}</td>
          <td>${uf(Number(project.Costo_Construccion_UF_por_viv))}</td>
          <td>${uf(Number(project.Urbanizacion_UF_por_viv))}</td>
          <td>${uf(Number(project.Gastos_Generales_UF_por_viv))}</td>
          <td>${uf(Number(project.Gastos_Financieros_UF_por_viv))}</td>
          <td>${pct(project.Margen_Porc)}</td>
          <td>${Number(project.Valor_Terreno_UF_m2 || 0).toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");
}

function recalculate() {
  render(calculate());
}

function resetTypologies() {
  $("typology-rows").innerHTML = "";
  addTypologyRow({ cantidad: effectiveTotalViv(), precio: "" });
}

function readSavedSimulations() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIMULATIONS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeSavedSimulations(simulations) {
  localStorage.setItem(SIMULATIONS_KEY, JSON.stringify(simulations));
}

function currentFormState() {
  const fields = Object.fromEntries(baseFields.map((field) => [field, $(field).value]));
  return {
    id: String(Date.now()),
    name: fields.projectName?.trim() || `Simulacion ${new Date().toLocaleDateString("es-CL")}`,
    savedAt: new Date().toISOString(),
    lastLandEdited,
    autoFields: {
      imprevistoUf: $("imprevistoUf").dataset.auto === "true",
      ivaConstruccionUf: $("ivaConstruccionUf").dataset.auto === "true",
      ivaDebitoFiscalUf: $("ivaDebitoFiscalUf").dataset.auto === "true",
    },
    fields,
    typologies: readTypologies(),
  };
}

function refreshSavedSimulations(selectedId = "") {
  const simulations = readSavedSimulations().sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  const select = $("saved-simulations");
  select.innerHTML = "";

  if (!simulations.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sin simulaciones guardadas";
    select.appendChild(option);
    $("save-status").textContent = "Guardado local en este navegador";
    return;
  }

  simulations.forEach((simulation) => {
    const option = document.createElement("option");
    option.value = simulation.id;
    option.textContent = `${simulation.name} - ${new Date(simulation.savedAt).toLocaleDateString("es-CL")}`;
    select.appendChild(option);
  });
  select.value = selectedId || simulations[0].id;
  $("save-status").textContent = `${simulations.length} simulacion${simulations.length === 1 ? "" : "es"} guardada${simulations.length === 1 ? "" : "s"}`;
}

function saveCurrentSimulation() {
  const state = currentFormState();
  const simulations = readSavedSimulations().filter((simulation) => simulation.id !== state.id);
  simulations.unshift(state);
  writeSavedSimulations(simulations.slice(0, 50));
  refreshSavedSimulations(state.id);
  $("save-status").textContent = `Guardada: ${state.name}`;
}

function fileSafeName(value) {
  return slug(value)
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "simulacion";
}

function exportCurrentSimulation() {
  const state = currentFormState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(state.name)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  $("save-status").textContent = `Exportada: ${state.name}`;
}

function importSimulationFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const state = JSON.parse(String(reader.result || ""));
      if (!state?.fields || !Array.isArray(state.typologies)) throw new Error("Formato no valido");
      state.id = String(Date.now());
      state.name = state.name || state.fields.projectName || "Simulacion importada";
      state.savedAt = new Date().toISOString();
      applySimulationState(state);
      const simulations = readSavedSimulations();
      simulations.unshift(state);
      writeSavedSimulations(simulations.slice(0, 50));
      refreshSavedSimulations(state.id);
      $("save-status").textContent = `Importada: ${state.name}`;
    } catch {
      $("save-status").textContent = "No se pudo importar el archivo";
    } finally {
      $("import-simulation-file").value = "";
    }
  });
  reader.readAsText(file);
}

function applySimulationState(state) {
  if (!state?.fields) return;

  baseFields.forEach((field) => {
    if ($(field) && Object.prototype.hasOwnProperty.call(state.fields, field)) {
      $(field).value = state.fields[field] ?? "";
    }
  });
  if (slug($("tipoProyecto").value) === "inmb" || !$("tipoProyecto").value) {
    const projectTypes = visibleProjectTypes();
    $("tipoProyecto").value = projectTypes.includes("DS19") ? "DS19" : projectTypes[0];
  }

  lastLandEdited = state.lastLandEdited || null;
  syncComunas();
  if (state.fields.comuna) $("comuna").value = state.fields.comuna;
  syncHousingFields();
  syncProjectTypeFields();

  $("imprevistoUf").dataset.auto = state.autoFields?.imprevistoUf === false ? "false" : "true";
  $("ivaConstruccionUf").dataset.auto = state.autoFields?.ivaConstruccionUf === false ? "false" : "true";
  $("ivaDebitoFiscalUf").dataset.auto = state.autoFields?.ivaDebitoFiscalUf === false ? "false" : "true";

  $("typology-rows").innerHTML = "";
  (state.typologies?.length ? state.typologies : [{ cantidad: effectiveTotalViv(), precio: "" }]).forEach(addTypologyRow);
  syncLandFields(lastLandEdited || "terrenoM2");
  recalculate();
}

function loadSelectedSimulation() {
  const id = $("saved-simulations").value;
  const simulation = readSavedSimulations().find((item) => item.id === id);
  if (!simulation) return;
  applySimulationState(simulation);
  $("save-status").textContent = `Cargada: ${simulation.name}`;
}

function deleteSelectedSimulation() {
  const id = $("saved-simulations").value;
  const simulation = readSavedSimulations().find((item) => item.id === id);
  if (!simulation) return;
  writeSavedSimulations(readSavedSimulations().filter((item) => item.id !== id));
  refreshSavedSimulations();
  $("save-status").textContent = `Borrada: ${simulation.name}`;
}

function reloadProjectSelectors({ keepCurrent = true } = {}) {
  const currentRegion = $("region").value;
  const currentTipoProyecto = $("tipoProyecto").value;
  const currentTipoViv = $("tipoViv").value;
  const projectTypes = visibleProjectTypes();
  fillSelect("region", db.options.regions);
  fillSelect("tipoProyecto", projectTypes);
  fillSelect("tipoViv", db.options.tiposViv);
  if (keepCurrent) {
    $("region").value = db.options.regions.includes(currentRegion) ? currentRegion : db.options.regions[0];
    $("tipoProyecto").value = projectTypes.includes(currentTipoProyecto) ? currentTipoProyecto : projectTypes[0];
    $("tipoViv").value = db.options.tiposViv.includes(currentTipoViv) ? currentTipoViv : db.options.tiposViv[0];
  }
  syncComunas();
  syncHousingFields();
  syncProjectTypeFields();
}

async function init() {
  baseDb = structuredClone(window.PROJECT_DATA || (await fetch("data/projects.json").then((response) => response.json())));
  db = structuredClone(baseDb);
  const projectTypes = visibleProjectTypes();

  fillSelect("region", db.options.regions);
  fillSelect("tipoProyecto", projectTypes);
  fillSelect("tipoViv", db.options.tiposViv);

  $("region").value = db.options.regions.includes("Maule") ? "Maule" : db.options.regions[0];
  $("tipoProyecto").value = projectTypes.includes("DS19") ? "DS19" : projectTypes[0];
  $("tipoViv").value = db.options.tiposViv.includes("Casa") ? "Casa" : db.options.tiposViv[0];
  syncComunas();
  syncHousingFields();
  syncProjectTypeFields();
  resetTypologies();

  baseFields.forEach((field) => {
    $(field).addEventListener("input", recalculate);
    $(field).addEventListener("change", recalculate);
  });

  ["valorTerrenoUf", "valorTerrenoUfM2", "terrenoM2"].forEach((field) => {
    $(field).addEventListener("input", () => {
      syncLandFields(field);
      recalculate();
    });
    $(field).addEventListener("change", () => {
      syncLandFields(field);
      recalculate();
    });
  });

  $("ufActualClp").addEventListener("change", () => {
    const value = num($("ufActualClp").value);
    if (Number.isFinite(value)) {
      localStorage.setItem("estimadorMcUfActualClp", String(value));
      setUfStatus(`UF manual: ${PESOS.format(value)}`, "ok");
    }
    recalculate();
  });

  $("update-uf-button").addEventListener("click", () => updateUfFromApi());
  $("print-button").addEventListener("click", () => window.print());
  window.addEventListener("beforeprint", () => {
    originalDocumentTitle = document.title;
    document.title = "";
  });
  window.addEventListener("afterprint", () => {
    document.title = originalDocumentTitle || "Evaluación económica Preliminar";
  });
  $("save-simulation-button").addEventListener("click", saveCurrentSimulation);
  $("load-simulation-button").addEventListener("click", loadSelectedSimulation);
  $("export-simulation-button").addEventListener("click", exportCurrentSimulation);
  $("import-simulation-button").addEventListener("click", () => $("import-simulation-file").click());
  $("import-simulation-file").addEventListener("change", () => importSimulationFromFile($("import-simulation-file").files?.[0]));
  $("delete-simulation-button").addEventListener("click", deleteSelectedSimulation);

  ["imprevistoUf", "ivaConstruccionUf", "ivaDebitoFiscalUf"].forEach((field) => {
    $(field).dataset.auto = "true";
    $(field).addEventListener("input", () => {
      $(field).dataset.auto = $(field).value.trim() === "" ? "true" : "false";
      recalculate();
    });
  });

  $("region").addEventListener("change", () => {
    syncComunas();
    recalculate();
  });

  $("tipoProyecto").addEventListener("change", () => {
    syncProjectTypeFields();
    recalculate();
  });

  $("tipoViv").addEventListener("change", () => {
    syncHousingFields();
    resetTypologies();
    recalculate();
  });

  $("totalViv").addEventListener("change", () => {
    if ($("typology-rows").children.length === 1) {
      document.querySelector(".typology-qty").value = effectiveTotalViv();
    }
    recalculate();
  });

  $("casas").addEventListener("change", recalculate);
  $("departamentos").addEventListener("change", recalculate);

  $("add-typology-button").addEventListener("click", () => {
    addTypologyRow({ cantidad: "", precio: "" });
    recalculate();
  });

  $("reset-button").addEventListener("click", () => {
    $("project-form").reset();
    const resetProjectTypes = visibleProjectTypes();
    $("region").value = db.options.regions.includes("Maule") ? "Maule" : db.options.regions[0];
    $("tipoProyecto").value = resetProjectTypes.includes("DS19") ? "DS19" : resetProjectTypes[0];
    $("tipoViv").value = db.options.tiposViv.includes("Casa") ? "Casa" : db.options.tiposViv[0];
    $("totalViv").value = 100;
    $("casas").value = 50;
    $("departamentos").value = 50;
    $("terrenoM2").value = 30000;
    $("ajusteHistoricoPct").value = 1.5;
    $("imprevistoUf").dataset.auto = "true";
    $("ivaConstruccionUf").dataset.auto = "true";
    $("ivaDebitoFiscalUf").dataset.auto = "true";
    $("imprevistoUf").value = "";
    $("ivaConstruccionUf").value = "";
    $("ivaDebitoFiscalUf").value = "";
    $("utilidadConstructoraPct").value = 10;
    const savedUf = Number(localStorage.getItem("estimadorMcUfActualClp"));
    if (Number.isFinite(savedUf) && savedUf > 0) {
      $("ufActualClp").value = savedUf.toFixed(2);
      setUfStatus(`UF guardada: ${PESOS.format(savedUf)}`, "ok");
    }
    syncComunas();
    syncHousingFields();
    syncProjectTypeFields();
    resetTypologies();
    recalculate();
  });

  const savedUf = Number(localStorage.getItem("estimadorMcUfActualClp"));
  if (Number.isFinite(savedUf) && savedUf > 0) {
    $("ufActualClp").value = savedUf.toFixed(2);
    setUfStatus(`UF guardada: ${PESOS.format(savedUf)}`, "ok");
  } else {
    updateUfFromApi({ silent: true });
  }

  refreshSavedSimulations();
  recalculate();
}

init().catch((error) => {
  document.body.innerHTML = `<pre>No se pudo cargar la base de datos: ${error.message}</pre>`;
});
