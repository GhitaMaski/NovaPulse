import type {
  PhysiologicalDomainKey,
  BiomarkerReading,
  EvidenceContributor,
  ExplainedAlert,
  RiskCategory,
} from '../types';

export function getRiskCategory(score: number): RiskCategory {
  if (score <= 25) return 'optimal';
  if (score <= 50) return 'guarded';
  if (score <= 75) return 'elevated';
  return 'critical';
}

export function computeEvidenceContributors(
  domainKey: PhysiologicalDomainKey,
  biomarkers: Record<string, BiomarkerReading>,
  _domainScore: number
): EvidenceContributor[] {
  // Domain specific biomarker keys
  const domainBiomarkers = Object.values(biomarkers).filter(b => b.domain === domainKey);

  // Compute absolute z-score weighted contribution
  const scoredItems = domainBiomarkers.map(b => {
    const rawDeviation = Math.abs(b.zScore);
    const isElevating = b.zScore > 0 ? (b.shortName === 'HRV' || b.shortName === 'SpO2' ? false : true) : (b.shortName === 'HRV' || b.shortName === 'SpO2' ? true : false);
    return {
      biomarker: b,
      weight: Math.max(0.1, rawDeviation * 1.5),
      isElevating,
    };
  });

  const totalWeight = scoredItems.reduce((acc, curr) => acc + curr.weight, 0);

  return scoredItems
    .map(item => {
      const pct = Math.round((item.weight / (totalWeight || 1)) * 100);
      let clinicalNote = '';
      if (item.biomarker.shortName === 'HRV') {
        clinicalNote = 'Parasympathetic withdrawal indicated by sharp drop in vagal rMSSD.';
      } else if (item.biomarker.shortName === 'RHR') {
        clinicalNote = 'Elevated nocturnal cardiac output reflecting sympathetic hyper-drive.';
      } else if (item.biomarker.shortName === 'Glucose') {
        clinicalNote = 'Impaired hepatic glucose clearance and insulin sensitivity drift.';
      } else if (item.biomarker.shortName === 'Deep Sleep') {
        clinicalNote = 'Deficit in slow-wave sleep impeding neuro-glymphatic clearance.';
      } else if (item.biomarker.shortName === 'SpO2') {
        clinicalNote = 'Repetitive nocturnal desaturations inducing micro-arousals.';
      } else if (item.biomarker.shortName === 'Temp Dev') {
        clinicalNote = 'Elevated distal skin temperature variance signaling inflammatory cytokine cascade.';
      } else {
        clinicalNote = 'Deviating from 30-day baseline homeostasis window.';
      }

      const contributor: EvidenceContributor = {
        id: `contrib-${item.biomarker.id}`,
        biomarkerName: item.biomarker.name,
        biomarkerKey: item.biomarker.shortName,
        contributionPercent: Math.max(5, pct),
        direction: item.isElevating ? 'elevating' : 'mitigating',
        observedValue: `${item.biomarker.value.toFixed(1)} ${item.biomarker.unit}`,
        baselineValue: `${item.biomarker.baseline.toFixed(1)} ${item.biomarker.unit}`,
        clinicalSignificance: clinicalNote,
      };
      return contributor;
    })
    .sort((a, b) => b.contributionPercent - a.contributionPercent);
}

export function generateAlertForDay(
  day: number,
  date: string,
  domainKey: PhysiologicalDomainKey,
  score: number,
  biomarkers: Record<string, BiomarkerReading>
): ExplainedAlert | undefined {
  if (score < 50) {
    return undefined;
  }

  const severity = score >= 75 ? 'critical' : score >= 60 ? 'elevated' : 'guarded';
  const contributors = computeEvidenceContributors(domainKey, biomarkers, score);

  const domainNames: Record<PhysiologicalDomainKey, string> = {
    cardiovascular: 'Cardiovascular & Autonomic Tone',
    metabolic: 'Metabolic & Glycemic Stability',
    neurocognitive: 'Neuro-Cognitive & Sleep Architecture',
    respiratory: 'Respiratory & Oxygen Dynamics',
    immune: 'Systemic Immune & Inflammatory Load',
  };

  const domainName = domainNames[domainKey];

  let title = `${domainName} Stress Warning`;
  let physiologicalMechanism = '';
  let clinicalRationale = '';
  let recommendedActions: string[] = [];

  switch (domainKey) {
    case 'cardiovascular':
      title = score >= 75 ? 'Acute Autonomic Decompensation Detected' : 'Sympathovagal Imbalance Incursion';
      physiologicalMechanism =
        'Marked suppression of high-frequency HRV power combined with sustained resting tachycardia reflects severe parasympathetic withdrawal and sustained adrenergic tone.';
      clinicalRationale =
        'Longitudinal autonomic exhaustion increases vulnerability to arrhythmias, orthostatic intolerance, and protracted neuro-endocrine fatigue.';
      recommendedActions = [
        'Initiate 15-minute resonance frequency breathing (5.5 breaths/min).',
        'Cease high-intensity cardiovascular training; limit to low-HR zone 1 walks.',
        'Hydrate with 500ml electrolyte solution to support intravascular volume.',
        'Review recent stimulant, caffeine, and medication intake.',
      ];
      break;

    case 'metabolic':
      title = score >= 75 ? 'Marked Glycemic Volatility & Insulin Resistance' : 'Postprandial Clearance Delay';
      physiologicalMechanism =
        'Continuous interstitial glucose monitoring reveals extended area-under-the-curve spikes with reduced nocturnal recovery, consistent with acute allostatic insulin desensitization.';
      clinicalRationale =
        'Prolonged glycemic excursions drive systemic oxidative stress and endothelial micro-inflammation, impairing recovery kinetics.';
      recommendedActions = [
        'Shift carbohydrate intake to fibrous, complex polysaccharides with protein pairing.',
        '10-minute post-meal ambulation to facilitate non-insulin-mediated GLUT4 translocation.',
        'Ensure 12-hour overnight fasting window to allow baseline glycemic reset.',
      ];
      break;

    case 'neurocognitive':
      title = score >= 75 ? 'Severe Slow-Wave Sleep Deficit & REM Fragmentation' : 'Sleep Architecture Instability';
      physiologicalMechanism =
        'Substantial reduction in delta-wave sleep (<10% of nocturnal period) alongside elevated autonomic micro-arousals hinders cortical glymphatic waste clearance.';
      clinicalRationale =
        'Restricted slow-wave sleep impairs cellular repair, memory consolidation, and hypothalamic-pituitary-adrenal axis regulation.',
      recommendedActions = [
        'Advance sleep onset target by 45 minutes; ensure 18°C ambient sleep environment.',
        'Dim blue-spectrum artificial lighting 90 minutes prior to anticipated sleep.',
        'Consider magnesium glycinate and L-theanine supplementation protocol if approved.',
      ];
      break;

    case 'respiratory':
      title = score >= 75 ? 'Nocturnal Hypoxemia & Respiratory Instability' : 'Mild Nocturnal Desaturation Bursts';
      physiologicalMechanism =
        'Clustered nocturnal SpO2 nadir dips below 92% accompanied by elevated respiratory rate variability point toward upper airway resistance or altitude adaptation strain.';
      clinicalRationale =
        'Intermittent nocturnal hypoxia triggers reactive oxygen species generation, endothelin release, and sympathetic morning surges.',
      recommendedActions = [
        'Adopt lateral sleep positioning with cervical elevation support.',
        'Inspect bedroom air quality, humidity levels, and particulate filtration.',
        'Perform daytime inspiratory muscle training exercises (5 minutes twice daily).',
      ];
      break;

    case 'immune':
      title = score >= 75 ? 'Systemic Inflammatory Surge & Cytokine Incursion' : 'Subclinical Inflammatory Activation';
      physiologicalMechanism =
        'Elevation in nocturnal skin temperature variance coupled with hs-CRP surrogate elevation signals active macrophage activation and acute-phase response.';
      clinicalRationale =
        'Systemic inflammation elevates basal metabolic expenditure, suppresses anabolic hormone secretion, and exacerbates perceived fatigue.',
      recommendedActions = [
        'Full biological rest day: eliminate physical stressors and vigorous exercise.',
        'Anti-inflammatory dietary protocol rich in polyphenols and omega-3 fatty acids.',
        'Monitor temperature trends morning and night; report temperature if >38.0°C.',
      ];
      break;
  }

  return {
    id: `alert-d${day}-${domainKey}`,
    day,
    date,
    severity,
    title,
    domain: domainKey,
    domainName,
    riskScore: score,
    summary: `${domainName} has surged into the ${severity.toUpperCase()} threshold (${score}/100).`,
    physiologicalMechanism,
    clinicalRationale,
    contributors,
    recommendedActions,
    acknowledged: false,
  };
}
