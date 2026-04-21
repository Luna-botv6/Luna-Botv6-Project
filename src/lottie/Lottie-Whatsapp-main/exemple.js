const { buildLottieSticker } = require("./src/index");

//CÓDIGO DO BOT

if () {
  const output = await buildLottieSticker({
    baseFolder: path.resolve(__dirname, "src", "exemple"),
    buffer: dfileBuffer,
    mime: "image/jpeg",
    output: path.resolve(__dirname, "jurubeba.was")
  });
await client.sendMessage(from, {
sticker: fs.readFileSync("./jurubeba.was"),
mimetype: "application/was"
});

}