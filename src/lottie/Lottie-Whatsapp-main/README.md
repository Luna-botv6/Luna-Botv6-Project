# 🧩 Lottie Sticker Builder (WAS) — Beta

Transforma uma imagem (**buffer** ou **arquivo**) em uma figurinha animada `.was` (Lottie) pronta pra usar no WhatsApp.

---

## ⚡ Instalação

### 1. Clone ou baixe o projeto

```bash
git clone https://github.com/Pedrozz13755/Lottie-Whatsapp.git
cd Lottie-Whatsapp
```

Ou, se preferir, só coloque os arquivos dentro do teu próprio projeto.

---

### 2. Instale as dependências necessárias

Esse código usa apenas módulos nativos do Node.js, mas precisa que o comando `zip` esteja instalado no sistema.

No Linux / Termux / Ubuntu:

```bash
pkg install zip
# ou
apt install zip
```

---

## 📦 Estrutura esperada

Você precisa de uma pasta base com os arquivos do Lottie. Exemplo:

```
src/
 └── exemple/
      └── animation/
           └── animation_secondary.json
```

Esse arquivo JSON precisa já conter uma imagem em base64 dentro dele, porque o builder vai substituir essa imagem automaticamente.

---

## 🚀 Como usar

### Importe a função

```js
const { buildLottieSticker } = require("./src/index");
```

---

### Exemplo simples

```js
const path = require("path");
const { buildLottieSticker } = require("./src/index");

const output = await buildLottieSticker({
  baseFolder: path.resolve(__dirname, "src", "exemple"),
  buffer: dfileBuffer,
  mime: "image/jpeg",
  output: path.resolve(__dirname, "jurubeba.was")
});
```

---

### Enviar no WhatsApp com Baileys

```js
const fs = require("fs");

await client.sendMessage(from, {
  sticker: fs.readFileSync("./jurubeba.was"),
  mimetype: "application/was"
});
```

---

## 🧠 Parâmetros

| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `baseFolder` | string | ✅ | Pasta base do Lottie |
| `buffer` | Buffer | ❌ | Imagem em memória |
| `imagePath` | string | ❌ | Caminho da imagem |
| `mime` | string | ❌ | Tipo da imagem (detectado automaticamente se usar `imagePath`) |
| `output` | string | ❌ | Caminho do arquivo `.was` final |
| `jsonRelativePath` | string | ❌ | Caminho do JSON dentro da pasta base |

---

## ⚠️ Regras importantes

- Você precisa enviar **`buffer` ou `imagePath`**
- Formatos suportados:
  - PNG
  - JPG / JPEG
  - WEBP
- O JSON do Lottie precisa já ter uma imagem em base64 embutida
- O código apenas substitui a imagem existente, ele não cria a estrutura do Lottie do zero

---

## 💥 Erros comuns

### `Mime não detectado`
Você não enviou `mime` nem `imagePath`

### `JSON sem assets`
O arquivo JSON está inválido ou não possui a estrutura esperada

### `Nenhuma imagem base64 encontrada no Lottie`
O teu arquivo Lottie não contém imagem embutida em base64 para substituir

### `zip não encontrado`
O comando `zip` não está instalado no sistema

---

## 🛠️ Dica útil

Se quiser usar diretamente com imagem recebida do WhatsApp, você pode pegar o buffer e mandar pro builder:

```js
const buffer = await getFileBuffer(message, "image");

const output = await buildLottieSticker({
  baseFolder: path.resolve(__dirname, "src", "exemple"),
  buffer,
  mime: "image/jpeg",
  output: path.resolve(__dirname, "jurubeba.was")
});
```

---

## 🚧 Status do projeto

> ⚠️ **VERSÃO BETA**
>
> Esse projeto ainda está em fase beta.
> Dependendo do arquivo Lottie usado, algumas animações podem não funcionar corretamente.
> Ainda não existe suporte garantido para todos os tipos de estrutura Lottie.

---

## 👑 Créditos

Desenvolvido por **Pedrozz Mods**

Esse projeto ainda está em desenvolvimento e na versão beta.
Se for usar, modificar ou compartilhar, mantenha os créditos.

Grupo: https://chat.whatsapp.com/C21cogFUmKABh9e3qyexSQ?mode=gi_t
Canal: https://whatsapp.com/channel/0029Vb8CYiZChq6RIEfS7K1D

---

### Footer

Feito por **Pedrozz Mods**  
Projeto em **versão beta**, sujeito a mudanças e possíveis erros.
