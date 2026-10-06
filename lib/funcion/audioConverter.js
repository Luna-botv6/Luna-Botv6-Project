import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';

export function slugifyFrase(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'audio';
}

export function convertBufferToOggOpus(buffer) {
  return new Promise((resolve, reject) => {
    const input = new Readable();
    input.push(buffer);
    input.push(null);

    const output = new PassThrough();
    const chunks = [];
    output.on('data', chunk => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);

    ffmpeg(input)
      .noVideo()
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(48000)
      .audioBitrate('128k')
      .outputOptions(['-map', '0:a:0', '-map_metadata', '-1', '-application', 'voip', '-frame_duration', '20', '-packet_loss', '0'])
      .format('ogg')
      .on('error', reject)
      .pipe(output);
  });
}
