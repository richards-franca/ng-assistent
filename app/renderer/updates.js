const updateStatus = $('updateStatus');

function showUpdateStatus(data) {
  updateStatus.textContent = data.message;
  updateStatus.dataset.state = data.state || '';
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
  window.applyGeneratedRecord(record, transcript, 'Registro gerado pelo mini-painel. Revise os campos antes de copiar.');
});
