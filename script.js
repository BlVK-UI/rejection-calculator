  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }


  const MAX_DEDUCTION = 5; //change this single value to change the maximum deduction for all employees. This is a global constant that can be adjusted as needed.

  const REJECTION_CAP = 5; // 5 or more rejections will always result in the maximum deduction, regardless of the rejection rate. This is a global constant that can be adjusted as needed.

  function describeCurve(k) {
  if (k < 1) return { label: `Harsh → Flat (k = ${k})`, desc: 'Stings early, then levels off.' };
  if (k > 1) return { label: `Lenient → Harsh (k = ${k})`, desc: 'Forgiving near threshold, steep near max.' };
  return { label: `Linear (k = ${k})`, desc: 'Every % over threshold costs the same.' };
}

function updateCurveDisplay(k) {
  const { label, desc } = describeCurve(k);
  document.getElementById('curveLabel').textContent = label;
  document.getElementById('curveDesc').textContent = desc;
}

  const OPENING_PRESETS = {
  modifier: { T: 0, M: 5, k: 1,   V: 50 },
  verifier: { T: 0, M: 5, k: 0.6, V: 30 },
};

const MAINTENANCE_TIERS = {
  under30:  { modifier: 20,  verifier: 15 },
  '30to75': { modifier: 50,  verifier: 30 },
  '75to150':{ modifier: 100, verifier: 60 },
  '150plus':{ modifier: 130, verifier: 80 },
};

function tierFromVolume(n) {
  if (n < 30) return 'under30';
  if (n <= 75) return '30to75';
  if (n <= 150) return '75to150';
  return '150plus';
}

const MAINTENANCE_BASE = {
  modifier: { T: 0, M: 5, k: 1 },
  verifier: { T: 0, M: 5, k: 0.6 },
};

function applyMaintenancePreset(role, tier) {
  const base = MAINTENANCE_BASE[role];
  const V = MAINTENANCE_TIERS[tier][role];

  el.T.value = base.T;
  el.M.value = base.M;
  el.k.value = base.k;
  el.V.value = V;
  updateCurveDisplay(base.k);
  recalc();

 

  recalc();
}

function applyOpeningPreset(role) {
  const preset = OPENING_PRESETS[role];
  el.T.value = preset.T;
  el.M.value = preset.M;
  el.k.value = preset.k;
  el.V.value = preset.V;
  updateCurveDisplay(preset.k);
  recalc();

 
}
 
  function computeDeduction(accounts, rejections, T, M, k, V) {
  
    const N = Number(accounts) || 0;
    const R = Number(rejections) || 0;
    if (N <= 0) return { RR: 0, rawDeduction: 0, VF: 0, final: 0 };
 
    const RR = (R / N) * 100;

    // Hard override : hitting the rejection cap means max deduction, regardless of the rejection rate, threshold, curve or volume floor.
    if (R >= REJECTION_CAP) {
      return { RR, rawDeduction: MAX_DEDUCTION, VF: clamp(N / V, 0, 1), final: MAX_DEDUCTION * clamp(N / V, 0, 1) };
    }
    const span = M - T;
    let position = span > 0 ? (RR - T) / span : 0;
    position = clamp(position, 0, 1);
    const rawDeduction = Math.pow(position, k) *MAX_DEDUCTION;
 
    const VF = clamp(N / V, 0, 1);
    const final = rawDeduction * VF;
 
    return { RR, rawDeduction, VF, final };
  }
 
  function barColor(final) {
    if (final === 0) return '#3b6e5e';
    if (final < 25) return '#7a8f4a';
    if (final < 50) return '#c99a3e';
    if (final < 75) return '#c9703e';
    return '#b8433f';
  }
 
  const el = {
    name: document.getElementById('empName'),
    accounts: document.getElementById('accounts'),
    rejections: document.getElementById('rejections'),
    T: document.getElementById('T'),
    M: document.getElementById('M'),
    V: document.getElementById('V'),
    k: document.getElementById('k'),
    resultName: document.getElementById('resultName'),
    finalScore: document.getElementById('finalScore'),
    barFill: document.getElementById('barFill'),
    rrValue: document.getElementById('rrValue'),
    rawValue: document.getElementById('rawValue'),
    vfValue: document.getElementById('vfValue'),
    curveOptions: document.getElementById('curveOptions'),
  };
 
  function recalc() {
    const result = computeDeduction(
      el.accounts.value,
      el.rejections.value,
      Number(el.T.value),
      Number(el.M.value),
      Number(el.k.value),
      Number(el.V.value)
    );
 
    el.resultName.textContent = el.name.value.trim() ? el.name.value.trim() : 'This employee';
    el.finalScore.textContent = result.final.toFixed(1);
    el.barFill.style.width = result.final + '%';
    el.barFill.style.background = barColor(result.final);
    el.rrValue.textContent = result.RR.toFixed(2) + '%';
    el.rawValue.textContent = result.rawDeduction.toFixed(1);
    el.vfValue.textContent = result.VF.toFixed(2);
  }
 
  // Recalculate whenever any input changes
  [el.name, el.accounts, el.rejections, el.T, el.M, el.V, el.k].forEach((input) => {
    input.addEventListener('input', recalc);
  });
  
  el.accounts.addEventListener('input', autoUpdateTier);

  // Curve shape buttons
  el.curveOptions.querySelectorAll('.curve-btn').forEach((btn) => {
   btn.style.cursor = 'default'; 
  });
 
  function validateInputs(accounts, rejections, T, M, k, V) {
  const errors = [];
  const N = Number(accounts);
  const R = Number(rejections);

  if (isNaN(N) || N <= 0) errors.push("Accounts completed must be a number greater than 0.");
  if (isNaN(R) || R < 0) errors.push("Rejections can't be negative.");
  if (!isNaN(N) && !isNaN(R) && R > N) errors.push("Rejections can't exceed total accounts completed.");
  if (isNaN(T) || isNaN(M) || T >= M) errors.push("Threshold (T) must be less than Max Rate (M).");
  if (isNaN(V) || V <= 0) errors.push("Volume Floor (V) must be greater than 0.");
  if (isNaN(k) || k <= 0) errors.push("Curve (k) must be greater than 0.");

  return errors;
}

function recalc() {
  const accounts = el.accounts.value;
  const rejections = el.rejections.value;
  const T = Number(el.T.value);
  const M = Number(el.M.value);
  const k = Number(el.k.value);
  const V = Number(el.V.value);

  const errorBox = document.getElementById('errorBox');
  const errors = validateInputs(accounts, rejections, T, M, k, V);

  if (errors.length > 0) {
    errorBox.hidden = false;
    errorBox.innerHTML = errors.map(e => `&bull; ${e}`).join('<br>');
    // Blank out the result panel so it doesn't show stale/wrong numbers
    el.finalScore.textContent = '—';
    el.barFill.style.width = '0%';
    el.rrValue.textContent = '—';
    el.rawValue.textContent = '—';
    el.vfValue.textContent = '—';
    return;
  }

  errorBox.hidden = true;
  errorBox.innerHTML = '';

  const result = computeDeduction(accounts, rejections, T, M, k, V);

  el.resultName.textContent = el.name.value.trim() ? el.name.value.trim() : 'This employee';
  el.finalScore.textContent = result.final.toFixed(1);
  el.barFill.style.width = (result.final / MAX_DEDUCTION * 100) + '%';
  el.barFill.style.background = barColor(result.final);
  el.rrValue.textContent = result.RR.toFixed(2) + '%';
  el.rawValue.textContent = result.rawDeduction.toFixed(1);
  el.vfValue.textContent = result.VF.toFixed(2);
}

const ROLE_PRESETS = {
  modifier: { T: 0,   M: 5, k: 1 },
  verifier: { T: 0, M: 5,  k: 0.6},
};

function applyRolePreset(role) {
  const preset = ROLE_PRESETS[role];
  el.T.value = preset.T;
  el.M.value = preset.M;
  el.k.value = preset.k;

  // sync the curve-shape buttons to match the new k
  document.querySelectorAll('.curve-btn').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.k) === preset.k);
  });

  recalc();
}



let currentType = 'opening';
let currentRole = 'modifier';
let currentTier = 'under30';

function autoUpdateTier() {
  if (currentType !== 'maintenance') return; // tier only applies to Account Maintenance

  const N = Number(el.accounts.value);
  if (isNaN(N) || N <= 0) return;

  const newTier = tierFromVolume(N);
  if (newTier === currentTier) return; // no change needed

  currentTier = newTier;

  // sync the active tier button visually
  document.querySelectorAll('#tierOptions .role-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tier === newTier);
  });

  applyMaintenancePreset(currentRole, currentTier);
}

function updatePreset() {
  document.getElementById('tierPanel').hidden = currentType !== 'maintenance';
  if (currentType === 'maintenance') {
    autoUpdateTier(); // re-sync tier with the already-typed N before applying the preset
  }


  if (currentType === 'opening') {
    applyOpeningPreset(currentRole);
  } else {
    applyMaintenancePreset(currentRole, currentTier);
  }
}

document.getElementById('typeOptions').querySelectorAll('.role-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#typeOptions .role-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    updatePreset();
  });
});

document.getElementById('roleOptions').querySelectorAll('.role-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#roleOptions .role-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentRole = btn.dataset.role;
    updatePreset();
  });
});

document.getElementById('tierOptions').querySelectorAll('.role-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tierOptions .role-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTier = btn.dataset.tier;
    updatePreset();
  });
});

updatePreset(); // apply the default (opening / modifier) on page load

recalc();
document.getElementById('maxLabel').textContent = `points deducted / ${MAX_DEDUCTION}`;



document.getElementById('saveRecordBtn').addEventListener('click', async () => {
console.log('1. Save button clicked');


  const statusEl = document.getElementById('saveStatus');
  const name = el.name.value.trim();

  if (!name) {
    statusEl.textContent = 'Enter an employee name before saving.';
    statusEl.style.color = '#a3372f';
    return;
  }
   
    console.log('2. Validating inputs before saving');
  const result = computeDeduction(
    el.accounts.value,
    el.rejections.value,
    Number(el.T.value),
    Number(el.M.value),
    Number(el.k.value),
    Number(el.V.value)
  );

    console.log( '3. COmputed results:', result);

  statusEl.textContent = 'Saving...';
  statusEl.style.color = '#6b6656';

   console.log('4 About to call window.saveRejectionRecord with:',typeof window.saveRejectionRecord);


  const response = await window.saveRejectionRecord({
    name: name,
    accountType: currentType,
    role: currentRole,
    tier: currentType === 'maintenance' ? currentTier : null,
    accounts: Number(el.accounts.value),
    rejections: Number(el.rejections.value),
    rejectionRate: result.RR,
    finalDeduction: result.final
  });

  console.log('5. Save response:', response);

  if (response.success) {
    statusEl.textContent = 'Saved.';
    statusEl.style.color = '#2f5d50';
  } else {
    statusEl.textContent = 'Save failed — check your connection.';
    statusEl.style.color = '#a3372f';
  }
});