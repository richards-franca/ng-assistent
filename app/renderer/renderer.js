const $ = (id) => document.getElementById(id);
const SEGMENT_DURATION_MS = 4 * 60 * 1000;
let recorder, recordingSegments = [], segmentChunks = [], timerId, segmentTimer, startedAt, monitorFrame, recordingActive = false, pendingDeletion = null;
const setMessage = (text) => $('message').textContent = text;
const setState = (text, recording = false) => { $('state').textContent = text; $('state').classList.toggle('recording', recording); };

function startBootSequence() {
  const bootText = $('bootText');
  try {
    const context = new AudioContext();
    [0, .13, .26, .42].forEach((delay, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = index === 3 ? 'square' : 'sine'; oscillator.frequency.value = [330, 494, 660, 880][index];
      gain.gain.setValueAtTime(.0001, context.currentTime + delay); gain.gain.exponentialRampToValueAtTime(.07, context.currentTime + delay + .01); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + delay + .11);
      oscillator.connect(gain).connect(context.destination); oscillator.start(context.currentTime + delay); oscillator.stop(context.currentTime + delay + .13);
    });
    setTimeout(() => context.close(), 900);
  } catch { /* O app continua normalmente se o dispositivo de áudio não estiver disponível. */ }
  setTimeout(() => { bootText.textContent = 'SINAL DE ÁUDIO: ONLINE'; }, 850);
  setTimeout(() => { bootText.textContent = 'INTERFACE PRONTA'; }, 1700);
  setTimeout(() => { $('bootScreen').classList.add('hidden'); }, 2800);
}

function showView(view) {
  const encrypted = view === 'encrypted';
  const history = view === 'history';
  $('liveView').classList.toggle('hidden', encrypted || history);
  $('encryptedView').classList.toggle('hidden', !encrypted);
  $('historyView').classList.toggle('hidden', !history);
  $('liveNav').classList.toggle('selected', !encrypted && !history);
  $('encryptedNav').classList.toggle('selected', encrypted);
  $('historyNav').classList.toggle('selected', history);
  if (encrypted) loadApiKeyStatus();
  if (history) loadHistory();
}

function addText(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function openDeleteModal(record, card) {
  pendingDeletion = { record, card };
  $('deleteMessage').textContent = `O registro "${record.title || 'sem título'}" será removido do arquivo local.`;
  $('deleteModal').classList.remove('hidden');
}
function closeDeleteModal() { pendingDeletion = null; $('deleteModal').classList.add('hidden'); }
function playDeleteSound() {
  try {
    const context = new AudioContext(); const start = context.currentTime;
    [260, 180, 110, 58].forEach((frequency, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = 'square'; oscillator.frequency.setValueAtTime(frequency, start + index * .055);
      gain.gain.setValueAtTime(.0001, start + index * .055); gain.gain.exponentialRampToValueAtTime(.09, start + index * .055 + .008); gain.gain.exponentialRampToValueAtTime(.0001, start + index * .055 + .07);
      oscillator.connect(gain).connect(context.destination); oscillator.start(start + index * .055); oscillator.stop(start + index * .055 + .08);
    });
    const buffer = context.createBuffer(1, context.sampleRate * .24, context.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = context.createBufferSource(); const gain = context.createGain(); noise.buffer = buffer; gain.gain.value = .08; noise.connect(gain).connect(context.destination); noise.start(start + .12);
    setTimeout(() => context.close(), 600);
  } catch { /* A exclusão continua mesmo se não houver saída de áudio disponível. */ }
}
function disintegrate(card) {
  const pixels = document.createElement('div'); pixels.className = 'delete-pixels';
  for (let i = 0; i < 42; i++) { const pixel = document.createElement('i'); pixel.style.left = `${8 + Math.random() * 84}%`; pixel.style.top = `${12 + Math.random() * 76}%`; pixel.style.setProperty('--dx', `${(Math.random() - .5) * 280}px`); pixel.style.setProperty('--dy', `${(Math.random() - .65) * 210}px`); pixel.style.animationDelay = `${Math.random() * .14}s`; pixels.appendChild(pixel); }
  card.appendChild(pixels); card.classList.add('is-deleting'); requestAnimationFrame(() => pixels.classList.add('burst'));
  return new Promise(resolve => setTimeout(resolve, 760));
}

async function loadHistory() {
  const list = $('historyList');
  const message = $('historyMessage');
  list.replaceChildren(); message.textContent = 'Carregando atendimentos...';
  try {
    const records = await window.niggatron.listRecords();
    message.textContent = records.length ? `${records.length} atendimento(s) armazenado(s) neste computador.` : 'Nenhum atendimento armazenado ainda.';
    records.forEach(record => {
      const card = document.createElement('article'); card.className = 'panel history-card';
      const bracket = document.createElement('i'); bracket.className = 'brackets'; card.appendChild(bracket);
      const header = document.createElement('div'); header.className = 'history-header';
      addText(header, 'h2', '', record.title || 'Atendimento sem título');
      addText(header, 'time', '', new Date(record.createdAt).toLocaleString('pt-BR'));
      card.appendChild(header);
      if (record.clientEmail) addText(card, 'p', 'history-description', `Cliente: ${record.clientEmail}`);
      const tags = document.createElement('div'); tags.className = 'tags';
      (record.tags || []).forEach(tag => addText(tags, 'span', 'tag', tag)); card.appendChild(tags);
      [['Descrição', record.description], ['Com resolução', record.resolutionDescription], ['Mais detalhada', record.detailedDescription]].forEach(([label, text]) => {
        const block = document.createElement('div'); block.className = 'history-description';
        addText(block, 'strong', '', `${label}: `); addText(block, 'span', '', text || '—'); card.appendChild(block);
      });
      const details = document.createElement('details');
      addText(details, 'summary', '', '> VER TRANSCRIÇÃO');
      addText(details, 'p', '', record.transcript || 'Transcrição não disponível.'); card.appendChild(details);
      const remove = document.createElement('button'); remove.className = 'stop-button'; remove.textContent = 'APAGAR ATENDIMENTO';
      remove.addEventListener('click', () => openDeleteModal(record, card));
      card.appendChild(remove);
      list.appendChild(card);
    });
  } catch (error) { message.textContent = error.message || 'Não foi possível carregar o histórico.'; }
}

async function loadApiKeyStatus() {
  try {
    const configured = await window.niggatron.apiKeyStatus();
    $('apiKeyStatus').textContent = configured ? 'STATUS: CHAVE CONFIGURADA E PROTEGIDA' : 'STATUS: NENHUMA CHAVE CONFIGURADA';
    $('apiKeyStatus').classList.toggle('configured', configured);
    $('savedApiKey').placeholder = configured ? '••••••••  CHAVE CONFIGURADA' : 'gsk_...';
  } catch (error) { $('apiKeyStatus').textContent = error.message; }
}

async function saveApiKey() {
  try {
    await window.niggatron.saveApiKey($('savedApiKey').value);
    $('savedApiKey').value = '';
    await loadApiKeyStatus();
  } catch (error) { $('apiKeyStatus').textContent = error.message || 'Não foi possível salvar a chave.'; }
}

async function loadMicrophones() {
  try {
    const preflight = await navigator.mediaDevices.getUserMedia({ audio: true });
    preflight.getTracks().forEach(t => t.stop());
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
    $('microphone').innerHTML = devices.map((d, i) => `<option value="${d.deviceId}">${d.label || `Microfone ${i + 1}`}</option>`).join('');
  } catch { $('microphone').innerHTML = '<option value="">Microfone padrão</option>'; }
}

function formatTime() {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function clearPreviousRecord() {
  $('result').classList.add('hidden');
  $('title').value = ''; $('description').value = ''; $('resolutionDescription').value = ''; $('detailedDescription').value = '';
  $('tags').replaceChildren(); $('transcript').textContent = ''; $('clientEmail').value = ''; $('timer').textContent = '00:00';
}

function setMonitorState(active) {
  $('audioMonitorState').textContent = active ? 'OUVINDO' : 'AGUARDANDO';
  $('audioMonitorState').style.color = active ? '#00f3ff' : '#849495';
  ['micIndicator', 'clientIndicator'].forEach(id => { $(id).style.background = active ? '#00f3ff' : '#3a494b'; $(id).style.boxShadow = active ? '0 0 8px #00f3ff' : 'none'; });
}

function stopAudioMonitor() {
  if (monitorFrame) cancelAnimationFrame(monitorFrame);
  monitorFrame = null; setMonitorState(false);
  const canvas = $('audioWaveform'); const draw = canvas.getContext('2d');
  draw.fillStyle = '#0e0e0e'; draw.fillRect(0, 0, canvas.width, canvas.height);
  draw.strokeStyle = '#3a494b'; draw.lineWidth = 1;
  [50, 110].forEach(y => { draw.beginPath(); draw.moveTo(0, y); draw.lineTo(canvas.width, y); draw.stroke(); });
}

function startAudioMonitor(micAnalyser, clientAnalyser) {
  const canvas = $('audioWaveform'); const draw = canvas.getContext('2d');
  const micData = new Uint8Array(micAnalyser.frequencyBinCount);
  const clientData = new Uint8Array(clientAnalyser.frequencyBinCount);
  const drawChannel = (data, top, color, indicatorId) => {
    const bars = 36; const step = Math.floor(data.length / bars); let total = 0;
    draw.fillStyle = color;
    for (let i = 0; i < bars; i++) {
      const level = data[i * step] || 0; total += level;
      const height = Math.max(2, (level / 255) * 47); const x = i * (canvas.width / bars) + 2;
      draw.globalAlpha = .55 + (level / 255) * .45;
      draw.fillRect(x, top + 48 - height, 10, height);
    }
    draw.globalAlpha = 1;
    const speaking = total / bars > 8;
    $(indicatorId).style.background = speaking ? color : '#3a494b';
    $(indicatorId).style.boxShadow = speaking ? `0 0 12px ${color}` : 'none';
  };
  const render = () => {
    draw.fillStyle = '#0e0e0e'; draw.fillRect(0, 0, canvas.width, canvas.height);
    micAnalyser.getByteFrequencyData(micData); clientAnalyser.getByteFrequencyData(clientData);
    drawChannel(micData, 0, '#00f3ff', 'micIndicator');
    drawChannel(clientData, 76, '#5a9dff', 'clientIndicator');
    monitorFrame = requestAnimationFrame(render);
  };
  setMonitorState(true); render();
}

async function start() {
  try {
    clearPreviousRecord();
    setMessage('Solicitando acesso ao microfone e ao áudio do computador...');
    const mic = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: $('microphone').value ? { exact: $('microphone').value } : undefined } });
    // getDisplayMedia ativa o loopback configurado no processo principal e inclui o áudio do sistema no Windows.
    const desktop = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: 1 } });
    if (!desktop.getAudioTracks().length) {
      desktop.getTracks().forEach(track => track.stop());
      mic.getTracks().forEach(track => track.stop());
      throw new Error('O Windows não disponibilizou o áudio do sistema. Verifique se a chamada está saindo pelo dispositivo de áudio padrão.');
    }
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const micSource = context.createMediaStreamSource(mic);
    const clientSource = context.createMediaStreamSource(desktop);
    const micAnalyser = context.createAnalyser(); const clientAnalyser = context.createAnalyser();
    [micAnalyser, clientAnalyser].forEach(analyser => { analyser.fftSize = 256; analyser.smoothingTimeConstant = .78; });
    micSource.connect(destination); clientSource.connect(destination);
    micSource.connect(micAnalyser); clientSource.connect(clientAnalyser);
    const startSegment = () => {
      segmentChunks = [];
      recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = event => { if (event.data.size) segmentChunks.push(event.data); };
      recorder.onstop = () => {
        const segment = new Blob(segmentChunks, { type: 'audio/webm' });
        if (segment.size) recordingSegments.push(segment);
        if (recordingActive) startSegment();
        else { stopAudioMonitor(); mic.getTracks().forEach(track => track.stop()); desktop.getTracks().forEach(track => track.stop()); context.close(); processAudioSegments(recordingSegments); }
      };
      recorder.start(1000);
    };
    recordingSegments = []; recordingActive = true; startSegment();
    startedAt = Date.now(); timerId = setInterval(formatTime, 500);
    segmentTimer = setInterval(() => { if (recorder?.state === 'recording') recorder.stop(); }, SEGMENT_DURATION_MS);
    startAudioMonitor(micAnalyser, clientAnalyser);
    $('start').disabled = true; $('stop').disabled = false; setState('Gravando', true); setMessage('Gravação em andamento.');
  } catch (error) { stopAudioMonitor(); setState('Pronto para gravar'); setMessage(`Não foi possível iniciar: ${error.message}`); }
}

function stop() {
  $('stop').disabled = true; clearInterval(timerId); clearInterval(segmentTimer); recordingActive = false; setState('Processando'); setMessage('Preparando as partes do atendimento para transcrição...'); recorder.stop();
}

async function processAudioSegments(blobs) {
  try {
    setMessage(`Transcrevendo ${blobs.length} parte(s) e consolidando o atendimento...`);
    const segments = [];
    for (const blob of blobs) segments.push({ audio: Array.from(new Uint8Array(await blob.arrayBuffer())), mimeType: blob.type });
    const data = await window.niggatron.generate({ segments });
    $('title').value = data.record.title || '';
    $('description').value = data.record.description || '';
    $('resolutionDescription').value = data.record.resolutionDescription || '';
    $('detailedDescription').value = data.record.detailedDescription || '';
    $('tags').innerHTML = (data.record.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('') || '<span class="hint">Nenhuma tag sugerida</span>';
    $('transcript').textContent = data.transcript || '';
    await window.niggatron.saveRecord({ ...data.record, clientEmail: $('clientEmail').value.trim(), transcript: data.transcript });
    $('result').classList.remove('hidden'); setState('Registro pronto'); setMessage('Revise os campos antes de copiar.');
  } catch (error) { setState('Erro'); setMessage(error.message || 'Não foi possível processar o atendimento.'); }
  finally { $('start').disabled = false; }
}

$('liveNav').addEventListener('click', (event) => { event.preventDefault(); showView('live'); });
$('historyNav').addEventListener('click', (event) => { event.preventDefault(); showView('history'); });
$('encryptedNav').addEventListener('click', (event) => { event.preventDefault(); showView('encrypted'); });
$('saveApiKey').addEventListener('click', saveApiKey);
$('cancelDelete').addEventListener('click', closeDeleteModal);
$('confirmDelete').addEventListener('click', async () => {
  if (!pendingDeletion) return;
  const { record, card } = pendingDeletion;
  try { await window.niggatron.deleteRecord(record.id); closeDeleteModal(); playDeleteSound(); await disintegrate(card); loadHistory(); }
  catch (error) { $('historyMessage').textContent = error.message || 'Não foi possível apagar o atendimento.'; closeDeleteModal(); }
});
$('start').addEventListener('click', start);
$('stop').addEventListener('click', stop);
$('copyTitle').addEventListener('click', async () => { await navigator.clipboard.writeText($('title').value); setMessage('Título copiado.'); });
$('copyDescription').addEventListener('click', async () => { await navigator.clipboard.writeText($('description').value); setMessage('Descrição copiada.'); });
$('copyResolutionDescription').addEventListener('click', async () => { await navigator.clipboard.writeText($('resolutionDescription').value); setMessage('Descrição com resolução copiada.'); });
$('copyDetailedDescription').addEventListener('click', async () => { await navigator.clipboard.writeText($('detailedDescription').value); setMessage('Descrição detalhada copiada.'); });
$('copy').addEventListener('click', async () => {
  const tags = [...document.querySelectorAll('.tag')].map(element => element.textContent).join(', ');
  await navigator.clipboard.writeText(`E-mail do cliente: ${$('clientEmail').value}\nTítulo: ${$('title').value}\nTags: ${tags}\nDescrição: ${$('description').value}\nDescrição com resolução: ${$('resolutionDescription').value}\nDescrição mais detalhada: ${$('detailedDescription').value}`);
  setMessage('Registro copiado.');
});
loadMicrophones();
stopAudioMonitor();
startBootSequence();
