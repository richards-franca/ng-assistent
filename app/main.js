const { app, BrowserWindow, ipcMain, desktopCapturer, session, safeStorage, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
let quickWindow = null;
let isQuitting = false;

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); return mainWindow; }
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 880,
    minHeight: 630,
    backgroundColor: '#d6dcda',
    icon: path.join(__dirname, 'renderer', 'assets', 'niggatron-logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('close', event => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
    createQuickWindow();
  });
  mainWindow.on('show', () => { if (quickWindow && !quickWindow.isDestroyed()) quickWindow.hide(); });
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

function createQuickWindow() {
  if (quickWindow && !quickWindow.isDestroyed()) { quickWindow.showInactive(); return quickWindow; }
  const workArea = screen.getPrimaryDisplay().workArea;
  quickWindow = new BrowserWindow({
    width: 344, height: 412, x: workArea.x + workArea.width - 360, y: workArea.y + workArea.height - 430,
    resizable: true, minWidth: 260, minHeight: 300, maxWidth: 520, maxHeight: 620, minimizable: false, maximizable: false, frame: false, transparent: true, skipTaskbar: true,
    alwaysOnTop: true, backgroundColor: '#00000000', icon: path.join(__dirname, 'renderer', 'assets', 'niggatron-logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  quickWindow.setAlwaysOnTop(true, 'floating');
  quickWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  quickWindow.loadFile(path.join(__dirname, 'renderer', 'quick-recorder.html'));
  quickWindow.on('closed', () => { quickWindow = null; });
  return quickWindow;
}

function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', payload);
}

function configureUpdates() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking', message: 'Verificando atualizações...' }));
  autoUpdater.on('update-available', async info => {
    sendUpdateStatus({ state: 'downloading', message: `Atualização ${info.version} encontrada. Baixando...` });
    try { await autoUpdater.downloadUpdate(); } catch (error) { sendUpdateStatus({ state: 'error', message: `Não foi possível baixar a atualização: ${error.message}` }); }
  });
  autoUpdater.on('update-not-available', () => sendUpdateStatus({ state: 'latest', message: 'Você já está usando a versão mais recente.' }));
  autoUpdater.on('download-progress', progress => sendUpdateStatus({ state: 'downloading', message: `Baixando atualização: ${Math.round(progress.percent)}%` }));
  autoUpdater.on('update-downloaded', info => sendUpdateStatus({ state: 'ready', message: `Atualização ${info.version} pronta para instalar.` }));
  autoUpdater.on('error', error => sendUpdateStatus({ state: 'error', message: `Atualização indisponível: ${error.message}` }));
}

app.whenReady().then(() => {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => callback({ video: sources[0], audio: 'loopback' }));
  });
  ipcMain.handle('desktop-source', async () => (await desktopCapturer.getSources({ types: ['screen'] }))[0]?.id);
  ipcMain.handle('api-key-status', () => fs.existsSync(apiKeyFile()));
  ipcMain.handle('save-api-key', (_event, value) => saveApiKey(value));
  ipcMain.handle('groq-model', () => getGroqModel());
  ipcMain.handle('save-groq-model', (_event, value) => saveGroqModel(value));
  ipcMain.handle('app-version', () => app.getVersion());
  ipcMain.handle('save-record', (_event, record) => saveRecord(record));
  ipcMain.handle('list-records', () => listRecords());
  ipcMain.handle('delete-record', (_event, id) => deleteRecord(id));
  ipcMain.handle('groq-generate', generateRecord);
  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) return { state: 'development', message: 'A verificação de atualizações funciona no aplicativo instalado.' };
    await autoUpdater.checkForUpdates(); return { state: 'checking', message: 'Verificando atualizações...' };
  });
  ipcMain.handle('install-update', () => { isQuitting = true; autoUpdater.quitAndInstall(); });
  ipcMain.on('open-main-with-record', (_event, data) => {
    createWindow(); mainWindow.webContents.once('did-finish-load', () => mainWindow.webContents.send('quick-record-finished', data));
    if (mainWindow.webContents.getURL()) mainWindow.webContents.send('quick-record-finished', data);
  });
  ipcMain.on('quit-niggatron', () => { isQuitting = true; app.quit(); });
  ipcMain.on('resize-quick-window', (_event, delta) => {
    if (!quickWindow || quickWindow.isDestroyed()) return;
    const bounds = quickWindow.getBounds();
    const width = Math.max(260, Math.min(520, bounds.width + Number(delta || 0)));
    const height = Math.max(300, Math.min(620, Math.round(bounds.height + Number(delta || 0) * 1.2)));
    quickWindow.setSize(width, height);
  });
  configureUpdates();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => { if (isQuitting && process.platform !== 'darwin') app.quit(); });

const TAGS = ['API Oficial','Áudio','Automação','Botões/cmd','Bug','conexão','configurações','Disparos','Dúvidas','End Points','Financeiro','GHL','Grupos','instabilidade','Integração','Meta ADS Privacy','Migração','Notificação','Planos/Assinaturas','Proxy','Receptor','Restrição','Script','SDK','SMS','ST Chat','Stevo','Stevo Fusão','Stevo IA','Stevo Voice','Switch/Número De Referência','Toolkit','Transmissor','Webhook'];
const GROQ_MODELS = new Set(['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

function apiKeyFile() { return path.join(app.getPath('userData'), 'niggatron-key.bin'); }
function historyFile() { return path.join(app.getPath('userData'), 'niggatron-history.bin'); }
function settingsFile() { return path.join(app.getPath('userData'), 'niggatron-settings.json'); }
function getGroqModel() {
  if (!fs.existsSync(settingsFile())) return DEFAULT_GROQ_MODEL;
  try {
    const model = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')).groqModel;
    return GROQ_MODELS.has(model) ? model : DEFAULT_GROQ_MODEL;
  } catch { return DEFAULT_GROQ_MODEL; }
}
function saveGroqModel(value) {
  if (!GROQ_MODELS.has(value)) throw new Error('Selecione um modelo Groq compatível.');
  fs.writeFileSync(settingsFile(), JSON.stringify({ groqModel: value }), { encoding: 'utf8', mode: 0o600 });
  return value;
}
function saveApiKey(value) {
  if (!value?.trim()) throw new Error('Informe uma chave da API Groq.');
  if (!safeStorage.isEncryptionAvailable()) throw new Error('A criptografia segura do Windows não está disponível neste computador.');
  fs.writeFileSync(apiKeyFile(), safeStorage.encryptString(value.trim()).toString('base64'), { encoding: 'utf8', mode: 0o600 });
  return true;
}
function storedApiKey() {
  if (!fs.existsSync(apiKeyFile())) return null;
  try { return safeStorage.decryptString(Buffer.from(fs.readFileSync(apiKeyFile(), 'utf8'), 'base64')); }
  catch { throw new Error('Não foi possível abrir a chave salva. Configure-a novamente em Encrypted.'); }
}
function listRecords() {
  if (!fs.existsSync(historyFile())) return [];
  try {
    const encrypted = Buffer.from(fs.readFileSync(historyFile(), 'utf8'), 'base64');
    const records = JSON.parse(safeStorage.decryptString(encrypted));
    return Array.isArray(records) ? records : [];
  } catch { throw new Error('Não foi possível abrir o histórico local.'); }
}
function saveRecord(record) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('A criptografia segura do Windows não está disponível neste computador.');
  const history = listRecords();
  const entry = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), clientEmail: String(record.clientEmail || ''), title: String(record.title || ''), description: String(record.description || ''), resolutionDescription: String(record.resolutionDescription || ''), detailedDescription: String(record.detailedDescription || ''), tags: Array.isArray(record.tags) ? record.tags.filter(tag => TAGS.includes(tag)).slice(0, 3) : [], transcript: String(record.transcript || '') };
  history.unshift(entry);
  fs.writeFileSync(historyFile(), safeStorage.encryptString(JSON.stringify(history)).toString('base64'), { encoding: 'utf8', mode: 0o600 });
  return entry;
}
function deleteRecord(id) {
  const history = listRecords(); const nextHistory = history.filter(record => record.id !== id);
  if (nextHistory.length === history.length) throw new Error('Atendimento não encontrado no histórico.');
  fs.writeFileSync(historyFile(), safeStorage.encryptString(JSON.stringify(nextHistory)).toString('base64'), { encoding: 'utf8', mode: 0o600 });
  return true;
}

const TRANSCRIPT_BLOCK_SIZE = 12000;

function splitText(text, maxLength = TRANSCRIPT_BLOCK_SIZE) {
  const words = text.split(/\s+/).filter(Boolean); const blocks = []; let current = '';
  for (const word of words) {
    if (current && current.length + word.length + 1 > maxLength) { blocks.push(current); current = word; }
    else current += `${current ? ' ' : ''}${word}`;
  }
  if (current) blocks.push(current);
  return blocks;
}

async function transcribeSegment(audio, mimeType, headers, index, total) {
  const form = new FormData();
  form.append('model', 'whisper-large-v3-turbo'); form.append('language', 'pt'); form.append('response_format', 'json');
  form.append('file', new Blob([Buffer.from(audio)], { type: mimeType || 'audio/webm' }), `atendimento-parte-${index}.webm`);
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers, body: form });
  if (!response.ok) throw new Error(`Transcrição da parte ${index} de ${total} indisponível: ${await response.text()}`);
  return (await response.json()).text || '';
}

async function chatCompletion(headers, prompt, json = false) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: getGroqModel(), temperature: 0.15, messages: [{ role: 'user', content: prompt }], ...(json ? { response_format: { type: 'json_object' } } : {}) })
  });
  if (!response.ok) throw new Error(`Resumo indisponível: ${await response.text()}`);
  return (await response.json()).choices[0].message.content;
}

async function condenseTranscript(headers, transcript) {
  const blocks = splitText(transcript);
  if (blocks.length === 1) return transcript;
  const notes = [];
  for (let i = 0; i < blocks.length; i++) {
    notes.push(await chatCompletion(headers, `Resuma os fatos relevantes desta parte ${i + 1} de ${blocks.length} de um atendimento de suporte. Preserve: problema do cliente, testes, orientações, integrações/produtos citados e desfecho. Não invente informações. Responda em português, de forma objetiva.\n\n${blocks[i]}`));
  }
  // Se houver muitas partes, reduz novamente os apontamentos para manter a solicitação final curta.
  const joined = notes.join('\n\n');
  if (joined.length > TRANSCRIPT_BLOCK_SIZE) return condenseTranscript(headers, joined);
  return joined;
}

async function generateRecord(_event, { segments, audio, mimeType }) {
  const apiKey = storedApiKey();
  if (!apiKey) throw new Error('Configure a chave da API Groq na seção Encrypted.');
  const parts = Array.isArray(segments) && segments.length ? segments : (audio?.length ? [{ audio, mimeType }] : []);
  if (!parts.length) throw new Error('Não há áudio gravado para processar.');
  const headers = { Authorization: `Bearer ${apiKey.trim()}` };
  const transcripts = [];
  for (let i = 0; i < parts.length; i++) transcripts.push(await transcribeSegment(parts[i].audio, parts[i].mimeType || mimeType, headers, i + 1, parts.length));
  const text = transcripts.filter(Boolean).join('\n\n');
  const context = await condenseTranscript(headers, text);
  const prompt = `Você organiza registros de atendimentos de suporte em português do Brasil. Com base no conteúdo abaixo, responda SOMENTE JSON válido com as chaves title, description, resolutionDescription, detailedDescription e tags. title: curto, 2 a 7 palavras, estilo como "erro receber mensagem" ou "duvida sobre kommo". description: uma única frase curta, objetiva, em minúsculas exceto siglas/nomes próprios, no estilo "cliente relatou..."; é a descrição padrão atual. resolutionDescription: uma frase curta, com o problema e a orientação, teste ou resolução aplicada; se não houve resolução confirmada, deixe isso claro. detailedDescription: uma ou duas frases, um pouco mais detalhadas, incluindo contexto, testes/orientações e desfecho quando houver. tags: array com 1 a 3 itens escolhidos EXATAMENTE desta lista: ${JSON.stringify(TAGS)}. Não invente informações e não use markdown.\n\nConteúdo do atendimento:\n${context}`;
  const completion = await chatCompletion(headers, prompt, true);
  let record;
  try { record = JSON.parse(completion); } catch { throw new Error('A IA retornou um formato inválido. Tente novamente.'); }
  record.tags = (Array.isArray(record.tags) ? record.tags : []).filter(tag => TAGS.includes(tag)).slice(0, 3);
  return { transcript: text, record };
}
