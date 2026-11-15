import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { loadMissionReadings } from '../lib/dataSource';
import { example, predictionKey, predictionRequest, preparePredictionRows, type PredictionInput, type PredictionResult } from '../lib/predictions';
import type { ScenarioPrediction } from '../stores/useMissionStore';

const exampleInputs = JSON.stringify(example, null, 2);

interface MissionSelection {
  crewId: string;
  day: number;
  input: PredictionInput | undefined;
  fromBackend: boolean;
}

interface PredictionStatus {
  status: 'artifacts_present' | 'unavailable';
  missingArtifacts: string[];
}

const predictionLabels: Record<keyof PredictionResult, string> = {
  health_score: 'Health score',
  fatigue_risk: 'Fatigue risk',
  cardio_risk: 'Cardiovascular risk',
  sleep_risk: 'Sleep risk',
  mission_status: 'Mission status',
  anomaly: 'Anomaly',
};

function PredictionCards({ result }: { result: PredictionResult }) {
  return (
    <dl aria-live="polite" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {(Object.keys(predictionLabels) as Array<keyof PredictionResult>).map((key) => (
        <div key={key} className="min-w-0 rounded-xl border border-white/10 bg-[#0B1020]/70 p-3">
          <dt className="text-xs text-[#9AA6BF]">{predictionLabels[key]}</dt>
          <dd className="mt-1 break-words text-sm font-bold text-white">{result[key]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ScenarioModelPredictions({
  scenario, crewId, day, input,
}: Omit<MissionSelection, 'fromBackend'> & { scenario: ScenarioPrediction }) {
  const result = scenario.results?.[predictionKey(crewId, day)];
  return (
    <section className="glass-panel rounded-2xl p-5 space-y-4" aria-labelledby="trained-model-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trained-model-heading" className="text-base font-bold text-white">Trained Model Predictions</h2>
        <span className="text-xs text-[#9AA6BF]">{crewId} · Day {day}</span>
      </div>
      {scenario.status === 'running' && <p role="status" className="text-xs text-[#2DD4BF]">Running the trained models on the scenario readings…</p>}
      {scenario.status === 'error' && <p role="alert" className="text-xs text-[#FCA5A5] break-words whitespace-pre-wrap">{scenario.message}</p>}
      {result && (
        <>
          <PredictionCards result={result} />
          <details className="rounded-xl border border-white/10 bg-[#0B1020]/70 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">Model inputs sent to the API</summary>
            <p className="mt-3 text-xs text-[#9AA6BF]">
              Sleep efficiency serves as the estimate of sleep quality. Unavailable sensor inputs use simulation values.
            </p>
            <pre className="mt-2 overflow-auto text-xs text-slate-200">{JSON.stringify(input, null, 2)}</pre>
          </details>
        </>
      )}
    </section>
  );
}

export function TrainedModelPredictions(selection: MissionSelection) {
  const [status, setStatus] = useState<PredictionStatus | 'offline' | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    predictionRequest<PredictionStatus>('/status', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]),
    }).then(setStatus).catch(() => {
      if (!controller.signal.aborted) setStatus('offline');
    });
    return () => controller.abort();
  }, []);

  const ready = status !== null && status !== 'offline' && status.status === 'artifacts_present';

  return (
    <section className="glass-panel rounded-2xl p-5 space-y-4" aria-labelledby="trained-model-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trained-model-heading" className="text-base font-bold text-white">Trained Model Predictions</h2>
        <p role="status" className={ready ? 'text-xs text-[#2DD4BF]' : 'text-xs text-[#F59E0B]'}>
          {status === null ? 'Checking model files…'
            : status === 'offline' ? 'Prediction API unavailable'
            : ready ? 'Model files detected'
            : 'Model files unavailable'}
        </p>
      </div>
      {status && status !== 'offline' && status.missingArtifacts.length > 0 && (
        <p className="text-xs text-[#9AA6BF] break-words">Missing files: {status.missingArtifacts.join(', ')}</p>
      )}
      <PredictionForm
        key={`${selection.crewId}:${selection.day}:${selection.fromBackend}`}
        {...selection}
        ready={ready}
      />
    </section>
  );
}

function PredictionForm({ crewId, day, input, fromBackend, ready }: MissionSelection & { ready: boolean }) {
  const [customInputs, setCustomInputs] = useState<string | null>(null);
  const [confirmedInput, setConfirmedInput] = useState<PredictionInput>();
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const preview = confirmedInput ?? input;
  const inputs = customInputs ?? (preview ? JSON.stringify(preview, null, 2) : '');

  function updateInputs(value: string | null) {
    setCustomInputs(value);
    setResult(null);
    setError(null);
  }

  async function runPrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || running) return;
    setResult(null);
    setError(null);

    setRunning(true);
    try {
      let payload: unknown;
      if (customInputs === null) {
        let selected = input;
        if (fromBackend) {
          const readings = await loadMissionReadings(crewId, day);
          selected = preparePredictionRows(readings).find(({ key }) => key === predictionKey(crewId, day))?.input;
        }
        if (!selected) throw new Error(`No reading available for ${crewId} on day ${day}.`);
        setConfirmedInput(selected);
        payload = selected;
      } else {
        try {
          payload = JSON.parse(customInputs);
        } catch {
          throw new Error('Enter a valid JSON object containing the model inputs.');
        }
        if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new Error('Enter one JSON object containing the model inputs.');
        }
      }
      setResult(await predictionRequest<PredictionResult>('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60_000),
      }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Prediction failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <form onSubmit={runPrediction} className="space-y-3">
        <details className="rounded-xl border border-white/10 bg-[#0B1020]/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Model inputs</summary>
          <div className="mt-3 space-y-2">
            <label htmlFor="prediction-inputs" className="block text-xs text-[#9AA6BF]">
              Edit the 35 prepared model inputs as JSON. Editing switches to manual input.
            </label>
            <textarea
              id="prediction-inputs"
              value={inputs}
              onChange={(event) => updateInputs(event.target.value)}
              disabled={running}
              spellCheck={false}
              rows={10}
              className="w-full rounded-lg border border-white/15 bg-[#0B1020] px-3 py-2 text-xs font-mono text-white focus-visible:outline-2 focus-visible:outline-[#2DD4BF]"
            />
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-[#2DD4BF]">
              <button
                type="button" onClick={() => updateInputs(null)} disabled={running}
                className="hover:underline disabled:opacity-50"
              >
                Use selected mission reading
              </button>
              <button
                type="button" onClick={() => updateInputs(exampleInputs)} disabled={running}
                className="hover:underline disabled:opacity-50"
              >
                Load simulation example
              </button>
            </div>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="submit"
            disabled={!ready || running}
            className="rounded-xl bg-[#2DD4BF] px-4 py-2 text-sm font-bold text-[#0B1020] hover:bg-[#5EEAD4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? 'Running models…' : 'Run prediction'}
          </button>
          <span className="text-xs text-[#9AA6BF]">
            {customInputs === null ? `${crewId} · Day ${day}` : inputs === exampleInputs ? 'Simulation example' : 'Custom model inputs'}
          </span>
        </div>
        {customInputs === null && (
          <p className="text-xs text-[#9AA6BF]">
            The selected reading supplies telemetry and sleep inputs. Sleep efficiency estimates sleep quality.
            {confirmedInput && ` Last reading sent: ${confirmedInput.body_temperature} °C · ${confirmedInput.sleep_hours} h of sleep.`}
          </p>
        )}
      </form>
      {error && (
        <p role="alert" className="text-xs text-[#FCA5A5] whitespace-pre-wrap break-words">{error}</p>
      )}
      {result && <PredictionCards result={result} />}
    </>
  );
}
