const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execSync } = require("child_process");

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  for (const item of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, item.name);
    const to = path.join(dest, item.name);

    if (item.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function getMime(filePath, mime) {
  if (mime) return mime;
  return MIME[path.extname(filePath || "").toLowerCase()] || null;
}

function toDataUri(buffer, mime) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Buffer inválido.");
  }

  if (!mime) {
    throw new Error("Mime não detectado. Informe imagePath ou mime.");
  }

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function replaceBase64Image(jsonPath, dataUri) {
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  if (!Array.isArray(json.assets)) {
    throw new Error("JSON sem assets.");
  }

  const asset = json.assets.find(a => typeof a?.p === "string" && a.p.startsWith("data:image/"));
  if (!asset) {
    throw new Error("Nenhuma imagem base64 encontrada no Lottie.");
  }

  asset.p = dataUri;
  fs.writeFileSync(jsonPath, JSON.stringify(json));
}

function zipToWas(folder, output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const zipPath = output.replace(/\.was$/i, ".zip");
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (fs.existsSync(output)) fs.unlinkSync(output);

  execSync(`zip -r "${zipPath}" .`, { cwd: folder, stdio: "ignore" });
  fs.renameSync(zipPath, output);
}

async function buildLottieSticker({
  baseFolder,
  output = path.resolve("./jurubeba.was"),
  imagePath,
  buffer,
  mime,
  jsonRelativePath = "animation/animation_secondary.json"
}) {
  if (!fs.existsSync(baseFolder)) throw new Error("baseFolder não encontrado.");

  if (!buffer && !imagePath) {
    throw new Error("Envie imagePath ou buffer.");
  }

  if (!buffer && imagePath) {
    if (!fs.existsSync(imagePath)) throw new Error("Imagem não encontrada.");
    buffer = fs.readFileSync(imagePath);
  }

  mime = getMime(imagePath, mime);
  if (!mime) throw new Error("Formato não suportado. Use PNG, JPG, JPEG ou WEBP.");

  const temp = path.join(os.tmpdir(), `lottie-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`);

  try {
    copyDir(baseFolder, temp);
    replaceBase64Image(path.join(temp, jsonRelativePath), toDataUri(buffer, mime));
    zipToWas(temp, output);
    return output;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

module.exports = { buildLottieSticker };