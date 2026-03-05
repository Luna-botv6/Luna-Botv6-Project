import fetch from 'node-fetch';
import {FormData, Blob} from 'formdata-node';
import {fileTypeFromBuffer} from 'file-type';

const fileIO = async (buffer) => {
  const {ext, mime} = await fileTypeFromBuffer(buffer) || {};
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], {type: mime});
  form.append('file', blob, 'tmp.' + ext);
  const res = await fetch('https://file.io/?expires=1d', {method: 'POST', body: form});
  const json = await res.json();
  if (!json.success) throw json;
  return json.link;
};

const RESTfulAPI = async (inp) => {
  const form = new FormData();
  let buffers = inp;
  if (!Array.isArray(inp)) buffers = [inp];
  for (const buffer of buffers) {
    const blob = new Blob([new Uint8Array(buffer)]);
    form.append('file', blob);
  }
  const res = await fetch('https://storage.restfulapi.my.id/upload', {method: 'POST', body: form});
  let json = await res.text();
  try {
    json = JSON.parse(json);
    if (!Array.isArray(inp)) return json.files[0].url;
    return json.files.map((f) => f.url);
  } catch (e) {
    throw json;
  }
};

export default async function(inp) {
  let err = false;
  for (const upload of [RESTfulAPI, fileIO]) {
    try {
      return await upload(inp);
    } catch (e) {
      err = e;
    }
  }
  if (err) throw err;
}
