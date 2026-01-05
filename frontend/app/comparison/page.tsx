"use client";

import { useMemo, useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

type ModelKey = "BIOCLINICAL_MODERNBERT" | "ROBERTA_TAGALOG";

type DiagnosisResult = {
  pred: string;
  confidence: number;
  uncertainty: number;
  probs: string[];
  model_used: string;
  top_diseases?: { disease: string; probability: number }[];
  skip_followup?: boolean;
  skip_reason?: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: DiagnosisResult };

const MODEL_LABEL: Record<ModelKey, string> = {
  BIOCLINICAL_MODERNBERT: "BioClinical ModernBERT (English)",
  ROBERTA_TAGALOG: "RoBERTa Tagalog",
};

const EXAMPLE_SYMPTOMS = {
  english:
    "I thought it was just the flu at first. It was just a fever and body aches. But on the third day, the rashes on my legs started appearing, and my muscle joints were very painful. I couldn't eat properly because I felt like vomiting.",
  tagalog:
    "Akala ko po trangkaso lang nung una. Kasi lagnat at sakit ng katawan lang. Pero nung pangatlong araw, lumabas na yung mga pantal sa binti ko at sobrang sakit na ng mga kasu-kasuan ko. Hindi na rin ako makakain nang maayos kasi nasusuka ako.",
};

export default function ComparisonPage() {
  const [englishSymptoms, setEnglishSymptoms] = useState("");
  const [tagalogSymptoms, setTagalogSymptoms] = useState("");
  const [states, setStates] = useState<Record<ModelKey, FetchState>>({
    BIOCLINICAL_MODERNBERT: { status: "idle" },
    ROBERTA_TAGALOG: { status: "idle" },
  });

  const handleEnglishChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEnglishSymptoms(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleTagalogChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTagalogSymptoms(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const loadExample = () => {
    setEnglishSymptoms(EXAMPLE_SYMPTOMS.english);
    setTagalogSymptoms(EXAMPLE_SYMPTOMS.tagalog);

    // Adjust textarea heights after setting values
    setTimeout(() => {
      const textareas = document.querySelectorAll("textarea");
      textareas.forEach((ta) => {
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
      });
    }, 0);
  };

  const hasResults = useMemo(
    () =>
      Object.values(states).some((s) => s.status === "success") &&
      englishSymptoms.trim().length > 0,
    [states, englishSymptoms]
  );

  const runOne = async (payload: {
    symptoms: string;
  }): Promise<DiagnosisResult> => {
    const res = await fetch(`${BACKEND_URL}/diagnosis/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symptoms: payload.symptoms,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body?.message || body?.error || res.statusText;
      throw new Error(message || "Request failed");
    }

    const json = (await res.json()) as { data?: DiagnosisResult };

    if (!json?.data) {
      throw new Error("Unexpected response shape");
    }

    return json.data;
  };

  const handleCompare = async () => {
    const en = englishSymptoms.trim();
    const tl = (tagalogSymptoms || englishSymptoms).trim();

    if (!en) {
      setStates((prev) => ({
        ...prev,
        BIOCLINICAL_MODERNBERT: {
          status: "error",
          message: "Please enter symptoms in English",
        },
      }));
      return;
    }

    setStates({
      BIOCLINICAL_MODERNBERT: { status: "loading" },
      ROBERTA_TAGALOG: { status: "loading" },
    });

    try {
      const [modernbert, roberta] = await Promise.all([
        runOne({ symptoms: en, model: "BIOCLINICAL_MODERNBERT" }),
        runOne({
          symptoms: tl.length > 0 ? tl : en,
          model: "ROBERTA_TAGALOG",
        }),
      ]);

      setStates({
        BIOCLINICAL_MODERNBERT: { status: "success", data: modernbert },
        ROBERTA_TAGALOG: { status: "success", data: roberta },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setStates((prev) => ({
        ...prev,
        BIOCLINICAL_MODERNBERT: { status: "error", message },
        ROBERTA_TAGALOG: { status: "error", message },
      }));
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return "bg-success/20 text-success";
    if (conf >= 0.7) return "bg-warning/20 text-warning";
    return "bg-error/20 text-error";
  };

  const renderCard = (model: ModelKey) => {
    const state = states[model];
    const isModernBERT = model === "BIOCLINICAL_MODERNBERT";

    return (
      <div
        className={`card shadow-lg ${
          isModernBERT
            ? "bg-gradient-to-br from-blue-900/10 to-blue-900/5"
            : "bg-gradient-to-br from-amber-900/10 to-amber-900/5"
        }`}
      >
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`badge badge-lg font-bold ${
                  isModernBERT ? "badge-primary" : "badge-accent"
                }`}
              >
                {isModernBERT ? "🧠" : "🌏"}
              </div>
              <div>
                <h2 className="card-title text-lg">{MODEL_LABEL[model]}</h2>
                {state.status === "success" && (
                  <p className="text-xs opacity-60">{state.data.model_used}</p>
                )}
              </div>
            </div>
            {state.status === "loading" && (
              <span className="loading loading-spinner loading-lg" />
            )}
          </div>

          {state.status === "idle" && <div className="py-8" />}

          {state.status === "error" && (
            <div className="alert alert-error py-3">
              <svg
                className="h-4 w-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs">{state.message}</span>
            </div>
          )}

          {state.status === "success" && (
            <div className="space-y-4">
              {state.data.skip_followup && (
                <div className="alert alert-success gap-2 py-2">
                  <svg
                    className="h-4 w-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-xs">
                    High confidence – no follow-up needed
                  </span>
                </div>
              )}

              <div
                className={`rounded-lg p-4 ${getConfidenceColor(
                  state.data.confidence
                )}`}
              >
                <div className="text-xs opacity-75 mb-1">Primary Diagnosis</div>
                <div className="text-2xl font-bold">{state.data.pred}</div>
              </div>

              <div className="divider my-2" />

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-300 rounded-lg p-3 text-center">
                  <div className="text-xs opacity-60 mb-1">Confidence</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatPercent(state.data.confidence)}
                  </div>
                  <div className="progress progress-primary h-2 mt-2">
                    <div
                      className="progress-value"
                      style={{ width: `${state.data.confidence * 100}%` }}
                    />
                  </div>
                </div>
                <div className="bg-base-300 rounded-lg p-3 text-center">
                  <div className="text-xs opacity-60 mb-1">Uncertainty</div>
                  <div className="text-2xl font-bold text-warning">
                    {formatPercent(state.data.uncertainty)}
                  </div>
                  <div className="progress progress-warning h-2 mt-2">
                    <div
                      className="progress-value"
                      style={{ width: `${state.data.uncertainty * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {(state.data.top_diseases || []).length > 0 && (
                <div className="bg-base-300 rounded-lg p-3">
                  <div className="text-xs font-semibold opacity-75 mb-2">
                    Top Diseases
                  </div>
                  <div className="space-y-2">
                    {state.data.top_diseases?.map((d, idx) => (
                      <div
                        key={d.disease}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="badge badge-sm badge-outline">
                            {idx + 1}
                          </div>
                          <span className="font-medium">{d.disease}</span>
                        </div>
                        <span className="text-xs font-mono opacity-75">
                          {formatPercent(d.probability)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 py-8 px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-2 py-6">
          <h1 className="text-5xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Model Comparison
          </h1>
          <p className="text-lg opacity-70 max-w-2xl mx-auto">
            Compare BioClinical ModernBERT and RoBERTa Tagalog side-by-side
          </p>
        </div>

        {/* Input Section */}
        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-6 md:p-8 gap-6">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-2xl">Enter Your Symptoms</h2>
              <button
                className="btn btn-sm btn-outline gap-2"
                onClick={loadExample}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Load Example
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* English Input */}
              <div className="form-control w-full">
                <label className="label pb-3">
                  <span className="label-text font-semibold text-base">
                    English Symptoms
                  </span>
                  <span className="label-text-alt badge badge-primary badge-sm">
                    BioClinical ModernBERT
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered textarea-lg min-h-40 text-base resize-none overflow-hidden"
                  placeholder="E.g., I have had a high fever and dry cough for two days with muscle aches"
                  value={englishSymptoms}
                  onChange={handleEnglishChange}
                />
              </div>

              {/* Tagalog Input */}
              <div className="form-control w-full">
                <label className="label pb-3">
                  <span className="label-text font-semibold text-base">
                    Tagalog Symptoms
                  </span>
                  <span className="label-text-alt badge badge-accent badge-sm">
                    RoBERTa Tagalog
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered textarea-lg min-h-40 text-base resize-none overflow-hidden"
                  placeholder="Hal. Mataas ang aking lagnat at tumatagal ng dalawang araw, may pakpak din"
                  value={tagalogSymptoms}
                  onChange={handleTagalogChange}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                className="btn btn-lg btn-primary font-semibold flex-1"
                onClick={handleCompare}
                disabled={
                  !englishSymptoms.trim() ||
                  states.BIOCLINICAL_MODERNBERT.status === "loading"
                }
              >
                {states.BIOCLINICAL_MODERNBERT.status === "loading" ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Running Models...
                  </>
                ) : (
                  "🚀 Compare Models"
                )}
              </button>
              <button
                className="btn btn-lg btn-ghost font-semibold"
                onClick={() => {
                  setEnglishSymptoms("");
                  setTagalogSymptoms("");
                  setStates({
                    BIOCLINICAL_MODERNBERT: { status: "idle" },
                    ROBERTA_TAGALOG: { status: "idle" },
                  });
                  // Reset textarea heights
                  const textareas = document.querySelectorAll("textarea");
                  textareas.forEach((ta) => {
                    ta.style.height = "auto";
                  });
                }}
                disabled={states.BIOCLINICAL_MODERNBERT.status === "loading"}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {hasResults && (
          <>
            {/* Result Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderCard("BIOCLINICAL_MODERNBERT")}
              {renderCard("ROBERTA_TAGALOG")}
            </div>
          </>
        )}

        {/* Empty State */}
        {!hasResults && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
            {renderCard("BIOCLINICAL_MODERNBERT")}
            {renderCard("ROBERTA_TAGALOG")}
          </div>
        )}
      </div>
    </main>
  );
}

function formatPercent(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}
