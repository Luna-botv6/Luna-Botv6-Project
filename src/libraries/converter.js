import {promises} from 'fs';
import {join} from 'path';
import {spawn} from 'child_process';

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    let tmp; let out; let proc; let timedOut = false; let tmpOut;
    const timer = setTimeout(() => {
      timedOut = true;
      try { proc?.kill('SIGKILL'); setTimeout(() => { try { promises.unlink(tmpOut).catch(() => {}); } catch {} }, 500); } catch {}
      reject(new Error('ffmpeg timeout'));
    }, 120000);
    try {
      tmp = join(global.__dirname(import.meta.url), '../tmp', Date.now() + '.' + Math.random().toString(36).slice(2, 8) + '.' + ext);
      out = tmp + '.' + ext2;
      tmpOut = out;
      await promises.writeFile(tmp, buffer);
      proc = spawn('ffmpeg', [
        '-y',
        '-i', tmp,
        ...args,
        out,
      ])
          .on('error', (e) => {
            clearTimeout(timer);
            reject(e);
          })
          .on('close', async (code) => {
            try {
              clearTimeout(timer);
              await promises.unlink(tmp).catch(() => {});
              if (timedOut) return;
              if (code !== 0) {
                await promises.unlink(out).catch(() => {});
                return reject(new Error(`ffmpeg exited with code ${code}`));
              }
              resolve({
                data: await promises.readFile(out),
                filename: out,
                delete() {
                  return promises.unlink(out);
                },
              });
            } catch (e) {
              reject(e);
            }
          });
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

/**
 * Convert Audio to Playable WhatsApp Audio
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension
 * @return {Promise<{data: Buffer, filename: String, delete: Function}>}
 */
function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
  ], ext, 'ogg');
}

/**
 * Convert Audio to Playable WhatsApp PTT
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension
 * @return {Promise<{data: Buffer, filename: String, delete: Function}>}
 */
function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10',
  ], ext, 'opus');
}

/**
 * Convert Audio to Playable WhatsApp Video
 * @param {Buffer} buffer Video Buffer
 * @param {String} ext File Extension
 * @return {Promise<{data: Buffer, filename: String, delete: Function}>}
 */
function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow',
  ], ext, 'mp4');
}

/**
 * Convert WebP Sticker to PNG for Image Analysis
 * @param {Buffer} buffer WebP Buffer
 * @return {Promise<{data: Buffer, filename: String, delete: Function}>}
 */
function toImage(buffer) {
  return ffmpeg(buffer, ['-vframes', '1'], 'webp', 'png');
}

export {
  toAudio,
  toPTT,
  toVideo,
  toImage,
  ffmpeg,
};