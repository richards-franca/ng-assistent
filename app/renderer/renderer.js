const $ = id => document.getElementById(id);
const SEGMENT_DURATION_MS = 4 * 60 * 1000;
let recorder;
let recordingSegments = [];
let segmentChunks = [];
let timerId;
let segmentTimer;
let startedAt;
let monitorFrame;
let recordingActive = false;
let pendingDeletion = null;
let lastFocusedElement = null;

const setMessage = text => { $('message').textContent = text || ''; };

function setState(text, recording = false) {
  $('state').textContent = String(text || '').toUpperCase();
  $('captureDot').parentElement.classList.toggle('is-recording', recording);
  $('headerStatus').textContent = recording ? `● LIVE / ${$('timer').textContent}` : 'SYSTEM / ONLINE';
}

function setLivePhase(phase) {
  $('captureLayout').classList.toggle('hidden', phase !== 'ready');
  $('activeCapture').classList.toggle('hidden', phase !== 'recording');
  $('processing').classList.toggle('hidden', phase !== 'processing');
  $('result').classList.toggle('hidden', phase !== 'result');
  $('finishResult').classList.toggle('hidden', phase !== 'result');
  $('footerPrimary').textContent = phase === 'result' || phase === 'processing'
    ? 'DUPLEX CAPTURE ACTIVE — CLIENT AND OPERATOR SIGNALS OVERLAID'
    : 'CAUTION — AUDIO TRANSCRIPTS ARE HANDLED IN A SECURE SESSION.';
  $('footerSecondary').classList.toggle('hidden', phase !== 'ready');
  $('viewSubtitle').textContent = phase === 'recording' || phase === 'processing'
    ? '// atendimento em andamento'
    : phase === 'result' ? '// transcrição pronta' : '// assistente de suporte';
}

function openMenu() {
  lastFocusedElement = document.activeElement;
  $('sideMenu').classList.add('open');
  $('sideMenu').setAttribute('aria-hidden', 'false');
  $('menuToggle').setAttribute('aria-expanded', 'true');
  $('menuToggle').setAttribute('aria-label', 'Fechar menu');
  $('menuScrim').classList.remove('hidden');
  $('sideMenu').querySelector('a.selected')?.focus();
}

function closeMenu(restoreFocus = true) {
  $('sideMenu').classList.remove('open');
  $('sideMenu').setAttribute('aria-hidden', 'true');
  $('menuToggle').setAttribute('aria-expanded', 'false');
  $('menuToggle').setAttribute('aria-label', 'Abrir menu');
  $('menuScrim').classList.add('hidden');
  if (restoreFocus) lastFocusedElement?.focus?.();
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
  $('viewSubtitle').textContent = history ? '// arquivo local' : encrypted ? '// configuração do sistema' : '// assistente de suporte';
  closeMenu(false);
  if (encrypted) loadSettings();
  if (history) loadHistory();
  $('mainContent').focus();
}

function addText(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function makeButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function openDeleteModal(record, card) {
  pendingDeletion = { record, card };
  lastFocusedElement = document.activeElement;
  $('deleteMessage').textContent = `O registro "${record.title || 'sem título'}" será removido do arquivo local.`;
  $('deleteModal').classList.remove('hidden');
  $('confirmDelete').focus();
}

function closeDeleteModal() {
  pendingDeletion = null;
  $('deleteModal').classList.add('hidden');
  lastFocusedElement?.focus?.();
}

async function loadHistory() {
  const list = $('historyList');
  const message = $('historyMessage');
  list.replaceChildren();
  message.textContent = 'Carregando atendimentos…';
  try {
    const records = await window.niggatron.listRecords();
    $('historyCount').textContent = `${String(records.length).padStart(2, '0')} REGISTRO${records.length === 1 ? '' : 'S'}`;
    message.textContent = records.length ? '' : 'Nenhum atendimento armazenado ainda.';
    records.forEach(record => {
      const card = document.createElement('article');
      card.className = 'history-card';
      const header = document.createElement('header');
      addText(header, 'h2', '', record.title || 'Atendimento sem título');
      addText(header, 'time', '', new Date(record.createdAt).toLocaleString('pt-BR'));
      card.appendChild(header);
      addText(card, 'p', 'history-description', record.description || 'Sem descrição.');
      addText(card, 'p', 'history-email', `CLIENTE: ${record.clientEmail || '- - --'}`);
      const actions = document.createElement('div');
      actions.className = 'history-actions';
      const details = document.createElement('details');
      const summary = addText(details, 'summary', '', 'TRANSCRIÇÃO DO ATENDIMENTO');
      addText(details, 'p', '', record.transcript || 'Transcrição não disponível.');
      const open = makeButton('VER TRANSCRIÇÃO', 'button button-dark', () => {
        details.open = !details.open;
        open.textContent = details.open ? 'FECHAR TRANSCRIÇÃO' : 'VER TRANSCRIÇÃO';
        if (details.open) summary.focus();
      });
      const remove = makeButton('APAGAR', 'button button-outline delete-record', () => openDeleteModal(record, card));
      remove.setAttribute('aria-label', `Apagar ${record.title || 'atendimento sem título'}`);
      actions.append(open, remove);
      card.append(actions, details);
      list.appendChild(card);
    });
  } catch (error) {
    message.textContent = error.message || 'Não foi possível carregar o histórico.';
  }
}

async function loadSettings() {
  try {
    const [configured, model] = await Promise.all([
      window.niggatron.apiKeyStatus(),
      window.niggatron.getGroqModel()
    ]);
    $('apiKeyStatus').textContent = configured ? 'ENCRYPTED LOCALLY / KEY CONFIGURED' : 'ENCRYPTED LOCALLY / NO KEY';
    $('apiKeyStatus').classList.toggle('configured', configured);
    $('savedApiKey').placeholder = configured ? 'gsk_••••••••••••••••••••' : 'gsk_...';
    if (model) {
      if (![...$('groqModel').options].some(option => option.value === model)) {
        $('groqModel').append(new Option(model, model));
      }
      $('groqModel').value = model;
    }
  } catch (error) {
    $('apiKeyStatus').textContent = error.message || 'Não foi possível carregar as configurações.';
  }
}

async function loadAppVersion() {
  try {
    const version = await window.niggatron.getAppVersion();
    const label = `v${String(version).replace(/^v/, '')}`;
    $('brandVersion').textContent = label;
    $('currentBuild').textContent = label;
  } catch {
    // The packaged fallback remains visible if IPC is unavailable.
  }
}

async function saveSettings() {
  const key = $('savedApiKey').value.trim();
  const model = $('groqModel').value;
  $('saveApiKey').disabled = true;
  try {
    const operations = [window.niggatron.saveGroqModel(model)];
    if (key) operations.push(window.niggatron.saveApiKey(key));
    await Promise.all(operations);
    $('savedApiKey').value = '';
    await loadSettings();
    $('apiKeyStatus').textContent = key ? 'CHAVE E MODELO SALVOS COM SEGURANÇA' : 'MODELO SALVO; CHAVE EXISTENTE PRESERVADA';
  } catch (error) {
    $('apiKeyStatus').textContent = error.message || 'Não foi possível salvar as configurações.';
  } finally {
    $('saveApiKey').disabled = false;
  }
}

async function loadMicrophones() {
  try {
    const preflight = await navigator.mediaDevices.getUserMedia({ audio: true });
    preflight.getTracks().forEach(track => track.stop());
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'audioinput');
    $('microphone').replaceChildren();
    devices.forEach((device, index) => $('microphone').append(new Option(device.label || `Microfone ${index + 1}`, device.deviceId)));
    if (!devices.length) $('microphone').append(new Option('Microfone padrão', ''));
    updateInputLabel();
  } catch {
    $('microphone').replaceChildren(new Option('Microfone padrão', ''));
    updateInputLabel();
  }
}

function updateInputLabel() {
  const text = $('microphone').selectedOptions[0]?.textContent || 'SYSTEM MICROPHONE';
  $('inputSource').textContent = `INPUT: ${text.toUpperCase()}`;
}

function formatTime() {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').textContent = formatted;
  if (recordingActive) $('headerStatus').textContent = `● LIVE / ${formatted}`;
}

function clearPreviousRecord() {
  $('title').value = '';
  $('description').value = '';
  $('resolutionDescription').value = '';
  $('detailedDescription').value = '';
  $('tags').replaceChildren();
  $('transcript').textContent = '';
  $('timer').textContent = '00:00';
}

function setMonitorState(active) {
  $('audioMonitorState').textContent = active ? 'OUVINDO' : 'AGUARDANDO';
  ['micIndicator', 'clientIndicator'].forEach(id => {
    $(id).style.background = active ? '#080a09' : '#929b97';
  });
}

function stopAudioMonitor() {
  if (monitorFrame) cancelAnimationFrame(monitorFrame);
  monitorFrame = null;
  setMonitorState(false);
  const canvas = $('audioWaveform');
  const draw = canvas.getContext('2d');
  draw.clearRect(0, 0, canvas.width, canvas.height);
  draw.strokeStyle = '#929b97';
  draw.lineWidth = 1;
  [58, 180].forEach(y => { draw.beginPath(); draw.moveTo(0, y); draw.lineTo(canvas.width, y); draw.stroke(); });
}

function startAudioMonitor(micAnalyser, clientAnalyser) {
  const canvas = $('audioWaveform');
  const draw = canvas.getContext('2d');
  const micData = new Uint8Array(micAnalyser.frequencyBinCount);
  const clientData = new Uint8Array(clientAnalyser.frequencyBinCount);
  const drawChannel = (data, center, color, indicatorId) => {
    const bars = 58;
    const step = Math.max(1, Math.floor(data.length / bars));
    let total = 0;
    draw.fillStyle = color;
    for (let index = 0; index < bars; index += 1) {
      const level = data[index * step] || 0;
      total += level;
      const height = Math.max(3, (level / 255) * 50);
      const x = index * (canvas.width / bars) + 2;
      draw.fillRect(x, center - height, 10, height * 2);
    }
    $(indicatorId).style.background = total / bars > 8 ? color : '#929b97';
  };
  const render = () => {
    draw.fillStyle = '#e8ece9';
    draw.fillRect(0, 0, canvas.width, canvas.height);
    draw.strokeStyle = '#929b9777';
    [58, 180].forEach(y => { draw.beginPath(); draw.moveTo(0, y); draw.lineTo(canvas.width, y); draw.stroke(); });
    micAnalyser.getByteFrequencyData(micData);
    clientAnalyser.getByteFrequencyData(clientData);
    drawChannel(clientData, 58, '#080a09', 'clientIndicator');
    drawChannel(micData, 180, '#89938f', 'micIndicator');
    monitorFrame = requestAnimationFrame(render);
  };
  setMonitorState(true);
  render();
}

async function start() {
  let mic;
  let desktop;
  let context;
  try {
    clearPreviousRecord();
    setMessage('Solicitando acesso ao microfone e ao áudio do computador…');
    mic = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: $('microphone').value ? { exact: $('microphone').value } : undefined } });
    desktop = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: 1 } });
    if (!desktop.getAudioTracks().length) throw new Error('O Windows não disponibilizou o áudio do sistema. Verifique a saída de áudio padrão.');
    context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const micSource = context.createMediaStreamSource(mic);
    const clientSource = context.createMediaStreamSource(desktop);
    const micAnalyser = context.createAnalyser();
    const clientAnalyser = context.createAnalyser();
    [micAnalyser, clientAnalyser].forEach(analyser => { analyser.fftSize = 256; analyser.smoothingTimeConstant = .78; });
    micSource.connect(destination);
    clientSource.connect(destination);
    micSource.connect(micAnalyser);
    clientSource.connect(clientAnalyser);
    const startSegment = () => {
      segmentChunks = [];
      recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = event => { if (event.data.size) segmentChunks.push(event.data); };
      recorder.onstop = () => {
        const segment = new Blob(segmentChunks, { type: 'audio/webm' });
        if (segment.size) recordingSegments.push(segment);
        if (recordingActive) {
          startSegment();
        } else {
          stopAudioMonitor();
          mic.getTracks().forEach(track => track.stop());
          desktop.getTracks().forEach(track => track.stop());
          context.close();
          processAudioSegments(recordingSegments);
        }
      };
      recorder.start(1000);
    };
    recordingSegments = [];
    recordingActive = true;
    startSegment();
    startedAt = Date.now();
    timerId = setInterval(formatTime, 500);
    segmentTimer = setInterval(() => { if (recorder?.state === 'recording') recorder.stop(); }, SEGMENT_DURATION_MS);
    $('activeEmail').textContent = $('clientEmail').value.trim() || 'CONTACTO NÃO IDENTIFICADO';
    $('sessionId').textContent = `NT-${String(Date.now()).slice(-3)}-${String(Math.floor(Math.random() * 90) + 10)}`;
    $('start').disabled = true;
    $('stop').disabled = false;
    $('stopActive').disabled = false;
    setState('Gravando', true);
    setLivePhase('recording');
    setMessage('Gravação em andamento.');
    startAudioMonitor(micAnalyser, clientAnalyser);
  } catch (error) {
    mic?.getTracks().forEach(track => track.stop());
    desktop?.getTracks().forEach(track => track.stop());
    context?.close();
    stopAudioMonitor();
    recordingActive = false;
    $('start').disabled = false;
    $('stopActive').disabled = true;
    setState('Pronto para gravar');
    setLivePhase('ready');
    setMessage(`Não foi possível iniciar: ${error.message}`);
  }
}

function stop() {
  if (!recordingActive || !recorder) return;
  $('stop').disabled = true;
  $('stopActive').disabled = true;
  clearInterval(timerId);
  clearInterval(segmentTimer);
  recordingActive = false;
  setState('Processando');
  setLivePhase('processing');
  setMessage('Preparando as partes do atendimento para transcrição…');
  if (recorder.state !== 'inactive') recorder.stop();
}

function fillGeneratedRecord(record, transcript, message) {
  $('title').value = record.title || '';
  $('description').value = record.description || '';
  $('resolutionDescription').value = record.resolutionDescription || '';
  $('detailedDescription').value = record.detailedDescription || '';
  $('tags').replaceChildren();
  (record.tags || []).forEach(tag => addText($('tags'), 'span', 'tag', tag));
  if (!(record.tags || []).length) addText($('tags'), 'span', 'tag', 'SEM TAGS');
  $('transcript').textContent = transcript || '';
  setState('Registro pronto');
  setLivePhase('result');
  setMessage(message || 'Revise os campos antes de copiar.');
  $('resultHeading').focus?.();
}

window.applyGeneratedRecord = fillGeneratedRecord;

async function processAudioSegments(blobs) {
  try {
    setMessage(`Transcrevendo ${blobs.length} parte(s) e consolidando o atendimento…`);
    const segments = [];
    for (const blob of blobs) {
      segments.push({ audio: Array.from(new Uint8Array(await blob.arrayBuffer())), mimeType: blob.type });
    }
    const data = await window.niggatron.generate({ segments });
    await window.niggatron.saveRecord({ ...data.record, clientEmail: $('clientEmail').value.trim(), transcript: data.transcript });
    fillGeneratedRecord(data.record, data.transcript);
  } catch (error) {
    setState('Erro');
    setLivePhase('ready');
    setMessage(error.message || 'Não foi possível processar o atendimento.');
  } finally {
    $('start').disabled = false;
    $('headerStatus').textContent = 'SYSTEM / ONLINE';
  }
}

async function copyValue(value, confirmation) {
  await navigator.clipboard.writeText(value || '');
  setMessage(confirmation);
}

$('menuToggle').addEventListener('click', () => $('sideMenu').classList.contains('open') ? closeMenu() : openMenu());
$('menuEdge').addEventListener('pointerenter', openMenu);
$('sideMenu').addEventListener('pointerleave', () => closeMenu(false));
$('menuScrim').addEventListener('click', () => closeMenu());
$('liveNav').addEventListener('click', event => { event.preventDefault(); showView('live'); });
$('historyNav').addEventListener('click', event => { event.preventDefault(); showView('history'); });
$('encryptedNav').addEventListener('click', event => { event.preventDefault(); showView('encrypted'); });
$('microphone').addEventListener('change', updateInputLabel);
$('saveApiKey').addEventListener('click', saveSettings);
$('cancelDelete').addEventListener('click', closeDeleteModal);
$('deleteModal').addEventListener('click', event => { if (event.target === $('deleteModal')) closeDeleteModal(); });
$('confirmDelete').addEventListener('click', async () => {
  if (!pendingDeletion) return;
  const { record } = pendingDeletion;
  $('confirmDelete').disabled = true;
  try {
    await window.niggatron.deleteRecord(record.id);
    closeDeleteModal();
    await loadHistory();
  } catch (error) {
    $('historyMessage').textContent = error.message || 'Não foi possível apagar o atendimento.';
    closeDeleteModal();
  } finally {
    $('confirmDelete').disabled = false;
  }
});
$('start').addEventListener('click', start);
$('stop').addEventListener('click', stop);
$('stopActive').addEventListener('click', stop);
$('finishResult').addEventListener('click', () => { clearPreviousRecord(); setLivePhase('ready'); setState('Pronto para gravar'); setMessage(''); $('clientEmail').focus(); });
$('copyTitle').addEventListener('click', () => copyValue($('title').value, 'Título copiado.'));
$('copyDescription').addEventListener('click', () => copyValue($('description').value, 'Descrição copiada.'));
$('copyResolutionDescription').addEventListener('click', () => copyValue($('resolutionDescription').value, 'Descrição com resolução copiada.'));
$('copyDetailedDescription').addEventListener('click', () => copyValue($('detailedDescription').value, 'Descrição detalhada copiada.'));
$('copyTranscript').addEventListener('click', () => copyValue($('transcript').textContent, 'Transcrição copiada.'));
$('copy').addEventListener('click', () => {
  const tags = [...$('tags').querySelectorAll('.tag')].map(element => element.textContent).join(', ');
  return copyValue(`E-mail do cliente: ${$('clientEmail').value}\nTítulo: ${$('title').value}\nTags: ${tags}\nDescrição: ${$('description').value}\nDescrição com resolução: ${$('resolutionDescription').value}\nDescrição mais detalhada: ${$('detailedDescription').value}`, 'Registro copiado.');
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!$('deleteModal').classList.contains('hidden')) closeDeleteModal();
  else if ($('sideMenu').classList.contains('open')) closeMenu();
});
loadMicrophones();
loadAppVersion();
stopAudioMonitor();
setLivePhase('ready');