const $ = id => document.getElementById(id);
let recorder, chunks = [], startedAt, timerId, mic, desktop, context, recording = false;

function setMode(text, waiting = false) { $('mode').textContent = text; $('mode').style.animation = waiting ? '' : 'none'; }
function setMessage(text) { $('message').textContent = text; }
function tick() { const s = Math.floor((Date.now() - startedAt) / 1000); $('timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

async function start() {
  try {
    setMessage('Solicitando áudio do microfone e do computador...');
    mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    desktop = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: 1 } });
    if (!desktop.getAudioTracks().length) throw new Error('O áudio do computador não foi compartilhado.');
    context = new AudioContext(); const destination = context.createMediaStreamDestination();
    context.createMediaStreamSource(mic).connect(destination); context.createMediaStreamSource(desktop).connect(destination);
    chunks = []; recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm' });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = finish;
    recorder.start(1000); recording = true; startedAt = Date.now(); timerId = setInterval(tick, 500);
    $('start').disabled = true; $('stop').disabled = false; $('clientEmail').disabled = true;
    setMode('GRAVANDO'); setMessage('Captura ativa. Você pode continuar no atendimento.');
  } catch (error) {
    mic?.getTracks().forEach(track => track.stop()); desktop?.getTracks().forEach(track => track.stop()); context?.close();
    setMode('AGUARDANDO...', true); setMessage(error.message || 'Não foi possível iniciar a gravação.');
  }
}

function stop() {
  if (!recording) return; recording = false; clearInterval(timerId); $('stop').disabled = true; setMode('PROCESSANDO'); setMessage('Transcrevendo e preparando o registro...'); recorder.stop();
}

async function finish() {
  try {
    mic?.getTracks().forEach(track => track.stop()); desktop?.getTracks().forEach(track => track.stop()); await context?.close();
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const data = await window.niggatron.generate({ segments: [{ audio: Array.from(new Uint8Array(await blob.arrayBuffer())), mimeType: blob.type }] });
    const entry = await window.niggatron.saveRecord({ ...data.record, clientEmail: $('clientEmail').value.trim(), transcript: data.transcript });
    window.niggatron.openMainWithRecord({ record: entry, transcript: data.transcript, clientEmail: entry.clientEmail });
    setMode('REGISTRO PRONTO'); setMessage('Registro salvo. A Central foi aberta para revisão.');
  } catch (error) { setMode('ERRO'); setMessage(error.message || 'Não foi possível gerar o registro.'); }
  finally { $('start').disabled = false; $('clientEmail').disabled = false; }
}

$('start').addEventListener('click', start); $('stop').addEventListener('click', stop); $('quit').addEventListener('click', () => window.niggatron.quitApp());
$('shrink').addEventListener('click', () => window.niggatron.resizeQuickWindow(-35));
$('grow').addEventListener('click', () => window.niggatron.resizeQuickWindow(35));
