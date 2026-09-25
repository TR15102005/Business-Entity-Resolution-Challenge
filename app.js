const sourceRecords = [
  {
    id: 'S1-00418',
    name: 'Northline Cafe<br />&amp; Bakery',
    address: '1832 North Lombard St,<br />Portland, OR 97217',
    country: 'United States',
  },
  {
    id: 'S2-11804',
    name: 'Northline Coffee<br />&amp; Bakehouse',
    address: '1832 N Lombard Street,<br />Portland, OR 97217',
    country: 'United States',
  },
  {
    id: 'S3-01931',
    name: 'Northline Bakery',
    address: 'Lombard Street, St Johns,<br />Portland, OR',
    country: 'United States',
  },
];

const recordName = document.querySelector('#recordName');
const recordId = document.querySelector('#recordId');
const recordAddress = document.querySelector('#recordAddress');
const recordCountry = document.querySelector('#recordCountry');
const sourceChip = document.querySelector('.source-chip');
const sourceTabs = document.querySelectorAll('.source-tab');
const runMatcher = document.querySelector('#runMatcher');
const workspaceShell = document.querySelector('.workspace-shell');
const workspaceNote = document.querySelector('#workspaceNote');
const confidenceValue = document.querySelector('#confidenceValue');
const confidenceRing = document.querySelector('#confidenceRing');
const candidateCount = document.querySelector('#candidateCount');
const reductionValue = document.querySelector('#reductionValue');
const incomingCount = document.querySelector('#incomingCount');
const blockCount = document.querySelector('#blockCount');
const inferenceCount = document.querySelector('#inferenceCount');
const blockBar = document.querySelector('#blockBar');
const inferenceBar = document.querySelector('#inferenceBar');
const candidateList = document.querySelector('#candidateList');
const decisionTag = document.querySelector('#decisionTag');
const decisionHeading = document.querySelector('#decisionHeading');
const decisionSummary = document.querySelector('#decisionSummary');
const nameScore = document.querySelector('#nameScore');
const addressScore = document.querySelector('#addressScore');
const countryScore = document.querySelector('#countryScore');
const matchThreshold = document.querySelector('#matchThreshold');
const thresholdValue = document.querySelector('#thresholdValue');
const downloadResults = document.querySelector('#downloadResults');
const reviewQueue = document.querySelector('#reviewQueue');
const reviewQueueHeading = document.querySelector('#reviewQueueHeading');
const reviewQueueList = document.querySelector('#reviewQueueList');
const runEvaluation = document.querySelector('#runEvaluation');
const evaluationResults = document.querySelector('#evaluationResults');
const evaluationStatus = document.querySelector('#evaluationStatus');
const evaluationPrecision = document.querySelector('#evaluationPrecision');
const evaluationRecall = document.querySelector('#evaluationRecall');
const evaluationFhalf = document.querySelector('#evaluationFhalf');
const evaluationTp = document.querySelector('#evaluationTp');
const evaluationFp = document.querySelector('#evaluationFp');
const evaluationFn = document.querySelector('#evaluationFn');

let selectedSourceIndex = 0;
let loadedRecordIndex = 0;
let acceptanceThreshold = Number(matchThreshold.value) / 100;
let latestMatch = null;
let evaluationResult = null;

thresholdValue.textContent = `${matchThreshold.value}%`;

sourceTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    selectedSourceIndex = Number(tab.dataset.source);
    sourceTabs.forEach((item) => item.classList.toggle('active', item === tab));
    clearLatestMatch();

    if (hasSourceData()) {
      const sourceKey = sourceKeyAt(selectedSourceIndex);
      const dataset = datasets.get(sourceKey);
      const record = dataset.rows[loadedRecordIndex % dataset.rows.length];
      renderLoadedReference(record, sourceKey);
      workspaceNote.textContent = 'Run match analysis to generate candidates from the other uploaded sources.';
      return;
    }

    const record = sourceRecords[selectedSourceIndex];
    recordName.innerHTML = record.name;
    recordId.textContent = record.id;
    recordAddress.innerHTML = record.address;
    recordCountry.textContent = record.country;
    sourceChip.textContent = `SOURCE ${selectedSourceIndex + 1}`;
  });
});

runMatcher.addEventListener('click', () => {
  if (runMatcher.disabled) return;

  if (hasSourceData()) {
    runGeneratedMatcher();
    return;
  }

  runDemoMatcher();
});

const expectedColumns = {
  source1: ['entity_id', 'business_name', 'business_address', 'country'],
  source2: ['entity_id', 'business_name', 'business_address', 'country'],
  source3: ['entity_id', 'business_name', 'business_address', 'country'],
  groundTruth: ['source1_entity_id', 'matched_entity_ids'],
};

const starterFiles = [
  { kind: 'source1', fileName: 'train_source1.tsv', path: 'sample-data/train_source1.tsv' },
  { kind: 'source2', fileName: 'train_source2.tsv', path: 'sample-data/train_source2.tsv' },
  { kind: 'source3', fileName: 'train_source3.tsv', path: 'sample-data/train_source3.tsv' },
  { kind: 'groundTruth', fileName: 'train_ground_truth.tsv', path: 'sample-data/train_ground_truth.tsv' },
];

const datasets = new Map();
const dataStatus = document.querySelector('#dataStatus');
const loadSamples = document.querySelector('#loadSamples');
const previewName = document.querySelector('#previewName');
const previewHead = document.querySelector('#previewHead');
const previewBody = document.querySelector('#previewBody');
const fileInputs = document.querySelectorAll('[data-file-input]');

function sourceKeyAt(index) {
  return `source${index + 1}`;
}

function sourceNumber(sourceKey) {
  return sourceKey.replace('source', '');
}

function hasSourceData() {
  return ['source1', 'source2', 'source3'].every((kind) => datasets.has(kind));
}

function clearEvaluation() {
  evaluationResult = null;
  evaluationResults.hidden = true;
}

function updateEvaluationAvailability() {
  const ready = hasSourceData() && datasets.has('groundTruth');
  runEvaluation.disabled = !ready;

  if (evaluationResult) return;

  if (ready) {
    evaluationStatus.textContent = `Ready to evaluate automatic links at the ${matchThreshold.value}% threshold.`;
    return;
  }

  evaluationStatus.textContent = datasets.has('groundTruth')
    ? 'Load all three source files to evaluate automatic links.'
    : 'Load all three sources and ground-truth labels to evaluate automatic links.';
}

function matchedEntityIds(value) {
  return new Set(String(value ?? '').split(',').map((id) => id.trim()).filter(Boolean));
}

function formatEvaluationMetric(value) {
  return value === null ? '—' : value.toFixed(3);
}

function calculateFHalf(precision, recall) {
  if (precision === null || recall === null || (precision === 0 && recall === 0)) return 0;

  return (1.25 * precision * recall) / ((0.25 * precision) + recall);
}

function renderEvaluation(result) {
  evaluationResult = result;
  evaluationPrecision.textContent = formatEvaluationMetric(result.precision);
  evaluationRecall.textContent = formatEvaluationMetric(result.recall);
  evaluationFhalf.textContent = formatEvaluationMetric(result.fHalf);
  evaluationTp.textContent = result.truePositive;
  evaluationFp.textContent = result.falsePositive;
  evaluationFn.textContent = result.falseNegative;
  evaluationResults.hidden = false;
  evaluationStatus.textContent = `${result.references} labeled reference ${result.references === 1 ? 'record' : 'records'} · ${result.predictions} automatic link${result.predictions === 1 ? '' : 's'} at the ${matchThreshold.value}% threshold.`;
}

function evaluateGroundTruth() {
  if (!hasSourceData() || !datasets.has('groundTruth')) {
    updateEvaluationAvailability();
    return;
  }

  try {
    const sourceRecordsById = new Map(datasets.get('source1').rows.map((record) => [record.entity_id, record]));
    const expectedByReference = new Map();

    datasets.get('groundTruth').rows.forEach((label) => {
      if (!sourceRecordsById.has(label.source1_entity_id)) {
        throw new Error(`Unknown Source 1 ID: ${label.source1_entity_id}`);
      }

      const expected = expectedByReference.get(label.source1_entity_id) ?? new Set();
      matchedEntityIds(label.matched_entity_ids).forEach((id) => expected.add(id));
      expectedByReference.set(label.source1_entity_id, expected);
    });

    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    let predictions = 0;

    expectedByReference.forEach((expected, referenceId) => {
      const reference = sourceRecordsById.get(referenceId);
      const generated = generateCandidates(reference, 'source1');
      const predicted = new Set(generated.candidates
        .filter((candidate) => candidateStatus(candidate.score) === 'accept')
        .map((candidate) => candidate.record.entity_id));

      predictions += predicted.size;
      predicted.forEach((id) => {
        if (expected.has(id)) {
          truePositive += 1;
        } else {
          falsePositive += 1;
        }
      });
      expected.forEach((id) => {
        if (!predicted.has(id)) falseNegative += 1;
      });
    });

    const precision = predictions ? truePositive / predictions : null;
    const expectedLinks = truePositive + falseNegative;
    const recall = expectedLinks ? truePositive / expectedLinks : null;
    const fHalf = calculateFHalf(precision, recall);

    renderEvaluation({
      references: expectedByReference.size,
      predictions,
      truePositive,
      falsePositive,
      falseNegative,
      precision,
      recall,
      fHalf,
    });
  } catch (error) {
    clearEvaluation();
    evaluationStatus.textContent = error.message;
  }
}

function normalizeTokens(value) {
  const aliases = {
    st: 'street',
    rd: 'road',
    ave: 'avenue',
    blvd: 'boulevard',
    n: 'north',
    s: 'south',
    e: 'east',
    w: 'west',
    fifth: '5',
    harbour: 'harbor',
    bangalore: 'bengaluru',
    oregon: 'or',
    de: '',
    la: '',
  };

  return new Set(value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .map((token) => aliases[token] ?? token)
    .filter((token) => token && (token.length > 1 || /\d/.test(token))));
}

function tokenSimilarity(left, right) {
  const leftTokens = normalizeTokens(left);
  const rightTokens = normalizeTokens(right);
  const union = new Set([...leftTokens, ...rightTokens]);

  if (!union.size) return 0;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / union.size;
}

function candidateStatus(score) {
  const reviewThreshold = Math.max(0, acceptanceThreshold - 0.2);

  if (score >= acceptanceThreshold) return 'accept';
  if (score >= reviewThreshold) return 'review';
  return 'reject';
}

function candidateKey(candidate) {
  return `${candidate.sourceKey}:${candidate.record.entity_id}`;
}

function candidateDecision(candidate) {
  const manualDecision = latestMatch?.manualDecisions?.get(candidateKey(candidate));

  return {
    status: manualDecision ?? candidateStatus(candidate.score),
    origin: manualDecision ? 'manual' : 'automatic',
  };
}

function calculateCandidate(reference, record, sourceKey) {
  const nameAlignment = tokenSimilarity(reference.business_name, record.business_name);
  const addressAlignment = tokenSimilarity(reference.business_address, record.business_address);
  const countryAgreement = Number(
    reference.country.trim().toLowerCase() === record.country.trim().toLowerCase(),
  );
  const score = (nameAlignment * 0.5) + (addressAlignment * 0.35) + (countryAgreement * 0.15);

  return {
    record,
    sourceKey,
    nameAlignment,
    addressAlignment,
    countryAgreement,
    score,
  };
}

function generateCandidates(reference, referenceSource) {
  const targetRecords = ['source1', 'source2', 'source3']
    .filter((sourceKey) => sourceKey !== referenceSource)
    .flatMap((sourceKey) => datasets.get(sourceKey).rows.map((record) => ({ record, sourceKey })));
  const sameCountryRecords = targetRecords.filter(({ record }) => (
    reference.country.trim().toLowerCase() === record.country.trim().toLowerCase()
  ));
  const candidates = sameCountryRecords
    .map(({ record, sourceKey }) => calculateCandidate(reference, record, sourceKey))
    .filter((candidate) => candidate.nameAlignment >= 0.2 || candidate.addressAlignment >= 0.3)
    .sort((left, right) => right.score - left.score);

  return { incoming: targetRecords.length, blocked: sameCountryRecords.length, candidates };
}

function renderLoadedReference(record, sourceKey) {
  recordName.textContent = record.business_name;
  recordId.textContent = record.entity_id;
  recordAddress.textContent = record.business_address;
  recordCountry.textContent = record.country;
  sourceChip.textContent = `SOURCE ${sourceNumber(sourceKey)}`;
}

function renderCandidate(candidate, rank) {
  const decision = candidateDecision(candidate);
  const { status, origin } = decision;
  const card = document.createElement('article');
  card.className = `candidate${status === 'accept' ? ' candidate-accepted' : ''}${origin === 'manual' ? ' candidate-manual' : ''}`;

  const rankElement = document.createElement('div');
  rankElement.className = 'candidate-rank';
  rankElement.textContent = String(rank).padStart(2, '0');

  const info = document.createElement('div');
  info.className = 'candidate-info';
  const businessName = document.createElement('strong');
  businessName.textContent = candidate.record.business_name;
  const detail = document.createElement('span');
  detail.textContent = `${candidate.record.entity_id} · ${candidate.record.business_address}`;
  info.append(businessName, detail);

  const score = document.createElement('div');
  score.className = `score ${status === 'accept' ? 'good' : status}`;
  const value = document.createElement('b');
  value.textContent = candidate.score.toFixed(2);
  const statusLabel = document.createElement('span');
  statusLabel.textContent = origin === 'manual' ? (status === 'accept' ? 'approved' : 'rejected') : status;
  score.append(value, statusLabel);

  card.append(rankElement, info, score);
  return card;
}

function renderGeneratedCandidates(candidates) {
  candidateList.replaceChildren();

  if (!candidates.length) {
    const empty = document.createElement('p');
    empty.className = 'workspace-note';
    empty.textContent = 'No country-and-token block produced a candidate for this record.';
    candidateList.append(empty);
    return;
  }

  candidates.slice(0, 5).forEach((candidate, index) => {
    candidateList.append(renderCandidate(candidate, index + 1));
  });
}

function createReviewMetric(label, value) {
  const metric = document.createElement('div');
  const name = document.createElement('span');
  const score = document.createElement('b');
  name.textContent = label;
  score.textContent = value;
  metric.append(name, score);
  return metric;
}

function renderReviewCard(candidate) {
  const card = document.createElement('article');
  card.className = 'review-card';

  const topline = document.createElement('div');
  topline.className = 'review-card-topline';
  const source = document.createElement('span');
  source.textContent = `SOURCE ${sourceNumber(candidate.sourceKey)} · ${candidate.record.entity_id}`;
  const confidence = document.createElement('span');
  confidence.textContent = `${Math.round(candidate.score * 100)}% confidence`;
  topline.append(source, confidence);

  const name = document.createElement('h4');
  name.textContent = candidate.record.business_name;
  const address = document.createElement('p');
  address.textContent = candidate.record.business_address;

  const evidence = document.createElement('div');
  evidence.className = 'review-evidence';
  evidence.append(
    createReviewMetric('Name', candidate.nameAlignment.toFixed(2)),
    createReviewMetric('Address', candidate.addressAlignment.toFixed(2)),
    createReviewMetric('Country', candidate.countryAgreement.toFixed(2)),
  );

  const actions = document.createElement('div');
  actions.className = 'review-actions';
  const approve = document.createElement('button');
  approve.className = 'review-action review-approve';
  approve.type = 'button';
  approve.dataset.candidateKey = candidateKey(candidate);
  approve.dataset.decision = 'accept';
  approve.textContent = 'Approve link';
  const reject = document.createElement('button');
  reject.className = 'review-action review-reject';
  reject.type = 'button';
  reject.dataset.candidateKey = candidateKey(candidate);
  reject.dataset.decision = 'reject';
  reject.textContent = 'Reject';
  actions.append(approve, reject);

  card.append(topline, name, address, evidence, actions);
  return card;
}

function renderReviewQueue() {
  reviewQueueList.replaceChildren();

  if (!latestMatch) {
    reviewQueue.hidden = true;
    return;
  }

  const borderlineCandidates = latestMatch.result.candidates.filter((candidate) => (
    candidateStatus(candidate.score) === 'review' && candidateDecision(candidate).origin === 'automatic'
  ));
  reviewQueue.hidden = borderlineCandidates.length === 0;
  reviewQueueHeading.textContent = `${borderlineCandidates.length} borderline ${borderlineCandidates.length === 1 ? 'case' : 'cases'}`;
  borderlineCandidates.forEach((candidate) => reviewQueueList.append(renderReviewCard(candidate)));
}

function primaryDecisionCandidate(candidates) {
  return candidates.find((candidate) => candidateDecision(candidate).status === 'accept') ?? candidates[0];
}

function updateFunnel(result) {
  candidateCount.textContent = `${result.candidates.length} record${result.candidates.length === 1 ? '' : 's'} worth scoring`;
  incomingCount.textContent = result.incoming;
  blockCount.textContent = result.blocked;
  inferenceCount.textContent = result.candidates.length;
  blockBar.style.setProperty('--width', `${result.incoming ? (result.blocked / result.incoming) * 100 : 0}%`);
  inferenceBar.style.setProperty('--width', `${result.incoming ? (result.candidates.length / result.incoming) * 100 : 0}%`);
  const reduction = result.incoming ? (1 - (result.candidates.length / result.incoming)) * 100 : 0;
  reductionValue.textContent = `${reduction.toFixed(1)}% reduced`;
}

function updateDecision(candidate) {
  const confidence = candidate ? Math.round(candidate.score * 100) : 0;
  const decision = candidate ? candidateDecision(candidate) : null;
  confidenceValue.textContent = confidence;
  confidenceRing.style.background = `conic-gradient(#8eba1a 0deg ${confidence * 3.6}deg, #d7ded2 ${confidence * 3.6}deg 360deg)`;
  nameScore.textContent = candidate ? candidate.nameAlignment.toFixed(2) : '0.00';
  addressScore.textContent = candidate ? candidate.addressAlignment.toFixed(2) : '0.00';
  countryScore.textContent = candidate ? candidate.countryAgreement.toFixed(2) : '0.00';

  if (decision?.origin === 'manual' && decision.status === 'accept') {
    decisionTag.textContent = 'MANUALLY APPROVED';
    decisionHeading.textContent = 'Reviewer approved this link';
    decisionSummary.textContent = 'A reviewer promoted this borderline candidate to a final link.';
    return;
  }

  if (decision?.origin === 'manual' && decision.status === 'reject') {
    decisionTag.textContent = 'MANUALLY REJECTED';
    decisionHeading.textContent = 'Reviewer rejected this link';
    decisionSummary.textContent = 'This candidate remains excluded from the final links.';
    return;
  }

  if (decision?.status === 'accept') {
    decisionTag.textContent = 'MATCH APPROVED';
    decisionHeading.textContent = 'One high-confidence link';
    decisionSummary.textContent = 'Independent name, address, and country signals clear the automatic-link threshold.';
    return;
  }

  if (decision?.status === 'review') {
    decisionTag.textContent = 'REVIEW REQUIRED';
    decisionHeading.textContent = 'Keep the best candidate unlinked';
    decisionSummary.textContent = 'A plausible candidate was found, but its evidence remains below the automatic-link threshold.';
    return;
  }

  decisionTag.textContent = 'NO MATCH FOUND';
  decisionHeading.textContent = candidate ? 'No candidate was approved' : 'No candidate passed blocking';
  decisionSummary.textContent = candidate
    ? 'The best candidate did not meet the automatic threshold or receive reviewer approval.'
    : 'No record in the other uploaded sources shared enough country and token evidence to score.';
}

function clearLatestMatch() {
  latestMatch = null;
  downloadResults.disabled = true;
  renderReviewQueue();
}

function renderLatestMatch() {
  if (!latestMatch) return;

  updateFunnel(latestMatch.result);
  renderGeneratedCandidates(latestMatch.result.candidates);
  updateDecision(primaryDecisionCandidate(latestMatch.result.candidates));
  renderReviewQueue();
}

function tsvCell(value) {
  const text = String(value ?? '').replace(/[\t\r\n]+/g, ' ');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function downloadMatchResults() {
  if (!latestMatch) return;

  const { reference, sourceKey, result } = latestMatch;
  const headers = [
    'reference_source',
    'reference_entity_id',
    'reference_business_name',
    'candidate_source',
    'candidate_entity_id',
    'candidate_business_name',
    'match_score',
    'decision',
    'decision_origin',
    'name_alignment',
    'address_alignment',
    'country_agreement',
    'acceptance_threshold',
  ];
  const rows = result.candidates.map((candidate) => {
    const decision = candidateDecision(candidate);

    return [
      sourceKey,
      reference.entity_id,
      reference.business_name,
      candidate.sourceKey,
      candidate.record.entity_id,
      candidate.record.business_name,
      candidate.score.toFixed(4),
      decision.status,
      decision.origin,
      candidate.nameAlignment.toFixed(4),
      candidate.addressAlignment.toFixed(4),
      candidate.countryAgreement.toFixed(4),
      acceptanceThreshold.toFixed(2),
    ];
  });
  const tsv = [headers, ...rows].map((row) => row.map(tsvCell).join('\t')).join('\n');
  const url = URL.createObjectURL(new Blob([`${tsv}\n`], { type: 'text/tab-separated-values;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'matching_candidates.tsv';
  link.click();
  URL.revokeObjectURL(url);
}

matchThreshold.addEventListener('input', () => {
  acceptanceThreshold = Number(matchThreshold.value) / 100;
  thresholdValue.textContent = `${matchThreshold.value}%`;
  renderLatestMatch();

  if (latestMatch) {
    const manualNote = latestMatch.manualDecisions.size ? ' Manual decisions remain unchanged.' : '';
    workspaceNote.textContent = `Auto-link threshold set to ${matchThreshold.value}%. Candidate decisions were recalculated locally.${manualNote}`;
  }

  if (evaluationResult) {
    clearEvaluation();
    evaluationStatus.textContent = `Threshold changed to ${matchThreshold.value}%. Evaluate labels again to refresh the metrics.`;
  }
});

reviewQueueList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;

  const action = event.target.closest('button[data-candidate-key][data-decision]');
  if (!action || !latestMatch) return;

  latestMatch.manualDecisions.set(action.dataset.candidateKey, action.dataset.decision);
  renderLatestMatch();
  workspaceNote.textContent = `Borderline candidate ${action.dataset.decision === 'accept' ? 'approved' : 'rejected'} and included in the local TSV export.`;
});

downloadResults.addEventListener('click', downloadMatchResults);
runEvaluation.addEventListener('click', evaluateGroundTruth);

function runDemoMatcher() {
  const reference = {
    entity_id: 'S1-00418',
    business_name: 'Northline Cafe & Bakery',
    business_address: '1832 North Lombard St, Portland, OR 97217',
    country: 'United States',
  };
  const result = {
    incoming: 12481,
    blocked: 164,
    candidates: [
      {
        sourceKey: 'source2',
        record: { entity_id: 'S2-11804', business_name: 'Northline Coffee & Bakehouse', business_address: '1832 N Lombard Street, Portland, OR 97217', country: 'United States' },
        score: 0.96,
        nameAlignment: 0.94,
        addressAlignment: 0.98,
        countryAgreement: 1,
      },
      {
        sourceKey: 'source3',
        record: { entity_id: 'S3-01931', business_name: 'Northline Bakery', business_address: 'Lombard Street, St Johns, Portland, OR', country: 'United States' },
        score: 0.74,
        nameAlignment: 0.73,
        addressAlignment: 0.64,
        countryAgreement: 1,
      },
      {
        sourceKey: 'source3',
        record: { entity_id: 'S3-22048', business_name: 'Northline Café', business_address: 'St Johns, Portland', country: 'United States' },
        score: 0.48,
        nameAlignment: 0.42,
        addressAlignment: 0.33,
        countryAgreement: 1,
      },
    ],
  };

  clearLatestMatch();
  runMatcher.disabled = true;
  runMatcher.innerHTML = '<span class="run-icon">◌</span> Scoring signals';
  workspaceShell.classList.remove('analysis-complete');
  workspaceShell.classList.add('is-running');
  workspaceNote.textContent = 'Building the final candidate set and checking independent evidence…';

  window.setTimeout(() => {
    latestMatch = { reference, sourceKey: 'source1', result, manualDecisions: new Map() };
    renderLoadedReference(reference, 'source1');
    renderLatestMatch();
    workspaceShell.classList.remove('is-running');
    workspaceShell.classList.add('analysis-complete');
    downloadResults.disabled = false;
    runMatcher.disabled = false;
    runMatcher.innerHTML = '<span class="run-icon">↻</span> Run again';
    workspaceNote.textContent = 'Analysis complete: one confident match accepted; two ambiguous candidates remain unlinked.';
  }, 1450);
}

function runGeneratedMatcher() {
  const sourceKey = sourceKeyAt(selectedSourceIndex);
  const sourceDataset = datasets.get(sourceKey);
  const reference = sourceDataset.rows[loadedRecordIndex % sourceDataset.rows.length];
  const result = generateCandidates(reference, sourceKey);

  clearLatestMatch();
  runMatcher.disabled = true;
  runMatcher.innerHTML = '<span class="run-icon">◌</span> Generating candidates';
  workspaceShell.classList.remove('analysis-complete');
  workspaceShell.classList.add('is-running');
  workspaceNote.textContent = `Blocking records from Sources 1–3 against ${reference.entity_id}…`;

  window.setTimeout(() => {
    latestMatch = { reference, sourceKey, result, manualDecisions: new Map() };
    renderLoadedReference(reference, sourceKey);
    renderLatestMatch();
    workspaceShell.classList.remove('is-running');
    workspaceShell.classList.add('analysis-complete');
    downloadResults.disabled = false;
    runMatcher.disabled = false;
    runMatcher.innerHTML = '<span class="run-icon">↻</span> Run next record';
    workspaceNote.textContent = `Generated ${result.candidates.length} candidate${result.candidates.length === 1 ? '' : 's'} from ${result.incoming} records. Scores are local, explainable heuristics.`;
    loadedRecordIndex = (loadedRecordIndex + 1) % sourceDataset.rows.length;
  }, 850);
}

function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length < 2) {
    throw new Error('Add a header row and at least one record.');
  }

  const headers = lines[0].split('\t').map((header) => header.trim());

  if (headers.length < 2) {
    throw new Error('Use tabs to separate columns.');
  }

  const rows = lines.slice(1).map((line) => {
    const values = line.split('\t');
    return headers.reduce((record, header, index) => {
      record[header] = values[index] ?? '';
      return record;
    }, {});
  });

  return { headers, rows };
}

function validateSchema(kind, headers) {
  const missing = expectedColumns[kind].filter((column) => !headers.includes(column));

  if (missing.length) {
    throw new Error(`Missing ${missing.join(', ')}`);
  }
}

function setCardState(kind, state, message) {
  const card = document.querySelector(`[data-file-card="${kind}"]`);
  const status = document.querySelector(`[data-file-status="${kind}"]`);

  card.classList.toggle('is-ready', state === 'ready');
  card.classList.toggle('has-error', state === 'error');
  status.textContent = message;
}

function updateDataStatus() {
  const sourcesReady = ['source1', 'source2', 'source3'].filter((kind) => datasets.has(kind)).length;
  const labelsReady = datasets.has('groundTruth');
  dataStatus.textContent = `${sourcesReady} of 3 source files ready${labelsReady ? ' · labels ready' : ''}`;
}

function buildCell(value, type) {
  const cell = document.createElement(type);
  cell.textContent = value;
  return cell;
}

function renderPreview(dataset) {
  previewName.textContent = `${dataset.fileName} · ${dataset.rows.length} records`;
  previewHead.replaceChildren();
  previewBody.replaceChildren();

  const headerRow = document.createElement('tr');
  dataset.headers.forEach((header) => headerRow.append(buildCell(header, 'th')));
  previewHead.append(headerRow);

  dataset.rows.slice(0, 4).forEach((record) => {
    const row = document.createElement('tr');
    dataset.headers.forEach((header) => row.append(buildCell(record[header], 'td')));
    previewBody.append(row);
  });
}

function storeDataset(kind, fileName, text) {
  const parsed = parseTsv(text);
  validateSchema(kind, parsed.headers);

  const dataset = { ...parsed, fileName };
  datasets.set(kind, dataset);
  clearEvaluation();
  if (kind.startsWith('source')) {
    loadedRecordIndex = 0;
    clearLatestMatch();
  }
  setCardState(kind, 'ready', `${parsed.rows.length} records`);
  updateDataStatus();
  updateEvaluationAvailability();
  renderPreview(dataset);
}

function handleDatasetError(kind, error) {
  datasets.delete(kind);
  clearEvaluation();
  setCardState(kind, 'error', error.message);
  updateDataStatus();
  updateEvaluationAvailability();
}

async function readLocalFile(kind, file) {
  if (!file) return;

  try {
    if (!file.name.toLowerCase().endsWith('.tsv')) {
      throw new Error('Choose a .tsv file');
    }

    storeDataset(kind, file.name, await file.text());
  } catch (error) {
    handleDatasetError(kind, error);
  }
}

fileInputs.forEach((input) => {
  input.addEventListener('change', () => {
    readLocalFile(input.dataset.fileInput, input.files[0]);
  });
});

loadSamples.addEventListener('click', async () => {
  loadSamples.disabled = true;
  loadSamples.innerHTML = 'Loading starter data <span>◌</span>';

  try {
    const files = await Promise.all(starterFiles.map(async (file) => {
      const response = await fetch(file.path);

      if (!response.ok) {
        throw new Error(`Could not load ${file.fileName}`);
      }

      return { ...file, text: await response.text() };
    }));

    files.forEach((file) => storeDataset(file.kind, file.fileName, file.text));
  } catch (error) {
    dataStatus.textContent = error.message;
  } finally {
    loadSamples.disabled = false;
    loadSamples.innerHTML = 'Load starter data <span>→</span>';
  }
});
