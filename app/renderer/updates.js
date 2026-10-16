const updateStatus = $('updateStatus');

function showUpdateStatus(data) {
  updateStatus.textContent = data.message;
  $('checkUpdates').disabled = data.state === 'checking' || data.state === 'downloading';
  $('installUpdate').classList.toggle('hidden', data.state !== 'ready');
}

$('checkUpdates').addEventListener('click', async () => {
  try { showUpdateStatus(await window.niggatron.checkForUpdates()); }
  catch (error) { showUpdateStatus({ state: 'error', message: error.message || 'Não foi possível verificar atualizações.' }); }
});
$('installUpdate').addEventListener('click', () => window.niggatron.installUpdate());
window.niggatron.onUpdateStatus(showUpdateStatus);

window.niggatron.onQuickRecordFinished(({ record, transcript, clientEmail }) => {
  showView('live');
  $('clientEmail').value = clientEmail || '';
  $('title').value = record.title || '';
  $('description').value = record.description || '';
  $('resolutionDescription').value = record.resolutionDescription || '';
  $('detailedDescription').value = record.detailedDescription || '';
  $('tags').innerHTML = (record.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('') || '<span class="hint">Nenhuma tag sugerida</span>';
  $('transcript').textContent = transcript || '';
  $('result').classList.remove('hidden');
  setState('Registro pronto');
  setMessage('Registro gerado pelo mini-painel. Revise os campos antes de copiar.');
});
